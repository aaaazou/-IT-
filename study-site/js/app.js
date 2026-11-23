/* ============================================================================
 * app.js —— 页面渲染与交互
 * 纯原生 JS，无依赖；内容来自 data-network.js / data-cloud.js / data-ai.js
 * 路由：#/home、#/section/network、#/chapter/net-01
 * ==========================================================================*/

(function () {
  'use strict';

  var SECTIONS = window.STUDY_SECTIONS || [];
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var STORAGE_KEY = 'it-study-progress-v2';

  var view = $('#view');
  var sidebarInner = $('#sidebar-inner');
  var sidebar = $('#sidebar');
  var backdrop = $('#sidebar-backdrop');
  var toc = $('#toc');
  var tocList = $('#toc-list');
  var searchInput = $('#search-input');
  var searchPanel = $('#search-panel');
  var toastEl = $('#toast');
  var readingBar = $('#reading-bar');
  var menuBtn = $('#menu-btn');

  var currentSection = null;
  var currentChapter = null;
  var searchHits = [];
  var searchActive = -1;
  var searchIndex = null;
  var revealObserver = null;
  var scrollQueued = false;

  /* ------------------------------ 工具 ------------------------------ */
  function esc(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function stripHtml(html) {
    var box = document.createElement('div');
    box.innerHTML = html || '';
    return box.textContent || box.innerText || '';
  }

  function sectionMinutes(sec) {
    return sec.chapters.reduce(function (sum, ch) { return sum + (ch.minutes || 0); }, 0);
  }

  function sectionDone(sec) {
    return sec.chapters.filter(function (ch) { return learned.has(ch.id); }).length;
  }

  function percent(a, b) {
    return b > 0 ? Math.round((a / b) * 100) : 0;
  }

  function styleVars(sec) {
    return '--accent:' + sec.color + ';--accent-dark:' + sec.colorDark + ';--soft:' + sec.soft + ';';
  }

  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { toastEl.classList.remove('show'); }, 2200);
  }

  /* 切页时立即回到顶部，避免平滑滚动从页面底部“飞”上来 */
  function jumpTop() {
    var html = document.documentElement;
    var prev = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    html.style.scrollBehavior = prev;
  }

  /* ------------------------------ 进度存储 ------------------------------ */
  var storageOK = true;
  try {
    localStorage.setItem('__study_probe__', '1');
    localStorage.removeItem('__study_probe__');
  } catch (err) {
    storageOK = false;
  }

  var learned = new Set();
  if (storageOK) {
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (Array.isArray(saved)) learned = new Set(saved);
    } catch (err) {
      learned = new Set();
    }
  }

  function saveProgress() {
    if (!storageOK) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(learned)));
    } catch (err) {
      /* 沙箱或隐私模式下不可写，静默降级 */
    }
  }

  /* ------------------------------ 扁平化数据 ------------------------------ */
  var chapters = [];
  SECTIONS.forEach(function (sec, secIndex) {
    sec._no = secIndex + 1;
    sec.chapters.forEach(function (ch, index) {
      ch._section = sec;
      ch._sectionIndex = index;
      ch._globalIndex = chapters.length;
      ch._num = sec._no + '.' + (index + 1);
      chapters.push(ch);
    });
  });

  var byId = {};
  chapters.forEach(function (ch) { byId[ch.id] = ch; });

  function subsOf(ch) {
    return (ch.blocks || []).filter(function (b) { return b.t === 'h3'; });
  }

  function totalMinutes() {
    return chapters.reduce(function (sum, ch) { return sum + (ch.minutes || 0); }, 0);
  }

  function totalSubs() {
    return chapters.reduce(function (sum, ch) { return sum + subsOf(ch).length; }, 0);
  }

  function findSection(id) {
    for (var i = 0; i < SECTIONS.length; i += 1) {
      if (SECTIONS[i].id === id) return SECTIONS[i];
    }
    return null;
  }

  /* ------------------------------ 顶部/侧边栏公共 UI ------------------------------ */
  function updateChrome(navId) {
    var activeSec = findSection(navId);
    $$('#top-nav a').forEach(function (a) {
      var active = a.dataset.nav === navId;
      a.classList.toggle('active', active);
      if (active && activeSec) {
        a.style.color = activeSec.colorDark;
        a.style.background = activeSec.soft;
      } else {
        a.style.color = '';
        a.style.background = '';
      }
    });

    if (SECTIONS.length) {
      $('#total-count').textContent = chapters.length;
      $('#footer-total').textContent = chapters.length;
    }
    var done = learned.size;
    var pct = percent(done, chapters.length);
    $('#learned-count').textContent = done;
    $('#progress-pill').title = '已学 ' + done + ' / ' + chapters.length + ' 章，完成 ' + pct + '%';
    var ring = $('#progress-ring');
    if (ring) ring.style.setProperty('--p', String(pct));
  }

  function renderSidebar(sec) {
    if (!sec) {
      sidebarInner.innerHTML = '';
      return;
    }
    var html = '';
    html += '<div class="side-title">学习目录 <span>' + sec.chapters.length + ' 章</span></div>';
    html += '<div class="side-switch" style="' + styleVars(sec) + '">';
    SECTIONS.forEach(function (s) {
      html += '<a href="#/section/' + s.id + '"' + (s.id === sec.id ? ' class="active"' : '') + '>' + esc(s.short) + '</a>';
    });
    html += '</div>';
    html += '<nav class="chapter-nav" style="' + styleVars(sec) + '" aria-label="' + esc(sec.name) + '目录">';
    sec.chapters.forEach(function (ch, index) {
      var active = currentChapter && currentChapter.id === ch.id;
      html += '<a href="#/chapter/' + ch.id + '"' + (active ? ' class="active"' : '') + '>';
      html += '<span class="num">' + ch._num + '</span>';
      html += '<span>' + esc(ch.title) + '</span>';
      if (learned.has(ch.id)) html += '<span class="done" aria-label="已学会">✓</span>';
      html += '</a>';
    });
    html += '</nav>';
    sidebarInner.innerHTML = html;

    if (window.innerWidth <= 900 && currentChapter) {
      var activeEl = $('.chapter-nav a.active', sidebarInner);
      if (activeEl) activeEl.scrollIntoView({ block: 'center' });
    }
  }

  function setTocVisible(visible) {
    toc.hidden = !visible;
    if (!visible) tocList.innerHTML = '';
  }

  function renderToc() {
    var headings = $$('.article-body h3');
    if (!headings.length) {
      setTocVisible(false);
      return;
    }
    var html = '';
    headings.forEach(function (h) {
      html +=
        '<a href="#' + h.id + '" data-toc="' + h.id + '" class="lvl3">' +
        '<span class="toc-num">' + (h.dataset.num || '') + '</span>' +
        '<span class="toc-text">' + esc(h.dataset.title || h.textContent) + '</span>' +
        '</a>';
    });
    tocList.innerHTML = html;
    setTocVisible(true);
    $$('#toc-list a').forEach(function (a) {
      a.addEventListener('click', function (event) {
        event.preventDefault();
        var target = document.getElementById(a.dataset.toc);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
    updateTocActive();
  }

  function updateTocActive() {
    if (toc.hidden) return;
    var links = $$('#toc-list a');
    if (!links.length) return;
    var activeId = links[0].dataset.toc;
    var threshold = 140;
    $$('.article-body h3').forEach(function (h) {
      if (h.getBoundingClientRect().top <= threshold) activeId = h.id;
    });
    links.forEach(function (a) {
      a.classList.toggle('active', a.dataset.toc === activeId);
    });
  }

  /* ------------------------------ 首页 ------------------------------ */
  function heroArt() {
    var colors = {
      network: { color: '#2f6fb3', soft: '#eef4fb' },
      cloud: { color: '#b7791f', soft: '#fdf6e9' },
      ai: { color: '#7656b8', soft: '#f4effc' }
    };
    function node(cx, cy, label, sub, key) {
      var c = colors[key];
      return (
        '<g class="art-node">' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="58" fill="' + c.soft + '" stroke="' + c.color + '" stroke-opacity=".26" />' +
        '<circle cx="' + cx + '" cy="' + (cy - 22) + '" r="5" fill="' + c.color + '" opacity=".9" />' +
        '<text x="' + cx + '" y="' + (cy + 8) + '" text-anchor="middle" font-size="17" font-weight="600" fill="#1c2a2f">' + label + '</text>' +
        '<text x="' + cx + '" y="' + (cy + 27) + '" text-anchor="middle" font-size="9" letter-spacing="1.8" fill="#71828a">' + sub + '</text>' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="70" fill="none" stroke="' + c.color + '" stroke-opacity=".1" stroke-dasharray="2 7" />' +
        '</g>'
      );
    }
    return (
      '<div class="hero-art" aria-hidden="true">' +
      '<svg viewBox="0 0 440 390" role="presentation">' +
      '<g class="art-link">' +
      '<path d="M158 95 C 218 64 284 74 292 112" stroke="#6f9cc9" />' +
      '<path d="M304 176 C 302 232 282 270 254 282" stroke="#c9a35c" />' +
      '<path d="M164 300 C 118 282 86 210 90 156" stroke="#9a7fc4" />' +
      '</g>' +
      node(100, 96, '网络', 'IP · VLAN · OSPF', 'network') +
      node(340, 124, '云计算', 'VPC · Docker', 'cloud') +
      node(214, 304, 'AI', 'LLM · RAG', 'ai') +
      '<circle cx="220" cy="196" r="4" fill="#cfdcd3" />' +
      '</svg></div>'
    );
  }

  function renderHome() {
    document.body.className = 'view-home';
    currentSection = null;
    currentChapter = null;

    var total = chapters.length;
    var mins = totalMinutes();

    var sectionCards = SECTIONS.map(function (sec) {
      var done = sectionDone(sec);
      var pct = percent(done, sec.chapters.length);
      return (
        '<a class="section-card reveal" style="' + styleVars(sec) + '" href="#/section/' + sec.id + '">' +
        '<span class="sec-icon">' + esc(sec.char) + '</span>' +
        '<h3>' + esc(sec.name) + '</h3>' +
        '<p class="sec-tagline">' + esc(sec.tagline) + '</p>' +
        '<p class="sec-intro">' + esc(sec.intro) + '</p>' +
        '<div class="sec-meta"><span>' + sec.chapters.length + ' 章 · ' + sectionSubs(sec) + ' 知识点</span><span>' + pct + '%</span></div>' +
        '<div class="sec-bar"><span style="width:' + pct + '%"></span></div>' +
        '<span class="sec-arrow">进入板块 →</span>' +
        '</a>'
      );
    }).join('');

    var startCards = SECTIONS.map(function (sec, index) {
      var first = sec.chapters[0];
      return (
        '<a class="start-card reveal" href="#/chapter/' + first.id + '">' +
        '<span class="start-num">' + pad(index + 1) + '</span>' +
        '<div class="start-body"><h4>' + esc(first.title) + '</h4><p>' + esc(first.lead) + '</p></div>' +
        '</a>'
      );
    }).join('');

    view.innerHTML =
      '<section class="hero">' +
      '<div class="hero-copy">' +
      '<span class="eyebrow">写给普通人的 IT 知识地图</span>' +
      '<h1>把网络、云计算、AI<br><em>讲成人话</em></h1>' +
      '<p class="hero-sub">不堆术语，也不做花哨动画。每个知识点都用一个生活里的比喻讲明白，配表格、命令和可以继续读的参考资料。三大板块，' + total + ' 章、' + totalSubs() + ' 个知识点，按顺序读或挑着看都行。</p>' +
      '<div class="hero-actions">' +
      '<a class="btn primary" href="#/section/network">从网络知识开始 →</a>' +
      '<a class="btn ghost" href="#/chapter/' + chapters[0].id + '">先读第一章</a>' +
      '</div>' +
      '<ul class="hero-stats">' +
      '<li><strong><span data-count="' + total + '">0</span></strong><span>章系统教程</span></li>' +
      '<li><strong><span data-count="' + totalSubs() + '">0</span></strong><span>个知识点</span></li>' +
      '<li><strong>3</strong><span>个学习板块</span></li>' +
      '<li><strong><span data-count="' + mins + '">0</span></strong><span>分钟阅读量</span></li>' +
      '</ul>' +
      '</div>' +
      heroArt() +
      '</section>' +
      '<section class="section-band">' +
      '<div class="band-head"><div><h2>三大板块</h2><p>先通网络，再懂云，最后看 AI —— 也可以直接跳到感兴趣的部分。</p></div></div>' +
      '<div class="section-grid">' + sectionCards + '</div>' +
      '</section>' +
      '<section class="section-band">' +
      '<div class="band-head"><div><h2>不知道从哪开始？</h2><p>每个板块的第一章都是零基础入口，读完再决定要不要往下走。</p></div></div>' +
      '<div class="start-grid">' + startCards + '</div>' +
      '</section>';

    renderSidebar(null);
    setTocVisible(false);
    updateChrome('home');
    document.title = 'IT 知识站 · 网络 / 云计算 / AI 入门';
    jumpTop();
    animateCounts();
    observeReveal();
  }

  function animateCounts() {
    $$('[data-count]').forEach(function (el) {
      var target = parseInt(el.dataset.count, 10) || 0;
      var start = performance.now();
      function step(now) {
        var k = Math.min(1, (now - start) / 700);
        var eased = 1 - Math.pow(1 - k, 3);
        el.textContent = String(Math.round(target * eased));
        if (k < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  /* ------------------------------ 板块页 ------------------------------ */
  function sectionSubs(sec) {
    return sec.chapters.reduce(function (sum, ch) { return sum + subsOf(ch).length; }, 0);
  }

  /* 板块页底部的知识地图：把每章的小节摊开，先看全局再看细节 */
  function renderKnowledgeMap(sec) {
    var rows = sec.chapters.map(function (ch) {
      var subs = subsOf(ch);
      return (
        '<details class="map-item">' +
        '<summary><span class="map-no">' + ch._num + '</span>' +
        '<span class="map-title">' + esc(ch.title) + '</span>' +
        '<span class="map-count">' + subs.length + ' 个小节</span></summary>' +
        '<ul class="map-sublist">' +
        subs.map(function (b, i) {
          return '<li><span class="map-subno">' + ch._num + '.' + (i + 1) + '</span>' + esc(b.text) + '</li>';
        }).join('') +
        '</ul>' +
        '</details>'
      );
    }).join('');
    return (
      '<section class="knowledge-map">' +
      '<div class="band-head"><div><h2>本板块知识地图</h2>' +
      '<p>' + sec.chapters.length + ' 章 · ' + sectionSubs(sec) + ' 个知识点，先看框架，再挑小节深入。</p></div></div>' +
      rows +
      '</section>'
    );
  }

  function renderSection(sec) {
    document.body.className = 'view-section';
    currentSection = sec;
    currentChapter = null;

    var done = sectionDone(sec);
    var pct = percent(done, sec.chapters.length);

    var cards = sec.chapters.map(function (ch, index) {
      var tags = (ch.tags || []).map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('');
      return (
        '<a class="chapter-card reveal" style="' + styleVars(sec) + '" href="#/chapter/' + ch.id + '">' +
        '<span class="cc-top">' + ch._num + ' · ' + subsOf(ch).length + ' 个小节' + (learned.has(ch.id) ? ' · 已完成' : '') + '</span>' +
        '<span class="cc-title">' + esc(ch.title) + '</span>' +
        '<span class="cc-lead">' + esc(ch.lead) + '</span>' +
        '<span class="cc-meta"><span>' + (ch.minutes || 6) + ' 分钟</span>' + tags + '</span>' +
        '</a>'
      );
    }).join('');

    view.innerHTML =
      '<header class="section-hero" style="' + styleVars(sec) + '">' +
      '<span class="kicker"><span class="dot"></span>' + esc(sec.tagline) + '</span>' +
      '<h1>' + esc(sec.name) + '</h1>' +
      '<p class="intro">' + esc(sec.intro) + '</p>' +
      '<div class="meta"><span>共 ' + sec.chapters.length + ' 章</span><span>' + sectionSubs(sec) + ' 个知识点</span><span>约 ' + sectionMinutes(sec) + ' 分钟</span><span>已学 ' + done + ' 章 · ' + pct + '%</span></div>' +
      '</header>' +
      '<div class="chapter-grid">' + cards + '</div>' +
      renderKnowledgeMap(sec);

    renderSidebar(sec);
    setTocVisible(false);
    updateChrome(sec.id);
    document.title = sec.name + ' · IT 知识站';
    jumpTop();
    observeReveal();
  }

  /* ------------------------------ 文章页 ------------------------------ */
  function renderBlocks(blocks, ch) {
    var hIndex = 0;
    var sIndex = 0;
    return (blocks || []).map(function (b) {
      switch (b.t) {
        case 'h': {
          var id = 'h-' + hIndex;
          hIndex += 1;
          return '<h2 id="' + id + '">' + esc(b.text) + '</h2>';
        }
        case 'h3': {
          sIndex += 1;
          var sid = 's-' + sIndex;
          var num = ch._num + '.' + sIndex;
          return (
            '<h3 id="' + sid + '" data-title="' + esc(b.text) + '" data-num="' + num + '">' +
            '<span class="h3-num">' + num + '</span>' +
            '<span class="h3-text">' + esc(b.text) + '</span>' +
            '</h3>'
          );
        }
        case 'p':
          return '<p>' + (b.html || esc(b.text || '')) + '</p>';
        case 'ul':
          return '<ul>' + (b.items || []).map(function (item) { return '<li>' + item + '</li>'; }).join('') + '</ul>';
        case 'table': {
          var head = (b.head || []).map(function (h) { return '<th>' + h + '</th>'; }).join('');
          var rows = (b.rows || []).map(function (row) {
            return '<tr>' + row.map(function (cell) { return '<td>' + cell + '</td>'; }).join('') + '</tr>';
          }).join('');
          return '<div class="table-wrap"><table><thead><tr>' + head + '</tr></thead><tbody>' + rows + '</tbody></table></div>';
        }
        case 'note': {
          var icon = b.tone === 'warn' ? '!' : b.tone === 'key' ? '★' : '✓';
          return (
            '<div class="note ' + b.tone + '">' +
            '<span class="note-icon">' + icon + '</span>' +
            '<div><span class="note-title">' + esc(b.title) + '</span>' +
            '<div>' + (b.html || esc(b.text || '')) + '</div></div>' +
            '</div>'
          );
        }
        case 'code':
          return (
            '<div class="code-block">' +
            '<div class="code-head"><span>' + esc(b.title || b.lang || 'code') + '</span>' +
            '<button class="copy-btn" type="button" data-copy>复制</button></div>' +
            '<pre><code>' + esc(b.code) + '</code></pre>' +
            '</div>'
          );
        case 'cards':
          return (
            '<div class="concept-grid">' +
            (b.items || []).map(function (item) {
              return '<div class="concept"><h4>' + item.title + '</h4><p>' + item.text + '</p></div>';
            }).join('') +
            '</div>'
          );
        case 'flow':
          return (
            '<ol class="flow">' +
            (b.items || []).map(function (item) {
              return '<li><strong>' + item.title + '</strong><p>' + item.text + '</p></li>';
            }).join('') +
            '</ol>'
          );
        case 'links':
          return (
            '<div class="refs">' +
            (b.items || []).map(function (link) {
              return '<a class="ref" href="' + esc(link.url) + '" target="_blank" rel="noopener noreferrer">' + esc(link.label) + '</a>';
            }).join('') +
            '</div>'
          );
        default:
          return '';
      }
    }).join('');
  }

  /* 每个章节顶部的「本节结构」导航：把规范编号列出，手机端不用去点右侧目录 */
  function renderOutline(ch) {
    var subs = subsOf(ch);
    if (!subs.length) return '';
    var items = subs.map(function (b, i) {
      var id = 's-' + (i + 1);
      return (
        '<li><a href="#' + id + '" data-jump="' + id + '">' +
        '<span class="n">' + ch._num + '.' + (i + 1) + '</span>' +
        '<span>' + esc(b.text) + '</span>' +
        '</a></li>'
      );
    }).join('');
    return (
      '<nav class="chapter-outline" aria-label="本节结构">' +
      '<div class="outline-head"><strong>本节结构</strong><span>共 ' + subs.length + ' 个小节 · 点击跳转</span></div>' +
      '<ul class="outline-list">' + items + '</ul>' +
      '</nav>'
    );
  }

  function renderChapter(ch) {
    document.body.className = 'view-chapter';
    currentSection = ch._section;
    currentChapter = ch;

    var sec = ch._section;
    var index = chapters.indexOf(ch);
    var prev = index > 0 ? chapters[index - 1] : null;
    var next = index < chapters.length - 1 ? chapters[index + 1] : null;
    var isDone = learned.has(ch.id);
    var tags = (ch.tags || []).map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('');

    var pager =
      '<div class="pager">' +
      (prev
        ? '<a class="page-link prev" href="#/chapter/' + prev.id + '"><span>← ' + prev._num + ' · ' + esc(prev._section.short) + '</span><strong>' + esc(prev.title) + '</strong></a>'
        : '<span></span>') +
      (next
        ? '<a class="page-link next" href="#/chapter/' + next.id + '"><span>' + next._num + ' · ' + esc(next._section.short) + ' →</span><strong>' + esc(next.title) + '</strong></a>'
        : '<span></span>') +
      '</div>';

    view.innerHTML =
      '<nav class="breadcrumb" aria-label="面包屑">' +
      '<a href="#/home">首页</a><span class="sep">/</span>' +
      '<a href="#/section/' + sec.id + '">' + esc(sec.name) + '</a><span class="sep">/</span>' +
      '<span>' + ch._num + ' ' + esc(ch.title) + '</span>' +
      '</nav>' +
      '<article>' +
      '<header class="article-head" style="' + styleVars(sec) + '">' +
      '<span class="article-kicker">' + esc(sec.name) + ' · ' + ch._num + '</span>' +
      '<h1 class="article-title">' + esc(ch.title) + '</h1>' +
      '<div class="article-meta"><span>约 ' + (ch.minutes || 6) + ' 分钟</span><span>' + subsOf(ch).length + ' 个小节</span>' + tags +
      '<span data-learn-state>' + (isDone ? '已学会' : '还没标记') + '</span></div>' +
      '</header>' +
      '<div class="article-body" style="' + styleVars(sec) + '">' +
      '<div class="lead"><strong>一句话理解：</strong>' + esc(ch.lead) + '</div>' +
      renderOutline(ch) +
      renderBlocks(ch.blocks, ch) +
      '<div class="article-actions">' +
      '<button class="learn-btn' + (isDone ? ' is-done' : '') + '" type="button" data-learn="' + ch.id + '">' +
      (isDone ? '✓ 已学会（点击取消）' : '标记为已学会') +
      '</button>' +
      '<span class="learn-hint">进度只保存在本机浏览器，换台设备不会同步。</span>' +
      '</div>' +
      pager +
      '</div>' +
      '</article>';

    renderSidebar(sec);
    updateChrome(sec.id);
    renderToc();
    bindCopyButtons();
    document.title = ch._num + ' ' + ch.title + ' · ' + sec.name + ' · IT 知识站';
    jumpTop();
    updateReadingBar();
    observeReveal();
  }

  /* ------------------------------ 复制代码 ------------------------------ */
  function bindCopyButtons() {
    $$('[data-copy]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var block = btn.closest('.code-block');
        var codeEl = block ? block.querySelector('pre') : null;
        if (!codeEl) return;
        var text = codeEl.innerText;
        function done() {
          btn.textContent = '已复制';
          setTimeout(function () { btn.textContent = '复制'; }, 1500);
        }
        function fallback() {
          var ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand('copy'); done(); } catch (err) { toast('复制失败，请手动选择'); }
          document.body.removeChild(ta);
        }
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(text).then(done, fallback);
        } else {
          fallback();
        }
      });
    });
  }

  /* ------------------------------ 搜索 ------------------------------ */
  function buildSearchIndex() {
    if (searchIndex) return searchIndex;
    searchIndex = chapters.map(function (ch) {
      var parts = [ch.title, ch.lead, (ch.tags || []).join(' ')];
      (ch.blocks || []).forEach(function (b) {
        if (b.t === 'p') parts.push(stripHtml(b.html || b.text));
        else if (b.t === 'h' || b.t === 'h3') parts.push(b.text);
        else if (b.t === 'ul') parts.push((b.items || []).map(stripHtml).join(' '));
        else if (b.t === 'note') parts.push(b.title + ' ' + stripHtml(b.html || b.text));
        else if (b.t === 'cards') (b.items || []).forEach(function (it) { parts.push(it.title + ' ' + stripHtml(it.text)); });
        else if (b.t === 'flow') (b.items || []).forEach(function (it) { parts.push(it.title + ' ' + stripHtml(it.text)); });
        else if (b.t === 'table') {
          (b.head || []).forEach(function (h) { parts.push(stripHtml(h)); });
          (b.rows || []).forEach(function (row) { row.forEach(function (c) { parts.push(stripHtml(c)); }); });
        } else if (b.t === 'code') parts.push(b.code);
      });
      return {
        ch: ch,
        sec: ch._section,
        title: ch.title,
        lead: ch.lead,
        text: parts.join(' ').toLowerCase()
      };
    });
    return searchIndex;
  }

  function highlight(text, query) {
    var safe = esc(text);
    if (!query) return safe;
    var pattern = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    try {
      return safe.replace(new RegExp('(' + pattern + ')', 'gi'), '<mark>$1</mark>');
    } catch (err) {
      return safe;
    }
  }

  function renderSearch(query) {
    var q = (query || '').trim();
    if (!q) {
      searchPanel.innerHTML =
        '<div class="sr-tip">试试搜：<b>VLAN</b>、<b>VPC</b>、<b>Kubernetes</b>、<b>RAG</b>、<b>提示词</b></div>';
      searchPanel.classList.add('open');
      searchHits = [];
      searchActive = -1;
      return;
    }
    var lower = q.toLowerCase();
    var hits = buildSearchIndex()
      .filter(function (item) { return item.text.indexOf(lower) >= 0 || item.title.toLowerCase().indexOf(lower) >= 0; })
      .sort(function (a, b) {
        var aTitle = a.title.toLowerCase().indexOf(lower) >= 0 ? 1 : 0;
        var bTitle = b.title.toLowerCase().indexOf(lower) >= 0 ? 1 : 0;
        return bTitle - aTitle;
      })
      .slice(0, 10);

    searchHits = hits;
    searchActive = -1;

    if (!hits.length) {
      searchPanel.innerHTML = '<div class="sr-empty">没有找到「' + esc(q) + '」，换个更短的关键词试试。</div>';
      searchPanel.classList.add('open');
      return;
    }

    var html = '<div class="sr-group">找到 ' + hits.length + ' 章相关文章</div>';
    hits.forEach(function (hit, i) {
      html +=
        '<button class="sr-item" type="button" role="option" data-index="' + i + '" style="' + styleVars(hit.sec) + '">' +
        '<span class="sr-main">' +
        '<span class="sr-title">' + highlight(hit.title, q) + '</span>' +
        '<span class="sr-desc">' + hit.ch._num + ' · ' + esc(hit.lead) + '</span>' +
        '</span>' +
        '<span class="sr-sec">' + esc(hit.sec.short) + '</span>' +
        '</button>';
    });
    searchPanel.innerHTML = html;
    searchPanel.classList.add('open');

    $$('.sr-item', searchPanel).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var hit = searchHits[parseInt(btn.dataset.index, 10)];
        if (!hit) return;
        closeSearch();
        searchInput.value = '';
        location.hash = '#/chapter/' + hit.ch.id;
      });
    });
  }

  function closeSearch() {
    searchPanel.classList.remove('open');
    searchPanel.innerHTML = '';
    searchHits = [];
    searchActive = -1;
  }

  function moveSearchActive(delta) {
    if (!searchHits.length) return;
    searchActive = (searchActive + delta + searchHits.length) % searchHits.length;
    $$('.sr-item', searchPanel).forEach(function (el, i) {
      el.classList.toggle('active', i === searchActive);
      if (i === searchActive) el.scrollIntoView({ block: 'nearest' });
    });
  }

  searchInput.addEventListener('input', function () { renderSearch(searchInput.value); });
  searchInput.addEventListener('focus', function () {
    if (!searchPanel.classList.contains('open')) renderSearch(searchInput.value);
  });
  searchInput.addEventListener('keydown', function (event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveSearchActive(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveSearchActive(-1);
    } else if (event.key === 'Enter') {
      if (searchActive >= 0 && searchHits[searchActive]) {
        var hit = searchHits[searchActive];
        closeSearch();
        searchInput.value = '';
        location.hash = '#/chapter/' + hit.ch.id;
      } else if (searchHits[0]) {
        location.hash = '#/chapter/' + searchHits[0].ch.id;
        closeSearch();
        searchInput.value = '';
      }
    } else if (event.key === 'Escape') {
      closeSearch();
      searchInput.blur();
    }
  });

  document.addEventListener('click', function (event) {
    if (!event.target.closest('#search')) closeSearch();
  });

  /* ------------------------------ 页面内跳转 ------------------------------ */
  document.addEventListener('click', function (event) {
    var jump = event.target.closest('[data-jump]');
    if (!jump) return;
    event.preventDefault();
    var target = document.getElementById(jump.dataset.jump);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* ------------------------------ 学会标记 ------------------------------ */
  document.addEventListener('click', function (event) {
    var btn = event.target.closest('[data-learn]');
    if (!btn) return;
    var id = btn.dataset.learn;
    if (learned.has(id)) {
      learned.delete(id);
      toast('已取消「学会」标记');
    } else {
      learned.add(id);
      toast('已标记为学会，继续下一篇吧');
    }
    saveProgress();
    updateChrome(currentSection ? currentSection.id : 'home');
    btn.classList.toggle('is-done', learned.has(id));
    btn.textContent = learned.has(id) ? '✓ 已学会（点击取消）' : '标记为已学会';
    var stateEl = $('[data-learn-state]');
    if (stateEl) stateEl.textContent = learned.has(id) ? '已学会' : '还没标记';
    renderSidebar(currentSection);
  });

  /* ------------------------------ 路由 ------------------------------ */
  function parseHash() {
    var raw = (location.hash || '#/home').replace(/^#\/?/, '');
    var parts = raw.split('/');
    return { kind: parts[0] || 'home', id: parts[1] || '' };
  }

  function route() {
    var parsed = parseHash();
    closeNav();
    closeSearch();
    if (parsed.kind === 'chapter') {
      var ch = byId[parsed.id];
      if (ch) {
        renderChapter(ch);
        return;
      }
    } else if (parsed.kind === 'section') {
      var sec = findSection(parsed.id);
      if (sec) {
        renderSection(sec);
        return;
      }
    }
    renderHome();
  }

  window.addEventListener('hashchange', route);

  /* ------------------------------ 手机目录抽屉 ------------------------------ */
  function openNav() {
    document.body.classList.add('nav-open');
    backdrop.hidden = false;
    menuBtn.setAttribute('aria-expanded', 'true');
  }

  function closeNav() {
    document.body.classList.remove('nav-open');
    backdrop.hidden = true;
    menuBtn.setAttribute('aria-expanded', 'false');
  }

  menuBtn.addEventListener('click', function () {
    if (document.body.classList.contains('nav-open')) closeNav();
    else openNav();
  });
  backdrop.addEventListener('click', closeNav);
  window.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      closeNav();
      closeSearch();
      return;
    }
    if (event.key === '/' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) {
      event.preventDefault();
      searchInput.focus();
    }
  });

  /* ------------------------------ 滚动进度与目录高亮 ------------------------------ */
  function updateReadingBar() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    readingBar.style.width = (p * 100).toFixed(2) + '%';
  }

  window.addEventListener(
    'scroll',
    function () {
      if (scrollQueued) return;
      scrollQueued = true;
      requestAnimationFrame(function () {
        scrollQueued = false;
        updateReadingBar();
        updateTocActive();
      });
    },
    { passive: true }
  );

  window.addEventListener('resize', function () {
    updateReadingBar();
    updateTocActive();
    if (window.innerWidth > 900) closeNav();
  });

  /* ------------------------------ 出现动画 ------------------------------ */
  function observeReveal() {
    var items = $$('.reveal');
    if (!items.length) return;
    if (!('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    if (revealObserver) revealObserver.disconnect();
    revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.06 }
    );
    items.forEach(function (el) { revealObserver.observe(el); });
  }

  /* ------------------------------ 启动 ------------------------------ */
  if (!SECTIONS.length) {
    view.innerHTML = '<p style="padding:40px 0;color:#71828a">课程数据没有加载成功，请检查 js/data-*.js 是否存在。</p>';
    return;
  }

  updateChrome('home');
  if (!storageOK) {
    var note = $('#storage-note');
    if (note) note.textContent = '当前预览环境禁用了浏览器存储，学习进度只在本次打开期间有效。';
  }
  route();
  updateReadingBar();
})();
