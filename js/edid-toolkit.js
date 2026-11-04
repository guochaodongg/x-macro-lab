/* ==========================================================================
   X-MACRO-LAB — edid-toolkit.js
   EDID 工具箱的纯逻辑层：字节网格分区、编辑模型、新建向导字节拼装、
   模板库与导出格式。

   零依赖（classic script，不碰 DOM），可在 Node 里直测。

   与既有模块的关系：
     EDIDCore      字节工具、校验和、厂商 ID、色度换算
     EDIDDecoder   基础块 / CTA 扩展块解析
     EDIDEncoder   DTD 打包、标准时序、CEA 扩展块构造
     EDIDTiming    CVT / GTF 时序计算
   本文件只做「工具箱特有」的部分，不重复实现上面的能力。

   规范依据：EDID 1.4（VESA）、CTA-861.3、DisplayID 2.0。
   ========================================================================== */
(function (global) {
  'use strict';

  var C = global.EDIDCore;
  var E = global.EDIDEncoder;

  var BLOCK_SIZE = 128;
  var MAX_EXTENSIONS = 4;         /* EDID 1.4 最多 4 个扩展块 */

  /* ======================================================================
     一、字节网格的分区定义
     ----------------------------------------------------------------------
     编辑器要把 128（或 256/384/512）字节按 EDID 结构分区着色，
     供用户一眼看出「这几个字节是什么」。分区表同时驱动：
       - 网格单元的 CSS class
       - 点击某字节时右侧要解释的字段
     ====================================================================== */

  /* 基础块（偏移 0-127）的分区 */
  var BASE_REGIONS = [
    { key: 'header', name: 'Header', start: 0, end: 7,
      desc: '固定为 00 FF FF FF FF FF FF 00；不匹配则整块 EDID 会被驱动丢弃' },
    { key: 'manufacturer', name: '厂商 ID / 产品码 / 序列号', start: 8, end: 15,
      desc: '厂商 ID（大端 5bit/字母）、产品码与序列号（小端）' },
    { key: 'made', name: '制造周 / 年 / 版本', start: 16, end: 19,
      desc: '制造周（1-54）、制造年（存 year-1990）、EDID 版本主次' },
    { key: 'basic-display', name: '显示参数', start: 20, end: 24,
      desc: '视频输入定义（位深 / 色彩格式 / 接口类型）、物理尺寸、Gamma、特征支持' },
    { key: 'chromaticity', name: '色度坐标', start: 25, end: 34,
      desc: '红绿蓝白点坐标，10 bit 精度（值域 0-1023）' },
    { key: 'established', name: 'Established Timings', start: 35, end: 37,
      desc: '3 字节位图，每一位对应一个标准时序（640x480@60 等）' },
    { key: 'standard', name: 'Standard Timings', start: 38, end: 53,
      desc: '8 组 2 字节：水平分辨率/8-31、宽高比 + 刷新率-60' },
    { key: 'detailed', name: '详细时序 / 描述符', start: 54, end: 125,
      desc: '4 组 18 字节：可以是详细时序（DTD），也可以是 18 字节描述符' },
    { key: 'ext-count', name: '扩展块数量', start: 126, end: 126,
      desc: '后续扩展块的个数，必须与实际块数一致' },
    { key: 'checksum', name: '校验和', start: 127, end: 127,
      desc: '前 127 字节求和取补码，使整块和 mod 256 = 0' }
  ];

  /* 扩展块内部的分区（相对扩展块起点） */
  var EXT_REGIONS = {
    2: [
      { key: 'ext-header', name: 'CTA-861 扩展块头', start: 0, end: 3,
        desc: 'tag=02、修订号、DTD 起始偏移、标志（Underscan/Audio/YCbCr/原生 DTD 数）' },
      { key: 'ext-datablocks', name: '数据块集合', start: 4, end: 125,
        desc: '每块首字节高 3 位是类型、低 5 位是长度；按扩展 tag 解析' },
      { key: 'ext-checksum', name: '校验和', start: 127, end: 127,
        desc: '本扩展块 127 字节求和取补码' }
    ],
    0x70: [
      { key: 'did-header', name: 'DisplayID 扩展块头', start: 0, end: 12,
        desc: 'tag=70、修订号、产品类别；数据块从块内偏移 13 开始' },
      { key: 'did-datablocks', name: 'DisplayID 数据块', start: 13, end: 126,
        desc: '每块：类型、修订号、载荷长度、载荷' },
      { key: 'did-checksum', name: '校验和', start: 127, end: 127,
        desc: '本扩展块 127 字节求和取补码' }
    ]
  };

  /* 基础块内 18 字节描述符的类型表（描述符偏移 3 处的类型字节） */
  var DESCRIPTOR_TYPES = {
    0xFF: { key: 'serial', name: 'Monitor Serial Number', desc: '13 字符序列号文本，以 0x0A 结束' },
    0xFC: { name: 'Monitor Name', desc: '13 字符显示器名，以 0x0A 结束' },
    0xFD: { name: 'Display Range Limits', desc: '垂直/水平刷新率范围与最大像素时钟（单位 10 MHz）' },
    0xFE: { name: 'ASCII String', desc: '13 字符自由文本，以 0x0A 结束' },
    0x10: { name: 'Additional Standard Timings', desc: '附加标准时序（可能含多个）' },
    0x0F: { name: 'Color Management Data', desc: '色彩管理数据' },
    0x00: { name: 'Dummy / Padding', desc: '填充描述符，18 字节全 0' }
  };

  /* ======================================================================
     二、网格模型
     ====================================================================== */

  /* 判断某个绝对偏移属于哪个分区 */
  function regionAt(bytes, offset) {
    var blockIndex = Math.floor(offset / BLOCK_SIZE);
    var inBlock = offset % BLOCK_SIZE;

    if (blockIndex === 0) {
      for (var i = 0; i < BASE_REGIONS.length; i++) {
        var r = BASE_REGIONS[i];
        if (offset >= r.start && offset <= r.end) {
          return { region: r, blockIndex: 0, inBlock: inBlock, label: r.name, desc: r.desc };
        }
      }
      return { region: null, blockIndex: 0, inBlock: inBlock, label: '未知', desc: '' };
    }

    /* 扩展块：取该块的 tag 决定内部分区 */
    var tag = bytes[blockIndex * BLOCK_SIZE];
    var table = EXT_REGIONS[tag];
    if (!table) {
      return { region: null, blockIndex: blockIndex, inBlock: inBlock,
        label: '扩展块 (0x' + (tag === undefined ? '??' : tag.toString(16)) + ')',
        desc: '未知的扩展块标签，按 128 字节整体处理' };
    }
    for (var j = 0; j < table.length; j++) {
      var er = table[j];
      if (inBlock >= er.start && inBlock <= er.end) {
        return { region: er, blockIndex: blockIndex, inBlock: inBlock, label: er.name, desc: er.desc };
      }
    }
    return { region: null, blockIndex: blockIndex, inBlock: inBlock, label: '未知', desc: '' };
  }

  /* 把整个 EDID 切成「分区序列」，供渲染与导航使用 */
  function layout(bytes) {
    var out = [];
    if (!bytes || !bytes.length) return out;
    var blockCount = Math.ceil(bytes.length / BLOCK_SIZE);
    for (var b = 0; b < blockCount; b++) {
      var base = b * BLOCK_SIZE;
      var end = Math.min(base + BLOCK_SIZE, bytes.length);
      var seen = {};
      for (var o = base; o < end; o++) {
        var info = regionAt(bytes, o);
        var key = info.region ? (info.region.key + '@' + b) : ('raw@' + b + '@' + info.inBlock);
        if (!seen[key]) {
          seen[key] = { key: key, name: info.label, desc: info.desc,
            blockIndex: b, start: o, end: o, bytes: 0 };
          out.push(seen[key]);
        }
        seen[key].end = o;
        seen[key].bytes++;
      }
    }
    return out;
  }

  /* ======================================================================
     三、编辑模型
     ----------------------------------------------------------------------
     编辑是「原位改写」：字节总数固定，不支持插入/删除。
     每次改动后重算所有块的校验和——这是原工具的应用层行为，
     保留它可以让用户专心改语义位，不用每次手动算校验和。
     ====================================================================== */

  /* 重算基础块与各扩展块的校验和（就地修改） */
  function refreshChecksums(bytes) {
    if (!bytes || bytes.length < BLOCK_SIZE) return bytes;
    var blockCount = Math.ceil(bytes.length / BLOCK_SIZE);
    for (var b = 0; b < blockCount; b++) {
      var base = b * BLOCK_SIZE;
      var end = Math.min(base + BLOCK_SIZE, bytes.length);
      if (end - base < BLOCK_SIZE) break;          /* 不完整块不算校验和 */
      var sum = 0;
      for (var i = base; i < base + 127; i++) sum += bytes[i];
      bytes[base + 127] = (256 - (sum % 256)) % 256;
    }
    return bytes;
  }

  /* 基础块与各扩展块的校验和是否正确 */
  function checksumStatus(bytes) {
    var out = [];
    if (!bytes || bytes.length < BLOCK_SIZE) return out;
    var blockCount = Math.ceil(bytes.length / BLOCK_SIZE);
    for (var b = 0; b < blockCount; b++) {
      var base = b * BLOCK_SIZE;
      var end = Math.min(base + BLOCK_SIZE, bytes.length);
      if (end - base < BLOCK_SIZE) { out.push({ block: b, valid: false, partial: true }); continue; }
      var sum = 0;
      for (var i = base; i <= base + 127; i++) sum += bytes[i];
      out.push({ block: b, valid: (sum % 256) === 0, partial: false });
    }
    return out;
  }

  /* 依据 byte 126 的扩展块数量裁剪/补齐长度 */
  function normalizeLength(bytes) {
    if (!bytes || bytes.length < BLOCK_SIZE) return bytes;
    var ext = bytes[126] || 0;
    var want = BLOCK_SIZE * (1 + ext);
    if (bytes.length === want) return bytes;
    if (bytes.length > want) return bytes.slice(0, want);
    var padded = new Uint8Array(want);
    padded.set(bytes, 0);
    padded.fill(0xFF, bytes.length, want);
    return padded;
  }

  /* 写一个字节并自动重算校验和 */
  function setByte(bytes, offset, value) {
    if (!bytes || offset < 0 || offset >= bytes.length) return false;
    bytes[offset] = value & 0xFF;
    refreshChecksums(bytes);
    return true;
  }

  /* 翻转某一位 */
  function toggleBit(bytes, offset, bit) {
    if (!bytes || offset < 0 || offset >= bytes.length) return false;
    bytes[offset] = bytes[offset] ^ (1 << (bit & 7));
    refreshChecksums(bytes);
    return true;
  }

  /* ======================================================================
     四、位域读写助手（生成器与编辑器共用）
     ====================================================================== */

  function readBits(bytes, offset, bitOffset, bitWidth) {
    var v = 0;
    for (var i = 0; i < bitWidth; i++) {
      var bit = bitOffset + i;
      var byteIndex = offset + (bit >> 3);
      if (byteIndex >= bytes.length) return v << (bitWidth - i - 1);
      var b = (bytes[byteIndex] >> (7 - (bit & 7))) & 1;
      v = (v << 1) | b;
    }
    return v;
  }

  function writeBits(bytes, offset, bitOffset, bitWidth, value) {
    for (var i = 0; i < bitWidth; i++) {
      var bit = bitOffset + i;
      var byteIndex = offset + (bit >> 3);
      if (byteIndex >= bytes.length) continue;
      var mask = 1 << (7 - (bit & 7));
      var src = (value >> (bitWidth - 1 - i)) & 1;
      if (src) bytes[byteIndex] |= mask;
      else bytes[byteIndex] &= ~mask;
    }
  }

  /* ======================================================================
     五、18 字节描述符
     ====================================================================== */

  /* 读描述符：返回类型与文本 */
  function readDescriptor(bytes, offset) {
    var typeByte = bytes[offset + 3];
    var info = DESCRIPTOR_TYPES[typeByte] || { name: 'Unknown (0x' + (typeByte || 0).toString(16) + ')', desc: '' };
    var text = '';
    if (typeByte === 0xFD) {
      return {
        typeByte: typeByte, name: info.name, desc: info.desc,
        minVRate: bytes[offset + 5], maxVRate: bytes[offset + 6],
        minHRate: bytes[offset + 7], maxHRate: bytes[offset + 8],
        maxPixelClock: bytes[offset + 9] * 10,
        secondary: bytes[offset + 10]
      };
    }    for (var i = offset + 5; i < offset + 18; i++) {
      var c = bytes[i];
      if (c === 0x0A) break;
      if (c === 0x00) continue;
      text += String.fromCharCode(c);
    }
    return { typeByte: typeByte, name: info.name, desc: info.desc, text: text.replace(/\s+$/, '') };
  }

  /* 写 13 字符文本描述符（typeByte 指定 0xFF / 0xFC / 0xFE）
     约定与本站 edid-encoder.js 一致：文本最多 12 字符，其后 0x0A 结束，
     再用 0x20 填充到 13 字节。 */
  function writeTextDescriptor(bytes, offset, typeByte, text) {
    var s = String(text == null ? '' : text).slice(0, 12);
    bytes[offset] = 0x00;
    bytes[offset + 1] = 0x00;
    bytes[offset + 2] = 0x00;
    bytes[offset + 3] = typeByte;
    bytes[offset + 4] = 0x00;
    for (var i = 0; i < 13; i++) bytes[offset + 5 + i] = 0x20;
    for (var j = 0; j < s.length; j++) bytes[offset + 5 + j] = s.charCodeAt(j) & 0x7F;
    bytes[offset + 5 + s.length] = 0x0A;   /* 文本结束符 */
    return bytes;
  }

  /* ======================================================================
     六、新建 EDID 向导：字节拼装
     ----------------------------------------------------------------------
     这里刻意不复刻原工具的 7 处规范错误（见 README 说明）：
       ① byte20 的位深码与接口码不重叠（色度格式不写基础块）
       ② DTD byte17 极性位与 sync scheme 按 VESA 位域
       ③ Established byte37 bit0 明确为 1280x1024@75
       ④ SAD 采样率/位深位权重按 CTA-861
       ⑤ Range Limits byte10 写 0x00（Default GTF）
       ⑥ DisplayID 扩展标签写 0x70
       ⑦ VIC >= 128 留在 Video Data Block 内
     ====================================================================== */

  /* 接口类型定义 */
  var INTERFACES = [
    { key: 'vga', name: 'VGA', edidVersion: '1.3', digital: false, interfaceCode: 0,
      extCount: 0, note: '模拟接口，扩展块通常为 0' },
    { key: 'dvi', name: 'DVI', edidVersion: '1.4', digital: true, interfaceCode: 1,
      extCount: 1, note: 'DVI 数字接口' },
    { key: 'hdmi14', name: 'HDMI 1.4', edidVersion: '1.4', digital: true, interfaceCode: 2,
      extCount: 1, note: 'HDMI-a，最多 4K@30Hz / 4K@60Hz（4:4:4）' },
    { key: 'hdmi20', name: 'HDMI 2.0', edidVersion: '1.4', digital: true, interfaceCode: 2,
      extCount: 1, note: 'HDMI-a，18 Gbps TMDS，SCDC 存在' },
    { key: 'hdmi21', name: 'HDMI 2.1', edidVersion: '1.4', digital: true, interfaceCode: 2,
      extCount: 2, note: 'HDMI-a，FRL 最高 48 Gbps，可带 HF-VSDB' },
    { key: 'dp12', name: 'DisplayPort 1.2', edidVersion: '1.4', digital: true, interfaceCode: 5,
      extCount: 1, note: 'HBR2，4 lane 17.28 Gbps' },
    { key: 'dp14', name: 'DisplayPort 1.4', edidVersion: '1.4', digital: true, interfaceCode: 5,
      extCount: 2, note: 'HBR3，4 lane 25.92 Gbps 有效，可带 DSC' },
    { key: 'dp20', name: 'DisplayPort 2.0', edidVersion: '1.4', digital: true, interfaceCode: 5,
      extCount: 2, note: 'UHBR13.5 / UHBR20，DP 2.0 引入的 FEC 机制' }
  ];

  function interfaceByKey(key) {
    for (var i = 0; i < INTERFACES.length; i++) if (INTERFACES[i].key === key) return INTERFACES[i];
    return INTERFACES[3];
  }

  /* 位深码：6bpc=1 … 16bpc=6（VESA 规范） */
  var BIT_DEPTH_CODES = { 6: 1, 8: 2, 10: 3, 12: 4, 14: 5, 16: 6 };

  /* 宽高比码（Standard Timing 第二字节高 2 位） */
  var ASPECT_CODES = { '16:10': 0, '4:3': 1, '5:4': 2, '16:9': 3 };

  /* Established Timings 位图
     结构与本站 edid-core.js 的 ESTABLISHED 表一致：[区索引, 位号, 标签, 宽, 高, 刷新率]
     区索引 0/1/2 分别对应字节 35/36/37，位号 7..0 是该字节的高位到低位。
     本表比 EDIDCore.ESTABLISHED 更全（覆盖规范列出的全部 24 项），
     其中前 17 项与 EDIDCore 的标签一致，可与既有解码器互操作。 */
  var ESTABLISHED = [
    [0, 7, '720x400@70', 720, 400, 70],
    [0, 6, '720x400@88', 720, 400, 88],
    [0, 5, '640x480@60', 640, 480, 60],
    [0, 4, '640x480@67', 640, 480, 67],
    [0, 3, '640x480@72', 640, 480, 72],
    [0, 2, '640x480@75', 640, 480, 75],
    [0, 1, '720x480@60', 720, 480, 60],
    [0, 0, '720x480@59', 720, 480, 59],
    [1, 7, '720x576@50', 720, 576, 50],
    [1, 6, '720x576@60', 720, 576, 60],
    [1, 5, '800x600@56', 800, 600, 56],
    [1, 4, '800x600@60', 800, 600, 60],
    [1, 3, '800x600@72', 800, 600, 72],
    [1, 2, '800x600@75', 800, 600, 75],
    [1, 1, '832x624@75', 832, 624, 75],
    [1, 0, '1024x768@43', 1024, 768, 43],
    [2, 7, '1024x768@60', 1024, 768, 60],
    [2, 6, '1024x768@70', 1024, 768, 70],
    [2, 5, '1024x768@75', 1024, 768, 75],
    [2, 4, '1024x768@85', 1024, 768, 85],
    [2, 3, '1152x864@75', 1152, 864, 75],
    [2, 2, '1280x720@60', 1280, 720, 60],
    [2, 1, '1280x1024@60', 1280, 1024, 60],
    [2, 0, '1280x1024@75', 1280, 1024, 75]
  ];

  /* 常用分辨率预设（供向导回填时序） */
  var TIMING_PRESETS = [
    { label: '640x480@60', w: 640, h: 480, refresh: 60, pixelClock: 25.175 },
    { label: '800x600@60', w: 800, h: 600, refresh: 60, pixelClock: 40.0 },
    { label: '1024x768@60', w: 1024, h: 768, refresh: 60, pixelClock: 65.0 },
    { label: '1280x720@60', w: 1280, h: 720, refresh: 60, pixelClock: 74.5 },
    { label: '1280x1024@60', w: 1280, h: 1024, refresh: 60, pixelClock: 108.0 },
    { label: '1600x900@60', w: 1600, h: 900, refresh: 60, pixelClock: 118.25 },
    { label: '1680x1050@60', w: 1680, h: 1050, refresh: 60, pixelClock: 146.25 },
    { label: '1920x1080@60', w: 1920, h: 1080, refresh: 60, pixelClock: 148.5 },
    { label: '1920x1080@120', w: 1920, h: 1080, refresh: 120, pixelClock: 297.0 },
    { label: '2560x1080@60', w: 2560, h: 1080, refresh: 60, pixelClock: 232.0 },
    { label: '2560x1440@60', w: 2560, h: 1440, refresh: 60, pixelClock: 241.5 },
    { label: '2560x1440@120', w: 2560, h: 1440, refresh: 120, pixelClock: 483.0 },
    { label: '2560x1440@165', w: 2560, h: 1440, refresh: 165, pixelClock: 664.2 },
    { label: '2560x1440@240', w: 2560, h: 1440, refresh: 240, pixelClock: 966.1 },
    { label: '3840x2160@30', w: 3840, h: 2160, refresh: 30, pixelClock: 297.0 },
    { label: '3840x2160@60', w: 3840, h: 2160, refresh: 60, pixelClock: 594.0 },
    { label: '3840x2160@120', w: 3840, h: 2160, refresh: 120, pixelClock: 1188.0 },
    { label: '5120x2160@60', w: 5120, h: 2160, refresh: 60, pixelClock: 792.0 },
    { label: '7680x4320@30', w: 7680, h: 4320, refresh: 30, pixelClock: 1188.0 },
    { label: '7680x4320@60', w: 7680, h: 4320, refresh: 60, pixelClock: 2376.0 }
  ];

  /* 用 CVT 算法算时序。
     直接复用本站 timing.js 的 EDIDTiming.computeCVT —— 与「Timing · 时序计算」页
     同一套口径，刷新率天然自洽；不要自己拍消隐值（1080p60 的 vTotal 是 1125
     而不是 1080×1.25，按比例拍会算出 45.8Hz 这种错值）。 */
  function deriveTiming(preset, opts) {
    if (!preset) return null;
    var o = opts || {};
    var T2 = global.EDIDTiming;
    if (T2 && typeof T2.computeCVT === 'function') {
      var r = T2.computeCVT({
        width: preset.w,
        height: preset.h,
        refreshRate: preset.refresh,
        rbVersion: o.rbVersion == null ? 1 : o.rbVersion   /* 默认 CVT-RB v1 */
      });
      if (r && r.pixelClock) {
        return {
          pixelClock: r.pixelClock,                       /* MHz */
          hActive: r.hActive, hBlank: r.hBlank,
          vActive: r.vActive, vBlank: r.vBlank,
          hSyncOffset: r.hFrontPorch, hSyncPulse: r.hSync,
          vSyncOffset: r.vFrontPorch, vSyncPulse: r.vSync,
          hSyncPositive: !!r.hSyncPositive, vSyncPositive: !!r.vSyncPositive,
          interlaced: !!r.interlaced, refresh: r.refreshRate,
          hTotal: r.hTotal, vTotal: r.vTotal
        };
      }
    }
    /* 没有 timing.js 时的兜底：按 1.25 倍消隐估算（仅用于极端降级） */
    var w = preset.w, h = preset.h, refresh = preset.refresh;
    var hTotal = Math.round(w * 1.25);
    var vTotal = Math.round(h * 1.25);
    var hBlank = hTotal - w, vBlank = vTotal - h;
    return {
      pixelClock: preset.pixelClock || Math.round(hTotal * vTotal * refresh / 1000 * 100) / 100,
      hActive: w, hBlank: hBlank, vActive: h, vBlank: vBlank,
      hSyncOffset: Math.round(hBlank / 2), hSyncPulse: Math.round(hBlank / 4) || 1,
      vSyncOffset: 1, vSyncPulse: Math.max(1, Math.round(vBlank / 8)),
      hSyncPositive: false, vSyncPositive: false,
      interlaced: false, refresh: refresh, hTotal: hTotal, vTotal: vTotal
    };
  }

  /* 打包 18 字节 DTD（严格按 VESA 位域） */
  function packDTD(bytes, offset, t) {
    var pclk10k = Math.round(t.pixelClock * 100);       /* MHz -> 10 kHz */
    bytes[offset] = pclk10k & 0xFF;
    bytes[offset + 1] = (pclk10k >> 8) & 0xFF;
    bytes[offset + 2] = t.hActive & 0xFF;
    bytes[offset + 3] = t.hBlank & 0xFF;
    bytes[offset + 4] = ((t.hActive >> 8) & 0x0F) << 4 | ((t.hBlank >> 8) & 0x0F);
    bytes[offset + 5] = t.vActive & 0xFF;
    bytes[offset + 6] = t.vBlank & 0xFF;
    bytes[offset + 7] = ((t.vActive >> 8) & 0x0F) << 4 | ((t.vBlank >> 8) & 0x0F);
    bytes[offset + 8] = t.hSyncOffset & 0xFF;
    bytes[offset + 9] = t.hSyncPulse & 0xFF;
    bytes[offset + 10] = ((t.vSyncOffset & 0x0F) << 4) | (t.vSyncPulse & 0x0F);
    bytes[offset + 11] = ((t.hSyncOffset >> 8) & 0x03) << 6 |
      ((t.hSyncPulse >> 8) & 0x03) << 4 |
      ((t.vSyncOffset >> 4) & 0x03) << 2 |
      (t.vSyncPulse >> 4) & 0x03;
    bytes[offset + 12] = t.hImageSize & 0xFF;          /* mm */
    bytes[offset + 13] = t.vImageSize & 0xFF;
    bytes[offset + 14] = ((t.hImageSize >> 8) & 0x0F) << 4 | ((t.vImageSize >> 8) & 0x0F);
    bytes[offset + 15] = 0;                            /* H border */
    bytes[offset + 16] = 0;                            /* V border */
    /* byte17：bit7 交错、bits6-5 立体、bits3-2 sync scheme、bit1 H 极性、bit0 V 极性 */
    bytes[offset + 17] = (t.interlaced ? 0x80 : 0x00) |
      ((t.stereo || 0) << 5) & 0x60 |
      ((t.syncScheme || 3) << 2) & 0x0C |
      (t.hSyncPositive ? 0x02 : 0x00) |
      (t.vSyncPositive ? 0x01 : 0x00);
    return bytes;
  }

  /* 由向导弹 DTD 字节 */
  function buildEDID(opts) {
    var o = opts || {};
    var iface = interfaceByKey(o.interfaceKey);
    var extCount = Math.max(0, Math.min(MAX_EXTENSIONS, o.extCount == null ? iface.extCount : o.extCount));
    var total = BLOCK_SIZE * (1 + extCount);
    var b = new Uint8Array(total);

    /* 0-7 header */
    var header = [0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x00];
    for (var i = 0; i < 8; i++) b[i] = header[i];

    /* 8-9 厂商 ID（大端 5bit/字母） */
    var mcode = String(o.manufacturer || 'AAA').toUpperCase().slice(0, 3);
    while (mcode.length < 3) mcode += ' ';
    var mv = 0;
    for (var m = 0; m < 3; m++) {
      var c = mcode.charCodeAt(m) - 64;
      if (c < 1 || c > 26) c = 1;
      mv = (mv << 5) | c;
    }
    b[8] = (mv >> 8) & 0xFF;
    b[9] = mv & 0xFF;

    /* 10-11 产品码（小端）、12-15 序列号（小端 32） */
    var pc = parseInt(String(o.productCode || '0001'), 16) || 1;
    b[10] = pc & 0xFF; b[11] = (pc >> 8) & 0xFF;
    var sn = (parseInt(String(o.serial || '1'), 10) || 1) >>> 0;
    b[12] = sn & 0xFF; b[13] = (sn >> 8) & 0xFF;
    b[14] = (sn >> 16) & 0xFF; b[15] = (sn >> 24) & 0xFF;

    /* 16 周、17 年（存 year-1990）、18-19 版本 */
    b[16] = Math.max(1, Math.min(54, o.week || 1));
    b[17] = Math.max(0, Math.min(255, (o.year || 2026) - 1990));
    var ver = String(o.edidVersion || '1.4').split('.');
    b[18] = parseInt(ver[0], 10) || 1;
    b[19] = parseInt(ver[1], 10) || 4;

    /* 20 视频输入定义：bit7 数字、bits6-4 位深、bit3 色彩格式、bits2-0 接口
       色彩格式不在基础块表达（属于 CTA 扩展块的标志位），故此处只写位深与接口。 */
    var depth = BIT_DEPTH_CODES[o.bitDepth || 8] || 2;
    b[20] = (iface.digital ? 0x80 : 0x00) | ((depth & 0x07) << 4) | (iface.interfaceCode & 0x07);

    /* 21-22 物理尺寸（cm）、23 Gamma、24 特征支持 */
    b[21] = Math.max(0, Math.min(255, o.widthCm || 60));
    b[22] = Math.max(0, Math.min(255, o.heightCm || 34));
    b[23] = Math.max(0, Math.min(255, Math.round((o.gamma || 2.2) * 100) - 100));
    var displayType = { monochrome: 0, rgb: 1, nonRgb: 2, undefined: 3 }[o.displayType || 'rgb'] || 1;
    b[24] = (o.standby ? 0x80 : 0) | (o.suspend ? 0x40 : 0) | (o.lowPower ? 0x20 : 0) |
      ((displayType & 0x03) << 3) | (o.sRgb ? 0x04 : 0) |
      (o.preferredTiming ? 0x02 : 0) | (o.gtf ? 0x01 : 0);

    /* 25-34 色度坐标（10 bit）
       布局与 EDID 1.4 规范一致，也与本站 edid-encoder.js / edid-decoder.js 自洽：
         byte25-32 依次是 Rx/Ry/Gx/Gy/Bx/By/Wx/Wy 的高 8 位（值 >> 2），
         byte33 = Rx低2|Ry低2|Gx低2|Gy低2（各占 2 bit，高位在前），
         byte34 = Bx低2|By低2|Wx低2|Wy低2。 */
    var chroma = o.chroma || C.sRGBChromaticity();
    var pts = [
      [chroma.red.x, chroma.red.y], [chroma.green.x, chroma.green.y],
      [chroma.blue.x, chroma.blue.y], [chroma.white.x, chroma.white.y]
    ];
    var raw = pts.map(function (p) {
      /* 量化口径与本站 edid-encoder.js 一致：round(v * 1024)，上限 1023。
         注意分母是 1024 而不是 1023——EDID 的 10 bit 色度字段值域是 0..1023，
         但 x/y 坐标按 1/1024 还原，所以编码时用 x*1024。 */
      return [
        Math.max(0, Math.min(1023, Math.round(p[0] * 1024))),
        Math.max(0, Math.min(1023, Math.round(p[1] * 1024)))
      ];
    });
    b[25] = (raw[0][0] >> 2) & 0xFF;      /* Red X  高 8 位 */
    b[26] = (raw[0][1] >> 2) & 0xFF;      /* Red Y  高 8 位 */
    b[27] = (raw[1][0] >> 2) & 0xFF;      /* Green X 高 8 位 */
    b[28] = (raw[1][1] >> 2) & 0xFF;      /* Green Y 高 8 位 */
    b[29] = (raw[2][0] >> 2) & 0xFF;      /* Blue X 高 8 位 */
    b[30] = (raw[2][1] >> 2) & 0xFF;      /* Blue Y 高 8 位 */
    b[31] = (raw[3][0] >> 2) & 0xFF;      /* White X 高 8 位 */
    b[32] = (raw[3][1] >> 2) & 0xFF;      /* White Y 高 8 位 */
    b[33] = ((raw[0][0] & 3) << 6) | ((raw[0][1] & 3) << 4) |
      ((raw[1][0] & 3) << 2) | (raw[1][1] & 3);
    b[34] = ((raw[2][0] & 3) << 6) | ((raw[2][1] & 3) << 4) |
      ((raw[3][0] & 3) << 2) | (raw[3][1] & 3);

    /* 35-37 Established Timings 位图 */
    var enabled = {};
    (o.established || []).forEach(function (label) { enabled[label] = true; });
    ESTABLISHED.forEach(function (e) {
      if (enabled[e[2]]) b[35 + e[0]] |= (1 << e[1]);
    });

    /* 38-53 Standard Timings（8 组 2 字节） */
    for (var s = 0; s < 8; s++) {
      var base = 38 + s * 2;
      var st = (o.standardTimings || [])[s];
      if (!st || !st.w) { b[base] = 0x01; b[base + 1] = 0x01; continue; }
      b[base] = (Math.round(st.w / 8) - 31) & 0xFF;
      var aspect = ASPECT_CODES[st.aspect] == null ? 3 : ASPECT_CODES[st.aspect];
      b[base + 1] = ((aspect & 0x03) << 6) | ((st.refresh - 60) & 0x3F);
    }

    /* 54-71 主 DTD（首选时序） */
    var timing = o.timing || deriveTiming(TIMING_PRESETS[8]);
    if (timing.hImageSize == null) {
      timing.hImageSize = Math.round((o.widthCm || 60) * 10);
      timing.vImageSize = Math.round((o.heightCm || 34) * 10);
    }
    packDTD(b, 54, timing);

    /* 72-89 Display Range Limits 描述符（0xFD）
       字段布局与本站 edid-encoder.js 一致：
         off+4  保留 0
         off+5  最小垂直刷新 (Hz)
         off+6  最大垂直刷新 (Hz)
         off+7  最小水平刷新 (kHz)
         off+8  最大水平刷新 (kHz)
         off+9  最大像素时钟 (单位 10 MHz)
         off+10 时序支持类型（0x00 = Default GTF）
         off+11 起 LF + 六个空格 */
    b[72] = 0x00; b[73] = 0x00; b[74] = 0x00; b[75] = 0xFD;
    b[76] = 0x00;
    b[77] = Math.max(0, Math.min(255, o.minVRate == null ? 48 : o.minVRate));
    b[78] = Math.max(0, Math.min(255, o.maxVRate == null ? 75 : o.maxVRate));
    b[79] = Math.max(0, Math.min(255, o.minHRate == null ? 30 : o.minHRate));
    b[80] = Math.max(0, Math.min(255, o.maxHRate == null ? 83 : o.maxHRate));
    b[81] = Math.round((o.maxPixelClock || 165) / 10) & 0xFF;
    b[82] = 0x00;                 /* 次级时序类型：Default GTF（规范值，非保留值） */
    b[83] = 0x0A;                 /* 未用字节：LF + 六个空格 */
    b[84] = 0x20; b[85] = 0x20; b[86] = 0x20;
    b[87] = 0x20; b[88] = 0x20; b[89] = 0x20;

    /* 90-107 显示器名描述符（0xFC） */
    writeTextDescriptor(b, 90, 0xFC, o.monitorName || 'EDID Toolkit');

    /* 108-125 序列号描述符（0xFF） */
    writeTextDescriptor(b, 108, 0xFF, o.serialText || String(o.serial || '1'));

    /* 126 扩展块数量、127 校验和 */
    b[126] = extCount;
    b[127] = 0x00;

    /* 扩展块 */
    for (var e2 = 0; e2 < extCount; e2++) {
      buildCEAExtension(b, BLOCK_SIZE * (1 + e2), o, timing);
    }

    refreshChecksums(b);
    return b;
  }

  /* 构造 CTA-861 扩展块 */
  function buildCEAExtension(bytes, offset, o, timing) {
    /* 块头 */
    bytes[offset] = 0x02;               /* CTA-861 扩展标签 */
    bytes[offset + 1] = 0x03;           /* 修订号 3 */
    bytes[offset + 2] = 0x00;           /* DTD 起始偏移，稍后填 */
    bytes[offset + 3] = 0x00;           /* 标志，稍后填 */

    var pos = offset + 4;
    var dataBlocks = [];

    /* Video Capability Data Block（类型 0） */
    var vcd = [0x00, 0x00, 0x00];
    vcd[0] = 0x00;                      /* 无过扫描/欠扫描声明 */
    vcd[1] = (o.ycbcr444 ? 0x80 : 0) | (o.ycbcr422 ? 0x40 : 0);
    vcd[2] = (o.bt2020 ? 0xC0 : 0) | (o.dciP3 ? 0x20 : 0) | (o.adobeRgb ? 0x10 : 0);
    dataBlocks.push({ type: 0, data: vcd });

    /* Video Data Block（类型 2）：VIC 列表，VIC >= 128 仍在同一块内（规范要求） */
    var vics = (o.vics || []).slice(0, 31);
    if (vics.length) {
      var vdb = vics.map(function (v) {
        return (v.native ? 0x80 : 0x00) | (v.vic & 0x7F);
      });
      dataBlocks.push({ type: 2, data: vdb });
    }

    /* Vendor Specific Data Block（类型 3）：HDMI / DP 的 OUI */
    var vsdb = buildVendorSpecific(o);
    if (vsdb) dataBlocks.push({ type: 3, data: vsdb });

    /* Audio Data Block（类型 1） */
    if (o.audio && o.audio.length) {
      var adb = [];
      o.audio.forEach(function (a) {
        var sad = [];
        sad[0] = ((a.format & 0x0F) << 3) | ((a.channels - 1) & 0x07);
        sad[1] = a.sampleMask & 0x7F;      /* CTA-861：bit0=32k … bit6=192k */
        sad[2] = a.bitDepthMask & 0x07;    /* bit0=16 … bit2=24 */
        adb.push(sad[0], sad[1], sad[2]);
      });
      if (adb.length) dataBlocks.push({ type: 1, data: adb });
    }

    /* 序列化数据块 */
    dataBlocks.forEach(function (blk) {
      if (blk.data.length > 31) return;   /* 单块最长 31 字节，超出则跳过 */
      bytes[pos] = ((blk.type & 0x07) << 5) | (blk.data.length & 0x1F);
      for (var i = 0; i < blk.data.length; i++) bytes[pos + 1 + i] = blk.data[i] & 0xFF;
      pos += 1 + blk.data.length;
    });

    /* DTD 起始偏移：紧接在数据块之后 */
    bytes[offset + 2] = pos - offset;
    /* 标志：Underscan / Audio / YCbCr444 / YCbCr422 + 原生 DTD 数 */
    var flags = (o.underscan ? 0x80 : 0) | (o.audio && o.audio.length ? 0x40 : 0) |
      (o.ycbcr444 ? 0x20 : 0) | (o.ycbcr422 ? 0x10 : 0) | 0x01;
    bytes[offset + 3] = flags;

    /* 原生 DTD（首选时序）放在 DTD 起始偏移处 */
    packDTD(bytes, pos, timing);
    pos += 18;

    /* 剩余空间填 0xFF；校验和稍后统一算 */
    for (var p = pos; p < offset + 127; p++) bytes[p] = 0xFF;
    bytes[offset + 127] = 0x00;
  }

  /* Vendor Specific Data Block 的载荷（HDMI 论坛 OUI 或 DP 的 IEEE OUI） */
  function buildVendorSpecific(o) {
    var iface = interfaceByKey(o.interfaceKey);
    if (iface.key.indexOf('hdmi') === 0) {
      /* HDMI Forum VSDB：IEEE OUI 0xC45DD8（小端字节序 D8 5D C4） */
      var d = [0xD8, 0x5D, 0xC4];
      d.push(o.phyAddress == null ? 0x00 : (o.phyAddress >> 8) & 0xFF);
      d.push(o.phyAddress == null ? 0x00 : o.phyAddress & 0xFF);
      d.push(o.hdmiFlags == null ? 0x00 : o.hdmiFlags & 0xFF);
      d.push(Math.round((o.maxTmds || 600) / 5) & 0xFF);
      d.push(o.hdmiFlags2 == null ? 0x00 : o.hdmiFlags2 & 0xFF);
      d.push((o.maxFrlRate || 0) & 0x0F);
      d.push(o.hdmiFlags3 == null ? 0x00 : o.hdmiFlags3 & 0xFF);
      return d;
    }
    if (iface.key.indexOf('dp') === 0) {
      /* DisplayPort 的 IEEE OUI 0x00AD60（小端 60 AD 00） */
      return [0x60, 0xAD, 0x00, 0x10, 0x00];
    }
    return null;
  }

  /* ======================================================================
     七、模板库
     ----------------------------------------------------------------------
     纯前端内置的预置 EDID（字节数组），不依赖任何后端。
     ====================================================================== */

  function hexToBytes(hex) {
    var s = String(hex || '').replace(/0x/gi, '').replace(/[^0-9A-Fa-f]/g, '');
    var out = [];
    for (var i = 0; i + 1 < s.length; i += 2) out.push(parseInt(s.substr(i, 2), 16));
    return new Uint8Array(out);
  }

  /* 造一个最小可用的 EDID（用于模板生成的兜底） */
  function minimalEDID(opts) {
    return buildEDID(opts || {
      interfaceKey: 'hdmi20', manufacturer: 'AAA', productCode: '0001', serial: '1',
      monitorName: 'Template', bitDepth: 8, extCount: 1
    });
  }

  var TEMPLATES = [
    {
      id: 'hdmi-2.1-8k60', name: 'HDMI 2.1 7680x4320@60Hz', interface: 'HDMI 2.1',
      description: '8K60 走 VIC 208，FRL 48G（12G×4），带 HDR 与 BT.2020 声明',
      build: function () {
        var b = buildEDID({
          interfaceKey: 'hdmi21', manufacturer: 'VSA', productCode: '0001', serial: '1',
          monitorName: 'HDMI 8K60', widthCm: 80, heightCm: 45, bitDepth: 8,
          extCount: 2, maxPixelClock: 2400, maxVRate: 120,
          timing: deriveTiming(TIMING_PRESETS[19]), bt2020: true, ycbcr444: true,
          vics: [{ vic: 208, native: true }]
        });
        return b;
      }
    },
    {
      id: 'hdmi-2.1-4k120', name: 'HDMI 2.1 3840x2160@120Hz', interface: 'HDMI 2.1',
      description: '4K120 走 VIC 217，FRL 40G，带 SCDC 与 4:4:4',
      build: function () {
        return buildEDID({
          interfaceKey: 'hdmi21', manufacturer: 'VSA', productCode: '0002', serial: '2',
          monitorName: 'HDMI 4K120', widthCm: 60, heightCm: 34, bitDepth: 8,
          extCount: 2, maxPixelClock: 1200, maxVRate: 120,
          timing: deriveTiming(TIMING_PRESETS[16]),
          vics: [{ vic: 217, native: true }]
        });
      }
    },
    {
      id: 'hdmi-2.0-4k60', name: 'HDMI 2.0 3840x2160@60Hz', interface: 'HDMI 2.0',
      description: '4K60 TMDS，18 Gbps，SCDC 存在',
      build: function () {
        return buildEDID({
          interfaceKey: 'hdmi20', manufacturer: 'VSA', productCode: '0003', serial: '3',
          monitorName: 'HDMI 4K60', widthCm: 60, heightCm: 34, bitDepth: 8,
          extCount: 1, maxPixelClock: 600, maxVRate: 60,
          timing: deriveTiming(TIMING_PRESETS[15]),
          vics: [{ vic: 16, native: true }]
        });
      }
    },
    {
      id: 'hdmi-1.4-1080p', name: 'HDMI 1.4 1920x1080@60Hz', interface: 'HDMI 1.4',
      description: '1080p60 基础模板，最常见的 HDMI EDID 形态',
      build: function () {
        return buildEDID({
          interfaceKey: 'hdmi14', manufacturer: 'VSA', productCode: '0004', serial: '4',
          monitorName: 'HDMI 1080p', widthCm: 48, heightCm: 27, bitDepth: 8,
          extCount: 1, maxPixelClock: 170, maxVRate: 60,
          timing: deriveTiming(TIMING_PRESETS[7]),
          vics: [{ vic: 4, native: true }]
        });
      }
    },
    {
      id: 'dp-1.4-8k30', name: 'DisplayPort 1.4 7680x4320@30Hz', interface: 'DP 1.4',
      description: '8K30 走 DSC，HBR3 4 lane',
      build: function () {
        return buildEDID({
          interfaceKey: 'dp14', manufacturer: 'VSA', productCode: '0005', serial: '5',
          monitorName: 'DP 8K30', widthCm: 80, heightCm: 45, bitDepth: 8,
          extCount: 2, maxPixelClock: 1200, maxVRate: 60,
          timing: deriveTiming(TIMING_PRESETS[18])
        });
      }
    },
    {
      id: 'dp-1.2-4k30', name: 'DisplayPort 1.2 3840x2160@30Hz', interface: 'DP 1.2',
      description: '4K30 HBR2 基础模板',
      build: function () {
        return buildEDID({
          interfaceKey: 'dp12', manufacturer: 'VSA', productCode: '0006', serial: '6',
          monitorName: 'DP 4K30', widthCm: 60, heightCm: 34, bitDepth: 8,
          extCount: 1, maxPixelClock: 300, maxVRate: 60,
          timing: deriveTiming(TIMING_PRESETS[14])
        });
      }
    },
    {
      id: 'dvi-1080p', name: 'DVI 1920x1080@60Hz', interface: 'DVI',
      description: 'DVI 双链路 1080p60',
      build: function () {
        return buildEDID({
          interfaceKey: 'dvi', manufacturer: 'VSA', productCode: '0007', serial: '7',
          monitorName: 'DVI 1080p', widthCm: 48, heightCm: 27, bitDepth: 8,
          extCount: 1, maxPixelClock: 170, maxVRate: 60,
          timing: deriveTiming(TIMING_PRESETS[7])
        });
      }
    },
    {
      id: 'vga-640x480', name: 'VGA 640x480@60Hz', interface: 'VGA',
      description: '模拟接口，128 字节基础块，无扩展块',
      build: function () {
        return buildEDID({
          interfaceKey: 'vga', manufacturer: 'VSA', productCode: '0008', serial: '8',
          monitorName: 'VGA 640x480', widthCm: 32, heightCm: 24, bitDepth: 8,
          extCount: 0, maxPixelClock: 80, maxVRate: 60,
          timing: deriveTiming(TIMING_PRESETS[0])
        });
      }
    }
  ];

  function templateById(id) {
    for (var i = 0; i < TEMPLATES.length; i++) if (TEMPLATES[i].id === id) return TEMPLATES[i];
    return null;
  }

  function buildTemplate(id) {
    var t = templateById(id);
    if (!t) return null;
    var b = t.build();
    refreshChecksums(b);
    return b;
  }

  /* ======================================================================
     八、导出格式
     ====================================================================== */

  /* Intel HEX（:LLAAAATT<data><checksum>） */
  function toIntelHex(bytes) {
    var lines = [];
    for (var i = 0; i < bytes.length; i += 16) {
      var chunk = Array.prototype.slice.call(bytes, i, i + 16);
      var len = chunk.length;
      var addr = i & 0xFFFF;
      var rec = [len, (addr >> 8) & 0xFF, addr & 0xFF, 0x00].concat(chunk);
      var sum = 0;
      rec.forEach(function (v) { sum += v; });
      rec.push((256 - (sum % 256)) % 256);
      lines.push(':' + rec.map(function (v) {
        return ('0' + v.toString(16).toUpperCase()).slice(-2);
      }).join(''));
    }
    lines.push(':00000001FF');
    return lines.join('\n') + '\n';
  }

  /* hexdump 视图（偏移 + HEX + | ASCII |） */
  function toHexDump(bytes) {
    var lines = [];
    for (var i = 0; i < bytes.length; i += 16) {
      var chunk = Array.prototype.slice.call(bytes, i, i + 16);
      var hex = chunk.map(function (v) {
        return ('0' + v.toString(16).toUpperCase()).slice(-2);
      });
      while (hex.length < 16) hex.push('  ');
      var ascii = chunk.map(function (v) {
        return (v >= 32 && v <= 126) ? String.fromCharCode(v) : '.';
      }).join('');
      lines.push('0x' + ('0000' + i.toString(16).toUpperCase()).slice(-4) + ': ' +
        hex.slice(0, 8).join(' ') + '  ' + hex.slice(8).join(' ') + '  |' + ascii + '|');
    }
    return lines.join('\n');
  }

  /* 逗号分隔的大写 hex */
  function toCommaHex(bytes) {
    var parts = [];
    for (var i = 0; i < bytes.length; i += 16) {
      var chunk = Array.prototype.slice.call(bytes, i, i + 16);
      parts.push(chunk.map(function (v) {
        return ('0' + v.toString(16).toUpperCase()).slice(-2);
      }).join(', '));
    }
    return parts.join('\n');
  }

  /* 空格分隔的连续 hex */
  function toSpaceHex(bytes) {
    var out = [];
    for (var i = 0; i < bytes.length; i++) {
      out.push(('0' + bytes[i].toString(16).toUpperCase()).slice(-2));
    }
    return out.join(' ');
  }

  /* ======================================================================
     九、导入辅助
     ====================================================================== */

  /* 解析 Intel HEX（未覆盖的地址补 0xFF） */
  function parseIntelHex(text) {
    var map = {};
    var maxAddr = 0;
    var lines = String(text || '').split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line || line.charAt(0) !== ':') continue;
      var bytes = hexToBytes(line.slice(1));
      if (bytes.length < 5) continue;
      var len = bytes[0];
      var addr = (bytes[1] << 8) | bytes[2];
      var type = bytes[3];
      if (type === 1) break;                 /* EOF */
      if (type !== 0) continue;             /* 只处理数据记录 */
      for (var k = 0; k < len; k++) {
        var a = addr + k;
        map[a] = bytes[4 + k];
        if (a > maxAddr) maxAddr = a;
      }
    }
    if (!maxAddr) return new Uint8Array(0);
    var out = new Uint8Array(maxAddr + 1).fill(0xFF);
    Object.keys(map).forEach(function (a) { out[+a] = map[a]; });
    return out;
  }

  /* 判断一段文本是二进制 EDID 还是 hex 文本 */
  function looksLikeBinaryEdid(bytes) {
    if (!bytes || bytes.length < 8) return false;
    for (var i = 0; i < 8; i++) {
      if (bytes[i] !== [0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x00][i]) return false;
    }
    return true;
  }

  /* 从任意文本里抽出 hex 对 */
  function extractHexPairs(text) {
    var s = String(text || '');
    if (/^:[0-9A-Fa-f]+/m.test(s)) return toIntelHex(s);
    var m = s.match(/0x[0-9A-Fa-f]{2}/g);
    if (m && m.length >= 32) {
      return m.map(function (x) { return x.slice(2); }).join('');
    }
    var pairs = s.match(/\b[0-9A-Fa-f]{2}\b/g);
    if (pairs && pairs.length >= 32) return pairs.join('');
    var clean = s.replace(/[^0-9A-Fa-f]/g, '');
    if (clean.length >= 64) return clean;
    return '';
  }

  /* ======================================================================
     十、导出 API
     ====================================================================== */

  global.EDIDToolkit = {
    BLOCK_SIZE: BLOCK_SIZE,
    MAX_EXTENSIONS: MAX_EXTENSIONS,
    BASE_REGIONS: BASE_REGIONS,
    DESCRIPTOR_TYPES: DESCRIPTOR_TYPES,
    INTERFACES: INTERFACES,
    ESTABLISHED: ESTABLISHED,
    TIMING_PRESETS: TIMING_PRESETS,
    ASPECT_CODES: ASPECT_CODES,
    BIT_DEPTH_CODES: BIT_DEPTH_CODES,

    regionAt: regionAt,
    layout: layout,
    readDescriptor: readDescriptor,
    writeTextDescriptor: writeTextDescriptor,

    refreshChecksums: refreshChecksums,
    checksumStatus: checksumStatus,
    normalizeLength: normalizeLength,
    setByte: setByte,
    toggleBit: toggleBit,
    readBits: readBits,
    writeBits: writeBits,

    interfaceByKey: interfaceByKey,
    deriveTiming: deriveTiming,
    packDTD: packDTD,
    buildEDID: buildEDID,
    buildCEAExtension: buildCEAExtension,

    TEMPLATES: TEMPLATES,
    templateById: templateById,
    buildTemplate: buildTemplate,
    minimalEDID: minimalEDID,

    toIntelHex: toIntelHex,
    toHexDump: toHexDump,
    toCommaHex: toCommaHex,
    toSpaceHex: toSpaceHex,

    hexToBytes: hexToBytes,
    parseIntelHex: parseIntelHex,
    looksLikeBinaryEdid: looksLikeBinaryEdid,
    extractHexPairs: extractHexPairs
  };
})(typeof window !== 'undefined' ? window : this);
