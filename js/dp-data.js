/* =============================================================================
 * dp-data.js — Technology Blog 第四篇文章：DisplayPort 2.1 接口规范技术解析
 *              （纯数据，无逻辑、不碰 DOM）
 *
 * 数据来源：VESA DisplayPort (DP) Standard Version 2.1（VESA，2022-10-10，1560 页）
 *           规范发布页：https://www.vesa.org/ （DP 标准由 VESA 维护）
 *
 * 本文件按「新增文章只需往 BLOGData.posts 里加一条」的约定，在 hdmi-data.js 之后
 * 加载，把文章对象 push 进 BLOGData.posts，并把本篇专用的内联 SVG 注册进
 * BLOGData.figures。正文块结构与 blog-data.js 完全一致（见该文件头部说明）。
 *
 * 版权说明：本篇是面向中文读者的**学习性原理整理**，非规范官方译文，也不转载
 * 规范原文的表格与插图；所有示意图均按规范描述的机理重绘（纯内联 SVG，
 * 不请求任何外部资源）。规范原文以 VESA 发布的 DisplayPort Standard 2.1 为准，
 * 商业使用需遵循 VESA 的会员与采纳条款。
 * ========================================================================== */
(function (window) {
  'use strict';

  var D = window.BLOGData;
  if (!D || !D.posts || !D.figures) return;

  /* ------------------------------------------------------------- 示意图 SVG */
  /* 全部内联绘制，颜色走 CSS 变量，因此自动跟随明/暗主题，且不请求任何外部资源。 */
  var FIGURES = {

    /* 端到端系统：源设备 → 主链路（1/2/4 对差分线） + AUX_CH + HPD → 宿设备 */
    dpSystem:
      '<svg class="bl-fig-svg" viewBox="0 0 640 264" role="img" aria-label="DisplayPort 端到端系统与通道分工">' +
      '<rect x="0" y="0" width="640" height="264" fill="var(--surface-2)"/>' +
      '<text x="16" y="26" fill="var(--text-soft)" font-size="12" font-weight="600">DisplayPort 端到端：高速主链路走 1/2/4 对差分线，AUX 与 HPD 走侧信道</text>' +
      /* 源设备 */
      '<rect x="10" y="44" width="184" height="156" rx="10" fill="none" stroke="var(--border-strong)" stroke-dasharray="5 4"/>' +
      '<text x="24" y="64" fill="var(--text-dim)" font-size="11">源设备 Source（GPU / 显卡）</text>' +
      '<rect x="26" y="76" width="152" height="34" rx="7" fill="var(--surface)" stroke="var(--accent)"/>' +
      '<text x="102" y="98" fill="var(--accent)" font-size="11" text-anchor="middle">DPTX（主链路发送）</text>' +
      '<rect x="26" y="120" width="152" height="30" rx="7" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="102" y="140" fill="var(--text-soft)" font-size="10.5" text-anchor="middle">AUX 主设备（读 DPCD / EDID）</text>' +
      '<rect x="26" y="158" width="152" height="26" rx="7" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="102" y="176" fill="var(--text-soft)" font-size="10.5" text-anchor="middle">HDCP 内容保护（可选）</text>' +
      /* 宿设备 */
      '<rect x="446" y="44" width="184" height="156" rx="10" fill="none" stroke="var(--border-strong)" stroke-dasharray="5 4"/>' +
      '<text x="460" y="64" fill="var(--text-dim)" font-size="11">宿设备 Sink（显示器 / 电视）</text>' +
      '<rect x="462" y="76" width="152" height="34" rx="7" fill="var(--surface)" stroke="var(--accent)"/>' +
      '<text x="538" y="98" fill="var(--accent)" font-size="11" text-anchor="middle">DPRX（主链路接收）</text>' +
      '<rect x="462" y="120" width="152" height="30" rx="7" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="538" y="140" fill="var(--text-soft)" font-size="10.5" text-anchor="middle">AUX 从设备（DPCD / 显示能力）</text>' +
      '<rect x="462" y="158" width="152" height="26" rx="7" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="538" y="176" fill="var(--text-soft)" font-size="10.5" text-anchor="middle">Remote Frame Buffer（PR 用）</text>' +
      /* 中间线缆 */
      '<rect x="208" y="52" width="228" height="140" rx="8" fill="var(--surface)" stroke="var(--teal)"/>' +
      '<text x="322" y="72" fill="var(--teal)" font-size="11.5" font-weight="600" text-anchor="middle">DisplayPort 线缆（标准 20 针 / mDP / USB-C）</text>' +
      '<line x1="220" y1="86" x2="424" y2="86" stroke="var(--accent)" stroke-width="2.5"/>' +
      '<text x="322" y="102" fill="var(--accent)" font-size="10" text-anchor="middle">Main-Link：1 / 2 / 4 对交流耦合差分线（无独立时钟线）</text>' +
      '<line x1="220" y1="116" x2="424" y2="116" stroke="var(--border-strong)" stroke-width="1.6"/>' +
      '<text x="322" y="131" fill="var(--text-dim)" font-size="10" text-anchor="middle">AUX_CH：1 对差分线（Manchester-II，1 Mbps，半双工）</text>' +
      '<line x1="220" y1="140" x2="424" y2="140" stroke="var(--border-strong)" stroke-width="1.6"/>' +
      '<text x="322" y="155" fill="var(--text-dim)" font-size="10" text-anchor="middle">HPD：热插拔检测，宿用作中断请求</text>' +
      '<line x1="220" y1="164" x2="424" y2="164" stroke="var(--border-strong)" stroke-width="1.6"/>' +
      '<text x="322" y="179" fill="var(--text-dim)" font-size="10" text-anchor="middle">AUX 还承担 I2C-over-AUX（读 EDID / HDCP）</text>' +
      /* 方向标注 */
      '<polygon points="434,93 442,97 434,101" fill="var(--accent)"/>' +
      '<polygon points="206,124 198,128 206,132" fill="var(--border-strong)"/>' +
      '<text x="16" y="222" fill="var(--text-soft)" font-size="11">主链路单向（源→宿），承载等时视频/音频流；AUX 半双工双向，承载链路与设备治理。</text>' +
      '<text x="16" y="240" fill="var(--text-dim)" font-size="11">时钟不单独走线，而是从数据流本身恢复——因此主链路可以是纯粹的 N 对差分线。</text>' +
      '<text x="16" y="258" fill="var(--text-dim)" font-size="11">Source / Sink 是角色而非器件：同一台扩展坞对显示器是 Source，对显卡又是 Sink。</text>' +
      '</svg>',

    /* 主链路通道构成：链路速率表（Table 1-7）可视化 */
    dpLanes:
      '<svg class="bl-fig-svg" viewBox="0 0 640 286" role="img" aria-label="DisplayPort 链路速率与应用带宽">' +
      '<rect x="0" y="0" width="640" height="286" fill="var(--surface-2)"/>' +
      '<text x="16" y="26" fill="var(--text-soft)" font-size="12" font-weight="600">主链路应用带宽（Table 1-7）：128b/132b 的 UHBR 系列效率远高于 8b/10b</text>' +
      /* 柱状图：每 Lane 速率 */
      '<line x1="70" y1="230" x2="620" y2="230" stroke="var(--border-strong)" stroke-width="1.4"/>' +
      '<rect x="84" y="206" width="54" height="24" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="111" y="248" fill="var(--text-soft)" font-size="9.5" text-anchor="middle">RBR</text>' +
      '<text x="111" y="220" fill="var(--text-dim)" font-size="9" text-anchor="middle">1.62</text>' +
      '<rect x="160" y="190" width="54" height="40" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="187" y="248" fill="var(--text-soft)" font-size="9.5" text-anchor="middle">HBR</text>' +
      '<text x="187" y="204" fill="var(--text-dim)" font-size="9" text-anchor="middle">2.7</text>' +
      '<rect x="236" y="168" width="54" height="62" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="263" y="248" fill="var(--text-soft)" font-size="9.5" text-anchor="middle">HBR2</text>' +
      '<text x="263" y="182" fill="var(--text-dim)" font-size="9" text-anchor="middle">5.4</text>' +
      '<rect x="312" y="140" width="54" height="90" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="339" y="248" fill="var(--text-soft)" font-size="9.5" text-anchor="middle">HBR3</text>' +
      '<text x="339" y="154" fill="var(--text-dim)" font-size="9" text-anchor="middle">8.1</text>' +
      '<rect x="388" y="120" width="54" height="110" fill="var(--accent-soft)" stroke="var(--accent)"/>' +
      '<text x="415" y="248" fill="var(--accent-text)" font-size="9.5" text-anchor="middle">UHBR10</text>' +
      '<text x="415" y="134" fill="var(--accent)" font-size="9" text-anchor="middle">10</text>' +
      '<rect x="464" y="92" width="54" height="138" fill="var(--accent-soft)" stroke="var(--accent)"/>' +
      '<text x="491" y="248" fill="var(--accent-text)" font-size="9.5" text-anchor="middle">UHBR13.5</text>' +
      '<text x="491" y="106" fill="var(--accent)" font-size="9" text-anchor="middle">13.5</text>' +
      '<rect x="540" y="56" width="54" height="174" fill="var(--warn-soft)" stroke="var(--warn)"/>' +
      '<text x="567" y="248" fill="var(--warn)" font-size="9.5" text-anchor="middle">UHBR20</text>' +
      '<text x="567" y="70" fill="var(--warn)" font-size="9" text-anchor="middle">20</text>' +
      /* 说明 */
      '<text x="16" y="270" fill="var(--text-soft)" font-size="10.5">纵轴为「每 Lane 速率（Gbps）」；UHBR 系列仅在 128b/132b 信道编码下可用。</text>' +
      '<text x="16" y="284" fill="var(--text-dim)" font-size="10.5">4 Lane 总应用带宽：UHBR20 = 9670 MBps，HBR3 = 3240 MBps——约 3 倍差距来自编码开销。</text>' +
      '</svg>',

    /* 信道编码对比与 128b/132b 处理流水线 */
    dpCoding:
      '<svg class="bl-fig-svg" viewBox="0 0 640 300" role="img" aria-label="8b/10b 与 128b/132b 编码及处理流水线">' +
      '<rect x="0" y="0" width="640" height="300" fill="var(--surface-2)"/>' +
      '<text x="16" y="26" fill="var(--text-soft)" font-size="12" font-weight="600">信道编码：128b/132b 把编码开销从 25% 压到 3.125%，并内嵌 FEC</text>' +
      /* 左：开销对比 */
      '<text x="24" y="52" fill="var(--text-dim)" font-size="11">编码开销对比（每 8 数据位付出多少开销位）</text>' +
      '<rect x="24" y="62" width="150" height="40" rx="6" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="99" y="80" fill="var(--text-soft)" font-size="11" text-anchor="middle">8b/10b：+25%</text>' +
      '<text x="99" y="96" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">10 位传 8 位数据</text>' +
      '<rect x="194" y="62" width="150" height="40" rx="6" fill="var(--accent-soft)" stroke="var(--accent)"/>' +
      '<text x="269" y="80" fill="var(--accent)" font-size="11" text-anchor="middle">128b/132b：+3.125%</text>' +
      '<text x="269" y="96" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">132 位传 128 位数据</text>' +
      /* 右：流水线 */
      '<text x="364" y="52" fill="var(--text-dim)" font-size="11">DPTX 发送侧 128b/132b 处理顺序</text>' +
      '<rect x="364" y="62" width="256" height="22" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="492" y="77" fill="var(--text-soft)" font-size="9.5" text-anchor="middle">1 主链路 Lane 数换算</text>' +
      '<rect x="364" y="90" width="256" height="22" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="492" y="105" fill="var(--text-soft)" font-size="9.5" text-anchor="middle">2 超符号内位移（Intra super symbol shift）</text>' +
      '<rect x="364" y="118" width="256" height="22" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="492" y="133" fill="var(--text-soft)" font-size="9.5" text-anchor="middle">3 加扰（LFSR，23 阶多项式）</text>' +
      '<rect x="364" y="146" width="256" height="22" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="492" y="161" fill="var(--text-soft)" font-size="9.5" text-anchor="middle">4 插入 CDI（控制数据指示，4 bit）</text>' +
      '<rect x="364" y="174" width="256" height="22" rx="5" fill="var(--accent-soft)" stroke="var(--accent)"/>' +
      '<text x="492" y="189" fill="var(--accent-text)" font-size="9.5" text-anchor="middle">5 RS(198,194) FEC 编码</text>' +
      '<rect x="364" y="202" width="256" height="22" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="492" y="217" fill="var(--text-soft)" font-size="9.5" text-anchor="middle">6 RS 校验字节两路交织</text>' +
      '<rect x="364" y="230" width="256" height="22" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="492" y="245" fill="var(--text-soft)" font-size="9.5" text-anchor="middle">7 预编码（Pre-coding）</text>' +
      /* 底部：FEC 能力 */
      '<line x1="16" y1="268" x2="624" y2="268" stroke="var(--border)"/>' +
      '<text x="16" y="288" fill="var(--text-soft)" font-size="10.5">RS(198,194) 以 8-bit 符号为单位，每个 RS 数据块（194 符号）可纠正最多 2 个符号错误；</text>' +
      '<text x="16" y="298" fill="var(--text-dim)" font-size="9.5">数据块 = 12 个超符号 + 12 位 CDI + 4 位填充。加扰多项式 G(x)=x^23+x^21+x^16+x^8+x^5+x^2+1。</text>' +
      '</svg>',

    /* 链路训练流程 */
    dpTraining:
      '<svg class="bl-fig-svg" viewBox="0 0 640 250" role="img" aria-label="128b/132b 链路训练流程">' +
      '<rect x="0" y="0" width="640" height="250" fill="var(--surface-2)"/>' +
      '<text x="16" y="26" fill="var(--text-soft)" font-size="12" font-weight="600">128b/132b 链路训练：先用 TPS1 恢复时钟，再用 TPS2 做均衡，高速率再加 TPS3/4</text>' +
      /* 步骤框 */
      '<rect x="20" y="56" width="150" height="50" rx="8" fill="var(--surface)" stroke="var(--accent)"/>' +
      '<text x="95" y="78" fill="var(--accent)" font-size="11" text-anchor="middle">时钟恢复 CR</text>' +
      '<text x="95" y="95" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">128b132b_DP_TPS1（奈奎斯特图案）</text>' +
      '<rect x="200" y="56" width="150" height="50" rx="8" fill="var(--surface)" stroke="var(--accent)"/>' +
      '<text x="275" y="78" fill="var(--accent)" font-size="11" text-anchor="middle">通道均衡 CE</text>' +
      '<text x="275" y="95" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">128b132b_DP_TPS2（符号错误测量）</text>' +
      '<rect x="380" y="56" width="150" height="50" rx="8" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="455" y="78" fill="var(--text-soft)" font-size="11" text-anchor="middle">高速率均衡</text>' +
      '<text x="455" y="95" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">TPS3 / TPS4（> 10 GHz）</text>' +
      '<rect x="540" y="56" width="84" height="50" rx="8" fill="var(--ok-soft)" stroke="var(--ok)"/>' +
      '<text x="582" y="78" fill="var(--ok)" font-size="11" text-anchor="middle">链路就绪</text>' +
      '<text x="582" y="95" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">稳定传输</text>' +
      /* 箭头 */
      '<line x1="170" y1="81" x2="198" y2="81" stroke="var(--text-dim)" stroke-width="1.6"/>' +
      '<polygon points="198,81 192,77 192,85" fill="var(--text-dim)"/>' +
      '<line x1="350" y1="81" x2="378" y2="81" stroke="var(--text-dim)" stroke-width="1.6"/>' +
      '<polygon points="378,81 372,77 372,85" fill="var(--text-dim)"/>' +
      '<line x1="530" y1="81" x2="540" y2="81" stroke="var(--text-dim)" stroke-width="1.6"/>' +
      '<polygon points="540,81 534,77 534,85" fill="var(--text-dim)"/>' +
      /* 自环失败降速 */
      '<path d="M455 108 C455 132 380 132 380 112" fill="none" stroke="var(--warn)" stroke-width="1.6"/>' +
      '<polygon points="380,112 376,104 384,104" fill="var(--warn)" transform="rotate(180 380 108)"/>' +
      '<text x="470" y="132" fill="var(--warn)" font-size="10">均衡失败 → 降一档速率或减 Lane 重试</text>' +
      /* LTTPR 说明 */
      '<rect x="20" y="150" width="600" height="80" rx="8" fill="var(--surface)" stroke="var(--border)"/>' +
      '<text x="36" y="172" fill="var(--text-soft)" font-size="11" font-weight="600">LTTPR（Link Training Tunable PHY Repeater，物理层中继器）</text>' +
      '<text x="36" y="192" fill="var(--text-soft)" font-size="10.5">透明模式（Transparent）：中继器对上下行如同不存在，训练一次贯穿整链；</text>' +
      '<text x="36" y="210" fill="var(--text-soft)" font-size="10.5">非透明模式（Non-transparent）：每个链路段独立训练，逐级收敛，适合长链路与有源线缆。</text>' +
      '<text x="36" y="226" fill="var(--text-dim)" font-size="9.5">DPRX 在复位或上游断开后会回退到 8b/10b；128b/132b 能力需经 AUX 重新发现。</text>' +
      '</svg>',

    /* SST 单流映射与 M/N 时钟再生 */
    dpSst:
      '<svg class="bl-fig-svg" viewBox="0 0 640 232" role="img" aria-label="SST 像素到传输单元映射与流时钟再生">' +
      '<rect x="0" y="0" width="640" height="232" fill="var(--surface-2)"/>' +
      '<text x="16" y="26" fill="var(--text-soft)" font-size="12" font-weight="600">SST：像素按 4-Lane 规则打包成 Transfer Unit，再映射进主链路各 Lane</text>' +
      /* 像素编号 → Lane 映射表 */
      '<text x="24" y="52" fill="var(--text-dim)" font-size="11">像素编号 → Lane 编号（4-Lane 主链路）</text>' +
      '<rect x="24" y="60" width="120" height="24" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/><text x="84" y="77" fill="var(--text-soft)" font-size="11" text-anchor="middle">像素 0,4,8… → Lane 0</text>' +
      '<rect x="172" y="60" width="120" height="24" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/><text x="232" y="77" fill="var(--text-soft)" font-size="11" text-anchor="middle">像素 1,5,9… → Lane 1</text>' +
      '<rect x="320" y="60" width="120" height="24" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/><text x="380" y="77" fill="var(--text-soft)" font-size="11" text-anchor="middle">像素 2,6,10… → Lane 2</text>' +
      '<rect x="468" y="60" width="120" height="24" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/><text x="528" y="77" fill="var(--text-soft)" font-size="11" text-anchor="middle">像素 3,7,11… → Lane 3</text>' +
      /* M/N 时钟再生 */
      '<rect x="24" y="98" width="592" height="64" rx="8" fill="var(--surface)" stroke="var(--border)"/>' +
      '<text x="40" y="120" fill="var(--text-soft)" font-size="11" font-weight="600">流时钟再生（Stream Clock Regeneration）</text>' +
      '<text x="40" y="140" fill="var(--text-soft)" font-size="10.5">接收端用 M / N 比值从链路时钟恢复音频/视频流时钟：</text>' +
      '<text x="40" y="156" fill="var(--text-dim)" font-size="10.5">N = 主链路符号时钟 ÷ 流时钟基准；M = 每 N 个主链路周期对应的流时钟周期数（MSA 携带）。</text>' +
      /* 速率不足填塞 */
      '<rect x="24" y="174" width="592" height="44" rx="8" fill="var(--surface)" stroke="var(--border)"/>' +
      '<text x="40" y="196" fill="var(--text-soft)" font-size="11" font-weight="600">速率填塞</text>' +
      '<text x="40" y="212" fill="var(--text-dim)" font-size="10.5">打包后的流数据率 ≤ 主链路符号率；不足时用填塞符号（Stuffing）补齐，不浪费 Lane。</text>' +
      '</svg>',

    /* MST 拓扑：源 → 分支（汇聚/分路）→ 多宿，虚拟通道与 PBN */
    dpMst:
      '<svg class="bl-fig-svg" viewBox="0 0 640 270" role="img" aria-label="MST 多流拓扑与虚拟通道">' +
      '<rect x="0" y="0" width="640" height="270" fill="var(--surface-2)"/>' +
      '<text x="16" y="26" fill="var(--text-soft)" font-size="12" font-weight="600">MST：一条主链路承载多路流，按「虚拟通道 → VC Payload → 时隙」逐级映射</text>' +
      /* 源 */
      '<rect x="20" y="52" width="120" height="60" rx="8" fill="var(--accent-soft)" stroke="var(--accent)"/>' +
      '<text x="80" y="76" fill="var(--accent-text)" font-size="11" text-anchor="middle">Source</text>' +
      '<text x="80" y="94" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">2 路流源</text>' +
      /* 分支汇聚 */
      '<rect x="200" y="40" width="130" height="84" rx="8" fill="var(--surface)" stroke="var(--teal)"/>' +
      '<text x="265" y="64" fill="var(--teal)" font-size="11" text-anchor="middle">Branch（汇聚）</text>' +
      '<text x="265" y="82" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">把两路流装入</text>' +
      '<text x="265" y="98" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">同一个 VC Payload</text>' +
      '<text x="265" y="114" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">经 Sideband 信令管理</text>' +
      /* 分路 */
      '<rect x="400" y="44" width="120" height="76" rx="8" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="460" y="66" fill="var(--text-soft)" font-size="11" text-anchor="middle">Branch（分路）</text>' +
      '<text x="460" y="84" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">把聚合流重新</text>' +
      '<text x="460" y="100" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">分发到两条链路</text>' +
      /* 宿 */
      '<rect x="556" y="40" width="72" height="40" rx="8" fill="var(--surface)" stroke="var(--border-strong)"/><text x="592" y="64" fill="var(--text-soft)" font-size="10" text-anchor="middle">Sink A</text>' +
      '<rect x="556" y="92" width="72" height="40" rx="8" fill="var(--surface)" stroke="var(--border-strong)"/><text x="592" y="116" fill="var(--text-soft)" font-size="10" text-anchor="middle">Sink B</text>' +
      /* 链路连线 */
      '<line x1="140" y1="82" x2="198" y2="82" stroke="var(--text-dim)" stroke-width="1.6"/><polygon points="198,82 192,78 192,86" fill="var(--text-dim)"/>' +
      '<line x1="330" y1="82" x2="398" y2="82" stroke="var(--text-dim)" stroke-width="1.6"/><polygon points="398,82 392,78 392,86" fill="var(--text-dim)"/>' +
      '<line x1="520" y1="82" x2="554" y2="60" stroke="var(--text-dim)" stroke-width="1.6"/><polygon points="554,60 548,58 550,66" fill="var(--text-dim)"/>' +
      '<line x1="520" y1="82" x2="554" y2="112" stroke="var(--text-dim)" stroke-width="1.6"/><polygon points="554,112 550,104 548,112" fill="var(--text-dim)"/>' +
      /* 底部说明 */
      '<line x1="16" y1="150" x2="624" y2="150" stroke="var(--border)"/>' +
      '<text x="16" y="172" fill="var(--text-soft)" font-size="11">虚拟通道（VC）是「源→宿」的端到端直连，底层可能跨多条链路（Path）；每路流占用若干时隙（Time Slot）。</text>' +
      '<text x="16" y="190" fill="var(--text-soft)" font-size="11">带宽以 PBN（Payload Bandwidth Number）计量，再换算成时隙数；拓扑由 Topology Manager 经 Sideband 消息发现与维护。</text>' +
      '<text x="16" y="208" fill="var(--text-dim)" font-size="10.5">SST 与 MST 的差别只在「是否多流」：单流时主链路直接传 Transfer Unit；多流时改用 MTP 并做 VC 时隙分配。</text>' +
      '<text x="16" y="226" fill="var(--text-dim)" font-size="10.5">一个典型用法：一台笔记本通过扩展坞，把内置屏与外接两台显示器用同一条主链路同时驱动。</text>' +
      '<text x="16" y="244" fill="var(--text-dim)" font-size="10.5">分支设备（Branch）既可以是汇聚器也可以是分路器；它对上游表现为一个 Sink，对下游表现为一个 Source。</text>' +
      '</svg>',

    /* AUX 通道与 DPCD 寄存器空间 */
    dpAux:
      '<svg class="bl-fig-svg" viewBox="0 0 640 232" role="img" aria-label="AUX 通道与 DPCD 寄存器空间">' +
      '<rect x="0" y="0" width="640" height="232" fill="var(--surface-2)"/>' +
      '<text x="16" y="26" fill="var(--text-soft)" font-size="12" font-weight="600">AUX_CH：半双工 1 Mbps，承载 DPCD 寄存器访问与 I2C-over-AUX（读 EDID / HDCP）</text>' +
      /* 物理 */
      '<rect x="20" y="46" width="190" height="64" rx="8" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="115" y="68" fill="var(--text-soft)" font-size="11" text-anchor="middle">物理层</text>' +
      '<text x="115" y="86" fill="var(--text-dim)" font-size="10" text-anchor="middle">1 对交流耦合差分线</text>' +
      '<text x="115" y="102" fill="var(--text-dim)" font-size="10" text-anchor="middle">Manchester-II 编码 · 源为主</text>' +
      /* 事务 */
      '<rect x="230" y="46" width="190" height="64" rx="8" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="325" y="68" fill="var(--text-soft)" font-size="11" text-anchor="middle">事务类型</text>' +
      '<text x="325" y="86" fill="var(--text-dim)" font-size="10" text-anchor="middle">Native AUX：1/2/4/8/16 字节读写</text>' +
      '<text x="325" y="102" fill="var(--text-dim)" font-size="10" text-anchor="middle">I2C-over-AUX：映射 DDC 读 EDID</text>' +
      /* DPCD 空间 */
      '<rect x="440" y="46" width="180" height="64" rx="8" fill="var(--accent-soft)" stroke="var(--accent)"/>' +
      '<text x="530" y="68" fill="var(--accent-text)" font-size="11" text-anchor="middle">DPCD 地址空间</text>' +
      '<text x="530" y="86" fill="var(--text-dim)" font-size="10" text-anchor="middle">00000h–FFFFFh（基础）</text>' +
      '<text x="530" y="102" fill="var(--text-dim)" font-size="10" text-anchor="middle">022000h+、E0000h+（扩展/隧道）</text>' +
      /* 用途 */
      '<line x1="16" y1="128" x2="624" y2="128" stroke="var(--border)"/>' +
      '<text x="16" y="150" fill="var(--text-soft)" font-size="11">AUX 不做视频传输，专管「发现 + 配置 + 状态」：链路训练指令、DPCD 能力读取、HPD 中断响应都走它。</text>' +
      '<text x="16" y="168" fill="var(--text-soft)" font-size="11">每次事务 ≤ 500 us、突发 ≤ 16 字节，避免单一应用饿死其它应用——这是 AUX 链路层的仲裁设计目标。</text>' +
      '<text x="16" y="186" fill="var(--text-dim)" font-size="10.5">DPCD 相当于「宿端能力寄存器库」：链路速率、Lane 数、编码方式、DSC/Adaptive-Sync/Panel Replay 能力都在其中枚举。</text>' +
      '<text x="16" y="204" fill="var(--text-dim)" font-size="10.5">EDID/DisplayID 描述「显示本身的能力」，DPCD 描述「接收端 DPRX 与链路的能力」，两者分工明确。</text>' +
      '<text x="16" y="222" fill="var(--text-dim)" font-size="10.5">I2C-over-AUX 让 AUX 一根线同时承担传统 DDC 职责，连接器上不再需要独立的 I2C 总线。</text>' +
      '</svg>',

    /* 带宽与 DSC 强制要求 */
    dpBandwidth:
      '<svg class="bl-fig-svg" viewBox="0 0 640 268" role="img" aria-label="UHBR 带宽与 DSC 强制要求">' +
      '<rect x="0" y="0" width="640" height="268" fill="var(--surface-2)"/>' +
      '<text x="16" y="26" fill="var(--text-soft)" font-size="12" font-weight="600">带宽预算：UHBR 让高分辨率更从容，但 128b/132b 设备原则上必须支持 DSC</text>' +
      /* 4-Lane 总带宽阶梯 */
      '<text x="16" y="50" fill="var(--text-dim)" font-size="11">4-Lane 总应用带宽（MBps）</text>' +
      '<line x1="120" y1="92" x2="120" y2="210" stroke="var(--border-strong)" stroke-width="1.4"/>' +
      '<rect x="40" y="180" width="60" height="30" fill="var(--surface)" stroke="var(--border-strong)"/><text x="70" y="200" fill="var(--text-soft)" font-size="9.5" text-anchor="middle">648</text>' +
      '<rect x="40" y="162" width="60" height="48" fill="var(--surface)" stroke="var(--border-strong)"/><text x="70" y="182" fill="var(--text-soft)" font-size="9.5" text-anchor="middle">1080</text>' +
      '<rect x="40" y="138" width="60" height="72" fill="var(--surface)" stroke="var(--border-strong)"/><text x="70" y="158" fill="var(--text-soft)" font-size="9.5" text-anchor="middle">2160</text>' +
      '<rect x="40" y="108" width="60" height="102" fill="var(--surface)" stroke="var(--border-strong)"/><text x="70" y="128" fill="var(--text-soft)" font-size="9.5" text-anchor="middle">3240</text>' +
      '<rect x="40" y="62" width="60" height="148" fill="var(--accent-soft)" stroke="var(--accent)"/><text x="70" y="82" fill="var(--accent)" font-size="9.5" text-anchor="middle">9670</text>' +
      '<text x="70" y="100" fill="var(--text-dim)" font-size="8.5" text-anchor="middle">UHBR20</text>' +
      '<text x="70" y="224" fill="var(--text-soft)" font-size="9" text-anchor="middle">RBR HBR HBR2 HBR3 UHBR20</text>' +
      /* 右侧 DSC 说明 */
      '<rect x="150" y="56" width="474" height="160" rx="8" fill="var(--surface)" stroke="var(--border)"/>' +
      '<text x="166" y="78" fill="var(--text-soft)" font-size="11" font-weight="600">DSC 强制条款（针对支持 128b/132b 的设备）</text>' +
      '<text x="166" y="98" fill="var(--text-soft)" font-size="10.5">所有支持 128b/132b 的 Source / Sink / Branch 都必须支持 DSC 码流传输；豁免情形：</text>' +
      '<text x="166" y="116" fill="var(--text-soft)" font-size="10.5">• 单流 Source/Sink 在带宽受限时免编码器/解码器：2/4-Lane ≤ 19.29 Gbps、1-Lane ≤ 9.65 Gbps（均按 24-bpp 像素流计）。</text>' +
      '<text x="166" y="134" fill="var(--text-soft)" font-size="10.5">• 安全法规禁止压缩的场景，DSC 必须关闭（软开关或硬件熔丝均可）。</text>' +
      '<text x="166" y="152" fill="var(--text-soft)" font-size="10.5">• Source 的 DSC 编码资源须保证：每路流至少 3840×2160@60（594 MP/s）。</text>' +
      '<text x="166" y="172" fill="var(--text-dim)" font-size="10">UHBR20 + DSC 才能稳妥驱动 8K60 10bpc RGB 这类「重」格式；不压缩时，满带宽也仅供更保守的格式。</text>' +
      '<text x="166" y="190" fill="var(--text-dim)" font-size="10">带宽、Lane 数、像素格式、色深、帧率彼此可自由权衡——这正是 DP 链路「速率与像素率解耦」的红利。</text>' +
      '<text x="166" y="208" fill="var(--text-dim)" font-size="10">DSC 已在另一篇长文中专门解析，本篇只把它作为「128b/132b 的能力前提」来谈。</text>' +
      '</svg>',

    /* Adaptive-Sync / Panel Replay / DP Tunneling 特性族 */
    dpFeatures:
      '<svg class="bl-fig-svg" viewBox="0 0 640 250" role="img" aria-label="Adaptive-Sync、Panel Replay 与 DP Tunneling">' +
      '<rect x="0" y="0" width="640" height="250" fill="var(--surface-2)"/>' +
      '<text x="16" y="26" fill="var(--text-soft)" font-size="12" font-weight="600">DP 2.1 的特性族：Adaptive-Sync、Panel Replay、DP Tunneling 都在 2.1 被强化</text>' +
      '<rect x="20" y="46" width="190" height="84" rx="8" fill="var(--surface)" stroke="var(--accent)"/>' +
      '<text x="115" y="68" fill="var(--accent)" font-size="11" text-anchor="middle">Adaptive-Sync</text>' +
      '<text x="115" y="86" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">FAVT：媒体播放，平均帧率对齐内容</text>' +
      '<text x="115" y="102" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">AVT：游戏，逐帧编程帧时长</text>' +
      '<text x="115" y="118" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">抖动 ±3.6 ppm / 3333 帧</text>' +
      '<rect x="230" y="46" width="190" height="84" rx="8" fill="var(--surface)" stroke="var(--teal)"/>' +
      '<text x="325" y="68" fill="var(--teal)" font-size="11" text-anchor="middle">Panel Replay</text>' +
      '<text x="325" y="86" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">类 eDP PSR：把活动帧存入 RFB</text>' +
      '<text x="325" y="102" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">PR 期间主链路可关闭省电</text>' +
      '<text x="325" y="118" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">配合 AUX-less ALPM</text>' +
      '<rect x="440" y="46" width="180" height="84" rx="8" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="530" y="68" fill="var(--text-soft)" font-size="11" text-anchor="middle">DP Tunneling</text>' +
      '<text x="530" y="86" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">DP 流经 USB4 / 雷雳传输</text>' +
      '<text x="530" y="102" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">2.1 新增带宽动态分配</text>' +
      '<text x="530" y="118" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">比 Lane/速率更细的粒度</text>' +
      '<line x1="16" y1="146" x2="624" y2="146" stroke="var(--border)"/>' +
      '<text x="16" y="168" fill="var(--text-soft)" font-size="11">Adaptive-Sync 与 Panel Replay 都通过 DPCD 寄存器与专用 SDP 协商，且可叠加运行以进一步降低系统功耗与延迟。</text>' +
      '<text x="16" y="186" fill="var(--text-soft)" font-size="11">DP Tunneling 通过「DP IN 适配器 → 隧道协议 → DP OUT 适配器」的结构，把 DP 流封装进 USB4 等底层传输。</text>' +
      '<text x="16" y="204" fill="var(--text-dim)" font-size="10.5">在 Type-C 上，DP 以「Alt Mode」形式复用 USB-C 的四对高速线；是否进入 Alt Mode 由设备策略与 CC 协商决定。</text>' +
      '<text x="16" y="222" fill="var(--text-dim)" font-size="10.5">三者都依赖前几章的底座：AUX/DPCD 做信令、128b/132b 与 UHBR 提供带宽、MST 灵活分配链路资源。</text>' +
      '</svg>'
  };

  Object.keys(FIGURES).forEach(function (k) { D.figures[k] = FIGURES[k]; });

  /* -------------------------------------------------------------- 术语表 */
  /* [ 英文术语, 中文术语, 说明 ] —— 与首篇/HDMI/DSC 篇同构，每篇自带、互不干扰。 */
  var GLOSSARY = [
    ['DisplayPort (DP)', 'DisplayPort', 'VESA 制定的数字显示接口标准，源到宿传输视频、音频与其它数据'],
    ['Source / Sink', '源设备 / 宿设备', 'DP 链路两端的角色：Source 发流（如 GPU），Sink 收流（如显示器）；同一器件可兼具两角'],
    ['Main-Link', '主链路', '1/2/4 对交流耦合差分线，单向、低延迟，承载等时视频与音频流'],
    ['AUX_CH', '辅助通道', 'AC 耦合差分对，Manchester-II 编码，半双工 1 Mbps，承载 DPCD 访问与 I2C-over-AUX'],
    ['HPD', '热插拔检测', '宿向源报告「在位且已上电」的信号，也用作中断请求（IRQ_HPD）'],
    ['SST', '单流传输', 'Single-Stream Transport：一条主链路只传一路主视频流与可选的 SDP 流'],
    ['MST', '多流传输', 'Multi-Stream Transport：一条主链路承载多路流，经虚拟通道与时隙分配'],
    ['Transfer Unit', '传输单元', 'SST 下的微包单位，像素数据打包后映射进主链路各 Lane'],
    ['MTP', '多流传输包', 'MST 下的多流包，承载 VC Payload；SST 的 Transfer Unit 在 MST 中被 MTP 取代'],
    ['8b/10b', '8b/10b 编码', '传统 DP 信道编码，开销 25%；支持 RBR/HBR/HBR2/HBR3 四种速率'],
    ['128b/132b', '128b/132b 编码', 'DP 2.0 引入的信道编码，开销仅 3.125%，内嵌 RS(198,194) FEC；支撑 UHBR 系列'],
    ['UHBR', '超高比特率', 'Ultra High Bit Rate：13.5/20 Gbps/lane（UHBR13.5/UHBR20）与 10 Gbps/lane（UHBR10），仅在 128b/132b 下可用'],
    ['RBR / HBR', '减速率 / 高速率', 'Reduced Bit Rate 1.62、HBR 2.7、HBR2 5.4、HBR3 8.1 Gbps/lane 的统称（均为 8b/10b）'],
    ['Scrambling', '加扰', '用 23 阶 LFSR 对链路符号加扰以平衡直流；多项式 G(x)=x^23+x^21+x^16+x^8+x^5+x^2+1'],
    ['RS(198,194)', 'RS 前向纠错', '8-bit 符号的里德-所罗门码，每个 RS 数据块（194 符号）可纠正最多 2 个符号错误'],
    ['CDI', '控制数据指示', 'Control Data Indicator：标识当前 132-bit 码块携带的是数据还是控制/PHY 同步符号'],
    ['LTTPR', '可调物理层中继器', 'Link Training Tunpeable PHY Repeater：介于 Source 与 Sink 之间的物理层中继，支持透明/非透明训练'],
    ['CR / CE', '时钟恢复 / 通道均衡', '链路训练的两个核心阶段：先恢复时钟（CR），再做通道均衡（CE）'],
    ['TPS', '训练图案', 'Training Pattern Set：时钟恢复用 128b132b_DP_TPS1（奈奎斯特），均衡用 TPS2，>10GHz 用 TPS3/4'],
    ['M/N', '流时钟再生比', '接收端用 M/N 比值从主链路时钟恢复音视频流时钟，N 为基准、M 来自 MSA'],
    ['MSA', '主流属性', 'Main Stream Attributes：随流传输的分辨率、时序、色深等元信息'],
    ['SDP', '辅助数据包', 'Secondary Data Packet：传输音频、信息帧、VSC 等附加数据，区别于主视频流'],
    ['VB-ID', '视频帧空白标识', '携带消隐、视频有效、音频静音等状态位，随 MSA 一起在每个传输单元传送'],
    ['VC', '虚拟通道', 'Virtual Channel：源到宿的端到端直连逻辑通道，底层可能跨多条链路'],
    ['PBN', '载荷带宽数', 'Payload Bandwidth Number：MST 以 PBN 计量每路流占用的链路带宽，再换算为时隙'],
    ['Sideband', '边带消息', 'MST 拓扑管理用的消息通道，承载连接状态、拓扑发现、分配请求等'],
    ['DPCD', 'DP 配置数据', 'DisplayPort Configuration Data：Sink 端寄存器库（00000h 起），枚举能力与状态，经 AUX 访问'],
    ['EDID / DisplayID', '扩展显示标识数据', '描述「显示本身」能力的数据块；DP 经 AUX 的 I2C-over-AUX 读取'],
    ['DSC', '显示流压缩', 'VESA 视觉无损压缩；DP 2.0+ 的 128b/132b 设备原则上必须支持其码流传输'],
    ['Adaptive-Sync', '自适应同步', 'DP 2.1 新增：FAVT（平均帧率对齐内容）与 AVT（逐帧编程帧时长）两种模式'],
    ['Panel Replay', '面板回放', '类 eDP PSR 的省电功能：把活动帧存入 Remote Frame Buffer，PR 期间可关闭主链路'],
    ['DP Tunneling', 'DP 隧道', 'DP 流经 USB4/雷雳等底层传输；2.1 新增比 Lane/速率更细的带宽动态分配'],
    ['Alt Mode', '替代模式', 'Type-C 上复用四对高速线承载 DP；是否进入由设备策略与 CC 协商'],
    ['HDCP', '高清内容保护', 'High-bandwidth Digital Content Protection：DP 可选的内容加密，2.x 对应 HDCP 2.2/2.3']
  ];

  /* ---------------------------------------------------------------- 文章 */
  D.posts.push({
    id: 'dp',
    title: 'DisplayPort 2.1 接口规范技术解析',
    titleEn: 'VESA DisplayPort Standard 2.1 — Deep Dive',
    subtitle: '从 Main-Link / AUX / HPD 的端到端分工、128b/132b 编码与 RS 纠错、链路训练，' +
      '到 SST/MST 多流、DPCD、UHBR 带宽、Adaptive-Sync 与 DP 隧道：把「20 Gbps/lane」这条链路拆开看',
    category: '显示接口',
     tags: ['DisplayPort 2.1', '128b/132b', 'UHBR', 'RS(198,194)', '链路训练', 'MST', 'DSC', 'Adaptive-Sync'],
    source: {
      name: 'VESA',
      label: 'DisplayPort (DP) Standard Version 2.1（2022-10-10，1560 页，替代并归并 DP 2.0）',
      url: 'https://www.vesa.org/',
      note: '本篇是基于规范正文的学习性中文原理整理，非官方译文，也未转载规范原表格与插图；' +
        '数据以 VESA 发布的 DisplayPort Standard 2.1 为准，产品合规请以规范原文与 DP CTS 为最终依据。'
    },
    license: 'DisplayPort 标准原文版权归 VESA 所有；本页为学习用途的中文原理整理，只复述机制与参数含义，' +
      '未转载规范原表格与插图，示意图均按规范描述重绘。',
    summary: 'DisplayPort 是 VESA 为「源到宿」传输视频、音频与其它数据而制定的开放数字接口，' +
      '既可用于 PC 与显示器之间的外部连接，也用于设备内部的屏接。DP 2.1 在 2.0 的基础上，' +
      '把 **UHBR（超高比特率）** 扩展到可插拔的原生 DP 线缆、USB-C 转 DP 适配线缆与 USB-C 线缆，' +
      '并与 USB4 物理层电气规范高度对齐；同时补上了 **AUX-less ALPM** 省电、并明确了驱动 HDMI 2.1 宿设备的' +
      'DP-to-HDMI 协议转换器（PCON）操作要求。本篇按规范正文的顺序，从端到端系统讲起，' +
      '依次拆解主链路与辅助通道的分工、128b/132b 信道编码与 RS(198,194) 前向纠错、链路训练、' +
      'SST/MST 两种流传输方式、DPCD 配置空间、UHBR 带宽与 DSC 强制要求，以及 Adaptive-Sync、' +
      'Panel Replay 与 DP 隧道这些 2.1 强化的特性，把每条特性的动机与机制讲清。',
    glossary: GLOSSARY,
    chapters: [

      /* ======================================================== 01 DP 是什么与版本演进 */
      {
        id: 'what',
        num: '01',
        title: 'DP 是什么，以及它怎么一步步走到 2.1',
        titleEn: 'What DP Is, and Its Version History',
        lead: 'DisplayPort 的定位从第一版起就很克制：它不打算取代某条已有线，而是把「视频、音频、' +
          '其它数据」统一收进一个可扩展、可演进的包化链路。理解版本演进，是看懂 2.1 各项新增的前提。',
        sections: [
          {
            id: 'position',
            title: '规范的目标与适用范围',
            titleEn: 'Goals and Scope of the Specification',
            blocks: [
              { t: 'p', v: 'DP 标准明确定义：用一个**数字通信接口**，在源设备（Source）与宿设备（Sink）之间，' +
                '传输视频、音频以及其它数据。它既面向设备**内部**连接（例如 PC 里或显示器内部的屏接），' +
                '也面向**外部**显示连接——PC 接显示器或投影、PC 接电视、DVD 播放器接电视，都属于它的目标场景。' },
              { t: 'list', items: [
                ['开放标准', '由 VESA 维护，规范原文对所有采纳者开放，接口不绑定某一家厂商的私有协议'],
                ['包化等时传输', '视频/音频以微包（micro-packet）形式等时传输，便于多流、多格式复用'],
                ['链路与流解耦', '链路速率独立于像素率：链路可保持稳定，即使所传流的时序改变'],
                ['可分层的架构', 'PHY 层未来可替换而链路层不变，使标准能随技术演进保持成本与性能位置']
              ] },
              { t: 'callout', kind: 'info', title: 'Source / Sink 是角色，不是器件',
                v: '同一个扩展坞，对显示器而言是 Source，对上游显卡而言又是 Sink；DP 全程按「角色」描述行为，' +
                  '这让分支设备（Branch）能自然地既当上游 Sink、又当下游 Source。' }
            ]
          },
          {
            id: 'history',
            title: '版本演进的关键节点',
            titleEn: 'Key Milestones in Version Evolution',
            blocks: [
              { t: 'p', v: 'DP 每个大版本几乎都在「提速率」或「补能力」二者之间交替。下面按规范开篇的 Summary 梳理主线：' },
              { t: 'table', head: ['版本', '关键新增'], rows: [
                ['DP v1.1a', '修正勘误、澄清 v1.1'],
                ['DP v1.2', '更高速度、更灵活的拓扑管理、单连接多流（MST）、更快的 AUX、改进音频、更小连接器'],
                ['DP v1.2a', '修正勘误、澄清 v1.2'],
                ['DP v1.3', '新增 8.1 Gbps/lane（HBR3），并改善客厅友好性（直连或经 DP-to-HDMI 转换器）'],
                ['DP v1.4', '加入 VESA DSC 视觉无损压缩以承载 8K/10K@60、32 声道 L-PCM 3D 音频、静态/动态 HDR 元数据、增强 MST'],
                ['DP v1.4a', '修正勘误，并引用 DSC v1.2a 以启用 YCbCr 4:2:0'],
                ['DP v2.0', '新增 128b/132b 编码与最高 20 Gbps/lane（UHBR），带宽是 HBR3 的约 3 倍；新增 Panel Replay；128b/132b 设备强制支持 DSC'],
                ['DP v2.1', 'UHBR 扩展到可插拔原生 DP/USB-C 线缆与适配器，并与 USB4 PHY 电气规范对齐；新增 AUX-less ALPM 省电；明确 DP-to-HDMI 2.1 PCON 操作要求']
              ] },
              { t: 'callout', kind: 'key', title: '2.1 不是「换个名字的 2.0」',
                v: '2.1 的核心动作是把 2.0 的 UHBR 资本从「仅限特定线缆」扩大到「可插拔原生 DP 线缆 + USB-C 线缆 + 转接适配器」，' +
                  '并和 USB4 物理层电气规范做扎实对齐——这让 UHBR 真正能落地到市售线缆与接口上。' }
            ]
          },
          {
            id: 'scope',
            title: '本篇的取材边界',
            titleEn: 'Editorial Boundaries of This Article',
            blocks: [
              { t: 'p', v: 'DP 标准正文有 1560 页，涵盖链路层、PHY 层、机械规范与大量设备互操作策略。' +
                '本篇聚焦「接口规范的原理骨架」：端到端通道、信道编码与纠错、链路训练、流传输、配置空间、' +
                '带宽与特性族；对纯电气一致性测试、完整 DPCD 寄存器位定义、HDCP 加密细节，只做指向性说明。' },
              { t: 'quote', v: '最后重申取材边界：本页是面向中文读者的学习性原理整理，不是规范译文，' +
                '也没有转载规范的表格与插图；所有示意图均按规范描述的机理重绘。' }
            ]
          }
        ]
      },

      /* ======================================================== 02 系统架构 */
      {
        id: 'arch',
        num: '02',
        title: '端到端架构：三条通道与分层模型',
        titleEn: 'End-to-End Architecture: Channels and Layering',
        lead: 'DP 链路由三条通道组成：主链路、辅助通道、热插拔检测。它们的职责截然不同——' +
          '一条扛重活，一条管治理，一条报在位。分层模型则让 PHY 可演进、链路层保持稳定。',
        sections: [
          {
            id: 'channels',
            title: '三条通道的分工',
            titleEn: 'Division of Labor Across the Three Channels',
            blocks: [
              { t: 'fig', id: 'dpSystem', caption: 'DP 端到端：高速主链路走 1/2/4 对差分线，AUX 与 HPD 走侧信道' },
              { t: 'list', items: [
                ['Main-Link（主链路）', '单向、高带宽、低延迟的等时数据通道，传输未压缩视频与音频等流'],
                ['AUX_CH（辅助通道）', '半双工双向通道，用于链路与设备治理（配置、能力读取、状态查询）'],
                ['HPD（热插拔检测）', '宿设备用它通知源「已上电且在位」，也用作中断请求（IRQ_HPD）']
              ] },
              { t: 'p', v: '盒对盒连接的标准连接器还带一根供电引脚（DP_PWR），可为本地小设备供电。' +
                '视频与音频主链路是**单向**的；侧信道（AUX/HPD）则承载发现、状态与控制，方向与数据流不同。' }
            ]
          },
          {
            id: 'layered',
            title: '分层模块化架构',
            titleEn: 'Layered, Modular Architecture',
            blocks: [
              { t: 'p', v: 'DP 把功能拆成应用层、链路层、PHY 层与内容保护密码层。宿端的 **DPCD** 描述 DPRX 的链路能力，' +
                '正如 EDID/DisplayID 描述「显示本身」的能力；链路策略制定者（Link Policy Maker）与流策略制定者' +
                '（Stream Policy Maker）分别管理链路与流。状态的细节（状态机、固件、系统软件）由实现自行决定。' },
              { t: 'callout', kind: 'info', title: 'PHY 可替换的设计意图',
                v: '规范明确写到：未来某时 PHY 层可能被替换而链路层保持不变。这正是 DP 能持续演进（从 8b/10b 到 128b/132b）' +
                  '却不颠覆上层的原因——分层隔离让「换物理层」成为可控的工程动作。' }
            ]
          },
          {
            id: 'sst-mst',
            title: 'SST 与 MST：单流与多流',
            titleEn: 'SST vs. MST: Single-Stream and Multi-Stream',
            blocks: [
              { t: 'p', v: 'DP 的流传输有两种模式。**SST（单流）** 一条主链路只传一路主视频流与可选的 SDP 流；' +
                '**MST（多流）** 则允许把来自一个或多个源的多路流，经一条或多条 DP 链路，送到多个宿设备。' },
              { t: 'p', v: '在 SST 下，流数据被打包成称作 **Transfer Unit** 的微包；在 MST 下，对应的微包称作 **MTP**。' +
                '打包并映射到主链路后，流数据率必须 ≤ 主链路符号率；不足时用**填塞符号**补齐。' },
              { t: 'callout', kind: 'key', title: 'SST 与 MST 差在「是否多流」',
                v: '单流时主链路直接传 Transfer Unit；多流时改用 MTP 并做虚拟通道的时隙分配。' +
                  '这也是下文把两章分开讲解的原因——它们共享同一套底层，只是复用方式不同。' }
            ]
          }
        ]
      },

      /* ======================================================== 03 物理层与连接器 */
      {
        id: 'phy',
        num: '03',
        title: '物理层：主链路构成、信道编码与连接器',
        titleEn: 'PHY Layer: Lane Composition, Coding, and Connectors',
        lead: '主链路是 1/2/4 对交流耦合差分线，且**没有独立时钟线**——时钟从数据流本身恢复。' +
          '这决定了 DP 在连接器上可以非常精简。编码方式（8b/10b 与 128b/132b）则直接决定了带宽上限。',
        sections: [
          {
            id: 'lanes',
            title: '主链路构成与速率表',
            titleEn: 'Main-Link Composition and the Link Rate Table',
            blocks: [
              { t: 'p', v: '主链路由一到四对**交流耦合、双端终接的差分线**（称作 Lane）组成。交流耦合让 DPTX 与 DPRX' +
                '可以使用不同的共模电压，便于工艺迁移。所有被使能的 Lane 必须以**相同**链路速率运行，且链路速率与像素率解耦。' },
              { t: 'callout', kind: 'key', title: '没有独立时钟通道',
                v: '因为没有专用时钟线，接收端必须从数据流本身恢复时钟。所有 Lane 都传数据——这正是 DP 物理层精简的根源。' },
              { t: 'fig', id: 'dpLanes', caption: '主链路应用带宽（Table 1-7）：128b/132b 的 UHBR 系列效率远高于 8b/10b' },
              { t: 'p', v: '规范在 Table 1-7 给出各速率/Lane 数组合下的应用带宽（MBps）。关键点：8b/10b 支持四种速率' +
                '（RBR 1.62、HBR 2.7、HBR2 5.4、HBR3 8.1 Gbps/lane），128b/132b 支持三种' +
                '（UHBR10 10、UHBR13.5 13.5、UHBR20 20 Gbps/lane）。对 128b/132b 设备，10 Gbps/lane 是强制项，' +
                '13.5 与 20 为可选项。' }
            ]
          },
          {
            id: 'coding',
            title: '两种信道编码：8b/10b 与 128b/132b',
            titleEn: 'Two Channel Codings: 8b/10b and 128b/132b',
            blocks: [
              { t: 'p', v: '8b/10b 是传统编码：每 8 位数据付出 10 位，开销 **25%**，正是 HBR3 那一代的物理上限来源。' +
                '128b/132b 是 DP 2.0 引入的新编码：每 128 位信息用 132 位承载，开销仅 **3.125%**，并内嵌前向纠错。' +
                '正因编码效率的跃升，UHBR 才敢把每 Lane 推到 20 Gbps。' },
              { t: 'callout', kind: 'info', title: '编码开销对比（每 8 数据位付出多少开销位）',
                v: '8b/10b：+25%（10 位传 8 位）；128b/132b：+3.125%（132 位传 128 位）。' +
                  '再加上 UHBR 每 Lane 速率本身的提升，4-Lane 总应用带宽从 HBR3 的 3240 MBps 跃到 UHBR20 的 9670 MBps。' }
            ]
          },
          {
            id: 'connectors',
            title: '连接器与线缆',
            titleEn: 'Connectors and Cables',
            blocks: [
              { t: 'p', v: 'DP 定义了标准全尺寸连接器（Standard DP）、迷你 DP（mDP），以及经 USB-C 的 **Alt Mode**。' +
                '盒对盒的可插拔线缆必须支持四 Lane，以最大化源与宿之间的互操作性。' },
              { t: 'list', items: [
                ['标准 DP / mDP', '原生 DP 连接器，引脚定义区分全尺寸与迷你两种，信号定义一致'],
                ['USB-C Alt Mode', '在 Type-C 上复用四对高速线承载 DP；是否进入由设备策略与 CC 协商'],
                ['有源/无源线缆', '长链路可借助 Re-driver、Re-timer（LTTPR 形态）维持信号质量']
              ] },
              { t: 'callout', kind: 'warn', title: 'DP 2.1 对齐 USB4 物理层',
                v: '2.1 把 UHBR 明确扩展到可插拔原生 DP 线缆、USB-C 转 DP 适配器线缆与 USB-C 线缆，并与 USB4 PHY 电气规范' +
                  '做扎实对齐。这意味着市售 USB-C 线缆上的 UHBR 能力，是以 2.1 的这步对齐为前提的。' }
            ]
          }
        ]
      },

      /* ======================================================== 04 信道编码与 FEC */
      {
        id: 'coding-fec',
        num: '04',
        title: '128b/132b 编码与 RS(198,194) 前向纠错',
        titleEn: '128b/132b Channel Coding and RS(198,194) FEC',
        lead: '128b/132b 不只是「把位压得更紧」——它把编码、加扰、控制指示与 FEC 串成一条发送侧流水线，' +
          '并在接收侧逆向恢复。搞懂这条流水线，就搞懂了 UHBR 为什么稳。',
        sections: [
          {
            id: 'pipeline',
            title: 'DPTX 发送侧处理顺序',
            titleEn: 'DPTX Transmit-Side Processing Order',
            blocks: [
              { t: 'fig', id: 'dpCoding', caption: '信道编码：128b/132b 把开销压到 3.125%，并内嵌 FEC' },
              { t: 'p', v: '规范给出 128b/132b 发送侧的操作顺序（按图索引）：① 主链路 Lane 数换算；② 超符号内位移；' +
                '③ 加扰；④ 插入 CDI（控制数据指示）；⑤ RS FEC 编码；⑥ RS 校验字节两路交织；⑦ 预编码。' +
                '接收侧则逆向执行：去预编码 → 校验字节两路解交织 → RS FEC 解码 → 解析 CDI → 去扰 → 超符号逆位移 → Lane 数还原。' },
              { t: 'callout', kind: 'key', title: 'CDI 是什么',
                v: 'Control Data Indicator 指示当前 132-bit 码块携带的是数据还是控制/PHY 同步符号。' +
                  '训练期间用 4 bit，训练完成后改为 1 bit；它与 12 个超符号、4 位填充一起组成 RS 数据块送入 FEC。' }
            ]
          },
          {
            id: 'scramble',
            title: '加扰与链路符号',
            titleEn: 'Scrambling and Link Symbols',
            blocks: [
              { t: 'p', v: '加扰用 23 阶 LFSR，多项式 **G(x)=x^23+x^21+x^16+x^8+x^5+x^2+1**，四 Lane 各有不同种子' +
                '（Lane0=1DBFBCh、Lane1=1DBFBDh、Lane2=1DBFBEh、Lane3=1DBFBFh）。' +
                '加扰前先完成 Lane 数换算与超符号内位移；去扰后再做逆位移，保证收发对称。' },
              { t: 'p', v: 'LT_SCRAMBLER_RESET 与 POST_LT_SCRAMBLER_RESET 这类 PHY 同步符号会旁路并重新初始化加扰 LFSR，' +
                '其后的第一个比特即「见到」种子值；PHY_SYNC_ONLY 则只推进 LFSR 而旁路加扰器。' }
            ]
          },
          {
            id: 'rs-fec',
            title: 'RS(198,194) 前向纠错',
            titleEn: 'RS(198,194) Forward Error Correction',
           blocks: [
              { t: 'p', v: '当 128b/132b 启用时，FEC 采用 **RS(198,194)**（8-bit 符号），每个 RS 数据块（194 个 RS 符号，' +
                '共 1552 位）可纠正最多 **2 个** RS 符号错误。RS 数据块由 12 个超符号、对应的 12 位 CDI 与 4 位填充组成。' },
              { t: 'callout', kind: 'info', title: '生成多项式与原始多项式',
                v: '生成多项式 G(x)=x^4 + 15·x^3 + 54·x^2 + 120·x + 64；原始多项式 P(x)=x^8 + x^4 + x^3 + x^2 + 1。' +
                  'DPTX 先把 12 个 1-bit CDI 中的若干位与 333h 异或做直流平衡，再把 4 位填充置为 0011b，然后送 RS FEC 编码；' +
                  '随后把奇偶字节两路交织到各 Lane。' },
              { t: 'p', v: '需要提醒的是：与 DSC 码流传输所用的 RS(254,250)（DP 1.4 为防视觉故障引入）不同，' +
                '128b/132b 链路层本身的 FEC 是 RS(198,194)。两者解决的是不同层面的可靠性问题。' }
            ]
          }
        ]
      },

      /* ======================================================== 05 链路训练 */
      {
        id: 'training',
        num: '05',
        title: '链路训练：从时钟恢复到均衡收敛',
        titleEn: 'Link Training: From Clock Recovery to Equalization',
        lead: '链路训练是「上电后让源与宿就速率、电压摆幅、均衡达成一致」的过程。' +
          '128b/132b 的训练用一套新的训练图案，并可通过 LTTPR 在全链或分段进行。',
        sections: [
          {
            id: 'phases',
            title: '训练的两个核心阶段',
            titleEn: 'Two Core Phases of Link Training',
            blocks: [
              { t: 'p', v: '无论编码方式，链路训练都围绕两个核心阶段：**CR（Clock Recovery，时钟恢复）** 与' +
                '**CE（Channel Equalization，通道均衡）**。源通过 AUX 与 DPRX 交换训练图案、协商速率与均衡参数，' +
                '训练完成后才进入稳定传输。' },
              { t: 'fig', id: 'dpTraining', caption: '128b/132b 链路训练：先用 TPS1 恢复时钟，再用 TPS2 做均衡' },
              { t: 'list', items: [
                ['CR（时钟恢复）', '128b/132b 用 128b132b_DP_TPS1（奈奎斯特图案），让接收端从码流中恢复时钟'],
                ['CE（通道均衡）', '128b/132b 用 128b132b_DP_TPS2（符号错误测量图案）做均衡；速率 >10 GHz 再加 TPS3/TPS4'],
                ['8b/10b 对照', '传统训练用 TPS1（D10.2 重复，不扰码）做 CR，再用 TPS2/TPS3/TPS4 做均衡']
              ] }
            ]
          },
          {
            id: 'lttpr-mode',
            title: 'LTTPR：透明模式与非透明模式',
            titleEn: 'LTTPR: Transparent and Non-Transparent Modes',
            blocks: [
              { t: 'p', v: '**LTTPR（Link Training Tunneable PHY Repeater，可调物理层中继器）** 是位于 Source 与 Sink 之间、' +
                '可配置为透明的物理层中继。它对全链训练的影响分两种模式：' },
              { t: 'list', items: [
                ['透明模式（Transparent）', '中继器对上下游如同不存在，训练一次贯穿整条链路，最简洁'],
                ['非透明模式（Non-transparent）', '每个链路段独立训练、逐级收敛，适合长链路与有源线缆']
              ] },
              { t: 'callout', kind: 'warn', title: '复位后回退 8b/10b',
                v: '发生上电复位或上游断开时，DPRX 会回退到 8b/10b 链路层；128b/132b 能力需要经 AUX 重新发现与配置，' +
                  '不能假设「上次协商过就一直有效」。' }
            ]
          },
          {
            id: 'fail',
            title: '训练失败的降级策略',
            titleEn: 'Degradation Strategy on Training Failure',
            blocks: [
              { t: 'p', v: '若在某档速率/均衡下无法收敛，源会**降一档速率**或减少 Lane 数重试——这是闭环鲁棒性的体现。' +
                '训练期间 HPD 中断与 DPCD 状态寄存器协同，让源能及时获知同步丢失等异常并采取纠正动作。' },
              { t: 'p', v: '因为链路速率与流速率解耦，DP 链路在流时序变化时仍可保持稳定活跃，不必每次重新训练，' +
                '这也间接降低了训练失败带来的可见故障概率。' }
            ]
          }
        ]
      },

      /* ======================================================== 06 SST 单流传输 */
      {
        id: 'sst',
        num: '06',
        title: 'SST 单流传输：像素打包、流时钟与 MSA',
        titleEn: 'SST: Pixel Packing, Stream Clock, and MSA',
        lead: 'SST 看似简单，却藏着 DP「速率与像素率解耦」的全部精妙：像素按固定规则散到各 Lane，' +
          '接收端再用 M/N 比值把流时钟重新算出来。',
        sections: [
          {
            id: 'mapping',
            title: '像素到 Lane 的映射',
            titleEn: 'Pixel-to-Lane Mapping',
            blocks: [
              { t: 'fig', id: 'dpSst', caption: 'SST：像素按 4-Lane 规则打包成 Transfer Unit，再映射进主链路各 Lane' },
              { t: 'p', v: '为使映射能适配不同 Lane 数，像素被打包并映射到 4-Lane 主链路上——像素编号按模 4 散到对应的 Lane：' +
                '像素 0,4,8…走 Lane 0；1,5,9…走 Lane 1；2,6,10…走 Lane 2；3,7,11…走 Lane 3。' +
                '这与像素位深、色度格式无关，是固定的「按 4 取模」规则。' },
              { t: 'callout', kind: 'info', title: '组件位深与像素格式',
                v: 'DP 支持 6/8/10/12/16 bpc，像素编码含 RGB、YCbCr 4:4:4/4:2:2/4:2:0 与 Y-only；' +
                  'RAW 格式则支持 6/7/8/10/12/14/16 bpp。设备可按应用带宽需要，支持最少数量的 Lane。' }
            ]
          },
          {
            id: 'stream-clock',
            title: '流时钟再生（M/N）',
            titleEn: 'Stream Clock Regeneration (M/N)',
            blocks: [
              { t: 'p', v: '接收端需要从主链路时钟恢复出音视频**流时钟**，靠的是 **M/N** 比值：N 是基准（主链路符号时钟与' +
                '流时钟基准的比例），M 是每 N 个主链路周期对应的流时钟周期数，由随流传输的 MSA 携带。' +
                '这样源与宿不必共享一条独立时钟线，却仍能精确再生流时钟。' },
              { t: 'p', v: '打包后的流数据率 ≤ 主链路符号率；不足时使用**填塞符号**补齐，不浪费 Lane。' +
                '流速率与链路符号率的这一步解耦，正是 DP 能「链路稳、流可变频」的底气。' }
            ]
          },
          {
            id: 'msa-sdp',
            title: 'MSA、SDP 与 VB-ID',
            titleEn: 'MSA, SDP, and VB-ID',
            blocks: [
              { t: 'p', v: '**MSA（Main Stream Attributes，主流属性）** 随流携带分辨率、时序、色深等元信息；' +
                '**SDP（Secondary Data Packet，辅助数据包）** 承载音频、信息帧、VSC 等附加数据；' +
                '**VB-ID（Video Blanking ID）** 携带消隐、视频有效、音频静音等状态位，随 MSA 一起在每个传输单元传送。' },
              { t: 'callout', kind: 'key', title: '主视频流与 SDP 的分工',
                v: '主视频流走 Transfer Unit 的「视频帧」通道；SDP 走独立的辅助包通道。' +
                  '两者共用同一条主链路，但逻辑上分离，便于音频/元数据与像素流并行不悖地传输。' }
            ]
          }
        ]
      },

      /* ======================================================== 07 MST 多流传输 */
      {
        id: 'mst',
        num: '07',
        title: 'MST 多流传输：拓扑、虚拟通道与时隙',
        titleEn: 'MST: Topology, Virtual Channels, and Time Slots',
        lead: 'MST 让一条主链路同时承载多路流。它的核心抽象是「虚拟通道」——源到宿的端到端直连，' +
          '底层可能跨多条链路，再由时隙分配把带宽切成可计量的份额。',
        sections: [
          {
            id: 'overview',
            title: '面向连接的传输与虚拟通道',
            titleEn: 'Connection-Oriented Transport and Virtual Channels',
            blocks: [
              { t: 'fig', id: 'dpMst', caption: 'MST：一条主链路承载多路流，按「虚拟通道 → VC Payload → 时隙」逐级映射' },
              { t: 'p', v: 'DP 等时传输服务是**面向连接**的：它管理从流源到流宿的流传输，独立于底层实际传输机制。' +
                '**虚拟通道（VC）** 是流源到流宿之间端到端、直接的虚拟连接；在底层，一个 VC 可能要跨越若干条链路（称作 Path）。' },
              { t: 'p', v: 'VC 在微包层面映射为一个称作 **VC Payload** 的载荷。当存在多个流源与多个流宿时，' +
                'VC 的「端到端直连」特性就格外明显：一台汇聚式分支设备可能为单路流源只承载一份载荷，' +
                '而扩展配置下则可能为两路流源各承载一份载荷。' }
            ]
          },
          {
            id: 'topology',
            title: '拓扑管理与分支设备',
            titleEn: 'Topology Management and Branch Devices',
            blocks: [
              { t: 'p', v: 'MST 拓扑由 **Topology Manager** 经 Sideband（边带）消息发现与维护。分支设备既可以是**汇聚器**' +
                '（把多路流装进同一个 VC Payload），也可以是**分路器**（把聚合流重新分发到下游多条链路）。' +
                '它对上游表现为一个 Sink，对下游表现为一个 Source。' },
              { t: 'callout', kind: 'key', title: '典型用法',
                v: '一台笔记本通过扩展坞，把内置屏与外接两台显示器用**同一条**主链路同时驱动——这是 MST 最常见、也最能体现价值' +
                  '的场景。环路处理（Loop Handling）规则确保这种复杂拓扑不会因意外回环而失控。' }
            ]
          },
          {
            id: 'pbn',
            title: 'PBN 与时隙分配',
            titleEn: 'PBN and Time-Slot Allocation',
            blocks: [
              { t: 'p', v: '每路流占用的带宽以 **PBN（Payload Bandwidth Number）** 计量，再换算成时隙（Time Slot）数。' +
                'VC Payload 分配到哪些时隙、如何随事件（如设备热插拔）同步更新，都由规范定义，并要求实现具备鲁棒性。' },
              { t: 'p', v: 'MST 与 SST 的差别只在外层：单流时主链路直接传 Transfer Unit；多流时改用 MTP 并做 VC 时隙分配。' +
                '底层 Lane 映射、加扰、FEC 等机制两者完全共享。' }
            ]
          }
        ]
      },

      /* ======================================================== 08 AUX 与 DPCD */
      {
        id: 'aux',
        num: '08',
        title: '辅助通道与 DPCD：发现、配置、状态',
        titleEn: 'AUX Channel and DPCD: Discovery, Configuration, Status',
        lead: 'AUX 不做视频传输，专管「发现 + 配置 + 状态」。它用半双工 Manchester-II 编码跑在 1 Mbps，' +
          '既承载 DPCD 寄存器访问，也经 I2C-over-AUX 读取 EDID/HDCP。',
        sections: [
          {
            id: 'physical',
            title: 'AUX 的物理与事务',
            titleEn: 'AUX Physical Layer and Transactions',
            blocks: [
              { t: 'fig', id: 'dpAux', caption: 'AUX：半双工 1 Mbps，承载 DPCD 访问与 I2C-over-AUX' },
              { t: 'p', v: 'AUX_CH 是一根交流耦合、双端终接的差分对，采用 Manchester-II 编码；源是主设备（Primary），宿是从设备' +
                '（Secondary）。在支持的最长线缆上仍提供 1 Mbps 速率，每次事务不超过 500 us、最大突发 16 字节，' +
                '以避免单一应用饿死其它应用。' },
              { t: 'list', items: [
                ['Native AUX 事务', '直接对 DPCD 做 1/2/4/8/16 字节的读写'],
                ['I2C-over-AUX', '把传统 I2C 事务映射到 AUX，用于读 EDID、做 HDCP 密钥交换'],
                ['仲裁', '链路层仲裁确保配置、状态、边带消息各得所需，互不长期阻塞']
              ] }
            ]
          },
          {
            id: 'dpcd',
            title: 'DPCD 寄存器空间',
            titleEn: 'DPCD Register Space',
            blocks: [
              { t: 'p', v: '**DPCD（DP Configuration Data）** 是宿端 DPRX 的寄存器库，相当于「链路与接收端能力的身份证」。' +
                '基础地址空间从 00000h 到 FFFFFh；扩展能力在 022000h 起；DP 隧道相关寄存器在 E0000h 起（如 E000Dh 的能力位、' +
                'E0020h 的 USB4 驱动支持位、E0030h 的带宽分配控制位）。' },
              { t: 'callout', kind: 'info', title: 'DPCD 与 EDID 的分工',
                v: 'EDID/DisplayID 描述「显示本身」的能力（分辨率、时序、色彩）；DPCD 描述「接收端 DPRX 与链路」的能力' +
                  '（链路速率、Lane 数、编码方式、DSC/Adaptive-Sync/Panel Replay 能力位）。两者经 AUX 协同完成设备枚举。' }
            ]
          },
          {
            id: 'link-config',
            title: '链路配置与闭环管理',
            titleEn: 'Link Configuration and Closed-Loop Management',
            blocks: [
              { t: 'p', v: 'HPD 事件触发后，源通过 AUX 链路训练来配置链路：在正确的 Lane 数、正确的速率、正确的驱动电流与均衡等级下使能链路。' +
                '训练完成后，宿若发现同步丢失等状态变化，会翻转 HPD 作中断请求，源随即用 AUX 查询 DPCD 状态寄存器并纠正。' +
                '这种闭环让源与宿的鲁棒性与互操作性显著提升。' }
            ]
          }
        ]
      },

      /* ======================================================== 09 带宽、模式与 DSC */
      {
        id: 'bandwidth',
        num: '09',
        title: '带宽、模式与 DSC 强制要求',
        titleEn: 'Bandwidth, Modes, and the DSC Mandate',
        lead: 'UHBR 让高分辨率更从容，但 128b/132b 设备原则上必须支持 DSC。理解这条「带宽—压缩」的权衡，' +
          '才能明白为什么 8K 在 DP 上要谈压缩。',
        sections: [
          {
            id: 'budget',
            title: '带宽预算与格式权衡',
            titleEn: 'Bandwidth Budget and Format Trade-offs',
            blocks: [
              { t: 'fig', id: 'dpBandwidth', caption: '带宽预算：UHBR 让高分辨率更从容，但 128b/132b 设备原则上必须支持 DSC' },
              { t: 'p', v: '4-Lane 总应用带宽：RBR 648、HBR 1080、HBR2 2160、HBR3 3240、UHBR20 9670 MBps。' +
                '带宽、Lane 数、像素格式、色深、帧率之间可**自由权衡**——这正是 DP 链路「速率与像素率解耦」的红利：' +
                '同一带宽可以换更高分辨率、也可以换更高色深或更高帧率。' },
              { t: 'callout', kind: 'info', title: '8K 与 DSC 的关系',
                v: 'UHBR20 + DSC 才能稳妥驱动 8K60 10bpc RGB 这类「重」格式；不压缩时，满带宽也仅供更保守的格式。' +
                  'DSC 已在另一篇长文中专门解析，本篇只把它作为「128b/132b 的能力前提」来谈。' }
            ]
          },
          {
            id: 'dsc-mandate',
            title: '128b/132b 设备的 DSC 强制条款',
            titleEn: 'DSC Mandate for 128b/132b Devices',
            blocks: [
              { t: 'p', v: '规范规定：所有支持 128b/132b 的 Source / Sink / Branch 设备**都必须支持 DSC 码流传输**（无论链路层是 8b/10b 还是 128b/132b）。' +
                '豁免情形有限：' },
              { t: 'list', items: [
                ['单流 Source/Sink 免编码器/解码器', '当带宽受限：2/4-Lane ≤ 19.29 Gbps、1-Lane ≤ 9.65 Gbps（均按 24-bpp 像素流计）'],
                ['安全法规禁止压缩的场景', 'DSC 必须关闭（软开关或硬件熔丝均可，由用法/实现决定）'],
                ['分支设备', '仅当单 DFP、或双 DFP 其中之一是 VGA DFP 时可免解码器']
              ] },
              { t: 'callout', kind: 'key', title: 'Source 的 DSC 资源下限',
                v: '具备多流能力且支持 128b/132b 的 Source，其 DSC 编码资源须保证每路流至少 **3840×2160@60（594 MP/s）**。' +
                  '换句话说，多流 + 128b/132b 的 Source 必须能同时压缩多路 4K60 量级的流。' }
            ]
          },
          {
            id: 'cable-cert',
            title: 'UHBR 线缆认证：DP 2.1 的「新规矩」',
            titleEn: 'UHBR Cable Certification: DP 2.1 Rule',
            blocks: [
              { t: 'p', v: 'DP 2.0 把 UHBR 速率带了进来，但当时对「可插拔 / USB-C 线缆」能否跑满 UHBR 语焉不详。' +
                '**DP 2.1 的一个重要修订，就是把 UHBR 明确开放到可插拔线缆与 USB-C 连接，并顺势推出了线缆认证标识**。' +
                '原因是 UHBR10/13.5/20 的奈奎斯特频率远高于 HBR3，被动线缆的回波损耗（return loss）必须被严格管控，否则误码率会失控。' },
              { t: 'list', items: [
                ['DP40 认证线缆', '保证在 4 对差分线上稳定支持到 UHBR10（10 Gbps/通道）；也可承载 2 通道的 UHBR13.5'],
                ['DP80 认证线缆', '保证 4 通道稳定支持到 UHBR20（20 Gbps/通道），是 8K 级高带宽玩法的门槛'],
                ['未认证的老线缆', '即便物理接口是 DP，也只建议跑到 HBR3 及以下；强行 UHBR 不保证链路可靠性']
              ] },
              { t: 'callout', kind: 'warn', title: '认证是「信号完整性」的承诺，不是物理形状',
                v: '同样的 USB-C 或 DP 插头，有没有 DP40/DP80 认证，决定了它能否扛住 UHBR 的高频信号。' +
                  '规范把「认证线缆 + 高频裕量」写进了链路余量预算，正是 DP 2.1 相对 2.0 在「可落地性」上的关键补课。' }
            ]
          }
        ]
      },

      /* ======================================================== 10 自适应同步与面板回放 */
      {
        id: 'adaptive',
        num: '10',
        title: 'Adaptive-Sync、Panel Replay 与省电特性',
        titleEn: 'Adaptive-Sync, Panel Replay, and Power Features',
        lead: 'DP 2.1 强化的两块特性都与「省电 + 低延迟」相关：Adaptive-Sync 让帧节奏跟随内容，' +
          'Panel Replay 让活动帧留在屏端、主链路可关。两者可叠加运行。',
        sections: [
          {
            id: 'as-intro',
            title: 'Adaptive-Sync：FAVT 与 AVT',
            titleEn: 'Adaptive-Sync: FAVT and AVT',
            blocks: [
              { t: 'p', v: '**Adaptive-Sync** 是 DP 2.1 新增的、在源到宿实时传帧期间可选使用的可变刷新机制。它有两种模式：' },
              { t: 'list', items: [
                ['FAVT（Fixed-Average VTotal）', '面向媒体播放：在基准时序的 VTotal 上叠加并逐帧抖动，使平均源帧率精确匹配内容帧率，避免掉帧/重帧'],
                ['AVT（Adaptive VTotal）', '面向游戏等帧呈现时间不可预测的场景：逐帧编程帧时长，范围在基准时序的最小/最大 VTotal 之间']
              ] },
              { t: 'callout', kind: 'info', title: '抖动指标',
                v: 'VESA AdaptiveSync 要求：稳态下源在 3333 帧内把目标刷新率（TRR）的累积抖动控制在 ±3.6 ppm，' +
                  '且帧间抖动 ≤ 0.5 ms。Sink 需用 RB v3 时序或 DisplayID 详细时序把基准像素率设得比目标帧率高 350 ppm 以上，' +
                  '给源留出 FAVT 下调空间。' }
            ]
          },
          {
            id: 'panel-replay',
            title: 'Panel Replay：类 PSR 的省电',
            titleEn: 'Panel Replay: PSR-like Power Saving',
            blocks: [
              { t: 'p', v: '**Panel Replay（PR）** 类似 eDP 的 PSR，用于系统级省电：源用一条 VSC SDP 提示进入/退出 PR 活跃态；' +
                '进入时源提示宿把活动视频帧捕获进 **Remote Frame Buffer（RFB）**，之后由屏端连续刷新显示。' +
                'PR 活跃期间，主链路乃至其它源功能可关闭以省电。' },
              { t: 'fig', id: 'dpFeatures', caption: 'DP 2.1 特性族：Adaptive-Sync、Panel Replay 与 DP Tunneling' },
              { t: 'callout', kind: 'key', title: 'Main-Link 活动选项',
                v: '规范列了三类选项：1-A 源持续发视频时序（被宿丢弃）、1-B 源发 Idle Pattern、1-C 源关闭主链路信号。' +
                  'DP 用法强制支持 1-A、禁止 1-B/1-C；支持 1-C 可选，且若支持则须用 AUX-less ALPM 作链路管理机制。' }
            ]
          },
          {
            id: 'alpm',
            title: 'AUX-less ALPM：关掉 AUX 也能管理链路',
            titleEn: 'AUX-less ALPM: Managing the Link Without AUX',
            blocks: [
              { t: 'p', v: '**AUX-less ALPM（Auxiliary-less Active Low-Power Mode，无 AUX 的主动低功耗模式）** 是 2.1 引入的省电增强，' +
                '可配合 Panel Replay 与 Adaptive-Sync 运行。它的意义在于：当主链路关闭、AUX 也不再活跃时，' +
                '仍能以更轻量的方式维持链路管理，从而把「屏端自刷新 + 主链路断电」的省电组合落到实处。' }
            ]
          }
        ]
      },

      /* ======================================================== 11 DP 隧道与 Type-C */
      {
        id: 'tunneling',
        num: '11',
        title: 'DP 隧道与 Type-C Alt Mode',
        titleEn: 'DP Tunneling over USB4 and Type-C Alt Mode',
        lead: 'DP 不只能跑在原生线缆上——它还能「隧道化」地借 USB4/雷雳等底层传输，也能在 Type-C 上以 Alt Mode 复用高速线。' +
          '2.1 进一步给了这套隧道更细的带宽分配粒度。',
        sections: [
          {
            id: 'concept',
            title: 'DP 隧道的结构',
            titleEn: 'Structure of DP Tunneling',
            blocks: [
              { t: 'p', v: '**DP Tunneling** 自 DP 1.4a 引入，使 DP 能被隧道化地承载在另一传输协议（如 Thunderbolt）之上。' +
                '典型路径：DP 源输出的 DP 流，作为 DP IN 适配器（位于上游隧道桥设备内，并带有 DPCD）的输入；' +
                '经隧道协议包化后传送到下游隧道桥的 DP OUT 适配器，后者解包还原出 DP 流，再交给 DP 宿/分支（或 DP 源连接器）。' },
              { t: 'callout', kind: 'info', title: 'LTTPR 模式下的隧道',
                v: '在某些实现中，下游隧道桥可运行在 LTTPR 模式：当系统与 DPRX 直连时，桥设备直接再生 DP 流。' +
                  '这把「链路训练」与「隧道封装」两件事实质上解耦，便于长链路与混合拓扑。' }
            ]
          },
          {
            id: 'bandwidth-alloc',
            title: '带宽动态分配（DP 2.1 新增）',
            titleEn: 'Dynamic Bandwidth Allocation (New in DP 2.1)',
            blocks: [
              { t: 'p', v: '**DP Tunneling Bandwidth Allocation** 是 2.1 新增的可选特性：DP 显示驱动与 USB4 驱动以**远细于 Lane 数/速率**的粒度，' +
                '动态申请与释放经 USB4 传输的 DP 隧道流带宽。' },
              { t: 'list', items: [
                ['发现', 'DP IN 适配器的 DP_TUNNELING_CAPABILITIES（E000Dh[7]）与 USB4 驱动的 USB4_DRIVER_BW_CAPABILITY（E0020h[7]）均置 1'],
                ['激活', '显示驱动置 DPTX_BW_ALLOCATION_MODE_CONTROL（E0030h[7]）=1'],
                ['计量', '读 ESTIMATED_BW（E0023h）与 DP_BW_GRANULARITY（E0022h[1:0]）作为可申请带宽上界']
              ] },
              { t: 'callout', kind: 'key', title: '未启用分配模式时',
                v: '若关闭带宽分配模式，带宽就受 MAX_LINK_RATE / MAX_LANE_COUNT（00001h/00002h 或扩展 02201h/02202h）约束；' +
                  '若适配器要改这些寄存器，需先制造 Hot Unplug、改写、再制造 Hot Plug。' }
            ]
          },
          {
            id: 'altmode',
            title: 'Type-C Alt Mode',
            titleEn: 'Type-C Alt Mode',
            blocks: [
              { t: 'p', v: '在 USB-C 接口上，DP 以 **Alt Mode** 形式复用四对高速线。是否进入 Alt Mode、以几 Lane 进入，' +
                '由设备策略与 CC 线协商决定。这也是今天笔记本「一个 C 口既能传数据、又能接显示器」的物理基础——' +
                '底层正是 DP 隧道 + Alt Mode 的协作。' }
            ]
          }
        ]
      },

      /* ======================================================== 12 速查与回顾 */
      {
        id: 'cheat',
        num: '12',
        title: '速查与回顾',
        titleEn: 'Cheat Sheet and Review',
        lead: '把前文拆开的关键数字与决策点收拢成一张速查表，方便回头对照；术语速查则把最容易混的缩写一次性理清。',
        sections: [
          {
            id: 'rate-table',
            title: '链路速率速查',
            titleEn: 'Link Rate Quick Reference',
            blocks: [
              { t: 'table', head: ['编码', '速率（Gbps/lane）', '4-Lane 应用带宽（MBps）', '备注'], rows: [
                ['8b/10b', '1.62 / 2.7 / 5.4 / 8.1', '648 / 1080 / 2160 / 3240', 'RBR / HBR / HBR2 / HBR3'],
                ['128b/132b', '10 / 13.5 / 20', '4836 / 6525 / 9670', 'UHBR10 / UHBR13.5 / UHBR20']
              ] },
              { t: 'p', v: '128b/132b 的 10 Gbps/lane 为强制项，13.5 与 20 为可选项；所有被使能 Lane 速率一致。' }
            ]
          },
          {
            id: 'feature-matrix',
            title: '特性决策矩阵',
            titleEn: 'Feature Decision Matrix',
            blocks: [
              { t: 'table', head: ['特性', '始于版本', '一句话作用'], rows: [
                ['128b/132b + UHBR', 'DP 2.0 / 2.1', '编码开销 3.125%，支撑 20 Gbps/lane 与 3 倍带宽'],
                ['RS(198,194) FEC', 'DP 2.0', '128b/132b 链路层每数据块纠 2 符号错'],
                ['Panel Replay', 'DP 2.0', '活动帧存 RFB，主链路可关以省电'],
                ['DSC 强制', 'DP 2.0', '128b/132b 设备须支持 DSC 码流传输'],
                ['Adaptive-Sync', 'DP 2.1', 'FAVT/AVT 两种可变刷新模式'],
                ['AUX-less ALPM', 'DP 2.1', '无 AUX 也能管链路，配合 PR'],
                ['DP Tunneling BW Alloc', 'DP 2.1', '隧道带宽以细粒度动态分配'],
                ['USB4 PHY 对齐', 'DP 2.1', 'UHBR 扩展到可插拔 DP/USB-C 线缆']
              ] },
              { t: 'callout', kind: 'warn', title: '别把两个 RS 码混为一谈',
                v: 'DP 1.4 为防 DSC 视觉故障引入的是 RS(254,250)；128b/132b 链路层本身的 FEC 是 RS(198,194)。' +
                  '两者解决不同层面的可靠性，术语上要分开。' }
            ]
          },
          {
            id: 'terms',
            title: '术语速查',
            titleEn: 'Glossary Quick Reference',
            blocks: [
              { t: 'dl', items: [
                ['UHBR', 'Ultra High Bit Rate，128b/132b 下的 10/13.5/20 Gbps/lane 三档速率'],
                ['MST / SST', '多流 / 单流传输；差在是否一条链路传多路流'],
                ['PBN', 'Payload Bandwidth Number，MST 计量每路流带宽的单位'],
                ['DPCD', 'Sink 端寄存器库，经 AUX 访问，枚举链路与设备能力'],
                ['LTTPR', 'Link Training Tunneable PHY Repeater，物理层中继，支持透明/非透明训练'],
                ['CDI', 'Control Data Indicator，标识 132-bit 码块是数据还是控制/同步符号']
              ] },
              { t: 'p', v: '更多中英对照见本篇末尾的术语表；与 DSC、HDMI 两篇共享同一套「英文—中文—说明」结构的术语清单。' }
            ]
          }
        ]
      },

      /* ======================================================== 13 想读规范原文的话 */
      {
        id: 'reading',
        num: '13',
        title: '想读规范原文的话',
        titleEn: 'Reading the Original Spec',
        lead: '如果本篇只勾起了你的胃口，下面给出一份按规范章节的「导读地图」，并再一次明确取材边界。',
        sections: [
          {
            id: 'sections-guide',
            title: '章节导读',
            titleEn: 'Chapter Guide',
            blocks: [
              { t: 'list', items: [
                ['Section 1 引言', 'Overview：主链路/AUX/HPD 分工、分层架构、速率表 Table 1-7'],
                ['Section 2 链路层', 'SST/MST 流传输、AUX 事务与 DPCD、Adaptive-Sync、Panel Replay、DSC 传输'],
                ['Section 3 PHY 层', '8b/10b 与 128b/132b 编码、加扰、RS FEC、链路训练、连接器电气'],
                ['Section 4 机械规范', '标准/mDP 连接器引脚、可插拔与嵌入式线缆、LTTPR 有源线缆'],
                ['Section 5 设备策略', 'Source/Sink/Branch 互操作要求、DP Tunneling、USB4 带宽分配']
              ] },
              { t: 'callout', kind: 'info', title: '数值以规范原件为准',
                v: '本篇复述的机制与参数含义以 VESA DisplayPort Standard 2.1 正文为依据；所有数字与约束请以来源规范原件与 DP CTS 为最终依据。' }
            ]
          },
          {
            id: 'scope-note',
            title: '取材边界与版权',
            titleEn: 'Editorial Boundaries and Copyright',
            blocks: [
              { t: 'p', v: '再次说明：本页是面向中文读者的**学习性原理整理**，不是规范译文，也没有转载规范的表格与插图；' +
                '所有示意图均按规范描述的机理重绘（纯内联 SVG，不请求任何外部资源）。' },
              { t: 'p', v: 'DisplayPort 标准原文版权归 **VESA** 所有；商业使用需遵循 VESA 的会员与采纳条款。' +
                '本页只复述机制与参数含义，落地产品请以规范原文、DP CTS 与对应合规测试为最终依据。' }
            ]
          },
          {
            id: 'version-history',
            title: '版本演进：DP 2.1 处在什么位置',
            titleEn: 'Version Evolution: Where DP 2.1 Fits',
            blocks: [
              { t: 'p', v: '把本篇的机制放回时间轴，能更清楚地看到 2.1 在「补可落地性」而非「加新速率」：' },
              { t: 'table', head: ['版本', '关键里程碑', '与本篇的关系'],
                rows: [
                  ['DP 1.1a → 1.2', '外部显示接口成形，引入 MST', '本篇的 MST 框架自此奠基'],
                  ['DP 1.3', 'HBR3（8.1 Gbps/通道）', '8b/10b 速率上限见 §带宽预算'],
                  ['DP 1.4', 'DSC、32 路音频、HDR', 'DSC 强制条款的前身'],
                  ['DP 2.0', '128b/132b、UHBR、Panel Replay', '本篇的编码/训练/回放主体'],
                  ['DP 2.1', 'UHBR 开放到可插拔/USB-C、线缆认证、USB4 带宽分配', '本篇 §带宽线缆认证、§隧道化']
                ] },
              { t: 'callout', kind: 'info', title: '2.1 更像「勘误 + 落地」版本',
                v: 'DP 2.1 没有引入新的链路速率，而是把 2.0 留下的「可插拔线缆能否跑 UHBR、USB4 隧道带宽怎么分」等落地问题补齐并冻结。' +
                  '因此读 2.1 时，应把它和 2.0 的链路/PHY 章节对照着看。' }
            ]
          }
        ]
      }
    ]
  });
})(typeof window !== 'undefined' ? window : globalThis);
