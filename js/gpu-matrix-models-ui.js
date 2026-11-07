/* =============================================================================
 * gpu-matrix-models-ui.js — Technology Blog 第八篇附带的「逐型号接口速查表」界面层
 *
 * 依赖：js/gpu-matrix-models-data.js（window.GPUMatrixModels）
 * 分层：filter / renderRows 是纯函数（可在 Node 里直测），init 才碰 DOM。
 * 约定：零外链资源、无 ES module、不发起任何网络请求；来源链接只是 <a href>。
 * ========================================================================== */
(function (window) {
  'use strict';

  var M = window.GPUMatrixModels || null;
  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  function esc(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, function (c) { return ESC[c]; });
  }

  function label(map, key) {
    return (map && map[key]) || key || '—';
  }

  /* HDMI 档位能力排序：源表 hdmiOrder 从高到低，index 越小越强 */
  function hdmiRank(k) {
    var o = (M && M.meta.hdmiOrder) || [];
    var i = o.indexOf(k);
    return i < 0 ? 99 : i;
  }

  /* DP / USB-C 通道带宽排序（标称 Gbps，从高到低） */
  var USB_RANK = {
    dp21u20: 80, mdp21u20: 80, tb5: 80, usb4d21: 80, tb5d21: 80,
    dp21u135: 54, mdp21: 54, dp21u10: 40, dp20: 40, dp21: 40,
    tb4d21: 40, usb4: 40, dp14: 32.4, mdp14: 32.4, tb4: 32.4, tb3: 32.4,
    dp12: 21.6, usb32: 10, none: -1, none_dp: -2, unknown: -3
  };
  function usbRank(k) {
    return Object.prototype.hasOwnProperty.call(USB_RANK, k) ? USB_RANK[k] : 0;
  }

  function confTag(c) {
    var cls = c === '官' ? 'g' : (c === '三' ? 'y' : 'r');
    return '<span class="gm-tag ' + cls + '">' + esc(label(M && M.meta.confLabel, c)) + '</span>';
  }

  function hasOfficialMax(r) {
    var om = r[8] || '';
    return !!om && om !== '—' && !/未标注|未给出|未标|N\/A|不详/i.test(om);
  }

  /* ------------------------------------------------------------- 纯逻辑层 */

  /* state: { q, kind, brand, hdmi, usb, conf, sort, onlyMax, hideLow } */
  function filter(state) {
    if (!M || !M.rows) return [];
    var st = state || {};
    var q = String(st.q || '').trim().toLowerCase();
    var out = [];
    M.rows.forEach(function (r, i) {
      if (st.kind && r[4] !== st.kind) return;
      if (st.brand && r[0] !== st.brand) return;
      if (st.hdmi && r[5] !== st.hdmi) return;
      if (st.usb && r[6] !== st.usb) return;
      if (st.conf && r[9] !== st.conf) return;
      if (st.hideLow && r[9] === '疑') return;
      if (st.onlyMax && !hasOfficialMax(r)) return;
      if (q) {
        var hay = [r[0], r[1], r[2], r[3], r[7], r[8], r[10],
                   label(M.meta.hdmiLabel, r[5]), label(M.meta.usbLabel, r[6])]
          .join(' ').toLowerCase();
        if (hay.indexOf(q) < 0) return;
      }
      out.push(i);
    });

    var sort = st.sort || 'default';
    if (sort === 'cap') {
      out.sort(function (a, b) {
        return hdmiRank(M.rows[a][5]) - hdmiRank(M.rows[b][5]) ||
               usbRank(M.rows[b][6]) - usbRank(M.rows[a][6]);
      });
    } else if (sort === 'dpcap') {
      out.sort(function (a, b) { return usbRank(M.rows[b][6]) - usbRank(M.rows[a][6]); });
    } else if (sort === 'year') {
      out.sort(function (a, b) {
        return (parseInt(M.rows[b][3], 10) || 0) - (parseInt(M.rows[a][3], 10) || 0);
      });
    } else if (sort === 'brand') {
      out.sort(function (a, b) {
        return String(M.rows[a][0]).localeCompare(String(M.rows[b][0])) ||
               (parseInt(M.rows[b][3], 10) || 0) - (parseInt(M.rows[a][3], 10) || 0);
      });
    } else {
      out.sort(function (a, b) {
        return String(M.rows[a][0]).localeCompare(String(M.rows[b][0])) ||
               (parseInt(M.rows[b][3], 10) || 0) - (parseInt(M.rows[a][3], 10) || 0) ||
               String(M.rows[a][2]).localeCompare(String(M.rows[b][2]));
      });
    }
    return out;
  }

  function pillClass(hc) {
    if (hc === '21b' || hc === '21f' || hc === '21h' || hc === '22' || hc === '21a') return 'full';
    if (hc === '21t' || hc === '21c' || hc === '21') return 'cut';
    if (hc === '14' || hc === '20') return 'old';
    if (hc === 'none' || hc === 'nohdmi') return 'none';
    if (hc === 'noout') return 'warn';
    return 'unk';
  }

  function renderRows(idx) {
    if (!M || !M.rows) return '';
    var list = idx || [];
    if (!list.length) {
      return '<tr><td colspan="11" class="gm-empty">没有符合条件的记录，试试放宽筛选条件。</td></tr>';
    }
    return list.map(function (i) {
      var r = M.rows[i];
      var hd = label(M.meta.hdmiLabel, r[5]);
      var ud = label(M.meta.usbLabel, r[6]);
      var src = /^https:\/\//.test(r[11] || '')
        ? '<a class="gm-src" href="' + esc(r[11]) + '" target="_blank" rel="noopener">官方页 ↗</a>'
        : '—';
      return '<tr class="gm-row" data-gm-i="' + i + '" tabindex="0">' +
        '<td>' + esc(label(M.meta.kindLabel, r[4])) + '</td>' +
        '<td class="gm-brand">' + esc(r[0]) + '</td>' +
        '<td>' + esc(r[1]) + '</td>' +
        '<td class="gm-model">' + esc(r[2]) + '</td>' +
        '<td>' + esc(r[3]) + '</td>' +
        '<td><span class="gm-pill ' + pillClass(r[5]) + '">' + esc(hd) + '</span></td>' +
        '<td>' + esc(ud) + '</td>' +
        '<td>' + esc(r[7] || '—') + '</td>' +
        '<td class="gm-om">' + esc(r[8] || '—') + '</td>' +
        '<td>' + confTag(r[9]) + '</td>' +
        '<td>' + src + '</td>' +
        '</tr>';
    }).join('');
  }

  function detailHtml(i) {
    var r = M.rows[i];
    var items = [
      ['HDMI 口推算上限', label(M.meta.hdmiCap, r[5])],
      ['DP / USB-C 通道推算上限', label(M.meta.usbCap, r[6])],
      ['其他物理输出口', r[7] || '—'],
      ['官方标称外接上限', r[8] || '—'],
      ['数据置信度', label(M.meta.confLabel, r[9])],
      ['完整原文与推算依据 / 备注', r[10] || '—']
    ];
    var link = /^https:\/\//.test(r[11] || '')
      ? '<a class="gm-src" href="' + esc(r[11]) + '" target="_blank" rel="noopener">' + esc(r[11]) + '</a>'
      : '—';
    return '<tr class="gm-detail" data-gm-for="' + i + '"><td colspan="11">' +
      '<div class="gm-dgrid">' +
      items.map(function (it) {
        return '<div class="gm-ditem"><div class="k">' + esc(it[0]) + '</div>' +
               '<div class="v">' + esc(it[1]) + '</div></div>';
      }).join('') +
      '<div class="gm-ditem"><div class="k">来源</div><div class="v">' + link + '</div></div>' +
      '</div></td></tr>';
  }

  /* --------------------------------------------------------------- 界面层 */

  function uniq(key) {
    var seen = {}, out = [];
    M.rows.forEach(function (r) {
      var v = r[key];
      if (v && !seen[v]) { seen[v] = 1; out.push(v); }
    });
    return out.sort();
  }

  function options(arr, labelMap) {
    return arr.map(function (v) {
      return '<option value="' + esc(v) + '">' + esc(labelMap ? label(labelMap, v) : v) + '</option>';
    }).join('');
  }

  function shellHtml() {
    var nLap = M.rows.filter(function (r) { return r[4] === 'laptop'; }).length;
    var nDesk = M.rows.length - nLap;
    var brands = uniq('0').length;
    var hdmiKeys = uniq('5');
    var usbKeys = uniq('6');
    return '<div class="gm-wrap">' +
      '<div class="gm-head"><h3>逐型号视频输出接口速查表</h3>' +
      '<p>笔记本机身口 + USB-C / 雷电通道、台式机显卡挡板口、CPU 核显与主板背部 I/O，' +
      '按型号列出 HDMI 档位、DP / USB-C 通道与官方标称外接上限。检索截止 <b>2026-11-07</b>。</p></div>' +
      '<div class="gm-stats">' +
        '<div class="gm-stat"><div class="n">' + M.rows.length + '</div><div class="l">逐型号记录</div></div>' +
        '<div class="gm-stat"><div class="n">' + nLap + '</div><div class="l">笔记本机型</div></div>' +
        '<div class="gm-stat"><div class="n">' + nDesk + '</div><div class="l">显卡 / 核显 / 主板</div></div>' +
        '<div class="gm-stat"><div class="n">' + brands + '</div><div class="l">品牌</div></div>' +
      '</div>' +
      '<div class="gm-panel">' +
        '<div class="gm-ctrl">' +
          '<div class="gm-fld"><label>搜索（品牌 / 系列 / 型号 / 备注）</label>' +
            '<input type="text" id="gm-q" placeholder="例如：RTX 5090、UHBR20、ThinkPad、TMDS"></div>' +
          '<div class="gm-fld"><label>设备类型</label><select id="gm-kind"><option value="">全部</option>' +
            options(['laptop', 'gpu', 'igpu'], M.meta.kindLabel) + '</select></div>' +
          '<div class="gm-fld"><label>品牌</label><select id="gm-brand"><option value="">全部</option>' +
            options(uniq('0')) + '</select></div>' +
          '<div class="gm-fld"><label>HDMI 档位</label><select id="gm-hdmi"><option value="">全部</option>' +
            options(hdmiKeys, M.meta.hdmiLabel) + '</select></div>' +
          '<div class="gm-fld"><label>DP / USB-C 通道</label><select id="gm-usb"><option value="">全部</option>' +
            options(usbKeys, M.meta.usbLabel) + '</select></div>' +
          '<div class="gm-fld"><label>数据置信度</label><select id="gm-conf"><option value="">全部</option>' +
            options(['官', '三', '疑'], M.meta.confLabel) + '</select></div>' +
          '<div class="gm-fld"><label>排序</label><select id="gm-sort">' +
            '<option value="default">品牌 → 年份（新→旧）</option>' +
            '<option value="cap">HDMI 能力（高→低）</option>' +
            '<option value="dpcap">DP 带宽（高→低）</option>' +
            '<option value="year">年份（新→旧）</option>' +
            '<option value="brand">品牌名（A→Z）</option></select></div>' +
          '<label class="gm-chk"><input type="checkbox" id="gm-onlymax"> 仅看官方明确上限</label>' +
          '<label class="gm-chk"><input type="checkbox" id="gm-hidelow"> 隐藏低置信度</label>' +
          '<button type="button" id="gm-reset">重置</button>' +
          '<button type="button" class="primary" id="gm-csv">下载当前筛选 CSV</button>' +
        '</div>' +
        '<div class="gm-legend">' +
          '<span class="gm-pill full">满血 HDMI 2.1 FRL</span>' +
          '<span class="gm-pill cut">2.1 TMDS / 限 4K@60（缩水）</span>' +
          '<span class="gm-pill old">HDMI 1.4 / 2.0（老规格）</span>' +
          '<span class="gm-pill none">无 HDMI 口</span>' +
          '<span class="gm-pill unk">厂商未标注版本</span>' +
          '<span class="gm-pill warn">无显示输出 / 口径冲突</span>' +
        '</div>' +
      '</div>' +
      '<p class="gm-count">当前显示 <b id="gm-count-n">0</b> / ' + M.rows.length + ' 条 · 点击任意行展开完整原文与推算依据</p>' +
      '<div class="gm-tablebox"><table class="gm-table"><thead><tr>' +
        '<th>类型</th><th>品牌</th><th>系列</th><th>具体型号</th><th>年份</th>' +
        '<th>HDMI 接口</th><th>DP / USB-C / 雷电</th><th>其他物理输出口</th>' +
        '<th>官方标称外接上限</th><th>置信度</th><th>来源</th>' +
      '</tr></thead><tbody id="gm-tb"></tbody></table></div>' +
      '<p class="gm-foot">全部筛选、排序与 CSV 导出都在浏览器本地完成，不发起任何网络请求；' +
      '「来源」列的链接指向各厂商公开规格页。规格随 SKU / 区域 / 批次变化，实际链路速率请用 CRU 或 HWiNFO 读 EDID 与 link rate 复核。</p>' +
      '</div>';
  }

  function stateFrom(root) {
    function val(id) { var e = root.querySelector('#' + id); return e ? e.value : ''; }
    function chk(id) { var e = root.querySelector('#' + id); return !!(e && e.checked); }
    return {
      q: val('gm-q'), kind: val('gm-kind'), brand: val('gm-brand'),
      hdmi: val('gm-hdmi'), usb: val('gm-usb'), conf: val('gm-conf'),
      sort: val('gm-sort'), onlyMax: chk('gm-onlymax'), hideLow: chk('gm-hidelow')
    };
  }

  function csvCell(s) {
    return '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
  }

  function csvText(idx) {
    var head = ['类型', '品牌', '系列', '具体型号', '年份', 'HDMI 接口',
                'DP / USB-C 通道', '其他物理输出口', '官方标称外接上限', '置信度', '备注', '来源'];
    var lines = [head.map(csvCell).join(',')];
    idx.forEach(function (i) {
      var r = M.rows[i];
      lines.push([
        label(M.meta.kindLabel, r[4]), r[0], r[1], r[2], r[3],
        label(M.meta.hdmiLabel, r[5]), label(M.meta.usbLabel, r[6]),
        r[7], r[8], label(M.meta.confLabel, r[9]), r[10], r[11]
      ].map(csvCell).join(','));
    });
    return '\ufeff' + lines.join('\r\n');
  }

  function init(root) {
    if (!root || !M || !M.rows || root.getAttribute('data-gm-mounted') === '1') return;
    root.setAttribute('data-gm-mounted', '1');
    root.innerHTML = shellHtml();

    var tb = root.querySelector('#gm-tb');
    var countEl = root.querySelector('#gm-count-n');
    var last = [];

    function refresh() {
      last = filter(stateFrom(root));
      tb.innerHTML = renderRows(last);
      if (countEl) countEl.textContent = String(last.length);
    }

    /* 控件变更：事件委托，避免新增控件后要逐个绑定 */
    function onCtrlChange(e) {
      if (e.target && e.target.closest && e.target.closest('.gm-ctrl')) refresh();
    }
    root.addEventListener('input', onCtrlChange);
    root.addEventListener('change', onCtrlChange);

    /* 行展开 / 收起 */
    function toggleRow(tr) {
      var i = tr.getAttribute('data-gm-i');
      if (!i) return;
      var next = tr.nextElementSibling;
      if (next && next.classList.contains('gm-detail')) {
        next.parentNode.removeChild(next);
        tr.classList.remove('open');
        return;
      }
      root.querySelectorAll('.gm-detail').forEach(function (d) { d.parentNode.removeChild(d); });
      root.querySelectorAll('.gm-row.open').forEach(function (x) { x.classList.remove('open'); });
      tr.insertAdjacentHTML('afterend', detailHtml(Number(i)));
      tr.classList.add('open');
    }
    tb.addEventListener('click', function (e) {
      var tr = e.target.closest ? e.target.closest('tr.gm-row') : null;
      if (tr) toggleRow(tr);
    });
    tb.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var tr = e.target.closest ? e.target.closest('tr.gm-row') : null;
      if (tr) { e.preventDefault(); toggleRow(tr); }
    });

    root.querySelector('#gm-reset').addEventListener('click', function () {
      root.querySelectorAll('.gm-ctrl input[type="text"], .gm-ctrl select').forEach(function (el) {
        if (el.tagName === 'SELECT') el.selectedIndex = 0;
        else el.value = '';
      });
      root.querySelectorAll('.gm-ctrl input[type="checkbox"]').forEach(function (el) { el.checked = false; });
      refresh();
    });

    root.querySelector('#gm-csv').addEventListener('click', function () {
      var blob = new window.Blob([csvText(last)], { type: 'text/csv;charset=utf-8' });
      var url = window.URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = '笔记本显卡视频接口速查表.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if (window.URL.revokeObjectURL) window.URL.revokeObjectURL(url);
    });

    refresh();
  }

  window.GPUMatrixModelsUI = {
    init: init,
    filter: filter,
    renderRows: renderRows,
    detailHtml: detailHtml,
    csvText: csvText,
    esc: esc
  };
})(typeof window !== 'undefined' ? window : globalThis);
