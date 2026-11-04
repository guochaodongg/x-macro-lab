/*
 * edid-fields-data.js — EDID 字段详解数据层
 * 站点：X-MACRO-LAB · 纯静态 / 零外链 / 无 ES module
 * 来源：VESA E-EDID / EDID 1.4、CTA-861 系列、HDMI 1.4/2.1、VESA DisplayID。
 * 本文件只提供「字段 → 四个维度」的结构化内容，渲染由 edid-fields-ui.js 完成。
 *
 * 每个字段四个维度：
 *   func   功能          —— 这个字段是干什么的
 *   how    如何设置       —— 字节偏移、编码方式、位域（含 bits 表）
 *   effect 设置后实现的功能 —— 主机 / 系统据此能做什么
 *   hw     要求硬件支持什么 —— 显示器 / 显卡 / 线缆端必须具备的硬条件
 */
(function (window) {
  'use strict';

  var D = {
    meta: {
      title: 'EDID 字段详解',
      subtitle: 'Field-by-Field Reference',
      intro:
        '把 EDID 的每一个字段拆开来讲：它<b>有什么用</b>、<b>在二进制里怎么摆</b>、' +
        '写进去之后<b>系统会多出什么能力</b>，以及<b>显示器/显卡/线缆端必须真的支持什么硬件</b>。' +
        '内容覆盖 128 字节基础块、CTA-861（CEA）扩展、DisplayID 扩展，以及 HDMI 1.4 / 2.1 的关键数据块。' +
        '可配合本站的「解析」「生成」「工具箱」页对照阅读。',
      note:
        '本页为 EDID 字段的<b>速查与原理梳理</b>，具体位定义请以 VESA E-EDID / EDID 1.4、' +
        'CTA-861 系列、HDMI Specification 与 VESA DisplayID 官方规范为准；不同版本（1.3 / 1.4）在' +
        '个别字节语义上略有差异，文中以现行 1.4 为默认口径。'
    },

    /* 分组筛选用的元信息 */
    groups: [
      { id: 'base', label: '基础块', desc: 'EDID 1.4 Base Block · 128 字节' },
      { id: 'cta', label: 'CTA-861', desc: 'CEA 扩展 · 音视频能力' },
      { id: 'hdmi', label: 'HDMI 数据块', desc: 'VSDB / HDR / FreeSync / 2.1' },
      { id: 'displayid', label: 'DisplayID', desc: 'DP / eDP 扩展' }
    ],

    sections: [
      /* ============================ 基础块 · 标识与版本 ============================ */
      {
        id: 'base-id',
        group: 'base',
        title: '基础块 · 标识与版本',
        subtitle: '偏移 00h–11h / 7Eh–7Fh',
        fields: [
          {
            id: 'header',
            name: '固定头 Header',
            area: '00h–07h',
            func: '整份 EDID 的“签名”。主机通过 DDC/I²C 读到前 8 字节，如果不是 <code>00 FF FF FF FF FF FF 00</code> 就判定“没有 EDID”或数据损坏。',
            how: '固定写死为 <code>00 FF FF FF FF FF FF 00</code>，不可更改。前导 <code>00</code> 用于 I²C 寄存器地址对齐，连续的 <code>FF</code> 提供足够跳变让接收端锁定同步。',
            effect: '合法头是后续所有解析的前提；头不匹配整份数据被丢弃，显示器会回退到默认 640×480/60 甚至无法点亮。',
            hw: '显示器 MCU / EEPROM 在出厂烧录时由工具写入。无需特殊硬件，但烧录器（如 CH341A）要支持 128 字节页写。'
          },
          {
            id: 'mfr',
            name: '厂商 ID（PNP）',
            area: '08h–09h',
            func: '用 3 个字母的 PNP/EISA ID（如 AOC、SAM、DEL、GSM）唯一标识制造厂商，操作系统据此匹配驱动与 ICC 描述文件。',
            how: '两位字母各取 ASCII−64（A=1…Z=26）压成 5 位，共 15 位分两字节小端打包：byte8 高 7 位=第 1 字母；byte8 低 1 位 + byte9 高 6 位 = 第 2 字母；byte9 低 5 位 = 第 3 字母。',
            effect: '即插即用数据库、OS“显示器属性”、色彩管理配置都按它查询；填错会匹配不到厂商配置。',
            hw: '厂商需先向 UEFI/PNP 注册 3 字母 ID；固件出厂烧录。'
          },
          {
            id: 'product',
            name: '产品代码',
            area: '0Ah–0Bh',
            func: '厂商内部产品型号编码（如 AOC 的 <code>2703</code>），与厂商 ID 组合成唯一设备标识以区分同厂不同型号。',
            how: '16 位小端无符号整数，由厂商自定义；建议与型号铭牌保持一致。',
            effect: '配合厂商 ID 区分设备；驱动/工具可按此识别具体型号并套用预设参数。',
            hw: '出厂烧录，无特殊硬件要求。'
          },
          {
            id: 'serial',
            name: '序列号（二进制）',
            area: '0Ch–0Fh',
            func: '32 位序列号，便于保修追溯、资产管理与区分多台同型号设备。',
            how: '32 位小端无符号整数（可被十进制或十六进制解读）。若此值为 0，通常改由 <code>0xFF</code> 文本描述符的字符串序列号承载。',
            effect: '出现在 OS 显示器属性与资产管理里；为 0 时系统回退到字符串序列号。',
            hw: '产线逐台写入，需要可读条码/上位机打号工位。'
          },
          {
            id: 'week',
            name: '制造周',
            area: '10h',
            func: '周序号（1–54）记录生产周，结合制造年推算出厂日期。',
            how: '1 字节；<code>0</code> 表示未指定。',
            effect: '用于质保判定与批次排查；越界值会被校验器告警。',
            hw: '产线打标，无特殊硬件。'
          },
          {
            id: 'year',
            name: '制造年',
            area: '11h',
            func: '记录制造年份。',
            how: '值 = 实际年份 − 1990（例如 2026 → 36），定义域 1990–2245。',
            effect: '与制造周共同确定出厂日期；填错会触发校验器的日期范围告警。',
            hw: '产线打标。'
          },
          {
            id: 'version',
            name: 'EDID 版本 / 修订',
            area: '12h–13h',
            func: '声明规范版本（byte12=主版本，常见 1；byte13=修订，如 3 表示 1.3、4 表示 1.4），决定后续字段的解析规则集。',
            how: '直接写十进制数字；当前主流为 1.4。1.3 与 1.4 在特性字节、色度、描述符等语义上有差异，填错会让主机套用旧规则。',
            effect: '多数现代主机要求 ≥1.3；版本声明影响色彩管理、电源位等的解释方式。',
            hw: '固件设定，无需硬件。'
          },
          {
            id: 'extcount',
            name: '扩展块数量',
            area: '7Eh',
            func: '声明基础块之后还有几个 128 字节扩展块（CEA-861 / DisplayID / 其他）。',
            how: '1 字节计数；整份 EDID 长度 = 128 × (1 + N)。声明数量必须与实际烧录的块数一致。',
            effect: '决定扩展能力（音视频、HDR、DP 时序等）是否被扫描；不符会导致读到错误边界或漏读。',
            hw: 'EEPROM 必须实际烧录 N 个完整 128 字节块。'
          },
          {
            id: 'checksum',
            name: '基础块校验和',
            area: '7Fh',
            func: '使基础块 128 字节累加和（模 256）为 0 的纠错字节。',
            how: '取前 127 字节求和，第 128 字节 = 256 − (sum mod 256)。每改一个字节都要重算（见本站工具箱“自动重算”）。',
            effect: '校验失败整块被拒，显示器可能回退默认分辨率或黑屏；是最常见的“EDID 失效”原因之一。',
            hw: '烧录工具或本站工具箱会自动重算，不需要手动算。'
          }
        ]
      },

      /* ============================ 基础块 · 显示基本参数 ============================ */
      {
        id: 'base-display',
        group: 'base',
        title: '基础块 · 显示基本参数',
        subtitle: '偏移 14h–22h',
        fields: [
          {
            id: 'video-input',
            name: '视频输入定义',
            area: '14h',
            func: '声明接口是模拟还是数字，并给出位深/信号电平细节，决定显卡发出的信号类型与色彩深度。',
            how: '最高位区分接口：<b>数字（bit7=1）</b> bit0–2 = 接口色深（0 未定义 / 1=6bit / 2=8bit / 3=10bit / 4=12bit / 5=14bit / 6=16bit），bit3 = DFP 1.x 兼容；<b>模拟（bit7=0）</b> bit0–1 = 信号电平标准（0=0.7V p-p 等），bit2 = 消隐到黑，bit3 = 分离同步，bit4 = 复合同步，bit5 = 绿同步，bit6 = 垂直同步锯齿。',
            effect: '决定能否用到 10/12bit 深色彩；模拟标识会触发 CRT 类时序与电平处理；数字屏的色深声明错误会让系统只发 8bit。',
            hw: '数字接口需面板 / TMDS 接收支持对应位深；模拟需 DAC/ADC 链路电平匹配。',
            bits: [
              { bit: 'bit7', desc: '1 = 数字输入；0 = 模拟输入（决定下方其余位的含义）' },
              { bit: '数字 bit0–2', desc: '接口色深：0 未定义 / 1=6 / 2=8 / 3=10 / 4=12 / 5=14 / 6=16 bit' },
              { bit: '数字 bit3', desc: 'DFP 1.x 兼容' },
              { bit: '模拟 bit0–1', desc: '信号电平标准（0=0.7V p-p、1=0.714、2=1.0、3=0.7+净空白）' },
              { bit: '模拟 bit2', desc: '消隐到黑（blank-to-black）' },
              { bit: '模拟 bit3–6', desc: '分离同步 / 复合同步 / 绿同步 / 垂直同步锯齿' }
            ]
          },
          {
            id: 'screensize',
            name: '屏幕尺寸',
            area: '15h–16h',
            func: '横向(H)、纵向(V)可见尺寸，单位厘米，供 OS 显示“屏幕尺寸”并估算 DPI / 多屏排布比例。',
            how: '两字节分别填厘米值（上限 255cm）。若填 <code>00 00</code>，则改用纵横比编码表示（15h=0，16h 携带 AR 枚举）。',
            effect: '影响像素密度推断与多显示器对齐；缺失会让系统按分辨率粗略估算 DPI。',
            hw: '面板物理尺寸，无需特殊硬件。'
          },
          {
            id: 'gamma',
            name: 'Gamma（伽马）',
            area: '17h',
            func: '声明显示器伽马曲线，供色彩管理做伽马补偿。',
            how: '值 = (目标伽马 − 1) × 100；如 2.2 → <code>120</code>。<code>0xFF</code> 表示伽马由 <code>0xFB</code> 附加白点描述符或后续扩展块提供。',
            effect: '系统/驱动据此做 gamma 校正；填错会明显偏色（过亮或过暗）。',
            hw: '面板伽马需实测校准；无校准值应填 <code>0xFF</code> 并配合描述符。'
          },
          {
            id: 'features',
            name: '特性支持',
            area: '18h',
            func: '一组能力开关：电源管理、默认 GTF、首选时序、sRGB 默认色彩空间、是否支持连续频率与 RGB/YCbCr 子采样。',
            how: '数字屏：bit7=待机 / bit6=挂起 / bit5=低功耗 / bit4=默认 GTF / bit3=偏好时序模式（首选 DTD）/ bit2=sRGB 默认 CSC / bit1=连续频率 / bit0=RGB 4:4:4；bit0=0 时再叠加 YCbCr 4:4:4 与 4:2:2 能力位。',
            effect: '声明支持的色彩空间（决定能否发 YCbCr）、是否优先用首选 DTD、是否支持节能模式（影响系统睡眠策略）。',
            hw: 'sRGB 需面板+Scaler 实际支持；YCbCr 需接收端能解码；节能模式需 MCU 支持。',
            bits: [
              { bit: 'bit7', desc: '待机（Standby）支持' },
              { bit: 'bit6', desc: '挂起（Suspend）支持' },
              { bit: 'bit5', desc: '低功耗（Low Power / Active Off）支持' },
              { bit: 'bit4', desc: '默认 GTF 时序支持' },
              { bit: 'bit3', desc: '偏好时序模式（首选 DTD 优先）' },
              { bit: 'bit2', desc: 'sRGB 默认色彩空间（CSC）' },
              { bit: 'bit1', desc: '连续频率（非固定时序集）' },
              { bit: 'bit0', desc: 'RGB 4:4:4（=1）；=0 时再读 YCbCr 4:4:4 / 4:2:2 能力位' }
            ]
          },
          {
            id: 'chromaticity',
            name: '色度坐标',
            area: '19h–22h',
            func: '编码红/绿/蓝三原色与白点的 CIE 1931 xy 坐标（10 位精度），供色彩管理还原真实色域。',
            how: '10 字节打包：前 2 字节为 Rx(低8 + 高2)、Ry；随后 Gx、Gy、Bx、By 各 2 字节（低 8 位 + 高 2 位），最后 1 字节为 Wx(低8) + Wy(高2)。每个坐标 = round(坐标值 × 1024)。',
            effect: '色彩管理据此建立设备配置文件，影响 sRGB 还原与广色域映射；声明 sRGB(bit2) 但坐标不是 sRGB 值会明显偏色。',
            hw: '需实测面板三原色；否则应使用标准 sRGB 坐标（R 0.640,0.330 / G 0.300,0.600 / B 0.150,0.060 / 白 0.3127,0.3290）。'
          }
        ]
      },

      /* ============================ 基础块 · 时序与描述符 ============================ */
      {
        id: 'base-timings',
        group: 'base',
        title: '基础块 · 时序与描述符',
        subtitle: '偏移 23h–35h / 36h–7Dh',
        fields: [
          {
            id: 'established',
            name: '已建立时序 Established Timings',
            area: '23h–25h',
            func: '17 个历史标准分辨率的“布尔清单”（IBM/VESA/Apple 预设），是 BIOS / 老系统无 DTD 时的“保底”模式。',
            how: '3 字节按位映射：720×400@70、640×480@60/67/72/75、800×600@56/60/72/75、832×624@75、1024×768@60/70/75、1280×1024@75、1152×870@75 及若干保留位，详见 CTA/EDID 位表。',
            effect: '保证老平台/BIOS 也能点亮；现代系统主要依赖 DTD 与标准时序，但清单缺失会让某些旧显卡找不到模式。',
            hw: '显示器必须真正能显示这些模式，否则“点名却不支持”会闪/黑。'
          },
          {
            id: 'standard',
            name: '标准时序 Standard Timings',
            area: '26h–35h',
            func: '8 个 16 位标准时序槽，描述常用分辨率，作为 DTD 之外的可选模式清单。',
            how: '每槽：字节0 = 宽度/8 − 31（如 1920 → 209）；字节1 高 2 位 = 纵横比（0=16:10、1=4:3、2=5:4、3=16:9），低 6 位 = 刷新率 − 60。全 <code>01 01</code> 表示未使用。',
            effect: '显卡据此在“显示设置”列出可选分辨率；漏列则对应模式不可选。',
            hw: '显示器 / Scaler 必须能产生对应像素时钟与时序。'
          },
          {
            id: 'dtd',
            name: '详细时序描述符 DTD',
            area: '36h 起 · 4×18 字节',
            func: '最高优先级、最灵活的分辨率/时序描述；首选时序（原生分辨率）通常放在第 1 个槽位。',
            how: '18 字节布局：像素时钟(0–1, 10kHz 单位, 小端)、H 有效(2,4 高位)、H 消隐(3,4 高)、V 有效(5,7 高)、V 消隐(6,7 高)、H 前肩(8)、H 同步宽(9)、V 前肩/同步宽(10)、各高位(11)、图像尺寸 mm(12–14)、边框(15–16)、标志字节(17：隔行/立体/同步方案/极性)。',
            effect: '决定首选分辨率、刷新率与同步极性；主机默认用第 1 个 DTD 作为原生分辨率。极性/消隐错 → 无显示或花屏。',
            hw: '面板 + 时序控制器(TCON)必须支持该像素时钟与逐行/隔行；高刷需面板响应速度达标。'
          },
          {
            id: 'name-desc',
            name: '显示器名称描述符',
            area: '标签 0xFC',
            func: '给出显示器型号名称字符串（≤12 字符），显示在 OS“显示器名称”里。',
            how: '18 字节中 0–1 = <code>00 00</code>、2 = <code>00</code>、3 = <code>FC</code>(标签)、4 = <code>00</code>、5–17 为 13 字节 ASCII，第 13 字节必须为 <code>0x0A</code>，其余 <code>0x20</code> 补齐。',
            effect: '用户据此识别设备；超 12 字符会被截断或带垃圾字符。',
            hw: '无特殊硬件。'
          },
          {
            id: 'serial-desc',
            name: '序列号字符串描述符',
            area: '标签 0xFF',
            func: '当二进制序列号(0Ch–0Fh)为 0 时，用字符串承载可读序列号，便于资产管理。',
            how: '同结构，标签 <code>0xFF</code>，13 字符以 <code>0x0A</code> 结尾、<code>0x20</code> 补齐。',
            effect: '提供人类可读的序列号；与二进制序列号二选一或互补。',
            hw: '无特殊硬件。'
          },
          {
            id: 'rangelimits',
            name: '范围限制描述符 Range Limits',
            area: '标签 0xFD',
            func: '声明显示器支持的扫描频率与最大像素时钟范围，供显卡/OS 在范围内生成自定义时序。',
            how: '标签 <code>0xFD</code>；随后 最小/最大 行频(KHz, byte4–5)、最小/最大 场频(Hz, byte6–7)、最大像素时钟(10MHz 单位, byte8)、字节9 = 时序公式(0=默认 GTF / 1=仅此范围 / 2=CVT / 3=CVT 带缩减消隐)；后随 GTF/CVT 参数块。',
            effect: '允许系统在安全范围内建自定义模式；范围写错会限制可用刷新率或生成不可显示模式。',
            hw: '面板 + Scaler 必须能覆盖所声明的频率/时钟范围。'
          }
        ]
      },

      /* ============================ CTA-861 扩展 · 头部 ============================ */
      {
        id: 'cta-header',
        group: 'cta',
        title: 'CTA-861 扩展 · 头部',
        subtitle: '扩展标签 0x02',
        fields: [
          {
            id: 'cta-top',
            name: 'CTA 扩展头与全局能力位',
            area: '块 00h–03h',
            func: '标识这是 CTA-861（CEA）扩展块，并承载 underscan / 音频 / YCbCr 子采样等全局能力开关与原生详细时序编号。',
            how: '块第 0 字节 = 扩展标签 <code>0x02</code>；第 1 字节 = 版本（常见 3）；第 2 字节 = DTD 数据起始偏移；第 3 字节 = 能力标志：bit7=默认 underscan、bit6=支持基础音频、bit5=支持 YCbCr 4:4:4、bit4=支持 YCbCr 4:2:2、bit0–3=原生详细时序编号。',
            effect: '决定是否启用 underscan 默认、是否暴露音频能力、是否支持 YCbCr 子采样（影响 HDMI 音视频握手）。',
            hw: '接收端需支持对应色彩子采样与音频解码；音频还需显示器带扬声器或能透传（ARC/eARC）。',
            bits: [
              { bit: 'bit7', desc: '默认 underscan（过扫描时默认欠扫描）' },
              { bit: 'bit6', desc: '支持基础音频（Basic Audio）' },
              { bit: 'bit5', desc: '支持 YCbCr 4:4:4' },
              { bit: 'bit4', desc: '支持 YCbCr 4:2:2' },
              { bit: 'bit0–3', desc: '原生详细时序（Native DTD）编号' }
            ]
          }
        ]
      },

      /* ============================ CTA-861 扩展 · 音视频数据块 ============================ */
      {
        id: 'cta-av',
        group: 'cta',
        title: 'CTA-861 扩展 · 音视频数据块',
        subtitle: '标签 0x81 / 0x82 / 0x83',
        fields: [
          {
            id: 'video-db',
            name: '视频数据块 Video Data Block',
            area: '标签 0x81',
            func: '列出支持的 VIC（视频识别码）清单——即“这台显示器支持哪些分辨率/刷新率”。',
            how: '标签 <code>0x81</code> + 长度；随后每字节一个 VIC，最高位(0x80)置 1 表示该格式为“原生”。VIC 取自 CTA-861 表（如 16=1080p60、63=4K24、97=4K60、102=4K60 YCbCr420）。',
            effect: '显卡据此在 HDMI/DP 下提供可选分辨率/刷新率；漏列则模式不可选，4K/高刷可能消失。',
            hw: '源端(TX)与接收端(RX)都必须能生成/锁存这些 VIC 的 TMDS/链路时序。'
          },
          {
            id: 'audio-db',
            name: '音频数据块 Audio Data Block',
            area: '标签 0x82',
            func: '声明支持的音频格式（LPCM / AC-3 / DTS / …）、最大声道数、采样率与样本位深。',
            how: '标签 <code>0x82</code>；每 3 字节一个短音频描述符：字节1 = 格式码 + (最大声道数 − 1)；字节2 = 采样率位图（32/44.1/48/88.2/96/176.4/192 kHz）；字节3 = 样本位深位图（16/20/24 bit）或压缩格式码。',
            effect: '系统据此暴露 HDMI 音频输出格式；不支持的格式不会被列为可选项，影响声音输出能力。',
            hw: '显示器需带音频 DAC/功放或能透传(ARC/eARC)到功放；声道数受硬件限制。',
            bits: [
              { bit: '采样率位图', desc: 'bit0=32k / bit1=44.1k / bit2=48k / bit3=88.2k / bit4=96k / bit5=176.4k / bit6=192k' },
              { bit: '样本位深位图', desc: 'bit0=16bit / bit1=20bit / bit2=24bit（LPCM）' },
              { bit: '最大声道', desc: '字节1 低 3 位 + 1 = 最大声道数（最多 8）' }
            ]
          },
          {
            id: 'speaker-db',
            name: '扬声器分配 Speaker Allocation',
            area: '标签 0x83',
            func: '声明显示器内置扬声器布局（FL/FR/FC/LFE/RL/RR/RC/顶部声道…），指导音频声道映射。',
            how: '标签 <code>0x83</code> + 长度 + 3 字节位图：bit0=FL/FR、bit1=LFE、bit2=FC、bit3=RL/RR、bit4=RC、bit5=FLC/FRC、bit6=RLC/RRC、bit7=FLW/FRW；后两字节为顶部/后置宽等扩展位。',
            effect: '决定 5.1/7.1 等声道能否被渲染与正确摆位；与音频数据块配合决定可渲染声道集合。',
            hw: '显示器实际扬声器物理布局须与声明一致，否则声像错位。',
            bits: [
              { bit: 'bit0', desc: 'Front Left / Right（左/右前置，最常见的 2.0）' },
              { bit: 'bit1', desc: 'Low Frequency Effects（低音炮 LFE）' },
              { bit: 'bit2', desc: 'Front Center（中置）' },
              { bit: 'bit3', desc: 'Rear Left / Right（左/右环绕）' },
              { bit: 'bit4', desc: 'Rear Center（后置中置）' },
              { bit: 'bit5', desc: 'Front Left / Right Center' },
              { bit: 'bit6', desc: 'Rear Left / Right Center' },
              { bit: 'bit7', desc: 'Front Left / Right Wide' }
            ]
          }
        ]
      },

      /* ============================ CTA-861 扩展 · 能力与色彩 ============================ */
      {
        id: 'cta-cap',
        group: 'cta',
        title: 'CTA-861 扩展 · 能力与色彩',
        subtitle: '标签 0x84 / 0x85 / 0x86',
        fields: [
          {
            id: 'vcap-db',
            name: '视频能力数据块 Video Capability',
            area: '标签 0x84',
            func: '声明 CE / IT / PT 内容的扫描行为（过扫描/欠扫描）与 RGB/YCC 量化范围，影响画面是否被裁边、是否发灰。',
            how: '标签 <code>0x84</code>；字节3=CE 扫描、字节4=IT、字节5=PT（各 2bit：0=未知 / 1=上&欠扫描均支持 / 2=仅过扫描 / 3=仅欠扫描）；字节6=RGB 量化(0=默认有限 / 1=有限 / 2=全范围 / 3=可经 AVI 选)、字节7=YCC 量化。',
            effect: '决定视频播放时是否过扫描裁切、黑色电平是有限(16–235)还是全范围(0–255)。',
            hw: '接收端缩放引擎与量化处理须支持所选模式。',
            bits: [
              { bit: 'CE / IT / PT 扫描', desc: '各 2bit：0 未知 / 1 过&欠均支持 / 2 仅过扫描 / 3 仅欠扫描' },
              { bit: 'RGB 量化', desc: '0 默认有限 / 1 有限(16–235) / 2 全范围(0–255) / 3 经 AVI Q 可选' },
              { bit: 'YCC 量化', desc: '同上，针对 YCbCr' }
            ]
          },
          {
            id: 'colorimetry-db',
            name: '色度数据块 Colorimetry',
            area: '扩展标签 0x05',
            func: '声明支持的扩展色域与色彩标准（xvYCC、BT.2020、sRGB、AdobeRGB 等），启用广色域与 HDR 管线。',
            how: '扩展标签 <code>0x05</code>；位图：bit0=xvYCC601、bit1=xvYCC709、bit2=sYCC601、bit3=opYCC601、bit4=opRGB、bit5=BT.2020 cYCC、bit6=BT.2020 YCC、bit7=BT.2020 RGB，另含 MD 配置、sRGB、AdobeRGB、ICCP、ST2113 等。',
            effect: '系统据此开启广色域映射与 BT.2020 处理；不声明则按标准 Rec.709/sRGB 处理，HDR 色域无法启用。',
            hw: '面板色域与处理链路须真正覆盖所声明色域（如 BT.2020 需广色域面板 + 10bit 处理）。',
            bits: [
              { bit: 'bit0–1', desc: 'xvYCC 601 / xvYCC 709' },
              { bit: 'bit2–4', desc: 'sYCC601 / opYCC601 / opRGB' },
              { bit: 'bit5–7', desc: 'BT.2020 cYCC / BT.2020 YCC / BT.2020 RGB' },
              { bit: 'MD / sRGB / Adobe', desc: '后面字节覆盖 MD Profile、sRGB、AdobeRGB、ICCP、ST2113 等' }
            ]
          },
          {
            id: 'y420-db',
            name: 'YCbCr 4:2:0 能力映射',
            area: '扩展标签 0x0E',
            func: '指出视频数据块中哪些 VIC 额外支持 4:2:0 子采样，用于 4K60 以上降带宽。',
            how: '扩展标签 <code>0x0E</code>；用位图索引到视频数据块里的 VIC 序号，被置位的 VIC 才能以 4:2:0 传输。另有独立“4:2:0 视频数据块”直接列 4:2:0 专属 VIC。',
            effect: '使 4K/8K 在 HDMI 1.4 带宽下可用（4:2:0 约为 4:4:4 一半带宽）；否则 4K60 需 HDMI 2.0 以上。',
            hw: 'TX/RX 编解码与面板必须支持 4:2:0 输入（大量 4K 电视/显示器依赖此特性）。'
          }
        ]
      },

      /* ============================ HDMI 数据块 ============================ */
      {
        id: 'hdmi-vsdb',
        group: 'hdmi',
        title: 'HDMI 厂商数据块（VSDB）',
        subtitle: 'OUI 00 0C 03',
        fields: [
          {
            id: 'hdmi-core',
            name: 'HDMI VSDB（核心能力）',
            area: 'Vendor 标签 0x60 · OUI 000C03',
            func: 'HDMI 1.4 核心能力载体：源物理地址、深彩色深、最大 TMDS 时钟、延迟等，是“这是 HDMI 设备”的标识。',
            how: 'Vendor-Specific 标签 <code>0x60</code> + 长度；OUI = <code>00 0C 03</code>（HDMI）；随后 源物理地址 A.B.C.D（2 字节，如 1.0.0.0）、能力位（DC_30/36/48bit、DC_Y444、DVI_Dual、支持 AI）、最大 TMDS 时钟（字节, MHz）及可选延迟字段。',
            effect: '启用深彩色深(10/12/16bit)、音频回传(ARC)、4K 等；最大 TMDS 时钟决定最高无压缩带宽（340MHz≈4K30 8bit），超过需 YCbCr420 或 HDMI 2.0。',
            hw: '源端与显示器 TMDS 发射/接收须支持对应深彩色深与时钟；深彩还需面板 10/12/16bit 驱动。',
            bits: [
              { bit: 'DC_30 / 36 / 48bit', desc: '支持 30/36/48 bit 深彩（10/12/16 bit 每通道）' },
              { bit: 'DC_Y444', desc: '支持 YCbCr 4:4:4 深彩' },
              { bit: 'DVI_Dual', desc: '支持双链路 DVI' },
              { bit: 'Max TMDS Clock', desc: '最大 TMDS 时钟（MHz），决定无压缩带宽上限' }
            ]
          },
          {
            id: 'hdr-db',
            name: 'HDR 静态元数据数据块',
            area: '扩展标签 0x06',
            func: '声明 HDR 能力（EOTF 与静态元数据），是开启 HDR 输出的前提。',
            how: '扩展标签 <code>0x06</code>；EOTF 位图：bit0=传统伽马 SDR、bit1=传统伽马 HDR、bit2=SMPTE ST2084(PQ)、bit3=HLG；静态元数据类型1 支持位；目标内容最大/平均/最小亮度（码值换算尼特）。',
            effect: '系统据此开启 HDR 输出（PQ/HLG）与色调映射；不声明则只能 SDR，HDR 内容会被裁成 SDR。',
            hw: '面板峰值亮度/黑色电平与处理须真正支持 HDR（高亮度、局域调光、10bit 等）。',
            bits: [
              { bit: 'bit0', desc: '传统伽马 — SDR 亮度范围' },
              { bit: 'bit1', desc: '传统伽马 — HDR 亮度范围' },
              { bit: 'bit2', desc: 'SMPTE ST 2084（PQ）EOTF' },
              { bit: 'bit3', desc: '基于 ITU-R BT.2100-0 的 HLG' }
            ]
          },
          {
            id: 'amd-freesync',
            name: 'AMD 厂商数据块（FreeSync）',
            area: 'Vendor 标签 0x60 · OUI 00001A',
            func: 'AMD FreeSync / HDMI VRR 能力与刷新率范围，是启用可变刷新率的关键。',
            how: 'Vendor 标签 <code>0x60</code> + OUI <code>00 00 1A</code>；含 无缝 VRR 切换支持、原生色彩空间/传输曲线切换、局部调光控制、Replay 模式、最小/最大刷新率、FreeSync MCCS VCP 码、伽马 2.2 / PQ EOTF 等。',
            effect: '启用 AMD FreeSync（在 HDMI/DP 上实现可变刷新），减少撕裂与卡顿；min/max 范围决定 VRR 生效区间。',
            hw: '显卡（AMD/NVIDIA/Intel 均支持 Adaptive-Sync）与显示器面板+Scaler 须支持 VRR（面板响应 + 时序可变）。'
          }
        ]
      },

      /* ============================ HDMI 2.1 / HF VSDB ============================ */
      {
        id: 'hdmi21',
        group: 'hdmi',
        title: 'HDMI 2.1 · HF 厂商数据块',
        subtitle: 'OUI C4 5D D8',
        fields: [
          {
            id: 'hf-vsdb',
            name: 'HDMI Forum VSDB（HF-VSDB）',
            area: 'Vendor 标签 0x60 · OUI C45DD8',
            func: 'HDMI 2.1 能力载体：SCDC、FRL 速率、ALLM、VRR、FVA、DSC 等，解锁 48Gbps 与可变刷新等特性。',
            how: 'HF VSDB 标签 <code>0x60</code> + OUI <code>C4 5D D8</code>；含 最大 TMDS 速率、SCDC Present、DC_30/36/48bit 4:2:0、最大 FRL 速率（如 12G 4 lane）、ALLM、FVA、VRR 范围、DSC 能力（10/12/16bpc、Native420、1.2、slices、chunk KB）等。',
            effect: '启用 HDMI 2.1：可变刷新率(VRR)、自动低延迟(ALLM)、快速媒体切换(QMS)、压缩视频(DSC)、48Gbps FRL；SCDC Present 是源端读取状态/做链路训练的前提。',
            hw: '源/显示器均需 HDMI 2.1 芯片与 Ultra High Speed 线缆；FRL 速率受线缆与连接器等级限制；DSC 需编解码硬件；VRR 需面板+Scaler 支持。',
            bits: [
              { bit: 'SCDC Present', desc: '存在 SCDC 寄存器，源端据此读取状态/做链路训练' },
              { bit: 'DC_30/36/48 4:2:0', desc: '支持 4:2:0 下的 30/36/48 bit 深彩' },
              { bit: 'ALLM', desc: '自动低延迟模式' },
              { bit: 'VRR / FVA', desc: '可变刷新率 / 快速视讯调整' },
              { bit: 'DSC 1.2 / Native420', desc: '显示流压缩与 4:2:0 原生支持' },
              { bit: 'Max FRL Rate', desc: '最大固定速率链路档位（3/6/8/10/12 Gbps × 4 lane）' }
            ]
          }
        ]
      },

      /* ============================ DisplayID 扩展 ============================ */
      {
        id: 'displayid',
        group: 'displayid',
        title: 'DisplayID 扩展',
        subtitle: '扩展标签 0x70',
        fields: [
          {
            id: 'displayid-head',
            name: 'DisplayID 头',
            area: '块 00h–03h',
            func: '标识 DisplayID 扩展并记录结构版本、段大小、产品类型，是 DP/eDP 下取代 CTA-861 的“总入口”。',
            how: '块第 0 字节 = 扩展标签 <code>0x70</code>；第 1 字节 = 结构版本/修订（如 0x12=1.2）；第 2 字节 = 段大小；第 3 字节 = 产品类型（独立显示器 / 笔记本内屏 / 电视等）；随后各分节数据块。',
            effect: 'DP 接口下主机按 DisplayID 解析时序与能力；决定是走 DisplayID 还是 CTA-861 语义。',
            hw: '仅 DisplayPort / 嵌入式(eDP) 链路常用；需源端支持 DisplayID 解析。'
          },
          {
            id: 'displayid-timing',
            name: 'DisplayID 数据类型块（Type I/II 详细时序等）',
            area: '分节数据块',
            func: '用更紧凑高效的格式描述详细时序 / 显示参数 / 色度等，是 eDP/DP 高刷与非常规分辨率的主要承载。',
            how: '每个分节含 数据块标签 + 版本 + 长度 + 负载；如 Type I 详细时序：像素时钟、3D 立体、纵横比、H/V 有效/消隐/前肩/同步宽、同步极性、是否为首选时序等；另有 Type VII/VIII 高效时序块。',
            effect: '提供比 DTD 更高精度与更多模式的时序，eDP/DP 高刷屏与非常规分辨率依赖它。',
            hw: '面板 + DP 链路必须支持对应时序与高带宽（如 HBR3/UHBR）。'
          }
        ]
      }
    ]
  };

  window.EDIDFieldsData = D;
})(typeof window !== 'undefined' ? window : globalThis);
