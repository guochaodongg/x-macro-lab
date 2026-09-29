/* ==========================================================================
   cie-data.js — CIE 1931 色彩科学基础数据

   纯数据层，没有逻辑、不碰 DOM，可在 Node 里直接 require 后逐项核对：

     ILLUMINANTS     六种参考白点：色度坐标 + 归一化 XYZ（Y = 100）
     ILLUMINANT_ORDER  下拉框顺序
     ADAPT           四种色度适应：Bradford / Von Kries / XYZ Scaling / None
     RGB_SPACES      六种 RGB 空间的基色色度、白点与传递函数描述
     RGB_ORDER       下拉框顺序
     SPECTRAL_LOCUS  CIE 1931 2° 光谱轨迹（xy 色度坐标 + 波长，380~700 nm）
     LOCUS_TICKS     光谱轨迹上要标注的波长
     DIAGRAM_THEME   色度图配色（亮 / 暗主题，SVG 里要写死色值）

   数值取自 Bruce Lindbloom 的公开参考模型（www.brucelindbloom.com）与
   CIE 1931 2° 标准观察者数据；色度适应矩阵、传递函数分界点也与参考实现
   CIE Color Space Analyzer（zq-moonlight/cie1931-color-converter）逐项一致，
   便于把两边结果放在一起比对。

   传递函数用「描述对象」而不是函数表达，这样数据文件保持纯数据；真正的
   编解码在 cie.js 的 encode()/decode() 里按 tf.k 分派：

     { k: 'srgb' }        IEC 61966-2-1 分段（12.92 / 2.4，分界 0.04045）
     { k: 'gamma', g: n }  纯幂函数 γ = n
     { k: 'rec709' }      BT.709 OETF（4.5 / 0.45，分界 0.081 / 0.018）
     { k: 'rec2020' }     BT.2020 OETF（4.5 / 0.45，分界 0.08145 / 0.0181）
     { k: 'prophoto' }    ProPhoto 分段（16 / 1.8，分界 0.031248 / 0.001953125）
   ========================================================================== */
(function (global) {
  'use strict';

  /* ------------------------------------------------------------ 参考白点 */
  /* x / y 为 CIE 1931 色度坐标，XYZ 为 Y = 100 的归一化三刺激值。
     D 系列是「日光」合成白点，A 是钨丝灯，C 是早期日光（已被 D 系列取代），
     E 是等能白点（三刺激值相等，用于理论推导）。 */
  var ILLUMINANTS = {
    D65: {
      key: 'D65', name: 'D65', temp: 6504, note: 'sRGB / 视频 / 桌面显示',
      x: 0.31271, y: 0.32902, XYZ: [95.047, 100.000, 108.883]
    },
    D50: {
      key: 'D50', name: 'D50', temp: 5003, note: '印刷 / ICC 特性文件 / Lab',
      x: 0.34567, y: 0.35850, XYZ: [96.422, 100.000, 82.521]
    },
    D75: {
      key: 'D75', name: 'D75', temp: 7504, note: '高色温日光',
      x: 0.29902, y: 0.31485, XYZ: [94.972, 100.000, 122.638]
    },
    A: {
      key: 'A', name: 'A', temp: 2856, note: '钨丝灯 / 白炽灯',
      x: 0.44757, y: 0.40745, XYZ: [109.850, 100.000, 35.585]
    },
    C: {
      key: 'C', name: 'C', temp: 6774, note: '早期日光（历史值）',
      x: 0.31006, y: 0.31616, XYZ: [98.074, 100.000, 118.232]
    },
    E: {
      key: 'E', name: 'E', temp: 5400, note: '等能白点（理论）',
      x: 0.33333, y: 0.33333, XYZ: [100.000, 100.000, 100.000]
    }
  };

  var ILLUMINANT_ORDER = ['D65', 'D50', 'D75', 'A', 'C', 'E'];

  /* ------------------------------------------------------------ 色度适应 */
  /* 三套锥体响应近似矩阵 + 「不做适应」。M 为 null 表示绝对色度（不换算白点）。
     Bradford 最接近人眼实测，Von Kries 是经典 HPE 锥体响应，XYZ Scaling 最粗糙。 */
  var ADAPT = {
    Bradford: {
      key: 'Bradford', name: 'Bradford',
      note: '推荐，最接近人眼锥体响应实测',
      M: [[0.8951, 0.2664, -0.1614], [-0.7502, 1.7135, 0.0367], [0.0389, -0.0685, 1.0296]]
    },
    VonKries: {
      key: 'VonKries', name: 'Von Kries',
      note: '经典锥体响应（HPE）近似',
      M: [[0.40024, 0.7076, -0.08081], [-0.2263, 1.16532, 0.0457], [0, 0, 0.91822]]
    },
    XYZScaling: {
      key: 'XYZScaling', name: 'XYZ Scaling',
      note: '直接按 XYZ 分量缩放，较粗糙',
      M: [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
    },
    None: {
      key: 'None', name: 'None (Absolute)',
      note: '不做色度适应，保留绝对三刺激值',
      M: null
    }
  };

  var ADAPT_ORDER = ['Bradford', 'VonKries', 'XYZScaling', 'None'];

  /* --------------------------------------------------------- RGB 空间 */
  /* px / py 是 R、G、B 三个基色的色度坐标；wp 指向 ILLUMINANTS 的键；
     tf 是传递函数描述（见文件头）；tfName 只是给界面看的一行说明。 */
  var RGB_SPACES = {
    sRGB: {
      key: 'sRGB', name: 'sRGB', wp: 'D65',
      px: [0.64, 0.30, 0.15], py: [0.33, 0.60, 0.06],
      tf: { k: 'srgb' }, tfName: 'IEC 61966-2-1 分段（12.92 / 2.4）',
      note: '网页 / 桌面 / 消费显示的默认空间'
    },
    AdobeRGB: {
      key: 'AdobeRGB', name: 'Adobe RGB (1998)', wp: 'D65',
      px: [0.64, 0.21, 0.15], py: [0.33, 0.71, 0.06],
      tf: { k: 'gamma', g: 2.19921875 }, tfName: '纯幂函数 γ = 563/256 ≈ 2.1992',
      note: '印刷与广色域工作流，青色覆盖更好'
    },
    DisplayP3: {
      key: 'DisplayP3', name: 'Display P3', wp: 'D65',
      px: [0.68, 0.265, 0.15], py: [0.32, 0.69, 0.06],
      tf: { k: 'srgb' }, tfName: '与 sRGB 相同的分段传递函数',
      note: 'DCI-P3 基色 + D65 白点 + sRGB 传递函数，苹果广色域显示'
    },
    Rec709: {
      key: 'Rec709', name: 'Rec. 709', wp: 'D65',
      px: [0.64, 0.30, 0.15], py: [0.33, 0.60, 0.06],
      tf: { k: 'rec709' }, tfName: 'BT.709 OETF（4.5 / 0.45）',
      note: '与 sRGB 同基色同白点，传递函数不同（高清视频）'
    },
    Rec2020: {
      key: 'Rec2020', name: 'Rec. 2020', wp: 'D65',
      px: [0.708, 0.170, 0.131], py: [0.292, 0.797, 0.046],
      tf: { k: 'rec2020' }, tfName: 'BT.2020 OETF（4.5 / 0.45）',
      note: '超高清 / HDR 广色域，覆盖约 76% 可见色'
    },
    ProPhoto: {
      key: 'ProPhoto', name: 'ProPhoto RGB', wp: 'D50',
      px: [0.7347, 0.1596, 0.0366], py: [0.2653, 0.8404, 0.0001],
      tf: { k: 'prophoto' }, tfName: '分段 γ 1.8（16 / 1.8）',
      note: 'Kodak ROMM，摄影宽色域，白点 D50（需要色度适应）'
    }
  };

  var RGB_ORDER = ['sRGB', 'AdobeRGB', 'DisplayP3', 'Rec709', 'Rec2020', 'ProPhoto'];

  /* ------------------------------------------------------- 光谱轨迹 */
  /* CIE 1931 2° 标准观察者的光谱轨迹在 xy 平面上的形状（单色光的极限色度）。
     nm 是波长，最后一段 700 → 380 直连，就是常说的「紫线」（紫红色不落在
     光谱上，只能靠两端混合出来）。 */
  var SPECTRAL_LOCUS = [
    { nm: 380, x: 0.1741, y: 0.0050 },
    { nm: 410, x: 0.1726, y: 0.0048 },
    { nm: 430, x: 0.1689, y: 0.0069 },
    { nm: 445, x: 0.1611, y: 0.0138 },
    { nm: 460, x: 0.1440, y: 0.0297 },
    { nm: 470, x: 0.1241, y: 0.0578 },
    { nm: 480, x: 0.0913, y: 0.1327 },
    { nm: 490, x: 0.0454, y: 0.2950 },
    { nm: 500, x: 0.0082, y: 0.5384 },
    { nm: 510, x: 0.0139, y: 0.7502 },
    { nm: 520, x: 0.0743, y: 0.8338 },
    { nm: 530, x: 0.1547, y: 0.8059 },
    { nm: 540, x: 0.2296, y: 0.7543 },
    { nm: 550, x: 0.3016, y: 0.6923 },
    { nm: 560, x: 0.3731, y: 0.6245 },
    { nm: 570, x: 0.4441, y: 0.5547 },
    { nm: 580, x: 0.5125, y: 0.4866 },
    { nm: 590, x: 0.5752, y: 0.4242 },
    { nm: 600, x: 0.6270, y: 0.3725 },
    { nm: 610, x: 0.6658, y: 0.3340 },
    { nm: 620, x: 0.6915, y: 0.3083 },
    { nm: 630, x: 0.7079, y: 0.2920 },
    { nm: 640, x: 0.7190, y: 0.2809 },
    { nm: 650, x: 0.7260, y: 0.2740 },
    { nm: 660, x: 0.7300, y: 0.2700 },
    { nm: 670, x: 0.7320, y: 0.2680 },
    { nm: 680, x: 0.7334, y: 0.2666 },
    { nm: 690, x: 0.7344, y: 0.2656 },
    { nm: 700, x: 0.7346, y: 0.2654 }
  ];

  /* 要标注波长刻度的位置（对应的轨迹点必须存在，cie.js 会校验） */
  var LOCUS_TICKS = [460, 480, 500, 520, 540, 560, 580, 600, 620, 650, 700];

  /* --------------------------------------------------- 色度图配色 */
  /* SVG 里的 fill/stroke 必须是真色值（presentation 属性不认 var()），
     所以明暗两套主题在这里各写一份，跟着 html[data-theme] 切换。 */
  var DIAGRAM_THEME = {
    light: {
      bg: '#ffffff', grid: '#dde3ec', axis: '#c3ccda',
      text: '#16202e', soft: '#8492a6', label: '#55637a',
      locus: '#1e293b', purple: '#64748b',
      tri: '#0f172a', triInner: '#ffffff',
      wpFill: '#ffffff', wpStroke: '#0f172a',
      point: '#ef4444', cross: '#ffffff',
      planck: '#7c3aed'
    },
    dark: {
      bg: '#182131', grid: '#2a3648', axis: '#3b4a62',
      text: '#e8edf5', soft: '#7c8aa0', label: '#a9b6c9',
      locus: '#cbd5e1', purple: '#94a3b8',
      tri: '#e8edf5', triInner: '#182131',
      wpFill: '#182131', wpStroke: '#e8edf5',
      point: '#f87171', cross: '#182131',
      planck: '#a78bfa'
    }
  };

  global.CIEData = {
    ILLUMINANTS: ILLUMINANTS,
    ILLUMINANT_ORDER: ILLUMINANT_ORDER,
    ADAPT: ADAPT,
    ADAPT_ORDER: ADAPT_ORDER,
    RGB_SPACES: RGB_SPACES,
    RGB_ORDER: RGB_ORDER,
    SPECTRAL_LOCUS: SPECTRAL_LOCUS,
    LOCUS_TICKS: LOCUS_TICKS,
    DIAGRAM_THEME: DIAGRAM_THEME
  };
})(typeof window !== 'undefined' ? window : globalThis);
