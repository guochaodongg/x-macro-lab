/* =============================================================================
 * adult.js — 成长 · 成年人基本功 渲染层（纯逻辑，不碰 DOM，可在 Node 里直接测）
 *
 * 挂载 window.ADULT：
 *   escapeHtml(s) / inline(s)      转义与行内标记（直接复用 BLOG 的实现）
 *   sectionCount(post)             节计数（复用 BLOG）
 *   readingMinutes(post)           阅读时长（复用 BLOG）
 *   renderHero(post, data)         顶部信息卡 HTML
 *   renderToc(post)                目录 HTML（复用 BLOG）
 *   renderArticle(post)            正文 HTML（复用 BLOG，本页无示意图）
 *   renderChecklist(items, done, opts)  自查 / 行动清单 HTML（opts: {title, desc}）
 *   renderSource(data)             来源与版权说明 HTML（数据驱动，适配视频 / 文章）
 *   renderPicker(articles, activeId)  文章切换条（复用 blog 的 .bl-picker 样式）
 *   renderEmpty()                  数据缺失占位
 *
 * 设计约定：所有可见文本先转义再套行内标记；任何字段缺失都不能产出
 * "undefined" / "NaN"（_ref/test-app-dom.js 会扫这一点）。
 * ========================================================================== */
(function (window) {
  'use strict';

  var BLOG = window.BLOG || {};
  var escapeHtml = BLOG.escapeHtml || function (s) { return s == null ? '' : String(s); };
  var inline = BLOG.inline || escapeHtml;

  /* 顶部信息卡：标题 + 副标题 + 统计 chips + 话题标签 + 来源行 */
  function renderHero(post, data) {
    if (!post) return '';
    var chips = [
      (post.chapters ? post.chapters.length : 0) + ' 章',
      sectionCount(post) + ' 节',
      '约 ' + readingMinutes(post) + ' 分钟',
      (data && data.checklist && data.checklist.length ? data.checklist.length + ' 项自查' : '')
    ].map(function (s) {
      return s ? '<span class="chip">' + escapeHtml(s) + '</span>' : '';
    }).join('');

    var h = '<div class="bl-hero">' +
      '<span class="bl-cat">' + escapeHtml(post.category || '成长') + '</span>' +
      '<h1>' + escapeHtml(post.title) + (post.titleEn ? '<span class="bl-en">' + escapeHtml(post.titleEn) + '</span>' : '') + '</h1>' +
      (post.subtitle ? '<p class="bl-sub">' + escapeHtml(post.subtitle) + '</p>' : '') +
      '<div class="bl-meta">' + chips + '</div>' +
      '<div class="pill-list">' + (post.tags || []).map(function (t) {
        return '<span class="chip accent">' + escapeHtml(t) + '</span>';
      }).join('') + '</div>' +
      '<p class="bl-src-line">整理自：<a href="' + escapeHtml((data && data.meta && data.meta.sourceUrl) || '#') +
      '" target="_blank" rel="noopener">' + escapeHtml(post.source ? post.source.name + ' · ' + post.source.label : '') +
      '</a> · 更新于 ' + escapeHtml((data && data.meta && data.meta.updated) || '') + '</p>' +
      '</div>';
    return h;
  }

  /* 自查 / 行动清单：每篇各一行，勾选状态由 app.js 存 localStorage。
     opts: { title, desc } —— 标题与说明随文章不同（基本功 / 行动清单）。 */
  function renderChecklist(items, done, opts) {
    if (!items || !items.length) return '';
    var o = opts || {};
    var map = done || {};
    var n = items.filter(function (it) { return map[it.id]; }).length;
    var h = '<h3>' + escapeHtml(o.title || '自查清单') + '</h3>' +
      (o.desc ? '<p class="small muted">' + escapeHtml(o.desc) + '</p>' : '') +
      '<div class="ad-check" id="ad-checklist" role="group" aria-label="' + escapeHtml(o.title || '自查清单') + '">' +
      '<div class="ad-check-head"><span class="small muted">已完成</span>' +
      '<span class="chip' + (n === items.length ? ' ok' : '') + '" id="ad-check-count">' +
      escapeHtml(n + ' / ' + items.length) + '</span></div>';
    items.forEach(function (it) {
      var on = !!map[it.id];
      h += '<label class="ad-check-row' + (on ? ' done' : '') + '">' +
        '<input type="checkbox" data-ad-check="' + escapeHtml(it.id) + '"' + (on ? ' checked' : '') + '>' +
        '<span>' + escapeHtml(it.label) + '</span></label>';
    });
    return h + '</div>';
  }

  /* 来源与版权：数据驱动，适配「视频笔记」与「文章重排」两种来源；
     视频的元信息放在 post.source.note 里，通用版权文案这里统一给出。 */
  function renderSource(data) {
    var post = data && data.post;
    var m = (data && data.meta) || {};
    var src = post && post.source;
    return '<section class="bl-source" id="ad-source">' +
      '<h2>来源与版权<span class="bl-en">Source &amp; Credits</span></h2>' +
      '<ul class="bl-list">' +
      '<li>出处：<a href="' + escapeHtml(m.sourceUrl || '#') + '" target="_blank" rel="noopener">' +
      escapeHtml(src ? src.name + '「' + src.label + '」' : '') + '</a></li>' +
      (src && src.note ? '<li>' + escapeHtml(src.note) + '</li>' : '') +
      '<li>本页为按原内容整理的结构化重排笔记（要点提炼 + 结构重组），不是逐字转载；' +
      '内容版权归原作者「' + escapeHtml(src ? src.name : '') + '」所有。</li>' +
      '<li>原作者声明含 AI 生成内容；其中的观点请在实践中自行验证。</li>' +
      '<li>整理日期：' + escapeHtml(m.updated || '') + '。</li>' +
      '</ul></section>';
  }

  /* 文章切换条：只有一篇时不返回（与 blog 的 renderPicker 同构，复用 .bl-picker 样式）。
     文案取每篇的 picker 字段（短名，适合做按钮）。 */
  function renderPicker(articles, activeId) {
    if (!articles || articles.length < 2) return '';
    return '<div class="bl-picker pill-list">' + articles.map(function (a) {
      return '<button type="button" class="chip' + (a.id === activeId ? ' accent' : '') +
        '" data-ad-post="' + escapeHtml(a.id) + '">' +
        escapeHtml(a.picker || (a.post ? a.post.title : a.id)) + '</button>';
    }).join('') + '</div>';
  }

  function renderEmpty() {
    return BLOG.renderEmpty ? BLOG.renderEmpty() :
      '<div class="card"><div class="body"><p class="muted">数据缺失。</p></div></div>';
  }

  function sectionCount(post) { return BLOG.sectionCount ? BLOG.sectionCount(post) : 0; }
  function readingMinutes(post) { return BLOG.readingMinutes ? BLOG.readingMinutes(post) : 1; }
  function renderToc(post) { return BLOG.renderToc ? BLOG.renderToc(post) : ''; }
  function renderArticle(post) { return BLOG.renderArticle ? BLOG.renderArticle(post, null) : renderEmpty(); }

  window.ADULT = {
    escapeHtml: escapeHtml,
    inline: inline,
    renderHero: renderHero,
    renderToc: renderToc,
    renderArticle: renderArticle,
    renderChecklist: renderChecklist,
    renderSource: renderSource,
    renderPicker: renderPicker,
    renderEmpty: renderEmpty,
    sectionCount: sectionCount,
    readingMinutes: readingMinutes
  };

})(typeof window !== 'undefined' ? window : this);
