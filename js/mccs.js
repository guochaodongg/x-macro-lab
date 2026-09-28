/* =============================================================================
 * mccs.js — DDC/CI（MCCS）协议逻辑：报文构建、应答解析、能力字符串解析、
 *           命令行导出。纯函数，不碰 DOM，可在 Node 里直接测试。
 *
 * 帧格式（DDC/CI 1.1，主机 → 显示器）：
 *   [0x51] 源地址（主机）
 *   [0x80|n] 长度：高位置 1，低 7 位 = 紧随其后的数据字节数（不含校验和）
 *   [opcode] 操作码（0x01 读 VCP / 0x03 写 VCP / 0x0C 保存 / 0xF3 读能力…）
 *   [data…]  数据（VCP 码、数值等）
 *   [chk]    校验和 = 显示器 I²C 写地址 0x6E ⊕ 前面所有字节（逐字节异或）
 *
 * 已用真实样例核对：`51 84 03 12 00 64 CE`
 *   → 0x6E ⊕ 0x51 ⊕ 0x84 ⊕ 0x03 ⊕ 0x12 ⊕ 0x00 ⊕ 0x64 = 0xCE ✔（写对比度 = 100）
 * 显示器 → 主机的应答首字节是 0x6E；其校验和的地址项在不同实现里有
 * 0x50 / 0x6E / 0x6F+0x51 等写法，本模块会逐个试算并报告命中规则。
 *
 * ── VCP 码宽度（本模块最容易搞错的地方） ──────────────────────────────
 * VCP 码字段在报文里是**变长**的，长度字节把它算进去了：
 *   请求 getvcp： opcode(1) + 码(n)                    → length = 0x80|(1+n)
 *   请求 setvcp： opcode(1) + 码(n) + 数值(2)           → length = 0x80|(3+n)
 *   应答 0x02：   opcode(1) + 结果码(1) + 码(n) + 类型(1) + 最大值(2) + 当前值(2)
 *                                                       → length = 0x80|(7+n)
 * 主流实现**一律用 1 字节码**（n = 1），这是有据可查的：
 *   · Windows dxva2.dll  GetVCPFeatureAndVCPFeatureReply(hMonitor, BYTE bVCPCode, …)
 *                        SetVCPFeature(hMonitor, BYTE bVCPCode, …)  ← 参数就是单字节
 *   · Linux ddcutil 作者给的参考报文：`6e 51 82 01 10` / 应答 `6f 6e 88 02 00 10 …`
 *   · macOS ddcctl：写 `51 84 03 <code> <hi> <lo>`、读 `51 82 01 <code>`
 * 2 字节码（n = 2，length 0x83/0x85）是 DDC/CI 1.1 规范允许的变体，少数主机用；
 * 3 字节只用于 0xE0 以上厂商自定义的 24 位扩展码（如某型号的 0xE2A002），
 * 且 Windows dxva2 因参数是单字节而**根本无法寻址**，只能走 ddcutil。
 * 因此 normWide() 的默认值是「按码自动」：≤0xFF → 1 字节，>0xFFFF → 3 字节。
 * 应答解析则不看请求，直接从 length 反推宽度（上面第三条公式），这样无论对方
 * 用哪种形式都能正确解出码值。
 * ========================================================================== */
(function () {
  'use strict';

  var DATA = window.MCCSData || { VCP: [], OPCODES: [] };

  /* DDC/CI 用到的 I²C 地址（7 位 0x37，左移一位得到读写地址） */
  var ADDR = { slave7: 0x37, write: 0x6E, read: 0x6F, host: 0x51 };

  var OP = {
    GET_VCP: 0x01, VCP_REPLY: 0x02, SET_VCP: 0x03,
    TIMING_REQ: 0x06, TIMING_REPLY: 0x07, VCP_RESET: 0x09,
    SAVE: 0x0C, CAP_REQ: 0xF3, CAP_REPLY: 0xE3
  };

  var TYPE_CODE = { 0: 'C 连续量', 1: 'NC 非连续量', 2: 'NC 非连续量（复合）', 3: 'T 表类型' };

  var RESULT_CODE = {
    0x00: '无错误（成功）',
    0x01: '不支持的 VCP 码'
  };

  /* ------------------------------ 基础工具 ------------------------------ */

  function hex(bytes) {
    var out = [];
    for (var i = 0; i < bytes.length; i++) {
      var b = bytes[i] & 0xFF;
      out.push((b < 16 ? '0' : '') + b.toString(16).toUpperCase());
    }
    return out.join(' ');
  }

  function bytes(str) {
    if (Array.isArray(str)) return str.slice();
    var out = [], m = String(str).match(/[0-9a-fA-F]{1,2}/g);
    if (!m) return out;
    for (var i = 0; i < m.length; i++) out.push(parseInt(m[i], 16));
    return out;
  }

  function hex2(v) { return ('0' + (v & 0xFF).toString(16).toUpperCase()).slice(-2); }
  function hex4(v) { return ('000' + (v & 0xFFFF).toString(16).toUpperCase()).slice(-4); }
  function hex6(v) { return ('00000' + (v & 0xFFFFFF).toString(16).toUpperCase()).slice(-6); }

  /* VCP 码的常见书写形式：<=0xFF 写两位（10），<=0xFFFF 写四位（0x1234），
     更大的是部分厂商用的 24 位扩展码（如某型号的 0xE2A002） */
  function vcpText(code) {
    code = code & 0xFFFFFF;
    if (code <= 0xFF) return hex2(code);
    if (code <= 0xFFFF) return '0x' + hex4(code);
    return '0x' + hex6(code);
  }

  /* 校验和：从地址字节开始逐字节异或 */
  function checksum(body, addr) {
    var cs = (addr === undefined ? ADDR.write : addr) & 0xFF;
    for (var i = 0; i < body.length; i++) cs ^= body[i] & 0xFF;
    return cs & 0xFF;
  }

  /* 组装主机 → 显示器的完整报文（含源地址、长度、校验和） */
  function frame(data, opts) {
    opts = opts || {};
    var body = [ADDR.host, 0x80 | (data.length & 0x7F)].concat(data);
    body.push(checksum(body, opts.checksumAddr === undefined ? ADDR.write : opts.checksumAddr));
    return body;
  }

  /* VCP 码的字节序列：wide=1 → 仅低字节（dxva2 / ddcutil / ddcctl 的通用形式）；
     wide=2 → 高字节 + 低字节（DDC/CI 1.1 规范变体，少数主机）；
     wide=3 → 三字节（0xE0 以上厂商自定义的 24 位扩展码，仅 ddcutil 可寻址） */
  function vcpBytes(code, wide) {
    code = code & 0xFFFFFF;
    if (wide === 1) return [code & 0xFF];
    if (wide === 3) return [(code >> 16) & 0xFF, (code >> 8) & 0xFF, code & 0xFF];
    return [(code >> 8) & 0xFF, code & 0xFF];
  }

  /* 决定实际使用的码宽：显式指定优先，否则按码值自动（见文件头说明）。
     注意 normWide() 的第二参数是 VCP 码——省略时一律按 1 字节处理。 */
  function normWide(w, code) {
    if (w === 1 || w === 2 || w === 3) return w;
    code = (code === undefined ? 0 : code) & 0xFFFFFF;
    if (code > 0xFFFF) return 3;
    if (code > 0xFF) return 2;
    return 1;
  }

  /* ------------------------------ 报文构建 ------------------------------ */

  function buildGetVCP(opts) {
    opts = opts || {};
    return frame([OP.GET_VCP].concat(vcpBytes(opts.code, normWide(opts.wide, opts.code))), opts);
  }

  function buildSetVCP(opts) {
    opts = opts || {};
    var v = (opts.value === undefined ? 0 : opts.value) & 0xFFFF;
    return frame([OP.SET_VCP].concat(vcpBytes(opts.code, normWide(opts.wide, opts.code)), [(v >> 8) & 0xFF, v & 0xFF]), opts);
  }

  function buildSaveSettings(opts) {
    return frame([OP.SAVE], opts || {});
  }

  function buildVcpReset(opts) {
    opts = opts || {};
    return frame([OP.VCP_RESET].concat(vcpBytes(opts.code, normWide(opts.wide, opts.code))), opts);
  }

  function buildGetCapabilities(opts) {
    opts = opts || {};
    var off = opts.offset || 0;
    return frame([OP.CAP_REQ, (off >> 8) & 0xFF, off & 0xFF], opts);
  }

  /* 任意载荷（高级/调试用）：payload 为操作码之后的数据字节 */
  function buildRaw(opts) {
    opts = opts || {};
    return frame([opts.opcode & 0xFF].concat(opts.payload || []), opts);
  }

  /* 按模板构建：{ kind:'get'|'set'|'save'|'reset'|'cap'|'raw', ... } */
  function build(kind, opts) {
    opts = opts || {};
    switch (kind) {
      case 'get': return buildGetVCP(opts);
      case 'set': return buildSetVCP(opts);
      case 'save': return buildSaveSettings(opts);
      case 'reset': return buildVcpReset(opts);
      case 'cap': return buildGetCapabilities(opts);
      case 'raw': return buildRaw(opts);
      default: return [];
    }
  }

  /* ------------------------------ 应答解析 ------------------------------ */

  /* 显示器 → 主机：6E <len> <opcode> <data…> <chk>，len = data 字节数（不含校验和） */
  function parseReply(list) {
    list = bytes(list);
    if (!list.length) return { valid: false, error: '空报文' };
    if (list[0] !== ADDR.write) {
      return { valid: false, error: '首字节不是 0x6E（不是显示器应答）', bytes: list };
    }
    if (list.length < 3) return { valid: false, error: '报文过短', bytes: list };
    var len = list[1] & 0x7F;
    var total = len + 3;
    var truncated = list.length < total;
    var b = list.slice(0, Math.max(total, 3));
    var op = b[2];
    var out = {
      valid: true, bytes: list, length: len, total: total, truncated: truncated,
      opcode: op, opcodeName: opcodeName(op),
      checksum: verifyChecksum(list)
    };
    if (op === OP.VCP_REPLY) {
      /* 长度不含校验和但含操作码：length = 7 + 码宽，据此反推 1/2/3 字节。
         显示器会沿用请求的码宽作答，所以这里必须自适应，不能写死。 */
      var wide = len >= 10 ? 3 : (len >= 9 ? 2 : 1);
      var rc = b[3];
      var ci = 4 + wide; /* 类型码位置 */
      out.code = 0;
      for (var k = 0; k < wide; k++) out.code = ((out.code << 8) | b[4 + k]) & 0xFFFFFF;
      out.typeCode = b[ci];
      out.max = ((b[ci + 1] << 8) | b[ci + 2]) & 0xFFFF;
      out.current = ((b[ci + 3] << 8) | b[ci + 4]) & 0xFFFF;
      out.resultCode = rc;
      out.result = RESULT_CODE[rc] || ('结果码 0x' + hex2(rc) + '（保留/厂商定义）');
      out.ok = rc === 0;
      out.wide = wide;
      out.type = TYPE_CODE[out.typeCode] || ('类型码 0x' + hex2(out.typeCode));
    } else if (op === OP.CAP_REPLY) {
      /* 6E <len> E3 <rc 或数据起始> <能力字符串片段…>；按 ASCII 可打印起点做启发式提取 */
      out.resultCode = b[3];
      out.ok = b[3] === 0;
      var start = (b[3] >= 0x20 && b[3] < 0x7F) ? 3 : 4;
      var chars = [];
      for (var j = start; j < b.length - 1; j++) {
        if (b[j] === 0) break;
        chars.push(b[j] >= 0x20 && b[j] < 0x7F ? String.fromCharCode(b[j]) : '?');
      }
      out.text = chars.join('');
    }
    return out;
  }

  function opcodeName(op) {
    for (var i = 0; i < DATA.OPCODES.length; i++) if (DATA.OPCODES[i].c === op) return DATA.OPCODES[i].en;
    return '未知操作码 0x' + hex2(op);
  }

  /* 校验和核对：先按主机方向的 0x6E 规则，再试应答方向的几种写法 */
  function verifyChecksum(list) {
    list = bytes(list);
    if (list.length < 3) return { ok: false, candidates: [] };
    var given = list[list.length - 1];
    var msg = list.slice(0, list.length - 1);
    var cands = [];
    if (msg[0] === ADDR.host) {
      cands.push({ rule: '0x6E ⊕ 全部字节（主机方向）', addr: ADDR.write, value: checksum(msg, ADDR.write) });
    } else {
      var bodyNoAddr = msg.slice(1);
      cands.push({ rule: '0x50 ⊕ 报文主体（显示器应答，0x50 虚拟地址）', value: checksum(bodyNoAddr, 0x50) });
      cands.push({ rule: '0x6E ⊕ 报文主体', value: checksum(bodyNoAddr, ADDR.write) });
      cands.push({ rule: '0x6F ⊕ 0x51 ⊕ 后续字节', value: checksum([ADDR.read, ADDR.host].concat(msg.slice(2)), 0) });
      cands.push({ rule: '无地址项，纯异或', value: checksum(bodyNoAddr, 0) });
    }
    var hit = null;
    for (var i = 0; i < cands.length; i++) if (cands[i].value === given) { hit = cands[i]; break; }
    return { ok: !!hit, given: given, matched: hit, candidates: cands };
  }

  /* 逐字节解释（用于界面上的字节分解表） */
  function describe(list) {
    list = bytes(list);
    var rows = [], i;
    if (!list.length) return rows;
    var toDisplay = list[0] === ADDR.host;
    rows.push({
      index: 0, value: list[0],
      field: toDisplay ? '源地址（主机）' : '源地址（显示器）',
      note: toDisplay ? '主机发送的报文固定以 0x51 开头' : '显示器的应答以 0x6E 开头'
    });
    if (list.length > 1) {
      var n = list[1] & 0x7F;
      rows.push({
        index: 1, value: list[1], field: '长度',
        note: '高位置 1；低 7 位 = 紧随其后的 ' + n + ' 个数据字节（不含校验和）'
      });
    }
    if (list.length > 2) {
      rows.push({ index: 2, value: list[2], field: '操作码', note: opcodeName(list[2]) });
    }
    var dataEnd = list.length - 1;
    for (i = 3; i < dataEnd; i++) {
      rows.push({ index: i, value: list[i], field: '数据', note: fieldNote(list, i, toDisplay) });
    }
    if (list.length > 3) {
      var cs = verifyChecksum(list);
      rows.push({
        index: list.length - 1, value: list[dataEnd], field: '校验和',
        note: cs.ok ? ('与「' + cs.matched.rule + '」一致') :
          ('不匹配（按 0x6E 规则应为 0x' + hex2(cs.candidates[0].value) + '）')
      });
    }
    return rows;
  }

  function fieldNote(list, i, toDisplay) {
    var op = list[2];
    var len = list[1] & 0x7F;
    /* 长度字节包含操作码，三种报文的换算公式各不相同（见文件头）：
         get 请求    length = 1 + n        → n = length - 1
         set 请求    length = 3 + n        → n = length - 3
         0x02 应答   length = 7 + n        → n = length - 7
       0xF3 能力请求的数据是 2 字节偏移量，与码宽无关。 */
    var getWide = len >= 4 ? 3 : (len === 3 ? 2 : 1);
    var setWide = len >= 6 ? 3 : (len === 4 ? 1 : 2);
    var repWide = len >= 10 ? 3 : (len >= 9 ? 2 : 1);
    if (op === OP.SET_VCP) {
      var vw = setWide;
      if (i === 3) return vw === 1 ? 'VCP 码' : (vw === 3 ? 'VCP 码第 1 字节' : 'VCP 码高字节');
      if (i === 4) return vw === 1 ? '数值高字节' : (vw === 3 ? 'VCP 码第 2 字节' : 'VCP 码低字节');
      if (i === 5) return vw === 1 ? '数值低字节' : (vw === 3 ? 'VCP 码第 3 字节' : '数值高字节');
      if (i === 6) return vw === 3 ? '数值高字节' : '数值低字节';
      if (i === 7) return '数值低字节';
    }
    if (op === OP.GET_VCP) {
      if (i === 3) return getWide === 1 ? 'VCP 码' : (getWide === 3 ? 'VCP 码第 1 字节' : 'VCP 码高字节');
      if (i === 4 && getWide >= 2) return getWide === 3 ? 'VCP 码第 2 字节' : 'VCP 码低字节';
      if (i === 5 && getWide === 3) return 'VCP 码第 3 字节';
    }
    if (op === OP.VCP_REPLY) {
      if (i === 3) return '结果码';
      if (i >= 4 && i < 4 + repWide) return repWide === 1 ? 'VCP 码' : ('VCP 码第 ' + (i - 3) + ' 字节');
      if (i === 4 + repWide) return '类型码';
      if (i === 5 + repWide || i === 6 + repWide) return '最大值';
      if (i === 7 + repWide || i === 8 + repWide) return '当前值';
    }
    if (op === OP.CAP_REQ && i === 3) return '偏移量高字节';
    if (op === OP.CAP_REQ && i === 4) return '偏移量低字节';
    if (op === OP.CAP_REPLY) return '能力字符串片段（ASCII）';
    return '';
  }

  /* ------------------------------ VCP 码表查询 ------------------------------ */

  function vcp(code) {
    code = code & 0xFFFFFF;
    for (var i = 0; i < DATA.VCP.length; i++) if (DATA.VCP[i].c === code) return DATA.VCP[i];
    return null;
  }

  function vcpName(code, fallback) {
    var e = vcp(code);
    if (e) return e.zh + '（' + e.en + '）';
    return fallback || ('未收录的 VCP 码 ' + vcpText(code));
  }

  function typeText(t) {
    if (t === 'C') return '连续量 C';
    if (t === 'NC') return '非连续量 NC';
    if (t === 'CNC') return '复合非连续量 CNC';
    if (t === 'T') return '表类型 T';
    return t || '未知';
  }

  function rwText(rw) {
    if (rw === 'RW') return '可读可写';
    if (rw === 'RO') return '只读';
    if (rw === 'WO') return '只写';
    return rw || '';
  }

  /* 把数值翻译成人类可读文案；capValues 为 capabilities 里给出的枚举值表 */
  function formatValue(code, value, capValues) {
    if (value === null || value === undefined) return '—';
    var maps = [];
    if (capValues) maps.push(capValues);
    var e = vcp(code);
    if (e && e.v) maps.push(e.v);
    for (var i = 0; i < maps.length; i++) {
      var m = maps[i];
      if (m && Object.prototype.hasOwnProperty.call(m, value)) return m[value] + '（' + value + '）';
      for (var k in m) if (Object.prototype.hasOwnProperty.call(m, k) && Number(k) === value) {
        return m[k] + '（' + value + '）';
      }
    }
    return String(value);
  }

  /* --------------------------- 能力字符串解析 --------------------------- */

  /* 输入形如：
   *   prot(monitor) type(lcd) model(U2713HM) cmds(01 02 03 07 0C E3 F3)
   *   vcp(02 04 10 12 14(01 04 05) 60(01 03 0F) D6(01 04 05) EB(00 01)(02 03)) mccs_ver(2.1)
   * 输出：{ prot, type, model, mccsVer, cmds, vcp:[{code, values, groups}], keys:{...} }
   */
  function parseCapabilities(text) {
    var out = { vcp: [], cmds: [], keys: {}, raw: String(text || '') };
    var s = String(text || '');
    var re = /([A-Za-z_][A-Za-z0-9_]*)\s*\(/g, m;
    var items = [];
    while ((m = re.exec(s)) !== null) {
      var key = m[1].toLowerCase();
      var start = re.lastIndex, depth = 1, i = start;
      while (i < s.length && depth > 0) {
        var ch = s.charAt(i);
        if (ch === '(') depth++;
        else if (ch === ')') depth--;
        i++;
      }
      items.push({ key: key, body: s.slice(start, i - 1) });
      re.lastIndex = i;
    }
    for (var j = 0; j < items.length; j++) {
      var it = items[j];
      switch (it.key) {
        case 'prot': out.prot = trim(it.body); break;
        case 'type': out.type = trim(it.body); break;
        case 'model': out.model = trim(it.body); break;
        case 'mccs_ver': out.mccsVer = trim(it.body); break;
        case 'cmds_ver': out.cmdsVer = trim(it.body); break;
        case 'mswhql': out.mswhql = trim(it.body); break;
        case 'asset_eep': out.assetEep = trim(it.body); break;
        case 'cmds': out.cmds = parseHexList(it.body); break;
        case 'vcp': out.vcp = parseVcpList(it.body); break;
        default: out.keys[it.key] = it.body; break;
      }
    }
    out.count = out.vcp.length;
    return out;
  }

  function trim(s) { return String(s).trim(); }

  function parseHexList(body) {
    var toks = String(body).match(/[0-9a-fA-F]{1,4}/g) || [], out = [];
    for (var i = 0; i < toks.length; i++) out.push(parseInt(toks[i], 16));
    return out;
  }

  /* vcp() 内部：码后可能跟若干括号组（简单 NC 一组；复合 NC 两组） */
  function parseVcpList(body) {
    var s = String(body), i = 0, cur = null, out = [];
    while (i < s.length) {
      var ch = s.charAt(i);
      if (/\s/.test(ch)) { i++; continue; }
      if (ch === '(') {
        var depth = 1, start = ++i;
        while (i < s.length && depth > 0) {
          if (s.charAt(i) === '(') depth++;
          else if (s.charAt(i) === ')') depth--;
          i++;
        }
        var inner = s.slice(start, i - 1);
        if (cur) {
          var vals = parseHexList(inner);
          if (cur.groups.length === 0) cur.values = vals;
          cur.groups.push(vals);
        }
        continue;
      }
      var m = /^[0-9a-fA-F]{1,6}/.exec(s.slice(i));
      if (m) {
        var code = parseInt(m[0], 16);
        cur = { code: code, values: null, groups: [], wide: m[0].length > 4 ? 3 : 2 };
        out.push(cur);
        i += m[0].length;
        continue;
      }
      /* 其它符号（? / n 等）挂到当前码上作标记 */
      if (cur) { cur.unknown = true; }
      i++;
    }
    return out;
  }

  /* --------------------------- 等价命令行导出 --------------------------- */

  function toDdcutil(kind, opts) {
    opts = opts || {};
    var m = (opts.monitor ? '--display ' + (opts.monitor + 1) + ' ' : '');
    switch (kind) {
      case 'get': return 'ddcutil ' + m + 'getvcp ' + vcpText(opts.code);
      case 'set': return 'ddcutil ' + m + 'setvcp ' + vcpText(opts.code) + ' ' + (opts.value || 0);
      case 'save': return 'ddcutil ' + m + 'scs';
      case 'cap': return 'ddcutil ' + m + 'capabilities';
      case 'list': return 'ddcutil detect && ddcutil ' + m + 'getvcp known';
      default: return '';
    }
  }

  /* Linux 上用 i2ctransfer 直接发原始帧（写 + 读两步） */
  function toI2cTransfer(list, bus, readLen) {
    var b = bytes(list);
    if (!b.length) return '';
    var payload = b.slice(1); /* 去掉首字节 0x6E —— 它就是 I²C 从机地址 */
    var w = 'i2ctransfer -y ' + (bus === undefined ? 4 : bus) + ' w' + payload.length +
      '@0x' + ADDR.slave7.toString(16) + ' ' + payload.map(function (x) { return '0x' + hex2(x); }).join(' ');
    var r = 'i2ctransfer -y ' + (bus === undefined ? 4 : bus) + ' r' + (readLen || 11) +
      '@0x' + ADDR.slave7.toString(16);
    return w + '\n' + r;
  }

  /* 通过本地桥接执行（等价于界面上的按钮操作） */
  function toCurl(kind, opts) {
    opts = opts || {};
    var base = opts.base || 'http://127.0.0.1:8760';
    var m = opts.monitor || 0;
    switch (kind) {
      case 'get':
        return 'curl "' + base + '/api/vcp?monitor=' + m + '&code=0x' + hex4(opts.code) + '"';
      case 'set':
        return 'curl -X POST "' + base + '/api/vcp" -H "Content-Type: application/json" -d "{\\"monitor\\":' +
          m + ',\\"code\\":' + (opts.code | 0) + ',\\"value\\":' + (opts.value | 0) + '}"';
      case 'cap':
        return 'curl "' + base + '/api/capabilities?monitor=' + m + '"';
      case 'monitors':
        return 'curl "' + base + '/api/monitors"';
      default: return '';
    }
  }

  function toBridgeScript(kind, opts) {
    opts = opts || {};
    var m = opts.monitor || 0;
    var base = 'powershell -ExecutionPolicy Bypass -File ddc-windows.ps1 -Monitor ' + m;
    if (kind === 'get') return base + ' -Action get -Code 0x' + hex4(opts.code);
    if (kind === 'set') return base + ' -Action set -Code 0x' + hex4(opts.code) + ' -Value ' + (opts.value | 0);
    if (kind === 'cap') return base + ' -Action capabilities';
    if (kind === 'list') return 'powershell -ExecutionPolicy Bypass -File ddc-windows.ps1 -Action list';
    return base;
  }

  /* ------------------------------ 导出 ------------------------------ */

  window.MCCS = {
    ADDR: ADDR, OP: OP, TYPE_CODE: TYPE_CODE, RESULT_CODE: RESULT_CODE,
    hex: hex, bytes: bytes, hex2: hex2, hex4: hex4, hex6: hex6, vcpText: vcpText,
    checksum: checksum, frame: frame, vcpBytes: vcpBytes, normWide: normWide,
    buildGetVCP: buildGetVCP, buildSetVCP: buildSetVCP, buildSaveSettings: buildSaveSettings,
    buildVcpReset: buildVcpReset, buildGetCapabilities: buildGetCapabilities,
    buildRaw: buildRaw, build: build,
    parseReply: parseReply, verifyChecksum: verifyChecksum, describe: describe,
    opcodeName: opcodeName,
    vcp: vcp, vcpName: vcpName, typeText: typeText, rwText: rwText, formatValue: formatValue,
    parseCapabilities: parseCapabilities,
    toDdcutil: toDdcutil, toI2cTransfer: toI2cTransfer, toCurl: toCurl, toBridgeScript: toBridgeScript
  };
})();
