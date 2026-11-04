/*
 * edid-fields-ui.js — EDID 字段详解 渲染层
 * 站点：X-MACRO-LAB · 纯静态 / 零外链 / 无 ES module
 * 依赖：window.EDIDFieldsData（js/edid-fields-data.js）
 * 由 app.js 在 init() 内调用 window.EDIDFieldsUI.init() 启动。
 */
(function (window) {
  'use strict';

  var doc = window.document;
  function q(sel, root) { return (root || doc).querySelector(sel); }
  function qa(sel, root) { return Array.prototype.slice.call((root || doc).querySelectorAll(sel)); }
  function el(tag, cls, html) {
    var e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  var ASPECTS = [
    { key: 'func', lab: '功能', cls: 'a-func' },
    { key: 'how', lab: '如何设置', cls: 'a-how' },
    { key: 'effect', lab: '设置后实现的功能', cls: 'a-effect' },
    { key: 'hw', lab: '要求硬件支持', cls: 'a-hw' }
  ];

  var rendered = false;

  function buildHero(meta) {
    var hero = el('div', 'hero');
    var txt = el('div', 'txt');
    txt.appendChild(el('h1', null, meta.title));
    txt.appendChild(el('p', null, meta.intro));
    var note = el('p', 'small muted', meta.note);
    txt.appendChild(note);
    var art = el('div', 'art');
    art.innerHTML =
      '<svg width="150" height="92" viewBox="0 0 150 92" aria-hidden="true">' +
      '<rect x="6" y="8" width="138" height="76" rx="9" fill="var(--surface)" stroke="var(--border-strong)"/>' +
      '<g font-family="ui-monospace, Consolas, Menlo, monospace" font-size="7" fill="var(--text-dim)">' +
      '<rect x="16" y="18" width="40" height="11" rx="2" fill="var(--accent)" opacity=".28"/>' +
      '<text x="20" y="26">00 FF FF FF</text>' +
      '<rect x="62" y="18" width="22" height="11" rx="2" fill="var(--ok)" opacity=".28"/>' +
      '<text x="66" y="26">14h</text>' +
      '<rect x="90" y="18" width="28" height="11" rx="2" fill="var(--info)" opacity=".28"/>' +
      '<text x="94" y="26">36h DTD</text>' +
      '<rect x="16" y="34" width="30" height="11" rx="2" fill="var(--warn)" opacity=".28"/>' +
      '<text x="20" y="42">23h ET</text>' +
      '<rect x="52" y="34" width="30" height="11" rx="2" fill="var(--accent)" opacity=".2"/>' +
      '<text x="56" y="42">02 CTA</text>' +
      '<rect x="88" y="34" width="40" height="11" rx="2" fill="var(--info)" opacity=".2"/>' +
      '<text x="92" y="42">70 DisplayID</text>' +
      '<rect x="16" y="50" width="102" height="11" rx="2" fill="var(--text-dim)" opacity=".16"/>' +
      '<text x="20" y="58">blocks · descriptors · data blocks</text>' +
      '</g>' +
      '<rect x="16" y="66" width="102" height="9" rx="2" fill="var(--accent)" opacity=".14"/>' +
      '</svg>';
    hero.appendChild(txt);
    hero.appendChild(art);
    return hero;
  }

  function buildField(field) {
    var card = el('div', 'ef-field');
    card.id = 'f-' + field.id;
    var header = el('header');
    header.innerHTML = '<h4>' + field.name + '</h4>';
    var chip = el('span', 'chip accent', field.area);
    header.appendChild(chip);
    card.appendChild(header);

    var body = el('div', 'ef-body');
    var aspects = el('div', 'ef-aspects');
    ASPECTS.forEach(function (a) {
      var box = el('div', 'ef-aspect ' + a.cls);
      box.innerHTML = '<span class="lab">' + a.lab + '</span>' + (field[a.key] || '');
      aspects.appendChild(box);
    });
    body.appendChild(aspects);

    if (field.bits && field.bits.length) {
      var bits = el('div', 'ef-bits');
      var tbl = '<div class="table-scroll"><table><thead><tr><th>位域</th><th>含义</th></tr></thead><tbody>';
      field.bits.forEach(function (b) {
        tbl += '<tr><td class="num mono">' + b.bit + '</td><td>' + b.desc + '</td></tr>';
      });
      tbl += '</tbody></table></div>';
      bits.innerHTML = tbl;
      body.appendChild(bits);
    }
    card.appendChild(body);

    header.addEventListener('click', function () { card.classList.toggle('collapsed'); });
    return card;
  }

  function buildSection(sec) {
    var wrap = el('section', 'ef-sec');
    wrap.id = 'sec-' + sec.id;
    wrap.setAttribute('data-group', sec.group);
    var h2 = el('h2');
    h2.innerHTML = sec.title + ' <span class="sub">' + sec.subtitle + '</span>';
    wrap.appendChild(h2);
    var fields = el('div', 'ef-fields');
    sec.fields.forEach(function (f) { fields.appendChild(buildField(f)); });
    wrap.appendChild(fields);
    return wrap;
  }

  function buildToc(data) {
    var nav = el('nav', 'ef-toc-nav');
    data.groups.forEach(function (g) {
      var label = el('div', 'grp', g.label + ' · ' + g.desc);
      nav.appendChild(label);
      data.sections.forEach(function (sec) {
        if (sec.group !== g.id) return;
        var a = el('a', null, sec.title);
        a.href = '#sec-' + sec.id;
        a.setAttribute('data-toc', sec.id);
        a.addEventListener('click', function (e) {
          e.preventDefault();
          var target = doc.getElementById('sec-' + sec.id);
          if (target) {
            if (target.scrollIntoView) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            else target.scrollTop = 0;
          }
        });
        nav.appendChild(a);
      });
    });
    return nav;
  }

  function buildFilter(data) {
    var filter = el('div', 'ef-filter');
    var all = el('button', 'sm active', '全部');
    all.setAttribute('data-filter', '*');
    filter.appendChild(all);
    data.groups.forEach(function (g) {
      var b = el('button', 'sm', g.label);
      b.setAttribute('data-filter', g.id);
      filter.appendChild(b);
    });
    return filter;
  }

  function applyFilter(root, group) {
    qa('.ef-sec', root).forEach(function (sec) {
      var show = group === '*' || sec.getAttribute('data-group') === group;
      sec.style.display = show ? '' : 'none';
    });
    qa('.ef-toc-nav a', root).forEach(function (a) {
      var sec = doc.getElementById('sec-' + a.getAttribute('data-toc'));
      if (!sec) return;
      a.style.display = (group === '*' || sec.getAttribute('data-group') === group) ? '' : 'none';
    });
  }

  function wireScrollSpy(root) {
    var links = qa('.ef-toc-nav a', root);
    if (!links.length) return;
    function onScroll() {
      var best = null, bestTop = Infinity;
      links.forEach(function (a) {
        var sec = doc.getElementById('sec-' + a.getAttribute('data-toc'));
        if (!sec || sec.style.display === 'none') return;
        var r = sec.getBoundingClientRect();
        if (r.top <= 120 && r.top > -r.height) {
          if (r.top > -bestTop) { best = a; bestTop = -r.top; }
        }
      });
      links.forEach(function (a) { a.classList.toggle('active', a === best); });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function init() {
    if (rendered) return;
    var root = doc.getElementById('ef-root');
    if (!root) return;
    var data = window.EDIDFieldsData;
    if (!data) return;

    root.appendChild(buildHero(data.meta));

    /* 工具条：分组筛选 + 展开/收起 */
    var toolbar = el('div', 'card');
    var tbody = el('div', 'body');
    tbody.appendChild(buildFilter(data));
    var btnRow = el('div', 'btn-row');
    btnRow.style.marginTop = '10px';
    var toggleBtn = el('button', 'sm', '全部收起 / 展开');
    toggleBtn.addEventListener('click', function () {
      var cards = qa('.ef-field', root);
      var anyOpen = cards.some(function (c) { return !c.classList.contains('collapsed'); });
      cards.forEach(function (c) { c.classList.toggle('collapsed', anyOpen); });
      toggleBtn.textContent = anyOpen ? '全部展开' : '全部收起 / 展开';
    });
    btnRow.appendChild(toggleBtn);
    tbody.appendChild(btnRow);
    toolbar.appendChild(tbody);
    root.appendChild(toolbar);

    var shell = el('div', 'ef-shell');
    var aside = el('aside', 'ef-toc');
    var tocCard = el('div', 'card');
    var tocBody = el('div', 'body');
    tocBody.appendChild(buildToc(data));
    tocCard.appendChild(tocBody);
    aside.appendChild(tocCard);

    var main = el('div', 'ef-main');
    data.sections.forEach(function (sec) { main.appendChild(buildSection(sec)); });

    shell.appendChild(aside);
    shell.appendChild(main);
    root.appendChild(shell);

    /* 筛选交互 */
    qa('.ef-filter button', root).forEach(function (b) {
      b.addEventListener('click', function () {
        qa('.ef-filter button', root).forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        applyFilter(root, b.getAttribute('data-filter'));
      });
    });

    wireScrollSpy(root);
    rendered = true;
  }

  window.EDIDFieldsUI = { init: init };
})(typeof window !== 'undefined' ? window : globalThis);
