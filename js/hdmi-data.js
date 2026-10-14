/* =============================================================================
 * hdmi-data.js — Technology Blog 第三篇文章：HDMI 2.1 接口规范技术解析
 *                （纯数据，无逻辑、不碰 DOM）
 *
 * 数据来源：HDMI Specification Version 2.1（HDMI Forum，518 页，替代 HDMI 2.0b，
 *           并以引用方式并入 HDMI Specification Version 1.4b）
 *           规范发布页：https://www.hdmi.org/ （原 hdmiforum.org）
 *
 * 本文件按「新增文章只需往 BLOGData.posts 里加一条」的约定，在 blog-data.js 之后
 * 加载，把文章对象 push 进 BLOGData.posts，并把本篇专用的内联 SVG 注册进
 * BLOGData.figures。正文块结构与 blog-data.js 完全一致（见该文件头部说明）。
 *
 * 版权说明：本篇是面向中文读者的**学习性原理整理**，非规范官方译文，也不转载
 * 规范原文的表格与插图；所有示意图均按规范描述的机理重绘（纯内联 SVG，
 * 不请求任何外部资源）。规范原文以 HDMI Forum 发布的版本为准，商业使用需另行
 * 获得 HDMI Licensing Administrator, Inc. 的许可。
 * ========================================================================== */
(function (window) {
  'use strict';

  var D = window.BLOGData;
  if (!D || !D.posts || !D.figures) return;

  /* ------------------------------------------------------------- 示意图 SVG */
  /* 全部内联绘制，颜色走 CSS 变量，因此自动跟随明/暗主题，且不请求任何外部资源。 */
  var FIGURES = {

    /* 端到端系统：源设备 → 线缆 → 宿设备，高速通道与低速侧信道分工 */
    hdmiSystem:
      '<svg class="bl-fig-svg" viewBox="0 0 640 268" role="img" aria-label="HDMI 端到端系统与通道分工">' +
      '<rect x="0" y="0" width="640" height="268" fill="var(--surface-2)"/>' +
      '<text x="16" y="26" fill="var(--text-soft)" font-size="12" font-weight="600">HDMI 端到端系统：高速数据走 4 对差分线，控制与发现走侧信道</text>' +
      /* 源设备 */
      '<rect x="10" y="44" width="180" height="150" rx="10" fill="none" stroke="var(--border-strong)" stroke-dasharray="5 4"/>' +
      '<text x="24" y="64" fill="var(--text-dim)" font-size="11">源设备 Source（显卡 / 机顶盒）</text>' +
      '<rect x="26" y="76" width="148" height="34" rx="7" fill="var(--surface)" stroke="var(--accent)"/>' +
      '<text x="100" y="98" fill="var(--accent)" font-size="11" text-anchor="middle">TMDS / FRL 发送</text>' +
      '<rect x="26" y="120" width="148" height="30" rx="7" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="100" y="140" fill="var(--text-soft)" font-size="10.5" text-anchor="middle">E-EDID / SCDC 读取（I²C 主）</text>' +
      '<rect x="26" y="158" width="148" height="26" rx="7" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="100" y="176" fill="var(--text-soft)" font-size="10.5" text-anchor="middle">CEC / eARC 数据（可选）</text>' +
      /* 宿设备 */
      '<rect x="450" y="44" width="180" height="150" rx="10" fill="none" stroke="var(--border-strong)" stroke-dasharray="5 4"/>' +
      '<text x="464" y="64" fill="var(--text-dim)" font-size="11">宿设备 Sink（电视 / 显示器）</text>' +
      '<rect x="466" y="76" width="148" height="34" rx="7" fill="var(--surface)" stroke="var(--accent)"/>' +
      '<text x="540" y="98" fill="var(--accent)" font-size="11" text-anchor="middle">TMDS / FRL 接收</text>' +
      '<rect x="466" y="120" width="148" height="30" rx="7" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="540" y="140" fill="var(--text-soft)" font-size="10.5" text-anchor="middle">E-EDID / SCDC（I²C 从）</text>' +
      '<rect x="466" y="158" width="148" height="26" rx="7" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="540" y="176" fill="var(--text-soft)" font-size="10.5" text-anchor="middle">CEC / eARC 音频回传</text>' +
      /* 中间线缆 */
      '<rect x="208" y="52" width="224" height="136" rx="8" fill="var(--surface)" stroke="var(--teal)"/>' +
      '<text x="320" y="72" fill="var(--teal)" font-size="11.5" font-weight="600" text-anchor="middle">HDMI 线缆（Type A 19 针）</text>' +
      '<line x1="220" y1="86" x2="420" y2="86" stroke="var(--accent)" stroke-width="2.5"/>' +
      '<text x="320" y="102" fill="var(--accent)" font-size="10" text-anchor="middle">Data0 ~ Data3（TMDS 时钟对在 FRL 下复用为 Lane 3）</text>' +
      '<line x1="220" y1="116" x2="420" y2="116" stroke="var(--border-strong)" stroke-width="1.6"/>' +
      '<text x="320" y="131" fill="var(--text-dim)" font-size="10" text-anchor="middle">SCL / SDA（DDC，读 E-EDID 与 SCDC）</text>' +
      '<line x1="220" y1="140" x2="420" y2="140" stroke="var(--border-strong)" stroke-width="1.6"/>' +
      '<text x="320" y="155" fill="var(--text-dim)" font-size="10" text-anchor="middle">HPD（热插拔检测）+ Utility（HEAC / eARC 载体）</text>' +
      '<line x1="220" y1="164" x2="420" y2="164" stroke="var(--border-strong)" stroke-width="1.6"/>' +
      '<text x="320" y="179" fill="var(--text-dim)" font-size="10" text-anchor="middle">CEC（一线制消费电子控制）· +5V 供电</text>' +
      /* 方向标注 */
      '<polygon points="430,93 438,97 430,101" fill="var(--accent)"/>' +
      '<polygon points="210,124 202,128 210,132" fill="var(--border-strong)"/>' +
      '<text x="16" y="222" fill="var(--text-soft)" font-size="11">视频与音频主链路是单向的；侧信道（DDC / HPD / CEC / eARC）承载发现、状态与控制，</text>' +
      '<text x="16" y="240" fill="var(--text-dim)" font-size="11">eARC 借 HPD 与 Utility 两线把音频从宿设备回传给源设备（功放），方向与视频相反。</text>' +
      '<text x="16" y="258" fill="var(--text-dim)" font-size="11">「Source / Sink」在规范里是角色而非器件类型：同一台功放对电视是 Source，对机顶盒又是 Sink。</text>' +
      '</svg>',

    /* Type A 连接器 19 针：TMDS 命名 vs Category 3 命名 */
    hdmiConnector:
      '<svg class="bl-fig-svg" viewBox="0 0 640 316" role="img" aria-label="Type A 连接器 19 针定义">' +
      '<rect x="0" y="0" width="640" height="316" fill="var(--surface-2)"/>' +
      '<text x="16" y="26" fill="var(--text-soft)" font-size="12" font-weight="600">Type A 连接器：19 针，Category 3 把「TMDS 时钟对」改名为「Data3」</text>' +
      /* 左列 1-10 */
      '<text x="18" y="52" fill="var(--text-dim)" font-size="10.5">针 1 – 10</text>' +
      '<text x="150" y="52" fill="var(--text-dim)" font-size="10.5">Category 1 / 2（TMDS）</text>' +
      '<text x="330" y="52" fill="var(--text-dim)" font-size="10.5">针 11 – 19</text>' +
      '<text x="470" y="52" fill="var(--text-dim)" font-size="10.5">Category 3（FRL）</text>' +
      /* 行 */
      '<rect x="18" y="62" width="110" height="26" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/><text x="73" y="80" fill="var(--text-soft)" font-size="11" text-anchor="middle">1</text>' +
      '<rect x="150" y="62" width="170" height="26" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/><text x="235" y="80" fill="var(--text-soft)" font-size="11" text-anchor="middle">TMDS Data2+</text>' +
      '<rect x="330" y="62" width="110" height="26" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/><text x="385" y="80" fill="var(--text-soft)" font-size="11" text-anchor="middle">11</text>' +
      '<rect x="450" y="62" width="172" height="26" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/><text x="536" y="80" fill="var(--text-soft)" font-size="11" text-anchor="middle">Data3 Shield</text>' +
      '<rect x="18" y="92" width="110" height="26" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/><text x="73" y="110" fill="var(--text-soft)" font-size="11" text-anchor="middle">2</text>' +
      '<rect x="150" y="92" width="170" height="26" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/><text x="235" y="110" fill="var(--text-soft)" font-size="11" text-anchor="middle">TMDS Data2 Shield</text>' +
      '<rect x="330" y="92" width="110" height="26" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/><text x="385" y="110" fill="var(--text-soft)" font-size="11" text-anchor="middle">12</text>' +
      '<rect x="450" y="92" width="172" height="26" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/><text x="536" y="110" fill="var(--text-soft)" font-size="11" text-anchor="middle">Data3-</text>' +
      '<rect x="18" y="122" width="110" height="26" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/><text x="73" y="140" fill="var(--text-soft)" font-size="11" text-anchor="middle">3</text>' +
      '<rect x="150" y="122" width="170" height="26" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/><text x="235" y="140" fill="var(--text-soft)" font-size="11" text-anchor="middle">TMDS Data2-</text>' +
      '<rect x="330" y="122" width="110" height="26" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/><text x="385" y="140" fill="var(--text-soft)" font-size="11" text-anchor="middle">13</text>' +
      '<rect x="450" y="122" width="172" height="26" rx="5" fill="var(--accent-soft)" stroke="var(--accent)"/><text x="536" y="140" fill="var(--accent-text)" font-size="11" text-anchor="middle">CEC</text>' +
      '<rect x="18" y="152" width="110" height="26" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/><text x="73" y="170" fill="var(--text-soft)" font-size="11" text-anchor="middle">4 – 6</text>' +
      '<rect x="150" y="152" width="170" height="26" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/><text x="235" y="170" fill="var(--text-soft)" font-size="11" text-anchor="middle">TMDS Data1± + Shield</text>' +
      '<rect x="330" y="152" width="110" height="26" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/><text x="385" y="170" fill="var(--text-soft)" font-size="11" text-anchor="middle">14</text>' +
      '<rect x="450" y="152" width="172" height="26" rx="5" fill="var(--accent-soft)" stroke="var(--accent)"/><text x="536" y="170" fill="var(--accent-text)" font-size="11" text-anchor="middle">Utility（HEAC / eARC）</text>' +
      '<rect x="18" y="182" width="110" height="26" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/><text x="73" y="200" fill="var(--text-soft)" font-size="11" text-anchor="middle">7 – 9</text>' +
      '<rect x="150" y="182" width="170" height="26" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/><text x="235" y="200" fill="var(--text-soft)" font-size="11" text-anchor="middle">TMDS Data0± + Shield</text>' +
      '<rect x="330" y="182" width="110" height="26" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/><text x="385" y="200" fill="var(--text-soft)" font-size="11" text-anchor="middle">15 – 16</text>' +
      '<rect x="450" y="182" width="172" height="26" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/><text x="536" y="200" fill="var(--text-soft)" font-size="11" text-anchor="middle">SCL / SDA（DDC）</text>' +
      '<rect x="18" y="212" width="110" height="26" rx="5" fill="var(--accent-soft)" stroke="var(--accent)"/><text x="73" y="230" fill="var(--accent-text)" font-size="11" text-anchor="middle">10</text>' +
      '<rect x="150" y="212" width="170" height="26" rx="5" fill="var(--accent-soft)" stroke="var(--accent)"/><text x="235" y="230" fill="var(--accent-text)" font-size="11" text-anchor="middle">TMDS Clock+ → Data3+</text>' +
      '<rect x="330" y="212" width="110" height="26" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/><text x="385" y="230" fill="var(--text-soft)" font-size="11" text-anchor="middle">17 – 19</text>' +
      '<rect x="450" y="212" width="172" height="26" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/><text x="536" y="230" fill="var(--text-soft)" font-size="11" text-anchor="middle">DDC/CEC 地 · +5V · HPD</text>' +
      /* 底部说明 */
      '<line x1="16" y1="252" x2="624" y2="252" stroke="var(--border)"/>' +
      '<text x="16" y="272" fill="var(--text-soft)" font-size="11">FRL 模式把 TMDS 通道 0–2 与时钟通道整体重定义为 Lane 0–3：原来传时钟的那对线也拿来传数据，</text>' +
      '<text x="16" y="290" fill="var(--text-dim)" font-size="11">时钟信息改由 16b18b 码流内嵌恢复。Type C / Type D 只是针脚排列不同，信号定义完全一致。</text>' +
      '<text x="16" y="308" fill="var(--text-dim)" font-size="11">+5V 由源向宿供电（宿最多取 50 mA，线缆最多 55 mA），HPD 告知源「宿已上电且在位」。</text>' +
      '</svg>',

    /* TMDS 一行的时间结构：控制期 / 数据岛期 / 视频有效期 + 保护带 */
    hdmiTmds:
      '<svg class="bl-fig-svg" viewBox="0 0 640 246" role="img" aria-label="TMDS 一行的时间结构">' +
      '<rect x="0" y="0" width="640" height="246" fill="var(--surface-2)"/>' +
      '<text x="16" y="26" fill="var(--text-soft)" font-size="12" font-weight="600">TMDS 一行的时间结构（每条通道独立，字符速率相同）</text>' +
      /* 时间轴 */
      '<line x1="30" y1="150" x2="610" y2="150" stroke="var(--border-strong)" stroke-width="1.6"/>' +
      '<polygon points="610,146 618,150 610,154" fill="var(--border-strong)"/>' +
      /* 控制期 */
      '<rect x="30" y="86" width="70" height="52" rx="6" fill="var(--surface)" stroke="var(--teal)"/>' +
      '<text x="65" y="108" fill="var(--teal)" font-size="11" text-anchor="middle">控制期</text>' +
      '<text x="65" y="124" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">前导 + 同步</text>' +
      /* 数据岛 */
      '<rect x="106" y="86" width="120" height="52" rx="6" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="166" y="108" fill="var(--text-soft)" font-size="11" text-anchor="middle">数据岛期</text>' +
      '<text x="166" y="124" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">音频 / 信息帧包</text>' +
      /* 视频数据期 */
      '<rect x="232" y="86" width="330" height="52" rx="6" fill="var(--surface)" stroke="var(--accent)"/>' +
      '<text x="397" y="108" fill="var(--accent)" font-size="11" text-anchor="middle">视频数据期（有效像素）</text>' +
      '<text x="397" y="124" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">每像素 8/10/12/16 bit，经 TMDS 10-bit 编码后串行送出</text>' +
      /* 保护带标注 */
      '<rect x="100" y="80" width="6" height="64" rx="2" fill="var(--warn)"/>' +
      '<rect x="226" y="80" width="6" height="64" rx="2" fill="var(--warn)"/>' +
      '<rect x="562" y="80" width="6" height="64" rx="2" fill="var(--warn)"/>' +
      '<text x="232" y="168" fill="var(--warn)" font-size="10">▲ 保护带字符（两通道为 0b1011001100，一通道取反），隔离前后两期</text>' +
      /* 通道说明 */
      '<text x="16" y="196" fill="var(--text-soft)" font-size="11">三对数据线各自传一条通道：像素的 R/G/B（或 Y/Cb/Cr）分量被分配到通道 0/1/2；</text>' +
      '<text x="16" y="214" fill="var(--text-dim)" font-size="11">FRL 模式下这条时间线原样保留，但内容被重新打包进「FRL 包」：Tri-Byte → 包 → 字符块 → 超块，</text>' +
      '<text x="16" y="232" fill="var(--text-dim)" font-size="11">再加 16b18b 编码与 RS 纠错，最后才分到各 Lane 上串行发出。</text>' +
      '</svg>',

    /* FRL 六种配置的带宽阶梯 */
    hdmiFrlRates:
      '<svg class="bl-fig-svg" viewBox="0 0 640 262" role="img" aria-label="FRL 六种链路配置与总带宽">' +
      '<rect x="0" y="0" width="640" height="262" fill="var(--surface-2)"/>' +
      '<text x="16" y="26" fill="var(--text-soft)" font-size="12" font-weight="600">FRL 的六种链路配置（每 Lane 速率 × Lane 数 → 编码后总带宽）</text>' +
      /* 柱状图 */
      '<line x1="60" y1="210" x2="620" y2="210" stroke="var(--border-strong)" stroke-width="1.4"/>' +
      '<rect x="72" y="186" width="60" height="24" fill="var(--teal)"/>' +
      '<text x="102" y="228" fill="var(--text-soft)" font-size="10.5" text-anchor="middle">3 Gbps × 3</text>' +
      '<text x="102" y="200" fill="var(--surface)" font-size="10.5" font-weight="600" text-anchor="middle">9 Gbps</text>' +
      '<rect x="150" y="168" width="60" height="42" fill="var(--teal)"/>' +
      '<text x="180" y="228" fill="var(--text-soft)" font-size="10.5" text-anchor="middle">6 Gbps × 3</text>' +
      '<text x="180" y="184" fill="var(--surface)" font-size="10.5" font-weight="600" text-anchor="middle">18 Gbps</text>' +
      '<rect x="228" y="158" width="60" height="52" fill="var(--accent)"/>' +
      '<text x="258" y="228" fill="var(--text-soft)" font-size="10.5" text-anchor="middle">6 Gbps × 4</text>' +
      '<text x="258" y="174" fill="var(--surface)" font-size="10.5" font-weight="600" text-anchor="middle">24 Gbps</text>' +
      '<rect x="306" y="142" width="60" height="68" fill="var(--accent)"/>' +
      '<text x="336" y="228" fill="var(--text-soft)" font-size="10.5" text-anchor="middle">8 Gbps × 4</text>' +
      '<text x="336" y="158" fill="var(--surface)" font-size="10.5" font-weight="600" text-anchor="middle">32 Gbps</text>' +
      '<rect x="384" y="122" width="60" height="88" fill="var(--accent)"/>' +
      '<text x="414" y="228" fill="var(--text-soft)" font-size="10.5" text-anchor="middle">10 Gbps × 4</text>' +
      '<text x="414" y="138" fill="var(--surface)" font-size="10.5" font-weight="600" text-anchor="middle">40 Gbps</text>' +
      '<rect x="462" y="98" width="60" height="112" fill="var(--warn)"/>' +
      '<text x="492" y="228" fill="var(--text-soft)" font-size="10.5" text-anchor="middle">12 Gbps × 4</text>' +
      '<text x="492" y="114" fill="var(--surface)" font-size="10.5" font-weight="600" text-anchor="middle">48 Gbps</text>' +
      /* TMDS 对照 */
      '<line x1="540" y1="98" x2="540" y2="210" stroke="var(--text-dim)" stroke-dasharray="4 3"/>' +
      '<text x="556" y="112" fill="var(--text-dim)" font-size="10">TMDS 上限</text>' +
      '<text x="556" y="128" fill="var(--text-dim)" font-size="10">600 Mcsc ≈</text>' +
      '<text x="556" y="144" fill="var(--text-dim)" font-size="10">18 Gbps</text>' +
      '<text x="16" y="60" fill="var(--text-soft)" font-size="11">三 Lane 模式只允许 3 / 6 Gbps（Lane 3 停用）；四 Lane 模式为 6 / 8 / 10 / 12 Gbps。</text>' +
      '<text x="16" y="78" fill="var(--text-dim)" font-size="11">带宽是 16b18b 编码后的净荷：3×3=9、3×6=18、4×6=24、4×8=32、4×10=40、4×12=48 Gbps。</text>' +
      '<text x="16" y="248" fill="var(--text-dim)" font-size="11">同一对线上速率翻倍以上，是 HDMI 2.1 敢承诺 4K120 / 8K60 的物理基础。</text>' +
      '</svg>',

    /* FRL 链路训练状态机 */
    hdmiTraining:
      '<svg class="bl-fig-svg" viewBox="0 0 640 278" role="img" aria-label="FRL 链路训练状态机">' +
      '<rect x="0" y="0" width="640" height="278" fill="var(--surface-2)"/>' +
      '<text x="16" y="26" fill="var(--text-soft)" font-size="12" font-weight="600">FRL 链路训练：从读 EDID 开始，逐个速率向下试探</text>' +
      /* LTS:1 */
      '<rect x="24" y="52" width="128" height="56" rx="8" fill="var(--surface)" stroke="var(--teal)"/>' +
      '<text x="88" y="76" fill="var(--teal)" font-size="11.5" font-weight="600" text-anchor="middle">LTS:1 读 EDID</text>' +
      '<text x="88" y="94" fill="var(--text-dim)" font-size="10" text-anchor="middle">查 HF-VSDB 能力</text>' +
      /* 分支 LTS:L */
      '<rect x="24" y="140" width="128" height="48" rx="8" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="88" y="162" fill="var(--text-soft)" font-size="11" text-anchor="middle">LTS:L 传统 TMDS</text>' +
      '<text x="88" y="178" fill="var(--text-dim)" font-size="10" text-anchor="middle">宿不支持 FRL 时回退</text>' +
      '<path d="M88 108 L88 136" fill="none" stroke="var(--border-strong)" stroke-width="1.6"/>' +
      '<polygon points="84,136 88,144 92,136" fill="var(--border-strong)"/>' +
      /* LTS:2 */
      '<rect x="196" y="52" width="128" height="56" rx="8" fill="var(--surface)" stroke="var(--accent)"/>' +
      '<text x="260" y="76" fill="var(--accent)" font-size="11.5" font-weight="600" text-anchor="middle">LTS:2 准备 FRL</text>' +
      '<text x="260" y="94" fill="var(--text-dim)" font-size="10" text-anchor="middle">设定 FRL_Rate</text>' +
      '<line x1="152" y1="80" x2="192" y2="80" stroke="var(--accent)" stroke-width="2"/>' +
      '<polygon points="192,76 200,80 192,84" fill="var(--accent)"/>' +
      /* LTS:3 */
      '<rect x="368" y="52" width="150" height="56" rx="8" fill="var(--accent-soft)" stroke="var(--accent)"/>' +
      '<text x="443" y="76" fill="var(--accent-text)" font-size="11.5" font-weight="600" text-anchor="middle">LTS:3 训练进行中</text>' +
      '<text x="443" y="94" fill="var(--text-dim)" font-size="10" text-anchor="middle">LTP1–8 图案 + FFE</text>' +
      '<line x1="324" y1="80" x2="364" y2="80" stroke="var(--accent)" stroke-width="2"/>' +
      '<polygon points="364,76 372,80 364,84" fill="var(--accent)"/>' +
      /* 自环：失败降速 */
      '<path d="M443 108 C443 132 360 132 360 112" fill="none" stroke="var(--warn)" stroke-width="1.6"/>' +
      '<polygon points="356,112 364,112 360,104" fill="var(--warn)"/>' +
      '<text x="210" y="130" fill="var(--warn)" font-size="10">tFLT 200 ms 超时 → 降一档速率重试</text>' +
      /* LTS:P */
      '<rect x="560" y="52" width="64" height="56" rx="8" fill="var(--ok-soft)" stroke="var(--ok)"/>' +
      '<text x="592" y="76" fill="var(--ok)" font-size="11.5" font-weight="600" text-anchor="middle">LTS:P</text>' +
      '<text x="592" y="94" fill="var(--text-dim)" font-size="10" text-anchor="middle">训练通过</text>' +
      '<line x1="518" y1="80" x2="556" y2="80" stroke="var(--ok)" stroke-width="2"/>' +
      '<polygon points="556,76 564,80 556,84" fill="var(--ok)"/>' +
      /* LTP 图案清单 */
      '<text x="16" y="176" fill="var(--text-soft)" font-size="11">链路训练图案（LTP）：源在全部活动 Lane 上连续发送，直到宿请求下一个：</text>' +
      '<text x="24" y="196" fill="var(--text-dim)" font-size="10.5">LTP1 全 1 · LTP2 全 0 · LTP3 奈奎斯特时钟 · LTP4 TxFFE 一致性测试（128 个 0 接 128 个 1）</text>' +
      '<text x="24" y="214" fill="var(--text-dim)" font-size="10.5">LTP5–8 四条 Lane 的扰码 LFSR 图案（各 4096 字符，以 4 个 SR 字符开头）</text>' +
      '<text x="24" y="232" fill="var(--text-dim)" font-size="10.5">0x0E 特殊码：宿请求源调整 FFE 设置 · 0x0F 特殊码：宿请求改变链路模式（速率）</text>' +
      '<text x="16" y="256" fill="var(--text-soft)" font-size="11">训练只用于 FRL，TMDS 传输不训练；速率越高（12 Gbps）越依赖 FFE 把码间干扰压下去。</text>' +
      '<text x="16" y="272" fill="var(--text-dim)" font-size="11">控制与状态经 SCDC 交换：Update Flags / Configuration / Status Flags，都在 DDC 的 I²C 上跑。</text>' +
      '</svg>',

    /* FRL 封装层级：Tri-Byte → FRL 包 → 字符块 → 超块 → Lane */
    hdmiFrlLayers:
      '<svg class="bl-fig-svg" viewBox="0 0 640 306" role="img" aria-label="FRL 数据封装层级">' +
      '<rect x="0" y="0" width="640" height="306" fill="var(--surface-2)"/>' +
      '<text x="16" y="26" fill="var(--text-soft)" font-size="12" font-weight="600">FRL 数据封装：从三通道像素到 Lane 上的 18-bit 字符</text>' +
      /* 第一级 Tri-Byte */
      '<rect x="16" y="46" width="120" height="58" rx="8" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="76" y="70" fill="var(--text-soft)" font-size="11.5" text-anchor="middle">Tri-Byte</text>' +
      '<text x="76" y="88" fill="var(--text-dim)" font-size="10" text-anchor="middle">每字符期 3 字节</text>' +
      '<text x="76" y="100" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">（三通道各一字节）</text>' +
      '<line x1="136" y1="75" x2="168" y2="75" stroke="var(--accent)" stroke-width="2"/>' +
      '<polygon points="168,71 176,75 168,79" fill="var(--accent)"/>' +
      /* 第二级 FRL 包 */
      '<rect x="180" y="46" width="140" height="58" rx="8" fill="var(--surface)" stroke="var(--teal)"/>' +
      '<text x="250" y="70" fill="var(--teal)" font-size="11.5" text-anchor="middle">FRL 包（变长）</text>' +
      '<text x="250" y="88" fill="var(--text-dim)" font-size="10" text-anchor="middle">Map 头 + 负载</text>' +
      '<text x="250" y="100" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">有效视频 / 消隐 / 间隙</text>' +
      '<line x1="320" y1="75" x2="352" y2="75" stroke="var(--accent)" stroke-width="2"/>' +
      '<polygon points="352,71 360,75 352,79" fill="var(--accent)"/>' +
      /* 第三级 字符块 */
      '<rect x="364" y="46" width="132" height="58" rx="8" fill="var(--surface)" stroke="var(--accent)"/>' +
      '<text x="430" y="70" fill="var(--accent)" font-size="11.5" text-anchor="middle">字符块 510</text>' +
      '<text x="430" y="88" fill="var(--text-dim)" font-size="10" text-anchor="middle">502 数据 + 8 校验</text>' +
      '<text x="430" y="100" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">RS 校验 16 字节</text>' +
      '<line x1="496" y1="75" x2="528" y2="75" stroke="var(--accent)" stroke-width="2"/>' +
      '<polygon points="528,71 536,75 528,79" fill="var(--accent)"/>' +
      /* 第四级 超块 */
      '<rect x="540" y="46" width="84" height="58" rx="8" fill="var(--accent-soft)" stroke="var(--accent)"/>' +
      '<text x="582" y="70" fill="var(--accent-text)" font-size="11.5" text-anchor="middle">超块 ×4</text>' +
      '<text x="582" y="88" fill="var(--text-dim)" font-size="10" text-anchor="middle">前有 SSB/SR</text>' +
      /* 下半：超块内部结构 */
      '<rect x="16" y="132" width="608" height="104" rx="8" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="30" y="154" fill="var(--text-soft)" font-size="11">超块内部（每块 510 字符，其中 8 个是 RS 校验字符）：</text>' +
      '<rect x="30" y="164" width="86" height="30" rx="5" fill="var(--warn-soft)" stroke="var(--warn)"/><text x="73" y="184" fill="var(--warn)" font-size="10" text-anchor="middle">SSB/SR ×3/4</text>' +
      '<rect x="122" y="164" width="130" height="30" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/><text x="187" y="184" fill="var(--text-soft)" font-size="10" text-anchor="middle">字符块 0（Map 起始）</text>' +
      '<rect x="258" y="164" width="130" height="30" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/><text x="323" y="184" fill="var(--text-soft)" font-size="10" text-anchor="middle">字符块 1</text>' +
      '<rect x="394" y="164" width="130" height="30" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/><text x="459" y="184" fill="var(--text-soft)" font-size="10" text-anchor="middle">字符块 2</text>' +
      '<rect x="530" y="164" width="88" height="30" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/><text x="574" y="184" fill="var(--text-soft)" font-size="10" text-anchor="middle">字符块 3</text>' +
      '<text x="30" y="212" fill="var(--text-dim)" font-size="10">RS 校验在超块内还插入另外三处；Map 字符可出现在任意位置；Map Length 之和 = 2008。</text>' +
      '<text x="30" y="228" fill="var(--text-dim)" font-size="10">FRL 包不得跨超块；Gap 字符填补速率适配产生的空隙。</text>' +
      /* 底部：RS + 编码 */
      '<text x="16" y="262" fill="var(--text-soft)" font-size="11">之后两层加工：FRL 扰码（LFSR）→ 16b18b 编码（9b10b + 7b8b 查表，维持游动差值 ±1/±3）</text>' +
      '<text x="16" y="280" fill="var(--text-dim)" font-size="11">→ 每 Lane 一个 18-bit 字符、按 Round-Robin 分配到 3 或 4 条 Lane 串行发出。</text>' +
      '<text x="16" y="298" fill="var(--text-dim)" font-size="11">纠错能力：RS(255,251) over GF(256)，每块可纠正 t = 2 个符号错误。</text>' +
      '</svg>',

    /* VRR / FVA 对垂直时序的修改对比 */
    hdmiVrr:
      '<svg class="bl-fig-svg" viewBox="0 0 640 272" role="img" aria-label="VRR 与 FVA 对垂直时序的修改">' +
      '<rect x="0" y="0" width="640" height="272" fill="var(--surface-2)"/>' +
      '<text x="16" y="26" fill="var(--text-soft)" font-size="12" font-weight="600">VRR 与 FVA：都只改「垂直前沿 porch」一侧，不动 Vactive</text>' +
      /* 基准 */
      '<text x="20" y="58" fill="var(--text-soft)" font-size="11">基准时序</text>' +
      '<rect x="20" y="66" width="120" height="40" fill="var(--accent)"/>' +
      '<text x="80" y="91" fill="var(--surface)" font-size="10.5" text-anchor="middle">Vactive</text>' +
      '<rect x="140" y="66" width="16" height="40" fill="var(--border-strong)"/>' +
      '<rect x="156" y="66" width="10" height="40" fill="var(--teal)"/>' +
      '<rect x="166" y="66" width="30" height="40" fill="var(--border-strong)"/>' +
      '<text x="146" y="122" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">Vsync</text>' +
      '<text x="181" y="122" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">Vback</text>' +
      '<text x="80" y="122" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">Vfront</text>' +
      /* VRR */
      '<text x="240" y="58" fill="var(--text-soft)" font-size="11">VRR（Vfront + MVRR）</text>' +
      '<rect x="240" y="66" width="120" height="40" fill="var(--accent)"/>' +
      '<text x="300" y="91" fill="var(--surface)" font-size="10.5" text-anchor="middle">Vactive 不变</text>' +
      '<rect x="360" y="66" width="70" height="40" fill="var(--ok-soft)" stroke="var(--ok)"/>' +
      '<text x="395" y="91" fill="var(--ok)" font-size="10" text-anchor="middle">+MVRR</text>' +
      '<rect x="430" y="66" width="16" height="40" fill="var(--border-strong)"/>' +
      '<rect x="446" y="66" width="10" height="40" fill="var(--teal)"/>' +
      '<rect x="456" y="66" width="30" height="40" fill="var(--border-strong)"/>' +
      '<text x="240" y="122" fill="var(--text-dim)" font-size="9.5">画完就发，不等固定节拍</text>' +
      /* FVA */
      '<text x="240" y="158" fill="var(--text-soft)" font-size="11">FVA（× FVA_Factor，像素时钟同步提高）</text>' +
      '<rect x="240" y="166" width="120" height="40" fill="var(--accent)"/>' +
      '<text x="300" y="191" fill="var(--surface)" font-size="10.5" text-anchor="middle">Vactive 不变</text>' +
      '<rect x="360" y="166" width="70" height="40" fill="var(--ok-soft)" stroke="var(--ok)"/>' +
      '<text x="395" y="191" fill="var(--ok)" font-size="10" text-anchor="middle">Vfront×F+…</text>' +
      '<rect x="430" y="166" width="16" height="40" fill="var(--border-strong)"/>' +
      '<rect x="446" y="166" width="10" height="40" fill="var(--teal)"/>' +
      '<rect x="456" y="166" width="30" height="40" fill="var(--border-strong)"/>' +
      '<text x="240" y="222" fill="var(--text-dim)" font-size="9.5">缩短每帧传输时间，帧间空隙由拉长的 porch 填补</text>' +
      /* 要点 */
      '<line x1="16" y1="238" x2="624" y2="238" stroke="var(--border)"/>' +
      '<text x="16" y="256" fill="var(--text-soft)" font-size="11">要点：Vactive 行数永远不变；VRR 只加 Vfront；FVA 把 Vfront/Vsync/Vback 全部乘以系数；两者可叠加。</text>' +
      '<text x="16" y="268" fill="var(--text-dim)" font-size="11">VRR 基准时序须 ≥ 50 Hz；不得用于隔行。营销名：QMS = VRR + M_CONST，QFT = FVA。</text>' +
      '</svg>',

    /* eARC 系统：音频经 HPD / Utility 回传 */
    hdmiAudio:
      '<svg class="bl-fig-svg" viewBox="0 0 640 250" role="img" aria-label="eARC 音频回传通道">' +
      '<rect x="0" y="0" width="640" height="250" fill="var(--surface-2)"/>' +
      '<text x="16" y="26" fill="var(--text-soft)" font-size="12" font-weight="600">eARC：借 HPD 与 Utility 两根线，把音频从电视回传给功放</text>' +
      /* 电视 */
      '<rect x="20" y="52" width="180" height="120" rx="10" fill="var(--surface)" stroke="var(--accent)"/>' +
      '<text x="110" y="76" fill="var(--accent)" font-size="11.5" font-weight="600" text-anchor="middle">电视（eARC TX）</text>' +
      '<text x="110" y="98" fill="var(--text-dim)" font-size="10" text-anchor="middle">视频主链路照常下行</text>' +
      '<text x="110" y="116" fill="var(--text-dim)" font-size="10" text-anchor="middle">音频改走回传通道</text>' +
      '<rect x="40" y="132" width="140" height="24" rx="5" fill="var(--accent-soft)" stroke="var(--accent)"/>' +
      '<text x="110" y="149" fill="var(--accent-text)" font-size="10" text-anchor="middle">eARC 发送（差分 + 共模）</text>' +
      /* 功放 */
      '<rect x="440" y="52" width="180" height="120" rx="10" fill="var(--surface)" stroke="var(--teal)"/>' +
      '<text x="530" y="76" fill="var(--teal)" font-size="11.5" font-weight="600" text-anchor="middle">功放 / 音响（eARC RX）</text>' +
      '<text x="530" y="98" fill="var(--text-dim)" font-size="10" text-anchor="middle">半双工发现与通信</text>' +
      '<text x="530" y="116" fill="var(--text-dim)" font-size="10" text-anchor="middle">不依赖 CEC 也能发现</text>' +
      '<rect x="460" y="132" width="140" height="24" rx="5" fill="var(--surface)" stroke="var(--teal)"/>' +
      '<text x="530" y="149" fill="var(--teal)" font-size="10" text-anchor="middle">eARC 接收 + 能力上报</text>' +
      /* 中间通道 */
      '<rect x="216" y="60" width="208" height="104" rx="8" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<line x1="232" y1="86" x2="408" y2="86" stroke="var(--warn)" stroke-width="2"/>' +
      '<text x="320" y="80" fill="var(--warn)" font-size="10" text-anchor="middle">HPD 线：差分音频 36.864 Mbps</text>' +
      '<line x1="408" y1="110" x2="232" y2="110" stroke="var(--teal)" stroke-width="2"/>' +
      '<text x="320" y="104" fill="var(--teal)" font-size="10" text-anchor="middle">Utility 线：共模数据 / 发现</text>' +
      '<text x="320" y="132" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">压缩音频 24.576 Mbps（如 IEC 61937 @768 kHz 帧率）</text>' +
      '<text x="320" y="148" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">建链失败可回退 H14b ARC</text>' +
      /* 带宽说明 */
      '<line x1="16" y="192" x2="624" y2="192" stroke="var(--border)"/>' +
      '<text x="16" y="212" fill="var(--text-soft)" font-size="11">非压缩有效载荷带宽 36.864 Mbps ≈ 8 声道 24-bit 192 kHz L-PCM；</text>' +
      '<text x="16" y="230" fill="var(--text-dim)" font-size="11">前向（源→宿）音频走数据岛期，最高 49.152 Mbps 的 IEC 61937 压缩流、One Bit Audio、</text>' +
      '<text x="16" y="248" fill="var(--text-dim)" font-size="11">HDMI 3D Audio（10.2 / 22.2 / 30.2 音箱摆位）与最多 4 流的 Multi-Stream Audio 都经 eARC 回传。</text>' +
      '</svg>',

    /* 8 bpc 非压缩 FRL 配置速查：格式 × 像素编码 → 速率 / Lane 数 */
    hdmiBandwidth:
      '<svg class="bl-fig-svg" viewBox="0 0 640 300" role="img" aria-label="8 bpc 非压缩 FRL 配置速查表">' +
      '<rect x="0" y="0" width="640" height="300" fill="var(--surface-2)"/>' +
      '<text x="16" y="26" fill="var(--text-soft)" font-size="12" font-weight="600">8 bpc 非压缩视频的 FRL 配置速查（源自规范 Table 7-32）</text>' +
      /* 表头 */
      '<rect x="16" y="40" width="180" height="28" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/><text x="106" y="59" fill="var(--text-soft)" font-size="10.5" font-weight="600" text-anchor="middle">视频格式（VIC）</text>' +
      '<rect x="200" y="40" width="200" height="28" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/><text x="300" y="59" fill="var(--text-soft)" font-size="10.5" font-weight="600" text-anchor="middle">4:4:4（8 bit）</text>' +
      '<rect x="404" y="40" width="220" height="28" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/><text x="514" y="59" fill="var(--text-soft)" font-size="10.5" font-weight="600" text-anchor="middle">4:2:0（8 bit）</text>' +
      /* 行 */
      '<rect x="16" y="72" width="180" height="26" rx="5" fill="var(--surface)" stroke="var(--border)"/><text x="106" y="90" fill="var(--text-dim)" font-size="10" text-anchor="middle">1080p100 / 120</text>' +
      '<rect x="200" y="72" width="200" height="26" rx="5" fill="var(--surface)" stroke="var(--border)"/><text x="300" y="90" fill="var(--text-soft)" font-size="10" text-anchor="middle">3 Gbps × 3 Lane</text>' +
      '<rect x="404" y="72" width="220" height="26" rx="5" fill="var(--surface)" stroke="var(--border)"/><text x="514" y="90" fill="var(--err)" font-size="10" text-anchor="middle">不允许（<590 MHz）</text>' +
      '<rect x="16" y="102" width="180" height="26" rx="5" fill="var(--surface)" stroke="var(--border)"/><text x="106" y="120" fill="var(--text-dim)" font-size="10" text-anchor="middle">4K24 / 25 / 30</text>' +
      '<rect x="200" y="102" width="200" height="26" rx="5" fill="var(--surface)" stroke="var(--border)"/><text x="300" y="120" fill="var(--text-soft)" font-size="10" text-anchor="middle">3 Gbps × 3 Lane</text>' +
      '<rect x="404" y="102" width="220" height="26" rx="5" fill="var(--surface)" stroke="var(--border)"/><text x="514" y="120" fill="var(--err)" font-size="10" text-anchor="middle">不允许（<590 MHz）</text>' +
      '<rect x="16" y="132" width="180" height="26" rx="5" fill="var(--surface)" stroke="var(--border)"/><text x="106" y="150" fill="var(--text-dim)" font-size="10" text-anchor="middle">4K48 / 50 / 60</text>' +
      '<rect x="200" y="132" width="200" height="26" rx="5" fill="var(--surface)" stroke="var(--border)"/><text x="300" y="150" fill="var(--text-soft)" font-size="10" text-anchor="middle">6 Gbps × 3 Lane</text>' +
      '<rect x="404" y="132" width="220" height="26" rx="5" fill="var(--surface)" stroke="var(--border)"/><text x="514" y="150" fill="var(--text-soft)" font-size="10" text-anchor="middle">3 Gbps × 3 Lane</text>' +
      '<rect x="16" y="162" width="180" height="26" rx="5" fill="var(--surface)" stroke="var(--border)"/><text x="106" y="180" fill="var(--text-dim)" font-size="10" text-anchor="middle">4K100 / 120</text>' +
      '<rect x="200" y="162" width="200" height="26" rx="5" fill="var(--surface)" stroke="var(--border)"/><text x="300" y="180" fill="var(--text-soft)" font-size="10" text-anchor="middle">8 Gbps × 4 Lane</text>' +
      '<rect x="404" y="162" width="220" height="26" rx="5" fill="var(--surface)" stroke="var(--border)"/><text x="514" y="180" fill="var(--text-soft)" font-size="10" text-anchor="middle">6 Gbps × 3 Lane</text>' +
      '<rect x="16" y="192" width="180" height="26" rx="5" fill="var(--surface)" stroke="var(--border)"/><text x="106" y="210" fill="var(--text-dim)" font-size="10" text-anchor="middle">8K24 / 25 / 30</text>' +
      '<rect x="200" y="192" width="200" height="26" rx="5" fill="var(--surface)" stroke="var(--border)"/><text x="300" y="210" fill="var(--text-soft)" font-size="10" text-anchor="middle">8 Gbps × 4 Lane</text>' +
      '<rect x="404" y="192" width="220" height="26" rx="5" fill="var(--surface)" stroke="var(--border)"/><text x="514" y="210" fill="var(--text-soft)" font-size="10" text-anchor="middle">6 Gbps × 3 Lane</text>' +
      '<rect x="16" y="222" width="180" height="26" rx="5" fill="var(--surface)" stroke="var(--border)"/><text x="106" y="240" fill="var(--text-dim)" font-size="10" text-anchor="middle">8K48 / 50 / 60</text>' +
      '<rect x="200" y="222" width="200" height="26" rx="5" fill="var(--err-soft)" stroke="var(--err)"/><text x="300" y="240" fill="var(--err)" font-size="10" text-anchor="middle">非压缩不可达 → 需 DSC</text>' +
      '<rect x="404" y="222" width="220" height="26" rx="5" fill="var(--surface)" stroke="var(--border)"/><text x="514" y="240" fill="var(--text-soft)" font-size="10" text-anchor="middle">8 Gbps × 4 Lane</text>' +
      /* 结论 */
      '<line x1="16" y1="260" x2="624" y2="260" stroke="var(--border)"/>' +
      '<text x="16" y="278" fill="var(--text-soft)" font-size="11">4:2:0 只要一半数据率，但像素时钟 <590 MHz 的格式禁用；</text>' +
      '<text x="16" y="294" fill="var(--text-dim)" font-size="11">10 / 12 bit 或 4K120 以上需求抬高一档——这正是「A = 非压缩 4:2:0 / B = DSC 压缩」两种营销名的由来。</text>' +
      '</svg>'

  };

  Object.keys(FIGURES).forEach(function (k) { D.figures[k] = FIGURES[k]; });

  /* ------------------------------------------------------------------ 术语 */
  var GLOSSARY = [
    ['Source / Sink', '源 / 宿', '规范里的角色：发送 HDMI 流的是 Source，接收的是 Sink；同一器件对不同连接器可扮演不同角色'],
    ['TMDS', '最小化传输差分信号', 'HDMI 1.x–2.0 的主传输方式：三对数据线 + 一对时钟，8-bit 数据经 10-bit 编码串行发送'],
    ['FRL (Fixed Rate Link)', '固定速率链路', 'HDMI 2.1 新增的主传输方式：TMDS 时钟对也改为数据 Lane，速率固定分档，靠链路训练协商'],
    ['Mcsc', '每秒兆字符数', 'TMDS 字符速率单位；高于 340 Mcsc 后时钟速率降为字符速率的 1/4'],
    ['Lane', '通道', 'FRL 下的一对差分线；3 Lane 或 4 Lane 两种模式，速率分 3 / 6 / 8 / 10 / 12 Gbps'],
    ['16b18b coding', '16b18b 编码', 'FRL 的线路编码：16-bit 数据切成 9-bit + 7-bit，分别查 9b10b 与 7b8b 表，输出 18-bit 字符'],
    ['Running Disparity', '游动差值', '已发 1 的个数减去 0 的个数；编码时选码字使其保持在 ±1 / ±3，保证直流平衡'],
    ['LFSR', '线性反馈移位寄存器', '产生扰码序列与训练图案的移位寄存器结构'],
    ['Link Training', '链路训练', 'FRL 启用前 Source/Sink 交换 LTP 图案、协商速率与 FFE 的过程，TMDS 不使用'],
    ['LTP (Link Training Pattern)', '链路训练图案', '训练用的 9 类图案：全 1 / 全 0 / 奈奎斯特时钟 / FFE 测试 / 四条 Lane 的 LFSR 图案 / 两类特殊请求'],
    ['FFE (Feed Forward Equalizer)', '前馈均衡器', '发送端的 3-tap 均衡，抵消码间干扰；训练时可被宿请求调整'],
    ['CTLE / DFE', '连续时间线性均衡器 / 判决反馈均衡器', '接收端参考均衡模型，用于一致性测试中的眼图与抖动测量'],
    ['Tri-Byte', '三字节组', '每个 TMDS 字符期内三通道各取一字节组成的三字节，是 FRL 打包的输入单位'],
    ['FRL Packet', 'FRL 包', 'FRL 链路层的变长封装单位，分有效视频 / 压缩视频 / 消隐 / 间隙四类，以 Map 字符开头'],
    ['Character Block', '字符块', '510 个 FRL 字符：502 个载数据，8 个载 16 字节 RS 校验'],
    ['Super Block', '超块', '4 个字符块 + 起始的 SSB/SR 字符；FRL 包不得跨超块；块内 Map Length 之和为 2008'],
    ['SSB / SR', '起始超块 / 扰码复位字符', '逗号码，各活动 Lane 同时发送，用于接收端字符对齐'],
    ['RS FEC', '里德-所罗门前向纠错', 'RS(255,251) over GF(256)，每个码块可纠正 t = 2 个符号错误，保护 FRL 流'],
    ['CED', '字符错误检测', '对 TMDS / FRL 做字符级错误计数，经 SCDC 上报，便于诊断链路质量'],
    ['VRR / FVA', '可变刷新率 / 快速有效行', 'VRR 通过加长垂直前沿实现「画完即发」；FVA 提高像素时钟缩短每帧传输时间'],
    ['MVRR / FVA_Factor', 'VRR 附加行数 / FVA 倍数', 'MVRR 是 Vfront 额外增加的行数；FVA_Factor 是 Vtotal 的整数倍'],
    ['QMS / QFT', '快速媒体切换 / 快速帧传输', 'VRR + M_CONST 与 FVA 的营销名，分别服务于内容切换与低延迟传输'],
    ['ALLM', '自动低延迟模式', '源通过 HF-VSIF 自动开关宿的低延迟模式，与菜单设置为「或」的关系'],
    ['eARC', '增强音频回传通道', '借 HPD 与 Utility 线的差分音频回传，非压缩载荷 36.864 Mbps，发现不依赖 CEC'],
    ['CEC', '消费电子控制', '一线制双向控制总线，HDMI 2.1 携带 CEC 2.0：扩展强制特性集、新增逻辑地址 12/13'],
    ['E-EDID / HF-VSDB', '扩展显示识别数据 / HDMI 论坛厂商特定数据块', '宿经 DDC 上报能力；HF-VSDB 承载 FRL / DSC / VRR / ALLM 等 2.1 特性位'],
    ['SCDC', '状态与控制数据通道', '跑在 DDC I²C 上的点对点寄存器集：更新标志、链路配置、错误计数都在这里'],
    ['HF-VSIF', 'HDMI 论坛厂商特定信息帧', '承载 ALLM_Mode、CCBPC、VRR 基准时序等 2.1 信令的信息帧'],
    ['EMP', '扩展元数据包', '可携带超过单个 HDMI 包容量数据集的通用机制，用于压缩视频元数据、动态 HDR、视频时序扩展'],
    ['Category 3 Cable', '三类线缆', 'HDMI 2.1 引入的线缆等级（营销名 Ultra High Speed），支持 48 Gbps；引脚与旧连接器兼容'],
    ['HPD', '热插拔检测', '宿向源报告「在位且已上电」的信号，低电平 ≥100 ms 会复位 SCDC 源版本寄存器'],
    ['VIC', '视频识别码', 'CTA-861-G 中视频格式的编号，如 VIC 117 = 4K100、118 = 4K120、198/199 = 8K50/60']
  ];

  /* MORE_GLOSSARY */

  /* ------------------------------------------------------------------ 文章 */
  D.posts.push({
    id: 'hdmi',
    title: 'HDMI 2.1 接口规范技术解析',
    titleEn: 'HDMI Specification 2.1 — Deep Dive',
    subtitle: '从 19 针连接器、TMDS 与 FRL 双传输模式、链路训练、RS 纠错，到 4:2:0、VRR/FVA、' +
      '压缩视频传输与 eARC：把「48 Gbps」这条链路拆开看',
    category: '显示接口',
    tags: ['HDMI 2.1', 'FRL', 'TMDS', '16b18b', '链路训练', 'VRR / FVA', 'eARC', 'SCDC'],
    source: {
      name: 'HDMI Forum',
      label: 'HDMI Specification Version 2.1（替代 HDMI 2.0b，并入 HDMI 1.4b）',
      url: 'https://www.hdmi.org/',
      note: '本篇是基于规范正文的学习性中文原理整理，非官方译文，也未转载规范原表格与插图；' +
        '数据以 HDMI Forum 发布的 HDMI Specification 2.1 为准，产品合规请以规范原文与 HDMI CTS 为最终依据。'
    },
    license: 'HDMI 规范原文版权归 HDMI Forum, Inc. 所有，商业使用需另行获得 HDMI Licensing ' +
      'Administrator, Inc. 许可；本页为学习用途的中文原理整理，只复述机制与参数含义，' +
      '未转载规范原表格与插图，示意图均按规范描述重绘。',
    summary: 'HDMI 2.1 是 HDMI Forum 对接口做的一次「带宽 + 特性」双升级：物理层新增 FRL 模式，' +
      '把原来传时钟的那对线也改成数据 Lane，最高 4 Lane × 12 Gbps = **48 Gbps**；' +
      '为了在更高速率下稳住链路，引入了链路训练、16b18b 编码、RS(255,251) 前向纠错与字符错误检测。' +
      '在应用层，它补上了 YCbCr 4:2:0、BT.2020、VRR/FVA、基于 VESA DSC 的压缩视频传输、' +
      'eARC 音频回传、ALLM、EMP 与 CEC 2.0。本篇按规范正文的顺序，' +
      '从连接器与线缆开始，一路讲到控制信令与中继器，把每个特性的动机与机制讲清。',
    glossary: GLOSSARY,
    chapters: [
      /* ======================================================== 01 HDMI 2.1 是什么 */
      {
        id: 'what',
        num: '01',
        title: 'HDMI 2.1 是什么',
        titleEn: 'What HDMI 2.1 Is',
        lead: 'HDMI 2.1 并不是「把线加粗」的小改款：它在保持连接器兼容的前提下，' +
          '换掉了主传输模式、加了前向纠错，并一次性补齐了 4:2:0、VRR、压缩传输、' +
          'eARC、ALLM 等一大票应用层特性。规范开篇就把立场写得很清楚：==所有特性都是可选的，' +
          '但一旦实现就必须满足该特性的最低要求==。',
        sections: [
          {
            id: 'position',
            title: '版本定位与继承关系',
            titleEn: 'Version and Lineage',
            blocks: [
              { t: 'fig', id: 'hdmiSystem', caption: 'HDMI 端到端系统：视频音频主链路单向走 4 对差分线，发现 / 状态 / 控制走 DDC、HPD、CEC 与 Utility 侧信道。' },
              { t: 'p', v: 'HDMI Specification 2.1 由 HDMI Forum 制定，**替代 HDMI 2.0b**，' +
                '并以「引用并入」的方式继承 **HDMI 1.4b（H14b）**：' +
                'H14b 定义的机械、电气、行为与协议要求继续有效，2.1 只在其上做增量。' +
                '这意味着一个 2.1 器件必须能和只满足 H14b 最低强制要求的旧器件互通。' },
              { t: 'p', v: '规范为 Source、Sink、Repeater 与 Cable 四类角色分别定义合规要求。' +
                '要注意「可选」的粒度是**按特性**的：一台电视可以只实现 FRL + VRR 而不实现 eARC，' +
                '只要它在 E-EDID 里如实上报能力即可。' },
              { t: 'callout', kind: 'key', title: '2.1 的增量清单（规范第 2 节自述）',
                v: 'TMDS 字符速率从 340 Mcsc 扩展到 **600 Mcsc**；全速率 TMDS 加扰；' +
                  'TMDS 字符错误检测（CED）；全新的 **FRL** 电气模式与链路层；' +
                  '**Category 3 线缆**；基于 VESA DSC 1.2a 的**压缩视频传输**；' +
                  '**VRR 与 FVA**；**eARC**；**ALLM**；**EMP** 扩展元数据；**CEC 2.0**；' +
                  '以及对 Repeater 操作的澄清。' }
            ]
          },
          {
            id: 'marketing',
            title: '营销名与技术特性的对应',
            titleEn: 'Marketing Feature Names',
            blocks: [
              { t: 'p', v: '规范第 2.1 节定义了一批**营销特性名**：设备满足某特性的最低要求时才允许使用对应名称，' +
                '且不应使用替代名称。这解决了一个现实问题——' +
                '「支持 HDMI 2.1」不等于「支持 2.1 的全部特性」，营销名把最低要求钉死在了具体章节上。' },
              { t: 'table', head: ['营销名', '等价缩写', '依据的 2.1 特性', '规范章节'], rows: [
                ['4K100A / 4K100B / 4K100AB', '—', '4K100 非压缩（A）或压缩（B），或两者都支持', '7.8.1'],
                ['4K120A / 4K120B / 4K120AB', '—', '同上，刷新率 120 Hz', '7.8.1'],
                ['8K50A / 8K50B / 8K50AB', '—', '同上，8K50 Hz', '7.8.1'],
                ['8K60A / 8K60B / 8K60AB', '—', '同上，8K60 Hz', '7.8.1'],
                ['Variable Refresh Rate', 'VRR', '可变刷新率', '7.6'],
                ['Quick Media Switching', 'QMS', 'VRR + M_CONST', '7.6'],
                ['Quick Frame Transport', 'QFT', 'Fast VActive', '7.6'],
                ['Auto Low Latency Mode', 'ALLM', '自动低延迟模式', '10.11'],
                ['Enhanced Audio Return Channel', 'eARC', '增强音频回传通道', '9.5'],
                ['Ultra High Speed HDMI Cable', '—', 'Category 3 线缆', '5']
              ] },
              { t: 'callout', kind: 'info', title: 'A / B 后缀的含义',
                v: '以 8K60 为例：**8K60A** = 非压缩 FRL 传输 VIC 199（7680×4320@60 Hz、10 bit、4:2:0）；' +
                  '**8K60B** = 压缩 FRL 传输同一格式（主 4:4:4 压缩格式）。' +
                  '设备支持某档 8K60 格式时，至少要实现 A 或 B 之一；AB 表示两者都支持。' }
            ]
          },
          {
            id: 'reading',
            title: '怎么读这本 518 页的规范',
            titleEn: 'How to Read the Spec',
            blocks: [
              { t: 'p', v: '规范正文共 12 章加 9 个附录，本文的章节安排即遵循其顺序：' +
                '第 5 章连接器与线缆 → 第 6 章物理层与链路层（TMDS 与 FRL）→ ' +
                '第 7 章视频扩展 → 第 8 / 9 章包与音频 → 第 10 章控制与配置 → ' +
                '第 11 章 CEC → 第 12 章中继器。附录 A–I 是信息性内容（示例、参考设计等）。' },
              { t: 'p', v: '一个实用提示：规范用 **shall / should / may** 区分强制、建议与许可；' +
                '涉及 CTS（一致性测试）的条款往往还有 Companion Documents（第 4.4 节）配套的' +
                '表格与模型文件，例如 16b18b 编码表就在 `HDMI_16b18b_Coding_v1.xlsx` 里。' }
            ]
          }
        ]
      },

      /* ======================================================== 02 连接器与线缆 */
      {
        id: 'connector',
        num: '02',
        title: '连接器与线缆：48 Gbps 的物理前提',
        titleEn: 'Cables and Connectors',
        lead: 'HDMI 2.1 没有换连接器：Type A / C / D 的引脚定义与旧版保持兼容，' +
          'FRL 只是把「TMDS 时钟对」更名为「Data3」。真正的新东西是 **Category 3 线缆**' +
          '（营销名 Ultra High Speed）——它把插入损耗、串扰、模式转换都管了起来，' +
          '才撑得起 12 Gbps/Lane。',
        sections: [
          {
            id: 'pins',
            title: 'Type A 的 19 针',
            titleEn: 'Type A Pinout',
            blocks: [
              { t: 'fig', id: 'hdmiConnector', caption: 'Type A 连接器 19 针：Category 3 把针 10–12 从「TMDS 时钟」改名为「Data3」，FRL 下时钟信息内嵌于码流。' },
              { t: 'p', v: 'Type A 共 19 针：四对差分数据线（各带屏蔽，针 1–12）、' +
                '一对 DDC（SCL/SDA，针 15/16）、CEC（针 13）、Utility/HEAC（针 14）、' +
                'DDC/CEC 地（17）、+5V 供电（18）与 HPD（19）。' +
                'Type C（mini）与 Type D（micro）只是排列不同，信号定义一致。' },
              { t: 'p', v: '**+5V 由源供向宿**：宿最多可取 50 mA，线缆自身最多取 55 mA；' +
                '**HPD** 告诉源「宿在位且已上电」，源据此启动 E-EDID 读取。' +
                'eARC 后来把 HPD 与 Utility 这两根「边角料」线复用成了音频回传通道。' }
            ]
          },
          {
            id: 'cat3',
            title: 'Category 3 线缆的指标',
            titleEn: 'Category 3 Cable',
            blocks: [
              { t: 'p', v: 'Category 3 线缆在 Category 2 全部要求之上追加了一组高频指标，' +
                '核心是**差模转共模（模式转换）**与**衰减/串扰比（ACR）**——' +
                '这两项直接决定 12 Gbps 下的 EMI 与误码率。' },
              { t: 'table', head: ['参数', '限值'], rows: [
                ['线内时差（Intra-pair skew，数据 Lane 0–3）', '≤ 30 ps'],
                ['线间时差（Inter-pair skew）', '≤ 500 ps'],
                ['差分阻抗（连接点/过渡区，≤1 ns）', '100 Ω ± 10%（单次超出 ≤ ±15% 且 <150 ps 允许）'],
                ['差分阻抗（缆体区，1–2.5 ns）', '100 Ω ± 10%'],
                ['模式转换（Scd21 等，≤12 GHz）', '≤ -16 dB'],
                ['衰减（DIL）参考值', '1 GHz -5 dB / 3 GHz -9.2 dB / 6 GHz -16.5 dB / 12 GHz -29 dB'],
                ['ACR 参考值', '4 GHz -20 dB / 7 GHz -10 dB / 12 GHz -5 dB']
              ] },
              { t: 'callout', kind: 'warn', title: '眼图是最终裁判',
                v: '若线内时差、ACR、衰减、差分阻抗中任何一项不合格，' +
                  '线缆仍可通过 **12 Gbps 眼图测试**（Figure 6-11 / Table 6-24）来补救；' +
                  '但线间时差与模式转换两项不设眼图豁免，==必须达标==。' }
            ]
          },
          {
            id: 'contacts',
            title: '接触顺序与三速线缆生态',
            titleEn: 'Contact Sequence and Cable Ecosystem',
            blocks: [
              { t: 'p', v: '规范定义了连接器的**接触顺序**：插入时较长的地/电源针先接触、' +
                '高速针后接触，拔出时反之，避免热插拔瞬间的浪涌与打火。' +
                '机械性能（插拔寿命）与辐射发射也有对应条款。' },
              { t: 'p', v: '按针脚兼容性，旧连接器配 Category 3 引脚定义即可用于 2.1；' +
                '3 Lane 的 3 / 6 Gbps 配置往往也能跑在 Category 2 线缆上（规范不保证），' +
                '但 **Converter 型线缆不能用于 FRL**。4 Lane 的 8 / 10 / 12 Gbps 请认准 ' +
                'Ultra High Speed（Category 3）标识。' }
            ]
          }
        ]
      },

      /* ======================================================== 03 TMDS */
      {
        id: 'tmds',
        num: '03',
        title: 'TMDS：经典传输模式及其最后延伸',
        titleEn: 'TMDS: The Legacy Mode',
        lead: 'TMDS 是 HDMI 1.x–2.0 的传输方式：三对数据线各传一条通道、一对线传时钟，' +
          '每个 8-bit 字节被编码成直流平衡的 10-bit 字符。HDMI 2.1 把它的字符速率上限' +
          '从 340 Mcsc 拉到 **600 Mcsc**（≈18 Gbps），并补上了全速率加扰与字符错误检测——' +
          '这是 TMDS 的最后一班车。',
        sections: [
          {
            id: 'how',
            title: '一行的时间结构',
            titleEn: 'Line Structure',
            blocks: [
              { t: 'fig', id: 'hdmiTmds', caption: 'TMDS 一行由控制期、数据岛期与视频数据期组成，期与期之间用保护带字符隔离。' },
              { t: 'p', v: '每个 TMDS 字符期，三对数据线各传一个 10-bit 字符。' +
                '**视频数据期**承载有效像素：像素的 R/G/B（或 Y/Cb/Cr）分量分配到三条通道；' +
                '**数据岛期**承载音频包与信息帧（AVI InfoFrame 等）；' +
                '**控制期**在行消隐里传递同步电平。期与期之间插入**保护带字符**' +
                '（两通道 0b1011001100、一通道取反），隔离前后两种编码域。' },
              { t: 'p', v: '消隐期还可以用**像素重复**（Pixel Repeat）与数据岛期传输低带宽内容；' +
                '4:2:0 启用时像素重复被禁止（见第 7 章）。' }
            ]
          },
          {
            id: 'ext',
            title: '340 → 600 Mcsc：时钟关系的变化',
            titleEn: 'Beyond 340 Mcsc',
            blocks: [
              { t: 'p', v: 'H14b 的 TMDS 时钟速率等于字符速率（比特速率 = 10 × 时钟速率）。' +
                'HDMI 2.1 规定：**字符速率高于 340 Mcsc 后，时钟速率降为字符速率的 1/4**，' +
                '比特速率仍为 10 × 字符速率，即 40 × 时钟速率。' +
                '源通过 TMDS_Bit_Clock_Ratio 控制位告知宿这一关系。' },
              { t: 'p', v: '宿设备经 HF-VSDB 的 **Max_TMDS_Character_Rate** 字段上报自己支持的最高字符速率；' +
                '源不得超出。TMDS 电气参数沿用 H14b 的定义，2.1 只补充 340–600 Mcsc 区间的' +
                '源/宿特性与抖动、眼图测试点（TP1 / TP2 / TP2_EQ）。' },
              { t: 'callout', kind: 'info', title: '为什么时钟只到 150 MHz',
                v: '600 Mcsc 时若仍按 1:1 传时钟，时钟线要跑 600 MHz——比数据线还快，' +
                  '反而更难。降为 1/4 后时钟线只有 150 MHz，' +
                  '宿端用时钟恢复单元（CRU）从数据里再生采样时钟。' }
            ]
          },
          {
            id: 'scramble',
            title: '加扰与字符错误检测',
            titleEn: 'Scrambling and CED',
            blocks: [
              { t: 'p', v: 'HDMI 2.1 把**加扰**扩展到所有 TMDS 字符速率（H14b 只有 HDMI 2.0 的部分模式支持）：' +
                '源用 LFSR 对视频数据、数据岛与保护带加扰，降低 EMI/RFI；' +
                '加扰器的同步由控制期管理，控制期本身的时序关系有专门条款规定。' +
                '加扰状态可通过 SCDC 的 TMDS Scrambler Status 寄存器查询。' },
              { t: 'p', v: '**字符错误检测（CED）** 让宿对每条通道做字符级错误计数，' +
                '经 SCDC 的 15-bit 错误计数器（每通道两个寄存器）与校验和上报。' +
                '这给「线材行不行、速率是不是太高了」提供了一个能量化的现场判据——' +
                '调试时先读 CED 计数器，往往比看花屏更早发现问题。' }
            ]
          }
        ]
      },

      /* ======================================================== 04 FRL */
      {
        id: 'frl',
        num: '04',
        title: 'FRL：固定速率链路',
        titleEn: 'Fixed Rate Link',
        lead: 'FRL 是 HDMI 2.1 的新主传输模式：TMDS 的三对数据线重命名为 Lane 0–2，' +
          '原来传时钟的那对线也改成 **Lane 3**，时钟信息内嵌于码流；' +
          '速率固定分档，靠**链路训练**协商，配 16b18b 编码与 RS 纠错。' +
          '最高 4 Lane × 12 Gbps，编码后净带宽 **48 Gbps**。',
        sections: [
          {
            id: 'why-frl',
            title: '为什么换掉 TMDS',
            titleEn: 'Motivation',
            blocks: [
              { t: 'fig', id: 'hdmiFrlRates', caption: 'FRL 六种配置的总带宽：3/6 Gbps 三 Lane，6/8/10/12 Gbps 四 Lane；对照 TMDS 上限约 18 Gbps。' },
              { t: 'p', v: 'TMDS 的时钟随数据率连续变化，速率越高，时钟线的抖动与 EMI 越难收拾；' +
                '而显示链路真正需要的是「协商好一个固定速率，然后稳稳地发」。' +
                'FRL 把速率收敛到六个离散档位，换来三样东西：' +
                '**发送端可以针对固定速率做 FFE 调优**、**接收端均衡模型可以按档位设计**、' +
                '**链路层可以前向纠错**。' },
              { t: 'p', v: '代价是复杂度：FRL 需要链路训练、16b18b 编码、RS 校验与 scrambler，' +
                '且必须配 Category 3 线缆。因此规范采取了渐进策略——' +
                'TMDS 与 FRL 长期共存，设备按能力二选一（见第 11 章的 LTS:L 回退路径）。' }
            ]
          },
          {
            id: 'lanes',
            title: 'Lane 配置与速率档位',
            titleEn: 'Lane Configuration',
            blocks: [
              { t: 'table', head: ['每 Lane 速率', 'Lane 数', '编码后总带宽'], rows: [
                ['3 Gbps', '3', '9 Gbps'],
                ['6 Gbps', '3', '18 Gbps'],
                ['6 Gbps', '4', '24 Gbps'],
                ['8 Gbps', '4', '32 Gbps'],
                ['10 Gbps', '4', '40 Gbps'],
                ['12 Gbps', '4', '48 Gbps']
              ] },
              { t: 'p', v: '三 Lane 模式下源只允许配置 **3 或 6 Gbps**，且必须停用 Lane 3（无跳变），' +
                '两端以 50–150 Ω 差分阻抗端接；四 Lane 模式允许 **6 / 8 / 10 / 12 Gbps**，' +
                '所有活动 Lane 必须同速率。源不得配置其他速率——' +
                '这就是「Fixed Rate」的含义：档位封闭，便于测试与均衡设计。' },
              { t: 'callout', kind: 'key', title: '48 Gbps 是编码后的净带宽',
                v: '16b18b 编码效率 16/18 ≈ 0.889，所以 12 Gbps × 4 Lane 的裸线速率 ' +
                  '对应 48 Gbps 的净荷。再扣掉 RS 校验、包开销与消隐期，' +
                  '真正留给像素的略少于 48 Gbps——这也是 8K60 10-bit 4:4:4 非压缩放不下、' +
                  '必须上 DSC 压缩的原因（见第 9 章）。' }
            ]
          },
          {
            id: 'electrical',
            title: '电气与均衡',
            titleEn: 'Electrical and Equalization',
            blocks: [
              { t: 'p', v: 'FRL 眼图要求相对理想 CRU 定义，CRU 的抖动传递函数在 ' +
                '12/10/8/6 Gbps 与 3 Gbps 两档取值。一致性测试用**参考 CTLE**（1–8 dB 增益）' +
                '加一抽头参考 DFE 搭建：12 Gbps 源 TP2_EQ 测试用最坏线缆模型 WCM3 + 8 dB CTLE + 25 mV DFE，' +
                '以及短线模型 SCM3 + 1 dB CTLE；宿的抖动容忍测试同理。' },
              { t: 'p', v: '发送侧提供**3-tap FFE**（去加重 / 预冲级可调），' +
                '训练时宿可通过 LTP 特殊码请求源调整 FFE 设置——' +
                '这是 FRL 能把 12 Gbps 塞进同一对线的关键手段。' }
            ]
          }
        ]
      },

      /* ======================================================== 05 链路训练 */
      {
        id: 'training',
        num: '05',
        title: 'FRL 链路训练',
        titleEn: 'FRL Link Training',
        lead: 'FRL 启用前，源与宿必须完成一次**链路训练**：从读 EDID 开始，' +
          '源按档位从高到低发送训练图案，宿反馈均衡与锁定状态，全部通过才进入 LTS:P。' +
          '单个速率的训练有 200 ms 上限（tFLT），失败就降一档重试。',
        sections: [
          {
            id: 'ltp',
            title: '训练图案 LTP1–LTP8',
            titleEn: 'Link Training Patterns',
            blocks: [
              { t: 'p', v: '源在全部活动 Lane 上连续发送宿请求的图案，直到收到下一个请求。' +
                '发送 LTP1–4 时源**不做 16b18b 编码**，也不启用 FRL 加扰：' },
              { t: 'dl', items: [
                ['LTP1', '全 1 图案：连发 18 个 1，无 16b18b 编码'],
                ['LTP2', '全 0 图案：连发 18 个 0，无 16b18b 编码'],
                ['LTP3', '奈奎斯特时钟图案：0/1 交替（各占一个比特时间），无编码'],
                ['LTP4', 'TxFFE 一致性测试图案：128 个 0 接 128 个 1 循环'],
                ['LTP5–8', '四条 Lane 各自的扰码 LFSR 图案：4096 个 FRL 字符，以 4 个 SR 字符开头，后续字符经 16b18b 编码'],
                ['0x0E（特殊）', '宿请求源调整一条或多条 Lane 的 FFE 设置'],
                ['0x0F（特殊）', '宿请求源改变链路模式（速率），此时所有活动 Lane 的请求字段须同时置 0x0F']
              ] },
              { t: 'p', v: 'LTP5–8 让宿完成均衡训练、字符锁定与 Lane 间去偏斜（deskew）；' +
                'SR（Scrambler Reset）字符是逗号码，为接收端提供字符边界对齐基准。' +
                '切换图案时源必须保持字符边界与差值计数连续。' }
            ]
          },
          {
            id: 'lts',
            title: '训练状态机',
            titleEn: 'Link Training States',
            blocks: [
              { t: 'fig', id: 'hdmiTraining', caption: 'LTS 状态机：读 EDID → 准备 FRL → 逐个速率训练；超时降档，宿不支持 FRL 则回退传统 TMDS。' },
              { t: 'dl', items: [
                ['LTS:1 读 EDID', '源读宿的 E-EDID 与 HF-VSDB；若源选择传统 TMDS 模式则直接进入 LTS:L'],
                ['LTS:2 准备 FRL', '宿支持 FRL 且源发起训练后，双方按约定速率做准备'],
                ['LTS:3 训练进行中', '发送 LTP 图案、调整 FFE；单速率超时 tFLT = 200 ms 即失败，源降一档重试'],
                ['LTS:P 训练通过', '宿置位相应状态标志，源开始正常 FRL 传输'],
                ['LTS:L 传统 TMDS', '宿不支持 FRL（或源主动选择）时的回退态']
              ] },
              { t: 'p', v: '训练的控制与状态经 **SCDC** 交换：Link Training Control 寄存器、' +
                'Update Flags、Configuration 与 Status Flags 都在 DDC 的 I²C 上（见第 11 章）。' +
                '链路首次建立或改变 FRL 速率时必须重新训练；**TMDS 传输不训练**。' }
            ]
          },
          {
            id: 'retrain',
            title: '什么时候要重新训练',
            titleEn: 'When Retraining Happens',
            blocks: [
              { t: 'p', v: '规范把重新训练的触发条件写得很窄：**链路首次建立**，' +
                '或**改变 FRL 链路速率**。改变速率时由源在 SCDC 更新 FRL_Rate，' +
                '宿看到速率变化后进入训练流程；速率没变就不必重训。' +
                '这意味着日常使用中（同一分辨率 / 刷新率）链路是稳定的，' +
                '只有切换显示模式这类操作才会触发一轮 200 ms 量级的训练。' },
              { t: 'p', v: '反过来，**热插拔是另一条路径**：HPD 拉低告知源「宿不在了」，' +
                '源停止输出；HPD 恢复后源重新读 E-EDID、判断宿是否仍支持 FRL，' +
                '再决定走 LTS:L（传统 TMDS）还是重新发起 FRL 训练。' +
                '插拔劣质线材造成的「闪黑屏」，多数就是这条路径反复触发的结果。' },
              { t: 'callout', kind: 'info', title: '训练失败不等于黑屏',
                v: '源在 LTS:3 超时（200 ms）后会**自动降一档速率重试**；' +
                  '所有档位都失败（或源选择结束）才退回传统 TMDS。' +
                  '因此一条「临界可用」的线材往往表现为能点亮但反复降速——' +
                  '读 SCDC 的链路配置寄存器，能看到实际协商到的速率档位。' }
            ]
          }
        ]
      },

      /* ======================================================== 06 FRL 链路层 */
      {
        id: 'frl-ll',
        num: '06',
        title: 'FRL 链路层：打包、纠错与编码',
        titleEn: 'FRL Link Layer',
        lead: 'FRL 不是「把 TMDS 流加速」那么简单：它先把三通道像素流重新打包成 ' +
          'FRL 包 → 510 字符块 → 超块，插入 RS(255,251) 校验，' +
          '再加扰、16b18b 编码，最后才分到各 Lane。这一章把这些层级逐个拆开。',
        sections: [
          {
            id: 'packets',
            title: '从 Tri-Byte 到 FRL 包',
            titleEn: 'Tri-Bytes and FRL Packets',
            blocks: [
              { t: 'fig', id: 'hdmiFrlLayers', caption: 'FRL 封装层级：Tri-Byte → FRL 包 → 510 字符块（含 8 个 RS 校验字符）→ 超块 ×4 → Lane。' },
              { t: 'p', v: '每个 TMDS 字符期内三条通道各取一字节，组成一个 **Tri-Byte**，' +
                '这是打包的输入单位。压缩视频传输时，用「水平压缩有效（HCactive）Tri-Byte」' +
                '替代非压缩像素，构造规则（前导、保护带、数据岛、控制期）与 H14b 完全相同。' },
              { t: 'p', v: 'Tri-Byte 流被封装进 **FRL 包**——以 Map 字符（类型 + 长度）开头的变长单元，共四类：' },
              { t: 'dl', items: [
                ['Active Video（非压缩）', '承载视频保护带与有效像素；每行第一个包的 Map Length 取 2–1023，前 3 个字符可放保护带'],
                ['Active Video（压缩）', '承载 HCactive Tri-Byte，每个 Tri-Byte 对应 3 字节压缩数据'],
                ['Video Blanking', '承载行消隐内容；一行像素数据没发完之前不得发送'],
                ['Gap', '填补速率适配产生的空隙，Map Length 只能为 1；宿必须能丢弃']
              ] },
              { t: 'p', v: '包与包之间可插 Gap 字符；**Repeat Count 压缩**用于消隐期的重复内容。' +
                '超块内所有 Map Length 字段之和必须等于 **2008**——这是规范用算术钉死的装填规则。' }
            ]
          },
          {
            id: 'blocks',
            title: '字符块、超块与对齐字符',
            titleEn: 'Character Blocks and Super Blocks',
            blocks: [
              { t: 'p', v: 'FRL 包被组织进 **502 字符一组**的结构，每组追加 8 个字符的 RS 校验，' +
                '组成 **510 字符的字符块**；4 个字符块组成一个**超块**，' +
                'FRL 包不得跨超块。每个超块之前，各活动 Lane **同时**发送 3 或 4 个 ' +
                '**SSB（起始超块）** 或 **SR（扰码复位）** 逗号码，随后 Lane 0 必跟一个 Map 字符。' },
              { t: 'p', v: 'SSB/SR 按固定间隔周期性出现，宿借此实现字符锁定并预测下一次对齐位置；' +
                'RS 校验数据在超块内共出现四处（每字符块一处，另有三处插入位）。' +
                '这套结构的好处是**自包含**：任取一个超块都能独立完成对齐、纠错与解包。' }
            ]
          },
          {
            id: 'rs',
            title: 'Reed-Solomon 前向纠错',
            titleEn: 'Reed-Solomon FEC',
            blocks: [
              { t: 'p', v: 'FRL 用 **RS(255, 251) over GF(256)** 保护码流：每个码块可纠正 ' +
                '**t = 2 个符号错误**。域的 primitive polynomial 为 ' +
                'x⁸+x⁴+x³+x²+1，生成多项式为 ' +
                'g(x) = (x−α¹⁵)(x−α⁵⁴)(x−α¹²⁰)(x−α⁶⁴)。' },
              { t: 'p', v: '字符块的数据被顺序分路进 **4 个并行 RS 编码器**，' +
                '产生的校验字交织回各 Lane（3 Lane / 4 Lane 的分配规则不同，见规范 6.5.4.1 / 6.5.4.2）。' +
                '宿必须能提取每个字符块的 RS 校验符号，并纠正含 1–2 个符号错误的码块；' +
                '纠正次数经 SCDC 的 RS Corrections Counter 上报。' },
              { t: 'callout', kind: 'info', title: 't = 2 是什么概念',
                v: 'RS 按「符号」（8-bit 字节）计错，一个符号错可能是整字节翻转、' +
                  '也可能是连续几个比特的错误。每 502 数据字符配 8 校验字符，' +
                  '开销约 1.6%，换来的能力是「小突发错误就地修正、不用重传」——' +
                  '对实时视频流，重传是不可接受的。' }
            ]
          },
          {
            id: 'coding',
            title: '扰码与 16b18b 编码',
            titleEn: 'Scrambling and 16b18b',
            blocks: [
              { t: 'p', v: '打包完成后，数据先经 **FRL 扰码**（各 Lane 独立的 LFSR，' +
                '16-bit 输入与 LFSR 的 Q 输出逐位异或），再做 **16b18b 编码**：' +
                '16-bit 字切成低 9 位与高 7 位，分别查 **9b10b** 与 **7b8b** 查找表' +
                '（表在配套文件 `HDMI_16b18b_Coding_v1.xlsx`），拼成 18-bit FRL 字符。' },
              { t: 'p', v: '编码全程维护**游动差值**（已发 1 数减已发 0 数）：' +
                '编码 9-bit 部分前叫 RFD，之后叫 RMD，整个字完成后叫 RED（即下一字的 RFD）。' +
                '源按当前差值选码字，使差值绝对值保持最小，RFD/RMD 因此始终落在 ±1 / ±3；' +
                '每条 Lane 各维护一套差值，链路启动后不得复位。' +
                '这套机制与 TMDS 的 10-bit 编码目的一致：**直流平衡、足够的跳变密度供时钟恢复**。' },
              { t: 'p', v: '编码后的字符按 Round-Robin 方式分配到 3 或 4 条 Lane 串行发出；' +
                '宿侧靠 SSB/SR 对齐字符边界，靠 CRU 恢复时钟，靠 RS 修错误，' +
                '最后按 Map 长度拆回 FRL 包，还原 Tri-Byte 流。' }
            ]
          }
        ]
      },

      /* ======================================================== 07 视频格式 */
      {
        id: 'video',
        num: '07',
        title: '视频格式：4:2:0、BT.2020 与 4K/8K',
        titleEn: 'Video Formats',
        lead: 'HDMI 2.1 的视频格式改按 CTA-861-G 定义（替代 CEA-861-D），' +
          '新增 21:9、2160p、4320p 等格式，并把 **YCbCr 4:2:0** 与 **BT.2020 色域**' +
          '写进了规范。4:2:0 是「不加线、不压缩也能上 4K120」的那把钥匙——' +
          '代价是色度分辨率减半，且只允许用于像素时钟 ≥590 MHz 的格式。',
        sections: [
          {
            id: 'vic',
            title: 'VIC 与格式集',
            titleEn: 'VICs',
            blocks: [
              { t: 'p', v: '每个视频格式有一个 **VIC（视频识别码）**。2.1 引用的 CTA-861-G ' +
                '相比 CEA-861-D 增加了宽高比 21:9（64:27）以及 2160p / 4320p 系列格式。' +
                '源通过 AVI InfoFrame 的 VIC 字段（或详细的 RB / 时序字段）告知宿当前格式；' +
                '宿通过 E-EDID 的 VDB / SVD 列表上报支持情况。' },
              { t: 'p', v: '本文关心的几个关键 VIC：**117 = 3840×2160@100 Hz**、' +
                '**118 = 3840×2160@120 Hz**、**198 = 7680×4320@50 Hz**、' +
                '**199 = 7680×4320@60 Hz**——第 7.8.1 节的 A/B 营销名就是围绕它们定义的。' }
            ]
          },
          {
            id: 'y420',
            title: 'YCbCr 4:2:0 像素编码',
            titleEn: 'YCBCR 4:2:0',
            blocks: [
              { t: 'fig', id: 'hdmiBandwidth', caption: '8 bpc 非压缩视频的 FRL 配置速查（规范 Table 7-32）：4:2:0 只要一半数据率，8K60 4:4:4 非压缩已不可达。' },
              { t: 'p', v: '4:2:0 下，**两个水平相邻的 8-bit Y 分量**分别走通道 1 与 2，' +
                '**Cb / Cr 分量逐行交替**走通道 0（偶数行编 Cb、奇数行编 Cr）。' +
                'TMDS 模式下 4:2:0 的字符速率是 4:4:4 的一半；FRL 模式下 Hactive 的 Tri-Byte 速率同样减半。' },
              { t: 'dl', items: [
                ['速率减半', '同样的链路能传两倍帧率或两倍分辨率——这是 4:2:0 存在的全部理由'],
                ['590 MHz 门槛', '只允许用于像素时钟 ≥590 MHz 的逐行格式；源不得向未声明的宿发 4:2:0'],
                ['能力声明', '宿用 Y420CMDB / Y420VDB（CTA-861-G）逐格式声明；两者不得重复声明同一格式'],
                ['像素重复禁止', '4:2:0 生效时 AVI InfoFrame 的 Pixel Repeat 必须为 0'],
                ['隔行不支持', '规范不为隔行格式定义 4:2:0 传输'],
                ['与 FVA 的互斥', 'FVA 生效且格式像素时钟 <590 MHz 时不得启用 4:2:0（即便 FVA 把它抬过 590 MHz）']
              ] },
              { t: 'callout', kind: 'warn', title: '为什么有 590 MHz 这条线',
                v: '4:2:0 是为高带宽格式准备的「省钱档」。给 1080p60 这类低带宽格式用 4:2:0 ' +
                  '只会白白损失色度清晰度，所以规范直接禁止；' +
                  '桌面用户熟悉的「4:2:0 输出」问题，多发生在显卡把高刷高分辨率格式误配成 4:2:0 时。' }
            ]
          },
          {
            id: 'bt2020',
            title: 'BT.2020 与量化范围',
            titleEn: 'BT.2020 and Quantization',
            blocks: [
              { t: 'p', v: 'H14b 的色度学定义之外，2.1 补上了 **ITU-R BT.2020** 色域' +
                '（经 AVI InfoFrame 的 Colorimetry 字段与扩展字段信令），' +
                '配合 HDR 静态元数据数据块（HDR Static Metadata Data Block）与 ' +
                'CTA-861-G 的动态 HDR 元数据块，支撑广色域内容的端到端描述。' },
              { t: 'p', v: '量化范围（全范围 / 限幅）沿用 H14b 的 RGB 与 YCC 两套信令；' +
                'HDMI 2.1 未改变量化范围机制本身。色彩内容位深（CCBPC）经 HF-VSIF 信令，' +
                '用于压缩视频传输等场景下声明每分量实际内容位深。' }
            ]
          },
          {
            id: 'ab',
            title: '4K / 8K 的 A 与 B',
            titleEn: 'A vs B Formats',
            blocks: [
              { t: 'p', v: '第 7.8.1 节为 4K100 / 4K120 / 8K50 / 8K60 定义了 A / B 两条路线：' +
                '**A 路线**用非压缩 FRL + 4:2:0 传输（10 bit），' +
                '**B 路线**用压缩 FRL + DSC 传输主 4:4:4 压缩格式（10 bit）。' +
                '设备声称支持某档格式时至少要实现其中一条。' },
              { t: 'p', v: '非压缩路线对链路的要求（8 bpc，4:4:4）：4K100/120 需 8 Gbps × 4 Lane，' +
                '8K50/60 的 4:4:4 已**不可能非压缩到达**（表中标注「需压缩」），' +
                '而其 4:2:0 版需 8 Gbps × 4 Lane。这就是为什么 8K 电视几乎必然带 DSC 解码器。' }
            ]
          }
        ]
      },

      /* ======================================================== 08 VRR / FVA */
      {
        id: 'vrr',
        num: '08',
        title: 'VRR 与 FVA：把帧节拍松开',
        titleEn: 'VRR and FVA',
        lead: 'VRR 让源「画完一帧就发一帧」，不再等待固定的垂直节拍；' +
          'FVA 则通过提高像素时钟缩短每帧的传输时间。两者都只改垂直时序的' +
          '前沿 porch 一侧——**Vactive 一行不动**，因此对面板与缩放链路最友好。',
        sections: [
          {
            id: 'vrr-mech',
            title: 'VRR 的机制',
            titleEn: 'VRR Mechanics',
            blocks: [
              { t: 'fig', id: 'hdmiVrr', caption: 'VRR 在 Vfront 上加 MVRR 行；FVA 把 Vfront/Vsync/Vback 全部乘以 FVA_Factor；Vactive 始终不变。' },
              { t: 'p', v: 'VRR 生效时，源在垂直前沿 porch 中插入 **MVRR** 个额外行：' +
                'Vfront_VRR = Vfront + MVRR，Vtotal 随之变化，而 Vactive、Vsync、Vback 不变。' +
                '源画完一帧（含可变渲染时间）后立即发送，宿端显示器按实际到达节奏刷新，' +
                '从而消除画面撕裂、降低输入延迟。' },
              { t: 'dl', items: [
                ['基准时序门槛', 'VRR 只用于基准刷新率 ≥50 Hz 的逐行格式，不得用于隔行'],
                ['能力声明', '宿经 HF-VSDB 的 VRRMIN（1–48）与 VRRMAX 声明支持范围；源不得越过'],
                ['不中断呈现', '宿在 VRRMIN/VRRMAX 有效且源使用合法 MVRR 时不得中断音视频连续呈现'],
                ['音画同步', 'VRR 期间音频样本仍须满足数据岛时序与放置要求'],
                ['CinemaVRR', '支持 24 Hz 类内容的平滑切换场景']
              ] },
              { t: 'p', v: 'VRR 启用且 AVI InfoFrame 的 VIC 非零时，源清零 RB / Base_Vfront / ' +
                'Base_Refresh_Rate 字段，宿忽略之；VIC 为零（不可用 VIC 表示的时序）时，' +
                '源填充这些字段以便宿推断格式。RB 与 M_CONST 的用法规范以信息性章节给出。' }
            ]
          },
          {
            id: 'fva',
            title: 'FVA 与 QMS / QFT',
            titleEn: 'FVA, QMS and QFT',
            blocks: [
              { t: 'p', v: '**FVA（快速有效行）** 在链路字符速率富余时提高像素时钟：' +
                'Vfront_FVA = Vfront × F + Vactive × (F − 1)，Vsync 与 Vback 同步乘以 F，' +
                '每帧的传输时间因此缩短约 F 倍，帧间空隙由拉长的 porch 填补。' +
                'FVA_Factor 是 Vtotal 的整数倍，其上限由宿的 FVA_FactorMAX 决定。' },
              { t: 'p', v: 'VRR 与 FVA 可同时启用：效果等于「FVA 再加 MVRR」。' +
                '两者的营销名分工明确——**QFT（Quick Frame Transport）= FVA**，主打低延迟传输；' +
                '**QMS（Quick Media Switching）= VRR + M_CONST**，' +
                '利用可变刷新率在切换内容（如 24 fps 电影 ↔ 60 Hz UI）时免黑屏、免重协商。' },
              { t: 'callout', kind: 'ok', title: '为什么游戏玩家在意这两个',
                v: 'VRR 消除的是「源渲染节奏与显示器固定刷新节奏错配」造成的撕裂与卡顿；' +
                  'FVA/ALLM 压缩的是「帧做完到屏幕亮起来」之间的等待。' +
                  '规范第 7.6.5 节专门用信息性文字讨论了三者叠加带来的性能、延迟与功耗收益。' }
            ]
          },
          {
            id: 'vrr-eq',
            title: '垂直时序的完整方程',
            titleEn: 'Timing Equations',
            blocks: [
              { t: 'p', v: '规范用 Table 7-12 把 VRR / FVA 对垂直参数的修改写成显式方程。' +
                '以基准时序的 Vactive、Vfront、Vsync、Vback 为输入：' },
              { t: 'dl', items: [
                ['VRR', 'Vfront_VRR = Vfront + MVRR；Vsync / Vback 不变；Vtotal_VRR = Vactive + Vfront_VRR + Vsync + Vback'],
                ['FVA', 'Vfront_FVA = Vfront × F + Vactive × (F − 1)；Vsync_FVA = Vsync × F；Vback_FVA = Vback × F；Vtotal_FVA = Vactive + Vfront_FVA + Vsync_FVA + Vback_FVA'],
                ['VRR + FVA', '等于 FVA 的各项再加 MVRR：Vfront_VRRFVA = Vfront × F + Vactive × (F − 1) + MVRR']
              ] },
              { t: 'p', v: '其中 F = FVA_Factor（Vtotal 的整数倍，上限由宿的 FVA_FactorMAX 决定），' +
                'MVRR 的取值范围由第 7.6.3 节规定。所有水平参数（像素数）一律不变；' +
                '3D 模式使用 Vact_space 参数时，VRR 不改变它，FVA 则将其行数乘以 F、' +
                '使其**时间长度**对任意 F 保持恒定。' },
              { t: 'callout', kind: 'key', title: '一个直观的算例',
                v: '以 1080p60（Vtotal = 1125、Vactive = 1080）为基准：' +
                  'FVA_Factor = 2 时 Vtotal_FVA = 2250 行，每帧传输时间减半；' +
                  '若再叠加 MVRR = 20，则 Vfront_VRRFVA = 1088 + 20 = 1108 行，' +
                  '刷新节奏随源渲染时间浮动——这正是规范 Figure 7-12 画出的例子。' }
            ]
          }
        ]
      },

      /* ======================================================== 09 压缩视频传输 */
      {
        id: 'cvt',
        num: '09',
        title: '压缩视频传输：HDMI 里的 DSC',
        titleEn: 'Compressed Video Transport',
        lead: '当非压缩放不下（8K60 10-bit 4:4:4、或 4K120 高色深），HDMI 2.1 允许在 ' +
          'FRL 模式下用 **VESA DSC 1.2a** 压缩有效视频区。压缩只发生在有效区，' +
          '控制期与数据岛仍按非压缩规则构造——HDMI 只借 DSC 的引擎，传输规则自己定。',
        sections: [
          {
            id: 'cvt-scope',
            title: '适用范围与前提',
            titleEn: 'Scope and Preconditions',
            blocks: [
              { t: 'p', v: '规范对压缩视频传输（Compressed Video Transport）划了几条硬线：' +
                '声称支持压缩传输的源与宿**必须支持 VESA DSC 1.2a**（不要求更早版本）；' +
                '压缩传输**只能在 FRL 模式下使用，TMDS 模式下禁止**；' +
                '不得用于隔行格式；' +
                '能在「3 Lane × 3 Gbps」最低带宽链路上非压缩传输的组合，不得启用压缩。' },
              { t: 'p', v: '源在配置链路时必须查阅宿 HF-VSDB 里的一组能力字段：' +
                '`DSC_1p2`、`DSC_Max_FRL_Rate`、`DSC_MaxSlices`、`DSC_TotalChunkKBytes`、' +
                '`DSC_10bpc / 12bpc / 16bpc`、`DSC_Native_420`、`DSC_All_bpp`。' +
                '注意规范要求**宿的 DSC_16bpc 位清零**（为将来版本预留）。' +
                '支持压缩传输的源必须至少支持 **8 bpc** 压缩视频。' }
            ]
          },
          {
            id: 'bpp',
            title: 'bpp 怎么选',
            titleEn: 'Choosing bpp',
            blocks: [
              { t: 'table', head: ['非压缩像素编码', 'bpp 下限', 'bpp 上限', 'native_420', 'native_422'], rows: [
                ['4:4:4', '8', '3 × bpc − 1/16', '0', '0'],
                ['4:2:2', '7', '2 × bpc − 1/16', '0', '1'],
                ['4:2:0', '6', '1.5 × bpc − 1/16', '1', '0']
              ] },
              { t: 'p', v: '源按第 6.5.6.2.2 节的容量方程验证目标 bpp 是否放得下该格式，' +
                '并确认压缩确有必要（Table 7-23 不满足时不得启用）。' +
                'PPS 里写入的 `bits_per_pixel` 对 4:4:4 是 16 × bppTarget；' +
                'native_422 / native_420 置位时该值翻倍。' +
                '`DSC_All_bpp` 置位时，源应在 `DSC_TotalChunkKBytes` 限制内**尽量取大 bpp**，' +
                '以减少 Gap 字符的插入。' },
              { t: 'callout', kind: 'key', title: '4:2:0 的三个前提',
                v: '启用压缩 4:2:0 需同时满足：① 该时序被第 7.1 节允许；' +
                  '② 宿在 Y420CMDB 或 Y420VDB 中声明支持该时序；' +
                  '③ 宿 HF-VSDB 的 DSC_Native_420 置位。三者缺一不可。' }
            ]
          },
          {
            id: 'cvt-mech',
            title: '传输结构与缓冲',
            titleEn: 'Transport Structure and Buffers',
            blocks: [
              { t: 'p', v: '压缩后，有效视频区由 **HCactive Tri-Byte** 承载（每个 Tri-Byte 对应 3 字节压缩数据，' +
                '行末允许 1–2 字节零填充），垂直消隐用 HCblank+HCactive 表示。' +
                '**垂直时序参数完全不变**（含 VRR/FVA 生效时的修改）；' +
                'VSYNC 的跳变被规定在 HCblank 的第 45 个 Tri-Byte 上。' },
              { t: 'dl', items: [
                ['PPS', '图像参数集按第 7.7.5 节确定 slice_width / slice_height 等参数，随 EMP 传输'],
                ['Rate Buffer', '吸收压缩码率的瞬时波动；规范给出容量估算指南（7.7.4.1）'],
                ['Chunk Buffer', '宿侧按 chunk 重组切片数据，chunk 大小支持要求见 7.7.4.2'],
                ['Gap 处理', '源可在 HCactive 期间插 Gap；宿必须能在 HCactive 期丢弃 Gap'],
                ['ICH 精度', '压缩传输生效时源必须使用 DSC 1.2a 的「Full Error Precision for ICH Decision」']
              ] },
              { t: 'p', v: '与本站《DSC 技术解析》一篇对照着看：那篇讲 DSC **引擎内部**' +
                '（预测、量化、熵编码、速率控制），本篇讲 HDMI **怎么用它**——' +
                'bpp 上限、能力协商、PPS 参数如何从视频时序推导、缓冲如何 sizing。' +
                '压缩元数据经 EMP（Extended Metadata Packet）承载，见第 11 章。' }
            ]
          }
        ]
      },

      /* ======================================================== 10 音频与 eARC */
      {
        id: 'audio',
        num: '10',
        title: '音频与 eARC',
        titleEn: 'Audio and eARC',
        lead: '前向音频（源→宿）在数据岛期里跑：L-PCM、IEC 61937 压缩流、One Bit Audio、' +
          '3D Audio 与最多 4 流的 Multi-Stream Audio。回传音频走 **eARC**——' +
          'HDMI 2.1 把 HPD 与 Utility 两根线改成差分音频通道，' +
          '带宽与格式支持都远超旧的 ARC。',
        sections: [
          {
            id: 'fwd-audio',
            title: '前向音频的格式集',
            titleEn: 'Forward Audio',
            blocks: [
              { t: 'table', head: ['传输机制', '要点'], rows: [
                ['L-PCM（IEC 60958）', '未压缩多声道，最高 192 kHz 采样'],
                ['IEC 61937 压缩流', '环绕声等压缩音频；HDMI 2.1 扩展了可传输的压缩格式列表，码率最高 49.152 Mbps'],
                ['One Bit Audio', '2–32 声道'],
                ['HDMI 3D Audio', '支持 10.2 / 22.2 / 30.2 音箱摆位'],
                ['CTA 3D Audio', '按 CTA 标准做声道 / 音箱分配'],
                ['Multi-Stream Audio', '最多 4 条音频流同时传输：双视角游戏各自配音、多语言等场景']
              ] },
              { t: 'p', v: '设备同一时刻只能使用一种音频包类型；需要多流时应使用 ' +
                'Multi-Stream Audio 或 One Bit Multi-Stream 包。' +
                '压缩音频的格式发现扩展了 CEC 的 `[Audio Format ID and Code]` 操作数，' +
                '让电视能查询功放支持的扩展格式。' }
            ]
          },
          {
            id: 'earc',
            title: 'eARC：差分音频 + 共模数据',
            titleEn: 'eARC',
            blocks: [
              { t: 'fig', id: 'hdmiAudio', caption: 'eARC 系统：音频借 HPD 线差分回传，Utility 线走共模数据与发现；建链失败可回退 H14b ARC。' },
              { t: 'p', v: 'eARC 让音频从宿（电视）回传给相邻的源 / 中继（功放），方向与视频相反。' +
                '相对 H14b 的 ARC，它的改进是四项：' +
                '**非压缩载荷带宽提到 36.864 Mbps**（≈8 声道 24-bit 192 kHz L-PCM）；' +
                '**压缩载荷提到 24.576 Mbps**（如 IEC 61937 @768 kHz 帧率）；' +
                '支持更多音频格式（前向所有选项均可回传）；' +
                '**发现过程不依赖 CEC**——无论 CEC 是否存在 / 使能都能工作。' },
              { t: 'dl', items: [
                ['差分模式（9.5.2）', '音频数据在 HPD 线上差分传输，含声道状态、IEC 60958 U-bit 用法、压缩音频纠错与格式切换规则'],
                ['共模数据通道（9.5.3）', '在 Utility 线上做半双工发现与通用通信：发现 / 断开、心跳序列、eARC RX 能力数据结构、音频延迟控制'],
                ['回退', 'eARC 建链失败时可退回 H14b ARC 模式'],
                ['供电无关', '支持 eARC TX 的宿必须能在高速链路 inactive 时也发出 eARC 音频']
              ] },
              { t: 'callout', kind: 'info', title: '延迟控制是 eARC 的隐藏价值',
                v: 'eARC 的共模数据通道携带音频延迟控制与 Relative A/V Latency 能力，' +
                  '配合 Dynamic Auto Lipsync（第 10.7 节），' +
                  '功放可以把自己不断变化的处理延迟实时告知电视，由电视动态补偿——' +
                  '这对 Soundbar 随内容切换音效模式的场景尤其有用。' }
            ]
          },
          {
            id: 'audio-pack',
            title: '音频怎么打包上线',
            titleEn: 'Audio Packetization',
            blocks: [
              { t: 'p', v: '前向音频在**数据岛期**里以包传输：音频样本包（L-PCM / One Bit / ' +
                '3D Audio / Multi-Stream 各有包类型）、Audio InfoFrame、' +
                'Audio Metadata Packet、Dynamic Range and Mastering InfoFrame 各司其职。' +
                '设备同一时刻只能使用一种音频包类型——多流场景必须改用 Multi-Stream 包。' },
              { t: 'dl', items: [
                ['N / CTS', '音频时钟再生依赖 N 与 CTS 一对参数；规范按 TMDS / FRL 两种模式给出推荐 N 与期望 CTS 值（第 9.2 节，附录 C 汇总）'],
                ['采样率信令', '超出 H14b 表的新采样率通过声道状态位 24–27 / 30 / 31 的组合指示'],
                ['容量核算前提', 'FRL 视频支持表假设「30.2 音频 @48 kHz L-PCM」的包速率；若改用更高包速率（如 22.2 音频 @192 kHz），源须按第 6.5.6.2.1 节验证链路仍放得下']
              ] },
              { t: 'p', v: '换句话说，**音频会挤占视频的带宽预算**：FRL 的 Data Flow Metering ' +
                '把音频包、视频包与 Gap 放在同一本账上核算。' +
                '高声道数音频 + 高分辨率视频同时拉满时，源可能需要微调 bpp 或接受更多 Gap。' }
            ]
          }
        ]
      },

      /* ======================================================== 11 控制与发现 */
      {
        id: 'control',
        num: '11',
        title: '控制与发现：E-EDID、SCDC 与 ALLM',
        titleEn: 'Control and Configuration',
        lead: 'HDMI 的「智能」几乎全在低速侧信道里：DDC（I²C）读 E-EDID 知道宿能吃什么，' +
          'SCDC 让源宿实时交换链路状态，HF-VSIF 与 AVI InfoFrame 告诉宿现在发的是什么，' +
          'ALLM 让源一句话切换显示器的低延迟模式。',
        sections: [
          {
            id: 'edid',
            title: 'E-EDID 与 HF-VSDB',
            titleEn: 'E-EDID and HF-VSDB',
            blocks: [
              { t: 'p', v: '源经 DDC（SCL/SDA）读宿的 **E-EDID**。HDMI 2.1 的能力几乎全部住在 ' +
                '**HF-VSDB（HDMI Forum Vendor Specific Data Block）** 里：' +
                '`Max_FRL_Rate`、`Max_TMDS_Character_Rate`、`SCDC_Present`、' +
                'VRR 的 `VRRMIN / VRRMAX`、FVA 位、DSC 系列位、`ALLM` 位、' +
                '以及 `CCBPC`（色彩内容位深）等。源在访问 SCDC 前必须先确认 ' +
                'HF-VSDB 存在且 `SCDC_Present = 1`。' },
              { t: 'p', v: 'H14b-VSDB 继续承载旧能力（Max_TMDS_Clock、Latency 等）。' +
                'E-EDID 里还有 Y420CMDB / Y420VDB（4:2:0 能力）、' +
                'HDMI Audio Data Block、HDR Static Metadata Data Block 与 ' +
                'CTA-861-G 的 HDR Dynamic Metadata Data Block。' }
            ]
          },
          {
            id: 'scdc',
            title: 'SCDC：链路状态的寄存器窗口',
            titleEn: 'SCDC',
            blocks: [
              { t: 'p', v: '**SCDC（状态与控制数据通道）** 是跑在 DDC I²C 上的点对点寄存器集，' +
                '多字节值按小端存放，保留字段为 0x00。核心区包括：' },
              { t: 'table', head: ['偏移', '读/写', '名称', '用途'], rows: [
                ['0x01 / 0x02', 'R / RW', 'Sink / Source Version', '版本握手；HPD 低电平 ≥100 ms 后宿把 Source Version 复位为 0'],
                ['0x10 / 0x11', 'RW', 'Update Flags', '状态变化通知，源据此发起读状态'],
                ['0x20', 'RW', 'TMDS Configuration', 'TMDS 比特时钟比与加扰使能'],
                ['0x21', 'R', 'TMDS Scrambler Status', '加扰器状态回读'],
                ['0x30 / 0x31', 'RW', 'Sink Configuration', 'FRL 速率、Lane 数等链路配置'],
                ['0x40 – 0x42', 'R', 'Status Flags', '链路训练、锁定等状态位'],
                ['0x50 – 0x55', 'R', '各通道错误计数', '每条通道 15-bit 字符错误计数（CED）'],
                ['0x56', 'R', 'CED 校验和', '错误计数块的校验'],
                ['0x57 / 0x58', 'R', 'Lane 3 错误计数', '仅 FRL 有意义'],
                ['0x59 / 0x5A', 'R', 'RS Corrections Counter', 'RS 纠错累计次数'],
                ['0xC0', 'RW', 'Test Read Request', '测试模式请求'],
                ['0xD0 – 0xFF', 'R / RW', '厂商 OUI / Device ID / 厂商自定义', '制造商特定信息']
              ] },
              { t: 'callout', kind: 'key', title: 'SCDC 是「链路健康度」的总入口',
                v: '训练控制（FRL_Rate、LTP 请求）、错误计数（CED + RS）、' +
                  '配置回读全在这里。现场排查「偶发黑屏 / 花屏」时，' +
                  '读 0x50–0x5A 的错误计数器与 RS 纠正次数，通常比换线试错更快定位问题。' }
            ]
          },
          {
            id: 'vsif',
            title: 'HF-VSIF、AVI InfoFrame 与 ALLM',
            titleEn: 'HF-VSIF, AVI InfoFrame and ALLM',
            blocks: [
              { t: 'p', v: '**AVI InfoFrame**（按 CTA-861-G）承载像素编码、量化范围、' +
                '色度学与 VIC 等基本信令。2.1 新增的 **HF-VSIF（HDMI 论坛厂商特定信息帧）** ' +
                '则承载 `ALLM_Mode`、`CCBPC`、VRR 的 `Base_Vfront / Base_Refresh_Rate / M_CONST` 等字段。' +
                'VRR 启用时若 VIC 非零，这些基准字段被清零；VIC 为零时必须填充。' },
              { t: 'p', v: '**ALLM（自动低延迟模式）**：宿在 HF-VSDB 置 `ALLM` 位即声明支持；' +
                '源随后可在 HF-VSIF 置 `ALLM_Mode`。宿的低延迟模式由 ' +
                '`ALLM_Mode` 与用户菜单设置取**逻辑或**：任一为真即进入低延迟模式；' +
                '两者皆假则退回原模式。规范要求宿在收到 `ALLM_Mode=1` 后 ' +
                '**1 秒内**完成切换，且切换时源不得弹通知、宿应限制与 HDMI 输入无关的画面内容。' },
              { t: 'p', v: '**EMP（扩展元数据包）** 是 2.1 引入的通用大载荷机制：' +
                '数据岛包装不下的大数据集（压缩视频传输元数据、CTA-861-G 动态 HDR、' +
                '视频时序扩展元数据）改由 EMP 分帧传输，带 FAPA（首包地址）与超时管理。' +
                '第 10.10 节定义了传输规则，第 10.10.2 节定义各元数据类型。' }
            ]
          },
          {
            id: 'lipsync',
            title: '音画同步与延迟信令',
            titleEn: 'Lipsync',
            blocks: [
              { t: 'p', v: 'HDMI 2.1 把 H14b 的 Auto Lipsync 扩展为 **Dynamic Auto Lipsync**：' +
                '宿可经 E-EDID 延迟字段与 CEC 传输**动态修改并通告**自己的延迟信息，' +
                '源按第 10.6 / 10.7 节做补偿。这覆盖了「电视视频延迟 100 ms、' +
                '内部音频延迟 0 ms」这类逐输出端不同的延迟结构，' +
                '也支持延迟值在一段时间内变化的设备（附录 D 给出面向源设备的示例）。' }
            ]
          }
        ]
      },

      /* ======================================================== 12 CEC 与中继器 */
      {
        id: 'cec',
        num: '12',
        title: 'CEC 2.0 与中继器',
        titleEn: 'CEC 2.0 and Repeaters',
        lead: 'CEC 2.0 在 1.4b 基础上扩充了**强制特性集**以改善互操作性，并保持后向兼容；' +
          '第 12 章则把中继器（Repeater）的行为钉清楚——在 4 Lane FRL 与 eARC 的时代，' +
          '「一转二」这类设备的合规边界终于有了明文。',
        sections: [
          {
            id: 'cec2',
            title: 'CEC 2.0 的扩展点',
            titleEn: 'CEC 2.0',
            blocks: [
              { t: 'p', v: 'CEC 2.0 以引用方式并入 1.4b，只写扩展部分；' +
                '设备可按 1.4b 或 2.0 实现（==不得混用==），按 2.0 实现的产品须同时通过 ' +
                'CTS 1.4b 与 CTS 2.0 测试。后向兼容依赖几条设计约束：' +
                'CEC 1.x 设备对未知广播消息忽略、对未知直寻消息回 Feature Abort、' +
                '忽略保留操作数——新版本因此可以安全启用新 opcode 与保留值。' },
              { t: 'dl', items: [
                ['寻址', '新增逻辑地址 12 / 13；「Video Processor (Primary)」泛化为「Processor」'],
                ['互操作', '扩展的强制特性集 + 特性发现（Feature Discovery）与版本发现（Version Discovery）'],
                ['扩展红线', '不改 1.x 消息的操作数结构与行为（除提升互操作性外），不向 1.x 设备直寻发送 2.0+ 消息'],
                ['典型特性', '遥控透传（含长按）、音频回传控制（ARC / System Audio Control）、路由控制、设备 OSD 名称传输']
              ] },
              { t: 'p', v: 'CEC 是**一线制总线**（针 13），电气参数与位定时测量方法见第 11.9 节；' +
                '重传、错误处理与消息响应时序也都有明确规定。' +
                '对多数 2.1 新特性（FRL / VRR / DSC）而言 CEC 并非必需——' +
                '这正是 eARC 强调「发现不依赖 CEC」的原因。' }
            ]
          },
          {
            id: 'repeater',
            title: '中继器',
            titleEn: 'Repeaters',
            blocks: [
              { t: 'p', v: '第 12 章澄清了 Repeater（如 AVR、Soundbar、切换器）的行为：' +
                '**能力指示**（经 HF-VSDB 等声明上下游能力）、' +
                '**重发功能**（Retransmission）、**eARC 重发**（例：HTIB → 有源线 → 电视）、' +
                '以及 **FRL 速率重协商**（Informative）——下游链路降速时，' +
                '中继器可能需要与上游重新训练到更低档位。' },
              { t: 'p', v: '实现中继器里的宿功能时，其 SCDC 寄存器反映的是**中继器自身**的属性与状态，' +
                '不反映下游设备（规范另有标明的除外）。未实现 SCDC 的中继器宿若带 HF-VSDB，' +
                '必须把 `SCDC_Present` 清零。' }
            ]
          },
          {
            id: 'cec-rules',
            title: 'CEC 的电气与消息规则',
            titleEn: 'CEC Electrical and Messaging Rules',
            blocks: [
              { t: 'p', v: 'CEC 是**一线制总线**（Type A 针 13）：空闲为高电平，' +
                '发起方拉低表示起始位，数据位按时隙编码。电气参数（上升时间、容差）' +
                '与数据位定时测量方法见第 11.9.1 / 11.9.2 节。' +
                '因为是一线制，位定时错误是最常见的互操作故障源。' },
              { t: 'dl', items: [
                ['重传与错误', '第 11.9.3 节定义重传条件与错误处理；直接寻址消息无响应按超时与 Feature Abort 处理'],
                ['Feature Abort', '收到不支持 / 不认识的直寻消息时以 <Feature Abort> 回应并给出原因码（第 11.9.8 节）'],
                ['消息响应时序', '第 11.9.5 节规定各类消息的响应时限，源声明的发送行为见 11.9.6'],
                ['消息依赖', '第 11.11 节用依赖表描述消息之间的前提关系（如 System Audio Control 依赖音频模式已建立）']
              ] },
              { t: 'p', v: '对 2.1 的新特性而言，CEC 多数时候是**可选项**：' +
                'FRL / VRR / DSC 的能力协商走 E-EDID 与 SCDC，eARC 的发现也明确不依赖 CEC。' +
                'CEC 的价值在一键播放、系统音量控制这类跨设备遥控场景。' }
            ]
          }
        ]
      },

      /* ======================================================== 13 速查与回顾 */
      {
        id: 'recap',
        num: '13',
        title: '速查与回顾',
        titleEn: 'Quick Reference and Recap',
        lead: '把全篇的硬数字收拢到一处：速率档位、编码开销、bpp 边界、' +
          '营销名与章节的对照，以及一份「想读懂规范原文」的阅读路线。',
        sections: [
          {
            id: 'numbers',
            title: '硬数字速查',
            titleEn: 'Numbers at a Glance',
            blocks: [
              { t: 'table', head: ['项目', '数值', '出处'], rows: [
                ['FRL 速率档位', '3 / 6 Gbps（3 Lane）；6 / 8 / 10 / 12 Gbps（4 Lane）', '§6.4 Table 6-19'],
                ['FRL 编码后总带宽', '9 / 18 / 24 / 32 / 40 / 48 Gbps', '§6.4'],
                ['TMDS 字符速率上限', '600 Mcsc（时钟为字符速率的 1/4）', '§6.1.1'],
                ['16b18b 开销', '16→18 bit（≈11% 开销），9b10b + 7b8b 查表', '§6.5.8'],
                ['字符块构成', '510 字符 = 502 数据 + 8 RS 校验（16 字节）', '§6.5.3'],
                ['超块构成', '4 个字符块；Map Length 之和 = 2008；前有 SSB/SR', '§6.5.3'],
                ['RS 纠错能力', 'RS(255,251) over GF(256)，t = 2 符号/块', '§6.5.4'],
                ['链路训练超时', 'tFLT = 200 ms / 每档速率', '§6.4.2 Table 6-31'],
                ['4:2:0 启用门槛', '仅逐行、像素时钟 ≥590 MHz、宿已声明', '§7.1'],
                ['压缩 bpp 边界', '4:4:4 ≥8；4:2:2 ≥7；4:2:0 ≥6', '§7.7.3 Table 7-23'],
                ['eARC 非压缩载荷', '36.864 Mbps；压缩载荷 24.576 Mbps', '§9.5.1'],
                ['前向压缩音频上限', '49.152 Mbps（IEC 61937）', '§2'],
                ['+5V 供电', '宿 ≤50 mA；线缆 ≤55 mA', '§5.1.1.2'],
                ['HPD 复位门限', '低电平 ≥100 ms 复位 SCDC Source Version', '§10.4.1.2'],
                ['ALLM 切换时限', '收到 ALLM_Mode=1 后 ≤1 秒', '§10.11']
              ] }
            ]
          },
          {
            id: 'tree',
            title: '一张图记住 HDMI 2.1 的结构',
            titleEn: 'The Big Picture',
            blocks: [
              { t: 'list', items: [
                '**物理层**：Type A/C/D 19 针 + Category 3 线缆（Ultra High Speed）',
                '**传输层二选一**：TMDS（≤600 Mcsc，加扰 + CED）或 FRL（6 档速率 + 链路训练 + RS FEC + 16b18b）',
                '**视频层**：CTA-861-G 格式集；4:2:0 省一半带宽；BT.2020 广色域；VRR/FVA 改垂直时序；DSC 1.2a 压缩有效区',
                '**音频层**：前向 L-PCM / IEC 61937 / One Bit / 3D / Multi-Stream；回传 eARC（HPD + Utility）',
                '**控制层**：DDC 读 E-EDID（HF-VSDB 承载 2.1 能力）；SCDC 交换链路状态；HF-VSIF / AVI InfoFrame 信令；EMP 传大元数据',
                '**周边**：CEC 2.0（一线控制）；ALLM / Dynamic Auto Lipsync（延迟与模式）；Repeater 规则'
              ] },
              { t: 'callout', kind: 'key', title: '一句话版本',
                v: 'HDMI 2.1 = **同一对线跑更快（FRL）** + **同一份像素发更省（4:2:0 / DSC）** + ' +
                  '**帧节拍松开（VRR / FVA）** + **发现与状态信令补齐（HF-VSDB / SCDC / EMP / ALLM）**。' }
            ]
          },
          {
            id: 'reading-order',
            title: '想读规范原文的话',
            titleEn: 'Reading the Original Spec',
            blocks: [
              { t: 'list', items: [
                ['第 2 节（Overview）', '2.1 增量的官方自述 + 营销名表，一页看懂全貌'],
                ['第 5 章（Cables and Connectors）', '引脚、Category 3 指标、+5V 与 HPD'],
                ['第 6 章（Physical and Link Layers）', 'TMDS 扩展、FRL 电气、链路训练、FRL 链路层、RS FEC、16b18b、CED'],
                ['第 7 章（Video Extensions）', '4:2:0、BT.2020、VRR/FVA、压缩传输、4K/8K A/B'],
                ['第 9 / 10 章（Audio / Control）', 'eARC、E-EDID/SCDC、ALLM、EMP'],
                ['第 11 / 12 章（CEC / Repeaters）', '控制总线与中继器行为'],
                ['附录 G / H', 'ALLM 与 eARC 能力关系的信息性示例']
              ] },
              { t: 'p', v: '最后重申取材边界：本页是**学习性原理整理**，不是规范译文，' +
                '也没有转载规范的表格与插图；文中数值均整理自规范正文，' +
                '所有数字与约束以 HDMI Forum 发布的 HDMI Specification 2.1 原文与 HDMI CTS 为准；' +
                '产品化涉及授权与合规测试，请走 HDMI Licensing Administrator 的正式渠道。' }
            ]
          }
        ]
      }

    ]
  });
})(typeof window !== 'undefined' ? window : globalThis);
