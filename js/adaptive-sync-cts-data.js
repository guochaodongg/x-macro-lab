/* =============================================================================
 * adaptive-sync-cts-data.js — Technology Blog 第六篇文章：
 *      VESA Adaptive-Sync Display CTS（认证测试规范）r1.1 技术解析
 *      （纯数据，无逻辑、不碰 DOM）
 *
 * 数据来源：VESA Adaptive-Sync Display Certification Test Specification
 *           Revision 1.1（VESA，2023-05-19，89 页）
 *           规范发布页：https://www.vesa.org/
 *
 * 本文件按「新增文章只需往 BLOGData.posts 里加一条」的约定，在
 * display-tech-compilation-data.js 之后加载，把文章对象 push 进 BLOGData.posts，
 * 并把本篇专用的内联 SVG 注册进 BLOGData.figures。
 *
 * 版权说明：本篇是面向中文读者的**学习性原理整理**，非规范官方译文，也不转载
 * 规范原文的表格与插图；所有示意图均按规范描述的机理重绘（纯内联 SVG，
 * 不请求任何外部资源）。规范原文以 VESA 发布的 Adaptive-Sync Display CTS r1.1 为准，
 * 商业使用需遵循 VESA 的会员与采纳条款。
 * ========================================================================== */
(function (window) {
  'use strict';

  var D = window.BLOGData;
  if (!D || !D.posts || !D.figures) return;

  /* ------------------------------------------------------------- 示意图 SVG */
  /* 全部内联绘制，颜色走 CSS 变量，因此自动跟随明/暗主题，且不请求任何外部资源。 */
  var FIGURES = {

    /* 两个认证等级：MediaSync（媒体同步）vs AdaptiveSync（自适应同步，带速率档位） */
    tierCompare:
      '<svg class="bl-fig-svg" viewBox="0 0 640 232" role="img" aria-label="MediaSync 与 AdaptiveSync 两个认证等级对比">' +
      '<rect x="0" y="0" width="640" height="232" fill="var(--surface-2)"/>' +
      '<text x="16" y="26" fill="var(--text-soft)" font-size="12" font-weight="600">VESA CERTIFIED 两个显示认证等级：面向媒体 vs 面向游戏</text>' +
      /* MediaSync 卡片 */
      '<rect x="14" y="44" width="296" height="172" rx="10" fill="var(--surface)" stroke="var(--accent)"/>' +
      '<text x="162" y="70" fill="var(--accent)" font-size="13" font-weight="700" text-anchor="middle">MediaSync Display</text>' +
      '<text x="30" y="94" fill="var(--text-dim)" font-size="10.5">定位：保障媒体播放的高质量</text>' +
      '<text x="30" y="118" fill="var(--text)" font-size="11">刷新率下限 ≤ 48 Hz</text>' +
      '<text x="30" y="138" fill="var(--text)" font-size="11">刷新率上限 ≥ 60 Hz</text>' +
      '<text x="30" y="158" fill="var(--text)" font-size="11">消除丢帧 / 3:2 pulldown 抖动</text>' +
      '<text x="30" y="178" fill="var(--text)" font-size="11">FlickerMAX ≤ -50 dB</text>' +
      '<text x="30" y="200" fill="var(--text-dim)" font-size="10.5">无速率档位标识（单一 logo）</text>' +
      /* AdaptiveSync 卡片 */
      '<rect x="330" y="44" width="296" height="172" rx="10" fill="var(--surface)" stroke="var(--key)"/>' +
      '<text x="478" y="70" fill="var(--key)" font-size="13" font-weight="700" text-anchor="middle">AdaptiveSync Display</text>' +
      '<text x="346" y="94" fill="var(--text-dim)" font-size="10.5">定位：游戏 + 低延迟 + 高质量媒体</text>' +
      '<text x="346" y="118" fill="var(--text)" font-size="11">刷新率下限 ≤ 60 Hz</text>' +
      '<text x="346" y="138" fill="var(--text)" font-size="11">刷新率上限 ≥ 144 Hz（带档位）</text>' +
      '<text x="346" y="158" fill="var(--text)" font-size="11">额外：64 项 G2G 均值 ≤ 5 ms</text>' +
      '<text x="346" y="178" fill="var(--text)" font-size="11">FlickerMAX ≤ -50 dB</text>' +
      '<text x="346" y="200" fill="var(--text-dim)" font-size="10.5">档位随出厂默认分辨率可达速率（如 144/240）</text>' +
      '</svg>',

    /* Delta-PQ 容差表：用色块网格重现 Table 2-2（From 行 × To 列）；透明度越深 = 容差越宽 */
    deltaPQHeat:
      '<svg class="bl-fig-svg" viewBox="0 0 640 300" role="img" aria-label="Delta-PQ 过冲欠冲容差网格">' +
      '<rect x="0" y="0" width="640" height="300" fill="var(--surface-2)"/>' +
      '<text x="16" y="24" fill="var(--text-soft)" font-size="12" font-weight="600">Delta-PQ 容差表（10-bit PQ 单位）：行=起始灰阶，列=结束灰阶</text>' +
      '<text x="16" y="42" fill="var(--text-dim)" font-size="9.5">空白格为规范未给容差（起止相同，或结束于 0/31）。色块越深（透明度越高）= 容差越宽。</text>' +
      /* 网格 9 行 9 列，左上角留给坐标轴，单元 60×26，起点 x=70 y=56；用单一 var(--accent) 的 fill-opacity 表达容差大小 */
      cell(0,0,0.18,'18') + cell(0,1,0.18,'18') + cell(0,2,0.18,'18') + cell(0,3,0.18,'18') + cell(0,4,0.18,'18') + cell(0,5,0.18,'18') + cell(0,6,0.18,'15') +
      cell(1,0,0.18,'15') + cell(1,1,0.18,'15') + cell(1,2,0.18,'18') + cell(1,3,0.18,'18') + cell(1,4,0.18,'18') + cell(1,5,0.18,'18') + cell(1,6,0.30,'10') +
      cell(2,0,0.30,'13') + cell(2,1,0.18,'15') + cell(2,2,0.18,'15') + cell(2,3,0.18,'15') + cell(2,4,0.18,'18') + cell(2,5,0.30,'10') +
      cell(3,0,0.48,'20') + cell(3,1,0.30,'10') + cell(3,2,0.18,'15') + cell(3,3,0.18,'15') + cell(3,4,0.18,'15') + cell(3,5,0.30,'10') +
      cell(4,0,0.48,'20') + cell(4,1,0.48,'20') + cell(4,2,0.30,'10') + cell(4,3,0.30,'10') + cell(4,4,0.30,'10') + cell(4,5,0.30,'10') +
      cell(5,0,0.48,'20') + cell(5,1,0.48,'20') + cell(5,2,0.18,'15') + cell(5,3,0.36,'8') + cell(5,4,0.30,'10') + cell(5,5,0.30,'10') +
      cell(6,0,0.72,'30') + cell(6,1,0.48,'20') + cell(6,2,0.48,'20') + cell(6,3,0.30,'13') + cell(6,4,0.36,'8') + cell(6,5,0.30,'10') +
      cell(7,0,0.72,'30') + cell(7,1,0.48,'20') + cell(7,2,0.48,'20') + cell(7,3,0.48,'20') + cell(7,4,0.36,'12') + cell(7,5,0.18,'5') +
      cell(8,0,0.72,'30') + cell(8,1,0.72,'30') + cell(8,2,0.48,'20') + cell(8,3,0.48,'20') + cell(8,4,0.30,'10') + cell(8,5,0.30,'10') +
      '<text x="16" y="74" fill="var(--text-dim)" font-size="10">From ＼ To</text>' +
      axis(0,'0') + axis(1,'31') + axis(2,'63') + axis(3,'95') + axis(4,'127') + axis(5,'159') + axis(6,'191') + axis(7,'223') + axis(8,'255') +
      '<text x="70" y="284" fill="var(--text-dim)" font-size="9.5">0 31 63 95 127 159 191 223 255（To 列；结束于 0/31 的格子规范未给容差）</text>' +
      '</svg>',

    /* 测试顺序流程：非 HDR-1000+ 与 HDR-1000+ 两条路径 */
    warmupFlow:
      '<svg class="bl-fig-svg" viewBox="0 0 640 220" role="img" aria-label="认证测试顺序流程">' +
      '<rect x="0" y="0" width="640" height="220" fill="var(--surface-2)"/>' +
      '<text x="16" y="24" fill="var(--text-soft)" font-size="12" font-weight="600">必需测试顺序（§5.3）：预热 → 静态闪烁 → 可变闪烁 → …</text>' +
      /* 左：普通显示 */
      '<text x="20" y="50" fill="var(--text-dim)" font-size="10.5">MaxLuminance &lt; 1000 cd/m²</text>' +
      box(20,60,'1 预热 1 小时（灰 127 / 40 cd/m²）') +
      box(20,98,'2 静态闪烁') + box(20,136,'3 可变闪烁') + box(20,174,'4 G2G（表 7-1）') +
      '<text x="20" y="212" fill="var(--text-dim)" font-size="9.5">5 丢帧 → 6 抖动 → 7（若支持）HDR</text>' +
      /* 右：HDR-1000+ 显示 */
      '<text x="350" y="50" fill="var(--text-dim)" font-size="10.5">MaxLuminance ≥ 1000 cd/m²</text>' +
      box(350,60,'1 预热 1 小时') + box(350,98,'2 静态闪烁') + box(350,136,'3 可变闪烁') + box(350,174,'4 丢帧') +
      '<text x="350" y="212" fill="var(--text-dim)" font-size="9.5">5 抖动 → 6 高亮预热 20min → 7 高亮 G2G（表 7-2）→ 8 HDR</text>' +
      '</svg>',

    /* 四种可变刷新率扫频模式 */
    flickerSweep:
      '<svg class="bl-fig-svg" viewBox="0 0 640 250" role="img" aria-label="四种可变刷新率扫频模式">' +
      '<rect x="0" y="0" width="640" height="250" fill="var(--surface-2)"/>' +
      '<text x="16" y="24" fill="var(--text-soft)" font-size="12" font-weight="600">可变刷新率闪烁测试：四种扫频模式</text>' +
      wave(20,60,'Zigzag 扫频','每整数 Hz 一帧，逐 Hz 升到上限再降回') +
      wave(330,60,'SquareWave 扫频','250ms 上限帧 + 250ms 下限帧交替（方波）') +
      wave(20,150,'SineWave 扫频','正弦曲线平滑升降，越靠中频变化越快') +
      wave(330,150,'Random 随机','最小-最大间随机帧时长（高可变）') +
      '</svg>',

    /* 9×9 G2G 矩阵 + 过冲/欠冲概念 */
    g2gGrid:
      '<svg class="bl-fig-svg" viewBox="0 0 640 250" role="img" aria-label="9×9 G2G 测试矩阵与过冲欠冲">' +
      '<rect x="0" y="0" width="640" height="250" fill="var(--surface-2)"/>' +
      '<text x="16" y="24" fill="var(--text-soft)" font-size="12" font-weight="600">G2G 9×9 矩阵：9 个灰阶 × 8 个目标 = 64 项过渡（排除起止相同与结束于 0/31）</text>' +
      /* 矩阵 9×9，左上角坐标轴，单元 22×20，起点 x=90 y=44 */
      gcell(0,0,'0') + gcell(1,0,'31') + gcell(2,0,'63') + gcell(3,0,'95') + gcell(4,0,'127') + gcell(5,0,'159') + gcell(6,0,'191') + gcell(7,0,'223') + gcell(8,0,'255') +
      gcell(0,1,'31') + gcell(1,1,'63') + gcell(2,1,'95') + gcell(3,1,'127') + gcell(4,1,'159') + gcell(5,1,'191') + gcell(6,1,'223') + gcell(7,1,'255') + gcell(8,1,'0') +
      gcell(0,2,'63') + gcell(1,2,'95') + gcell(2,2,'127') + gcell(3,2,'159') + gcell(4,2,'191') + gcell(5,2,'223') + gcell(6,2,'255') + gcell(7,2,'0') + gcell(8,2,'31') +
      gcell(0,3,'95') + gcell(1,3,'127') + gcell(2,3,'159') + gcell(3,3,'191') + gcell(4,3,'223') + gcell(5,3,'255') + gcell(6,3,'0') + gcell(7,3,'31') + gcell(8,3,'63') +
      gcell(0,4,'127') + gcell(1,4,'159') + gcell(2,4,'191') + gcell(3,4,'223') + gcell(4,4,'255') + gcell(5,4,'0') + gcell(6,4,'31') + gcell(7,4,'63') + gcell(8,4,'95') +
      gcell(0,5,'159') + gcell(1,5,'191') + gcell(2,5,'223') + gcell(3,5,'255') + gcell(4,5,'0') + gcell(5,5,'31') + gcell(6,5,'63') + gcell(7,5,'95') + gcell(8,5,'127') +
      gcell(0,6,'191') + gcell(1,6,'223') + gcell(2,6,'255') + gcell(3,6,'0') + gcell(4,6,'31') + gcell(5,6,'63') + gcell(6,6,'95') + gcell(7,6,'127') + gcell(8,6,'159') +
      gcell(0,7,'223') + gcell(1,7,'255') + gcell(2,7,'0') + gcell(3,7,'31') + gcell(4,7,'63') + gcell(5,7,'95') + gcell(6,7,'127') + gcell(7,7,'159') + gcell(8,7,'191') +
      gcell(0,8,'255') + gcell(1,8,'0') + gcell(2,8,'31') + gcell(3,8,'63') + gcell(4,8,'95') + gcell(5,8,'127') + gcell(6,8,'159') + gcell(7,8,'191') + gcell(8,8,'223') +
      '<text x="16" y="232" fill="var(--text-dim)" font-size="9.5">64 项 10→90% 过渡时间取均值 ≤ 5 ms（仅 AdaptiveSync）；其中 56 项测过冲/欠冲 ≤ Delta-PQ 容差</text>' +
      '</svg>',

    /* 丢帧测试图样：移动白框 + 黑基线 */
    frameDropPattern:
      '<svg class="bl-fig-svg" viewBox="0 0 640 210" role="img" aria-label="视频丢帧测试图样">' +
      '<rect x="0" y="0" width="640" height="210" fill="var(--surface-2)"/>' +
      '<text x="16" y="24" fill="var(--text-soft)" font-size="12" font-weight="600">丢帧测试：1 秒长曝光捕捉移动白框序列；黑横线提供「缺失帧」判据基线</text>' +
      '<rect x="40" y="44" width="560" height="120" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<rect x="52" y="56" width="40" height="96" fill="var(--surface)" stroke="var(--mark)"/>' +
      '<rect x="104" y="56" width="40" height="96" fill="var(--surface)" stroke="var(--mark)"/>' +
      '<rect x="156" y="56" width="40" height="96" fill="var(--surface)" stroke="var(--mark)"/>' +
      '<rect x="208" y="56" width="40" height="96" fill="var(--surface)" stroke="var(--mark)"/>' +
      '<rect x="260" y="56" width="40" height="96" fill="var(--surface)" stroke="var(--mark)"/>' +
      '<rect x="312" y="56" width="40" height="96" fill="var(--surface)" stroke="var(--mark)"/>' +
      '<rect x="364" y="56" width="40" height="96" fill="var(--surface)" stroke="var(--mark)"/>' +
      '<rect x="416" y="56" width="40" height="96" fill="var(--surface)" stroke="var(--mark)"/>' +
      '<rect x="468" y="56" width="40" height="96" fill="var(--surface)" stroke="var(--mark)"/>' +
      '<rect x="520" y="56" width="40" height="96" fill="var(--surface)" stroke="var(--mark)"/>' +
      '<text x="52" y="92" fill="var(--accent)" font-size="9" text-anchor="middle">框</text>' +
      '<text x="540" y="92" fill="var(--accent)" font-size="9" text-anchor="middle">框</text>' +
      '<rect x="40" y="170" width="560" height="10" fill="var(--border-strong)"/>' +
      '<text x="16" y="200" fill="var(--text-dim)" font-size="9.5">白框逐帧平移、互不重叠填满 1 秒；若某格亮度与黑基线一致=丢帧（失败），略亮=暗帧（通过）</text>' +
      '</svg>',

    /* 抖动判定：两张图差分法 */
    jitterDiff:
      '<svg class="bl-fig-svg" viewBox="0 0 640 220" role="img" aria-label="抖动判定双图差分法">' +
      '<rect x="0" y="0" width="640" height="220" fill="var(--surface-2)"/>' +
      '<text x="16" y="24" fill="var(--text-soft)" font-size="12" font-weight="600">抖动判定：同测试拍两张图 → 图层「差值」混合 → 仅抖动处显形</text>' +
      '<rect x="40" y="44" width="180" height="130" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<rect x="70" y="74" width="120" height="70" fill="var(--surface-2)"/>' +
      '<text x="130" y="114" fill="var(--text-dim)" font-size="10" text-anchor="middle">图 A（中灰）</text>' +
      '<rect x="260" y="44" width="180" height="130" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<rect x="290" y="74" width="120" height="70" fill="var(--surface-2)"/>' +
      '<text x="350" y="114" fill="var(--text-dim)" font-size="10" text-anchor="middle">图 B（中灰）</text>' +
      '<rect x="480" y="44" width="120" height="130" fill="var(--surface)" stroke="var(--key)"/>' +
      '<rect x="498" y="62" width="20" height="20" fill="var(--mark)"/>' +
      '<rect x="548" y="120" width="20" height="20" fill="var(--mark)"/>' +
      '<text x="540" y="114" fill="var(--key)" font-size="10" text-anchor="middle">差分</text>' +
      '<text x="16" y="200" fill="var(--text-dim)" font-size="9.5">两图完全一致则差分为纯黑；出现亮/暗方块即抖动。按 Table 9-2 允许偏差，≥3 个区超界判失败</text>' +
      '</svg>',

    /* HDR 下提升 PWM 占空比以读出方波信号 */
    hdrDuty:
      '<svg class="bl-fig-svg" viewBox="0 0 640 200" role="img" aria-label="HDR 模式提升 PWM 占空比">' +
      '<rect x="0" y="0" width="640" height="200" fill="var(--surface-2)"/>' +
      '<text x="16" y="24" fill="var(--text-soft)" font-size="12" font-weight="600">HDR 模式 PWM 背光：提高亮度使占空比更大，方波测试信号更易读出</text>' +
      /* 低占空比方波（难读） */
      '<text x="40" y="52" fill="var(--text-dim)" font-size="10">低占空比（难读）</text>' +
      '<rect x="40" y="62" width="40" height="40" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<rect x="86" y="62" width="120" height="40" fill="var(--accent)"/>' +
      '<rect x="212" y="62" width="40" height="40" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<rect x="258" y="62" width="120" height="40" fill="var(--accent)"/>' +
      /* 高占空比（易读） */
      '<text x="40" y="132" fill="var(--text-dim)" font-size="10">提高亮度后占空比更大（易读）</text>' +
      '<rect x="40" y="142" width="120" height="40" fill="var(--accent)"/>' +
      '<rect x="166" y="142" width="40" height="40" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<rect x="212" y="142" width="120" height="40" fill="var(--accent)"/>' +
      '<rect x="338" y="142" width="40" height="40" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '</svg>'
  };

  /* 小工具：Delta-PQ 网格单元（用单一 var(--accent) 的 fill-opacity 表达容差大小） */
  function cell(r, c, op, val) {
    var x = 70 + c * 60, y = 56 + r * 26;
    return '<rect x="' + x + '" y="' + y + '" width="60" height="26" fill="var(--accent)" fill-opacity="' + op + '" stroke="var(--border-strong)"/>' +
      '<text x="' + (x + 30) + '" y="' + (y + 17) + '" fill="var(--text)" font-size="11" text-anchor="middle">' + val + '</text>';
  }
  function axis(r, label) {
    var y = 56 + r * 26;
    return '<text x="14" y="' + (y + 17) + '" fill="var(--text)" font-size="9">' + label + '</text>';
  }
  /* 小工具：G2G 网格单元 */
  function gcell(r, c, val) {
    var x = 90 + c * 22, y = 44 + r * 20;
    return '<rect x="' + x + '" y="' + y + '" width="22" height="20" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="' + (x + 11) + '" y="' + (y + 14) + '" fill="var(--text)" font-size="8" text-anchor="middle">' + val + '</text>';
  }
  function box(x, y, txt) {
    return '<rect x="' + x + '" y="' + y + '" width="300" height="30" rx="7" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="' + (x + 12) + '" y="' + (y + 20) + '" fill="var(--text-soft)" font-size="10">' + txt + '</text>';
  }
  function wave(x, y, title, sub) {
    return '<rect x="' + x + '" y="' + y + '" width="290" height="78" rx="8" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="' + (x + 12) + '" y="' + (y + 20) + '" fill="var(--accent)" font-size="10.5" font-weight="600">' + title + '</text>' +
      '<text x="' + (x + 12) + '" y="' + (y + 38) + '" fill="var(--text-dim)" font-size="9">' + sub + '</text>' +
      '<polyline points="' + (x + 12) + ',' + (y + 64) + ' ' + (x + 70) + ',' + (y + 64) + ' ' + (x + 90) + ',' + (y + 50) + ' ' + (x + 140) + ',' + (y + 64) + ' ' + (x + 200) + ',' + (y + 64) + ' ' + (x + 220) + ',' + (y + 50) + ' ' + (x + 278) + ',' + (y + 64) + '" fill="none" stroke="var(--key)" stroke-width="2"/>';
  }

  /* ------------------------------------------------------------- 术语表 */
  var GLOSSARY = [
    ['AdaptiveSync', 'VESA 认证等级名（无连字符/无空格）', 'VESA CERTIFIED AdaptiveSync 显示认证项目的专有名词，也用作带速率档位（如 144/240）的等级标识。'],
    ['Adaptive-Sync', '形容词/功能（带连字符）', '描述可变刷新率功能或子项，如 DisplayID 中的 Adaptive-Sync 数据块、Adaptive-Sync SDP、Adaptive-Sync operation。'],
    ['MediaSync', '媒体同步认证等级', '与 AdaptiveSync 并列的两个认证项目之一，面向媒体播放，无速率档位。'],
    ['VRR', 'Variable Refresh Rate，可变刷新率', '显示控制器按源设备实际帧率动态调整刷新率的机制，是 Adaptive-Sync 的核心能力。'],
    ['Adaptive-Sync operation', '自适应同步运行机制', '显示器按源设备逐帧变化的视频帧时长来匹配刷新，从而消除撕裂与卡顿的运行机制。'],
    ['G2G', 'Gray-to-Gray，灰阶响应', 'SDR 模式下显示硬件从一个亮度电平过渡到另一个所需时间，本规范以 10→90% 过渡计。'],
    ['Overdrive', '过驱', '为加速 G2G 过渡而施加的预校正驱动，代价是可能引入过冲/欠冲等可见瑕疵。'],
    ['Overshoot', '过冲', 'G2G 过渡中亮度超过目标电平的部分，以 10-bit Delta-PQ 容差约束。'],
    ['Undershoot', '欠冲', 'G2G 过渡中亮度低于目标电平的部分，同样以 Delta-PQ 容差约束。'],
    ['Delta-PQ', '过冲/欠冲的 PQ 偏差量', '用 10-bit PQ 码值表示的过冲/欠冲幅度（ITU-R BT.2246-5 Barten 模型），用于比对容差表。'],
    ['FlickerMAX', 'JEITA 闪烁上限', '按 IEC 61747-30-1 定义的闪烁计算值（dB），两个等级均要求 ≤ -50 dB。'],
    ['VBlank', 'Vertical Blanking，垂直消隐', '一帧像素数据结束后到下一帧开始前的行数区间，Adaptive-Sync 借其伸缩实现可变刷新率。'],
    ['VTotal', 'Vertical Total，垂直总数', '主视频流按行计数的垂直总量，等于一帧的总行数。'],
    ['DisplayID', '显示识别数据（VESA）', 'VESA 推荐并现行使用的显示描述结构，替代旧的 EDID/E-EDID。'],
    ['EDID', '扩展显示识别数据（legacy）', '旧的 VESA 显示描述结构（含 E-EDID），已被 DisplayID 取代，旧设备仍可用其替代 DisplayID。'],
    ['MaxLuminance', '最大峰值亮度', 'DisplayID/EDID 变量，指屏幕中心 10% 白窗口、至少持续 30 分钟可达到的峰值亮度。'],
    ['APL', 'Average Picture Level，平均图像电平', '一幅画面内所有像素的平均亮度电平。'],
    ['SDR', 'Standard Dynamic Range，标准动态范围', '颜色与亮度接近 ITU-R BT.709 定义的普通显示模式。'],
    ['HDR', 'High Dynamic Range，高动态范围', '超出普通显示的颜色与亮度范围，使用 SMPTE ST 2084（PQ）EOTF。'],
    ['PQ', 'Perceptual Quantizer，感知量化', 'SMPTE ST 2084 的 EOTF，以符合人眼感知的方式编码 HDR 亮度。'],
    ['EOTF', 'Electro-Optical Transfer Function，电光转换函数', '把电信号码值映射为显示光输出的函数，HDR 用 PQ。'],
    ['JEITA flicker', 'JEITA 闪烁测量法', '以 0.5 Hz 步进、3–65 Hz 范围采样屏幕亮度波动来量化闪烁的方法。'],
    ['DUT', 'Display Under Test，被测显示设备', '接受认证测试的目标显示器/面板。'],
    ['PSR', 'Panel Self Refresh，面板自刷新', 'eDP 功能：面板在源空闲时自刷新；测试前需关闭以免干扰可变刷新率测量。'],
    ['Panel Replay', '面板回放', 'DP/eDP 的轻量回放机制；测试前同样建议关闭。'],
    ['KGL', 'Known Game List，已知游戏列表', 'Windows 中决定哪些应用可获 OS 级 VRR 的清单，测试工具需 KGL v2013+。'],
    ['eDP', 'embedded DisplayPort，嵌入式 DP', '用于笔记本/All-in-One 内部屏接的 DP 标准；其内部接口豁免外部接口认证。'],
    ['DisplayPort Alt Mode', 'DP 替代模式（USB-C）', 'USB-C 接口进入 DisplayPort 模式的规范，属规范认可的外部接口之一。'],
    ['USB4', 'USB4 规范', 'USB Implementers Forum 的规范，r1.1 认证中的外部接口来源之一。'],
    ['mDP', 'mini DisplayPort，迷你 DP', 'DP 标准的迷你连接器/端口，属规范认可的外部接口之一。'],
    ['SuccessiveFrameDuration Tolerance', '连续帧时长增减容差', 'DisplayID v2.x 可选字段，限制相邻帧时长的最大变化率，测试需在方波/随机测试中遵守。'],
    ['Spike-Noise', '尖峰噪声', 'OLED 帧同步复位、LCD 局部调光 PWM 等极短促、人眼不可见的亮度波动，分析时作为噪声剔除。'],
    ['Mura', '显示不均匀', '面板亮度/色度斑驳，其幅度常远大于抖动允许范围，需在抖动判定中区分。'],
    ['DSC', 'Display Stream Compression，显示流压缩', 'VESA 带宽压缩标准，用于驱动高分辨率高刷新率所需的链路带宽。']
  ];

  /* ---------------------------------------------------------------- 文章 */
  D.posts.push({
    id: 'adaptive-sync-cts',
    title: 'VESA Adaptive-Sync Display CTS 认证测试规范技术解析（r1.1）',
    titleEn: 'VESA Adaptive-Sync Display CTS r1.1 — Certification Test Specification Deep Dive',
    subtitle: '从两个认证等级（MediaSync / AdaptiveSync）的定位差异、测试环境搭建、闪烁与灰阶响应（G2G）' +
      '的逐条强制项，到丢帧、抖动判定与 HDR 模式测试：把一份 89 页的「显示器前屏性能合规测试规范」拆开读',
    category: '显示认证',
    tags: ['Adaptive-Sync', 'MediaSync', 'VRR', 'G2G', 'FlickerMAX', 'Delta-PQ', 'VESA CERTIFIED', 'CTS r1.1'],
    source: {
      name: 'VESA',
      label: 'Adaptive-Sync Display Certification Test Specification Revision 1.1（VESA，2023-05-19，89 页）',
      url: 'https://www.vesa.org/',
      note: '本篇是基于规范正文的学习性中文原理整理，非官方译文，也未转载规范原表格与插图；' +
        '数据以 VESA 发布的 Adaptive-Sync Display CTS r1.1 为准，产品合规请以规范原文与 VESA 认证流程为最终依据。'
    },
    license: 'Adaptive-Sync Display CTS 原文版权归 VESA 所有；本页为学习用途的中文原理整理，只复述机制与参数含义，' +
      '未转载规范原表格与插图，所有示意图均按规范描述重绘（纯内联 SVG）。',
    summary: 'VESA CERTIFIED **AdaptiveSync** 与 **MediaSync** 是 VESA 面向「可变刷新率（VRR）显示器前屏性能」' +
      '设立的开放认证项目，此前该领域没有公开的行业标准。Adaptive-Sync Display CTS r1.1（2023-05-19，89 页）' +
      '定义了认证所需的**测试判据、测试方法学与各性能档位的强制要求**，主要面向 PC 行业的显示器与笔记本，' +
      '但不排除其他屏幕尺寸与用途。本篇按规范正文顺序，从认证体系与两个等级的差异讲起，' +
      '依次拆解测试环境（温度、预热、仪器、软件、源设备）、OSD 标注强制项、认证与测试顺序，' +
      '以及刷新率/闪烁、灰阶响应（G2G）与过冲/欠冲、视频丢帧、视频抖动、HDR 模式这几类核心测试的判据与方法，' +
      '把每条强制项的动机与测量口径讲清，并对测试设备研发相关的点做专门提示。',
    glossary: GLOSSARY,
    chapters: [

      /* ======================================================== 01 概述与认证体系 */
      {
        id: 'overview',
        num: '01',
        title: '概述：为什么需要这份 CTS，以及它怎么组织',
        titleEn: 'Introduction: Why This CTS Exists and How It Is Organized',
        lead: '在显示器领域，针对 Adaptive-Sync / VRR 的前屏显示性能长期没有公开的行业标准。' +
          '这份 CTS 正是为了给 VESA CERTIFIED 的两个认证等级提供一套统一的测试口径而制定。',
        sections: [
          {
            id: 'purpose',
            title: '规范的定位与适用范围',
            titleEn: 'Purpose and Scope',
            blocks: [
              { t: 'p', v: '本规范定义了 **VESA CERTIFIED AdaptiveSync** 与 **MediaSync** 两个显示 logo 项目中，' +
                '各性能档位对应的测试判据、测试方法学与性能强制要求。它主要面向 PC 行业的显示器与笔记本，' +
                '但无意排除其它屏幕尺寸或用途。' },
              { t: 'p', v: '通过建立行业级、开放、公开的 VRR 显示器前屏性能规范，VESA 希望帮助用户在购买前识别' +
                '哪些显示器具备更高的性能能力。' },
              { t: 'callout', kind: 'key', title: '两个等级一句话区分',
                v: '**MediaSync** 面向媒体播放质量（消除丢帧与 3:2 pulldown 抖动，达到视觉无闪烁）；' +
                  '**AdaptiveSync** 在相似媒体收益之上，额外为游戏优化——要求足够大的可变帧率范围与低延迟。' }
            ]
          },
          {
            id: 'organization',
            title: '文档组织',
            titleEn: 'Document Organization',
            blocks: [
              { t: 'list', items: [
                ['§1 引言', '概述、缩略语、术语与参考文档'],
                ['§2 强制项摘要', '按等级差异与全等级通用两条线汇总所有强制项'],
                ['§3 测试环境', '温度、预热、仪器、软件、源设备、Adaptive-Sync 工作验证'],
                ['§4 OSD 相关强制项', '仅对带屏显菜单的显示器'],
                ['§5 认证', 'DP 接口认证前置、认证测试清单、HDR-1000+ 测试顺序'],
                ['§6–§10 各类测试', '刷新率/闪烁、G2G、丢帧、抖动、HDR'],
                ['附录 A/B/C', 'SDR Gamma 2.2 亮度表、系统 Gamma 计算、贡献者历史']
              ] },
              { t: 'callout', kind: 'info', title: '文本 / 图 / 表冲突以谁为准',
                v: '规范明确：当文本、图、表三者冲突时，优先级为 **表 → 图 → 文本**。引用具体数值时以表为准。' }
            ]
          },
          {
            id: 'conventions',
            title: '关键词与单位约定',
            titleEn: 'Keywords and Units of Measure',
            blocks: [
              { t: 'p', v: '规范用一组关键词区分强制级别：**shall** 表示强制；**should** 表示有优选方案的灵活选择；' +
                '**may** 表示无倾向的可选项；**optional** 表示非强制但一旦实现须按规范实现；**informative** 为说明性内容；' +
                '**N/A** 表示不适用。' },
              { t: 'table', head: ['关键词', '含义'],
                rows: [
                  ['shall', '强制要求，设计者必须实现以保证互通'],
                  ['should', '等价「推荐」，有首选方案但可灵活'],
                  ['may / optional', '可选项，optional 一旦实现须按规范实现'],
                  ['informative / N/A', '说明性内容 / 该字段不适用']
                ] },
              { t: 'p', v: '单位贯穿全文：cd/m²（亮度）、Hz（频率）、ms（毫秒）、°C/°F（温度）、dB（闪烁）、' +
                'fps（帧率）、%（百分比）、mm/in.（尺寸）。' }
            ]
          },
          {
            id: 'references',
            title: '参考文档',
            titleEn: 'Reference Documents',
            blocks: [
              { t: 'p', v: '本规范大量引用 VESA 自身标准（DisplayID、DP、eDP、DisplayHDR CTS、Adaptive-Sync Link CTS）' +
                '以及 CTA-861、SMPTE ST 2084、IEC 61966-2-1（sRGB）、CIE 1976、IEC 61747-30-1、' +
                'ITU-R BT.709 / BT.2246-5、USB4 等。用户应确保持有最新版本。' },
              { t: 'callout', kind: 'info', title: '与测试设备最相关的引用',
                v: '**IEC 61747-30-1**（JEITA 闪烁定义）、**SMPTE ST 2084**（PQ）、**IDMS**（信息显示测量标准，G2G 方法学）、' +
                  '以及 **VESA DisplayHDR CTS** 与 **Adaptive-Sync Link CTS**——它们共同构成显示器前屏性能认证的体系。' }
            ]
          }
        ]
      },

      /* ======================================================== 02 认证等级与强制项摘要 */
      {
        id: 'tiers',
        num: '02',
        title: '两个认证等级与强制项摘要',
        titleEn: 'Logo Performance Tiers and Mandate Summary',
        lead: '§2 把整份规范的强制项浓缩为两张表：一张按等级差异，一张全等级通用。' +
          '理解这两张表，就抓住了认证的物理意义。',
        sections: [
          {
            id: 'tier-position',
            title: 'MediaSync 与 AdaptiveSync 的定位',
            titleEn: 'Positioning of the Two Tiers',
            blocks: [
              { t: 'p', v: '**MediaSync Display** 等级旨在保证显示器满足面向媒体播放的高质量水平，' +
                '适用于最常见的 10 种视频帧率（23.976–60 Hz），消除视频丢帧、3:2 pulldown 抖动与其它抖动来源，' +
                '同时满足强制闪烁水平，使显示视觉上无闪烁。' },
              { t: 'p', v: '**AdaptiveSync** 等级为游戏优化，面向具备足够大可变帧率范围与低延迟的显示器，' +
                '同时对媒体播放也提供与 MediaSync 类似的收益。它带**速率档位标识**（如 AdaptiveSync Display144、Display240），' +
                '表示在出厂默认分辨率下 Adaptive-Sync operation 可达的最大视频帧率。' },
              { t: 'fig', id: 'tierCompare', caption: '两个认证等级对比：MediaSync（媒体）vs AdaptiveSync（游戏，带速率档位）' }
            ]
          },
          {
            id: 'tier-differ',
            title: '各等级的强制项差异',
            titleEn: 'Mandates That Vary by Logo Performance Tier',
            blocks: [
              { t: 'table', head: ['测试项', 'AdaptiveSync Display', 'MediaSync Display'],
                rows: [
                  ['Adaptive-Sync 最大刷新率范围', '≥ 144 Hz', '≥ 60 Hz'],
                  ['Adaptive-Sync 最小刷新率范围', '≤ 60 Hz', '≤ 48 Hz'],
                  ['过驱出厂默认过冲/欠冲', '≤ 各档 Delta-PQ 容差', '≤ 各档 Delta-PQ 容差'],
                  ['64 项 G2G 均值（出厂过驱）', '≤ 5 ms', 'N/A（不做）'],
                  ['低可变刷新率 FlickerMAX', '≤ -50 dB', '≤ -50 dB'],
                  ['高可变刷新率 FlickerMAX', '≤ -50 dB', 'N/A（不做）'],
                  ['视频帧抖动（23.976–60 Hz）', '±0.5 ms', '±0.5 ms']
                ] },
              { t: 'callout', kind: 'info', title: '分数帧率也要支持',
                v: '虽然最小/最大刷新率以整数列出，但必须同时支持 **1,000/1,001** 分数时序（含 47.952、59.94 Hz），' +
                  '且 DisplayID 的 SuccessiveFrameDuration 容差若为非零，则所有闪烁/抖动测试须遵守其最大变化率。' }
            ]
          },
          {
            id: 'tier-common',
            title: '全等级通用强制项',
            titleEn: 'Mandates for All Logo Performance Tiers',
            blocks: [
              { t: 'p', v: '除等级差异项外，所有等级还须满足一组通用强制项，核心是把 10 种静态视频帧率' +
                '（23.976 / 24 / 25 / 29.97 / 30 / 47.952 / 48 / 50 / 59.94 / 60 Hz）在抖动限值内支持——' +
                '必要时可用显示侧或 GPU 侧的视频帧复制（帧加倍/三倍等）。' },
              { t: 'list', items: [
                ['视频丢帧', '在 OS 报告的刷新率范围内，0 个丢帧'],
                ['锁定视频帧率', '上述 10 种静态频率均须支持（可经帧加倍达到 EDID 范围内）'],
                ['视频帧间抖动', '23.976–60 Hz 范围内 ±0.5 ms']
              ] },
              { t: 'callout', kind: 'warn', title: '3:2 pulldown / 丢帧一律不允许',
                v: '对任一静态频率测试帧率产生 3:2 pulldown、丢帧或其它抖动瑕疵的解法，都不被允许。' }
            ]
          },
          {
            id: 'tier-deltapq',
            title: 'Delta-PQ 过冲/欠冲容差表',
            titleEn: 'Delta-PQ Tolerance Table',
            blocks: [
              { t: 'p', v: '下表给出两个等级都适用的 10-bit **Delta-PQ** 过冲/欠冲容差（行=起始灰阶，列=结束灰阶）。' +
                '起止相同、或结束于码值 0/31 的测试不给出容差。容差并非处处相等，高–低两端（如 191/223/255 起点）最宽。' },
              { t: 'fig', id: 'deltaPQHeat', caption: 'Delta-PQ 容差网格（10-bit PQ 单位）：颜色越深容差越宽；结束于 0/31 的格子规范未给容差' }
            ]
          }
        ]
      },

      /* ======================================================== 03 测试环境 */
      {
        id: 'test-env',
        num: '03',
        title: '测试环境：温度、预热、仪器、软件与源设备',
        titleEn: 'Test Environment: Temperature, Warm-up, Instruments, Software, Source',
        lead: '测试实验室通常不具备这套硬件，因此 §3 主要给制造商与专业测试机构提供「如何正确搭建环境」的指引。' +
          '环境偏差会直接影响 G2G 与过冲结果，所以约束相当严格。',
        sections: [
          {
            id: 'env-temp',
            title: '环境温度与预热',
            titleEn: 'Ambient Temperature and Warm-up',
            blocks: [
              { t: 'p', v: '认证过程要求较紧的室温范围：**22.5–24.5 °C（72.5–76 °F）**。温度越高通常 G2G 越快、' +
                '过冲/欠冲越大，因此必须限定。' },
              { t: 'callout', kind: 'key', title: '默认预热 1 小时',
                v: '被测显示设备（DUT）需预热 1 小时，期间关闭屏保、保持活动；用灰屏（码值 127）预热，' +
                  '并预先把 127 调至 **40 cd/m²**。笔记本须接交流电源、开盖约 90°、不接外接显示。' },
              { t: 'p', v: '对 DisplayID/EDID 报告 MaxLuminance ≥ 1000 cd/m² 的显示器，还须追加一次**高亮预热**：' +
                '至少 20 分钟、全屏白（码值 255）调至 185 cd/m²（175–195 允许），在测试后期与默认预热叠加进行。' }
            ]
          },
          {
            id: 'env-inst',
            title: '测量仪器与传感器',
            titleEn: 'Measurement Instruments and Sensors',
            blocks: [
              { t: 'list', items: [
                ['亮度计', '确认显示已调至 40 cd/m²'],
                ['JEITA 闪烁计', '0.5 Hz（或更细）步进、覆盖 3–65 Hz，给出 JEITA 级闪烁'],
                ['高带宽亮度探头', '带宽 > 20 kHz，测 G2G/过冲/欠冲过渡'],
                ['G2G 计算设备', '示波器（可平均多样本算 rise/fall/过冲/欠冲）或 ≥10 kHz、≥16-bit 的 USB DAQ'],
                ['照相机', '手动模式（1 秒快门、F5.6、ISO 100–1600 以 1/3 EV 步进）、手动对焦、电子快门优先']
              ] },
              { t: 'callout', kind: 'info', title: '传感器放置',
                v: '除特别注明外，所有测试传感器置于**屏幕中心**；贴屏时注意勿压变形面板。' }
            ]
          },
          {
            id: 'env-software',
            title: '软件与图形硬件（半自动测试）',
            titleEn: 'Software and Graphics Hardware',
            blocks: [
              { t: 'p', v: 'VESA AdaptiveSync 测试工具由多家 GPU 厂商提供 Beta 版，须搭配正确的 GPU 硬件、驱动与工具；' +
                '并预先安装 Microsoft Visual C++ Redistributables。' },
              { t: 'p', v: '在 Windows 11 21H2+ 作信号源时，**Known Game List（KGL）** 决定哪些应用获 OS 级 VRR；' +
                '测试应用须 KGL v2013+。还需在图形设置中开启「可变刷新率」，并避免测试期间出现弹窗/水印（如 Activate Windows）' +
                '——水印会干扰 OS 交付 Adaptive-Sync 能力，导致抖动。' },
              { t: 'callout', kind: 'warn', title: '源设备能力门槛',
                v: '源须能在 EDID 范围内以 23.976–60 Hz 各静态帧率无帧加倍地交付；方波/随机等高可变测试须输出纯方波、' +
                  '偶数帧、每段尽量接近 250 ms；并具备驱动显示器最高分辨率与帧率所需的带宽/像素时钟。' }
            ]
          },
          {
            id: 'env-validate',
            title: '验证 Adaptive-Sync 是否真在工作',
            titleEn: 'Validation of Adaptive-Sync Operation',
            blocks: [
              { t: 'p', v: '§3.11 给出两种快速自检。其一是**波形分析**：用 SineWave 或 SquareWave 序列让刷新率在' +
                '最小–最大间循环；若波形随时间变化说明工作正常，若波到波时长静止则说明 Adaptive-Sync 未生效。' },
              { t: 'p', v: '其二是**拍照抖动分析**：用 #7.24Hz / #7.25Hz 序列——若 Adaptive-Sync 正确工作，' +
                '画面应为完美平灰图；若仅以最大刷新率运行（未生效），则因 24/25 Hz 不是最大刷新率的整数倍而至少在一个测试上显现抖动。' },
              { t: 'fig', id: 'warmupFlow', caption: '必需测试顺序（§5.3）：普通显示与 HDR-1000+ 显示两条路径' }
            ]
          }
        ]
      },

      /* ======================================================== 04 OSD 相关强制项 */
      {
        id: 'osd',
        num: '04',
        title: 'OSD 相关强制项（仅带屏显菜单的显示器）',
        titleEn: 'Monitor OSD-related Mandates',
        lead: '§4 的强制项只适用于带 On-Screen Display 菜单的显示器；笔记本与无 OSD 的显示设备豁免。',
        sections: [
          {
            id: 'osd-scope',
            title: '适用范围与测试模式',
            titleEn: 'Scope and Factory-default Mode',
            blocks: [
              { t: 'p', v: '所有 OSD 菜单设置须使用**出厂默认**进行测试（区域电源限制的例外见下），' +
                '使 OS 默认落到显示器出厂默认列出的「面板原生」分辨率——因此全部测试在原生分辨率、出厂默认下进行。' },
              { t: 'callout', kind: 'info', title: '仅默认模式受 CTS 核验',
                v: '规范对「默认模式」做 CTS 核验；除区域电源例外外，测试只在一个模式下进行。' }
            ]
          },
          {
            id: 'osd-label',
            title: 'OSD 标注要求',
            titleEn: 'OSD Labeling Requirements',
            blocks: [
              { t: 'p', v: '若显示器并非所有 OSD 模式都支持 Adaptive-Sync operation，则 OSD **应当**标明哪些模式支持、' +
                '或哪些模式不支持。若全部模式都支持，则标注可选。' },
              { t: 'list', items: [
                ['允许', '使用完整 VESA CERTIFIED 徽标，或文字/符号指示功能'],
                ['允许', '在 OSD「信息」页（已常显示端口/分辨率/刷新率/色彩深度等）增加是否支持指示'],
                ['禁止', '**部分使用** VESA CERTIFIED 徽标（只能用整标或不用标）']
              ] }
            ]
          },
          {
            id: 'osd-power',
            title: '区域电源限制例外',
            titleEn: 'Exception for Regional Power Restriction',
            blocks: [
              { t: 'p', v: '若区域能效要求迫使 OEM 把出厂默认设为低于最大的分辨率/刷新率、或关闭 Adaptive-Sync，' +
                'OEM 可指示测试机构改用哪一显示模式做合规认证；该模式须能测到最大原生分辨率，且 §4.2.2 的标注要求仍须满足。' },
              { t: 'callout', kind: 'key', title: '例外只测一种模式',
                v: '触发区域电源例外时，规范只在该 OEM 推荐的一种模式下测试。' }
            ]
          }
        ]
      },

      /* ======================================================== 05 认证与测试顺序 */
      {
        id: 'cert',
        num: '05',
        title: '认证前提与必需测试顺序',
        titleEn: 'Logo Certification and Required Test Sequence',
        lead: '§5 规定了面向「提供外部 DisplayPort 接口」的 Adaptive-Sync 显示设备的认证前提，' +
          '以及针对不同 MaxLuminance 的测试顺序。',
        sections: [
          {
            id: 'cert-dp',
            title: 'DP 接口认证前置',
            titleEn: 'DisplayPort Certification Prerequisite',
            blocks: [
              { t: 'p', v: '所有符合标准的外部输入连接器（全尺寸 DP、mDP、DisplayPort Alt Mode、USB4）须先按 VESA 相应授权政策' +
                '通过 **VESA DisplayPort 认证**，才有资格申请 AdaptiveSync / MediaSync 显示认证。内部接口（如 eDP）豁免。' },
              { t: 'callout', kind: 'info', title: '源/汇各司其职',
                v: '源设备须用 DisplayID/EDID 报告的能力正确指示 Adaptive-Sync 模式，落实延迟与闪烁预算；' +
                  '汇设备（显示器）须正确报告能力并权衡延迟与视觉质量。' }
            ]
          },
          {
            id: 'cert-checklist',
            title: '认证测试清单（源与汇）',
            titleEn: 'Required Compliance Tests (Source and Sink)',
            blocks: [
              { t: 'p', v: '要取得认证，源/汇设备须通过 Table 5-1 列出的相关测试：除本 CTS 的全部定义测试外，' +
                '还涉及 DisplayID EDID Link CTS、Link CTS、PHY CTS，以及 DPTX/DPRX 的 AdaptiveSync 协议、Link、PHY 与连接器测试。' },
              { t: 'table', head: ['设备', '须通过的附加 CTS'],
                rows: [
                  ['Source', 'DisplayID EDID Link CTS §4 / Link CTS §4 / PHY CTS §3 / DPTX 系列'],
                  ['Sink（显示器）', 'DisplayID EDID Link CTS §5 / Link CTS §5 / PHY CTS §4 / DPRX 系列']
                ] }
            ]
          },
          {
            id: 'cert-sequence',
            title: 'HDR-1000+ 显示的测试顺序调整',
            titleEn: 'Required Testing Sequence for HDR-1000+ Displays',
            blocks: [
              { t: 'p', v: '若显示器在 DisplayID/EDID 中 **未**报告 MaxLuminance ≥ 1000 cd/m²，顺序为：' +
                '① 预热 → ② 静态闪烁 → ③ 可变闪烁 → ④ G2G（表 7-1）→ ⑤ 丢帧 → ⑥ 抖动 → ⑦（若支持 HDR）HDR。' },
              { t: 'p', v: '若报告 MaxLuminance ≥ 1000 cd/m²，则把 G2G 移到抖动之后、并改用**高亮 G2G（表 7-2）**：' +
                '① 预热 → ② 静态闪烁 → ③ 可变闪烁 → ④ 丢帧 → ⑤ 抖动 → ⑥ 高亮预热 → ⑦ 高亮 G2G → ⑧ HDR。' },
              { t: 'callout', kind: 'key', title: '顺序的意义',
                v: '高亮显示器先把「易受热影响」的丢帧/抖动测完，再做高亮预热与高亮 G2G，避免温度累积污染 G2G 结果。' }
            ]
          }
        ]
      },

      /* ======================================================== 06 刷新率与闪烁 */
      {
        id: 'refresh-flicker',
        num: '06',
        title: '刷新率与闪烁测试',
        titleEn: 'Refresh Rate and Flicker Testing',
        lead: '§6 规定了由 DisplayID/EDID 定义 Adaptive-Sync 刷新率范围的强制项，以及多刷新率下的闪烁测试口径。',
        sections: [
          {
            id: 'flicker-mandate',
            title: 'DisplayID/EDID 相关强制项',
            titleEn: 'DisplayID or Legacy EDID Data-related Mandates',
            blocks: [
              { t: 'p', v: '须指定 Adaptive-Sync operation 的 **VBlank** 范围（由最大到最小 VBlank 周期），' +
                '对应显示器支持的最小–最大刷新率；本规范所有测试都使用这些刷新率。' },
              { t: 'callout', kind: 'info', title: '接口认证与链路 CTS 联动',
                v: '标准输入连接器（DP / mDP / DisplayPort Alt Mode）须先过 VESA DisplayPort 认证；' +
                  'Adaptive-Sync 合规还涉及 **Adaptive-Sync Link CTS** 与 **DisplayID EDID Link CTS**。' }
            ]
          },
          {
            id: 'flicker-static',
            title: '多刷新率闪烁测试',
            titleEn: 'Flicker Testing at Multiple Refresh Rates',
            blocks: [
              { t: 'p', v: '测试图样为静态全屏图：SDR 下 8-bit 码值 127（127,127,127），测试前把显示调至 40 cd/m²' +
                '（±5%，即 38–42 允许）。闪烁测试覆盖静态与动态两类刷新率。' },
              { t: 'list', items: [
                ['静态刷新率', '测等级最小范围、以及 23.976/24/25/29.97/30/47.952/48/50/59.94/60 Hz 共 10 点'],
                ['低于 EDID 最小者', '工具用整数倍（帧加倍/三倍）抬到 Adaptive-Sync 范围内尽量低']
              ] },
              { t: 'callout', kind: 'warn', title: '分数帧率的典型处理',
                v: '如 23.976 Hz 好莱坞内容，在最小 47.952 Hz 的面板上会被 GPU 帧加倍到 47.952 Hz 传输；' +
                  '最小 59.94 Hz 的面板则抬到 71.928 Hz。' }
            ]
          },
          {
            id: 'flicker-sweep',
            title: '可变刷新率扫频测试',
            titleEn: 'Flicker with Dynamically Variable Refresh Rates',
            blocks: [
              { t: 'p', v: '为测「刷新率动态变化中」的闪烁，规范定义四种扫频：**Zigzag（逐 Hz 锯齿）**、' +
                '**SquareWave（方波）**、**SineWave（正弦）**、**Random（随机）**。' },
              { t: 'fig', id: 'flickerSweep', caption: '四种可变刷新率扫频模式：锯齿 / 方波 / 正弦 / 随机' }
            ]
          },
          {
            id: 'flicker-measure',
            title: '闪烁测量与计算',
            titleEn: 'Flicker Measurement and Calculation',
            blocks: [
              { t: 'p', v: '用 0.5 Hz（或更细）步进、3–65 Hz 范围采样屏幕亮度波动，每点重复 10 次、取均值。' +
                '若中心闪烁 > -60 dB，还须把传感器移到中心到四角的半途共四个额外位置，五点均须满足强制值。' },
              { t: 'callout', kind: 'key', title: 'FlickerMAX 公式',
                v: 'FlickerMAX = 10 × log10( Pfmax × w(fmax) / P0 )，其中 Pfmax 为最高功率谱分量，P0 为 0 Hz 功率，' +
                  'w(f) 为 20 Hz 以上按人眼敏感度打折的权重因子（IEC 61747-30-1）。' }
            ]
          }
        ]
      },

      /* ======================================================== 07 灰阶响应 G2G */
      {
        id: 'g2g',
        num: '07',
        title: '灰阶响应（G2G）测试',
        titleEn: 'Gray-to-Gray Testing',
        lead: '§7 只测 SDR 模式下的灰阶过渡。目标是用一组静态测试图样 + 明确矩阵，让各品牌报告结果可比。',
        sections: [
          {
            id: 'g2g-matrix',
            title: '9×9 测试矩阵与图样',
            titleEn: 'Test Patterns and the 9×9 Matrix',
            blocks: [
              { t: 'p', v: 'G2G 用 **9×9 矩阵**：9 个灰阶（约 1/8 步，0–255）各自过渡到其余 7 个电平，' +
                '排除起止相同及结束于 31 的测试，得到 **64 项** 10→90% 过渡，再取均值。普通显示用表 7-1（灰 127 背景），' +
                'MaxLuminance ≥ 1000 cd/m² 用表 7-2（白 255 背景）。' },
              { t: 'fig', id: 'g2gGrid', caption: 'G2G 9×9 矩阵：64 项过渡（排除起止相同与结束于 0/31），过冲/欠冲在 56 项上测' },
              { t: 'callout', kind: 'info', title: '只在 SDR 下测',
                v: 'G2G 仅于 SDR 模式测试；测试图样为屏幕中心 10% 面积的方块 + 90% 静态灰 surround。' }
            ]
          },
          {
            id: 'g2g-method',
            title: 'G2G 测量方法',
            titleEn: 'G2G Measurement Methodology',
            blocks: [
              { t: 'p', v: '测试须用 DisplayID/EDID 报告的 Adaptive-Sync 范围内**最快刷新率**。' +
                '每项测「过渡从 10% 完成到 90% 完成」的时长；VESA G2G 均值即 64 项 10→90% 过渡时间的平均。' },
              { t: 'table', head: ['档位', 'G2G 均值上限'],
                rows: [
                  ['AdaptiveSync Display', '≤ 5 ms（64 项平均，出厂过驱）'],
                  ['MediaSync Display', 'N/A（不做 G2G 均值项）']
                ] }
            ]
          },
          {
            id: 'g2g-overshoot',
            title: '过冲/欠冲测量（Delta-PQ）',
            titleEn: 'Overshoot and Undershoot Measurement',
            blocks: [
              { t: 'p', v: '64 项中有 56 项结束于非黑、非 31 的电平，须测其过冲/欠冲，按 **10-bit Delta-PQ** 比对容差表。' +
                '若探针是已校准的亮度计，直接用图 7-3 的 PQ 计算（PQ = 1023 × invEOTF(Lin)）；' +
                '若是电压探针，则先以 R² 最佳拟合求系统 Gamma，再换算为 PQ（图 7-4）。' },
              { t: 'callout', kind: 'warn', title: '不要过早取整',
                v: '稳定平台与过冲/欠冲峰谷的 PQ 值相减前，不要对任一方四舍五入或截断。' }
            ]
          },
          {
            id: 'g2g-spike',
            title: '尖峰噪声抑制',
            titleEn: 'Display Spike-Noise Suppression',
            blocks: [
              { t: 'p', v: '部分显示器固有的极短暂亮度波动（如 OLED 每帧同步复位、LCD 局部调光 PWM 开关，通常 ≥1 kHz）' +
                '人眼不可见、不计入 JEITA 闪烁，在分析过冲/欠冲时也须作为**噪声剔除**——因 10 kHz 以上采样会让这些尖峰显现给工具而非人眼。' },
              { t: 'callout', kind: 'key', title: 'G2G 采集纪律',
                v: '相邻 G2G 过渡间至少 **250 ms** 延迟（≥最大帧率的 1/4 向上取偶）；每项至少 20 次过渡取平均；' +
                  'G2G 均值基于 1280 个结果（64 项 × ≥20 次）。' }
            ]
          }
        ]
      },

      /* ======================================================== 08 视频丢帧 */
      {
        id: 'frame-drop',
        num: '08',
        title: '视频丢帧测试',
        titleEn: 'Video Frame Drop Testing',
        lead: '§8 用一个在每帧平移的白框 + 1 秒长曝光，直观判断视频序列在刷新率范围内是否丢帧。',
        sections: [
          {
            id: 'drop-principle',
            title: '测试原理',
            titleEn: 'Overview and Principle',
            blocks: [
              { t: 'p', v: '当视频帧率落在 DisplayID/EDID 最小–最大 Adaptive-Sync 范围内时，不应丢帧。' +
                '测试工具发出一个逐帧平移的白色方块序列；相机以 1 秒长曝光记录输出帧，从图像即可判断有无丢帧。' },
              { t: 'callout', kind: 'info', title: 'ISO 随帧率缩放',
                v: '推荐 1 秒快门、F5.6 光圈、ISO ≈ 4× 最大视频帧率（如 240 Hz 用 ISO 1000），' +
                  '使任何帧率下都得到相近的中灰曝光。' }
            ]
          },
          {
            id: 'drop-pattern',
            title: '测试图样',
            titleEn: 'Test Pattern',
            blocks: [
              { t: 'p', v: '两种频率测试：① **静态最大刷新率**（方块尺寸 = 1/最大刷新率，1 秒填满屏）；' +
                '② **随机刷新率**（方块尺寸与亮度随帧率反相关，1 秒近似填满）。各行间的黑色细横线提供「黑」基线。' },
              { t: 'fig', id: 'frameDropPattern', caption: '丢帧测试图样：移动白框 + 黑基线；某格与黑线同亮=丢帧，略亮=暗帧（通过）' }
            ]
          },
          {
            id: 'drop-judge',
            title: '结果判定',
            titleEn: 'Results Analysis',
            blocks: [
              { t: 'p', v: 'LCD 漏光与反射使「暗帧」与「完全缺失的黑色帧」难分；黑横线提供可比较的黑色基准。' +
                '若某视频帧亮度与黑线一致 → 失败；若仅比黑线略亮（是暗帧）→ 通过。' },
              { t: 'callout', kind: 'key', title: '随机测试的常见「假阳性」',
                v: '相机与测试的 1 秒不完全对齐时，会出现单处偏暗区——只要不是多个与黑线完全一致的黑帧，即判通过。' }
            ]
          }
        ]
      },

      /* ======================================================== 09 视频抖动 */
      {
        id: 'jitter',
        num: '09',
        title: '视频帧率抖动测试',
        titleEn: 'Video Frame Rate Jitter Testing',
        lead: '§9 确保 10 种标准媒体帧率都被支持，且帧间抖动最小（±0.5 ms）。难点在剔除光学误差、只暴露真抖动。',
        sections: [
          {
            id: 'jitter-camera',
            title: '相机与拍摄要求',
            titleEn: 'Camera-related Mandates',
            blocks: [
              { t: 'p', v: '须三脚架固定、可调快门/光圈/ISO 的相机；把显示调至 40 cd/m²（±2）。' +
                '尽量暗化环境以减少反射，并让画面四周留 2–4 英寸背景以避开镜头暗角。' },
              { t: 'list', items: [
                ['强制', '每张抖动图 **1 秒**曝光；推荐 F5.6、ISO = 4× 被测帧率'],
                ['白平衡', '手动设为 D65（Nikon 用 Cloudy 近似 6500K）'],
                ['消除莫尔', '相机居中、垂直屏幕、手动轻微失焦'],
                ['防抖', '关闭机身/镜头防抖（移动白框会骗防抖），优先电子快门']
              ] },
              { t: 'table', head: ['测试频率 (Hz)', 'ISO'],
                rows: [
                  ['23.976 / 24 / 25', '100'],
                  ['29.97 / 30', '125'],
                  ['47.952 / 48 / 50', '200'],
                  ['59.94 / 60', '250']
                ] }
            ]
          },
          {
            id: 'jitter-freq',
            title: '测试频率',
            titleEn: 'Video Frame Rates Tested',
            blocks: [
              { t: 'p', v: '须支持 10 种频率：23.976 / 24 / 25 / 29.97 / 30 / 47.952 / 48 / 50 / 59.94 / 60 Hz——' +
                '以原生帧率，或以 GPU 帧加倍到至少 DisplayID/EDID 最小刷新率的整倍数交付。' },
              { t: 'callout', kind: 'info', title: '图样与丢帧测试相同',
                v: '复用 §8 的静态最大刷新率图样；差异在于测试频率，且若 GPU 与显示都支持，' +
                  '用更准的 **Static-average VTotal** 时序显示测试频率。' }
            ]
          },
          {
            id: 'jitter-method',
            title: '判定方法（双图差分）',
            titleEn: 'Results Analysis Methodology',
            blocks: [
              { t: 'p', v: '规范只允每格 ±0.5 ms 抖动（min–max 共 1 ms）。但镜头暗角、LCD 四角偏暗、莫尔、Mura、' +
                '像素级取整都会制造远大于此的亮度差，必须剔除。方法是：每张测试拍**两张图**，' +
                '在后期软件中用「差值（Difference）」混合模式叠加——完全一致则为纯黑，仅抖动处显形。' },
              { t: 'fig', id: 'jitterDiff', caption: '抖动判定：同测试两张图 → 图层差值混合 → 仅抖动处显形；按 Table 9-2 判失败' },
              { t: 'callout', kind: 'warn', title: '判定阈值（Table 9-2）',
                v: '以中心平均灰阶查表：如平均 160 时，24/25 Hz 仅允许 1 码值偏差、60 Hz 允许 4；' +
                  '若某频率下 ≥3 个区达到/超过失败阈值，则判抖动失败（允许 ≤2 个由相机/1 秒不同步造成的区）。' }
            ]
          },
          {
            id: 'jitter-examples',
            title: '目视示例',
            titleEn: 'Visual Examples (Informative)',
            blocks: [
              { t: 'p', v: '§9.6 用平均灰阶 160 的模拟图说明：偏差 1–2 码值在低帧率即可能失败、在高帧率可通过；' +
                '偏差 5 码值在所有频率都失败。判读时单处偏亮/偏暗区（计时差造成）应忽略。' },
              { t: 'callout', kind: 'info', title: '直觉阈值',
                v: '24 fps 下期望帧时长 41.67 ms，1 ms 偏差仅 2.4%；60 fps 下 1 ms 偏差达 6%——' +
                  '低频测试远比高频严苛。' }
            ]
          }
        ]
      },

      /* ======================================================== 10 HDR 测试 */
      {
        id: 'hdr',
        num: '10',
        title: 'HDR 模式测试',
        titleEn: 'HDR Testing',
        lead: '§10 针对支持 HDR 的显示器，确认 Adaptive-Sync operation 在 HDR 模式下也正确工作。',
        sections: [
          {
            id: 'hdr-overview',
            title: '为何 HDR 要单独测',
            titleEn: 'Why HDR Needs a Separate Test',
            blocks: [
              { t: 'p', v: '对支持 HDR 的显示，VESA 认证进一步确保 Adaptive-Sync operation 在 SDR 与 HDR 下都正确。' +
                '因信号带宽处理，显示器可能在 HDR 下给频率范围加额外约束——例如某 AdaptiveSync Display144' +
                '在 SDR 跑 144 Hz，HDR 下受 10-bit 信令限制可能降到更低频率。' }
            ]
          },
          {
            id: 'hdr-verify',
            title: 'HDR 模式性能验证',
            titleEn: 'HDR Mode Performance Verification',
            blocks: [
              { t: 'p', v: '把 OS 切到 HDR，再运行 §3.11 的验证流程即可。核心仍是确认刷新率在最小–最大间随 Adaptive-Sync 正确变化。' },
              { t: 'callout', kind: 'info', title: '复用 §3.11 两套自检',
                v: '波形分析 + 拍照抖动分析同样适用；若因 HDR 信号带宽使频率范围收窄，须以收窄后的范围判断。' }
            ]
          },
          {
            id: 'hdr-pwm',
            title: '处理 PWM 干扰的技巧',
            titleEn: 'Coping with PWM Interference',
            blocks: [
              { t: 'p', v: '某些 PWM 背光 HDR 显示器，PWM 带来的亮度波动大于帧率变化造成的波动，使方波信号难以读出。' +
                '此时可改用 **白版方波工具（码值 255）** 提高 HDR 占空比，让波形更易读；' +
                '并把 OS/OSD 亮度滑块开到最大以进一步提高背光占空比。' },
              { t: 'fig', id: 'hdrDuty', caption: 'HDR 下提高亮度使 PWM 占空比更大，方波测试信号更易从波形中读出' }
            ]
          }
        ]
      },

      /* ======================================================== 11 附录要点 */
      {
        id: 'appendices',
        num: '11',
        title: '附录要点：亮度表、系统 Gamma 与贡献者',
        titleEn: 'Appendix Notes: Gamma Table, System Gamma, Contributors',
        lead: '三个附录给出实用换算与历史信息，对搭建测试系统有直接参考价值。',
        sections: [
          {
            id: 'app-gamma',
            title: '8-bit SDR Gamma 2.2 亮度表',
            titleEn: 'Example 8-bit SDR Gamma 2.2 Luminance Values',
            blocks: [
              { t: 'p', v: '附录 A 给出灰阶 127 设为 40 cd/m² 时的 8-bit SDR Gamma 2.2 亮度与 10-bit PQ 对应值：' +
                '例如 0→0 cd/m²、31→1.80、63→8.56、127→40.0、191→98.2、255→185 cd/m²（PQ 584）。' },
              { t: 'callout', kind: 'info', title: '换算式',
                v: 'Luminance = MaxLuminance × (CodeValue/255)^2.2；即亮度相对 MaxLuminance 的 Gamma 2.2 幂。' }
            ]
          },
          {
            id: 'app-systemgamma',
            title: '系统 Gamma 计算伪代码',
            titleEn: 'Combined Observed Gamma Pseudo Code',
            blocks: [
              { t: 'p', v: '附录 B 给出求「显示 + 测量系统」合成 Observed Gamma 的示例：' +
                '取 9 个灰阶的电压，减去 0 电平偏移，再在 Gamma 1.3–3.3（步长 0.001）中循环，' +
                '以码值 63–223 六点求最小 R² 误差，定出最佳拟合 Gamma。' },
              { t: 'callout', kind: 'key', title: '为何要算系统 Gamma',
                v: '电压探针不能直接给亮度，必须经系统 Gamma 把电压换算为 PQ，才能与 Delta-PQ 容差表比对。' }
            ]
          },
          {
            id: 'app-contrib',
            title: '贡献者历史',
            titleEn: 'Main Contributor History',
            blocks: [
              { t: 'p', v: '附录 C 列出历史版本（r1.0）的贡献者：AMD、Apple、Dell、HP、Intel、LG Display/LG Electronics、' +
                'MediaTek、NVIDIA、Realtek、Samsung、VESA 合规经理等。r1.1 的主要新增来自多条 SCR' +
                '（抖动方法替换、出厂默认模式、1.0→1.1 更新等）。' },
              { t: 'callout', kind: 'info', title: 'MediaTek 参与',
                v: '本规范 r1.0/r1.1 均有 MediaTek（联发科）Tung-Sheng Lin 等技术与编辑贡献——' +
                  '与 GPU/显示 SoC 厂商必须深度参与这类互通认证的现实一致。' }
            ]
          }
        ]
      },

      /* ======================================================== 12 小结 */
      {
        id: 'summary',
        num: '12',
        title: '小结：关键指标速查与对测试设备的意义',
        titleEn: 'Summary: Key Metrics and Relevance to Test Equipment',
        lead: '把全篇强制项浓缩为一页速查，并点明对测试设备研发最相关的几条脉络。',
        sections: [
          {
            id: 'summary-key',
            title: '关键指标速查',
            titleEn: 'Key Metrics at a Glance',
            blocks: [
              { t: 'table', head: ['维度', 'MediaSync', 'AdaptiveSync'],
                rows: [
                  ['刷新率范围', '≤48 / ≥60 Hz', '≤60 / ≥144 Hz'],
                  ['G2G 均值', '不做', '≤ 5 ms（64 项）'],
                  ['FlickerMAX', '≤ -50 dB（静态/低可变）', '≤ -50 dB（静态/低可变/高可变）'],
                  ['抖动', '±0.5 ms', '±0.5 ms'],
                  ['丢帧', '0', '0'],
                  ['过冲/欠冲', '≤ Delta-PQ 容差', '≤ Delta-PQ 容差']
                ] },
              { t: 'callout', kind: 'key', title: '测试纪律三件套',
                v: '室温 **22.5–24.5 °C**、灰 127 调 **40 cd/m²**、G2G 相邻过渡 **≥250 ms** 延迟且每项 ≥20 次平均。' }
            ]
          },
          {
            id: 'summary-devicemeaning',
            title: '对测试设备研发的意义',
            titleEn: 'Relevance to Test Equipment Development',
            blocks: [
              { t: 'p', v: '这份 CTS 几乎是「显示器前屏性能测试设备」的需求蓝本：它需要 **>20 kHz 带宽的亮度探头**、' +
                '**JEITA 闪烁计（0.5 Hz 步进、3–65 Hz）**、**≥16-bit / ≥10 kHz 的 USB DAQ 或示波器**，' +
                '以及支持手动 1 秒曝光与电子快门的相机系统。' },
              { t: 'p', v: '对国产测试设备而言，几个价值点尤其突出：把 **Delta-PQ（基于 PQ/Barten 模型）** 而非简单 gamma 百分比' +
                '作为过冲/欠冲判据；用 **双图差分** 法把光学误差与真抖动分离；以及 G2G 的 **9×9 矩阵 + 1280 次采样** 纪律。' },
              { t: 'callout', kind: 'warn', title: '注意两套 Gamma 口径',
                v: '亮度计直接出 PQ；电压探针须先拟合系统 Gamma 再换算——测试软件栈必须同时支持两条路径。' }
            ]
          },
          {
            id: 'summary-related',
            title: '与 DisplayHDR / Adaptive-Sync Link CTS 的关系',
            titleEn: 'Relationship with DisplayHDR and Adaptive-Sync Link CTS',
            blocks: [
              { t: 'p', v: '本 CTS 聚焦「前屏性能」；**VESA DisplayHDR CTS** 管 HDR 亮度/色域/色调映射等认证，' +
                '**Adaptive-Sync Link CTS** 管链路层（源/汇协议与 Link/PHY）互通。三者合起来才是显示器 VESA 认证的完整拼图。' },
              { t: 'callout', kind: 'info', title: '落地建议',
                v: '做显示器测试设备或认证服务的团队，应把这三份 CTS 与 DP/eDP/DisplayID 标准一并纳入工具与用例规划。' }
            ]
          }
        ]
      }
    ]
  });

  Object.keys(FIGURES).forEach(function (k) { D.figures[k] = FIGURES[k]; });
})(typeof window !== 'undefined' ? window : globalThis);
