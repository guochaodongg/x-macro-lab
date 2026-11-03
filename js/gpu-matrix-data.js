/* =============================================================================
 * gpu-matrix-data.js — Technology Blog 第八篇文章：显卡接口能力矩阵与 EDID 调试参考
 *                      （纯数据，无逻辑、不碰 DOM）
 *
 * 数据来源：NVIDIA / AMD / Intel 官方产品规格页与产品数据表、CTA-861.3 与 HDMI 2.1
 *           规范、Linux DRM 驱动源码（drm_edid.c / intel_dp.c / drm_dp_helper.h），
 *           以及 Corsair 的 DSC 技术说明。原始素材为一份面向 HT6316 系列
 *           （HT6316-EHDQ / HT6316-BHDQ）EDID 调试的工程速查表。
 *
 * 本文件按「新增文章只需往 BLOGData.posts 里加一条」的约定，在 edp-data.js
 * 之后加载，把文章对象 push 进 BLOGData.posts，并把本篇专用的内联 SVG 注册进
 * BLOGData.figures。正文块结构与 blog-data.js 完全一致（见该文件头部说明）。
 *
 * 版权说明：本篇是面向中文读者的**学习性工程整理**，非任何厂商或标准的官方译稿，
 * 也不转载厂商数据表与规范原文的表格与插图；所有表格均按公开数据重新整理为
 * 便于查表的形式，所有示意图均按所述机理自行重绘（纯内联 SVG，不请求任何外部
 * 资源）。显卡规格随厂商与具体 SKU 存在差异，实际以手中设备实测为准。
 * ========================================================================== */
(function (window) {
  'use strict';

  var D = window.BLOGData;
  if (!D || !D.posts || !D.figures) return;

  /* ------------------------------------------------------------- 示意图 SVG */
  /* 全部内联绘制，颜色走 CSS 变量，因此自动跟随明/暗主题，且不请求任何外部资源。 */
  var FIGURES = {

    /* 链路有效带宽阶梯：从 TMDS 到 DP UHBR13.5，标出 QHD@220 10bpc 的需求线 */
    bwLadder:
      '<svg class="bl-fig-svg" viewBox="0 0 640 300" role="img" aria-label="主流显示链路的有效带宽阶梯，标出 QHD@220 10bpc 的 26.57 Gbps 需求线">' +
      '<rect x="0" y="0" width="640" height="300" fill="var(--surface-2)"/>' +
      '<text x="16" y="26" fill="var(--text-soft)" font-size="12" font-weight="600">主流链路有效带宽阶梯（已扣编码开销）</text>' +
      /* 需求线 */
      '<line x1="150" y1="44" x2="150" y2="272" stroke="var(--accent)" stroke-width="2" stroke-dasharray="5 3"/>' +
      '<text x="154" y="58" fill="var(--accent)" font-size="10.5">QHD@220 10bpc 需求 26.57 Gbps</text>' +
      /* 阶梯条目 */
      '<rect x="16" y="72" width="120" height="24" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="26" y="88" fill="var(--text-soft)" font-size="10.5">HDMI 2.0b TMDS</text>' +
      '<text x="156" y="88" fill="var(--text-dim)" font-size="10.5">18.00 Gbps　✗ 物理不够</text>' +
      '<rect x="16" y="104" width="120" height="24" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="26" y="120" fill="var(--text-soft)" font-size="10.5">HDMI 2.1 FRL3</text>' +
      '<text x="156" y="120" fill="var(--text-dim)" font-size="10.5">21.33 Gbps　✗ 差 24.5%</text>' +
      '<rect x="16" y="136" width="120" height="24" rx="5" fill="var(--surface)" stroke="var(--warn)" stroke-width="1.4"/>' +
      '<text x="26" y="152" fill="var(--warn)" font-size="10.5">HDMI 2.1 FRL4</text>' +
      '<text x="156" y="152" fill="var(--warn)" font-size="10.5">28.44 Gbps　△ 余量 +6.6%（危险边界）</text>' +
      '<rect x="16" y="168" width="120" height="24" rx="5" fill="var(--surface)" stroke="var(--ok)" stroke-width="1.4"/>' +
      '<text x="26" y="184" fill="var(--ok)" font-size="10.5">HDMI 2.1 FRL6</text>' +
      '<text x="156" y="184" fill="var(--ok)" font-size="10.5">42.67 Gbps　✓ 余量 +60%</text>' +
      '<rect x="16" y="200" width="120" height="24" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="26" y="216" fill="var(--text-soft)" font-size="10.5">DP 1.4 HBR3</text>' +
      '<text x="156" y="216" fill="var(--text-dim)" font-size="10.5">25.92 Gbps　✗ 超 2.5%</text>' +
      '<rect x="16" y="232" width="120" height="24" rx="5" fill="var(--surface)" stroke="var(--ok)" stroke-width="1.4"/>' +
      '<text x="26" y="248" fill="var(--ok)" font-size="10.5">DP 2.1 UHBR13.5</text>' +
      '<text x="156" y="248" fill="var(--ok)" font-size="10.5">54.00 Gbps　✓ 远超需求</text>' +
      '<text x="16" y="278" fill="var(--text-dim)" font-size="10">口径：FRL 按 16b/18b，HBR3 按 8b/10b，UHBR13.5 按 128b/132b 扣除编码开销</text>' +
      '</svg>',

    /* FRL 档位阶梯：HDMI 2.1 是一个特性集合，六档 FRL 对应不同有效带宽 */
    frlLadder:
      '<svg class="bl-fig-svg" viewBox="0 0 640 226" role="img" aria-label="HDMI 2.1 的六个 FRL 档位与各自有效带宽">' +
      '<rect x="0" y="0" width="640" height="226" fill="var(--surface-2)"/>' +
      '<text x="16" y="26" fill="var(--text-soft)" font-size="12" font-weight="600">「HDMI 2.1」是一个可选特性集合：FRL 分六档，标签相同、带宽可差一倍</text>' +
      '<line x1="16" y1="196" x2="624" y2="196" stroke="var(--border-strong)"/>' +
      '<text x="16" y="214" fill="var(--text-dim)" font-size="10">← 档位越高带宽越大，但「HDMI 2.1」这个标签本身不告诉你落在哪一档 →</text>' +
      '<rect x="16" y="52" width="94" height="34" rx="6" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="63" y="68" fill="var(--text-soft)" font-size="10.5" text-anchor="middle">FRL1</text>' +
      '<text x="63" y="80" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">3G×3</text>' +
      '<text x="63" y="116" fill="var(--text-dim)" font-size="10" text-anchor="middle">10.8 Gbps</text>' +
      '<rect x="118" y="52" width="94" height="34" rx="6" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="165" y="68" fill="var(--text-soft)" font-size="10.5" text-anchor="middle">FRL2</text>' +
      '<text x="165" y="80" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">3G×3 + 6G×3</text>' +
      '<text x="165" y="116" fill="var(--text-dim)" font-size="10" text-anchor="middle">14.4 Gbps</text>' +
      '<rect x="220" y="52" width="94" height="34" rx="6" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="267" y="68" fill="var(--text-soft)" font-size="10.5" text-anchor="middle">FRL3</text>' +
      '<text x="267" y="80" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">6G×3</text>' +
      '<text x="267" y="116" fill="var(--text-dim)" font-size="10" text-anchor="middle">21.3 Gbps</text>' +
      '<rect x="322" y="52" width="94" height="34" rx="6" fill="var(--surface)" stroke="var(--warn)" stroke-width="1.4"/>' +
      '<text x="369" y="68" fill="var(--warn)" font-size="10.5" text-anchor="middle">FRL4</text>' +
      '<text x="369" y="80" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">8G×4</text>' +
      '<text x="369" y="116" fill="var(--warn)" font-size="10" text-anchor="middle">28.4 Gbps</text>' +
      '<rect x="424" y="52" width="94" height="34" rx="6" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="471" y="68" fill="var(--text-soft)" font-size="10.5" text-anchor="middle">FRL5</text>' +
      '<text x="471" y="80" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">10G×4</text>' +
      '<text x="471" y="116" fill="var(--text-dim)" font-size="10" text-anchor="middle">35.2 Gbps</text>' +
      '<rect x="526" y="52" width="94" height="34" rx="6" fill="var(--surface)" stroke="var(--ok)" stroke-width="1.4"/>' +
      '<text x="573" y="68" fill="var(--ok)" font-size="10.5" text-anchor="middle">FRL6</text>' +
      '<text x="573" y="80" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">12G×4</text>' +
      '<text x="573" y="116" fill="var(--ok)" font-size="10" text-anchor="middle">42.7 Gbps</text>' +
      '<text x="16" y="150" fill="var(--text-soft)" font-size="10.5">同一块卡标称「HDMI 2.1」，可能只落到 FRL3 甚至 FRL2。</text>' +
      '<text x="16" y="170" fill="var(--text-soft)" font-size="10.5">可靠判据只有一条：读显示器 EDID 的 HF-VSDB / HF-SCDB 里的 Max_FRL_Rate 字段（1~6）。</text>' +
      '</svg>',

    /* EDID 结构定位图：基础块 + 扩展块中与调试相关的字节位置 */
    edidMap:
      '<svg class="bl-fig-svg" viewBox="0 0 640 300" role="img" aria-label="EDID 基础块与 CTA 扩展块中与调试相关的字节位置">' +
      '<rect x="0" y="0" width="640" height="300" fill="var(--surface-2)"/>' +
      '<text x="16" y="26" fill="var(--text-soft)" font-size="12" font-weight="600">EDID 中与「模式能否被识别」直接相关的字节位置</text>' +
      /* 基础块 */
      '<text x="16" y="58" fill="var(--text-soft)" font-size="11" font-weight="600">基础块（128 字节）</text>' +
      '<rect x="16" y="66" width="608" height="30" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<rect x="16" y="66" width="76" height="30" fill="var(--accent)" fill-opacity="0.16"/>' +
      '<text x="54" y="85" fill="var(--text-soft)" font-size="9.5" text-anchor="middle">0~15 头</text>' +
      '<rect x="92" y="66" width="76" height="30" fill="var(--warn)" fill-opacity="0.2"/>' +
      '<text x="130" y="85" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">byte 20 视频输入</text>' +
      '<text x="176" y="85" fill="var(--text-dim)" font-size="9.5">byte 20：bit7 数字输入 → bit6-4 位深 → bit3 色彩格式 → bit3-0 接口类型</text>' +
      /* CTA 扩展块 */
      '<text x="16" y="132" fill="var(--text-soft)" font-size="11" font-weight="600">CTA 扩展块（HF-VSDB / HF-SCDB，tag 0x03）</text>' +
      '<rect x="16" y="140" width="608" height="30" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<rect x="16" y="140" width="94" height="30" fill="var(--accent)" fill-opacity="0.16"/>' +
      '<text x="63" y="159" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">byte 7 FRL/SCDC</text>' +
      '<rect x="110" y="140" width="94" height="30" fill="var(--warn)" fill-opacity="0.2"/>' +
      '<text x="157" y="159" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">byte 11-12 DSC</text>' +
      '<rect x="204" y="140" width="94" height="30" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="251" y="159" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">Video Capability</text>' +
      '<text x="310" y="159" fill="var(--text-dim)" font-size="9.5">byte 7 高 4 位 = Max_FRL_Rate；byte 7 bit2 = SCDC_Present；byte 11 五位 DSC 字段</text>' +
      /* 0xFD 描述符 */
      '<text x="16" y="206" fill="var(--text-soft)" font-size="11" font-weight="600">Display Range Limits 描述符（tag 0xFD）—— 最容易被忽视的致命项</text>' +
      '<rect x="16" y="214" width="608" height="30" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<rect x="16" y="214" width="94" height="30" fill="var(--err)" fill-opacity="0.18"/>' +
      '<text x="63" y="233" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">byte 9 最大像素时钟</text>' +
      '<text x="122" y="233" fill="var(--text-dim)" font-size="9.5">单位 10 MHz；QHD@220 的 885.6 MHz 应填 89。写小 → Intel 严格剪枝、NVIDIA 宽松放行</text>' +
      /* DPCD */
      '<text x="16" y="280" fill="var(--text-soft)" font-size="11" font-weight="600">DPCD（DP 侧，独立于 EDID）</text>' +
      '<text x="140" y="280" fill="var(--text-dim)" font-size="9.5">0x060 bit0 = DSC 解码支持；0x001 / 0x002 = 最大链路速率 / 通道数</text>' +
      '</svg>',

    /* 判定决策流程：从现象反推责任方 */
    triageFlow:
      '<svg class="bl-fig-svg" viewBox="0 0 640 320" role="img" aria-label="现象到责任方的判定决策流程">' +
      '<rect x="0" y="0" width="640" height="320" fill="var(--surface-2)"/>' +
      '<text x="16" y="26" fill="var(--text-soft)" font-size="12" font-weight="600">判定流程：先看源端能力，再看 EDID 声明</text>' +
      /* 起点 */
      '<rect x="16" y="44" width="140" height="38" rx="7" fill="var(--accent)" fill-opacity="0.18" stroke="var(--accent)"/>' +
      '<text x="86" y="62" fill="var(--accent)" font-size="10.5" text-anchor="middle">模式识别不到</text>' +
      '<text x="86" y="76" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">或位深不符</text>' +
      '<line x1="156" y1="63" x2="196" y2="63" stroke="var(--border-strong)"/>' +
      '<polygon points="196,44 256,44 276,63 256,82 196,82 176,63" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="226" y="60" fill="var(--text-soft)" font-size="10" text-anchor="middle">换一台能力</text>' +
      '<text x="226" y="73" fill="var(--text-soft)" font-size="10" text-anchor="middle">远超需求的卡</text>' +
      '<line x1="276" y1="63" x2="316" y2="63" stroke="var(--border-strong)"/>' +
      /* 分支上 */
      '<rect x="316" y="30" width="150" height="34" rx="6" fill="var(--ok)" fill-opacity="0.16" stroke="var(--ok)"/>' +
      '<text x="391" y="45" fill="var(--ok)" font-size="10" text-anchor="middle">仍然识别不到</text>' +
      '<text x="391" y="58" fill="var(--text-dim)" font-size="9" text-anchor="middle">→ 100% 是 EDID 写错</text>' +
      '<line x1="316" y1="63" x2="316" y2="100" stroke="var(--border-strong)"/>' +
      '<rect x="316" y="100" width="150" height="34" rx="6" fill="var(--warn)" fill-opacity="0.16" stroke="var(--warn)"/>' +
      '<text x="391" y="115" fill="var(--warn)" font-size="10" text-anchor="middle">能识别但位深降级</text>' +
      '<text x="391" y="128" fill="var(--text-dim)" font-size="9" text-anchor="middle">→ 带宽差一点点</text>' +
      '<line x1="316" y1="117" x2="316" y2="150" stroke="var(--border-strong)"/>' +
      '<rect x="316" y="150" width="150" height="34" rx="6" fill="var(--err)" fill-opacity="0.14" stroke="var(--err)"/>' +
      '<text x="391" y="165" fill="var(--err)" font-size="10" text-anchor="middle">完全不出现</text>' +
      '<text x="391" y="178" fill="var(--text-dim)" font-size="9" text-anchor="middle">→ 物理带宽不够</text>' +
      /* 右侧动作 */
      '<rect x="486" y="30" width="138" height="104" rx="7" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="498" y="48" fill="var(--text-soft)" font-size="10" font-weight="600">下一步动作</text>' +
      '<text x="498" y="66" fill="var(--text-dim)" font-size="9.5">上：核对 0xFD byte 9</text>' +
      '<text x="498" y="80" fill="var(--text-dim)" font-size="9.5">与 CTA 位深声明</text>' +
      '<text x="498" y="98" fill="var(--text-dim)" font-size="9.5">中：降位深或降刷新率</text>' +
      '<text x="498" y="116" fill="var(--text-dim)" font-size="9.5">下：换链路验证</text>' +
      '<line x1="466" y1="47" x2="486" y2="47" stroke="var(--border-strong)"/>' +
      '<line x1="466" y1="117" x2="486" y2="117" stroke="var(--border-strong)"/>' +
      '<line x1="466" y1="167" x2="486" y2="167" stroke="var(--border-strong)"/>' +
      /* 底部提示 */
      '<rect x="16" y="206" width="452" height="52" rx="7" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="30" y="226" fill="var(--text-soft)" font-size="10.5" font-weight="600">G6 组是黄金实验</text>' +
      '<text x="30" y="243" fill="var(--text-dim)" font-size="10">用 Arc B580 / RX 7900 XTX 这类源端能力远超需求的卡做对照，</text>' +
      '<text x="30" y="256" fill="var(--text-dim)" font-size="10">最快判定问题归属：源端能力不足，还是 EDID 声明写错。</text>' +
      '<text x="16" y="290" fill="var(--text-dim)" font-size="9.5">注：同一份 EDID 在 NVIDIA 与 Intel 上的表现可能不同——前者带宽不足时降位深，后者直接剪枝该模式。</text>' +
      '</svg>',

    /* G1-G8 测试矩阵分组图 */
    groupMatrix:
      '<svg class="bl-fig-svg" viewBox="0 0 640 286" role="img" aria-label="按能力等级划分的 G1 到 G8 八组测试矩阵">' +
      '<rect x="0" y="0" width="640" height="286" fill="var(--surface-2)"/>' +
      '<text x="16" y="26" fill="var(--text-soft)" font-size="12" font-weight="600">按能力等级分组的测试矩阵：从「物理不可能」到「远超需求」</text>' +
      '<rect x="16" y="42" width="86" height="26" rx="5" fill="var(--err)" fill-opacity="0.16"/>' +
      '<text x="59" y="59" fill="var(--err)" font-size="10.5" text-anchor="middle">G1 · 18 Gbps</text>' +
      '<text x="112" y="59" fill="var(--text-dim)" font-size="10">HDMI 2.0b TMDS → QHD@220 物理不出现（基准组）</text>' +
      '<rect x="16" y="74" width="86" height="26" rx="5" fill="var(--warn)" fill-opacity="0.16"/>' +
      '<text x="59" y="91" fill="var(--warn)" font-size="10.5" text-anchor="middle">G2 · 25.92 Gbps</text>' +
      '<text x="112" y="91" fill="var(--text-dim)" font-size="10">DP 1.4a → 出现但降 8bit（验证降位深路径）</text>' +
      '<rect x="16" y="106" width="86" height="26" rx="5" fill="var(--warn)" fill-opacity="0.16"/>' +
      '<text x="59" y="123" fill="var(--warn)" font-size="10.5" text-anchor="middle">G3 · 21.33 Gbps</text>' +
      '<text x="112" y="123" fill="var(--text-dim)" font-size="10">HDMI FRL3 → 被剪枝或降级（验证 Max_FRL_Rate 读取）</text>' +
      '<rect x="16" y="138" width="86" height="26" rx="5" fill="var(--accent)" fill-opacity="0.2"/>' +
      '<text x="59" y="155" fill="var(--accent)" font-size="10.5" text-anchor="middle">G4 · 28.44 Gbps</text>' +
      '<text x="112" y="155" fill="var(--text-dim)" font-size="10">HDMI FRL4 → 勉强通过，余量 +6.6%（最高优先级实测）</text>' +
      '<rect x="16" y="170" width="86" height="26" rx="5" fill="var(--ok)" fill-opacity="0.14"/>' +
      '<text x="59" y="187" fill="var(--ok)" font-size="10.5" text-anchor="middle">G5 · 42.67 Gbps</text>' +
      '<text x="112" y="187" fill="var(--text-dim)" font-size="10">HDMI FRL6 → 正常，余量 +60%（上界基准）</text>' +
      '<rect x="16" y="202" width="86" height="26" rx="5" fill="var(--ok)" fill-opacity="0.14"/>' +
      '<text x="59" y="219" fill="var(--ok)" font-size="10.5" text-anchor="middle">G6 · 54 Gbps</text>' +
      '<text x="112" y="219" fill="var(--text-dim)" font-size="10">DP 2.1 UHBR13.5 → 黄金实验：仍剪枝则 100% 是 EDID</text>' +
      '<rect x="16" y="234" width="86" height="26" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="59" y="251" fill="var(--text-soft)" font-size="10.5" text-anchor="middle">G7 · 18 Gbps</text>' +
      '<text x="112" y="251" fill="var(--text-dim)" font-size="10">Intel 核显仅 TMDS → 验证 TMDS 上限识别</text>' +
      '<rect x="16" y="266" width="86" height="14" rx="4" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="112" y="277" fill="var(--text-dim)" font-size="10">G8 · 25.92 Gbps：专业卡纯 DP 路径隔离测试，排除 HDMI 侧干扰</text>' +
      '</svg>'
  };

  Object.keys(FIGURES).forEach(function (k) { D.figures[k] = FIGURES[k]; });

  /* ---------------------------------------------------------------- 术语表 */
  var GLOSSARY = [
    ['FRL', 'FRL（Fixed Rate Link）', 'HDMI 2.0 之后的固定速率链路模式，分 1~6 档；有效带宽由「每 lane 速率 × lane 数」决定，源端与显示器必须同时支持同一档位。'],
    ['TMDS', 'TMDS（差分高速编码）', 'HDMI 2.0 及以前使用的编码方式，单通道最高 18 Gbps；FRL 之外还用于 4K@60 等模式。'],
    ['Max_FRL_Rate', '最大 FRL 档位', 'EDID 的 CTA 扩展块（HF-VSDB / HF-SCDB）byte 7 高 4 位，取值 1~6；显示器声明它能接收的最高 FRL 档位，源端不会超过它。'],
    ['SCDC', 'SCDC（HDMI 状态与控制通道）', 'HDMI 2.0 引入的双向辅助通道，承载 FRL 模式切换与 Scrambling 状态；EDID 里由 byte 7 bit2 的 SCDC_Present 声明。'],
    ['DSC', 'DSC（显示流压缩）', 'VESA 的视觉无损压缩标准；在 HDMI 与 DP 上是两套独立能力，源端支持不等于另一侧支持。'],
    ['DPCD', 'DPCD（DisplayPort 配置数据）', 'DP 侧的寄存器空间，独立于 EDID；0x060 声明 DSC 能力，0x001/0x002 声明最大链路速率与通道数。'],
    ['CTA-861.3', 'CTA-861.3', '消费者电子协会关于视频格式与 EDID 扩展块的规范，定义了 CTA-861 扩展块与 Video Capability Descriptor。'],
    ['HF-VSDB', 'HF-VSDB（HDMI 论坛视频特定数据块）', 'CTA 扩展块中由 HDMI Forum 定义的子结构，承载 FRL 与 SCDC 声明。'],
    ['HF-SCDB', 'HF-SCDB', 'HF-VSDB 的后继结构，SCDC 信息取代了部分旧字段。'],
    ['Video Capability Descriptor', '视频能力描述符', 'CTA 扩展块中 tag 0x02 的数据块，用位的方式声明支持的位深与 YCbCr 4:2:0 格式。'],
    ['Display Range Limits', '显示范围限制描述符', 'EDID 中 tag 0xFD 的可选描述符，声明最大像素时钟等范围限制；取值偏小会让部分驱动严格剪枝模式。'],
    ['Max Pixel Clock', '最大像素时钟', 'Display Range Limits 描述符 byte 9 的字段，单位是 10 MHz；是驱动判定模式是否越界的直接依据。'],
    ['EDID 1.4', 'EDID 1.4', 'EDID 的 1.4 版本，规定了详细时序（DTD）与范围限制描述符之间的优先关系，但驱动实现严格程度不一。'],
    ['DTD', 'DTD（详细时序描述符）', 'EDID 基础块中的 18 字节结构，描述一个具体显示模式的时序；本身不携带位深字段，位深继承自视频输入定义或 CTA 描述符。'],
    ['Effective bandwidth', '有效带宽', '扣除编码开销后真正可承载的图像数据速率：FRL 按 16b/18b、HBR3 按 8b/10b、UHBR13.5 按 128b/132b 计算。'],
    ['HBR3', 'HBR3（8.1 Gbps/lane）', 'DP 1.4 引入的链路速率，4 lane 合计 32.4 Gbps，扣除 8b/10b 后有效 25.92 Gbps。'],
    ['UHBR13.5', 'UHBR13.5（13.5 Gbps/lane）', 'DP 2.1 引入的最高链路速率，4 lane 合计 54 Gbps，扣除 128b/132b 后有效 54 Gbps（编码开销极小）。'],
    ['Pixel clock', '像素时钟', '像素传输速率，等于水平总像素 × 垂直总像素 × 刷新率；决定一个模式需要多少链路带宽。'],
    ['Pruning', '剪枝', '驱动在枚举模式时主动剔除它认为链路无法承载的模式；EDID 声明的位深或范围限制偏小时会被触发。'],
    ['Bit-depth fallback', '位深降级', '模式仍被保留，但色深从声明值降到链路能承载的档位（如 10bit 降到 8bit）。'],
    ['EDID override', 'EDID 覆盖', '用工具改写显示器 EDID 中特定字节以改变驱动行为，常用于定位问题归属；改动前必须备份并准备安全模式恢复路径。'],
    ['CRU', 'CRU（Custom Resolution Utility）', 'Windows 下常用的 EDID 编辑工具，可导出 EDID 为文本、覆写扩展块并添加自定义时序。'],
    ['edid-decode', 'edid-decode', 'Linux 下的 EDID 解析工具，把二进制 EDID 展开成可读文本，并可做合规性检查。'],
    ['Linux DRM', 'Linux DRM 子系统', '内核里的显示子系统，负责 EDID 解析与模式枚举；drm_edid.c 与 intel_dp.c 等源码是理解驱动行为的直接依据。'],
    ['i915', 'i915 驱动', 'Intel 的开源显卡驱动，其模式剪枝与位深决策逻辑可通过 /sys/kernel/debug/dri 下的调试信息观察。'],
    ['HPD', 'HPD（热插拔检测）', '接收端向源端上报连接状态与中断信号的信号线；抖动会导致偶发闪黑与短暂无信号。'],
    ['VRR', 'VRR（可变刷新率）', '让显示器跟随源端输出速率动态刷新；跨越带宽阈值时可能引发闪黑，排查时应先关闭验证。'],
    ['MPRT', 'MPRT（运动画面响应时间）', '厂商用运动补偿降低拖影的技术，会改变时序与带宽需求，测试时需注明是否开启。'],
    ['Intel iGPU', 'Intel 核显', '集成在处理器中的显示单元；主流型号的物理层仅支持 TMDS，规格表上的「HDMI 2.1」不携带 FRL 能力。'],
    ['AIB', 'AIB（板卡 partner）', '为 NVIDIA / AMD 代工并贴牌的板卡厂商，可能调整接口配置，规格以公版为基准、实测为准。']
  ];

  /* ------------------------------------------------------------------ 文章 */
  D.posts.push({
    id: 'gpu-matrix',
    title: '显卡接口能力矩阵与 EDID 调试参考',
    titleEn: 'GPU Display Interface Capability Matrix & EDID Debugging Reference',
    subtitle: '当「同一台显示器在 A 主机上能识别、在 B 主机上识别不到」时，到底是源端能力不够，还是 EDID 写错了？' +
      '本文把市面主流显卡的接口能力、链路有效带宽、QHD 各刷新率的带宽余量、EDID 里那几个真正决定成败的字节，' +
      '以及八组测试矩阵整理成一套可直接查表与执行的调试方法。',
    category: '接口与调试',
    tags: ['显卡接口', 'EDID', 'HDMI 2.1', 'FRL', 'DSC', 'DPCD', '带宽预算', '调试方法'],
    source: {
      name: 'NVIDIA / AMD / Intel 官方规格页',
      label: 'CTA-861.3 · HDMI 2.1 规范 · Linux DRM 源码',
      url: 'https://www.nvidia.com/en-us/geforce/graphics-cards/',
      note: '本篇是面向中文工程师的学习性工程整理，非厂商或标准的官方译稿，也未转载厂商数据表与规范原文的插图与表格；' +
        '数据来自 NVIDIA / AMD / Intel 官方产品规格页、CTA-861.3 与 HDMI 2.1 规范、Linux DRM 驱动源码，' +
        '显卡规格随厂商与具体 SKU 存在差异，实际以手中设备实测为准。'
    },
    license: '厂商产品页与标准规范原文的知识产权归各自所有者；本页为学习用途的中文工程整理，' +
      '只复述接口能力口径与调试方法，未转载厂商数据表与规范原文的插图、表格，示意图均按所述机理自行重绘（纯内联 SVG）。',
    summary: '一份面向测试设备研发工程师的显卡源端能力与 EDID 声明交叉验证速查：覆盖 HDMI FRL 六档与 DP 各链路速率的有效带宽口径、' +
      '市面主流显卡的接口能力总表、QHD 各刷新率在 DP 1.4 HBR3 与 HDMI FRL3/FRL4/FRL6 上的带宽余量对照、' +
      'EDID 中真正影响模式枚举的五个位置（HF-VSDB 的 Max_FRL_Rate 与 SCDC_Present、基础块 byte 20 的位深与接口类型、' +
      'CTA Video Capability Descriptor 的位深位、Display Range Limits 的 Max Pixel Clock、DPCD 0x060 的 DSC 位）、' +
      '按能力等级划分的 G1–G8 测试矩阵，以及一套「现象 → 原因 → 下一步动作」的判定流程。',
    glossary: GLOSSARY,
    chapters: [
      {
        id: 'why',
        num: '1',
        title: '为什么「HDMI 2.1」不能当带宽用',
        titleEn: 'Why the "HDMI 2.1" Label Tells You Nothing About Bandwidth',
        lead: '「某分辨率在 A 主机上能识别、在 B 主机上识别不到」这类问题的第一分岔点，永远是源端能力与 EDID 声明的比对。而比对的第一步，是先承认一个反直觉的事实：接口版本标签本身几乎不携带可用带宽的信息。',
        sections: [
          {
            id: 'frl-is-a-set',
            title: 'HDMI 2.1 是一个可选特性集合',
            titleEn: 'HDMI 2.1 Is a Set of Optional Features',
            blocks: [
              { t: 'p', v: 'HDMI 2.1 不是一个「带宽档位」，而是**一组可选特性**的集合公告。真正决定带宽的是其中的 FRL（Fixed Rate Link）落在哪一档——FRL 分 6 档，从 FRL1 到 FRL6，每档对应不同的每 lane 速率与 lane 数组合。' },
              { t: 'p', v: '这意味着：标称「HDMI 2.1」的显卡，可能只支持到 FRL3（有效 21.3 Gbps），而不是 FRL6（有效 42.7 Gbps）。**两者标签完全一样，带宽却相差一倍。**' },
              { t: 'fig', id: 'frlLadder', caption: 'HDMI 2.1 的六个 FRL 档位。「HDMI 2.1」这个标签不告诉你落在哪一档，必须另找判据。' },
              { t: 'callout', kind: 'key', title: '唯一可靠的判据', v: '读显示器 EDID 的 HF-VSDB / HF-SCDB 里的 `Max_FRL_Rate` 字段（取值 1~6）。这是显示器自己能接收的最高 FRL 档位——源端一定会以 EDID 声明为准，不会超过它。' },
              { t: 'p', v: '反过来这条链路也成立：显示器的 `Max_FRL_Rate` 声明为 4，那么即使源端是 FRL6 满血卡，实际链路也只会跑在 FRL4（28.4 Gbps）。**在 FRL4 上 QHD@220 的 10bit 只能勉强通过，余量 +6.6%**，这就是很多「行为不一致」现象的总根源。' },
              { t: 'list', items: [
                '判源端能力：查显卡官方规格页里的 FRL 档位或最大分辨率上限；',
                '判显示器能力：查 EDID 的 `Max_FRL_Rate`；',
                '判实际链路：两者取**小**，再据此算带宽余量；',
                '判是否可降级：NVIDIA 策略是带宽不足时降位深，Intel 策略往往是直接剪枝——同一份 EDID，两种行为。'
              ] }
            ]
          },
          {
            id: 'intel-tmds',
            title: 'Intel 核显的「HDMI 2.1」为什么是误导',
            titleEn: 'Why Intel iGPUs Advertise "HDMI 2.1" Without FRL',
            blocks: [
              { t: 'p', v: 'Intel 官方在开发者社区明确答复过：目前没有任何商用 Intel 集成显卡的物理层（PHY）支持 FRL 协议，所有 Intel iGPU 只能提供 HDMI 2.1 TMDS（18 Gbps）。' },
              { t: 'quote', v: '目前没有任何商用 Intel 集成显卡的物理层（PHY）支持 FRL 协议……所有 Intel iGPU 只能提供 HDMI 2.1 TMDS（18 Gbps）。', by: 'Intel 开发者社区答复' },
              { t: 'p', v: '问题在于规格表上写的就是「HDMI 2.1」。UHD 770 / 775 / Iris Xe 的标称最高分辨率只有 4096×2160@60Hz——**这就是 TMDS 的指纹**。看 Intel 规格表时，「HDMI 2.1」三个字在核显上是误导性的，必须看分辨率上限。' },
              { t: 'callout', kind: 'warn', title: '辨识方法', v: '核显若写着「HDMI 2.1」但最高分辨率只有 4K@60Hz，说明它只有 TMDS。真正的 FRL 源端在 4K@60 之上还能给出 4K@120 或 8K@60 之类的档位。' },
              { t: 'p', v: '这条区分在实测里非常关键：Intel 核显走 HDMI 时，QHD@220 是**物理不可能**，而不是「识别不到」。把这种物理上限误判为 EDID 错误，会把排查方向带偏很久。' },
              { t: 'p', v: '另外要注意 Intel 核显**均不支持 DSC**——这直接决定 EDID 里那些 DSC 字段应该怎么填。' }
            ]
          },
          {
            id: 'dsc-two-ways',
            title: 'DSC 在 HDMI 与 DP 上是两套独立能力',
            titleEn: 'DSC Is Two Independent Capabilities on HDMI and DP',
            blocks: [
              { t: 'p', v: '同一张卡，DP 支持 DSC **不代表** HDMI 支持。这直接决定 EDID 里的 DSC 字段该写在哪一侧、以及要不要写。' },
              { t: 'list', items: [
                '**NVIDIA RTX 40 / 30 系**：DP 1.4a 与 HDMI 2.1 双口均支持 DSC 1.2a；',
                '**NVIDIA RTX 20 系 / GTX 16 系**：**仅 DP** 支持 DSC，HDMI 侧没有承载机制；',
                '**AMD RX 7000 / 6000 系**：DP 2.1/1.4a 与 HDMI 2.1 双口支持；',
                '**AMD RX 5000 系**：**仅 DP** 支持，且 HDMI 仅 2.0b；',
                '**Intel 核显**：均不支持 DSC。'
              ] },
              { t: 'p', v: '对无 DSC 能力的芯片，正确做法是把 EDID 的 HF-VSDB byte 11 的五个 DSC 位**全部清零**，同时把 DPCD 0x060 的 bit0/bit1 也置 0。' },
              { t: 'callout', kind: 'warn', title: '不一致的后果', v: 'EDID 写干净但 DPCD 置位，源端仍会启用 DSC——此时 Sink 端没有解码器，表现为「模式在列表里但直接黑屏」。这类现象最容易误判为线材或显示器故障。' },
              { t: 'p', v: '反过来，若 EDID 与 DPCD 都声明了 DSC 而源端确实开启，Sink 又没有解码能力，症状就是黑屏而非「不出现」——**「黑屏」与「识别不到」指向完全不同的排查方向**。' }
            ]
          },
          {
            id: 'max-res-means-dp',
            title: '「最大分辨率」通常说的是 DP 口',
            titleEn: 'The Headline Max Resolution Usually Refers to DisplayPort',
            blocks: [
              { t: 'p', v: 'NVIDIA 规格表顶部那个 7680×4320@120Hz 是 **DP 口**的指标，不是整卡所有输出口的统一上限。' },
              { t: 'p', v: '典型例子：1660 Ti / 2060 Super 走 HDMI 时上限是 4K@60Hz（TMDS 18 Gbps），但同一张卡走 DP 可以跑到 8K。' },
              { t: 'callout', kind: 'info', title: '读规格表的正确姿势', v: '先确认这张表描述的是**哪个物理口**。规格页经常只给「最高分辨率」，而这个数字对应的是带宽最高的那条链路（通常是 DP）。要把表格套用到 HDMI 上，必须先回到 FRL 档位重新算。' },
              { t: 'p', v: '这个坑在实测中表现为：拿到一张「支持 8K」的卡，接 HDMI 后 4K@240 死活上不去。源端没问题，是链路档位不够。' }
            ]
          }
        ]
      },
      {
        id: 'matrix',
        num: '2',
        title: '市面显卡接口能力总表',
        titleEn: 'The Capability Matrix Across Mainstream GPUs',
        lead: '下面这张表是全文的基座：把市面主流显卡的 HDMI 档位、DP 版本、实际有效带宽与 DSC 支持情况摊平成可查的形式。理解这张表的读法，比记住某一行更重要——它决定了你能否在不看规格页的情况下快速判断一个模式的可��性。',
        sections: [
          {
            id: 'how-to-read',
            title: '怎么读这张表：有效带宽是扣除编码开销后的数',
            titleEn: 'How to Read the Table: Effective Bandwidth Is Post-Encoding',
            blocks: [
              { t: 'p', v: '表里的「有效带宽」不是标称值，而是**扣除编码开销后真正能承载图像数据**的速率。三种口径分别是：' },
              { t: 'list', items: [
                'HDMI FRL：按 16b/18b 编码，即 ×16/18；',
                'DP HBR3：按 8b/10b 编码，即 ×0.8；',
                'DP UHBR13.5：按 128b/132b 编码，开销极小。'
              ] },
              { t: 'p', v: '这个口径差异很关键：DP 1.4 HBR3 的标称 32.4 Gbps，有效只有 25.92 Gbps；而 HDMI FRL6 的标称 48 Gbps，有效是 42.67 Gbps。**两者标称接近，有效值却差 65%。**' },
              { t: 'callout', kind: 'key', title: '为什么按有效带宽比', v: 'EDID 声明的位深、驱动判断的余量、线材实际的损耗，都是作用在「有效带宽」这个数上。用标称值算余量会系统性高估能力。' },
              { t: 'fig', id: 'bwLadder', caption: '主流链路的有效带宽阶梯，标出 QHD@220 10bpc 的 26.57 Gbps 需求线。' }
            ]
          },
          {
            id: 'nvidia',
            title: 'NVIDIA 桌面独显与专业卡',
            titleEn: 'NVIDIA Desktop and Workstation Cards',
            blocks: [
              { t: 'p', v: 'NVIDIA 桌面的分界线很清楚：**Turing 及更早只有 HDMI 2.0b**，Ampere 起才有真 HDMI 2.1 FRL；而 FRL 档位还随型号进一步分化。' },
              { t: 'table', head: ['显卡', '架构', 'HDMI', 'FRL 档位', 'HDMI 有效带宽', 'DP', 'DP 有效带宽', 'DSC'], rows: [
                ['GTX 1660 Ti / 1660 Super', 'Turing', '2.0b', '无', '18 Gbps', '1.4a', '25.92 Gbps', '1.2 · 仅 DP'],
                ['RTX 2060 / 2060 Super / 2060 Ti', 'Turing', '2.0b', '无', '18 Gbps', '1.4 / 1.4a', '25.92 Gbps', '1.2 · 仅 DP'],
                ['RTX 2080 / 2080 Ti / TITAN RTX / TITAN V', 'Turing', '2.0b', '无', '18 Gbps', '1.4 / 1.4a', '25.92 Gbps', '1.2 · 仅 DP'],
                ['RTX 3060 / 3060 Ti / 3050', 'Ampere', '2.1', 'FRL3', '21.33 Gbps', '1.4a', '25.92 Gbps', '1.2 · DP+HDMI'],
                ['RTX 3070 / 3080 / 3080 Ti', 'Ampere', '2.1', 'FRL4~6', '28.4–42.7 Gbps', '1.4a', '25.92 Gbps', '1.2 · DP+HDMI'],
                ['RTX 3090 / 3090 Ti', 'Ampere', '2.1', 'FRL6 满血', '42.67 Gbps', '1.4a', '25.92 Gbps', '1.2 · DP+HDMI'],
                ['RTX 4060 / 4060 Ti', 'Ada', '2.1a', 'FRL3', '21.33 Gbps', '1.4a', '25.92 Gbps', '1.2 · DP+HDMI'],
                ['RTX 4070 / 4070 Ti', 'Ada', '2.1a', 'FRL4~6', '28.4–42.7 Gbps', '1.4a', '25.92 Gbps', '1.2 · DP+HDMI'],
                ['RTX 4080 / 4090', 'Ada', '2.1a', 'FRL6 满血', '42.67 Gbps', '1.4a', '25.92 Gbps', '1.2 · DP+HDMI'],
                ['RTX 5050 / 5060 / 5070 / 5080 / 5090', 'Blackwell', '2.1b', 'FRL6', '42.67 Gbps', '2.1 UHBR', '25.92–54 Gbps', '1.2 · DP+HDMI'],
                ['GTX 10 / 9 系列', 'Pascal / Maxwell', '2.0b', '无', '18 Gbps', '1.4（1.2）', '25.92 / 21.6 Gbps', '无']
              ] },
              { t: 'p', v: '**专业工作站卡（RTX PRO / RTX A 系列）几乎全部没有 HDMI 口**，只有 4× DP 1.4a 或 mDP。这意味着它们的有效带宽锁死在 25.92 Gbps，QHD@220 只能靠降位深承载。' },
              { t: 'list', items: [
                'RTX 6000 Ada / RTX 5000 / 4500 / 4000 Ada：4× DP 1.4a，无 HDMI；',
                'RTX 4000 SFF Ada / RTX 2000 Ada：4× mDP 1.4a，无 HDMI；',
                'RTX A6000 / A5500 / A5000：4× DP 1.4a，无 HDMI；',
                'RTX A4000 / A2000 / A1000 / T1000 / T600 / T400：4× / 3× mDP 1.4a，无 HDMI。'
              ] },
              { t: 'callout', kind: 'warn', title: '专业卡的隐蔽坑', v: '很多专业卡只提供 mDP（Mini DisplayPort）而非标准 DP，且需要转接线。转接线的质量与方向（DP→DP、mDP→DP）会引入额外的链路损耗，在 25.92 Gbps 这种余量本来就很薄的链路上尤其敏感。测试时务必注明连接路径。' }
            ]
          },
          {
            id: 'intel',
            title: 'Intel Arc 独显与核显',
            titleEn: 'Intel Arc dGPU and Integrated Graphics',
            blocks: [
              { t: 'p', v: 'Intel 的分界更极端：**Arc 独显全线 HDMI 2.1 FRL 满血 + DP 2.1 UHBR13.5**，是这张表里能力最强的一档；而核显则是另一个极端。' },
              { t: 'table', head: ['型号', '架构', 'HDMI', 'FRL 档位', 'HDMI 有效带宽', 'DP', 'DP 有效带宽', 'DSC'], rows: [
                ['Arc B580 / B570', 'Alchemist', '2.1', 'FRL 满血', '42.67 Gbps', '2.1 UHBR13.5', '54 Gbps', '1.2 · DP+HDMI'],
                ['Arc A770 / A750', 'Alchemist', '2.1', 'FRL', '42.67 Gbps', '2.1 UHBR13.5', '54 Gbps', '1.2 · DP+HDMI'],
                ['Arc A380 / A580', 'Alchemist', '2.1', 'FRL', '42.67 Gbps', '2.1', '25.92 Gbps', '1.2 · DP+HDMI'],
                ['Arc Xe-LPG（Lunar Lake 核显）', 'Xe-LPG', '2.1', 'FRL', '42.67 Gbps', '1.4a / 2.1', '25.92–54 Gbps', '1.2'],
                ['UHD 770 / 775（12~14 代）', 'Xe-LP', '2.1 仅 TMDS', '无 FRL', '18 Gbps', '1.4a', '25.92 Gbps', '无'],
                ['Iris Xe（11~12 代）/ UHD 750 / 730', 'Xe-LP / Gen9', '2.0b~2.1 仅 TMDS', '无 FRL', '18 Gbps', '1.4a', '25.92 Gbps', '无']
              ] },
              { t: 'p', v: '注意 **Lunar Lake 的 Arc Xe-LPG 是个例外**：它的核显**真的有 FRL**，HDMI 有效带宽 42.67 Gbps。这说明「核显 = 没有 FRL」在 Xe-LPG 之后不再成立，不能一概而论——**看具体型号**。' },
              { t: 'callout', kind: 'ok', title: '好消息', v: 'Arc B580 / A770 具备 UHBR13.5（有效 54 Gbps），相对 QHD@220 10bpc 的 26.57 Gbps 需求「远超」。这正是第 4 章 G6 组作为黄金实验的物理基础：源端能力足够时若仍被剪枝，责任必然在 EDID 侧。' },
              { t: 'p', v: 'A380 / A580 虽然 HDMI 是 FRL 满血，但 DP 侧只有 2.1（25.92 Gbps），走 DP 时 QHD@220 仍然超 2.5%。**一张卡的两条链路能力可以差一倍**，测试时要分开记录。' }
            ]
          },
          {
            id: 'amd',
            title: 'AMD Radeon 桌面与专业卡',
            titleEn: 'AMD Radeon Desktop and Professional Cards',
            blocks: [
              { t: 'p', v: 'AMD 的分代节奏与 NVIDIA 类似但不完全同步：RDNA2 起才有真 HDMI 2.1，RDNA1（RX 5000）仍是 HDMI 2.0b。' },
              { t: 'table', head: ['型号', '架构', 'HDMI', 'FRL 档位', 'HDMI 有效带宽', 'DP', 'DP 有效带宽', 'DSC'], rows: [
                ['RX 7900 XTX / 7900 XT / 7900 GRE', 'RDNA3', '2.1a', 'FRL 满血', '42.67 Gbps', '2.1 UHBR13.5', '54 Gbps', '1.2 · DP+HDMI'],
                ['RX 7800 / 7700 XT / 7600', 'RDNA3', '2.1a', 'FRL', '42.67 Gbps', '2.1 UHBR13.5 / 2.1', '54 / 25.92 Gbps', '1.2 · DP+HDMI'],
                ['RX 6950 XT / 6800 / 6900 XT', 'RDNA2', '2.1', 'FRL 满血', '42.67 Gbps', '1.4a', '25.92 Gbps', '1.2 · DP+HDMI'],
                ['RX 6700 / 6750 / 6650 XT / 6600', 'RDNA2', '2.1', 'FRL', '42.67 Gbps', '2.1 / 1.4a', '25.92 Gbps', '1.2 · DP+HDMI'],
                ['RX 6400 / 6500 XT', 'RDNA2', '2.1', 'FRL 受限', '21.3 Gbps', '1.4', '25.92 Gbps', '1.2 · 仅 DP'],
                ['RX 5000 系列（5500~5900）', 'RDNA1', '2.0b', '无', '18 Gbps', '1.4', '25.92 Gbps', '1.2 · 仅 DP'],
                ['RX 500 / 400 系列', 'Polaris / Vega', '2.0b', '无', '18 Gbps', '1.4 / 1.2', '25.92 / 21.6 Gbps', '无']
              ] },
              { t: 'p', v: '**RX 6400 / 6500 XT 是个特例**：它写着 HDMI 2.1，但 FRL 受限、实际只有 21.3 Gbps（≈FRL3 档）。这个型号正好落在 QHD@220 10bpc 的失败区间（差 24.5%），是验证「HDMI 超限被剪枝」的理想样本。' },
              { t: 'p', v: 'Radeon PRO 专业卡方面：W7900 / W7800（RDNA3）提供 3× DP 2.1 + mDP 2.1，有效 54 Gbps，是专业卡里唯一能轻松承载 QHD@220 10bit 的组合；W6800 / W5700 / W5500 退回 4× DP 1.4a 的 25.92 Gbps；W6400 / W6300 / Pro 5600/5500 则连 HDMI 2.0b 都是 18 Gbps 且 DP 只有 1.4。' }
            ]
          },
          {
            id: 'mobile',
            title: '移动版显卡：接口数量本身是变量',
            titleEn: 'Mobile GPUs: The Port Count Itself Is a Variable',
            blocks: [
              { t: 'p', v: '笔记本显卡的接口配置与台式差异很大，常需转接，这本身就是测试变量。' },
              { t: 'table', head: ['型号', '架构', 'HDMI', 'FRL 档位', 'HDMI 有效带宽', 'DP', 'DP 有效带宽', 'DSC'], rows: [
                ['移动版 RTX 40 / 50 系', 'Ada / Blackwell', '2.1a / 2.1b', 'FRL', '42.67 Gbps', '2.1 UHBR', '54 Gbps', '1.2'],
                ['移动版 RTX 30 系（3060 / 3070 等）', 'Ampere', '2.1', 'FRL3~6', '21.3–42.7 Gbps', '1.4a', '25.92 Gbps', '1.2'],
                ['移动版 GTX 16 系（1660 Ti 等）', 'Turing', '2.0b', '无', '18 Gbps', '1.4a', '25.92 Gbps', '1.2 · 仅 DP']
              ] },
              { t: 'callout', kind: 'warn', title: '移动版要额外记录', v: '同一型号移动版可能有多个 HDMI 版本规格（取决于 OEM 配置），且常常需要 USB-C / mDP 转接。测试报告里必须写明：型号全称、转接线型号、实际走的是哪个口。' },
              { t: 'p', v: '移动版 RTX 30 系的 FRL 档位是「FRL3~6」的区间值，意味着**同型号不同 SKU 的实际能力可能不同**，必须实测确认，不能按型号推断。' }
            ]
          }
        ]
      },
      {
        id: 'bandwidth',
        num: '3',
        title: '带宽算术：QHD 模式与链路余量',
        titleEn: 'Bandwidth Arithmetic: QHD Modes and Link Headroom',
        lead: '有了能力表，还要会算。带宽余量的计算是判定「能不能跑」的唯一量化依据，也是区分「物理不可能」「临界危险」「安全」三种状态的依据。本章把算法和四个必须记住的临界值摊开。',
        sections: [
          {
            id: 'calc',
            title: '像素时钟怎么变成链路带宽',
            titleEn: 'From Pixel Clock to Link Bandwidth',
            blocks: [
              { t: 'p', v: '一个显示模式需要的链路带宽，取决于**像素时钟 × 每像素总 bit 数**。像素时钟 = 水平总像素 × 垂直总像素 × 刷新率。' },
              { t: 'p', v: '以 RGB 4:4:4 为例，每像素有 R、G、B 三个分量，8bpc 时每像素 24 bit，10bpc 时 30 bit，12bpc 时 36 bit。YCbCr 4:2:0 只需传输亮度与色度差分量，总量约为 RGB 的三分之二。' },
              { t: 'callout', kind: 'key', title: '算例：QHD@220 10bpc', v: '像素时钟 885.6 MHz × 30 bit = **26.57 Gbps**。把它和链路有效带宽一比，就知道能不能跑、差多少。' },
              { t: 'p', v: 'QHD 常见总像素是 2560×1440，加上消隐后总像素约 3532×1470 左右，@220Hz 时像素时钟落在 885.6 MHz 附近。这几个数在整张表里反复出现，值得记住。' },
              { t: 'p', v: 'DP 侧的带宽还要再除以通道数（4 lane 常见），HDMI 侧则直接按 FRL 档位的每 lane 速率乘 lane 数。**两者口径不同，不能混算。**' }
            ]
          },
          {
            id: 'qhd-table',
            title: 'QHD 各刷新率 × 各链路带宽对照',
            titleEn: 'QHD Refresh Rates Across Link Bandwidths',
            blocks: [
              { t: 'p', v: '这张表是判定「某模式能否在某链路上跑」的直接依据。表中数值单位为 Gbps，**加粗表示超出该链路容量**。' },
              { t: 'table', head: ['模式', '像素时钟', '8bpc RGB', '10bpc RGB', '12bpc RGB', '10bpc 4:2:0', 'DP1.4 HBR3 25.92', 'HDMI FRL3 21.33', 'HDMI FRL4 28.44', 'HDMI FRL6 42.67'], rows: [
                ['QHD @165', '664.2 MHz', '15.94', '19.93', '23.91', '13.28', '全部可', '全部可', '全部可', '全部可'],
                ['QHD @180', '724.6 MHz', '17.39', '21.74', '26.09', '14.49', '全部可', '12bpc 超', '全部可', '全部可'],
                ['QHD @200', '805.1 MHz', '19.32', '24.15', '28.98', '16.10', '12bpc 超', '10bpc 起超', '12bpc 超', '全部可'],
                ['QHD @220', '885.6 MHz', '21.26', '26.57', '31.88', '17.71', '10bpc 超 2.5%', '10bpc 超 24.5%', '12bpc 超', '全部可'],
                ['QHD @240', '966.1 MHz', '23.19', '28.98', '34.78', '19.32', '10bpc 超 11.8%', '10bpc 超 35.9%', '10bpc 超 1.9%', '全部可'],
                ['QHD @300', '1207.7 MHz', '28.98', '36.23', '43.47', '24.15', '8bpc 起超', '8bpc 起超', '8bpc 起超', '12bpc 超']
              ] },
              { t: 'p', v: '从这张表能直接读出三个结论：QHD@165 在所有链路上都轻松；QHD@220 起 HDMI FRL3 与 DP HBR3 都开始出问题；只有 FRL6 能一路覆盖到 QHD@300 的 8bpc。' },
              { t: 'p', v: '注意 QHD@220 那一行的 8bpc 是 21.26 Gbps，**恰好低于 HDMI FRL3 的 21.33 Gbps**——余量只有 +0.4%。这意味着在 FRL3 上，8bit 与 10bit 是两个完全不同的命运。' }
            ]
          },
          {
            id: 'thresholds',
            title: '三个必须记住的临界值',
            titleEn: 'Three Critical Numbers to Memorize',
            blocks: [
              { t: 'callout', kind: 'key', title: '临界值一：QHD@220 10bpc = 26.57 Gbps', v: '它超 DP 1.4 HBR3（25.92 Gbps）仅 **2.5%**，同时卡在 FRL3（21.33）与 FRL4（28.44）之间。这个 2.5% 的缺口是本类问题「行为不一致」的总根源：NVIDIA 会降位深保住模式，Intel 会直接剪枝掉模式。' },
              { t: 'callout', kind: 'warn', title: '临界值二：FRL4 在 220Hz/10bpc 上余量仅 +6.6%', v: '28.44 vs 26.57。加上线损、抖动与源端带宽估算误差后，这是**极危险的边界**，必须实测，不能凭算式判定通过。' },
              { t: 'callout', kind: 'warn', title: '临界值三：FRL3 在 220Hz/8bpc 上余量仅 +0.4%', v: '21.33 vs 21.26。工程上等同于带不动 220Hz——任何一点损耗（劣质线材、接头氧化、EMI）都会把它压到失败。' },
              { t: 'p', v: '把这三个数放在一起看，就能解释绝大多数现场现象：**同一台显示器、同一个模式，在不同显卡上表现不同；在同一张卡上，换个口表现又不同。**' },
              { t: 'p', v: '它们的共同特征是「余量在个位数百分比」。工程上，余量低于 5% 的链路不应该被当作可用链路来设计验证方案。' }
            ]
          }
        ]
      },
      {
        id: 'edid',
        num: '4',
        title: 'EDID 检查清单：真正决定成败的五个位置',
        titleEn: 'The EDID Checklist: Five Places That Actually Decide',
        lead: '源端能力确认之后，剩下的全部收敛到 EDID 与 DPCD 的几个字节上。这些字段的位定义分散在 EDID 1.4、CTA-861.3 与 HDMI 2.1 三份文件里，一旦某一位填错，症状就会落在「模式不见了」这种看起来毫不相关的地方。',
        sections: [
          {
            id: 'edid-map',
            title: '先定位：这些字节分别在哪儿',
            titleEn: 'Locating the Bytes First',
            blocks: [
              { t: 'p', v: 'EDID 的基本结构是 128 字节基础块 + 若干 128 字节扩展块。基础块里有 18 字节的详细时序描述符（DTD），扩展块里则装着 CTA-861 定义的数据块与 HDMI Forum 定义的子结构。' },
              { t: 'fig', id: 'edidMap', caption: 'EDID 基础块、CTA 扩展块、Display Range Limits 描述符与 DPCD 中与模式枚举直接相关的字节位置。' },
              { t: 'p', v: '下面对每一个位置，都会给出**位定义 + 应填值 + 填错后的症状**这三件套——症状这一栏才是排查时真正用得上的。' }
            ]
          },
          {
            id: 'hf-vsdb',
            title: 'HF-VSDB / HF-SCDB：FRL 档位与 SCDC',
            titleEn: 'HF-VSDB / HF-SCDB: FRL Rate and SCDC',
            blocks: [
              { t: 'p', v: 'CTA 扩展块（tag 0x03）里的 HF-VSDB 结构承载了 HDMI Forum 特有的声明，关键在 byte 7：' },
              { t: 'list', items: [
                '**byte 7 高 4 位** — `Max_FRL_Rate`：1=3G×3 / 2=+6G×3 / 3=+6G×4 / 4=+8G×4 / 5=+10G×4 / 6=+12G×4；',
                '**byte 7 bit2** — `SCDC_Present`：使用 FRL 必须为 1。'
              ] },
              { t: 'callout', kind: 'key', title: '该填多少', v: '目标芯片若支持 FRL4 就填 **4**，只支持 FRL3 就填 **3**。**填 0 等于退化成 HDMI 2.0**，源端会直接按 TMDS 18 Gbps 跑，QHD@220 物理不可能出现。' },
              { t: 'p', v: '同一个 byte 7 的低 4 位在不同版本的 HDMI Forum 结构里含义不同（HF-SCDB 改过布局），手写 EDID 时要对照所用规范版本确认，不要凭记忆填。' },
              { t: 'callout', kind: 'warn', title: 'SCDC_Present 填 0 的后果', v: '源端不会启用 FRL，也不会进入 SCDC 通道，链路停在 TMDS。此时现象是「HDMI 明明写着 2.1 却只有 4K@60」，很容易被误判为线材问题。' }
            ]
          },
          {
            id: 'byte11-dsc',
            title: 'byte 11 / 12：五个 DSC 位',
            titleEn: 'Bytes 11 and 12: The Five DSC Bits',
            blocks: [
              { t: 'p', v: 'HF-VSDB 的 byte 11 是一组 DSC 声明位，byte 12 则是 DSC 相关的上限与切片数：' },
              { t: 'list', items: [
                '**byte 11** — `DSC_1p2`(bit7) / `DSC_Native_420`(bit6) / `DSC_All_bpp`(bit4) / `DSC_12bpc`(bit2) / `DSC_10bpc`(bit1)；',
                '**byte 12** — `DSC_Max_FRL_Rate`(高 4 位) + `DSC_MaxSlices`(低 4 位)。'
              ] },
              { t: 'callout', kind: 'warn', title: '无 DSC 能力时', v: '**这五个位应全部为 0，byte 12 也应为 0。** 无 DSC 解码器的芯片一旦声明了 DSC，源端会真的启用它，Sink 无法解码 → 直接黑屏。' },
              { t: 'p', v: '这条与 DPCD 0x060 必须一起核对：EDID 干净但 DPCD 置位，源端仍会启用 DSC。两侧要同时清零才彻底。' },
              { t: 'p', v: '反过来，若显示器**确实**有 DSC 能力却漏声明，源端就不会压缩，4K@120 这类高带宽模式可能因带宽不足被剪枝——症状与「DSC 声明错」相反，但根因同样是这两组字节。' }
            ]
          },
          {
            id: 'range-limits',
            title: 'Display Range Limits：最容易被忽视的致命项',
            titleEn: 'Display Range Limits: The Most Overlooked Fatal Field',
            blocks: [
              { t: 'p', v: '这是 EDID 里一个**可选**的描述符（tag 0xFD），声明显示器的最大像素时钟等范围限制。关键是它的 byte 9 — `Max Pixel Clock`，**单位是 10 MHz**。' },
              { t: 'p', v: 'QHD@220 的像素时钟是 885.6 MHz，所以应填 **89**（代表 890 MHz）。' },
              { t: 'callout', kind: 'warn', title: '为什么它最致命', v: '若这个值偏小，**Intel 驱动会严格剪枝该模式，NVIDIA 则宽松放行**——正好对应「部分 N 卡能识别、Intel 识别不到」的现象。Intel 社区已有 2560×1440@60Hz 因为该字段写成 240 而设不上的案例，最终解法是直接删掉整个 Display Range Limits 描述符。' },
              { t: 'p', v: 'EDID 1.4 规定：显式定义的时序（DTD）优先于监视器范围定义。**但实际驱动的实现严格程度不一**，不能依赖规范条文，只能实测。' },
              { t: 'p', v: '这张表里 26.57 Gbps 对应的 885.6 MHz，换算成这个字段就是 89。若目标模式是 QHD@240（966.1 MHz），则应填 97。**凡是填小于理论值的，都是自找剪枝。**' }
            ]
          },
          {
            id: 'byte20-vcd',
            title: '基础块 byte 20 与 CTA Video Capability',
            titleEn: 'Basic Block Byte 20 and CTA Video Capability',
            blocks: [
              { t: 'p', v: '基础块 byte 20 是 Video Input Definition。bit7 = 1 表示数字输入，此时 **bit6-4 是位深**：' },
              { t: 'list', items: [
                '`001`=6bit　`010`=8bit　`011`=10bit　`100`=12bit　`101`=14bit　`110`=16bit；',
                'bit3 = 0 为 RGB 4:4:4，1 为 YCbCr 4:2:0；',
                'bit3-0 为接口类型：`0101`=DisplayPort，`0010`/`0011`=HDMI。'
              ] },
              { t: 'p', v: 'CTA 扩展块里还有 Video Capability Descriptor（tag 0x02），它的 byte 4 用位的方式声明支持的位深：bit0=8bit / bit1=10bit / bit2=12bit / bit3=14bit / bit4=16bit，另有 YCbCr 4:2:0 的支持位。' },
              { t: 'callout', kind: 'key', title: '这是「降位深」路径的开关', v: '若声明了 10bit 而链路在 220Hz 装不下，NVIDIA 降 8bit、Intel 直接剪枝——**同一份 EDID，两种行为**。位深声明不只是「能显示几 bit」，它同时决定了驱动在带宽不足时采取什么策略。' },
              { t: 'p', v: '还要注意：**DTD 本身没有位深字段**，它继承自视频输入定义或 CTA 的 Video Capability Descriptor。所以只改 DTD 是改不出位深变化的。' }
            ]
          },
          {
            id: 'dpcd-checksum',
            title: 'DPCD 0x060 与校验和',
            titleEn: 'DPCD 0x060 and the Checksum',
            blocks: [
              { t: 'p', v: 'DP 侧还有一组独立于 EDID 的声明，在 DPCD 寄存器空间里：0x060 的 bit0 = `DP_DSC_DECOMPRESSION_IS_SUPPORTED`，bit1 = `DP_DSC_PASSTHROUGH_SUPPORTED`。**无 DSC 能力的芯片，这两处必须为 0。**' },
              { t: 'p', v: 'DP 侧还需要核对 `DP_MAX_LINK_RATE`（0x001）与 `DP_MAX_LANE_COUNT`（0x002），确认它们与 EDID 声明的模式所需带宽自洽。**EDID 说要 4 lane HBR3、DPCD 却只给 2 lane**，这类不一致同样会导致模式被剪枝。' },
              { t: 'callout', kind: 'warn', title: '校验和：每块 128 字节', v: '前 127 字节求和取补码，使整块和 mod 256 = 0，即 `checksum = (256 - (sum[0:127] % 256)) % 256`。手算最容易错在把 byte 127 当 0——正确做法是**先把 byte 127 清零，再对前 127 字节求和**。改任何字节后都要重算。' },
              { t: 'p', v: '校验和错了会让整块 EDID 被驱动直接丢弃，表现为「显示器被识别为通用显示器」或「完全没有 EDID」。这是最容易被忽略、但现象最极端的一类错误。' }
            ]
          }
        ]
      },
      {
        id: 'testmatrix',
        num: '5',
        title: '按能力分组的测试矩阵',
        titleEn: 'The Test Matrix Grouped by Capability Tier',
        lead: '把显卡按「能力等级」而不是具体型号分组，覆盖面更全、执行更有序。每个组对应一个明确的验证目标，用一组显卡去回答一个确定的问题。',
        sections: [
          {
            id: 'groups',
            title: 'G1 到 G8：八组能力阶梯',
            titleEn: 'G1 through G8: Eight Capability Tiers',
            blocks: [
              { t: 'fig', id: 'groupMatrix', caption: '按能力等级划分的八组测试矩阵，从「物理不可能」一路排到「远超需求」。' },
              { t: 'table', head: ['组', '代表显卡', '接口', '源端有效带宽', '预期行为', '验证目标'], rows: [
                ['G1', '1660 Ti / 2060 Super', 'HDMI 2.0b', '18 Gbps', 'QHD@220 完全不出现（TMDS 物理天花板）', '基准组：证明 EDID 模式本身没坏，是链路带不动'],
                ['G2', '1660 Ti / 2060 Super', 'DP 1.4a', '25.92 Gbps', 'QHD@220 出现，位深降为 8bit', '验证「带宽不足 → 降位深」降级路径（NVIDIA 策略）'],
                ['G3', 'RTX 3060 / 3060 Ti', 'HDMI 2.1 (FRL3)', '21.33 Gbps', 'QHD@220 被剪枝或降级', '验证 EDID 的 `Max_FRL_Rate` 声明是否被正确读取'],
                ['G4', 'RTX 3070 / 4070', 'HDMI 2.1 (FRL4)', '28.44 Gbps', 'QHD@220@10bit 勉强通过（余量 +6.6%）', '**最高优先级**：FRL4 的实际边界，必须实测'],
                ['G5', 'RTX 3090 / 4090 / Arc B580', 'HDMI 2.1 (FRL6)', '42.67 Gbps', 'QHD@220@10bit 正常（余量 +60%）', '上界基准：源端完全不是瓶颈'],
                ['G6', 'Arc B580 / RX 7900 XTX', 'DP 2.1 UHBR13.5', '54 Gbps', '若 220Hz@10bit 仍被剪枝，则问题 100% 在 EDID', '判定「源端能力 vs EDID 声明」的黄金实验'],
                ['G7', 'UHD 770 / Iris Xe', 'HDMI 2.1（仅 TMDS）', '18 Gbps', 'QHD@220 不出现；QHD@165@10bit 正常', '验证 TMDS 上限识别是否正确'],
                ['G8', 'RTX A6000 / Radeon PRO W6800', 'DP 1.4a（无 HDMI）', '25.92 Gbps', '同 G2，但强制走 DP', '纯 DP 路径隔离测试，排除 HDMI 侧干扰']
              ] },
              { t: 'callout', kind: 'key', title: 'G6 是黄金实验', v: '用一台源端能力远超需求的卡（Arc B580 / RX 7900 XTX，54 Gbps vs 需求 26.57 Gbps）做对照。**如果连它们都识别不到 QHD@220，那就是 EDID 写错了，与显卡无关**——这是最快定位问题归属的实验。' },
              { t: 'p', v: '执行顺序建议从 G1 起步（建立「物理天花板」基线）→ G2（验证降位深路径）→ G3（验证 FRL 档位读取）→ G4（实测最危险的边界）→ G5/G6（确认上界与归属）。G7 与 G8 可并行插入，用于排除特定路径。' }
            ]
          },
          {
            id: 'linux-cmds',
            title: 'Linux 侧命令速查',
            titleEn: 'Linux Command Reference',
            blocks: [
              { t: 'p', v: 'Linux 下最直接的入口是 DRM 子系统暴露的 sysfs 与 debugfs。' },
              { t: 'dl', items: [
                ['完整解析 EDID', '`cat /sys/class/drm/card*-*/edid | edid-decode`'],
                ['只看关键字段', '`edid-decode /sys/class/drm/card*-DP-*/edid | grep -iE "range limits|detailed timing|video cap|frl|dsc|hdmi"`'],
                ['合规性检查', '`edid-decode --check /sys/class/drm/card*-*/edid`（EDID 1.3 会 fail，1.4 只 warn）'],
                ['读 DSC 状态（i915）', '`sudo grep -iE "DSC|link rate|lane" /sys/kernel/debug/dri/0/i915_display_info`'],
                ['列出可用模式', '`xrandr --query`　`xrandr --verbose`']
              ] },
              { t: 'callout', kind: 'info', title: '合规性检查的版本差异', v: '`edid-decode --check` 对 EDID 1.3 的扩展块检查较严（会报 fail），对 1.4 只给 warning。**不要把 1.3 的 fail 当成致命问题**，要结合实际使用的规范版本判断。' },
              { t: 'p', v: '`xrandr --verbose` 里能看到每个模式实际协商到的带宽与色深，是判断「降位深是否真的发生了」最直接的证据。' }
            ]
          },
          {
            id: 'windows-cmds',
            title: 'Windows 侧工具与对照实验',
            titleEn: 'Windows Tools and the Override Experiment',
            blocks: [
              { t: 'p', v: 'Windows 侧没有等价的命令行 EDID 解析器，主要靠 CRU（Custom Resolution Utility）与厂商控制面板。' },
              { t: 'dl', items: [
                ['导出 EDID 为文本', 'CRU → 选择显示器 → Export EDID'],
                ['查看当前位深与色彩格式', 'NVIDIA 控制面板 → 调整桌面尺寸和分辨率 → 颜色深度 / 输出格式'],
                ['查看显示器识别信息', '`Get-CimInstance -Namespace root\\wmi -ClassName WmiMonitorID`'],
                ['GPU 遥测', '`nvidia-smi -q -d EDID`（视驱动版本支持情况）']
              ] },
              { t: 'callout', kind: 'warn', title: 'EDID override 对照实验', v: '在 CRU 里只改 220Hz 那条 DTD 关联的位深声明，看 Intel 是否从「识别不到」变为「能识别」。**改动前务必备份原始 EDID 并准备 Safe Mode 恢复路径**——错误的 EDID 会让显示器在某些情况下完全无法初始化。' },
              { t: 'p', v: '这个实验的价值在于**把问题从「链路 vs EDID」二选一变成可判定的因果链**：如果降位深声明后 Intel 就能识别，说明剪枝确实由位深声明触发，而不是 FRL 档位或链路速率。' },
              { t: 'p', v: '如果条件允许，也可以用另一台主机接同一台显示器做交叉验证——这能在不动任何 EDID 的前提下先排除掉一半可能性。' }
            ]
          }
        ]
      },
      {
        id: 'triage',
        num: '6',
        title: '判定逻辑与执行清单',
        titleEn: 'Triage Logic and the Execution Checklist',
        lead: '把前面所有的原理压缩成一张「现象 → 原因 → 下一步动作」的速查表。它可以贴在工位上当排查流程用，也可以在复盘时用来检查自己是不是漏了哪一步。',
        sections: [
          {
            id: 'symptom-table',
            title: '现象 → 原因 → 下一步动作',
            titleEn: 'Symptom to Cause to Action',
            blocks: [
              { t: 'table', head: ['观察到的现象', '最可能的原因', '下一步动作'], rows: [
                ['所有主机都识别不到 QHD@220', 'EDID 的 Display Range Limits 写小了，或 CTA 位深声明过高', '核对 0xFD 的 byte 9（应 ≥89）与 CTA Video Capability 的位深位'],
                ['N 卡能识别但位深降为 8bit；Intel 识别不到', 'EDID 声明 10bit，但该模式在链路上带宽不足（差 2.5%）', '把 EDID 最大位深降到 8bit，或刷新率降到 200Hz'],
                ['N 卡（1660Ti / 2060S）HDMI 口能出 220Hz', '**测试配置有误** —— TMDS 物理带不动', '换线换口复测，确认实际走的是哪个口'],
                ['Arc B580 识别不到，但源端带宽远超需求', '**问题 100% 在 EDID 侧**（链路速率 / 通道数 / 位深声明不一致）', '核对 EDID 的 DP 声明与 DPCD 0x001 / 0x002'],
                ['偶发闪黑 / 短暂无信号 / HPD 抖动', 'VRR 动态刷新跨越带宽阈值，或 FRL 反复重训', '关闭 VRR / MPRT 后复测；抓 SCDC 状态寄存器'],
                ['某张卡在 220Hz 直接黑屏但模式在列表里', 'EDID 声明了 DSC，源端真的开了，Sink 无解码器', '清零 HF-VSDB byte 11/12 的 DSC 位 + DPCD 0x060 bit0']
              ] },
              { t: 'fig', id: 'triageFlow', caption: '从现象反推责任方的判定流程：先确认源端能力，再看 EDID 声明。' },
              { t: 'callout', kind: 'key', title: '通用排查顺序', v: '① 确认走的是哪个物理口 → ② 读 EDID 的 `Max_FRL_Rate` 与 `Max Pixel Clock` → ③ 算带宽余量 → ④ 核对位深与 DSC 声明 → ⑤ 用 G6 组的卡做归属判定。**顺序不要跳，每一步都可能是根因。**' }
            ]
          },
          {
            id: 'report',
            title: '把结论写进报告：必须记录的六项',
            titleEn: 'Writing the Conclusion Down: Six Fields That Must Be Recorded',
            blocks: [
              { t: 'p', v: '排查结束后，报告里如果缺了下面任何一项，下一个人接手时就得从头复现一遍。这是把本文内容落地成可复用流程的最后一步。' },
              { t: 'dl', items: [
                ['**显卡全称与架构**', '例如「Arc B580（Alchemist）」，而不只是「Intel 显卡」；'],
                ['**实际走的物理口**', 'HDMI A 口 / DP 口 / mDP 转接 / USB-C 转接，并注明转接线型号；'],
                ['**EDID 关键字段实测值**', '`Max_FRL_Rate`、`Max Pixel Clock`、CTA 位深位、DPCD 0x060；'],
                ['**模式协商结果**', '实际跑成的分辨率 / 刷新率 / 色深，尤其是「降到了几 bit」；'],
                ['**VRR / MPRT 开关状态**', '开启与关闭两种状态下的表现差异；'],
                ['**对照机与对照组**', '用于判定归属的对照卡型号，最好包含 G6 组的黄金实验。']
              ] },
              { t: 'callout', kind: 'key', title: '为什么要强调「实际走的物理口」', v: '这是复现失败最常见的原因——**同一张卡的不同口能力可以差一倍**（比如 Arc A380 的 HDMI 是 FRL 满血 42.67 Gbps，DP 却只有 25.92 Gbps）。报告里只写「用 Arc A380 测的」，等于没写。' },
              { t: 'p', v: '把「EDID 关键字段实测值」和「模式协商结果」并列记录，才能在后续 EDID 被改动后快速判断变化来自哪里。' },
              { t: 'p', v: '最后一项尤其重要：**只有做过 G6 组对照的结论，才具备「问题归属」的效力**。没有对照机的结果只能说明「这个卡上不行」，无法说明「是 EDID 的问题」。' }
            ]
          },
          {
            id: 'final-check',
            title: '收尾检查：别忘了这些边界条件',
            titleEn: 'Final Checks: Boundary Conditions',
            blocks: [
              { t: 'p', v: '即使 EDID 全部正确，下面这些因素仍可能造成「同样的卡、同样的显示器，行为不同」：' },
              { t: 'list', items: [
                '**线材与接头**：FRL4 余量只有 +6.6%，线损直接吃掉它；劣质或过长的 HDMI 线在 4K 高刷下失效是常见现象；',
                '**VRR / MPRT**：动态刷新跨越带宽阈值会引发闪黑，排查时应先关闭 VRR 复测；',
                '**抖动与源端估算误差**：驱动对可用带宽的估算本身有误差，这也是「+6.6% 必须实测」的原因；',
                '**显示器固件与内部实现**：同一份 EDID 在不同品牌/型号的显示器上行为可能不同；',
                '**AIB 改版**：板卡 partner 可能调整接口配置，规格以公版为基准。'
              ] },
              { t: 'p', v: '**移动版显卡的接口数量与台式差异较大，常需转接线**，测试报告中务必注明连接路径与转接方式。' },
              { t: 'callout', kind: 'ok', title: '最后一条建议', v: '这张表里最该记住的一行是 **G6 组**：用一台源端能力远超需求的卡做对照。如果连它们都识别不到 QHD@220，那就是 EDID 写错了，与显卡无关——这是最快定位问题归属的实验。' }
            ]
          }
        ]
      }
    ]
  });
})(typeof window !== 'undefined' ? window : globalThis);
