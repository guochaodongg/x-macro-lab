/* =============================================================================
 * blog.js — Technology Blog 渲染层（纯逻辑，不碰 DOM，可在 Node 里直接测）
 *
 *   挂载 window.BLOG：
 *     escapeHtml(s)                 基础转义
 *     inline(s)                     行内标记 → HTML（**粗体** / `代码` / [文字](链接) / ==高亮==）
 *     anchorId(postId, id)          章节锚点 id
 *     countChars(post)              正文字符数（中英文混排按加权计算）
 *     readingMinutes(post)          估算阅读时长（分钟）
 *     sections(post)                拍平后的章节列表（用于目录 / 滚动定位）
 *     renderToc(post)              目录 HTML
 *     renderArticle(post, figures)  正文 HTML
 *     renderGlossary(glossary)      术语表 HTML
 *     renderSource(data, post)      来源与版权说明 HTML（post 可选，自带 source 时优先）
 *     renderPicker(posts, activeId) 文章切换条（只有一篇时返回空串）
 *     renderEmpty()                 数据缺失时的占位
 *
 * 设计约定：所有可见文本都先转义再套行内标记，任何字段缺失都不能产出
 * "undefined" / "NaN" —— _ref/test-blog.js 会扫描这一点。
 * ========================================================================== */
(function (window) {
  'use strict';

  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  /* 无文章级 source 时的默认「来源说明」（TFTCentral 那篇的语境） */
  var INTRO_CN = '本页为面向中文读者的完整翻译与结构化整理，章节顺序与原文一致，' +
    '术语按国内显示行业惯例翻译。';

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, function (c) { return ESC[c]; });
  }

  /* 行内标记：先整体转义，再替换标记，最后才插入标签，因此不会出现注入。
     顺序很重要 —— 先链接、再粗体、再代码、最后高亮。 */
  function inline(s) {
    var t = escapeHtml(s);
    t = t.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>');
    t = t.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');
    t = t.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    t = t.replace(/==([^=\n]+)==/g, '<mark class="bl-hl">$1</mark>');
    return t;
  }

  function anchorId(postId, id) {
    return 'bl-' + String(postId || 'post') + '-' + String(id || 'x');
  }

  /* ------------------------------------------------------------ 统计与结构 */

  /* 阅读时长：汉字按 1「字」、西文单词按 2「字」折算，技术文章取 450 字/分钟。
     取整后至少 1 分钟，避免短文章显示 0。 */
  function countChars(post) {
    var n = 0;
    eachBlock(post, function (b) {
      var s = blockText(b);
      var cjk = (s.match(/[\u3400-\u9fff\uf900-\ufaff\u3000-\u303f\uff00-\uffef]/g) || []).length;
      var words = (s.replace(/[\u3400-\u9fff\uf900-\ufaff]/g, ' ').match(/[A-Za-z0-9][A-Za-z0-9'’\.\-]*/g) || []).length;
      n += cjk + words;
    });
    return n;
  }

  function readingMinutes(post) {
    var n = countChars(post);
    return Math.max(1, Math.round(n / 450));
  }

  function blockText(b) {
    if (!b) return '';
    var out = '';
    if (b.v) out += b.v;
    if (b.title) out += b.title;
    if (b.items) b.items.forEach(function (it) {
      out += Array.isArray(it) ? it.join(' ') : String(it);
    });
    if (b.head) out += b.head.join(' ');
    if (b.rows) b.rows.forEach(function (r) { out += r.join(' '); });
    if (b.caption) out += b.caption;
    return out;
  }

  /* 遍历一篇文章里的全部 block（含 section 的 subs 三层） */
  function eachBlock(post, fn) {
    if (!post || !post.chapters) return;
    post.chapters.forEach(function (ch) {
      if (ch.lead) fn({ t: 'p', v: ch.lead });
      (ch.sections || []).forEach(function (sec) {
        (sec.blocks || []).forEach(fn);
        (sec.subs || []).forEach(function (sub) { (sub.blocks || []).forEach(fn); });
      });
    });
  }

  /* 拍平目录项：chapters → sections → subs，附带层级与锚点 id */
  function sections(post) {
    var out = [];
    if (!post || !post.chapters) return out;
    post.chapters.forEach(function (ch) {
      out.push({ level: 1, id: anchorId(post.id, ch.id), num: ch.num, title: ch.title, titleEn: ch.titleEn });
      (ch.sections || []).forEach(function (sec) {
        out.push({ level: 2, id: anchorId(post.id, sec.id), title: sec.title, titleEn: sec.titleEn });
        (sec.subs || []).forEach(function (sub) {
          out.push({ level: 3, id: anchorId(post.id, sub.id), title: sub.title, titleEn: sub.titleEn });
        });
      });
    });
    return out;
  }

  function sectionCount(post) {
    var n = 0;
    (post && post.chapters ? post.chapters : []).forEach(function (ch) {
      n += (ch.sections || []).length;
      (ch.sections || []).forEach(function (sec) { n += (sec.subs || []).length; });
    });
    return n;
  }

  /* ---------------------------------------------------------------- blocks */

  function figure(figures, b) {
    var svg = figures && figures[b.id];
    if (!svg) return '';
    return '<figure class="bl-fig">' + svg +
      (b.caption ? '<figcaption>' + inline(b.caption) + '</figcaption>' : '') + '</figure>';
  }

  function callout(b) {
    var kind = ({ info: 'info', warn: 'warn', ok: 'ok', key: 'key' })[b.kind] || 'info';
    var h = '<div class="bl-callout bl-' + kind + '">';
    if (b.title) h += '<div class="bl-callout-t">' + inline(b.title) + '</div>';
    if (b.v) h += '<p>' + inline(b.v) + '</p>';
    if (b.items && b.items.length) {
      h += '<ul>' + b.items.map(function (it) { return '<li>' + inline(it) + '</li>'; }).join('') + '</ul>';
    }
    return h + '</div>';
  }

  function table(b) {
    var h = '<div class="table-scroll"><table class="bl-table">';
    if (b.head && b.head.length) {
      h += '<thead><tr>' + b.head.map(function (c) { return '<th>' + inline(c) + '</th>'; }).join('') + '</tr></thead>';
    }
    h += '<tbody>' + (b.rows || []).map(function (r) {
      return '<tr>' + r.map(function (c, i) {
        return '<td' + (i === 0 ? ' class="bl-td-k"' : '') + '>' + inline(c) + '</td>';
      }).join('') + '</tr>';
    }).join('') + '</tbody></table></div>';
    return h;
  }

  function block(b, figures) {
    if (!b || !b.t) return '';
    switch (b.t) {
      case 'p': return '<p>' + inline(b.v) + '</p>';
      case 'quote':
        return '<blockquote class="bl-quote"><p>' + inline(b.v) + '</p>' +
          (b.by ? '<cite>— ' + inline(b.by) + '</cite>' : '') + '</blockquote>';
      case 'list':
        var tag = b.ordered ? 'ol' : 'ul';
        return '<' + tag + ' class="bl-list">' + (b.items || []).map(function (it) {
          return '<li>' + inline(it) + '</li>';
        }).join('') + '</' + tag + '>';
      case 'dl':
        return '<dl class="bl-dl">' + (b.items || []).map(function (it) {
          return '<dt>' + inline(it[0]) + '</dt><dd>' + inline(it[1]) + '</dd>';
        }).join('') + '</dl>';
      case 'table': return table(b);
      case 'callout': return callout(b);
      case 'fig': return figure(figures, b);
      default: return '';
    }
  }

  function blocks(list, figures) {
    return (list || []).map(function (b) { return block(b, figures); }).join('');
  }

  /* ---------------------------------------------------------------- 输出 */

  function heading(title, titleEn) {
    return inline(title) + (titleEn ? '<span class="bl-en">' + escapeHtml(titleEn) + '</span>' : '');
  }

  function renderArticle(post, figures) {
    if (!post) return renderEmpty();
    var h = '<article class="bl-article">';
    (post.chapters || []).forEach(function (ch) {
      h += '<section class="bl-chap" id="' + anchorId(post.id, ch.id) + '">';
      h += '<div class="bl-chap-head">' +
        (ch.num ? '<span class="bl-num">' + escapeHtml(ch.num) + '</span>' : '') +
        '<h2>' + heading(ch.title, ch.titleEn) + '</h2></div>';
      if (ch.lead) h += '<p class="bl-lead">' + inline(ch.lead) + '</p>';
      (ch.sections || []).forEach(function (sec) {
        h += '<section class="bl-sec" id="' + anchorId(post.id, sec.id) + '">';
        h += '<h3>' + heading(sec.title, sec.titleEn) + '</h3>';
        h += blocks(sec.blocks, figures);
        (sec.subs || []).forEach(function (sub) {
          h += '<section class="bl-subsec" id="' + anchorId(post.id, sub.id) + '">';
          h += '<h4>' + heading(sub.title, sub.titleEn) + '</h4>';
          h += blocks(sub.blocks, figures);
          h += '</section>';
        });
        h += '</section>';
      });
      h += '</section>';
    });
    return h + '</article>';
  }

  /* 目录按「章 → 节 → 子节」分组输出：默认只展开当前所在的章，
     由 app.js 的滚动侦测给对应 .bl-toc-chap 加 .open（纯 CSS 控制显隐）。 */
  function renderToc(post) {
    if (!post || !post.chapters || !post.chapters.length) return '';
    var h = '<nav class="bl-toc" aria-label="文章目录"><div class="bl-toc-t">目录</div><ul class="bl-toc-root">';
    post.chapters.forEach(function (ch, ci) {
      var kids = '';
      (ch.sections || []).forEach(function (sec) {
        kids += '<li class="bl-toc-l2"><a href="#' + anchorId(post.id, sec.id) +
          '" data-bl-goto="' + anchorId(post.id, sec.id) + '">' + inline(sec.title) + '</a>';
        if (sec.subs && sec.subs.length) {
          kids += '<ul>' + sec.subs.map(function (sub) {
            return '<li class="bl-toc-l3"><a href="#' + anchorId(post.id, sub.id) +
              '" data-bl-goto="' + anchorId(post.id, sub.id) + '">' + inline(sub.title) + '</a></li>';
          }).join('') + '</ul>';
        }
        kids += '</li>';
      });
      h += '<li class="bl-toc-chap' + (ci === 0 ? ' open' : '') + '" data-bl-chap="' + anchorId(post.id, ch.id) + '">' +
        '<a class="bl-toc-l1" href="#' + anchorId(post.id, ch.id) + '" data-bl-goto="' + anchorId(post.id, ch.id) + '">' +
        (ch.num ? '<b>' + escapeHtml(ch.num) + '</b>' : '') + inline(ch.title) + '</a>' +
        '<ul>' + kids + '</ul></li>';
    });
    return h + '</ul></nav>';
  }

  function renderGlossary(glossary) {
    if (!glossary || !glossary.length) return '';
    return '<section class="bl-glossary" id="bl-glossary"><h2>术语对照表<span class="bl-en">Glossary</span></h2>' +
      '<div class="table-scroll"><table class="bl-table bl-gloss">' +
      '<thead><tr><th>英文</th><th>中文</th><th>说明</th></tr></thead><tbody>' +
      glossary.map(function (g) {
        return '<tr><td class="bl-td-k mono">' + escapeHtml(g[0]) + '</td><td>' + escapeHtml(g[1]) +
          '</td><td>' + escapeHtml(g[2] || '') + '</td></tr>';
      }).join('') +
      '</tbody></table></div></section>';
  }

  /* 来源区块：文章自带 source 时以文章为准（不同的文章可能取材于不同原始出处），
     否则退回 BLOGData.meta 里的全局来源。第二个参数可选，老调用方式保持不变。 */
  function renderSource(data, post) {
    var m = (data && data.meta) || {};
    var s = (post && post.source) || null;
    var url = (s && s.url) || m.sourceUrl || '#';
    var label = s ? ((s.name || '') + (s.label ? ' · ' + s.label : '')) : (m.sourceTitle || '');
    var intro = (s && s.note) ? s.note : INTRO_CN;
    return '<section class="bl-source" id="bl-source">' +
      '<h2>来源与版权<span class="bl-en">Source &amp; Credits</span></h2>' +
      '<ul class="bl-list">' +
      '<li>原文：<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener">' +
      escapeHtml(label) + '</a></li>' +
      '<li>' + escapeHtml(intro) + '</li>' +
      '<li>原文插图未随文转载，页面内示意图由本站按原文所述原理重绘（纯内联 SVG，不请求任何外部资源）。</li>' +
      '<li>' + escapeHtml((post && post.license) || m.license || '') + '</li>' +
      '</ul></section>';
  }

  function renderPicker(posts, activeId) {
    if (!posts || posts.length < 2) return '';
    return '<div class="bl-picker pill-list">' + posts.map(function (p) {
      return '<button type="button" class="chip' + (p.id === activeId ? ' accent' : '') +
        '" data-bl-post="' + escapeHtml(p.id) + '">' + escapeHtml(p.title) + '</button>';
    }).join('') + '</div>';
  }

  function renderEmpty() {
    return '<div class="bl-article"><p class="muted">文章数据未能载入（js/blog-data.js 缺失或损坏）。</p></div>';
  }

  window.BLOG = {
    escapeHtml: escapeHtml,
    inline: inline,
    anchorId: anchorId,
    countChars: countChars,
    readingMinutes: readingMinutes,
    eachBlock: eachBlock,
    blockText: blockText,
    sections: sections,
    sectionCount: sectionCount,
    block: block,
    renderArticle: renderArticle,
    renderToc: renderToc,
    renderGlossary: renderGlossary,
    renderSource: renderSource,
    renderPicker: renderPicker,
    renderEmpty: renderEmpty
  };
})(typeof window !== 'undefined' ? window : globalThis);
