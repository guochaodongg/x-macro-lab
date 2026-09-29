/* ==========================================================================
   cie.js — CIE 1931 色彩空间分析与转换（功能移植）

   移植自 CIE Color Space Analyzer（zq-moonlight/cie1931-color-converter），
   数学模型与 cie-data.js 里的常数一起取自 Bruce Lindbloom 的公开参考模型。

   这一层是纯逻辑 + 纯字符串渲染，不碰 DOM，可以在 Node 里直接跑：

     输入                readout() 出来的东西
     ────────────        ────────────────────────────────
     XYZ 三刺激值        XYZ / xyY / CCT
     xyY 色度坐标        Lab + LCH(ab)
     CCT 色温            Luv + LCH(uv)
     设备 RGB / HEX      Device RGB + HEX + sRGB 对照
     Lab / LCH(ab)       是否超出所选 RGB 色域
     Luv / LCH(uv)       以及二十项格式化好的读数（values）

   色度图（diagramBase / diagramOverlay）也在这里生成：不是 canvas，而是内联
   SVG 字符串 —— 站点约定「零外链、可 file:// 直开」，而且 SVG 能在 Node 里
   逐节点断言。背景那层「当前色度下的最大 sRGB 渲染亮度」用 6 px 网格 + 同行
   合并 + 轨迹裁剪实现，其它层是光谱轨迹、波长标注、黑体轨迹、色域三角形、
   白点与当前取点。

   Exposes global.CIE.
   ========================================================================== */
(function (global) {
  'use strict';

  var D = global.CIEData;
  if (!D) throw new Error('cie.js 需要先加载 cie-data.js');

  var CIE_E = 216 / 24389;   /* (6/29)^3，Lab 分段点 */
  var CIE_K = 24389 / 27;    /* (29/3)^3 */
  var TOL = 0.0005;          /* 色域判定容差，与参考实现一致 */

  /* ------------------------------------------------------------ 小工具 */

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* 数字 → 定长字符串；非有限值一律显示成「—」，绝不让 NaN 漏到界面上 */
  function fixed(v, dp) {
    return isFinite(v) ? v.toFixed(dp) : '—';
  }

  /* 路径里的坐标：三位小数就够，别把浮点尾巴全写进 SVG */
  function n3(v) { return String(Math.round(v * 1000) / 1000); }

  function num(v) {
    var f = typeof v === 'number' ? v : parseFloat(v);
    return isFinite(f) ? f : 0;
  }

  function deg2rad(d) { return d * Math.PI / 180; }

  function rad2deg(r) {
    var d = r * 180 / Math.PI;
    return d < 0 ? d + 360 : d;
  }

  /* ------------------------------------------------------------ 矩阵 */

  var matrix = {
    mulMatVec: function (m, v) {
      return [
        m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
        m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
        m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2]
      ];
    },
    mulMatMat: function (a, b) {
      var r = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
      for (var i = 0; i < 3; i++) {
        for (var j = 0; j < 3; j++) {
          r[i][j] = a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j];
        }
      }
      return r;
    },
    invMat: function (m) {
      var det = m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1])
        - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
        + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
      var idet = 1 / det;
      return [
        [(m[1][1] * m[2][2] - m[1][2] * m[2][1]) * idet,
          (m[0][2] * m[2][1] - m[0][1] * m[2][2]) * idet,
          (m[0][1] * m[1][2] - m[0][2] * m[1][1]) * idet],
        [(m[1][2] * m[2][0] - m[1][0] * m[2][2]) * idet,
          (m[0][0] * m[2][2] - m[0][2] * m[2][0]) * idet,
          (m[0][2] * m[1][0] - m[0][0] * m[1][2]) * idet],
        [(m[1][0] * m[2][1] - m[1][1] * m[2][0]) * idet,
          (m[0][1] * m[2][0] - m[0][0] * m[2][1]) * idet,
          (m[0][0] * m[1][1] - m[0][1] * m[1][0]) * idet]
      ];
    }
  };

  var mulMatVec = matrix.mulMatVec;
  var mulMatMat = matrix.mulMatMat;
  var invMat = matrix.invMat;

  /* -------------------------------------------------- 传递函数（EOTF/OETF） */

  /* 解码：编码值（0~1）→ 线性光。gamma 那一支写成奇函数，负值也有限，
     否则 Math.pow(-0.2, 2.1992) 会直接变成 NaN 并污染整条链路。 */
  function decode(tf, v) {
    switch (tf.k) {
      case 'srgb':
        return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      case 'gamma':
        return v < 0 ? -Math.pow(-v, tf.g) : Math.pow(v, tf.g);
      case 'rec709':
        return v < 0.081 ? v / 4.5 : Math.pow((v + 0.099) / 1.099, 1 / 0.45);
      case 'rec2020':
        return v < 0.08145 ? v / 4.5 : Math.pow((v + 0.099) / 1.099, 1 / 0.45);
      case 'prophoto':
        return v < 0.031248 ? v / 16 : Math.pow(v, 1.8);
      default:
        return v;
    }
  }

  /* 编码：线性光 → 编码值（0~1） */
  function encode(tf, v) {
    switch (tf.k) {
      case 'srgb':
        return v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
      case 'gamma':
        return v < 0 ? -Math.pow(-v, 1 / tf.g) : Math.pow(v, 1 / tf.g);
      case 'rec709':
        return v < 0.018 ? 4.5 * v : 1.099 * Math.pow(v, 0.45) - 0.099;
      case 'rec2020':
        return v < 0.0181 ? 4.5 * v : 1.099 * Math.pow(v, 0.45) - 0.099;
      case 'prophoto':
        return v < 0.001953125 ? v * 16 : Math.pow(v, 1 / 1.8);
      default:
        return v;
    }
  }

  /* --------------------------------------------- RGB ↔ XYZ 与色度适应 */

  /* 由基色色度 + 白点三刺激值解出 3×3 矩阵：把三个基色的 Y 归一到 1，
     解出各自的缩放系数，使 RGB = (1,1,1) 正好落在白点上。 */
  function buildRGBMatrix(sp) {
    var ill = D.ILLUMINANTS[sp.wp];
    var Xr = sp.px[0] / sp.py[0], Yr = 1, Zr = (1 - sp.px[0] - sp.py[0]) / sp.py[0];
    var Xg = sp.px[1] / sp.py[1], Yg = 1, Zg = (1 - sp.px[1] - sp.py[1]) / sp.py[1];
    var Xb = sp.px[2] / sp.py[2], Yb = 1, Zb = (1 - sp.px[2] - sp.py[2]) / sp.py[2];
    var PInv = invMat([[Xr, Xg, Xb], [Yr, Yg, Yb], [Zr, Zg, Zb]]);
    var S = mulMatVec(PInv, [ill.XYZ[0] / 100, ill.XYZ[1] / 100, ill.XYZ[2] / 100]);
    return [
      [S[0] * Xr, S[1] * Xg, S[2] * Xb],
      [S[0] * Yr, S[1] * Yg, S[2] * Yb],
      [S[0] * Zr, S[1] * Zg, S[2] * Zb]
    ];
  }

  /* 色度适应：在锥体响应空间里按分量缩放，再变回 XYZ。
     Von Kries 系数矩阵的逆矩阵直接解析写出，省掉一次运行时求逆。 */
  function adaptationMatrix(srcWP, dstWP, method) {
    var A = D.ADAPT[method] || D.ADAPT.Bradford;
    if (!A.M) return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    if (srcWP[0] === dstWP[0] && srcWP[1] === dstWP[1] && srcWP[2] === dstWP[2]) {
      return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    }
    var srcC = mulMatVec(A.M, srcWP);
    var dstC = mulMatVec(A.M, dstWP);
    var diag = [
      [dstC[0] / srcC[0], 0, 0],
      [0, dstC[1] / srcC[1], 0],
      [0, 0, dstC[2] / srcC[2]]
    ];
    return mulMatMat(invMat(A.M), mulMatMat(diag, A.M));
  }

  function normalizeEnv(env) {
    env = env || {};
    var wp = D.ILLUMINANTS[env.wp] ? env.wp : 'D65';
    var space = D.RGB_SPACES[env.space] ? env.space : 'sRGB';
    var adapt = D.ADAPT[env.adapt] ? env.adapt : 'Bradford';
    return { wp: wp, space: space, adapt: adapt };
  }

  /* 一次算好这一组环境参数对应的全部矩阵，后续重复使用 */
  function pipeline(env) {
    var e = normalizeEnv(env);
    var spec = D.RGB_SPACES[e.space];
    var WP = D.ILLUMINANTS[e.wp].XYZ;
    var WP_RGB = D.ILLUMINANTS[spec.wp].XYZ;
    var M_rgb2xyz = buildRGBMatrix(spec);
    var M_xyz2rgb = invMat(M_rgb2xyz);
    var M_fwd = adaptationMatrix(WP_RGB, WP, e.adapt);
    var M_rev = adaptationMatrix(WP, WP_RGB, e.adapt);
    return {
      env: e,
      spec: spec,
      WP: WP,
      WP_RGB: WP_RGB,
      M_rgb2xyz: M_rgb2xyz,
      M_xyz2rgb: M_xyz2rgb,
      M_adapt: M_fwd,
      M_adaptRev: M_rev
    };
  }

  /* 线性 RGB（0~1）→ XYZ（0~100），已换算到目标白点 */
  function rgbToXyz(p, lin) {
    var v = mulMatVec(p.M_adapt, mulMatVec(p.M_rgb2xyz, lin));
    return [v[0] * 100, v[1] * 100, v[2] * 100];
  }

  /* XYZ（0~100）→ 线性 RGB（可能为负 / 大于 1，超出色域就是靠这个看出来的） */
  function xyzToRgb(p, XYZ) {
    return mulMatVec(p.M_xyz2rgb, mulMatVec(p.M_adaptRev, [XYZ[0] / 100, XYZ[1] / 100, XYZ[2] / 100]));
  }

  /* ------------------------------------------------------------ 转换 */

  var convert = {
    XYZ_to_xyY: function (XYZ) {
      var sum = XYZ[0] + XYZ[1] + XYZ[2];
      if (!isFinite(sum) || sum === 0) return [0.3127, 0.3290, 0];
      return [XYZ[0] / sum, XYZ[1] / sum, XYZ[1]];
    },
    xyY_to_XYZ: function (xyY) {
      var x = num(xyY[0]), y = num(xyY[1]), Y = num(xyY[2]);
      if (y === 0) return [0, 0, 0];
      return [(x * Y) / y, Y, ((1 - x - y) * Y) / y];
    },
    /* McCamy 近似：n = (x - 0.3320) / (0.1858 - y)，三段多项式。
       偏离黑体轨迹越远误差越大；y 恰好落在 0.1858 上时发散，这里返回 null。 */
    xy_to_CCT: function (x, y) {
      var den = 0.1858 - y;
      if (Math.abs(den) < 1e-9) return null;
      var n = (x - 0.3320) / den;
      var cct = 449 * n * n * n + 3525 * n * n + 6823.3 * n + 5520.33;
      return isFinite(cct) && cct > 0 ? cct : null;
    },
    /* 色温 → 黑体轨迹上的 xy（Kang 等的三次拟合，1667~25000 K） */
    CCT_to_xy: function (T) {
      T = num(T);
      if (!(T >= 1667 && T <= 25000)) return null;
      var x;
      if (T <= 4000) {
        x = -0.2661239e9 / (T * T * T) - 0.2343589e6 / (T * T) + 0.8776956e3 / T + 0.179910;
      } else {
        x = -3.0258469e9 / (T * T * T) + 2.1070379e6 / (T * T) + 0.2226347e3 / T + 0.240390;
      }
      var x2 = x * x, x3 = x2 * x, y;
      if (T <= 2222) {
        y = -1.1063814 * x3 - 1.34811020 * x2 + 2.18555832 * x - 0.20219683;
      } else if (T <= 4000) {
        y = -0.9549476 * x3 - 1.37418593 * x2 + 2.09137015 * x - 0.16748867;
      } else {
        y = 3.0817580 * x3 - 5.87338670 * x2 + 3.75112997 * x - 0.37001483;
      }
      return [x, y];
    },
    XYZ_to_Lab: function (XYZ, WP) {
      var xr = XYZ[0] / WP[0], yr = XYZ[1] / WP[1], zr = XYZ[2] / WP[2];
      var fx = xr > CIE_E ? Math.cbrt(xr) : (CIE_K * xr + 16) / 116;
      var fy = yr > CIE_E ? Math.cbrt(yr) : (CIE_K * yr + 16) / 116;
      var fz = zr > CIE_E ? Math.cbrt(zr) : (CIE_K * zr + 16) / 116;
      return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
    },
    Lab_to_XYZ: function (Lab, WP) {
      var fy = (Lab[0] + 16) / 116, fx = Lab[1] / 500 + fy, fz = fy - Lab[2] / 200;
      var xr = fx * fx * fx > CIE_E ? fx * fx * fx : (116 * fx - 16) / CIE_K;
      var yr = Lab[0] > CIE_K * CIE_E ? Math.pow((Lab[0] + 16) / 116, 3) : Lab[0] / CIE_K;
      var zr = fz * fz * fz > CIE_E ? fz * fz * fz : (116 * fz - 16) / CIE_K;
      return [xr * WP[0], yr * WP[1], zr * WP[2]];
    },
    /* 直角坐标 (a, b) → 极坐标 (C, h)，Lab 与 Luv 共用 */
    ab_to_LCH: function (a, b) {
      var C = Math.sqrt(a * a + b * b);
      var H = rad2deg(Math.atan2(b, a));
      return [C, isFinite(H) ? H : 0];
    },
    LCH_to_ab: function (C, H) {
      var hr = deg2rad(num(H));
      return [num(C) * Math.cos(hr), num(C) * Math.sin(hr)];
    },
    /* xy → CIE 1960 UCS 的 (u, v)。Duv 必须在 1960 空间里量，用 1976 的
       u'v' 量出来的距离不是标准定义的 Duv。 */
    xy_to_uv60: function (x, y) {
      var den = -2 * x + 12 * y + 3;
      if (Math.abs(den) < 1e-12) return null;
      return [4 * x / den, 6 * y / den];
    },

    /* CIE 1976 UCS：u' = 4x/(-2x+12y+3)，v' = 9y/(-2x+12y+3)。
       与 1960 的差别只在 v（v' = 1.5·v60），u 不变。 */
    xy_to_uv76: function (x, y) {
      var den = -2 * x + 12 * y + 3;
      if (!isFinite(den) || Math.abs(den) < 1e-12) return null;
      return [4 * x / den, 9 * y / den];
    },

    /* 逆变换：设 Y = 1，由 v' 反解 D = X+15Y+3Z = 9/v'，再回 xyz。 */
    uv76_to_xy: function (u, v) {
      if (!isFinite(u) || !isFinite(v) || !(v > 1e-9)) return null;
      var D = 9 / v;
      var X = u * D / 4;
      var Z = (D - X - 15) / 3;
      var sum = X + 1 + Z;
      if (!(sum > 1e-12)) return null;
      return [X / sum, 1 / sum];
    },
    XYZ_to_Luv: function (XYZ, WP) {
      var den = XYZ[0] + 15 * XYZ[1] + 3 * XYZ[2];
      var up = den === 0 ? 0 : (4 * XYZ[0]) / den;
      var vp = den === 0 ? 0 : (9 * XYZ[1]) / den;
      var denW = WP[0] + 15 * WP[1] + 3 * WP[2];
      var upW = (4 * WP[0]) / denW, vpW = (9 * WP[1]) / denW;
      var yr = XYZ[1] / WP[1];
      var L = yr > CIE_E ? 116 * Math.cbrt(yr) - 16 : CIE_K * yr;
      return [L, 13 * L * (up - upW), 13 * L * (vp - vpW)];
    },
    Luv_to_XYZ: function (Luv, WP) {
      if (num(Luv[0]) === 0) return [0, 0, 0];
      var denW = WP[0] + 15 * WP[1] + 3 * WP[2];
      var upW = (4 * WP[0]) / denW, vpW = (9 * WP[1]) / denW;
      var up = num(Luv[1]) / (13 * num(Luv[0])) + upW;
      var vp = num(Luv[2]) / (13 * num(Luv[0])) + vpW;
      var Y = num(Luv[0]) > CIE_K * CIE_E
        ? Math.pow((num(Luv[0]) + 16) / 116, 3) : num(Luv[0]) / CIE_K;
      Y = Y * WP[1];
      if (vp === 0) return [0, 0, 0];
      return [Y * (9 * up) / (4 * vp), Y, Y * (12 - 3 * up - 20 * vp) / (4 * vp)];
    }
  };

  /* -------------------------------------------------------- 色域与输出 */

  /* 线性 RGB 是否落在 0~1 之外（留一点浮点容差） */
  function outOfGamut(lin) {
    for (var i = 0; i < 3; i++) {
      if (lin[i] < -TOL || lin[i] > 1 + TOL) return true;
    }
    return false;
  }

  function to8(v) {
    return Math.round(clamp(encode({ k: 'srgb' }, clamp(v, 0, 1)), 0, 1) * 255);
  }

  function rgbHex(rgb) {
    var h = '#';
    for (var i = 0; i < 3; i++) {
      var s = clamp(Math.round(num(rgb[i])), 0, 255).toString(16).toUpperCase();
      h += s.length < 2 ? '0' + s : s;
    }
    return h;
  }

  /* 设备 RGB（按所选空间的传递函数编码） */
  function deviceRGB(p, lin) {
    var out = [];
    for (var i = 0; i < 3; i++) {
      var v = clamp(encode(p.spec.tf, clamp(lin[i], 0, 1)), 0, 1);
      out.push(Math.round(v * 255));
    }
    return out;
  }

  /* 同一份 XYZ 换到 sRGB 显示（白点要适应到 D65），用来做色块预览 */
  function srgb8(env, XYZ) {
    var e = normalizeEnv(env);
    var spec = D.RGB_SPACES.sRGB;
    var M = invMat(buildRGBMatrix(spec));
    var adapt = adaptationMatrix(D.ILLUMINANTS[e.wp].XYZ, D.ILLUMINANTS.D65.XYZ, e.adapt);
    var lin = mulMatVec(M, mulMatVec(adapt, [XYZ[0] / 100, XYZ[1] / 100, XYZ[2] / 100]));
    return [to8(lin[0]), to8(lin[1]), to8(lin[2])];
  }

  /* ------------------------------------------------------- 界面字段表 */

  /* 字段名 → DOM id。readout().values 用的就是这个映射，app.js 只管写值。 */
  var FIELD = {
    X: 'cie-xyz-x', Y: 'cie-xyz-y', Z: 'cie-xyz-z',
    xyX: 'cie-xy-x', xyY: 'cie-xy-y', lum: 'cie-xy-lum',
    cct: 'cie-cct',
    R: 'cie-rgb-r', G: 'cie-rgb-g', B: 'cie-rgb-b', hex: 'cie-hex',
    Ll: 'cie-lab-l', La: 'cie-lab-a', Lb: 'cie-lab-b',
    Cab: 'cie-lchab-c', Hab: 'cie-lchab-h',
    LuvL: 'cie-luv-l', LuvU: 'cie-luv-u', LuvV: 'cie-luv-v',
    Cuv: 'cie-lchuv-c', Huv: 'cie-lchuv-h'
  };

  /* 每一组「编辑来源」不覆盖自己那几格，否则一边输入一边被回写会打架。
     色度图取点（pick）是例外：x / y 正是它要写进去的东西。 */
  var SKIP = {
    XYZ: ['cie-xyz-x', 'cie-xyz-y', 'cie-xyz-z'],
    xyY: ['cie-xy-x', 'cie-xy-y'],
    CCT: ['cie-cct'],
    RGB: ['cie-rgb-r', 'cie-rgb-g', 'cie-rgb-b'],
    HEX: ['cie-hex'],
    Lab: ['cie-lab-l', 'cie-lab-a', 'cie-lab-b'],
    LCHab: ['cie-lchab-c', 'cie-lchab-h'],
    Luv: ['cie-luv-l', 'cie-luv-u', 'cie-luv-v'],
    LCHuv: ['cie-lchuv-c', 'cie-lchuv-h']
  };

  /* ------------------------------------------------------------ 读数 */

  function readout(XYZ, env, p) {
    p = p || pipeline(env);
    var xyY = convert.XYZ_to_xyY(XYZ);
    var cctRaw = convert.xy_to_CCT(xyY[0], xyY[1]);
    var planck = nearestPlanck(xyY[0], xyY[1]);
    /* 出了 1667~25000 K 这个区间，McCamy 的数值已经没有物理意义；即使温度
       落在区间里，偏离黑体轨迹太远（|Duv| > 0.05）时「相关色温」也不成立
       —— 比如光谱绿算出来是 8820 K，那个数字骗人。两种都显示「—」。 */
    var cctOk = cctRaw !== null && cctRaw >= 1667 && cctRaw <= 25000 &&
      planck !== null && Math.abs(planck.duv) <= 0.05;
    var cct = cctOk ? cctRaw : null;
    var lab = convert.XYZ_to_Lab(XYZ, p.WP);
    var lchab = convert.ab_to_LCH(lab[1], lab[2]);
    var luv = convert.XYZ_to_Luv(XYZ, p.WP);
    var lchuv = convert.ab_to_LCH(luv[1], luv[2]);
    var lin = xyzToRgb(p, XYZ);
    var rgb8 = deviceRGB(p, lin);
    var hex = rgbHex(rgb8);
    var srgb = srgb8(p.env, XYZ);

    var duvTxt = planck ? (planck.duv >= 0 ? '+' : '') + planck.duv.toFixed(4) : '—';
    var cctNote;
    if (!planck) {
      cctNote = '色度点无效，无法计算';
    } else if (cctOk) {
      cctNote = 'McCamy 近似 · Duv ' + duvTxt + ' · 最近黑体 ' + Math.round(planck.T) + ' K';
    } else {
      cctNote = '偏离黑体轨迹（Duv ' + duvTxt + '），相关色温不适用 · 最近黑体 ' +
        Math.round(planck.T) + ' K';
    }

    var text = {
      X: fixed(XYZ[0], 3), Y: fixed(XYZ[1], 3), Z: fixed(XYZ[2], 3),
      xyX: fixed(xyY[0], 4), xyY: fixed(xyY[1], 4), lum: fixed(XYZ[1], 3),
      cct: cct === null ? '—' : String(Math.round(cct)),
      R: String(rgb8[0]), G: String(rgb8[1]), B: String(rgb8[2]), hex: hex,
      Ll: fixed(lab[0], 2), La: fixed(lab[1], 2), Lb: fixed(lab[2], 2),
      Cab: fixed(lchab[0], 2), Hab: fixed(lchab[1], 2),
      LuvL: fixed(luv[0], 2), LuvU: fixed(luv[1], 2), LuvV: fixed(luv[2], 2),
      Cuv: fixed(lchuv[0], 2), Huv: fixed(lchuv[1], 2)
    };

    return {
      XYZ: XYZ,
      xyY: xyY,
      cct: cct,
      cctRaw: cctRaw,
      cctInRange: cctOk,
      cctNote: cctNote,
      planck: planck,
      lab: lab,
      lchab: lchab,
      luv: luv,
      lchuv: lchuv,
      linRGB: lin,
      rgb8: rgb8,
      hex: hex,
      srgb: srgb,
      srgbHex: rgbHex(srgb),
      oog: outOfGamut(lin),
      text: text
    };
  }

  /* 从某一组输入反推 XYZ。prev 是上一轮的 XYZ：
     xyY 只改色度、保留亮度；CCT 也是只改色度，亮度沿用当前值。 */
  function pickXYZ(source, raw, p, prev) {
    raw = raw || {};
    var prevXYZ = (prev && isFinite(prev[0]) && isFinite(prev[1]) && isFinite(prev[2]))
      ? prev : [95.047, 100, 108.883];
    var v = function (id) { return num(raw[id]); };
    var keepY = prevXYZ[1];

    switch (source) {
      case 'XYZ':
        return [v('cie-xyz-x'), v('cie-xyz-y'), v('cie-xyz-z')];
      case 'xyY':
        return convert.xyY_to_XYZ([v('cie-xy-x'), v('cie-xy-y'), keepY]);
      case 'pick': {
        var picked = pickAt(p.env, v('cie-xy-x'), v('cie-xy-y'));
        return picked.XYZ;
      }
      case 'CCT': {
        var T = clamp(v('cie-cct'), 1667, 25000);
        var xy = convert.CCT_to_xy(T);
        if (!xy) return prevXYZ;
        return convert.xyY_to_XYZ([xy[0], xy[1], keepY === 0 ? 100 : keepY]);
      }
      case 'RGB':
        return rgbToXyz(p, [
          decode(p.spec.tf, clamp(v('cie-rgb-r'), 0, 255) / 255),
          decode(p.spec.tf, clamp(v('cie-rgb-g'), 0, 255) / 255),
          decode(p.spec.tf, clamp(v('cie-rgb-b'), 0, 255) / 255)
        ]);
      case 'HEX': {
        var hex = parseHex(raw['cie-hex']);
        if (!hex) return prevXYZ;
        return rgbToXyz(p, [
          decode(p.spec.tf, hex[0] / 255),
          decode(p.spec.tf, hex[1] / 255),
          decode(p.spec.tf, hex[2] / 255)
        ]);
      }
      case 'Lab':
        return convert.Lab_to_XYZ([v('cie-lab-l'), v('cie-lab-a'), v('cie-lab-b')], p.WP);
      case 'LCHab': {
        var ab = convert.LCH_to_ab(v('cie-lchab-c'), v('cie-lchab-h'));
        return convert.Lab_to_XYZ([v('cie-lab-l'), ab[0], ab[1]], p.WP);
      }
      case 'Luv':
        return convert.Luv_to_XYZ([v('cie-luv-l'), v('cie-luv-u'), v('cie-luv-v')], p.WP);
      case 'LCHuv': {
        var uv = convert.LCH_to_ab(v('cie-lchuv-c'), v('cie-lchuv-h'));
        return convert.Luv_to_XYZ([v('cie-luv-l'), uv[0], uv[1]], p.WP);
      }
      default:
        return prevXYZ;
    }
  }

  /* '#RRGGBB' / 'RRGGBB' / '#RGB' → [r,g,b]，认不出来返回 null */
  function parseHex(s) {
    var t = String(s == null ? '' : s).trim().replace(/^#/, '');
    if (/^[0-9a-fA-F]{3}$/.test(t)) {
      return [parseInt(t[0] + t[0], 16), parseInt(t[1] + t[1], 16), parseInt(t[2] + t[2], 16)];
    }
    if (/^[0-9a-fA-F]{6}$/.test(t)) {
      return [parseInt(t.slice(0, 2), 16), parseInt(t.slice(2, 4), 16), parseInt(t.slice(4, 6), 16)];
    }
    return null;
  }

  /* 完整一步：来源 + 原始输入 → 读数 + 需要写回界面的值 */
  function compute(source, raw, env, prev) {
    var p = pipeline(env);
    var XYZ = pickXYZ(source, raw, p, prev);
    if (!isFinite(XYZ[0]) || !isFinite(XYZ[1]) || !isFinite(XYZ[2])) XYZ = [0, 0, 0];
    var r = readout(XYZ, p.env, p);
    r.source = source;
    var skip = SKIP[source] || [];
    var vals = {};
    Object.keys(FIELD).forEach(function (k) { vals[FIELD[k]] = r.text[k]; });
    skip.forEach(function (id) { delete vals[id]; });
    r.values = vals;
    return r;
  }

  /* 环境参数的文字说明 + 转换矩阵，给界面上的信息卡用 */
  function envInfo(env) {
    var p = pipeline(env);
    var ill = D.ILLUMINANTS[p.env.wp];
    var ad = D.ADAPT[p.env.adapt];
    var rows = [];
    for (var i = 0; i < 3; i++) {
      rows.push([
        fixed(p.M_rgb2xyz[i][0], 4), fixed(p.M_rgb2xyz[i][1], 4), fixed(p.M_rgb2xyz[i][2], 4)
      ]);
    }
    return {
      wpName: ill.name,
      wpLine: ill.name + ' · ' + ill.temp + ' K · ' + ill.note +
        ' · xy = ' + ill.x.toFixed(4) + ', ' + ill.y.toFixed(4),
      spaceName: p.spec.name,
      spaceLine: p.spec.name + ' · 白点 ' + D.ILLUMINANTS[p.spec.wp].name + ' · ' + p.spec.tfName +
        ' · ' + p.spec.note,
      adaptName: ad.name,
      adaptLine: ad.name + ' · ' + ad.note,
      needAdapt: p.spec.wp !== p.env.wp,
      matrixRows: rows,
      white: [fixed(p.WP[0], 3), fixed(p.WP[1], 3), fixed(p.WP[2], 3)]
    };
  }

  /* -------------------------------------------------------- 色度图几何 */

  /* 两种色度图共用一套绘制代码，几何只差「坐标是什么、画布多大」：
     CIE 1931 xy（450×480）与 CIE 1976 u'v'（450×450，两轴严格等比 ——
     u'v' 的意义就是视觉均匀，横纵比例不能歪）。 */
  var GEO_XY = { W: 450, H: 480, PAD: 30, XMAX: 0.8, YMAX: 0.9, axisX: 'x', axisY: 'y' };
  var GEO_UV = { W: 450, H: 450, PAD: 30, XMAX: 0.7, YMAX: 0.7, axisX: 'u′', axisY: 'v′' };

  function geoOf(space) { return space === 'uv' ? GEO_UV : GEO_XY; }

  /* 色度坐标 → 图空间坐标；uv 图先把 xy 投影成 u'v'（射影变换保直线，
     所以紫线、网格、三角形在两个空间里都仍是直线）。 */
  function toSpace(space, x, y) {
    return space === 'uv' ? (convert.xy_to_uv76(x, y) || [0, 0]) : [x, y];
  }

  function mx(g, v) { return g.PAD + (v / g.XMAX) * (g.W - 2 * g.PAD); }
  function my(g, v) { return (g.H - g.PAD) - (v / g.YMAX) * (g.H - 2 * g.PAD); }
  function ux(g, px) { return ((px - g.PAD) / (g.W - 2 * g.PAD)) * g.XMAX; }
  function uy(g, py) { return (((g.H - g.PAD) - py) / (g.H - 2 * g.PAD)) * g.YMAX; }

  /* 兼容旧调用：默认按 1931 xy 图换算 */
  function mapX(x) { return mx(GEO_XY, x); }
  function mapY(y) { return my(GEO_XY, y); }
  function unX(px) { return ux(GEO_XY, px); }
  function unY(py) { return uy(GEO_XY, py); }

  var LOCUS = D.SPECTRAL_LOCUS;

  /* 光谱轨迹细分：29 个 10 nm 锚点直接连线棱角很重（460~540 nm 一段尤其明显）。
     用 Catmull-Rom 样条在段内插值出密折线 —— 路径、clipPath、射线法共用同一份，
     否则「线看着是圆的、背景裁剪却是尖的」。样条过锚点，nm 按段线性内插。 */
  var DENSE = null;
  function denseLocus() {
    if (DENSE) return DENSE;
    var SUB = 12, out = [];
    function cr(p0, p1, p2, p3, t) {
      var t2 = t * t, t3 = t2 * t;
      return 0.5 * (2 * p1 + (-p0 + p2) * t +
        (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
        (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
    }
    for (var i = 0; i < LOCUS.length - 1; i++) {
      var a = LOCUS[Math.max(i - 1, 0)], b = LOCUS[i], c = LOCUS[i + 1];
      var d = LOCUS[Math.min(i + 2, LOCUS.length - 1)];
      for (var k = 0; k < SUB; k++) {
        var t = k / SUB;
        out.push({
          nm: b.nm + (c.nm - b.nm) * t,
          x: Math.min(Math.max(cr(a.x, b.x, c.x, d.x, t), 0), 1),
          y: Math.min(Math.max(cr(a.y, b.y, c.y, d.y, t), 0), 1)
        });
      }
    }
    var last = LOCUS[LOCUS.length - 1];
    out.push({ nm: last.nm, x: last.x, y: last.y });
    DENSE = out;
    return out;
  }

  /* 光谱轨迹闭合成多边形（最后一条边就是紫线），按图空间映射成像素 */
  function locusPoints(space) {
    var g = geoOf(space), pts = [];
    var dense = denseLocus();
    for (var i = 0; i < dense.length; i++) {
      var q = toSpace(space, dense[i].x, dense[i].y);
      pts.push([mx(g, q[0]), my(g, q[1])]);
    }
    return pts;
  }

  function locusD(space) {
    var g = geoOf(space), s = '';
    var dense = denseLocus();
    for (var i = 0; i < dense.length; i++) {
      var q = toSpace(space, dense[i].x, dense[i].y);
      s += (i ? 'L' : 'M') + n3(mx(g, q[0])) + ' ' + n3(my(g, q[1]));
    }
    return s + 'Z';
  }

  /* 射线法：点在光谱轨迹多边形内？按密折线判定，与路径 / 裁剪一致；
     u'v' 是 xy 的射影变换，内外性不变，所以统一在 xy 里判。 */
  function pointInLocus(x, y) {
    var dense = denseLocus(), inside = false;
    for (var i = 0, j = dense.length - 1; i < dense.length; j = i++) {
      var xi = dense[i].x, yi = dense[i].y, xj = dense[j].x, yj = dense[j].y;
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  /* 黑体轨迹采样（对数等分，色温越高采得越密） */
  function planckianPoints(count) {
    var n = count || 72, out = [];
    var lo = 1667, hi = 25000;
    for (var i = 0; i < n; i++) {
      var T = lo * Math.pow(hi / lo, i / (n - 1));
      var xy = convert.CCT_to_xy(T);
      if (xy) out.push({ T: T, x: xy[0], y: xy[1] });
    }
    return out;
  }

  /* 最近黑体点 + Duv：McCamy 那套多项式只在小范围内可信，色度点一旦跑远
     （比如直接点上光谱轨迹的纯绿）会算出十几亿开尔文这种没意义的值。
     这里在 1960 uv 空间里找黑体轨迹上最近的点，顺带给出带符号的 Duv ——
     正值表示偏绿（在白点上方），负值表示偏品红。 */
  function nearestPlanck(x, y) {
    var target = convert.xy_to_uv60(x, y);
    if (!target) return null;
    var pts = planckianPoints(201);
    var uv = [];
    var bestI = -1, bestD = Infinity;
    for (var i = 0; i < pts.length; i++) {
      var q = convert.xy_to_uv60(pts[i].x, pts[i].y);
      uv.push(q);
      if (!q) continue;
      var d = (q[0] - target[0]) * (q[0] - target[0]) + (q[1] - target[1]) * (q[1] - target[1]);
      if (d < bestD) { bestD = d; bestI = i; }
    }
    if (bestI < 0) return null;
    var lo = Math.max(0, bestI - 1), hi = Math.min(pts.length - 1, bestI + 1);
    var a = uv[lo], b = uv[hi];
    var vx = b[0] - a[0], vy = b[1] - a[1];
    var len2 = vx * vx + vy * vy;
    var t = len2 > 0 ? clamp(((target[0] - a[0]) * vx + (target[1] - a[1]) * vy) / len2, 0, 1) : 0;
    var pu = a[0] + vx * t, pv = a[1] + vy * t;
    var cross = vx * (target[1] - a[1]) - vy * (target[0] - a[0]);
    var dist = Math.sqrt((target[0] - pu) * (target[0] - pu) + (target[1] - pv) * (target[1] - pv));
    return {
      T: pts[lo].T + (pts[hi].T - pts[lo].T) * t,
      duv: cross >= 0 ? dist : -dist,
      u: pu,
      v: pv
    };
  }

  /* ------------------------------------------- 色度图：底层（静态部分） */

  /* 量化到 4 的倍数，让同一行的相邻格子更容易合并成一条 rect */
  function q(v) {
    var n = Math.round(clamp(v, 0, 1) * 255);
    return Math.round(n / 4) * 4;
  }

  /* 该 xy 色度下 sRGB 能达到的最饱和颜色：线性 RGB 去掉负分量（等于掺白），
     再按最大分量归一 —— 参考实现就是这么画的。 */
  function bgCellColor(inv, x, y) {
    if (!pointInLocus(x, y)) return null;
    var lin = mulMatVec(inv, [x, y, 1 - x - y]);
    var r = lin[0], g = lin[1], b = lin[2];
    var mn = Math.min(r, g, b);
    if (mn < 0) { r -= mn; g -= mn; b -= mn; }
    var mv = Math.max(r, g, b);
    if (mv > 0) { r /= mv; g /= mv; b /= mv; }
    var tf = { k: 'srgb' };
    return rgbHex([q(encode(tf, r)), q(encode(tf, g)), q(encode(tf, b))]);
  }

  /* 背景层：6px 网格逐格求值，同行同色合并。uv 图的格子先反解回 xy
     再判轨迹 / 求色，颜色本身只跟色度有关，与画在哪个空间无关。 */
  function bgLayer(space, cell) {
    cell = cell > 0 ? cell : 6;
    var g = geoOf(space);
    var inv = invMat(buildRGBMatrix(D.RGB_SPACES.sRGB));
    var out = [];
    var y0 = g.PAD, y1 = g.H - g.PAD, x0 = g.PAD, x1 = g.W - g.PAD;
    for (var py = y0; py < y1; py += cell) {
      var run = null;
      for (var px = x0; px < x1; px += cell) {
        var cx = px + cell / 2, cy = py + cell / 2;
        var center = toSpace(space, ux(g, cx), uy(g, cy));
        var probes = [
          [px, py], [px + cell, py], [px, py + cell], [px + cell, py + cell], [cx, cy]
        ];
        var hit = false;
        for (var i = 0; i < probes.length && !hit; i++) {
          var a = toSpace(space, ux(g, probes[i][0]), uy(g, probes[i][1]));
          if (a[0] < 0 || a[1] < 0 || a[0] > 1 || a[1] > 1) continue;
          if (pointInLocus(a[0], a[1])) hit = true;
        }
        var col = hit ? bgCellColor(inv, center[0], center[1]) : null;
        if (!col) {
          if (run) { out.push(run); run = null; }
          continue;
        }
        if (run && run.fill === col) { run.n++; continue; }
        if (run) out.push(run);
        run = { x: px, y: py, n: 1, fill: col };
      }
      if (run) out.push(run);
    }
    var s = ['<g clip-path="url(#cie-locus-clip)">'];
    for (var i2 = 0; i2 < out.length; i2++) {
      s.push('<rect x="' + out[i2].x + '" y="' + out[i2].y + '" width="' + (out[i2].n * cell) +
        '" height="' + cell + '" fill="' + out[i2].fill + '"/>');
    }
    s.push('</g>');
    return s.join('');
  }

  /* 网格：0.1 一步，刻度数由画布量程推出（xy 到 0.8/0.9，uv 到 0.7）；
     右下与左上再标一个轴名（x / y 或 u′ / v′），两种图一眼可分。 */
  function gridLayer(g, th) {
    var s = [];
    var nx = Math.min(Math.round(g.XMAX * 10), 8), ny = Math.min(Math.round(g.YMAX * 10), 8);
    var k, v, gx, gy;
    for (k = 1; k <= nx; k++) {
      v = k / 10;
      gx = mx(g, v);
      s.push('<line x1="' + n3(gx) + '" y1="' + g.PAD + '" x2="' + n3(gx) + '" y2="' + (g.H - g.PAD) +
        '" stroke="' + th.grid + '" stroke-width="1"/>');
      s.push('<text x="' + n3(gx) + '" y="' + (g.H - g.PAD + 14) + '" text-anchor="middle" font-size="10" fill="' +
        th.soft + '">' + v.toFixed(1) + '</text>');
    }
    for (k = 1; k <= ny; k++) {
      v = k / 10;
      gy = my(g, v);
      s.push('<line x1="' + g.PAD + '" y1="' + n3(gy) + '" x2="' + (g.W - g.PAD) + '" y2="' + n3(gy) +
        '" stroke="' + th.grid + '" stroke-width="1"/>');
      s.push('<text x="' + (g.PAD - 6) + '" y="' + n3(gy) + '" text-anchor="end" dominant-baseline="middle" font-size="10" fill="' +
        th.soft + '">' + v.toFixed(1) + '</text>');
    }
    s.push('<text x="' + (g.W - g.PAD + 10) + '" y="' + (g.H - g.PAD + 15) + '" font-size="11" font-style="italic" fill="' +
      th.label + '">' + g.axisX + '</text>');
    s.push('<text x="' + (g.PAD - 8) + '" y="' + (g.PAD - 10) + '" text-anchor="end" font-size="11" font-style="italic" fill="' +
      th.label + '">' + g.axisY + '</text>');
    return s.join('');
  }

  function planckLayer(g, space, th) {
    var pts = planckianPoints(72);
    if (pts.length < 2) return '';
    var d = '';
    for (var i = 0; i < pts.length; i++) {
      var q = toSpace(space, pts[i].x, pts[i].y);
      d += (i ? 'L' : 'M') + n3(mx(g, q[0])) + ' ' + n3(my(g, q[1]));
    }
    var a = toSpace(space, pts[0].x, pts[0].y);
    var z = toSpace(space, pts[pts.length - 1].x, pts[pts.length - 1].y);
    var s = ['<path d="' + d + '" fill="none" stroke="' + th.planck +
      '" stroke-width="1.4" stroke-dasharray="5 3"/>'];
    s.push('<text x="' + n3(mx(g, a[0]) + 5) + '" y="' + n3(my(g, a[1]) + 12) + '" font-size="9" fill="' + th.planck +
      '" stroke="' + th.bg + '" stroke-width="3" paint-order="stroke">1667 K</text>');
    s.push('<text x="' + n3(mx(g, z[0]) + 5) + '" y="' + n3(my(g, z[1]) - 6) + '" font-size="9" fill="' + th.planck +
      '" stroke="' + th.bg + '" stroke-width="3" paint-order="stroke">25000 K</text>');
    return s.join('');
  }

  /* 波长刻度：标签沿「图中心 → 轨迹点」方向往外推，避免压在轨迹线上；
     推到画布边上的（500 nm 那种贴着左侧的）夹回绘图区，免得盖住坐标刻度。 */
  function wavelengthLayer(g, space, th) {
    var s = [];
    var c = toSpace(space, 0.33, 0.33);
    var cx = mx(g, c[0]), cy = my(g, c[1]);
    D.LOCUS_TICKS.forEach(function (nm) {
      var p = null;
      for (var i = 0; i < LOCUS.length; i++) { if (LOCUS[i].nm === nm) p = LOCUS[i]; }
      if (!p) return;
      var q = toSpace(space, p.x, p.y);
      var px = mx(g, q[0]), py = my(g, q[1]);
      var dx = px - cx, dy = py - cy;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var x = clamp(px + (dx / len) * 13, g.PAD + 6, g.W - g.PAD - 6);
      var y = clamp(py + (dy / len) * 11 + 3, g.PAD + 12, g.H - g.PAD - 2);
      var anchor = x >= px + 6 ? 'start' : (x <= px - 6 ? 'end' : 'middle');
      s.push('<circle cx="' + n3(px) + '" cy="' + n3(py) + '" r="1.6" fill="' + th.locus + '"/>');
      s.push('<text x="' + n3(x) + '" y="' + n3(y) + '" text-anchor="' + anchor +
        '" font-size="9" fill="' + th.label + '" stroke="' + th.bg +
        '" stroke-width="3" paint-order="stroke">' + nm + '</text>');
    });
    return s.join('');
  }

  /* 底层 = 坐标网格 + 最大 sRGB 亮度背景 + 黑体轨迹 + 光谱轨迹 + 紫线 + 波长
     opts: { theme: 'light'|'dark', background: bool, cell: number, space: 'xy'|'uv' } */
  function diagramBase(opts) {
    opts = opts || {};
    var space = opts.space === 'uv' ? 'uv' : 'xy';
    var g = geoOf(space);
    var th = D.DIAGRAM_THEME[opts.theme === 'dark' ? 'dark' : 'light'];
    var d = locusD(space);
    var s = ['<defs><clipPath id="cie-locus-clip"><path d="' + d + '"/></clipPath></defs>'];
    if (opts.background !== false) s.push(bgLayer(space, opts.cell));
    s.push(gridLayer(g, th));
    s.push(planckLayer(g, space, th));
    s.push('<path d="' + d + '" fill="none" stroke="' + th.locus + '" stroke-width="2" stroke-linejoin="round"/>');
    var first = LOCUS[0], last = LOCUS[LOCUS.length - 1];
    var fp = toSpace(space, first.x, first.y), lp = toSpace(space, last.x, last.y);
    s.push('<line x1="' + n3(mx(g, lp[0])) + '" y1="' + n3(my(g, lp[1])) + '" x2="' + n3(mx(g, fp[0])) +
      '" y2="' + n3(my(g, fp[1])) + '" stroke="' + th.purple + '" stroke-width="2"/>');
    s.push(wavelengthLayer(g, space, th));
    return s.join('');
  }

  /* 底层只跟主题、背景开关与图空间有关，跟环境参数无关 —— app.js 按这个键做缓存 */
  function baseKey(opts) {
    opts = opts || {};
    return (opts.theme === 'dark' ? 'dark' : 'light') + '|' + (opts.background === false ? '0' : '1') +
      '|' + (opts.space === 'uv' ? 'uv' : 'xy') +
      '|' + (opts.cell > 0 ? opts.cell : 6);
  }

  /* ------------------------------------------- 色度图：叠加层（随点变） */

  /* 色域三角形用的是「已做色度适应」的基色，所以换白点 / 换适应模型时
     三角形会跟着动 —— 这正是要看的东西。 */
  function diagramOverlay(o) {
    o = o || {};
    var space = o.space === 'uv' ? 'uv' : 'xy';
    var g = geoOf(space);
    var p = pipeline(o.env);
    var th = D.DIAGRAM_THEME[o.theme === 'dark' ? 'dark' : 'light'];
    var e = p.env;
    var s = [];

    function at(x, y) {
      var q = toSpace(space, x, y);
      return [mx(g, q[0]), my(g, q[1])];
    }

    var tri = [];
    [[1, 0, 0], [0, 1, 0], [0, 0, 1]].forEach(function (lin) {
      var xy = convert.XYZ_to_xyY(rgbToXyz(p, lin));
      tri.push(at(xy[0], xy[1]));
    });
    var pts = tri.map(function (q2) { return n3(q2[0]) + ',' + n3(q2[1]); }).join(' ');
    s.push('<polygon points="' + pts + '" fill="none" stroke="' + th.tri + '" stroke-width="2"/>');
    s.push('<polygon points="' + pts + '" fill="none" stroke="' + th.triInner + '" stroke-width="1"/>');

    var ill = D.ILLUMINANTS[e.wp];
    var wpp = at(ill.x, ill.y);
    s.push('<circle cx="' + n3(wpp[0]) + '" cy="' + n3(wpp[1]) + '" r="4.5" fill="' + th.wpFill +
      '" stroke="' + th.wpStroke + '" stroke-width="1.5"/>');
    s.push('<text x="' + n3(wpp[0] + 8) + '" y="' + n3(wpp[1] + 14) + '" font-size="10" fill="' + th.text +
      '" stroke="' + th.bg + '" stroke-width="3" paint-order="stroke">' + esc(ill.name) + '</text>');

    if (o.xy && isFinite(o.xy[0]) && isFinite(o.xy[1])) {
      var pp = at(o.xy[0], o.xy[1]);
      var px = pp[0], py = pp[1];
      s.push('<g data-cie-point="1">');
      s.push('<line x1="' + n3(px - 11) + '" y1="' + n3(py) + '" x2="' + n3(px + 11) + '" y2="' + n3(py) +
        '" stroke="' + th.cross + '" stroke-width="3"/>');
      s.push('<line x1="' + n3(px) + '" y1="' + n3(py - 11) + '" x2="' + n3(px) + '" y2="' + n3(py + 11) +
        '" stroke="' + th.cross + '" stroke-width="3"/>');
      s.push('<circle cx="' + n3(px) + '" cy="' + n3(py) + '" r="4.5" fill="' + th.point + '" stroke="' +
        th.cross + '" stroke-width="1.5"/>');
      s.push('</g>');
    }
    return s.join('');
  }

  /* 在色度图上取点：亮度取「该色度下刚好不超色域」的最大值，这样预览
     出来永远是最饱和的样子，而不是被切掉一截的灰。uv 图先把 u'v' 反解回 xy。
     返回值同时带上 xy 与 u'v'，调用方按当前图空间挑着显示。 */
  function pickAt(env, x, y, space) {
    var p = pipeline(env);
    if (space === 'uv') {
      var bxy = convert.uv76_to_xy(num(x), num(y));
      if (!bxy) bxy = [0.0001, 0.0001];
      x = bxy[0]; y = bxy[1];
    }
    var xv = clamp(num(x), 0.0001, 0.8);
    var yv = clamp(num(y), 0.0001, 0.9);
    var lin = xyzToRgb(p, [xv / yv * 100, 100, (1 - xv - yv) / yv * 100]);
    var mv = Math.max(lin[0], lin[1], lin[2]);
    var Y = mv > 0 ? clamp(100 / mv, 0, 100) : 100;
    var uv = convert.xy_to_uv76(xv, yv) || [0, 0];
    return { x: xv, y: yv, u: uv[0], v: uv[1], Y: Y, XYZ: convert.xyY_to_XYZ([xv, yv, Y]) };
  }

  /* 指针位置（SVG 用户坐标）→ 色度坐标，供界面上的悬停读数用。
     xy 图返回 {x,y,u,v}；uv 图以 u'v' 为准，同时反解出 xy（解不出就贴原点）。 */
  function atSvgPoint(px, py, space) {
    var g = geoOf(space);
    var a = ux(g, num(px)), b = uy(g, num(py));
    if (space === 'uv') {
      var xy = convert.uv76_to_xy(a, b);
      return {
        u: a, v: b,
        x: xy ? clamp(xy[0], 0, 1) : 0.0001,
        y: xy ? clamp(xy[1], 0, 1) : 0.0001
      };
    }
    var uv = convert.xy_to_uv76(a, b) || [0, 0];
    return { x: a, y: b, u: uv[0], v: uv[1] };
  }

  global.CIE = {
    geometry: { xy: GEO_XY, uv: GEO_UV },
    geoOf: geoOf,
    mapX: mapX,
    mapY: mapY,
    unX: unX,
    unY: unY,
    matrix: matrix,
    decode: decode,
    encode: encode,
    buildRGBMatrix: buildRGBMatrix,
    adaptationMatrix: adaptationMatrix,
    normalizeEnv: normalizeEnv,
    pipeline: pipeline,
    rgbToXyz: rgbToXyz,
    xyzToRgb: xyzToRgb,
    convert: convert,
    outOfGamut: outOfGamut,
    deviceRGB: deviceRGB,
    srgb8: srgb8,
    rgbHex: rgbHex,
    parseHex: parseHex,
    FIELD: FIELD,
    SKIP: SKIP,
    readout: readout,
    pickXYZ: pickXYZ,
    compute: compute,
    envInfo: envInfo,
    locusPoints: locusPoints,
    denseLocus: denseLocus,
    locusD: locusD,
    pointInLocus: pointInLocus,
    planckianPoints: planckianPoints,
    diagramBase: diagramBase,
    baseKey: baseKey,
    diagramOverlay: diagramOverlay,
    pickAt: pickAt,
    atSvgPoint: atSvgPoint
  };
})(typeof window !== 'undefined' ? window : globalThis);
