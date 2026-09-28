/* ==========================================================================
   gamma.js — Gamma curve verification: data assembly + SVG charts.

   Feature port of the internal "Gamma Curve Verification Tool" (Python/Tk):
   reads CA410 colorimeter measurement data and a gray-level duty table
   (both .xlsx), plots measured luminance against a reference curve derived
   from the duty ratios (ref = peak luminance x duty), plots white-point
   consistency (Wx/Wy vs input level) and computes the average gamma via
   log-ratio regression against the last measured point.

   Depends on xlsx-lite.js (and transitively zip-lite.js) for file reading;
   the logic + rendering below is DOM-free and unit-testable in Node.

   Exposes global.GAMMA.
   ========================================================================== */
(function (global) {
  'use strict';

  /* ---------- column letters ---------- */

  function colIndex(col) {
    /* 'A' -> 1, 'AA' -> 27; accepts 1-based numbers too */
    if (typeof col === 'number') return col;
    var s = String(col).trim().toUpperCase();
    if (!s) return 0;
    var idx = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c < 65 || c > 90) throw new Error('无效的列号: ' + col);
      idx = idx * 26 + (c - 64);
    }
    return idx;
  }

  function colLetter(index) {
    var out = '';
    var i = index;
    while (i > 0) {
      var rem = (i - 1) % 26;
      out = String.fromCharCode(65 + rem) + out;
      i = Math.floor((i - 1) / 26);
    }
    return out;
  }

  /* ---------- gamma curve presets (columns live in the duty workbook) ---------- */

  var CURVES = [
    { name: 'GammaBT1886', col: 'B', gamma: 2.2 },
    { name: 'Gamma1.8', col: 'C', gamma: 1.8 },
    { name: 'Gamma2.0', col: 'D', gamma: 2.0 },
    { name: 'Gamma2.2', col: 'E', gamma: 2.2 },
    { name: 'Gamma2.4', col: 'F', gamma: 2.4 },
    { name: 'Gamma2.6', col: 'G', gamma: 2.6 }
  ];

  function curveByName(name) {
    for (var i = 0; i < CURVES.length; i++) if (CURVES[i].name === name) return CURVES[i];
    return null;
  }

  function targetGamma(name) {
    var c = curveByName(name);
    return c ? c.gamma : null;
  }

  /* ---------- extraction ---------- */

  function num(v) {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') return isFinite(v) ? v : null;
    var n = Number(v);
    return isFinite(n) ? n : null;
  }

  /* read the requested column letters out of a sheet over a 1-based
     inclusive row range; missing/empty/non-numeric cells come back null */
  function extractColumns(sheet, letters, rowStart, rowEnd) {
    var out = {};
    for (var i = 0; i < letters.length; i++) out[String(letters[i]).toUpperCase()] = [];
    var start = rowStart == null ? 1 : rowStart;
    var end = rowEnd == null ? sheet.maxRow : rowEnd;
    for (var r = start; r <= end; r++) {
      for (var j = 0; j < letters.length; j++) {
        var L = String(letters[j]).toUpperCase();
        var v = sheet.cell(r, colIndex(L));
        out[L].push(num(v));
      }
    }
    return out;
  }

  /* ---------- assembly (mirrors the Python tool) ---------- */

  /*
    measure: { A: [...], G: [...], E: [...], F: [...] }   (letters configurable)
    duty:    { B: [...] } or null
    cfg: { xCol, yCol, wxCol, wyCol, dutyCol }
    returns { xs, ys, wxs, wys, refs, refLabel, dropped }
  */
  function assemble(measure, duty, cfg) {
    var xk = cfg.xCol.toUpperCase(), yk = cfg.yCol.toUpperCase();
    var wxk = cfg.wxCol ? cfg.wxCol.toUpperCase() : null;
    var wy = cfg.wyCol ? cfg.wyCol.toUpperCase() : null;
    var dk = duty && cfg.dutyCol ? cfg.dutyCol.toUpperCase() : null;

    var xs = [], ys = [], wxs = [], wys = [], hs = [];
    var dropped = 0;
    var lastY = null;
    var rows = measure[xk] ? measure[xk].length : 0;
    for (var i = 0; i < rows; i++) {
      var x = measure[xk][i];
      var y = measure[yk] ? measure[yk][i] : null;
      if (x === null || y === null) { dropped++; continue; }
      var w1 = wxk && measure[wxk] ? measure[wxk][i] : null;
      var w2 = wy && measure[wy] ? measure[wy][i] : null;
      var h = null;
      if (dk && duty[dk] && i < duty[dk].length) h = duty[dk][i];
      xs.push(x); ys.push(y);
      wxs.push(w1); wys.push(w2); hs.push(h);
      lastY = y;
    }
    if (!xs.length) return { xs: [], ys: [], wxs: [], wys: [], refs: null, dropped: dropped };

    /* sort by input level, keeping the parallel series aligned */
    var order = xs.map(function (_, k) { return k; })
      .sort(function (a, b) { return xs[a] - xs[b]; });
    var sx = [], sy = [], sw1 = [], sw2 = [], sh = [];
    for (i = 0; i < order.length; i++) {
      sx.push(xs[order[i]]); sy.push(ys[order[i]]);
      sw1.push(wxs[order[i]]); sw2.push(wys[order[i]]); sh.push(hs[order[i]]);
    }

    /* reference curve: peak luminance x duty ratio, only when every duty
       cell in range is usable (same rule as the Python tool) */
    var refs = null;
    if (dk && lastY !== null && sh.length) {
      var all = true;
      for (i = 0; i < sh.length; i++) if (sh[i] === null) { all = false; break; }
      if (all) {
        refs = [];
        for (i = 0; i < sh.length; i++) refs.push(lastY * sh[i]);
      }
    }

    return { xs: sx, ys: sy, wxs: sw1, wys: sw2, refs: refs, lastY: lastY, dropped: dropped };
  }

  /* ---------- average gamma (log-ratio regression vs the last point) ---------- */

  function avgGamma(xs, ys) {
    if (!xs || !ys || xs.length < 2) return null;
    var lastX = xs[xs.length - 1], lastY = ys[ys.length - 1];
    if (!(lastX > 0) || !(lastY > 0)) return null;
    var sum = 0, n = 0;
    for (var i = 0; i < xs.length; i++) {
      var x = xs[i], y = ys[i];
      if (!(x > 0) || !(y > 0) || x === lastX) continue;
      var g = Math.log(y / lastY) / Math.log(x / lastX);
      if (isFinite(g)) { sum += g; n++; }
    }
    return n ? sum / n : null;
  }

  /* ---------- SVG line chart ---------- */

  var THEMES = {
    light: { text: '#16202e', soft: '#55637a', grid: '#dde3ec', axis: '#c3ccda', bg: '#ffffff' },
    dark: { text: '#e8edf5', soft: '#a9b6c9', grid: '#2a3648', axis: '#3b4a62', bg: '#182131' }
  };

  var PALETTE = { measure: '#1f77b4', ref: '#2ca02c', wx: '#1f77b4', wy: '#ff7f0e' };

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fmtTick(v) {
    var a = Math.abs(v);
    var s;
    if (a !== 0 && (a < 0.001 || a >= 1e6)) s = v.toExponential(2);
    else if (a >= 100) s = String(Math.round(v));
    else s = String(parseFloat(v.toPrecision(6)));
    return s.replace('e', 'e');
  }

  function niceTicks(min, max, count) {
    if (!(max > min)) {
      if (min === max) { min -= 0.5; max += 0.5; }
      else { var t = min; min = max; max = t; }
    }
    var range = max - min;
    var raw = range / Math.max(1, count);
    var mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var norm = raw / mag;
    var step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
    var out = [];
    var k = Math.ceil(min / step - 1e-9);
    for (; k * step <= max + step * 1e-9; k++) {
      out.push(parseFloat((k * step).toPrecision(12)));
    }
    return out;
  }

  function bounds(seriesList) {
    var xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
    seriesList.forEach(function (s) {
      for (var i = 0; i < s.xs.length; i++) {
        var x = s.xs[i], y = s.ys[i];
        if (x === null || y === null || !isFinite(x) || !isFinite(y)) continue;
        if (x < xMin) xMin = x;
        if (x > xMax) xMax = x;
        if (y < yMin) yMin = y;
        if (y > yMax) yMax = y;
      }
    });
    if (xMin === Infinity) return null;
    return { xMin: xMin, xMax: xMax, yMin: yMin, yMax: yMax };
  }

  /*
    opts: {
      title, xlabel, ylabel, width, height, theme ('light'|'dark'),
      legendPos ('tl'|'br'), yZero (force y baseline at 0),
      series: [{ xs, ys, color, dash, label }]
    }
  */
  function chart(opts) {
    var W = opts.width || 560;
    var H = opts.height || 420;
    var th = THEMES[opts.theme === 'dark' ? 'dark' : 'light'];
    var M = { l: 68, r: 18, t: 44, b: 52 };
    var iw = W - M.l - M.r, ih = H - M.t - M.b;

    var b = bounds(opts.series);
    var legend = [];
    if (!b) return '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H +
      '" viewBox="0 0 ' + W + ' ' + H + '"></svg>';
    var padX = (b.xMax - b.xMin) * 0.03 || 1;
    var padY = (b.yMax - b.yMin) * 0.05 || 1;
    var xMin = b.xMin - padX, xMax = b.xMax + padX;
    var yMin = b.yMin - padY, yMax = b.yMax + padY;
    if (opts.yZero || (b.yMin >= 0 && b.yMin < (b.yMax - b.yMin) * 0.25)) yMin = Math.min(0, b.yMin);
    if (b.yMin < 0) yMin = b.yMin - padY;

    function X(v) { return M.l + (v - xMin) / (xMax - xMin) * iw; }
    function Y(v) { return M.t + ih - (v - yMin) / (yMax - yMin) * ih; }

    var s = [];
    s.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H +
      '" viewBox="0 0 ' + W + ' ' + H + '" role="img">');
    s.push('<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="' + th.bg + '"/>');
    s.push('<text x="' + (W / 2) + '" y="26" text-anchor="middle" font-size="17" font-weight="600" fill="' + th.text + '">' + esc(opts.title || '') + '</text>');

    /* grid + ticks */
    var xt = niceTicks(xMin, xMax, 8), yt = niceTicks(yMin, yMax, 6);
    xt.forEach(function (v) {
      var x = X(v);
      s.push('<line x1="' + x.toFixed(2) + '" y1="' + M.t + '" x2="' + x.toFixed(2) + '" y2="' + (M.t + ih) + '" stroke="' + th.grid + '" stroke-dasharray="4 4"/>');
      s.push('<text x="' + x.toFixed(2) + '" y="' + (M.t + ih + 18) + '" text-anchor="middle" font-size="12" fill="' + th.soft + '">' + fmtTick(v) + '</text>');
    });
    yt.forEach(function (v) {
      var y = Y(v);
      s.push('<line x1="' + M.l + '" y1="' + y.toFixed(2) + '" x2="' + (M.l + iw) + '" y2="' + y.toFixed(2) + '" stroke="' + th.grid + '" stroke-dasharray="4 4"/>');
      s.push('<text x="' + (M.l - 8) + '" y="' + (y.toFixed(2)) + '" text-anchor="end" font-size="12" fill="' + th.soft + '" dominant-baseline="middle">' + fmtTick(v) + '</text>');
    });

    /* axes frame */
    s.push('<rect x="' + M.l + '" y="' + M.t + '" width="' + iw + '" height="' + ih + '" fill="none" stroke="' + th.axis + '"/>');

    /* axis titles */
    s.push('<text x="' + (M.l + iw / 2) + '" y="' + (H - 12) + '" text-anchor="middle" font-size="13" fill="' + th.text + '">' + esc(opts.xlabel || '') + '</text>');
    s.push('<text x="16" y="' + (M.t + ih / 2) + '" text-anchor="middle" font-size="13" fill="' + th.text + '" transform="rotate(-90 16 ' + (M.t + ih / 2) + ')">' + esc(opts.ylabel || '') + '</text>');

    /* series polylines */
    var seen = {};
    opts.series.forEach(function (ser) {
      var d = '';
      var pen = false;
      for (var i = 0; i < ser.xs.length; i++) {
        var x = ser.xs[i], y = ser.ys[i];
        if (x === null || y === null || !isFinite(x) || !isFinite(y)) { pen = false; continue; }
        d += (pen ? 'L' : 'M') + X(x).toFixed(2) + ' ' + Y(y).toFixed(2);
        pen = true;
      }
      if (!d) return;
      var dash = ser.dash ? ' stroke-dasharray="' + ser.dash + '"' : '';
      s.push('<path d="' + d + '" fill="none" stroke="' + (ser.color || PALETTE.measure) + '" stroke-width="1.6"' + dash + ' stroke-linejoin="round"/>');
      if (ser.label && !seen[ser.label]) {
        seen[ser.label] = true;
        legend.push({ label: ser.label, color: ser.color || PALETTE.measure, dash: !!ser.dash });
      }
    });

    /* legend */
    if (legend.length) {
      var lw = 0;
      legend.forEach(function (l) { lw = Math.max(lw, l.label.length); });
      var boxW = Math.min(iw * 0.6, 46 + lw * 7.2);
      var boxH = 10 + legend.length * 20;
      var lx = opts.legendPos === 'br' ? M.l + iw - boxW - 10 : M.l + 10;
      var ly = opts.legendPos === 'br' ? M.t + ih - boxH - 10 : M.t + 10;
      s.push('<rect x="' + lx.toFixed(2) + '" y="' + ly.toFixed(2) + '" width="' + boxW.toFixed(2) + '" height="' + boxH + '" fill="' + th.bg + '" stroke="' + th.grid + '" rx="4"/>');
      legend.forEach(function (l, i) {
        var cy = ly + 16 + i * 20;
        var dash2 = l.dash ? ' stroke-dasharray="6 4"' : '';
        s.push('<line x1="' + (lx + 10) + '" y1="' + cy + '" x2="' + (lx + 38) + '" y2="' + cy + '" stroke="' + l.color + '" stroke-width="2"' + dash2 + '/>');
        s.push('<text x="' + (lx + 46) + '" y="' + (cy + 4) + '" font-size="12.5" fill="' + th.text + '">' + esc(l.label) + '</text>');
      });
    }

    s.push('</svg>');
    return s.join('');
  }

  /* ---------- top-level renders ---------- */

  function renderGammaChart(res, opts) {
    opts = opts || {};
    var series = [{ xs: res.xs, ys: res.ys, color: PALETTE.measure, label: 'Measure' }];
    if (res.refs) series.push({ xs: res.xs, ys: res.refs, color: PALETTE.ref, dash: '7 5', label: opts.refLabel || 'Reference' });
    return chart({
      title: opts.title || 'Gamma',
      xlabel: opts.xlabel || 'Input Level',
      ylabel: opts.ylabel || 'Luminance(nits)',
      theme: opts.theme,
      width: opts.width, height: opts.height,
      legendPos: 'tl',
      yZero: true,
      series: series
    });
  }

  function renderWhitePointChart(res, opts) {
    opts = opts || {};
    var series = [];
    var hasWx = false, hasWy = false;
    for (var i = 0; i < res.wxs.length; i++) {
      if (res.wxs[i] !== null) { hasWx = true; break; }
    }
    for (i = 0; i < res.wys.length; i++) {
      if (res.wys[i] !== null) { hasWy = true; break; }
    }
    if (hasWx) series.push({ xs: res.xs, ys: res.wxs, color: PALETTE.wx, label: 'Wx' });
    if (hasWy) series.push({ xs: res.xs, ys: res.wys, color: PALETTE.wy, label: 'Wy' });
    if (!series.length) return '';
    return chart({
      title: 'Consistency Of White Point',
      xlabel: opts.xlabel || 'Input Level',
      ylabel: 'Coordinate',
      theme: opts.theme,
      width: opts.width, height: opts.height,
      legendPos: 'br',
      series: series
    });
  }

  global.GAMMA = {
    CURVES: CURVES,
    PALETTE: PALETTE,
    colIndex: colIndex,
    colLetter: colLetter,
    curveByName: curveByName,
    targetGamma: targetGamma,
    extractColumns: extractColumns,
    assemble: assemble,
    avgGamma: avgGamma,
    renderGammaChart: renderGammaChart,
    renderWhitePointChart: renderWhitePointChart,
    lineChart: chart,
    _internal: { niceTicks: niceTicks, fmtTick: fmtTick, bounds: bounds, THEMES: THEMES }
  };
})(typeof window !== 'undefined' ? window : globalThis);
