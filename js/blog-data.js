/* =============================================================================
 * blog-data.js — Technology Blog（技术博客）文章数据（纯数据，无逻辑、不碰 DOM）
 *
 * 数据来源：TFTCentral「Technologies」— 显示器进阶技术专题
 *           https://tftcentral.co.uk/advanced
 * 本仓库对其做了完整的中文专业翻译与结构化整理，原文版权归 TFTCentral 所有。
 *
 * 结构：
 *   window.BLOGData = {
 *     meta:   { updated, license, source },
 *     figures:{ id: '<svg …>' },              内联 SVG 示意图（零外部资源）
 *     glossary: [ [en, cn, note], … ],        术语对照表
 *     posts: [ { id, title, titleEn, …, chapters: [ { id, num, title, sections: [ { id, title, blocks } ] } ] } ]
 *   }
 *
 * block（段落块）类型：
 *   { t:'p',       v:'文本' }                        文本（支持 **粗体** / `代码` / [文字](链接) / ==高亮==）
 *   { t:'list',    items:['…'], ordered:false }      列表
 *   { t:'table',   head:['…'], rows:[['…']] }        表格（head 可为 null）
 *   { t:'dl',      items:[['术语','说明']] }         定义表
 *   { t:'callout', kind:'info|warn|ok|key', 标题, v:'…', items:['…'] }
 *   { t:'fig',     id:'overdrive', caption:'…' }     插入示意图
 *   { t:'quote',   v:'…', by:'…' }                   引文
 *
 * 新增文章只需往里加一个 post 对象；页面由 blog.js 渲染，app.js 负责挂载。
 * ========================================================================== */
(function (window) {
  'use strict';

  /* ------------------------------------------------------------- 示意图 SVG */
  /* 全部内联绘制，颜色走 CSS 变量，因此自动跟随明/暗主题，且不请求任何外部资源。 */
  var FIGURES = {

    /* 过驱（RTC）光阶响应：不加过驱 vs 加过驱 vs 过驱过冲 */
    overdrive:
      '<svg class="bl-fig-svg" viewBox="0 0 640 250" role="img" aria-label="过驱电压与液晶响应波形对比">' +
      '<rect x="0" y="0" width="640" height="250" fill="var(--surface-2)"/>' +
      '<text x="16" y="24" fill="var(--text-soft)" font-size="12" font-weight="600">过驱（RTC）响应波形对比</text>' +
      /* 坐标 */
      '<line x1="60" y1="200" x2="610" y2="200" stroke="var(--border-strong)"/>' +
      '<line x1="60" y1="40" x2="60" y2="200" stroke="var(--border-strong)"/>' +
      '<text x="16" y="70" fill="var(--text-dim)" font-size="11">亮度</text>' +
      '<text x="556" y="220" fill="var(--text-dim)" font-size="11">时间</text>' +
      /* 目标灰阶（起始 40 / 目标 160） */
      '<line x1="60" y1="170" x2="610" y2="170" stroke="var(--border)" stroke-dasharray="4 4"/>' +
      '<line x1="60" y1="90" x2="610" y2="90" stroke="var(--border)" stroke-dasharray="4 4"/>' +
      '<text x="470" y="84" fill="var(--text-dim)" font-size="11">目标灰阶</text>' +
      '<text x="470" y="186" fill="var(--text-dim)" font-size="11">起始灰阶</text>' +
      /* 无过驱：慢速单调上升 */
      '<path d="M120 170 C240 168 320 140 430 92 L610 90" fill="none" stroke="var(--text-dim)" stroke-width="2.5"/>' +
      /* 有过驱：先冲到过冲峰再回落 */
      '<path d="M120 170 C160 150 175 62 205 58 C245 54 260 86 300 90 L610 90" fill="none" stroke="var(--accent)" stroke-width="2.5"/>' +
      /* 过冲量标注 */
      '<line x1="205" y1="58" x2="205" y2="90" stroke="var(--warn)" stroke-width="1.5" stroke-dasharray="3 3"/>' +
      '<text x="212" y="54" fill="var(--warn)" font-size="11">过冲（overshoot）</text>' +
      /* 起始时刻 */
      '<line x1="120" y1="40" x2="120" y2="200" stroke="var(--border)" stroke-dasharray="4 4"/>' +
      '<text x="96" y="216" fill="var(--text-dim)" font-size="11">帧开始</text>' +
      /* 图例 */
      '<rect x="300" y="212" width="14" height="3" fill="var(--text-dim)"/>' +
      '<text x="320" y="217" fill="var(--text-soft)" font-size="11">无过驱（慢）</text>' +
      '<rect x="420" y="212" width="14" height="3" fill="var(--accent)"/>' +
      '<text x="440" y="217" fill="var(--text-soft)" font-size="11">有过驱（快，但会过冲）</text>' +
      '</svg>',

    /* 保持型显示 vs 脉冲型显示（BFI / 扫描背光） */
    holdimpulse:
      '<svg class="bl-fig-svg" viewBox="0 0 640 260" role="img" aria-label="保持型显示与脉冲型显示的人眼积分对比">' +
      '<rect x="0" y="0" width="640" height="260" fill="var(--surface-2)"/>' +
      '<text x="16" y="24" fill="var(--text-soft)" font-size="12" font-weight="600">保持型（Hold）与脉冲型（Impulse）显示</text>' +
      '<text x="16" y="62" fill="var(--text-dim)" font-size="11">LCD（保持型）：整帧持续发光，人眼把两帧"叠"在一起 → 运动模糊</text>' +
      /* 保持型帧 */
      '<rect x="60" y="72" width="120" height="34" fill="var(--accent)" opacity=".55"/>' +
      '<rect x="184" y="72" width="120" height="34" fill="var(--teal)" opacity=".55"/>' +
      '<rect x="308" y="72" width="120" height="34" fill="var(--accent)" opacity=".55"/>' +
      '<rect x="432" y="72" width="120" height="34" fill="var(--teal)" opacity=".55"/>' +
      '<text x="96" y="94" fill="var(--text)" font-size="11">帧 N</text>' +
      '<text x="220" y="94" fill="var(--text)" font-size="11">帧 N+1</text>' +
      '<line x1="60" y1="118" x2="560" y2="118" stroke="var(--border-strong)"/>' +
      /* 脉冲型：黑帧 */
      '<text x="16" y="162" fill="var(--text-dim)" font-size="11">脉冲型（BFI / 扫描背光）：帧间插入黑，人眼被"清空" → 模糊减轻</text>' +
      '<rect x="60" y="172" width="120" height="34" fill="var(--accent)" opacity=".55"/>' +
      '<rect x="184" y="172" width="120" height="34" fill="var(--text-dim)" opacity=".8"/>' +
      '<rect x="308" y="172" width="120" height="34" fill="var(--teal)" opacity=".55"/>' +
      '<rect x="432" y="172" width="120" height="34" fill="var(--text-dim)" opacity=".8"/>' +
      '<text x="96" y="194" fill="var(--text)" font-size="11">帧 N</text>' +
      '<text x="232" y="194" fill="var(--surface)" font-size="11">黑帧</text>' +
      '<text x="344" y="194" fill="var(--text)" font-size="11">帧 N+1</text>' +
      '<text x="480" y="194" fill="var(--surface)" font-size="11">黑帧</text>' +
      '<line x1="60" y1="218" x2="560" y2="218" stroke="var(--border-strong)"/>' +
      '<text x="60" y="240" fill="var(--text-soft)" font-size="11">代价：亮度下降、可能出现可见闪烁（通常只适合动态画面）</text>' +
      '</svg>',

    /* MEMC 运动插值 */
    memc:
      '<svg class="bl-fig-svg" viewBox="0 0 640 220" role="img" aria-label="MEMC 运动补偿插帧示意">' +
      '<rect x="0" y="0" width="640" height="220" fill="var(--surface-2)"/>' +
      '<text x="16" y="24" fill="var(--text-soft)" font-size="12" font-weight="600">MEMC：在原始帧之间"猜"出中间帧</text>' +
      '<text x="16" y="64" fill="var(--text-dim)" font-size="11">输入 60 Hz（原始帧，实心）</text>' +
      '<g fill="var(--accent)">' +
      '<rect x="60" y="74" width="34" height="30"/><rect x="180" y="74" width="34" height="30"/>' +
      '<rect x="300" y="74" width="34" height="30"/><rect x="420" y="74" width="34" height="30"/>' +
      '<rect x="540" y="74" width="34" height="30"/></g>' +
      '<text x="16" y="152" fill="var(--text-dim)" font-size="11">输出 120 Hz（空心为插值帧）</text>' +
      '<g fill="var(--accent)" opacity=".85">' +
      '<rect x="60" y="162" width="24" height="30"/><rect x="120" y="162" width="24" height="30"/>' +
      '<rect x="180" y="162" width="24" height="30"/><rect x="240" y="162" width="24" height="30"/>' +
      '<rect x="300" y="162" width="24" height="30"/><rect x="360" y="162" width="24" height="30"/>' +
      '<rect x="420" y="162" width="24" height="30"/><rect x="480" y="162" width="24" height="30"/>' +
      '<rect x="540" y="162" width="24" height="30"/><rect x="600" y="162" width="24" height="30"/></g>' +
      '<g fill="none" stroke="var(--warn)" stroke-width="1.6" stroke-dasharray="3 3">' +
      '<rect x="120" y="162" width="24" height="30"/><rect x="240" y="162" width="24" height="30"/>' +
      '<rect x="360" y="162" width="24" height="30"/><rect x="480" y="162" width="24" height="30"/>' +
      '<rect x="600" y="162" width="24" height="30"/></g>' +
      '<text x="118" y="210" fill="var(--warn)" font-size="11">插值帧由前两帧估算，遇到复杂运动容易"猜错"</text>' +
      '</svg>',

    /* 动态对比度测法 */
    dcr:
      '<svg class="bl-fig-svg" viewBox="0 0 640 210" role="img" aria-label="动态对比度的标称算法">' +
      '<rect x="0" y="0" width="640" height="210" fill="var(--surface-2)"/>' +
      '<text x="16" y="24" fill="var(--text-soft)" font-size="12" font-weight="600">动态对比度的数字是怎么来的</text>' +
      '<rect x="60" y="46" width="150" height="70" fill="var(--surface)"/>' +
      '<rect x="60" y="46" width="150" height="70" fill="none" stroke="var(--border-strong)"/>' +
      '<text x="86" y="76" fill="var(--text)" font-size="12" font-weight="600">白场</text>' +
      '<text x="76" y="98" fill="var(--text-soft)" font-size="11">背光开至最大</text>' +
      '<text x="228" y="76" fill="var(--text-soft)" font-size="20">÷</text>' +
      '<rect x="264" y="46" width="150" height="70" fill="var(--bg-soft)"/>' +
      '<rect x="264" y="46" width="150" height="70" fill="none" stroke="var(--border-strong)"/>' +
      '<text x="290" y="76" fill="var(--text)" font-size="12" font-weight="600">黑场</text>' +
      '<text x="280" y="98" fill="var(--text-soft)" font-size="11">背光调至最低</text>' +
      '<text x="432" y="76" fill="var(--text-soft)" font-size="20">=</text>' +
      '<text x="470" y="80" fill="var(--accent)" font-size="16" font-weight="700">→ 数字可以很大</text>' +
      '<text x="60" y="146" fill="var(--text-soft)" font-size="11">静态对比度 1000:1 × 背光可调 300% → 标称动态对比度 3000:1</text>' +
      '<text x="60" y="168" fill="var(--warn)" font-size="11">任一时刻画面真实对比度都不会超过静态对比度；</text>' +
      '<text x="60" y="186" fill="var(--warn)" font-size="11">画面同时含亮部与暗部时，只能取一个折中的背光亮度。</text>' +
      '</svg>',

    /* 面板涂层光路 */
    coating:
      '<svg class="bl-fig-svg" viewBox="0 0 640 220" role="img" aria-label="雾面、镜面与玻璃面板涂层的光路与观感差异">' +
      '<rect x="0" y="0" width="640" height="220" fill="var(--surface-2)"/>' +
      '<text x="16" y="24" fill="var(--text-soft)" font-size="12" font-weight="600">三种前表面处理方式的光路</text>' +
      /* AG */
      '<rect x="60" y="44" width="150" height="70" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<path d="M60 44 h150" stroke="var(--text-dim)" stroke-width="4"/>' +
      '<path d="M92 12 L112 44 M148 12 L168 44" stroke="var(--text-soft)" stroke-width="1.6"/>' +
      '<path d="M150 44 L200 120 M180 44 L225 116" stroke="var(--warn)" stroke-width="1.6" opacity=".9"/>' +
      '<text x="72" y="86" fill="var(--text)" font-size="12" font-weight="600">AG 雾面</text>' +
      '<text x="60" y="136" fill="var(--text-soft)" font-size="11">反射被打散，不刺眼；但会</text>' +
      '<text x="60" y="152" fill="var(--text-soft)" font-size="11">轻微降低通透感与黑阶</text>' +
      /* Glossy */
      '<rect x="245" y="44" width="150" height="70" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<path d="M245 44 h150" stroke="var(--accent)" stroke-width="4"/>' +
      '<path d="M292 12 L320 44 M320 12 L348 44" stroke="var(--accent)" stroke-width="1.6"/>' +
      '<path d="M320 44 L320 120" stroke="var(--accent)" stroke-width="1.6"/>' +
      '<text x="258" y="86" fill="var(--text)" font-size="12" font-weight="600">镜面 / 光泽</text>' +
      '<text x="245" y="136" fill="var(--text-soft)" font-size="11">色深与锐度更好；却会把</text>' +
      '<text x="245" y="152" fill="var(--text-soft)" font-size="11">环境光原样反射进眼睛</text>' +
      /* Glass */
      '<rect x="430" y="44" width="150" height="70" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<rect x="436" y="50" width="138" height="58" fill="none" stroke="var(--teal)" stroke-width="3"/>' +
      '<path d="M470 12 L490 44 M520 12 L540 44" stroke="var(--teal)" stroke-width="1.6"/>' +
      '<path d="M505 44 L516 120 M552 44 L548 120" stroke="var(--teal)" stroke-width="1.6" opacity=".7"/>' +
      '<text x="452" y="86" fill="var(--text)" font-size="12" font-weight="600">保护玻璃</text>' +
      '<text x="430" y="136" fill="var(--text-soft)" font-size="11">像一整块平整玻璃，没有"颗粒感"；</text>' +
      '<text x="430" y="152" fill="var(--text-soft)" font-size="11">但容易夹尘、反射更明显</text>' +
      '<text x="60" y="196" fill="var(--text-dim)" font-size="11">注：涂层选择本质是"反射 vs 色深/锐度"的取舍，没有绝对优劣。</text>' +
      '</svg>'
  };

  /* --------------------------------------------------------------- 术语对照 */
  var GLOSSARY = [
    ['Response Time Compensation (RTC) / Overdrive', '响应时间补偿 / 过驱', '给液晶施加"过压"以加速转向，是本文的核心概念。'],
    ['Feed Forward (FFD)', '前馈驱动', 'NEC 提出的过驱雏形：用一半的时间施加两倍电压。'],
    ['Grey to Grey (G2G)', '灰阶到灰阶', '厂商标称响应时间时最常用的口径，通常只代表最快的那几组跃迁。'],
    ['Rise / Fall Time (Tr / Tf)', '上升 / 下降时间', '液晶转向与回落各占一段，ISO 响应时间为二者之和。'],
    ['Overshoot / Undershoot', '过冲 / 下冲', '实际灰阶越过目标值后再回落，表现为运动的"光晕（halo）"。'],
    ['Black Frame Insertion (BFI)', '黑帧插入', '在两帧之间插入黑帧，打断人眼的图像残留。'],
    ['Scanning Backlight', '扫描背光', '自上而下逐行关闭背光管，模拟 CRT 的脉冲发光。'],
    ['Hold-type / Impulse-type Display', '保持型 / 脉冲型显示', 'LCD 属于保持型，这是 LCD 固有运动模糊的根因。'],
    ['MPRT (Motion Picture Response Time)', '动态画面响应时间', '把"眼睛看到几个像素被拖影"折算成时间，单位 ms。'],
    ['MEMC', '运动估计与运动补偿', '在原始帧之间估算并生成插值帧，常被宣传成"120 Hz"。'],
    ['Judder', '画面顿挫', '24 fps 片源在 60 Hz 屏幕上不做正确处理时产生的"抖动感"。'],
    ['Soap Opera Effect', '肥皂剧效应', '插帧后画面过于"顺滑"，观感像低成本的演播室录像。'],
    ['Anti-Glare (AG) / Glossy', '防眩（雾面）/ 镜面', '前表面处理的两条路线，决定反射与色深之间的取舍。'],
    ['Uniformity Correction / DUE', '均匀性校正', '对每颗像素做数字补偿，通常只在专业机型上提供。'],
    ['Dynamic Contrast Ratio (DCR)', '动态对比度', '靠背光调亮调暗得到的"标称"对比度，参考价值有限。'],
    ['Ambient Light Sensor', '环境光传感器', '按环境照度自动调整亮度，办公机型常见。'],
    ['Dithering', '抖动 / 时间抖动', '用像素级快速交替模拟更多灰阶，遇到过驱时可能被放大成噪点。'],
    ['Look Up Table (LUT)', '查找表', '固化好的映射关系，均匀性补偿常用静态 LUT 实现。'],
    ['Delta-E (ΔE)', '色差值', '人眼可辨色差的门槛常取 ΔE ≈ 2~3。']
  ];

  /* ------------------------------------------------------------------- 文章 */
  var POSTS = [];

  POSTS.push({
    id: 'advanced-display-techniques',
    title: '显示器进阶技术全解',
    titleEn: 'Technologies — Advanced Display Techniques',
    subtitle: '过驱、黑帧插入、镜面涂层、均匀性校正与动态对比度：厂商宣传口径背后的真实原理与代价',
    category: '显示技术',
    tags: ['过驱 RTC', '运动模糊', 'BFI', '面板涂层', '动态对比度', '均匀性校正'],
    source: {
      name: 'TFTCentral',
      label: 'Technologies（Advanced）',
      url: 'https://tftcentral.co.uk/advanced',
      note: '原文为英文，本页为完整中文专业翻译与结构化重排；文中示意图由本站按原文所述原理重绘。'
    },
    summary: '从 NEC 的 FFD 前馈驱动讲起，一路梳理过驱（RTC）的原理、过冲成因与各家命名，' +
      '再到黑帧插入、扫描背光、MEMC 插帧、真 120 Hz，以及面板涂层、均匀性校正与动态对比度。' +
      '这些名词在参数表里往往只写"支持"两个字，实际效果却高度依赖实现水平——本篇的重点正是把它们拆开讲清楚。',
    chapters: [
      /* ============================================================ 01 RTC */
      {
        id: 'rtc',
        num: '01',
        title: '响应时间补偿（RTC）',
        titleEn: 'Response Time Compensation (RTC)',
        lead: '液晶分子转向需要时间。过驱的做法是"先冲过头再退回来"，用更大的瞬时电压换取更快的灰阶跃迁。' +
          '这是今天几乎所有游戏显示器都会标称的 G2G 响应时间背后的技术。',
        sections: [
          {
            id: 'ffd',
            title: '前馈驱动（FFD）',
            titleEn: 'FFD (Feed Forward)',
            blocks: [
              { t: 'p', v: '2001 年，NEC 开始为其电视面板研发新技术。其思路建立在"黑白切换是幅度最大的色彩变化"这一事实上：' +
                '在这种切换中，晶体管上已经被施加了最大电压。NEC 的想法是 ==用一半的时间施加两倍的电压==——' +
                '例如原本用 20 ms 加 1 V，改成用 10 ms 加 2 V。理论上这会让色彩变化显著加快。' +
                '不过据 NEC 自己所说，这项技术最终并没有真正投入应用。' },
              { t: 'p', v: '黑→白方向的跃迁不受影响，因为它本来就已经拿到了最大电压。这项研究正是今天' +
                '**响应时间补偿 / 过驱（RTC / Overdrive）** 技术的雏形。' }
            ]
          },
          {
            id: 'overdrive',
            title: '过驱 / 响应时间补偿（RTC）',
            titleEn: 'Overdrive / Response Time Compensation (RTC)',
            blocks: [
              { t: 'p', v: '过驱的原理是**对液晶施加过压**，迫使它更快地转向目标取向。这个过程中，像素会先被推向' +
                '全白（非激活）→ 全黑的完整跃迁，然后再回落到所需的目标灰阶。' +
                '这样做的价值在于：液晶的**上升时间一直是整个响应过程中最慢的一环**（响应时间 = Tr + Tf）。' },
              { t: 'p', v: '对于 ISO 标准的黑白切换，过驱帮助不大——反正它本来就已经拿到最大电压了；' +
                '但 ==灰阶到灰阶（Grey to Grey）的跃迁被大幅压缩==。而灰阶跃迁的改善对整块面板的提速意义重大，' +
                '因为过去这类变化在 TFT 面板上一直是最慢的，而响应时间需要在 0–255 的**整个**过渡范围内都很低才谈得上合格。' },
              { t: 'p', v: '带 RTC 的屏幕在实际使用中通常表现为更灵敏的操作手感、更少的运动模糊与拖影。' +
                '由于厂商手里最快的那组数据往往就是灰阶跃迁，所以采用该技术的显示器通常会标称一个' +
                '**"灰阶到灰阶"（G2G）** 响应时间。看参数表时，留意 `G2G` 这个字样。' },
              { t: 'fig', id: 'overdrive', caption: '过驱让像素先"冲过头"（过冲）再回落到目标灰阶，从而缩短上升沿。过冲量控制不好，就变成运动物体后面的光晕。' }
            ]
          },
          {
            id: 'double-overdrive',
            title: '双重过驱（Double Overdrive）',
            titleEn: 'Double Overdrive',
            blocks: [
              { t: 'p', v: '这是对传统过驱方法的改进：不仅对**上升时间**施加过驱，对**下降时间**也一样施加。' +
                '据称这样可以同时改善响应时间与整体画质。在不同厂商手里，这种"双重 RTC 脉冲"有多种实现形态。' }
            ]
          },
          {
            id: 'problems',
            title: '过驱带来的问题',
            titleEn: 'Problems with Overdrive',
            blocks: [
              { t: 'p', v: '施加过压整体上缩短了响应时间，但因为像素被迫经过一个多余的中间态，' +
                '有时会留下==色彩拖尾==。表现就是运动物体后面跟着一圈**发白或发暗的光晕**。' +
                '这通常说明 RTC 脉冲给得过于激进，或者控制逻辑做得不够好。' },
              { t: 'callout', kind: 'warn', title: '实测案例：过冲长什么样',
                v: '用 PixPerAn 的"运动小车"测试画面可以直观对比。一台标称 2 ms G2G 的面板（通过 OSD 中的 AMA 选项开启过驱）' +
                  '在测试中表现出相当明显的 RTC 过冲：红色小车后面有一圈**发白的光晕**，' +
                  '对话气泡与黄色人头后面则是**发暗的光晕**。这是过冲非常典型的例子——' +
                  '源于过于激进且控制不佳的 RTC 脉冲。' },
              { t: 'p', v: '另一个风险是**大色块上出现噪点**。原因如下：画面静止时不会有问题——' +
                'LCD 的优点正是像素值不变就不动。但想象一片细微的色彩渐变：' +
                '电影里的跟踪镜头扫过这片渐变时，像素需要从一个值变到另一个值，而这些颜色其实非常接近。' +
                '问题在于，过驱会**临时把像素值推到一个偏离很大的位置**；又因为所有像素的响应并不一致（有些更快有些更慢），' +
                '结果就是观众看到被放大的视频噪点。' },
              { t: 'p', v: '使用**抖动（dithering）** 的 TN 面板还可能遇到另外的问题。' +
                '只要观看距离足够远，抖动通常肉眼不可见；但过驱会放大它的视觉干扰——' +
                '因为过驱期间面板会漏出更强的亮度。在实际使用中，==噪点加重与"过驱拖尾"往往是过驱控制不佳的症状==，' +
                '并且不同型号之间差异很大。' },
              { t: 'p', v: '还有一点需要注意：对开启过驱（RTC）的显示器而言，' +
                '**在非推荐刷新率下运行**（例如不在 60 Hz）会导致该技术的效果退化，面板的响应表现有时会明显变差。' }
            ]
          },
          {
            id: 'measurements',
            title: '响应时间的测量',
            titleEn: 'Response Time Measurements',
            blocks: [
              { t: 'p', v: '先说结论：厂商手上确实有在灰阶跃迁上明显更快的面板，' +
                '但在 ISO 标准所定义的"响应时间"口径——即**黑→白→黑**切换——上却没有什么进步。' +
                '于是他们改用 **G2G** 来标称，以显示"我们确实改进了"。' +
                '如果一台 TFT 标称的是 G2G 响应时间，那么你基本可以确定它用了某种形式的**过驱**。' },
              { t: 'p', v: '但要记住：==即使标称 G2G，那个数字仍然是这块面板测得的最快值==，' +
                '总有一些跃迁要更慢。过驱让不少面板厂在整个灰阶范围内改善了响应时间，' +
                '如今已经能看到标称低至 1 ms G2G 的面板（例如 ViewSonic VX2739wm）。' +
                'TN Film 面板历来是响应最快的技术，而过驱让它进一步拉开了差距。' },
              { t: 'p', v: '更重要的是，过驱真正改善了**其它面板技术**的实际响应表现，' +
                '让 MVA、PVA、IPS 机型也能满足日益增长的竞技游戏需求。' +
                '过驱面板大致经历过几个"代际"（以下均为 G2G 数值）：' },
              { t: 'list', ordered: false, items: [
                '**TN Film**：4 ms / 3 ms，如今普遍 2 ms，已有 1 ms 标称的型号；',
                '**MVA 系列**：以 8 ms 一代为主，4–6 ms 的 G2G 逐渐成为主流；',
                '**PVA 系列**：初代 8 ms，很快切换到 6 ms 一代；',
                '**IPS 系列**：8 ms 与 6 ms，如今 5 ms 已经很常见。'
              ] }
            ]
          },
          {
            id: 'vendors',
            title: '各厂商的过驱 / RTC 变体',
            titleEn: 'Manufacturer Variations of Overdrive / RTC',
            blocks: [
              { t: 'p', v: '同一套 RTC 原理，每家厂商都会换一个自己的商品名。下面这些名字你会在规格表与 OSD 菜单里反复见到——' +
                '它们本质上都是过驱，只是实现细节、可调档位与控制质量差别很大。' }
            ],
            subs: [
              {
                id: 'clearmotiv',
                title: 'ClearMotiv（ViewSonic 优派）',
                titleEn: 'ClearMotiv',
                blocks: [
                  { t: 'p', v: 'ViewSonic 把自家的过驱增强套件叫做 **ClearMotiv**。需要注意，ViewSonic 自己并不生产面板，' +
                    '他们声称是通过在显示器的电子与硬件上做了一系列改动，借助 ClearMotiv 改善了响应时间。' +
                    '下面列出的这些技术，在不同屏幕上可能只用其中一部分，也可能是组合使用：' },
                  { t: 'list', ordered: false, items: [
                    '降低液晶的粘度；',
                    '把液晶盒间距缩小 30%，据称可将响应时间改善 50%；',
                    '**脉冲驱动法（Impulse Driving Method）**：起始阶段施加过大的电压，随后再降到正确电平，' +
                      '相当于给液晶"踢一脚"；',
                    '**进阶过驱（Advanced Overdrive）**：他们声称这不只改善灰阶变化，也改善黑白切换；',
                    '**背光快门（Backlight Shuttering）**：在液晶盒转向期间让背光短暂熄灭。' +
                      '当时仅用于液晶电视，目的是减轻人眼感知到的运动模糊；',
                    '**黑帧插入（BFI）**：与背光快门类似，只是改为插入一整帧黑色来遮盖液晶转向过程，同样用于减轻感知运动模糊；',
                    '**放大脉冲技术（Amplified Impulse Technology）**：最早的文档把它描述为 TFT 电路里的一项功能，' +
                      '动态控制面板所使用的过驱量；从其后续白皮书看，它更像上面那条"脉冲驱动法"的延伸。'
                  ] }
                ]
              },
              {
                id: 'magicspeed',
                title: 'MagicSpeed / RTA（Samsung 三星）',
                titleEn: 'MagicSpeed / Response Time Acceleration (RTA)',
                blocks: [
                  { t: 'p', v: '这是三星自己的 RTC / 过驱版本。三星一向喜欢给技术起个独家名字——平心而论，' +
                    '他们确实是 TFT 市场的主要面板供应商之一。' +
                    '关于这项技术可查的资料很少，只知道它的设计目标是提升灰阶跃迁的响应速度。' +
                    '说到底，它==基本上就是过驱的另一个名字==，据我们所知原理也一致。' },
                  { t: 'p', v: '部分型号可以通过 OSD 关闭 RTA 或调节其强度，实际观感在不同档位之间会有可见差别。' }
                ]
              },
              {
                id: 'ama',
                title: 'Advanced Motion Accelerator（AMA，BenQ 明基）',
                titleEn: 'Advanced Motion Accelerator (AMA)',
                blocks: [
                  { t: 'p', v: 'BenQ 把过驱技术称为 **Advanced Motion Accelerator（AMA）**。' +
                    '你经常会在规格表和 OSD 菜单里看到 AMA 这个选项。' +
                    '这项技术通常可以在 OSD 中分档调节。' },
                  { t: 'p', v: '如果一台机型同时具备黑帧插入（BFI），有时会被称作 **AMA-Z**。' }
                ]
              },
              {
                id: 'odc',
                title: 'Over Driving Circuit（ODC，LG.Display）',
                titleEn: 'Over Driving Circuit (ODC)',
                blocks: [
                  { t: 'p', v: 'LG.Display 把自家过驱技术叫 **ODC**，并用它同时提升了 TN Film 与 IPS 两种面板技术的响应时间。' }
                ]
              },
              {
                id: 'fastlc',
                title: 'Fast Response LC + Special Driving（奇美）',
                titleEn: 'Fast Response LC + Special Driving',
                blocks: [
                  { t: 'p', v: '这是奇美电子（Chi Mei Optoelectronics，现奇美群创 / Innolux）给自家过驱技术起的名字，' +
                    '目的同样是"减少残像拖尾"。奇美表示这可以减轻、甚至消除运动模糊。' }
                ]
              },
              {
                id: 'rapid',
                title: 'RapidResponse / RapidMotion（NEC）',
                titleEn: 'RapidResponse / RapidMotion',
                blocks: [
                  { t: 'p', v: 'NEC 对自家过驱技术的命名，用于其部分显示器产品，同样是改善灰阶到灰阶的跃迁。' }
                ]
              }
            ]
          }
        ]
      }
      ,
      /* ================================================= 02 运动与响应增强 */
      {
        id: 'motion',
        num: '02',
        title: '运动与响应性增强',
        titleEn: 'Motion and Responsiveness Enhancements',
        lead: '即使响应时间做到 0 ms，LCD 依然会有运动模糊——因为它是"保持型"显示，整帧图像会一直亮到下一帧。' +
          '这一章讲的是绕开物理限制的三条路：插黑、扫描背光，以及插帧与真 120 Hz。',
        sections: [
          {
            id: 'bfi',
            title: '黑帧插入（BFI）',
            titleEn: 'Black Frame Insertion (BFI)',
            blocks: [
              { t: 'p', v: '这项技术在 2006 年的 CEBIT 上首次亮相。通过在图像之间插入黑帧，' +
                'BenQ / 友达光电（AU Optronics）声称这有助于"清扫"人眼所感知到的图像残留余辉。' +
                '他们把它命名为 **BFI（Black Frame Insertion）**。' +
                '由于 BenQ 与友达关系紧密，BFI 实际只出现在他们部分显示器上。' },
              { t: 'p', v: 'BenQ 在叫法上有时不太一致，这点需要留意：他们把过驱面板说成具有 **AMA（Advanced Motion Acceleration）**，' +
                '而带黑帧插入的版本有时被称作 **AMA-Z**。例如 BenQ FP241W 有两个版本：' +
                '不带 BFI 的 FP241W，和带 BFI 的 FP241WZ。' },
              { t: 'callout', kind: 'key', title: '关键认知：0 ms 面板也救不了运动模糊',
                v: 'BenQ 指出，==即使是一块 0 ms 的 TFT，也会因为人眼把连续画面"叠加"而产生余辉感==。' +
                  '这种感知上的运动模糊，很大一部分来自人类视觉系统本身，' +
                  '因此厂商才要在保持型显示上想办法，而不只是改过驱。' +
                  '三星等厂商在探索扫描背光，友达 / BenQ 则选择了 BFI 这条路。' },
              { t: 'p', v: '围绕这项技术存在不少误解。很重要的一点是：==这并不意味着屏幕在跑 120 Hz，也不是在显示 120 fps==。' +
                '实际仍然是 60 Hz / 60 fps，只是其中一部分帧被替换成了黑帧。' +
                '该技术（至少在最初）会提供三档黑帧时序设置，让用户找到自己舒服的档位，另外也有"关闭"选项。' },
              { t: 'p', v: '从网上各方评测的实际情况看，' +
                '这些屏幕（FP241WZ 与 FP241WV）用的似乎**并不是真正的黑帧插入**，' +
                '而是**扫描背光**技术，工作方式类似 CRT：依次逐支关闭 CCFL 背光灯管，' +
                  '人为地帮助人眼"清扫"掉残留图像。' },
              { t: 'fig', id: 'holdimpulse', caption: '保持型（LCD）与脉冲型（CRT / BFI / 扫描背光）的发光时序：人眼对亮度做积分，黑帧把上一帧的残留"切断"。' }
            ]
          },
          {
            id: 'aspd',
            title: '友达模拟脉冲驱动（ASPD）',
            titleEn: "AU Optronics Simulated Pulse Driving Technology (ASPD)",
            blocks: [
              { t: 'p', v: '友达的 **模拟脉冲驱动（Simulated Pulsed Driving, ASPD / SPD）** 技术，' +
                '目标是解决液晶显示器的运动模糊问题。它通过调整像素驱动方式与扫描背光，' +
                '把 LCD 模拟成**脉冲型显示**，让动态画面的响应达到接近 CRT 的画质水平。' },
              { t: 'p', v: '该技术可以大幅降低运动模糊，让动态画面表现达到 **4 ms 等效灰阶响应（8 ms MPRT）** 的水平。' +
                '它也是当时少数已经具备量产条件的技术之一，可以应用在 WXGA（1366×768）与 Full HD（1920×1080）分辨率上。' }
            ]
          },
          {
            id: 'mpa',
            title: '三星 MPA（Motion Picture Acceleration）',
            titleEn: 'Samsung Motion Picture Acceleration (MPA)',
            blocks: [
              { t: 'p', v: '**MPA** 的设计目标是降低观看动态画面时 LCD 上的感知运动模糊。' +
                '由于 LCD 的工作原理，==即使响应时间极低，人眼也依然会感受到运动模糊==——' +
                '根源在于眼睛的图像残留，所以厂商一直在研究如何消除或减轻它。' },
              { t: 'p', v: 'BenQ 早前提出的黑帧插入（BFI）是一种思路：' +
                '在正常画面的每两帧之间插入一帧黑，理论上能"清扫"掉眼睛里的上一幅图像，从而降低感知运动模糊。' +
                '但如前所述，实测下来这些屏幕用的其实是扫描背光。' },
              { t: 'p', v: '三星现在有了自己的版本，首款搭载机型是 Samsung 245T。' +
                'MPA 的工作方式与 BFI 思路相似：让背光做"扫掠"，成组关闭 CCFL 灯管，从而帮助眼睛"清扫"。' +
                '该功能可以通过 OSD 开启，也可以通过机身正面的一键按钮直接切换。' },
              { t: 'p', v: 'MPA 的效果==完全是主观的==：有人觉得有用，有人不觉得。' +
                '它不应该用在静态画面上，因为会引入明显的闪烁；好在播放动态场景时闪烁不易察觉，' +
                '对比度损失也很小。评测可见 Samsung 245T 的实测记录。' }
            ]
          },
          {
            id: 'nec-mp',
            title: 'NEC 「Motion Picture Mode」（MP Mode）',
            titleEn: "NEC 'Motion Picture Mode' (MP Mode)",
            blocks: [
              { t: 'p', v: '截至原文写作时，这项增强只用在 NEC 的 LCD24WMGX3 上。' +
                '与三星 MPA 一样，它的目标是降低感知运动模糊、改善电影与游戏这类快速运动画面的观感。' +
                'NEC 把它叫做 **Motion Picture Mode**，可通过 OSD 或机身正面的 `MP Mode` 按钮直接访问。' +
                '该功能有四档：关闭，以及 1 到 3 档。' },
              { t: 'p', v: '技术实现是**扫描背光**：从屏幕顶部向下扫，按顺序逐支关闭 CCFL 灯管。' +
                '档位从 1 提到 3 时，背光扫描的强度随之增加，说明书建议画面运动越快就用越高的档位。' +
                '它的设计目的是通过清空人眼残留图像来减轻动态画面的模糊，' +
                '本质上是在应对"保持型 LCD 必然存在感知运动模糊与视网膜残留"这一固有问题。' },
              { t: 'p', v: '实际使用时，开启后屏幕亮度会略微下降，画面会出现肉眼可见的闪烁。' +
                '档位提到 3 之后闪烁不那么明显了（此时 MP 模式强度最高），但依然能察觉。' +
                '静态画面显然不该开这个功能；播放动态内容时闪烁会变得不那么突出。' }
            ]
          },
          {
            id: 'motion-interp',
            title: '运动插值 120 Hz 及以上',
            titleEn: 'Motion Interpolation 120Hz+',
            blocks: [
              { t: 'p', v: '运动插值（Motion Interpolation）广泛用于 HDTV 与播放器等显示设备，' +
                '目的是缓解 LCD 这类**固定帧率**显示设备在帧率转换时产生的画面瑕疵。' },
              { t: 'p', v: '电影以 24 fps 拍摄，电视则通常为 25 / 50（PAL）或 30 / 60 fps（NTSC）。' +
                '当 LCD 这类固定帧率屏幕去显示帧率低于自身的视频源时，' +
                '通常只能简单地**重复帧**直到时序对上，这就带来了被称为 **judder（画面顿挫）** 的瑕疵，' +
                '观感上就是画面"一跳一跳"。' },
              { t: 'p', v: '运动插值的思路是==生成中间帧==让运动更顺滑。' +
                '这一原理被进一步推广，把显示器的帧率推到 50 / 60 Hz 以上，于是有了 100 Hz 与 120 Hz（及更高）技术。' },
              { t: 'fig', id: 'memc', caption: 'MEMC 在每两帧原始画面之间插入估算帧。估算依赖前后帧的运动矢量——运动越复杂，"猜错"的概率越高。' }
            ],
            subs: [
              {
                id: 'trumotion',
                title: 'LG TruMotion',
                titleEn: 'LG TruMotion',
                blocks: [
                  { t: 'p', v: 'LG 推出的、用于改善液晶显示器感知运动模糊的技术，主要用在自家液晶电视上，' +
                    '也有少数桌面显示器带这个功能。' +
                    '它借助 TruMotion 在这些机型上实现了**伪 120 Hz** 支持，靠的就是后来被称作 **MEMC**' +
                    '（Motion Estimated Motion Compensation，运动估计与运动补偿）的方法。' },
                  { t: 'p', v: '基本原理是：电视处理器读取前后两帧，然后==估算或"猜"出夹在中间的那一帧应该长什么样==。' +
                    '这个步骤在每一帧之间重复，于是产出 120 fps，也就是所谓的"120 Hz"刷新率。' },
                  { t: 'p', v: '但==这不是真正的 120 Hz==——设备的输出仍然是 60 Hz，多出来的"帧"是插值猜出来的。' +
                    '实际使用中，这项技术确实有助于减轻感知运动模糊、让画面更顺滑，' +
                    '这也是它至今主要用在液晶电视上的原因。' },
                  { t: 'p', v: '不要把它与显示器上的**真 120 Hz** 混为一谈：后者允许外部设备 / PC 直接输入完整的 120 Hz 信号，' +
                    '两者的工作方式完全不同。当然，TruMotion 120 Hz 可以接受低于 120 Hz 的输入，' +
                    '所以它能用来改善 DVD / 蓝光播放器、电视信号与游戏主机（这些设备本来也输出不了更高刷新率）的运动模糊。' +
                    '它更偏向多媒体应用，并不真正支持 120 Hz 输入。' }
                ]
              },
              {
                id: 'trumotion240',
                title: 'LG TruMotion 240 Hz',
                titleEn: 'LG TruMotion 240Hz',
                blocks: [
                  { t: 'p', v: '2009 年，厂商把刷新率进一步提高到 240 fps / 240 Hz。听起来不难，实际并不简单。' +
                    '当时实现 240 Hz 有两条路：' },
                  { t: 'p', v: '**第一条**是简单地把 MEMC 原理再放大，在原始帧之间塞进更多"估算帧"。' +
                    '数学上讲，就是在每两帧原始画面之间插入 **3 帧**估算帧。' +
                    '这条路对算力要求更高、效率更低，而且因为估算帧数量是原始帧的三倍，画面会显得更"假"。' },
                  { t: 'p', v: '**第二条**是利用**扫描背光（Scanning Backlight）**，LG 选择了这条路。' +
                    '初始应用与 120 Hz 很相似：仍然用 MEMC 在每两帧之间生成 1 帧估算帧；' +
                    '然后扫描背光快速、按顺序地开关背光。' +
                    '==这在效果上等于造出了黑帧——实际上是 2 帧黑帧==。' +
                    '黑帧虽然不含图像信息，但它确实是一帧。' +
                    '这样得到 240 Hz，效率高得多，而且非常接近商业影院放映机呈现电影的方式。' +
                    '如今 LG 又把 240 Hz TruMotion 扩展到了 480 Hz。' }
                ]
              },
              {
                id: 'other-interp',
                title: '其它运动插值技术',
                titleEn: 'Other Motion Interpolation Technologies',
                blocks: [
                  { t: 'p', v: '运动插值虽然常见，但并不是所有 120 Hz HDTV 都带。' +
                    '另外需要区分：**抗 judder** 与**减轻运动模糊**并不是同一回事，只是经常被混为一谈。' +
                    '各厂商给这项技术起的商品名与实现方式都各不相同：' },
                  { t: 'dl', items: [
                    ['Hitachi 日立', 'Reel120'],
                    ['Insignia', 'DCM Plus（Digital Clear Motion 120 Hz）'],
                    ['Kogan Technologies', 'MotionMax 100 Hz / 200 Hz'],
                    ['LG', 'TruMotion 120 Hz / 240 Hz'],
                    ['AOC', 'Motion Boost 120 Hz'],
                    ['Mitsubishi 三菱', 'Smooth 120 Hz'],
                    ['Panasonic 松下', 'Intelligent Frame Creation（IFC）'],
                    ['Philips 飞利浦', 'HD Digital Natural Motion'],
                    ['Samsung 三星', 'Auto Motion Plus 120 Hz / 240 Hz'],
                    ['Sharp 夏普', 'Fine Motion Enhanced、AquoMotion 240 Hz'],
                    ['Sony 索尼', 'MotionFlow 100 Hz、100 Hz PRO（XBR 系列，澳大利亚）、120 Hz、200 Hz、240 Hz、400 Hz'],
                    ['Toshiba 东芝', 'ClearScan 120 Hz / 240 Hz'],
                    ['Vizio', 'MEMC（Motion Estimation, Motion Compensation）'],
                    ['Sceptre', 'MEMC']
                  ] }
                ]
              },
              {
                id: 'interp-issues',
                title: '运动插值带来的问题',
                titleEn: 'Issues Associated with Motion Interpolation',
                blocks: [
                  { t: 'p', v: '有些人不喜欢这些插值技术，认为画面带着一股"录像感"、显得很假。' +
                    '这种观感通常被称为 **"肥皂剧效应"（Soap Opera Effect）**——' +
                    '因为这类节目当年是用较便宜的 30 Hz 视频设备而非正规广播设备或胶片拍的。' +
                    '也有人抱怨画面像是在"快放"或者运动方式很怪。==归根到底是个人口味问题==。' },
                  { t: 'p', v: '某些实现还会带来额外的画面瑕疵，比如"水下"一般的涂抹感。' },
                  { t: 'p', v: '另外要注意，同一技术在不同制式下的数字并不一样。' +
                    'PAL 源的帧率是 25 或 50 fps，NTSC 是 30 或 60 fps，' +
                    '这里讨论的扩展刷新率都是这些帧率的倍数：' +
                    'PAL 地区看到的是 100 Hz / 200 Hz；NTSC 地区看到的是 120 Hz / 240 Hz 等。' }
                ]
              }
            ]
          },
          {
            id: 'hz120',
            title: '真 120 Hz 刷新率支持',
            titleEn: '120Hz Refresh Rate Support',
            blocks: [
              { t: 'p', v: '显示器上的**真 120 Hz** 要求屏幕能够接收完整的 120 Hz 频率信号输入，' +
                '这需要高带宽接口，常用双链路 DVI 或 DisplayPort 来承载，' +
                '在较新的场景下也可以走 HDMI 1.4。' },
              { t: 'p', v: '这类屏幕可以接受来自设备（通常是 PC）的 120 Hz 输入并运行在更高频率上，' +
                '也就是每秒能处理更多帧。实际效果是运动画面明显更顺滑，' +
                '对玩家而言则意味着那个至关重要的高帧率。' +
                '它有时还有一个额外好处：==减轻原本可能存在的 RTC 过冲==——我们在 Samsung 2233RZ 上就观察到过这一点。' },
              { t: 'p', v: '120 Hz 面板支持还与现代 3D 技术绑定，用来观看 3D 内容。' +
                '快门眼镜方案需要两路 60 Hz 信号（左右眼各一路），这正是 120 Hz 支持的用武之地。' +
                '例如 Samsung 2233RZ 与 BenQ XL2410T 都同时支持 120 Hz 输入和 3D 内容。' },
              { t: 'callout', kind: 'info', title: '别把真 120 Hz 和插帧混淆',
                v: '真 120 Hz 面向的显然是游戏市场，与那些**模拟** 120 Hz / 120 fps 的运动插值技术是两码事。' +
                  '当然，如果你手上没有 120 Hz 的信号可输入，这项支持也就无从发挥——屏幕只能回到标准的 60 Hz 运行。' }
            ]
          }
        ]
      },
      /* ==================================================== 03 面板涂层 */
      {
        id: 'coating',
        num: '03',
        title: '面板涂层技术',
        titleEn: 'Panel Coating Technologies',
        lead: '"镜面还是雾面"看起来只是审美问题，实际上是**反射与色深 / 锐度之间的取舍**。' +
          '这一章梳理当年几种有代表性的前表面处理方案。',
        sections: [
          {
            id: 'xblack',
            title: 'Sony X-Black',
            titleEn: 'Sony X-Black Technology',
            blocks: [
              { t: 'p', v: 'Sony 的 **X-Black / X-Brite** 技术最初是为笔记本面板开发的，' +
                '这意味着当他们把它用到桌面显示器上时，机身与边框可以做得非常小、非常时髦。' },
              { t: 'p', v: '他们用**双荧光灯管（CCFL）** 为显示屏提供背光，以获得比普通 LCD 面板更高的亮度。' +
                '这也帮助实现了当时看来相当亮眼的对比度指标（最高 1000:1），' +
                '而增加的亮度则被宣传为能改善影片播放效果。' },
              { t: 'p', v: 'Sony 还研究了一种他们称为 **"reflection reduction technology"（反射削减技术）** 的方案：' +
                '不再使用传统的**防眩涂层（Anti Glare，AG）**——那种涂层带来雾面观感，同时会损失一些色彩，尤其是黑阶深度——' +
                '而是叠加数层涂层。这些新涂层每一层的厚度都被精确控制在==光波长的四分之一==，非常薄。' +
                '其作用是让反射在到达屏幕表面前就被抵消掉。' },
              { t: 'p', v: '通过舍弃旧的 AG 涂层，他们改善了色彩还原（至少营销口径是这样）；' +
                '亮度与对比度的提升据说也让色彩层次更丰富；' +
                '按他们的宣传，去掉 AG 涂层还有助于提升画面锐度。' +
                '归根结底，**X-Black 的做法就是用镜面涂层替代传统的 AG 涂层**。' },
              { t: 'p', v: '关于 X-Black 以及它的反射特性，评价分歧很大。有人说没问题，但相当一部分人认为反射太强。' +
                '我的建议是保持谨慎：==务必先亲眼看一台 X-Black 屏幕或笔记本==，再判断自己能否接受。' +
                '反射问题一直是 X-Black 面板最主要的不满意点，同时对其显示器的宣传口径也要留个心眼——' +
                '虽然声称改进很多，但实际提升未必有宣传的那么神。' },
              { t: 'callout', kind: 'info', title: '延伸阅读', v: 'TFTCentral 另有一篇专门讨论面板涂层的文章（Panel Coating Article）。' }
            ]
          },
          {
            id: 'crystalbrite',
            title: 'Acer CrystalBrite',
            titleEn: 'Acer CrystalBrite',
            blocks: [
              { t: 'p', v: 'Acer 的反射式镜面涂层叫做 **CrystalBrite**，出现在部分桌面显示器以及自家笔记本上。' },
              { t: 'p', v: '该技术提供一种极细腻、高度抛光的光泽涂层，据称能带来更好的光过滤与更快成像。' +
                '官方宣传包括：减少来自内部与外部光源的反射，改善色彩与画质；' +
                '通过减少背光扩散获得更鲜艳、更明亮的画面；' +
                '以及在环境光散射最小的情况下取得更优的对比度。' }
            ]
          },
          {
            id: 'glass',
            title: '保护玻璃涂层',
            titleEn: 'Glass Panel Coating',
            blocks: [
              { t: 'p', v: '一些厂商会在显示屏前加一块**保护玻璃**，用来代替或叠加在普通镜面涂层之上。' +
                '实际效果看起来确实有助于呈现干净锐利的画面，' +
                '并且==不会出现某些激进 AG 涂层那种"颗粒感"==。' +
                'Apple Cinema Display 就是常见的例子；Hazro 的 HZ27WA / HZ27WC 等型号也采用了玻璃涂层。' },
              { t: 'p', v: '但在某些情况下，玻璃涂层会导致**夹尘**，一些低价屏幕就中招了。' +
                '它也未必人人喜欢，因为反射很容易成为问题——' +
                '尤其是当你的身后有窗户或光源时。' },
              { t: 'fig', id: 'coating', caption: '雾面、镜面与保护玻璃的光路差异：本质是"反射强度"与"色深 / 锐度"之间的取舍。' }
            ]
          },
          {
            id: 'opticlear',
            title: 'NEC OptiClear',
            titleEn: 'NEC OptiClear',
            blocks: [
              { t: 'p', v: 'NEC 在当年很受欢迎的 **NEC LCD20WGX2** 上引入了这种镜面涂层方案。' +
                '它同样是传统 AG 涂层的替代品，也并非人人买账。' +
                '设计目标是提升画面的锐度与"通透感"，这方面它做得不错，' +
                '但随之而来的反射问题自然也无法回避。' }
            ]
          }
        ]
      }
      ,
      /* ================================================ 04 画面增强与预设 */
      {
        id: 'enhance',
        num: '04',
        title: '画面增强与预设',
        titleEn: 'Screen Enhancements and Presets',
        lead: 'OSD 菜单里那一长串"增强技术"，多数其实只是几组预设。' +
          '这一章把厂商商品名与背后真实功能对应起来，并单独讲清楚对比度、均匀性这两个参数表重灾区。',
        sections: [
          {
            id: 'senseye',
            title: 'BenQ Senseye',
            titleEn: 'BenQ Senseye',
            blocks: [
              { t: 'p', v: '**Senseye** 本质上就是一组显示器预设模式，通过 OSD 菜单提供，面向不同使用场景。' },
              { t: 'quote', by: 'BenQ 官方宣传语',
                v: '一种纯粹的数字图像增强技术，能够自动、动态地提升画质。' +
                  '并承诺更深的、更丰富的、更清晰的画面。' +
                  '今天就体验 Senseye 技术——离人类眼睛真正的能力更近一步。' },
              { t: 'p', v: '这项技术的思路是让色彩更浓郁、更鲜艳，让画质更锐利、更清晰。原始图像信号会经过三个引擎处理：' },
              { t: 'dl', items: [
                ['对比度增强引擎（CEE）', '据称可提升对比度，让亮部更亮、暗部更暗。'],
                ['色彩管理引擎（CME）', '调整红、蓝、绿的色彩浓度，据称可改善肤色表现。'],
                ['锐度增强引擎（SEE）', '强化轮廓，帮助避免边缘发虚。']
              ] },
              { t: 'p', v: '而实际上，Senseye 产品只是提供了一组用户可以选择的预设——照片、影片、用户自定义等——' +
                '外加一颗用于在需要时自动切换预设的传感器芯片。' +
                '每项选择都对应一套色彩与亮度 / 对比度设定，其中"用户"选项允许你全部手动调整。' }
            ]
          },
          {
            id: 'magic',
            title: 'Samsung 「Magic」系列增强',
            titleEn: 'Samsung "Magic" Enhancements',
            blocks: [
              { t: 'p', v: '这是三星旗下一系列面向不同用途的增强功能，在其产品线中应用程度不一。以下是其中多数功能的说明：' },
              { t: 'table', head: null, rows: [
                ['**MagicTune**', '一款软件，可以快速、准确、方便地优化画质。常驻桌面，能够提供传统菜单系统做不到的精细画面调整与色彩校准功能。' +
                  '适合摄影师、设计师与动态图形工作者。本质上是一个占用资源很少的用户设置调整工具，PowerStrip 是同类替代方案。'],
                ['**MagicColour**', '智能色彩增强系统，强化特定颜色（例如肤色），适合多媒体应用、网页浏览、看 DVD 或处理相机照片。' +
                  '据称能改善肤色并让其它颜色更鲜艳。它本质上属于屏幕预设的一部分，会根据用途改变输入信号。'],
                ['**MagicContrast**', '确保 SyncMaster 系列显示器呈现最高画质，因此 SyncMaster 系列常标称高对比度。' +
                  '==这其实只是个营销用语，算不上技术==。标了它的三星屏幕应该具备更深邃的黑与更明亮的白。'],
                ['**MagicBright**', '提供五种亮度设定以适配不同内容，可一键在 Game、Movie、Sports、Internet、Text 模式间切换。' +
                  '无论工作、休闲还是上网，亮度都会相应调整。这是一组与 BenQ Senseye 类似的显示器预设。'],
                ['**MagicRotate**', '在显示器于横屏与竖屏之间旋转时，自动切换画面方向的软件。'],
                ['**MagicSpeed**', '即三星的过驱 / RTC 技术，详见第 01 章。'],
                ['**MagicStand**', '采用独特的双铰链结构，让屏幕能处在舒适的观看位置：可垂直升降、左右旋转、前后俯仰。'],
                ['**MagicNet**', '通过局域网向多块屏幕推送内容的软件。一台装有 MagicNet 的电脑即可控制并向多台显示器分发不同的内容。']
              ] }
            ]
          },
          {
            id: 'ecolor',
            title: 'Acer eColor Management',
            titleEn: 'Acer eColor Management',
            blocks: [
              { t: 'p', v: '这是 Acer 对自家那组用于调整亮度、对比度与色彩的预设模式的命名。' +
                '在部分型号上，可以通过 **Empowering Key（快捷键）** 进入 eColor Management 的 OSD 界面。' },
              { t: 'p', v: '按其白皮书，根据所选预设，eColor 可以控制下列参数：' },
              { t: 'list', ordered: false, items: [
                '**色轨技术（Colour tracking）**：进阶色温调整，稳定屏幕输出；',
                '**YUV 色彩空间转换**：从 RGB 转换到 YUV，使亮度与色度可以独立调整；',
                '**均匀亮度（Uniform-brightness）**：提升显示器输出，让暗部仍然可见，' +
                  '在强环境光下或远距离观看时避免色彩被冲淡；',
                '**精细对比度（Fine contrast）**：允许提高明亮区域或彩色区域的强度，而不至于让暗部发白；',
                '**自适应伽马（Adaptive gamma）**：按内容逐场景调整显示器的有效亮度与对比度，类似动态对比度控制；',
                '**优化锐度（Optimized sharpness）**；',
                '**独立色调（Independent hue）**；',
                '**超高饱和度（Ultra-saturation）**；',
                '**自适应色彩（Adaptive colour）**。'
              ] },
              { t: 'p', v: '这套预设包括标准、文本、图形、影片与用户五种模式。' +
                '说到底，它们也就是如今大量显示器都会有的常规预设，==实用价值因人而异==。' }
            ]
          },
          {
            id: 'fengine',
            title: 'LG f-Engine',
            titleEn: 'LG f-Engine',
            blocks: [
              { t: 'p', v: 'LG 的 **f-Engine** 集成在其显示器 OSD 中，提供一组预设模式，' +
                '用于按用户的不同需求调整色彩与亮度，可访问亮度、**ACE**（自适应色彩与对比度增强）' +
                '以及 **RCM**（真实色彩管理）等设置。' },
              { t: 'p', v: '其中 RCM 提供以下档位：`0` = 关闭 RCM，`1` = 增强绿色，`2` = 增强肤色，`3` = 整体色彩增强。' +
                '由于界面会显示**分屏对比**（右侧是原始色彩画面，左侧可预览 f-Engine 设置后的效果），' +
                '用户能很直观地看出每种设置对画面的影响。' }
            ]
          },
          {
            id: 'ambient',
            title: '环境光传感器',
            titleEn: 'Ambient Light Sensors',
            blocks: [
              { t: 'p', v: '部分显示器配备了环境光传感器，通常是面向办公用户或高端（且昂贵）的机型。' +
                '屏幕正面边框上有一枚小传感器，用来检测工作环境的环境照度，' +
                '然后自动控制屏幕亮度：房间亮就调亮、房间暗就调暗，并能应对使用过程中的变化。' },
              { t: 'p', v: '例如，当传感器检测到环境光变暗时，会相应降低背光，' +
                '从而提供更合适的可读性并减轻眼疲劳。' +
                '==这些功能对某些用户确实有用，但对另一些人来说，亮度的自动变化反而是干扰==。' }
            ],
            subs: [
              {
                id: 'ambibright',
                title: 'NEC AmbiBright',
                titleEn: 'NEC AmbiBright',
                blocks: [
                  { t: 'p', v: '这是 NEC 版本的环境光传感器。它根据环境照度自动调整背光。' },
                  { t: 'p', v: '除了自动控制亮度设定之外，你还可以让显示器在环境光低于某个预设值时**自动进入省电模式**' +
                    '（比如下班关灯之后），这能显著降低能耗。' +
                    '考虑到交易大厅等"屏幕密集"环境里显示器的数量，' +
                    '这个亮度功能对降低总体拥有成本（TCO）的贡献相当可观。' }
                ]
              }
            ]
          },
          {
            id: 'uniformity',
            title: '均匀性校正',
            titleEn: 'Uniformity Correction',
            blocks: [
              { t: 'p', v: '一些高端显示器提供了用于控制和校正整块面板画面差异的功能。' +
                '这类技术有助于确保全屏亮度与色彩均匀一致；' +
                '由于成本原因，通常只在专业级屏幕上提供。' },
              { t: 'p', v: '各厂商的实现方式与命名各不相同。' +
                '多数方案是由屏幕自动完成**数字校正**，有时允许用户在几档强度之间选择。' +
                '这些功能通常能很好地改善面板均匀性，但由于做了数字调整，' +
                '==有时会影响到显示器的对比度==。' },
              { t: 'p', v: '部分显示器（例如 Samsung S27B970D）甚至允许你自己测量屏幕均匀性，' +
                '再由专用软件自动写入屏幕硬件以完成校正。' }
            ],
            subs: [
              {
                id: 'colorcomp',
                title: 'NEC ColorComp',
                titleEn: 'NEC ColorComp',
                blocks: [
                  { t: 'p', v: '这种均匀性校正技术主要用于 NEC 的高端专业级屏幕，' +
                    '目标是让均匀性误差降到几乎无法察觉的水平。' },
                  { t: 'p', v: '**ColorComp 的做法是：对屏幕上每一颗像素施加数字校正**，以补偿色彩与亮度的差异。' +
                    '每台显示器在生产时都会用全自动系统逐台标定，在不同灰阶下测量屏幕上数百个点位；' +
                    '这些测量结果被用来构建一个**三维校正矩阵**并存储在显示器内部。' },
                  { t: 'callout', kind: 'key', title: '三维校正矩阵：不只跟位置有关',
                    v: '这些数据不仅把屏幕均匀性当作**屏幕坐标位置**的函数来补偿，' +
                      '同时也当作**灰阶**的函数来补偿——这正是"三维"的含义。' +
                      '该项设置可在 OSD 菜单中调整，通常有 0（关闭）到 5（最大）几档。' +
                      '如果愿意，也可以关掉 ColorComp 校正，以换取最高的亮度与对比度。' },
                  { t: 'p', v: '不过这项技术也存在一些问题。开启后会**影响校准质量**，波及色彩准确度、伽马与对比度。' +
                    '另外，它依赖出厂测量结果，并用一张**静态 LUT** 去补偿温度与老化带来的影响。' +
                    '由于面板前方没有传感器，==无法对面板行为做实时色彩校正==；' +
                    '因此如果实际老化情况与预期不同，均匀性反而可能随时间变差。' }
                ]
              },
              {
                id: 'due',
                title: 'Eizo Digital Uniformity Equalizer（DUE）',
                titleEn: 'Eizo Digital Uniformity Equalizer (DUE)',
                blocks: [
                  { t: 'p', v: '这是 Eizo 用于均匀性校正的技术。屏幕上不同区域的亮度与色度波动，是 LCD 显示器的常见特性。' },
                  { t: 'p', v: '为应对这一点，Eizo 在显示器中引入其专利的**数字均匀性均衡器（DUE）** 技术，' +
                    '确保出厂时屏幕上各点的 ==ΔE 差异不超过 3==。' },
                  { t: 'p', v: '如今 DUE 还会**补偿环境温度波动**对色温与亮度的影响，以保证画面显示稳定。' }
                ]
              }
            ]
          },
          {
            id: 'dcr',
            title: '动态对比度（DCR）',
            titleEn: 'Dynamic Contrast Ratio (DCR)',
            blocks: [
              { t: 'p', v: '不少厂商为显示器引入了动态对比度控制，' +
                '目的是在特定条件下实时改善显示器的黑白电平与对比度。' +
                '它被宣称能让色彩更鲜艳明亮、文字更锐利，并强化色彩标度的两端，让黑更深、白更亮。' },
              { t: 'callout', kind: 'key', title: '关键：调的是背光，不是像素',
                v: '动态对比度是==通过调节背光亮度实现的==，而不是在矩阵 / 面板层面做任何调整。' +
                  '在暗场景中把背光调暗，让暗部更暗；在亮场景中把背光调到最大，让亮部更亮。' },
              { t: 'p', v: '官方数字是这样算出来的：**白场在最亮背光下测量，黑场在最暗背光下测量**。' +
                '所以，如果面板的静态对比度是 1000:1，而显示器的电路能把背光强度自动改变 300%，' +
                '得到的动态对比度就是 3000:1。' },
              { t: 'p', v: '当然，==屏幕在任一时刻的对比度（白与黑之比）永远不会高于显示器标称的静态对比度==；' +
                '但在明亮场景中，黑阶对人眼并不重要，反之亦然。' +
                '这正是电影里的自动亮度调节确实有用、并让人产生"动态范围大幅提升"印象的原因。' },
              { t: 'fig', id: 'dcr', caption: '动态对比度把"最亮白"除以"最暗黑"，两个数取自不同的背光状态，因此数值可以做得极大。' },
              { t: 'p', v: '缺点在于：==整块屏幕的亮度是被同时改变的==。' +
                '在同一画面里亮部与暗部差不多多的时候，显示器只能取一个平均亮度。' +
                '动态对比度在"大面积暗、只有几个很亮的小物体"的场景下表现很差（比如夜里带路灯的街道）：' +
                '背景是暗的，显示器会把亮度降到最低，那些亮物体也跟着被压暗。' },
              { t: 'p', v: '理想情况下，这类增强不该用在办公场景，因为它容易分散注意力，或者在色彩工作中造成麻烦；' +
                '但看电影、有时包括玩游戏，确实能从中获得不错的提升。' +
                '有些用户完全不喜欢这项技术，好在通常可以通过 OSD 关闭。' +
                '各家实现效果差异也很大：有的效果很好、接近宣传数字，有的几乎不起作用；' +
                '亮度过渡的速度与平滑度也各不相同。' },
              { t: 'p', v: 'DCR 大概是当今市场上==被夸大得最厉害的一项规格==。' +
                '现在你能看到"几百万比一"的 DCR 数字，采用 LED 背光的屏幕通常吹得最高。' +
                '与气体放电灯（CCFL）不同，LED 可以瞬间点亮或完全熄灭，' +
                '这使得纸面和工厂测试中都能得到极高的动态对比度，百万级数字如今非常常见。' },
              { t: 'p', v: '这些数字的前提是"在 100% 黑场内容下把背光完全关掉"，' +
                '但真实应用中——比如看一部电影——**连片尾字幕都不是纯黑的**。' +
                '绝大多数时候画面里除了黑还有别的东西，一块标称了巨大动态对比度的显示器，实际根本没有机会展示出来。' +
                '因此，==把动态对比度做到约 10000:1 以上就没有实际意义了==，' +
                '这个水平包括 CCFL 背光的机器在内，早已是很多显示器的标配。' }
            ],
            subs: [
              {
                id: 'dfc',
                title: 'Digital Fine Contrast（DFC，LG.Philips）',
                titleEn: 'Digital Fine Contrast (DFC)',
                blocks: [
                  { t: 'p', v: '刚发布时，LG.Philips 的 **DFC** 被宣传为能把对比度从典型的 700:1 提升到当时惊人的 1600:1。' +
                    '这基本上就是他们自家版本的动态对比度，而且他们对工作原理讲得稍微细一些。' },
                  { t: 'p', v: '据称它能帮助色彩更鲜艳明亮、文字更锐利，并强化色彩标度两端，让黑更深、白更亮。' +
                    '这对"看不清藏在暗处敌人"的玩家，以及想改善色彩质量的照片 / 影院用户都是好事。' },
                  { t: 'p', v: '这项技术被称为 **DFC 引擎**，由三个部分组成：' },
                  { t: 'dl', items: [
                    ['自动内容识别（ACR）', '检测正在观看的内容类型，决定如何使用对比度调整引擎来获得最佳效果。' +
                      '这取决于显示器 OSD 中的模式选择（影片、文本、游戏等）。' +
                      '例如在"影片"模式下，DFC 朝最大亮度方向增强；在"图片"模式下则加深色彩。'],
                    ['数字对比度增强器（DCE）', '降低黑色亮度。'],
                    ['数字对比度映射器（DCM）', '在显示图像的同时确保增强后的对比度被优化。']
                  ] },
                  { t: 'p', v: 'DFC 基于一个由**查找表（LUT）** 控制的自动对比度增强器，' +
                    '据报告它会改变像素的伽马：压暗暗部，同时提升亮部的亮度。' }
                ]
              },
              {
                id: 'dvm',
                title: 'Advanced DVM（NEC）',
                titleEn: 'Advanced DVM',
                blocks: [
                  { t: 'p', v: 'NEC 在其部分型号（包括 NEC LCD20WGX2）上提供动态对比度。' +
                    '本质上，它和其它 DCR 的原理相同，只是 NEC 用了另一个名字。' }
                ]
              },
              {
                id: 'ape',
                title: 'APE（AUO Picture Enhancer，友达画面增强）',
                titleEn: 'APE (AUO Picture Enhancer) Technology',
                blocks: [
                  { t: 'p', v: '友达的 **APE** 技术把输入图像数据管理与动态背光控制整合到一起。' +
                    '其内置的图像处理电路可以**动态调整对比度、锐度、色调、色温与色彩饱和度**，去适配具体画面。' },
                  { t: 'p', v: '非线性图像处理可以顺应人类感知动态的变化，' +
                    '专门用来解决液晶电视在暗态下动态画面容易失准的既有问题。' +
                    '该技术提供鲜艳锐利的画面、还原自然色彩，并增强饱和度、灰阶细节与对比度，' +
                    '让用户能更好地欣赏电影中的暗部与夜景细节。' },
                  { t: 'p', v: '主要特性：' },
                  { t: 'dl', items: [
                    ['锐度增强', '提升高频信号以突出细节，提供锐利画面。'],
                    ['色彩饱和度', '扩展输入视频的色域，最大化利用面板能力，获得更强的视觉刺激。'],
                    ['色调精修', '把色彩空间拆成若干独立区域，各颜色可单独修改而不影响相对色彩关系。'],
                    ['动态背光调光', '以背光调制的方式缓解漏光，从而提供高对比度。'],
                    ['LED 高动态对比', '最新的 LED 高动态对比方案使用可局部调节的 LED 背光提升对比度，' +
                      '在整体画质改善的同时平均节省 50% 功耗。']
                  ] }
                ]
              },
              {
                id: 'acm',
                title: 'Acer Adaptive Contrast Management（ACM）',
                titleEn: 'Acer Adaptive Contrast Management (ACM)',
                blocks: [
                  { t: 'p', v: 'Acer 对动态对比度控制的自家命名。' +
                    '官方宣传是能在暗场景与亮场景中都呈现更好的细节，同时有助于降低功耗。' }
                ]
              },
              {
                id: 'megadcr',
                title: 'Samsung Mega DCR',
                titleEn: 'Samsung Mega DCR',
                blocks: [
                  { t: 'p', v: '三星对动态对比度控制的命名，称作 **Mega DCR**。' +
                    '他们通常把它列在 DCR 规格之下，==并不给出具体数值==。' }
                ]
              }
            ]
          }
        ]
      }
    ]
  });

  window.BLOGData = {
    meta: {
      updated: '2026-09-29',
      sourceTitle: 'TFTCentral — Technologies',
      sourceUrl: 'https://tftcentral.co.uk/advanced',
      license: '原文版权归 TFTCentral 所有；本页为学习用途的中文翻译整理，示意图按原文描述重绘，未使用任何原站图片资源。'
    },
    figures: FIGURES,
    glossary: GLOSSARY,
    posts: POSTS
  };
})(typeof window !== 'undefined' ? window : globalThis);
