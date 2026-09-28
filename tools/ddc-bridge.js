#!/usr/bin/env node
/* =============================================================================
 * ddc-bridge.js — DDC/CI（MCCS）本地桥接服务
 *
 * 浏览器无法直接访问显示器的 I²C 总线，所以「DDC/CI 控制」页面需要一个跑在本机的
 * 小程序替它把命令发出去。本文件就是那个桥接：
 *
 *   · Windows：调用同目录的 ddc-windows.ps1（PowerShell 直接 P/Invoke dxva2.dll）
 *   · Linux / macOS：调用 ddcutil（需已安装，且用户有权限访问 /dev/i2c-*）
 *   · 顺带把站点目录静态托管出来，直接访问 http://127.0.0.1:8760 即同源使用，
 *     不必操心跨域；从 GitHub Pages 打开时也能用（已带 CORS 与 Private
 *     Network Access 预检响应头）
 *
 * 用法：
 *   node ddc-bridge.js                 # 默认 127.0.0.1:8760，站点根目录为上一层
 *   node ddc-bridge.js --port 9000 --root <站点目录> --backend dxva2|ddcutil
 *
 * HTTP 接口（均为 JSON）：
 *   GET  /api/ping                     探活，返回后端类型与平台
 *   GET  /api/monitors                 列出可控制的物理显示器
 *   GET  /api/vcp?monitor=0&code=0x10  读一个 VCP 值
 *   POST /api/vcp                      { monitor, code, value } 写一个 VCP 值
 *   GET  /api/scan?monitor=0[&codes=10,12,...]  依次读一批 VCP（默认常用码集）
 *   GET  /api/capabilities?monitor=0   读能力字符串
 *   POST /api/save                     { monitor } 保存当前设置到显示器 NVRAM（MCCS 0x0C）
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
const VERSION = '1.0.0';

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

/* --------------------------- dxva2 后端（常驻助理进程） --------------------------- */

let ps = null;          /* 常驻 PowerShell 进程 */
let psBuf = '';
let pending = [];       /* 串行队列：DDC 总线慢，必须一条一条来 */
let chain = Promise.resolve();

function findPowerShell() {
  const cands = ['powershell.exe', 'pwsh.exe'];
  for (const exe of cands) {
    const c = spawnSync('where', [exe], { encoding: 'utf8', shell: false });
    if (!c.error && c.status === 0 && String(c.stdout || '').trim()) return exe;
  }
  return 'powershell.exe';
}

function stopChild(reason) {
  const rest = pending;
  pending = [];
  if (ps) {
    try { ps.kill(); } catch (e) { /* ignore */ }
    ps = null;
  }
  psBuf = '';
  for (const p of rest) {
    clearTimeout(p.timer);
    p.reject(new Error(reason));
  }
}

function startChild() {
  const exe = findPowerShell();
  ps = spawn(exe, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', PS1, '-Action', 'serve'],
    { windowsHide: true });
  ps.stdout.setEncoding('utf8');
  ps.stdout.on('data', (d) => {
    psBuf += d;
    let i;
    while ((i = psBuf.indexOf('\n')) >= 0) {
      const line = psBuf.slice(0, i).trim();
      psBuf = psBuf.slice(i + 1);
      if (!line) continue;
      const p = pending.shift();
      if (p) {
        clearTimeout(p.timer);
        p.resolve(line);
      }
    }
  });
  ps.stderr.setEncoding('utf8');
  ps.stderr.on('data', (d) => process.stderr.write('[ddc-windows] ' + d));
  ps.on('exit', (code) => {
    if (ps) stopChild('PowerShell 助手进程已退出（code ' + code + '）');
  });
  ps.on('error', (e) => stopChild('无法启动 PowerShell 助手：' + e.message));
}

function psSend(cmd, timeoutMs) {
  return new Promise((resolve, reject) => {
    if (!ps) startChild();
    const timer = setTimeout(() => {
      stopChild('DDC/CI 操作超时（' + timeoutMs + ' ms），已重启助手进程');
    }, timeoutMs || 25000);
    pending.push({ resolve, reject, timer });
    try {
      ps.stdin.write(cmd + '\n');
    } catch (e) {
      clearTimeout(timer);
      pending.pop();
      reject(new Error('写入助手进程失败：' + e.message));
    }
  });
}

async function psJson(cmd, timeoutMs) {
  const line = await psSend(cmd, timeoutMs);
  try {
    return JSON.parse(line);
  } catch (e) {
    return { ok: false, error: '无法解析助手进程输出：' + line.slice(0, 200) };
  }
}

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

/* 串行化：所有硬件操作排成一队，避免并发占用 I²C 总线 */
function serialize(fn) {
  const run = chain.then(fn, fn);
  chain = run.then(() => undefined, () => undefined);
  return run;
}

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
      backend: BACKEND, platform: os.platform(), root: ROOT
    });
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
    '  DDC/CI bridge is running.',
    '  ------------------------------------------------------------------',
    '  Page (same origin):  http://' + HOST + ':' + PORT + '/?tab=mccs',
    '  API base:            http://' + HOST + ':' + PORT + '/api',
    '  Backend:             ' + BACKEND + '   (platform: ' + os.platform() + ')',
    '  Static root:         ' + ROOT,
    '  ------------------------------------------------------------------',
    (BACKEND === 'none'
      ? '  WARNING: no backend available. On Windows keep ddc-windows.ps1 next to this\n' +
        '           file; on Linux/macOS install ddcutil and grant /dev/i2c-* access.'
      : '  Open the page and switch to the DDC/CI tab; it will auto-connect to this bridge.'),
    ''
  ];
  process.stdout.write(lines.join('\n') + '\n');
});
