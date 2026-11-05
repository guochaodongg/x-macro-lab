/* =============================================================================
 * fw-architecture-data.js — Technology Blog 第九篇文章：显示控制器固件架构设计
 *                           （纯数据，无逻辑、不碰 DOM）
 *
 * 取材边界（重要）：
 *   本篇是**通用化的学习性中文整理**，讨论的是嵌入式显示控制器固件里可迁移的
 *   软件工程方法：分层架构、模块化解耦、跨层命名约定、构建组织、板级配置抽象、
 *   初始化顺序、调试与存储规划。全文不引用、不转载任何厂商内部资料，不涉及
 *   任何具体芯片型号、内部源码路径、函数名、寄存器、端口映射表、密钥位置或
 *   Flash 地址；所有表格按通用工程方法重新整理，所有示意图自行重绘。
 *
 * 本文件按「新增文章只需往 BLOGData.posts 里加一条」的约定，在 gpu-matrix-data.js
 * 之后、blog.js 之前加载，把文章对象 push 进 BLOGData.posts，并把本篇专用的
 * 内联 SVG 注册进 BLOGData.figures。正文块结构与 blog-data.js 完全一致。
 *
 * 版权说明：本篇非任何厂商、标准或资料的官方译稿，也未随文转载任何原文插图与
 * 表格；示意与示例均为说明通用原理而构造，实际项目请以自己团队的约定为准。
 * ========================================================================== */
(function (window) {
  'use strict';

  var D = window.BLOGData;
  if (!D || !D.posts || !D.figures) return;

  /* ------------------------------------------------------------- 示意图 SVG */
  /* 全部内联绘制，颜色走 CSS 变量，因此自动跟随明/暗主题，且不请求任何外部资源。 */
  var FIGURES = {

    /* 非分层耦合网 vs 单向分层 */
    couplingVsLayers:
      '<svg class="bl-fig-svg" viewBox="0 0 640 292" role="img" aria-label="非分层架构的互相引用关系与分层架构的单向依赖对比">' +
      '<rect x="0" y="0" width="640" height="292" fill="var(--surface-2)"/>' +
      '<text x="16" y="24" fill="var(--text-soft)" font-size="12" font-weight="600">同一套代码，两种依赖形状：左边是耦合网，右边是单向分层</text>' +
      /* 左侧耦合网 */
      '<text x="16" y="52" fill="var(--warn)" font-size="11" font-weight="600">改造前：目录之间几乎互相 include</text>' +
      '<line x1="72" y1="90" x2="196" y2="90" stroke="var(--border-strong)"/>' +
      '<line x1="72" y1="90" x2="134" y2="168" stroke="var(--border-strong)"/>' +
      '<line x1="196" y1="90" x2="134" y2="168" stroke="var(--border-strong)"/>' +
      '<line x1="72" y1="90" x2="258" y2="168" stroke="var(--err)" stroke-dasharray="4 3"/>' +
      '<line x1="196" y1="90" x2="258" y2="168" stroke="var(--err)" stroke-dasharray="4 3"/>' +
      '<line x1="134" y1="168" x2="258" y2="168" stroke="var(--border-strong)"/>' +
      '<rect x="40" y="76" width="64" height="28" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="72" y="94" fill="var(--text-soft)" font-size="10" text-anchor="middle">APP</text>' +
      '<rect x="164" y="76" width="64" height="28" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="196" y="94" fill="var(--text-soft)" font-size="10" text-anchor="middle">MID</text>' +
      '<rect x="102" y="154" width="64" height="28" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="134" y="172" fill="var(--text-soft)" font-size="10" text-anchor="middle">DRV</text>' +
      '<rect x="226" y="154" width="64" height="28" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="258" y="172" fill="var(--text-soft)" font-size="10" text-anchor="middle">KERNEL</text>' +
      '<text x="40" y="216" fill="var(--text-dim)" font-size="10">改一个目录，四个目录一起重编；</text>' +
      '<text x="40" y="232" fill="var(--text-dim)" font-size="10">谁都能读谁的变量，行为无法预测。</text>' +
      /* 分隔 */
      '<line x1="320" y1="44" x2="320" y2="266" stroke="var(--border)"/>' +
      /* 右侧分层 */
      '<text x="344" y="52" fill="var(--ok)" font-size="11" font-weight="600">改造后：只允许自上而下的单向依赖</text>' +
      '<rect x="352" y="68" width="256" height="34" rx="6" fill="var(--accent)" fill-opacity="0.14" stroke="var(--border-strong)"/>' +
      '<text x="480" y="89" fill="var(--text-soft)" font-size="11" text-anchor="middle">应用层：策略、状态机、用户交互</text>' +
      '<rect x="352" y="112" width="256" height="34" rx="6" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="480" y="133" fill="var(--text-soft)" font-size="11" text-anchor="middle">中间件层：能力编排与业务语义</text>' +
      '<rect x="352" y="156" width="256" height="34" rx="6" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="480" y="177" fill="var(--text-soft)" font-size="11" text-anchor="middle">驱动层：硬件抽象与资源访问</text>' +
      '<rect x="352" y="200" width="256" height="34" rx="6" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="480" y="221" fill="var(--text-soft)" font-size="11" text-anchor="middle">内核 / 公共层：基础服务</text>' +
      '<text x="344" y="258" fill="var(--text-dim)" font-size="10">上层可调用下层；下层绝不反向引用上层。</text>' +
      '</svg>',

    /* 模块内部头 vs 对外公开区 */
    moduleBoundary:
      '<svg class="bl-fig-svg" viewBox="0 0 640 268" role="img" aria-label="模块内部头文件与对外公开信息区的边界划分">' +
      '<rect x="0" y="0" width="640" height="268" fill="var(--surface-2)"/>' +
      '<text x="16" y="24" fill="var(--text-soft)" font-size="12" font-weight="600">模块的边界：实现文件可以互相引用，跨模块只认一个公开区</text>' +
      /* 模块 A */
      '<rect x="16" y="44" width="290" height="180" rx="8" fill="var(--surface)" stroke="var(--accent)"/>' +
      '<text x="30" y="66" fill="var(--accent)" font-size="11" font-weight="600">模块 A（前端输入）</text>' +
      '<rect x="30" y="78" width="122" height="30" rx="5" fill="var(--surface-2)" stroke="var(--border-strong)"/>' +
      '<text x="91" y="97" fill="var(--text-soft)" font-size="10" text-anchor="middle">实现文件 1</text>' +
      '<rect x="162" y="78" width="130" height="30" rx="5" fill="var(--surface-2)" stroke="var(--border-strong)"/>' +
      '<text x="227" y="97" fill="var(--text-soft)" font-size="10" text-anchor="middle">实现文件 2</text>' +
      '<rect x="30" y="118" width="262" height="30" rx="5" fill="var(--warn)" fill-opacity="0.14" stroke="var(--border-strong)"/>' +
      '<text x="161" y="137" fill="var(--warn)" font-size="10" text-anchor="middle">内部头：只允许本模块内互相包含</text>' +
      '<rect x="30" y="158" width="262" height="48" rx="5" fill="var(--accent)" fill-opacity="0.14" stroke="var(--accent)"/>' +
      '<text x="161" y="178" fill="var(--accent)" font-size="10.5" text-anchor="middle">对外公开区（统一的 include 目录）</text>' +
      '<text x="161" y="195" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">只放类型、常量、函数原型，不放全局变量定义</text>' +
      /* 箭头 */
      '<line x1="312" y1="182" x2="344" y2="182" stroke="var(--ok)" stroke-width="2"/>' +
      '<text x="328" y="174" fill="var(--ok)" font-size="10" text-anchor="middle">读</text>' +
      /* 模块 B */
      '<rect x="350" y="44" width="274" height="180" rx="8" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="364" y="66" fill="var(--text-soft)" font-size="11" font-weight="600">模块 B（画质处理）</text>' +
      '<rect x="364" y="78" width="246" height="30" rx="5" fill="var(--surface-2)" stroke="var(--border-strong)"/>' +
      '<text x="487" y="97" fill="var(--text-soft)" font-size="10" text-anchor="middle">只能看到 A 的公开区</text>' +
      '<rect x="364" y="118" width="246" height="30" rx="5" fill="var(--err)" fill-opacity="0.12" stroke="var(--err)"/>' +
      '<text x="487" y="137" fill="var(--err)" font-size="10" text-anchor="middle">看不到的：A 的内部头与全局状态</text>' +
      '<rect x="364" y="158" width="246" height="48" rx="5" fill="var(--surface-2)" stroke="var(--border-strong)"/>' +
      '<text x="487" y="178" fill="var(--text-soft)" font-size="10" text-anchor="middle">需要新能力 → 走公开接口申请，</text>' +
      '<text x="487" y="195" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">由 A 的负责人决定是否开放</text>' +
      '<text x="16" y="248" fill="var(--text-dim)" font-size="10">边界的价值不在「藏代码」，而在于让「谁能改谁的状态」变成一条可以审查的规则。</text>' +
      '</svg>',

    /* 三段式命名拆解 */
    namingParts:
      '<svg class="bl-fig-svg" viewBox="0 0 640 230" role="img" aria-label="跨层统一命名约定的三段式结构与层前缀含义">' +
      '<rect x="0" y="0" width="640" height="230" fill="var(--surface-2)"/>' +
      '<text x="16" y="24" fill="var(--text-soft)" font-size="12" font-weight="600">函数名本身就是一张调用许可表：前缀定层，中段定归属，尾段定动作</text>' +
      '<rect x="16" y="46" width="152" height="42" rx="6" fill="var(--accent)" fill-opacity="0.16" stroke="var(--accent)"/>' +
      '<text x="92" y="66" fill="var(--accent)" font-size="12" text-anchor="middle">层前缀</text>' +
      '<text x="92" y="81" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">drv / hal / api</text>' +
      '<rect x="180" y="46" width="152" height="42" rx="6" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="256" y="66" fill="var(--text-soft)" font-size="12" text-anchor="middle">模块缩写</text>' +
      '<text x="256" y="81" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">pq / sc / fe / au</text>' +
      '<rect x="344" y="46" width="152" height="42" rx="6" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="420" y="66" fill="var(--text-soft)" font-size="12" text-anchor="middle">功能描述</text>' +
      '<text x="420" y="81" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">Coefficient / Mode</text>' +
      '<rect x="508" y="46" width="116" height="42" rx="6" fill="var(--ok)" fill-opacity="0.14" stroke="var(--ok)"/>' +
      '<text x="566" y="66" fill="var(--ok)" font-size="12" text-anchor="middle">动作</text>' +
      '<text x="566" y="81" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">Get / Set / Init</text>' +
      '<text x="16" y="114" fill="var(--text-soft)" font-size="10.5">读名字就能判断：它在哪一层、属于哪个模块、是读还是写、以及自己这层有没有权限调它。</text>' +
      '<rect x="16" y="128" width="608" height="34" rx="6" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="30" y="149" fill="var(--text-soft)" font-size="10.5">应用层：只调「中间件前缀」的函数；看到「驱动前缀」出现在应用层代码里，就是一次越层，应进审查清单。</text>' +
      '<rect x="16" y="170" width="608" height="34" rx="6" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="30" y="191" fill="var(--text-soft)" font-size="10.5">内核 / 公共层：全小写加下划线，不加层前缀——它没有「上层」概念，任何层都可复用。</text>' +
      '<text x="16" y="220" fill="var(--text-dim)" font-size="10">约定要能落地，必须配一条迁移规则：旧代码保持原样，新建函数一律遵守，例外写进清单。</text>' +
      '</svg>',

    /* 分布式构建与配置三件套 */
    buildTree:
      '<svg class="bl-fig-svg" viewBox="0 0 640 266" role="img" aria-label="分布式构建描述文件与产品、板级、编译选项三层配置的关系">' +
      '<rect x="0" y="0" width="640" height="266" fill="var(--surface-2)"/>' +
      '<text x="16" y="24" fill="var(--text-soft)" font-size="12" font-weight="600">构建描述跟着目录走：每层一个入口，每个功能域一个片段</text>' +
      '<rect x="16" y="44" width="196" height="34" rx="6" fill="var(--accent)" fill-opacity="0.14" stroke="var(--accent)"/>' +
      '<text x="114" y="65" fill="var(--text-soft)" font-size="10.5" text-anchor="middle">顶层构建入口</text>' +
      '<line x1="114" y1="78" x2="114" y2="98" stroke="var(--border-strong)"/>' +
      '<line x1="114" y1="98" x2="88" y2="98" stroke="var(--border-strong)"/>' +
      '<line x1="114" y1="98" x2="318" y2="98" stroke="var(--border-strong)"/>' +
      '<line x1="114" y1="98" x2="512" y2="98" stroke="var(--border-strong)"/>' +
      '<line x1="88" y1="98" x2="88" y2="112" stroke="var(--border-strong)"/>' +
      '<line x1="318" y1="98" x2="318" y2="112" stroke="var(--border-strong)"/>' +
      '<line x1="512" y1="98" x2="512" y2="112" stroke="var(--border-strong)"/>' +
      '<rect x="16" y="112" width="146" height="42" rx="6" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="89" y="130" fill="var(--text-soft)" font-size="10.5" text-anchor="middle">应用 / 中间件入口</text>' +
      '<text x="89" y="145" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">聚合各功能域片段</text>' +
      '<rect x="246" y="112" width="146" height="42" rx="6" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="319" y="130" fill="var(--text-soft)" font-size="10.5" text-anchor="middle">驱动层入口</text>' +
      '<text x="319" y="145" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">每个 IP 一个片段</text>' +
      '<rect x="438" y="112" width="146" height="42" rx="6" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="511" y="130" fill="var(--text-soft)" font-size="10.5" text-anchor="middle">库 / 资源入口</text>' +
      '<text x="511" y="145" fill="var(--text-dim)" font-size="9.5" text-anchor="middle">算法、字库、界面资源</text>' +
      '<text x="16" y="182" fill="var(--text-soft)" font-size="11" font-weight="600">配置三件套（互不混写）</text>' +
      '<rect x="16" y="192" width="188" height="30" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="110" y="211" fill="var(--text-soft)" font-size="10" text-anchor="middle">产品配置：功能开关</text>' +
      '<rect x="216" y="192" width="188" height="30" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="310" y="211" fill="var(--text-soft)" font-size="10" text-anchor="middle">板级配置：引脚与器件</text>' +
      '<rect x="416" y="192" width="188" height="30" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="510" y="211" fill="var(--text-soft)" font-size="10" text-anchor="middle">编译选项：优化与告警</text>' +
      '<text x="16" y="244" fill="var(--text-dim)" font-size="10">新增一个源文件，只改它所在功能域的片段；换一块板，只换板级配置。两者不要互相污染。</text>' +
      '</svg>',

    /* 物理端口顺序与逻辑索引解耦 */
    portMap:
      '<svg class="bl-fig-svg" viewBox="0 0 640 238" role="img" aria-label="物理输入端口顺序与软件逻辑流索引之间通过映射表解耦">' +
      '<rect x="0" y="0" width="640" height="238" fill="var(--surface-2)"/>' +
      '<text x="16" y="24" fill="var(--text-soft)" font-size="12" font-weight="600">同一块板改丝印顺序，不应该改一行业务逻辑</text>' +
      '<text x="16" y="54" fill="var(--text-dim)" font-size="10.5">物理侧（板级配置，按实际布线顺序）</text>' +
      '<rect x="16" y="64" width="120" height="34" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="76" y="85" fill="var(--text-soft)" font-size="10.5" text-anchor="middle">端口 P0</text>' +
      '<rect x="146" y="64" width="120" height="34" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="206" y="85" fill="var(--text-soft)" font-size="10.5" text-anchor="middle">端口 P1</text>' +
      '<rect x="276" y="64" width="120" height="34" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="336" y="85" fill="var(--text-soft)" font-size="10.5" text-anchor="middle">端口 P2</text>' +
      '<rect x="406" y="64" width="120" height="34" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="466" y="85" fill="var(--text-soft)" font-size="10.5" text-anchor="middle">端口 P3</text>' +
      '<rect x="16" y="112" width="608" height="36" rx="6" fill="var(--accent)" fill-opacity="0.14" stroke="var(--accent)"/>' +
      '<text x="320" y="135" fill="var(--accent)" font-size="10.5" text-anchor="middle">映射表：逻辑索引 → 物理端口（唯一的转换点，由板级配置提供）</text>' +
      '<text x="16" y="176" fill="var(--text-dim)" font-size="10.5">逻辑侧（业务代码，按用户可见顺序）</text>' +
      '<rect x="16" y="186" width="120" height="34" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="76" y="207" fill="var(--text-soft)" font-size="10.5" text-anchor="middle">输入 1</text>' +
      '<rect x="146" y="186" width="120" height="34" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="206" y="207" fill="var(--text-soft)" font-size="10.5" text-anchor="middle">输入 2</text>' +
      '<rect x="276" y="186" width="120" height="34" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="336" y="207" fill="var(--text-soft)" font-size="10.5" text-anchor="middle">输入 3</text>' +
      '<rect x="406" y="186" width="120" height="34" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="466" y="207" fill="var(--text-soft)" font-size="10.5" text-anchor="middle">输入 4</text>' +
      '<text x="536" y="207" fill="var(--text-dim)" font-size="10">换板只改表</text>' +
      '</svg>',

    /* 自底向上的初始化时序 */
    initFlow:
      '<svg class="bl-fig-svg" viewBox="0 0 640 276" role="img" aria-label="嵌入式显示固件自底向上的初始化顺序与各阶段的前置依赖">' +
      '<rect x="0" y="0" width="640" height="276" fill="var(--surface-2)"/>' +
      '<text x="16" y="24" fill="var(--text-soft)" font-size="12" font-weight="600">初始化顺序不是习惯问题，而是依赖问题：下层没就绪，上层读到的都是假值</text>' +
      '<line x1="46" y1="48" x2="46" y2="246" stroke="var(--border-strong)"/>' +
      '<rect x="60" y="48" width="548" height="34" rx="6" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="74" y="69" fill="var(--text-soft)" font-size="10.5">① 时钟 / 内存 / 基础服务：先让系统能稳定运行与分配内存</text>' +
      '<text x="16" y="69" fill="var(--text-dim)" font-size="10">t0</text>' +
      '<rect x="60" y="90" width="548" height="34" rx="6" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="74" y="111" fill="var(--text-soft)" font-size="10.5">② 硬件抽象与器件探测：引脚、总线、显示参数、EDID 等只读信息</text>' +
      '<text x="16" y="111" fill="var(--text-dim)" font-size="10">t1</text>' +
      '<rect x="60" y="132" width="548" height="34" rx="6" fill="var(--accent)" fill-opacity="0.12" stroke="var(--accent)"/>' +
      '<text x="74" y="153" fill="var(--text-soft)" font-size="10.5">③ 能力编排：把探测结果翻译成可用的输入 / 输出能力集合</text>' +
      '<text x="16" y="153" fill="var(--text-dim)" font-size="10">t2</text>' +
      '<rect x="60" y="174" width="548" height="34" rx="6" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="74" y="195" fill="var(--text-soft)" font-size="10.5">④ 应用状态与界面：初始化窗口、输入选择、菜单与用户偏好</text>' +
      '<text x="16" y="195" fill="var(--text-dim)" font-size="10">t3</text>' +
      '<rect x="60" y="216" width="548" height="34" rx="6" fill="var(--ok)" fill-opacity="0.12" stroke="var(--ok)"/>' +
      '<text x="74" y="237" fill="var(--text-soft)" font-size="10.5">⑤ 开放事件与中断：允许热插拔、按键、定时与异步消息进入主循环</text>' +
      '<text x="16" y="237" fill="var(--text-dim)" font-size="10">t4</text>' +
      '<text x="60" y="266" fill="var(--warn)" font-size="10">最常见的两类故障：中断开得太早（读到半初始化状态），或能力集合建立前就查端口。</text>' +
      '</svg>',

    /* Flash 分区规划的一般方法 */
    flashLayout:
      '<svg class="bl-fig-svg" viewBox="0 0 640 250" role="img" aria-label="固件存储分区规划的一般方法：镜像、校准数据、密钥、共享资源与安全区" >' +
      '<rect x="0" y="0" width="640" height="250" fill="var(--surface-2)"/>' +
      '<text x="16" y="24" fill="var(--text-soft)" font-size="12" font-weight="600">分区规划先算「谁会被单独擦写」，再按擦除块边界排布（示意，非具体地址）</text>' +
      '<rect x="16" y="44" width="608" height="42" rx="6" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<rect x="16" y="44" width="248" height="42" rx="6" fill="var(--accent)" fill-opacity="0.18"/>' +
      '<text x="140" y="62" fill="var(--text-soft)" font-size="10.5" text-anchor="middle">引导区 + 镜像 A（可整体升级）</text>' +
      '<rect x="264" y="44" width="180" height="42" fill="var(--accent)" fill-opacity="0.1"/>' +
      '<text x="354" y="62" fill="var(--text-soft)" font-size="10.5" text-anchor="middle">镜像 B（双镜像回滚）</text>' +
      '<text x="470" y="62" fill="var(--text-dim)" font-size="10">两份镜像都要留足余量</text>' +
      '<text x="16" y="110" fill="var(--text-soft)" font-size="10.5">按「擦除粒度」隔离小数据，避免改 1 字节却擦掉一整块：</text>' +
      '<rect x="16" y="120" width="146" height="36" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="89" y="142" fill="var(--text-soft)" font-size="10" text-anchor="middle">校准数据（小、频繁）</text>' +
      '<rect x="172" y="120" width="146" height="36" rx="5" fill="var(--warn)" fill-opacity="0.16" stroke="var(--warn)"/>' +
      '<text x="245" y="142" fill="var(--warn)" font-size="10" text-anchor="middle">密钥区（只读、隔离）</text>' +
      '<rect x="328" y="120" width="146" height="36" rx="5" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<text x="401" y="142" fill="var(--text-soft)" font-size="10" text-anchor="middle">共享资源（两份镜像复用）</text>' +
      '<rect x="484" y="120" width="140" height="36" rx="5" fill="var(--ok)" fill-opacity="0.14" stroke="var(--ok)"/>' +
      '<text x="554" y="142" fill="var(--ok)" font-size="10" text-anchor="middle">保留 / 安全区</text>' +
      '<text x="16" y="182" fill="var(--text-dim)" font-size="10">共享资源被两份镜像引用，必须放在两份镜像都不会覆盖的位置；否则升级后界面资源会失效。</text>' +
      '<text x="16" y="202" fill="var(--text-dim)" font-size="10">小数据区各自独占一个擦除块，并给未来扩容预留相邻空间，避免后期搬家时牵动引导代码。</text>' +
      '<text x="16" y="232" fill="var(--text-soft)" font-size="10.5">顺序：先估镜像体积与增长率 → 再排小数据区 → 最后把剩余空间划为保留区，并把结果写进板级配置。</text>' +
      '</svg>'
  };

  Object.keys(FIGURES).forEach(function (k) { D.figures[k] = FIGURES[k]; });

  /* ---------------------------------------------------------------- 术语表 */
  var GLOSSARY = [
    ['Layering', '分层架构', '把系统按职责切成若干层，约定只能自上而下依赖；目的在于让变更影响范围可控、让模块可被替换。'],
    ['Coupling', '耦合度', '一个模块对另一个模块内部细节的依赖程度；互相 include、共享全局变量都是高耦合的典型信号。'],
    ['Circular Dependency', '循环依赖', 'A 依赖 B、B 又直接或通过中间模块依赖 A；会导致编译顺序脆弱、初始化顺序无解、单元测试难以隔离。'],
    ['Dependency Graph', '依赖图', '把文件与目录之间的包含、调用关系画成图，用于发现环、扇入扇出异常和不应存在的跨层边。'],
    ['API Contract', '接口契约', '模块对外承诺的函数签名、数据类型、取值范围与时序约束；契约之外的行为不算承诺，调用方不得依赖。'],
    ['Single Responsibility', '单一职责', '一个模块只对一个变化原因负责；功能域划分的第一判据是「谁会因为需求变更而改它」。'],
    ['Interface Segregation', '接口隔离', '只把调用方真正需要的接口暴露出去，避免一张万能头文件把内部实现细节一起泄漏。'],
    ['Module', '模块', '一组共同演进的实现文件加一套对外接口；模块内部可以自由重构，模块之间只能通过公开接口交互。'],
    ['Public Header', '对外头文件', '放在统一公开区的头文件，只声明类型、常量与函数原型，供上层或其他模块包含。'],
    ['Internal Header', '内部头文件', '只在模块内部包含的头文件，可存放私有结构、宏与静态状态；被外部引用即视为边界被破坏。'],
    ['Include Guard', '头文件保护宏', '防止同一头文件在一个编译单元里被重复包含；配合「最小包含」原则减少无谓的重编。'],
    ['Global State', '全局状态', '跨模块可见的可变数据；最容易被意外改写，应通过访问函数收口并明确所有权。'],
    ['Accessor', '访问函数', '读写内部状态的唯一入口，可在其中做范围校验、加锁、日志与变更通知。'],
    ['Ownership', '所有权', '明确「哪个模块负责创建、修改、销毁一份数据」；边界纠纷大多源于所有权没写清楚。'],
    ['Naming Convention', '命名约定', '用统一规则把层次、模块、动作编码进函数名，使调用权限与归属在代码评审时一眼可判。'],
    ['Snake Case', '下划线命名', '全小写单词以下划线连接，常见于内核、公共库与 C 语言底层代码。'],
    ['Camel Case', '驼峰命名', '单词首字母大写连写，常见于应用层与面向对象风格代码；同一层内必须保持单一风格。'],
    ['Prefix', '层前缀', '函数名开头用于标识所属层的短标记；出现不该出现的层前缀即意味着越层调用。'],
    ['Action Suffix', '动作后缀', '函数名末尾的动词，如 Get、Set、Init、Enable；把读写副作用写进名字能减少误用。'],
    ['Refactoring', '重构', '在不改变外部行为的前提下调整内部结构；分层改造应分批进行，并用回归测试证明行为不变。'],
    ['Legacy Exception', '历史例外', '为兼容既有代码而允许不遵守新约定的部分；必须显式登记清单，否则约定会逐步失效。'],
    ['Distributed Build', '分布式构建', '每层、每个功能域各自维护构建片段，顶层只做聚合；新增文件的影响被限制在局部。'],
    ['Build Fragment', '构建片段', '描述一组源文件如何编译的描述文件，由所属目录的入口包含，避免顶层文件无限膨胀。'],
    ['Product Config', '产品配置', '决定某款产品启用哪些功能的开关集合，通常随产品型号变化，与具体电路板无关。'],
    ['Board Config', '板级配置', '描述引脚复用、器件地址、端口顺序、显示参数等与实物布线强相关的配置，换板才需要改。'],
    ['Compiler Option', '编译选项', '优化等级、告警策略、调试符号等与构建工具链相关的选项，应与功能开关分开管理。'],
    ['BSP', 'BSP（板级支持包）', '把芯片与板级差异封装成统一接口的一组代码，使上层业务不感知具体硬件版本。'],
    ['Port Mapping', '端口映射', '物理端口编号与软件逻辑索引之间的转换表；是硬件改版与 UI 顺序之间的唯一转换点。'],
    ['HPD', 'HPD（热插拔检测）', '输入侧连接状态变化信号；处理这类异步事件必须晚于能力集合与状态机初始化。'],
    ['ISR', 'ISR（中断服务例程）', '响应硬件事件的短小例程；只做标记与搬数据，不做耗时决策，避免拖住主循环。'],
    ['Main Loop', '主循环', '按顺序处理事件、状态迁移与界面刷新的运行期骨架；与中断之间通过队列或标志位通信。'],
    ['Mailbox', '邮箱机制', '两个执行上下文之间用共享内存加标志位传递消息的通信方式，需明确写入方、读取方与就绪语义。'],
    ['I2C Bit-banging', '软件模拟 I²C', '用普通 GPIO 按时序翻转来模拟总线；灵活但占用 CPU，适合低频、引脚受限或调试场景。'],
    ['Hardware I2C', '硬件 I²C 控制器', '由专用外设产生时序，CPU 只需提交事务；适合频繁访问与对时序严格要求的器件。'],
    ['DDC', 'DDC（显示数据通道）', '主机读取显示器能力数据的通道；读回的内容通常先缓存，再由上层统一解析。'],
    ['EDID', 'EDID（扩展显示标识数据）', '显示器声明自身能力的结构化数据；解析结果应在初始化早期确定，避免多处重复读取产生不一致。'],
    ['Bootloader', '引导程序', '负责最早期硬件初始化与镜像选择的代码；它的存储布局假设必须与分区规划保持一致。'],
    ['Dual Image', '双镜像', '保留两份可启动固件，升级失败时回滚；代价是占用空间接近翻倍，需提前纳入容量预算。'],
    ['Calibration Data', '校准数据', '出厂或运行时测得的小体积参数；应放在独立擦除块，以免升级镜像时被抹掉。'],
    ['Key Storage', '密钥区', '存放内容保护等敏感材料的区域；只读、隔离、单独对齐擦除边界，且不与可变数据共享块。'],
    ['Sector Alignment', '扇区对齐', '让每个可独立更新的区域落在擦除块边界上，避免写小块时连带擦掉相邻数据。'],
    ['Version Banner', '版本横幅', '启动日志里打印的版本、构建时间、配置标识与校验值，是现场定位「跑的到底是哪一版」的第一依据。'],
    ['Static Analysis', '静态分析', '不运行程序，通过扫描源码检查越层调用、未使用依赖、未初始化变量等结构性问题的手段。']
  ];

  /* ------------------------------------------------------------------ 文章 */
  D.posts.push({
    id: 'fw-architecture',
    title: '显示控制器固件架构设计',
    titleEn: 'Display Controller Firmware Architecture: Layering, Modularization, Naming Conventions, Build Organization and Board Abstraction',
    subtitle: '一份面向嵌入式显示固件工程师的通用架构笔记：为什么老代码会变成互相引用的耦合网，' +
      '怎样用分层与模块化把它收回来，如何用命名约定把调用权限写进函数名，' +
      '以及构建、板级配置、初始化顺序、调试与存储分区各自应该守住的边界。',
    category: '固件与架构',
    tags: ['分层架构', '模块化', '命名约定', '构建系统', '板级配置', '初始化流程', '存储分区', '显示固件'],
    source: {
      name: '公开软件工程参考资料',
      label: 'Linux Kernel 编码风格文档 · 通用分层与模块化方法',
      url: 'https://docs.kernel.org/process/coding-style.html',
      note: '本篇是面向中文工程师的学习性中文整理，非任何厂商、标准或资料的官方译稿（非官方译文）；' +
        '全文只讨论可迁移的通用软件工程方法，不引用、不转载任何厂商内部资料或保密文档，' +
        '也不涉及具体芯片型号、源码路径、函数名、寄存器、端口映射表、密钥位置与存储地址。' +
        '文中表格按通用工程方法重新整理，示例为说明原理而构造，实际项目请以自己团队约定与实测为准。'
    },
    license: '本页为中文原创的学习性整理，未转载任何原文、原始表格与插图；' +
      '全部示意图与表格均按所述通用原理自行重绘与重排（纯内联 SVG，不请求任何外部资源）。' +
      '文中出现的层名、模块名与函数名式样均为说明性占位符，不指向任何具体产品实现。',
    summary: '把一份「新编码规范」类培训材料里真正可迁移的部分抽出来，重写成不依赖任何具体平台的架构笔记：' +
      '第一部分讲非分层代码的耦合症状与分层的依赖契约、代价、体检方法；' +
      '第二部分讲按功能域切模块、内部头与对外公开区的边界、全局状态所有权；' +
      '第三部分给出层前缀 + 模块缩写 + 功能描述 + 动作的四段命名法与新旧代码迁移规则；' +
      '第四部分覆盖分布式构建、产品 / 板级 / 编译选项三层配置、头文件分层与端口映射解耦；' +
      '第五部分梳理自底向上的初始化时序、前置依赖、运行期职责与版本横幅；' +
      '最后讨论调试命令护栏、硬件与软件 I²C 的取舍、显示数据通道缓冲一致性，' +
      '以及按擦除块对齐的镜像 / 校准 / 密钥 / 共享资源分区方法，并附一份迁移自查清单。',
    glossary: GLOSSARY,
    chapters: [
      {
        id: 'layering',
        num: '1',
        title: '从耦合网到分层架构',
        titleEn: 'From a Coupling Web to a Layered Architecture',
        lead: '老项目最难改的地方，往往不是某个算法写得多绕，而是目录之间互相引用：应用层直接读驱动的全局变量，底层又反过来包含上层头文件去拿一个状态。本文从这种耦合网出发，讨论分层究竟在解决什么问题、要付出什么代价，以及怎么量化地判断改造是否真的生效。',
        sections: [
          {
            id: 'coupling-web',
            title: '非分层架构的典型症状',
            titleEn: 'Symptoms of a Non-Layered Codebase',
            blocks: [
              { t: 'p', v: '没有分层规划的代码库，最初的目录划分通常按「文件类型」或「历史提交顺序」自然长成。功能越叠越多之后，调用图会变成一张网：把依赖关系限制在**四层以内**画出来，已经密到看不清主干，几乎所有目录都直接或间接地引用其他目录。' },
              { t: 'p', v: '典型的三组表现：定制层引用内核层与驱动层，而这两个目录又反过来引用定制层；驱动层引用内核内容的同时，内核也引用驱动；某个「公共」目录里塞满了只有一两个调用方使用的板级细节。' },
              { t: 'list', items: [
                '**编译耦合**：改一个低层头文件，整个工程大半重新编译，增量构建基本失效；',
                '**行为耦合**：一个全局变量可能有五处写入点，出问题只能靠全局搜索加断点猜；',
                '**测试耦合**：想单独测一个功能，必须把整套硬件初始化跑起来，因为它的依赖链一直通到板级；',
                '**交接耦合**：新人无法从目录结构判断「我这个需求应该改哪里」，只能问人。'
              ] },
              { t: 'fig', id: 'couplingVsLayers', caption: '左边是互相 include 的耦合网，右边是自上而下的单向分层；改造的目标是形状，不是目录名。' },
              { t: 'callout', kind: 'key', title: '判断标准只有一条', v: '依赖是否**单向**。目录叫什么、分几层都是次要的；只要还存在下层反向引用上层，分层就只是文档里的一张图，没有落到代码里。' },
              { t: 'p', v: '值得强调的是：耦合网不是「写得烂」，而是长期在交付压力下局部最优的累积结果。每次为了赶进度加一条捷径都合理，累积到某个规模后，系统会突然越过可维护性的临界点。' }
            ]
          },
          {
            id: 'layer-contract',
            title: '分层的目标与依赖契约',
            titleEn: 'Goals and the Dependency Contract',
            blocks: [
              { t: 'p', v: '分层要做的事可以压缩成一句：==把「谁能依赖谁」写成一条可以自动检查的规则==。典型划分为四层，应用层负责策略与用户交互，中间件层负责把硬件能力编排成业务语义，驱动层负责硬件抽象与资源访问，内核与公共层提供基础服务。' },
              { t: 'table', head: ['层', '主要职责', '允许依赖', '明确禁止'], rows: [
                ['应用层', '状态机、输入选择、菜单与用户偏好', '中间件层的公开接口', '直接读写寄存器、直接包含驱动内部头'],
                ['中间件层', '能力编排、格式协商、跨模块流程', '驱动层公开区与公共层', '反向暴露本层内部状态给驱动'],
                ['驱动层', '器件访问、中断封装、资源句柄', '公共层与芯片抽象层', '包含应用层头文件、依赖某个产品型号'],
                ['内核 / 公共层', '内存、定时器、日志、通用容器', '仅自身与标准库', '带任何层前缀、引用任何上层概念']
              ] },
              { t: 'p', v: '**接口契约**里最容易漏掉的是数据的依赖方向。函数只从上往下调还不够：如果下层在回调里直接把上层结构体指针解引用，或者下层读取一个由上层定义的全局配置变量，方向其实已经被反转了。' },
              { t: 'p', v: '解决办法是把跨层数据也契约化：下层只接受基础类型或由下层自己定义的不透明句柄，需要上层信息时通过注册接口传入回调或配置，而不是反向 include。' },
              { t: 'callout', kind: 'info', title: '一个可操作的自检', v: '随机挑十个源文件，看它们的包含列表里有没有出现「比自己更高层」的目录名。零命中才算契约成立；有命中就先记入例外清单，再逐条消除。' }
            ]
          },
          {
            id: 'layer-cost',
            title: '分层的代价与允许的旁路',
            titleEn: 'Costs and Legitimate Shortcuts',
            blocks: [
              { t: 'p', v: '分层不是免费的。每多一层就多一次函数转发、多一份接口文档、多一处需要同步修改的声明。对**每帧都要跑**的画质处理路径，或者在中断上下文里做的高频小操作，额外的间接调用与参数校验会真实地占用预算。' },
              { t: 'list', items: [
                '时延敏感路径：允许在层内做批量调用，把多次 Get 合并成一次带结构体的查询，而不是让每层都拆开调；',
                '中断上下文：中断里只做标记与数据搬运，把需要跨层决策的部分推到主循环，避免在中断里走完整条分层链；',
                '极小的纯函数：数学变换、位操作这类无状态工具直接放公共层，谁都可以用，不必为它单独造一层接口；',
                '调试与诊断：允许只读旁路，但要有编译开关隔离，正式镜像里不携带越层访问。'
              ] },
              { t: 'p', v: '关键是**旁路要显式**。遇到性能瓶颈时，先测量再决定；若确实需要跨层直连，应写成一条登记在案、带注释说明原因与回归条件的例外，而不是悄悄 include 一个内部头文件。' },
              { t: 'callout', kind: 'warn', title: '最常见的反模式', v: '以「性能」为由，把应用层需要的配置直接做成驱动层可读的全局变量。它短期最快，长期会让任何一次板级改动都必须同步改三处，并且没人敢删那个变量。' },
              { t: 'p', v: '换句话说，分层约束的是**常态路径**，不是禁止一切例外；但例外的成本必须被看见，否则例外会慢慢变成新的常态。' }
            ]
          },
          {
            id: 'dependency-audit',
            title: '用依赖图做体检',
            titleEn: 'Auditing with a Dependency Graph',
            blocks: [
              { t: 'p', v: '改造前先量化，改造后才说得清效果。用文档生成工具或简单的脚本扫一遍包含关系，输出目录级依赖图，并限制展开深度，避免图本身被噪声淹没。深度限制在四层左右，通常就足以暴露绝大多数结构性环。' },
              { t: 'dl', items: [
                ['环的数量', '目录级强连通分量的个数；目标是从「几乎全部目录在一个环里」降到零。'],
                ['跨层边', '从下层指向上层、或跨过相邻层的包含关系条数；按周记录下降曲线。'],
                ['扇入 / 扇出', '被过多目录依赖的头文件往往是隐式「上帝对象」，应拆分或下沉。'],
                ['重编半径', '改一个低层头文件后触发重编的文件数，是最直观的构建体验指标。'],
                ['例外清单长度', '允许暂时不合规的条目数；只许变短，不许悄悄变长。']
              ] },
              { t: 'p', v: '把这些指标接到持续集成里做静态检查，比靠代码评审肉眼抓越层调用可靠得多。检查规则可以很简单：按目录名映射层号，扫描包含语句，只要出现层号反向或跨级，就报一条警告。' },
              { t: 'callout', kind: 'ok', title: '改造节奏', v: '一次只动一个边界：先切断最粗的那条反向依赖，跑完回归，再切下一条。==分层改造最怕的是大爆炸式重写==，因为行为等价性在耦合网里根本无法一次证明。' }
            ]
          }
        ]
      },
      {
        id: 'modularity',
        num: '2',
        title: '模块化：把层切成可独立演进的单元',
        titleEn: 'Modularity: Splitting a Layer into Independently Evolving Units',
        lead: '分层解决纵向的依赖方向，模块化解决横向的边界。一个层里往往同时住着输入前端、画质处理、缩放输出、音频与外设，如果不划清彼此的可见范围，层内很快会长出第二张耦合网。这一章讨论怎么切、怎么守、以及谁有权决定开放什么。',
        sections: [
          {
            id: 'domain-split',
            title: '按功能域划分模块',
            titleEn: 'Splitting by Functional Domain',
            blocks: [
              { t: 'p', v: '切分的第一判据不是「代码量差不多」，而是**变化原因是否相同**：会因为同一类需求一起改的文件，放到同一个模块；改动原因彼此独立的文件，即使目前互相调得很多，也应该分开。' },
              { t: 'table', head: ['功能域', '典型职责', '主要变化来源'], rows: [
                ['输入前端', '输入检测、格式识别、连接状态', '新增接口类型、新的链路速率'],
                ['画质处理', '色彩、对比度、动态范围、降噪', '算法迭代、面板特性差异'],
                ['缩放与输出', '时序生成、画面合成、面板驱动', '面板型号、刷新率与分辨率组合'],
                ['音频', '音频路由、格式协商、音量策略', '音频格式与输出设备变化'],
                ['外设与系统', '按键、指示灯、总线、时钟与电源', '板级改版、器件替换']
              ] },
              { t: 'p', v: '划分完成后要给每个模块指定**负责人**。这不是管理形式，而是技术需要：只有一个人对「这个模块对外承诺什么」负最终责任，接口才不会被所有人随手加字段。' },
              { t: 'fig', id: 'moduleBoundary', caption: '模块内部实现可以自由互引，跨模块只认统一的对外公开区；公开区由模块负责人维护。' },
              { t: 'p', v: '还有一个容易被忽略的域：**公共资源**。字库、界面图片、字符串表这类内容会被多个模块引用，既不属于前端也不属于画质，应单独成域，并在存储规划里单独安排位置。' }
            ]
          },
          {
            id: 'internal-headers',
            title: '内部头与对外头的分界',
            titleEn: 'Internal Headers vs Public Headers',
            blocks: [
              { t: 'p', v: '同一个模块内的多个实现文件，可以互相包含本模块的内部头，共享私有结构、宏与状态声明。但这些内部头**不允许被模块外的任何文件直接包含**——一旦被包含，模块就等于没有边界，全局变量可能被意外改写，内部函数也可能被误调。' },
              { t: 'list', items: [
                '内部头：私有类型定义、内部宏、静态函数声明、仅限本模块的状态；',
                '对外头：调用方需要的类型、常量、枚举与函数原型，不含实现细节；',
                '公共头：跨多个域都需要的基础定义，放公共层，任何层都可包含；',
                '禁止事项：对外头里定义变量、暴露内部结构体字段、包含一堆用不上的其他头。'
              ] },
              { t: 'p', v: '「对外」还有一层含义需要说清：驱动层的公开区主要面向**中间件层**，不是给应用层直接看的。如果某个信息连应用层也要用，说明它其实属于全系统公共定义，应该放到公共层，而不是把驱动公开区一路开放到顶。' },
              { t: 'callout', kind: 'warn', title: '一个高频事故', v: '为了省事，在对外头里 `extern` 一个全局结构体。调用方于是开始直接改字段，模块内部的不变量（例如「频率与时序必须成对更新」）瞬间失效，而这类 bug 通常只在特定分辨率下复现。' }
            ]
          },
          {
            id: 'public-inc',
            title: '把对外信息集中到一个公开区',
            titleEn: 'A Single Public Include Area',
            blocks: [
              { t: 'p', v: '所有模块愿意开放的东西，集中放到一个统一的公开包含目录。上层要查「这个模块能给我什么」，只需要看一个地方；模块要收回某个接口，也只需要查一个地方有谁在用。' },
              { t: 'p', v: '这个做法附带一个很实用的收益：**接口评审有了物理载体**。新增一个对外声明，diff 里必然出现在这个目录，评审者不需要通读整个实现就能判断「这个能力该不该开放、名字是否与其他域冲突、参数是否用了上层不理解的类型」。' },
              { t: 'table', head: ['放在公开区', '不要放在公开区'], rows: [
                ['函数原型与返回码定义', '全局变量定义（应改为访问函数）'],
                ['跨模块传递的数据类型', '只在模块内使用的私有结构'],
                ['能力位与配置枚举', '寄存器位域与硬件地址常量'],
                ['版本与兼容性说明', '实现文件的包含链与编译宏']
              ] },
              { t: 'callout', kind: 'key', title: '开放的最小粒度', v: '模块负责人决定哪些变量、类型、结构对外可见，并统一收进公开区。**默认不开放**，被明确要求时才新增一条；反过来做（先全开放再收）几乎必然收不回来。' }
            ]
          },
          {
            id: 'global-state',
            title: '全局状态与写权限收口',
            titleEn: 'Owning and Guarding Global State',
            blocks: [
              { t: 'p', v: '耦合网里最危险的不是函数调用，而是共享可变状态。读操作再多也不会互相破坏，写操作只要有两个以上来源，就必然需要一份「谁在什么时候能写」的隐含协议，而这份协议通常没人写下来。' },
              { t: 'dl', items: [
                ['所有权', '每份状态只属于一个模块，由它负责创建、校验、修改与销毁。'],
                ['单一写入点', '其他模块需要改变状态时，调用属主提供的设置函数，由属主统一做范围检查与副作用处理。'],
                ['快照读取', '频繁读取的配置用「一次取一份快照」代替多次单点 Get，避免读到半更新状态。'],
                ['变更通知', '状态改变后由属主发事件，而不是让每个关心它的模块各自轮询。'],
                ['并发护栏', '中断与主循环都可能触碰的状态，用关中断、原子标志或队列明确临界区。']
              ] },
              { t: 'p', v: '收口之后，很多以前很难查的问题会变成日志里的一行：设置函数里加一条「旧值 → 新值 + 调用来源」的记录，谁在异常时刻改了配置一目了然。' },
              { t: 'callout', kind: 'ok', title: '可验证的完成标准', v: '全工程搜索跨模块写全局变量的语句，结果为零；所有写操作都能追到属主模块的设置函数。做到这一点，模块才算真正可独立演进。' }
            ]
          }
        ]
      },
      {
        id: 'naming',
        num: '3',
        title: '命名约定：让调用关系从名字里读出来',
        titleEn: 'Naming Conventions That Encode Call Permission',
        lead: '架构约束如果只能靠文档和自觉，早晚会被绕过。一个成本极低、收益极高的办法是把约定写进函数名：看到名字就知道它在哪一层、属于哪个模块、是读还是写、以及自己这层有没有权限调用它。',
        sections: [
          {
            id: 'prefix-by-layer',
            title: '前缀表示所属层',
            titleEn: 'A Prefix Tells You the Layer',
            blocks: [
              { t: 'p', v: '统一各层函数的第一段：驱动层用一种前缀，中间件层用另一种，应用层再用一种；底层公共代码不加前缀。这样「越层调用」在代码评审里变成一种视觉信号，而不是需要跑工具才能发现的问题。' },
              { t: 'table', head: ['层', '前缀式样', '典型动作', '允许的调用方'], rows: [
                ['应用层', 'app 或产品自定义前缀', '处理事件、切换状态、刷新界面', '仅应用层内部'],
                ['中间件层', 'api / mw 类前缀', '编排能力、查询状态、下发配置', '应用层'],
                ['驱动层', 'drv / hal 类前缀', '读写器件、注册回调、管理句柄', '中间件层'],
                ['内核 / 公共层', '无前缀，全小写', '内存、定时器、基础运算', '任意层']
              ] },
              { t: 'p', v: '这里有个现实约束：某些跨产品线复用的驱动，历史上一直沿用了中间件的函数式样。硬改会牵动大量既有代码，收益却只是命名统一。合理做法是**把这类情况登记为显式例外**，保留原风格，只要求新增函数遵守新约定。' },
              { t: 'fig', id: 'namingParts', caption: '前缀定层、模块缩写定归属、功能描述定意图、动作后缀定副作用；四段合起来就是一张调用许可表。' },
              { t: 'p', v: '例外清单要写清三件事：涉及哪个目录、为什么不能改、什么时候复核。没有复核日期的例外，通常三年后还在，并且被新人当成规范模仿。' }
            ]
          },
          {
            id: 'three-part-name',
            title: '模块缩写 + 功能描述 + 动作',
            titleEn: 'Module, Description, Action',
            blocks: [
              { t: 'p', v: '前缀之后跟模块缩写，再跟一段能说明意图的功能描述，最后用动作词收尾。`Get` 表示只读、`Set` 表示写入、`Init` 表示一次性初始化、`Enable` 表示状态开关、`Is` 表示布尔判定。' },
              { t: 'dl', items: [
                ['模块缩写要短且唯一', '两到四个字母，全工程建立一张对照表；缩写撞车会让「按名字定位文件」失效。'],
                ['功能描述用名词短语', '写清操作对象，不要用 Data、Info、Ctrl 这类放之四海皆准的词。'],
                ['动作词区分副作用', '只读与写入分用不同后缀，评审时一眼看出这次调用会不会改状态。'],
                ['不要在名字里编码类型', '参数类型变了名字就要改，属于给自己埋维护债。'],
                ['不要用缩写掩盖语义', '除行业通用缩写外，宁可多写几个字母，也别让新人靠猜。']
              ] },
              { t: 'p', v: '统一命名之后会得到一个很实在的副产品：**看名字就能找到实现所在目录**。过去要靠全局搜索加经验判断的事情，现在按前缀和模块缩写就能直接定位，交接成本显著下降。' },
              { t: 'list', items: [
                '看到驱动前缀出现在应用层 → 越层，进改造清单；',
                '看到中间件前缀出现在内核目录 → 反向依赖，优先修；',
                '看到 `Set` 被放在高频只读路径 → 检查是否误用；',
                '看到同一模块出现两种缩写 → 合并并更新对照表。'
              ] }
            ]
          },
          {
            id: 'lowercase-kernel',
            title: '底层公共代码的小写风格',
            titleEn: 'Lowercase Style in the Common Layer',
            blocks: [
              { t: 'p', v: '内核与公共层建议沿用 C 生态里最常见的小写下划线风格：函数名全部小写，单词用下划线连接，不附加任何层前缀，形如「模块名 + 简短描述 + 动作」。' },
              { t: 'p', v: '理由不是审美，而是语义：这一层**没有上层概念**。它提供的内存、定时器、链表、位运算被所有层复用，加任何层前缀都会误导读者以为它属于某一层；不加前缀反而准确表达了「公共」这层身份。' },
              { t: 'callout', kind: 'info', title: '风格统一的范围', v: '约束的是**同一层内**保持一致，不是要求全工程只有一种风格。应用层用驼峰、公共层用下划线，只要前缀把它们区分开，读者不会混淆，工具也好检查。' },
              { t: 'list', items: [
                '公共层不引用产品配置，也不出现任何板级宏；',
                '公共层函数不持有全局可变状态，尽量做成可重入；',
                '公共层接口变更要跑全量回归，因为扇出最大；',
                '静态分析规则里把它单列，禁止出现层前缀与上层头包含。'
              ] }
            ]
          },
          {
            id: 'migration',
            title: '新旧共存的迁移策略',
            titleEn: 'A Migration Strategy for Mixed Code',
            blocks: [
              { t: 'p', v: '大型代码库不可能一夜之间改名。可行的路径是**按增量切分**：约定只对新增代码强制生效，历史代码保持原样，跨层调用点按优先级逐个替换，同时用工具持续统计不合规数量，确保趋势向下。' },
              { t: 'table', head: ['阶段', '动作', '验收标志'], rows: [
                ['第 1 阶段', '发布约定文档、缩写对照表与例外登记模板', '新提交的函数 100% 合规'],
                ['第 2 阶段', '接入静态检查，越层包含报 warning', '不合规数量只降不升'],
                ['第 3 阶段', '按模块逐个重命名，配合回归测试', '每个模块改完有独立可回滚的提交'],
                ['第 4 阶段', '把 warning 提升为 error，清理例外清单', '例外数量为 0 或全部有明确复核日期']
              ] },
              { t: 'p', v: '重命名必须与行为变更分开提交。把「改名字」和「改逻辑」混在一个 diff 里，等于放弃了最容易验证的那部分安全性，出问题时也无法二分定位。' },
              { t: 'callout', kind: 'key', title: '一条容易被忽略的收益', v: '命名统一之后，**「不知道某个函数在哪、能不能调」这类问题基本消失**。这比省下几次编译更值钱：它直接减少了团队里最贵的那种沟通——反复确认边界。' }
            ]
          }
        ]
      },
      {
        id: 'build',
        num: '4',
        title: '构建组织与配置抽象',
        titleEn: 'Build Organization and Configuration Abstraction',
        lead: '架构定下来之后，下一个摩擦点是「改一个东西要动几处文件」。构建描述与配置如果集中在顶层，每加一个源文件、每换一块板都得改全局文件，冲突与误改会持续发生。本章把这两件事拆成可独立变化的维度。',
        sections: [
          {
            id: 'distributed-make',
            title: '分布式构建描述',
            titleEn: 'Distributed Build Descriptions',
            blocks: [
              { t: 'p', v: '顶层只做聚合：每一层有自己的构建入口，每个功能域有自己的片段文件，片段里列出本域的源文件、包含路径与局部编译选项。顶层按配置把需要的片段包含进来即可。' },
              { t: 'table', head: ['位置', '放什么', '不放什么'], rows: [
                ['顶层入口', '目标列表、层的聚合顺序、镜像打包规则', '具体源文件清单'],
                ['层入口', '本层各功能域片段的包含', '其他层的源文件'],
                ['功能域片段', '本域源文件、私有包含路径、局部宏', '全局优化等级与工具链设置'],
                ['资源片段', '字库、界面资源、生成规则', '任何业务逻辑源文件']
              ] },
              { t: 'p', v: '这样组织后，新增一个源文件的影响范围被压缩到**一个片段文件**；不同人同时在不同的功能域加文件，不再在同一个顶层文件里冲突。' },
              { t: 'fig', id: 'buildTree', caption: '构建描述跟随目录分布，顶层只聚合；配置按产品、板级、编译选项三个维度分开管理。' },
              { t: 'callout', kind: 'key', title: '一条实用规则', v: '片段里只写「属于这个域的东西」。一旦某个片段开始为别的域开关功能，它就变回了隐式全局配置，前面拆开的边界会被重新粘回去。' }
            ]
          },
          {
            id: 'config-trio',
            title: '产品 / 板级 / 编译选项三层配置',
            titleEn: 'Product, Board and Compiler Configuration',
            blocks: [
              { t: 'p', v: '配置最容易出问题的地方，是把三种变化频率完全不同的东西塞进同一个头文件：产品功能开关随型号变、板级参数随电路板改版变、编译选项随工具链和调试需求变。混在一起的结果是，任何人改任何一项都要重新验证全部组合。' },
              { t: 'dl', items: [
                ['产品配置', '决定启用哪些功能、支持哪些格式、默认策略；同一块板可以配不同产品，应保持与硬件无关。'],
                ['板级配置', '引脚复用、器件地址、端口顺序、显示面板参数、上电时序；与实物一一对应，只在改版时变更。'],
                ['编译选项', '优化等级、告警集合、断言与日志开关、调试符号；不影响功能语义，但影响可观测性。'],
                ['生成方式', '用配置工具生成头文件，避免手工编辑；生成结果里带上配置标识，便于启动日志回读。']
              ] },
              { t: 'p', v: '三者之间还应有一条**依赖方向**：板级配置可以提供产品配置的默认值，编译选项不应该反向决定功能开关。用编译宏偷偷打开某个产品功能，是后期「这版和那版行为不一样」的经典来源。' },
              { t: 'callout', kind: 'key', title: '配置也要可追溯', v: '把「当前生效的配置标识」打进版本横幅。现场拿到一台设备，第一件事应该能回答：它用的是哪份产品配置、哪份板级配置、哪种编译选项。' }
            ]
          },
          {
            id: 'header-tiers',
            title: '头文件的分层与包含顺序',
            titleEn: 'Header Tiers and Include Order',
            blocks: [
              { t: 'p', v: '把「必须包含的公共基础头」收在一个统一入口里，让每个实现文件的包含列表变短且可预测；再把产品模型定义、板级定义、面板参数、默认编译选项各自独立成头，按依赖顺序包含。' },
              { t: 'table', head: ['头文件类别', '内容', '变化频率'], rows: [
                ['公共基础入口', '类型别名、通用宏、日志与断言接口', '极低'],
                ['模型 / 产品定义', '产品型号、功能集合、默认策略', '按产品'],
                ['板级定义', '引脚、器件地址、端口顺序、总线分配', '按改版'],
                ['面板参数', '时序、背光、电气特性与初始化序列', '按面板'],
                ['默认编译选项', '告警、优化、条件编译的兜底值', '按工具链']
              ] },
              { t: 'list', items: [
                '每个实现文件只包含它真正用到的头，别靠「万能基础头」传递依赖；',
                '头文件自己要能独立编译通过，缺什么就自己包含什么；',
                '板级头不得被公共层包含，否则公共层就绑死在某块板上；',
                '配置生成的头加保护宏与生成标识，禁止手改。'
              ] },
              { t: 'p', v: '这套分层还有一个隐性好处：**编译能替你检查架构**。当某个板级宏不小心被公共层用到时，包含关系会立刻暴露出这条不该存在的依赖。' }
            ]
          },
          {
            id: 'port-mapping',
            title: '物理端口顺序与逻辑索引解耦',
            titleEn: 'Decoupling Physical Ports from Logical Indices',
            blocks: [
              { t: 'p', v: '物理输入端口在板子上的排列顺序由布线和结构决定，而菜单里「输入 1 / 输入 2」的顺序由产品定义决定。两者**不是同一件事**，但很多老代码把它们当成同一个数组下标用，于是改一次丝印顺序就要翻遍业务逻辑。' },
              { t: 'p', v: '正确做法是引入一张映射表：业务代码只用逻辑索引，板级配置提供「逻辑索引 → 物理端口」的转换，所有对硬件端口的访问都先经过这个转换点。' },
              { t: 'fig', id: 'portMap', caption: '映射表是物理顺序与软件顺序之间唯一的转换点；换板只改表，业务逻辑不动。' },
              { t: 'callout', kind: 'warn', title: '两个必须一并处理的细节', v: '一是**热插拔信号的释放时机**要统一在初始化完成后再做，避免源端在能力还没建立时就开始读数据；二是映射表的合法性要有断言，重复端口、越界索引、空槽位都应在启动阶段直接报错，而不是等到切换输入时才出现怪现象。' },
              { t: 'p', v: '同一套思路可以推广到所有「硬件顺序 vs 软件顺序」的场景：通道编号、器件地址列表、背光分区编号、按键矩阵。==只要顺序有两种解释，就应该只有一张转换表==。' }
            ]
          }
        ]
      },
      {
        id: 'runtime',
        num: '5',
        title: '启动流程与运行期骨架',
        titleEn: 'Boot Sequence and the Runtime Skeleton',
        lead: '分层和模块化最终要在一条真实的执行序列上生效。初始化顺序不是习惯问题：下层没就绪时上层读到的都是假值，中断开得太早会撞上半初始化状态。本章把启动流程拆成有前置依赖的若干阶段，并给出运行期各角色的职责边界。',
        sections: [
          {
            id: 'init-order',
            title: '自底向上的初始化契约',
            titleEn: 'A Bottom-Up Initialization Contract',
            blocks: [
              { t: 'p', v: '按层组织初始化调用：先内核与基础服务，再驱动与器件探测，然后中间件建立能力集合，接着应用层初始化状态与界面，最后才打开中断与事件入口。每一层的初始化函数只依赖已经完成的下层，不回头读上层的东西。' },
              { t: 'fig', id: 'initFlow', caption: '五个初始化阶段与各自的前置条件；越靠后的阶段越不能提前，尤其是中断与热插拔事件的开放。' },
              { t: 'table', head: ['阶段', '必须已完成', '本阶段产出'], rows: [
                ['基础服务', '时钟、内存、栈与日志可用', '稳定的运行与分配能力'],
                ['硬件抽象', '总线与引脚可用', '器件清单、面板参数、显示能力数据'],
                ['能力编排', '器件清单与配置齐备', '可用输入 / 输出能力集合'],
                ['应用状态', '能力集合确定', '窗口、默认输入、用户偏好'],
                ['事件开放', '状态机与队列就绪', '热插拔、按键、定时与异步消息']
              ] },
              { t: 'callout', kind: 'key', title: '把顺序写成可检查的东西', v: '在每层的初始化结尾写一个「就绪标记」，后一阶段入口断言它依赖的标记已置位。这样一旦有人调整顺序，问题会在启动阶段立刻暴露，而不是变成偶发的现场故障。' }
            ]
          },
          {
            id: 'before-main',
            title: '时钟、内存与参数的前置依赖',
            titleEn: 'Prerequisites Before the Main Flow',
            blocks: [
              { t: 'p', v: '最早期的一小段代码往往决定后面所有行为：内存映射与堆是否可用、时钟是否稳定、日志能不能输出、非易失参数是否已读出。这些没做完就进入业务初始化，看到的失败现象会非常随机。' },
              { t: 'list', items: [
                '内存映射与容量探测：缓冲区的划分要在这里定下来，后面不要动态改；',
                '面板参数与显示能力数据：尽早读入并缓存，避免多处重复读取产生不一致；',
                '校准数据：若引导阶段需要使用，必须确认其存储区域在升级流程中不会被擦除；',
                '日志与断言通道：尽早可用，否则前三步出问题时没有任何现场信息；',
                '默认配置的兜底值：参数损坏时仍能进入一个可恢复的最小状态。'
              ] },
              { t: 'p', v: '这一阶段还适合打印**版本横幅**：版本号、构建时间、生效的产品 / 板级配置标识、镜像校验值。现场排查时，「跑的到底是哪一版」比任何日志都先要回答。' },
              { t: 'callout', kind: 'warn', title: '小心隐式提前使用', v: '某个驱动初始化函数里顺手读了一次显示能力数据，而这份数据本该在下一阶段统一缓存——于是同一份数据被解析两遍，且两遍的默认值可能不同。把这类「顺手一读」收进统一入口，是启动流程整理里性价比最高的一步。' }
            ]
          },
          {
            id: 'runtime-roles',
            title: '主循环、中断、窗口与输入',
            titleEn: 'Runtime Roles: Loop, ISR, Window and Input',
            blocks: [
              { t: 'p', v: '运行期的骨架可以分成四类角色：中断负责把硬件事件变成消息，主循环负责消费消息并推进状态机，窗口与界面负责呈现，输入与音频等子系统各自维护自己的状态并只通过接口对外提供能力。' },
              { t: 'table', head: ['角色', '应该做', '不应该做'], rows: [
                ['中断服务', '清标志、搬数据、投递消息', '做耗时决策、调用跨层长链、直接刷界面'],
                ['主循环', '按优先级处理消息、推进状态迁移', '忙等硬件、在循环里做阻塞式总线事务'],
                ['窗口 / 界面', '根据状态渲染、收集用户操作', '直接读写器件、绕过状态机改配置'],
                ['输入子系统', '维护连接状态、格式与切换流程', '替应用层决定默认输入策略'],
                ['音频子系统', '维护路由与格式协商', '依赖具体输入源的菜单顺序']
              ] },
              { t: 'p', v: '跨执行上下文通信建议统一用「邮箱」式的共享缓冲加就绪标志：明确写入方、读取方、覆盖规则与就绪语义。最忌讳双方都觉得自己有权改写同一块缓冲。' },
              { t: 'list', items: [
                '中断里只置标志，处理放主循环；',
                '共享结构体的所有权写进注释，并配一个专门的访问文件；',
                '事件队列要有溢出计数，静默丢消息比报错更难查；',
                '所有耗时操作提供超时与失败回退路径。'
              ] }
            ]
          },
          {
            id: 'version-banner',
            title: '版本信息与可读的启动日志',
            titleEn: 'Version Banners and Readable Boot Logs',
            blocks: [
              { t: 'p', v: '可观测性不是出问题时才补的东西。启动阶段打印的几行信息，往往决定现场排查是十分钟还是两天：它们要能唯一确定「软件版本 + 配置组合 + 镜像完整性」。' },
              { t: 'dl', items: [
                ['版本与构建时间', '由构建系统自动生成，禁止手工填写，避免版本与现实不符。'],
                ['配置标识', '产品配置、板级配置、编译选项三项各自的标识或校验值。'],
                ['镜像校验', '启动阶段计算并打印，用于发现烧录不完整或存储位翻转。'],
                ['阶段完成标记', '每个初始化阶段一行，失败时最后一行就是定位点。'],
                ['调试命令提示', '说明当前镜像开放了哪些诊断入口，以及它们是否只读。']
              ] },
              { t: 'p', v: '日志本身也要分层：底层只报告「器件是否响应、读写是否成功」，中间件报告「能力集合如何形成」，应用层报告「最终选择了什么」。三级信息串起来，才能从「画面没出来」倒推到具体是哪一层没就绪。' },
              { t: 'callout', kind: 'ok', title: '一个低成本高回报的习惯', v: '每次改初始化顺序，顺手检查启动日志里阶段行的先后顺序是否仍与实际一致。日志与代码不同步，比没有日志更容易误导人。' }
            ]
          }
        ]
      },
      {
        id: 'debug-storage',
        num: '6',
        title: '调试、外设与存储规划',
        titleEn: 'Debug Facilities, Peripherals and Storage Planning',
        lead: '最后一章处理那些「不上架构图、但天天要用」的部分：调试命令怎么开才不闯祸，总线用硬件还是软件模拟，显示数据通道的缓冲如何保持一致，以及固件镜像、校准数据、密钥与共享资源在存储里怎么排布才不会互相踩。',
        sections: [
          {
            id: 'debug-commands',
            title: '调试命令分级与寄存器护栏',
            titleEn: 'Tiered Debug Commands and Register Guardrails',
            blocks: [
              { t: 'p', v: '调试入口的价值与风险同源：它能让你直接观察和修改状态，也就能让一个误输入把系统带进无法复现的异常。可行的做法是按**只读 / 可逆 / 破坏性**三级划分，并把高等级入口用编译开关隔离。' },
              { t: 'table', head: ['等级', '允许的操作', '发布镜像中的状态'], rows: [
                ['只读', '查看版本、状态、能力集合、事件计数、缓冲快照', '默认开放'],
                ['可逆', '临时切换模式、触发一次重新探测、调整日志级别', '需显式开关，重启后失效'],
                ['破坏性', '直接写寄存器、改写非易失参数、擦除区域', '仅调试镜像，且需二次确认'],
                ['扩展命令', '批量脚本、自动化产测指令', '仅受控环境，带白名单与超时']
              ] },
              { t: 'p', v: '寄存器级访问尤其需要护栏：写之前先回读旧值并打印，写之后立刻回读确认；对会影响链路状态的寄存器，要求先停掉相关事件再改，改完再按初始化顺序恢复。' },
              { t: 'callout', kind: 'warn', title: '别让调试入口变成隐式接口', v: '一旦产测脚本或上层功能开始依赖某条调试命令，它就不再是「调试工具」而是事实 API，后续任何架构改造都得兼容它。发现这种依赖，应尽快把能力迁移到正式接口上。' }
            ]
          },
          {
            id: 'i2c-choice',
            title: '硬件总线与软件模拟的取舍',
            titleEn: 'Choosing Between Hardware and Software I²C',
            blocks: [
              { t: 'p', v: '同一条两线总线，既可以由专用硬件控制器产生时序，也可以用普通引脚按位翻转来模拟。两者不是「先进 / 落后」的关系，而是占用资源与灵活性之间的取舍。' },
              { t: 'table', head: ['维度', '硬件控制器', '软件模拟'], rows: [
                ['CPU 占用', '低，提交事务后等待完成', '高，时序期间需要持续占用'],
                ['时序精度', '由外设保证，受系统负载影响小', '受中断与调度抖动影响'],
                ['引脚选择', '受引脚复用限制', '任意可用引脚，改板灵活'],
                ['可观测性', '需要借助状态寄存器', '波形与翻转可直接观察，便于调试'],
                ['适用场景', '高频访问、长事务、时序严格器件', '低频配置、引脚受限、临时验证']
              ] },
              { t: 'p', v: '架构上要把两者收敛到**同一套事务接口**：上层只提交「地址 + 读写缓冲 + 长度」，由板级配置决定这次走硬件还是软件实现。否则上层代码会长出两套分支，换板时到处要改。' },
              { t: 'list', items: [
                '总线访问统一加超时与重试上限，避免器件无响应时挂死主循环；',
                '多主或多上下文访问时统一加锁，别让两个模块同时发起事务；',
                '软件模拟实现里关中断的窗口要尽量短，并记录下来评估最坏时延；',
                '调试命令里提供总线扫描，但只在只读等级开放。'
              ] }
            ]
          },
          {
            id: 'ddc-buffer',
            title: '显示数据通道缓冲与一致性',
            titleEn: 'Display Data Channel Buffers and Consistency',
            blocks: [
              { t: 'p', v: '主机通过显示数据通道读取显示器声明的能力数据。这份数据会被很多模块用到：模式枚举、色彩与位深决策、音频能力、界面上的输入信息。如果各模块各自去读，就会在同一会话里得到多个「当前能力」，尤其在热插拔与切换输入时容易不一致。' },
              { t: 'p', v: '正确做法是**一次读取、集中解析、统一分发**：在初始化或连接事件里把原始数据读入一块专用缓冲，校验通过后由解析模块产出结构化能力集合，其他模块只读这份快照。原始缓冲与解析结果都要带一个版本号或序号，便于判断快照是否已过期。' },
              { t: 'dl', items: [
                ['缓冲大小', '按协议规定的块大小预留，并留出扩展块数量上限的空间，别按「当前这台显示器」的长度硬编码。'],
                ['校验与重试', '读取失败时保留上一份有效快照并标记状态，不要用全零缓冲去覆盖能力集合。'],
                ['切换流程', '输入切换时先失效旧快照、再读新的，中间状态用显式枚举表示，避免界面显示半新半旧。'],
                ['调试可见性', '提供只读的原始数据查看入口，现场能直接判断是读失败还是解析分歧。']
              ] },
              { t: 'callout', kind: 'info', title: '与本站其他页面的关系', v: 'EDID 的字节结构与逐字段含义，本站的「EDID 解析」「EDID 字段详解」两页有专门的说明；这里只讨论**固件侧如何管理这份数据**，两者是接口两侧的不同视角。' }
            ]
          },
          {
            id: 'flash-layout',
            title: '按擦除块对齐的分区方法',
            titleEn: 'Erase-Block-Aligned Partition Planning',
            blocks: [
              { t: 'p', v: '存储分区规划的起点不是「还剩多少空间」，而是**哪些东西会被单独更新**。会被单独擦写的数据必须与大镜像分开，并且各自落在擦除块边界上；否则改一个很小的参数，就得连带擦掉相邻的整块内容。' },
              { t: 'fig', id: 'flashLayout', caption: '按更新粒度排布：镜像区整体升级，小数据独占擦除块，共享资源放在两份镜像都不会覆盖的位置，末尾留保留区。' },
              { t: 'table', head: ['区域', '更新方式', '排布要点'], rows: [
                ['引导与镜像 A', '整包升级', '按最大体积加增长率预留，别按当前体积刚好卡满'],
                ['镜像 B（可选）', '整包升级', '双镜像回滚，容量接近翻倍，须提前进预算'],
                ['校准数据', '小块频繁写', '独占擦除块，容量小但必须留出相邻扩容空间'],
                ['密钥与敏感材料', '产线一次性写入', '只读、隔离、不与其他可变数据共享擦除块'],
                ['界面 / 字库资源', '随版本更新', '若被两份镜像共用，要放在任一镜像升级都不会覆盖的位置'],
                ['保留区', '暂不使用', '吸收未来版本增长，避免后期整体搬家']
              ] },
              { t: 'p', v: '规划顺序建议固定为四步：先估镜像体积与未来增长率，再排所有小块数据区，接着为共享资源选安全位置，最后把剩余空间划为保留区，并把结果写进板级配置而不是散落在各处代码里。' },
              { t: 'callout', kind: 'key', title: '最容易被忽略的耦合', v: '引导程序里对「校准数据放在哪」的假设，必须与分区规划、升级脚本、产测工具三处保持一致。==任何一处单独改了地址，现场就会表现为「升级后标定丢失」==，而这类问题在实验室常常不复现。' }
            ]
          },
          {
            id: 'checklist',
            title: '迁移自查清单',
            titleEn: 'A Migration Checklist',
            blocks: [
              { t: 'p', v: '把前面五章的判据收成一张可以按周复核的清单。每项都应该是**能回答是或否**的问题，避免「架构是否清晰」这类无法验收的表述。' },
              { t: 'list', items: [
                '依赖图里还有目录级环吗？跨层包含条数这周是降还是升？',
                '有没有下层反向包含上层头、或在回调里解引用上层结构体的地方？',
                '每个模块是否都有唯一的对外公开区，且公开区里没有变量定义？',
                '跨模块写全局变量是否已被收口到属主模块的设置函数？',
                '新增函数是否全部遵守命名约定，例外清单有没有复核日期？',
                '新增源文件是否只改了本功能域的构建片段？',
                '产品配置、板级配置、编译选项是否仍能独立变更？',
                '物理端口到逻辑索引是否只有一张映射表？',
                '每个初始化阶段是否都有就绪标记，中断开放是否排在最后？',
                '启动日志能否唯一确定版本、配置组合与镜像完整性？',
                '高等级调试命令是否只存在于调试镜像？',
                '每个可独立更新的数据区是否都对齐了擦除块并留有扩容空间？'
              ] },
              { t: 'table', head: ['清单项', '检查方式', '不合格时的第一步'], rows: [
                ['依赖方向', '静态扫描包含语句', '先登记例外，再挑最粗的一条环切断'],
                ['命名与层前缀', '按前缀统计越层调用点', '补缩写对照表，新增代码先行'],
                ['初始化顺序', '看阶段日志与就绪标记', '把提前的事件开放挪回最后'],
                ['分区一致性', '比对引导、升级、产测三处定义', '统一由板级配置生成，消除硬编码']
              ] },
              { t: 'callout', kind: 'ok', title: '收尾', v: '架构改造的终点不是「图好看」，而是**改一个需求时，需要动的文件数量变少且可预测**。如果半年后大家仍然能凭目录名判断该改哪里、凭函数名判断能不能调，这次改造就成功了。' }
            ]
          }
        ]
      }
    ]
  });
})(typeof window !== 'undefined' ? window : globalThis);
