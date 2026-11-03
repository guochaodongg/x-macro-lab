/* =============================================================================
 * edp-data.js — Technology Blog 第七篇文章：嵌入式 DisplayPort（eDP）Standard v1.5a 技术解析
 *              （纯数据，无逻辑、不碰 DOM）
 *
 * 数据来源：VESA Embedded DisplayPort (eDP) Standard Version 1.5a（VESA，2023-02-27，447 页）
 *           基于 VESA DisplayPort Standard Version 2.1；规范发布页：https://www.vesa.org/
 *
 * 本文件按「新增文章只需往 BLOGData.posts 里加一条」的约定，在 adaptive-sync-cts-data.js
 * 之后加载，把文章对象 push 进 BLOGData.posts，并把本篇专用的内联 SVG 注册进
 * BLOGData.figures。正文块结构与 blog-data.js 完全一致（见该文件头部说明）。
 *
 * 版权说明：本篇是面向中文读者的**学习性原理整理**，非规范官方译文，也不转载
 * 规范原文的表格与插图；所有示意图均按规范描述的机理重绘（纯内联 SVG，
 * 不请求任何外部资源）。规范原文以 VESA 发布的 eDP Standard v1.5a 为准，
 * 商业使用需遵循 VESA 的会员与采纳条款。
 * ========================================================================== */
(function (window) {
  'use strict';

  var D = window.BLOGData;
  if (!D || !D.posts || !D.figures) return;

  /* ------------------------------------------------------------- 示意图 SVG */
  /* 全部内联绘制，颜色走 CSS 变量，因此自动跟随明/暗主题，且不请求任何外部资源。 */
  var FIGURES = {

    /* 典型 eDP 系统：GPU/SoC 源 → 主链路/AUX/HPD/背光 → 面板 TCON 宿（含 RFB） */
    edpSystem:
      '<svg class="bl-fig-svg" viewBox="0 0 640 286" role="img" aria-label="典型 eDP 系统：源在 GPU、宿在面板 TCON，AUX 兼管背光与 EDID">' +
      '<rect x="0" y="0" width="640" height="286" fill="var(--surface-2)"/>' +
      '<text x="16" y="26" fill="var(--text-soft)" font-size="12" font-weight="600">典型 eDP 系统：源集成在 GPU，宿集成在面板 TCON；AUX 兼管 EDID/DisplayID 与背光</text>' +
      /* 源 */
      '<rect x="10" y="44" width="178" height="180" rx="10" fill="none" stroke="var(--border-strong)" stroke-dasharray="5 4"/>' +
      '<text x="24" y="64" fill="var(--text-dim)" font-size="11">源 Source（笔记本 GPU / SoC）</text>' +
      '<rect x="26" y="76" width="146" height="34" rx="7" fill="var(--surface)" stroke="var(--accent)"/>' +
      '<text x="99" y="98" fill="var(--accent)" font-size="11" text-anchor="middle">eDPTX（主链路发送）</text>' +
      '<rect x="26" y="120" width="146" height="30" rx="7" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="99" y="140" fill="var(--text-soft)" font-size="10.5" text-anchor="middle">AUX 主设备（读 DPCD / EDID）</text>' +
      '<rect x="26" y="158" width="146" height="26" rx="7" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="99" y="176" fill="var(--text-soft)" font-size="10.5" text-anchor="middle">HPD 热插拔检测</text>' +
      '<rect x="26" y="190" width="146" height="26" rx="7" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="99" y="208" fill="var(--text-soft)" font-size="10.5" text-anchor="middle">背光控制（AUX / 专用线）</text>' +
      /* 宿 */
      '<rect x="452" y="44" width="178" height="180" rx="10" fill="none" stroke="var(--border-strong)" stroke-dasharray="5 4"/>' +
      '<text x="466" y="64" fill="var(--text-dim)" font-size="11">宿 Sink（嵌入式面板 TCON）</text>' +
      '<rect x="468" y="76" width="146" height="34" rx="7" fill="var(--surface)" stroke="var(--accent)"/>' +
      '<text x="541" y="98" fill="var(--accent)" font-size="11" text-anchor="middle">eDPRX（主链路接收）</text>' +
      '<rect x="468" y="120" width="146" height="30" rx="7" fill="var(--surface)" stroke="var(--teal)"/>' +
      '<text x="541" y="140" fill="var(--teal)" font-size="10.5" text-anchor="middle">Remote Frame Buffer（PSR/PR）</text>' +
      '<rect x="468" y="158" width="146" height="26" rx="7" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="541" y="176" fill="var(--text-soft)" font-size="10.5" text-anchor="middle">AUX 从设备（DPCD）</text>' +
      '<rect x="468" y="190" width="146" height="26" rx="7" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="541" y="208" fill="var(--text-soft)" font-size="10.5" text-anchor="middle">EPROM + DisplayID/EDID</text>' +
      /* 线缆 */
      '<rect x="200" y="52" width="240" height="164" rx="8" fill="var(--surface)" stroke="var(--teal)"/>' +
      '<text x="320" y="72" fill="var(--teal)" font-size="11.5" font-weight="600" text-anchor="middle">eDP 互连（20/30/40 针连接器）</text>' +
      '<line x1="212" y1="90" x2="428" y2="90" stroke="var(--accent)" stroke-width="2.6"/>' +
      '<text x="320" y="106" fill="var(--accent)" font-size="10" text-anchor="middle">Main-Link：1/2/4 对差分线（RBR~HBR3）</text>' +
      '<line x1="212" y1="120" x2="428" y2="120" stroke="var(--border-strong)" stroke-width="1.6"/>' +
      '<text x="320" y="135" fill="var(--text-dim)" font-size="10" text-anchor="middle">AUX_CH：1 对差分线（读 DPCD、I2C-over-AUX）</text>' +
      '<line x1="212" y1="144" x2="428" y2="144" stroke="var(--border-strong)" stroke-width="1.6"/>' +
      '<text x="320" y="159" fill="var(--text-dim)" font-size="10" text-anchor="middle">HPD：宿向源报告在位 / 中断请求</text>' +
      '<line x1="212" y1="168" x2="428" y2="168" stroke="var(--border-strong)" stroke-width="1.6"/>' +
      '<text x="320" y="183" fill="var(--text-dim)" font-size="10" text-anchor="middle">背光控制也可走 AUX（区域背光）</text>' +
      '<polygon points="438,97 446,101 438,105" fill="var(--accent)"/>' +
      '<polygon points="198,128 190,132 198,136" fill="var(--border-strong)"/>' +
      '<text x="16" y="248" fill="var(--text-soft)" font-size="11">eDP 仅用 SST（单流传输）拓扑；MST 不在本规范范围。笔记本里 Source 通常在显卡、Sink 在面板 TCON。</text>' +
      '<text x="16" y="268" fill="var(--text-dim)" font-size="11">系统厂商自选连接器与线长，再据信号完整性 / EMI / 空间 / 成本折中选择通道数与速率。</text>' +
      '</svg>',

    /* eDP 与标准 DP 的关键差异（提炼自 Table 2-1） */
    edpVsDp:
      '<svg class="bl-fig-svg" viewBox="0 0 640 300" role="img" aria-label="eDP 与标准 DP 的关键差异对照">' +
      '<rect x="0" y="0" width="640" height="300" fill="var(--surface-2)"/>' +
      '<text x="16" y="26" fill="var(--text-soft)" font-size="12" font-weight="600">eDP 与标准 DP 的关键差异（提炼自 Table 2-1）：eDP 为嵌入式内屏而生</text>' +
      '<rect x="14" y="42" width="300" height="40" rx="8" fill="var(--surface)" stroke="var(--accent)"/>' +
      '<text x="164" y="67" fill="var(--accent)" font-size="12" font-weight="600" text-anchor="middle">标准 DisplayPort（外部互连）</text>' +
      '<rect x="326" y="42" width="300" height="40" rx="8" fill="var(--surface)" stroke="var(--teal)"/>' +
      '<text x="476" y="67" fill="var(--teal)" font-size="12" font-weight="600" text-anchor="middle">eDP（嵌入式面板接口）</text>' +
      /* 行 */
      '<text x="20" y="104" fill="var(--text-soft)" font-size="11">定位</text>' +
      '<text x="332" y="104" fill="var(--text-soft)" font-size="11">PC/一体机内屏，笔记本屏接</text>' +
      '<text x="20" y="128" fill="var(--text-soft)" font-size="11">互操作</text>' +
      '<text x="332" y="128" fill="var(--text-soft)" font-size="11">不强制全互操作（厂商自选源/宿）</text>' +
      '<text x="20" y="152" fill="var(--text-soft)" font-size="11">省电特性</text>' +
      '<text x="332" y="152" fill="var(--text-soft)" font-size="11">PSR/PR/ALPM 等省电族是 eDP 重点</text>' +
      '<text x="20" y="176" fill="var(--text-soft)" font-size="11">认证</text>' +
      '<text x="332" y="176" fill="var(--text-soft)" font-size="11">无 VESA 合规认证（定义强制/可选）</text>' +
      '<text x="20" y="200" fill="var(--text-soft)" font-size="11">背光</text>' +
      '<text x="332" y="200" fill="var(--text-soft)" font-size="11">AUX 即可控背光（含区域背光）</text>' +
      '<text x="20" y="224" fill="var(--text-soft)" font-size="11">链路训练</text>' +
      '<text x="332" y="224" fill="var(--text-soft)" font-size="11">Sink 必须支持免 AUX 快速训练</text>' +
      '<text x="20" y="248" fill="var(--text-soft)" font-size="11">128b/132b</text>' +
      '<text x="332" y="248" fill="var(--text-soft)" font-size="11">高于 HBR3 的 128b/132b 不在范围</text>' +
      '<text x="20" y="272" fill="var(--text-soft)" font-size="11">ASSR</text>' +
      '<text x="332" y="272" fill="var(--text-soft)" font-size="11">改 8b/10b 加扰种子，使 eDP 与 DP 不兼容</text>' +
      '<line x1="316" y1="42" x2="316" y2="280" stroke="var(--border-strong)" stroke-width="1.4" stroke-dasharray="3 3"/>' +
      '</svg>',

    /* MSO 拓扑：2×1 / 2×2 / 4×1 / 分段面板 */
    msoTopo:
      '<svg class="bl-fig-svg" viewBox="0 0 640 300" role="img" aria-label="MSO 多 SST 拓扑：2×1、2×2、4×1 与分段面板">' +
      '<rect x="0" y="0" width="640" height="300" fill="var(--surface-2)"/>' +
      '<text x="16" y="26" fill="var(--text-soft)" font-size="12" font-weight="600">Multi-SST Operation：一条主链路被拆成多条并行 SST，喂给分段面板</text>' +
      /* 2x1 */
      '<rect x="14" y="44" width="296" height="56" rx="8" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="24" y="63" fill="var(--text-dim)" font-size="11">2 × 1：两条 SST，各 1 对线</text>' +
      '<rect x="24" y="70" width="276" height="20" rx="4" fill="var(--surface-2)"/>' +
      '<text x="162" y="84" fill="var(--teal)" font-size="10" text-anchor="middle">[SST-1 · 1 lane]  [SST-2 · 1 lane]</text>' +
      /* 2x2 */
      '<rect x="330" y="44" width="296" height="56" rx="8" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="340" y="63" fill="var(--text-dim)" font-size="11">2 × 2：两条 SST，各 2 对线</text>' +
      '<rect x="340" y="70" width="276" height="20" rx="4" fill="var(--surface-2)"/>' +
      '<text x="478" y="84" fill="var(--teal)" font-size="10" text-anchor="middle">[SST-1 · 2 lane]  [SST-2 · 2 lane]</text>' +
      /* 4x1 */
      '<rect x="14" y="112" width="296" height="56" rx="8" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="24" y="131" fill="var(--text-dim)" font-size="11">4 × 1：四条 SST，各 1 对线</text>' +
      '<rect x="24" y="138" width="276" height="20" rx="4" fill="var(--surface-2)"/>' +
      '<text x="162" y="152" fill="var(--teal)" font-size="10" text-anchor="middle">4 条并行 SST，各 1 lane</text>' +
      /* 分段面板 */
      '<rect x="330" y="112" width="296" height="56" rx="8" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="340" y="131" fill="var(--text-dim)" font-size="11">分段面板：各段由一条 SST 驱动</text>' +
      '<rect x="340" y="138" width="276" height="20" rx="4" fill="var(--surface-2)"/>' +
      '<text x="478" y="152" fill="var(--teal)" font-size="10" text-anchor="middle">Segment A · B · C · D</text>' +
      /* 说明 */
      '<rect x="14" y="184" width="612" height="92" rx="8" fill="var(--surface)" stroke="var(--accent)"/>' +
      '<text x="28" y="208" fill="var(--accent)" font-size="11" font-weight="600">MSO 把「一条宽主链路」换成「多条窄 SST」</text>' +
      '<text x="28" y="230" fill="var(--text-soft)" font-size="10.5">· 源用替代通道分配协议，为 Segmented Panel Sink 启用多条并行 SST 链路</text>' +
      '<text x="28" y="250" fill="var(--text-soft)" font-size="10.5">· 相邻面板段之间允许像素重叠（Overlap），避免段边界拼缝</text>' +
      '<text x="28" y="270" fill="var(--text-soft)" font-size="10.5">· 源/宿各自有 Main-Link 配置时序要求，Sink 用 CRC 寄存器核对各段完整性</text>' +
      '</svg>',

    /* PSR 状态机：Live → Active(SELF_REFRESH) → Exit，主链路可关 */
    psrStates:
      '<svg class="bl-fig-svg" viewBox="0 0 640 240" role="img" aria-label="PSR 状态机：活动帧模式、自刷新、退出">' +
      '<rect x="0" y="0" width="640" height="240" fill="var(--surface-2)"/>' +
      '<text x="16" y="26" fill="var(--text-soft)" font-size="12" font-weight="600">PSR 省电核心：进入自刷新后主链路可断电，画面由 Sink 的 RFB 自维持</text>' +
      '<rect x="20" y="60" width="150" height="58" rx="10" fill="var(--surface)" stroke="var(--accent)"/>' +
      '<text x="95" y="86" fill="var(--accent)" font-size="12" font-weight="600" text-anchor="middle">Live Frame</text>' +
      '<text x="95" y="104" fill="var(--text-dim)" font-size="10" text-anchor="middle">主链路正常传流</text>' +
      '<rect x="245" y="60" width="150" height="58" rx="10" fill="var(--surface)" stroke="var(--teal)"/>' +
      '<text x="320" y="86" fill="var(--teal)" font-size="12" font-weight="600" text-anchor="middle">PSR Active</text>' +
      '<text x="320" y="104" fill="var(--text-dim)" font-size="10" text-anchor="middle">SELF_REFRESH，主链路可关</text>' +
      '<rect x="470" y="60" width="150" height="58" rx="10" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="545" y="86" fill="var(--text-soft)" font-size="12" font-weight="600" text-anchor="middle">Exit</text>' +
      '<text x="545" y="104" fill="var(--text-dim)" font-size="10" text-anchor="middle">帧时序再同步后回 Live</text>' +
      '<line x1="170" y1="89" x2="243" y2="89" stroke="var(--border-strong)" stroke-width="2"/>' +
      '<polygon points="243,89 233,84 233,94" fill="var(--border-strong)"/>' +
      '<text x="200" y="80" fill="var(--text-dim)" font-size="10" text-anchor="middle">Entry</text>' +
      '<line x1="395" y1="89" x2="469" y2="89" stroke="var(--border-strong)" stroke-width="2"/>' +
      '<polygon points="469,89 459,84 459,94" fill="var(--border-strong)"/>' +
      '<text x="432" y="80" fill="var(--text-dim)" font-size="10" text-anchor="middle">Exit Seq</text>' +
      '<line x1="545" y1="118" x2="545" y2="150" stroke="var(--border-strong)" stroke-width="2"/>' +
      '<line x1="545" y1="150" x2="320" y2="150" stroke="var(--border-strong)" stroke-width="2"/>' +
      '<line x1="320" y1="150" x2="320" y2="118" stroke="var(--border-strong)" stroke-width="2"/>' +
      '<polygon points="320,118 325,128 315,128" fill="var(--border-strong)"/>' +
      '<text x="430" y="168" fill="var(--text-dim)" font-size="10" text-anchor="middle">回 Live Frame</text>' +
      '<rect x="20" y="178" width="600" height="48" rx="8" fill="var(--surface)" stroke="var(--accent)"/>' +
      '<text x="34" y="200" fill="var(--accent)" font-size="11" font-weight="600">PSR1（eDP v1.3 引入）：整帧自刷新；PSR2（v1.5 命名）：支持 Selective Update 局部刷新</text>' +
      '<text x="34" y="218" fill="var(--text-soft)" font-size="10.5">Sink 把活动帧存入 Remote Frame Buffer，自刷新期间主链路断电以省系统功耗</text>' +
      '</svg>',

    /* PSR2 选择性更新：全屏更新 vs 局部 SU 区域 */
    psr2Su:
      '<svg class="bl-fig-svg" viewBox="0 0 640 260" role="img" aria-label="PSR2 选择性更新：全屏刷新与局部 SU 区域对比">' +
      '<rect x="0" y="0" width="640" height="260" fill="var(--surface-2)"/>' +
      '<text x="16" y="26" fill="var(--text-soft)" font-size="12" font-weight="600">PSR2 选择性更新（SU）：只传变化区域，其余帧由 Sink 的 RFB 维持</text>' +
      '<rect x="30" y="48" width="250" height="170" rx="8" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="155" y="68" fill="var(--text-dim)" font-size="11" text-anchor="middle">PSR1：整帧刷新</text>' +
      '<rect x="46" y="80" width="218" height="120" rx="4" fill="var(--surface-2)" stroke="var(--teal)"/>' +
      '<text x="155" y="146" fill="var(--teal)" font-size="11" text-anchor="middle">整屏重传（能耗高）</text>' +
      '<rect x="360" y="48" width="250" height="170" rx="8" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="485" y="68" fill="var(--text-dim)" font-size="11" text-anchor="middle">PSR2：局部 SU</text>' +
      '<rect x="376" y="80" width="218" height="120" rx="4" fill="var(--surface-2)" stroke="var(--teal)"/>' +
      '<rect x="430" y="110" width="90" height="60" rx="4" fill="var(--accent)" fill-opacity="0.5" stroke="var(--accent)"/>' +
      '<text x="485" y="146" fill="var(--accent)" font-size="10" text-anchor="middle">只传变化块</text>' +
      '<text x="485" y="220" fill="var(--text-soft)" font-size="10.5" text-anchor="middle">SU Region Early Transport（001B0h[7]）、Selective Update Enable（001B0h[6]）</text>' +
      '<text x="485" y="238" fill="var(--text-dim)" font-size="10" text-anchor="middle">Sink 用 CRC 校验 SU 完整性，省下的正是主链路带宽与功耗</text>' +
      '</svg>',

    /* ALPM 信令：AUX-wake 与 AUX-less */
    alpmFlow:
      '<svg class="bl-fig-svg" viewBox="0 0 640 280" role="img" aria-label="ALPM 两种信令：AUX-wake 与 AUX-less">' +
      '<rect x="0" y="0" width="640" height="280" fill="var(--surface-2)"/>' +
      '<text x="16" y="26" fill="var(--text-soft)" font-size="12" font-weight="600">Advanced Link Power Management：快速唤醒 / 休眠主链路，分 AUX-wake 与 AUX-less</text>' +
      '<rect x="14" y="44" width="300" height="210" rx="8" fill="var(--surface)" stroke="var(--accent)"/>' +
      '<text x="164" y="66" fill="var(--accent)" font-size="12" font-weight="600" text-anchor="middle">AUX-wake ALPM</text>' +
      '<text x="28" y="90" fill="var(--text-soft)" font-size="10.5">ACTIVE → ML_PHY_SLEEP</text>' +
      '<rect x="28" y="98" width="272" height="22" rx="4" fill="var(--surface-2)"/>' +
      '<text x="164" y="113" fill="var(--teal)" font-size="10" text-anchor="middle">发 ML_PHY_SLEEP K-code</text>' +
      '<text x="28" y="140" fill="var(--text-soft)" font-size="10.5">唤醒：用 AUX_CH 信令</text>' +
      '<rect x="28" y="148" width="272" height="22" rx="4" fill="var(--surface-2)"/>' +
      '<text x="164" y="163" fill="var(--teal)" font-size="10" text-anchor="middle">AUX 唤醒 → ML_PHY_STANDBY</text>' +
      '<text x="28" y="194" fill="var(--text-soft)" font-size="10.5">能力位：0002Eh[0]；使能：00116h[0]</text>' +
      '<text x="28" y="216" fill="var(--text-soft)" font-size="10.5">模式选择：00116h[2]=0</text>' +
      '<text x="28" y="240" fill="var(--text-dim)" font-size="10">PSR2 Sink 必须支持 AUX-wake</text>' +
      '<rect x="326" y="44" width="300" height="210" rx="8" fill="var(--surface)" stroke="var(--teal)"/>' +
      '<text x="476" y="66" fill="var(--teal)" font-size="12" font-weight="600" text-anchor="middle">AUX-less ALPM</text>' +
      '<text x="340" y="90" fill="var(--text-soft)" font-size="10.5">ACTIVE → ML_PHY_SLEEP</text>' +
      '<rect x="340" y="98" width="272" height="22" rx="4" fill="var(--surface-2)"/>' +
      '<text x="476" y="113" fill="var(--accent)" font-size="10" text-anchor="middle">发 ML_PHY_SLEEP K-code</text>' +
      '<text x="340" y="140" fill="var(--text-soft)" font-size="10.5">唤醒：不依赖 AUX</text>' +
      '<rect x="340" y="148" width="272" height="22" rx="4" fill="var(--surface-2)"/>' +
      '<text x="476" y="163" fill="var(--accent)" font-size="10" text-anchor="middle">LFPS 信令 + ACDS 周期</text>' +
      '<text x="340" y="194" fill="var(--text-soft)" font-size="10.5">能力位：0002Eh[2]；使能 00116h[0,2]=1</text>' +
      '<text x="340" y="216" fill="var(--text-soft)" font-size="10.5">对应 PM_State 3b（ALW_SLEEP）</text>' +
      '<text x="340" y="240" fill="var(--text-dim)" font-size="10">支持 PR/ARP 的 Sink 必须支持 AUX-less</text>' +
      '</svg>',

    /* Panel Replay vs PSR：PR 主链路可保持 ON */
    prVsPsr:
      '<svg class="bl-fig-svg" viewBox="0 0 640 260" role="img" aria-label="Panel Replay 与 PSR 对比：主链路可保持开启">' +
      '<rect x="0" y="0" width="640" height="260" fill="var(--surface-2)"/>' +
      '<text x="16" y="26" fill="var(--text-soft)" font-size="12" font-weight="600">Panel Replay 与 PSR 都靠 Remote Frame Buffer，但 PR 允许主链路保持开启</text>' +
      '<rect x="20" y="46" width="280" height="180" rx="8" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="160" y="68" fill="var(--text-dim)" font-size="12" font-weight="600" text-anchor="middle">PSR（面板自刷新）</text>' +
      '<text x="36" y="94" fill="var(--text-soft)" font-size="10.5">· 进入自刷新后主链路可断电</text>' +
      '<text x="36" y="118" fill="var(--text-soft)" font-size="10.5">· 画面由 Sink RFB 自维持</text>' +
      '<text x="36" y="142" fill="var(--text-soft)" font-size="10.5">· PSR2 支持 Selective Update</text>' +
      '<text x="36" y="166" fill="var(--text-soft)" font-size="10.5">· 与 ALPM 协同省电</text>' +
      '<text x="36" y="196" fill="var(--text-dim)" font-size="10">状态：Live → Active → Exit</text>' +
      '<rect x="340" y="46" width="280" height="180" rx="8" fill="var(--surface)" stroke="var(--teal)"/>' +
      '<text x="480" y="68" fill="var(--teal)" font-size="12" font-weight="600" text-anchor="middle">Panel Replay（面板回放）</text>' +
      '<text x="356" y="94" fill="var(--text-soft)" font-size="10.5">· 基于 DP Standard 的 PR + eDP 扩展</text>' +
      '<text x="356" y="118" fill="var(--text-soft)" font-size="10.5">· PR 期间主链路可保持 ON</text>' +
      '<text x="356" y="142" fill="var(--text-soft)" font-size="10.5">· 同样支持 Selective Update</text>' +
      '<text x="356" y="166" fill="var(--text-soft)" font-size="10.5">· 与 ALPM 并发（PR_State 2 + ALPM）</text>' +
      '<text x="356" y="196" fill="var(--text-dim)" font-size="10">状态：0 禁用 / 1 进入 / 2 活动</text>' +
      '<text x="16" y="244" fill="var(--text-dim)" font-size="10">两者都是可选功能；eDP 不强制互操作，厂商按省电与复杂度折中取舍。</text>' +
      '</svg>',

    /* eDP 上电时序：Panel Power On → 背光 → 链路训练 → 视频 */
    powerSeq:
      '<svg class="bl-fig-svg" viewBox="0 0 640 300" role="img" aria-label="eDP 上电时序：面板供电、背光、链路训练、视频流的顺序约束">' +
      '<rect x="0" y="0" width="640" height="300" fill="var(--surface-2)"/>' +
      '<text x="16" y="26" fill="var(--text-soft)" font-size="12" font-weight="600">eDP 接口上电/下电时序：面板供电与背光必须按 DPCD 声明的能力顺序动作</text>' +
      /* 时间轴 */
      '<line x1="40" y1="70" x2="600" y2="70" stroke="var(--border-strong)" stroke-width="1.4"/>' +
      '<text x="20" y="74" fill="var(--text-dim)" font-size="10">t0</text>' +
      '<line x1="160" y1="70" x2="160" y2="220" stroke="var(--border-strong)" stroke-width="1" stroke-dasharray="3 3"/>' +
      '<line x1="320" y1="70" x2="320" y2="220" stroke="var(--border-strong)" stroke-width="1" stroke-dasharray="3 3"/>' +
      '<line x1="480" y1="70" x2="480" y2="220" stroke="var(--border-strong)" stroke-width="1" stroke-dasharray="3 3"/>' +
      /* 面板电源 */
      '<rect x="40" y="84" width="280" height="26" rx="5" fill="var(--accent)" fill-opacity="0.55" stroke="var(--accent)"/>' +
      '<text x="180" y="102" fill="var(--accent)" font-size="10.5" text-anchor="middle">Panel Power On（面板供电）</text>' +
      /* 背光 */
      '<rect x="160" y="120" width="200" height="26" rx="5" fill="var(--teal)" fill-opacity="0.55" stroke="var(--teal)"/>' +
      '<text x="260" y="138" fill="var(--teal)" font-size="10.5" text-anchor="middle">Backlight On（背光使能）</text>' +
      /* 链路训练 */
      '<rect x="320" y="156" width="160" height="26" rx="5" fill="var(--accent)" fill-opacity="0.55" stroke="var(--accent)"/>' +
      '<text x="400" y="174" fill="var(--accent)" font-size="10.5" text-anchor="middle">Link Training</text>' +
      /* 视频 */
      '<rect x="480" y="192" width="120" height="26" rx="5" fill="var(--teal)" fill-opacity="0.55" stroke="var(--teal)"/>' +
      '<text x="540" y="210" fill="var(--teal)" font-size="10.5" text-anchor="middle">Video</text>' +
      '<rect x="40" y="238" width="560" height="46" rx="8" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="54" y="258" fill="var(--text-soft)" font-size="10.5">· 下电为反向顺序；时序参数由 DPCD 的 Display Power Sequencing 能力寄存器声明</text>' +
      '<text x="54" y="278" fill="var(--text-dim)" font-size="10">· Sink 上报最小/最大上电延迟，源据此安排 Panel Power 与背光的间隔</text>' +
      '</svg>'
  };

  Object.keys(FIGURES).forEach(function (k) { D.figures[k] = FIGURES[k]; });

  /* -------------------------------------------------------------- 术语表 */
  /* [ 英文术语, 中文术语, 说明 ] —— 与首篇/DP/DSC 篇同构，每篇自带、互不干扰。 */
  var GLOSSARY = [
    ['eDP', '嵌入式 DisplayPort', 'Embedded DisplayPort：基于 DP 标准的嵌入式面板接口，面向笔记本/一体机内屏'],
    ['DisplayPort (DP)', 'DisplayPort', 'VESA 数字显示接口标准；eDP 以 DP v2.1 为基础并加嵌入式专属特性'],
    ['Source / Sink', '源设备 / 宿设备', '链路两端角色：eDP 中 Source 多在 GPU，Sink 多在面板 TCON'],
    ['Main-Link', '主链路', '1/2/4 对交流耦合差分线，单向，承载等时视频/音频流'],
    ['AUX_CH', '辅助通道', 'AC 耦合差分对，Manchester-II 半双工 1 Mbps，读 DPCD 与 I2C-over-AUX'],
    ['HPD', '热插拔检测', '宿向源报告在位/已上电，也用作中断请求；eDP 有 LV-HPD 低电压子块'],
    ['LV-HPD', '低电压 HPD', 'eDP 的低电压 HPD 电气子块，适配嵌入式直接连接'],
    ['SST', '单流传输', 'Single-Stream Transport：一条主链路只传一路主视频流；eDP 只用 SST'],
    ['MSO', '多 SST 操作', 'Multi-SST Operation：把主链路拆成多条并行 SST，喂分段面板'],
    ['Segmented Panel', '分段面板', '由多个面板段拼成的显示；各段可由一条 SST 独立驱动'],
    ['Live Frame Mode', '活动帧模式', 'eDP 正常显示操作：主链路实时传视频数据与时序'],
    ['PSR', '面板自刷新', 'Panel Self Refresh：Sink 把活动帧存入 RFB，自刷新期间主链路可断电省电'],
    ['PSR1', '面板自刷新 v1', 'eDP v1.3 引入的整帧自刷新；进入 Active 后整屏由 Sink 维持'],
    ['PSR2', '面板自刷新 v2', '带 Selective Update 的 PSR：只传变化的局部区域'],
    ['Selective Update', '选择性更新', 'SU：仅传输画面变化块，其余由 Sink 的 RFB 维持，省带宽与功耗'],
    ['RFB', '远端帧缓冲', 'Remote Frame Buffer：Sink 端存放活动帧的缓冲，支撑 PSR/PR'],
    ['Panel Replay', '面板回放', 'PR：类 PSR 的省电功能，基于 DP Standard 的 PR 并加 eDP 扩展，主链路可保持 ON'],
    ['ALPM', '高级链路功耗管理', 'Advanced Link Power Management：快速唤醒/休眠主链路，分 AUX-wake 与 AUX-less'],
    ['AUX-wake ALPM', 'AUX 唤醒 ALPM', '用 AUX_CH 信令唤醒主链路的 ALPM；PSR2 Sink 必须支持'],
    ['AUX-less ALPM', '免 AUX 唤醒 ALPM', '不依赖 AUX、用 LFPS 唤醒的 ALPM；支持 PR/ARP 的 Sink 必须支持'],
    ['PM_State', '电源管理状态', '下游设备电源状态（ACTIVE/STANDBY/SLEEP 等），如 3b=ALW_SLEEP'],
    ['LFPS', '低频周期信令', 'Low-Frequency Periodic Signaling：AUX-less ALPM 唤醒用的低频频信号'],
    ['ACDS', '辅助通道检测序列', 'AUX Channel Detection Sequence：AUX-less ALPM 中 PHY 建立期的检测序列'],
    ['AUX_FRAME_SYNC', '辅助通道帧同步', '源到汇基于 GTC 的活动视频图像时序同步协议，配合 PSR2 使用'],
    ['GTC', '全局时间码', 'Global Time Code：AUX_FRAME_SYNC 用以对齐源/汇视频时序的时基'],
    ['Adaptive-Sync', '自适应同步', 'eDP 中 FAVT/AVT 两种模式：逐帧调整帧时长以匹配内容'],
    ['FAVT', '固定平均垂直时间', 'Fixed Average Vertical Time：帧时长围绕平均刷新率变化'],
    ['AVT', '自适应垂直时间', 'Adaptive Vertical Time：逐帧编程帧时长，帧间隔可变'],
    ['DSC', '显示流压缩', 'VESA 视觉无损压缩；eDP 中可独立于 FEC 使用（不同于 DP 标准）'],
    ['FEC', '前向纠错', 'Forward Error Correction：可选，与 DSC 配合使用时同 DP 标准'],
    ['ASSR', '替代加扰种子复位', 'Alternate Scrambler Seed Reset：改 8b/10b 加扰种子，使 eDP 与 DP 设备不兼容'],
    ['HDCP', '高清内容保护', 'High-bandwidth Digital Content Protection：eDP 可选的内容加密'],
    ['DPCD', 'DP 配置数据', 'DisplayPort Configuration Data：Sink 端寄存器库（00000h 起），经 AUX 访问'],
    ['EDID / DisplayID', '扩展显示标识数据', '描述面板能力的数据块；eDP 经 AUX 的 I2C-over-AUX 读取，DisplayID 优先'],
    ['EDP_REV', 'eDP 修订号', 'Sink 在 DPCD 00700h 声明的 eDP 版本；v1.5a 记作 06h'],
    ['Fast Link Training', '快速链路训练', '免 AUX 事务的链路训练；eDP Sink 必须支持（源可选）'],
    ['Backlight Control', '背光控制', '经 AUX_CH 或专用连接器信号控制显示背光，含区域背光'],
    ['Multi-touch', '多点触控', 'eDP 支持经 AUX_CH 传输 HID 多点触控数据（HID over AUX）'],
    ['Power Sequencing', '上电时序', '面板供电/背光/链路训练/视频的上电与下电顺序，参数由 DPCD 声明']
  ];

  /* ---------------------------------------------------------------- 文章 */
  D.posts.push({
    id: 'edp',
    title: '嵌入式 DisplayPort（eDP）Standard v1.5a 技术解析',
    titleEn: 'VESA Embedded DisplayPort (eDP) Standard v1.5a — Deep Dive',
    subtitle: 'eDP 是基于 DP v2.1 的嵌入式面板接口，为笔记本/一体机内屏而生；本文从 eDP 与标准 DP 的' +
      '关键差异、典型系统、MSO 多流、电气与链路速率、ALPM/PSR/Panel Replay 省电族、AUX_FRAME_SYNC、' +
      'Adaptive-Sync、DSC/FEC、AUX 背光与多点触控、上电时序，系统拆解 1.5a 的机理与取舍。',
    category: '显示接口',
    tags: ['eDP 1.5a', 'Embedded DisplayPort', 'PSR', 'Panel Replay', 'MSO', 'ALPM', 'AUX_FRAME_SYNC', 'DSC', '背光控制'],
    source: {
      name: 'VESA',
      label: 'Embedded DisplayPort (eDP) Standard Version 1.5a（2023-02-27，447 页，基于 DP v2.1）',
      url: 'https://www.vesa.org/',
      note: '本篇是基于规范正文的学习性中文原理整理，非官方译文，也未转载规范原表格与插图；' +
        '数据以 VESA 发布的 Embedded DisplayPort Standard v1.5a 为准，产品合规请以规范原文与 eDP CTS 为最终依据。'
    },
    license: 'Embedded DisplayPort 标准原文版权归 VESA 所有；本页为学习用途的中文原理整理，只复述机制与参数含义，' +
      '未转载规范原表格与插图，示意图均按规范描述重绘。',
    summary: '**嵌入式 DisplayPort（eDP）** 是 VESA 为「嵌入式显示应用」定义的面板接口标准，' +
      '它**基于 DisplayPort Standard Version 2.1**，在 DP 的基础上加入一系列面向笔记本、一体机等内屏的专属特性——' +
      '尤其是以 **PSR（面板自刷新）、Panel Replay、ALPM（高级链路功耗管理）** 为代表的省电族，' +
      '以及 **MSO（多 SST 操作）、AUX 背光控制、免 AUX 快速链路训练** 等嵌入式优化。' +
      '与面向外部互连的 DisplayPort 不同，eDP **不强制全互操作**（系统厂商自选 Source 与 Sink），' +
      '并因 **ASSR（替代加扰种子复位）** 而与标准 DP 设备在链路层互不兼容。本篇按规范正文的顺序，' +
      '从 eDP 的定位与典型系统讲起，依次拆解它和标准 DP 的关键差异、MSO 多流、电气与链路速率、' +
      'ALPM/PSR/Panel Replay 三种省电机制、AUX_FRAME_SYNC 帧同步、Adaptive-Sync、DSC/FEC、' +
      'AUX 背光与多点触控、以及显示上电时序，把每条机制的动机与做法讲清，帮助读者建立 eDP 1.5a 的完整骨架。',
    glossary: GLOSSARY,
    chapters: [

      /* ======================================================== 01 eDP 是什么 */
      {
        id: 'overview',
        num: '01',
        title: 'eDP 是什么，以及它和标准 DP 的根本区别',
        titleEn: 'What eDP Is and How It Differs from DP',
        lead: 'eDP 不是「小一号的 DP」。它把 DP 的链路内核搬来，却为嵌入式内屏重新定义了互操作、省电与背光模型；' +
          '看懂这份差异表，是理解后面所有特性的前提。',
        sections: [
          {
            id: 'position',
            title: '定位：基于 DP v2.1 的嵌入式面板接口',
            titleEn: 'Positioning: An Embedded Panel Interface Built on DP v2.1',
            blocks: [
              { t: 'p', v: 'eDP 标准明确定义：它是一个**标准化显示面板接口**，面向嵌入式显示应用；' +
                '它**基于 VESA DisplayPort Standard Version 2.1（DP v2.1）**，并加入系统厂商在集成时值得考虑的、' +
                '实现特定的可选特性。换言之，eDP 复用 DP 的链路内核，但把接口目标从「盒到盒的外部互连」' +
                '转向「设备内部的屏接」——典型场景是笔记本、一体机的内嵌面板。' },
              { t: 'list', items: [
                ['正常操作即 Live Frame Mode', 'eDP 的常规显示就是 Live Frame Mode：主链路实时传输视频数据与 Timing；即便支持 PSR/PR 但未启用，也走这一协议'],
                ['复用 DP 链路内核', '主链路、AUX_CH、HPD 的基本行为沿用 DP v2.1，除非本规范另有定义'],
                ['为内屏优化', 'eDP 独有特性大多围绕省系统功耗、提升电池续航而设计']
              ] },
              { t: 'callout', kind: 'info', title: 'eDP 不强制全互操作',
                v: '与外部 DisplayPort 不同，嵌入式应用中由制造商决定选用哪些 Source 与 Sink，因此 eDP **不要求所有 eDP 设备之间普遍互操作**；' +
                  '它只定义「应当支持」与「可选支持」的特性层级，让厂商在复杂度与功耗间折中。' }
            ]
          },
          {
            id: 'vsdp',
            title: '与标准 DP 的关键差异（Table 2-1 提炼）',
            titleEn: 'Key Deviations from the DP Standard',
            blocks: [
              { t: 'p', v: '规范用一张表（Table 2-1）汇总了 eDP 相对 DP 的差异与强制/可选级别。下面把最重要的几项拆开看：' },
              { t: 'table', head: ['特性', 'eDP 处置'], rows: [
                ['Live Frame Mode', '强制（Normal display operation）'],
                ['PSR1', '可选；但支持 PSR2 的 Sink 必须同时支持 PSR1'],
                ['PSR2', '可选（带 Selective Update 的面板自刷新）'],
                ['ARP', '可选（Adaptive Refresh Panel，eDP v1.5 起）'],
                ['AUX-wake ALPM', '可选；支持 PSR2 的 Sink 必须支持'],
                ['AUX-less ALPM', '可选；支持 PR/ARP/VBlank 期 ALPM 的 Sink 必须支持'],
                ['AUX_FRAME_SYNC', '可选（配合 PSR2 的后向兼容）'],
                ['DSC', '可选；与 DP 不同，eDP 中 DSC **可脱离 FEC** 使用'],
                ['ASSR', '可选；Sink 应支持（Method 3a），使 eDP 与 DP 设备链路层不兼容'],
                ['Backlight Control', '可选；可用 AUX_CH 控背光（含区域背光）'],
                ['Fast Link Training', 'Sink 强制（免 AUX 训练）；Source 可选'],
                ['128b/132b 高于 HBR3', '超出本规范范围（eDP 电气定义只到 HBR3 8.1 Gbps/lane）']
              ] },
              { t: 'callout', kind: 'key', title: '没有 VESA 合规认证，但有强制清单',
                v: '规范明确：eDP 设备**不存在 VESA 合规认证测试**；但它定义了 eDP Source/Sink 应当支持、以及可选支持的性能层级，' +
                  '从而在嵌入式面板生态里形成兼容基础。' },
              { t: 'fig', id: 'edpVsDp', caption: 'eDP 与标准 DP 的关键差异：eDP 为嵌入式内屏而生，不强制互操作、省电族是重点' }
            ]
          },
          {
            id: 'system',
            title: '典型系统实现',
            titleEn: 'Typical eDP System Implementation',
            blocks: [
              { t: 'p', v: '规范给出的典型实现采用 **SST（单流传输）拓扑**：Source 功能通常集成在显卡/GPU 里，' +
                'Sink 功能集成在面板上的显示时序控制器（TCON）里；**MST 不在 eDP 范围**。系统厂商据通道数、' +
                '信号完整性、EMI、空间与成本自选连接器——通常 1/2 通道用 20 或 30 针，4 通道用 40 针（见第 12 章连接器）。' },
              { t: 'list', items: [
                ['EPROM + DisplayID/EDID', 'TCON 上挂 EPROM 存面板能力；Source 经 eDP AUX 读取（DisplayID 优先于 EDID，EDID 仅作 legacy）'],
                ['AUX 兼管背光', 'eDP 把背光控制也纳入 AUX_CH（也可用专用连接器信号），实现单线治理'],
                ['LV-HPD', '低电压 HPD 适配嵌入式直连，区别于外部 DP 的 HPD 电气']
              ] },
              { t: 'fig', id: 'edpSystem', caption: '典型 eDP 系统：Source 在 GPU、Sink 在面板 TCON；AUX 兼管 EDID/DisplayID 与背光' }
            ]
          },
          {
            id: 'auth',
            title: '显示认证与内容保护',
            titleEn: 'Display Authentication and Content Protection',
            blocks: [
              { t: 'p', v: 'eDP 提供显示认证与内容保护的选项。**ASSR（Alternate Scrambler Seed Reset）** 是对 8b/10b 主链路加扰的改动：' +
                '它让 eDP 的 Source 与 Sink **与标准 DP 的 Source/Sink 互不兼容**（规范称 Sink 应支持 ASSR，即 Method 3a）。' +
                '其余如 HDCP 等内容保护在 eDP 中为可选，是否采用取决于用法需求，在嵌入式显示里并不常见。' },
              { t: 'callout', kind: 'warn', title: 'ASSR 是 eDP 与 DP「互不兼容」的关键',
                v: '因为 ASSR 改写了主链路加扰种子，同一根线两端若一端是 eDP 设备、一端是 DP 设备，链路层无法直接互通——' +
                  '这正是 eDP 作为「内屏专用」接口在物理/链路层的硬边界。' },
              { t: 'list', items: [
                ['显示认证', 'eDP 提供 ASSR 等显示认证与内容保护选项，改写加扰种子以区分内屏链路'],
                ['内容保护', 'HDCP 等在 eDP 中为可选，是否采用取决于用法需求，嵌入式显示里不常见'],
                ['legacy 兼容', 'EDID 仅作 legacy 支持，DisplayID 优先；两者都经 AUX 的 I2C-over-AUX 读取']
              ] }
            ]
          }
        ]
      },

      /* ======================================================== 02 MSO */
      {
        id: 'mso',
        num: '02',
        title: 'MSO：把一条主链路拆成多条并行 SST',
        titleEn: 'Multi-SST Operation (MSO)',
        lead: '高分辨率内屏的带宽压力，不一定靠「更高速率」解，也可以用「更多并行窄链路」解。MSO 就是 eDP 给分段面板准备的这种拆分方案。',
        sections: [
          {
            id: 'mso-intro',
            title: 'MSO 是什么，解决什么问题',
            titleEn: 'What MSO Is and Why It Exists',
            blocks: [
              { t: 'p', v: '**MSO（Multi-SST Operation，多 SST 操作）** 是 eDP 的一种**可选**通道分配协议：' +
                '它让 Source 用多条并行的 SST 链路，去驱动一个 **Segmented Panel（分段面板）** Sink。' +
                '换句话说，原本「一条宽主链路喂整屏」的模型，被换成「多条窄 SST 各喂一块面板段」。' },
              { t: 'callout', kind: 'info', title: 'MSO 是 eDP 1.4b 引入的特性',
                v: '作为可选特性，厂商可按面板分辨率与通道预算决定是否启用；它不改变 SST 的数据格式，只改变「一条主链路如何被分配到多段」。' }
            ]
          },
          {
            id: 'topo',
            title: '四种拓扑配置',
            titleEn: 'Link Configurations',
            blocks: [
              { t: 'p', v: '规范定义了几种 MSO 源设备配置，核心是按「几条 SST × 每条几对线」组合：' },
              { t: 'table', head: ['配置', '含义'], rows: [
                ['2 × 1', '两条 SST 链路，各 1 对线'],
                ['2 × 2', '两条 SST 链路，各 2 对线'],
                ['4 × 1', '四条 SST 链路，各 1 对线'],
                ['Segmented-panel', '各面板段由一条独立 SST 驱动']
              ] },
              { t: 'fig', id: 'msoTopo', caption: 'MSO 拓扑：2×1、2×2、4×1 与分段面板，核心是「多条并行窄 SST」' }
            ]
          },
          {
            id: 'overlap',
            title: '相邻面板段的像素重叠',
            titleEn: 'Pixels Overlapping Adjacent Panel Segments',
            blocks: [
              { t: 'p', v: '为避免多段拼接在边界处出现可见缝隙或错位，MSO 允许**相邻面板段之间像素重叠（Overlap）**——' +
                '即两段在边界区域共享一部分像素，由各自 SST 提供。这样即使各段时序略有偏差，拼缝处仍能连续显示。' },
              { t: 'callout', kind: 'info', title: 'Overlap 是拼缝质量的保险',
                v: '相邻段共享的重叠像素由各自 SST 提供相同内容，拼缝处即便有时序偏差也不会出现内容错位或撕裂。' }
            ]
          },
          {
            id: 'timing',
            title: '时序约束与 Sink CRC',
            titleEn: 'Timing Mandates and Sink CRC',
            blocks: [
              { t: 'p', v: 'MSO 对主链路配置有专门的**时序约束**（Timing Mandates for MSO Main-Link Configuration），' +
                '要求源/宿在建立多 SST 时遵守特定时序。Sink 端则提供 **CRC 寄存器**用于核对各面板段接收数据的完整性，' +
                '确保多条并行链路拼出的整屏正确无误。' },
              { t: 'callout', kind: 'key', title: 'MSO 与 PSR/PR 可叠加',
                v: 'MSO 只解决「多 SST 喂分段面板」的带宽拆分；静止画面下的省电仍交给 PSR/PR，两者在不同维度互补。' }
            ]
          }
        ]
      },

      /* ======================================================== 03 电气 */
      {
        id: 'electrical',
        num: '03',
        title: '电气规范扩展：速率、抖动与 EYE 图',
        titleEn: 'eDP Electrical Specification Extension',
        lead: 'eDP 的电气定义只到 HBR3（8.1 Gbps/lane），并额外放行「自定义链路速率」。这一章把互连参考点、速率表、抖动预算与 EYE 图讲清。',
        sections: [
          {
            id: 'refpoints',
            title: '互连参考点与 TP1 信号电压',
            titleEn: 'Interconnect Reference Points and TP1 Voltage',
            blocks: [
              { t: 'p', v: 'eDP 电气规范定义了**互连参考点（Interconnect Reference Points）**，并在这些点上规定主链路发送端（TX）的 **TP1 差分信号电压**。' +
                '规范给出推荐的训练电压表（含低 VDIFF、高 VDIFF、单 VDIFF 等示例），用于链路训练阶段让接收端有足够余量完成时钟恢复与均衡。' },
              { t: 'callout', kind: 'key', title: 'eDP 电气只定义到 HBR3',
                v: 'Sink 的电气参数（抖动、噪声预算、参考接收端均衡器）针对最高 8.1 Gbps/lane（HBR3）定义；' +
                  '高于 HBR3 的 128b/132b 速率明确**超出本规范范围**。' }
            ]
          },
          {
            id: 'linkrate',
            title: '链路速率与抖动预算',
            titleEn: 'Link Rates and Jitter Budget',
            blocks: [
              { t: 'p', v: 'eDP 复用 DP 的标准速率，同时允许**自定义链路速率**：' },
              { t: 'table', head: ['速率档', 'Gbps/lane'], rows: [
                ['RBR', '1.62'],
                ['HBR', '2.7'],
                ['HBR2', '5.4'],
                ['HBR3', '8.1'],
                ['自定义（示例）', '4.155 / 2.0775 / 2.496 / 1.456']
              ] },
              { t: 'p', v: '规范为各速率档给出**差分噪声预算**与**抖动预算系统**；对高于 5.4 Gbps/lane（至 HBR3）的档位，' +
                '还定义了 eDPTX 参考接收端的 CTLE、以及 CTLE+DFE 的 TPE_EQ 参数。这种「按速率分档」的预算，' +
                '让内屏在更短走线、更紧空间里仍可达到可接受余量。' }
            ]
          },
          {
            id: 'eyemask',
            title: 'EYE 图与 TP3_EQ 强制',
            titleEn: 'EYE Diagrams and TP3_EQ Mandates',
            blocks: [
              { t: 'p', v: '发送端主链路 EYE 图是电气合规的核心视图。eDP 规定了 **TP3_EQ EYE 强制**要求与对应眼图模板顶点，' +
                '并给出参考接收端均衡器（CTLE，以及 CTLE+DFE）的极点/零点参数。Sink 在均衡训练阶段据此评估通道质量。' }
            ]
          },
          {
            id: 'discovery',
            title: '速率发现、AUX_CH 与 HPD',
            titleEn: 'Link Rate Discovery, AUX_CH and HPD',
            blocks: [
              { t: 'p', v: '**链路速率发现与选择**决定实际跑哪档速率；规范给出互操作摘要表。AUX_CH 在 eDP 中有若干与 DP 标准不同的推荐参数' +
                '（如电气子块、拓扑），以适应嵌入式直连。HPD 则带有 **LV-HPD（低电压）子块**，' +
                '更贴合内屏的低压信号环境。' },
              { t: 'callout', kind: 'info', title: '速率发现与 DP 标准兼容',
                v: 'eDP 复用 DP 的链路速率发现/选择机制，额外放的自定义速率只改「允许跑哪些档」，不改变发现流程本身。' }
            ]
          }
        ]
      },

      /* ======================================================== 04 ALPM */
      {
        id: 'alpm',
        num: '04',
        title: 'ALPM：让主链路快速休眠与唤醒',
        titleEn: 'Advanced Link Power Management (ALPM)',
        lead: 'ALPM 是 eDP 省电族的第一环：它让主链路在不动屏时快速进入低功耗睡眠，并在需要时在极短延迟内唤醒。分 AUX-wake 与 AUX-less 两种路径。',
        sections: [
          {
            id: 'alpm-states',
            title: '下游设备的电源管理状态',
            titleEn: 'Downstream Device Power Management States',
            blocks: [
              { t: 'p', v: 'eDP 定义了一组下游设备电源状态（Power Management States），用于描述主链路在 ALPM 下的低功耗层级，例如：' },
              { t: 'list', items: [
                ['PM_State 1（ACTIVE）', '正常工作态'],
                ['PM_State 2a（FW_STANDBY）', '快速唤醒待机，AUX-wake ALPM 可达'],
                ['PM_State 3a（FW_SLEEP）', '快速唤醒睡眠，AUX-wake ALPM 可达'],
                ['PM_State 3b（ALW_SLEEP）', '免 AUX 睡眠，AUX-less ALPM 可达']
              ] },
              { t: 'callout', kind: 'info', title: '状态与 ALPM 模式绑定',
                v: '支持 AUX-wake ALPM 的 Sink 至少要支持 3a（FW_SLEEP），可外加 2a；支持 AUX-less ALPM 的 Sink 必须支持 3b（ALW_SLEEP）。' }
            ]
          },
          {
            id: 'signaling',
            title: '两种信令：AUX-wake 与 AUX-less',
            titleEn: 'AUX-wake and AUX-less Signaling',
            blocks: [
              { t: 'p', v: '**AUX-wake ALPM** 用 AUX_CH 信令来唤醒主链路：进入睡眠时发 ML_PHY_SLEEP K-code，退出时由 AUX 触发回到 ML_PHY_STANDBY，' +
                '再进入 ACTIVE。**AUX-less ALPM** 则不依赖 AUX：唤醒用 **LFPS（低频周期信令）**，并在 PHY 建立期走 **ACDS（AUX 通道检测序列）** 周期。' },
              { t: 'fig', id: 'alpmFlow', caption: 'ALPM 两种信令：AUX-wake 靠 AUX 唤醒，AUX-less 靠 LFPS/ACDS 唤醒' }
            ]
          },
          {
            id: 'config',
            title: '发现与配置（DPCD 位）',
            titleEn: 'Discovery and Configuration',
            blocks: [
              { t: 'p', v: 'ALPM 通过 DPCD 寄存器声明与配置：' },
              { t: 'table', head: ['动作', 'DPCD 位'], rows: [
                ['AUX-wake 能力', 'RECEIVER_ALPM_CAPABILITIES 0002Eh[0]'],
                ['AUX-less 能力', 'RECEIVER_ALPM_CAPABILITIES 0002Eh[2]'],
                ['ALPM 使能', 'RECEIVER_ALPM_CONFIGURATION 00116h[0]'],
                ['ALPM 模式选择（0=AUX-wake,1=AUX-less）', 'RECEIVER_ALPM_CONFIGURATION 00116h[2]']
              ] },
              { t: 'callout', kind: 'warn', title: '退出低功耗态后才能禁用 ALPM',
                v: '当 ALPM 已启用且 Sink 处于对应睡眠态时，Source 必须先把它退出到非睡眠态，才能禁用 ALPM——避免链路卡在不可控的低功耗态。' }
            ]
          }
        ]
      },

      /* ======================================================== 05 PSR */
      {
        id: 'psr',
        num: '05',
        title: 'PSR：面板自刷新，靠 RFB 让主链路断电',
        titleEn: 'Panel Self Refresh (PSR1 and PSR2)',
        lead: 'PSR 是 eDP 最经典的省电特性：把当前活动帧存入 Sink 的远端帧缓冲（RFB），自刷新期间主链路可以彻底断电，整块屏靠面板自己刷。',
        sections: [
          {
            id: 'arch',
            title: '架构与源/宿职责',
            titleEn: 'PSR Architecture and Responsibilities',
            blocks: [
              { t: 'p', v: 'PSR 的核心是 Sink 端的 **Remote Frame Buffer（RFB）**：源把活动帧交给 Sink 后，Sink 自行用 RFB 内容刷新面板，' +
                '从而让主链路在静止画面期间关闭以省系统功耗。规范区分了**源设备职责**（决定何时进入/退出、下发更新）与' +
                '**宿设备职责**（在 Active 态自维持画面、执行 CRC/时序控制）。' },
              { t: 'fig', id: 'psrStates', caption: 'PSR 状态机：Live Frame → PSR Active（主链路可关）→ Exit，帧时序再同步后回 Live' }
            ]
          },
          {
            id: 'psr1',
            title: 'PSR1：整帧自刷新',
            titleEn: 'PSR1 — Full-Frame Self Refresh',
            blocks: [
              { t: 'p', v: '**PSR1** 是 eDP v1.3 引入的初始版本（从 eDP v1.5 起正式记作 PSR1）。它做**整帧自刷新**：' +
                '进入 Active（SELF_REFRESH）后，整屏画面由 Sink 的 RFB 维持，主链路可断电。规范定义了 PSR1 的配置、' +
                '设备状态机、进入/退出序列、Active 态下的单帧图像更新、以及退出时的视频帧时序再同步。' },
              { t: 'callout', kind: 'key', title: 'PSR1 是 PSR2 的前置',
                v: '规范规定：支持 PSR2 的 Sink **必须同时支持 PSR1**；PSR1 因此既是独立省电手段，也是 PSR2 的能力基座。' }
            ]
          },
          {
            id: 'psr2',
            title: 'PSR2：带 Selective Update 的局部刷新',
            titleEn: 'PSR2 — Selective Update',
            blocks: [
              { t: 'p', v: '**PSR2** 在 PSR1 基础上加入 **Selective Update（选择性更新）**：画面只有局部变化时，源只传输变化的那块区域，' +
                '其余帧由 Sink 的 RFB 维持。相关 DPCD 位包括 SU Region Early Transport（001B0h[7]）与' +
                'Selective Update Enable（001B0h[6]）。Sink 另用 **CRC 数据完整性校验**来确认 SU 是否正确落地。' },
              { t: 'fig', id: 'psr2Su', caption: 'PSR2 选择性更新：只传变化块，其余由 RFB 维持，省下主链路带宽与功耗' }
            ]
          },
          {
            id: 'psr-dsc',
            title: 'DSC 在 PSR 中的使用',
            titleEn: 'DSC Use in the PSR Function',
            blocks: [
              { t: 'p', v: 'PSR1/PSR2 都可以配合 **DSC（显示流压缩）** 使用：压缩后的码流经 PPS SDP 传输，RFB 存的是压缩或解压后的帧，' +
                'Sink 端用 CRC 核对压缩/解压一致性。这让高分辨率内屏在 PSR 下仍能以较低带宽维持画面。' },
              { t: 'callout', kind: 'key', title: '压缩流与自刷新天然契合',
                v: '静止画面下带宽需求极低，压缩帧存入 RFB 后，主链路即可断电；DSC 让 PSR 在 4K/高刷内屏上仍游刃有余。' }
            ]
          }
        ]
      },

      /* ======================================================== 06 AUX_FRAME_SYNC */
      {
        id: 'auxsync',
        num: '06',
        title: 'AUX_FRAME_SYNC：用 AUX 对齐源/汇视频时序',
        titleEn: 'AUX_CH-based Frame Timing Synchronization',
        lead: '当 Sink 在 PSR2 等场景下自维持画面时，源与汇的视频时序可能漂移。AUX_FRAME_SYNC 用一条基于 GTC 的协议把两者的时序重新对齐。',
        sections: [
          {
            id: 'auxsync-intro',
            title: '它解决什么同步问题',
            titleEn: 'What Timing Problem It Solves',
            blocks: [
              { t: 'p', v: '**AUX_FRAME_SYNC** 是 eDP 的一种**可选**协议，用于**源到汇的活动视频图像时序同步**。' +
                '在 PSR2 等 Sink 自维持画面的情况下，源需要一种办法与 Sink 的视频时序重新对齐，AUX_FRAME_SYNC 就是为此存在；' +
                '它对某些 eDP v1.4 及更高版本 Sink 的后向兼容可能是必需的。' }
            ]
          },
          {
            id: 'declaration',
            title: 'Sink 的能力声明',
            titleEn: 'Sink Device Declaration',
            blocks: [
              { t: 'p', v: 'Sink 通过 **DPCD 寄存器**声明是否支持 AUX_FRAME_SYNC（规范列出了 AUX_FRAME_SYNC 所用的 DPCD 寄存器）。' +
                '源据此决定是否启用该协议来同步时序。' },
              { t: 'callout', kind: 'info', title: '与 PSR2 配合更顺',
                v: 'AUX_FRAME_SYNC 主要服务于 PSR2 的后向兼容：当 Sink 自维持画面时，源借 GTC 把视频时序重新对齐，避免累积漂移。' }
            ]
          },
          {
            id: 'operation',
            title: '操作与 GTC 例外',
            titleEn: 'Operation and Allowed GTC Exceptions',
            blocks: [
              { t: 'p', v: 'AUX_FRAME_SYNC 基于 **GTC（Global Time Code，全局时间码）** 工作：源用 GTC 把自身视频时序与 Sink 对齐。' +
                '规范给出**允许的 GTC 例外（Allowed GTC Exceptions）**表，界定在哪些边界条件下时序可以不严格对齐，' +
                '既保证同步，又给实现留余量。' },
              { t: 'callout', kind: 'warn', title: 'GTC 例外需谨慎使用',
                v: '规范允许的 GTC 例外是有限的边界条件；超出例外的时序偏差仍应被纠正，否则会在 PSR2 自刷新期间累积成可见抖动。' }
            ]
          }
        ]
      },

      /* ======================================================== 07 Adaptive-Sync */
      {
        id: 'adaptsync',
        num: '07',
        title: 'Adaptive-Sync：逐帧调节帧时长',
        titleEn: 'Adaptive-Sync Operation for VESA AdaptiveSync',
        lead: 'eDP 里的 Adaptive-Sync 与 DP 2.1 同源，但落在内屏语境：它让帧时长逐帧变化以匹配内容，分 FAVT 与 AVT 两种模式。',
        sections: [
          {
            id: 'adaptsync-modes',
            title: 'FAVT 与 AVT 两种模式',
            titleEn: 'FAVT and AVT Modes',
            blocks: [
              { t: 'p', v: 'eDP 的 Adaptive-Sync 提供两种操作模式，由 **DPCD 00107h[7,6]** 控制：' },
              { t: 'table', head: ['模式', '含义'], rows: [
                ['FAVT', 'Fixed Average Vertical Time：帧时长围绕一个平均刷新率变化（达到 TRR 前/后状态有区分）'],
                ['AVT', 'Adaptive Vertical Time：逐帧编程帧时长，帧间隔逐帧可变']
              ] },
              { t: 'callout', kind: 'info', title: '与「忽略 MSA」是两种不同能力',
                v: 'eDP 另有一个 legacy 能力：Sink 仅「忽略某些 MSA 参数」来调整活动视频图像时间间隔（由源启用）。' +
                  '规范建议新设备优先实现完整 Adaptive-Sync，而非仅支持忽略 MSA。' }
            ]
          },
          {
            id: 'opsrc',
            title: '源设备操作要求',
           titleEn: 'Source Device Operation Mandates',
            blocks: [
              { t: 'p', v: '源设备的 Adaptive-Sync 操作分两段：**视频模式设置前/中**与**活动帧传输期间**。' +
                '源在模式设置阶段配置 DPCD（如 00107h 的模式位），在传输期间按 FAVT/AVT 规则逐帧调整帧时长并发送 Adaptive-Sync SDP，' +
                '以把实际刷新率对齐内容节奏。' },
              { t: 'callout', kind: 'info', title: 'FAVT 与 AVT 的取舍',
                v: 'FAVT 围绕固定平均刷新率变化、易与现有时序框架兼容；AVT 逐帧编程、最灵活，但要求 Sink 能逐帧适应可变帧时长。' }
            ]
          },
          {
            id: 'opsink',
            title: '汇设备操作与 SDP 格式',
            titleEn: 'Sink Device Operation and SDP Formats',
            blocks: [
              { t: 'p', v: '汇设备按源下发的 Adaptive-Sync SDP 调整自身帧时序。该 SDP 通过 **VSC SDP** 承载，' +
                '其载荷字节（DB0–DB8）携带时序选项、最小/目标 Vertical Total、目标刷新率、刷新率分频、' +
                '帧时长增减约束值，以及 PR 活动态下的 Coasting VTotal 等信息——这些字段共同把「逐帧可变」的时序意图精确传达给 Sink。' },
              { t: 'list', items: [
                ['DB0', '时序选项：AVT/FAVT 模式、PR 活动态下的 RFB 更新与 SDP 使能'],
                ['DB1–DB2', '最小 Vertical Total（基准时序帧长）'],
                ['DB3–DB4', '目标刷新率与分频（FAVT 下编程以匹配平均帧率）'],
                ['DB5–DB6', '帧时长增/减约束（约束越紧，闪烁越低）'],
                ['DB7–DB8', 'PR 活动态下挂起 SDP 时的 Coasting VTotal']
              ] }
            ]
          }
        ]
      },

      /* ======================================================== 08 Panel Replay */
      {
        id: 'panelreplay',
        num: '08',
        title: 'Panel Replay：可保持主链路开启的「PR」',
        titleEn: 'Panel Replay (PR)',
        lead: 'Panel Replay 与 PSR 同源、都靠 RFB，但有个关键不同：PR 活动态下主链路可以保持开启。这让它在需要低延迟回切时更有优势。',
        sections: [
          {
            id: 'panelreplay-intro',
            title: 'PR 是什么，与 PSR 的关系',
            titleEn: 'What PR Is and Its Relation to PSR',
            blocks: [
              { t: 'p', v: '**Panel Replay（PR）** 建立在 DP 标准定义的 PR 功能之上，并加入 eDP 专属的能力与强制项；' +
                'Source 与 Sink 都可**可选**支持。它和 PSR 一样依赖 Sink 的 **Remote Frame Buffer** 来在活动态维持画面，' +
                '但规范允许 PR 期间**主链路保持开启**（Main-Link Turned ON）。' },
              { t: 'fig', id: 'prVsPsr', caption: 'Panel Replay 与 PSR 都靠 RFB，但 PR 允许主链路保持开启，状态为 0/1/2' }
            ]
          },
          {
            id: 'vspsr',
            title: '与 PSR 的对比要点',
            titleEn: 'Comparison to the PSR Function',
            blocks: [
              { t: 'p', v: 'PR 同样支持 **Selective Update**（局部刷新），对应 DPCD 位（如 PANEL REPLAY CAPABILITY SUPPORTED 000B0h[2,1,0] 的' +
                'Early Transport / SU / PR 支持位）。与 PSR 相比，PR 的状态机更直接地与「主链路是否开启」解耦，' +
                '因此在某些需要快速回切的交互场景里更顺滑。' },
              { t: 'callout', kind: 'info', title: 'PR 是 eDP v1.4b 起引入',
                v: 'Panel Replay 在 eDP v1.4b/1.5 中作为可选特性引入；与 PSR2 类似都靠 RFB，但 PR 更强调「主链路可保持开启」的回切低延迟。' }
            ]
          },
          {
            id: 'panelreplay-states',
            title: 'PR 状态与 DSC 使用',
            titleEn: 'PR States and DSC Use',
            blocks: [
              { t: 'p', v: 'PR 定义了一组状态（PR_State 0 禁用/未活动、PR_State 1 进入、PR_State 2 活动），并在 DPCD 中声明能力、配置与状态。' +
                '**DSC 在 PR 中同样可用**：压缩/非压缩码流在 Live Frame 与 PR 之间切换时，PPS SDP 内容会相应变化；' +
                'Sink 用 DSC_CRC 核对多 SU 的压缩一致性。' },
              { t: 'callout', kind: 'key', title: 'PR 与 ALPM 可并发',
                v: 'PR 可以与 ALPM 并发：在 PR 活动态且启用 ALPM 时，仍需保持视频时序同步；规范定义了 Live Frame 与 PR 之间、' +
                  '以及 PR 内全屏更新/局部 SU 的切换规则。' }
            ]
          },
          {
            id: 'concur',
            title: '与 ALPM 并发的时序规则',
            titleEn: 'PR Concurrent with ALPM',
            blocks: [
              { t: 'p', v: '当 PR 与 ALPM 同时启用时，规范明确了三类操作：在 PR 活动态+ALPM 下的**视频时序同步**、' +
                '**Live Frame 与 PR 之间的切换**、以及 PR 内**不带像素更新的维持 / 全屏更新 / SU 局部更新**的时序约束。' +
                '这些规则保证「主链路可开可关」与「面板自维持」两套省电逻辑叠加时不冲突。' },
              { t: 'callout', kind: 'warn', title: 'PR 与 ALPM 叠加要先对齐时序',
                v: '在 PR 活动态又启用 ALPM 时，主链路可能频繁进出睡眠；规范特别要求保持视频时序同步，否则回切会出现帧错位。' }
            ]
          }
        ]
      },

      /* ======================================================== 09 ARP */
      {
        id: 'arp',
        num: '09',
        title: 'ARP：自适应刷新面板',
        titleEn: 'Adaptive Refresh Panel (ARP)',
        lead: 'ARP 是 eDP v1.5 起出现的可选特性，让面板以自适应节奏刷新；它提供 Polling 与 Interrupt 两种工作模式。',
        sections: [
          {
            id: 'arp-intro',
            title: 'ARP 的定位与版本',
            titleEn: 'Introduction and Version Scope',
            blocks: [
              { t: 'p', v: '**Adaptive Refresh Panel（ARP，自适应刷新面板）** 在 eDP v1.5 及更高版本中定义为**可选**特性。' +
                '它的目标是让面板以适配内容的节奏刷新，从而在静止或低速变化画面下降低刷新相关开销。' }
            ]
          },
          {
            id: 'registers',
            title: '所用 DPCD 寄存器',
            titleEn: 'DPCD Registers Used for ARP',
            blocks: [
              { t: 'p', v: '规范列出 ARP 使用的 DPCD 寄存器集合（能力、配置、状态），源与汇据此声明支持、配置模式并回报状态。' +
                '这些寄存器与 PSR/PR 的省电族共享同一套「能力—配置—状态」治理框架。' },
              { t: 'callout', kind: 'info', title: 'ARP 与 PSR/PR 并列',
                v: 'ARP、PSR、PR、ALPM 都是 eDP 的刷新/功耗治理特性，彼此独立可选；厂商按面板与系统需求选择启用哪些，而非全有或全无。' }
            ]
          },
          {
            id: 'arp-modes',
            title: '两种工作模式',
            titleEn: 'Modes of Operation',
            blocks: [
              { t: 'table', head: ['模式', '含义'], rows: [
                ['Polling Mode', '源以轮询方式查询面板刷新状态/能力'],
                ['Interrupt Mode', '面板以中断（IRQ_HPD 等）方式主动上报刷新事件']
              ] },
              { t: 'callout', kind: 'info', title: '与 PSR/PR 互补而非替代',
                v: 'ARP 是 eDP 省电与刷新治理家族的一员，与 PSR/PR/ALPM 并行存在；厂商按面板与系统需求选择启用哪些。' }
            ]
          }
        ]
      },

      /* ======================================================== 10 DSC / FEC */
      {
        id: 'dscfec',
        num: '10',
        title: 'DSC 与 FEC：压缩与纠错',
        titleEn: 'Compressed Stream Transport and FEC',
        lead: 'eDP 沿用 VESA DSC 视觉无损压缩，但有一个与 DP 不同的关键放松：DSC 在 eDP 中可以脱离 FEC 单独使用。',
        sections: [
          {
            id: 'dscfec-dsc',
            title: 'DSC 实现要点',
            titleEn: 'DSC Implementation',
            blocks: [
              { t: 'p', v: 'eDP 中 **DSC（Display Stream Compression）** 为可选。规范说明 DSC 版本用法、Sink 配置与**每线切片数（Slices/Line）**。' +
                '关键差异在于：**与 DP 标准不同，eDP 中 DSC 可以不带 FEC 使用**——这让内屏在不需要纠错开销时也能享受压缩带宽收益。' },
              { t: 'callout', kind: 'key', title: '脱离 FEC 是 eDP 的实用放松',
                v: 'DP 标准中 DSC 通常配合 FEC；eDP 允许 DSC 独立使用，省去 FEC 的额外开销与延迟，契合内屏短走线、低误码的环境。' }
            ]
          },
          {
            id: 'prpsr',
            title: 'DSC 在 PSR/PR 中的使用与 CRC',
            titleEn: 'DSC Use in PSR/PR and CRC',
            blocks: [
              { t: 'p', v: 'PSR1/PSR2/PR 中的 DSC 使用有专门章节：VSC SDP 在 DSC 配置下承载压缩流；PSR2/PR 的 Selective Update 在 DSC 配置下同样适用；' +
                '在 PSR 或 PR 期间用 **CRC** 核对压缩一致性——既包括源端 CRC 生成，也包括 Sink 端的 DSC 计算核对，' +
                '确保压缩帧在自刷新/回放期间无误。' },
              { t: 'callout', kind: 'info', title: '源/汇双侧 CRC 互相印证',
                v: '源端生成 CRC、汇端用 DSC 计算核对，两侧一致才确认 SU 正确落地；任一侧不符都会触发纠错或重传。' }
            ]
          },
          {
            id: 'fec',
            title: 'FEC 操作',
            titleEn: 'FEC Operation',
            blocks: [
              { t: 'p', v: '**FEC（Forward Error Correction，前向纠错）** 在 eDP 中为可选，当与 DSC 配合使用时遵循 DP 标准的定义。' +
                '它为主链路提供误码纠正能力，通常在更长走线或对误码更敏感的高速档位下启用。' },
              { t: 'callout', kind: 'info', title: 'FEC 与 DSC 的取舍',
                v: 'FEC 提供误码纠正但引入开销；eDP 把它设为可选，让厂商在短走线内屏可省、在长走线或高误码环境再启用。' }
            ]
          }
        ]
      },

      /* ======================================================== 11 显示控制 */
      {
        id: 'displaycontrol',
        num: '11',
        title: 'eDP 显示控制：AUX 背光、自检与多点触控',
        titleEn: 'eDP Display Control',
        lead: 'eDP 把「背光控制」也收编进 AUX 治理，并支持面板自检与 AUX 上的多点触控——让内屏的单线管理更彻底。',
        sections: [
          {
            id: 'backlight',
            title: '经 DPCD 的背光控制',
            titleEn: 'Backlight Control Using DPCD Registers',
            blocks: [
              { t: 'p', v: 'eDP 允许 Source **经 AUX_CH 控制显示背光**（也可走专用连接器信号），两者都在规范第 13.2 节定义。' +
                '背光控制涵盖亮度、使能、PWM 频率、PWD 混合，以及**区域背光（regional control）**——' +
                '也就是说，内屏的全局调光与分区调光都可以用同一根 AUX 线下发命令。' },
              { t: 'callout', kind: 'key', title: '背光不再需要独立控制线',
                v: '把背光纳入 AUX 治理，是 eDP 相对外部 DP 的实用简化之一：面板连接器引脚得以精简，系统布线也更干净。' }
            ]
          },
          {
            id: 'selftest',
            title: '面板自检',
            titleEn: 'Display Panel Self-Test',
            blocks: [
              { t: 'p', v: '**Display Panel Self-Test（面板自检）** 为可选功能，提供一个有用的系统诊断工具：' +
                '在出厂或现场排障时，可让面板自行跑测试图样，验证显示链路与面板本身是否正常，而无需完整视频路径参与。' },
              { t: 'callout', kind: 'key', title: '自检是出厂与返修的利器',
                v: '面板自检让工厂与售后能快速判断「屏本身坏」还是「视频链路坏」，降低排障成本、缩短返修周期。' }
            ]
          },
          {
            id: 'multitouch',
            title: 'AUX_CH 上的多点触控',
            titleEn: 'Multi-touch over AUX_CH',
            blocks: [
              { t: 'p', v: 'eDP 支持 **Multi-touch over AUX_CH**：把 HID（人机接口设备）类描述符与报告经 AUX 传输，' +
                '实现内屏触控。规范定义了设备发现、能力发现、启动模式、Sink 配置与寄存器访问规则，' +
                '并明确触控与键盘/鼠标的**并发**定义（如触控与键盘、触控与鼠标、以及三者同时的并发）。' },
              { t: 'callout', kind: 'info', title: '触控走 AUX 省下专用线',
                v: '把多点触控并入 AUX，意味着内屏无需额外触控排线；与 AUX 背光一样，都是 eDP 精简连接器的思路延续。' }
            ]
          }
        ]
      },

      /* ======================================================== 12 上电时序 */
      {
        id: 'powerseq',
        num: '12',
        title: '显示上电时序与连接器',
        titleEn: 'Display Power Sequencing and Connectors',
        lead: '内屏最怕「时序错一步，屏不亮或闪」。eDP 用 DPCD 声明上电/下电时序能力，并给出连接器的引脚分配约定。',
        sections: [
          {
            id: 'seq',
            title: '接口上电/下电序列',
            titleEn: 'Interface Power-on and Power-off Sequences',
            blocks: [
              { t: 'p', v: 'eDP 定义 **Display Power Sequencing**：面板上电需按「Panel Power On（面板供电）→ Backlight On（背光使能）→' +
                'Link Training（链路训练）→ Video（视频流）」的顺序进行；下电为反向。这套顺序保证面板在收到视频前已完成供电与背光就绪。' },
              { t: 'fig', id: 'powerSeq', caption: 'eDP 上电时序：面板供电、背光、链路训练、视频流的顺序约束（下电反向）' }
            ]
          },
          {
            id: 'caps',
            title: '上电时序能力声明',
            titleEn: 'Display Power Sequencing Capabilities',
            blocks: [
              { t: 'p', v: 'Sink 通过 **DPCD 寄存器**声明自己的上电时序能力（最小/最大上电延迟等），源据此安排 Panel Power 与背光之间的间隔，' +
                '避免早于面板就绪就发视频、或晚于就绪造成黑屏/闪烁。' },
              { t: 'callout', kind: 'key', title: '时序能力由 Sink 声明、源遵守',
                v: '上电延迟的上下限由 Sink 在 DPCD 上报，源必须在此窗口内安排 Panel Power 与背光间隔，这是 eDP 内屏可靠点亮的前提。' }
            ]
          },
          {
            id: 'connector',
            title: '连接器引脚分配（参考）',
            titleEn: 'Connector Pin Assignments (Informative)',
            blocks: [
              { t: 'p', v: '规范以资料性章节给出 eDP 连接器引脚分配：通常 1/2 通道实现用 **20 或 30 针**，4 通道实现用 **40 针**；' +
                '系统厂商据通道数、信号完整性、EMI、空间与成本自选。引脚分配是参考性建议，给板级设计提供落地依据。' },
              { t: 'callout', kind: 'info', title: '引脚数是通道数的函数',
                v: '20/30 针覆盖 1–2 通道实现、40 针覆盖 4 通道实现；通道越少引脚越省，但带宽上限也越低，需按分辨率与刷新率权衡。' }
            ]
          }
        ]
      },

      /* ======================================================== 13 总结 */
      {
        id: 'summary',
        num: '13',
        title: '总结：eDP 1.5a 的骨架与取舍',
        titleEn: 'Summary: The Skeleton and Trade-offs of eDP 1.5a',
        lead: '把前面十二章收拢：eDP 的本质是「以 DP 链路内核 + 一套嵌入式专属特性」，在电池续航与内屏集成度之间做工程折中。',
        sections: [
          {
            id: 'recap',
            title: '省电族是 eDP 的灵魂',
            titleEn: 'The Power-Saving Family Is the Soul of eDP',
            blocks: [
              { t: 'p', v: 'eDP 1.5a 最鲜明的特征，是一整套围绕**电池续航**的省电机制：**ALPM** 让主链路快速休眠/唤醒，' +
                '**PSR1/PSR2** 用 RFB 在静止画面下关断主链路，**Panel Replay** 在保持主链路开启的前提下自维持画面，**ARP** 给面板自适应刷新节奏。' +
                '它们与 **AUX_FRAME_SYNC**、**Adaptive-Sync** 协同，覆盖从「完全静止」到「逐帧变化」的全场景功耗治理。' },
              { t: 'list', items: [
                ['ALPM', '主链路快速休眠/唤醒，是省电第一环'],
                ['PSR1/PSR2', '靠 RFB 在静止画面下关断主链路（PSR2 支持局部 SU）'],
                ['Panel Replay', '主链路可保持开启的前提下自维持画面，回切更低延迟'],
                ['ARP', '面板自适应刷新节奏，与 PSR/PR 并列可选']
              ] }
            ]
          },
          {
            id: 'relation',
            title: '与 DP 的关系：复用内核，另立边界',
            titleEn: 'Its Relation to DP: Shared Core, Separate Boundary',
            blocks: [
              { t: 'list', items: [
                ['复用 DP v2.1 链路内核', '主链路/AUX/HPD 行为沿用 DP，除非 eDP 另定义'],
                ['用 ASSR 划清边界', '改 8b/10b 加扰种子，使 eDP 与 DP 设备链路层不兼容'],
                ['128b/132b 高于 HBR3 不在范围', '电气定义只到 HBR3 8.1 Gbps/lane'],
                ['不强制互操作', '厂商自选 Source/Sink，无 VESA 合规认证']
              ] },
              { t: 'callout', kind: 'info', title: 'MSO 与 AUX 背光是内屏专属优化',
                v: '把主链路拆成多 SST（MSO）以喂分段面板、把背光收编进 AUX 治理，都是为「设备内部屏接」这类场景量身定做。' }
            ]
          },
          {
            id: 'outlook',
            title: '适用场景与展望',
            titleEn: 'Use Cases and Outlook',
            blocks: [
              { t: 'p', v: 'eDP 主要服务笔记本、一体机以及其它嵌入式内屏；它不追求外部互连的普遍兼容，而追求在受限空间与有限电池下的最佳显示能效。' +
                '随着高分辨率、高刷新内屏普及，PSR2/Panel Replay 的局部刷新、DSC 压缩、以及 MSO 多流，会越来越成为旗舰内屏的标配——' +
                '理解 eDP 1.5a 的这套骨架，也就理解了现代笔记本「息屏不费电、亮屏又流畅」背后的接口机理。' },
              { t: 'quote', v: '最后重申取材边界：本页是面向中文读者的学习性原理整理，非 VESA 官方译文，也从未转载规范原表格与插图；' +
                '所有示意图均按规范描述的机理重绘，产品合规请以 eDP Standard v1.5a 原文与 eDP CTS 为最终依据。' }
            ]
          }
        ]
      }
    ]
  });
})(typeof window !== 'undefined' ? window : globalThis);
