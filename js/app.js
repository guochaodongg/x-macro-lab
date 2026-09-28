/* ==========================================================================
   EDID-X-LAB — app.js
   UI wiring: tabs, theme, file input, decoder / encoder / validator /
   timing calculators, drafts, exports.  No dependencies.
   ========================================================================== */
(function () {
  'use strict';

  var C = window.EDIDCore, T = window.EDIDTiming, D = window.EDIDDecoder,
    E = window.EDIDEncoder, V = window.EDIDValidator, R = window.EDIDReport;

  var LS_KEY = 'edidcraft-local:v1';
  var MAX_FILE = 128 * 256;

  var state = {
    tab: 'decoder',
    theme: 'light',
    dec: { hex: '', page: 0 },
    val: { hex: '' },
    enc: { model: null, page: 0 },
    tm: { standard: 'cvt', rb: 0, width: 1920, height: 1080, refresh: 60, aspect: 'auto', interlaced: false, margins: false },
    vtc: { h: 640, v: 480, r: 60, margins: false, interlaced: false, bpc: 8, color: 'rgb444', vopt: false, chblank: 80, cvblank: 6 },
    printPanel: null
  };

  /* --------------------------------------------------------- tiny helpers */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) { return R.esc(s); }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function toast(title, msg, kind) {
    var box = $('#toasts');
    var el = document.createElement('div');
    el.className = 'toast ' + (kind || '');
    el.innerHTML = (title ? '<b>' + esc(title) + '</b>' : '') + (msg ? esc(msg) : '');
    box.appendChild(el);
    setTimeout(function () {
      el.style.transition = 'opacity .25s, transform .25s';
      el.style.opacity = '0';
      el.style.transform = 'translateX(14px)';
      setTimeout(function () { el.remove(); }, 260);
    }, kind === 'err' ? 6000 : 3800);
  }

  function openModal(title, bodyHtml, footHtml) {
    $('#modal-title').textContent = title;
    $('#modal-body').innerHTML = bodyHtml;
    $('#modal-foot').innerHTML = footHtml || '<button id="modal-ok">关闭</button>';
    $('#modal').classList.add('open');
  }
  function closeModal() { $('#modal').classList.remove('open'); modalPicker = null; }

  /* A modal can carry a "pick one" list.  Only one picker is ever live, and
     dismissing the modal clears it — so no stale handler survives a re-open. */
  var modalPicker = null;
  function setModalPicker(fn) { modalPicker = fn; }

  function download(name, data, mime) {
    var blob = data instanceof Uint8Array ? new Blob([data], { type: mime || 'application/octet-stream' })
      : new Blob([data], { type: mime || 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { toast('已复制', '内容已写入剪贴板', 'ok'); },
        function () { fallbackCopy(text); });
    } else fallbackCopy(text);
  }
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast('已复制', '内容已写入剪贴板', 'ok'); }
    catch (e) { toast('复制失败', '请手动选择文本', 'err'); }
    ta.remove();
  }

  function printPanel(id) {
    state.printPanel = id;
    document.body.setAttribute('data-print', id);
    $$('.panel').forEach(function (p) { p.classList.toggle('print-me', p.id === 'panel-' + id); });
    window.print();
    setTimeout(function () {
      document.body.removeAttribute('data-print');
      $$('.panel').forEach(function (p) { p.classList.remove('print-me'); });
    }, 400);
  }

  function save() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        tab: state.tab, theme: state.theme,
        decHex: state.dec.hex, valHex: state.val.hex,
        model: state.enc.model, tm: state.tm
      }));
    } catch (e) { /* storage full or blocked — drafts are a nicety */ }
  }

  function load() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  /* ------------------------------------------------------- input handling */
  /* Turn pasted text or a binary file into bytes. */
  function bytesFromText(text) {
    var s = String(text).replace(/0x/gi, '').replace(/[^0-9a-fA-F]/g, '');
    if (!s.length) return null;
    if (s.length % 2) s = s.substring(0, s.length - 1);
    if (!s.length) return null;
    var out = new Uint8Array(s.length / 2);
    for (var i = 0; i < out.length; i++) out[i] = parseInt(s.substr(i * 2, 2), 16);
    return out;
  }

  function readFile(file, cb) {
    var lower = (file.name || '').toLowerCase();
    var asText = /\.(hex|txt|log|edid)$/.test(lower);
    var fr = new FileReader();
    fr.onerror = function () { toast('读取失败', '无法读取文件 ' + file.name, 'err'); };
    fr.onload = function () {
      var bytes;
      if (asText) {
        bytes = bytesFromText(fr.result);
      } else {
        var raw = new Uint8Array(fr.result);
        /* A .bin that happens to be ASCII hex text is quite common. */
        if (raw.length && raw.length % 128 !== 0) {
          var looksText = true;
          for (var i = 0; i < Math.min(raw.length, 64); i++) {
            var c = raw[i];
            if (!(c === 0x20 || c === 0x0a || c === 0x0d || c === 0x09 || c === 0x2c ||
              (c >= 0x30 && c <= 0x39) || (c >= 0x41 && c <= 0x46) || (c >= 0x61 && c <= 0x66))) {
              looksText = false; break;
            }
          }
          var guess = looksText ? bytesFromText(new TextDecoder().decode(raw)) : null;
          if (guess) raw = guess;
        }
        bytes = raw;
      }
      if (!bytes || !bytes.length) { toast('无法识别', '文件内容既不是 EDID 二进制也不是十六进制文本', 'err'); return; }
      cb(bytes, file);
    };
    if (asText) fr.readAsText(file); else fr.readAsArrayBuffer(file);
  }

  function dropZone(zone, onBytes) {
    ['dragenter', 'dragover'].forEach(function (ev) {
      zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.add('over'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.remove('over'); });
    });
    zone.addEventListener('drop', function (e) {
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) readFile(f, onBytes);
    });
  }

  /* Byte counter for the side panels. */
  function updateSizeChip(hexText, chipEl) {
    var b = bytesFromText(hexText || '');
    chipEl.textContent = b ? (b.length + ' 字节 / ' + (b.length / 128 % 1 === 0 ? b.length / 128 : '—') + ' 块') : '0 字节';
    chipEl.className = 'chip' + (b && b.length % 128 === 0 && b.length >= 128 ? ' ok' : (b ? ' warn' : ''));
  }

  /* =============================================================== samples */
  function presetHex(key) {
    var m = E.defaultModel();
    E.FORMAT_PRESETS[key].apply(m);
    return E.encode(m);
  }

  var PY_SAMPLE = '00FFFFFFFFFFFF0010AC4034040302011E220104A2341D78E6A3544C99260F5054EE912108' +
    '0081C00101010101010101010101010101023A801871382D40582C4500FD1E1100001E000000FD00324B1E' +
    '53110000000000000000000000FC0053414D504C452D32370A000000000000100000000000000000000000' +
    '0000000023';

  function sampleList() {
    var list = [
      { name: '1080p HDMI 显示器（sRGB + CEA-861）', note: '默认模型：数字 HDMI-a、8 bpc、1920×1080@60 首选时序、CVT 范围限制、含视频/音频/扬声器/VSDB 四个数据块', hex: function () { return E.encode(E.defaultModel()).hex; } },
      { name: '4K UHD + HDR 静态元数据', note: '3840×2160 RBv2、10 bpc、深层彩色、HDR10 + HLG、色度扩展块', hex: function () { return presetHex('4k').hex; } },
      { name: '1440p 144 Hz 游戏屏', note: '2560×1440 RBv2、CVT 范围限制到 165 Hz、CEA-861（含 4K VIC）', hex: function () { return presetHex('hdr').hex; } },
      { name: '1440p 60 Hz（DisplayPort）', note: 'DP 接口、无 CEA 扩展块，可观察“HDMI/DP 缺少 CEA”的警告', hex: function () { return presetHex('1440p').hex; } },
      { name: '21:9 带鱼屏 3440×1440', note: 'DP 接口、缩小边框的宽屏时序', hex: function () { return presetHex('ultrawide').hex; } },
      { name: '笔记本电脑 eDP 面板', note: '无 DPMS 电源状态、范围限制仅声明区间（range limits only）', hex: function () { return presetHex('laptop').hex; } },
      { name: '传统 VGA 显示器（模拟）', note: '模拟输入、13 项既定时序、GTF 范围限制', hex: function () { return presetHex('legacy').hex; } },
      { name: '真实转储样例（含 4 处问题）', note: '手写 EDID：范围限制未按 LF+6 空格补齐、缺少 CEA 扩展块 — 适合练手校验', hex: function () { return PY_SAMPLE; } }
    ];
    return list;
  }

  function showSamples(target) {
    var list = sampleList();
    var body = '<div class="stack">' + list.map(function (s, i) {
      return '<button class="btn" style="width:100%;text-align:left;align-items:flex-start" data-sample="' + i + '">' +
        '<span><b>' + esc(s.name) + '</b><div class="small dim">' + esc(s.note) + '</div></span></button>';
    }).join('') + '</div>';
    openModal('载入示例', body);
    setModalPicker(function (el) {
      var btn = el.closest('[data-sample]');
      if (!btn) return false;
      var s = list[parseInt(btn.getAttribute('data-sample'), 10)];
      if (!s) return false;
      closeModal();
      target(s.hex(), s.name);
      return true;
    });
  }

  /* =============================================================== decoder */
  function decRender(bytes, sourceName) {
    var report = D.decode(bytes);
    var out = $('#dec-out');
    out.innerHTML = report.ok
      ? R.decodeReport(report) +
        R.card('原始字节', R.hexViewer(bytes, { page: state.dec.page }), R.chip(bytes.length + ' 字节'))
      : R.decodeReport(report);
    if (!report.ok) { toast('解析失败', report.error, 'err'); return; }
    var v = V.validate(bytes);
    toast(report.ok ? '解析完成' : '解析失败',
      (sourceName ? sourceName + ' · ' : '') + (report.base.manufacturer.vendor || report.base.manufacturer.code) +
      ' · ' + report.base.edidVersion + ' · ' + (report.base.preferredTiming
        ? report.base.preferredTiming.hActive + '×' + report.base.preferredTiming.vActive : '无首选时序') +
      ' · 校验：' + (v.isValid ? '通过' : v.errors.length + ' 个错误'),
      v.isValid ? 'ok' : 'warn');
    state.dec.bytes = bytes;
  }

  function decRun(sourceName) {
    var hex = $('#dec-hex').value;
    state.dec.hex = hex; state.dec.page = 0;
    var bytes = bytesFromText(hex);
    if (!bytes) { toast('没有数据', '请粘贴十六进制或拖入文件', 'err'); return; }
    decRender(bytes, sourceName);
    save();
  }

  function decSetBytes(bytes, name) {
    $('#dec-hex').value = C.bytesToHex(bytes);
    state.dec.hex = $('#dec-hex').value;
    state.dec.page = 0;
    decRender(bytes, name);
    updateSizeChip(state.dec.hex, $('#dec-size'));
    save();
  }

  /* Decoded EDID -> encoder model (best effort, lossless where possible). */
  function modelFromDecoded(dec) {
    var b = dec.base;
    var m = E.defaultModel();
    m.extensions = [];
    if (b.manufacturer.valid) m.manufacturer = b.manufacturer.code;
    m.productCode = b.productCode;
    m.serialNumber = b.serialNumber;
    m.weekOfManufacture = b.modelYearFlag ? 0xFF : b.weekRaw;
    m.yearOfManufacture = b.year;
    m.modelYearFlag = b.modelYearFlag;
    m.edidVersion = b.versionMajor;
    m.edidRevision = b.versionMinor;
    m.isDigital = b.videoInput.digital;
    if (b.videoInput.digital) {
      m.bitDepth = b.videoInput.bitDepth;
      m.digitalInterface = b.videoInput.interface;
      m.colorEncoding = ((b.featuresRaw >> 3) & 0x03) + 1;
    } else {
      m.videoLevel = b.videoInput.videoLevel;
      m.syncSupport = {
        separate: b.videoInput.separateSync, composite: b.videoInput.compositeSync,
        syncOnGreen: b.videoInput.syncOnGreen, serrated: b.videoInput.serratedVSync
      };
    }
    m.width = b.widthCm; m.height = b.heightCm;
    m.gammaDefinedInExtension = b.gammaDefinedInExtension;
    m.gamma = b.gammaDefinedInExtension ? 2.2 : Math.round(b.gamma * 100) / 100;
    m.dpms = { standby: b.features.standby, suspend: b.features.suspend, activeOff: b.features.activeOff };
    m.features = {
      sRGB: b.features.sRGB, preferredTiming: b.features.preferredTiming,
      continuousFrequency: b.features.continuousFrequency
    };
    m.colorCharacteristics = {
      red: { x: b.chromaticity.red.x, y: b.chromaticity.red.y },
      green: { x: b.chromaticity.green.x, y: b.chromaticity.green.y },
      blue: { x: b.chromaticity.blue.x, y: b.chromaticity.blue.y },
      white: { x: b.chromaticity.white.x, y: b.chromaticity.white.y }
    };
    m.manufacturerTimingBits = b.manufacturerTimingBits || 0;
    m.establishedTimings = b.establishedTimings.map(function (t) { return t.label; });
    m.standardTimings = b.standardTimings.filter(function (s) { return !s.unused; })
      .map(function (s) { return { width: s.width, height: s.height, refreshRate: s.refreshRate, aspectRatio: s.aspectRatio }; });
    m.descriptors = b.descriptors.map(function (d) {
      if (d.type === 'detailed') {
        return {
          type: 'detailed', data: {
            pixelClock: d.pixelClockKHz, hActive: d.hActive, hBlanking: d.hBlanking,
            vActive: d.vActive, vBlanking: d.vBlanking,
            hSyncOffset: d.hSyncOffset, hSyncWidth: d.hSyncWidth,
            vSyncOffset: d.vSyncOffset, vSyncWidth: d.vSyncWidth,
            hSize: d.hSize, vSize: d.vSize, hBorder: d.hBorder, vBorder: d.vBorder,
            interlaced: d.interlaced, stereo: d.stereo, syncType: d.syncType,
            hSyncPositive: d.hSyncPositive, vSyncPositive: d.vSyncPositive
          }
        };
      }
      if (d.kind === 'text') return { type: d.tag === 0xFC ? 'product_name' : d.tag === 0xFF ? 'serial_number' : 'ascii_string', text: d.text };
      if (d.kind === 'range') {
        return {
          type: 'range_limits', data: {
            minVRate: d.minVRate, maxVRate: d.maxVRate, minHRate: d.minHRate, maxHRate: d.maxHRate,
            maxPixelClock: d.maxPixelClock, timingFormula: d.timingFormula,
            cvtMaxPixelClock: d.cvt ? d.cvt.maxPixelClockMHz : undefined,
            cvtMaxActivePixels: d.cvt ? d.cvt.maxActivePixelsPerLine : undefined,
            cvtPreferredAspect: d.cvt ? d.cvt.preferredAspect : undefined,
            cvtAspectRatios: d.cvt ? d.cvt.aspectRatios : undefined
          }
        };
      }
      return { type: 'unused' };
    });
    while (m.descriptors.length < 4) m.descriptors.push({ type: 'unused' });

    var skipped = [];
    dec.extensions.forEach(function (ext) {
      if (ext.tag === 0x02) {
        var cea = {
          type: 'CEA', revision: ext.revision,
          features: {
            basicAudio: ext.supportsBasicAudio, ycbcr444: ext.supportsYCbCr444,
            ycbcr422: ext.supportsYCbCr422, underscan: ext.underscan
          },
          dataBlocks: [], detailedTimings: []
        };
        ext.dataBlocks.forEach(function (blk) {
          if (blk.video) cea.dataBlocks.push({ type: 'video', codes: blk.video.map(function (v) { return { code: v.code, native: v.native }; }) });
          else if (blk.audio) cea.dataBlocks.push({
            type: 'audio', items: blk.audio.map(function (a) {
              return { format: a.format, channels: a.channels, sampleRates: a.sampleRates, bitDepths: a.bitDepths };
            })
          });
          else if (blk.speakers) {
            var bits = [];
            C.SPEAKER_ALLOCATION.forEach(function (s) { if (blk.speakers.indexOf(s[1]) >= 0) bits.push(s[0]); });
            cea.dataBlocks.push({ type: 'speaker', speakers: bits });
          } else if (blk.hdmi) {
            var pa = (blk.hdmi.physicalAddress || '1.0.0.0').split('.').map(Number);
            cea.dataBlocks.push({
              type: 'hdmi-vsdb', data: {
                a: pa[0] || 0, b: pa[1] || 0, c: pa[2] || 0, d: pa[3] || 0,
                supportsAI: !!blk.hdmi.supportsAI, dviDual: !!blk.hdmi.dviDual,
                deepColor30: !!(blk.hdmi.deepColor && blk.hdmi.deepColor['30bit']),
                deepColor36: !!(blk.hdmi.deepColor && blk.hdmi.deepColor['36bit']),
                deepColor48: !!(blk.hdmi.deepColor && blk.hdmi.deepColor['48bit']),
                maxTmdsClockMHz: blk.hdmi.maxTmdsClockMHz || 300
              }
            });
          } else if (blk.hdrStatic) {
            cea.dataBlocks.push({
              type: 'hdr-static', data: {
                traditionalSDR: blk.hdrStatic.eotf.traditionalSDR, traditionalHDR: blk.hdrStatic.eotf.traditionalHDR,
                hdrPQ: blk.hdrStatic.eotf.smpte2084, hlg: blk.hdrStatic.eotf.hlg,
                staticMetadata: blk.hdrStatic.staticMetadataType1
              }
            });
          } else if (blk.colorimetry) {
            cea.dataBlocks.push({ type: 'colorimetry', data: blk.colorimetry });
          }
        });
        (ext.detailedTimings || []).forEach(function (d) { cea.detailedTimings.push(E.dtdFromTiming(d)); });
        m.extensions.push(cea);
      } else {
        skipped.push(ext.tagName);
      }
    });
    return { model: m, skipped: skipped };
  }

  /* ============================================================= validator */
  function valRun() {
    var hex = $('#val-hex').value;
    state.val.hex = hex;
    var bytes = bytesFromText(hex);
    if (!bytes) { toast('没有数据', '请粘贴十六进制或拖入文件', 'err'); return; }
    var report = V.validate(bytes);
    $('#val-out').innerHTML = R.validationReport(report);
    toast('校验完成', report.summary.errors + ' 错误 / ' + report.summary.warnings + ' 警告 / ' +
      report.summary.infoMessages + ' 提示',
      report.summary.errors ? 'err' : (report.summary.warnings ? 'warn' : 'ok'));
    save();
  }

  /* =============================================================== encoder */
  function setPath(obj, path, val) {
    var parts = path.split('.'), o = obj, i;
    for (i = 0; i < parts.length - 1; i++) {
      var k = parts[i];
      if (!o[k] || typeof o[k] !== 'object') o[k] = {};
      o = o[k];
    }
    o[parts[parts.length - 1]] = val;
  }

  function opt(value, label, current) {
    return '<option value="' + esc(value) + '"' + (String(current) === String(value) ? ' selected' : '') + '>' +
      esc(label) + '</option>';
  }

  function num(path, value, opts) {
    opts = opts || {};
    return '<input type="number" data-path="' + path + '" data-type="number" value="' + esc(value) + '"' +
      (opts.min != null ? ' min="' + opts.min + '"' : '') +
      (opts.max != null ? ' max="' + opts.max + '"' : '') +
      (opts.step != null ? ' step="' + opts.step + '"' : '') + '>';
  }

  function text(path, value, placeholder, maxlen) {
    return '<input type="text" data-path="' + path + '" value="' + esc(value == null ? '' : value) + '"' +
      (placeholder ? ' placeholder="' + esc(placeholder) + '"' : '') +
      (maxlen ? ' maxlength="' + maxlen + '"' : '') + '>';
  }

  function select(path, value, options) {
    return '<select data-path="' + path + '">' + options.map(function (o) {
      return opt(o[0], o[1], value);
    }).join('') + '</select>';
  }

  function check(path, checked, label) {
    return '<label class="check"><input type="checkbox" data-path="' + path + '" data-type="bool"' +
      (checked ? ' checked' : '') + '><span>' + esc(label) + '</span></label>';
  }

  function f(label, control, hint) {
    return '<div class="field"><label>' + esc(label) + '</label>' + control +
      (hint ? '<div class="hint">' + hint + '</div>' : '') + '</div>';
  }

  function encFormHtml(m) {
    var html = '';
    var ci = C.DIGITAL_INTERFACE.map(function (n, i) { return [i, i + ' — ' + n]; });
    var bd = C.BIT_DEPTH.map(function (n, i) { return [i, i + ' — ' + n]; });
    var ce = C.COLOR_ENCODING.map(function (n, i) { return [i + 1, (i + 1) + ' — ' + n]; });

    /* ---- identity ---- */
    html += R.card('标识信息',
      '<div class="field-row">' +
      f('厂商代码（3 字母）', text('manufacturer', m.manufacturer, 'DEL', 3), 'EDID 用 5 位压缩编码，需为 A–Z 三个字母') +
      f('产品代码（16 进制）', text('productCode', m.productCode, '1A3F', 4)) +
      f('序列号（16 进制）', text('serialNumber', m.serialNumber, '01234567', 8)) +
      '</div>' +
      '<div class="field-row">' +
      f('制造周 (1–54)', num('weekOfManufacture', m.weekOfManufacture, { min: 0, max: 255 }), m.modelYearFlag ? '已勾选“型号年”，该字节写 0xFF' : '') +
      f('制造年', num('yearOfManufacture', m.yearOfManufacture, { min: 1990, max: 2245 }), '写入时减去 1990') +
      '</div>' + check('modelYearFlag', m.modelYearFlag, '年份表示“型号年”而非制造年（周字节 = 0xFF）') +
      '<div class="field-row">' +
      f('制造商时序位（0x25 b6–b0）', num('manufacturerTimingBits', m.manufacturerTimingBits, { min: 0, max: 127 })) +
      '</div>');

    /* ---- version ---- */
    html += R.card('版本',
      '<div class="field-row">' +
      f('主版本', num('edidVersion', m.edidVersion, { min: 1, max: 2 }), '现代显示器为 1') +
      f('修订号', num('edidRevision', m.edidRevision, { min: 0, max: 4 }), '3 = EDID 1.3，4 = EDID 1.4') +
      '</div>');

    /* ---- video input ---- */
    var viHtml = '<div class="field-row">' + f('输入类型', select('isDigital', m.isDigital ? '1' : '0',
      [[1, '数字（Digital）'], [0, '模拟（Analog）']])) + '</div>';
    if (m.isDigital) {
      viHtml += '<div class="field-row">' +
        f('位深', select('bitDepth', m.bitDepth, bd)) +
        f('数字接口', select('digitalInterface', m.digitalInterface, ci)) +
        f('颜色编码', select('colorEncoding', m.colorEncoding, ce)) +
        '</div>';
    } else {
      viHtml += '<div class="field-row">' +
        f('电平标准', select('videoLevel', m.videoLevel, C.VIDEO_LEVEL.map(function (n, i) { return [i, n]; }))) +
        f('模拟显示类型', select('analogDisplayType', m.analogDisplayType,
          [[0, '单色 / 黑白'], [1, 'RGB 彩色'], [2, '非 RGB 彩色'], [3, '保留']])) +
        '</div>' +
        check('analogSetupExpected', m.analogSetupExpected, '期望消隐电平 / 黑电平（setup pedestal）') +
        '<div class="field-row">' +
        '<fieldset><legend>同步方式</legend>' +
        check('syncSupport.separate', m.syncSupport.separate, '分离行场同步') +
        check('syncSupport.composite', m.syncSupport.composite, '复合同步') +
        check('syncSupport.syncOnGreen', m.syncSupport.syncOnGreen, '绿同步 (SOG)') +
        check('syncSupport.serrated', m.syncSupport.serrated, '锯齿场同步') +
        '</fieldset></div>';
    }
    html += R.card('视频输入', viHtml);

    /* ---- screen and gamma ---- */
    html += R.card('屏幕与 Gamma',
      '<div class="field-row">' +
      f('横向尺寸 (cm)', num('width', m.width, { min: 0, max: 255 })) +
      f('纵向尺寸 (cm)', num('height', m.height, { min: 0, max: 255 })) +
      f('Gamma', num('gamma', m.gamma, { min: 1, max: 3.54, step: 0.01 }), '1.00 – 3.54；字节 = 值×100 − 100') +
      '</div>' +
      check('gammaDefinedInExtension', m.gammaDefinedInExtension, 'Gamma 由扩展块定义（字节写 0xFF）') +
      '<div class="hint">例如 52 × 29 cm ≈ 23.4 英寸 16:9。</div>');

    /* ---- features ---- */
    html += R.card('特性支持',
      '<div class="grid cols-2" style="gap:8px 20px">' +
      '<fieldset><legend>电源管理（DPMS）</legend>' +
      check('dpms.standby', m.dpms.standby, '支持待机') +
      check('dpms.suspend', m.dpms.suspend, '支持挂起') +
      check('dpms.activeOff', m.dpms.activeOff, '支持关闭') +
      '</fieldset>' +
      '<fieldset><legend>显示特性</legend>' +
      check('features.sRGB', m.features.sRGB, '标准 sRGB 色彩空间') +
      check('features.preferredTiming', m.features.preferredTiming, '首选时序可用（第 1 个描述符必须是 DTD）') +
      check('features.continuousFrequency', m.features.continuousFrequency, '连续频率（GTF / CVT）') +
      '</fieldset></div>');

    /* ---- chromaticity ---- */
    function xyRow(name, obj) {
      return '<div class="field-row" style="grid-template-columns:70px 1fr 1fr">' +
        '<div style="align-self:center;font-weight:600;font-size:.85rem">' + name + '</div>' +
        '<input type="number" step="0.0001" min="0" max="0.8" data-path="colorCharacteristics.' + obj + '.x" data-type="number" value="' + m.colorCharacteristics[obj].x + '">' +
        '<input type="number" step="0.0001" min="0" max="0.8" data-path="colorCharacteristics.' + obj + '.y" data-type="number" value="' + m.colorCharacteristics[obj].y + '">' +
        '</div>';
    }
    html += R.card('色度坐标',
      '<div class="small dim" style="margin-bottom:6px">格式：x / y（CIE 1931，10 位精度，存入时会四舍五入到 1/1024）</div>' +
      xyRow('红', 'red') + xyRow('绿', 'green') + xyRow('蓝', 'blue') + xyRow('白点', 'white') +
      '<div class="btn-row" style="margin-top:8px">' +
      '<button class="sm" data-act="color-srgb">重置为 sRGB</button>' +
      '<button class="sm" data-act="color-d65">白点设为 D65</button></div>');

    /* ---- established timings ---- */
    var estHtml = '<div class="grid cols-3" style="gap:2px 14px">' + C.ESTABLISHED.map(function (e) {
      var on = m.establishedTimings.some(function (l) { return C.establishedKey(l) === C.establishedKey(e[2]); });
      return check('est:' + e[2], on, e[2].replace('×', 'x'));
    }).join('') + '</div>' +
      '<div class="hint">对应基础块偏移 0x23–0x25 的三个字节，共可声明 17 项经典时序。</div>';
    html += R.card('既定时序', estHtml,
      '<span class="chip accent" data-est-chip>' + m.establishedTimings.length + ' 项</span>' +
      '<button class="sm" data-act="est-none">清空</button>');

    /* ---- standard timings ---- */
    var stdRows = (m.standardTimings || []).map(function (s, i) {
      return '<tr>' +
        '<td class="dim">' + (i + 1) + '</td>' +
        '<td>' + num('standardTimings.' + i + '.width', s.width, { min: 248, max: 2288, step: 8 }) + '</td>' +
        '<td>' + num('standardTimings.' + i + '.height', s.height, { min: 100, max: 2288 }) + '</td>' +
        '<td>' + num('standardTimings.' + i + '.refreshRate', s.refreshRate, { min: 60, max: 123 }) + '</td>' +
        '<td>' + select('standardTimings.' + i + '.aspectRatio', s.aspectRatio,
          [['auto', '自动']].concat(C.ASPECTS.map(function (a) { return [a.label, a.label]; }))) + '</td>' +
        '<td><button class="sm ghost" data-act="std-del" data-i="' + i + '" title="删除">✕</button></td>' +
        '</tr>';
    }).join('');
    html += R.card('标准时序（最多 8 组）',
      '<div class="table-scroll"><table><thead><tr><th>#</th><th>宽 (px)</th><th>高 (px)</th><th>刷新 (Hz)</th><th>宽高比</th><th></th></tr></thead>' +
      '<tbody>' + (stdRows || '<tr><td colspan="6"><div class="empty">未添加</div></td></tr>') + '</tbody></table></div>' +
      '<div class="hint">宽度会被编码为 (像素/8 − 31)，因此必须是 8 的倍数且落在 248–2288 之间；未使用的槽位写入 01 01。</div>',
      R.chip((m.standardTimings || []).length + ' / 8', 'accent') +
      '<button class="sm" data-act="std-add"' + ((m.standardTimings || []).length >= 8 ? ' disabled' : '') + '>+ 添加</button>');

    /* ---- descriptors ---- */
    var descHtml = '<div class="stack">' + m.descriptors.map(function (d, i) {
      return '<div class="acc" style="border:1px solid var(--border);border-radius:8px">' +
        '<div class="flex" style="padding:10px 12px;gap:10px">' +
        '<b class="nowrap">描述符 ' + (i + 1) + '</b>' +
        (i === 0 && d.type === 'detailed' ? R.chip('首选时序', 'accent') : '') +
        '<span class="right"></span>' +
        '<select data-act="desc-type" data-i="' + i + '" style="width:auto">' +
        opt('detailed', '详细时序（DTD）', d.type) +
        opt('product_name', '显示器名称 (0xFC)', d.type) +
        opt('serial_number', '序列号文本 (0xFF)', d.type) +
        opt('ascii_string', '自由文本 (0xFE)', d.type) +
        opt('range_limits', '范围限制 (0xFD)', d.type) +
        opt('unused', '空描述符 (0x10)', d.type) +
        '</select></div>' +
        '<div class="inner" style="border-top:1px solid var(--border)">' + descBodyHtml(d, i) + '</div></div>';
    }).join('') + '</div>';
    html += R.card('描述符槽位（4 × 18 字节）', descHtml,
      '<button class="sm" data-act="desc-from-cvt">用 CVT 生成首选时序</button>');

    /* ---- extensions ---- */
    html += R.card('扩展块', extListHtml(m),
      R.chip(m.extensions.length + ' 个', m.extensions.length ? 'accent' : '') +
      '<button class="sm" data-act="ext-add" data-kind="CEA">+ CEA-861</button>' +
      '<button class="sm" data-act="ext-add" data-kind="DISPLAYID">+ DisplayID</button>' +
      '<button class="sm" data-act="ext-add" data-kind="VTB">+ VTB</button>' +
      '<button class="sm" data-act="ext-add" data-kind="BLOCK_MAP">+ 块映射</button>');

    return html;
  }

  function descBodyHtml(d, i) {
    var p = 'descriptors.' + i + '.data.';
    if (d.type === 'detailed') {
      var data = d.data || E.defaultDTD(1920, 1080, 60);
      return '<div class="field-row">' +
        f('像素时钟 (kHz)', num(p + 'pixelClock', data.pixelClock, { min: 0, max: 655350, step: 10 })) +
        f('行有效', num(p + 'hActive', data.hActive, { min: 0, max: 4095 })) +
        f('行消隐', num(p + 'hBlanking', data.hBlanking, { min: 0, max: 4095 })) +
        '</div><div class="field-row">' +
        f('场有效', num(p + 'vActive', data.vActive, { min: 0, max: 4095 })) +
        f('场消隐', num(p + 'vBlanking', data.vBlanking, { min: 0, max: 4095 })) +
        '</div><div class="field-row">' +
        f('行同步偏移', num(p + 'hSyncOffset', data.hSyncOffset, { min: 0, max: 1023 })) +
        f('行同步宽度', num(p + 'hSyncWidth', data.hSyncWidth, { min: 0, max: 1023 })) +
        f('场同步偏移', num(p + 'vSyncOffset', data.vSyncOffset, { min: 0, max: 63 })) +
        f('场同步宽度', num(p + 'vSyncWidth', data.vSyncWidth, { min: 0, max: 63 })) +
        '</div><div class="field-row">' +
        f('图像宽 (mm)', num(p + 'hSize', data.hSize, { min: 0, max: 4095 })) +
        f('图像高 (mm)', num(p + 'vSize', data.vSize, { min: 0, max: 4095 })) +
        '</div>' +
        check(p + 'interlaced', data.interlaced, '隔行扫描（场值按单场填写）') +
        check(p + 'hSyncPositive', data.hSyncPositive, '行同步正极性') +
        check(p + 'vSyncPositive', data.vSyncPositive, '场同步正极性') +
        '<div class="hint">刷新率 = 像素时钟 ÷ (行总数 × 场总数) = ' +
        ((data.pixelClock > 0 && (data.hActive + data.hBlanking) > 0 && (data.vActive + data.vBlanking) > 0)
          ? (data.pixelClock * 1000 / ((data.hActive + data.hBlanking) * (data.vActive + data.vBlanking))).toFixed(2) + ' Hz'
          : '—') + '</div>';
    }
    if (d.type === 'range_limits') {
      var rd = d.data || {};
      var formSel = [['default-gtf', '默认 GTF（0x00）'], ['range-only', '仅范围限制（0x01）'],
        ['gtf2', '次级 GTF（0x02）'], ['cvt', 'CVT（0x04）']];
      var inner = '<div class="field-row">' +
        f('最小场频', num(p + 'minVRate', rd.minVRate == null ? 50 : rd.minVRate, { min: 1, max: 255 })) +
        f('最大场频', num(p + 'maxVRate', rd.maxVRate == null ? 75 : rd.maxVRate, { min: 1, max: 255 })) +
        f('最小行频', num(p + 'minHRate', rd.minHRate == null ? 30 : rd.minHRate, { min: 1, max: 255 })) +
        f('最大行频', num(p + 'maxHRate', rd.maxHRate == null ? 83 : rd.maxHRate, { min: 1, max: 255 })) +
        f('最大像素时钟 (MHz)', num(p + 'maxPixelClock', rd.maxPixelClock == null ? 170 : rd.maxPixelClock, { min: 10, max: 2550, step: 10 })) +
        '</div>' +
        f('时序支持', select(p + 'timingFormula', _formulaName(rd.timingFormula), formSel),
          '0x00 / 0x01 时后 7 字节必须是 LF + 6 个空格');
      if (_formulaName(rd.timingFormula) === 'cvt') {
        inner += '<div class="field-row">' +
          f('CVT 最大有效像素', num(p + 'cvtMaxActivePixels', rd.cvtMaxActivePixels || 0, { min: 0, max: 2040, step: 8 }), '0 = 不限制') +
          f('CVT 首选宽高比', select(p + 'cvtPreferredAspect', rd.cvtPreferredAspect || '16:9',
            [['4:3', '4:3'], ['16:9', '16:9'], ['16:10', '16:10'], ['5:4', '5:4'], ['15:9', '15:9']])) +
          '</div>';
      }
      return inner;
    }
    if (d.type === 'unused') return '<div class="small dim">该槽位写入 00 00 00 10 00 … 全 0 的空描述符。</div>';
    return f('文本内容（最多 12 字符，超出会被截断）', text('descriptors.' + i + '.text', d.text, 'MY DISPLAY', 40));
  }

  function _formulaName(v) {
    if (typeof v === 'string') return v;
    if (v === 0x00) return 'default-gtf';
    if (v === 0x01) return 'range-only';
    if (v === 0x02) return 'gtf2';
    if (v === 0x04) return 'cvt';
    return 'cvt';
  }

  function fmtList(arr) { return (arr || []).join(', '); }

  function extListHtml(m) {
    if (!m.extensions.length) {
      return '<div class="empty">未添加扩展块。基础块单独就能工作，但 HDMI / DisplayPort 显示器通常需要 CEA-861 扩展块来声明分辨率与音频能力。</div>';
    }
    return '<div class="stack">' + m.extensions.map(function (ext, i) {
      var title = ext.type === 'CEA' ? 'CEA-861 扩展块' : ext.type === 'DISPLAYID' ? 'DisplayID 扩展块'
        : ext.type === 'VTB' ? 'VTB 时序块' : '块映射表';
      var inner = '';
      if (ext.type === 'CEA') {
        var vids = (ext.dataBlocks || []).filter(function (b) { return b.type === 'video'; })[0];
        var auds = (ext.dataBlocks || []).filter(function (b) { return b.type === 'audio'; });
        var spk = (ext.dataBlocks || []).filter(function (b) { return b.type === 'speaker'; })[0];
        var vsdb = (ext.dataBlocks || []).filter(function (b) { return b.type === 'hdmi-vsdb'; })[0];
        var hdr = (ext.dataBlocks || []).filter(function (b) { return b.type === 'hdr-static'; })[0];
        var col = (ext.dataBlocks || []).filter(function (b) { return b.type === 'colorimetry'; })[0];
        var codes = vids ? vids.codes.map(function (c) { return c.code + (c.native ? 'n' : ''); }).join(', ') : '';
        var spkBits = spk ? spk.speakers : [];
        inner =
          '<div class="field-row">' + f('修订号', num('extensions.' + i + '.revision', ext.revision, { min: 1, max: 3 })) + '</div>' +
          '<fieldset><legend>CEA 标志</legend><div class="grid cols-2" style="gap:2px 14px">' +
          check('extensions.' + i + '.features.basicAudio', ext.features.basicAudio, '支持基本音频') +
          check('extensions.' + i + '.features.ycbcr444', ext.features.ycbcr444, '支持 YCbCr 4:4:4') +
          check('extensions.' + i + '.features.ycbcr422', ext.features.ycbcr422, '支持 YCbCr 4:2:2') +
          check('extensions.' + i + '.features.underscan', ext.features.underscan, '支持欠扫描') +
          '</div></fieldset>' +
          f('视频格式（VIC）', '<textarea rows="2" data-act="videos" data-i="' + i + '" spellcheck="false">' + esc(codes) + '</textarea>',
            '用逗号分隔；结尾加 <code>n</code> 表示原生格式，例如 <code>97n, 96, 63, 16, 4</code>') +
          '<fieldset><legend>音频描述符</legend><div id="audio-' + i + '">' + audioRowsHtml(i, auds) + '</div>' +
          '<button class="sm" data-act="audio-add" data-i="' + i + '">+ 添加音频格式</button></fieldset>' +
          '<fieldset><legend>扬声器布局</legend><div class="grid cols-2" style="gap:2px 14px">' +
          C.SPEAKER_ALLOCATION.slice(0, 8).map(function (s) {
            return check('spk:' + i + ':' + s[0], spkBits.indexOf(s[0]) >= 0, s[1]);
          }).join('') + '</div></fieldset>' +
          check('vsdb:' + i, !!vsdb, '包含 HDMI 1.4 厂商数据块（VSDB）');
        if (vsdb) {
          inner += '<div class="field-row">' +
            f('物理地址', text('extensions.' + i + '.vsdbPhysical', _pa(vsdb.data), '1.0.0.0'), '格式 a.b.c.d，0.0.0.0 表示未连接') +
            f('最大 TMDS 时钟 (MHz，5 的倍数)', num('extensions.' + i + '.vsdbMaxTmds', vsdb.data.maxTmdsClockMHz, { min: 0, max: 1275, step: 5 })) +
            '</div><div class="grid cols-2" style="gap:2px 14px">' +
            check('extensions.' + i + '.vsdbDeep30', vsdb.data.deepColor30, '支持 30 位深色') +
            check('extensions.' + i + '.vsdbDeep36', vsdb.data.deepColor36, '支持 36 位深色') +
            check('extensions.' + i + '.vsdbAI', vsdb.data.supportsAI, '支持 AI（内容类型）') +
            '</div>';
        }
        inner += check('hdr:' + i, !!hdr, '包含 HDR 静态元数据块（扩展标签 0x06）');
        if (hdr) {
          inner += '<div class="grid cols-2" style="gap:2px 14px">' +
            check('extensions.' + i + '.hdrEotfSDR', hdr.data.traditionalSDR, '传统 SDR 伽马') +
            check('extensions.' + i + '.hdrEotfPQ', hdr.data.hdrPQ, 'SMPTE ST 2084 (HDR10)') +
            check('extensions.' + i + '.hdrEotfHLG', hdr.data.hlg, 'HLG') +
            check('extensions.' + i + '.hdrStatic', hdr.data.staticMetadata, '静态元数据 Type 1') +
            '</div>';
        }
        inner += check('cm:' + i, !!col, '包含色度数据块（Colorimetry，0x05）');
      } else if (ext.type === 'DISPLAYID') {
        inner = '<div class="field-row">' +
          f('版本', select('extensions.' + i + '.version', ext.version,
            [[0x12, '1.2 (0x12)'], [0x13, '1.3 (0x13)'], [0x20, '2.0 (0x20)']])) +
          f('产品类型', num('extensions.' + i + '.productType', ext.productType, { min: 0, max: 255 })) +
          '</div>' +
          f('分节（每行：标签, 版本, 十六进制字节）', '<textarea rows="3" data-act="sections" data-i="' + i + '" spellcheck="false">' +
            esc(displayIdSectionsText(ext)) + '</textarea>', '例如 <code>0x00, 1, 4142430A</code>');
      } else if (ext.type === 'VTB') {
        inner = '<div class="field-row">' + f('版本', num('extensions.' + i + '.version', ext.version, { min: 1, max: 255 })) + '</div>' +
          '<div class="small dim">描述符数量：' + (ext.descriptors || []).length +
          '（可用下面的按钮把首选时序复制进来）</div>' +
          '<button class="sm" data-act="vtb-copy" data-i="' + i + '" style="margin-top:8px">从描述符 1 复制 DTD</button>';
      } else {
        inner = f('声明的总块数（0 = 自动）', num('extensions.' + i + '.numberOfBlocks', ext.numberOfBlocks || 0, { min: 0, max: 255 }),
          '实际写入时会按扩展块数量自动补全') +
          f('块标签（十进制或 0x 前缀，逗号分隔）',
            text('extensions.' + i + '.tagsText', (ext.tags || []).map(function (t) { return '0x' + C.hex(t, 2); }).join(', '), '0x02, 0x70'));
      }
      return '<div class="acc" style="border:1px solid var(--border);border-radius:8px">' +
        '<div class="flex" style="padding:10px 12px">' +
        '<b>' + esc(title) + '</b>' + R.chip('块 ' + (i + 1), 'accent') +
        '<span class="right"></span>' +
        '<button class="sm ghost" data-act="ext-del" data-i="' + i + '">删除</button></div>' +
        '<div class="inner" style="border-top:1px solid var(--border)">' + inner + '</div></div>';
    }).join('') + '</div>';
  }

  function _pa(data) {
    return [data.a | 0, data.b | 0, data.c | 0, data.d | 0].join('.');
  }

  function audioRowsHtml(extIndex, auds) {
    if (!auds || !auds.length) return '<div class="small dim">未添加音频格式。</div>';
    var out = [];
    auds.forEach(function (a, ai) {
      (a.items || []).forEach(function (item, ii) {
        out.push('<div class="field-row" style="grid-template-columns:1fr .8fr 1.4fr 1.2fr 34px;margin-bottom:6px">' +
          '<select data-path="extensions.' + extIndex + '.audio.' + ai + '.' + ii + '.format">' +
          C.CEA_AUDIO_FORMATS.map(function (n, fi) {
            return fi ? opt(fi, n, item.format) : '';
          }).join('') + '</select>' +
          '<input type="number" min="1" max="8" data-type="number" data-path="extensions.' + extIndex + '.audio.' + ai + '.' + ii + '.channels" value="' + item.channels + '">' +
          '<input type="text" data-path="extensions.' + extIndex + '.audio.' + ai + '.' + ii + '.rates" value="' + esc((item.sampleRates || []).join(',')) + '" placeholder="192,96,48">' +
          '<input type="text" data-path="extensions.' + extIndex + '.audio.' + ai + '.' + ii + '.depths" value="' + esc((item.bitDepths || []).join(',')) + '" placeholder="24,16">' +
          '<button class="sm ghost" data-act="audio-del" data-i="' + extIndex + '" data-a="' + ai + '" data-x="' + ii + '">✕</button>' +
          '</div>');
      });
    });
    return out.join('');
  }

  function displayIdSectionsText(ext) {
    return (ext.sections || []).map(function (s) {
      return '0x' + C.hex(s.tag, 2) + ', ' + (s.revision || 0) + ', ' + (s.bytes ? C.bytesToHex(s.bytes).replace(/ /g, '') : '');
    }).join('\n');
  }

  /* Encoder: rebuild model from decoded EDID then re-render. */
  function encRender() {
    var m = state.enc.model;
    var encoded = E.encode(m);
    state.enc.bytes = encoded.bytes;

    $('#enc-blocks').textContent = encoded.bytes.length / 128 + ' 块';
    $('#enc-bytes').textContent = encoded.bytes.length + ' 字节';
    $('#enc-hexwrap').innerHTML = R.hexViewer(encoded.bytes, { perPage: 256, page: state.enc.page });
    $('#enc-warn-count').innerHTML = encoded.warnings.length
      ? R.chip(encoded.warnings.length + ' 条生成提示', 'warn') : '';

    $('#enc-warnings').innerHTML = encoded.warnings.map(function (w) {
      return '<div class="msg warning"><span class="dot"></span><div class="txt">' + esc(w) + '</div></div>';
    }).join('');

    var v = V.validate(encoded.bytes);
    $('#enc-preview-verdict').className = 'chip ' + (v.isValid ? (v.warnings.length ? 'warn' : 'ok') : 'err');
    $('#enc-preview-verdict').textContent = v.isValid
      ? (v.warnings.length ? v.warnings.length + ' 警告' : '校验通过') : v.errors.length + ' 错误';
    var dec = D.decode(encoded.bytes);
    $('#enc-preview').innerHTML = dec.ok
      ? R.decodeReport(dec)
      : '<div class="msg error"><span class="dot"></span><div class="txt">' + esc(dec.error) + '</div></div>';
    if (state.needsFormRender) {
      state.needsFormRender = false;
      $('#enc-form').innerHTML = encFormHtml(m);
    }
  }

  function encReencodeOnly() {
    var encoded = E.encode(state.enc.model);
    state.enc.bytes = encoded.bytes;
    $('#enc-blocks').textContent = encoded.bytes.length / 128 + ' 块';
    $('#enc-bytes').textContent = encoded.bytes.length + ' 字节';
    $('#enc-hexwrap').innerHTML = R.hexViewer(encoded.bytes, { perPage: 256, page: state.enc.page });
    $('#enc-warn-count').innerHTML = encoded.warnings.length
      ? R.chip(encoded.warnings.length + ' 条生成提示', 'warn') : '';
    $('#enc-warnings').innerHTML = encoded.warnings.map(function (w) {
      return '<div class="msg warning"><span class="dot"></span><div class="txt">' + esc(w) + '</div></div>';
    }).join('');
    var v = V.validate(encoded.bytes);
    $('#enc-preview-verdict').className = 'chip ' + (v.isValid ? (v.warnings.length ? 'warn' : 'ok') : 'err');
    $('#enc-preview-verdict').textContent = v.isValid
      ? (v.warnings.length ? v.warnings.length + ' 警告' : '校验通过') : v.errors.length + ' 错误';
    var dec = D.decode(encoded.bytes);
    $('#enc-preview').innerHTML = dec.ok ? R.decodeReport(dec)
      : '<div class="msg error"><span class="dot"></span><div class="txt">' + esc(dec.error) + '</div></div>';
  }

  function encReflow() { state.needsFormRender = true; state.enc.page = 0; encRender(); save(); }
  function encTouch() { encReencodeOnly(); save(); }

  /* Field changes inside the encoder form. */
  function encFieldChange(t) {
    var path = t.getAttribute('data-path');
    var type = t.getAttribute('data-type');

    /* Established timings live in an array keyed by label. */
    if (path && path.indexOf('est:') === 0) {
      var label = path.substring(4);
      var key = C.establishedKey(label);
      var list = state.enc.model.establishedTimings.filter(function (l) { return C.establishedKey(l) !== key; });
      if (t.checked) list.push(label);
      state.enc.model.establishedTimings = list;
      var chipEl = $('#enc-form [data-est-chip]');
      if (chipEl) chipEl.textContent = list.length + ' 项';
      encTouch();
      return;
    }
    /* Speaker bits for a CEA extension. */
    if (path && path.indexOf('spk:') === 0) {
      var sp = path.split(':');
      var ext = state.enc.model.extensions[parseInt(sp[1], 10)];
      var db = ext.dataBlocks.filter(function (b) { return b.type === 'speaker'; })[0];
      if (!db) { db = { type: 'speaker', speakers: [] }; ext.dataBlocks.push(db); }
      var bit = parseInt(sp[2], 10);
      var idx = db.speakers.indexOf(bit);
      if (t.checked && idx < 0) db.speakers.push(bit);
      if (!t.checked && idx >= 0) db.speakers.splice(idx, 1);
      db.speakers.sort(function (a, b) { return a - b; });
      encTouch();
      return;
    }
    /* Toggle pseudo-paths (vsdb:0, hdr:0, cm:0) */
    if (path && path.indexOf('vsdb:') === 0) {
      var ei = parseInt(path.split(':')[1], 10);
      var ex = state.enc.model.extensions[ei];
      var has = ex.dataBlocks.filter(function (b) { return b.type === 'hdmi-vsdb'; })[0];
      if (t.checked && !has) ex.dataBlocks.push({ type: 'hdmi-vsdb', data: { a: 1, b: 0, c: 0, d: 0, maxTmdsClockMHz: 300 } });
      if (!t.checked && has) ex.dataBlocks = ex.dataBlocks.filter(function (b) { return b.type !== 'hdmi-vsdb'; });
      encReflow();
      return;
    }
    if (path && path.indexOf('hdr:') === 0) {
      var hi = parseInt(path.split(':')[1], 10);
      var hx = state.enc.model.extensions[hi];
      var hHas = hx.dataBlocks.filter(function (b) { return b.type === 'hdr-static'; })[0];
      if (t.checked && !hHas) hx.dataBlocks.push({ type: 'hdr-static', data: { traditionalSDR: true, hdrPQ: true, hlg: true, staticMetadata: true } });
      if (!t.checked && hHas) hx.dataBlocks = hx.dataBlocks.filter(function (b) { return b.type !== 'hdr-static'; });
      encReflow();
      return;
    }
    if (path && path.indexOf('cm:') === 0) {
      var cix = parseInt(path.split(':')[1], 10);
      var cx = state.enc.model.extensions[cix];
      var cHas = cx.dataBlocks.filter(function (b) { return b.type === 'colorimetry'; })[0];
      if (t.checked && !cHas) cx.dataBlocks.push({ type: 'colorimetry', data: { bt2020RGB: true, dciP3: true } });
      if (!t.checked && cHas) cx.dataBlocks = cx.dataBlocks.filter(function (b) { return b.type !== 'colorimetry'; });
      encReflow();
      return;
    }

    if (!path) return;
    var value;
    if (type === 'bool') value = t.checked;
    else if (type === 'number') {
      value = t.value === '' ? 0 : Number(t.value);
      if (!isFinite(value)) value = 0;
    } else value = t.value;

    setPath(state.enc.model, path, value);

    /* Changing the input type or the descriptor type reshapes the form. */
    if (path === 'isDigital') { encReflow(); return; }
    if (/^extensions\.\d+\.vsdbPhysical$/.test(path)) { encTouch(); return; }
    encTouch();
  }

  /* Non-input actions inside the encoder form. */
  function encAction(btn) {
    var act = btn.getAttribute('data-act');
    var m = state.enc.model;
    var i = parseInt(btn.getAttribute('data-i'), 10);

    if (act === 'est-none') { m.establishedTimings = []; encReflow(); return; }
    if (act === 'std-add') {
      if (m.standardTimings.length >= 8) return;
      m.standardTimings.push({ width: 1280, height: 720, refreshRate: 60, aspectRatio: 'auto' });
      encReflow(); return;
    }
    if (act === 'std-del') { m.standardTimings.splice(i, 1); encReflow(); return; }
    if (act === 'color-srgb') {
      m.colorCharacteristics = C.sRGBChromaticity();
      encReflow(); return;
    }
    if (act === 'color-d65') {
      m.colorCharacteristics.white = { x: 0.3127, y: 0.329 };
      encReflow(); return;
    }
    if (act === 'desc-from-cvt') {
      var pref = m.descriptors[0];
      var w = (pref && pref.type === 'detailed') ? pref.data.hActive : 1920;
      var h = (pref && pref.type === 'detailed') ? pref.data.vActive : 1080;
      var r = (pref && pref.type === 'detailed')
        ? Math.round(pref.data.pixelClock * 1000 / ((pref.data.hActive + pref.data.hBlanking) * (pref.data.vActive + pref.data.vBlanking))) || 60
        : 60;
      m.descriptors[0] = { type: 'detailed', data: E.defaultDTD(w, h, clamp(r, 24, 240), 1) };
      encReflow(); return;
    }
    if (act === 'ext-add') {
      var kind = btn.getAttribute('data-kind');
      if (kind === 'CEA') m.extensions.push(E.ceaHdExtension());
      else if (kind === 'DISPLAYID') m.extensions.push({ type: 'DISPLAYID', version: 0x12, productType: 2, sections: [{ tag: 0x00, revision: 1, bytes: [0x41, 0x42, 0x43, 0x0A] }] });
      else if (kind === 'VTB') m.extensions.push({ type: 'VTB', version: 1, descriptors: [] });
      else m.extensions.push({ type: 'BLOCK_MAP', numberOfBlocks: 0, tags: [] });
      encReflow(); return;
    }
    if (act === 'ext-del') { m.extensions.splice(i, 1); encReflow(); return; }
    if (act === 'vtb-copy') {
      var ext = m.extensions[i];
      var src = m.descriptors[0];
      if (src && src.type === 'detailed') {
        ext.descriptors = (ext.descriptors || []).concat([JSON.parse(JSON.stringify(src.data))]);
        toast('已复制', '描述符 1 的 DTD 已加入 VTB', 'ok');
      } else toast('无法复制', '描述符 1 不是详细时序', 'err');
      encReflow(); return;
    }
    if (act === 'audio-add') {
      var ea = m.extensions[i];
      var adb = ea.dataBlocks.filter(function (b) { return b.type === 'audio'; })[0];
      if (!adb) { adb = { type: 'audio', items: [] }; ea.dataBlocks.push(adb); }
      if (adb.items.length >= 10) { toast('已达到上限', '音频数据块最多 10 个描述符', 'warn'); return; }
      adb.items.push({ format: 1, channels: 2, sampleRates: [48], bitDepths: [16] });
      encReflow(); return;
    }
    if (act === 'audio-del') {
      var exd = m.extensions[i];
      var ai = parseInt(btn.getAttribute('data-a'), 10);
      var xi = parseInt(btn.getAttribute('data-x'), 10);
      var ablk = exd.dataBlocks.filter(function (b) { return b.type === 'audio'; })[ai];
      if (ablk) ablk.items.splice(xi, 1);
      encReflow(); return;
    }
  }

  /* Textareas that need parsing (VIC list, DisplayID sections). */
  function encTextarea(t) {
    var act = t.getAttribute('data-act');
    var i = parseInt(t.getAttribute('data-i'), 10);
    var m = state.enc.model;
    if (act === 'videos') {
      var ext = m.extensions[i];
      var codes = t.value.split(/[\s,;]+/).filter(Boolean).map(function (tok) {
        var native = /n$/i.test(tok);
        var n = parseInt(tok.replace(/[^0-9]/g, ''), 10);
        return isNaN(n) ? null : { code: clamp(n, 0, 127), native: native };
      }).filter(Boolean);
      var db = ext.dataBlocks.filter(function (b) { return b.type === 'video'; })[0];
      if (db) db.codes = codes;
      else if (codes.length) ext.dataBlocks.unshift({ type: 'video', codes: codes });
      encTouch(); return;
    }
    if (act === 'sections') {
      var de = m.extensions[i];
      de.sections = t.value.split('\n').map(function (line) {
        var parts = line.split(',');
        if (parts.length < 3) return null;
        var tag = parseInt(parts[0].replace(/[^0-9a-fA-Fx]/g, '').replace(/^0x/i, ''), 16);
        var rev = parseInt(parts[1].trim(), 10) || 0;
        var bytes = bytesFromText(parts.slice(2).join(','));
        return isNaN(tag) ? null : { tag: tag, revision: rev, bytes: bytes ? Array.prototype.slice.call(bytes) : [] };
      }).filter(Boolean);
      encTouch(); return;
    }
  }

  /* ================================================================ timing */
  function tmRender() {
    var s = state.tm;
    var tmOpt = {
      width: s.width, height: s.height, refreshRate: s.refresh,
      interlaced: s.interlaced, margins: s.margins
    };
    if (s.aspect !== 'auto' && s.aspect !== '21:9') {
      var parts = s.aspect.split(':');
      tmOpt.aspectRatio = parseInt(parts[0], 10) / parseInt(parts[1], 10);
    }
    var t;
    try {
      if (s.standard === 'gtf') t = T.computeGTF(tmOpt);
      else { tmOpt.rbVersion = s.rb; t = T.computeCVT(tmOpt); }
    } catch (e) {
      $('#tm-out').innerHTML = R.card('计算失败', '<div class="msg error"><span class="dot"></span><div class="txt">' +
        esc(e.message) + '</div></div>');
      return;
    }
    var ctx = {
      label: s.standard === 'gtf' ? 'GTF 结果' : 'CVT 结果',
      standardName: s.standard === 'gtf' ? 'VESA GTF' : 'VESA CVT',
      raName: ''
    };
    $('#tm-out').innerHTML = R.timingReport(t, ctx);
    $('#tm-mode-chip').textContent = t.modeName || (s.standard === 'gtf' ? 'GTF' : 'CVT');
    state.tm.last = t;
    save();
  }

  function tmExtraHtml() {
    if (state.tm.standard === 'gtf') {
      return '<fieldset><legend>GTF 选项</legend>' +
        '<label class="check"><input type="checkbox" id="tm-il"' + (state.tm.interlaced ? ' checked' : '') + '><span>隔行扫描</span></label>' +
        '<label class="check"><input type="checkbox" id="tm-mg"' + (state.tm.margins ? ' checked' : '') + '><span>包含边框 (margins)</span></label>' +
        '</fieldset>';
    }
    return '<div class="small dim" style="margin-top:-4px">缩减消隐（RB / RBv2 / RBv3）可显著降低像素时钟，是高刷新率与高分屏的常用选择。</div>';
  }

  function tmSyncFields() {
    $('#tm-w').value = state.tm.width;
    $('#tm-h').value = state.tm.height;
    $('#tm-r').value = state.tm.refresh;
    $('#tm-ar').value = state.tm.aspect;
    $('#tm-standard').value = state.tm.standard;
    $('#tm-rb').value = String(state.tm.rb);
    $('#tm-rb-field').style.display = state.tm.standard === 'gtf' ? 'none' : '';
    $('#tm-extra').innerHTML = tmExtraHtml();
    var il = $('#tm-il'), mg = $('#tm-mg');
    if (il) il.addEventListener('change', function () { state.tm.interlaced = il.checked; tmRender(); });
    if (mg) mg.addEventListener('change', function () { state.tm.margins = mg.checked; tmRender(); });
  }

  /* ================================================================== init */
  function switchTab(name) {
    state.tab = name;
    $$('nav.tabs button').forEach(function (b) {
      b.setAttribute('aria-selected', String(b.getAttribute('data-tab') === name));
    });
    $$('.panel').forEach(function (p) { p.classList.toggle('active', p.id === 'panel-' + name); });
    save();
  }

  function setTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    $('#theme-icon').innerHTML = '<use href="#' + (theme === 'dark' ? 'i-sun' : 'i-moon') + '"/>';
    gammaRerender();
    save();
  }

  /* A draft coming back from localStorage may predate a field, or may have been
     hand-edited.  Fill in anything missing before the form reads it, so a stale
     draft can never produce an "undefined" input. */
  function normalizeModel(m) {
    var base = E.defaultModel();
    if (!m || typeof m !== 'object') return base;
    var out = {};
    Object.keys(base).forEach(function (k) { out[k] = base[k]; });
    Object.keys(m).forEach(function (k) { if (m[k] !== undefined) out[k] = m[k]; });

    out.dpms = Object.assign({}, base.dpms, out.dpms || {});
    out.features = Object.assign({}, base.features, out.features || {});
    out.syncSupport = Object.assign({}, base.syncSupport, out.syncSupport || {});
    out.colorCharacteristics = Object.assign({}, base.colorCharacteristics, out.colorCharacteristics || {});
    ['red', 'green', 'blue', 'white'].forEach(function (k) {
      out.colorCharacteristics[k] = Object.assign({}, base.colorCharacteristics[k], out.colorCharacteristics[k] || {});
    });

    if (!Array.isArray(out.establishedTimings)) out.establishedTimings = [];
    if (!Array.isArray(out.standardTimings)) out.standardTimings = [];
    if (!Array.isArray(out.extensions)) out.extensions = [];

    var dtdDefaults = E.defaultDTD(1920, 1080, 60);
    var rangeDefaults = {
      minVRate: 50, maxVRate: 75, minHRate: 30, maxHRate: 83,
      maxPixelClock: 170, timingFormula: 'cvt', cvtMaxActivePixels: 1920, cvtPreferredAspect: '16:9'
    };
    var descs = Array.isArray(out.descriptors) ? out.descriptors.slice(0, 4) : [];
    out.descriptors = descs.map(function (d) {
      if (!d || typeof d !== 'object') return { type: 'unused' };
      if (d.type === 'detailed') return { type: 'detailed', data: Object.assign({}, dtdDefaults, d.data || {}) };
      if (d.type === 'range_limits') return { type: 'range_limits', data: Object.assign({}, rangeDefaults, d.data || {}) };
      if (d.type === 'unused') return { type: 'unused' };
      return { type: d.type, text: d.text == null ? '' : String(d.text) };
    });
    while (out.descriptors.length < 4) out.descriptors.push({ type: 'unused' });

    return out;
  }

  function initEncoder() {
    state.enc.model = normalizeModel(state.enc.model);
    state.needsFormRender = true;

    var holder = $('#enc-presets');
    holder.innerHTML = Object.keys(E.FORMAT_PRESETS).map(function (k) {
      return '<button class="sm" data-preset="' + k + '">' + esc(E.FORMAT_PRESETS[k].label.split('—')[0].trim()) + '</button>';
    }).join('') + '<button class="sm primary" data-preset="__default">恢复默认</button>';
    holder.addEventListener('click', function (e) {
      var b = e.target.closest('[data-preset]');
      if (!b) return;
      var k = b.getAttribute('data-preset');
      var m = E.defaultModel();
      if (k !== '__default') E.FORMAT_PRESETS[k].apply(m);
      state.enc.model = m;
      encReflow();
      toast('已套用预设', k === '__default' ? '默认 1080p HDMI 模型' : E.FORMAT_PRESETS[k].label, 'ok');
    });

    var form = $('#enc-form');
    form.addEventListener('input', function (e) {
      if (e.target.matches('textarea[data-act]')) { encTextarea(e.target); return; }
      if (e.target.matches('[data-path]')) encFieldChange(e.target);
    });
    form.addEventListener('change', function (e) {
      if (e.target.matches('select[data-act="desc-type"]')) {
        var i = parseInt(e.target.getAttribute('data-i'), 10);
        var type = e.target.value;
        var old = state.enc.model.descriptors[i] || {};
        var fresh = { type: type };
        if (type === 'detailed') fresh.data = (old.type === 'detailed' && old.data) ? old.data : E.defaultDTD(1920, 1080, 60);
        else if (type === 'range_limits') fresh.data = (old.type === 'range_limits' && old.data) ? old.data
          : { minVRate: 50, maxVRate: 75, minHRate: 30, maxHRate: 83, maxPixelClock: 170, timingFormula: 'cvt', cvtMaxActivePixels: 1920, cvtPreferredAspect: '16:9' };
        else if (type === 'unused') { /* nothing */ }
        else fresh.text = (old.text || (type === 'product_name' ? 'MY DISPLAY' : 'TEXT'));
        state.enc.model.descriptors[i] = fresh;
        encReflow();
        return;
      }
      if (e.target.matches('[data-path]')) encFieldChange(e.target);
    });
    form.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-act]');
      if (b) encAction(b);
    });

    $('#enc-validate').addEventListener('click', function () {
      var r = V.validate(state.enc.bytes);
      openModal('生成结果校验', R.validationReport(r));
    });
    $('#enc-copy').addEventListener('click', function () {
      copyText(C.bytesToHex(state.enc.bytes));
    });
    $('#enc-dl-bin').addEventListener('click', function () {
      download('edid-' + state.enc.model.manufacturer + '-' + state.enc.model.productCode + '.bin', state.enc.bytes, 'application/octet-stream');
    });
    $('#enc-dl-hex').addEventListener('click', function () {
      download('edid-' + state.enc.model.manufacturer + '-' + state.enc.model.productCode + '.hex',
        C.bytesToHex(state.enc.bytes) + '\n', 'text/plain;charset=utf-8');
    });
    $('#enc-print').addEventListener('click', function () { printPanel('encoder'); });

    /* First paint: build the form, the hex preview and the validation verdict. */
    encRender();
  }

  function initDecoder() {
    $('#dec-run').addEventListener('click', function () { decRun(); });
    $('#dec-clear').addEventListener('click', function () {
      $('#dec-hex').value = ''; state.dec.hex = '';
      $('#dec-out').innerHTML = '<div class="card"><div class="body"><div class="empty">还没有数据。</div></div></div>';
      updateSizeChip('', $('#dec-size'));
      save();
    });
    $('#dec-open').addEventListener('click', function () { $('#dec-file').click(); });
    $('#dec-sample').addEventListener('click', function () {
      showSamples(function (hex, name) { decSetBytes(bytesFromText(hex), name); });
    });
    $('#dec-file').addEventListener('change', function (e) {
      if (e.target.files[0]) readFile(e.target.files[0], function (bytes, f) { decSetBytes(bytes, f.name); });
      e.target.value = '';
    });
    dropZone($('#dec-drop'), function (bytes, f) { decSetBytes(bytes, f.name); });
    $('#dec-hex').addEventListener('input', function () {
      state.dec.hex = $('#dec-hex').value;
      updateSizeChip(state.dec.hex, $('#dec-size'));
      save();
    });
    $('#dec-to-enc').addEventListener('click', function () {
      var bytes = bytesFromText($('#dec-hex').value);
      if (!bytes) { toast('没有数据', '先解析或粘贴一份 EDID', 'err'); return; }
      var dec = D.decode(bytes);
      if (!dec.ok) { toast('解析失败', dec.error, 'err'); return; }
      var mapped = modelFromDecoded(dec);
      state.enc.model = mapped.model;
      encReflow();
      switchTab('encoder');
      toast('已导入生成器', '基础块字段已映射' + (mapped.skipped.length ? '；未映射的扩展块：' + mapped.skipped.join('、') : ''),
        mapped.skipped.length ? 'warn' : 'ok');
    });
  }

  function initValidator() {
    $('#val-run').addEventListener('click', valRun);
    $('#val-clear').addEventListener('click', function () {
      $('#val-hex').value = ''; state.val.hex = '';
      $('#val-out').innerHTML = '<div class="card"><div class="body"><div class="empty">粘贴数据后点击“开始校验”。</div></div></div>';
      updateSizeChip('', $('#val-size'));
      save();
    });
    $('#val-open').addEventListener('click', function () { $('#val-file').click(); });
    $('#val-sample').addEventListener('click', function () {
      showSamples(function (hex) {
        $('#val-hex').value = hex; state.val.hex = hex;
        updateSizeChip(hex, $('#val-size'));
        valRun();
      });
    });
    $('#val-from-dec').addEventListener('click', function () {
      var hex = $('#dec-hex').value;
      if (!hex) { toast('解析器为空', '先在“解析”页载入数据', 'err'); return; }
      $('#val-hex').value = hex; state.val.hex = hex;
      updateSizeChip(hex, $('#val-size'));
      valRun();
    });
    $('#val-file').addEventListener('change', function (e) {
      if (e.target.files[0]) readFile(e.target.files[0], function (bytes) {
        $('#val-hex').value = C.bytesToHex(bytes);
        state.val.hex = $('#val-hex').value;
        updateSizeChip(state.val.hex, $('#val-size'));
        valRun();
      });
      e.target.value = '';
    });
    dropZone($('#val-drop'), function (bytes) {
      $('#val-hex').value = C.bytesToHex(bytes);
      state.val.hex = $('#val-hex').value;
      updateSizeChip(state.val.hex, $('#val-size'));
      valRun();
    });
    $('#val-hex').addEventListener('input', function () {
      state.val.hex = $('#val-hex').value;
      updateSizeChip(state.val.hex, $('#val-size'));
      save();
    });
  }

  function initTiming() {
    tmSyncFields();
    $('#tm-standard').addEventListener('change', function () {
      state.tm.standard = this.value; tmSyncFields(); tmRender();
    });
    $('#tm-rb').addEventListener('change', function () { state.tm.rb = parseInt(this.value, 10); tmRender(); });
    ['tm-w', 'tm-h', 'tm-r'].forEach(function (id) {
      $('#' + id).addEventListener('input', function () {
        var v = Number(this.value);
        if (!isFinite(v)) return;
        if (id === 'tm-w') state.tm.width = clamp(Math.round(v), 64, 16384);
        if (id === 'tm-h') state.tm.height = clamp(Math.round(v), 64, 16384);
        if (id === 'tm-r') state.tm.refresh = clamp(v, 1, 480);
        tmRender();
      });
    });
    $('#tm-ar').addEventListener('change', function () { state.tm.aspect = this.value; tmRender(); });
    $('#tm-swap').addEventListener('click', function () {
      var w = state.tm.width; state.tm.width = state.tm.height; state.tm.height = w;
      tmSyncFields(); tmRender();
    });
    $('#tm-run').addEventListener('click', tmRender);
    $('#tm-presets').addEventListener('click', function () {
      var body = '<div class="stack">' + T.PRESETS.map(function (p, i) {
        return '<button class="btn" style="width:100%;text-align:left" data-tp="' + i + '">' +
          '<b>' + p.width + ' × ' + p.height + '</b><span class="right dim small">' +
          (p.refreshRate || 60) + ' Hz</span></button>';
      }).join('') + '</div>';
      openModal('常用分辨率', body);
      setModalPicker(function (el) {
        var b = el.closest('[data-tp]');
        if (!b) return false;
        var p = T.PRESETS[parseInt(b.getAttribute('data-tp'), 10)];
        if (!p) return false;
        state.tm.width = p.width; state.tm.height = p.height;
        if (p.refreshRate) state.tm.refresh = p.refreshRate;
        if (p.rbVersion != null) { state.tm.standard = 'cvt'; state.tm.rb = p.rbVersion; }
        closeModal();
        tmSyncFields(); tmRender();
        return true;
      });
    });
    tmRender();
  }

  /* ================================================== 时序对比（多标准） ===
   * 功能复刻自 Tom Verbeure 的 Video Timings Calculator：
   * 六种时序（CVT / CVT-RB / CVT-RBv2 / CEA-861 / DMT / 自定义）并排对比，
   * 加上 DP / HDMI / DVI / SDI / RFC4175 接口带宽核算。算法在 video-timings.js。
   */
  var VTC_STANDARDS = [
    { key: 'cvt',     label: 'CVT' },
    { key: 'cvt_rb',  label: 'CVT-RB' },
    { key: 'cvt_rb2', label: 'CVT-RBv2' },
    { key: 'cea',     label: 'CEA-861' },
    { key: 'dmt',     label: 'DMT' },
    { key: 'custom',  label: '自定义' }
  ];

  function vtcReadForm() {
    state.vtc.h = clamp(Math.round(Number($('#vtc-horiz').value) || 0), 1, 32768);
    state.vtc.v = clamp(Math.round(Number($('#vtc-vert').value) || 0), 1, 32768);
    state.vtc.r = clamp(Number($('#vtc-refresh').value) || 60, 1, 1000);
    state.vtc.margins = $('#vtc-margins').value === 'y';
    state.vtc.interlaced = $('#vtc-interlaced').value === 'y';
    state.vtc.bpc = parseInt($('#vtc-bpc').value, 10);
    state.vtc.color = $('#vtc-color').value;
    state.vtc.vopt = $('#vtc-vopt').value === 'y';
    state.vtc.chblank = clamp(Math.round(Number($('#vtc-chblank').value) || 0), 0, 4096);
    state.vtc.cvblank = clamp(Math.round(Number($('#vtc-cvblank').value) || 0), 0, 2048);
  }

  /* 与原工具一致的 URL 分享参数（file:// 下 replaceState 可能被拒，静默忽略） */
  function vtcSyncUrl() {
    try {
      var sp = new URLSearchParams();
      sp.set('horiz_pixels', state.vtc.h);
      sp.set('vert_pixels', state.vtc.v);
      sp.set('refresh_rate', state.vtc.r);
      sp.set('margins', state.vtc.margins);
      sp.set('interlaced', state.vtc.interlaced);
      sp.set('bpc', state.vtc.bpc);
      sp.set('color_fmt', state.vtc.color);
      sp.set('video_opt', state.vtc.vopt);
      sp.set('custom_hblank', state.vtc.chblank);
      sp.set('custom_vblank', state.vtc.cvblank);
      history.replaceState(null, '', '?' + sp.toString());
    } catch (e) { /* file:// 等 */
    }
  }

  function vtcReadUrl() {
    try {
      var q = new URLSearchParams(location.search);
      function num(name, lo, hi, dflt) {
        var s = q.get(name);
        if (s == null || s === '' || !isFinite(Number(s))) return dflt;
        return clamp(Math.round(Number(s)), lo, hi);
      }
      state.vtc.h = num('horiz_pixels', 1, 32768, state.vtc.h);
      state.vtc.v = num('vert_pixels', 1, 32768, state.vtc.v);
      state.vtc.r = q.get('refresh_rate') != null && isFinite(Number(q.get('refresh_rate')))
        ? clamp(Number(q.get('refresh_rate')), 1, 1000) : state.vtc.r;
      if (q.get('margins') === 'true' || q.get('margins') === 'false') state.vtc.margins = q.get('margins') === 'true';
      if (q.get('interlaced') === 'true' || q.get('interlaced') === 'false') state.vtc.interlaced = q.get('interlaced') === 'true';
      state.vtc.bpc = num('bpc', 5, 16, state.vtc.bpc);
      var cf = q.get('color_fmt');
      if (['rgb444', 'yuv444', 'yuv422', 'yuv420'].indexOf(cf) >= 0) state.vtc.color = cf;
      if (q.get('video_opt') === 'true' || q.get('video_opt') === 'false') state.vtc.vopt = q.get('video_opt') === 'true';
      state.vtc.chblank = num('custom_hblank', 0, 4096, state.vtc.chblank);
      state.vtc.cvblank = num('custom_vblank', 0, 2048, state.vtc.cvblank);
    } catch (e) { /* 无 URLSearchParams 环境 */
    }
  }

  function vtcSyncFields() {
    $('#vtc-horiz').value = state.vtc.h;
    $('#vtc-vert').value = state.vtc.v;
    $('#vtc-refresh').value = state.vtc.r;
    $('#vtc-margins').value = state.vtc.margins ? 'y' : 'n';
    $('#vtc-interlaced').value = state.vtc.interlaced ? 'y' : 'n';
    $('#vtc-bpc').value = String(state.vtc.bpc);
    $('#vtc-color').value = state.vtc.color;
    $('#vtc-vopt').value = state.vtc.vopt ? 'y' : 'n';
    $('#vtc-chblank').value = state.vtc.chblank;
    $('#vtc-cvblank').value = state.vtc.cvblank;
  }

  function f3(x) { return String(Math.round(x * 1000) / 1000); }

  /* 一行参数在六个标准列上的值 */
  function vtcRow(label, get) {
    return ['<b>' + label + '</b>'].concat(VTC_STANDARDS.map(function (s) {
      return get(state.vtc.results[s.key], s.key);
    }));
  }

  function vtcRender() {
    vtcReadForm();
    vtcSyncUrl();
    var s = state.vtc;
    var results = VTC.computeAll(s.h, s.v, s.r, s.margins, s.interlaced, s.vopt, s.chblank, s.cvblank);
    state.vtc.results = results;

    var hit = VTC_STANDARDS.filter(function (st) { return results[st.key]; }).length;
    $('#vtc-chip').textContent = s.h + '×' + s.v + '@' + s.r + 'Hz · ' + hit + '/6 标准命中';

    /* ---- 参数矩阵 ---- */
    function cell(t, key) {
      if (!t) return '<span class="dim">—</span>';
      return key(t);
    }
    function num(x) { return x; }

    var rows = [];
    rows.push(vtcRow('宽高比', function (t) { return cell(t, function (x) { return esc(x.aspect); }); }));
    rows.push(vtcRow('像素时钟 (MHz)', function (t) { return cell(t, function (x) { return '<b>' + f3(x.pclk) + '</b>'; }); }));

    rows.push(vtcRow('H 总', function (t) { return cell(t, function (x) { return num(x.hTotal); }); }));
    rows.push(vtcRow('H 有效', function (t) { return cell(t, function (x) { return num(x.hActive); }); }));
    rows.push(vtcRow('H 消隐', function (t) { return cell(t, function (x) { return num(x.hBlank); }); }));
    rows.push(vtcRow('H 前沿', function (t) { return cell(t, function (x) { return num(x.hFront); }); }));
    rows.push(vtcRow('H 同步', function (t) { return cell(t, function (x) { return num(x.hSync); }); }));
    rows.push(vtcRow('H 后沿', function (t) { return cell(t, function (x) { return num(x.hBack); }); }));
    rows.push(vtcRow('H 极性', function (t) { return cell(t, function (x) { return num(x.hPol); }); }));
    rows.push(vtcRow('H 频率 (kHz)', function (t) { return cell(t, function (x) { return f3(x.hFreq / 1000); }); }));
    rows.push(vtcRow('H 周期 (µs)', function (t) { return cell(t, function (x) { return f3(x.hPeriodUs); }); }));

    rows.push(vtcRow('V 总', function (t) { return cell(t, function (x) { return num(x.vTotal); }); }));
    rows.push(vtcRow('V 有效', function (t) { return cell(t, function (x) { return num(x.vActive); }); }));
    rows.push(vtcRow('V 消隐', function (t) { return cell(t, function (x) { return num(x.vBlank); }); }));
    rows.push(vtcRow('V 消隐时长 (µs)', function (t) { return cell(t, function (x) { return num(Math.round(x.vBlankUs)); }); }));
    rows.push(vtcRow('V 前沿', function (t) { return cell(t, function (x) { return num(x.vFront); }); }));
    rows.push(vtcRow('V 同步', function (t) { return cell(t, function (x) { return num(x.vSync); }); }));
    rows.push(vtcRow('V 后沿', function (t) { return cell(t, function (x) { return num(x.vBack); }); }));
    rows.push(vtcRow('V 极性', function (t) { return cell(t, function (x) { return num(x.vPol); }); }));
    rows.push(vtcRow('V 频率 (Hz)', function (t) { return cell(t, function (x) { return f3(x.vFreqActual); }); }));
    rows.push(vtcRow('V 周期 (ms)', function (t) { return cell(t, function (x) { return f3(x.vPeriodMs); }); }));

    var fmtMult = s.color === 'yuv422' ? 2 : s.color === 'yuv420' ? 1.5 : 3;
    rows.push(vtcRow('峰值带宽 (Mbit/s)', function (t) {
      return cell(t, function (x) { return num(Math.round(x.pclk * 1000000 * s.bpc * fmtMult / 1000000)); });
    }));
    rows.push(vtcRow('行带宽 (Mbit/s)', function (t) {
      return cell(t, function (x) { return num(Math.round(x.pclk * 1000000 * s.bpc * fmtMult * x.hActive / x.hTotal / 1000000)); });
    }));
    rows.push(vtcRow('有效带宽 (Mbit/s)', function (t) {
      return cell(t, function (x) { return num(Math.round(x.vFreqActual * s.bpc * x.vActive * x.hActive * fmtMult / 1000000)); });
    }));

    rows.push(vtcRow('DMT ID', function (t, key) {
      if (key !== 'dmt' || !t) return '';
      return '0x' + t.dmtId.toString(16).toUpperCase().padStart(2, '0');
    }));
    rows.push(vtcRow('Std 2 字节码', function (t, key) {
      if (key !== 'dmt' || !t || !t.dmt2Byte) return '';
      return t.dmt2Byte.map(function (b) { return '0x' + b.toString(16); }).join(', ');
    }));
    rows.push(vtcRow('CVT 3 字节码', function (t, key) {
      if (key !== 'dmt' || !t || !t.dmt3Byte) return '';
      return t.dmt3Byte.map(function (b) { return '0x' + b.toString(16); }).join(', ');
    }));
    rows.push(vtcRow('VIC', function (t, key) {
      if (key !== 'cea' || !t) return '';
      return '<b>' + t.vic + '</b>';
    }));

    var head = ['参数'].concat(VTC_STANDARDS.map(function (st) { return '<b>' + st.label + '</b>'; }));
    var html = R.card('六标准时序对比', R.tableHtml(head, rows),
      R.chip(s.h + '×' + s.v, 'accent'));

    /* ---- Modeline ---- */
    var mlRows = VTC_STANDARDS.filter(function (st) { return results[st.key]; }).map(function (st) {
      var t = results[st.key];
      var ml = VTC.modeline(t);
      return ['<b>' + st.label + '</b>',
        '<code style="word-break:break-all">' + esc(ml) + '</code>',
        '<button class="sm" data-copy="' + esc(ml) + '">复制</button>'];
    });
    html += R.card('Xorg Modeline', R.tableHtml(['标准', '命令', ''], mlRows));

    /* ---- 接口带宽核算 ---- */
    var bwByStd = {};
    VTC_STANDARDS.forEach(function (st) {
      bwByStd[st.key] = results[st.key] ? VTC.bandwidth(results[st.key], s.bpc, s.color) : null;
    });
    var bwRows = VTC.TRANSPORTS.map(function (tr) {
      var row = ['<b>' + esc(tr.name) + '</b>'];
      VTC_STANDARDS.forEach(function (st) {
        var list = bwByStd[st.key];
        if (!list) { row.push('<span class="dim">—</span>'); return; }
        var r = list.filter(function (x) { return x.id === tr.id; })[0];
        if (r.restricted) { row.push('<span class="chip err">仅 8bpc RGB</span>'); return; }
        var txt = (r.ok ? 'Ok' : 'No') + ' (' + r.pct + '%)';
        var cls = r.ok ? 'ok' : 'err';
        var extra = '';
        if (!r.ok && r.dscOk) extra = '<br><span class="chip info">DSC ' + r.dscBpp + 'bpp</span>';
        row.push('<span class="chip ' + cls + '">' + txt + '</span>' + extra);
      });
      return row;
    });
    html += R.card('接口带宽支持（峰值 ' + (s.bpc) + 'bpc ' +
      ({ rgb444: 'RGB 4:4:4', yuv444: 'YUV 4:4:4', yuv422: 'YUV 4:2:2', yuv420: 'YUV 4:2:0' })[s.color] + '）',
      R.tableHtml(['接口'].concat(VTC_STANDARDS.map(function (st) { return '<b>' + st.label + '</b>'; })), bwRows),
      R.chip('Ok = 可传输 · No = 超带宽 · DSC = 压缩后可传输', 'info'));

    html += '<p class="small dim">说明：CEA-861 / DMT 列显示 “—” 表示该分辨率不在标准表内（此时可用 CVT 或自定义模式）;' +
      '自定义模式只保证总消隐量与像素时钟，前后沿按 CVT-RB 布局分配;' +
      '隔行模式下 CVT 系列的 V 有效为场有效行数（规范定义），CEA-861 / DMT 为整帧行数。' +
      '带宽数据含各接口的编码开销，DSC 按 8bpp 最低压缩估算。计算逻辑参考 Tom Verbeure 的开源工具。</p>';

    $('#vtc-out').innerHTML = html;
  }

  function initVTC() {
    /* 预定义模式下拉 */
    var sel = $('#vtc-preset');
    VTC.PRESET_MODES.forEach(function (m) {
      var o = document.createElement('option');
      o.value = m.name;
      o.textContent = m.name + '（' + m.h + '×' + m.v + '）';
      sel.appendChild(o);
    });
    sel.addEventListener('change', function () {
      var name = this.value;
      if (!name) { vtcRender(); return; }
      var m = VTC.PRESET_MODES.filter(function (x) { return x.name === name; });
      if (m.length) {
        state.vtc.h = m[0].h; state.vtc.v = m[0].v; state.vtc.r = m[0].r;
        vtcSyncFields();
      }
      vtcRender();
    });

    ['vtc-horiz', 'vtc-vert', 'vtc-refresh', 'vtc-chblank', 'vtc-cvblank'].forEach(function (id) {
      $('#' + id).addEventListener('input', vtcRender);
    });
    ['vtc-margins', 'vtc-interlaced', 'vtc-bpc', 'vtc-color', 'vtc-vopt'].forEach(function (id) {
      $('#' + id).addEventListener('change', vtcRender);
    });

    vtcReadUrl();
    vtcSyncFields();
    vtcRender();
  }

  /* ===================== 伽马验证（Gamma verification） ===================== */

  var gam = {
    source: 'builtin',        /* 'builtin' | 'file' */
    key: null,                /* selected built-in dataset key */
    wb1: null, wb2: null, name1: '', name2: '',
    last: null                /* { res, cfg } of the last rendered charts */
  };
  var GAMMA_MAX_FILE = 32 * 1024 * 1024;

  function gamDatasets() {
    return (window.GammaData && window.GammaData.datasets) ? window.GammaData.datasets : [];
  }

  function gamDataset(key) {
    var list = gamDatasets();
    for (var i = 0; i < list.length; i++) if (list[i].key === key) return list[i];
    return null;
  }

  function initGamma() {
    var sel = $('#gam-curve');
    var list = gamDatasets();
    if (list.length) {
      list.forEach(function (d) {
        var o = document.createElement('option');
        o.value = d.key;
        o.textContent = d.key + '（目标 γ ' + d.target.toFixed(1) + '，占比列 ' + d.dutyCol + '）';
        sel.appendChild(o);
      });
    } else {
      GAMMA.CURVES.forEach(function (c) {
        var o = document.createElement('option');
        o.value = c.name;
        o.textContent = c.name + '（占比列 ' + c.col + '）';
        sel.appendChild(o);
      });
    }
    gamBuiltinList();
    $('#gam-source').addEventListener('change', gamSourceChange);
    sel.addEventListener('change', gamCurveChange);
    $('#gam-file1').addEventListener('change', function () { gamRead(this, 1); });
    $('#gam-file2').addEventListener('change', function () { gamRead(this, 2); });
    $('#gam-run').addEventListener('click', gamRun);
    $('#gam-save').addEventListener('click', gamSave);
    ['gam-r1s', 'gam-r1e', 'gam-r2s', 'gam-r2e'].forEach(function (id) {
      $('#' + id).addEventListener('input', gamRangeChange);
    });
    gamToggleSource();
    /* default: bundled BT1886 measurement data */
    var first = list.length ? list[0].key : ($('#gam-curve').value || 'GammaBT1886');
    gamApplyBuiltin(first);
  }

  function gamBuiltinList() {
    var host = $('#gam-builtin-list');
    if (!host) return;
    var D = window.GammaData;
    if (!D) { host.innerHTML = '<div>（未找到内置数据文件）</div>'; return; }
    var rows = D.datasets.map(function (d) {
      return '<div>' + d.file + ' — <a href="data/' + d.file + '" download>' + d.file + '</a>' +
        '<span class="muted"> · 目标 γ ' + d.target.toFixed(1) + ' · 占比列 ' + d.dutyCol +
        ' · ' + d.count + ' 点 · 实测 Avg γ ' + d.avgGamma.toFixed(3) + '</span></div>';
    });
    rows.push('<div>' + D.duty.file + ' — <a href="data/' + D.duty.file + '" download>' + D.duty.file + '</a>' +
      '<span class="muted"> · 灰阶占比表（B~G 列对应 6 条曲线）</span></div>');
    host.innerHTML = rows.join('');
  }

  function gamToggleSource() {
    var builtin = gam.source === 'builtin';
    $('#gam-builtin-info').classList.toggle('hide', !builtin);
    $('#gam-file-rows').classList.toggle('hide', builtin);
  }

  function gamSourceChange() {
    gam.source = $('#gam-source').value === 'file' ? 'file' : 'builtin';
    gamToggleSource();
    if (gam.source === 'builtin') {
      gamApplyBuiltin(gam.key || $('#gam-curve').value || 'GammaBT1886');
    } else {
      $('#gam-status').textContent = '自定义模式：请选择测量数据 Excel 文件' +
        (gam.name1 ? '（当前已加载 ' + gam.name1 + '）' : '') + '，然后点击「生成图表」。';
    }
  }

  function gamCurveChange() {
    var key = $('#gam-curve').value;
    if (gam.source === 'builtin') {
      gamApplyBuiltin(key);
      return;
    }
    var curve = GAMMA.curveByName(key.replace('_', '.'));
    $('#gam-title').value = curve ? curve.name : key;
    if (gam.wb1) gamRun();
  }

  function gamRangeChange() {
    if (gam.source === 'builtin') gamApplyBuiltin(gam.key || $('#gam-curve').value);
  }

  function gamClampRow(v, lo, hi, def) {
    if (v === null || isNaN(v)) return def;
    return Math.min(Math.max(v, lo), hi);
  }

  /* ---------- built-in datasets ---------- */

  function gamApplyBuiltin(key) {
    var ds = gamDataset(key);
    if (!ds) return;
    var D = window.GammaData;
    var duty = D.duty;

    gam.source = 'builtin';
    gam.key = key;
    $('#gam-curve').value = key;
    $('#gam-xcol').value = 'A';
    $('#gam-ycol').value = 'G';
    $('#gam-wxcol').value = 'E';
    $('#gam-wycol').value = 'F';
    $('#gam-r1s').value = ds.rowStart;
    $('#gam-r1e').value = ds.rowEnd;
    $('#gam-r2s').value = duty.rowStart;
    $('#gam-r2e').value = duty.rowEnd;
    $('#gam-title').value = ds.curve;

    /* row fields narrow the stored range (clamped to what was extracted) */
    var r1s = gamClampRow(gamRow('gam-r1s'), ds.rowStart, ds.rowEnd, ds.rowStart);
    var r1e = gamClampRow(gamRow('gam-r1e'), r1s, ds.rowEnd, ds.rowEnd);
    var r2s = gamClampRow(gamRow('gam-r2s'), duty.rowStart, duty.rowEnd, duty.rowStart);
    var r2e = gamClampRow(gamRow('gam-r2e'), r2s, duty.rowEnd, duty.rowEnd);
    var off1 = r1s - ds.rowStart, n1 = r1e - r1s + 1;
    var off2 = r2s - duty.rowStart, n2 = r2e - r2s + 1;

    var measure = {
      A: ds.x.slice(off1, off1 + n1),
      G: ds.y.slice(off1, off1 + n1),
      E: ds.wx.slice(off1, off1 + n1),
      F: ds.wy.slice(off1, off1 + n1)
    };
    var dutySrc = {};
    dutySrc[ds.dutyCol] = duty.columns[ds.dutyCol].slice(off2, off2 + n2);

    var cfg = {
      xCol: 'A', yCol: 'G', wxCol: 'E', wyCol: 'F', dutyCol: ds.dutyCol,
      curve: ds.curve, key: ds.key,
      title: $('#gam-title').value.trim() || ds.curve,
      xlabel: $('#gam-xlabel').value.trim() || 'Input Level',
      ylabel: $('#gam-ylabel').value.trim() || 'Luminance(nits)'
    };
    var res = GAMMA.assemble(measure, dutySrc, cfg);
    gam.last = { res: res, cfg: cfg };
    gamRender();

    var clamped = (r1s !== ds.rowStart || r1e !== ds.rowEnd || r2s !== duty.rowStart || r2e !== duty.rowEnd);
    var msg = '内置数据集 ' + ds.file + '（' + res.xs.length + ' 点）已载入；参考曲线取 ' +
      duty.file + ' 的 ' + ds.dutyCol + ' 列（' + ds.curve + '）。';
    if (clamped) msg += '行范围已按内置数据的可用区间（' + ds.rowStart + '-' + ds.rowEnd + ' / ' +
      duty.rowStart + '-' + duty.rowEnd + '）裁剪。';
    gamChip('内置: ' + ds.file);
    $('#gam-builtin-line').textContent = '当前：测量数据 ' + ds.file + '（第 ' + r1s + '-' + r1e +
      ' 行）＋ 灰阶占比 ' + duty.file + '（第 ' + r2s + '-' + r2e + ' 行，' + ds.dutyCol + ' 列 ' +
      ds.curve + '）。切换「选择验证的 Gamma 曲线」即自动重绘对应图表。';
    gamShowStats(res, ds.curve, ds.target);
    $('#gam-status').textContent = msg;
  }

  /* ---------- custom uploads ---------- */

  function gamChip(text) {
    $('#gam-chip').textContent = text;
  }

  function gamFileChip() {
    var parts = [];
    if (gam.name1) parts.push('测量: ' + gam.name1);
    if (gam.name2) parts.push('占比: ' + gam.name2);
    gamChip(parts.length ? parts.join(' ｜ ') : '未选择文件');
  }

  function gamRead(input, which) {
    var file = input.files && input.files[0];
    if (!file) return;
    if (file.size > GAMMA_MAX_FILE) {
      $('#gam-status').textContent = '文件过大（上限 32MB），无法解析：' + file.name;
      return;
    }
    var fr = new FileReader();
    fr.onload = function () {
      try {
        var wb = window.XLSXLite.parse(new Uint8Array(fr.result));
        if (which === 1) { gam.wb1 = wb; gam.name1 = file.name; }
        else { gam.wb2 = wb; gam.name2 = file.name; }
        gamFileChip();
        $('#gam-status').textContent = '已加载: ' + file.name + '（工作表: ' + wb.sheetNames.join(', ') + '）';
        if (gam.wb1) gamRun();
      } catch (ex) {
        $('#gam-status').textContent = '解析 ' + file.name + ' 失败: ' + ex.message;
      }
    };
    fr.onerror = function () {
      $('#gam-status').textContent = '读取文件失败: ' + file.name;
    };
    fr.readAsArrayBuffer(file);
  }

  function gamCol(id, def) {
    var v = $('#' + id).value.trim().toUpperCase();
    if (!v) return def;
    if (!/^[A-Z]{1,3}$/.test(v)) return null;
    return v;
  }

  function gamRow(id) {
    var v = $('#' + id).value.trim();
    if (!v) return null;
    var n = Number(v);
    if (!isFinite(n) || n < 1 || Math.floor(n) !== n) return NaN;
    return n;
  }

  function gamRun() {
    if (gam.source === 'builtin' && !gam.wb1) { gamApplyBuiltin(gam.key || $('#gam-curve').value); return; }
    if (!gam.wb1) {
      $('#gam-status').textContent = '请先选择测量数据 Excel 文件，或把「数据来源」切回内置测量数据。';
      return;
    }
    var curveName = $('#gam-curve').value;
    var curve = GAMMA.curveByName(curveName.replace('_', '.')) || GAMMA.CURVES[0];
    var cfg = {
      xCol: gamCol('gam-xcol', 'A'),
      yCol: gamCol('gam-ycol', 'G'),
      wxCol: gamCol('gam-wxcol', 'E'),
      wyCol: gamCol('gam-wycol', 'F'),
      r1s: gamRow('gam-r1s'), r1e: gamRow('gam-r1e'),
      r2s: gamRow('gam-r2s'), r2e: gamRow('gam-r2e'),
      curve: curve.name,
      title: $('#gam-title').value.trim() || curve.name,
      xlabel: $('#gam-xlabel').value.trim() || 'Input Level',
      ylabel: $('#gam-ylabel').value.trim() || 'Luminance(nits)'
    };
    if (!cfg.xCol || !cfg.yCol || !cfg.wxCol || !cfg.wyCol) {
      $('#gam-status').textContent = '列号无效：请填写 A~ZZ 范围内的列字母。';
      return;
    }
    if (isNaN(cfg.r1s) || isNaN(cfg.r1e) || isNaN(cfg.r2s) || isNaN(cfg.r2e)) {
      $('#gam-status').textContent = '行号无效：请填写正整数。';
      return;
    }
    if (cfg.r1s !== null && cfg.r1e !== null && cfg.r1s > cfg.r1e) {
      $('#gam-status').textContent = '测量数据起始行不能大于终止行。';
      return;
    }
    if (cfg.r2s !== null && cfg.r2e !== null && cfg.r2s > cfg.r2e) {
      $('#gam-status').textContent = '灰阶占比起始行不能大于终止行。';
      return;
    }
    try {
      var sheet1 = gam.wb1.sheet(0);
      var measure = GAMMA.extractColumns(sheet1,
        [cfg.xCol, cfg.yCol, cfg.wxCol, cfg.wyCol], cfg.r1s, cfg.r1e);
      var duty = null;
      if (gam.wb2) {
        duty = GAMMA.extractColumns(gam.wb2.sheet(0), [curve.col], cfg.r2s, cfg.r2e);
        cfg.dutyCol = curve.col;
      }
      var res = GAMMA.assemble(measure, duty, cfg);
      if (!res.xs.length) {
        $('#gam-status').textContent = '所选行列范围内没有可绘制的数值数据，请检查列号与起止行。';
        return;
      }
      gam.last = { res: res, cfg: cfg };
      gamRender();
      gamFileChip();
      gamShowStats(res, curve.name, curve.gamma);
      var msg = '图表已生成，显示 ' + res.xs.length + ' 条数据';
      if (res.dropped) msg += '（' + res.dropped + ' 行因缺少数值被跳过）';
      if (!res.refs && duty) msg += '；灰阶占比存在空值，未绘制参考曲线';
      else if (!duty) msg += '；未选择灰阶占比文件，仅绘制实测曲线';
      $('#gam-status').textContent = msg + '。';
    } catch (ex) {
      $('#gam-status').textContent = '生成图表失败: ' + ex.message;
    }
  }

  /* ---------- shared rendering ---------- */

  function gamShowStats(res, curveName, target) {
    var avg = GAMMA.avgGamma(res.xs, res.ys);
    var el = $('#gam-gamma');
    if (avg === null) {
      el.textContent = 'Avg γ: N/A';
      el.style.color = 'var(--text)';
      return null;
    }
    el.textContent = 'Avg γ: ' + avg.toFixed(3) + (target != null ? '，Ideal γ: ' + target.toFixed(1) : '');
    var LIMIT = 0.05;
    el.style.color = (target != null && Math.abs(avg - target) <= LIMIT) ? 'var(--ok)' : 'var(--err)';
    return avg;
  }

  function gamRender() {
    var l = gam.last;
    var out = $('#gam-out');
    var s1 = GAMMA.renderGammaChart(l.res, {
      title: l.cfg.title, xlabel: l.cfg.xlabel, ylabel: l.cfg.ylabel,
      refLabel: l.cfg.curve, theme: state.theme
    });
    var s2 = GAMMA.renderWhitePointChart(l.res, { xlabel: l.cfg.xlabel, theme: state.theme });
    out.innerHTML = '<div class="card"><div class="body gam-charts">' + s1 + s2 + '</div></div>';
  }

  function gammaRerender() {
    if (gam.last && $('#gam-out').firstChild) gamRender();
  }

  function gamSave() {
    if (!gam.last || !$('#gam-out svg')) {
      $('#gam-status').textContent = '当前没有可保存的图表，请先生成图表。';
      return;
    }
    var svgs = $$('#gam-out svg');
    var CW = 560, CH = 420, GAP = 24, SCALE = 2;
    var bg = GAMMA._internal.THEMES[state.theme === 'dark' ? 'dark' : 'light'].bg;
    var canvas = document.createElement('canvas');
    canvas.width = (CW * 2 + GAP) * SCALE;
    canvas.height = (CH + GAP * 2) * SCALE;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    var jobs = svgs.map(function (svg, i) {
      return new Promise(function (resolve) {
        var txt = new XMLSerializer().serializeToString(svg);
        var url = URL.createObjectURL(new Blob([txt], { type: 'image/svg+xml;charset=utf-8' }));
        var img = new Image();
        img.onload = function () {
          ctx.drawImage(img, (i * (CW + GAP) + (svgs.length === 1 ? (CW + GAP) / 2 : 0)) * SCALE,
            GAP * SCALE, CW * SCALE, CH * SCALE);
          URL.revokeObjectURL(url);
          resolve();
        };
        img.onerror = function () { URL.revokeObjectURL(url); resolve(); };
        img.src = url;
      });
    });
    Promise.all(jobs).then(function () {
      canvas.toBlob(function (blob) {
        if (!blob) { $('#gam-status').textContent = '导出 PNG 失败。'; return; }
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'gamma-charts.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
        $('#gam-status').textContent = '图表已保存为 gamma-charts.png。';
      }, 'image/png');
    });
  }

  /* ===================== DDC/CI（MCCS）控制 ===================== */
  var MCCS_LS = 'edidcraft-local:mccs';

  var mccs = {
    base: 'http://127.0.0.1:8760',
    connected: false,
    backend: '',
    monitors: [],
    monitor: 0,
    last: null,          /* 最近一次读取结果 */
    lastCode: 0x10,
    cap: null,           /* 已解析的能力字符串 */
    capText: '',
    capValues: {},       /* VCP 码 -> 该显示器声明的「取值 -> 文案」表（仅非连续量） */
    capCodes: {},        /* VCP 码 -> true：显示器在 capabilities 里声明了它 */
    log: [],
    refFilter: ''
  };

  var MCCS_SAMPLE_CAP =
    'prot(monitor)type(LCD)model(Q27G11SEP)cmds(01 02 03 07 0C E3 F3)' +
    'vcp(02 04 05 08 0B 0C 10 12 13 14(05 06 08 0B) 16 18 1A 60(0F 11) 62 ' +
    '86(01 02 0B 0C 0D 0E 0F 10 11 12 13 23) 87 8D(01 02) B6 C0 C6 C8 C9 CA ' +
    'CC(01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 12 14 16 1E 24) ' +
    'DC(00 0B 0C 0D 0E 0F 10 80 81 82 83 84 85 86 87 88 89 90 91 92 93 94) ' +
    'E2A002 E2A003 E2A006 E2A020(00 02) E2A040(00 01) F8E112(00 01 02 03 04) ' +
    'F8E151(00 01 02 03) F8E158 F8E159(00 01 02 03 04) F8E15A(00 01 02) ' +
    'F8E15B(00 01 02 03 04) F8E17F F8E190)mswhql(1)asset_eep(40)mccs_ver(2.2)';

  /* ---------------------------------------------------------- 小工具 */

  function mccsTable(head, rows) {
    if (!rows.length) return '<div class="empty">无</div>';
    return '<div class="table-scroll"><table><thead><tr>' +
      head.map(function (h) { return '<th>' + h + '</th>'; }).join('') +
      '</tr></thead><tbody>' + rows.map(function (r) {
        return '<tr>' + r.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
  }

  function mccsKv(rows) {
    return '<dl class="kv">' + rows.map(function (r) {
      return '<dt>' + r[0] + '</dt><dd class="' + (r[2] || '') + '">' + (r[3] ? r[1] : esc(r[1])) + '</dd>';
    }).join('') + '</dl>';
  }

  function mccsPre(text, id) {
    return '<pre class="mono" style="margin:8px 0 0;padding:10px 12px;background:var(--code-bg);' +
      'border:1px solid var(--border);border-radius:var(--radius-sm);overflow:auto"' +
      (id ? ' id="' + id + '"' : '') + '>' + esc(text) + '</pre>';
  }

  function mccsCopy(text, label) {
    function done() { toast('已复制', label || '', 'ok'); }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove();
      if (ok) done(); else toast('复制失败', '请手动选中文本复制', 'warn');
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else fallback();
  }

  function mccsDownload(name, text) {
    var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }

  function mccsLog(kind, text) {
    mccs.log.unshift({ t: new Date(), kind: kind, text: text });
    if (mccs.log.length > 400) mccs.log.length = 400;
    mccsRenderLog();
  }

  function mccsRenderLog() {
    var chip = $('#mccs-log-chip');
    if (chip) chip.textContent = mccs.log.length + ' 条';
    var box = $('#mccs-log');
    if (!box) return;
    if (!mccs.log.length) {
      box.innerHTML = '<div class="empty">还没有操作记录。</div>';
      return;
    }
    var cls = { TX: 'info', RX: 'ok', ERR: 'err', INFO: '' };
    box.innerHTML = '<div class="table-scroll"><table><tbody>' + mccs.log.map(function (e) {
      var t = ('0' + e.t.getHours()).slice(-2) + ':' + ('0' + e.t.getMinutes()).slice(-2) + ':' +
        ('0' + e.t.getSeconds()).slice(-2);
      return '<tr><td class="mono nowrap">' + t + '</td><td class="nowrap"><span class="chip ' +
        (cls[e.kind] || '') + '">' + esc(e.kind) + '</span></td><td class="mono">' + esc(e.text) + '</td></tr>';
    }).join('') + '</tbody></table></div>';
  }

  /* ---------------------------------------------------------- 桥接连接 */

  function mccsOnLocalhost() {
    return location.protocol.indexOf('http') === 0 &&
      (location.hostname === '127.0.0.1' || location.hostname === 'localhost');
  }

  function mccsBaseUrl() {
    return (mccs.base || '').replace(/\/+$/, '');
  }

  function mccsFetch(base, path, opts, timeout) {
    if (typeof fetch !== 'function') {
      return Promise.resolve({ ok: false, error: '当前浏览器不支持 fetch，无法连接桥接' });
    }
    var init = { method: (opts && opts.method) || 'GET', cache: 'no-store' };
    if (opts && opts.body) {
      init.headers = { 'Content-Type': 'application/json' };
      init.body = JSON.stringify(opts.body);
    }
    var timer = null;
    if (typeof AbortController !== 'undefined') {
      var ctl = new AbortController();
      init.signal = ctl.signal;
      timer = setTimeout(function () { ctl.abort(); }, timeout || 40000);
    }
    return fetch(base + path, init).then(function (r) {
      if (timer) clearTimeout(timer);
      return r.json().catch(function () {
        return { ok: false, error: 'HTTP ' + r.status + '：桥接返回的不是 JSON（地址是否正确？）' };
      });
    }, function (e) {
      if (timer) clearTimeout(timer);
      return { ok: false, error: '无法连接桥接：' + (e && e.message ? e.message : e) };
    });
  }

  function mccsSetChip(text, kind) {
    var chip = $('#mccs-chip');
    if (!chip) return;
    chip.className = 'chip ' + (kind || '');
    chip.textContent = text;
  }

  function mccsConnect() {
    var manual = mccsBaseUrl();
    var bases = [];
    if (mccsOnLocalhost()) bases.push('');           /* 页面就是桥接托管的：同源优先 */
    if (manual) bases.push(manual);
    if (location.protocol === 'file:') bases.push('http://127.0.0.1:8760');

    mccsSetChip('连接中…', 'warn');
    $('#mccs-bridge-status').textContent = '正在探测 ' + (bases.length ? bases.map(function (b) {
      return b || (location.origin + '（同源）');
    }).join('、') : '（未配置地址）') + ' …';

    var i = 0;
    function tryNext() {
      if (i >= bases.length) {
        mccs.connected = false;
        mccsSetChip('未连接', 'warn');
        $('#mccs-bridge-status').innerHTML =
          '没有检测到桥接服务。请先在本机启动 <code>ddc-bridge.js</code>（见上方折叠说明），' +
          '然后点「检测连接」。未连接时仍然可以使用下方的<b>能力字符串解析</b>与<b>报文构建器</b>（纯离线）。';
        mccsLog('ERR', '桥接连接失败');
        return;
      }
      var base = bases[i++];
      mccsFetch(base, '/api/ping', null, 8000).then(function (p) {
        if (!p || !p.ok) return tryNext();
        mccs.base = base || mccs.base;
        mccs.backend = p.backend || '';
        mccsSave();
        return mccsFetch(base, '/api/monitors', null, 30000).then(function (m) {
          if (!m || !m.ok) {
            mccs.connected = true;
            mccsSetChip('已连接', 'ok');
            $('#mccs-bridge-status').innerHTML = '桥接已连接（后端 <code>' + esc(p.backend) +
              '</code>），但列出显示器失败：' + esc(m && m.error ? m.error : '未知错误') +
              (m && m.hint ? '（' + esc(m.hint) + '）' : '');
            mccsLog('ERR', '列出显示器失败：' + (m && m.error ? m.error : '未知'));
            return;
          }
          mccs.connected = true;
          mccs.monitors = m.monitors || [];
          mccsFillMonitors();
          mccsSetChip('已连接 · ' + mccs.monitors.length + ' 台显示器', 'ok');
          $('#mccs-bridge-status').innerHTML = '桥接已连接：后端 <code>' + esc(p.backend) +
            '</code>，平台 <code>' + esc(p.platform) + '</code>，站点根目录 <code>' + esc(p.root || '') + '</code>。';
          mccsLog('INFO', '桥接已连接（' + p.backend + '），发现 ' + mccs.monitors.length + ' 台显示器');
        });
      });
    }
    tryNext();
  }

  function mccsFillMonitors() {
    var sel = $('#mccs-monitor');
    if (!sel) return;
    sel.innerHTML = '';
    if (!mccs.monitors.length) {
      sel.innerHTML = '<option value="0">（未发现显示器）</option>';
      return;
    }
    mccs.monitors.forEach(function (mo) {
      var o = document.createElement('option');
      o.value = String(mo.index);
      o.textContent = '#' + mo.index + ' — ' + (mo.description || mo.device || '显示器') +
        (mo.device ? '（' + mo.device + '）' : '');
      sel.appendChild(o);
    });
    sel.value = String(mccs.monitors.some(function (x) { return x.index === mccs.monitor; }) ? mccs.monitor : 0);
    mccs.monitor = parseInt(sel.value, 10) || 0;
  }

  /* ---------------------------------------------------------- 码表选择 */

  function mccsFillCodeSelect(filter) {
    var sel = $('#mccs-code');
    if (!sel) return;
    var f = (filter || '').trim().toLowerCase();
    var groups = {}, order = [];
    (window.MCCSData ? window.MCCSData.VCP : []).forEach(function (e) {
      var text = (MCCS.vcpText(e.c) + ' ' + e.zh + ' ' + e.en + ' ' + e.g).toLowerCase();
      if (f && text.indexOf(f) < 0) return;
      if (!groups[e.g]) { groups[e.g] = []; order.push(e.g); }
      groups[e.g].push(e);
    });
    var keep = sel.value;
    sel.innerHTML = '';
    var total = 0;
    order.forEach(function (g) {
      var og = document.createElement('optgroup');
      og.label = g + '（' + groups[g].length + '）';
      groups[g].forEach(function (e) {
        var o = document.createElement('option');
        o.value = MCCS.vcpText(e.c);
        o.textContent = MCCS.vcpText(e.c) + ' · ' + e.zh + ' · ' +
          (e.t === 'C' ? '连续量' : (e.t === 'NC' ? '非连续量' : e.t)) + ' · ' + MCCS.rwText(e.rw) +
          (mccs.capCodes[e.c] ? ' ✓' : '');
        og.appendChild(o);
        total++;
      });
      sel.appendChild(og);
    });
    if (keep && sel.querySelector('option[value="' + keep + '"]')) sel.value = keep;
  }

  function mccsParseCodeInput(text) {
    var s = String(text || '').trim().replace(/^0x/i, '');
    if (!/^[0-9a-f]{1,6}$/i.test(s)) return null;
    return parseInt(s, 16);
  }

  function mccsCurrentCode() {
    var v = $('#mccs-code') ? $('#mccs-code').value : '10';
    var c = mccsParseCodeInput(v);
    return c === null ? 0x10 : c;
  }

  function mccsCodeInfo(code) {
    var e = MCCS.vcp(code);
    var parts = [];
    if (e) {
      parts.push('<b>' + MCCS.vcpText(code) + '</b> ' + esc(e.zh) + '（' + esc(e.en) + '）');
      parts.push(MCCS.typeText(e.t) + ' · ' + MCCS.rwText(e.rw) + ' · 分组 ' + esc(e.g));
      if (e.n) parts.push(esc(e.n));
    } else {
      parts.push('<b>' + MCCS.vcpText(code) + '</b> 未收录的码（很可能是厂商自定义码）');
    }
    if (mccs.capCodes[code]) {
      var map = mccs.capValues[code];
      parts.push('该显示器声明支持' + (map ?
        '，取值：' + Object.keys(map).map(function (k) { return map[k]; }).join(' / ') :
        '（连续量，取值以读取返回的最大值为准）'));
    }
    return parts.join('　·　');
  }

  /* 从能力字符串里取出每个码声明的取值，做成「值 -> 文案」表；
     同时记录「显示器声明支持哪些码」（连续量码不带取值，也要记下来） */
  function mccsBuildCapValues() {
    var values = {}, codes = {};
    if (mccs.cap && mccs.cap.vcp) {
      mccs.cap.vcp.forEach(function (f) {
        codes[f.code] = true;
        if (f.values && f.values.length) {
          var m = {};
          f.values.forEach(function (v) { m[v] = MCCS.formatValue(f.code, v); });
          values[f.code] = m;
        }
      });
    }
    mccs.capValues = values;
    mccs.capCodes = codes;
  }

  function mccsSyncNcSelect(code) {
    var sel = $('#mccs-ncv');
    if (!sel) return;
    var map = mccs.capValues[code];
    sel.innerHTML = '';
    if (!map) {
      var e = MCCS.vcp(code);
      if (e && e.v) map = e.v;
    }
    if (!map) {
      sel.innerHTML = '<option value="">（该码没有已知枚举值）</option>';
      return;
    }
    sel.innerHTML = '<option value="">（选择后自动填入）</option>';
    Object.keys(map).forEach(function (k) {
      var o = document.createElement('option');
      o.value = String(k);
      o.textContent = map[k] + '（' + k + '）';
      sel.appendChild(o);
    });
  }

  function mccsCodeChanged() {
    var code = mccsCurrentCode();
    $('#mccs-codeinfo').innerHTML = mccsCodeInfo(code);
    mccsSyncNcSelect(code);
    mccs.lastCode = code;
    mccsBuild();
  }

  /* ---------------------------------------------------------- 读写操作 */

  function mccsMonitorIndex() {
    var sel = $('#mccs-monitor');
    var n = sel ? parseInt(sel.value, 10) : 0;
    return isNaN(n) ? 0 : n;
  }

  function mccsCheckConnected() {
    if (!mccs.connected) {
      toast('未连接桥接', '请先启动并连接本机桥接服务', 'warn');
      $('#mccs-result').innerHTML = '<div class="notice warn">尚未连接桥接服务：真实读写需要先在本机运行 ' +
        '<code>ddc-bridge.js</code>，再点「检测连接」。<br>不想装桥接的话，下面的报文构建器与能力字符串解析都能离线用。</div>';
      return false;
    }
    return true;
  }

  function mccsGet() {
    if (!mccsCheckConnected()) return;
    var code = mccsCurrentCode();
    var idx = mccsMonitorIndex();
    var req = MCCS.buildGetVCP({ code: code, wide: mccsWide() });
    mccsLog('TX', 'GET  monitor=' + idx + ' vcp=' + MCCS.vcpText(code) + '  ' + MCCS.hex(req));
    $('#mccs-rw-chip').className = 'chip warn';
    $('#mccs-rw-chip').textContent = '读取中…';
    mccsFetch(mccsBaseUrl(), '/api/vcp?monitor=' + idx + '&code=0x' + code.toString(16), null, 30000)
      .then(function (r) {
        if (!r || !r.ok) {
          $('#mccs-rw-chip').className = 'chip err';
          $('#mccs-rw-chip').textContent = '读取失败';
          mccsLog('ERR', (r && r.error ? r.error : '读取失败') + (r && r.hint ? '  → ' + r.hint : ''));
          mccsShowError(r, code, '读');
          return;
        }
        mccs.last = r;
        $('#mccs-rw-chip').className = 'chip ok';
        $('#mccs-rw-chip').textContent = '当前值 ' + r.current + ' / ' + r.max;
        mccsLog('RX', 'GET  vcp=' + MCCS.vcpText(code) + ' current=' + r.current + ' max=' + r.max +
          ' → ' + MCCS.formatValue(code, r.current, mccs.capValues[code]));
        if (r.max) { $('#mccs-value').max = String(r.max); }
        mccsShowRead(r, code, req);
      });
  }

  function mccsSet() {
    if (!mccsCheckConnected()) return;
    var code = mccsCurrentCode();
    var idx = mccsMonitorIndex();
    var value = parseInt($('#mccs-value').value, 10);
    if (isNaN(value)) { toast('数值无效', '请输入 0–65535', 'warn'); return; }
    var req = MCCS.buildSetVCP({ code: code, value: value, wide: mccsWide() });
    mccsLog('TX', 'SET  monitor=' + idx + ' vcp=' + MCCS.vcpText(code) + ' value=' + value + '  ' + MCCS.hex(req));
    $('#mccs-rw-chip').className = 'chip warn';
    $('#mccs-rw-chip').textContent = '写入中…';
    mccsFetch(mccsBaseUrl(), '/api/vcp', { method: 'POST', body: { monitor: idx, code: code, value: value } }, 30000)
      .then(function (r) {
        if (!r || !r.ok) {
          $('#mccs-rw-chip').className = 'chip err';
          $('#mccs-rw-chip').textContent = '写入失败';
          mccsLog('ERR', (r && r.error ? r.error : '写入失败') + (r && r.hint ? '  → ' + r.hint : ''));
          mccsShowError(r, code, '写');
          return;
        }
        $('#mccs-rw-chip').className = 'chip ok';
        $('#mccs-rw-chip').textContent = '已写入 ' + value;
        mccsLog('RX', 'SET  vcp=' + MCCS.vcpText(code) + ' value=' + value + ' → 成功');
        mccsShowWrite(code, value, req);
      });
  }

  function mccsSaveSettings() {
    if (!mccsCheckConnected()) return;
    var idx = mccsMonitorIndex();
    var req = MCCS.buildSaveSettings();
    mccsLog('TX', 'SAVE monitor=' + idx + '（MCCS 0x0C 保存当前设置到 NVRAM）  ' + MCCS.hex(req));
    mccsFetch(mccsBaseUrl(), '/api/save', { method: 'POST', body: { monitor: idx } }, 30000).then(function (r) {
      if (!r || !r.ok) {
        mccsLog('ERR', (r && r.error ? r.error : '保存失败') + (r && r.hint ? '  → ' + r.hint : ''));
        $('#mccs-result').innerHTML = '<div class="notice err">保存设置失败：' + esc(r && r.error ? r.error : '') +
          (r && r.hint ? '<br>' + esc(r.hint) : '') + '</div>';
        return;
      }
      mccsLog('RX', 'SAVE → 成功');
      $('#mccs-result').innerHTML = '<div class="notice ok">已发送「保存当前设置」（MCCS 操作码 0x0C），' +
        '显示器会把当前各项设置写入自己的 NVRAM。</div>' +
        '<p class="hint">对应报文：<code>' + MCCS.hex(req) + '</code>；等价命令：<code>ddcutil scs</code></p>';
    });
  }

  function mccsScan() {
    if (!mccsCheckConnected()) return;
    var idx = mccsMonitorIndex();
    mccsLog('TX', 'SCAN monitor=' + idx + '（依次读取常用 VCP 码）');
    $('#mccs-result').innerHTML = '<div class="notice">正在扫描常用 VCP 码，DDC/CI 每次读写约 40–150 ms，请稍候…</div>';
    mccsFetch(mccsBaseUrl(), '/api/scan?monitor=' + idx, null, 120000).then(function (r) {
      if (!r || !r.ok) {
        $('#mccs-result').innerHTML = '<div class="notice err">扫描失败：' + esc(r && r.error ? r.error : '') + '</div>';
        mccsLog('ERR', '扫描失败：' + (r && r.error ? r.error : ''));
        return;
      }
      var okCount = r.results.filter(function (x) { return x.ok; }).length;
      mccsLog('RX', 'SCAN 完成：' + okCount + ' / ' + r.count + ' 个码有响应');
      var rows = r.results.map(function (x) {
        var e = MCCS.vcp(x.code);
        return [
          '<a href="#" class="mono" data-mccs-pick="' + x.code + '">' + MCCS.vcpText(x.code) + '</a>',
          e ? esc(e.zh) : '<span class="muted">未收录</span>',
          x.ok ? '<span class="mono">' + x.current + '</span>' : '<span class="muted">—</span>',
          x.ok ? '<span class="mono">' + (x.max === null || x.max === undefined ? '—' : x.max) : '',
          x.ok ? esc(MCCS.formatValue(x.code, x.current, mccs.capValues[x.code])) :
            '<span class="chip err">无响应</span>'
        ];
      });
      $('#mccs-result').innerHTML = '<div class="notice ok">扫描完成：' + okCount + ' / ' + r.count +
        ' 个码有响应（点击码值可载入上方读写框）。</div>' +
        mccsTable(['VCP', '名称', '当前值', '最大值', '含义'], rows);
    });
  }

  function mccsShowError(r, code, verb) {
    var msg = (r && r.error) ? r.error : (verb + '失败');
    $('#mccs-result').innerHTML = '<div class="notice err"><b>' + esc(verb + ' ' + MCCS.vcpText(code) + ' 失败') + '</b><br>' +
      esc(msg) + (r && r.hint ? '<br><b>原因提示：</b>' + esc(r.hint) : '') +
      '<br><span class="small">常见原因：显示器未开启 DDC/CI、该 VCP 码不被支持、中间接了 KVM / 转接器、' +
      '或在虚拟显示器上操作。</span></div>';
  }

  function mccsShowRead(r, code, req) {
    var e = MCCS.vcp(code);
    var rows = [
      ['显示器', '#' + r.monitor + (r.description ? '（' + r.description + '）' : '')],
      ['VCP 码', MCCS.vcpText(code) + (e ? '　' + e.zh : ''), 'mono'],
      ['类型', e ? MCCS.typeText(e.t) : (r.vcpType === 1 || r.vcpType === 0 ?
        '由系统 API 报告（vcpType=' + r.vcpType + '）' : '未知')],
      ['当前值', String(r.current), 'mono'],
      ['最大值', String(r.max), 'mono'],
      ['取值含义', MCCS.formatValue(code, r.current, mccs.capValues[code])],
      ['能力字符串', mccs.capCodes[code] ? '该显示器声明支持此码' : '未读取能力字符串，或该码未在 capabilities 中声明']
    ];
    var html = mccsKv(rows);
    html += '<p class="hint" style="margin-top:10px">本页会发出的请求报文（实际收发由桥接完成）：</p>' +
      mccsPre(MCCS.hex(req));
    html += '<p class="hint">等价命令行：</p>' +
      mccsPre('ddcutil --display ' + (r.monitor + 1) + ' getvcp ' + MCCS.vcpText(code) + '\n' +
        MCCS.toCurl('get', { monitor: r.monitor, code: code, base: mccsBaseUrl() || location.origin }));
    html += '<div class="btn-row" style="margin-top:10px">' +
      '<button class="sm ghost" data-mccs-copy="' + esc(MCCS.toDdcutil('get', { monitor: r.monitor, code: code })) + '">复制 ddcutil 命令</button>' +
      '<button class="sm ghost" data-mccs-goto="write">把当前值填到写入框</button></div>';
    $('#mccs-result').innerHTML = html;
  }

  function mccsShowWrite(code, value, req) {
    var html = mccsKv([
      ['结果', '写入成功（显示器未报错；多数型号写入成功时不回包）'],
      ['VCP 码', MCCS.vcpText(code) + ' → ' + value, 'mono'],
      ['取值含义', MCCS.formatValue(code, value, mccs.capValues[code])]
    ]);
    html += '<p class="hint" style="margin-top:10px">本页发出的请求报文：</p>' + mccsPre(MCCS.hex(req));
    html += '<p class="hint">接着点一次「读取」即可回读确认；写入的是临时值，要断电保留需要「保存设置」。</p>';
    $('#mccs-result').innerHTML = html;
  }

  /* ---------------------------------------------------------- 报文构建器 */

  /* 返回用户显式选择的码宽；'auto' 返回 undefined，交给 MCCS.normWide() 按码值决定 */
  function mccsWide() {
    if (!$('#mccs-wide')) return undefined;
    var v = $('#mccs-wide').value;
    if (v === 'auto' || v === '') return undefined;
    var n = parseInt(v, 10);
    return (n === 1 || n === 2 || n === 3) ? n : undefined;
  }

  function mccsBuild() {
    var kind = $('#mccs-kind') ? $('#mccs-kind').value : 'set';
    var wide = mccsWide();
    var code = mccsParseCodeInput($('#mccs-bcode') ? $('#mccs-bcode').value : '');
    if (code === null) code = 0x10;
    var value = parseInt($('#mccs-bvalue') ? $('#mccs-bvalue').value : '0', 10);
    if (isNaN(value)) value = 0;
    var op = mccsParseCodeInput($('#mccs-bop') ? $('#mccs-bop').value : '1');
    if (op === null) op = 0x01;
    var payload = MCCS.bytes($('#mccs-bpayload') ? $('#mccs-bpayload').value : '');

    $('#mccs-rawrow').style.display = (kind === 'raw') ? '' : 'none';

    var bytes;
    if (kind === 'get') bytes = MCCS.buildGetVCP({ code: code, wide: wide });
    else if (kind === 'set') bytes = MCCS.buildSetVCP({ code: code, value: value, wide: wide });
    else if (kind === 'save') bytes = MCCS.buildSaveSettings();
    else if (kind === 'reset') bytes = MCCS.buildVcpReset({ code: code, wide: wide });
    else if (kind === 'cap') bytes = MCCS.buildGetCapabilities({ offset: 0 });
    else bytes = MCCS.buildRaw({ opcode: op, payload: payload });

    /* 实际生效的码宽（'auto' 时按码值推算），用于告警文案 */
    var useWide = MCCS.normWide(wide, code);
    var isVcpKind = (kind === 'get' || kind === 'set' || kind === 'reset');
    var warn = [];
    if (isVcpKind && code > 0xFFFF && useWide < 3) warn.push('VCP 码超过 16 位（0x' + MCCS.hex6(code) +
      '），按 ' + useWide + ' 字节发送会被截断——该码需要选 3 字节宽度。');
    if (isVcpKind && code > 0xFF && useWide < 3) warn.push('VCP 码 0x' + MCCS.hex6(code) +
      ' 超过 1 字节：Windows 桥接（dxva2）的 VCP 码参数是单字节，无法寻址该码，只能配合 ddcutil 使用。');
    if (kind === 'cap') warn.push('读取能力字符串时该 2 字节字段是「偏移量」，不是 VCP 码宽度。');
    if (kind === 'set' && value > 0xFFFF) warn.push('数值超过 16 位，将被截断。');

    var rows = MCCS.describe(bytes).map(function (r) {
      return ['<span class="mono">' + MCCS.hex2(r.value) + '</span>', esc(r.field), esc(r.note)];
    });
    var html = '';
    if (warn.length) {
      html += '<div class="notice warn">' + warn.map(esc).join('<br>') + '</div>';
    }
    html += mccsKv([
      ['报文', MCCS.hex(bytes), 'mono'],
      ['长度字段', '0x' + MCCS.hex2(bytes[1]) + '（低 7 位 = ' + (bytes[1] & 0x7F) + ' 个数据字节，不含校验和）', 'mono'],
      ['校验和', '0x' + MCCS.hex2(bytes[bytes.length - 1]) + '　= 0x6E ⊕ 前面所有字节', 'mono'],
      ['用途', mccsKindText(kind)]
    ]);
    html += '<p class="hint" style="margin-top:10px">逐字节解释：</p>' +
      mccsTable(['字节', '字段', '说明'], rows);

    var cmds = [];
    if (kind === 'get' || kind === 'set' || kind === 'save' || kind === 'cap') {
      cmds.push(MCCS.toDdcutil(kind, { monitor: mccsMonitorIndex(), code: code, value: value }));
      cmds.push(MCCS.toBridgeScript(kind, { monitor: mccsMonitorIndex(), code: code, value: value }));
      cmds.push(MCCS.toCurl(kind, { monitor: mccsMonitorIndex(), code: code, value: value, base: mccsBaseUrl() }));
    }
    cmds.push(MCCS.toI2cTransfer(bytes, 4, 11));
    html += '<p class="hint" style="margin-top:12px">等价命令行（可直接复制到终端执行）：</p>' +
      mccsPre(cmds.join('\n'));
    $('#mccs-bout').innerHTML = html;
  }

  function mccsKindText(kind) {
    if (kind === 'get') return '读取一个 VCP 特性的当前值与最大值（Get VCP Feature）';
    if (kind === 'set') return '写入一个 VCP 特性的值（Set VCP Feature）';
    if (kind === 'save') return '让显示器把当前设置保存到 NVRAM（Save Current Settings）';
    if (kind === 'reset') return '把某个 VCP 特性复位为默认值（VCP Reset）';
    if (kind === 'cap') return '读取显示器的 capabilities 能力字符串（分片读取，偏移 0）';
    return '自定义操作码 + 载荷（调试用）';
  }

  /* ---------------------------------------------------------- 能力字符串 */

  function mccsCapRead() {
    if (!mccsCheckConnected()) return;
    var idx = mccsMonitorIndex();
    mccsLog('TX', 'CAP  monitor=' + idx + '（读取能力字符串）');
    $('#mccs-cap-chip').className = 'chip warn';
    $('#mccs-cap-chip').textContent = '读取中…';
    mccsFetch(mccsBaseUrl(), '/api/capabilities?monitor=' + idx, null, 60000).then(function (r) {
      if (!r || !r.ok) {
        $('#mccs-cap-chip').className = 'chip err';
        $('#mccs-cap-chip').textContent = '读取失败';
        mccsLog('ERR', 'CAP 失败：' + (r && r.error ? r.error : '') + (r && r.hint ? ' → ' + r.hint : ''));
        $('#mccs-cap-out').innerHTML = '<div class="notice err"><b>读取能力字符串失败</b><br>' +
          esc(r && r.error ? r.error : '') + (r && r.hint ? '<br><b>原因提示：</b>' + esc(r.hint) : '') +
          '<br><span class="small">部分显示器（或虚拟 / 转接的显示通道）不实现该功能，这时无法读取。' +
          '可以改用 ddcutil capabilities，或从 SoftMCCS 里复制字符串粘贴到上面的文本框解析。</span></div>';
        return;
      }
      $('#mccs-cap-text').value = r.text || '';
      mccsLog('RX', 'CAP  读到 ' + String(r.text || '').length + ' 字符');
      $('#mccs-cap-chip').className = 'chip ok';
      $('#mccs-cap-chip').textContent = String(r.text || '').length + ' 字符';
      mccsCapParse(r.text, r.format);
    });
  }

  function mccsCapParse(text, format) {
    text = (text === undefined) ? $('#mccs-cap-text').value : text;
    if (!text || !String(text).trim()) {
      $('#mccs-cap-out').innerHTML = '<div class="notice warn">还没有能力字符串：请先「从显示器读取」，或把字符串粘贴到上面的文本框后点「解析」。</div>';
      return;
    }
    if (format === 'ddcutil' || /^\s*Model:/im.test(text)) {
      /* ddcutil 的 capabilities 输出已经是人类可读文本，直接展示，不做结构化解析 */
      $('#mccs-cap-out').innerHTML = '<div class="notice">这是 ddcutil 的解析后输出（不是原始能力字符串），按原样展示：</div>' +
        mccsPre(text);
      return;
    }
    var cap = MCCS.parseCapabilities(text);
    mccs.cap = cap;
    mccs.capText = text;
    mccsBuildCapValues();
    mccsFillCodeSelect($('#mccs-filter').value);
    mccsCodeChanged();

    var meta = [
      ['设备类型 prot/type', (cap.prot || '—') + ' / ' + (cap.type || '—')],
      ['型号 model', cap.model || '—'],
      ['MCCS 版本', cap.mccsVer || '—'],
      ['支持的命令', cap.cmds.length ? cap.cmds.map(function (c) {
        return '0x' + MCCS.hex2(c);
      }).join(' ') : '—'],
      ['其它键', Object.keys(cap.keys).length ? Object.keys(cap.keys).map(function (k) {
        return k + '(' + cap.keys[k].trim() + ')';
      }).join(' ') : '—']
    ];
    if (cap.mswhql) meta.push(['mswhql', cap.mswhql]);
    if (cap.assetEep) meta.push(['asset_eep', cap.assetEep]);

    var rows = cap.vcp.map(function (f) {
      var e = MCCS.vcp(f.code);
      var vals = f.values && f.values.length ? f.values.map(function (v) {
        return esc(MCCS.formatValue(f.code, v));
      }).join('、') : (f.groups && f.groups.length > 1 ? '<span class="muted">复合非连续量（分组取值）</span>' : '<span class="muted">连续量 / 未列出取值</span>');
      return [
        '<a href="#" class="mono" data-mccs-pick="' + f.code + '">' + MCCS.vcpText(f.code) + '</a>',
        e ? esc(e.zh) : '<span class="muted">未收录（厂商自定义）</span>',
        e ? MCCS.typeText(e.t) : '—',
        e ? MCCS.rwText(e.rw) : '—',
        vals
      ];
    });

    $('#mccs-cap-out').innerHTML =
      '<div class="notice ok">能力字符串解析结果：共声明 <b>' + cap.count + '</b> 个 VCP 特性。</div>' +
      mccsKv(meta) +
      '<p class="hint" style="margin-top:12px">显示器声明的 VCP 特性（点击码值可载入上方读写框）：</p>' +
      mccsTable(['VCP', '名称', '类型', '读写', '取值'], rows) +
      '<p class="hint">原始字符串：</p>' + mccsPre(text);
    mccsLog('INFO', 'CAP 解析：' + cap.count + ' 个特性，型号 ' + (cap.model || '—') +
      '，MCCS ' + (cap.mccsVer || '—'));
  }

  /* ---------------------------------------------------------- 参考表 */

  function mccsRenderRef() {
    var f = (mccs.refFilter || '').trim().toLowerCase();
    var rows = [];
    (window.MCCSData ? window.MCCSData.VCP : []).forEach(function (e) {
      var text = (MCCS.vcpText(e.c) + ' ' + e.zh + ' ' + e.en + ' ' + e.g + ' ' + (e.n || '')).toLowerCase();
      if (f && text.indexOf(f) < 0) return;
      var vals = e.v ? Object.keys(e.v).map(function (k) {
        return esc(MCCS.formatValue(e.c, parseInt(k, 10)));
      }).join('、') : '';
      rows.push([
        '<a href="#" class="mono" data-mccs-pick="' + e.c + '">' + MCCS.vcpText(e.c) + '</a>',
        esc(e.zh), esc(e.en), MCCS.typeText(e.t), MCCS.rwText(e.rw), esc(e.g),
        vals || (e.n ? esc(e.n) : '')
      ]);
    });
    $('#mccs-ref').innerHTML = mccsTable(['VCP', '名称', '英文名', '类型', '读写', '分组', '取值 / 备注'], rows);
    if ($('#mccs-ref-chip')) {
      var all = window.MCCSData ? window.MCCSData.VCP.length : 0;
      $('#mccs-ref-chip').textContent = rows.length + ' / ' + all + ' 条';
    }
  }

  /* ---------------------------------------------------------- 初始化 */

  function mccsSave() {
    try { localStorage.setItem(MCCS_LS, JSON.stringify({ base: mccs.base, monitor: mccs.monitor })); } catch (e) { /* ignore */ }
  }

  function initMCCS() {
    try {
      var saved = JSON.parse(localStorage.getItem(MCCS_LS) || '{}');
      if (saved.base) mccs.base = saved.base;
      if (typeof saved.monitor === 'number') mccs.monitor = saved.monitor;
    } catch (e) { /* ignore */ }

    $('#mccs-base').value = mccs.base;
    $('#mccs-value').max = '65535';
    mccsFillCodeSelect('');
    $('#mccs-code').value = '10';
    mccsRenderRef();
    mccsRenderLog();
    mccsCodeChanged();
    mccsBuild();

    $('#mccs-connect').addEventListener('click', mccsConnect);
    $('#mccs-monitor').addEventListener('change', function () {
      mccs.monitor = mccsMonitorIndex();
      mccsSave();
    });
    $('#mccs-base').addEventListener('change', function () {
      mccs.base = mccsBaseUrl();
      mccsSave();
    });
    $('#mccs-filter').addEventListener('input', function () { mccsFillCodeSelect(this.value); });
    $('#mccs-code').addEventListener('change', mccsCodeChanged);
    $('#mccs-ncv').addEventListener('change', function () {
      if (this.value !== '') $('#mccs-value').value = this.value;
    });
    $('#mccs-get').addEventListener('click', mccsGet);
    $('#mccs-set').addEventListener('click', mccsSet);
    $('#mccs-scan').addEventListener('click', mccsScan);
    $('#mccs-save').addEventListener('click', mccsSaveSettings);

    ['mccs-kind', 'mccs-wide', 'mccs-bcode', 'mccs-bvalue', 'mccs-bop', 'mccs-bpayload'].forEach(function (id) {
      $('#' + id).addEventListener('input', mccsBuild);
      $('#' + id).addEventListener('change', mccsBuild);
    });
    $('#mccs-bcopy').addEventListener('click', function () {
      var kind = $('#mccs-kind').value;
      var code = mccsParseCodeInput($('#mccs-bcode').value) || 0;
      var value = parseInt($('#mccs-bvalue').value, 10) || 0;
      var wide = mccsWide();
      var b = MCCS.build(kind, {
        code: code, value: value, wide: wide,
        opcode: mccsParseCodeInput($('#mccs-bop').value) || 1,
        payload: MCCS.bytes($('#mccs-bpayload').value)
      });
      mccsCopy(MCCS.hex(b), '报文');
    });
    $('#mccs-bsync').addEventListener('click', function () {
      $('#mccs-bcode').value = MCCS.vcpText(mccsCurrentCode()).replace(/^0x/, '');
      $('#mccs-bvalue').value = $('#mccs-value').value;
      mccsBuild();
    });

    $('#mccs-copycmd').addEventListener('click', function () { mccsCopy('node ddc-bridge.js', '启动命令'); });

    $('#mccs-cap-read').addEventListener('click', mccsCapRead);
    $('#mccs-cap-parse').addEventListener('click', function () { mccsCapParse(); });
    $('#mccs-cap-sample').addEventListener('click', function () {
      $('#mccs-cap-text').value = MCCS_SAMPLE_CAP;
      mccsCapParse();
      toast('已填入样例', '这是一台真实显示器的能力字符串', 'ok');
    });

    $('#mccs-ref-filter').addEventListener('input', function () {
      mccs.refFilter = this.value;
      mccsRenderRef();
    });

    $('#mccs-log-copy').addEventListener('click', function () {
      if (!mccs.log.length) { toast('日志为空', '', 'warn'); return; }
      mccsCopy(mccs.logText(), '命令日志');
    });
    $('#mccs-log-save').addEventListener('click', function () {
      mccsDownload('ddcci-log.txt', mccsLogText());
    });
    $('#mccs-log-clear').addEventListener('click', function () {
      mccs.log = [];
      mccsRenderLog();
    });

    /* 结果区内的按钮与链接（事件委托） */
    $('#mccs-result').addEventListener('click', function (ev) {
      var el = ev.target.closest ? ev.target.closest('[data-mccs-pick],[data-mccs-copy],[data-mccs-goto]') : null;
      if (!el) return;
      ev.preventDefault();
      if (el.hasAttribute('data-mccs-pick')) {
        var code = parseInt(el.getAttribute('data-mccs-pick'), 10);
        $('#mccs-code').value = MCCS.vcpText(code);
        mccsCodeChanged();
        $('#mccs-filter').value = '';
        mccsFillCodeSelect('');
        $('#mccs-code').value = MCCS.vcpText(code);
        window.scrollTo({ top: $('#panel-mccs').offsetTop, behavior: 'smooth' });
      } else if (el.hasAttribute('data-mccs-copy')) {
        mccsCopy(el.getAttribute('data-mccs-copy'), '命令');
      } else if (el.getAttribute('data-mccs-goto') === 'write') {
        if (mccs.last && typeof mccs.last.current === 'number') {
          $('#mccs-value').value = mccs.last.current;
          toast('已填入当前值', String(mccs.last.current), 'ok');
        }
      }
    });
    $('#mccs-cap-out').addEventListener('click', function (ev) {
      var el = ev.target.closest ? ev.target.closest('[data-mccs-pick]') : null;
      if (!el) return;
      ev.preventDefault();
      var code = parseInt(el.getAttribute('data-mccs-pick'), 10);
      $('#mccs-filter').value = '';
      mccsFillCodeSelect('');
      $('#mccs-code').value = MCCS.vcpText(code);
      mccsCodeChanged();
      toast('已载入 VCP 码', MCCS.vcpText(code), 'ok');
    });
    $('#mccs-ref').addEventListener('click', function (ev) {
      var el = ev.target.closest ? ev.target.closest('[data-mccs-pick]') : null;
      if (!el) return;
      ev.preventDefault();
      var code = parseInt(el.getAttribute('data-mccs-pick'), 10);
      $('#mccs-filter').value = '';
      mccsFillCodeSelect('');
      $('#mccs-code').value = MCCS.vcpText(code);
      mccsCodeChanged();
    });

    /* 切到本标签页时，如果还没连接就自动探测一次 */
    var tabBtn = $('nav.tabs button[data-tab="mccs"]');
    if (tabBtn) {
      tabBtn.addEventListener('click', function () {
        if (!mccs.connected) mccsConnect();
      });
    }

    if (mccsOnLocalhost()) {
      /* 页面本身就是桥接托管的：直接自动连接 */
      mccsConnect();
    } else {
      mccsSetChip('未连接', '');
      $('#mccs-bridge-status').innerHTML = '未连接。点「检测连接」尝试连接本机桥接；' +
        '若页面不是由桥接托管，请确认桥接地址（默认 <code>http://127.0.0.1:8760</code>）已启动。';
    }
  }

  function mccsLogText() {
    var pad = function (n) { return ('0' + n).slice(-2); };
    return mccs.log.slice().reverse().map(function (e) {
      var d = e.t;
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' +
        pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()) + '  [' + e.kind + '] ' + e.text;
    }).join('\n');
  }

  function init() {
    var draft = load();
    if (draft) {
      state.tab = draft.tab || 'decoder';
      state.theme = draft.theme || state.theme;
      if (draft.decHex) { state.dec.hex = draft.decHex; $('#dec-hex').value = draft.decHex; updateSizeChip(draft.decHex, $('#dec-size')); }
      if (draft.valHex) { state.val.hex = draft.valHex; $('#val-hex').value = draft.valHex; updateSizeChip(draft.valHex, $('#val-size')); }
      if (draft.model && draft.model.descriptors) state.enc.model = draft.model;
      if (draft.tm) state.tm = Object.assign(state.tm, draft.tm);
      if (state.dec.hex) {
        var b = bytesFromText(state.dec.hex);
        if (b) decRender(b, '草稿');
      }
      if (state.val.hex) valRun();
    } else {
      var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      state.theme = prefersDark ? 'dark' : 'light';
      /* First run: show something useful straight away. */
      decSetBytes(E.encode(E.defaultModel()).bytes, '默认示例');
    }

    setTheme(state.theme);
    switchTab(state.tab);
    initDecoder();
    initEncoder();
    initValidator();
    initTiming();
    initVTC();
    initGamma();
    initMCCS();

    $$('nav.tabs button').forEach(function (b) {
      b.addEventListener('click', function () { switchTab(b.getAttribute('data-tab')); });
    });
    $('#theme-toggle').addEventListener('click', function () {
      setTheme(state.theme === 'dark' ? 'light' : 'dark');
    });
    $('#modal-close').addEventListener('click', closeModal);
    $('#modal').addEventListener('click', function (e) { if (e.target === $('#modal')) closeModal(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeModal();
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (state.tab === 'decoder') decRun();
        else if (state.tab === 'validator') valRun();
        else if (state.tab === 'timing') tmRender();
      }
    });

    /* Delegated actions in rendered reports. */
    document.addEventListener('click', function (e) {
      if (modalPicker && e.target.closest && e.target.closest('#modal-body')) {
        if (modalPicker(e.target)) { modalPicker = null; return; }
      }
      var copy = e.target.closest('[data-copy]');
      if (copy) { copyText(copy.getAttribute('data-copy')); return; }
      var page = e.target.closest('[data-hexpage]');
      if (page) {
        var next = parseInt(page.getAttribute('data-hexpage'), 10);
        if (isNaN(next)) return;
        if (page.closest('#dec-out')) { state.dec.page = next; decRender(state.dec.bytes, ''); }
        else if (page.closest('#enc-hexwrap')) { state.enc.page = next; encReencodeOnly(); }
        return;
      }
      var goto = e.target.closest('[data-goto]');
      if (goto) { e.preventDefault(); switchTab(goto.getAttribute('data-goto')); return; }
      if (e.target.id === 'modal-ok') closeModal();
    });

    $('#about-reset').addEventListener('click', function () {
      try { localStorage.removeItem(LS_KEY); } catch (err) { /* ignore */ }
      toast('已清除', '本地草稿与偏好已删除，刷新后回到初始状态', 'ok');
    });
    $('#about-print').addEventListener('click', function () { printPanel('about'); });

    if (!navigator.clipboard || !window.isSecureContext) {
      /* file:// pages may not expose the async clipboard API — the fallback
         handles it, but tell the user why a permission prompt may appear. */
      void 0;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
