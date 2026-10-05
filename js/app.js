/* 九十九散记 · 前端逻辑(hash 路由,支持 file:// 直接打开) */
(function () {
  'use strict';

  var app = document.getElementById('app');
  var fontCtrl = document.getElementById('font-ctrl');
  var progressBar = document.getElementById('progress-bar');

  /* ---------- 基础数据 ---------- */
  var chapters = DATA.chapters;
  var chars = EXTRAS.characters;
  var charById = {};
  chars.forEach(function (c) { charById[c.id] = c; });

  // 每个人物在全书的出现统计(按别名匹配段落)
  function mentionsIn(paragraphs, aliases) {
    var hits = [];
    paragraphs.forEach(function (p, i) {
      for (var k = 0; k < aliases.length; k++) {
        if (p.indexOf(aliases[k]) !== -1) { hits.push(i); break; }
      }
    });
    return hits;
  }
  var charStats = {};
  chars.forEach(function (c) {
    var total = 0, chapterNums = [];
    chapters.forEach(function (ch) {
      var n = 0;
      ch.paragraphs.forEach(function (p) {
        c.aliases.forEach(function (a) {
          var idx = 0;
          while ((idx = p.indexOf(a, idx)) !== -1) { n++; idx += a.length; }
        });
      });
      if (n > 0) { total += n; chapterNums.push(ch.num); }
    });
    charStats[c.id] = { total: total, chapters: chapterNums };
  });

  var avatarColor = function (name) {
    var palette = ['#7c8f7c', '#8f8a7c', '#7c8a8f', '#94867a', '#86948a', '#948f7a'];
    var s = 0;
    for (var i = 0; i < name.length; i++) s += name.charCodeAt(i);
    return palette[s % palette.length];
  };
  var esc = function (s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };
  // 高亮段落中人物别名
  function highlight(p, aliases) {
    var safe = esc(p);
    aliases.forEach(function (a) {
      if (!a) return;
      var ea = esc(a);
      // 避免把已生成的 <mark 内部文字再嵌套:逐次替换即可,别名互不包含
      safe = safe.split(ea).join('<mark>' + ea + '</mark>');
    });
    return safe;
  }

  /* ---------- 视图 ---------- */

  function viewHome() {
    var peopleCount = chars.length;
    return '' +
      '<div class="home">' +
      '  <div class="home-num">回 忆 录</div>' +
      '  <h1>九十九散记</h1>' +
      '  <div class="en">Class 7, Grade 1 — a memoir in fragments</div>' +
      '  <div class="home-divider"></div>' +
      '  <p class="home-intro">一部关于高一七班的回忆录:军训只办了一天,班主任开着白色大奔冲进篮球场,班里一半的人在打球,另一半在给打球的人起外号。故事从新生报到开始,停在那个封校看世界杯的冬天——第 23 节之后,尚待追忆。</p>' +
      '  <div class="home-stats">' +
      '    <div class="home-stat"><div class="n">' + (chapters.length - 1) + '</div><div class="l">章节</div></div>' +
      '    <div class="home-stat"><div class="n">' + peopleCount + '</div><div class="l">人物</div></div>' +
      '    <div class="home-stat"><div class="n">' + Math.round(DATA.wordCount / 1000) + 'k</div><div class="l">字数</div></div>' +
      '  </div>' +
      '  <div class="home-cards">' +
      '    <a class="card home-card" href="#/read/01"><div class="t">阅读全文</div><div class="d">左章右人,逐节读完整部散记</div></a>' +
      '    <a class="card home-card" href="#/characters"><div class="t">人物图鉴</div><div class="d">' + peopleCount + ' 位七班相关人物与他们的故事</div></a>' +
      '    <a class="card home-card" href="#/timeline"><div class="t">时间线</div><div class="d">从报到、军训到封校的关键时刻</div></a>' +
      '    <a class="card home-card" href="#/quotes"><div class="t">高光语录</div><div class="d">邹老师语录、鸡哥发言与班级名梗</div></a>' +
      '  </div>' +
      '</div>';
  }

  function viewReader(num) {
    var idx = chapters.findIndex(function (c) { return c.num === num; });
    if (idx === -1) return viewNotFound();
    var ch = chapters[idx];
    var prev = chapters[idx - 1], next = chapters[idx + 1];

    // 本章出场人物
    var present = chars.map(function (c) {
      return { c: c, n: mentionsIn(ch.paragraphs, c.aliases).length };
    }).filter(function (x) { return x.n > 0; })
      .sort(function (a, b) { return b.n - a.n; });

    var toc = chapters.map(function (c) {
      return '<a class="toc-item' + (c.num === num ? ' active' : '') + '" href="#/read/' + c.num + '">' +
        '<span class="no">' + c.num + '</span>' + esc(c.title) + '</a>';
    }).join('');

    var body;
    if (ch.paragraphs.length === 0) {
      body = '<p class="empty-note">这一节还没有写下任何字。<br>故事停在这里,后面的部分,只能靠回忆补全了。</p>';
    } else {
      body = ch.paragraphs.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
    }

    var railPeople = present.slice(0, 12).map(function (x) {
      return '<a class="person-rail-item" href="#/character/' + x.c.id + '">' +
        '<span class="avatar" style="background:' + avatarColor(x.c.name) + '">' + esc(x.c.name.charAt(0)) + '</span>' +
        '<span>' + esc(x.c.name) + '</span><span class="cnt">×' + x.n + '</span></a>';
    }).join('');

    return '' +
      '<div class="reader">' +
      '  <aside class="rail rail-left"><div class="rail-label">章 节</div>' + toc + '</aside>' +
      '  <article class="article">' +
      '    <div class="article-head">' +
      '      <div class="no">第 ' + ch.num + ' 节</div>' +
      '      <h1>' + esc(ch.title) + '</h1><div class="rule"></div>' +
      '    </div>' + body +
      '    <nav class="article-nav">' +
      (prev ? '<a href="#/read/' + prev.num + '"><span class="dir">上一节</span><span class="ttl">' + esc(prev.title) + '</span></a>' : '<span></span>') +
      (next ? '<a class="next" href="#/read/' + next.num + '"><span class="dir">下一节</span><span class="ttl">' + esc(next.title) + '</span></a>' : '<span></span>') +
      '    </nav>' +
      '  </article>' +
      '  <aside class="rail rail-right"><div class="rail-label">本 章 人 物</div>' +
      (railPeople || '<div style="font-size:13px;color:var(--muted);padding:8px">本节未提及已收录人物</div>') +
      '    <a class="rail-more" href="#/characters">查看全部人物 →</a>' +
      '  </aside>' +
      '</div>';
  }

  function viewCharacters() {
    var cards = chars.slice().sort(function (a, b) {
      return charStats[b.id].total - charStats[a.id].total;
    }).map(function (c) {
      return '<a class="card char-card" href="#/character/' + c.id + '">' +
        '<span class="avatar" style="background:' + avatarColor(c.name) + '">' + esc(c.name.charAt(0)) + '</span>' +
        '<span><span class="nm">' + esc(c.name) + '</span>' +
        '<span class="rl">' + esc(c.role) + ' · 提及 ' + charStats[c.id].total + ' 次</span>' +
        '<span class="pr">' + esc(c.profile.length > 52 ? c.profile.slice(0, 52) + '……' : c.profile) + '</span></span></a>';
    }).join('');
    return '<div class="page-narrow">' +
      '<h1 class="page-title">人物图鉴</h1><p class="page-sub">七班的群像 · 按全书提及次数排序 · 点击进入人物故事</p>' +
      '<div class="char-grid">' + cards + '</div></div>';
  }

  function viewCharacter(id) {
    var c = charById[id];
    if (!c) return viewNotFound();
    var st = charStats[c.id];

    // 相关片段:含别名的段落
    var excerpts = [];
    chapters.forEach(function (ch) {
      ch.paragraphs.forEach(function (p) {
        for (var k = 0; k < c.aliases.length; k++) {
          if (p.indexOf(c.aliases[k]) !== -1) {
            excerpts.push({ ch: ch, p: p });
            break;
          }
        }
      });
    });

    var appear = st.chapters.map(function (n) {
      return '<a href="#/read/' + n + '" title="第 ' + n + ' 节">' + n + '</a>';
    }).join('');

    var exHtml = excerpts.slice(0, 40).map(function (e) {
      return '<div class="excerpt"><div class="src">第 ' + e.ch.num + ' 节 · ' + esc(e.ch.title) + '</div>' +
        '<p>' + highlight(e.p, c.aliases) + '</p></div>';
    }).join('') || '<p style="color:var(--muted)">暂无相关片段。</p>';

    return '<div class="page-narrow">' +
      '<div class="char-head">' +
      '  <span class="avatar" style="background:' + avatarColor(c.name) + '">' + esc(c.name.charAt(0)) + '</span>' +
      '  <div><h1>' + esc(c.name) + '</h1><div class="rl">' + esc(c.role) + '</div></div>' +
      '</div>' +
      '<div>' + c.tags.map(function (t) { return '<span class="chip">' + esc(t) + '</span>'; }).join('') + '</div>' +
      '<p class="char-profile" style="margin-top:20px">' + esc(c.profile) + '</p>' +
      '<div class="char-appear"><div class="rail-label" style="border-bottom:none;margin-bottom:8px">出 现 于(全书 ' + st.total + ' 次)</div>' + appear + '</div>' +
      '<div class="rail-label" style="margin-bottom:14px">相 关 片 段</div>' + exHtml +
      '</div>';
  }

  function viewTimeline() {
    var items = EXTRAS.timeline.map(function (t) {
      return '<div class="tl-item"><div class="meta">' + esc(t.date) +
        '<a href="#/read/' + t.chapter + '">第 ' + t.chapter + ' 节 ↗</a></div>' +
        '<h3>' + esc(t.title) + '</h3><p>' + esc(t.desc) + '</p></div>';
    }).join('');
    return '<div class="page-narrow">' +
      '<h1 class="page-title">时间线</h1><p class="page-sub">高一这一年 · 从报到封校的关键节点</p>' +
      '<div class="timeline">' + items + '</div></div>';
  }

  function viewQuotes() {
    var items = EXTRAS.quotes.map(function (q) {
      return '<div class="card quote-item"><div class="q">' + esc(q.text) + '</div>' +
        '<div class="by">—— ' + esc(q.by) + ' <a href="#/read/' + q.chapter + '">· 第 ' + q.chapter + ' 节 ↗</a></div></div>';
    }).join('');
    return '<div class="page-narrow">' +
      '<h1 class="page-title">高光语录</h1><p class="page-sub">被全班记了很多年的话</p>' + items + '</div>';
  }

  function viewAbout() {
    return '<div class="page-narrow about">' +
      '<h1 class="page-title">关于本站</h1><p class="page-sub">一部 Word 文档的另一种打开方式</p>' +
      '<p>《九十九散记》原是一份 Word 文档,记录了作者(外号"高鸡")高中入学第一年在七班的经历与人物。全站共 22 个完整章节,约 ' + Math.round(DATA.wordCount / 1000) + ' 千字,故事停在第 23 节——一页空白。</p>' +
      '<p>本站把原文拆成三个入口:<b>中间读正文,左侧翻章节,右侧认人物</b>。右侧"本章人物"由程序按别名自动统计生成;每个人物页面里的"相关片段"也是从原文自动抽取的,人物小传与标签则为整理时手写。</p>' +
      '<p>页面均为纯静态 HTML / CSS / JavaScript,数据内嵌于 js 文件中,无需服务器,双击 index.html 即可打开。</p>' +
      '<p>人名均为回忆录中的外号。愿这些名字和他们的故事,被记得久一点。</p>' +
      '</div>';
  }

  function viewNotFound() {
    return '<div class="page-narrow" style="text-align:center;padding-top:100px">' +
      '<h1 class="page-title">404</h1><p class="page-sub">这一页不存在——就像第 23 节之后的故事一样。</p>' +
      '<a class="chip" href="#/">回到首页</a></div>';
  }

  /* ---------- 路由 ---------- */
  function route() {
    var hash = location.hash.replace(/^#\/?/, '');
    var parts = hash.split('/');
    var html, navKey = '', showFont = false;

    if (parts[0] === '' || parts[0] === undefined) {
      html = viewHome(); navKey = '';
    } else if (parts[0] === 'read') {
      html = viewReader(parts[1]); navKey = 'read'; showFont = true;
    } else if (parts[0] === 'characters') {
      html = viewCharacters(); navKey = 'characters';
    } else if (parts[0] === 'character') {
      html = viewCharacter(parts[1]); navKey = 'characters';
    } else if (parts[0] === 'timeline') {
      html = viewTimeline(); navKey = 'timeline';
    } else if (parts[0] === 'quotes') {
      html = viewQuotes(); navKey = 'quotes';
    } else if (parts[0] === 'about') {
      html = viewAbout(); navKey = 'about';
    } else {
      html = viewNotFound();
    }

    app.innerHTML = html;
    fontCtrl.hidden = !showFont;

    document.querySelectorAll('.site-nav a').forEach(function (a) {
      a.classList.toggle('active', a.dataset.nav === navKey);
    });
    document.title = '九十九散记 · 一部班级回忆录';

    progressBar.style.width = '0';
    updateProgress();
    window.scrollTo(0, 0);
  }

  /* ---------- 进度条 ---------- */
  function updateProgress() {
    var el = document.documentElement;
    var total = el.scrollHeight - el.clientHeight;
    var ratio = total > 0 ? (el.scrollTop / total) * 100 : 0;
    progressBar.style.width = ratio.toFixed(2) + '%';
  }
  window.addEventListener('scroll', updateProgress, { passive: true });

  /* ---------- 字号 ---------- */
  var FONT_SIZES = { small: '15px', normal: '17px', large: '19px' };
  var saved = null;
  try { saved = localStorage.getItem('jiushijiu-font'); } catch (e) {}
  if (saved && FONT_SIZES[saved]) {
    document.documentElement.style.setProperty('--fs-body', FONT_SIZES[saved]);
  }
  function markFontBtn() {
    var cur = saved || 'normal';
    fontCtrl.querySelectorAll('button').forEach(function (b) {
      b.classList.toggle('active', b.dataset.font === cur);
    });
  }
  fontCtrl.addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (!btn) return;
    saved = btn.dataset.font;
    document.documentElement.style.setProperty('--fs-body', FONT_SIZES[saved]);
    try { localStorage.setItem('jiushijiu-font', saved); } catch (err) {}
    markFontBtn();
  });
  markFontBtn();

  window.addEventListener('hashchange', route);
  route();
})();
