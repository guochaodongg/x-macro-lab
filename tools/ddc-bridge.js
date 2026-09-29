#!/usr/bin/env node
/* =============================================================================
 * ddc-bridge.js — DDC/CI（MCCS）与串口调试的本地桥接服务
 *
 * 浏览器既不能直接访问显示器的 I²C 总线，也不能列出本机的 COM 口，所以
 * 「DDC/CI 控制」和「串口调试」两页都需要一个跑在本机的小程序替它们干活。
 * 本文件就是那个桥接：
 *
 *   · Windows DDC/CI：调用同目录的 ddc-windows.ps1（PowerShell P/Invoke dxva2.dll）
 *   · Windows 串口  ：调用同目录的 serial-windows.ps1（System.IO.Ports，无需安装）
 *   · Linux / macOS ：DDC/CI 走 ddcutil；串口没有本地后端，请用浏览器直连
 *                     （Web Serial，在 https / localhost 页面上可用）
 *   · 顺带把站点目录静态托管出来，直接访问 http://127.0.0.1:8760 即同源使用，
 *     不必操心跨域；从 GitHub Pages 打开时也能用（已带 CORS 与 Private
 *     Network Access 预检响应头）
 *
 * 用法：
 *   node ddc-bridge.js                 # 默认 127.0.0.1:8760，站点根目录为上一层
 *   node ddc-bridge.js --port 9000 --root <站点目录> --backend dxva2|ddcutil
 *
 * HTTP 接口（均为 JSON）：
 *   GET  /api/ping                     探活，返回后端类型、平台与串口后端可用性
 *   GET  /api/monitors                 列出可控制的物理显示器
 *   GET  /api/vcp?monitor=0&code=0x10  读一个 VCP 值
 *   POST /api/vcp                      { monitor, code, value } 写一个 VCP 值
 *   GET  /api/scan?monitor=0[&codes=10,12,...]  依次读一批 VCP（默认常用码集）
 *   GET  /api/capabilities?monitor=0   读能力字符串
 *   POST /api/save                     { monitor } 保存当前设置到显示器 NVRAM（MCCS 0x0C）
 *   GET  /api/serial/ports             列出本机全部 COM 口（含友好名与 VID/PID）
 *   POST /api/serial/open              { port, baud, dataBits, parity, stopBits, flow, dtr, rts }
 *   POST /api/serial/close             关闭当前串口
 *   POST /api/serial/write             { hex } 发送字节
 *   GET  /api/serial/read?since=N      取回绝对序号 N 之后收到的字节（since=-1 取尾部）
 *   GET  /api/serial/status            串口状态与 RX/TX 计数
 *
 * 依赖：无。仅使用 Node 内置模块。
 * ========================================================================== */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, spawnSync } = require('child_process');

/* ------------------------------- 参数 ------------------------------- */

const argv = process.argv.slice(2);
function arg(name, def) {
  const i = argv.indexOf('--' + name);
  return (i >= 0 && argv[i + 1]) ? argv[i + 1] : def;
}
const PORT = parseInt(arg('port', '8760'), 10);
const HOST = arg('host', '127.0.0.1');
const ROOT = path.resolve(arg('root', path.join(__dirname, '..')));
const PS1 = path.join(__dirname, 'ddc-windows.ps1');
const SERIAL_PS1 = path.join(__dirname, 'serial-windows.ps1');
const VERSION = '1.1.0';

/* 默认扫描的常用 VCP 码（界面上的「扫描常用码」按钮用） */
const COMMON_CODES = [
  0x10, 0x12, 0x13, 0x14, 0x16, 0x18, 0x1A, 0x6C, 0x6E, 0x70, 0x60, 0x62, 0x63, 0x64,
  0x87, 0x86, 0x8A, 0x8D, 0x90, 0x91, 0x93, 0x94, 0xB6, 0xB2, 0xAC, 0xAE,
  0xC0, 0xC6, 0xC8, 0xC9, 0xCA, 0xCC, 0xD6, 0xDC, 0xDF
];

/* ------------------------------- 后端 ------------------------------- */

function detectBackend() {
  const want = arg('backend', 'auto');
  if (want === 'dxva2') return (os.platform() === 'win32' && fs.existsSync(PS1)) ? 'dxva2' : 'none';
  if (want === 'ddcutil') return hasDdcutil() ? 'ddcutil' : 'none';
  if (os.platform() === 'win32' && fs.existsSync(PS1)) return 'dxva2';
  if (hasDdcutil()) return 'ddcutil';
  return 'none';
}

function hasDdcutil() {
  try {
    const r = spawnSync('ddcutil', ['--version'], { encoding: 'utf8', timeout: 8000 });
    return !r.error && r.status === 0;
  } catch (e) { return false; }
}

const BACKEND = detectBackend();

/* --------------------- 常驻助手进程（DDC/CI 与串口共用） ---------------------
 * Windows 上两条链路各起一个常驻 PowerShell：DDC 那条是一次性事务（超时就重启，
 * 反正只是 I²C 读写），串口那条要一直握着 COM 口，两者的生命周期完全不同，
 * 不能合用一个进程——否则一次 DDC 超时就会把用户的串口连接一起断掉。 */

function makeAssistant(scriptFile, label) {
  const st = { ps: null, buf: '', pending: [], label: label };

  function findPowerShell() {
    for (const exe of ['powershell.exe', 'pwsh.exe']) {
      const c = spawnSync('where', [exe], { encoding: 'utf8', shell: false });
      if (!c.error && c.status === 0 && String(c.stdout || '').trim()) return exe;
    }
    return 'powershell.exe';
  }

  function stop(reason) {
    const rest = st.pending;
    st.pending = [];
    if (st.ps) {
      try { st.ps.kill(); } catch (e) { /* ignore */ }
      st.ps = null;
    }
    st.buf = '';
    for (const p of rest) {
      clearTimeout(p.timer);
      p.reject(new Error(reason));
    }
  }

  function start() {
    const exe = findPowerShell();
    const ps = spawn(exe, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
      '-File', scriptFile, '-Action', 'serve'], { windowsHide: true });
    st.ps = ps;
    ps.stdout.setEncoding('utf8');
    ps.stdout.on('data', (d) => {
      st.buf += d;
      let i;
      while ((i = st.buf.indexOf('\n')) >= 0) {
        const line = st.buf.slice(0, i).trim();
        st.buf = st.buf.slice(i + 1);
        if (!line) continue;
        const p = st.pending.shift();
        if (p) {
          clearTimeout(p.timer);
          p.resolve(line);
        }
      }
    });
    ps.stderr.setEncoding('utf8');
    ps.stderr.on('data', (d) => process.stderr.write('[' + st.label + '] ' + d));
    ps.on('exit', (code) => {
      if (st.ps === ps) stop(st.label + ' 助手进程已退出（code ' + code + '）');
    });
    ps.on('error', (e) => stop('无法启动 ' + st.label + ' 助手：' + e.message));
  }

  function send(cmd, timeoutMs) {
    return new Promise((resolve, reject) => {
      if (!st.ps) start();
      const timer = setTimeout(() => {
        stop(st.label + ' 操作超时（' + (timeoutMs || 25000) + ' ms），已重启助手进程');
      }, timeoutMs || 25000);
      st.pending.push({ resolve, reject, timer });
      try {
        st.ps.stdin.write(cmd + '\n');
      } catch (e) {
        clearTimeout(timer);
        st.pending.pop();
        reject(new Error('写入 ' + st.label + ' 助手失败：' + e.message));
      }
    });
  }

  function json(cmd, timeoutMs) {
    return send(cmd, timeoutMs).then((line) => {
      try {
        return JSON.parse(line);
      } catch (e) {
        return { ok: false, error: '无法解析 ' + st.label + ' 输出：' + line.slice(0, 200) };
      }
    });
  }

  return { send, json, stop, isRunning: () => !!st.ps };
}

const ddcAssistant = makeAssistant(PS1, 'ddc-windows');
const serAssistant = makeAssistant(SERIAL_PS1, 'serial-windows');

function psJson(cmd, timeoutMs) { return ddcAssistant.json(cmd, timeoutMs); }

/* --------------------------- ddcutil 后端 --------------------------- */

function ddcRun(args, timeoutMs) {
  const r = spawnSync('ddcutil', args, { encoding: 'utf8', timeout: timeoutMs || 25000 });
  return {
    status: r.status,
    stdout: String(r.stdout || ''),
    stderr: String(r.stderr || ''),
    error: r.error ? r.error.message : null
  };
}

function ddcutilMonitors() {
  const r = ddcRun(['detect', '--brief'], 30000);
  if (r.error) return { ok: false, error: '执行 ddcutil 失败：' + r.error };
  const out = r.stdout + '\n' + r.stderr;
  const list = [];
  let cur = null;
  for (const raw of out.split(/\r?\n/)) {
    const line = raw.trim();
    const m = /^Display\s+(\d+)/i.exec(line);
    if (m) { cur = { index: list.length, display: parseInt(m[1], 10), description: '', bus: '' }; list.push(cur); continue; }
    if (!cur) continue;
    const b = /I2C bus:\s*(\S+)/i.exec(line);
    if (b) cur.bus = b[1];
    const mo = /^Model:\s*(.+)$/i.exec(line);
    if (mo) cur.description = mo[1].trim();
  }
  if (!list.length) return { ok: false, error: 'ddcutil 未检测到支持 DDC/CI 的显示器（检查 /dev/i2c-* 权限）' };
  for (const d of list) if (!d.description) d.description = '显示器 ' + d.display;
  return { ok: true, count: list.length, monitors: list };
}

function ddcutilGet(monitor, code) {
  const d = monitor + 1;
  const r = ddcRun(['--display', String(d), 'getvcp', code.toString(16), '--terse']);
  const text = (r.stdout || '').trim();
  if (r.error) return { ok: false, error: '执行 ddcutil 失败：' + r.error };
  if (!text) {
    return { ok: false, error: '读取失败：显示器未返回数据（可能不支持该 VCP 码，或 DDC/CI 未开启）', raw: (r.stderr || '').trim().slice(0, 300) };
  }
  const t = text.split(/\s+/);
  if (t.length < 3) return { ok: false, error: '无法解析 ddcutil 输出：' + text };
  const out = { ok: true, monitor: monitor, code: code, raw: text };
  const kind = t[2];
  if (kind === 'C' || kind === 'NC' || kind === 'CNC' || kind === 'T') {
    out.vcpType = kind;
    if (kind === 'C') { out.current = parseInt(t[3], 10); out.max = parseInt(t[4], 10); }
    else { out.current = parseInt(t[3].replace(/^x/i, ''), 16); out.max = null; }
  } else {
    out.vcpType = '?';
    out.current = parseInt(t[2].replace(/^x/i, ''), 16);
    out.max = null;
  }
  out.description = '';
  return out;
}

function ddcutilSet(monitor, code, value) {
  const r = ddcRun(['--display', String(monitor + 1), 'setvcp', code.toString(16), String(value)]);
  if (r.error) return { ok: false, error: '执行 ddcutil 失败：' + r.error };
  if (r.status !== 0) return { ok: false, error: '写入失败：' + (r.stderr || r.stdout || '').trim().slice(0, 300) };
  return { ok: true, monitor: monitor, code: code, value: value };
}

function ddcutilCaps(monitor) {
  const r = ddcRun(['--display', String(monitor + 1), 'capabilities'], 40000);
  if (r.error) return { ok: false, error: '执行 ddcutil 失败：' + r.error };
  const text = (r.stdout || '').trim();
  if (!text) return { ok: false, error: '显示器未返回能力字符串：' + (r.stderr || '').trim().slice(0, 300) };
  return { ok: true, monitor: monitor, text: text, format: 'ddcutil' };
}

/* ------------------------------- 统一接口 ------------------------------- */

function backendMonitors() {
  if (BACKEND === 'dxva2') return psJson('list', 30000).then(withHint);
  if (BACKEND === 'ddcutil') return Promise.resolve(ddcutilMonitors());
  return Promise.resolve({ ok: false, error: '没有可用的后端（Windows 需要 ddc-windows.ps1；Linux/macOS 需要 ddcutil）' });
}

function backendGet(monitor, code) {
  if (BACKEND === 'dxva2') return psJson('get ' + monitor + ' 0x' + code.toString(16), 25000).then(withHint);
  if (BACKEND === 'ddcutil') return Promise.resolve(ddcutilGet(monitor, code));
  return Promise.resolve({ ok: false, error: '没有可用的后端' });
}

function backendSet(monitor, code, value) {
  if (BACKEND === 'dxva2') return psJson('set ' + monitor + ' 0x' + code.toString(16) + ' ' + value, 25000).then(withHint);
  if (BACKEND === 'ddcutil') return Promise.resolve(ddcutilSet(monitor, code, value));
  return Promise.resolve({ ok: false, error: '没有可用的后端' });
}

function backendCaps(monitor) {
  if (BACKEND === 'dxva2') {
    return psJson('caps ' + monitor, 40000).then(withHint).then((r) => {
      if (r && r.ok) r.format = 'string';
      return r;
    });
  }
  if (BACKEND === 'ddcutil') return Promise.resolve(ddcutilCaps(monitor));
  return Promise.resolve({ ok: false, error: '没有可用的后端' });
}

function backendSave(monitor) {
  if (BACKEND === 'dxva2') return psJson('save ' + monitor, 25000).then(withHint);
  if (BACKEND === 'ddcutil') {
    const r = ddcRun(['--display', String(monitor + 1), 'scs']);
    if (r.status === 0 && !r.error) return Promise.resolve({ ok: true, monitor: monitor });
    return Promise.resolve({ ok: false, error: (r.error || r.stderr || 'ddcutil scs 失败').slice(0, 300) });
  }
  return Promise.resolve({ ok: false, error: '没有可用的后端' });
}

/* ------------------------------- 串口后端 -------------------------------
 * 只用 Windows 自带的 System.IO.Ports（serial-windows.ps1），无需安装任何包。
 * Linux / macOS 下这条链路不可用，但浏览器直连（Web Serial）在 https / localhost
 * 上仍然能用，界面对此有说明。 */

function hasSerialBackend() {
  return os.platform() === 'win32' && fs.existsSync(SERIAL_PS1);
}

/* 串口报错大多是「被占用 / 拔了 / 参数不支持」这三类，直接翻成中文省得排查 */
const SERIAL_HINT = [
  [/UnauthorizedAccessException|Access is denied|denied|busy/i,
    '串口被占用 —— 先关掉其它串口工具（串口助手 / 烧录工具 / IDE 的串口监视器）再试'],
  [/port gone|does not exist|系统找不到|FileNotFoundException/i,
    '找不到该 COM 口 —— 设备可能已拔出，或驱动没有装好'],
  [/unsupported parameter|ArgumentException|非标准/i,
    '这组参数不被驱动支持（常见于非标准波特率、1.5 位停止位、mark/space 校验）']
];

function serialHint(r) {
  if (r && !r.ok && r.error) {
    const text = String(r.error);
    for (const [re, hint] of SERIAL_HINT) {
      if (re.test(text)) { r.hint = hint; break; }
    }
  }
  return r;
}

function serialNoBackend() {
  return {
    ok: false,
    error: '本机没有串口后端：' + (os.platform() === 'win32'
      ? '请确认 serial-windows.ps1 与 ddc-bridge.js 放在同一个文件夹'
      : '这个桥接的串口后端只支持 Windows（' + os.platform() +
        ' 上请在 https / localhost 页面用浏览器直连 Web Serial）')
  };
}

function pickOne(value, allowed, def) {
  const s = String(value === undefined || value === null ? '' : value).toLowerCase();
  return allowed.indexOf(s) >= 0 ? s : def;
}

function serialList() {
  if (!hasSerialBackend()) return Promise.resolve(serialNoBackend());
  return serAssistant.json('ports', 40000).then(serialHint);
}

function serialOpen(body) {
  if (!hasSerialBackend()) return Promise.resolve(serialNoBackend());
  body = body || {};
  const port = String(body.port || '').trim();
  /* 助手进程按空白切分命令行，端口名里的空格会拆坏参数：只放行安全字符 */
  if (!/^[A-Za-z0-9._:\\-]+$/.test(port)) {
    return Promise.resolve({ ok: false, error: '串口名不合法（只允许字母、数字与 . _ - : \\\\）' });
  }
  const baud = parseIntArg(body.baud, 115200);
  const bits = parseIntArg(body.dataBits, 8);
  const parity = pickOne(body.parity, ['none', 'even', 'odd', 'mark', 'space'], 'none');
  const stop = String(body.stopBits) === '1.5' ? '1.5' : (String(body.stopBits) === '2' ? '2' : '1');
  const flow = pickOne(body.flow, ['none', 'rtscts', 'xonxoff'], 'none');
  const dtr = body.dtr === false ? '0' : '1';
  const rts = body.rts === false ? '0' : '1';
  const cmd = ['open', port, baud, bits, parity, stop, flow, dtr, rts].join(' ');
  return serAssistant.json(cmd, 30000).then(serialHint);
}

function serialClose() {
  if (!hasSerialBackend()) return Promise.resolve(serialNoBackend());
  return serAssistant.json('close', 15000).then(serialHint);
}

function serialWrite(hexText) {
  if (!hasSerialBackend()) return Promise.resolve(serialNoBackend());
  const clean = String(hexText || '').replace(/[^0-9a-fA-F]/g, '');
  if (!clean.length) return Promise.resolve({ ok: false, error: '没有要发送的字节' });
  if (clean.length > 8192) return Promise.resolve({ ok: false, error: '单次发送最多 4096 字节' });
  return serAssistant.json('write ' + clean, 15000).then(serialHint);
}

function serialRead(since) {
  if (!hasSerialBackend()) return Promise.resolve(serialNoBackend());
  const n = (typeof since === 'number' && isFinite(since)) ? Math.floor(since) : -1;
  return serAssistant.json('read ' + n, 10000).then(serialHint);
}

function serialStatus() {
  if (!hasSerialBackend()) return Promise.resolve(serialNoBackend());
  return serAssistant.json('status', 15000).then(serialHint);
}

/* Windows 显示器控制 API（dxva2）的常见错误码解释：给排错省时间 */
const WIN32_HINT = {
  0xC0262580: '显示驱动没有提供 DDC/CI 的 I²C 通道（多见于虚拟显示器 / 远程桌面 / 转接器）',
  0xC0262581: 'I²C 发送数据出错（线缆、转接器或显示器无应答）',
  0xC0262582: 'I²C 接收数据出错',
  0xC0262583: '显示器不支持该 VCP 码',
  0xC0262584: '显示器返回的数据无效',
  0xC0262585: '显示器返回的时序状态字节无效',
  0xC0262586: '能力字符串无效（显示器未按 MCCS 格式返回）',
  0xC0262587: '显示器控制代理内部错误',
  0xC0262588: '报文命令无效',
  0xC0262589: '报文长度无效 —— 通常是显示器对该命令没有有效应答（即不支持）',
  0xC026258A: '报文校验和错误',
  0xC026258B: '物理显示器句柄无效（显示器可能已断开或切换了输入源）'
};

function withHint(r) {
  if (r && !r.ok && typeof r.win32 === 'number') {
    const h = WIN32_HINT[r.win32 >>> 0];
    if (h) r.hint = h;
  }
  return r;
}

/* 串行化：所有硬件操作排成一队，避免并发占用 I²C 总线。
   串口用第二条独立的队：它每秒要轮询 25 次接收缓冲，若和 DDC 共用一条队，
   DDC 事务会被反复插队（虽然正确，但延迟变得不可预测）。 */
function makeQueue() {
  let chain = Promise.resolve();
  return function (fn) {
    const run = chain.then(fn, fn);
    chain = run.then(() => undefined, () => undefined);
    return run;
  };
}

const serialize = makeQueue();
const serializeSerial = makeQueue();

/* ------------------------------- HTTP ------------------------------- */

const MIME = {
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xlsm': 'application/vnd.ms-excel.sheet.macroEnabled.12',
  '.ps1': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

function corsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '600');
  /* Chrome/Edge 的 Private Network Access：公网页面访问 127.0.0.1 需要这个头 */
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
}

function sendJson(res, obj, status) {
  corsHeaders(res);
  res.setHeader('Cache-Control', 'no-store');
  res.writeHead(status || 200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

function log(line) {
  const t = new Date().toTimeString().slice(0, 8);
  process.stdout.write('[' + t + '] ' + line + '\n');
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); } catch (e) { resolve({}); }
    });
  });
}

function parseIntArg(v, def) {
  if (v === undefined || v === null || v === '') return def;
  const s = String(v).trim();
  if (/^0x[0-9a-f]+$/i.test(s)) return parseInt(s.slice(2), 16);
  if (/^[0-9a-f]{2,6}$/i.test(s) && /[a-f]/i.test(s)) return parseInt(s, 16);
  const n = parseInt(s, 10);
  return isNaN(n) ? def : n;
}

/* VCP 码统一按十六进制解析（与 ddcutil / MCCS 文档的书写习惯一致，如 10、0x10、DF）；
   JSON 里本来就是数字的，按数字原值使用 */
function parseCodeArg(v, def) {
  if (typeof v === 'number' && isFinite(v)) return Math.floor(v) & 0xFFFFFF;
  if (v === undefined || v === null || v === '') return def;
  const s = String(v).trim().replace(/^0x/i, '');
  if (!/^[0-9a-f]{1,6}$/i.test(s)) return def;
  return parseInt(s, 16) & 0xFFFFFF;
}

function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname.replace(/^\/+/, ''));
  if (!rel || rel.endsWith('/')) rel += 'index.html';
  const full = path.resolve(ROOT, rel);
  if (!full.startsWith(ROOT)) { res.writeHead(403); res.end('403'); return; }
  fs.stat(full, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found: ' + rel + '\n（站点根目录：' + ROOT + '）');
      return;
    }
    const ext = path.extname(full).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': st.size,
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(full).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://' + (req.headers.host || HOST));
  const p = u.pathname;

  if (req.method === 'OPTIONS') { corsHeaders(res); res.writeHead(204); res.end(); return; }

  if (p === '/api/ping') {
    return sendJson(res, {
      ok: true, service: 'ddc-bridge', version: VERSION,
      backend: BACKEND, platform: os.platform(), root: ROOT,
      serial: hasSerialBackend() ? 'windows' : 'none'
    });
  }

  /* ------------------------------- 串口 ------------------------------- */
  /* 说明：/api/serial/read 会被前端以 ~25 Hz 轮询，故意不写日志，
     否则控制台会被淹没（页面自己有收发日志）。 */

  if (p === '/api/serial/ports') {
    return serializeSerial(() => serialList()).then((r) => {
      log('serial ports -> ' + (r.ok ? r.count + ' 个 COM 口' : r.error));
      sendJson(res, r, r.ok ? 200 : 502);
    }).catch((e) => sendJson(res, { ok: false, error: String(e.message || e) }, 500));
  }

  if (p === '/api/serial/open' && req.method === 'POST') {
    return readBody(req).then((body) => serializeSerial(() => serialOpen(body)).then((r) => {
      log('serial open ' + (body && body.port) + ' @ ' + (body && body.baud) +
        ' -> ' + (r.ok ? 'ok' : r.error));
      sendJson(res, r, r.ok ? 200 : 502);
    })).catch((e) => sendJson(res, { ok: false, error: String(e.message || e) }, 500));
  }

  if (p === '/api/serial/close' && req.method === 'POST') {
    return serializeSerial(() => serialClose()).then((r) => {
      log('serial close -> ' + (r.ok ? 'ok' : r.error));
      sendJson(res, r, r.ok ? 200 : 502);
    }).catch((e) => sendJson(res, { ok: false, error: String(e.message || e) }, 500));
  }

  if (p === '/api/serial/write' && req.method === 'POST') {
    return readBody(req).then((body) => serializeSerial(() => serialWrite(body.hex)).then((r) => {
      log('serial write ' + (r.ok ? r.n + ' 字节' : r.error));
      sendJson(res, r, r.ok ? 200 : 502);
    })).catch((e) => sendJson(res, { ok: false, error: String(e.message || e) }, 500));
  }

  if (p === '/api/serial/read') {
    const since = (u.searchParams.get('since') === null) ? -1 : parseIntArg(u.searchParams.get('since'), -1);
    return serializeSerial(() => serialRead(since)).then((r) => {
      sendJson(res, r, r.ok ? 200 : 502);
    }).catch((e) => sendJson(res, { ok: false, error: String(e.message || e) }, 500));
  }

  if (p === '/api/serial/status') {
    return serializeSerial(() => serialStatus()).then((r) => {
      sendJson(res, r, r.ok ? 200 : 502);
    }).catch((e) => sendJson(res, { ok: false, error: String(e.message || e) }, 500));
  }

  if (p === '/api/monitors') {
    return serialize(() => backendMonitors()).then((r) => {
      log('monitors -> ' + (r.ok ? r.count + ' 台' : r.error));
      sendJson(res, r, r.ok ? 200 : 502);
    }).catch((e) => sendJson(res, { ok: false, error: String(e.message || e) }, 500));
  }

  if (p === '/api/vcp' && req.method === 'GET') {
    const monitor = parseIntArg(u.searchParams.get('monitor'), 0);
    const code = parseCodeArg(u.searchParams.get('code'), null);
    if (code === null) return sendJson(res, { ok: false, error: '缺少 code 参数' }, 400);
    return serialize(() => backendGet(monitor, code)).then((r) => {
      log('get monitor=' + monitor + ' code=0x' + code.toString(16) +
        ' -> ' + (r.ok ? ('current=' + r.current + ' max=' + r.max) : r.error));
      sendJson(res, r, r.ok ? 200 : 502);
    }).catch((e) => sendJson(res, { ok: false, error: String(e.message || e) }, 500));
  }

  if (p === '/api/vcp' && req.method === 'POST') {
    return readBody(req).then((body) => {
      const monitor = parseIntArg(body.monitor, 0);
      const code = parseCodeArg(body.code, null);
      const value = parseIntArg(body.value, null);
      if (code === null || value === null) return sendJson(res, { ok: false, error: '缺少 code / value 参数' }, 400);
      return serialize(() => backendSet(monitor, code, value)).then((r) => {
        log('set monitor=' + monitor + ' code=0x' + code.toString(16) + ' value=' + value +
          ' -> ' + (r.ok ? 'ok' : r.error));
        sendJson(res, r, r.ok ? 200 : 502);
      });
    }).catch((e) => sendJson(res, { ok: false, error: String(e.message || e) }, 500));
  }

  if (p === '/api/scan') {
    const monitor = parseIntArg(u.searchParams.get('monitor'), 0);
    const codesArg = u.searchParams.get('codes');
    const codes = codesArg
      ? codesArg.split(/[,\s]+/).map((x) => parseCodeArg(x, null)).filter((x) => x !== null)
      : COMMON_CODES.slice();
    return serialize(async () => {
      const results = [];
      for (const c of codes) {
        let r;
        try { r = await backendGet(monitor, c); } catch (e) { r = { ok: false, error: String(e.message || e) }; }
        results.push({ code: c, ok: !!(r && r.ok), current: r && r.current, max: r && r.max, error: r && r.error });
      }
      return { ok: true, monitor: monitor, count: results.length, results: results };
    }).then((r) => {
      log('scan monitor=' + monitor + ' -> ' + r.results.filter((x) => x.ok).length + '/' + r.count + ' 个码有响应');
      sendJson(res, r);
    }).catch((e) => sendJson(res, { ok: false, error: String(e.message || e) }, 500));
  }

  if (p === '/api/capabilities') {
    const monitor = parseIntArg(u.searchParams.get('monitor'), 0);
    return serialize(() => backendCaps(monitor)).then((r) => {
      log('capabilities monitor=' + monitor + ' -> ' + (r.ok ? (String(r.text || '').length + ' 字符') : r.error));
      sendJson(res, r, r.ok ? 200 : 502);
    }).catch((e) => sendJson(res, { ok: false, error: String(e.message || e) }, 500));
  }

  if (p === '/api/save' && req.method === 'POST') {
    return readBody(req).then((body) => {
      const monitor = parseIntArg(body.monitor, 0);
      return serialize(() => backendSave(monitor)).then((r) => {
        log('save monitor=' + monitor + ' -> ' + (r.ok ? 'ok' : r.error));
        sendJson(res, r, r.ok ? 200 : 502);
      });
    });
  }

  if (p === '/api/raw') {
    return sendJson(res, {
      ok: false,
      error: '原始报文无法通过系统 API 发送：Windows 的 dxva2 只提供 VCP 读写与能力字符串接口，' +
        '不接受任意字节流。请用页面下方导出的 i2ctransfer（Linux）或 ddcutil 命令发送原始帧。'
    }, 501);
  }

  if (p.startsWith('/api/')) return sendJson(res, { ok: false, error: '未知接口：' + p }, 404);

  return serveStatic(req, res, p);
});

server.listen(PORT, HOST, () => {
  const lines = [
    '',
    '  EDID-X-LAB bridge is running (DDC/CI + serial).',
    '  ------------------------------------------------------------------',
    '  DDC/CI page:         http://' + HOST + ':' + PORT + '/?tab=mccs',
    '  Serial page:         http://' + HOST + ':' + PORT + '/?tab=serial',
    '  API base:            http://' + HOST + ':' + PORT + '/api',
    '  DDC backend:         ' + BACKEND + '   (platform: ' + os.platform() + ')',
    '  Serial backend:      ' + (hasSerialBackend() ? 'windows (System.IO.Ports)' : 'none'),
    '  Static root:         ' + ROOT,
    '  ------------------------------------------------------------------',
    (BACKEND === 'none'
      ? '  WARNING: no DDC/CI backend available. On Windows keep ddc-windows.ps1 next\n' +
        '           to this file; on Linux/macOS install ddcutil and grant /dev/i2c-* access.'
      : '  Open the page and switch to the DDC/CI tab; it will auto-connect to this bridge.'),
    (hasSerialBackend()
      ? '  Serial: keep serial-windows.ps1 next to this file (nothing to install).'
      : '  Serial: no local backend on this platform — use Web Serial on the page instead.'),
    ''
  ];
  process.stdout.write(lines.join('\n') + '\n');
});
