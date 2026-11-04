/* ==========================================================================
   X-MACRO-LAB — edid-toolkit-ui.js
   EDID 工具箱的界面层：字节网格编辑器、字段说明、新建向导、模板库。
   只碰 DOM，不含字节拼装逻辑（那部分在 edid-toolkit.js）。

   零依赖（classic script）。
   ========================================================================== */
(function (global) {
  'use strict';

  var C = global.EDIDCore;
  var T = global.EDIDToolkit;

  var state = {
    bytes: null,          /* Uint8Array */
    selected: 0,          /* 当前选中的字节偏移 */
    nibbleHigh: true,     /* 键盘编辑：下一次输入写高半字节 */
    sourceName: ''
  };

  /* ======================================================================
     一、字节网格编辑器
     ====================================================================== */

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function hex2(v) { return ('0' + (v & 0xFF).toString(16).toUpperCase()).slice(-2); }

  /* ASCII 栏：只有可打印字符（0x20-0x7E）显示原字符，其余一律 '.'
     —— 与 hexdump 的通行做法一致，也能保证 16 列等宽不错位。 */
  function asciiChar(v) {
    if (v >= 32 && v <= 126) {
      return String.fromCharCode(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    return '.';
  }

  /* 分区对应的 CSS class（与 edid-toolkit.js 的 region key 对应） */
  var REGION_CLASS = {
    header: 'tk-r-header',
    manufacturer: 'tk-r-vendor',
    made: 'tk-r-made',
    'basic-display': 'tk-r-display',
    chromaticity: 'tk-r-chroma',
    established: 'tk-r-established',
    standard: 'tk-r-standard',
    detailed: 'tk-r-detailed',
    'ext-count': 'tk-r-extcount',
    checksum: 'tk-r-checksum',
    'ext-header': 'tk-r-extheader',
    'ext-datablocks': 'tk-r-extdata',
    'ext-checksum': 'tk-r-checksum',
    'did-header': 'tk-r-extheader',
    'did-datablocks': 'tk-r-extdata'
  };

  function regionClass(info) {
    if (!info.region) return '';
    return REGION_CLASS[info.region.key] || '';
  }

  /* 渲染整个网格 */
  function renderGrid() {
    var host = document.getElementById('tk-grid');
    if (!host) return;
    var b = state.bytes;
    if (!b) { host.innerHTML = '<p class="muted">尚未载入 EDID 数据。</p>'; return; }

    var rows = [];
    for (var i = 0; i < b.length; i += 16) {
      var bytes = [];
      var ascii = [];
      for (var j = 0; j < 16; j++) {
        var off = i + j;
        if (off >= b.length) { bytes.push('<span class="tk-cell tk-pad"></span>'); ascii.push('<span class="tk-cell tk-pad"></span>'); continue; }
        var info = T.regionAt(b, off);
        var cls = 'tk-cell ' + regionClass(info) + (off === state.selected ? ' tk-sel' : '');
        bytes.push('<span class="' + cls + '" data-off="' + off + '">' + hex2(b[off]) + '</span>');
        ascii.push('<span class="' + cls + ' tk-ascii" data-off="' + off + '">' + asciiChar(b[off]) + '</span>');
      }
      rows.push(
        '<div class="tk-row">' +
        '<span class="tk-addr">0x' + ('0000' + i.toString(16).toUpperCase()).slice(-4) + '</span>' +
        '<span class="tk-bytes">' + bytes.slice(0, 8).join('') + '</span>' +
        '<span class="tk-bytes">' + bytes.slice(8).join('') + '</span>' +
        '<span class="tk-asciis">' + ascii.join('') + '</span>' +
        '</div>'
      );
    }
    host.innerHTML = rows.join('');
  }

  /* 选中某个字节并更新右侧说明 */
  function select(off) {
    if (!state.bytes) return;
    state.selected = Math.max(0, Math.min(state.bytes.length - 1, off));
    state.nibbleHigh = true;
    renderGrid();
    renderFieldPanel();
    var cell = document.querySelector('#tk-grid .tk-cell[data-off="' + state.selected + '"]');
    if (cell && cell.scrollIntoView) {
      cell.scrollIntoView({ block: 'nearest' });
    }
  }

  /* 右侧字段说明：把选中字节拆到位域逐项解释 */
  function renderFieldPanel() {
    var host = document.getElementById('tk-field');
    if (!host) return;
    var b = state.bytes;
    if (!b) { host.innerHTML = '<p class="muted">选择一个字节查看含义。</p>'; return; }

    var off = state.selected;
    var v = b[off];
    var info = T.regionAt(b, off);
    var rows = [];

    rows.push('<div class="tk-selbox">' +
      '<span class="tk-seladdr">0x' + ('00' + off.toString(16).toUpperCase()).slice(-2) + '</span>' +
      '<span class="tk-selval">' + hex2(v) + '</span>' +
      '<span class="tk-selsub">' + esc(info.label) + '</span>' +
      '</div>');

    if (info.desc) rows.push('<p class="tk-desc">' + esc(info.desc) + '</p>');

    /* 位域解释 */
    var bits = bitFieldsFor(b, off);
    if (bits.length) {
      rows.push('<table class="tk-bits"><thead><tr><th>位</th><th>值</th><th>含义</th></tr></thead><tbody>' +
        bits.map(function (x) {
          return '<tr><td class="mono nowrap">' + x.range + '</td><td class="mono">' +
            esc(x.value) + '</td><td>' + esc(x.label) + '</td></tr>';
        }).join('') + '</tbody></table>');
    }

    /* 描述符 / DTD 的特殊说明 */
    var extra = '';
    if (off >= 54 && off <= 125 && (off - 54) % 18 === 0) {
      var d = T.readDescriptor(b, off);
      if (d.typeByte === 0xFD) {
        extra = '<dl class="kv sm"><dt>垂直刷新</dt><dd>' + d.minVRate + '–' + d.maxVRate + ' Hz</dd>' +
          '<dt>水平刷新</dt><dd>' + d.minHRate + '–' + d.maxHRate + ' kHz</dd>' +
          '<dt>最大像素时钟</dt><dd>' + d.maxPixelClock + ' MHz</dd></dl>';
      } else if (d.text !== undefined) {
        extra = '<dl class="kv sm"><dt>类型</dt><dd>' + esc(d.name) + '</dd>' +
          '<dt>文本</dt><dd class="mono">' + esc(d.text || '（空）') + '</dd></dl>';
      }
    }
    if (extra) rows.push(extra);

    host.innerHTML = rows.join('');
  }

  /* 常见字节的位域解释 */
  function bitFieldsFor(b, off) {
    var out = [];
    var v = b[off];
    var inBase = off < 128;

    function add(range, value, label) { out.push({ range: range, value: value, label: label }); }

    if (inBase && off === 20) {
      add('bit7', (v >> 7) & 1, (v >> 7) & 1 ? '数字输入' : '模拟输入');
      add('bits6-4', (v >> 4) & 7, ['', '6bpc', '8bpc', '10bpc', '12bpc', '14bpc', '16bpc'][(v >> 4) & 7]);
      add('bit3', (v >> 3) & 1, (v >> 3) & 1 ? 'YCbCr 4:2:0' : 'RGB 4:4:4');
      add('bits2-0', v & 7, ['未定义', 'DVI', 'HDMI-a', 'HDMI-b', 'MDDI', 'DisplayPort'][v & 7] || '未知');
    } else if (inBase && off === 24) {
      add('bit7', (v >> 7) & 1, (v >> 7) & 1 ? '支持 Standby' : '不支持 Standby');
      add('bit6', (v >> 6) & 1, (v >> 6) & 1 ? '支持 Suspend' : '不支持 Suspend');
      add('bit5', (v >> 5) & 1, (v >> 5) & 1 ? '支持 Low Power' : '不支持 Low Power');
      add('bits4-3', (v >> 3) & 3, ['单色', 'RGB', '非 RGB', '未定义'][(v >> 3) & 3]);
      add('bit2', (v >> 2) & 1, (v >> 2) & 1 ? 'sRGB 默认色彩空间' : '非 sRGB');
      add('bit1', (v >> 1) & 1, (v >> 1) & 1 ? '首选时序为详细时序' : '无首选时序');
      add('bit0', v & 1, (v & 1) ? '支持 GTF/CVT' : '不支持 GTF/CVT');
    } else if (inBase && off === 16) {
      add('全字节', v, '制造周（1–54，0xFF 表示按型号年）');
    } else if (inBase && off === 17) {
      add('全字节', v, '制造年 = 1990 + ' + v);
    } else if (inBase && off === 23) {
      add('全字节', v, 'Gamma = ' + ((v + 100) / 100).toFixed(2));
    } else if (inBase && off === 126) {
      add('全字节', v, '扩展块数量（总块数 = ' + (v + 1) + '）');
    } else if (inBase && off === 127) {
      add('全字节', v, '基础块校验和');
    } else if (off >= 128 && (off - 128) % 128 === 0) {
      add('全字节', v, '扩展块标签 0x' + hex2(v) +
        ({ 2: '（CTA-861.3）', 0x70: '（DisplayID）', 0x03: '（VTB-EXT）', 0x04: '（DTCDB）' }[v] || '（未识别）'));
    } else if (off >= 128 && (off - 128) % 128 === 127) {
      add('全字节', v, '扩展块校验和');
    } else if (inBase && off >= 35 && off <= 37) {
      var byteIndex = off - 35;
      T.ESTABLISHED.filter(function (e) { return e[0] === byteIndex; })
        .forEach(function (e) {
          add('bit' + e[1], (v >> e[1]) & 1, e[2]);
        });
    }
    return out;
  }

  /* 键盘编辑：直接键入十六进制改写当前字节 */
  function onGridKey(e) {
    if (!state.bytes) return;
    var off = state.selected;
    var key = e.key;

    /* 注意：不能用 key >= '0' && key <= '9' 这种字符串范围判断——
       JS 的字符串比较只逐位比前缀，'ArrowRight' <= 'F' 为 true，
       方向键会被误判成十六进制字符。正则才是可靠的。 */
    if (/^[0-9a-fA-F]$/.test(key)) {
      var nib = parseInt(key, 16);
      var cur = state.bytes[off];
      var next;
      if (state.nibbleHigh) {
        next = (nib << 4) | (cur & 0x0F);
        state.nibbleHigh = false;             /* 下一次输入写低半字节 */
      } else {
        next = (cur & 0xF0) | nib;
        state.nibbleHigh = true;
        T.setByte(state.bytes, off, next);
        if (off + 1 < state.bytes.length) select(off + 1); else { renderGrid(); renderFieldPanel(); }
        updateStatus();
        e.preventDefault();
        return;
      }
      /* 只改了高半字节：先预览，等低半字节 */
      state.bytes[off] = next;
      renderGrid();
      renderFieldPanel();
      e.preventDefault();
      return;
    }

    if (key === 'ArrowRight') { select(off + 1); e.preventDefault(); return; }
    if (key === 'ArrowLeft') { select(off - 1); e.preventDefault(); return; }
    if (key === 'ArrowDown') { select(off + 16); e.preventDefault(); return; }
    if (key === 'ArrowUp') { select(off - 16); e.preventDefault(); return; }
    if (key === 'Home') { select(off - (off % 16)); e.preventDefault(); return; }
    if (key === 'End') { select(off - (off % 16) + 15); e.preventDefault(); return; }
    if (key === 'Backspace' || key === 'Delete') {
      T.setByte(state.bytes, off, 0);
      renderGrid(); renderFieldPanel(); updateStatus();
      e.preventDefault();
      return;
    }
    if (key === 'Tab') { state.nibbleHigh = !state.nibbleHigh; e.preventDefault(); return; }
  }

  /* ======================================================================
     二、载入 / 状态
     ====================================================================== */

  function loadBytes(bytes, name) {
    state.bytes = T.normalizeLength(bytes);
    state.selected = 0;
    state.nibbleHigh = true;
    state.sourceName = name || '';
    renderGrid();
    renderFieldPanel();
    updateStatus();
    renderSummary();
  }

  function updateStatus() {
    var chip = document.getElementById('tk-status');
    if (!chip) return;
    if (!state.bytes) { chip.textContent = '无数据'; chip.className = 'chip'; return; }
    var st = T.checksumStatus(state.bytes);
    var bad = st.filter(function (s) { return !s.valid; }).length;
    var size = document.getElementById('tk-size');
    if (size) size.textContent = state.bytes.length + ' 字节 · ' + st.length + ' 块';
    if (bad) {
      chip.textContent = bad + ' 块校验和错误';
      chip.className = 'chip err';
    } else {
      chip.textContent = '校验和全部通过';
      chip.className = 'chip ok';
    }
  }

  /* 概要：把解析结果里的关键字段抓出来 */
  function renderSummary() {
    var host = document.getElementById('tk-summary');
    if (!host || !state.bytes) return;
    var D = global.EDIDDecoder;
    if (!D) return;
    var r = D.decode(state.bytes);
    if (!r || !r.base) { host.innerHTML = ''; return; }
    var b = r.base;
    var rows = [
      ['厂商', b.manufacturer.code + (b.manufacturer.vendor ? ' · ' + b.manufacturer.vendor : '')],
      ['产品码 / 序列号', b.productCode + ' / ' + b.serialNumber],
      ['版本 / 扩展块', 'EDID ' + b.edidVersion + ' · ' + b.extensionCount + ' 个扩展块'],
      ['接口 / 位深', interfaceLabel(b.videoInputRaw)],
      ['物理尺寸', b.widthCm + ' × ' + b.heightCm + ' cm'],
      ['Gamma', b.gamma],
      ['特征', b.features && b.features.srgb ? 'sRGB' : ''].concat(
        b.features && b.features.preferredTiming ? '首选时序' : '',
        b.features && b.features.standby ? 'Standby' : '').filter(Boolean).join(' · ') || '—'
    ];
    host.innerHTML = '<div class="tk-summary">' + rows.map(function (x) {
      return '<div class="tk-sumitem"><span class="tk-sumk">' + esc(x[0]) +
        '</span><span class="tk-sumv">' + esc(x[1]) + '</span></div>';
    }).join('') + '</div>';
  }

  function interfaceLabel(raw) {
    var digital = (raw >> 7) & 1;
    if (!digital) return '模拟输入';
    var depth = ['', '6bpc', '8bpc', '10bpc', '12bpc', '14bpc', '16bpc'][(raw >> 4) & 7];
    var iface = ['未定义', 'DVI', 'HDMI-a', 'HDMI-b', 'MDDI', 'DisplayPort'][raw & 7];
    return iface + ' · ' + (depth || '位深未声明');
  }

  /* ======================================================================
     三、新建向导
     ====================================================================== */

  var wizard = {
    step: 1,
    maxStep: 5,
    opts: {
      interfaceKey: 'hdmi20',
      manufacturer: 'ACM',
      productCode: '0001',
      serial: '1',
      monitorName: 'X-MACRO-LAB',
      week: 1,
      year: 2026,
      widthCm: 60,
      heightCm: 34,
      bitDepth: 8,
      displayType: 'rgb',
      sRgb: true,
      gamma: 2.2,
      maxPixelClock: 600,
      minVRate: 50,
      maxVRate: 75,
      minHRate: 30,
      maxHRate: 83,
      extCount: 1,
      preset: '1920x1080@60',
      established: ['640x480@60', '1280x1024@75'],
      standardTimings: [],
      vics: [],
      ycbcr444: false,
      ycbcr422: false,
      standby: true,
      suspend: false,
      lowPower: true,
      preferredTiming: true,
      gtf: false
    }
  };

  function wizardStepHtml(step) {
    var o = wizard.opts;
    if (step === 1) {
      return '<div class="tk-wizgrid">' + T.INTERFACES.map(function (i) {
        return '<button type="button" class="tk-iface' + (o.interfaceKey === i.key ? ' on' : '') +
          '" data-wiz-iface="' + i.key + '">' +
          '<b>' + esc(i.name) + '</b><span>' + esc(i.note) + '</span></button>';
      }).join('') + '</div>';
    }
    if (step === 2) {
      return '<div class="tk-form">' +
        row('厂商 ID（3 字母）', '<input id="wiz-mfr" maxlength="3" value="' + esc(o.manufacturer) + '">') +
        row('产品码（4 位十六进制）', '<input id="wiz-pc" maxlength="4" value="' + esc(o.productCode) + '">') +
        row('序列号（十进制）', '<input id="wiz-sn" value="' + esc(o.serial) + '">') +
        row('显示器名（≤12 字符）', '<input id="wiz-name" maxlength="12" value="' + esc(o.monitorName) + '">') +
        row('制造周 / 年', '<input id="wiz-week" type="number" min="1" max="54" value="' + o.week + '"> / ' +
          '<input id="wiz-year" type="number" min="1990" max="2245" value="' + o.year + '">') +
        '</div>';
    }
    if (step === 3) {
      return '<div class="tk-form">' +
        row('物理尺寸（cm）', '<input id="wiz-w" type="number" min="1" max="255" value="' + o.widthCm + '"> × ' +
          '<input id="wiz-h" type="number" min="1" max="255" value="' + o.heightCm + '">') +
        row('位深', selectHtml('wiz-depth', [6, 8, 10, 12, 14, 16], o.bitDepth, function (v) { return v + 'bpc'; })) +
        row('显示类型', selectHtml('wiz-dtype', [['rgb', 'RGB 彩色'], ['monochrome', '单色'], ['nonRgb', '非 RGB']], o.displayType)) +
        row('色域', checkboxHtml('wiz-srgb', 'sRGB 默认', o.sRgb) + ' ' +
          checkboxHtml('wiz-y444', 'YCbCr 4:4:4', o.ycbcr444) + ' ' +
          checkboxHtml('wiz-y422', 'YCbCr 4:2:2', o.ycbcr422)) +
        row('Gamma', '<input id="wiz-gamma" type="number" min="1.0" max="3.0" step="0.01" value="' + o.gamma + '">') +
        row('电源管理', checkboxHtml('wiz-standby', 'Standby', o.standby) + ' ' +
          checkboxHtml('wiz-suspend', 'Suspend', o.suspend) + ' ' +
          checkboxHtml('wiz-lowpower', 'Low Power', o.lowPower)) +
        '</div>';
    }
    if (step === 4) {
      return '<div class="tk-form">' +
        row('首选时序', selectHtml('wiz-preset', T.TIMING_PRESETS.map(function (p) { return p.label; }), o.preset)) +
        row('扩展块数量', selectHtml('wiz-extcount', [0, 1, 2, 3, 4], o.extCount)) +
        row('显示范围限制', '<input id="wiz-minv" type="number" min="0" max="255" value="' + o.minVRate + '">–' +
          '<input id="wiz-maxv" type="number" min="0" max="255" value="' + o.maxVRate + '"> Hz　最大时钟 ' +
          '<input id="wiz-maxclk" type="number" min="10" max="2550" value="' + o.maxPixelClock + '"> MHz') +
        '<div class="tk-est">' +
        '<div class="tk-t">Established Timings</div>' +
        T.ESTABLISHED.map(function (e) {
          var label = e[2];
          return '<label class="tk-chk"><input type="checkbox" data-wiz-est="' + esc(label) + '"' +
            (o.established.indexOf(label) >= 0 ? ' checked' : '') + '>' + esc(label) + '</label>';
        }).join('') +
        '</div>' +
        '</div>';
    }
    if (step === 5) {
      var preset = T.TIMING_PRESETS.filter(function (p) { return p.label === o.preset; })[0];
      var t = preset ? T.deriveTiming(preset) : null;
      return '<div class="tk-form">' +
        row('VIC 列表（逗号分隔，可留空）', '<input id="wiz-vic" value="' +
          esc(o.vics.map(function (v) { return v.vic; }).join(',')) + '" placeholder="例如 4,16,217">') +
        (t ? '<dl class="kv sm"><dt>像素时钟</dt><dd>' + t.pixelClock.toFixed(3) + ' MHz</dd>' +
          '<dt>总像素</dt><dd>' + t.hTotal + ' × ' + t.vTotal + '</dd>' +
          '<dt>刷新率</dt><dd>' + (t.refresh ? t.refresh.toFixed(2) : '—') + ' Hz</dd>' +
          '<dt>时序来源</dt><dd>CVT-RB（与本站 Timing 计算器同源）</dd></dl>' : '') +
        '<p class="muted small">点「生成 EDID」后，结果会载入上方字节网格，可继续逐字节修改。</p>' +
        '</div>';
    }
    return '';
  }

  function row(label, control) {
    return '<div class="tk-frow"><label class="tk-flabel">' + esc(label) + '</label><div class="tk-fctl">' + control + '</div></div>';
  }

  function selectHtml(id, values, current, fmt) {
    var opts = values.map(function (v) {
      var val = typeof v === 'object' ? v[0] : v;
      var text = typeof v === 'object' ? v[1] : (fmt ? fmt(v) : v);
      var sel = String(val) === String(current) ? ' selected' : '';
      return '<option value="' + esc(val) + '"' + sel + '>' + esc(text) + '</option>';
    }).join('');
    return '<select id="' + id + '">' + opts + '</select>';
  }

  function checkboxHtml(id, label, checked) {
    return '<label class="tk-chk"><input type="checkbox" id="' + id + '"' + (checked ? ' checked' : '') + '>' + esc(label) + '</label>';
  }

  function renderWizard() {
    var body = document.getElementById('tk-wiz-body');
    var steps = document.getElementById('tk-wiz-steps');
    if (!body || !steps) return;
    body.innerHTML = wizardStepHtml(wizard.step);
    steps.innerHTML = ['接口', '厂商', '显示', '时序', 'CEA'].map(function (n, i) {
      var idx = i + 1;
      var cls = idx === wizard.step ? 'on' : (idx < wizard.step ? 'done' : '');
      return '<span class="tk-wstep ' + cls + '"><b>' + idx + '</b>' + esc(n) + '</span>';
    }).join('');
    var prev = document.getElementById('tk-wiz-prev');
    var next = document.getElementById('tk-wiz-next');
    var gen = document.getElementById('tk-wiz-gen');
    if (prev) prev.disabled = wizard.step <= 1;
    if (next) next.style.display = wizard.step >= wizard.maxStep ? 'none' : '';
    if (gen) gen.style.display = wizard.step >= wizard.maxStep ? '' : 'none';
  }

  /* 收集向导当前步的输入 */
  function collectWizardStep() {
    var o = wizard.opts;
    function val(id) { var el = document.getElementById(id); return el ? el.value : null; }
    function checked(id) { var el = document.getElementById(id); return !!(el && el.checked); }

    if (wizard.step === 1) {
      var btn = document.querySelector('[data-wiz-iface].on');
      if (btn) o.interfaceKey = btn.getAttribute('data-wiz-iface');
    } else if (wizard.step === 2) {
      o.manufacturer = (val('wiz-mfr') || 'ACM').toUpperCase().slice(0, 3);
      o.productCode = (val('wiz-pc') || '0001').toUpperCase();
      o.serial = val('wiz-sn') || '1';
      o.monitorName = val('wiz-name') || 'MONITOR';
      o.week = parseInt(val('wiz-week'), 10) || 1;
      o.year = parseInt(val('wiz-year'), 10) || 2026;
    } else if (wizard.step === 3) {
      o.widthCm = parseInt(val('wiz-w'), 10) || 60;
      o.heightCm = parseInt(val('wiz-h'), 10) || 34;
      o.bitDepth = parseInt(val('wiz-depth'), 10) || 8;
      o.displayType = val('wiz-dtype') || 'rgb';
      o.sRgb = checked('wiz-srgb');
      o.ycbcr444 = checked('wiz-y444');
      o.ycbcr422 = checked('wiz-y422');
      o.gamma = parseFloat(val('wiz-gamma')) || 2.2;
      o.standby = checked('wiz-standby');
      o.suspend = checked('wiz-suspend');
      o.lowPower = checked('wiz-lowpower');
    } else if (wizard.step === 4) {
      o.preset = val('wiz-preset') || o.preset;
      o.extCount = parseInt(val('wiz-extcount'), 10);
      if (isNaN(o.extCount)) o.extCount = 1;
      o.minVRate = parseInt(val('wiz-minv'), 10) || 50;
      o.maxVRate = parseInt(val('wiz-maxv'), 10) || 75;
      o.maxPixelClock = parseInt(val('wiz-maxclk'), 10) || 600;
      var est = [];
      document.querySelectorAll('[data-wiz-est]').forEach(function (c) {
        if (c.checked) est.push(c.getAttribute('data-wiz-est'));
      });
      o.established = est;
    } else if (wizard.step === 5) {
      var raw = (val('wiz-vic') || '').trim();
      o.vics = raw ? raw.split(/[,，\s]+/).filter(Boolean).map(function (x) {
        var n = parseInt(x, 10);
        return isNaN(n) ? null : { vic: n, native: false };
      }).filter(Boolean) : [];
    }
  }

  function generateFromWizard() {
    collectWizardStep();
    var o = wizard.opts;
    var preset = T.TIMING_PRESETS.filter(function (p) { return p.label === o.preset; })[0];
    var timing = preset ? T.deriveTiming(preset) : null;
    if (timing) {
      timing.hImageSize = Math.round(o.widthCm * 10);
      timing.vImageSize = Math.round(o.heightCm * 10);
    }
    var bytes = T.buildEDID({
      interfaceKey: o.interfaceKey,
      manufacturer: o.manufacturer,
      productCode: o.productCode,
      serial: o.serial,
      monitorName: o.monitorName,
      serialText: o.serial,
      week: o.week, year: o.year,
      widthCm: o.widthCm, heightCm: o.heightCm,
      bitDepth: o.bitDepth, displayType: o.displayType, sRgb: o.sRgb,
      gamma: o.gamma,
      standby: o.standby, suspend: o.suspend, lowPower: o.lowPower,
      preferredTiming: o.preferredTiming, gtf: o.gtf,
      minVRate: o.minVRate, maxVRate: o.maxVRate,
      minHRate: o.minHRate, maxHRate: o.maxHRate,
      maxPixelClock: o.maxPixelClock,
      extCount: o.extCount,
      established: o.established,
      standardTimings: o.standardTimings,
      vics: o.vics,
      ycbcr444: o.ycbcr444, ycbcr422: o.ycbcr422,
      timing: timing
    });
    loadBytes(bytes, '向导生成');
    var panel = document.getElementById('tk-wizard');
    if (panel) panel.classList.remove('open');
  }

  /* ======================================================================
     四、模板库
     ====================================================================== */

  function renderTemplates() {
    var host = document.getElementById('tk-templates');
    if (!host) return;
    host.innerHTML = T.TEMPLATES.map(function (t) {
      return '<button type="button" class="tk-tpl" data-tpl="' + esc(t.id) + '">' +
        '<b>' + esc(t.name) + '</b>' +
        '<span class="tk-tplif">' + esc(t.interface) + '</span>' +
        '<span class="tk-tpld">' + esc(t.description) + '</span>' +
        '</button>';
    }).join('');
  }

  /* ======================================================================
     五、导入 / 导出
     ====================================================================== */

  /* 导入文本 → 字节。
     支持三种形态：Intel HEX 记录、空格/逗号分隔的连续 hex、0x 前缀形式。
     长度不足 128 字节一律拒绝——EDID 最少也要一个基础块。 */
  function importText(text) {
    var trimmed = String(text || '').trim();
    if (!trimmed) return null;
    var bytes = null;
    if (/^:[0-9A-Fa-f]/m.test(trimmed)) {
      bytes = T.parseIntelHex(trimmed);
    } else {
      var hex = T.extractHexPairs(trimmed);
      if (hex && hex.length >= 64) bytes = T.hexToBytes(hex);
    }
    if (!bytes || bytes.length < 128) return null;
    return bytes;
  }

  function download(filename, data, mime) {
    var blob = new Blob([data], { type: mime || 'application/octet-stream' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 0);
  }

  function exportAs(kind) {
    if (!state.bytes) return;
    var base = 'edid' + (state.sourceName ? '-' + state.sourceName.replace(/[^\w-]+/g, '') : '');
    if (kind === 'bin') { download(base + '.bin', state.bytes, 'application/octet-stream'); return; }
    if (kind === 'hex') { download(base + '.hex', T.toIntelHex(state.bytes), 'text/plain'); return; }
    if (kind === 'dat') { download(base + '.dat', T.toHexDump(state.bytes), 'text/plain'); return; }
    if (kind === 'txt') { download(base + '.txt', T.toCommaHex(state.bytes), 'text/plain'); return; }
  }

  /* ======================================================================
     六、初始化
     ====================================================================== */

  function init() {
    var panel = document.getElementById('panel-edid-toolkit');
    if (!panel) return;

    /* 网格点击与键盘。
       键盘监听同时挂在网格和 document 上：网格获得焦点时走网格监听，
       否则（例如用户刚点完工具条）走 document 监听——这样不需要用户
       先点一下网格才能用键盘编辑。 */
    var grid = document.getElementById('tk-grid');
    if (grid) {
      grid.addEventListener('click', function (e) {
        var cell = e.target.closest ? e.target.closest('.tk-cell') : null;
        if (!cell) return;
        var off = parseInt(cell.getAttribute('data-off'), 10);
        if (!isNaN(off)) select(off);
        grid.focus();
      });
      grid.setAttribute('tabindex', '0');
      grid.addEventListener('keydown', onGridKey);
    }

    /* document 级兜底：当焦点不在网格上时接管按键——
       这样用户不必先点一下网格就能用方向键与十六进制输入。
       焦点在输入类控件里时不拦截，避免打断打字；
       只在本页处于激活状态时生效，避免在别的页面误改字节。 */
    document.addEventListener('keydown', function (e) {
      if (!state.bytes) return;
      var panel = document.getElementById('panel-edid-toolkit');
      if (!panel || !panel.classList.contains('active')) return;
      var t = e.target;
      var tag = t && t.tagName ? t.tagName.toUpperCase() : '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (t && t.isContentEditable) return;
      if (grid && t === grid) return;          /* 网格自己有监听器 */
      onGridKey(e);
    });

    /* 工具条 */
    var btnImport = document.getElementById('tk-import');
    if (btnImport) {
      btnImport.addEventListener('click', function () {
        var ta = document.getElementById('tk-hex');
        var b = importText(ta ? ta.value : '');
        if (b) loadBytes(b, '导入');
        else if (ta) ta.focus();
      });
    }

    var fileInput = document.getElementById('tk-file');
    if (fileInput) {
      fileInput.addEventListener('change', function () {
        var f = fileInput.files && fileInput.files[0];
        if (!f) return;
        var reader = new FileReader();
        reader.onload = function () {
          var buf = new Uint8Array(reader.result);
          if (T.looksLikeBinaryEdid(buf)) {
            loadBytes(buf, f.name);
          } else {
            var b = importText(String(reader.result));
            if (b) loadBytes(b, f.name);
          }
        };
        reader.readAsArrayBuffer(f);
        fileInput.value = '';
      });
    }

    var btnWizard = document.getElementById('tk-open-wizard');
    if (btnWizard) {
      btnWizard.addEventListener('click', function () {
        var w = document.getElementById('tk-wizard');
        if (w) w.classList.toggle('open');
      });
    }
    var btnWizardClose = document.getElementById('tk-wiz-close');
    if (btnWizardClose) {
      btnWizardClose.addEventListener('click', function () {
        var w = document.getElementById('tk-wizard');
        if (w) w.classList.remove('open');
      });
    }
    var btnPrev = document.getElementById('tk-wiz-prev');
    if (btnPrev) {
      btnPrev.addEventListener('click', function () {
        collectWizardStep();
        if (wizard.step > 1) wizard.step--;
        renderWizard();
      });
    }
    var btnNext = document.getElementById('tk-wiz-next');
    if (btnNext) {
      btnNext.addEventListener('click', function () {
        collectWizardStep();
        if (wizard.step < wizard.maxStep) wizard.step++;
        renderWizard();
      });
    }
    var btnGen = document.getElementById('tk-wiz-gen');
    if (btnGen) {
      btnGen.addEventListener('click', generateFromWizard);
    }

    /* 向导内部的动态事件（接口卡片、Established 复选框） */
    document.addEventListener('click', function (e) {
      var iface = e.target.closest ? e.target.closest('[data-wiz-iface]') : null;
      if (iface) {
        document.querySelectorAll('[data-wiz-iface]').forEach(function (b) { b.classList.remove('on'); });
        iface.classList.add('on');
        collectWizardStep();
        return;
      }
      var tpl = e.target.closest ? e.target.closest('[data-tpl]') : null;
      if (tpl) {
        var b2 = T.buildTemplate(tpl.getAttribute('data-tpl'));
        if (b2) loadBytes(b2, tpl.getAttribute('data-tpl'));
        return;
      }
    });

    /* 导出 */
    ['bin', 'hex', 'dat', 'txt'].forEach(function (kind) {
      var b = document.getElementById('tk-export-' + kind);
      if (b) b.addEventListener('click', function () { exportAs(kind); });
    });

    /* 模板库 */
    renderTemplates();
    renderWizard();

    /* 默认载入一个模板，避免空白页 */
    var first = T.buildTemplate('hdmi-2.0-4k60');
    if (first) loadBytes(first, 'HDMI 2.0 4K60 模板');
  }

  global.EDIDToolkitUI = {
    init: init,
    state: state,
    loadBytes: loadBytes,
    select: select,
    renderGrid: renderGrid,
    importText: importText,
    exportAs: exportAs
  };
})(typeof window !== 'undefined' ? window : this);
