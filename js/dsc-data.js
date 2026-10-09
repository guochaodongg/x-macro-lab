/* =============================================================================
 * dsc-data.js — Technology Blog 第二篇文章：DSC（显示流压缩）技术解析
 *                （纯数据，无逻辑、不碰 DOM）
 *
 * 数据来源：VESA Display Stream Compression (DSC) Standard, Version 1.2a
 *           2017-01-18（规范原文：https://vesa.org/vesa-stds/）
 *
 * 本文件按「新增文章只需往 BLOGData.posts 里加一条」的约定，在 blog-data.js 之后
 * 加载，把文章对象 push 进 BLOGData.posts，并把本篇专用的内联 SVG 注册进
 * BLOGData.figures。正文块结构与 blog-data.js 完全一致（见该文件头部说明）。
 *
 * 版权说明：本篇是面向中文读者的**学习性原理整理**，非规范官方译文，也不转载
 * 规范原文的表格与插图；所有示意图均按规范描述的机理重绘（纯内联 SVG，
 * 不请求任何外部资源）。规范原文以 VESA 发布的版本为准。
 * ========================================================================== */
(function (window) {
  'use strict';

  var D = window.BLOGData;
  if (!D || !D.posts || !D.figures) return;

  /* ------------------------------------------------------------- 示意图 SVG */
  /* 全部内联绘制，颜色走 CSS 变量，因此自动跟随明/暗主题，且不请求任何外部资源。 */
  var FIGURES = {

    /* 端到端位置：DSC 处在「源设备」与「宿设备」之间，只管比特流，不管传输层 */
    dscLink:
      '<svg class="bl-fig-svg" viewBox="0 0 640 232" role="img" aria-label="DSC 在端到端系统中的位置">' +
      '<rect x="0" y="0" width="640" height="232" fill="var(--surface-2)"/>' +
      '<text x="16" y="26" fill="var(--text-soft)" font-size="12" font-weight="600">DSC 在端到端系统中的位置</text>' +
      /* 源设备 */
      '<rect x="10" y="44" width="274" height="112" rx="10" fill="none" stroke="var(--border-strong)" stroke-dasharray="5 4"/>' +
      '<text x="24" y="64" fill="var(--text-dim)" font-size="11">源设备（Source Device）</text>' +
      '<rect x="26" y="76" width="106" height="52" rx="7" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="79" y="99" fill="var(--text-soft)" font-size="11.5" text-anchor="middle">图像源</text>' +
      '<text x="79" y="115" fill="var(--text-dim)" font-size="10" text-anchor="middle">逐行实时输出</text>' +
      '<rect x="152" y="76" width="118" height="52" rx="7" fill="var(--surface)" stroke="var(--accent)"/>' +
      '<text x="211" y="99" fill="var(--accent)" font-size="11.5" font-weight="600" text-anchor="middle">DSC 编码器</text>' +
      '<text x="211" y="115" fill="var(--text-dim)" font-size="10" text-anchor="middle">含速率缓冲</text>' +
      '<line x1="132" y1="102" x2="148" y2="102" stroke="var(--accent)" stroke-width="2"/>' +
      '<polygon points="148,98 156,102 148,106" fill="var(--accent)"/>' +
      /* 宿设备 */
      '<rect x="356" y="44" width="274" height="112" rx="10" fill="none" stroke="var(--border-strong)" stroke-dasharray="5 4"/>' +
      '<text x="370" y="64" fill="var(--text-dim)" font-size="11">宿设备（Sink Device）</text>' +
      '<rect x="370" y="76" width="118" height="52" rx="7" fill="var(--surface)" stroke="var(--accent)"/>' +
      '<text x="429" y="99" fill="var(--accent)" font-size="11.5" font-weight="600" text-anchor="middle">DSC 解码器</text>' +
      '<text x="429" y="115" fill="var(--text-dim)" font-size="10" text-anchor="middle">含速率缓冲</text>' +
      '<rect x="508" y="76" width="106" height="52" rx="7" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="561" y="99" fill="var(--text-soft)" font-size="11.5" text-anchor="middle">显示面板</text>' +
      '<text x="561" y="115" fill="var(--text-dim)" font-size="10" text-anchor="middle">逐行实时接收</text>' +
      '<line x1="492" y1="102" x2="504" y2="102" stroke="var(--accent)" stroke-width="2"/>' +
      '<polygon points="504,98 512,102 504,106" fill="var(--accent)"/>' +
      /* 链路 */
      '<line x1="288" y1="102" x2="352" y2="102" stroke="var(--accent)" stroke-width="2"/>' +
      '<polygon points="352,98 360,102 352,106" fill="var(--accent)"/>' +
      '<text x="320" y="94" fill="var(--accent)" font-size="10.5" text-anchor="middle">DSC 比特流</text>' +
      '<text x="320" y="120" fill="var(--text-dim)" font-size="10" text-anchor="middle">链路（传输层）</text>' +
      /* 底部说明 */
      '<line x1="16" y1="176" x2="624" y2="176" stroke="var(--border)"/>' +
      '<text x="16" y="196" fill="var(--text-soft)" font-size="11">压缩只发生在两端器件内部：链路看到的已经是压缩后的比特流。</text>' +
      '<text x="16" y="214" fill="var(--text-dim)" font-size="11">DSC 规范只定义语法、编码过程与解码过程，' +
      '「怎么把比特流送过去」由 DP / eDP / MIPI DSI 等应用规范负责。</text>' +
      '</svg>',

    /* 语法层级：Substream → Slice → Picture（+PPS），以及两级复用 */
    dscLayers:
      '<svg class="bl-fig-svg" viewBox="0 0 640 250" role="img" aria-label="DSC 的语法层级与两级复用">' +
      '<rect x="0" y="0" width="640" height="250" fill="var(--surface-2)"/>' +
      '<text x="16" y="26" fill="var(--text-soft)" font-size="12" font-weight="600">语法层级与两级复用</text>' +
      /* 子流层 */
      '<text x="18" y="58" fill="var(--text-dim)" font-size="10.5">子流层 Substream</text>' +
      '<rect x="18" y="66" width="60" height="30" rx="6" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="48" y="86" fill="var(--text-soft)" font-size="11" text-anchor="middle">Y</text>' +
      '<rect x="18" y="104" width="60" height="30" rx="6" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="48" y="124" fill="var(--text-soft)" font-size="11" text-anchor="middle">Co</text>' +
      '<rect x="18" y="142" width="60" height="30" rx="6" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="48" y="162" fill="var(--text-soft)" font-size="11" text-anchor="middle">Cg</text>' +
      /* 复用箭头 */
      '<path d="M84 81 C104 81 104 116 122 116" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
      '<path d="M84 119 L122 119" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
      '<path d="M84 157 C104 157 104 122 122 122" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
      /* 切片层 */
      '<rect x="126" y="92" width="132" height="54" rx="7" fill="var(--surface)" stroke="var(--accent)"/>' +
      '<text x="192" y="114" fill="var(--accent)" font-size="11.5" font-weight="600" text-anchor="middle">切片 Slice</text>' +
      '<text x="192" y="131" fill="var(--text-dim)" font-size="10" text-anchor="middle">子流复用 SSM</text>' +
      /* 切片复用 */
      '<line x1="262" y1="119" x2="300" y2="119" stroke="var(--accent)" stroke-width="2"/>' +
      '<polygon points="300,115 308,119 300,123" fill="var(--accent)"/>' +
      '<text x="281" y="110" fill="var(--text-dim)" font-size="10" text-anchor="middle">每行多个切片</text>' +
      /* 图像层 */
      '<rect x="312" y="88" width="140" height="62" rx="7" fill="var(--surface)" stroke="var(--accent)"/>' +
      '<text x="382" y="112" fill="var(--accent)" font-size="11.5" font-weight="600" text-anchor="middle">图像 Picture</text>' +
      '<text x="382" y="130" fill="var(--text-dim)" font-size="10" text-anchor="middle">切片复用 + 首尾拼接</text>' +
      /* PPS */
      '<rect x="312" y="164" width="140" height="34" rx="7" fill="var(--surface)" stroke="var(--warn)"/>' +
      '<text x="382" y="186" fill="var(--warn)" font-size="11.5" text-anchor="middle">PPS 图像参数集</text>' +
      '<line x1="382" y1="150" x2="382" y2="164" stroke="var(--warn)" stroke-dasharray="4 3"/>' +
      /* 比特流 */
      '<line x1="456" y1="119" x2="500" y2="119" stroke="var(--accent)" stroke-width="2"/>' +
      '<polygon points="500,115 508,119 500,123" fill="var(--accent)"/>' +
      '<rect x="512" y="96" width="112" height="46" rx="7" fill="var(--accent-soft)" stroke="var(--accent)"/>' +
      '<text x="568" y="124" fill="var(--accent)" font-size="12" font-weight="600" text-anchor="middle">DSC 比特流</text>' +
      '<text x="16" y="222" fill="var(--text-soft)" font-size="11">自下而上三级封装：分量各自成流 → 复用成切片 → 切片拼成图像；</text>' +
      '<text x="16" y="240" fill="var(--text-dim)" font-size="11">' +
      'PPS 不在任何图像／切片的比特预算内，必须由传输层保证可靠送达。</text>' +
      '</svg>',

    /* 编码流水线：CSC → 预测/量化/重建 → 熵编码 → 子流复用 → 速率缓冲（RC 回环） */
    dscPipeline:
      '<svg class="bl-fig-svg" viewBox="0 0 640 268" role="img" aria-label="DSC 编码流水线">' +
      '<rect x="0" y="0" width="640" height="268" fill="var(--surface-2)"/>' +
      '<text x="16" y="26" fill="var(--text-soft)" font-size="12" font-weight="600">编码流水线（解码端为其镜像）</text>' +
      /* 主干方框 */
      '<rect x="14" y="52" width="96" height="52" rx="7" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="62" y="74" fill="var(--text-soft)" font-size="11" text-anchor="middle">输入缓冲</text>' +
      '<text x="62" y="90" fill="var(--text-dim)" font-size="10" text-anchor="middle">逐行像素</text>' +
      '<rect x="130" y="52" width="112" height="52" rx="7" fill="var(--surface)" stroke="var(--teal)"/>' +
      '<text x="186" y="74" fill="var(--teal)" font-size="11" text-anchor="middle">RGB→YCoCg-R</text>' +
      '<text x="186" y="90" fill="var(--text-dim)" font-size="10" text-anchor="middle">YCbCr 输入则旁路</text>' +
      '<rect x="262" y="52" width="164" height="52" rx="7" fill="var(--surface)" stroke="var(--accent)"/>' +
      '<text x="344" y="73" fill="var(--accent)" font-size="11" text-anchor="middle">预测 · 量化 · 重建</text>' +
      '<text x="344" y="90" fill="var(--text-dim)" font-size="10" text-anchor="middle">MMAP / BP / MPP + ICH</text>' +
      '<rect x="446" y="52" width="104" height="52" rx="7" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="498" y="74" fill="var(--text-soft)" font-size="11" text-anchor="middle">熵编码</text>' +
      '<text x="498" y="90" fill="var(--text-dim)" font-size="10" text-anchor="middle">DSU-VLC</text>' +
      '<rect x="446" y="140" width="104" height="52" rx="7" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="498" y="162" fill="var(--text-soft)" font-size="11" text-anchor="middle">子流复用</text>' +
      '<text x="498" y="178" fill="var(--text-dim)" font-size="10" text-anchor="middle">SSM + 平衡 FIFO</text>' +
      '<rect x="290" y="140" width="128" height="52" rx="7" fill="var(--surface)" stroke="var(--accent)"/>' +
      '<text x="354" y="162" fill="var(--accent)" font-size="11" text-anchor="middle">速率缓冲</text>' +
      '<text x="354" y="178" fill="var(--text-dim)" font-size="10" text-anchor="middle">变长 → 恒定码率</text>' +
      '<rect x="130" y="140" width="132" height="52" rx="7" fill="var(--surface)" stroke="var(--warn)"/>' +
      '<text x="196" y="162" fill="var(--warn)" font-size="11" text-anchor="middle">速率控制 RC</text>' +
      '<text x="196" y="178" fill="var(--text-dim)" font-size="10" text-anchor="middle">逐组给出 QP</text>' +
      /* 主干箭头 */
      '<line x1="110" y1="78" x2="126" y2="78" stroke="var(--accent)" stroke-width="2"/>' +
      '<polygon points="126,74 134,78 126,82" fill="var(--accent)"/>' +
      '<line x1="242" y1="78" x2="258" y2="78" stroke="var(--accent)" stroke-width="2"/>' +
      '<polygon points="258,74 266,78 258,82" fill="var(--accent)"/>' +
      '<line x1="426" y1="78" x2="442" y2="78" stroke="var(--accent)" stroke-width="2"/>' +
      '<polygon points="442,74 450,78 442,82" fill="var(--accent)"/>' +
      '<line x1="498" y1="104" x2="498" y2="136" stroke="var(--accent)" stroke-width="2"/>' +
      '<polygon points="494,136 498,144 502,136" fill="var(--accent)"/>' +
      '<line x1="446" y1="166" x2="422" y2="166" stroke="var(--accent)" stroke-width="2"/>' +
      '<polygon points="422,162 414,166 422,170" fill="var(--accent)"/>' +
      /* 行缓存回环 */
      '<rect x="262" y="212" width="164" height="34" rx="7" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="344" y="234" fill="var(--text-dim)" font-size="10.5" text-anchor="middle">上一行重建样点行缓存</text>' +
      '<path d="M426 226 C440 226 440 196 426 196 L418 196" fill="none" stroke="var(--border-strong)" stroke-width="1.6"/>' +
      '<path d="M280 196 C268 196 268 226 280 226" fill="none" stroke="var(--border-strong)" stroke-width="1.6"/>' +
      /* RC 回环 */
      '<path d="M270 166 L270 190 C270 200 285 200 285 200" fill="none" stroke="var(--warn)" stroke-width="1.8" stroke-dasharray="5 3"/>' +
      '<text x="152" y="212" fill="var(--warn)" font-size="10.5">RQ 反馈：用刚编完的组更新缓冲模型</text>' +
      '<line x1="262" y1="166" x2="240" y2="166" stroke="var(--warn)" stroke-width="2"/>' +
      '<text x="16" y="120" fill="var(--text-dim)" font-size="10.5">输入</text>' +
      '<text x="576" y="120" fill="var(--text-dim)" font-size="10.5">输出</text>' +
      '</svg>',

    /* 组与 MMAP 邻域：a 在左、c b d e 在上一行 */
    dscGroup:
      '<svg class="bl-fig-svg" viewBox="0 0 640 232" role="img" aria-label="组的定义与 MMAP 使用的邻域像素">' +
      '<rect x="0" y="0" width="640" height="232" fill="var(--surface-2)"/>' +
      '<text x="16" y="26" fill="var(--text-soft)" font-size="12" font-weight="600">组（3 像素）与 MMAP 的邻域</text>' +
      /* 上一行 */
      '<text x="16" y="66" fill="var(--text-dim)" font-size="10.5">上一行（已重建）</text>' +
      '<rect x="120" y="52" width="52" height="40" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="146" y="77" fill="var(--text-soft)" font-size="11" text-anchor="middle">c</text>' +
      '<rect x="176" y="52" width="52" height="40" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="202" y="77" fill="var(--text-soft)" font-size="11" text-anchor="middle">b</text>' +
      '<rect x="232" y="52" width="52" height="40" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="258" y="77" fill="var(--text-soft)" font-size="11" text-anchor="middle">d</text>' +
      '<rect x="288" y="52" width="52" height="40" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="314" y="77" fill="var(--text-soft)" font-size="11" text-anchor="middle">e</text>' +
      '<rect x="344" y="52" width="52" height="40" rx="5" fill="none" stroke="var(--border)" stroke-dasharray="4 3"/>' +
      '<text x="370" y="77" fill="var(--text-dim)" font-size="11" text-anchor="middle">f</text>' +
      /* 当前行 */
      '<text x="16" y="126" fill="var(--text-dim)" font-size="10.5">当前行</text>' +
      '<line x1="120" y1="44" x2="396" y2="44" stroke="var(--border)"/>' +
      '<rect x="64" y="100" width="52" height="40" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="90" y="125" fill="var(--text-soft)" font-size="11" text-anchor="middle">a</text>' +
      '<rect x="120" y="100" width="52" height="40" rx="5" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.6"/>' +
      '<text x="146" y="125" fill="var(--accent)" font-size="11" text-anchor="middle">P0</text>' +
      '<rect x="176" y="100" width="52" height="40" rx="5" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.6"/>' +
      '<text x="202" y="125" fill="var(--accent)" font-size="11" text-anchor="middle">P1</text>' +
      '<rect x="232" y="100" width="52" height="40" rx="5" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.6"/>' +
      '<text x="258" y="125" fill="var(--accent)" font-size="11" text-anchor="middle">P2</text>' +
      /* 组标注 */
      '<path d="M116 152 L288 152" stroke="var(--accent)" stroke-width="1.6"/>' +
      '<text x="202" y="170" fill="var(--accent)" font-size="10.5" text-anchor="middle">一个组 = 光栅顺序上连续 3 个像素</text>' +
      /* 右侧说明 */
      '<text x="428" y="70" fill="var(--text-soft)" font-size="10.5">b、c、d、e 取自上一行，a 是左侧已重建像素；</text>' +
      '<text x="428" y="88" fill="var(--text-soft)" font-size="10.5">上一行先过 [0.25 0.5 0.25] 水平低通，再按</text>' +
      '<text x="428" y="106" fill="var(--text-soft)" font-size="10.5">当前量化级做受限混合，得到 blendB/C/D/E。</text>' +
      '<text x="428" y="130" fill="var(--text-dim)" font-size="10.5">切片第一行没有上一行，此时</text>' +
      '<text x="428" y="148" fill="var(--text-dim)" font-size="10.5">P0 = a，P1/P2 只靠 a 与残差递推。</text>' +
      '<text x="428" y="180" fill="var(--text-dim)" font-size="10.5">组是逻辑单位：子流复用后</text>' +
      '<text x="428" y="198" fill="var(--text-dim)" font-size="10.5">比特流里并没有「组」的标记。</text>' +
      '</svg>',

    /* 块预测：在上一行做 9 像素 SAD 搜索，向量 -3 ~ -10 */
    dscBp:
      '<svg class="bl-fig-svg" viewBox="0 0 640 244" role="img" aria-label="块预测向量的搜索范围与预测位置">' +
      '<rect x="0" y="0" width="640" height="244" fill="var(--surface-2)"/>' +
      '<text x="16" y="26" fill="var(--text-soft)" font-size="12" font-weight="600">块预测（BP）：在上一行找最像的 9 个像素</text>' +
      /* 上一行像素格子 */
      '<text x="16" y="62" fill="var(--text-dim)" font-size="10.5">上一行</text>' +
      '<g>' +
      '<rect x="60" y="48" width="34" height="30" fill="var(--surface)" stroke="var(--border)"/>' +
      '<rect x="94" y="48" width="34" height="30" fill="var(--surface)" stroke="var(--border)"/>' +
      '<rect x="128" y="48" width="34" height="30" fill="var(--warn-soft)" stroke="var(--warn)"/>' +
      '<rect x="162" y="48" width="34" height="30" fill="var(--warn-soft)" stroke="var(--warn)"/>' +
      '<rect x="196" y="48" width="34" height="30" fill="var(--warn-soft)" stroke="var(--warn)"/>' +
      '<rect x="230" y="48" width="34" height="30" fill="var(--surface)" stroke="var(--border)"/>' +
      '<rect x="264" y="48" width="34" height="30" fill="var(--surface)" stroke="var(--border)"/>' +
      '<rect x="298" y="48" width="34" height="30" fill="var(--surface)" stroke="var(--border)"/>' +
      '<rect x="332" y="48" width="34" height="30" fill="var(--surface)" stroke="var(--border)"/>' +
      '</g>' +
      '<text x="145" y="42" fill="var(--warn)" font-size="10" text-anchor="middle">候选参考</text>' +
      /* 当前行 */
      '<text x="16" y="122" fill="var(--text-dim)" font-size="10.5">当前行</text>' +
      '<g>' +
      '<rect x="230" y="108" width="34" height="30" fill="var(--surface)" stroke="var(--border)"/>' +
      '<rect x="264" y="108" width="34" height="30" fill="var(--surface)" stroke="var(--border)"/>' +
      '<rect x="298" y="108" width="34" height="30" fill="var(--surface)" stroke="var(--border)"/>' +
      '<rect x="332" y="108" width="34" height="30" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.6"/>' +
      '<rect x="366" y="108" width="34" height="30" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.6"/>' +
      '<rect x="400" y="108" width="34" height="30" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.6"/>' +
      '</g>' +
      '<text x="383" y="156" fill="var(--accent)" font-size="10" text-anchor="middle">当前组 3 像素</text>' +
      /* 预测连线 */
      '<path d="M349 100 L349 92 L145 92 L145 80" fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-dasharray="4 3"/>' +
      '<polygon points="141,80 145,72 149,80" fill="var(--accent)"/>' +
      '<text x="250" y="86" fill="var(--accent)" font-size="10.5" text-anchor="middle">预测值 = 左侧 |vector| 个像素处的重建值</text>' +
      /* 向量范围 */
      '<rect x="452" y="44" width="172" height="98" rx="8" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="466" y="66" fill="var(--text-soft)" font-size="11">搜索与判定要点</text>' +
      '<text x="466" y="86" fill="var(--text-dim)" font-size="10">候选向量：-1、-3 ~ -10</text>' +
      '<text x="466" y="102" fill="var(--text-dim)" font-size="10">比较 9 像素 SAD，取最小者</text>' +
      '<text x="466" y="118" fill="var(--text-dim)" font-size="10">判定只用上一行信息，</text>' +
      '<text x="466" y="132" fill="var(--text-dim)" font-size="10">提前一行就能算完</text>' +
      /* 底部 */
      '<line x1="16" y1="186" x2="624" y2="186" stroke="var(--border)"/>' +
      '<text x="16" y="206" fill="var(--text-soft)" font-size="11">只有连续 3 个组都选中同一向量（bpCount ≥ 3）、且最近没出现强边缘时，才真正启用 BP；</text>' +
      '<text x="16" y="224" fill="var(--text-dim)" font-size="11">切片第一行没有上一行可用，因此 BP 在第一行不生效；每行末尾不满 3 像素的组也不会用 BP。</text>' +
      '</svg>',

    /* ICH：32 项移位寄存器 + 后 7 项指向上一行 */
    dscIch:
      '<svg class="bl-fig-svg" viewBox="0 0 640 250" role="img" aria-label="索引色历史的 32 项移位寄存器结构">' +
      '<rect x="0" y="0" width="640" height="250" fill="var(--surface-2)"/>' +
      '<text x="16" y="26" fill="var(--text-soft)" font-size="12" font-weight="600">索引色历史（ICH）：32 项移位寄存器</text>' +
      /* MRU / LRU 标签 */
      '<text x="18" y="58" fill="var(--accent)" font-size="10.5">MRU 最近使用</text>' +
      '<text x="18" y="160" fill="var(--text-dim)" font-size="10.5">LRU 最久未用</text>' +
      /* 寄存器单元 */
      '<g>' +
      '<rect x="126" y="46" width="150" height="20" rx="4" fill="var(--accent-soft)" stroke="var(--accent)"/>' +
      '<rect x="126" y="70" width="150" height="20" rx="4" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<rect x="126" y="94" width="150" height="20" rx="4" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<rect x="126" y="118" width="150" height="20" rx="4" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<rect x="126" y="142" width="150" height="20" rx="4" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<rect x="126" y="166" width="150" height="20" rx="4" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '</g>' +
      '<text x="201" y="60" fill="var(--accent)" font-size="10.5" text-anchor="middle">index 0 · MOVED TO TOP</text>' +
      '<text x="201" y="84" fill="var(--text-dim)" font-size="10.5" text-anchor="middle">index 1</text>' +
      '<text x="201" y="108" fill="var(--text-dim)" font-size="10.5" text-anchor="middle">index 2</text>' +
      '<text x="201" y="132" fill="var(--text-dim)" font-size="10.5" text-anchor="middle">…</text>' +
      '<text x="201" y="156" fill="var(--text-dim)" font-size="10.5" text-anchor="middle">index 24</text>' +
      '<text x="201" y="180" fill="var(--text-dim)" font-size="10.5" text-anchor="middle">index 25 起不再参与移位</text>' +
      /* 新条目进入 / 旧条目掉落 */
      '<line x1="60" y1="56" x2="120" y2="56" stroke="var(--accent)" stroke-width="2"/>' +
      '<polygon points="120,52 128,56 120,60" fill="var(--accent)"/>' +
      '<text x="60" y="46" fill="var(--accent)" font-size="10" text-anchor="end">新像素值</text>' +
      '<line x1="280" y1="176" x2="322" y2="176" stroke="var(--text-dim)" stroke-width="2" stroke-dasharray="4 3"/>' +
      '<text x="328" y="180" fill="var(--text-dim)" font-size="10">挤出</text>' +
      /* 右侧：上一行索引 */
      '<rect x="420" y="46" width="204" height="120" rx="8" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="434" y="68" fill="var(--text-soft)" font-size="11">非首行的特殊约定</text>' +
      '<text x="434" y="88" fill="var(--text-dim)" font-size="10">index 25 ~ 31 这 7 个索引</text>' +
      '<text x="434" y="104" fill="var(--text-dim)" font-size="10">不指向历史表，而直接指向</text>' +
      '<text x="434" y="120" fill="var(--text-dim)" font-size="10">上一行的重建像素，</text>' +
      '<text x="434" y="136" fill="var(--text-dim)" font-size="10">对渐变、抗锯齿文字很划算。</text>' +
      '<text x="434" y="156" fill="var(--text-dim)" font-size="10">首行（4:2:0 为前两行）没有上一行，</text>' +
      /* 底部 */
      '<line x1="16" y1="196" x2="624" y2="196" stroke="var(--border)"/>' +
      '<text x="16" y="216" fill="var(--text-soft)" font-size="11">ICH 模式用 5 bit 定长索引直接表示一个像素，' +
      '对 UI、文本、大色块这类内容几乎不花代价；</text>' +
      '<text x="16" y="234" fill="var(--text-dim)" font-size="11">' +
      '索引被引用后该项会移到表顶（MRU），其余整体下移，表底被挤出——编解码两端严格同步。</text>' +
      '</svg>',

    /* 速率控制：缓冲模型 → 线性变换 → 长项 → 短项 QP */
    dscRc:
      '<svg class="bl-fig-svg" viewBox="0 0 640 258" role="img" aria-label="速率控制算法的四个环节">' +
      '<rect x="0" y="0" width="640" height="258" fill="var(--surface-2)"/>' +
      '<text x="16" y="26" fill="var(--text-soft)" font-size="12" font-weight="600">速率控制：把变长的组比特数收敛成恒定码率</text>' +
      /* 四个方框 */
      '<rect x="14" y="60" width="138" height="66" rx="7" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="83" y="82" fill="var(--text-soft)" font-size="11" text-anchor="middle">① 缓冲追踪</text>' +
      '<text x="83" y="99" fill="var(--text-dim)" font-size="10" text-anchor="middle">累加实际比特、</text>' +
      '<text x="83" y="114" fill="var(--text-dim)" font-size="10" text-anchor="middle">扣除标称 bits/组</text>' +
      '<rect x="168" y="60" width="138" height="66" rx="7" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="237" y="82" fill="var(--text-soft)" font-size="11" text-anchor="middle">② 线性变换</text>' +
      '<text x="237" y="99" fill="var(--text-dim)" font-size="10" text-anchor="middle">偏移 + 缩放，</text>' +
      '<text x="237" y="114" fill="var(--text-dim)" font-size="10" text-anchor="middle">给首行额外预算</text>' +
      '<rect x="322" y="60" width="138" height="66" rx="7" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="391" y="82" fill="var(--text-soft)" font-size="11" text-anchor="middle">③ 长项参数</text>' +
      '<text x="391" y="99" fill="var(--text-dim)" font-size="10" text-anchor="middle">按缓冲水位选区间，</text>' +
      '<text x="391" y="114" fill="var(--text-dim)" font-size="10" text-anchor="middle">给出 QP 上下限</text>' +
      '<rect x="476" y="60" width="150" height="66" rx="7" fill="var(--surface)" stroke="var(--accent)"/>' +
      '<text x="551" y="82" fill="var(--accent)" font-size="11" text-anchor="middle">④ 短项 QP 调整</text>' +
      '<text x="551" y="99" fill="var(--text-dim)" font-size="10" text-anchor="middle">逐组微调，</text>' +
      '<text x="551" y="114" fill="var(--text-dim)" font-size="10" text-anchor="middle">输出 masterQp</text>' +
      '<line x1="152" y1="93" x2="164" y2="93" stroke="var(--accent)" stroke-width="2"/>' +
      '<polygon points="164,89 172,93 164,97" fill="var(--accent)"/>' +
      '<line x1="306" y1="93" x2="318" y2="93" stroke="var(--accent)" stroke-width="2"/>' +
      '<polygon points="318,89 326,93 318,97" fill="var(--accent)"/>' +
      '<line x1="460" y1="93" x2="472" y2="93" stroke="var(--accent)" stroke-width="2"/>' +
      '<polygon points="472,89 480,93 472,97" fill="var(--accent)"/>' +
      /* 水位示意 */
      '<text x="16" y="164" fill="var(--text-dim)" font-size="10.5">RC 模型水位（同一套算法在编、解码两端各跑一遍）</text>' +
      '<rect x="16" y="176" width="420" height="26" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<rect x="16" y="176" width="196" height="26" rx="5" fill="var(--accent-soft)" stroke="var(--accent)"/>' +
      '<text x="114" y="194" fill="var(--accent)" font-size="10.5" text-anchor="middle">bufferFullness（实际占用）</text>' +
      '<text x="320" y="194" fill="var(--text-dim)" font-size="10.5" text-anchor="middle">目标：既不溢出也不欠载</text>' +
      '<text x="16" y="224" fill="var(--text-soft)" font-size="11">水位偏高 → 提高 QP 少花比特；水位偏低 → 降低 QP 多花比特。' +
      '这个决定不写进码流。</text>' +
      '<text x="16" y="242" fill="var(--text-dim)" font-size="11">' +
      '唯一需要显式通知解码端的是「平坦度」：遇到突然变平坦的区域，编码器可以立刻把 QP 压下去。</text>' +
      '</svg>',

    /* 切片与切片复用：每行 1/2/4 个切片，chunk 交织输出 */
    dscSlices:
      '<svg class="bl-fig-svg" viewBox="0 0 640 262" role="img" aria-label="切线划分与每行多切片的复用顺序">' +
      '<rect x="0" y="0" width="640" height="262" fill="var(--surface-2)"/>' +
      '<text x="16" y="26" fill="var(--text-soft)" font-size="12" font-weight="600">切片划分与切片复用</text>' +
      /* 1 slice/line */
      '<text x="18" y="58" fill="var(--text-dim)" font-size="10.5">每行 1 个切片</text>' +
      '<rect x="18" y="66" width="176" height="54" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="106" y="98" fill="var(--text-soft)" font-size="11" text-anchor="middle">slice 0（整行宽）</text>' +
      /* 2 slices/line */
      '<text x="18" y="150" fill="var(--text-dim)" font-size="10.5">每行 2 个切片</text>' +
      '<rect x="18" y="158" width="88" height="54" rx="5" fill="var(--accent-soft)" stroke="var(--accent)"/>' +
      '<text x="62" y="190" fill="var(--accent)" font-size="11" text-anchor="middle">L</text>' +
      '<rect x="106" y="158" width="88" height="54" rx="5" fill="var(--warn-soft)" stroke="var(--warn)"/>' +
      '<text x="150" y="190" fill="var(--warn)" font-size="11" text-anchor="middle">R</text>' +
      /* chunk 序列 */
      '<text x="232" y="58" fill="var(--text-dim)" font-size="10.5">比特流里的块（chunk）顺序</text>' +
      '<g>' +
      '<rect x="232" y="66" width="46" height="30" rx="4" fill="var(--accent-soft)" stroke="var(--accent)"/>' +
      '<text x="255" y="86" fill="var(--accent)" font-size="10" text-anchor="middle">L1</text>' +
      '<rect x="282" y="66" width="46" height="30" rx="4" fill="var(--warn-soft)" stroke="var(--warn)"/>' +
      '<text x="305" y="86" fill="var(--warn)" font-size="10" text-anchor="middle">R1</text>' +
      '<rect x="332" y="66" width="46" height="30" rx="4" fill="var(--accent-soft)" stroke="var(--accent)"/>' +
      '<text x="355" y="86" fill="var(--accent)" font-size="10" text-anchor="middle">L2</text>' +
      '<rect x="382" y="66" width="46" height="30" rx="4" fill="var(--warn-soft)" stroke="var(--warn)"/>' +
      '<text x="405" y="86" fill="var(--warn)" font-size="10" text-anchor="middle">R2</text>' +
      '<rect x="432" y="66" width="46" height="30" rx="4" fill="var(--accent-soft)" stroke="var(--accent)"/>' +
      '<text x="455" y="86" fill="var(--accent)" font-size="10" text-anchor="middle">L3</text>' +
      '<rect x="482" y="66" width="46" height="30" rx="4" fill="var(--warn-soft)" stroke="var(--warn)"/>' +
      '<text x="505" y="86" fill="var(--warn)" font-size="10" text-anchor="middle">R3</text>' +
      '<text x="546" y="86" fill="var(--text-dim)" font-size="11">…</text>' +
      '</g>' +
      '<text x="232" y="116" fill="var(--text-dim)" font-size="10.5">L=左切片的一行，R=右切片的一行；同一次迭代覆盖一行上的所有切片，然后进入下一行。</text>' +
      /* 尺寸说明 */
      '<line x1="18" y1="228" x2="622" y2="228" stroke="var(--border)"/>' +
      '<text x="18" y="246" fill="var(--text-soft)" font-size="11">' +
      '每个 chunk 定长：ceil(bits_per_pixel × slice_width ÷ 8) 字节（Native 4:2:2 / 4:2:0 用 slice_width ÷ 2）。</text>' +
      '<text x="232" y="150" fill="var(--text-dim)" font-size="10.5">切片行高一样时总码率不变，' +
      '但切片越高压缩越好（首行额外比特摊薄），代价是局部更新粒度更粗。</text>' +
      '</svg>',

    /* Native 4:2:2 / 4:2:0 的容器打包 */
    dscContainer:
      '<svg class="bl-fig-svg" viewBox="0 0 640 236" role="img" aria-label="Native 4:2:2 与 4:2:0 的容器打包方式">' +
      '<rect x="0" y="0" width="640" height="236" fill="var(--surface-2)"/>' +
      '<text x="16" y="26" fill="var(--text-soft)" font-size="12" font-weight="600">Native 4:2:2 / 4:2:0：把子采样样本装进容器</text>' +
      /* 原始 4:2:2 */
      '<text x="18" y="58" fill="var(--text-dim)" font-size="10.5">4:2:2 原图（每行）</text>' +
      '<g>' +
      '<rect x="18" y="66" width="30" height="24" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="33" y="82" fill="var(--text-soft)" font-size="10" text-anchor="middle">Y</text>' +
      '<rect x="48" y="66" width="30" height="24" fill="var(--surface)" stroke="var(--teal)"/>' +
      '<text x="63" y="82" fill="var(--teal)" font-size="10" text-anchor="middle">Cb</text>' +
      '<rect x="78" y="66" width="30" height="24" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="93" y="82" fill="var(--text-soft)" font-size="10" text-anchor="middle">Y</text>' +
      '<rect x="108" y="66" width="30" height="24" fill="var(--surface)" stroke="var(--teal)"/>' +
      '<text x="123" y="82" fill="var(--teal)" font-size="10" text-anchor="middle">Cr</text>' +
      '<rect x="138" y="66" width="30" height="24" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="153" y="82" fill="var(--text-soft)" font-size="10" text-anchor="middle">Y</text>' +
      '<rect x="168" y="66" width="30" height="24" fill="var(--surface)" stroke="var(--teal)"/>' +
      '<text x="183" y="82" fill="var(--teal)" font-size="10" text-anchor="middle">Cb</text>' +
      '</g>' +
      /* 容器 */
      '<path d="M214 78 L252 78" stroke="var(--accent)" stroke-width="2"/>' +
      '<polygon points="252,74 260,78 252,82" fill="var(--accent)"/>' +
      '<text x="237" y="70" fill="var(--accent)" font-size="10" text-anchor="middle">打包</text>' +
      '<text x="272" y="58" fill="var(--text-dim)" font-size="10.5">4:4:4:4 容器（半宽）</text>' +
      '<g>' +
      '<rect x="272" y="66" width="30" height="24" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="287" y="82" fill="var(--text-soft)" font-size="10" text-anchor="middle">Y0</text>' +
      '<rect x="302" y="66" width="30" height="24" fill="var(--surface)" stroke="var(--teal)"/>' +
      '<text x="317" y="82" fill="var(--teal)" font-size="10" text-anchor="middle">Cb</text>' +
      '<rect x="332" y="66" width="30" height="24" fill="var(--surface)" stroke="var(--teal)"/>' +
      '<text x="347" y="82" fill="var(--teal)" font-size="10" text-anchor="middle">Cr</text>' +
      '<rect x="362" y="66" width="30" height="24" fill="var(--warn-soft)" stroke="var(--warn)"/>' +
      '<text x="377" y="82" fill="var(--warn)" font-size="10" text-anchor="middle">Y1</text>' +
      '</g>' +
      '<text x="404" y="82" fill="var(--text-dim)" font-size="10.5">= 1 个容器像素</text>' +
      /* 说明 */
      '<rect x="18" y="112" width="196" height="80" rx="8" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="32" y="134" fill="var(--text-soft)" font-size="11">4:2:2 容器</text>' +
      '<text x="32" y="153" fill="var(--text-dim)" font-size="10">4 个分量 → 4 条子流</text>' +
      '<text x="32" y="169" fill="var(--text-dim)" font-size="10">偶数位 Y 与奇数位 Y</text>' +
      '<text x="32" y="184" fill="var(--text-dim)" font-size="10">被当作两个独立分量</text>' +
      '<rect x="228" y="112" width="196" height="80" rx="8" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="242" y="134" fill="var(--text-soft)" font-size="11">4:2:0 容器</text>' +
      '<text x="242" y="153" fill="var(--text-dim)" font-size="10">3 个分量 → 3 条子流</text>' +
      '<text x="242" y="169" fill="var(--text-dim)" font-size="10">偶数行编 Cb、奇数行编 Cr</text>' +
      '<text x="242" y="184" fill="var(--text-dim)" font-size="10">BP 只作用于亮度</text>' +
      '<rect x="438" y="112" width="188" height="80" rx="8" fill="var(--accent-soft)" stroke="var(--accent)"/>' +
      '<text x="452" y="134" fill="var(--accent)" font-size="11">收益</text>' +
      '<text x="452" y="153" fill="var(--text-soft)" font-size="10">每个容器像素对应 2 个实际像素，</text>' +
      '<text x="452" y="169" fill="var(--text-soft)" font-size="10">编解码吞吐约翻一倍；</text>' +
      '<text x="452" y="184" fill="var(--text-soft)" font-size="10">同样的链路码率下画质更好。</text>' +
      '<text x="18" y="222" fill="var(--text-dim)" font-size="11">' +
      '注意：这两个模式下 bits_per_pixel 参数要按「目标 bpp 的两倍」填写，因为一个容器像素承载两个像素。' +
      '</text>' +
      '</svg>'
  };

  Object.keys(FIGURES).forEach(function (k) { D.figures[k] = FIGURES[k]; });

  /* ------------------------------------------------------------------ 术语 */
  var GLOSSARY = [
    ['bpp (bits per pixel)', '每像素比特数', '压缩后平均每像素时间传送的比特数，可取小数（PPS 里以 1/16 bit 为步进）'],
    ['bpc (bits per component)', '每分量比特数', '源图像 R/G/B 或 Y/Cb/Cr 每个分量的位数：8 / 10 / 12 / 14 / 16'],
    ['Slice', '切片', '图像划分出的等尺寸矩形编码单元，独立解码，每行可有 1 个或多个'],
    ['Group', '组', '光栅扫描顺序下连续的 3 个像素，是 DSC 编解码的基本单位'],
    ['Container', '容器', '把 4:2:2 / 4:2:0 样本重新打包成的虚拟半宽 4:4:4:4 / 4:4:4 图像'],
    ['MMAP', '改进中值自适应预测', '默认预测方式；用左侧与上一行的重建样点做中值自适应预测，可 3 样点／时钟并行'],
    ['BP (Block Prediction)', '块预测', '用同一行左侧已重建样点预测，向量取 -3 ~ -10，解码器可不实现'],
    ['MPP (Midpoint Prediction)', '中点预测', '用分量取值区间中点附近的值预测，用来给残差封顶'],
    ['P-mode / ICH-mode', '预测模式／索引色历史模式', '每个组在这两种编码模式中二选一'],
    ['ICH (Indexed Color History)', '索引色历史', '32 项「最近用过的像素值」表，用 5 bit 索引直接表示像素'],
    ['DSU-VLC', '差值尺寸单位变长编码', 'DSC 的熵编码方案：前缀表示残差位宽的变化，后缀是残差本身'],
    ['SSM (Substream Multiplexing)', '子流复用', '把 Y / Co / Cg（Native 4:2:2 另有 Y2）子流按定长 mux word 交织成切片'],
    ['mux word', '复用字', '子流复用的定长单位：8 / 10bpc 为 48 bit，12 / 14 / 16bpc 为 64 bit'],
    ['Balance FIFO', '平衡缓冲', '编码端为对齐复用顺序设置的缓冲，会引入固定的像素时间延迟'],
    ['chunk', '块', '切片复用中「某切片某一行」对应的字节块，CBR 下长度固定'],
    ['PPS (Picture Parameter Set)', '图像参数集', '128 字节参数块，编解码两端必须完全一致，需可靠传输'],
    ['HRD', '假想参考解码器', '理想化的速率缓冲模型，用来保证码流既不溢出也不欠载'],
    ['rc_model_size', '速率控制模型大小', 'RC 缓冲模型的比特数，直接决定 HRD 缓冲规模与端到端延迟'],
    ['initial_xmit_delay', '初始发送延迟', '编码器开始发送前等待的像素时间，同时决定切片末尾的填充上限'],
    ['initial_dec_delay', '初始解码延迟', '解码器开始解码前先积累数据的像素时间'],
    ['CBR / VBR', '恒定码率／可变码率', 'CBR 每个像素时间发固定比特；VBR 允许瞬时发 0 bit'],
    ['native_422 / native_420', '原生 4:2:2 / 4:2:0', 'DSC 1.2 起支持直接把色度子采样视频打包进容器编码'],
    ['simple_422', '简单 4:2:2', '把 4:2:2 插值成 4:4:4 再编码、解码后丢回样点的兼容做法'],
    ['linebuf_depth', '行缓存位深', '上一行缓存的实际位深，可低于分量位深以降低硬件成本'],
    ['QP / qLevel', '量化参数／量化级', 'QP 取 0–31，按位深映射为量化右移位数 qLevel，二者由速率控制逐组决定']
  ];

  /* ------------------------------------------------------------------ 文章 */
  D.posts.push({
    id: 'dsc',
    title: '显示流压缩（DSC）技术解析',
    titleEn: 'VESA Display Stream Compression — Deep Dive',
    subtitle: '从色彩变换、三种预测、索引色历史、DSU-VLC 熵编码，到速率控制、子流复用与切片划分：' +
      '把「视觉无损」这条链路拆开看',
    category: '显示接口',
    tags: ['DSC', '视觉无损压缩', 'DP / eDP', 'MMAP / BP', '速率控制', '切片复用'],
    source: {
      name: 'VESA',
      label: 'Display Stream Compression (DSC) Standard v1.2a（2017-01-18）',
      url: 'https://vesa.org/vesa-stds/',
      note: '本篇是基于规范正文的学习性中文原理整理，非官方译文，也未转载规范原表格与插图；' +
        '数据以 VESA DSC v1.2a 为准，实现细节请以规范原文与官方 C 参考模型为最终依据。'
    },
    license: 'VESA DSC 标准原文版权归 Video Electronics Standards Association 所有；' +
      '本页为学习用途的中文原理整理，只复述机制与参数含义，未转载规范原表格与插图，' +
      '示意图均按规范描述重绘。',
    summary: 'DSC 是 VESA 定义的显示流压缩标准，目标是在显示链路上做「视觉无损」的实时压缩，' +
      '而且必须便宜到能塞进时序控制器和 SoC 里。它的设计很有意思：整个算法是**编解码对称**的——' +
      '预测方式不写进码流、量化参数由两端各跑一遍速率控制算出来，解码器只需要熵解码、预测、重建三步。' +
      '本篇按规范正文的顺序，把色彩空间转换、MMAP/BP/MPP 三种预测、索引色历史、DSU-VLC、' +
      '速率控制与缓冲模型、子流复用、切片划分以及 v1.2/1.2a 新增的原生 4:2:2 与 4:2:0 逐一讲清。',
    glossary: GLOSSARY,
    chapters: [
      /* ======================================================== 01 为什么需要 */
      {
        id: 'why',
        num: '01',
        title: '为什么需要显示流压缩',
        titleEn: 'Why Display Stream Compression',
        lead: '像素的增长一直快过链路的增长。当 4K、8K 与高刷新率撞上固定的 lane 数与符号率时，' +
          '要么加线、要么压像素——DSC 就是 VESA 给出的「压像素」答案：' +
          '==视觉无损、实时、且必须便宜到能塞进时序控制器里==。',
        sections: [
          {
            id: 'pressure',
            title: '链路带宽的算术',
            titleEn: 'The Bandwidth Arithmetic',
            blocks: [
              { t: 'p', v: '一条显示链路能承载的比特数是有限的：lane 数 × 每 lane 符号率 × 编码效率。' +
                '而像素需要的比特数是 **水平像素 × 垂直像素 × 每像素比特数 × 刷新率**。' +
                '两个数都在涨，但后者涨得更快——分辨率每翻一倍，像素数翻四倍；' +
                '刷新率从 60 Hz 到 144 Hz，再乘 2.4；色深从 8 bit 到 10 bit，又乘 1.25。' },
              { t: 'p', v: '把 4K（3840×2160）@ 60 Hz、8 bit 的 4:4:4 数据摊开算：' +
                '每帧 3840 × 2160 × 24 bit ≈ 199 Mbit，乘 60 Hz ≈ **11.9 Gbit/s**（还没算消隐期）。' +
                '一旦把刷新率提到 120 Hz、色深提到 10 bit，需求立刻涨到约 **37 Gbit/s** 量级。' },
              { t: 'p', v: '这就是 DSC 的出发点：与其继续加 lane、提高符号率（成本、功耗、EMI 都跟着涨），' +
                '不如在源端把像素压掉一部分再送出去。' +
                '按 3:1 的压缩比算，链路压力直接降到原来的三分之一。' },
              { t: 'callout', kind: 'key', title: '为什么不是「无损」',
                v: 'DSC 的目标是 **visually lossless（视觉无损）**，不是数学无损。' +
                  '它在设计上允许存在不可察觉的误差，换来的是：恒定的码率、确定性的缓冲模型、' +
                  '以及一块解码器就能用几个门电路搞定的低复杂度算法。' }
            ]
          },
          {
            id: 'goals',
            title: '规范写下来的需求',
            titleEn: 'Requirements Stated by the Standard',
            blocks: [
              { t: 'p', v: '规范第 2 节用一张清单把需求固定了下来，这张清单几乎解释了后面所有算法设计：' },
              { t: 'list', items: [
                '支持电视、显示器与移动面板；目标是在给定链路下支持更高的分辨率，或者用更少的 lane、更低的速率',
                '输入格式覆盖 RGB 与 YCbCr，采样格式覆盖 4:4:4、4:2:2、4:2:0',
                '每分量位数 8 / 10 / 12 / 14 / 16 bpc',
                '可编程的压缩码率：8 bpp 以上（4:2:0 图像为 6 bpp 以上）',
                '在指定的目标码率下，对大量静态图片与运动视频都达到视觉无损',
                '实时编码与解码',
                '低成本',
                '==支持切片（slice）==：用于压缩帧缓冲的局部更新，并把误码影响范围限制在局部'
              ] },
              { t: 'p', v: '规范对目标的表述是：让「显示链路上的视觉无损视频压缩」能够以**低成本硬件**实现。' +
                '这句话决定了 DSC 的算法气质——' +
                '没有运动补偿、没有帧间参考、没有复杂的自适应算术编码，' +
                '整个算法是逐行、逐组、可以流水线化的。' },
              { t: 'callout', kind: 'info', title: '三段式结构',
                v: '规范把技术内容切成三块：第 3 节讲**算法原理**（信息性）、第 4 节讲**语法**（规范性）、' +
                  '第 6 / 7 节讲**编码过程与解码过程**（规范性）。' +
                  '若规范正文与官方 C 参考模型有出入，==以 C 模型为准==。' }
            ]
          },
          {
            id: 'where',
            title: 'DSC 在系统中的位置',
            titleEn: 'Where DSC Sits in the System',
            blocks: [
              { t: 'fig', id: 'dscLink', caption: 'DSC 夹在两个器件之间：源设备里的编码器、宿设备里的解码器，中间是链路（传输层）。' },
              { t: 'p', v: '未压缩视频以**逐行顺序**实时进入编码器，编码器压出比特流、暂存在速率缓冲里；' +
                '比特流经传输层送到解码器，解码器从自己的速率缓冲取出比特、还原出逐行像素送给面板。' },
              { t: 'p', v: '这里有两个容易忽略的边界：' },
              { t: 'dl', items: [
                ['DSC 不定义传输层', '规范只规定压缩比特流的语法与语义、编码过程与解码过程。' +
                  '「怎么把比特流送过去」由应用规范负责，例如 DisplayPort、eDP、MIPI DSI、HDMI。'],
                ['PPS 不算进比特预算', '图像参数集（PPS）必须在图像数据之前到达并被应用，' +
                  '而且它**不属于**任何图像或切片的比特预算——' +
                  '传输层要用自己的机制（例如 ECC）保证它可靠送达。']
              ] },
              { t: 'p', v: '还有一条隐含约束：==输出像素的格式必须与输入一致==。' +
                'DSC 是「中间那段压缩」，不会改变色彩格式、采样格式或位深。' }
            ]
          },
          {
            id: 'versions',
            title: '版本演进与兼容性',
            titleEn: 'Versions and Compatibility',
            blocks: [
              { t: 'p', v: 'DSC 至今有过 1.0 / 1.1 / 1.2 / 1.2a 几个版本。' +
                '**1.0 已废弃**；1.1 是规模最大的一次落地（DP 1.4、eDP 1.4 时代）；' +
                '1.2 增加了新的编码模式；1.2a 是一次修正版。' },
              { t: 'table', head: ['模式', 'DSC v1.1', 'DSC v1.2', 'DSC v1.2a'], rows: [
                ['4:4:4 RGB / YCbCr，8 / 10 / 12 bpc', '支持', '支持', '支持'],
                ['4:2:2 YCbCr，8 / 10 / 12 bpc', '仅 Simple 模式', 'Native + Simple', 'Native + Simple'],
                ['4:2:0 YCbCr，8 / 10 / 12 bpc', '不支持', '支持（Native）', '支持（Native）'],
                ['任意模式，14 / 16 bpc', '不支持', '支持', '支持']
              ] },
              { t: 'p', v: '版本切换靠 PPS 里 4 bit 的 `dsc_version_minor`：' +
                '填 `0x1` 表示该比特流按 v1.1 生成，填 `0x2` 表示按 v1.2 / v1.2a 生成。' +
                '有意思的是 **v1.2 编码器在写成 0x1 时必须产出与 v1.1 编码器完全一致的码流**，' +
                '这样新旧解码器都能解。' },
              { t: 'p', v: '规范对传输层还提了一条硬性要求：如果一个链路既要能走 v1.1 码流、' +
                '又要能走 v1.2 及以后的码流，那么 ==所有编码器都必须能产生 v1.1 码流、' +
                '所有解码器都必须能解 v1.1 码流==。反过来，如果某个链路从设计上就不支持 v1.1，这条限制不适用。' },
              { t: 'callout', kind: 'warn', title: 'v1.2 的 4:2:0 有过一次返工',
                v: '规范明确写道：v1.2 的 Native 4:2:0 模式定义存在问题，' +
                  '因此先以勘误（errata）形式把该模式**废弃**，再由 **v1.2a 修正**后重新完整支持。' +
                  '除 4:2:0 之外，v1.2 的其他模式与 v1.2a 完全兼容。' }
            ]
          }
        ]
      },

      /* ======================================================== 02 整体架构 */
      {
        id: 'arch',
        num: '02',
        title: '整体架构：四层语法与两种复用',
        titleEn: 'Architecture: Layers and Multiplexing',
        lead: 'DSC 的比特流看起来是一串没有明显结构的比特，但它其实分四层、' +
          '中间夹着两次复用。理解了「子流 → 切片 → 图像」这条封装链，' +
          '后面所有算法才知道自己工作在哪个尺度上。',
        sections: [
          {
            id: 'layers',
            title: '四层语法',
            titleEn: 'Four Syntax Layers',
            blocks: [
              { t: 'fig', id: 'dscLayers', caption: '子流 → 切片（子流复用）→ 图像（切片复用），PPS 独立于比特预算之外。' },
              { t: 'p', v: '自下而上：' },
              { t: 'dl', items: [
                ['子流层（Substream Layer）', '每个分量一条子流。4:4:4 是三条（Y / Co / Cg），' +
                  'Native 4:2:2 是四条（多一条 Y2）。子流里装的是 DSU-VLC 编码结果。'],
                ['切片层（Slice Layer）', '三条或四条子流经**子流复用（SSM）**交织成一条切片比特流。'],
                ['图像层（Picture Layer）', '一张图像由整数个切片组成；每行如果有多个切片，' +
                  '还要先做一次**切片复用**。'],
                ['图像参数集（PPS）', '128 字节的参数块，可选地出现在图像之前。' +
                  '它不参与压缩比特预算，但对解码是必需的。']
              ] },
              { t: 'p', v: '这里要建立一个重要观念：==比特流里的比特顺序，是复用规则算出来的，不是编码顺序==。' +
                '子流复用用定长的「复用字」把几条子流交织在一起，解码器必须按同一套规则把字拆回去。' },
              { t: 'p', v: '另外，**图像（picture）**在规范里的定义是「一个帧或一个场」——' +
                '逐行视频对应帧，隔行视频对应场。' }
            ]
          },
          {
            id: 'group',
            title: '组：3 个像素',
            titleEn: 'Group: Three Pixels',
            blocks: [
              { t: 'p', v: '切片内部按光栅扫描顺序切成**组（group）**，一个组是连续的 **3 个像素**。' +
                '组是 DSC 里最核心的逻辑单位：预测、量化、熵编码、索引色历史、速率控制，' +
                '全部以组为节奏推进。' },
              { t: 'p', v: '每个组被编码成 **3 个或 4 个 DSU-VLC 单元（unit）**，' +
                '一个单元对应「某个分量在组内的 3 个样本」。' +
                '单元是熵编码的最小结构，它有两部分：**前缀（prefix）**与**残差（suffix）**。' },
              { t: 'callout', kind: 'info', title: '组在码流里并不存在',
                v: '组是编码和解码过程使用的逻辑构造。由于子流复用的存在，' +
                  '==比特流里没有任何标记表示「组的边界」==——' +
                  '解码器是靠自己按同样的节奏消费比特，才重新对齐出组的。' },
              { t: 'p', v: '还有一个容易误解的点：在 Native 4:2:2 / 4:2:0 模式下，' +
                '一个组仍然由 3 个「容器像素」构成，但它实际覆盖了 **6 个真实像素**。' +
                '这也是这两个模式吞吐翻倍的来源。' }
            ]
          },
          {
            id: 'slice',
            title: '切片：局部更新的抓手',
            titleEn: 'Slices and Partial Update',
            blocks: [
              { t: 'p', v: '一张图像被切成整数个**连续、不重叠、等尺寸的矩形切片**。' +
                '每条切片独立解码，不参考其他切片。每行可以有 1 个或多个切片。' },
              { t: 'p', v: '切片存在的理由是两条：' },
              { t: 'list', ordered: true, items: [
                '**局部更新**：压缩帧缓冲里可以只覆盖某个或某几个切片，' +
                  '这对应「只刷新屏幕上一小块」的应用（例如部分刷新的移动面板、VR 的重投影区域）。',
                '**限定误码影响范围**：一条切片出错不会污染其他切片。'
              ] },
              { t: 'p', v: '规范给了两个「适合真实系统使用」的示例配置：' },
              { t: 'table', head: ['配置', '宽度', '高度'], rows: [
                ['等分四列', 'slice_width = 图像宽度的 1/4', '108 行'],
                ['整行', 'slice_width = 图像宽度', '108 行']
              ] },
              { t: 'p', v: '为什么是 108 行？因为切片第一节需要额外比特来补偿预测能力不足，' +
                '这部分的摊薄效果随切片变高而变好，但收益递减。规范的原话是：' +
                '==108 行的切片通常明显优于 8 行切片==，而切片变高**没有任何缓冲或资源代价**，' +
                '代价只在于局部更新的粒度更粗、误码影响面更大。' },
              { t: 'p', v: '切片也可以比整屏窄。窄切片的动机通常是局部更新或者并行处理。' +
                '注意：**每行多个切片时，每个切片列有自己的速率缓冲**——' +
                '4 个切片／行就是 4 个速率缓冲；好在由于切片变窄，总缓冲量' +
                '比「4 倍于整行方案」要小，但仍然建议限制每行切片数。' },
              { t: 'callout', kind: 'key', title: '切片与消隐期的配合',
                v: '如果切片整行宽，横向切片的边界天然落在消隐期附近；' +
                  '而每行多切片时，比特在**行内**就被复用交织了，' +
                  '所以解码时序上会看到「一行内的多个块依次到达」的形态。' }
            ]
          },
          {
            id: 'codec',
            title: '编解码流水线',
            titleEn: 'Encoder and Decoder Pipelines',
            blocks: [
              { t: 'fig', id: 'dscPipeline', caption: '编码端：输入缓冲 → 色彩变换 → 预测/量化/重建 → 熵编码 → 子流复用 → 速率缓冲；速率控制贯穿全程。' },
              { t: 'p', v: '规范列出的编码子过程一共七项，解码则是它的严格逆序：' },
              { t: 'table', head: ['#', '编码端', '解码端'], rows: [
                ['1', '色彩空间转换：RGB → 可逆 YCoCg（YCoCg-R）；YCbCr 输入则旁路', '逆变换 YCoCg-R → RGB；YCbCr 输出则旁路'],
                ['2', '三种预测：MMAP / BP / MPP', '同样的三种预测'],
                ['3', '残差量化 + 重建样本', '残差反量化 + 重建样本'],
                ['4', '索引色历史（ICH）', '索引色历史（ICH）'],
                ['5', '熵编码：DSU-VLC', '熵解码：DSU-VLC'],
                ['6', '速率控制（RC）', '速率控制（RC）'],
                ['7', '子流复用', '子流解复用']
              ] },
              { t: 'p', v: '注意第 2 项和第 6 项：**编解码两端跑的是完全相同的算法**。' +
                '预测方式的选择不写进码流，速率控制算出的 QP 也不写进码流——' +
                '两端各自算一遍，结果必然一致。这是 DSC 省比特的关键手段。' },
              { t: 'p', v: '还有一个工程上很关键的数字：算法是按 **3 像素／时钟的解码**' +
                '和 **1 像素／时钟的编码**来优化硬件实现的。' +
                '解码端要出 3 像素／时钟，所以「一组 3 个像素」必须能并行预测——' +
                '这正是 MMAP 存在的理由（第 4 章会展开）。' },
              { t: 'p', v: '规范同时还点了几个提升吞吐的路子：原生 4:2:0 / 4:2:2 模式可以把吞吐再翻一倍；' +
                '增加每行切片数并让多个解码实例并行，也是常见做法。' }
            ]
          }
        ]
      },

      /* ======================================================== 03 色彩变换 */
      {
        id: 'csc',
        num: '03',
        title: '色彩空间转换与行存储',
        titleEn: 'Color Space Conversion and Line Storage',
        lead: '压缩的第一步是**去相关**：把 R、G、B 三个高度相似的通道，' +
          '换成「亮度 + 两个差值」的表示。DSC 选的是可逆的 YCoCg-R——' +
          '它只有加减和移位，硬件上几乎不要钱。',
        sections: [
          {
            id: 'why-csc',
            title: '为什么必须先变换',
            titleEn: 'Why Convert at All',
            blocks: [
              { t: 'p', v: '自然图像里 R、G、B 三个通道的空间结构高度一致，' +
                '逐通道独立预测会重复付出同样的比特代价。' +
                '换成 Y（亮度）与 Co / Cg（色差）后，色度通道的动态范围与相关性都下降，' +
                '预测残差自然更小。' },
              { t: 'p', v: 'DSC 用的是 Malvar 提出的 **YCoCg** 变换的**可逆形式（YCoCg-R）**。' +
                '之所以强调「可逆」，是因为它不引入舍入损失——' +
                '在数学上，变换本身不损失任何信息，所有的有损都来自后面的量化。' },
              { t: 'p', v: '如果输入本来就是 YCbCr，则**不做任何色彩变换**（CSC 旁路），' +
                '直接把 Cb 映射到 Co、Cr 映射到 Cg。此时色度分量位深等于亮度位深。' }
            ]
          },
          {
            id: 'ycocg-r',
            title: 'YCoCg-R 的公式与位宽',
            titleEn: 'The Reversible Transform',
            blocks: [
              { t: 'p', v: '规范给出的编码端正变换（`>>` 是算术右移，等价于 C 里的截断除法）：' },
              { t: 'table', head: ['步骤', '运算'], rows: [
                ['1', 'cscCo = R − B'],
                ['2', 't = B + (cscCo >> 1)'],
                ['3', 'cscCg = G − t'],
                ['4', 'Y = t + (cscCg >> 1)']
              ] },
              { t: 'p', v: '关键在**位宽**：8 / 10 / 12 / 14 bpc 下，`cscCo` 与 `cscCg` 比 Y 多一位动态范围。' +
                '也就是说，==色度分量的位深比亮度多 1 bit==。' },
              { t: 'p', v: '之后两个色度值要被搬到中心：' },
              { t: 'list', items: [
                'Co = cscCo + (1 << bits_per_component)',
                'Cg = cscCg + (1 << bits_per_component)'
              ] },
              { t: 'p', v: '这样做的目的是让色度也落在「以中点为 0」的对称区间里，' +
                '后面中点预测（MPP）与量化才好统一处理。' },
              { t: 'callout', kind: 'key', title: '位深差 1 bit 会一路传下去',
                v: '色度比亮度多 1 bit 这件事，会影响后面的每一个环节：' +
                  '残差的最大位宽、DSU-VLC 的最大长度、QP 到 qLevel 的映射表……' +
                  '所以规范里到处出现 `cpntBitDepth_Y` 与 `cpntBitDepth_C` 两个符号。' }
            ]
          },
          {
            id: 'sixteen',
            title: '16 bpc 的取舍',
            titleEn: 'The 16 bpc Compromise',
            blocks: [
              { t: 'p', v: '16 bpc 是唯一一个会破坏可逆性的情况。' +
                '原因是复用字宽度限制在 64 bit，如果色度再多 1 bit，语法元素就会溢出。' },
              { t: 'p', v: '规范的处理办法是：**把色度分量的最低位舍掉**。' },
              { t: 'list', items: [
                'Co = MIN(0xFFFF, ((cscCo + 1) >> 1) + 0x8000)',
                'Cg = MIN(0xFFFF, ((cscCg + 1) >> 1) + 0x8000)'
              ] },
              { t: 'p', v: '换句话说，==16 bpc 下不存在数学无损的可能==——' +
                '色度的最低位在变换阶段就丢了。' +
                '规范对此的判断是：在绝大多数应用里，这些被舍掉的最低位对观感的影响可以忽略。' },
              { t: 'p', v: '另一个和 16 bpc 相关的调整在熵编码端：' +
                '为了把复用字控制在 64 bit 内，**亮度前缀被限制在最多 13 bit**。' },
              { t: 'callout', kind: 'info', title: '实践含义',
                v: '如果你的链路要做 16 bpc 且要求「绝对无损」，DSC 不是合适的工具。' +
                  '14 bpc 则是可以完全可逆的（数据通路直接按位宽扩展）。' }
            ]
          },
          {
            id: 'native-comps',
            title: '原生模式下的分量划分',
            titleEn: 'Component Mapping in Native Modes',
            blocks: [
              { t: 'p', v: 'Native 4:2:2 与 4:2:0 模式并不「转换」色彩空间，而是把样本**重新打包**成容器，' +
                '并重新定义「什么是分量」：' },
              { t: 'dl', items: [
                ['native_422 开启时', '偶数位亮度样本 = 第 1 分量；Cb = 第 2 分量；' +
                  'Cr = 第 3 分量；奇数位亮度样本 = 第 4 分量。'],
                ['native_420 开启时', '偶数位亮度样本 = 第 1 分量；奇数位亮度样本 = 第 2 分量；' +
                  '色度 = 第 3 分量（**偶数行编 Cb、奇数行编 Cr**）。']
              ] },
              { t: 'p', v: '把「偶数位亮度」和「奇数位亮度」当作两个独立分量，是这两个模式能在容器里保持' +
                '相同数据通路宽度的原因；代价是**预测与尺寸预测都必须把它们分开处理**。' }
            ]
          },
          {
            id: 'linebuf',
            title: '行存储：可以少存几位',
            titleEn: 'Line Storage Depth',
            blocks: [
              { t: 'p', v: 'DSC 需要保存**上一行的重建像素**，供 MMAP 与 ICH 使用。' +
                '缺省情况下，解码器的行缓存按分量全精度存储。' },
              { t: 'p', v: '但规范允许解码器用更小的位深来省成本（行缓存是一整行，位宽乘一行像素数，很占面积）。' +
                '这个位深由 PPS 里的 `linebuf_depth` 传给编码器——' +
                '注意**解码器如何告知编码器这件事，规范本身不定义**，属于实现与协议之外的约定（能力参数）。' },
              { t: 'p', v: '降位深的方式是带舍入的右移再左移：' },
              { t: 'p', v: '`shiftAmount = MAX(0, cpntBitDepth − linebuf_depth)`；' +
                '写入时加 `1 << (shiftAmount − 1)` 再右移并截顶，读回时左移同样位数。' +
                '也就是说，==丢掉的是低位精度，恢复时低位补零==。' },
              { t: 'callout', kind: 'warn', title: '这是有代价的',
                v: '行缓存降位深会轻微影响画质，因为它同时影响 MMAP 的参考像素和 ICH 指向的上一行像素。' +
                  '规范把它定性为「以微小画质代价换实现成本」的选项，并强调编码器必须按解码器的能力设置该参数。' }
            ]
          }
        ]
      },

      /* ======================================================== 04 预测与量化 */
      {
        id: 'predict',
        num: '04',
        title: '预测与量化：P-mode 的三条路线',
        titleEn: 'Prediction and Quantization',
        lead: '一个组要么走**预测模式（P-mode）**，要么走索引色历史模式（ICH-mode）。' +
          'P-mode 里又有三条路——MMAP、块预测（BP）、中点预测（MPP）。' +
          '最有意思的是：==选择哪条路，码流里一个比特都不花==。',
        sections: [
          {
            id: 'mmap',
            title: 'MMAP：改进中值自适应预测',
            titleEn: 'Modified Median-Adaptive Prediction',
            blocks: [
              { t: 'p', v: '中值自适应预测（MAP）本身是个成熟方法（JPEG-LS 里就在用），' +
                '但直接用在中值上会有一个问题：' +
                '它要求逐像素串行推导，==很难在 3 像素／时钟下并行==。' },
              { t: 'p', v: 'DSC 的改进（MMAP）保留了 MAP 的精髓，同时让解码器能**并行预测组内 3 个样本**。' +
                '做法是：预测只用**当前组之外**已重建的样点——' +
                '左边一个 `a`，上一行的 `c / b / d / e`。' },
              { t: 'fig', id: 'dscGroup', caption: '组的定义与 MMAP 邻域：a 在左侧，b/c/d/e 在上一行，f 只是低通滤波的边界填充。' },
              { t: 'p', v: '上一行的参考像素不是直接用的，要先做两步处理：' },
              { t: 'list', ordered: true, items: [
                '**QP 自适应低通**：对上一行施加水平滤波器 `[0.25 0.5 0.25]`，' +
                  '例如 `filtB = (c + 2b + d + 2) >> 2`。切片边界之外用像素复制填充。',
                '**受限混合**：把滤波值与原始值做差，再把差值**限制在 ±QuantDivisor(qLevel)/2** 之内，' +
                  '结果记为 blendB / blendC / blendD / blendE。'
              ] },
              { t: 'p', v: '混合幅度由当前量化级控制——量化越粗，允许的平滑越多。' +
                '这样既滤掉噪声，又不会抹掉真正的细节。' },
              { t: 'p', v: '最后三个像素的预测值：' },
              { t: 'table', head: ['像素', '预测值'], rows: [
                ['P0', 'CLAMP(a + blendB − blendC, MIN(a, blendB), MAX(a, blendB))'],
                ['P1', 'CLAMP(a + blendD − blendC + R0, MIN(a, blendB, blendD), MAX(a, blendB, blendD))'],
                ['P2', 'CLAMP(a + blendE − blendC + R0 + R1, MIN(a, blendB, blendD, blendE), MAX(a, blendB, blendD, blendE))']
              ] },
              { t: 'p', v: '`R0`、`R1` 是组内前两个样本的反量化残差。' +
                '注意 P1 与 P2 已经用上了同组前面像素的残差——' +
                '这正是「并行但有序」的设计：三个像素的预测可以同时算，' +
                '因为残差在预测阶段就是已知的（由熵解码先给出）。' },
              { t: 'p', v: '切片第一行没有上一行可用，预测退化为：`P0 = a`，' +
                '`P1 = CLAMP(a + R0, 0, 满量程)`，`P2 = CLAMP(a + R0 + R1, 0, 满量程)`。' +
                'Native 4:2:0 更特殊：**前两行的色度都不能用上一行**（色度隔行取样）。' },
              { t: 'callout', kind: 'key', title: 'MMAP 是默认选项',
                v: 'MMAP 是三种预测里的默认方式，在绝大多数内容上都有不错的预测效果。' +
                  '即使解码器完全不支持块预测，光靠 MMAP + MPP 也能正常工作。' }
            ]
          },
          {
            id: 'bp',
            title: '块预测（BP）：找上一行最像的一段',
            titleEn: 'Block Prediction',
            blocks: [
              { t: 'p', v: '块预测的思路很直接：**当前像素和同一行左边某个像素很像**，' +
                '那就直接拿它当预测值。这个「往左看多远」就是块预测向量（bpVector）。' },
              { t: 'p', v: '规范把向量范围限定在 **−3 ~ −10**（外加一个 −1 用于判定），' +
                '这样预测值一定落在当前组之外。' },
              { t: 'fig', id: 'dscBp', caption: 'BP 的搜索发生在上一行：把 9 个参考像素与 9 个候选像素比较，取 SAD 最小的向量。' },
              { t: 'p', v: '几个容易踩坑的实现细节：' },
              { t: 'list', items: [
                '**搜索在上一行做，不在当前行做**。当前行的样点一个都不用——' +
                  '这样 BP 决策可以在真正编码之前整整一行时间就算完。',
                '**切片第一行不能用 BP**：没有上一行。',
                '搜索比较 **9 个连续样点**（= 3 个组），候选向量是 −1、−3、−4 … −10。',
                '每个绝对差先做 `MIN(absDiff >> (cpntBitDepth − 7), 0x3F)` 的截断与限幅（6 bit），' +
                  '再做 3×1 部分 SAD，最后三个部分 SAD 相加并截顶到 9 bit。',
                '**平手时选幅度更小的向量**。'
              ] },
              { t: 'p', v: '选出的向量作用于整个组（3 个像素、三个分量共用同一个向量）。' +
                '所以搜索节奏是「每 3 个样点一次」。' },
              { t: 'p', v: '「找出了最佳向量」不等于「就用 BP」。规范要求同时满足三个条件才真正启用：' },
              { t: 'table', head: ['条件', '含义'], rows: [
                ['bpCount ≥ 3', '连续若干个组都选中了同一个非 −1 的向量（−1 表示「更像 MMAP」）'],
                ['lastEdgeCount < 3', '最近没有出现强边缘。强边缘定义为某分量 |当前样点 − 左邻样点| > 32 << (bpc − 8)'],
                ['不是行末的残缺组', '切片宽度不能被 3 整除时，每行最后一组不完整，不允许用 BP']
              ] },
              { t: 'p', v: '这套「投票 + 边缘门限」的机制，是为了避免在内容突变处错误地拉一条长距离参考进来。' },
              { t: 'callout', kind: 'warn', title: 'BP 对解码器是可选的',
                v: '编码器必须支持 BP；但**解码器可以不实现 BP**。' +
                  '此时编码器把 PPS 里的 `block_pred_enable` 清 0，双方就只用 MMAP。' +
                  '如果码流里 `block_pred_enable = 1` 而解码器不支持 BP，那这个码流对该解码器就是无法解码的。' }
            ]
          },
          {
            id: 'mpp',
            title: 'MPP：给残差封顶的兜底方案',
            titleEn: 'Midpoint Prediction',
            blocks: [
              { t: 'p', v: '中点预测（MPP）的预测值接近分量取值范围的中点：' },
              { t: 'p', v: '`P = (1 << (cpntBitDepth − 1)) + (prevRecon & ((1 << qLevel) − 1))`' },
              { t: 'p', v: '第二项的用意很巧妙：把**上一组最右侧重建值的低位**接过来当作随机化，' +
                '避免所有走 MPP 的像素都堆在同一个值上、产生可见的偏置。' +
                '切片第一组时 `prevRecon` 取 0。' },
              { t: 'p', v: 'MPP 什么时候被选中？有两条完全不同的理由：' },
              { t: 'list', ordered: true, items: [
                '**残差太大**：如果某个单元用 MMAP / BP 会产生的最大量化残差 ≥ `cpntBitDepth − qLevel`，' +
                  '就改用 MPP——把残差强行压到刚好这么大的范围里。',
                '**为了避免欠载**：编码器需要保证最低码率时，会主动强制 MPP（`forceMpp`）。' +
                  '因为 MPP 的残差尺寸恒定为 `cpntBitDepth − qLevel`，' +
                  '它天然是「最费比特」的预测方式，正好用来填充。'
              ] },
              { t: 'p', v: '也因为如此，==MPP 的残差尺寸是一个明确信号==：' +
                '解码器看到某个单元的尺寸等于 `cpntBitDepth − qLevel`，就知道了「这个单元用的是 MPP」。' },
              { t: 'p', v: 'MPP 的量化残差还要再做一次检查：超过 `cpntBitDepth − qLevel` 就截到最近的边界值。' +
                'MMAP 与 BP 不需要这项检查。' }
            ]
          },
          {
            id: 'decision',
            title: '预测方法的决策树',
            titleEn: 'How the Method Is Chosen',
            blocks: [
              { t: 'p', v: '因为预测方式不写进码流，编解码两端必须跑**完全一致**的决策流程。顺序是两级：' },
              { t: 'list', ordered: true, items: [
                '先在 **BP 与 MMAP** 之间选（依据是上一行的 9 像素 SAD 与上面那三条门限条件）；' +
                  '如果 `block_pred_enable = 0`，或解码器不支持 BP，则直接选 MMAP。',
                '再在 **上一步的结果与 MPP** 之间选：按每个单元分别判断，' +
                  '残差尺寸触顶的单元改用 MPP。'
              ] },
              { t: 'p', v: '注意第 2 步是**按单元**（也就是按分量）做的，' +
                '所以同一个组的 Y 可能走 MMAP、Co 走 MPP 是完全正常的。' },
              { t: 'callout', kind: 'info', title: 'Native 4:2:0 里的例外',
                v: '在 Native 4:2:0 模式下，==块预测只作用于亮度==，色度只能用 MMAP 或 MPP。' +
                  '原因是 4:2:0 的色度在垂直方向隔行取样，用同一行的参考做块预测没有意义。' }
            ]
          },
          {
            id: 'quant',
            title: '量化、反量化与重建',
            titleEn: 'Quantization and Reconstruction',
            blocks: [
              { t: 'p', v: '有预测值之后，残差就是输入与预测之差：`E = x − Px`。' },
              { t: 'p', v: '量化用的是**除以 2 的幂并截断**，舍入偏置取「除数的一半减一」：' },
              { t: 'table', head: ['情况', '运算'], rows: [
                ['E < 0', 'QE = −((ROUND − E) >> qLevel)'],
                ['E ≥ 0', 'QE = (E + ROUND) >> qLevel'],
                ['ROUND', '(qLevel > 0) ? ((1 << qLevel) / 2 − 1) : 0']
              ] },
              { t: 'p', v: '`qLevel` 就是量化级（一个右移位数），由速率控制逐组给出，' +
                '而且**亮度和色度可以不同**。反量化则是一次左移。' },
              { t: 'p', v: '最后是重建：把反量化后的残差加回预测值，得到重建样本。' },
              { t: 'callout', kind: 'key', title: '为什么编码器要做重建',
                v: '因为**编解码必须用同一套参考像素**。' +
                  '编码器如果不做重建，它手里的「上一行」就是未量化的原图，' +
                  '而解码器手里的上一行是量化后又恢复的——两边会逐渐漂移，最终完全对不上。' +
                  '所以编码器内部必然包含一个「本地解码器」。' },
              { t: 'p', v: '这个「本地解码器」也解释了为什么 DSC 的编码器比解码器复杂得多：' +
                '解码器只需要熵解码 → 预测 → 反量化 → 重建，' +
                '而编码器还要额外做搜索、决策、代价比较这些工作。' }
            ]
          }
        ]
      },
      /* ======================================================== 05 索引色历史 */
      {
        id: 'ich',
        num: '05',
        title: '索引色历史（ICH）：给「重复出现的颜色」发号码牌',
        titleEn: 'Indexed Color History',
        lead: '屏幕上的内容并不都是连续渐变的自然图像。' +
          'UI、文本、图表这类内容有一个共同特点：**相似的颜色反复出现，但位置不一定相邻**。' +
          'ICH 的做法是给最近用过的 32 种颜色各发一个号码牌，' +
          '再用 5 bit 号码直接表示一个像素——==一个像素只花 5 bit，比任何预测方案都便宜==。',
        sections: [
          {
            id: 'motive',
            title: '它针对的是什么内容',
            titleEn: 'What It Targets',
            blocks: [
              { t: 'p', v: '规范对这项技术的描述相当直白：在计算机生成的文字与图形里，' +
                '相似像素值往往在**不算太远但也不相邻**的位置反复出现。' },
              { t: 'p', v: '这类内容的痛点在于：像素之间没有明显的邻域相关性（黑底跳白字，跳来跳去），' +
                '预测残差很大；但颜色总数又很少，翻来覆去就那么几种。' },
              { t: 'p', v: '对这种情况，==用「查表 + 索引」比用「预测 + 残差」划算得多==。' }
            ]
          },
          {
            id: 'structure',
            title: '32 项移位寄存器',
            titleEn: 'A 32-Entry Shift Register',
            blocks: [
              { t: 'fig', id: 'dscIch', caption: 'ICH 是 32 项移位寄存器：新值从顶部进，引用过的项被提到顶部，溢出的项从底部掉落。' },
              { t: 'p', v: 'ICH 的本质是一张「最近用过的颜色」表，编解码两端维护**完全相同的状态**：' },
              { t: 'list', items: [
                '表长 **32 项**，每项对应一个索引，索引用 **5 bit** 定长编码。',
                '管理方式是**移位寄存器**：最近使用（MRU）在顶部，最久未用（LRU）在底部。',
                '新值总是从顶部插入，其余整体下移，底部被挤出。',
                '以 P-mode 编码的组，组内 3 个像素值都会被写进表里。'
              ] },
              { t: 'p', v: '以 ICH-mode 编码的组则反过来：组内三个索引指向表中的项，' +
                '**被引用到的项会被提到顶部**，它原来位置上方的项整体下移一格。' +
                '这三个「提顶」操作是**并行**完成的，且==该组最右侧像素的值最终成为 MRU==。' },
              { t: 'p', v: '这套「引用即提到顶部」的策略就是 LRU 缓存的标准做法：' +
                '反复出现的颜色会一直待在表顶，用花掉的号码牌也就一直很小、很稳定。' }
            ]
          },
          {
            id: 'prevline',
            title: '那 7 个指向上一行的索引',
            titleEn: 'The Seven Previous-Line Indices',
            blocks: [
              { t: 'p', v: '这里 DSC 做了一个很聪明的偷懒：**索引 25 ~ 31 这 7 个不指向历史表，而指向上一行的重建像素**。' },
              { t: 'table', head: ['切片内的位置', 'ICH 的有效结构'], rows: [
                ['第 1 行（Native 4:2:0 为前 2 行）', '32 项全部参与移位寄存器'],
                ['第 1 行之后', '索引 0 ~ 24 参与移位（第 25 项为 LRU）；索引 25 ~ 31 指向上一行对应位置']
              ] },
              { t: 'p', v: '为什么有用？因为「上一行同一列附近的像素」在真实图像里有极大概率与当前像素相近——' +
                '垂直方向的渐变、抗锯齿文字的边缘、斜线，都属于这类。' +
                '把这 7 个位置作为永远可用的廉价索引，等于**白送了一批高命中率的候选值**。' },
              { t: 'callout', kind: 'info', title: '功能性地只有 25 项',
                v: '在非首行，真正参与移位的历史表只有 25 项（第 25 项是 LRU），' +
                  '另外 7 个索引被征用作「上一行引用」。' +
                  '这也解释了为什么 ICH 在大片平坦色块（首行）和纹理区域（后续行）都有效。' }
            ]
          },
          {
            id: 'update',
            title: '状态更新与编码器决策',
            titleEn: 'Updates and Encoder Decisions',
            blocks: [
              { t: 'p', v: '更新是**逐组**发生的，两种模式各有一套规则：' },
              { t: 'dl', items: [
                ['P-mode 组', '组内 3 个像素值从顶部插入，表底 3 项被挤出。'],
                ['ICH-mode 组', '3 个被引用的索引被提到顶部（并行），组内最右像素成为 MRU。']
              ] },
              { t: 'p', v: '编码器要在 P-mode 与 ICH-mode 之间做选择，判断依据是**代价比较**：' +
                '分别估算两种模式编这个组要花多少比特，取小者。' +
                '估算用的是对数域的误差代价，而且 v1.1 与 v1.2 的算法略有差别——' +
                'v1.2 起**不再额外给亮度加权**。' },
              { t: 'p', v: '有几种情况会被直接排除：' },
              { t: 'list', items: [
                '**切片第一组**永远不会走 ICH：ICH 在第一个像素处被重置，表里没有任何有效项。',
                '**非首行的每行第一组**可以用 ICH，去指上一行的邻近像素——这正是前面那 7 个索引的用武之地。',
                '如果这一组被 `forceMpp` 强制中点预测（为了避免缓冲欠载），**不会选 ICH-mode**。'
              ] },
              { t: 'p', v: '另外，对于第 1 行以外的某些实现（尤其是 10 bpc 及以上），' +
                '规范允许在计算 ICH 误差代价时**使用完整精度**而不是先右移；' +
                '但 v1.1 码流必须使用右移那一套，保证与旧解码器一致。' }
            ]
          }
        ]
      },

      /* ======================================================== 06 熵编码 */
      {
        id: 'entropy',
        num: '06',
        title: '熵编码：DSU-VLC',
        titleEn: 'Entropy Coding: Delta Size Unit-VLC',
        lead: '残差量化完，接下来要变成比特。DSC 的选择是**差值尺寸单位变长编码（DSU-VLC）**：' +
          '前缀告诉解码器「这一组的三个残差各自占几位」，后缀就是残差本身。' +
          '没有上下文建模、没有算术编码——==全部的复杂度都被「尺寸预测」这一招吸收掉了==。',
        sections: [
          {
            id: 'unit',
            title: '单元：前缀 + 后缀',
            titleEn: 'Units, Prefix and Suffix',
            blocks: [
              { t: 'p', v: 'DSU-VLC 把样本组织成**单元（unit）**：一个单元 = 某个分量的一个组（3 个连续样本）。' +
                '每个单元有两部分：' },
              { t: 'dl', items: [
                ['前缀（prefix）', '一元码，表示「本单元最大残差的比特宽度」相对于预测值增加了多少。' +
                  '如果实际比预测小，前缀编码 0（表示不增长）。'],
                ['后缀（suffix）', '三个残差，各用同样多的比特，二进制补码表示。' +
                  '某个残差比较小的时候，前面补 0 或者做符号扩展。']
              ] },
              { t: 'p', v: '关键规则：==同一个单元里三个残差宽度相同==，但不同单元之间可以变。' +
                '这就是「尺寸预测」要解决的问题：猜下一组的残差会有多宽。' },
              { t: 'p', v: '尺寸预测完全基于**同分量的上一个单元**，公式是：' },
              { t: 'table', head: ['步骤', '公式'], rows: [
                ['预测', 'predictedSize = (requiredSize[0] + requiredSize[1] + 2 × requiredSize[2] + 2) >> 2'],
                ['修正', 'adjPredictedSize = CLAMP(predictedSize − qLevelChange, 0, maxSize − 1)']
              ] },
              { t: 'p', v: '注意权重：`requiredSize[2]`（组内最右像素）的权重是 2，另外两个是 1，' +
                '再加 2 后整体右移 2 位。' +
                '最右像素被加重，是因为它是**空间上离下一组最近的样本**，' +
                '对下一组的残差宽度最有参考价值。' },
              { t: 'p', v: '`qLevelChange` 是当前分量量化级相对上一个单元的变化量。' +
                '如果量化突然变粗，残差自然会变窄，所以要从预测值里减去这部分。' },
              { t: 'p', v: '切片第一组的 `adjPredictedSize` 规定为 0。' +
                '另外，如果上一组是 ICH-mode，那么参与预测的尺寸要取**最近一个 P-mode 组**的尺寸，' +
                '而 `qLevelChange` 仍按「上一组（ICH 组）到当前组」的 QP 变化计算。' }
            ]
          },
          {
            id: 'codebooks',
            title: '三本前缀码表',
            titleEn: 'Three Prefix Codebooks',
            blocks: [
              { t: 'p', v: '前缀用的是一元码（若干个 0 之后跟一个 1），但**到底是哪种一元码，取决于上下文**。' +
                '规范定义了三本码表：' },
              { t: 'table', head: ['适用场合', '编码方式'], rows: [
                ['组内第一个亮度单元，且上一组是 P-mode', '纯一元码：用 0 的个数表示尺寸增量，最后跟一个 1'],
                ['组内第一个亮度单元，且上一组是 ICH-mode', '所有码偏移 1（因为单个 1 被征用来表示「继续 ICH」）；' +
                  '于是 01 表示尺寸不变、001 表示 +1、以此类推'],
                ['其他单元（第二亮度单元 / Co / Cg）', '同第一本，但**最大长度码不写末尾的 1**——解码器能推出来']
              ] },
              { t: 'p', v: '「最大长度码省掉尾 1」这个优化看起来很细节，实际省得不少：' +
                '最长的码就是最常出现在复杂区域的码，尾巴一省，高频路径直接少一位。' +
                '这也是为什么表 6-1 会专门列出每种组合下「0 的个数」与「1 的个数」。' },
              { t: 'callout', kind: 'key', title: '尺寸预测失效时的代价',
                v: '尺寸预测是「几乎总是对的」设计。但如果某一组的内容突然变复杂、残差变宽，' +
                  '前缀就得连着一串 0 来表达增长——代价是一次性花掉比较多的比特。' +
                  '这就是为什么速率控制要留缓冲区，也是为什么「平坦度信令」要反向存在。' }
            ]
          },
          {
            id: 'ich-coding',
            title: 'ICH 的转义码',
            titleEn: 'ICH Escape Coding',
            blocks: [
              { t: 'p', v: 'ICH-mode 是通过**转义码**通知解码器的，而且只在组的第一个亮度单元上出现：' },
              { t: 'dl', items: [
                ['P-mode → ICH-mode', '把第一个亮度单元的前缀写成一个「比 P-mode 允许的最大长度还大 1」的尺寸，' +
                  '即 `bits_per_component − qLevelY + 1`。这是唯一的转义码，所以末尾的 1 也省略不写。'],
                ['ICH-mode → ICH-mode', '第一个亮度单元的前缀只写一个 `1` 比特。'],
                ['ICH-mode → P-mode', '用一本修正过的一元码，也就是前面提到的「偏移 1」那本。']
              ] },
              { t: 'p', v: '三个索引分别放在哪里？规范规定得很细：' },
              { t: 'table', head: ['像素位置', '索引所在子流'], rows: [
                ['组内最左像素', 'Y 子流（Native 4:2:2 在 Y2 子流），写在 prefix_Y 之后'],
                ['组内中间像素', 'Co 子流，无前缀'],
                ['组内最右像素', 'Cg 子流，无前缀']
              ] },
              { t: 'p', v: '也就是说，**ICH 组的三条子流都有输出**——' +
                '这正是子流复用的设计前提：每条子流都按组节奏产出比特，复用器才能按规则交织。' },
              { t: 'callout', kind: 'warn', title: '一个天然的最低码率下限',
                v: '连续 ICH 组每组固定 16 bit（1 bit 前缀 + 3 × 5 bit 索引）。' +
                  '换算成 4:4:4 就是 **5.333 bpp**，在 Native 4:2:2 / 4:2:0 下（一组覆盖 6 个像素）是 **2.667 bpp**。' +
                  '规范专门提示：==这个数会限制 DSC 能达到的最低码率==。' }
            ]
          },
          {
            id: 'flatness',
            title: '平坦度信令',
            titleEn: 'Flatness Signaling',
            blocks: [
              { t: 'p', v: '速率控制是按组调节 QP 的，但有个天然的滞后：' +
                '当画面从「复杂」突然切到「大片平坦」时，QP 还停在高位，' +
                '平坦区域立刻就会出现可见的量化带。' },
              { t: 'p', v: '解决方案是给码流塞一个**前瞻信号**。语法上：' },
              { t: 'list', items: [
                '亮度单元里有一个条件标志 `next_flatness_flag`，**每 4 个组最多出现一次**。' +
                  '连续 4 个组称为一个**超组（supergroup）**。',
                '当该亮度单元的 `masterQp` 落在 `flatness_min_qp` 与 `flatness_max_qp` 之间（含端点）时，' +
                  '才会插入这个标志。',
                '标志置 1 时，会告诉解码器「右数第二个组要调整」，' +
                  '并附带 `next_flatness_group`（超组内是哪一组）与条件性的 `next_flatness_type`。'
              ] },
              { t: 'p', v: '`next_flatness_type` 只在 QP 不低于某个阈值（`7 + 2 × (bpc − 8)`）才显式给出；' +
                'QP 更低时，类型默认为「somewhat flat」。' },
              { t: 'p', v: '这是 DSC 中**唯一需要显式传输的速率控制信息**。' +
                '除它之外，QP 的每一步变化都靠两端各跑一遍算法得出。' },
              { t: 'callout', kind: 'info', title: 'v1.2 的两处调整',
                v: 'v1.2 起：非首行的**第一个组按「very flat」处理**（因为它几乎没有横向预测能力）；' +
                  '并且平坦度修正被并入短项速率控制一起做，而不是单独处理。' }
            ]
          },
          {
            id: 'outputs',
            title: '交给速率控制的两个数字',
            titleEn: 'Outputs to Rate Control',
            blocks: [
              { t: 'p', v: '熵编码器每组要向速率控制汇报两个值，它们的区别很重要：' },
              { t: 'dl', items: [
                ['codedBits', '**实际**花掉的比特数，也就是这个组在码流里真实占用的位数。'],
                ['rcSizeGroup', '如果尺寸预测**完全命中**，本来需要花多少比特。' +
                  '算法是：每个单元取组内最大残差尺寸 × 单元内样本数 + 1（前缀），再累加各单元；' +
                  '走 MPP 时该尺寸按 `cpntBitDepth − qLevel` 计；走 ICH 时取 `1 + 5 × 索引个数`。']
              ] },
              { t: 'p', v: '为什么要区分？因为**两者之差正好度量了尺寸预测的效率**。' +
                '速率控制用它来判断当前内容的「活动量」，' +
                '也是 `rc_edge_factor` 用来检测边缘的基础。' },
              { t: 'p', v: '时序上，这两个值在编码完一个组之后才可用，' +
                '并且被用在**下一个组**的速率控制周期里。' }
            ]
          }
        ]
      },

      /* ======================================================== 07 速率控制 */
      {
        id: 'rc',
        num: '07',
        title: '速率控制：把变长码流收成恒定码率',
        titleEn: 'Rate Control',
        lead: '编码出来的每组比特数是变化的，但链路必须按固定码率传输。' +
          '中间那个把「变长」转成「恒定」的东西就是速率缓冲，' +
          '而控制缓冲水位不让它溢出或欠载的，就是速率控制（RC）。' +
          'DSC 的 RC 有个特别之处：==它在编、解码两端完全相同地运行，不传输结果==。',
        sections: [
          {
            id: 'why-rc',
            title: '为什么两端要各跑一遍',
            titleEn: 'Why Both Sides Run It',
            blocks: [
              { t: 'p', v: 'QP 是逐组变化的。如果每组都要传一个 QP 值，' +
                '光是通知成本就能吃掉相当一部分压缩收益。' },
              { t: 'p', v: 'DSC 的做法是：**把决策规则写成确定性的算法**，' +
                '编码器按「已经发出去的比特」算，解码器按「已经收到的比特」算，' +
                '输入完全相同 → 结果必然相同。于是==QP 一个比特都不用传==。' },
              { t: 'p', v: '唯一的例外是平坦度指示：因为编码器要**预判未来**（提前 4 个组减 QP），' +
                '而解码器没有这个信息，所以需要显式通知。' },
              { t: 'p', v: 'RC 的设计目标有三条：' },
              { t: 'list', ordered: true, items: [
                '给每一组提供 QP（两端一致，无需传输）；',
                '保证 HRD（假想参考解码器）合规——把变长的组比特数转换成一个**既不过溢也不欠载**的理想缓冲模型；',
                '优化主观画质：平坦区域用低 QP，复杂区域用高 QP，因为**复杂区域的误差不容易被看见**。'
              ] },
              { t: 'callout', kind: 'key', title: '一个反直觉的推论',
                v: '既然 RC 两端一致，那「画质」在某种意义上是**规范决定的**：' +
                  '只要 PPS 参数一致，同一段视频在任何解码器上重建出的像素应该几乎一样。' +
                  'DSC 的一致性测试因此非常严格——它比的是逐像素结果。' }
            ]
          },
          {
            id: 'model',
            title: '缓冲模型与水位',
            titleEn: 'The Buffer Model',
            blocks: [
              { t: 'fig', id: 'dscRc', caption: '速率控制的四个环节：缓冲追踪 → 线性变换 → 长项参数 → 短项 QP 调整。' },
              { t: 'p', v: 'RC 的核心是一个**理想化的速率缓冲模型**（行为类似 FIFO）：' +
                '每编完一组，就把该组的比特数加进去；同时按标称码率扣除 `3 × bits_per_pixel` 比特。' },
              { t: 'p', v: '结果是 `bufferFullness`——缓冲模型的水位。它总是**非负**的。' },
              { t: 'p', v: '但水位要跟「合法区间」比才有意义，于是引入线性变换：' },
              { t: 'p', v: '`rcModelFullness = (bufferFullness + rcXformOffset) × rcXformScale`' },
              { t: 'p', v: '变换后的水位被定义在 `[−rc_model_size, 0]` 之间：==空是负值、满是 0==。' },
              { t: 'p', v: '为什么把「满」定义为 0 而不是最大值？' +
                '因为算法真正关心的是「离溢出还有多远」，用负值表示剩余空间，' +
                '后续的区间判断与阈值比较就都变成了一跳的自然映射。' },
              { t: 'p', v: '变换用的是**偏移 + 缩放**两个参数，目标是同时做到四件事：' },
              { t: 'list', items: [
                '给切片**第一行**分配额外的比特预算（首行没有上一行可参考，预测最差）；',
                '在 Native 4:2:0 下还给**第二行**额外预算；',
                '把其他行的比特预算相应减少，保证整条切片的总比特数不变；',
                '把切片结束时留在编码器缓冲里的比特数**限制在一个上限内**。'
              ] }
            ]
          },
          {
            id: 'long-short',
            title: '长项与短项',
            titleEn: 'Long-term and Short-term RC',
            blocks: [
              { t: 'p', v: '水位算出来之后，分成两个时间尺度去用：' },
              { t: 'dl', items: [
                ['长项（Long-term）', '把变换后的水位落入**某个区间（range）**，' +
                  '每个区间预先定义好 `range_min_qp`、`range_max_qp` 与 `range_bpg_offset`（每组的比特预算调整量）。' +
                  '换句话说，长项负责给出「现在大概该用多粗的量化」。'],
                ['短项（Short-term）', '在长项给出的上下限内**逐组微调** QP。' +
                  '它会比较当前内容的活动量与上一组、参照 `rc_edge_factor` 判断是否处于边缘，' +
                  '并结合 `rc_quant_incr_limit0 / limit1` 与 `rc_tgt_offset_hi / lo`（目标 bits/组 的容差带）来决定加还是减。']
              ] },
              { t: 'p', v: '时序上，规范给了解码器**额外一个组时间**来完成长项计算：' +
                '当前组解码的同时算下一组的长项参数，' +
                '这样「熵解码 → 短项 → 得到 QP」这条关键路径不会变成瓶颈。' },
              { t: 'p', v: 'v1.2 对短项做了一处改动：增加了一个**「省比特」状态（bit-saving state）**，' +
                '让 QP 在缓冲水位偏高时能更快地回落到安全区。' }
            ]
          },
          {
            id: 'flat',
            title: '平坦度覆盖与 QP→qLevel',
            titleEn: 'Flatness Override and qLevel Mapping',
            blocks: [
              { t: 'p', v: '短项算出的 QP 记作 `stQp`。收到平坦度信号时，会做一次覆盖：' },
              { t: 'table', head: ['情况', 'masterQp'], rows: [
                ['无平坦度信号', 'masterQp = stQp'],
                ['somewhat flat', 'masterQp = MAX(stQp − 4, 0)'],
                ['very flat', 'masterQp = 1 + 2 × (bits_per_component − 8)']
              ] },
              { t: 'p', v: '注意 `somewhatFlatQpDelta` 是个定值 4，而 `veryFlatQp` 随位深变化——' +
                '8 bpc 时是 1，10 bpc 时是 5，12 bpc 时是 9。' +
                '位深越高，允许压到的绝对量化级越相应放宽，否则会出现「太平滑」的塑料感。' },
              { t: 'p', v: '另外，v1.2 起非首行的**第一个组按 very flat 处理**，' +
                '但不会真的发平坦度信号（因为平坦度搜索不跨行）。' },
              { t: 'p', v: '最后一步是把 `masterQp` 映射成实际使用的量化级：' },
              { t: 'list', items: [
                '`masterQp` 取值 **0 ~ 31**，通过规范表 6-2 映射为亮度的 `qLevelY` 与色度的 `qLevelC`；',
                '映射表**按位深分列**（8 / 10 / 12 / 14 / 16 bpc），因为同样的 QP 在不同位深下对应的相对量化强度不同；',
                '在 v1.2 中，如果亮度与色度位深相同，亮度查表得到 `qLevelY`，' +
                  '而色度取表值后再 ==减 1==（`qLevelC = MAX(0, qLevelC − 1)`）；',
                '`qLevel` 是**右移位数**，所以它每加 1，量化步长翻倍、精度减半——这就是画质旋钮的物理含义。'
              ] },
              { t: 'callout', kind: 'info', title: '为什么色度可以粗一点',
                v: '人眼对色度细节的分辨力远低于亮度。' +
                  'v1.2 里「同深度时给色度降一级量化」正是利用了这一点：' +
                  '用几乎看不见的色度损失，换回可观的比特。' }
            ]
          },
          {
            id: 'cbr-vbr',
            title: 'CBR 与 VBR',
            titleEn: 'Constant vs Variable Bit Rate',
            blocks: [
              { t: 'p', v: 'DSC 有两种码率模式，由 PPS 的 `vbr_enable` 决定：' },
              { t: 'table', head: ['模式', '码率行为', '欠载时怎么办'], rows: [
                ['CBR（`vbr_enable = 0`）', '每个像素时间发送固定的 `bits_per_pixel` 比特', '编码器**人为多花比特**：' +
                  '判定下一组可能欠载就强制 MPP，MPP 的残差尺寸恒定，天然保证最低码率'],
                ['VBR（`vbr_enable = 1`）', '瞬时码率要么是 `bits_per_pixel`，要么是 0', '编码器在缓冲快空时**直接停发**，' +
                  '把模型水位钳到 0（不允许为负）']
              ] },
              { t: 'p', v: 'CBR 下的「多花比特」有个很好的性质：==解码器不需要任何特殊逻辑==。' +
                '它只是照常解码那些额外比特，与解码普通组没有区别。' },
              { t: 'p', v: 'CBR 还要求：**一条切片花掉的比特数 = 像素数 × bits_per_pixel**。' +
                '如果编码结束时缓冲里的比特数不够这个上限，就在切片末尾**填 0**补齐。' },
              { t: 'p', v: 'VBR 的代价是：传输层必须自己判断「什么时候有数据可发」。' +
                '因为码流里可能出现零长度的时间段，' +
                '传输层要能区分「没有数据」和「数据还没到」。' },
              { t: 'p', v: '还有一个容易被忽略的后果：VBR 下**平均有效码率可以显著低于标称值**。' +
                '由于瞬时 0 bit 的存在，编码器与解码器缓冲水位的**总和**可以小于模型容量——' +
                '编码器可能空着，解码器也远未填满。' }
            ]
          }
        ]
      },

      /* ======================================================== 08 比特流组装 */
      {
        id: 'mux',
        num: '08',
        title: '比特流组装：子流复用、切片复用与时序',
        titleEn: 'Bitstream Construction and Timing',
        lead: '到了这一步，三条（或四条）子流各自有了一串比特。' +
          '要变成一条能在链路上跑的数据流，还要经过**子流复用**与**切片复用**两道工序。' +
          '这两道工序最特别的地方是：==顺序不是编码器定的，而是由「一个解码器模型」算出来的==。',
        sections: [
          {
            id: 'ssm',
            title: '子流复用：固定长度的复用字',
            titleEn: 'Substream Multiplexing',
            blocks: [
              { t: 'p', v: '子流复用（SSM）把三条（或四条）分量子流交织成一条切片比特流，规则非常朴素：' },
              { t: 'list', items: [
                '**没有头信息**，只有一个接一个的**复用字（mux word）**；',
                '每个复用字的长度固定：8 / 10 bpc 为 **48 bit**，12 / 14 / 16 bpc 为 **64 bit**；',
                '复用字来自哪条子流，是由「解码器什么时候需要它」决定的。'
              ] },
              { t: 'p', v: '解码器侧的结构是：每条子流一个**漏斗移位器 + 变长解码器**，' +
                '这个组合规范里叫**子流处理器（SSP）**。' +
                '当某个 SSP 的漏斗移位器空间不足时，它发出请求，解复用器就给它送一个复用字。' },
              { t: 'p', v: '==一个组时间内，可能出现 0 到 4 个请求==。' +
                '如果同一时间有多个请求，发送顺序固定为：Y → Co → Cg → Y2。' },
              { t: 'p', v: '编码器不需要知道未来，它只需要**模拟这个解码器模型**：' +
                '什么时候模型会请求，就什么时候把对应的字插进去。' }
            ]
          },
          {
            id: 'balance',
            title: '平衡 FIFO 与它的延迟',
            titleEn: 'Balance FIFOs',
            blocks: [
              { t: 'p', v: '模拟有个现实问题：某条子流可能「很久才产出第一个字」。' +
                '举个例子，如果某分量的子流是 1 bit／单元，那要攒够 48 bit 才能凑出一个复用字——' +
                '也就是 48 个单元；' +
                '这段时间里，其他分量产生的数据必须先**暂存**起来，等轮到它才能插进码流。' },
              { t: 'p', v: '这就是**平衡 FIFO（Balance FIFO）**的用途。规范给出的容量要求是' +
                '每个子流需要 `muxWordSize + maxSeSize − 1` 个语法元素的空间。' },
              { t: 'p', v: '规范还给了个具体数字：对 8 bpc RGB 输入、无残缺组的情况，' +
                '每个平衡 FIFO 可容纳 **83 个单元的压缩数据**，' +
                '总延迟是 **83 × 3 = 249 像素时间**。' },
              { t: 'callout', kind: 'warn', title: '平衡 FIFO 延迟是系统延迟的一部分',
                v: '规范特别提示：平衡 FIFO 引入的延迟==不影响码流，也不影响解码行为，' +
                  '但它会影响端到端系统延迟==。' +
                  '这个延迟在时序模型里被当作**常量**处理。' }
            ]
          },
          {
            id: 'slice-mux',
            title: '切片复用与块（chunk）',
            titleEn: 'Slice Multiplexing and Chunks',
            blocks: [
              { t: 'fig', id: 'dscSlices', caption: '每行 2 个切片时，比特流按「左一行、右一行、左下一行…」的块序列交织。' },
              { t: 'p', v: '当一行有多个切片时，需要切片复用。规则如下：' },
              { t: 'p', v: '设图像宽度 W、每行 S 个切片，则每个切片每行有 P 个像素。' +
                'P 对所有切片列都相同：' },
              { t: 'list', items: [
                'W / S 能整除时，P = W / S；',
                '不能整除时，P = ceil(W / S)，**最后一列切片用复制像素补齐**，' +
                  '保证各列宽度一致。'
              ] },
              { t: 'p', v: '复用后的比特流由一连串**块（chunk）**组成，每块长度是 `ceil(P × bits_per_pixel / 8)` 字节：' },
              { t: 'table', head: ['顺序', '内容'], rows: [
                ['第 1 块', '第 1 行切片列中第 1 个切片的一行'],
                ['第 2 块', '第 1 行切片列中第 2 个切片的一行'],
                ['…', '第 1 行全部切片列'],
                ['下一轮', '再重复该模式，直到该行切片组的全部比特发完'],
                ['之后', '对图片中所有压缩切片行重复该过程']
              ] },
              { t: 'p', v: '一次完整迭代（也就是一行）的总量是 `S × ceil(P × bpp / 8)` 字节。' },
              { t: 'p', v: '应用规范还可以在这个基础上加自己的约束，' +
                '例如「每个切片每行的比特数必须是 16 bit 或 24 bit 的整数倍」。' },
              { t: 'callout', kind: 'info', title: '码流里没有切片标记',
                v: 'DSC 比特流**不含**任何标识「哪段比特属于哪个切片」的标记，' +
                  '也不标明每个切片的起始位置。' +
                  '这些都是传输层的责任——规范明确把这件事划在范围之外。' }
            ]
          },
          {
            id: 'timing',
            title: '时序、延迟与填充',
            titleEn: 'Timing, Delay and Padding',
            blocks: [
              { t: 'p', v: 'DSC 的时序模型建立在一个理想化系统之上：编解码器都无延迟、缓冲容量相同、链路按标称码率传输。' },
              { t: 'p', v: '几个核心的延迟参数：' },
              { t: 'dl', items: [
                ['initial_xmit_delay', '编码器**开始发送**前等待的像素时间。' +
                  '它还决定了切片结束时编码器缓冲里最多能剩多少比特（`initial_xmit_delay × bits_per_pixel`）。'],
                ['initial_dec_delay', '解码器**开始解码**前先积累的像素时间。'],
                ['HRD 总延迟', '缓冲模型大小 ÷ bits_per_pixel。'],
                ['端到端延迟', '平衡 FIFO 延迟 + 编码器缓冲延迟 + 解码器缓冲延迟，三者之和是**常量**。']
              ] },
              { t: 'p', v: '规范给了一个完整的算例：缓冲模型 19836 bit、码率 12 bpp 时，' +
                '端到端 HRD 延迟 = ceil(19836 / 12) = **1653 像素时间**；' +
                '若初始发送延迟取 341 像素时间，则初始解码延迟 = `1653 − 341 = 1312` 像素时间。' },
              { t: 'p', v: '缓冲大小不是随便定的，它是 `bits_per_pixel` 与切片宽度的函数，' +
                '具体公式在规范的附录 E 里。' },
              { t: 'p', v: '最后是填充（padding）的两种情况：' },
              { t: 'list', ordered: true, items: [
                '**CBR 下的切片末尾补 0**：保证每条切片的比特数精确等于「像素数 × bpp」。' +
                  '解码器需要把这些填充位**冲掉**，它们不对应任何像素。',
                '**切片末尾的空复用字**：编码器可能需要在切片尾部插入空的复用字，' +
                  '用来对应那些「已经结束但还在请求」的子流的请求。'
              ] },
              { t: 'callout', kind: 'key', title: '反过来说，解码器要能识别非法',
                v: '如果输入缓冲溢出，解码器必须把它当作**错误状态**；' +
                  '如果熵解码试图读超出切片数据末尾的比特，也要报错。' +
                  '切片数据的长度在 CBR 下是固定的，在 VBR 下由传输层告知。' }
            ]
          }
        ]
      },
      /* ======================================================== 09 PPS */
      {
        id: 'pps',
        num: '09',
        title: 'PPS：一页参数决定全部行为',
        titleEn: 'Picture Parameter Set',
        lead: '前面所有算法都有一个共同前提：「编解码两端拿着同一份参数」。' +
          '这份参数就是 **PPS（图像参数集）**——128 字节，装下了图像尺寸、切片尺寸、目标码率、' +
          '缓冲模型规模、量化上下限、各种模式开关。' +
          '==PPS 错一位，整张图像就是错的==。',
        sections: [
          {
            id: 'what',
            title: '定位与传输',
            titleEn: 'What It Is and How It Travels',
            blocks: [
              { t: 'p', v: 'PPS 是规范里唯一「必须被可靠送达」的数据结构：' },
              { t: 'list', items: [
                '固定封装在 **128 字节**里（记作 PPS0 ~ PPS127）；',
                '跨字节的字段，**高位在前**（例如 `bits_per_pixel[9:0]` 映射到 PPS4[1:0] 与 PPS5[7:0]）；',
                '必须在对应的图像数据**到达之前**被接收并生效；',
                '**不属于**任何图像／切片的比特预算，规范把「怎么传、什么时候传」交给应用规范，' +
                  '并要求传输层保证可靠性（例如使用 ECC）。'
              ] },
              { t: 'p', v: '`pps_identifier` 是一个应用自定义的标识，用来区分不同的 PPS 表；' +
                '如果应用规范没有规定 PPS 的传输方式，该字段应填 `0x00`。' }
            ]
          },
          {
            id: 'geometry',
            title: '几何与格式字段',
            titleEn: 'Geometry and Format',
            blocks: [
              { t: 'table', head: ['字段', '位宽', '含义'], rows: [
                ['dsc_version_major / minor', '4 + 4', '主版本固定 `0x1`；次版本 `0x1` = v1.1 码流，`0x2` = v1.2 码流'],
                ['bits_per_component', '4', '`0x8`=8bpc、`0xA`=10、`0xC`=12、`0xE`=14、`0x0`=16（14/16 仅 v1.2）'],
                ['linebuf_depth', '4', '解码器行缓存位深：`0x8`~`0xF` 对应 8~15 bit，`0x0` 表示 16 bit'],
                ['pic_width / pic_height', '16 + 16', '图像尺寸（像素）；建议取切片尺寸的整数倍'],
                ['slice_width / slice_height', '16 + 16', '切片尺寸；同图所有切片必须一致']
              ] },
              { t: 'p', v: '切片尺寸有两个**补齐规则**必须记住：' },
              { t: 'dl', items: [
                ['纵向不整除', '图像高度不是切片高度的整数倍时，' +
                  '给最下面那些切片补上**中点值样本**的行，使它们与其他切片等高。'],
                ['横向不整除', '图像宽度不是切片宽度的整数倍时，' +
                  '复制最右列像素来补齐。传输层要为这些复制出来的像素**留出传输时间**。']
              ] },
              { t: 'p', v: '此外还有两条位宽约束：' },
              { t: 'list', items: [
                '`slice_height` 在 `native_420 = 1` 时必须是 **2 的倍数**；',
                '`slice_width` 在 `simple_422`、`native_422` 或 `native_420` 任一为 1 时必须是 **2 的倍数**。'
              ] }
            ]
          },
          {
            id: 'rc-fields',
            title: '速率控制字段',
            titleEn: 'Rate Control Fields',
            blocks: [
              { t: 'p', v: 'PPS 里最大的一块是速率控制参数（`rc_parameter_set`，共 400 bit / 50 字节）。' +
                '这些参数**逐切片**描述「缓冲模型长什么样」：' },
              { t: 'table', head: ['字段', '作用'], rows: [
                ['rc_model_size', 'RC 模型的比特容量，直接决定 HRD 缓冲规模与端到端延迟'],
                ['initial_xmit_delay', '初始发送延迟（像素时间）；同时给出切片末尾缓冲的上限'],
                ['initial_dec_delay', '初始解码延迟（像素时间）'],
                ['initial_scale_value', '切片开始时 `rcXformScale` 的初值（带 3 位小数）'],
                ['scale_increment_interval', '切片末尾阶段，每多少个组时间把 `rcXformScale` 加一档'],
                ['scale_decrement_interval', '切片开始阶段，每多少个组时间把 `rcXformScale` 减一档'],
                ['first_line_bpg_offset', '切片**第一行**每组额外分配的比特数'],
                ['nfl_bpg_offset', '第一行之后每组**回收**的比特数；需按 `first_line_bpg_offset / (slice_height − 1)` 取整'],
                ['second_line_bpg_offset', 'Native 4:2:0 下第二行的额外预算（其他情况必须为 0）'],
                ['initial_offset / final_offset', '线性变换偏移的起点与切片末端的上限'],
                ['slice_bpg_offset', '为满足「整条切片比特数 = 像素数 × bpp」而每组回收的比特数'],
                ['flatness_min_qp / max_qp', '允许发出平坦度信令的 QP 区间'],
                ['rc_buf_thresh', '把缓冲水位切成若干区间（range）的阈值'],
                ['rc_range_parameters', '每个区间的 `range_min_qp` / `range_max_qp` / `range_bpg_offset`']
              ] },
              { t: 'p', v: '注意「第一行多给、其余行回收」这一对参数是**成对出现**的：' +
                '给首行的额外比特必须从本切片剩余部分里扣回来，' +
                '否则整条切片的比特数就超了。' },
              { t: 'p', v: '规范在附录 E 里给了这些参数之间的一致性关系（例如 `final_offset` 必须满足 HRD 合规的等式），' +
                '并在附录 E 的表里给出了常见配置下的推荐取值。' +
                '==这些参数之间**不能随便填**，必须按规范给的推导关系来==。' }
            ]
          },
          {
            id: 'flags',
            title: '模式开关与互斥关系',
            titleEn: 'Mode Flags',
            blocks: [
              { t: 'table', head: ['标志', '取值与含义'], rows: [
                ['block_pred_enable', '`1` = 解码器需在 BP 与 MMAP 之间做选择；`0` = 本图不使用 BP'],
                ['convert_rgb', '`1` = 编码器做 RGB→YCoCg-R、解码器做逆变换；`0` = 输入输出为 YCbCr，色彩变换旁路'],
                ['simple_422', '`1` = 解码器按附录 B 的方法丢样本重建 4:2:2 图像'],
                ['vbr_enable', '`1` = 启用可变码率（需传输与解码器共同支持）'],
                ['native_420 / native_422', '启用原生 4:2:0 / 4:2:2 模式']
              ] },
              { t: 'p', v: '这些标志不是自由组合，规范给了一串**互斥约束**：' },
              { t: 'list', items: [
                '`simple_422 = 1` 时，`native_422` 与 `native_420` 必须都是 0；',
                '`native_420 = 1` 时，`dsc_version_minor` 不能是 1（v1.1 不支持该模式），' +
                  '且 `simple_422` 与 `native_422` 必须为 0；',
                '`native_422` 与 `native_420` 不能同时为 1；',
                '`bits_per_component` 为 14 或 16 时，`dsc_version_minor` 必须是 2；',
                '`second_line_bpg_offset`、`nsl_bpg_offset`、`second_line_offset_adj` 在非原生 4:2:0 时必须为 0。'
              ] },
              { t: 'p', v: '`chunk_size` 字段也有硬性公式（用于切片复用）：' },
              { t: 'list', items: [
                '常规模式：`ceil(bits_per_pixel × slice_width / 8)` 字节；',
                'Native 4:2:2 / 4:2:0：`ceil(bits_per_pixel × (slice_width >> 1) / 8)` 字节。'
              ] },
              { t: 'callout', kind: 'key', title: 'bits_per_pixel 有个反直觉的规矩',
                v: '在原生 4:2:2 / 4:2:0 模式下，`bits_per_pixel` 要填成**目标 bpp 的两倍**。' +
                  '原因是这两个模式的一个「像素时间」对应一个容器像素，' +
                  '而一个容器像素承载两个真实像素——==账要按容器像素来算==。' }
            ]
          },
          {
            id: 'bits-per-pixel',
            title: '目标码率本身',
            titleEn: 'The bits_per_pixel Field',
            blocks: [
              { t: 'p', v: '`bits_per_pixel` 是一个 10 bit 字段，**带 4 位小数**，' +
                '即分辨率是 1/16 bit，允许填 6.0 ~ 63.9375 之间的值（规范注明最大支持 63.9375）。' },
              { t: 'p', v: 'CBR 模式下的取整规则值得一提：如果配置出来的「每组比特数」不是整数，' +
                '这个**小数余量会被保留并累积到下一组**——' +
                '这样长期平均码率才精确等于设定值。' },
              { t: 'p', v: '另外还有一条上限约束：当 `vbr_enable = 0` 时，' +
                '`bits_per_pixel` 必须**小于等于「一直用 MPP 且 QP = 0」时能达到的速率**。' +
                '因为那是编码器能吐出的最高瞬时速率——超过它，CBR 就无法维持了。' }
            ]
          }
        ]
      },

      /* ======================================================== 10 版本新增能力 */
      {
        id: 'v12',
        num: '10',
        title: 'DSC 1.2 / 1.2a 新增了什么',
        titleEn: 'What DSC v1.2 Added',
        lead: 'v1.2 的主要工作不是「把压缩做得更强」，而是**把适用的输入格式与位深铺开**：' +
          '原生 4:2:2、原生 4:2:0、14 / 16 bpc。' +
          '对做显示接口的人来说，这一版的意义在于==不再需要为了压缩先把 4:2:2 强行转成 4:4:4==。',
        sections: [
          {
            id: 'native422',
            title: 'Native 4:2:2：四分量容器',
            titleEn: 'Native 4:2:2 Mode',
            blocks: [
              { t: 'fig', id: 'dscContainer', caption: 'Native 模式的打包方式：把子采样样本装进虚拟容器，容器像素承载两个真实像素。' },
              { t: 'p', v: '为什么需要原生模式？某些显示链路必须**直接传子采样视频**，' +
                '强行转成 4:4:4 会引入不必要的插值与比特开销；' +
                '而且原生模式还能把编解码吞吐提高约一倍。' },
              { t: 'p', v: 'Native 4:2:2 的做法是构造一个**虚拟的半宽 4:4:4:4 容器**，每个容器像素包含四个分量：' },
              { t: 'table', head: ['容器分量', '来源'], rows: [
                ['第 1 分量', '偶数位置亮度样本'],
                ['第 2 分量', 'Cb'],
                ['第 3 分量', 'Cr'],
                ['第 4 分量', '奇数位置亮度样本']
              ] },
              { t: 'p', v: '因为它有四个分量，所以有 **4 条子流 / 4 个 SSP**（多出来的那条叫 Y2）。' +
                '切片宽度设为**原切片宽度的一半**（因为是半宽容器）。' },
              { t: 'p', v: '算法上的对应调整：' },
              { t: 'list', items: [
                '预测与尺寸预测把**偶数位亮度与奇数位亮度当作两个独立分量**处理；',
                '块预测**适用于容器里的全部四个分量**（与 4:2:0 不同），' +
                  '而且由于像素打包，`bpVector` 的实际像素距离相当于翻倍；',
                'ICH 工作在 4:4:4:4 容器上，**一个索引对应一对像素**；' +
                  '规范为此做了一处小修改：允许上一行的 ICH 项指向「以偶数位或奇数位开头的像素对」；',
                '速率控制的「像素时间」变成**容器像素时间**——因为一个容器像素编码两个像素。'
              ] }
            ]
          },
          {
            id: 'native420',
            title: 'Native 4:2:0：三分量容器',
            titleEn: 'Native 4:2:0 Mode',
            blocks: [
              { t: 'p', v: 'Native 4:2:0 构造的是一个**半宽 4:4:4 容器**（三个分量）：' },
              { t: 'dl', items: [
                ['第 1 分量', '偶数位置亮度样本'],
                ['第 2 分量', '奇数位置亮度样本'],
                ['第 3 分量', '色度样本——**偶数行编 Cb、奇数行编 Cr**']
              ] },
              { t: 'p', v: '这里有个很关键的细节：4:2:0 的色度在垂直方向隔行取样，' +
                '所以「同类型色度的上一行」是**两行之前**。' +
                '规范因此规定：Cb 的垂直预测要取上两行位置的 Cb，Cr 同理。' },
              { t: 'p', v: '这块还有几处特殊处理：' },
              { t: 'list', items: [
                '**BP 只作用于亮度**，色度一律用 MMAP 或 MPP；',
                '切片**前两行的色度**都不能用上一行（因为色度隔行），MMAP 会退化；',
                'PPS 里多出 `second_line_bpg_offset` / `nsl_bpg_offset` / `second_line_offset_adj` 三个参数，' +
                  '专为第二行（也就是 Cr 第一次出现的那一行）服务；',
                '速率控制也做了小调整，**避免第二行被过度量化**。'
              ] },
              { t: 'callout', kind: 'warn', title: '这正是 v1.2a 的由来',
                v: 'v1.2 的 4:2:0 定义有缺陷，被勘误废弃；v1.2a 专门修正后重新完整支持。' +
                  '如果手上有声称「DSC 1.2 支持 4:2:0」的资料，==它对应的实际实现应该是 v1.2a==。' }
            ]
          },
          {
            id: 'bigdepth',
            title: '14 与 16 bpc',
            titleEn: '14 and 16 bits per Component',
            blocks: [
              { t: 'p', v: '14 bpc 的实现代价最小：**数据通路按位宽直接扩展**，' +
                '数据宽度与语法元素尺寸同步放大，算法本身没有变化。' },
              { t: 'p', v: '16 bpc 则必须做两处妥协，目的是把复用字保持在 64 bit：' },
              { t: 'list', ordered: true, items: [
                'RGB 输入时，YCoCg 变换**舍掉色度的最低位**，使色度位深回到 16 bit——' +
                  '这也是 DSC 在 16 bpc 下不存在数学无损的原因；',
                '熵编码中**亮度前缀 `prefix_Y` 被限制在最多 13 bit**。'
              ] },
              { t: 'p', v: '顺带说明：位深变化不只影响数据通路，还影响 QP 到 qLevel 的映射表——' +
                '所以规范表 6-2 是按位深分列的。' }
            ]
          },
          {
            id: 'other-diffs',
            title: '其他算法调整',
            titleEn: 'Other Algorithmic Differences',
            blocks: [
              { t: 'p', v: '规范用一小节集中列出了 v1.1 → v1.2 的细节差异。' +
                '这些改动只对 `dsc_version_minor = 0x2` 的图像生效：' },
              { t: 'table', head: ['方面', '变化'], rows: [
                ['ICH 决策', '不再给亮度对数代价额外加权'],
                ['短项速率控制', '加入「省比特」状态（bit-saving state）'],
                ['平坦度检测', '非首行的第一个组按「very flat」处理'],
                ['平坦度修正', '并入短项速率控制一起做'],
                ['QP → qLevel', '当亮度与色度位深相同时，映射略有修改（色度减 1）']
              ] },
              { t: 'p', v: '这些改动看起来零碎，但都有一个共同点：' +
                '**都是在不改变码流「可解性」的前提下改进画质或稳态行为**。' },
              { t: 'p', v: '也正因为如此，v1.1 的实现无法直接复用 v1.2 的编码器——' +
                '同一个编码器要做到「填 0x1 就产出 v1.1 码流」，就必须把两套细节都实现一遍。' }
            ]
          },
          {
            id: 'simple422',
            title: 'Simple 4:2:2：不改算法的兼容做法',
            titleEn: 'Simple 4:2:2 Mode',
            blocks: [
              { t: 'p', v: '有些应用同时支持 4:4:4 与 4:2:2 格式，' +
                '希望**在两种采样下都拿到相同的视觉无损与相同的吞吐**。' +
                '这类应用里，原生 4:2:2 的复杂度是多余的。' },
              { t: 'p', v: '规范附录 B 给出了一个简单办法：' },
              { t: 'list', ordered: true, items: [
                '编码前，把 4:2:2 插值成 4:4:4——缺失的色度样本取**左右相邻两个像素同分量色度的平均值**（权重 0.5 / 0.5）；',
                '照常走 4:4:4 的 DSC 编码；',
                '解码后，再用**丢掉一部分样本**的方式还原 4:2:2 输出。'
              ] },
              { t: 'p', v: '解码端的丢样本行为由 PPS 的 `simple_422` 标志告知。' +
                '这个模式的好处是：==编解码器的核心算法一行都不用改==，' +
                '只是在输入输出两侧各加一级转换。' },
              { t: 'callout', kind: 'info', title: 'native 与 simple 怎么选',
                v: '要省复杂度、且吞吐已经够用 → **Simple**；' +
                  '要吞吐翻倍、要少一次「子采样 → 全采样 → 子采样」的往复 → **Native**。' }
            ]
          }
        ]
      },

      /* ======================================================== 11 硬件与取舍 */
      {
        id: 'hw',
        num: '11',
        title: '硬件实现与工程取舍',
        titleEn: 'Hardware Implementation and Trade-offs',
        lead: '规范专门留了一个附录讲硬件实现。原因是 DSC 的所有设计决策最后都要回答一个问题：' +
          '==这块电路的面积、时钟频率和缓冲 SRAM 能不能接受==。' +
          '这一章把规范附录 D / E 里的工程要点和常见误解收在一起。',
        sections: [
          {
            id: 'throughput',
            title: '吞吐：1 / 3 像素每时钟',
            titleEn: 'Throughput Targets',
            blocks: [
              { t: 'p', v: '规范给的实现目标是明确的：' },
              { t: 'table', head: ['实现', '4:4:4 与 Simple 4:2:2', 'Native 4:2:2 / 4:2:0'], rows: [
                ['编码器', '1 像素／时钟', '2 像素／时钟'],
                ['解码器', '3 像素／时钟', '6 像素／时钟']
              ] },
              { t: 'p', v: '为什么解码器的目标是编码器的 3 倍？' +
                '因为**编码端可以并行做多份，解码端往往受限于面板时序**——' +
                '解码器必须跟着显示时序走，而显示时序是固定的。' },
              { t: 'p', v: '需要更高吞吐时有三种路子：' },
              { t: 'list', ordered: true, items: [
                '**增加每行切片数**，用多个解码实例并行（例如 2 切片／行 × 2 个 3 像素／时钟实例 = 6 像素／时钟）；',
                '**把屏幕分成多个区域**，每个区域由独立的 DSC 实例处理、走独立链路——' +
                  '这种情况下每个区域是独立图像，不需要用「每行多切片」的机制；',
                '**利用水平消隐期**：有的解码器按显示像素率解码、消隐期空闲；' +
                  '有的按较慢速率解码、用缓冲对齐显示率。两者可以兼容同一套传输与显示规范。'
              ] },
              { t: 'p', v: '规范也提到，**设计更低吞吐的硬件块是很直接的**——' +
                '如果只需要 1 像素／时钟的解码（例如某些低分辨率面板），实现成本会显著下降。' }
            ]
          },
          {
            id: 'bp-opt',
            title: '块预测搜索的复用技巧',
            titleEn: 'Reusing BP Search Results',
            blocks: [
              { t: 'p', v: 'BP 搜索看起来是「每个样点都要搜一遍」，但规范附录 D 指出了一个可以省掉大部分运算的性质。' },
              { t: 'p', v: '把搜索看成三个 3 样本块，最右边那块是当前块。' +
                '当「当前块」向右移动 3 个位置后，原本位于 0 / −1 / −2 的样本就成了 −3 / −4 / −5，' +
                '−3 / −4 / −5 变成 −6 / −7 / −8，依此类推。' },
              { t: 'p', v: '关键结论是：**一个块与各候选向量比较得到的 SAD 值，在它右移 3 个位置后仍然可以复用**。' },
              { t: 'p', v: '所以实现上可以保留并复用这 9 个候选向量的 SAD 结果，' +
                '相比「每个块都对所有位置重新搜一遍」能显著减少运算量。' +
                '规范特别强调：==任何实现方式得到的算法结果必须与全量直接搜索一致==。' },
              { t: 'p', v: '另一个自由度是**搜索时机**：' +
                '因为搜索只依赖上一行，从「所有样本就绪」到「决策前一刻」之间任意时刻做都可以。' +
                '不同实现可以根据时序压力自由安排，甚至可以提前一整行完成。' }
            ]
          },
          {
            id: 'buffer',
            title: '速率缓冲要留多大',
            titleEn: 'Rate Buffer Sizing',
            blocks: [
              { t: 'p', v: '这是个看起来简单、实际容易踩坑的问题。' },
              { t: 'p', v: '规范附录 E 给出了针对具体配置的**缓冲模型最小尺寸**公式（`minRateBufferSize`）。' +
                '但规范同时提醒：==真实物理缓冲可能需要比模型更大或更小==，' +
                '因为还要考虑切片复用、消隐期、子流复用、中间级缓冲等因素。' },
              { t: 'p', v: '实践上，实现者必须按「自己支持的最坏 PPS 参数组合」来定缓冲大小，' +
                '保证既不溢出也不欠载。' },
              { t: 'p', v: '还有一个只在这些具体场景才想得到的结论：' +
                '当一条图像里有多条切片并连续传输／接收时，编解码器的真实缓冲里' +
                '**可能同时存在两条切片的数据**（因为传输与解码在时间上重叠）。' +
                '好在对于垂直相邻的切片，所需缓冲量**不会超过单条切片的量**——' +
                '规范给出了相应的上界推导。' }
            ]
          },
          {
            id: 'slice-choice',
            title: '切片怎么划才合理',
            titleEn: 'Choosing Slice Dimensions',
            blocks: [
              { t: 'p', v: '把前面的结论合起来，切片尺寸的选择其实是一组明确的权衡：' },
              { t: 'table', head: ['方向', '收益', '代价'], rows: [
                ['切片**更高**', '压缩效率更好（首行额外比特被摊薄），且**不增加任何缓冲或资源**', '局部更新的粒度更粗；误码影响面更大'],
                ['切片**更窄**（每行多个）', '可以做局部更新、可以做并行解码', '每个切片列都需要独立的速率缓冲；更多缓冲与硬件；建议限制每行切片数'],
                ['切片 = 整幅图像', '规范明确支持，某些应用里是合理选择', '局部更新能力完全丧失']
              ] },
              { t: 'p', v: '规范推荐的折中是 **108 行**：这个高度下首行开销的摊薄已经接近饱和，' +
                '而收益递减的点也差不多到了。' },
              { t: 'callout', kind: 'key', title: '切片是对齐的抓手',
                v: '实际系统里，切片尺寸往往还要跟**面板的局部刷新粒度、帧缓冲的行对齐、' +
                  '以及传输层的包大小**对齐。' +
                  '规范建议：==pic_width / pic_height 尽量取 slice_width / slice_height 的整数倍==，' +
                  '这样就不必付「复制像素补齐」的比特代价。' }
            ]
          },
          {
            id: 'myths',
            title: '几个常见误解',
            titleEn: 'Common Misconceptions',
            blocks: [
              { t: 'dl', items: [
                ['「DSC 是无损压缩」', '不是。它的目标是视觉无损：' +
                  '量化必然引入误差（16 bpc 甚至连色彩变换都不可逆）。' +
                  '严格的数学无损只能靠链路加宽或改用别的方案。'],
                ['「DSC 能提高分辨率上限，所以能替代面板规格」', '不能。' +
                  'DSC 只是把同一像素量的传输压力降下来，' +
                  '面板本身的物理分辨率、驱动能力与刷新能力都不会因此改变。'],
                ['「只要链路支持 DSC，接上就能用」', '不一定。' +
                  '需要链路的应用规范支持 DSC 承载、两端协商一致、' +
                  '并且 PPS 参数与解码器能力匹配（例如解码器是否支持 BP）。' +
                  '若 `block_pred_enable = 1` 而解码器不支持 BP，码流对该解码器就是不可解的。'],
                ['「切片越多越好」', '切片更高的压缩收益更好且不花代价；' +
                  '切片更窄才有并行的好处，但要付多份速率缓冲的代价。'],
                ['「压缩比越高越好」', '压缩比是量与质的交换。' +
                  'DSC 的可调空间在于 bits_per_pixel 与切片尺寸，' +
                  '而这些参数通常由应用规范给出推荐值，不是随手填的。']
              ] },
              { t: 'callout', kind: 'info', title: '一个跨版本的事实',
                v: 'DSC 的 4:4:4 模式从 v1.0 起就很稳定；' +
                  '1.2 之后没有再把算法推向「更强压缩」，而是补齐格式与位深。' +
                  '所以看到「支持 DSC 1.2」时，==真正要问的是支持哪些模式和多少 bpc==。' }
            ]
          }
        ]
      },

      /* ======================================================== 12 速查 */
      {
        id: 'cheat',
        num: '12',
        title: '关键数字速查与全篇回顾',
        titleEn: 'Cheat Sheet and Recap',
        lead: '把散落在各章的硬数字收进一张表，' +
          '再用一条「从像素到比特再回到像素」的路径把全篇串一遍。',
        sections: [
          {
            id: 'numbers',
            title: '硬数字速查',
            titleEn: 'Numbers Worth Memorizing',
            blocks: [
              { t: 'table', head: ['项目', '数值 / 规则'], rows: [
                ['组（group）', '连续 3 个像素（原生模式为 3 个容器像素 = 6 个真实像素）'],
                ['单元（unit）', '一个分量在一个组内的 3 个样本；每单元 = 前缀 + 后缀'],
                ['子流数', '4:4:4 / Native 4:2:0：3 条；Native 4:2:2：4 条'],
                ['复用字（mux word）', '8 / 10 bpc：48 bit；12 / 14 / 16 bpc：64 bit'],
                ['ICH 表', '32 项；索引 5 bit；非首行时索引 25~31 指向上一行'],
                ['ICH 最低码率', '4:4:4：5.333 bpp；Native 4:2:2 / 4:2:0：2.667 bpp'],
                ['BP 向量', '−1 用于判定；实际候选 −3 ~ −10'],
                ['BP 搜索窗口', '上一行的 9 个连续样本；每 3 样本判一次'],
                ['QP 范围', '0 ~ 31；映射到逐位深的量化级 qLevel（右移位数）'],
                ['平坦度调整', 'somewhat flat：QP − 4；very flat：QP = 1 + 2 × (bpc − 8)'],
                ['平坦度信令频率', '每 4 个组（超组）最多一次，且提前一个超组告知'],
                ['bits_per_pixel 字段', '10 bit、4 位小数，步进 1/16 bpp，最大 63.9375'],
                ['PPS', '128 字节（PPS0~PPS127）'],
                ['切片示例', '¼ 图宽 × 108 行，或整图宽 × 108 行'],
                ['chunk 大小', 'ceil(bpp × slice_width ÷ 8) 字节（原生模式用 slice_width ÷ 2）'],
                ['平衡 FIFO', '每子流需 muxWordSize + maxSeSize − 1 个元素；' +
                  '8 bpc RGB 无残缺组时 ≈ 83 单元 ⇒ 249 像素时间延迟'],
                ['吞吐目标', '编码 1 像素／时钟，解码 3 像素／时钟（原生模式翻倍）']
              ] },
              { t: 'callout', kind: 'key', title: '只有一个参数需要"猜"',
                v: '除了平坦度指示，DSC 码流里**不携带任何逐组的编码决策**——' +
                  '预测方式、QP、缓冲水位全部由两端各自计算。' +
                  '这也是 DSC 一致性问题（conformance）能做得非常严格的原因：' +
                  '==同样的 PPS + 同样的码流，就必须产出逐比特相同的像素==。' }
            ]
          },
          {
            id: 'recap',
            title: '全篇回顾：一次编码的完整路径',
            titleEn: 'One Group, End to End',
            blocks: [
              { t: 'p', v: '把全篇压缩成一条流水线，看一个组是怎么走完全程的：' },
              { t: 'list', ordered: true, items: [
                'RGB 输入先转成 **YCoCg-R**（色度比亮度多 1 bit；YCbCr 输入则旁路）；',
                '速率控制给出这一组的 **QP**，映射成亮度与色度的 `qLevel`；',
                '在 **P-mode 与 ICH-mode** 之间做代价比较；' +
                  '如果选 P-mode，再在 **BP / MMAP / MPP** 之间按同一套规则选一个；',
                '计算残差 → **量化** → 熵编码成 DSU-VLC 单元（前缀 + 后缀）；' +
                  '如果走 ICH-mode，则用转义码 + 5 bit 索引；',
                '编码器同时**本地重建**样本，写进行缓存，供下一行预测与 ICH 使用；',
                '三条（或四条）子流按 **SSM** 交织成复用字，按解码器模型排好顺序；' +
                  '若一行有多个切片，再做一次**切片复用**；',
                '整条切片的比特数由 **RC 缓冲模型**守着：' +
                  '必要时用 MPP 撑住最低码率（CBR），切片末尾补 0 对齐；',
                '解码端反向走一遍：解复用 → 熵解码 → 预测/反量化/重建 → 逆色彩变换 → 送给面板。'
              ] },
              { t: 'p', v: '整条路径里没有帧间参考、没有运动估计、没有跨帧状态——' +
                '所有决策都是**逐行、逐组、有限状态**的。' +
                '这正是 DSC 能在极低延迟下实时运行、并且能用不大的电路实现的原因。' }
            ]
          },
          {
            id: 'further',
            title: '延伸阅读与取材说明',
            titleEn: 'Further Reading',
            blocks: [
              { t: 'p', v: '本篇整理自 VESA DSC 标准正文（v1.2a）。如果要往下做实现或调试，建议按下面的顺序推进：' },
              { t: 'dl', items: [
                ['先看第 3 节（Theory of Operation）', '把算法全貌与数据流建立起来，' +
                  '包括图 3-4 编码流程与图 3-5 解码流程。'],
                ['再看第 4 节（Syntax）', 'PPS 每个字段的位宽与语义、图像/切片/子流层的语法。'],
                ['然后读第 6 / 7 节（Encoding / Decoding Process）', '这是规范性章节，' +
                  '每一节都标注了对应的官方 C 参考模型函数名，是调试时最直接的线索。'],
                ['动手时对照 C 模型', '规范明确：==若正文与 C 模型有出入，以 C 模型为准==。'],
                ['附录 E / F 处理参数与一致性', '速率控制参数的推导关系、假想参考解码器（HRD）模型都在这里。']
              ] },
              { t: 'p', v: '最后强调一遍取材边界：本页是**学习性原理整理**，不是规范译文，' +
                '也没有转载规范的表格与插图；' +
                '文中的示意图是按规范描述的机理重绘的，' +
                '所有数值与约束以 VESA 发布的 DSC 标准原文为准。' }
            ]
          }
        ]
      }



    ]
  });
})(typeof window !== 'undefined' ? window : globalThis);
