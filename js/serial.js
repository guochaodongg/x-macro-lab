/* =============================================================================
 * serial.js — 串口调试的协议/格式逻辑与传输适配层。除适配器外全部是纯函数，
 *             不碰 DOM，可以直接在 Node 里测试。
 *
 * ── 两种传输方式（浏览器拿不到串口，这是本页最需要说清楚的一点） ──────────
 *   1) bridge     本地桥接（tools/ddc-bridge.js + tools/serial-windows.ps1）：
 *                 能列出**全部 COM 口**（含友好名与 VID/PID）、能从 file:// 用、
 *                 支持 1.5 位停止位与 XON/XOFF；代价是要在本机跑一个 Node 进程。
 *   2) webserial  浏览器直连（Web Serial API）：零安装，但仅 https / localhost
 *                 可用、只能列出「已授权过」的串口、拿不到 COM 号，
 *                 且不支持 mark/space 校验、1.5 位停止位、XON/XOFF。
 *   两个适配器对外暴露同一组方法：list / open / close / write / on，
 *   所以界面层不必关心背后是哪一个（transportOrder 决定尝试顺序）。
 *
 * ── 终端缓冲（termFeed）────────────────────────────────────────────────
 *   普通模式把收到的字节原样追加；终端模式则按真实终端语义解释控制字符：
 *     CR  → 光标回行首，后续字符**覆盖**该行（设备刷新进度条就是靠它）
 *     LF  → 换行
 *     BS  → 删除上一个字符
 *     ESC / BEL / FF → 不显示（ESC 序列不做完整解析，只忽略控制字节）
 *   这既是「终端模式」的样子，也是它比普通模式更准的地方。
 * ========================================================================== */
(function () {
  'use strict';

  var DATA = window.SERIALData || {};
  var EOL_TABLE = { crlf: [0x0D, 0x0A], lf: [0x0A], cr: [0x0D], none: [] };
  var CTRL_NAMED = {
    0x00: '\\0', 0x07: '\\a', 0x08: '\\b', 0x09: '\\t', 0x0A: '\\n',
    0x0B: '\\v', 0x0C: '\\f', 0x0D: '\\r', 0x1B: '\\e'
  };

  /* ------------------------------ 基础工具 ------------------------------ */

  function bytes(input) {
    if (input === null || input === undefined) return new Uint8Array(0);
    if (input instanceof Uint8Array) return input.slice();
    if (Array.isArray(input)) {
      var a = new Uint8Array(input.length);
      for (var k = 0; k < input.length; k++) a[k] = input[k] & 0xFF;
      return a;
    }
    if (typeof input === 'number') return new Uint8Array([input & 0xFF]);
    var s = String(input).replace(/0x/gi, '').replace(/[^0-9a-fA-F]/g, '');
    if (s.length % 2) s = s.substring(0, s.length - 1);
    if (!s.length) return new Uint8Array(0);
    var out = new Uint8Array(s.length / 2);
    for (var i = 0; i < out.length; i++) out[i] = parseInt(s.substr(i * 2, 2), 16);
    return out;
  }

  function hex2(n) { return ('0' + (n & 0xFF).toString(16).toUpperCase()).slice(-2); }
  function hex4(n) { return ('000' + (n & 0xFFFF).toString(16).toUpperCase()).slice(-4); }

  function hex(input) {
    var b = input instanceof Uint8Array ? input : bytes(input);
    var out = [];
    for (var i = 0; i < b.length; i++) out.push(hex2(b[i]));
    return out.join(' ');
  }

  function concat() {
    var total = 0, i;
    for (i = 0; i < arguments.length; i++) total += arguments[i] ? arguments[i].length : 0;
    var out = new Uint8Array(total), off = 0;
    for (i = 0; i < arguments.length; i++) {
      var part = arguments[i];
      if (!part || !part.length) continue;
      out.set(part, off);
      off += part.length;
    }
    return out;
  }

  function msg(e) { return String(e && e.message ? e.message : e); }

  /* ------------------------------- 编解码 ------------------------------- */

  function textToBytes(text, enc) {
    var s = (text === null || text === undefined) ? '' : String(text);
    if (enc === 'latin1' || enc === 'ascii') {
      var out = new Uint8Array(s.length);
      for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xFF;
      return out;
    }
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(s);
    /* 没有 TextEncoder 的环境（老浏览器、jsdom）：ASCII 逐字节，非 ASCII 借
       encodeURIComponent 取 UTF-8 字节。注意不能把结果再丢给十六进制解析器，
       否则 'AT' 里的 T 不是十六进制字符，会被整段丢掉。 */
    var arr = [];
    for (var j = 0; j < s.length; j++) {
      var c = s.charCodeAt(j);
      if (c < 0x80) { arr.push(c); continue; }
      var pct = '';
      try { pct = encodeURIComponent(s.charAt(j)); } catch (e) { pct = '%3F'; }
      var parts = pct.replace(/^%/, '').split('%');
      for (var k = 0; k < parts.length; k++) {
        if (parts[k]) arr.push(parseInt(parts[k], 16) & 0xFF);
      }
    }
    return new Uint8Array(arr);
  }

  /* 接收解码。latin1 走逐字节映射（不丢任何字节），其它交给 TextDecoder。 */
  function decodeBytes(input, enc) {
    var b = input instanceof Uint8Array ? input : bytes(input);
    var name = enc || 'utf-8';
    if (name === 'latin1' || name === 'ascii') {
      var s = '';
      for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
      return s;
    }
    if (typeof TextDecoder !== 'undefined') {
      try {
        return new TextDecoder(name, { fatal: false }).decode(b);
      } catch (e) { /* 该环境不支持这个编码名 */ }
    }
    var out = '';
    for (var k = 0; k < b.length; k++) out += String.fromCharCode(b[k]);
    return out;
  }

  function eolBytes(name) {
    var t = EOL_TABLE[name];
    if (!t) return new Uint8Array(0);
    return new Uint8Array(t);
  }

  function eolLabel(name) {
    if (name === 'lf') return 'LF';
    if (name === 'cr') return 'CR';
    if (name === 'none') return '不追加';
    return 'CR LF';
  }

  /* ------------------------------- 呈现层 ------------------------------- */

  function printable(b) { return (b >= 0x20 && b < 0x7F) ? String.fromCharCode(b) : '.'; }

  /* 把控制字符变成可见的转义，避免「日志看着是空行其实有 \r」这类误判 */
  function escapeText(s, opts) {
    opts = opts || {};
    var keepNL = opts.keepNewline !== false;
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c === 10) { out += keepNL ? '\n' : '\\n'; continue; }
      if (c === 9) { out += keepNL ? '\t' : '\\t'; continue; }
      if (c === 13) { out += '\\r'; continue; }                /* 回车单独可见 */
      if (c < 32 || c === 127) { out += CTRL_NAMED[c] || ('\\x' + hex2(c)); continue; }
      out += s.charAt(i);
    }
    return out;
  }

  function hexdump(input, opts) {
    opts = opts || {};
    var b = input instanceof Uint8Array ? input : bytes(input);
    var w = opts.width || 16, base = opts.offset || 0;
    var rows = [];
    if (!b.length) return [{ off: base, hex: '', ascii: '', len: 0 }];
    for (var i = 0; i < b.length; i += w) {
      var hx = [], as = '', n = Math.min(w, b.length - i);
      for (var j = 0; j < w; j++) {
        if (j < n) { hx.push(hex2(b[i + j])); as += printable(b[i + j]); }
        else { hx.push('  '); as += ' '; }
      }
      rows.push({ off: base + i, hex: hx.join(' '), ascii: as, len: n });
    }
    return rows;
  }

  function describeBytes(input) {
    var b = input instanceof Uint8Array ? input : bytes(input);
    var d = { total: b.length, printable: 0, control: 0, high: 0, nl: 0, cr: 0, esc: 0 };
    for (var i = 0; i < b.length; i++) {
      var v = b[i];
      if (v === 0x0A) d.nl++;
      else if (v === 0x0D) d.cr++;
      else if (v === 0x1B) d.esc++;
      if (v >= 0x20 && v < 0x7F) d.printable++;
      else if (v < 0x20 || v === 0x7F) d.control++;
      else d.high++;
    }
    return d;
  }

  /* ------------------------ 终端屏幕模型（带 ANSI 颜色） ------------------------
     每个可见字符是一个 cell {ch, s}，s 指向写入时的 SGR 样式对象。样式对象是
     copy-on-write 的：SGR 改样式时先克隆再改，同一样式的连续单元格共享一个对象，
     渲染时把相同样式的相邻字符合并成一个 <span>，颜色直接来自 ANSI 调色板。
     转义序列可能被分包截断（ESC 在上一帧、参数在这一帧），状态放在 st.esc 里跨帧续。 */

  var TERM_FG = ['#8a919c', '#ff7b72', '#3fd35f', '#e3b341', '#5c9dff', '#d2a8ff', '#39c5cf', '#e8eaed'];
  var TERM_BG = ['#3a3f46', '#57201d', '#1c4426', '#4b3a10', '#1d3a5f', '#3a2560', '#164a52', '#464c54'];
  var TERM_FG_BRIGHT = ['#9aa4ae', '#ff8f8f', '#5af08a', '#f5c95e', '#79b8ff', '#e0b8ff', '#5ad8e6', '#ffffff'];
  var TERM_BG_BRIGHT = ['#4a5058', '#6b2b27', '#245633', '#5c4815', '#254a76', '#4a3078', '#1c5c66', '#585f68'];

  /* xterm 256 色表：0-15 基本色、16-231 6×6×6 立方、232-255 灰阶 */
  function ansi256(n) {
    if (!(n >= 0)) n = 0;
    if (n < 16) return n < 8 ? TERM_FG[n] : TERM_FG_BRIGHT[n - 8];
    if (n < 232) {
      var c = [0, 95, 135, 175, 215, 255];
      n -= 16;
      var b = n % 6, g = (n / 6 | 0) % 6, r = (n / 36 | 0) % 6;
      return 'rgb(' + c[r] + ',' + c[g] + ',' + c[b] + ')';
    }
    var v = 8 + (n - 232) * 10;
    return 'rgb(' + v + ',' + v + ',' + v + ')';
  }

  function termStyleNew() {
    return { fg: null, bg: null, bold: false, dim: false, italic: false, underline: false, invert: false };
  }
  function termStyleClone(s) {
    return { fg: s.fg, bg: s.bg, bold: s.bold, dim: s.dim, italic: s.italic, underline: s.underline, invert: s.invert };
  }
  function termStyleKey(s) {
    return (s.fg || '') + '|' + (s.bg || '') + '|' + (s.bold ? 1 : 0) + (s.dim ? 1 : 0) +
      (s.italic ? 1 : 0) + (s.underline ? 1 : 0) + (s.invert ? 1 : 0);
  }
  function termStylePlain(s) {
    return !s.fg && !s.bg && !s.bold && !s.dim && !s.italic && !s.underline && !s.invert;
  }

  function termNew(opts) {
    opts = opts || {};
    return {
      rows: [[]], c: 0, r: 0, maxRows: opts.maxRows || 4000, maxCols: opts.maxCols || 2048,
      style: termStyleNew(), saved: null, esc: ''
    };
  }

  function termClamp(st) {
    if (st.r < 0) st.r = 0;
    if (st.r >= st.rows.length) st.r = st.rows.length - 1;
    if (st.c < 0) st.c = 0;
    if (st.c >= st.maxCols) st.c = st.maxCols - 1;
  }

  function termPut(st, ch) {
    if (st.c >= st.maxCols) return;
    var row = st.rows[st.r] || (st.rows[st.r] = []);
    row[st.c] = { ch: ch, s: st.style };
    st.c++;
  }

  /* 退格：删掉光标处字符（和旧字符串模型一致，后续字符左移） */
  function termDelCell(st) {
    var row = st.rows[st.r];
    if (row && st.c < row.length) row.splice(st.c, 1);
  }

  function termLF(st) {
    if (st.r >= st.rows.length - 1) {
      st.rows.push([]);
      if (st.rows.length > st.maxRows) st.rows.shift();
      st.r = st.rows.length - 1;
    } else st.r++;
    st.c = 0;
  }

  function termUp(st) { if (st.r > 0) st.r--; }

  /* ED — 擦除显示。n=0 光标到屏末、1 屏首到光标、2 整屏 */
  function termED(st, n) {
    if (n === 2 || n === 3) {
      st.rows = [[]];
      st.r = 0;
      return;
    }
    var row = st.rows[st.r] || [];
    if (n === 1) {
      for (var j = 0; j < row.length && j < st.c; j++) row[j] = null;
    } else {
      if (st.c < row.length) row.length = st.c;
      st.rows.length = st.r + 1;
    }
  }

  /* EL — 擦除行。n=0 光标到行尾、1 行首到光标、2 整行 */
  function termEL(st, n) {
    var row = st.rows[st.r] || (st.rows[st.r] = []);
    if (n === 2) { row.length = 0; return; }
    if (n === 1) { for (var j = 0; j < row.length && j < st.c; j++) row[j] = null; return; }
    if (st.c < row.length) row.length = st.c;
  }

  /* SGR — 字符属性（颜色 / 加粗 / 下划线…）。先克隆再改，避免改到已落地的单元格 */
  function termSGR(st, parts) {
    var s = termStyleClone(st.style);
    for (var i = 0; i < parts.length; i++) {
      var v = parseInt(parts[i], 10);
      if (isNaN(v)) v = 0;
      if (v === 0) s = termStyleNew();
      else if (v === 1) s.bold = true;
      else if (v === 2) s.dim = true;
      else if (v === 3) s.italic = true;
      else if (v === 4) s.underline = true;
      else if (v === 7) s.invert = true;
      else if (v === 21 || v === 22) { s.bold = false; s.dim = false; }
      else if (v === 23) s.italic = false;
      else if (v === 24) s.underline = false;
      else if (v === 27) s.invert = false;
      else if (v >= 30 && v <= 37) s.fg = TERM_FG[v - 30];
      else if (v === 39) s.fg = null;
      else if (v >= 40 && v <= 47) s.bg = TERM_BG[v - 40];
      else if (v === 49) s.bg = null;
      else if (v >= 90 && v <= 97) s.fg = TERM_FG_BRIGHT[v - 90];
      else if (v >= 100 && v <= 107) s.bg = TERM_BG_BRIGHT[v - 100];
      else if (v === 38 || v === 48) {
        var color = null;
        if (parts[i + 1] === '5') { color = ansi256(parseInt(parts[i + 2], 10)); i += 2; }
        else if (parts[i + 1] === '2') {
          color = 'rgb(' + (parseInt(parts[i + 2], 10) || 0) + ',' + (parseInt(parts[i + 3], 10) || 0) + ',' +
            (parseInt(parts[i + 4], 10) || 0) + ')';
          i += 4;
        }
        if (v === 38) s.fg = color; else s.bg = color;
      }
    }
    st.style = s;
  }

  /* CSI — ESC [ 参数 终止字节 */
  function termCSI(st, seq) {
    var fin = seq.charAt(seq.length - 1);
    var body = seq.substring(0, seq.length - 1);
    while (body && '<=>?'.indexOf(body.charAt(0)) >= 0) body = body.substring(1);
    var parts = body.split(';');
    function p(k, d) { var v = parseInt(parts[k], 10); return isNaN(v) ? d : v; }
    switch (fin) {
      case 'm': termSGR(st, parts); break;
      case 'J': termED(st, p(0, 0)); break;
      case 'K': termEL(st, p(0, 0)); break;
      case 'A': st.r -= p(0, 1); termClamp(st); break;
      case 'B': st.r += p(0, 1); termClamp(st); break;
      case 'C': st.c = Math.min(st.maxCols - 1, st.c + p(0, 1)); break;
      case 'D': st.c = Math.max(0, st.c - p(0, 1)); break;
      case 'E': st.r += p(0, 1); termClamp(st); st.c = 0; break;
      case 'F': st.r -= p(0, 1); termClamp(st); st.c = 0; break;
      case 'G': case '`': st.c = Math.max(0, p(0, 1) - 1); break;
      case 'd': termAbsRow(st, p(0, 1) - 1); break;
      case 'H': case 'f':
        termAbsRow(st, p(0, 1) - 1);
        st.c = p(1, 1) - 1;
        termClamp(st);
        break;
      case 's': st.saved = { c: st.c, r: st.r }; break;
      case 'u': if (st.saved) { st.c = st.saved.c; st.r = st.saved.r; termClamp(st); } break;
      /* 其它（DEC 私有序列、窗口操作等）：吞掉不显示 */
    }
  }

  function termRestore(st) {
    if (!st.saved) return;
    st.c = st.saved.c; st.r = st.saved.r; termClamp(st);
  }
  /* 绝对行定位：目标行不存在就补空行（真终端的屏幕本来就是整屏的） */
  function termAbsRow(st, r) {
    if (!(r >= 0)) r = 0;
    while (st.rows.length <= r) st.rows.push([]);
    st.r = r;
  }
  function termRIS(st) {
    st.rows = [[]]; st.c = 0; st.r = 0;
    st.style = termStyleNew(); st.saved = null; st.esc = '';
  }

  /* 单步转义状态机：e === '\x1b' 待定；'\x1b[' CSI 收参中；'\x1b]' OSC 收参中；
     '\x1bX'（X 为 ( ) * + # % 等）表示还要再吞一个中间字符 */
  function termEsc(st, ch) {
    var e = st.esc;
    if (e === '\x1b') {
      st.esc = '';
      if (ch === '[') { st.esc = '\x1b['; return; }
      if (ch === ']') { st.esc = '\x1b]'; return; }
      if (ch === '7') st.saved = { c: st.c, r: st.r };
      else if (ch === '8') termRestore(st);
      else if (ch === 'D') termLF(st);
      else if (ch === 'M') termUp(st);
      else if (ch === 'E') { st.c = 0; termLF(st); }
      else if (ch === 'c') termRIS(st);
      else if ('()*+#%'.indexOf(ch) >= 0) st.esc = '\x1b' + ch + ' ';
      return;
    }
    if (e.charAt(1) === '[') {
      var last = ch.charCodeAt(0);
      if (last >= 0x40 && last <= 0x7E) { st.esc = ''; termCSI(st, e.substring(2) + ch); }
      else if (e.length < 64) st.esc = e + ch;
      else st.esc = '';
      return;
    }
    if (e.charAt(1) === ']') {
      if (e.length === 2) { st.esc = e + ch; return; }
      if (ch === '\x07' || (e.charAt(e.length - 1) === '\x1b' && ch === '\\')) st.esc = '';
      else if (e.length < 512) st.esc = e + ch;
      else st.esc = '';
      return;
    }
    st.esc = '';
  }

  function termFeed(st, text) {
    if (!st || !text) return st;
    text = String(text);
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i), code = text.charCodeAt(i);
      if (st.esc) { termEsc(st, ch); continue; }
      if (code === 27) { st.esc = '\x1b'; continue; }         /* ESC 进转义状态机 */
      if (code === 10) { termLF(st); continue; }               /* LF 换行 */
      if (code === 13) { st.c = 0; continue; }                 /* CR 回到行首：后续覆盖 */
      if (code === 8) {                                        /* 退格 */
        if (st.c > 0) { st.c--; termDelCell(st); }
        continue;
      }
      if (code === 9) {                                        /* 制表符按 8 列对齐 */
        var n = 8 - (st.c % 8);
        for (var k = 0; k < n; k++) termPut(st, ' ');
        continue;
      }
      if (code < 32 || code === 127) continue;                 /* BEL / FF 等不显示 */
      termPut(st, ch);
    }
    return st;
  }

  function termRowText(row) {
    var s = '';
    for (var j = 0; j < row.length; j++) s += row[j] ? row[j].ch : ' ';
    return s.replace(/\s+$/, '');
  }

  function termText(st, maxRows) {
    if (!st) return '';
    var rows = st.rows;
    if (maxRows && rows.length > maxRows) rows = rows.slice(rows.length - maxRows);
    var out = [];
    for (var i = 0; i < rows.length; i++) out.push(termRowText(rows[i]));
    return out.join('\n');
  }

  function termSize(st) {
    if (!st) return { rows: 0, cols: 0 };
    var cols = 0;
    for (var i = 0; i < st.rows.length; i++) cols = Math.max(cols, termRowText(st.rows[i]).length);
    return { rows: st.rows.length, cols: cols };
  }

  /* 渲染成 HTML：相同样式的相邻单元格合并成一个 <span>，颜色用内联样式。
     返回的 HTML 已对 &, <, > 转义，可直接 innerHTML。 */
  function termSpan(text, style) {
    if (!style || termStylePlain(style)) return text;
    var fg = style.fg, bg = style.bg;
    if (style.invert) {
      var t = fg; fg = bg; bg = t;
      if (!fg && !bg) { fg = '#0e1116'; bg = '#c9ced4'; }
    }
    var css = '';
    if (fg) css += 'color:' + fg + ';';
    if (bg) css += 'background:' + bg + ';';
    if (style.bold) css += 'font-weight:700;';
    if (style.dim) css += 'opacity:.62;';
    if (style.italic) css += 'font-style:italic;';
    if (style.underline) css += 'text-decoration:underline;';
    return css ? '<span style="' + css + '">' + text + '</span>' : text;
  }

  function termHTML(st, maxRows) {
    if (!st) return '';
    var rows = st.rows;
    if (maxRows && rows.length > maxRows) rows = rows.slice(rows.length - maxRows);
    var out = '', run = '', runKey = null, runStyle = null;
    function esc1(c) { return c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c; }
    function flush() {
      if (!run) return;
      out += termSpan(run, runStyle);
      run = '';
    }
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      for (var j = 0; j < row.length; j++) {
        var cell = row[j];
        var k = cell ? termStyleKey(cell.s) : '';
        if (k !== runKey) { flush(); runKey = k; runStyle = cell ? cell.s : null; }
        run += esc1(cell ? cell.ch : ' ');
      }
      flush();
      if (i < rows.length - 1) out += '\n';
    }
    flush();
    return out;
  }

/* --------------------------- 内容嗅探（识别） --------------------------- */

  /* 判断这段数据「像终端输出」还是「像普通文本/二进制」。
     命中 ESC / 裸 CR（回车刷新）/ BEL / BS / FF 任意一条即判为终端。 */
  function sniffMode(input) {
    var b = input instanceof Uint8Array ? input : bytes(input);
    var d = describeBytes(b);
    var bareCr = 0;
    for (var i = 0; i < b.length; i++) if (b[i] === 0x0D && b[i + 1] !== 0x0A) bareCr++;
    var bell = 0, bs = 0, ff = 0;
    for (var j = 0; j < b.length; j++) {
      if (b[j] === 0x07) bell++;
      else if (b[j] === 0x08) bs++;
      else if (b[j] === 0x0C) ff++;
    }
    var reasons = [];
    if (d.esc) reasons.push('ANSI 转义序列');
    if (bareCr) reasons.push('回车刷同一行');
    if (bell) reasons.push('终端响铃');
    if (bs) reasons.push('退格删字');
    if (ff) reasons.push('换页');
    var raw = d.esc + bareCr + bell + bs + ff;
    return {
      mode: raw > 0 ? 'terminal' : 'normal',
      score: d.total ? Math.round((raw / d.total) * 1000) / 1000 : 0,
      reasons: reasons,
      bytes: d.total,
      printable: d.printable,
      control: d.control,
      high: d.high,
      nl: d.nl
    };
  }

  /* ------------------------------ 时间戳 ------------------------------ */

  function p2(n) { return ('0' + n).slice(-2); }
  function p3(n) { return ('00' + n).slice(-3); }

  function stamp(d, fmt) {
    d = d || new Date();
    if (fmt === 'time') return p2(d.getHours()) + ':' + p2(d.getMinutes()) + ':' + p2(d.getSeconds());
    if (fmt === 'ms') {
      return p2(d.getHours()) + ':' + p2(d.getMinutes()) + ':' + p2(d.getSeconds()) + '.' + p3(d.getMilliseconds());
    }
    return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + ' ' +
      p2(d.getHours()) + ':' + p2(d.getMinutes()) + ':' + p2(d.getSeconds()) + '.' + p3(d.getMilliseconds());
  }

  /* ------------------------------ 端口描述 ------------------------------ */

  function up(s) { return s ? String(s).toUpperCase() : ''; }

  /* 桥接返回的端口记录 → 界面用的统一结构 */
  function bridgePort(p) {
    p = p || {};
    var id = String(p.port || p.name || '').trim();
    var friendly = String(p.name || '').trim();
    var label = id;
    if (friendly && friendly.toUpperCase().indexOf(id.toUpperCase()) < 0) label = id + ' — ' + friendly;
    return {
      id: id, label: label || '（未命名串口）', detail: friendly || '',
      vid: up(p.vid), pid: up(p.pid), source: 'bridge', inUse: !!p.inUse, raw: p
    };
  }

  /* Web Serial 的 SerialPort 对象 → 界面用的统一结构。
     注意：浏览器**不提供 COM 号**，只能给 VID/PID。 */
  function webPort(raw, info) {
    info = info || (raw && typeof raw.getInfo === 'function' ? raw.getInfo() : null) || {};
    var vid = info.usbVendorId ? hex4(info.usbVendorId) : '';
    var pid = info.usbProductId ? hex4(info.usbProductId) : '';
    var label = (vid || pid)
      ? '浏览器设备 VID ' + (vid || '????') + ' / PID ' + (pid || '????')
      : '未识别的浏览器设备';
    return {
      id: 'ws:' + (vid || '?') + ':' + (pid || '?'), label: label,
      detail: '浏览器不提供 COM 号', vid: vid, pid: pid,
      source: 'webserial', raw: raw, info: info
    };
  }

  /* 合并「桥接列出的 COM 口」与「浏览器已授权的串口」：同一颗芯片（VID/PID 相同）
     视为同一个设备，保留桥接那条（它有 COM 号），并把 Web Serial 的句柄挂上去。 */
  function mergePortLists(bridgeList, webList) {
    var out = [], i;
    (bridgeList || []).forEach(function (p) { if (p) out.push(p); });
    (webList || []).forEach(function (w) {
      if (!w) return;
      var hit = null;
      for (i = 0; i < out.length; i++) {
        var p = out[i];
        if (p.vid && w.vid && p.vid === w.vid && p.pid === w.pid) { hit = p; break; }
      }
      if (hit) { hit.webRaw = w.raw; hit.aliases = (hit.aliases || []).concat([w.id]); }
      else out.push(w);
    });
    return out;
  }

  function portKey(p) { return p ? up(p.id) : ''; }

  /* 找出「上次用过的那个口」：先认 ID（COM3），再退而认 VID/PID */
  function matchPort(ports, remembered) {
    if (!ports || !ports.length || !remembered) return null;
    var want = portKey(remembered), i, p;
    if (want) for (i = 0; i < ports.length; i++) if (portKey(ports[i]) === want) return ports[i];
    var vid = up(remembered.vid), pid = up(remembered.pid);
    if (vid && pid) {
      for (i = 0; i < ports.length; i++) {
        p = ports[i];
        if (up(p.vid) === vid && up(p.pid) === pid) return p;
      }
    }
    return null;
  }

  function transportOrder(source) {
    if (source === 'bridge') return ['bridge'];
    if (source === 'webserial') return ['webserial'];
    return ['bridge', 'webserial'];
  }

  function transportName(kind) {
    if (kind === 'bridge') return '本地桥接';
    if (kind === 'webserial') return '浏览器直连 (Web Serial)';
    return '未连接';
  }

  /* --------------------------- 打开参数的映射 --------------------------- */

  function normalizeCfg(cfg) {
    cfg = cfg || {};
    var baud = parseInt(cfg.baud, 10);
    var bits = parseInt(cfg.dataBits, 10);
    var stop = parseFloat(cfg.stopBits);
    return {
      baud: (baud > 0 ? baud : 115200),
      dataBits: (bits >= 5 && bits <= 8) ? bits : 8,
      parity: cfg.parity || 'none',
      stopBits: (stop === 1 || stop === 1.5 || stop === 2) ? stop : 1,
      flow: cfg.flow || 'none',
      dtr: cfg.dtr !== false,
      rts: cfg.rts !== false,
      port: cfg.port || ''
    };
  }

  /* 同一份配置，翻译成 Web Serial 的 open() 参数；不支持的项目进 warnings */
  function toWebSerialOptions(cfg) {
    var c = normalizeCfg(cfg);
    var warnings = [];
    if (c.parity === 'mark' || c.parity === 'space') {
      warnings.push('Web Serial 不支持 mark / space 校验，将按无校验打开——需要它请改用本地桥接');
    }
    if (c.stopBits === 1.5) {
      warnings.push('Web Serial 只支持 1 或 2 位停止位，1.5 位将按 2 位打开——需要它请改用本地桥接');
    }
    if (c.flow === 'xonxoff') {
      warnings.push('Web Serial 不支持软件流控 XON/XOFF，将按无流控打开——需要它请改用本地桥接');
    }
    return {
      options: {
        baudRate: c.baud,
        dataBits: c.dataBits,
        stopBits: c.stopBits === 1.5 ? 2 : c.stopBits,
        parity: (c.parity === 'mark' || c.parity === 'space') ? 'none' : c.parity,
        flowControl: c.flow === 'rtscts' ? 'hardware' : 'none',
        bufferSize: 4096
      },
      setSignals: { dataTerminalReady: c.dtr, requestToSend: c.rts },
      warnings: warnings
    };
  }

  /* 同一份配置，翻译成桥接（PowerShell 串口后端）的请求体 */
  function toBridgeArgs(cfg) {
    var c = normalizeCfg(cfg);
    return {
      port: c.port, baud: c.baud, dataBits: c.dataBits, parity: c.parity,
      stopBits: c.stopBits, flow: c.flow, dtr: c.dtr, rts: c.rts
    };
  }

  /* ------------------------------ 预设命令 ------------------------------ */

  function presetBytes(item, opts) {
    opts = opts || {};
    if (!item) return new Uint8Array(0);
    if (item.hex) return bytes(item.hex);
    var body = textToBytes(item.text || '', opts.encoding || 'utf-8');
    var eol = item.eol === undefined ? (opts.eol === undefined ? 'none' : opts.eol) : item.eol;
    return concat(body, eolBytes(eol));
  }

  /* ---------------------------- 传输：Web Serial ---------------------------- */

  function makeWebSerialTransport(navSerial) {
    var events = { data: [], disconnect: [] };
    var port = null, reader = null, writer = null, open_ = false;

    function emit(name, arg) {
      (events[name] || []).forEach(function (f) { try { f(arg); } catch (e) { /* 回调自己出错不影响收流 */ } });
    }
    function on(name, fn) { if (events[name]) events[name].push(fn); }

    function available() { return !!(navSerial && typeof navSerial.requestPort === 'function'); }

    function noApi() {
      return {
        ok: false,
        error: '当前页面用不了 Web Serial（浏览器需为 Chrome / Edge，且页面必须是 https 或 localhost）。' +
          '用本地桥接可以不受这个限制。'
      };
    }

    function safeInfo(p) {
      try { return (p && typeof p.getInfo === 'function') ? (p.getInfo() || {}) : {}; } catch (e) { return {}; }
    }

    function list() {
      if (!available()) return Promise.resolve({ ok: false, error: noApi().error, ports: [] });
      if (typeof navSerial.getPorts !== 'function') return Promise.resolve({ ok: true, ports: [] });
      return navSerial.getPorts().then(function (list_) {
        var ports = (list_ || []).map(function (p) { return webPort(p, safeInfo(p)); });
        return {
          ok: true, ports: ports,
          note: ports.length ? '（浏览器只列出已授权过的串口）' : '浏览器还没有授权过任何串口，点「选择设备…」授权一次即可'
        };
      }, function (e) { return { ok: false, error: '枚举串口失败：' + msg(e), ports: [] }; });
    }

    function request() {
      if (!available()) return Promise.resolve(noApi());
      return navSerial.requestPort().then(function (p) {
        return { ok: true, port: p, info: webPort(p, safeInfo(p)) };
      }, function (e) {
        return { ok: false, error: '没有选择串口：' + msg(e) };
      });
    }

    function readLoop(p) {
      if (!p || !p.readable) return;
      reader = p.readable.getReader();
      (function pump() {
        if (!reader) return;
        reader.read().then(function (res) {
          if (!reader) return;
          if (res.done) { emit('disconnect', { reason: '串口已关闭' }); return; }
          if (res.value && res.value.length) emit('data', res.value);
          pump();
        }, function (e) {
          if (!reader) return;
          reader = null;
          emit('disconnect', { reason: '读取中断：' + msg(e) });
        });
      })();
    }

    function open(p, cfg) {
      if (!p) return Promise.resolve({ ok: false, error: '没有可打开的串口（先选择设备）' });
      var mapped = toWebSerialOptions(cfg);
      return p.open(mapped.options).then(function () {
        port = p;
        open_ = true;
        if (typeof p.setSignals === 'function') {
          try { p.setSignals(mapped.setSignals); } catch (e) { /* 部分平台不支持设置信号线 */ }
        }
        readLoop(p);
        return { ok: true, warnings: mapped.warnings, options: mapped.options };
      }, function (e) {
        return { ok: false, error: '打开串口失败：' + msg(e) + openHint(e) };
      });
    }

    function openHint(e) {
      var s = msg(e).toLowerCase();
      if (s.indexOf('access denied') >= 0 || s.indexOf('failed to open') >= 0) {
        return '（该串口可能已被其他程序占用，例如串口助手 / 烧录工具 / IDE 的串口监视器）';
      }
      if (s.indexOf('user gesture') >= 0 || s.indexOf('activation') >= 0) {
        return '（浏览器要求「打开」动作直接来自用户点击）';
      }
      return '';
    }

    function close() {
      var p = port;
      stopReader();
      open_ = false;
      port = null;
      var done = function () { return { ok: true }; };
      if (!p) return Promise.resolve(done());
      return Promise.resolve()
        .then(function () { return writer ? writer.releaseLock() : null; })
        .catch(function () { /* ignore */ })
        .then(function () { writer = null; })
        .then(function () { return (typeof p.close === 'function') ? p.close() : null; })
        .then(done, function (e) { return { ok: false, error: '关闭失败：' + msg(e) }; });
    }

    function stopReader() {
      var r = reader;
      reader = null;
      if (r) { try { r.cancel(); } catch (e) { /* ignore */ } }
    }

    function write(data) {
      var b = data instanceof Uint8Array ? data : bytes(data);
      if (!port || !open_) return Promise.resolve({ ok: false, error: '串口未打开' });
      if (!port.writable) return Promise.resolve({ ok: false, error: '串口当前不可写（设备可能已拔出）' });
      if (!writer) writer = port.writable.getWriter();
      return writer.write(b).then(function () { return { ok: true, n: b.length }; },
        function (e) { return { ok: false, error: '写入失败：' + msg(e) }; });
    }

    return {
      kind: 'webserial',
      name: transportName('webserial'),
      available: available,
      list: list,
      request: request,
      open: open,
      close: close,
      write: write,
      on: on,
      isOpen: function () { return open_; },
      probe: function () { return Promise.resolve(available() ? { ok: true } : noApi()); }
    };
  }

  /* ----------------------------- 传输：本地桥接 ----------------------------- */

  function makeBridgeTransport(opts) {
    opts = opts || {};
    var fetchImpl = opts.fetch || (typeof fetch === 'function' ? fetch : null);
    var baseOf = (typeof opts.base === 'function') ? opts.base : function () { return opts.base || ''; };
    var interval = opts.interval || 40;
    var events = { data: [], disconnect: [] };
    var st = { open: false, since: -1, busy: false, timer: null, fails: 0, cfg: null };

    function emit(name, arg) {
      (events[name] || []).forEach(function (f) { try { f(arg); } catch (e) { /* ignore */ } });
    }
    function on(name, fn) { if (events[name]) events[name].push(fn); }

    function url(path) { return String(baseOf() || '').replace(/\/+$/, '') + path; }

    function call(path, init, timeout) {
      if (!fetchImpl) return Promise.resolve({ ok: false, error: '当前环境没有 fetch，无法访问本地桥接' });
      var req = { method: (init && init.method) || 'GET', cache: 'no-store' };
      if (init && init.body !== undefined) {
        req.headers = { 'Content-Type': 'application/json' };
        req.body = JSON.stringify(init.body);
      }
      var timer = null;
      if (typeof AbortController !== 'undefined') {
        var ctl = new AbortController();
        req.signal = ctl.signal;
        timer = setTimeout(function () { ctl.abort(); }, timeout || 15000);
      }
      return fetchImpl(url(path), req).then(function (r) {
        if (timer) clearTimeout(timer);
        return r.json().catch(function () {
          return { ok: false, error: 'HTTP ' + r.status + '：桥接返回的不是 JSON（地址是否正确？）' };
        });
      }, function (e) {
        if (timer) clearTimeout(timer);
        return { ok: false, error: '无法连接桥接：' + msg(e) };
      });
    }

    function probe() { return call('/api/ping', null, 6000); }

    function list() {
      return call('/api/serial/ports', null, 20000).then(function (r) {
        if (r && r.ok && Array.isArray(r.ports)) {
          return { ok: true, ports: r.ports.map(bridgePort), note: r.note || '' };
        }
        return r || { ok: false, error: '桥接没有回应' };
      });
    }

    function open(cfg) {
      return call('/api/serial/open', { method: 'POST', body: toBridgeArgs(cfg) }, 25000).then(function (r) {
        if (r && r.ok) {
          st.open = true; st.since = -1; st.fails = 0; st.cfg = cfg;
          startPoll();
        }
        return r;
      });
    }

    function close() {
      stopPoll();
      st.open = false;
      return call('/api/serial/close', { method: 'POST', body: {} }, 10000);
    }

    function write(data) {
      var b = data instanceof Uint8Array ? data : bytes(data);
      return call('/api/serial/write', { method: 'POST', body: { hex: hex(b), n: b.length } }, 10000)
        .then(function (r) { return (r && r.ok) ? { ok: true, n: b.length } : (r || { ok: false, error: '写入失败' }); });
    }

    function poll() {
      if (!st.open || st.busy) return Promise.resolve(null);
      st.busy = true;
      return call('/api/serial/read?since=' + st.since, null, 10000).then(function (r) {
        st.busy = false;
        if (!r) return null;
        if (r.ok) {
          st.fails = 0;
          if (typeof r.next === 'number') st.since = r.next;
          if (r.rx) {
            var b = bytes(r.rx);
            if (b.length) emit('data', b);
          }
        } else {
          st.fails++;
          if (st.fails >= 8 || /未打开|not open/i.test(String(r.error || ''))) {
            stopPoll();
            st.open = false;
            emit('disconnect', { reason: r.error || '串口连接已中断' });
          }
        }
        return r;
      }, function () { st.busy = false; return null; });
    }

    function startPoll() {
      stopPoll();
      st.timer = setInterval(function () { poll(); }, interval);
    }
    function stopPoll() {
      if (st.timer) { clearInterval(st.timer); st.timer = null; }
    }

    return {
      kind: 'bridge',
      name: transportName('bridge'),
      available: function () { return !!fetchImpl; },
      probe: probe,
      list: list,
      open: open,
      close: close,
      write: write,
      on: on,
      isOpen: function () { return st.open; },
      poll: poll,
      _state: st
    };
  }

  /* ------------------------------ 导出 ------------------------------ */

  window.SERIAL = {
    EOL_TABLE: EOL_TABLE,
    bytes: bytes, hex: hex, hex2: hex2, hex4: hex4, concat: concat,
    textToBytes: textToBytes, decodeBytes: decodeBytes,
    eolBytes: eolBytes, eolLabel: eolLabel,
    printable: printable, escapeText: escapeText, hexdump: hexdump, describeBytes: describeBytes,
    termNew: termNew, termFeed: termFeed, termText: termText, termSize: termSize, termHTML: termHTML,
    sniffMode: sniffMode,
    stamp: stamp,
    bridgePort: bridgePort, webPort: webPort, mergePortLists: mergePortLists,
    matchPort: matchPort, portKey: portKey,
    transportOrder: transportOrder, transportName: transportName,
    normalizeCfg: normalizeCfg, toWebSerialOptions: toWebSerialOptions, toBridgeArgs: toBridgeArgs,
    presetBytes: presetBytes,
    makeWebSerialTransport: makeWebSerialTransport, makeBridgeTransport: makeBridgeTransport
  };
})();
