/* =============================================================================
 * display-tech-compilation-data.js — Technology Blog 第五篇文章：
 *             显示器领域先进技术与学习资料汇编（截至 2026 年底）
 *             （纯数据，无逻辑、不碰 DOM）
 *
 * 数据来源：公开行业资料整理（SID Display Week 2026、各厂商 2026 年度发布、
 *           行业媒体与标准组织文件），整理时间 2026-10-19。
 *
 * 本文件按「新增文章只需往 BLOGData.posts 里加一条」的约定，在 dp-data.js 之后
 * 加载，把文章对象 push 进 BLOGData.posts，并把本篇专用的内联 SVG 注册进
 * BLOGData.figures。正文块结构与 blog-data.js 完全一致（见该文件头部说明）。
 *
 * 版权说明：本篇是面向中文读者的**学习性产业与技术汇编**，非任何规范的官方译文，
 * 也不转载规范原文的表格与插图；所有示意图均按所述机理重绘（纯内联 SVG，
 * 不请求任何外部资源）。文中引用的标准、数据与厂商信息请以各原始来源官方发布为准。
 * ========================================================================== */
(function (window) {
  'use strict';

  var D = window.BLOGData;
  if (!D || !D.posts || !D.figures) return;

  /* ------------------------------------------------------------- 示意图 SVG */
  /* 全部内联绘制，颜色走 CSS 变量，因此自动跟随明/暗主题，且不请求任何外部资源。 */
  var FIGURES = {

    /* 技术全景：自发光 / LCD 演进 / Micro LED 三大族与场景分工 */
    techLandscape:
      '<svg class="bl-fig-svg" viewBox="0 0 640 250" role="img" aria-label="2026 显示技术三大族与场景分工">' +
      '<rect x="0" y="0" width="640" height="250" fill="var(--surface-2)"/>' +
      '<text x="16" y="26" fill="var(--text-soft)" font-size="12" font-weight="600">2026 主线：多技术并行竞争、按场景分工——没有单一「OLED 替代者」</text>' +
      '<rect x="16" y="44" width="190" height="188" rx="10" fill="var(--surface)" stroke="var(--accent)"/>' +
      '<text x="111" y="68" fill="var(--accent)" font-size="12" font-weight="600" text-anchor="middle">自发光 OLED</text>' +
      '<text x="111" y="92" fill="var(--text-dim)" font-size="10" text-anchor="middle">Tandem / QD-OLED</text>' +
      '<text x="111" y="110" fill="var(--text-dim)" font-size="10" text-anchor="middle">印刷 OLED / ViP</text>' +
      '<text x="111" y="132" fill="var(--text-soft)" font-size="10" text-anchor="middle">场景：手机/笔电/</text>' +
      '<text x="111" y="148" fill="var(--text-soft)" font-size="10" text-anchor="middle">电视/车载</text>' +
      '<text x="111" y="178" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">成熟度：规模量产</text>' +
      '<text x="111" y="200" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">短板：寿命/成本</text>' +
      '<rect x="225" y="44" width="190" height="188" rx="10" fill="var(--surface)" stroke="var(--teal)"/>' +
      '<text x="320" y="68" fill="var(--teal)" font-size="12" font-weight="600" text-anchor="middle">LCD 演进</text>' +
      '<text x="320" y="92" fill="var(--text-dim)" font-size="10" text-anchor="middle">Oxide 背板</text>' +
      '<text x="320" y="110" fill="var(--text-dim)" font-size="10" text-anchor="middle">四基色 RGBC</text>' +
      '<text x="320" y="132" fill="var(--text-soft)" font-size="10" text-anchor="middle">场景：百吋大屏/</text>' +
      '<text x="320" y="148" fill="var(--text-soft)" font-size="10" text-anchor="middle">电竞/商显</text>' +
      '<text x="320" y="178" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">成熟度：量产爬坡</text>' +
      '<text x="320" y="200" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">长板：成本/尺寸</text>' +
      '<rect x="434" y="44" width="190" height="188" rx="10" fill="var(--surface)" stroke="var(--warn)"/>' +
      '<text x="529" y="68" fill="var(--warn)" font-size="12" font-weight="600" text-anchor="middle">Micro LED</text>' +
      '<text x="529" y="92" fill="var(--text-dim)" font-size="10" text-anchor="middle">TFT 玻璃基 /</text>' +
      '<text x="529" y="108" fill="var(--text-dim)" font-size="10" text-anchor="middle">硅基 LEDoS</text>' +
      '<text x="529" y="130" fill="var(--text-soft)" font-size="10" text-anchor="middle">场景：AR 微显示/</text>' +
      '<text x="529" y="146" fill="var(--text-soft)" font-size="10" text-anchor="middle">车载 HUD/大屏</text>' +
      '<text x="529" y="176" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">成熟度：量产元年</text>' +
      '<text x="529" y="198" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">瓶颈：巨量转移</text>' +
      '<text x="16" y="240" fill="var(--text-dim)" font-size="9.5">三族按场景切分市场：OLED 占成熟消费电子，LCD 守大屏与成本，Micro LED 先在 AR/车载放量。</text>' +
      '</svg>',

    /* OLED 三种成膜路线：FMM / IJP / ViP 对比 */
    oledRoadmap:
      '<svg class="bl-fig-svg" viewBox="0 0 640 250" role="img" aria-label="OLED 三种成膜路线 FMM、IJP 与 ViP 对比">' +
      '<rect x="0" y="0" width="640" height="250" fill="var(--surface-2)"/>' +
      '<text x="16" y="26" fill="var(--text-soft)" font-size="12" font-weight="600">OLED 三种成膜路线：FMM 是当前主流，IJP 与 ViP 是下一代低成本化方向</text>' +
      '<rect x="16" y="44" width="190" height="150" rx="10" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="111" y="68" fill="var(--text-soft)" font-size="11" font-weight="600" text-anchor="middle">FMM 金属掩膜</text>' +
      '<text x="111" y="92" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">蒸镀 + 精细金属掩膜</text>' +
      '<text x="111" y="110" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">开口率约 29%</text>' +
      '<text x="111" y="130" fill="var(--text-soft)" font-size="9.5" text-anchor="middle">现状：成熟量产</text>' +
      '<text x="111" y="150" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">短板：大尺寸/成本</text>' +
      '<text x="111" y="178" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">代表：QD-OLED/刚性 OLED</text>' +
      '<rect x="225" y="44" width="190" height="150" rx="10" fill="var(--surface)" stroke="var(--accent)"/>' +
      '<text x="320" y="68" fill="var(--accent)" font-size="11" font-weight="600" text-anchor="middle">IJP 喷墨印刷</text>' +
      '<text x="320" y="92" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">喷墨打印有机材料</text>' +
      '<text x="320" y="110" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">材料利用率高</text>' +
      '<text x="320" y="130" fill="var(--text-soft)" font-size="9.5" text-anchor="middle">现状：商用早期</text>' +
      '<text x="320" y="150" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">长板：中大尺寸低成本</text>' +
      '<text x="320" y="178" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">代表：华星 28" 印刷 OLED</text>' +
      '<rect x="434" y="44" width="190" height="150" rx="10" fill="var(--surface)" stroke="var(--teal)"/>' +
      '<text x="529" y="68" fill="var(--teal)" font-size="11" font-weight="600" text-anchor="middle">ViP 无掩膜</text>' +
      '<text x="529" y="92" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">半导体光刻替代 FMM</text>' +
      '<text x="529" y="110" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">开口率 29% → 69%</text>' +
      '<text x="529" y="130" fill="var(--text-soft)" font-size="9.5" text-anchor="middle">现状：导入期</text>' +
      '<text x="529" y="150" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">长板：亮度/寿命/分辨率</text>' +
      '<text x="529" y="178" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">代表：维信诺 ViP</text>' +
      '<text x="16" y="222" fill="var(--text-soft)" font-size="10.5">三条路线不是替代关系：FMM 守成熟产能，IJP/ViP 解决「大尺寸 + 低成本 + 高开口率」的下一程。</text>' +
      '<text x="16" y="240" fill="var(--text-dim)" font-size="9.5">ViP + Tandem 的 4K 笔电屏较 FMM 同类色彩更准、日常功耗约 -10%。</text>' +
      '</svg>',

    /* Micro LED 三条应用家族（Yole 2026） */
    microledFamilies:
      '<svg class="bl-fig-svg" viewBox="0 0 640 250" role="img" aria-label="Micro LED 三条应用家族：TFT 大屏、硅基微显示与光互连">' +
      '<rect x="0" y="0" width="640" height="250" fill="var(--surface-2)"/>' +
      '<text x="16" y="26" fill="var(--text-soft)" font-size="12" font-weight="600">Micro LED 三条应用家族（Yole 2026）：放量顺序是大屏 → 微显示/车载 → 光互连</text>' +
      '<rect x="16" y="44" width="190" height="170" rx="10" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="111" y="68" fill="var(--text-soft)" font-size="11" font-weight="600" text-anchor="middle">① TFT 玻璃基大屏</text>' +
      '<text x="111" y="92" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">电视 / 手表</text>' +
      '<text x="111" y="112" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">成本仍偏高</text>' +
      '<text x="111" y="134" fill="var(--text-soft)" font-size="9.5" text-anchor="middle">进展：巨量转移</text>' +
      '<text x="111" y="150" fill="var(--text-soft)" font-size="9.5" text-anchor="middle">良率 &gt;99.99%</text>' +
      '<text x="111" y="180" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">代表：京东方 205" COG</text>' +
      '<rect x="225" y="44" width="190" height="170" rx="10" fill="var(--surface)" stroke="var(--accent)"/>' +
      '<text x="320" y="68" fill="var(--accent)" font-size="11" font-weight="600" text-anchor="middle">② 硅基 LEDoS 微显示</text>' +
      '<text x="320" y="92" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">AR 眼镜光机核心</text>' +
      '<text x="320" y="112" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">中国厂商主导</text>' +
      '<text x="320" y="134" fill="var(--text-soft)" font-size="9.5" text-anchor="middle">CAGR 121%</text>' +
      '<text x="320" y="150" fill="var(--text-soft)" font-size="9.5" text-anchor="middle">5131PPI / 10000PPI</text>' +
      '<text x="320" y="180" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">代表：诺视 / 华星</text>' +
      '<rect x="434" y="44" width="190" height="170" rx="10" fill="var(--surface)" stroke="var(--teal)"/>' +
      '<text x="529" y="68" fill="var(--teal)" font-size="11" font-weight="600" text-anchor="middle">③ AI 数据中心光互连</text>' +
      '<text x="529" y="92" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">新兴方向</text>' +
      '<text x="529" y="112" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">2031 约 25 亿美元</text>' +
      '<text x="529" y="134" fill="var(--text-soft)" font-size="9.5" text-anchor="middle">硅光共封装</text>' +
      '<text x="529" y="150" fill="var(--text-soft)" font-size="9.5" text-anchor="middle">低功耗高带宽</text>' +
      '<text x="529" y="180" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">与 AI 算力耦合</text>' +
      '<text x="16" y="238" fill="var(--text-dim)" font-size="9.5">真正的放量在 AR 微显示与车载，而非电视——巨量转移良率普遍突破 99.99% 是量产元年判据。</text>' +
      '</svg>',

    /* 显示接口带宽对比 */
    bandwidthBars:
      '<svg class="bl-fig-svg" viewBox="0 0 640 250" role="img" aria-label="显示接口带宽对比：DP 2.1b、HDMI 2.2 与 USB4 v2">' +
      '<rect x="0" y="0" width="640" height="250" fill="var(--surface-2)"/>' +
      '<text x="16" y="26" fill="var(--text-soft)" font-size="12" font-weight="600">显示接口带宽（2026）：4K240Hz 10bit 约需 68–71Gbps，超过 HDMI 2.1 的 48Gbps</text>' +
      '<line x1="70" y1="210" x2="600" y2="210" stroke="var(--border-strong)" stroke-width="1.4"/>' +
      '<rect x="90" y="120" width="70" height="90" fill="var(--surface)" stroke="var(--border-strong)"/><text x="125" y="230" fill="var(--text-soft)" font-size="9.5" text-anchor="middle">HDMI 2.1</text><text x="125" y="135" fill="var(--text-dim)" font-size="9" text-anchor="middle">48</text>' +
      '<rect x="200" y="92" width="70" height="118" fill="var(--accent-soft)" stroke="var(--accent)"/><text x="235" y="230" fill="var(--accent-text)" font-size="9.5" text-anchor="middle">DP 2.1b</text><text x="235" y="107" fill="var(--accent)" font-size="9" text-anchor="middle">80</text>' +
      '<rect x="310" y="64" width="70" height="146" fill="var(--warn-soft)" stroke="var(--warn)"/><text x="345" y="230" fill="var(--warn)" font-size="9.5" text-anchor="middle">HDMI 2.2</text><text x="345" y="79" fill="var(--warn)" font-size="9" text-anchor="middle">96</text>' +
      '<rect x="420" y="84" width="70" height="126" fill="var(--surface)" stroke="var(--border-strong)"/><text x="455" y="230" fill="var(--text-soft)" font-size="9.5" text-anchor="middle">USB4 v2</text><text x="455" y="99" fill="var(--text-dim)" font-size="9" text-anchor="middle">80/120</text>' +
      '<rect x="530" y="150" width="70" height="60" fill="var(--teal-soft)" stroke="var(--teal)"/><text x="565" y="230" fill="var(--text-soft)" font-size="9.5" text-anchor="middle">TB5</text><text x="565" y="165" fill="var(--text-dim)" font-size="9" text-anchor="middle">80/120</text>' +
      '<text x="16" y="245" fill="var(--text-soft)" font-size="10">纵轴为带宽（Gbps）；DP 2.1b 的 UHBR20=80Gbps（载荷 77.37Gbps），HDMI 2.2 需 Ultra96 认证线材。</text>' +
      '</svg>',

    /* 显示测试与标准分层 */
    testStack:
      '<svg class="bl-fig-svg" viewBox="0 0 640 250" role="img" aria-label="显示测试与标准分层：光学电学、HDR 认证、可靠性、量检测">' +
      '<rect x="0" y="0" width="640" height="250" fill="var(--surface-2)"/>' +
      '<text x="16" y="26" fill="var(--text-soft)" font-size="12" font-weight="600">显示测试与标准：从「器件参数」到「量检测设备」是一条完整链路</text>' +
      '<rect x="60" y="44" width="520" height="34" rx="8" fill="var(--accent-soft)" stroke="var(--accent)"/><text x="320" y="66" fill="var(--accent-text)" font-size="10.5" text-anchor="middle">① 光学/电学测量标准：IEC 62341-6-1（亮度/色坐标/色域）、-5-3（残影/寿命）、-6-3</text>' +
      '<rect x="60" y="88" width="520" height="34" rx="8" fill="var(--surface)" stroke="var(--border-strong)"/><text x="320" y="110" fill="var(--text-soft)" font-size="10.5" text-anchor="middle">② HDR / 动态清晰度认证（VESA）：DisplayHDR CTS 1.1/1.2、ClearMR、Adaptive-Sync 1.1</text>' +
      '<rect x="60" y="132" width="520" height="34" rx="8" fill="var(--surface)" stroke="var(--border-strong)"/><text x="320" y="154" fill="var(--text-soft)" font-size="10.5" text-anchor="middle">③ 可靠性与老化：高温高湿/热冲击/ESD/车规 AEC-Q100，LT50/LT70 验收口径</text>' +
      '<rect x="60" y="176" width="520" height="34" rx="8" fill="var(--teal-soft)" stroke="var(--teal)"/><text x="320" y="198" fill="var(--teal)" font-size="10.5" text-anchor="middle">④ 量检测设备与 Mura/DeMura：Array/Cell/Module 三层，AOI、PL 巨量检测、AI 缺陷分类</text>' +
      '<text x="16" y="240" fill="var(--text-dim)" font-size="9.5">测试岗重点：读懂 IEC 62341 与 VESA 认证体系，掌握 DeMura/量检测原理——是连接标准与产线的关键。</text>' +
      '</svg>',

    /* 学习路径 4 阶段 */
    learningStages:
      '<svg class="bl-fig-svg" viewBox="0 0 640 256" role="img" aria-label="显示技术学习路径四个阶段">' +
      '<rect x="0" y="0" width="640" height="256" fill="var(--surface-2)"/>' +
      '<text x="16" y="26" fill="var(--text-soft)" font-size="12" font-weight="600">学习路径：基础 → 器件原理 → 驱动与工艺 → 前沿与产业，建议测试方向优先</text>' +
      '<rect x="16" y="46" width="140" height="160" rx="10" fill="var(--surface)" stroke="var(--accent)"/><text x="86" y="70" fill="var(--accent)" font-size="11" font-weight="600" text-anchor="middle">阶段一</text><text x="86" y="90" fill="var(--text-soft)" font-size="10" text-anchor="middle">基础</text><text x="86" y="112" fill="var(--text-dim)" font-size="9" text-anchor="middle">光学+色度学</text><text x="86" y="130" fill="var(--text-dim)" font-size="9" text-anchor="middle">人眼视觉</text><text x="86" y="150" fill="var(--text-dim)" font-size="9" text-anchor="middle">主要指标</text><text x="86" y="178" fill="var(--text-dim)" font-size="9" text-anchor="middle">2–4 周</text>' +
      '<rect x="172" y="46" width="140" height="160" rx="10" fill="var(--surface)" stroke="var(--border-strong)"/><text x="242" y="70" fill="var(--text-soft)" font-size="11" font-weight="600" text-anchor="middle">阶段二</text><text x="242" y="90" fill="var(--text-soft)" font-size="10" text-anchor="middle">器件原理</text><text x="242" y="112" fill="var(--text-dim)" font-size="9" text-anchor="middle">LCD 液晶物理</text><text x="242" y="130" fill="var(--text-dim)" font-size="9" text-anchor="middle">OLED 发光机理</text><text x="242" y="150" fill="var(--text-dim)" font-size="9" text-anchor="middle">LED/Micro LED</text><text x="242" y="178" fill="var(--text-dim)" font-size="9" text-anchor="middle">4–6 周</text>' +
      '<rect x="328" y="46" width="140" height="160" rx="10" fill="var(--surface)" stroke="var(--border-strong)"/><text x="398" y="70" fill="var(--text-soft)" font-size="11" font-weight="600" text-anchor="middle">阶段三</text><text x="398" y="90" fill="var(--text-soft)" font-size="10" text-anchor="middle">驱动与工艺</text><text x="398" y="112" fill="var(--text-dim)" font-size="9" text-anchor="middle">TFT a-Si/LTPS</text><text x="398" y="130" fill="var(--text-dim)" font-size="9" text-anchor="middle">Oxide/LTPO</text><text x="398" y="150" fill="var(--text-dim)" font-size="9" text-anchor="middle">FMM/IJP/ViP</text><text x="398" y="178" fill="var(--text-dim)" font-size="9" text-anchor="middle">4–6 周</text>' +
      '<rect x="484" y="46" width="140" height="160" rx="10" fill="var(--surface)" stroke="var(--teal)"/><text x="554" y="70" fill="var(--teal)" font-size="11" font-weight="600" text-anchor="middle">阶段四</text><text x="554" y="90" fill="var(--text-soft)" font-size="10" text-anchor="middle">前沿与产业</text><text x="554" y="112" fill="var(--text-dim)" font-size="9" text-anchor="middle">SID/IMID/IDW</text><text x="554" y="130" fill="var(--text-dim)" font-size="9" text-anchor="middle">标准演进</text><text x="554" y="150" fill="var(--text-dim)" font-size="9" text-anchor="middle">深耕测试方向</text><text x="554" y="178" fill="var(--text-dim)" font-size="9" text-anchor="middle">持续</text>' +
      '<text x="16" y="230" fill="var(--text-dim)" font-size="9.5">箭头方向即推荐顺序；测试方向优先吃透 IEC 62341 与 VESA 认证体系，再补量检测与 DeMura。</text>' +
      '<text x="16" y="248" fill="var(--text-dim)" font-size="9.5">教材参考《半导体显示电子学》（董承远，清华社 2026.5 新版）等——见本文第六节。</text>' +
      '</svg>',

    /* 产业格局四大板块 */
    industryBlocks:
      '<svg class="bl-fig-svg" viewBox="0 0 640 250" role="img" aria-label="2026 显示产业格局：韩系、中国大陆、中国台湾与日系">' +
      '<rect x="0" y="0" width="640" height="250" fill="var(--surface-2)"/>' +
      '<text x="16" y="26" fill="var(--text-soft)" font-size="12" font-weight="600">2026 全球显示产业：中国大陆产值占比升至 53%，面板出货面积 2.23 亿 m²</text>' +
      '<rect x="16" y="44" width="140" height="160" rx="10" fill="var(--surface)" stroke="var(--accent)"/><text x="86" y="68" fill="var(--accent)" font-size="11" font-weight="600" text-anchor="middle">韩系</text><text x="86" y="90" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">三星显示</text><text x="86" y="108" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">QD-OLED/折叠</text><text x="86" y="126" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">LG Display</text><text x="86" y="144" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">Tandem/META</text><text x="86" y="172" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">67 万亿韩元投资</text>' +
      '<rect x="172" y="44" width="140" height="160" rx="10" fill="var(--surface)" stroke="var(--teal)"/><text x="242" y="68" fill="var(--teal)" font-size="11" font-weight="600" text-anchor="middle">中国大陆</text><text x="242" y="90" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">京东方/华星</text><text x="242" y="108" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">维信诺/天马</text><text x="242" y="126" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">辰显/诺视/JBD</text><text x="242" y="144" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">折叠 45% 份额</text><text x="242" y="172" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">Micro LED 8 条产线</text>' +
      '<rect x="328" y="44" width="140" height="160" rx="10" fill="var(--surface)" stroke="var(--border-strong)"/><text x="398" y="68" fill="var(--text-soft)" font-size="11" font-weight="600" text-anchor="middle">中国台湾</text><text x="398" y="90" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">友达/群创</text><text x="398" y="108" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">聚积/欣兴/镎创</text><text x="398" y="126" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">工研院产业链</text><text x="398" y="144" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">Micro LED 联盟</text><text x="398" y="172" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">XR 车窗/1Hz</text>' +
      '<rect x="484" y="44" width="140" height="160" rx="10" fill="var(--surface)" stroke="var(--border-strong)"/><text x="554" y="68" fill="var(--text-soft)" font-size="11" font-weight="600" text-anchor="middle">日系/其他</text><text x="554" y="90" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">索尼</text><text x="554" y="108" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">SRD2/micro-OLED</text><text x="554" y="126" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">夏普 8K Mini LED</text><text x="554" y="144" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">JOLED 破产后</text><text x="554" y="172" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">日本面板收缩</text>' +
      '<text x="16" y="232" fill="var(--text-dim)" font-size="9.5">2026 全球折叠屏面板出货预计 +24% 至 2750 万片；Micro LED 微显示融资活跃，赛富乐斯 3 亿元 C 轮。</text>' +
      '</svg>',

    /* 关键指标演进 2024 → 2026 */
    metricTrend:
      '<svg class="bl-fig-svg" viewBox="0 0 640 250" role="img" aria-label="关键显示指标 2024 到 2026 的演进">' +
      '<rect x="0" y="0" width="640" height="250" fill="var(--surface-2)"/>' +
      '<text x="16" y="26" fill="var(--text-soft)" font-size="12" font-weight="600">关键指标演进（2024 → 2026）：亮度、寿命、刷新率、Micro LED 全线跃升</text>' +
      '<text x="20" y="54" fill="var(--text-dim)" font-size="10">OLED 峰值亮度（旗舰手机）</text>' +
      '<text x="20" y="72" fill="var(--text-soft)" font-size="10">~2000nit → 3000nit（三星 Flex Chroma Pixel）</text>' +
      '<line x1="20" y1="80" x2="520" y2="80" stroke="var(--border)"/>' +
      '<text x="20" y="102" fill="var(--text-dim)" font-size="10">LCD 刷新率（电竞）</text>' +
      '<text x="20" y="120" fill="var(--text-soft)" font-size="10">480–540Hz → 原生 1000Hz（京东方 Oxide）</text>' +
      '<line x1="20" y1="128" x2="520" y2="128" stroke="var(--border)"/>' +
      '<text x="20" y="150" fill="var(--text-dim)" font-size="10">Micro LED 转移良率</text>' +
      '<text x="20" y="168" fill="var(--text-soft)" font-size="10">99.9% 攻关 → &gt;99.99%（LIFT 降本 40%）</text>' +
      '<line x1="20" y1="176" x2="520" y2="176" stroke="var(--border)"/>' +
      '<text x="20" y="198" fill="var(--text-dim)" font-size="10">接口带宽</text>' +
      '<text x="20" y="216" fill="var(--text-soft)" font-size="10">48Gbps（HDMI 2.1）→ 80/96Gbps（DP2.1b/HDMI2.2）</text>' +
      '<line x1="20" y1="224" x2="520" y2="224" stroke="var(--border)"/>' +
      '<text x="20" y="244" fill="var(--text-dim)" font-size="9.5">更多指标见第三节完整演进表；数字来自厂商发布与行业媒体公开资料，部分为机构预估。</text>' +
      '</svg>'
  };

  Object.keys(FIGURES).forEach(function (k) { D.figures[k] = FIGURES[k]; });

  /* -------------------------------------------------------------- 术语表 */
  /* [ 英文术语, 中文术语, 说明 ] —— 与首篇/DSC/HDMI/DP 篇同构，每篇自带、互不干扰。 */
  var GLOSSARY = [
    ['OLED', '有机发光二极管', 'Organic LED：自发光显示，无需背光；含刚性/柔性、Tandem 串联、QD-OLED、印刷 OLED 等分支'],
    ['Tandem OLED', '串联 OLED', '多个发光层串联叠放，同亮度下驱动电流减半，提亮、延寿、降功耗；2026 进入成熟期'],
    ['QD-OLED', '量子点 OLED', '蓝光 OLED + 量子点色转换，无彩色滤光片，色容积约 90% Rec.2020；三星显示主导'],
    ['WOLED', '白光 OLED', '白光 OLED + 滤光片路线（LG 主导），与 QD-OLED 并列的两大 OLED 商业化路径'],
    ['FMM / IJP / ViP', '金属掩膜 / 喷墨印刷 / 无掩膜光刻', 'OLED 三种成膜路线：FMM 蒸镀成熟、IJP 喷墨低成本、ViP 用光刻提开口率'],
    ['EL-QD / QDEL', '电致发光量子点', '后 OLED 时代的自发光量子点候选技术，仍处研发阶段（三星 EL-QD 原型 500nit）'],
    ['TADF', '热活化延迟荧光', '提升 OLED 内量子效率的材料路线，已通过 Pantone 认证（京东方 14" 柔性屏）'],
    ['LCD', '液晶显示', '依赖背光的被动显示；2026 借 Oxide 背板与四基色技术「复兴」'],
    ['Oxide (IGZO)', '氧化物背板', '高迁移率、低漏电的 TFT 背板；支撑高刷与超低刷（京东方 1000Hz、华星 0.01Hz）'],
    ['LTPO', '低温多晶氧化物', 'LTPS + Oxide 复合背板，实现动态刷新率，兼顾高刷与低功耗'],
    ['RGBC', '四基色', '面板侧增加补偿像素（如 UB Cell 5.0 双四基色），色域可达 130%+ BT.2020'],
    ['Mini LED', '次毫米发光二极管', '作 LCD 背光的密集 LED 阵列，分区控光提升对比度；RGB-Mini LED 电视加速放量'],
    ['Micro LED', '微发光二极管', '微米级 LED 自发光，巨量转移量产元年（2026）；主攻 AR 微显示与车载'],
    ['LEDoS', '硅基 Micro LED', 'LED on Silicon：硅基 CMOS 微显示，AR 光机核心，2026 国产份额领先'],
    ['LIFT', '激光转移', 'Laser-Induced Forward Transfer，Micro LED 巨量转移主流技术之一，降本约 40%'],
    ['光波导 SRG / VHG / 阵列', '表面浮雕 / 体全息 / 几何波导', 'AR 光学三大路线：衍射/体全息/镜面阵列，决定光效与量产可行性'],
    ['Micro-OLED', '硅基 OLED', '硅基 CMOS 上的 OLED 微显示，画质好、配 Birdbath/直视（Vision Pro 类）'],
    ['AR-HUD / PHUD', '增强现实风挡 / 全景风挡', '车载 AR 显示；Micro LED AR-HUD 入眼亮度达 18000+ nits'],
    ['电子纸 / ACeP', '反射式显示 / 先进彩色电子纸', '双稳态、仅刷新耗电；ACeP 4000+ 色商业化推迟至 2027 年底'],
    ['裸眼 3D / 光场', '视差 / 光场显示', '无需眼镜的立体显示；光场 + AI 2D→3D 实时转换是 2026 主线'],
    ['串扰率 Crosstalk', '左右眼串像率', '裸眼 3D 关键指标，中国团标要求 &lt;5%'],
    ['Mura / DeMura', '亮度不均 / 补偿', '显示缺陷与灰度补偿修正，产线关键工艺与设备（精测电子等）'],
    ['LT50 / LT70', '半亮度 / 七成亮度寿命', '亮度衰减到初始 50%/70% 的寿命端点，验收必须明确口径'],
    ['AQL', '可接受质量限', '来料/出货抽样检验的核心约定'],
    ['IEC 62341', 'OLED 测量与寿命标准', '含 -6-1（光学测量）、-5-3（残影/寿命）、-6-3（寿命试验）'],
    ['DisplayHDR / ClearMR', 'VESA 显示认证', 'DisplayHDR CTS 1.1/1.2、ClearMR（清晰动态比）、Adaptive-Sync 1.1'],
    ['AEC-Q100', '车规可靠性', '车载芯片应力测试标准；车载显示需满足 -40~85℃ 宽温与功能安全'],
    ['ABL', '自动亮度限制', '全屏高亮时整机降亮度以保护器件/控功耗'],
    ['DP 2.1b / UHBR20', 'DisplayPort 2.1b', 'VESA 接口，UHBR20 80Gbps（载荷 77.37Gbps），DSC 视觉无损'],
    ['HDMI 2.2', '高清晰度多媒体接口 2.2', '96Gbps，4K@480Hz/8K@240Hz，需 Ultra96 认证线材'],
    ['USB4 v2 / TB5', 'USB4 第二代 / 雷雳 5', '80/120Gbps 非对称；TB5 强制内置 DP 2.1 UHBR20']
  ];

  /* ---------------------------------------------------------------- 文章 */
  D.posts.push({
    id: 'display-compilation',
    title: '显示器先进技术与学习资料汇编（2026）',
    titleEn: 'Advanced Display Technologies & Learning Resources Compilation (2026)',
    subtitle: '一份面向测试设备研发工程师的 2026 显示产业全景：从 OLED / LCD / Micro LED / 微显示 / 柔性 / 车载 /' +
      '电子纸 / 裸眼 3D / 接口与测试标准的「技术原理 + 产业状态 + 学习路径」，把公开资料整理成可检索的速查。',
    category: '显示技术',
    tags: ['显示技术', 'OLED', 'Micro LED', '车载显示', '电子纸', '裸眼3D', 'DP 2.1', '测试标准', '学习路径'],
    source: {
      name: '公开行业资料汇编',
      label: '整理自 SID Display Week 2026、各厂商 2026 年度发布与行业媒体公开资料（截至 2026-10）',
      url: 'https://www.sid.org/',
      note: '本篇为面向中文读者的学习性产业与技术汇编，数据来自公开行业资料（厂商发布、行业媒体、标准组织文件），' +
        '整理时间 2026-10-19；部分预测性数字（如出货量）为机构预估，可能与最终统计存在差异。' +
        '标准正式文本请以 IEC / VESA / 国标官方发布版本为准。'
    },
    license: '本页为公开行业资料的学习性中文汇编，仅复述技术原理与 2026 年产业状态；页面内示意图均按所述机理重绘' +
      '（纯内联 SVG，不请求任何外部资源），未转载任何规范原文图表。文中引用的标准、数据与厂商信息请以各原始来源官方发布为准。',
    summary: '这是一份截至 2026 年底的**显示器先进技术汇编**：把 OLED（Tandem / QD-OLED / 印刷 OLED / ViP）、' +
      'LCD 的 Oxide 背板与四基色复兴、Micro LED 量产元年、AR/VR 微显示与光波导、柔性/车载/电子纸/裸眼 3D、' +
      '以及显示接口（DP 2.1b / HDMI 2.2 / USB4 v2）与测试标准（IEC 62341、VESA 认证、DeMura 量检测）' +
      '这些分散在厂商发布与行业媒体里的信息，按「技术原理 + 2026 产业状态 + 测试标准 + 学习路径」重新组织成' +
      '一份可检索的速查。全篇面向**测试设备研发工程师**：凡是和量检测、可靠性、标准合规相关的部分都做了重点展开，' +
      '并在末尾给出从基础光学到前沿产业的四阶段学习路径与教材/会议清单。所有数字来自公开资料整理，' +
      '标准与数据请以官方原文为准。',
    glossary: GLOSSARY,
    chapters: [

      /* ======================================================== 01 技术全景 */
      {
        id: 'overview',
        num: '01',
        title: '技术全景速览',
        titleEn: 'Technology Panorama at a Glance',
        lead: '2026 年显示产业的主线是「多技术路线并行竞争、按场景分工」：没有谁真正替代谁，' +
          '而是 OLED、LCD、Micro LED 各守一段场景。看懂这张全景图，是后续分技术深挖的前提。',
        sections: [
          {
            id: 'mainline',
            title: '主线：从参数竞赛到场景分工',
            titleEn: 'Main Trend: From Spec War to Scenario Division',
            blocks: [
              { t: 'p', v: '2026 年显示产业的主线是**多技术路线并行竞争、按场景分工**：OLED 进入成熟期并向高亮/长寿命/' +
                '新形态演进；LCD 借 Oxide 背板与四基色技术「复兴」；Micro LED 跨过量产元年，率先落地车载 HUD、' +
                'AR 微显示与高端商显；AI 与显示全链路融合成为新变量。' },
              { t: 'list', items: [
                ['成熟消费电子', 'OLED 占手机/笔电/电视的体验与寿命高地，Tandem 与 QD-OLED 把功耗与亮度推上新台阶'],
                ['大屏与成本', 'LCD 守百吋大屏、电竞与商显，靠 Oxide 高刷与四基色扩色域维持性价比'],
                ['增量场景', 'Micro LED 先在 AR 微显示与车载 HUD 放量，而非直接冲击电视'],
                ['新变量', 'AI 融进制造、产品与检测端，把缺陷分类、画质与 2D→3D 成本打下来']
              ] },
              { t: 'callout', kind: 'info', title: '面向测试研发的角度',
                v: '本篇特意把「测试、标准与量检测」单列一章——因为对测试设备研发而言，' +
                  'IEC 62341、VESA 认证体系与 DeMura/量检测才是和本职工作强相关的硬知识。' },
              { t: 'p', v: '**为什么是 2026 这个时间窗**：Tandem OLED 进入成熟期、Micro LED 跨过量产元年、' +
                'DP 2.1b/HDMI 2.2 接口换代三件事几乎同时发生，使这一年的技术状态特别适合做一次「快照式」整理——' +
                '既不像 2023 那样仍在路线图阶段，也不像 2028 那样格局已定。' }
            ]
          },
          {
            id: 'landscape',
            title: '技术族成熟度全景',
            titleEn: 'Maturity Landscape by Technology Family',
            blocks: [
              { t: 'fig', id: 'techLandscape', caption: '2026 三大技术族（自发光 OLED / LCD 演进 / Micro LED）与各自主攻场景' },
              { t: 'table', head: ['技术族', '代表技术', '成熟度', '2026 年状态与主要玩家'], rows: [
                ['自发光 OLED', 'Tandem / QD-OLED / 印刷 OLED', '规模量产', 'LG 三代 Tandem 功耗 -18%、寿命翻倍；三星 8.5 代 Q1 线 2026.3 满产、良率 >92%'],
                ['LCD 演进', 'Oxide 背板 / 四基色 RGBC', '量产爬坡', '京东方 24.5" 原生 1000Hz Oxide；华星双四基色色域 130%+ BT.2020'],
                ['Micro LED', 'TFT 基大屏 / 硅基 LEDoS / 车载 HUD', '量产元年', '巨量转移良率 >99.99%；AR 微显示模组 8.7 亿美元（+100%）'],
                ['近眼微显示', 'Micro-OLED / Micro LED / 光波导', '快速放量', '全彩 Micro LED + 衍射/阵列光波导成高端 AR 标配；国产份额 >70%'],
                ['车载', 'AR-HUD / PHUD / 滑卷中控', '高速增长', 'SID 2026 增长最快赛道；华星智能座舱 3.0 整合 Micro LED + 印刷 OLED'],
                ['反射式', '彩色电子纸 ACeP / Gallery 3', '细分放量', 'ESL 占模组出货 61%；ACeP 4000 色版推迟至 2027 底'],
                ['裸眼 3D / 光场', '柱状透镜 / 光场 / AI 2D→3D', '商用加速', '华星 8.5 代裸眼 3D 产线量产；京东方 AI-3D 60fps 实时转换'],
                ['接口信号', 'DP 2.1b / HDMI 2.2 / USB4 v2', '开始普及', 'UHBR20 80Gbps + DP80LL 有源线 3m；HDMI 2.2 96Gbps 需 Ultra96 线材'],
                ['后 OLED 储备', 'EL-QD / QDEL 自发光量子点', '研发阶段', '三星 EL-QD 原型 500nit（SID 杰出论文）；尚无量产时间表']
              ] }
            ]
          },
          {
            id: 'judgement',
            title: '阶段判断：没有单一 OLED 替代者',
            titleEn: 'Verdict: No Single OLED Killer',
            blocks: [
              { t: 'callout', kind: 'key', title: '一句话结论',
                v: '短期内没有单一「OLED 替代者」。2026–2028 是「Tandem OLED / QD-OLED / Mini LED /' +
                  'RGB-Mini LED / Micro LED（细分）」按场景竞争的时代；Micro LED 的真正放量在 AR 微显示与车载，而非电视。' },
              { t: 'p', v: '这条判断决定了测试设备研发的资源分配：既要跟进 OLED 的寿命/残影/DeMura 体系，' +
                '也要布局 Micro LED 的晶圆级 PL 巨量检测与 AR 微显示的亚像素级 AOI——两条线都不能丢。' },
              { t: 'callout', kind: 'key', title: '本篇怎么读',
                v: '建议先读第一节全景与第九节测试标准建立框架，再按兴趣选读器件章节；' +
                  '末尾的学习路径与资料清单可作为长期索引，标准与数据一律以官方原文为准。' }
            ]
          }
        ]
      },

      /* ======================================================== 02 OLED */
      {
        id: 'oled',
        num: '02',
        title: '自发光 OLED：从参数竞赛到体验与寿命',
        titleEn: 'Emissive OLED: From Spec War to Experience and Lifetime',
        lead: 'OLED 2026 年的关键词是「串联化、量子点化、印刷化」：Tandem 解决寿命与功耗，' +
          'QD-OLED 解决色容积，IJP/ViP 解决大尺寸与成本。本章拆开这几条路线。',
        sections: [
          {
            id: 'tandem',
            title: 'Tandem OLED（串联结构）',
            titleEn: 'Tandem OLED (Stacked Structure)',
            blocks: [
              { t: 'p', v: '**原理**：多个 RGB 发光堆叠串联，每层分担约一半电流，同亮度下驱动电流减半 → ' +
                '亮度更高、功耗更低、每层衰减更慢（寿命显著延长），代价是驱动电压叠加、工艺更难。' },
              { t: 'p', v: '**2026 进展**：LG 第三代串联 OLED 功耗较上代 -18%、预估寿命翻倍；车载版最高 1200nit、' +
                '室温稳定工作 >15000 小时。' },
              { t: 'p', v: '**实测参考**（显示器）：tandem 全屏持续约 330nit、HDR 小窗峰值 1000–1300nit；' +
                'QD-OLED 全屏约 250–300nit、峰值 800–1000nit；tandem 带偏光片，环境光下黑位更扎实，长时间使用色偏更小。' }
            ]
          },
          {
            id: 'qd-oled',
            title: 'QD-OLED 与第五代（5 层 Tandem QD-OLED）',
            titleEn: 'QD-OLED and the 5-Layer Tandem Generation',
            blocks: [
              { t: 'p', v: '**原理**：蓝色 OLED + 量子点色转换，无彩色滤光片，色容积高（约 90% Rec.2020）；' +
                '钻石型 RGB 子像素排布，文字边缘更锐利。' },
              { t: 'p', v: '**2026 进展**：三星显示 8.5 代 QD-OLED 产线（Q1）2026 年 3 月满产、良率突破 92%，' +
                '65" 成本较 2024 降约 35%；77" QD-OLED 电视峰值 3000nit 并配 Glare-Free 抗反射。' },
              { t: 'p', v: '**结构演进**：2026 年 2 月三星宣布 5 层 Tandem QD-OLED（EL Gen 3 材料），发光效率 ×1.3、' +
                '寿命 ×2（对比 4 层单堆叠）；已见于 MSI MPG 272URX、BenQ MOBIUZ EX321UZ（4K 240Hz、0.03ms、' +
                'DisplayHDR True Black 500、DP 2.1a）。' },
              { t: 'callout', kind: 'warn', title: '已知短板',
                v: '无偏光片导致环境光下黑位抬升（「发紫/发灰」）；高亮白场 ABL 自动亮度限制更积极；' +
                  '连续工作 4–6h 可出现白点漂移，需周期性校准。' }
            ]
          },
          {
            id: 'printing',
            title: '印刷 OLED 与 ViP 无掩膜工艺',
            titleEn: 'Printed OLED and ViP Maskless Process',
            blocks: [
              { t: 'fig', id: 'oledRoadmap', caption: 'OLED 三种成膜路线：FMM 主流、IJP 与 ViP 是下一代低成本化方向' },
              { t: 'p', v: '**印刷 OLED（IJP）**：喷墨打印有机材料，材料利用率高、无需 FMM 金属掩膜，' +
                '适合大中尺寸与低成本化。2026：TCL 华星 28" 印刷 OLED 折叠便携桌面显示（展开厚 4.48mm）；' +
                '联想拯救者 R9000P 全球首发喷墨打印 OLED 笔电，印刷显示进入消费级。' },
              { t: 'p', v: '**ViP（Visionox 无金属掩膜版）**：以半导体光刻替代 FMM，OLED 开口率从约 29% 提升至 69% → ' +
                '寿命/亮度/分辨率受益；ViP + Tandem 的 4K 笔电屏较 FMM 同类色彩更准、日常功耗 -10%。' },
              { t: 'p', v: '**其他**：韩国 ETRI 低温喷墨单基板堆叠 QD-OLED（免额外量子点基板贴合）；' +
                'TADF（热活化延迟荧光）广色域材料通过 Pantone 认证（京东方 14" 柔性屏，行业首款）。' }
            ]
          },
          {
            id: 'formfactor',
            title: '新形态与功能集成',
            titleEn: 'New Form Factors and Functional Integration',
            blocks: [
              { t: 'list', items: [
                ['无痕折叠', '三星 CES 2026 展示激光打孔金属显示板分散应力；京东方「镜感 0 痕」折痕深度/斜率 -60%、机械强度 +50%、-40℃ 弯折（OPPO Find N6，TÜV 60 万次无感折痕）；天马镜面无痕折叠 20 万次开合、折痕 -45%'],
                ['滑卷 / 曲面车载', '华星全球首款 28" 印刷 OLED 滑卷中控 + 28" 曲面手扶显示'],
                ['屏下传感', '三星 500PPI SensorOLED 将 OLED 像素与 OPD 共蒸镀，3 秒无感测心率/血压；Flex Magic Pixel 侧视防窥'],
                ['可拉伸', 'LG 面向人形机器人的 P-OLED（tandem 技术，车规级环境）；三星可拉伸 MicroLED 显示屏 200PPI']
              ] }
            ]
          }
        ]
      },

      /* ======================================================== 03 LCD */
      {
        id: 'lcd',
        num: '03',
        title: 'LCD 的新一轮进化：Oxide 与四基色',
        titleEn: 'LCD Reborn: Oxide Backplane and Quad-Color',
        lead: 'LCD 并没有被 OLED 取代，而是用 Oxide 背板把刷新率推到原生 1000Hz、用四基色把色域推到 130%+ BT.2020，' +
          '再用 Mini LED 背光补齐对比度。这一章看它的三条进化线。',
        sections: [
          {
            id: 'oxide',
            title: 'Oxide 背板与高刷新率',
            titleEn: 'Oxide Backplane and High Refresh',
            blocks: [
              { t: 'p', v: '**Oxide（IGZO）高迁移率**：京东方 24.5" 原生 FHD **1000Hz** 电竞屏（1ms）；' +
                '华星「超高迁 50」氧化物（迁移率 50cm²/V·s）+ ARR 分区变频，实现 LCD **0.01Hz** 超低刷新率、功耗 -50%；' +
                '兼顾 LTPS 的高刷与 Oxide 的低漏电。' },
              { t: 'callout', kind: 'info', title: '高刷与低刷为何能共存',
                v: '高迁移率让 TFT 充放电更快（支撑 1000Hz），而 Oxide 的低漏电又允许长时间保持帧（支撑 0.01Hz）' +
                  '——同一背板技术两种能力兼得，是 LCD 2026 年的关键卖点。' },
              { t: 'p', v: '**LTPO 与 Oxide 的关系**：LTPO = LTPS + Oxide 复合背板，兼顾 LTPS 的高迁移率与 Oxide 的低漏电，' +
                '因此能在 1–120Hz 间无级变频；2026 年这套背板已从旗舰下放到主流手机与笔电，是高刷 + 低功耗的通用方案。' }
            ]
          },
          {
            id: 'rgbc',
            title: '四基色（RGBC）扩色域',
            titleEn: 'Quad-Color (RGBC) for Wider Gamut',
            blocks: [
              { t: 'p', v: '**四基色（RGBC）**：面板侧新增补偿像素，色域大幅提升。京东方 UB Cell 5.0' +
                '「面板 RGBC + 背光 RGBC」双四基色，85" 色域 130% BT.2020、能耗 -50%；' +
                '华星 WHVA Ultra 原生 RGBC 达 131% BT.2020。' },
              { t: 'p', v: '四基色不是简单堆像素，而是把「面板侧 + 背光侧」两套 RGBC 协同，既扩色域又降功耗——' +
                '这是 LCD 在色域上反超早期 OLED 的工程路径。' },
              { t: 'list', items: [
                ['落地形态', '双四基色多用于高端电视与商用大屏（85" 级），在保持高亮的同时把能耗压到接近 OLED 区间'],
                ['协同红利', '面板 RGBC 解决「亮」、背光 RGBC 解决「色」，二者叠加才达到 130%+ BT.2020 且能耗 -50%']
              ] }
            ]
          },
          {
            id: 'miniled',
            title: 'Mini LED 背光与健康护眼',
            titleEn: 'Mini LED Backlight and Eye Care',
            blocks: [
              { t: 'p', v: '**Mini LED 背光**：分区数竞赛继续（115" 2048 分区下探 3 万元内），光晕控制仍是难点；' +
                '2026 前三季度激光电视 85 万台 vs Mini LED 仍是小众，但 2027 Mini LED 电视出货预计首破 3000 万台。' },
              { t: 'list', items: [
                ['分区控光', '更多分区 = 更高对比度，但光晕（halo）控制是画质与成本的平衡点'],
                ['健康/护眼', '京东方「自然光」BNL（光谱/偏振/光形/时变四维优化）；天马天工屏蓝光占比 4.7%、寿命 +100%']
              ] },
              { t: 'p', v: '**RGB-Mini LED 电视加速放量**：在 LCD 背光里直接用 RGB 三色 Mini LED 取代白光 + 量子点，' +
                '色域与对比度进一步贴近 OLED，且避免了量子点层的寿命与镉顾虑；2027 年 Mini LED 电视出货预计首破 3000 万台。' }
            ]
          }
        ]
      },

      /* ======================================================== 04 Micro LED + 近眼 */
      {
        id: 'microled',
        num: '04',
        title: 'Micro LED 与近眼微显示：2026 量产元年',
        titleEn: 'Micro LED and Near-Eye Micro-Display: The 2026 Mass-Production Year',
        lead: '2026 被称为 Micro LED 量产元年，但真正的放量在 AR 微显示与车载，而非电视。' +
          '这一章先讲 Micro LED 的难与三条应用家族，再看近眼微显示的方案与光波导。',
        sections: [
          {
            id: 'families',
            title: '为什么难，以及三条应用家族',
            titleEn: 'Why It Is Hard, and Three Application Families',
            blocks: [
              { t: 'fig', id: 'microledFamilies', caption: 'Micro LED 三条应用家族：TFT 大屏、硅基 LEDoS 微显示与 AI 光互连' },
              { t: 'p', v: '**为什么难**：巨量转移（数百万颗微米级 LED 芯片）、全彩化（红光效率/波长一致性）、' +
                '检测修复（坏点与 Mura）。2026 年巨量转移良率普遍突破 99.99%，LIFT 激光转移使成本降约 40%，' +
                '8 英寸晶圆 + GaN-on-Sapphire 推动红光全彩化成熟。' },
              { t: 'p', v: '**三条应用家族**（Yole 2026 观点）：① TFT 玻璃基大屏（电视/手表，成本仍高）；' +
                '② 硅基 CMOS 微显示 LEDoS（AR 眼镜，中国厂商主导，CAGR 121%，2031 年约 25 亿美元）；' +
                '③ AI 数据中心光互连（新兴方向）。' },
              { t: 'callout', kind: 'key', title: '量产元年判据',
                v: '行业普遍把「巨量转移良率突破 99.99%」作为 Micro LED 跨过量产元年的硬门槛——低于此，' +
                  '数百万颗芯片的修复成本会吃掉良率红利。LIFT 激光转移把单位转移成本压低约 40%，是达标的关键工艺。' }
            ]
          },
          {
            id: 'near-eye',
            title: 'AR/VR 近眼显示：微显示 + 光波导',
            titleEn: 'AR/VR Near-Eye Display: Micro-Display and Waveguide',
            blocks: [
              { t: 'table', head: ['方案', '亮度', '对比度/响应', '特点与用途'], rows: [
                ['Micro LED（硅基）', '>100,000nit', '极高 / 纳秒级', '自发光、无烧屏，光波导路线唯一现实选择；全彩化与成本是瓶颈，光机可占整机 BOM 30%+'],
                ['Micro-OLED（硅基）', '5,000–10,000nit', '接近 ∞ / 微秒级', '画质最好，配 Birdbath/直视型（XREAL、Vision Pro 类）；配光波导入眼亮度不足'],
                ['LCoS', '1,000–3,000nit', '中等 / 毫秒级', '2026 新品已几乎淘汰（响应慢、对比度低）']
              ] },
              { t: 'p', v: '**光波导**：衍射式（SRG/VHG，光效 0.3–5%）vs 阵列/几何式（5–10%+）；' +
                '体全息 VHG 理论效率可达 80%，2026 处中试向量产过渡（尼卡光学年产 40 万片体全息波导产线）。' },
              { t: 'list', items: [
                ['Birdbath / 直视', 'Micro-OLED 配 Birdbath 是当下最成熟的消费 AR 形态（XREAL、Vision Pro 类），但体积与入眼亮度受限'],
                ['衍射波导', 'SRG 光机轻薄、可量产出货，是 2026 主流；全彩化与光效是仍待突破的瓶颈'],
                ['阵列波导', '光效最高（5–10%+），但多层贴合良率与成本压力大，多用于单绿/单目方案']
              ] }
            ]
          },
          {
            id: 'waveguide-products',
            title: '产品坐标与国产格局',
            titleEn: 'Product Landscape and Domestic Players',
            blocks: [
              { t: 'list', items: [
                ['消费级 AR', 'Meta Ray-Ban Display（$799，单目 600×600，阵列光波导）；Rokid Glasses（49g，双 Micro LED + 衍射波导，入眼 1500nit）'],
                ['高端 AR', '雷鸟 X3 Pro（全彩 Micro LED X-cube 合光，入眼 5000nit）；XREAL One Pro（87g，Sony micro-OLED）'],
                ['标志产品', '华星 140,000+nits Micro LED AR-HUD（入眼 18000+nits）；天马 120,000nits 全彩 HUD、透明「天轩」屏（透过率 >60%）'],
                ['国产格局', 'JBD、视涯等微显示芯片全球份额 >70%；水晶光电、歌尔等光波导份额 >50%——国产少有领先的领域']
              ] },
              { t: 'p', v: '**Micro LED AR-HUD 成为车载新标杆**：把自发光 Micro LED 直接做进风挡投影光机，' +
                '入眼亮度冲到 18000+nits，从根本上解决强光下「看不清」的老问题，是 2026 年车载显示增长最快的子赛道。' },
              { t: 'callout', kind: 'info', title: '对量检测的意义',
                v: '硅基 LEDoS 做到 5000–10000PPI，意味着晶圆级 AOI 与 PL 巨量检测要处理亚微米像素——' +
                  '这正是 Micro LED 量产元年给测试设备研发带来的核心增量需求。' }
            ]
          }
        ]
      },

      /* ======================================================== 05 应用纵深 */
      {
        id: 'apps',
        num: '05',
        title: '应用场景纵深：车载、电子纸、裸眼 3D',
        titleEn: 'Application Deep-Dive: Automotive, E-Paper, Glasses-Free 3D',
        lead: '除了手机与电视，显示技术正在车载、反射式电子纸与裸眼 3D 这几个差异化场景里加速落地。' +
          '这些场景对可靠性与量检测的要求，往往比消费电子更苛刻。',
        sections: [
          {
            id: 'automotive',
            title: '车载显示：智能座舱增长最快赛道',
            titleEn: 'Automotive: The Fastest-Growing Cockpit Segment',
            blocks: [
              { t: 'list', items: [
                ['华星智能座舱 3.0', 'Micro LED AR-HUD（4.6"）+ PHUD（12"）+ 印刷 OLED 滑卷中控（28"）+ 曲面手扶显示'],
                ['LG 第三代串联 OLED 车载屏', '2026 年内量产（1200nit / 15000h）'],
                ['天马 / 友达', '天马 120,000nits HUD 破解强光看不清痛点；友达 XR 互动车窗、屏下隐藏式 DMS 摄像头']
              ] },
              { t: 'callout', kind: 'warn', title: '车规要点',
                v: 'AEC-Q100、-40℃~85℃ 宽温、长寿命、功能安全——与**测试设备研发强相关**，' +
                  '车载显示的老化、宽温与可靠性测试标准比消费电子更严。' }
            ]
          },
          {
            id: 'epaper',
            title: '电子纸与反射式显示',
            titleEn: 'E-Paper and Reflective Display',
            blocks: [
              { t: 'p', v: '2026 全球墨水屏产业规模约 58.7 亿美元（+32.8%），ESL 电子标签占模组出货 61.3%；' +
                '元太占膜片 82.1%，中国大陆模组产能首超 50%。' },
              { t: 'p', v: '**彩色化**：ACeP / Gallery 3 良率突破使大尺寸彩色首次跨过商用成本拐点；' +
                '但 E Ink 官方已将 ACeP（4000+ 色）商业化推迟至 2027 年底以后（刷新率与残影问题）。' },
              { t: 'list', items: [
                ['代表规格', '13.3" ACeP 1600×1200（150PPI，全刷 25s）；28" 广告机 3840×1080；工作温度普遍 15–35℃'],
                ['趋势', '柔性彩色电子纸、双稳态（仅刷新耗电）、NFC 无源取电 + 太阳能（5 年免维护）']
              ] }
            ]
          },
          {
            id: 'naked-3d',
            title: '裸眼 3D 与光场显示',
            titleEn: 'Glasses-Free 3D and Light Field',
            blocks: [
              { t: 'p', v: '**量产三派**：视差屏障、柱状透镜、指向背光；光场显示公认下一代主轴。' +
                '2026 关键变化是**光场 + AI 耦合**：AIGC 把 2D→3D 成本打下来，视角从 60° 扩展到 120°+。' },
              { t: 'p', v: '**标志进展**：京东方 AI-3D 光场模组 BD3D-LF02（60fps 实时转换、延迟 <15ms）；' +
                '华星 8.5 代裸眼 3D 液晶产线量产（月产 15 万片，串扰 <2%）；索尼 Spatial Reality Display 2' +
                '（4K、120°、眼球追踪）；京东方 18" 4K 240Hz 裸眼 3D 笔记本。' },
              { t: 'callout', kind: 'info', title: '标准化',
                v: '中国电子视像行业协会 2026.7 发布《裸眼 3D LED 显示屏通用技术规范》（串扰率 <5%、最佳观看距离误差 ±0.5m）；' +
                  'GB/T 44892-2026 等国标团标陆续落地。' }
            ]
          }
        ]
      },

      /* ======================================================== 06 接口与 AI */
      {
        id: 'signal-ai',
        num: '06',
        title: '接口信号与 AI 融合',
        titleEn: 'Interface Signals and AI Integration',
        lead: '高分辨率无压缩传输，让 DP 2.1b 的 UHBR20 成为 2026 高端显示器的刚需；' +
          '而 AI 正从制造、产品到检测端全面嵌入显示产业链。这一章把接口带宽与 AI 两条线讲清。',
        sections: [
          {
            id: 'interfaces',
            title: '显示接口与信号链路',
            titleEn: 'Display Interfaces and Signal Chain',
            blocks: [
              { t: 'fig', id: 'bandwidthBars', caption: '显示接口带宽（2026）：4K240Hz 10bit 约需 68–71Gbps，超过 HDMI 2.1 的 48Gbps' },
              { t: 'table', head: ['标准', '带宽', '关键能力', '2026 状态'], rows: [
                ['DisplayPort 2.1b（VESA）', 'UHBR20 80Gbps（载荷 77.37Gbps）', '128b/132b；DSC 视觉无损；DP80LL 有源线 3m', '高端显示器/显卡开始搭载'],
                ['HDMI 2.2', '96Gbps', '4K@480Hz / 8K@240Hz / 10K@120Hz；LIP 音画同步指示', '需 Ultra96 认证线；整机支持少'],
                ['USB4 v2.0 / Thunderbolt 5', '80 / 120Gbps（非对称）', 'TB5 强制内置 DP 2.1 UHBR20', '笔记本/扩展坞普及中']
              ] },
              { t: 'callout', kind: 'key', title: 'DP 2.1b 的 UHBR20',
                v: 'UHBR20 = 20 Gbps/lane × 4 lane = 80 Gbps 链路、约 77.37 Gbps 应用载荷；配合 DSC 才能稳妥驱动 8K60 10bpc RGB。' }
            ]
          },
          {
            id: 'why-uhbr',
            title: '为什么高端显示器需要 DP 2.1 UHBR20',
            titleEn: 'Why High-End Displays Need DP 2.1 UHBR20',
            blocks: [
              { t: 'p', v: '**工程参考**：UWQHD 360Hz（10bit 4:4:4）约需 53.5Gbps；4K 240Hz 10bit 约需 68–71Gbps——' +
                '超过 HDMI 2.1 的 48Gbps，是 DP 2.1 UHBR20 成为 2026 高端显示器刚需的原因。' },
              { t: 'p', v: '换句话说，HDMI 2.1 的 48Gbps 在 4K240Hz 10bit 这种「重」格式上已经不够用；' +
                '要免压缩就必须走 DP 2.1b 的 UHBR20，或接受 DSC 视觉无损压缩。' },
              { t: 'callout', kind: 'info', title: '线缆认证不能省',
                v: 'UHBR20 需 DP80 认证线（4 通道稳定 20Gbps/通道）；未认证的老线缆即便物理接口是 DP，' +
                  '也只建议跑到 HBR3 及以下，强行 UHBR 不保证链路可靠性。' }
            ]
          },
          {
            id: 'ai',
            title: 'AI 与显示全链路融合',
            titleEn: 'AI Across the Entire Display Chain',
            blocks: [
              { t: 'list', items: [
                ['制造端', '京东方「蓝鲸」显示大模型（AI+制造/产品/运营），生产效率 +30%、智能 DeMura 矫正时间 -60%；维信诺「维擎」大模型使 2025 成本费用率 -10.48%、OLED 毛利率 +6.94%'],
                ['产品端', 'AI 眼动追踪裸眼 3D、AI 画质芯片（联发科 Pentonic 2000 类）、AI 防窥/防烧屏算法'],
                ['检测端', 'AI 缺陷分类、深度学习 Mura 检测已成设备商标配（见第五节量检测）']
              ] },
              { t: 'callout', kind: 'warn', title: '对测试设备的含义',
                v: 'AI 缺陷分类与像素级颜色管理正成为新平台标配——这意味着量检测设备的软件栈，' +
                  '必须从「固定规则」走向「模型 + 数据」的迭代能力。' },
              { t: 'p', v: '**AI 不是单点工具而是「贯穿链」**：从 AOI 缺陷分类、DeMura 补偿参数寻优，到画质芯片里的防烧屏策略，' +
                '同一套数据闭环会在制造、产品、检测三端反复出现——测试设备若能沉淀客户数据，就握住了复购的钥匙。' }
            ]
          }
        ]
      },

      /* ======================================================== 07 指标演进 */
      {
        id: 'metrics',
        num: '07',
        title: '关键指标演进（2024 → 2026）',
        titleEn: 'Key Metric Evolution (2024 to 2026)',
        lead: '把分散在各节的硬指标收拢成一张时间轴：亮度、寿命、刷新率、色域、Micro LED 与接口带宽，' +
          '在 2024→2026 之间全线跃升。',
        sections: [
          {
            id: 'brightness-life',
            title: '亮度与寿命',
            titleEn: 'Brightness and Lifetime',
            blocks: [
              { t: 'fig', id: 'metricTrend', caption: '关键显示指标 2024 到 2026 的演进：亮度、寿命、刷新率、Micro LED 全线跃升' },
              { t: 'table', head: ['指标', '2024 前后', '2026 现状', '说明'], rows: [
                ['OLED 峰值亮度（旗舰手机）', '~2000nit', '3000nit（三星 Flex Chroma Pixel）', 'BT.2020 覆盖 96%'],
                ['Tandem OLED 寿命', '一代 tandem', '三代：寿命翻倍、功耗 -18%', 'LG，车载 15000h@1200nit'],
                ['QD-OLED 寿命/效率', '4 层单堆叠', '5 层 tandem：效率 ×1.3、寿命 ×2', 'EL Gen 3']
              ] },
              { t: 'p', v: '**亮度与寿命是 OLED 的两难**：Tandem（串联）通过把电流分摊到多层，让「同亮度下电流减半」，' +
                '从而同时把峰值亮度推高、把衰减速度压低——这是 2026 年 OLED 旗舰能上 3000nit 且寿命翻倍的根本原因。' }
            ]
          },
          {
            id: 'refresh-color',
            title: '刷新率、色域与 Micro LED',
            titleEn: 'Refresh, Gamut and Micro LED',
            blocks: [
              { t: 'table', head: ['指标', '2024 前后', '2026 现状', '说明'], rows: [
                ['LCD 刷新率（电竞）', '480–540Hz', '原生 1000Hz（Oxide）', '京东方 24.5" FHD'],
                ['LCD 色域（高端 TV）', '~100% DCI-P3', '130%+ BT.2020（双四基色）', 'UB Cell 5.0 / WHVA Ultra'],
                ['Micro LED 转移良率', '99.9% 级攻关', '>99.99%（LIFT 降本 40%）', '量产元年判据'],
                ['硅基 Micro LED PPI', '~3000PPI', '5131PPI（华星单片全彩）/ 10000PPI（诺视 2.5μm）', '视网膜级'],
                ['AR-HUD 亮度', '~15000nit', '140,000nit（自发光）', '入眼 18000+nits'],
                ['折叠屏折痕', '明显可见', '「视觉无折痕」（深度/斜率 -60%）', '60 万次折叠认证']
              ] },
              { t: 'callout', kind: 'info', title: '数字怎么读',
                v: '上表是「相对 2024 的跃升幅度」而非绝对值：例如 LCD 色域从 ~100% DCI-P3 跳到 130%+ BT.2020，' +
                  '靠的是双四基色而非单一材料突破；Micro LED 的 PPI 数字（5131/10000）已是视网膜级密度。' }
            ]
          },
          {
            id: 'bandwidth-ai',
            title: '接口带宽与 AI 裸眼 3D',
            titleEn: 'Interface Bandwidth and AI 3D',
            blocks: [
              { t: 'table', head: ['指标', '2024 前后', '2026 现状', '说明'], rows: [
                ['接口带宽', '48Gbps（HDMI 2.1）', '80Gbps（DP2.1b）/ 96Gbps（HDMI2.2）', '4K 240Hz 免压缩'],
                ['AI 裸眼 3D 转换', '离线渲染', '60fps 实时、<15ms 延迟', 'BD3D-LF02']
              ] },
              { t: 'callout', kind: 'key', title: '数字以官方原文为准',
                v: '上表数字来自厂商发布与行业媒体公开资料，部分为机构预估；实际产品规格与标准请以官方发布版本为准。' },
              { t: 'p', v: '**带宽与 AI 是两条独立主线**：接口带宽解决「无压缩传得动」，AI 裸眼 3D 解决「2D→3D 实时生得成」；' +
                '前者决定线材与接口选型（DP 2.1b 还是 HDMI 2.2），后者决定算法平台与延迟预算（60fps / <15ms）。' }
            ]
          }
        ]
      },

      /* ======================================================== 08 产业格局 */
      {
        id: 'industry',
        num: '08',
        title: '产业格局（2026）',
        titleEn: 'Industry Landscape (2026)',
        lead: '2026 全球显示产业的重心继续向中国倾斜，但韩系在 OLED 高端、日系在 micro-OLED 仍各擅胜场；' +
          'Micro LED 与 AR 微显示是中国少有领先全球的环节。',
        sections: [
          {
            id: 'korea',
            title: '韩系：三星显示与 LG Display',
            titleEn: 'Korea: Samsung Display and LG Display',
            blocks: [
              { t: 'p', v: '三星显示：QD-OLED / 无痕折叠 / SensorOLED / EL-QD 储备；2026.7 公布 67 万亿韩元' +
                '（约 3200 亿元）牙山投资，覆盖手机/IT/XR/车载。' },
              { t: 'p', v: 'LG Display：第三代 Tandem OLED、META 3.0（236cd/A）、P-OLED、透明 QD-OLED。' },
              { t: 'callout', kind: 'info', title: '韩系的战略重心',
                v: '三星把 67 万亿韩元押在「手机/IT/XR/车载」全场景，LG 则把 Tandem 与透明 OLED 当作差异化护城河——' +
                  '二者都在把 OLED 从「消费电子」扩到「车载与 XR」，与 Micro LED 抢增量场景。' }
            ]
          },
          {
            id: 'china',
            title: '中国大陆：京东方 / 华星 / 维信诺 / 天马',
            titleEn: 'Mainland China: BOE, CSOT, Visionox, Tianma',
            blocks: [
              { t: 'p', v: '京东方（折叠 45% 份额、1000Hz Oxide、蓝鲸大模型、205" Micro LED）；' +
                'TCL 华星（印刷 OLED、WHVA、Micro LED AR-HUD、智能座舱 3.0）；维信诺（ViP、AR 微显示）；' +
                '天马（车载/无痕折叠/Micro LED）。' },
              { t: 'fig', id: 'industryBlocks', caption: '2026 全球显示产业：中国大陆产值占比 53%，面板出货面积 2.23 亿 m²' },
              { t: 'p', v: '**中国大陆的优势在「规模 + 速度」**：京东方与华星在大尺寸与高刷上领跑，维信诺/天马/辰显/诺视/JBD' +
                '在印刷 OLED、无痕折叠、Micro LED 与 LEDoS 上多点突破——折叠屏 45% 份额、Micro LED 8 条产线（全球 17 条）是硬指标。' }
            ]
          },
          {
            id: 'taiwan-japan',
            title: '中国台湾、日系与全球格局',
            titleEn: 'Taiwan, Japan and the Global Picture',
            blocks: [
              { t: 'list', items: [
                ['中国台湾', '友达（Micro LED 互动、1Hz LTPS、XR 车窗）；群创（工研院 Micro LED RGB 全彩模组）；聚积、欣兴、镎创（工研院产业链联盟）'],
                ['日系 / 其他', '索尼（Spatial Reality Display 2、micro-OLED 标杆）；夏普（120" 8K Mini LED 下探 5 万元内）；JOLED 破产后日本面板整体收缩']
              ] },
              { t: 'callout', kind: 'info', title: '全球数字',
                v: '中国显示产业产值全球占比升至 **53%**（2025），面板出货面积 2.23 亿 m²；2026 中国大陆 Micro LED' +
                  ' 8 英寸以上晶圆产线 8 条（全球 17 条）。2026 全球折叠屏面板出货预计 +24% 至 2750 万片，' +
                  '苹果、三星、华为为前三大采购方。' },
              { t: 'p', v: '**台湾与日系的定位**：中国台湾靠友达/群创 + 工研院联盟在 Micro LED 与车载 XR 上卡位；' +
                '日系则收缩面板产能、聚焦 micro-OLED 与专业显示（索尼标杆、夏普 8K Mini LED）。整体格局是「中韩主沉浮、台日守专精」。' }
            ]
          }
        ]
      },

      /* ======================================================== 09 测试与标准 */
      {
        id: 'testing',
        num: '09',
        title: '测试、标准与量检测（测试设备研发重点）',
        titleEn: 'Testing, Standards and Metrology (Key for Test Equipment R&D)',
        lead: '这一章是写给测试设备研发工程师的：从 IEC 62341 的光学/电学测量，到 VESA 的 DisplayHDR / ClearMR /' +
          'Adaptive-Sync 认证，再到可靠性老化与产线 DeMura 量检测——把标准和设备串成一条链路。',
        sections: [
          {
            id: 'optical-elec',
            title: '光学与电学测量标准',
            titleEn: 'Optical and Electrical Measurement Standards',
            blocks: [
              { t: 'table', head: ['标准', '内容与要点'], rows: [
                ['IEC 62341-6-1', 'OLED 显示器件光学/电光参数的测量条件与方法（亮度、色坐标、白点、色域、功耗）——供应商数据可比性的基础'],
                ['IEC 62341-5-3', 'OLED 残影（image sticking）与寿命的标准测量方法；寿命以「工作时间内的亮度衰减」定义，默认 LT50（半亮度寿命）'],
                ['IEC 62341-6-3', 'OLED 寿命试验方法（高温老化亮度衰减等）'],
                ['IEC 62977 / ISO 15076', '电子显示单元通用要求 / 色彩管理'],
                ['ISO 14861 / DICOM Part 14', '标准测试图案序列 / 医疗显示灰度函数（医疗屏验收）'],
                ['GB/T 2423.2 / JIS C 5023-4 / JEDEC STP001', '高温试验 / 液晶模组环境试验 / 驱动 IC 热耦合评估'],
                ['GB 44703-2024', '光辐射安全强制国标——2026 年落地执行，Mini/Micro LED 类产品合规加速']
              ] }
            ]
          },
          {
            id: 'hdr-cert',
            title: 'HDR / 动态清晰度认证（VESA）',
            titleEn: 'HDR / Motion Clarity Certification (VESA)',
            blocks: [
              { t: 'list', items: [
                ['DisplayHDR（CTS 1.1/1.2）', 'True Black 400/500/600/1000 对应 8% 中心窗口亮度 400/500/600/1000 cd/m²、全屏闪烁 250/300/350/500、全屏持续 250/300/350/500、黑位 ≤0.0005 cd/m²、DCI-P3 ≥95%、BT.709 ≥99%；另有 Rise Time、Delta-ITP 白点误差、Active Dimming 等'],
                ['ClearMR', '以清晰动态比（CMR）替代「响应时间」营销口径——ClearMR 9000 ↔ CMR 8500–9500%；ClearMR 13000 ↔ 12500–13500%'],
                ['Adaptive-Sync 1.1', 'VRR 测试矩阵从 5×5 扩展到 9×9 灰阶子集，覆盖更广']
              ] }
            ]
          },
          {
            id: 'reliability',
            title: '可靠性与老化测试典型条件',
            titleEn: 'Reliability and Aging Test Conditions',
            blocks: [
              { t: 'table', head: ['项目', '典型条件'], rows: [
                ['高温高湿', '60℃ / 90%RH，120h 或 240h'],
                ['高温存储 / 低温存储', '85℃ 240h / -30℃ 或 -40℃'],
                ['热冲击', '-40℃ ↔ 85℃ 多循环'],
                ['ESD', '空气放电 ±8kV'],
                ['包装跌落', '60–80cm（按纸箱重量）'],
                ['车规', 'AEC-Q100、IATF 16949（供应链强制）；宽温 -40~85℃']
              ] },
              { t: 'callout', kind: 'warn', title: '验收提示',
                v: '第三方老化案例的常用判据——1000h 亮度保持率 ≥85%、ΔE*ab ≤3.0（D65）、暗态最大亮斑面积增长 ≤0.5mm²、' +
                  '色坐标偏移 Δu\'v\' 跟踪。同一面板在不同驱动模式（电压/占空比/灰阶）下衰减速率差异可达 40%，送测必须声明电气参数。' }
            ]
          },
          {
            id: 'metrology',
            title: '量检测设备与 Mura/DeMura',
            titleEn: 'Metrology Equipment and Mura/DeMura',
            blocks: [
              { t: 'fig', id: 'testStack', caption: '显示测试与标准分层：光学电学、HDR 认证、可靠性、量检测是一条完整链路' },
              { t: 'list', items: [
                ['检测对象分层', 'Array / Cell / Module 三大制程；OLED 需 Cell 级图形信号检测、gamma 调测、Mura 扫检、寿命系统；Micro LED/微显示需晶圆级电测分选、点灯 AOI、PL 巨量检测'],
                ['代表厂商', '精测电子（OLED 全制程 True Color DEM 自动灰度色斑补偿；Micro LED/OLED 微显示 AOI 一站式 DeMura——亚像素级缺陷、亮色度误差 <3%、单次覆盖 0.7" @3000PPI、景深 >40μm；4–12" 晶圆探针台 ATE；AR Projector/VR Pancake NED AOI）'],
                ['常用仪器', '柯尼卡美能达 CA-310 / X-Rite i1Pro 色彩分析仪、成像式亮度计、积分球 + 分光辐射计、信号发生器、暗箱、9/25 点网格采样、CalMAN/LightSpace 软件']
              ] },
              { t: 'callout', kind: 'key', title: 'AI 融合',
                v: '深度学习缺陷检测与自动分类、像素级颜色管理已成新平台标配——量检测设备正从「规则」走向「模型 + 数据」。' }
            ]
          }
        ]
      },

      /* ======================================================== 10 学习资料 */
      {
        id: 'learning',
        num: '10',
        title: '学习路径与资料',
        titleEn: 'Learning Path and Resources',
        lead: '最后一章给一条从基础到前沿的四阶段学习路径，并列出教材、在线资源、会议与标准获取渠道——' +
          '建议测试方向优先吃透 IEC 62341 与 VESA 认证体系，再补量检测与 DeMura。',
        sections: [
          {
            id: 'path',
            title: '建议学习路径（4 个阶段）',
            titleEn: 'Suggested Learning Path (4 Stages)',
            blocks: [
              { t: 'fig', id: 'learningStages', caption: '学习路径：基础 → 器件原理 → 驱动与工艺 → 前沿与产业，测试方向优先' },
              { t: 'list', items: [
                ['阶段一 基础（2–4 周）', '光学 + 色度学 + 人眼视觉 → 显示器件主要指标（亮度、对比度、色域、响应、寿命）。目标：读懂规格书'],
                ['阶段二 器件原理（4–6 周）', 'LCD（液晶物理、偏振、背光）→ OLED（能级、发光机理、tandem/QD 转换）→ LED/Mini/Micro LED → 电子纸'],
                ['阶段三 驱动与工艺（4–6 周）', 'TFT（a-Si/LTPS/Oxide/LTPO）、有源矩阵驱动、像素补偿电路、FMM/IJP/ViP 制程、巨量转移'],
                ['阶段四 前沿与产业（持续）', '跟踪 SID/IMID/IDW 论文、厂商技术发布、标准演进；结合本职深耕测试方向']
              ] },
              { t: 'callout', kind: 'key', title: '测试方向优先序',
                v: '若本职是测试设备研发，建议把阶段三的「TFT/驱动/制程」与阶段四的「标准与量检测」提前并行——' +
                  '先吃透 IEC 62341 与 VESA 认证体系，再补 DeMura 与 AOI/PL 巨量检测原理，比泛读器件物理更贴近产出。' }
            ]
          },
          {
            id: 'books',
            title: '教材与专著',
            titleEn: 'Textbooks and Monographs',
            blocks: [
              { t: 'table', head: ['书名', '作者 / 出版社', '特点与适用'], rows: [
                ['《半导体显示电子学》（2026.5 新版）', '董承远 / 清华大学出版社', '最贴合工程实践：有源矩阵驱动、面板周边 IC、模组电路；覆盖 LCD/OLED/电子纸。附课件与习题'],
                ['《光电显示技术及应用》', '文尚胜 / 机械工业出版社（2020）', '体系完整的规划教材：光学、色度学、LCD/OLED/激光/3D/量子点，配官方 PPT'],
                ['《显示技术原理与设计实践》', '电子工业出版社', '少见的「原理 + 面板设计 EDA 实践」结合，含 LTPO、Mini/Micro LED 制程'],
                ['《薄膜晶体管原理及应用》（第 2 版）', '董承远 / 清华大学出版社', 'TFT 专题深入，半导体显示方向经典'],
                ['《液晶光学和液晶显示》', '王新久 / 科学出版社', '液晶物理经典（上交《液晶物理与器件》课程指定教材）'],
                ['《液晶与平板显示技术》', '高鸿锦、董友梅', '产业视角的 LCD 权威参考'],
                ['Liquid Crystal Displays', 'Ernst Lueder / Wiley', '英文经典，适合对照国际术语体系'],
                ['《显示器件检测技术》', '行业培训类 / 多作者', '偏测试与量检测实务，覆盖光学测量、Mura 与老化试验，适合测试岗补工程细节'],
                ['《平板显示器件制造工艺》', '行业培训类 / 多作者', '从 Array/Cell/Module 三大制程讲制造，便于理解检测设备要卡在哪些工序']
              ] }
            ]
          },
          {
            id: 'online',
            title: '在线资源与社区',
            titleEn: 'Online Resources and Communities',
            blocks: [
              { t: 'table', head: ['资源', '类型', '用途'], rows: [
                ['OLED-Info（oled-info.com）', '海外垂直媒体', 'OLED/Micro LED/电子纸技术与产业动态，更新快'],
                ['DisplayDaily / SID 官网（sid.org）', '行业媒体 / 学会', 'Display Week 论文摘要、行业深度分析'],
                ['SID 中国（sidchina.cn）', '学会地方分会', '中文显示资讯、ICDT 等国内会议信息'],
                ['LEDinside / TrendForce', '产业研究', 'LED/Micro LED 出货预测、价格趋势'],
                ['洛图科技 RUNTO / CINNO / 群智咨询 / 奥维云网', '产业研究', '面板出货、电视/折叠屏零售数据'],
                ['VESA 官网 displayhdr.org / displayport.org', '标准组织', 'DisplayHDR 认证细则、DP 2.1b 规范与 FAQ——测试岗必读'],
                ['HDMI Forum（hdmi.org）', '标准组织', 'HDMI 2.2 规范与 Ultra96 认证'],
                ['IEC Webstore（webstore.iec.ch）', '标准组织', 'IEC 62341 系列正式版（付费，可先看目录/预览）'],
                ['全国标准信息公共服务平台', '国标官方', 'GB 44703-2024 等强制/推荐国标的权威发布渠道'],
                ['中国电子视像行业协会', '团标组织', '裸眼 3D、显示性能等团体标准的归口与发布方']
              ] }
            ]
          },
          {
            id: 'conferences',
            title: '会议与标准获取建议',
            titleEn: 'Conferences and Where to Get Standards',
            blocks: [
              { t: 'list', items: [
                ['SID Display Week', '显示界「奥斯卡」，2026（洛杉矶，5 月）收录 675 篇论文、主题「AI 赋能显示创新」；技术风向标'],
                ['IMID（韩国）/ IDW（日本）', '与 Display Week 齐名的三大学术会议'],
                ['ICDT（中国国际显示技术大会）', '国内最重要显示学术会议，设备商常设展区'],
                ['DIC / CIOE', '产业导向与光电综合展，AR/VR 与 Micro LED 供应链集中']
              ] },
              { t: 'callout', kind: 'info', title: '标准文档获取',
                v: 'IEC 62341 系列在 IEC Webstore 购买正式版，重点看 -5-3（残影/寿命）、-6-1（光学测量）；' +
                  'VESA 的 DisplayHDR CTS、ClearMR、Adaptive-Sync、DP 2.1b 均可在官网免费下载；' +
                  '国标/团标走全国标准信息公共服务平台与中国电子视像行业协会。' },
              { t: 'p', v: '**会议比期刊更贴近产业**：Display Week / IMID / IDW 的论文摘要往往比正式期刊早半年透露量产动向，' +
                '而 DIC / CIOE 这类展会则是设备商与供应链现场对接的主场——测试设备研发应优先跑前者看技术、后者看客户。' }
            ]
          }
        ]
      },

      /* ======================================================== 11 参考资料 */
      {
        id: 'references',
        num: '11',
        title: '参考资料',
        titleEn: 'References',
        lead: '本文数据来自下列公开资料（厂商发布、行业媒体、标准组织文件），整理时间 2026-10-19；' +
          '部分预测性数字为机构预估，可能与最终统计存在差异。标准正式文本请以 IEC / VESA / 国标官方发布版本为准。',
        sections: [
          {
            id: 'media',
            title: '行业媒体与产业研究',
            titleEn: 'Industry Media and Market Research',
            blocks: [
              { t: 'list', ordered: true, items: [
                'SID Display Week 2026 技术综述《显示产业的 AI 革命与范式转移》：[SID 中国](https://www.sidchina.cn/nr.jsp?g=8&p=20)',
                '《2026 大屏显示：Micro LED 起飞，百英寸液晶走入寻常家》（大屏时代）：[dapingtime 2256](https://www.dapingtime.com/article/2256.html)',
                'Which Displays Compete With OLED（2026.10）：[mefmobile](https://mefmobile.org/which-displays-compete-with-oled-and-what-should-you-buy)',
                '《2026 大屏显示三大技术决战》（大屏时代）：[dapingtime 2274](https://www.dapingtime.com/article/2274.html)',
                'LED 行业洞察日报 2026-09-03（Micro LED 量产元年）：[corehy 141](https://www.corehy.com/industry/141.html)',
                'Yole《MicroLED 2026》报告解读：[compoundsemiconductor 125560](https://compoundsemiconductor.net/article/125560/MicroLED_from_living_room_to_AI_data_centre)',
                'LEDinside《MicroLED 需求爆发，量产进程全面提速》：[ledinside 40568](https://m.ledinside.com.tw/node/view/40568.html)',
                '《终局已定！2026 高端 AR 眼镜必是 Micro LED + 光波导的天下》：[techmaxma 5106](http://www.techmaxma.com/archives/5106)',
                '《面板厂商发力，无痕技术有望普及》（腾讯新闻 2026.7）：[inews.qq 20260706](https://view.inews.qq.com/wxn/20260706A03IAW00)',
                '《苹果折叠屏热度升温 产业链公司有望受益》（新浪财经 2026.10.13）：[sina finance](https://finance.sina.com.cn/jjxw/2026-10-13/doc-iniuzkkt7160457.shtml)',
                '《全球墨水屏产业发展报告（2026）》：[inwwin 1208566](http://m.inwwin.com.cn/105/view-1208566-1.html)',
                'Global eReader Market 2026（E Ink 官方口径 ACeP 延期）：[pmarketresearch](http://pmarketresearch.com/hc/door-locks-market/e-readers-market)',
                '《裸眼 3D 制作迎来新突破：AI 驱动实时渲染与光场显示》：[xingyusee 237](https://www.xingyusee.com/news/237.html)',
                '《LED 显示行业加速迭代，裸眼 3D 技术引领户外广告新浪潮》：[dapingtime 2297](https://www.dapingtime.com/article/2297.html)',
                'MicroLED 定义、原理、产业链与市场趋势（三个皮匠报告）：[sgpjbg 7074080](https://www.sgpjbg.com/news/7074080.html)'
              ] }
            ]
          },
          {
            id: 'textbooks',
            title: '教材、规格页与课程',
            titleEn: 'Textbooks, Spec Sheets and Courses',
            blocks: [
              { t: 'list', ordered: true, items: [
                '《半导体显示电子学》图书页（文泉学堂，清华社 2026.5 新版）：[wqbook 3265766](https://wqbook.wqxuetang.com/book/3265766)',
                '《光电显示技术及应用》图书页（百度百科词条）：[baike 24619216](https://baike.baidu.com/item/%E5%85%89%E7%94%B5%E6%98%BE%E7%A4%BA%E6%8A%80%E6%9C%AF%E5%8F%8A%E5%BA%94%E7%94%A8/24619216)',
                '《显示技术原理与设计实践》图书页（华信教育资源网）：[hxedu TN489380](https://hzw.hxedu.com.cn/hxedu/hg/book/bookInfo.html?code=TN489380)',
                '上海交通大学《液晶物理与器件》课程大纲：[sjtu seiee 1506](https://tw.seiee.sjtu.edu.cn/yjwb0/info/1506.htm)',
                'Panox Display《AMOLED 质量 standards B2B 指南（2026）》：[panoxdisplay](https://www.panoxdisplay.com/zh-TW/knowledge/amoled-oem-quality-standards-b2b-guide.html)',
                'Good Display 13.3" ACeP 规格页：[buy-lcd gdep133c01](https://buy-lcd.com/products/gdep133c01)'
              ] }
            ]
          },
          {
            id: 'vendors',
            title: '厂商发布与检测设备',
            titleEn: 'Vendor Releases and Test Equipment',
            blocks: [
              { t: 'list', ordered: true, items: [
                '精测电子 DIC 2026 / ICDT 2026 新型显示量检测方案：[sina wm 20260403](https://finance.sina.com.cn/wm/2026-04-03/doc-inhtfvnt3589092.shtml)',
                '显示屏高温老化亮度衰减测试（第三方检测方法学）：[11467 19617091](https://94791406.b2b.11467.com/news/19617091.asp)',
                'VESA Certified DisplayHDR 性能准则 CTS 1.1：[displayhdr p1699](https://displayhdr.org/?p=1699/)',
                '精测电子 2026 年半年度报告（检测设备产品线）：[cnfin 841165806176](https://www.cnfin.com/announ/detail/index.html?id=841165806176&code=300567)',
                'VESA DisplayPort 2.1b FAQ：[displayport p5](http://www.displayport.org?p=5/)',
                'HDMI 2.2 与 Ultra96 线材解析（2026）：[testyourdevice](https://testyourdevice.com/blog/hdmi-2-2-ultra96-cables-explained)'
              ] }
            ]
          }
        ]
      }
    ]
  });
})(typeof window !== 'undefined' ? window : globalThis);
