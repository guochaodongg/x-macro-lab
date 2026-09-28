/* =============================================================================
 * mccs-data.js — MCCS（VESA Monitor Control Command Set）VCP 码表与 DDC/CI 操作码。
 *                纯数据，无逻辑、无 DOM 依赖。
 *
 * 命名与属性（类型 / 读写）对齐 VESA MCCS 2.0–3.0，并采用 ddcutil 公开码表的
 * 规范化命名（其 vcpinfo 输出即整理自 MCCS 规范）。0xE0–0xFF 属厂商自定义区间，
 * 规范未定义，各厂家含义不同，**以显示器返回的 capabilities 字符串为准**。
 *
 * 类型 t： C = 连续量（0..最大值）  NC = 非连续量（枚举值）  T = 表类型（多字节）
 *           CNC = 复合非连续量
 * 读写 rw：RW / RO / WO
 * v：枚举值表 { 数值: 含义 }（仅对已确认的码给出）
 * ========================================================================== */
(function () {
  'use strict';

  /* code, 英文名, 中文名, 类型, 读写, 分组, 备注 */
  var RAW = [
    /* ---------------- 复位 / 基础 ---------------- */
    [0x01, 'Degauss', '消磁', 'NC', 'WO', '复位', 'CRT 时代遗留，LCD 一般不支持'],
    [0x02, 'New Control Value', '新控制值', 'CNC', 'RW', '信息', '随每条写入更新，可回读上一次写入的值'],
    [0x03, 'Soft Controls', '软控制（位域）', 'NC', 'RW', '其它', 'MCCS 2.0 定义，已少用'],
    [0x04, 'Restore Factory Defaults', '恢复出厂设置', 'NC', 'WO', '复位', ''],
    [0x05, 'Restore Factory Brightness/Contrast Defaults', '恢复亮度/对比度默认值', 'NC', 'WO', '复位', ''],
    [0x06, 'Restore Factory Geometry Defaults', '恢复几何默认值', 'NC', 'WO', '复位', ''],
    [0x08, 'Restore Color Defaults', '恢复色彩默认值', 'NC', 'WO', '复位', ''],
    [0x0A, 'Restore Factory TV Defaults', '恢复电视默认值', 'NC', 'WO', '复位', ''],
    [0x0B, 'Color Temperature Increment', '色温步进', 'CNC', 'RO', '色彩', '配合 0x0C 做色温微调，只读'],
    [0x0C, 'Color Temperature Request', '色温设定值', 'C', 'RW', '色彩', '实际色温 = 3000 + 0x0B × 步进'],
    [0x0E, 'Clock', '时钟（模拟）', 'C', 'RW', '几何', '模拟输入的像素时钟相位，LCD 上少用'],

    /* ---------------- 画面 / 亮度对比度 ---------------- */
    [0x10, 'Brightness', '亮度', 'C', 'RW', '画面', '支持度最高的码；最大值以读取结果为准（常见 100）'],
    [0x11, 'Flesh Tone Enhancement', '肤色增强', 'CNC', 'RW', '画面', ''],
    [0x12, 'Contrast', '对比度', 'C', 'RW', '画面', ''],
    [0x13, 'Backlight Control', '背光控制', 'C', 'RW', '画面', '与亮度分开的背光调节，笔记本/部分显示器使用'],
    [0x14, 'Select Color Preset', '色彩预设', 'NC', 'RW', '色彩', '枚举值由厂商定义，以 capabilities 的 14(...) 为准'],
    [0x16, 'Video Gain: Red', '红通道增益', 'C', 'RW', '色彩', '调它会自动切到「用户」预设'],
    [0x17, 'User Color Vision Compensation', '色觉补偿', 'C', 'RW', '色彩', ''],
    [0x18, 'Video Gain: Green', '绿通道增益', 'C', 'RW', '色彩', ''],
    [0x1A, 'Video Gain: Blue', '蓝通道增益', 'C', 'RW', '色彩', ''],
    [0x1C, 'Focus', '聚焦', 'C', 'RW', '几何', 'CRT 时代'],
    [0x1E, 'Auto Setup', '自动调整', 'NC', 'RW', '几何', '模拟输入的自动对位'],
    [0x1F, 'Auto Color Setup', '自动色彩调整', 'NC', 'RW', '色彩', ''],

    /* ---------------- 几何：水平 ---------------- */
    [0x20, 'Horizontal Position (Phase)', '水平位置 / 相位', 'C', 'RW', '几何', ''],
    [0x22, 'Horizontal Size', '水平尺寸', 'C', 'RW', '几何', ''],
    [0x24, 'Horizontal Pincushion', '水平枕形失真', 'C', 'RW', '几何', ''],
    [0x26, 'Horizontal Pincushion Balance', '水平枕形平衡', 'C', 'RW', '几何', ''],
    [0x28, 'Horizontal Convergence R/B', '水平会聚 R/B', 'C', 'RW', '几何', ''],
    [0x29, 'Horizontal Convergence M/G', '水平会聚 M/G', 'C', 'RW', '几何', ''],
    [0x2A, 'Horizontal Linearity', '水平线性', 'C', 'RW', '几何', ''],
    [0x2C, 'Horizontal Linearity Balance', '水平线性平衡', 'C', 'RW', '几何', ''],
    [0x2E, 'Gray Scale Expansion', '灰阶扩展', 'CNC', 'RW', '画面', ''],

    /* ---------------- 几何：垂直 ---------------- */
    [0x30, 'Vertical Position (Phase)', '垂直位置 / 相位', 'C', 'RW', '几何', ''],
    [0x32, 'Vertical Size', '垂直尺寸', 'C', 'RW', '几何', ''],
    [0x34, 'Vertical Pincushion', '垂直枕形失真', 'C', 'RW', '几何', ''],
    [0x36, 'Vertical Pincushion Balance', '垂直枕形平衡', 'C', 'RW', '几何', ''],
    [0x38, 'Vertical Convergence R/B', '垂直会聚 R/B', 'C', 'RW', '几何', ''],
    [0x39, 'Vertical Convergence M/G', '垂直会聚 M/G', 'C', 'RW', '几何', ''],
    [0x3A, 'Vertical Linearity', '垂直线性', 'C', 'RW', '几何', ''],
    [0x3C, 'Vertical Linearity Balance', '垂直线性平衡', 'C', 'RW', '几何', ''],
    [0x3E, 'Clock Phase', '时钟相位', 'C', 'RW', '几何', '模拟输入对位'],

    /* ---------------- 几何：梯形 / 角 ---------------- */
    [0x40, 'Horizontal Parallelogram', '水平平行四边形', 'C', 'RW', '几何', ''],
    [0x41, 'Vertical Parallelogram', '垂直平行四边形', 'C', 'RW', '几何', ''],
    [0x42, 'Horizontal Keystone', '水平梯形校正', 'C', 'RW', '几何', ''],
    [0x43, 'Vertical Keystone', '垂直梯形校正', 'C', 'RW', '几何', ''],
    [0x44, 'Rotation', '旋转', 'C', 'RW', '几何', ''],
    [0x46, 'Top Corner Flare', '上角扩展', 'C', 'RW', '几何', ''],
    [0x48, 'Top Corner Hook', '上角勾', 'C', 'RW', '几何', ''],
    [0x4A, 'Bottom Corner Flare', '下角扩展', 'C', 'RW', '几何', ''],
    [0x4C, 'Bottom Corner Hook', '下角勾', 'C', 'RW', '几何', ''],

    /* ---------------- 其它画面 ---------------- */
    [0x52, 'Active Control', '活动控制（面板按键）', 'CNC', 'RO', 'OSD', '只读标记，部分显示器用它反映面板按键状态'],
    [0x54, 'Performance Preservation', '性能保持', 'CNC', 'RW', '画面', ''],
    [0x56, 'Horizontal Moire', '水平摩尔纹', 'C', 'RW', '画面', ''],
    [0x58, 'Vertical Moire', '垂直摩尔纹', 'C', 'RW', '画面', ''],
    [0x59, '6 Axis Saturation: Red', '六轴饱和度：红', 'C', 'RW', '色彩', ''],
    [0x5A, '6 Axis Saturation: Yellow', '六轴饱和度：黄', 'C', 'RW', '色彩', ''],
    [0x5B, '6 Axis Saturation: Green', '六轴饱和度：绿', 'C', 'RW', '色彩', ''],
    [0x5C, '6 Axis Saturation: Cyan', '六轴饱和度：青', 'C', 'RW', '色彩', ''],
    [0x5D, '6 Axis Saturation: Blue', '六轴饱和度：蓝', 'C', 'RW', '色彩', ''],
    [0x5E, '6 Axis Saturation: Magenta', '六轴饱和度：品红', 'C', 'RW', '色彩', ''],

    /* ---------------- 输入 / 音频 / 电源 ---------------- */
    [0x60, 'Input Source', '输入源', 'NC', 'RW', '输入/电源', '实际支持的取值以 capabilities 的 60(...) 为准'],
    [0x62, 'Audio Speaker Volume', '扬声器音量', 'C', 'RW', '音频', ''],
    [0x63, 'Speaker Select', '扬声器选择', 'NC', 'RW', '音频', '枚举值随厂商定义'],
    [0x64, 'Audio: Microphone Volume', '麦克风音量', 'C', 'RW', '音频', ''],
    [0x66, 'Ambient Light Sensor', '环境光传感器', 'NC', 'RW', '信息', ''],
    [0x6B, 'Backlight Level: White', '背光等级：白', 'C', 'RW', '画面', ''],
    [0x6C, 'Video Black Level: Red', '红通道黑电平', 'C', 'RW', '色彩', ''],
    [0x6D, 'Backlight Level: Red', '背光等级：红', 'C', 'RW', '画面', ''],
    [0x6E, 'Video Black Level: Green', '绿通道黑电平', 'C', 'RW', '色彩', ''],
    [0x6F, 'Backlight Level: Green', '背光等级：绿', 'C', 'RW', '画面', ''],
    [0x70, 'Video Black Level: Blue', '蓝通道黑电平', 'C', 'RW', '色彩', ''],
    [0x71, 'Backlight Level: Blue', '背光等级：蓝', 'C', 'RW', '画面', ''],

    /* ---------------- LUT / 校准（与伽马相关） ---------------- */
    [0x72, 'Gamma', '伽马', 'CNC', 'RW', 'LUT/校准', '用于主机侧伽马校准，配合 0x73–0x78 使用'],
    [0x73, 'LUT Size', 'LUT 尺寸', 'T', 'RO', 'LUT/校准', '表类型：可读 LUT 的位宽与通道数'],
    [0x74, 'Single Point LUT Operation', '单点 LUT 操作', 'T', 'RW', 'LUT/校准', ''],
    [0x75, 'Block LUT Operation', '块 LUT 操作', 'T', 'RW', 'LUT/校准', ''],
    [0x76, 'Remote Procedure Call', '远程过程调用', 'T', 'WO', 'LUT/校准', ''],
    [0x78, 'Display Identification Operation', '显示器标识操作', 'T', 'RO', '信息', ''],

    /* ---------------- 画面（续） ---------------- */
    [0x7A, 'Adjust Focal Plane', '焦平面调节', 'C', 'RW', '画面', ''],
    [0x7C, 'Adjust Zoom', '缩放调节', 'C', 'RW', '画面', ''],
    [0x7E, 'Trapezoid', '梯形', 'C', 'RW', '几何', ''],
    [0x80, 'Keystone', '梯形校正', 'C', 'RW', '几何', ''],
    [0x82, 'Horizontal Mirror (Flip)', '水平镜像', 'NC', 'RW', '画面', ''],
    [0x84, 'Vertical Mirror (Flip)', '垂直镜像', 'NC', 'RW', '画面', ''],
    [0x86, 'Display Scaling', '显示缩放', 'NC', 'RW', '画面', ''],
    [0x87, 'Sharpness', '锐度', 'C', 'RW', '画面', ''],
    [0x88, 'Velocity Scan Modulation', '扫描速度调制', 'C', 'RW', '画面', 'CRT 时代'],
    [0x8A, 'Color Saturation', '色饱和度', 'C', 'RW', '色彩', ''],
    [0x8B, 'TV Channel Up/Down', '电视频道 +/-', 'NC', 'WO', '其它', ''],
    [0x8C, 'TV Sharpness', '电视锐度', 'C', 'RW', '画面', ''],
    [0x8D, 'Audio Mute / Screen Blank', '静音 / 关闭画面', 'NC', 'RW', '音频', ''],

    /* ---------------- 色相 / 窗口 / 电视 ---------------- */
    [0x8E, 'TV Contrast', '电视对比度', 'C', 'RW', '画面', ''],
    [0x8F, 'Audio Treble', '高音', 'C', 'RW', '音频', ''],
    [0x90, 'Hue', '色相', 'C', 'RW', '色彩', ''],
    [0x91, 'Audio Bass', '低音', 'C', 'RW', '音频', ''],
    [0x92, 'TV Black Level / Luminescence', '电视黑电平 / 亮度', 'C', 'RW', '画面', ''],
    [0x93, 'Audio Balance L/R', '左右声道平衡', 'C', 'RW', '音频', ''],
    [0x94, 'Audio Processor Mode', '音频处理模式', 'NC', 'RW', '音频', ''],
    [0x95, 'Window Position (TL_X)', '窗口左上 X', 'C', 'RW', 'OSD', ''],
    [0x96, 'Window Position (TL_Y)', '窗口左上 Y', 'C', 'RW', 'OSD', ''],
    [0x97, 'Window Position (BR_X)', '窗口右下 X', 'C', 'RW', 'OSD', ''],
    [0x98, 'Window Position (BR_Y)', '窗口右下 Y', 'C', 'RW', 'OSD', ''],
    [0x99, 'Window Control On/Off', '窗口开关', 'NC', 'RW', 'OSD', ''],
    [0x9A, 'Window Background', '窗口背景', 'C', 'RW', 'OSD', ''],
    [0x9B, '6 Axis Hue: Red', '六轴色相：红', 'C', 'RW', '色彩', ''],
    [0x9C, '6 Axis Hue: Yellow', '六轴色相：黄', 'C', 'RW', '色彩', ''],
    [0x9D, '6 Axis Hue: Green', '六轴色相：绿', 'C', 'RW', '色彩', ''],
    [0x9E, '6 Axis Hue: Cyan', '六轴色相：青', 'C', 'RW', '色彩', ''],
    [0x9F, '6 Axis Hue: Blue', '六轴色相：蓝', 'C', 'RW', '色彩', ''],
    [0xA0, '6 Axis Hue: Magenta', '六轴色相：品红', 'C', 'RW', '色彩', ''],
    [0xA2, 'Auto Setup On/Off', '自动调整开关', 'NC', 'WO', '几何', ''],
    [0xA4, 'Window Mask Control', '窗口遮罩控制', 'CNC', 'RW', 'OSD', ''],
    [0xA5, 'Change the Selected Window', '切换选中窗口', 'NC', 'RW', 'OSD', ''],
    [0xAA, 'Screen Orientation', '屏幕方向', 'NC', 'RO', '画面', ''],
    [0xAC, 'Horizontal Frequency', '行频（只读）', 'C', 'RO', '信息', '单位 Hz'],
    [0xAE, 'Vertical Frequency', '场频 / 刷新率（只读）', 'C', 'RO', '信息', '常见返回 0.01 Hz 粒度'],
    [0xB0, 'Settings', '设置', 'NC', 'WO', '其它', ''],
    [0xB2, 'Flat Panel Sub-Pixel Layout', '子像素排列', 'NC', 'RO', '信息', ''],
    [0xB4, 'Source Timing Mode', '源时序模式', 'T', 'RW', '信息', '表类型'],
    [0xB6, 'Display Technology Type', '显示技术类型', 'NC', 'RO', '信息', ''],
    [0xB7, 'Monitor Status', '显示器状态', 'CNC', 'RO', '信息', ''],
    [0xB8, 'Packet Count', '报文计数', 'CNC', 'RW', '信息', ''],
    [0xB9, 'Monitor X Origin', '显示器 X 原点', 'CNC', 'RW', '信息', '视频墙场景'],
    [0xBA, 'Monitor Y Origin', '显示器 Y 原点', 'CNC', 'RW', '信息', '视频墙场景'],
    [0xBB, 'Header Error Count', '报头错误计数', 'CNC', 'RW', '信息', '调试 DDC 链路质量'],
    [0xBC, 'Body CRC Error Count', '报文 CRC 错误计数', 'CNC', 'RW', '信息', '调试 DDC 链路质量'],
    [0xBD, 'Client ID', '客户端 ID', 'CNC', 'RW', '信息', ''],
    [0xBE, 'Link Control', '链路控制', 'CNC', 'RW', '信息', ''],
    [0xC0, 'Display Usage Time', '累计使用时间', 'CNC', 'RO', '信息', '单位小时'],

    /* ---------------- 描述符 / 信息 ---------------- */
    [0xC2, 'Display Descriptor Length', '显示描述符长度', 'C', 'RO', '信息', ''],
    [0xC3, 'Transmit Display Descriptor', '传输显示描述符', 'T', 'RW', '信息', ''],
    [0xC4, "Enable Display of 'Display Descriptor'", '显示描述符显示开关', 'CNC', 'RW', '信息', ''],
    [0xC6, 'Application Enable Key', '应用使能键', 'CNC', 'RO', '信息', ''],
    [0xC8, 'Display Controller Type', '显示控制器类型', 'CNC', 'RO', '信息', '可读出主控厂商（MStar / Realtek 等）'],
    [0xC9, 'Display Firmware Level', '固件版本', 'CNC', 'RO', '信息', ''],
    [0xCA, 'OSD / Button Control', 'OSD / 按键控制', 'CNC', 'RW', 'OSD', ''],
    [0xCC, 'OSD Language', 'OSD 语言', 'NC', 'RW', 'OSD', '语言代码随型号而异，以 capabilities 的 CC(...) 为准'],
    [0xCD, 'Status Indicators', '状态指示灯', 'CNC', 'RW', '其它', ''],
    [0xCE, 'Auxiliary Display Size', '辅助显示屏尺寸', 'CNC', 'RO', '信息', ''],
    [0xCF, 'Auxiliary Display Data', '辅助显示屏数据', 'T', 'WO', '信息', ''],
    [0xD0, 'Output Select', '输出选择', 'NC', 'RW', '输入/电源', ''],
    [0xD2, 'Asset Tag', '资产标签', 'T', 'RW', '信息', ''],
    [0xD4, 'Stereo Video Mode', '立体视频模式', 'CNC', 'RW', '画面', ''],
    [0xD6, 'Power Mode', '电源模式', 'NC', 'RW', '输入/电源', '写 0x05 关屏后需重新上电或按面板键恢复'],
    [0xD7, 'Auxiliary Power Output', '辅助电源输出', 'NC', 'RW', '输入/电源', ''],
    [0xDA, 'Scan Mode', '扫描模式', 'NC', 'RW', '画面', ''],
    [0xDB, 'Image Mode', '图像模式', 'NC', 'RW', '画面', ''],
    [0xDC, 'Display Mode', '显示模式', 'NC', 'RW', '画面', '枚举值随厂商定义（标准 / 文本 / 电影 / 游戏…）'],
    [0xDE, 'Scratch Pad', '暂存区', 'CNC', 'RW', '其它', ''],
    [0xDF, 'VCP Version', 'MCCS 版本（只读）', 'CNC', 'RO', '信息', '高字节主版本、低字节次版本，如 0x0202 = MCCS 2.2'],

    /* ---------------- 厂商自定义 ---------------- */
    [0xE0, 'Manufacturer Specific', '厂商自定义 0xE0', 'CNC', 'RW', '厂商自定义', ''],
    [0xE1, 'Manufacturer Specific / Power Control', '厂商自定义 0xE1（常见电源控制）', 'CNC', 'RW', '厂商自定义', ''],
    [0xE2, 'Manufacturer Specific', '厂商自定义 0xE2', 'CNC', 'RW', '厂商自定义', ''],
    [0xE3, 'Manufacturer Specific', '厂商自定义 0xE3', 'CNC', 'RW', '厂商自定义', ''],
    [0xE4, 'Manufacturer Specific', '厂商自定义 0xE4', 'CNC', 'RW', '厂商自定义', ''],
    [0xE5, 'Manufacturer Specific', '厂商自定义 0xE5', 'CNC', 'RW', '厂商自定义', ''],
    [0xE6, 'Manufacturer Specific', '厂商自定义 0xE6', 'CNC', 'RW', '厂商自定义', ''],
    [0xE7, 'Manufacturer Specific', '厂商自定义 0xE7', 'CNC', 'RW', '厂商自定义', ''],
    [0xE8, 'Manufacturer Specific', '厂商自定义 0xE8', 'CNC', 'RW', '厂商自定义', ''],
    [0xE9, 'Manufacturer Specific', '厂商自定义 0xE9', 'CNC', 'RW', '厂商自定义', ''],
    [0xEA, 'Manufacturer Specific', '厂商自定义 0xEA', 'CNC', 'RW', '厂商自定义', ''],
    [0xEB, 'Manufacturer Specific', '厂商自定义 0xEB', 'CNC', 'RW', '厂商自定义', ''],
    [0xEC, 'Manufacturer Specific', '厂商自定义 0xEC', 'CNC', 'RW', '厂商自定义', ''],
    [0xED, 'Manufacturer Specific', '厂商自定义 0xED', 'CNC', 'RW', '厂商自定义', ''],
    [0xEE, 'Manufacturer Specific', '厂商自定义 0xEE', 'CNC', 'RW', '厂商自定义', ''],
    [0xEF, 'Manufacturer Specific', '厂商自定义 0xEF', 'CNC', 'RW', '厂商自定义', ''],
    [0xF0, 'Manufacturer Specific', '厂商自定义 0xF0', 'CNC', 'RW', '厂商自定义', ''],
    [0xF1, 'Manufacturer Specific', '厂商自定义 0xF1', 'CNC', 'RW', '厂商自定义', ''],
    [0xF2, 'Manufacturer Specific', '厂商自定义 0xF2', 'CNC', 'RW', '厂商自定义', ''],
    [0xF3, 'Manufacturer Specific', '厂商自定义 0xF3', 'CNC', 'RW', '厂商自定义', ''],
    [0xF4, 'Manufacturer Specific', '厂商自定义 0xF4', 'CNC', 'RW', '厂商自定义', ''],
    [0xF5, 'Manufacturer Specific', '厂商自定义 0xF5', 'CNC', 'RW', '厂商自定义', ''],
    [0xF6, 'Manufacturer Specific', '厂商自定义 0xF6', 'CNC', 'RW', '厂商自定义', ''],
    [0xF7, 'Manufacturer Specific', '厂商自定义 0xF7', 'CNC', 'RW', '厂商自定义', ''],
    [0xF8, 'Manufacturer Specific', '厂商自定义 0xF8', 'CNC', 'RW', '厂商自定义', ''],
    [0xF9, 'Manufacturer Specific', '厂商自定义 0xF9', 'CNC', 'RW', '厂商自定义', ''],
    [0xFA, 'Manufacturer Specific', '厂商自定义 0xFA', 'CNC', 'RW', '厂商自定义', ''],
    [0xFB, 'Manufacturer Specific', '厂商自定义 0xFB', 'CNC', 'RW', '厂商自定义', ''],
    [0xFC, 'Manufacturer Specific', '厂商自定义 0xFC', 'CNC', 'RW', '厂商自定义', ''],
    [0xFD, 'Manufacturer Specific Feature', '厂商自定义 0xFD', 'CNC', 'RW', '厂商自定义', 'MCCS 明确保留给厂商'],
    [0xFE, 'Manufacturer Specific', '厂商自定义 0xFE', 'CNC', 'RW', '厂商自定义', ''],
    [0xFF, 'Manufacturer Specific Feature', '厂商自定义 0xFF', 'CNC', 'RW', '厂商自定义', 'MCCS 明确保留给厂商']
  ];

  /* 已确认的枚举值表（其余非连续量的取值必须以显示器 capabilities 为准） */
  var VALUES = {
    0x02: { 1: '无新控制值', 2: '有一个或多个新控制值已保存' },
    0x04: { 1: '执行恢复出厂设置' },
    0x05: { 1: '执行' }, 0x06: { 1: '执行' }, 0x08: { 1: '执行' }, 0x0A: { 1: '执行' },
    0x14: { 0x01: 'sRGB', 0x02: '显示原生（Native）', 0x03: '4000 K', 0x04: '5000 K',
            0x05: '6500 K', 0x06: '7500 K', 0x07: '8200 K', 0x08: '9300 K',
            0x09: '10000 K', 0x0A: '11500 K', 0x0B: '5700 K / 用户自定义' },
    0x1E: { 1: '开始自动调整' },
    0x1F: { 1: '开始自动色彩调整' },
    0x60: { 0x01: 'VGA-1', 0x02: 'VGA-2', 0x03: 'DVI-1', 0x04: 'DVI-2',
            0x05: '复合视频 1', 0x06: '复合视频 2', 0x07: 'S-Video-1', 0x08: 'S-Video-2',
            0x09: 'Tuner-1', 0x0A: 'Tuner-2', 0x0B: 'Tuner-3',
            0x0C: '色差分量 1', 0x0D: '色差分量 2', 0x0E: '色差分量 3',
            0x0F: 'DisplayPort-1', 0x10: 'DisplayPort-2', 0x11: 'HDMI-1', 0x12: 'HDMI-2' },
    0x82: { 0: '正常', 1: '水平镜像' },
    0x84: { 0: '正常', 1: '垂直镜像' },
    0x86: { 0x01: '不缩放（原始尺寸）', 0x02: '最大画面，不改变宽高比', 0x03: '最大垂直画面，不改变宽高比',
            0x04: '最大水平画面，不改变宽高比', 0x05: '最大垂直画面，允许宽高比失真',
            0x06: '最大水平画面，允许宽高比失真', 0x07: '水平方向线性拉伸（压缩）',
            0x08: '水平与垂直方向线性拉伸（压缩）', 0x09: '压缩模式（Squeeze）', 0x0A: '非线性拉伸' },
    0x8B: { 1: '频道 +1', 2: '频道 -1' },
    0x8D: { 1: '静音音频', 2: '取消静音' },
    0xAA: { 0x01: '0°', 0x02: '90°', 0x03: '180°', 0x04: '270°' },
    0xB2: { 0x00: '未定义', 0x01: 'RGB 竖条纹', 0x02: 'RGB 横条纹', 0x03: 'BGR 竖条纹', 0x04: 'BGR 横条纹' },
    0xB6: { 0x01: 'CRT（荫罩）', 0x02: 'CRT（栅网）', 0x03: 'LCD（有源矩阵）', 0x04: 'LED', 0x05: '等离子' },
    0xCA: { 0x01: 'OSD 关闭 / 面板按键有效', 0x02: 'OSD 打开' },
    0xCC: { 0x01: '繁体中文', 0x02: '英语', 0x03: '法语', 0x04: '德语', 0x06: '日语',
            0x0A: '西班牙语', 0x0D: '简体中文' },
    0xD6: { 0x01: '开机（DPM: On / DPMS: Off）', 0x02: '待机 Standby', 0x03: '挂起 Suspend',
            0x04: '关机（DPM: Off / DPMS: Off）', 0x05: '仅写入：关闭画面' },
    0xDF: { 0x0101: 'MCCS 1.1', 0x0200: 'MCCS 2.0', 0x0201: 'MCCS 2.1', 0x0202: 'MCCS 2.2', 0x0300: 'MCCS 3.0' }
  };

  /* DDC/CI 操作码（报文第 3 字节，即长度字节之后的第一字节） */
  var OPCODES = [
    { c: 0x01, en: 'Get VCP Feature', zh: '读取 VCP 特性', dir: 'req', n: '主机 → 显示器；显示器以 0x02 应答' },
    { c: 0x02, en: 'VCP Feature Reply', zh: '读取应答', dir: 'rep', n: '显示器 → 主机' },
    { c: 0x03, en: 'Set VCP Feature', zh: '写入 VCP 特性', dir: 'req', n: '显示器成功时不回包，失败可能返回错误应答' },
    { c: 0x06, en: 'Timing Report Request', zh: '时序报告请求', dir: 'req', n: '' },
    { c: 0x07, en: 'Timing Report Reply', zh: '时序报告应答', dir: 'rep', n: '' },
    { c: 0x09, en: 'VCP Reset', zh: 'VCP 复位', dir: 'req', n: '' },
    { c: 0x0C, en: 'Save Current Settings', zh: '保存当前设置到 NVRAM', dir: 'req', n: '对应 ddcutil scs' },
    { c: 0xF3, en: 'Get Capabilities Request', zh: '读取能力字符串请求', dir: 'req', n: '' },
    { c: 0xE3, en: 'Get Capabilities Reply', zh: '能力字符串应答', dir: 'rep', n: '' }
  ];

  var VCP = RAW.map(function (r) {
    var e = { c: r[0], en: r[1], zh: r[2], t: r[3], rw: r[4], g: r[5], n: r[6] || '' };
    if (VALUES[e.c]) e.v = VALUES[e.c];
    return e;
  });

  window.MCCSData = { VCP: VCP, OPCODES: OPCODES, VALUES: VALUES };
})();
