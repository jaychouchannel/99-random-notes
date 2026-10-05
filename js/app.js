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
      '  <p class="home-intro">一部关于高一七班的回忆录:军训只办了一天,班主任开着白色大奔冲进篮球场,班里一半的人在打球,另一半在给打球的人起外号。故事从新生报到开始,封校、网课、世界杯、千纸鹤与一场高烧,一直写到高一上学期在期末考中收官。</p>' +
      '  <div class="home-stats">' +
      '    <div class="home-stat"><div class="n">' + chapters.length + '</div><div class="l">章节</div></div>' +
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
      body = '<div class="article-body">' +
        ch.paragraphs.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') +
        '</div>';
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
      '<div id="hot-quotes" class="hot-quotes" hidden></div>' +
      commentsHtml('chapter-' + ch.num, ch.title) +
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
      '<h1 class="page-title">人物图鉴</h1><p class="page-sub">七班的群像 · 按全书提及次数排序 · 点击进入人物故事 · <a href="#/graph" style="color:var(--accent-deep)">查看人物关系图 →</a></p>' +
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
      commentsHtml('character-' + c.id, c.name) +
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
      '<p>《九十九散记》原是一份 Word 文档,记录了作者(外号"高鸡")高中入学第一年在七班的经历与人物。全书 25 节、约 ' + Math.round(DATA.wordCount / 1000) + ' 千字,从新生报到一直写到高一上学期结束。</p>' +
      '<p>本站把原文拆成三个入口:<b>中间读正文,左侧翻章节,右侧认人物</b>。右侧"本章人物"由程序按别名自动统计生成;每个人物页面里的"相关片段"也是从原文自动抽取的,人物小传与标签则为整理时手写。</p>' +
      '<p>页面均为纯静态 HTML / CSS / JavaScript,数据内嵌于 js 文件中,无需服务器,双击 index.html 即可打开。</p>' +
      '<p>人名均为回忆录中的外号。愿这些名字和他们的故事,被记得久一点。</p>' +
      '<p>读正文时,用鼠标划选任意一句话,可以针对这句话发表"引用留言"——被引用的句子会带上荧光标记,别人把鼠标停在上面就能看到这条线上的所有评论。</p>' +
      '</div>';
  }

  function viewNotFound() {
    return '<div class="page-narrow" style="text-align:center;padding-top:100px">' +
      '<h1 class="page-title">404</h1><p class="page-sub">这一页不存在——就像第 23 节之后的故事一样。</p>' +
      '<a class="chip" href="#/">回到首页</a></div>';
  }

  /* ---------- 留言区 ---------- */
  var COMMENT_API = 'https://jiushijiu.pages.dev/api/comments';

  function fmtTime(s) {
    var d = new Date(s.replace(' ', 'T') + 'Z');
    if (isNaN(d)) return s;
    return (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日 ' +
      String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  function commentsHtml(pageId, pageTitle) {
    return '<section class="comments" id="comments" data-page="' + esc(pageId) + '">' +
      '<div class="rail-label">留 言 · ' + esc(pageTitle) + '</div>' +
      '<div class="comment-list" id="comment-list"><div class="comment-empty">留言加载中……</div></div>' +
      '<form class="comment-form" id="comment-form">' +
      '  <input id="comment-name" maxlength="20" placeholder="怎么称呼你(可不填)">' +
      '  <textarea id="comment-text" maxlength="500" rows="3" placeholder="说点什么吧……" required></textarea>' +
      '  <div class="comment-form-foot"><span class="comment-err" id="comment-err"></span>' +
      '  <button type="submit">发 表</button></div>' +
      '</form></section>';
  }

  function loadComments(pageId) {
    var listEl = document.getElementById('comment-list');
    fetch(COMMENT_API + '?page=' + encodeURIComponent(pageId))
      .then(function (r) { return r.json(); })
      .then(function (list) {
        if (!document.getElementById('comment-list')) return;
        if (!Array.isArray(list)) throw new Error('bad response');
        if (!list.length) {
          listEl.innerHTML = '<div class="comment-empty">还没有人留言,来抢个沙发吧。</div>';
          return;
        }
        listEl.innerHTML = list.map(function (c) {
          return '<div class="comment-item"><div class="c-head"><b>' + esc(c.name) + '</b>' +
            '<span>' + esc(fmtTime(c.created_at)) + '</span>' +
            likeBtnHtml('comment', c.id, c.likes) + '</div>' +
            '<div class="c-text">' + esc(c.text) + '</div></div>';
        }).join('');
      })
      .catch(function () {
        var el = document.getElementById('comment-list');
        if (el) el.innerHTML = '<div class="comment-empty">留言加载失败,刷新试试。</div>';
      });
  }

  function initComments() {
    var section = document.getElementById('comments');
    if (!section) return;
    var pageId = section.dataset.page;
    loadComments(pageId);
    document.getElementById('comment-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var errEl = document.getElementById('comment-err');
      var btn = this.querySelector('button');
      var name = document.getElementById('comment-name').value.trim();
      var text = document.getElementById('comment-text').value.trim();
      errEl.textContent = '';
      if (!text) { errEl.textContent = '写点内容再发表吧'; return; }
      btn.disabled = true; btn.textContent = '发表中……';
      fetch(COMMENT_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: pageId, name: name, text: text })
      })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (res) {
          if (!res.ok) throw new Error(res.d.error || '发表失败');
          document.getElementById('comment-text').value = '';
          loadComments(pageId);
        })
        .catch(function (err) { errEl.textContent = err.message; })
        .finally(function () { btn.disabled = false; btn.textContent = '发 表'; });
    });
  }

  /* ---------- 点赞 ---------- */
  var LIKE_API = 'https://jiushijiu.pages.dev/api/likes';
  var likedSet = {};
  try { (JSON.parse(localStorage.getItem('jsj-liked') || '[]')).forEach(function (k) { likedSet[k] = 1; }); } catch (e) {}

  function saveLiked() {
    try { localStorage.setItem('jsj-liked', JSON.stringify(Object.keys(likedSet))); } catch (e) {}
  }

  function likeBtnHtml(type, id, count) {
    var liked = likedSet[type + ':' + id] ? ' liked' : '';
    return '<button type="button" class="like-btn' + liked + '" data-t="' + type + '" data-id="' + id + '">❤ <span>' + (count || 0) + '</span></button>';
  }

  function bindLikeButtons(root) {
    (root || document).addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('.like-btn');
      if (!btn) return;
      var key = btn.dataset.t + ':' + btn.dataset.id;
      if (likedSet[key]) return; // 已赞过
      btn.disabled = true;
      fetch(LIKE_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: btn.dataset.t, id: Number(btn.dataset.id) })
      })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (!d.ok) throw new Error(d.error || '点赞失败');
          likedSet[key] = 1; saveLiked();
          btn.classList.add('liked');
          btn.querySelector('span').textContent = d.count;
        })
        .catch(function () {})
        .finally(function () { btn.disabled = false; });
    });
  }
  bindLikeButtons();

  /* ---------- 本章最热句子 ---------- */
  function renderHotQuotes() {
    var box = document.getElementById('hot-quotes');
    if (!box) return;
    var byQuote = {};
    quoteGroups.forEach(function (g) {
      var k = g.para_idx + '::' + g.quote;
      if (!byQuote[k]) byQuote[k] = { quote: g.quote, comments: 0, likes: 0 };
      byQuote[k].comments += g.comments.length;
      g.comments.forEach(function (c) { byQuote[k].likes += c.likes || 0; });
    });
    var top = Object.keys(byQuote).map(function (k) { return byQuote[k]; })
      .sort(function (a, b) { return b.likes - a.likes || b.comments - a.comments; })
      .slice(0, 3)
      .filter(function (q) { return q.likes > 0 || q.comments > 0; });
    if (!top.length) { box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = '<div class="rail-label">本 章 最 热 句 子</div>' +
      top.map(function (q, i) {
        return '<div class="hot-item" data-quote="' + i + '"><span class="hot-rank">' + (i + 1) + '</span>' +
          '<span class="hot-text">「' + esc(trunc(q.quote, 40)) + '」</span>' +
          '<span class="hot-meta">' + q.comments + ' 条评论 · ' + q.likes + ' ❤</span></div>';
      }).join('');
    box.querySelectorAll('.hot-item').forEach(function (el, i) {
      el.addEventListener('click', function () {
        var q = top[i];
        var group = quoteGroups.filter(function (g) { return g.quote === q.quote; })[0];
        if (!group) return;
        var mark = document.querySelector('.qmark[data-g="' + quoteGroups.indexOf(group) + '"]');
        if (mark) {
          mark.scrollIntoView({ block: 'center', behavior: 'smooth' });
          setTimeout(function () {
            mark.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
          }, 400);
        }
      });
    });
  }

  /* ---------- 引用留言(划线评论) ---------- */
  var QUOTE_API = 'https://jiushijiu.pages.dev/api/quotes';
  var quoteGroups = [];        // [{para_idx, quote, comments:[{id,name,text,created_at}]}]
  var quotePage = null;
  var chapterParas = null;     // 当前章节原始段落
  var pendingSel = null;       // 待提交的选区 {paraIdx, quote, rect}
  var popLayer = null;

  function trunc(s, n) { return s.length > n ? s.slice(0, n) + '……' : s; }

  function paraWithMarks(pText, paraIdx) {
    var groups = quoteGroups
      .map(function (g, i) { return { id: i, quote: g.quote, para: g.para_idx, pos: g.para_idx === paraIdx ? pText.indexOf(g.quote) : -1 }; })
      .filter(function (g) { return g.pos >= 0; })
      .sort(function (a, b) { return a.pos - b.pos; });
    if (!groups.length) return null;
    var html = '', cur = 0;
    groups.forEach(function (g) {
      if (g.pos < cur) return; // 与前一个标记重叠,跳过
      html += esc(pText.slice(cur, g.pos));
      html += '<mark class="qmark" data-g="' + g.id + '">' + esc(g.quote) + '</mark>';
      cur = g.pos + g.quote.length;
    });
    html += esc(pText.slice(cur));
    return html;
  }

  function renderParaMarks() {
    var paras = document.querySelectorAll('.article-body p');
    if (!chapterParas) return;
    paras.forEach(function (p, i) {
      if (i >= chapterParas.length) return;
      var html = paraWithMarks(chapterParas[i], i);
      if (html !== null) p.innerHTML = html;
    });
  }

  function groupQuoteRows(rows) {
    var map = {}, groups = [];
    rows.forEach(function (r) {
      var k = r.para_idx + '::' + r.quote;
      if (!(k in map)) { map[k] = { para_idx: r.para_idx, quote: r.quote, comments: [] }; groups.push(map[k]); }
      map[k].comments.push({ id: r.id, name: r.name, text: r.text, created_at: r.created_at, likes: r.likes || 0 });
    });
    return groups;
  }

  function initQuotes(num) {
    quotePage = 'chapter-' + num;
    quoteGroups = [];
    var ch = chapters.filter(function (c) { return c.num === num; })[0];
    chapterParas = ch ? ch.paragraphs : null;
    fetch(QUOTE_API + '?page=' + encodeURIComponent(quotePage))
      .then(function (r) { return r.json(); })
      .then(function (rows) {
        if (!Array.isArray(rows)) return;
        quoteGroups = groupQuoteRows(rows);
        renderParaMarks();
        renderHotQuotes();
      })
      .catch(function () {});
  }

  function refreshQuotes() {
    return fetch(QUOTE_API + '?page=' + encodeURIComponent(quotePage))
      .then(function (r) { return r.json(); })
      .then(function (rows) {
        if (Array.isArray(rows)) {
          quoteGroups = groupQuoteRows(rows);
          renderParaMarks();
          renderHotQuotes();
        }
      });
  }

  function ensurePopLayer() {
    if (popLayer) return;
    popLayer = document.createElement('div');
    popLayer.id = 'quote-layer';
    popLayer.innerHTML =
      '<div id="sel-bubble" hidden><button type="button" id="sel-bubble-btn">✍ 引用留言</button></div>' +
      '<div id="quote-pop" class="quote-pop" hidden></div>' +
      '<div id="quote-form-pop" class="quote-form-pop" hidden>' +
      '  <div class="qf-quote" id="qf-quote"></div>' +
      '  <input id="qf-name" maxlength="20" placeholder="怎么称呼你(可不填)">' +
      '  <textarea id="qf-text" maxlength="500" rows="3" placeholder="针对这句话,写点什么……"></textarea>' +
      '  <div class="comment-form-foot"><span class="comment-err" id="qf-err"></span>' +
      '  <span class="qf-btns"><button type="button" class="qf-cancel" id="qf-cancel">取消</button>' +
      '  <button type="button" id="qf-submit">发 表</button></span></div>' +
      '</div>';
    document.body.appendChild(popLayer);
    bindQuoteEvents();
  }

  function hidePop(hideForm) {
    var b = document.getElementById('sel-bubble');
    var p = document.getElementById('quote-pop');
    if (b) b.hidden = true;
    if (p) { p.hidden = true; p.dataset.g = ''; }
    if (hideForm) { var f = document.getElementById('quote-form-pop'); if (f) f.hidden = true; }
  }

  function placeFixed(el, rect, opts) {
    el.style.left = '0px'; el.style.top = '0px'; el.hidden = false;
    var w = el.offsetWidth, h = el.offsetHeight;
    var x = opts.center ? rect.left + rect.width / 2 - w / 2 : rect.left;
    var y = opts.below ? rect.bottom + 10 : rect.top - h - 10;
    if (y < 70) y = opts.below ? rect.bottom + 10 : rect.bottom + 10;
    x = Math.max(10, Math.min(x, window.innerWidth - w - 10));
    y = Math.max(64, Math.min(y, window.innerHeight - h - 10));
    el.style.left = x + 'px';
    el.style.top = y + 'px';
  }

  function showQuotePop(group, anchorRect) {
    var pop = document.getElementById('quote-pop');
    if (!pop.hidden && pop.dataset.g === String(quoteGroups.indexOf(group))) return; // 已在显示同一条
    pop.dataset.g = String(quoteGroups.indexOf(group));
    pop.innerHTML =
      '<div class="qp-quote">「' + esc(trunc(group.quote, 60)) + '」</div>' +
      group.comments.map(function (c) {
        return '<div class="qp-item"><div class="c-head"><b>' + esc(c.name) + '</b><span>' +
          esc(fmtTime(c.created_at)) + '</span>' + likeBtnHtml('quote', c.id, c.likes) + '</div><div class="qp-text">' + esc(c.text) + '</div></div>';
      }).join('') +
      '<button type="button" class="qp-add" id="qp-add">+ 也说一句</button>';
    placeFixed(pop, anchorRect, { center: true, below: true });
    document.getElementById('qp-add').addEventListener('click', function () {
      var mark = document.querySelector('.qmark[data-g="' + quoteGroups.indexOf(group) + '"]');
      openQuoteForm(group.para_idx, group.quote, mark ? mark.getBoundingClientRect() : anchorRect);
      hidePop();
    });
  }

  function openQuoteForm(paraIdx, quote, rect) {
    pendingSel = { paraIdx: paraIdx, quote: quote };
    document.getElementById('qf-quote').textContent = '「' + trunc(quote, 50) + '」';
    document.getElementById('qf-err').textContent = '';
    document.getElementById('qf-text').value = '';
    var f = document.getElementById('quote-form-pop');
    placeFixed(f, rect, { center: true, below: false });
    document.getElementById('qf-text').focus();
  }

  function bindQuoteEvents() {
    // 划选正文后浮出按钮
    document.addEventListener('mouseup', function (e) {
      if (e.target.closest && e.target.closest('#quote-layer')) return;
      var sel = window.getSelection();
      var text = sel && sel.rangeCount ? sel.toString().trim() : '';
      var bubble = document.getElementById('sel-bubble');
      if (!text || text.length < 2) { bubble.hidden = true; return; }
      var range = sel.getRangeAt(0);
      var p1 = range.startContainer.parentElement, p2 = range.endContainer.parentElement;
      var para1 = p1 && p1.closest ? p1.closest('.article-body p') : null;
      var para2 = p2 && p2.closest ? p2.closest('.article-body p') : null;
      if (!para1 || para1 !== para2) { bubble.hidden = true; return; }
      var quote = text.length > 150 ? text.slice(0, 150) : text;
      if (para1.textContent.indexOf(quote) === -1) { bubble.hidden = true; return; }
      var paras = document.querySelectorAll('.article-body p');
      var paraIdx = Array.prototype.indexOf.call(paras, para1);
      pendingSel = { paraIdx: paraIdx, quote: quote };
      placeFixed(bubble, range.getBoundingClientRect(), { center: true, below: false });
      bubble.hidden = false;
    });
    // 点标记 → 悬停/点击弹出该句的评论
    document.addEventListener('mouseover', function (e) {
      var mark = e.target.closest && e.target.closest('.qmark');
      if (!mark) return;
      var group = quoteGroups[Number(mark.dataset.g)];
      if (group) showQuotePop(group, mark.getBoundingClientRect());
    });
    document.addEventListener('mousedown', function (e) {
      if (!e.target.closest) return;
      if (e.target.id === 'sel-bubble-btn' || e.target.closest('.quote-pop')) return;
      if (!e.target.closest('.qmark')) hidePop();
      if (!e.target.closest('#quote-form-pop')) {
        var f = document.getElementById('quote-form-pop');
        if (f) f.hidden = true;
      }
    });
    // 气泡按钮:打开填写表单(用 mousedown 防止选区被清除)
    document.addEventListener('mousedown', function (e) {
      if (e.target.id === 'sel-bubble-btn') e.preventDefault();
    });
    document.getElementById('sel-bubble-btn').addEventListener('click', function () {
      if (pendingSel) {
        var bubble = document.getElementById('sel-bubble');
        openQuoteForm(pendingSel.paraIdx, pendingSel.quote, bubble.hidden ? { left: window.innerWidth / 2, top: 200, width: 0, bottom: 200 } : bubble.getBoundingClientRect());
        bubble.hidden = true;
      }
    });
    document.getElementById('qf-cancel').addEventListener('click', function () { hidePop(true); });
    document.getElementById('qf-submit').addEventListener('click', submitQuote);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') hidePop(true);
    });
    window.addEventListener('scroll', function () { hidePop(); }, true);
  }

  function submitQuote() {
    var errEl = document.getElementById('qf-err');
    var btn = document.getElementById('qf-submit');
    var name = document.getElementById('qf-name').value.trim();
    var text = document.getElementById('qf-text').value.trim();
    errEl.textContent = '';
    if (!text) { errEl.textContent = '写点内容再发表吧'; return; }
    btn.disabled = true; btn.textContent = '发表中……';
    fetch(QUOTE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page: quotePage, para_idx: pendingSel && pendingSel.paraIdx,
        quote: pendingSel && pendingSel.quote, name: name, text: text
      })
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (!res.ok) throw new Error(res.d.error || '发表失败');
        hidePop(true);
        return refreshQuotes();
      })
      .catch(function (err) { errEl.textContent = err.message; })
      .finally(function () { btn.disabled = false; btn.textContent = '发 表'; });
  }

  /* ---------- 人物关系图 ---------- */
  function viewGraph() {
    return '<div class="page-narrow graph-page">' +
      '<h1 class="page-title">人物关系图</h1><p class="page-sub">按宿舍、班委、球场小团伙聚簇 · 点击人物进入专属页面</p>' +
      '<div class="card graph-wrap"><svg id="graph-svg" viewBox="0 0 900 640" role="img" aria-label="人物关系图"></svg></div>' +
      '<div class="graph-legend">' + EXTRAS.groups.map(function (g, i) {
        return '<span class="chip"><i class="dot" style="background:' + GRAPH_COLORS[i % GRAPH_COLORS.length] + '"></i>' + esc(g.name) + '</span>';
      }).join('') + '</div>' +
      '</div>';
  }

  var GRAPH_COLORS = ['#7c8f7c', '#8f8a7c', '#7c8a8f', '#94867a', '#86948a', '#948f7a', '#8a9486', '#94788a', '#7d8f9c', '#9c8f7d'];

  function buildGraph() {
    var svg = document.getElementById('graph-svg');
    if (!svg) return;
    var W = 900, H = 640, CX = W / 2, CY = H / 2;
    var groups = EXTRAS.groups;
    var hubs = groups.map(function (g, i) {
      var ang = (i / groups.length) * Math.PI * 2 - Math.PI / 2;
      return { gi: i, name: g.name, tx: CX + Math.cos(ang) * 258, ty: CY + Math.sin(ang) * 218, x: CX + Math.cos(ang) * 258, y: CY + Math.sin(ang) * 218, vx: 0, vy: 0 };
    });
    var people = chars.map(function (c) {
      var gi = groups.length - 1;
      for (var i = 0; i < groups.length; i++) {
        if (groups[i].members.indexOf(c.id) !== -1) { gi = i; break; }
      }
      return { c: c, gi: gi, x: CX + (Math.random() - 0.5) * 320, y: CY + (Math.random() - 0.5) * 240, vx: 0, vy: 0 };
    });

    // 轻量力导向:斥力 + 人-团伙弹簧 + 团伙锚定圆环
    var nodes = hubs.concat(people);
    for (var iter = 0; iter < 450; iter++) {
      for (var i = 0; i < nodes.length; i++) {
        for (var j = i + 1; j < nodes.length; j++) {
          var a = nodes[i], b = nodes[j];
          var dx = b.x - a.x, dy = b.y - a.y;
          var d2 = dx * dx + dy * dy;
          if (d2 < 1) d2 = 1;
          if (d2 < 165 * 165) {
            var d = Math.sqrt(d2);
            var f = ((165 - d) / 165) * 0.55;
            var fx = (dx / d) * f, fy = (dy / d) * f;
            a.vx -= fx; a.vy -= fy; b.vx += fx; b.vy += fy;
          }
        }
      }
      people.forEach(function (p) {
        var h = hubs[p.gi];
        var dx = h.x - p.x, dy = h.y - p.y;
        var d = Math.sqrt(dx * dx + dy * dy) || 1;
        var f = (d - 84) * 0.035;
        p.vx += (dx / d) * f; p.vy += (dy / d) * f;
      });
      hubs.forEach(function (h) {
        h.vx += (h.tx - h.x) * 0.06; h.vy += (h.ty - h.y) * 0.06;
        h.vx *= 0.82; h.vy *= 0.82;
        h.x += h.vx; h.y += h.vy;
      });
      people.forEach(function (p) {
        p.vx *= 0.82; p.vy *= 0.82;
        p.x += p.vx; p.y += p.vy;
        p.x = Math.max(46, Math.min(W - 46, p.x));
        p.y = Math.max(56, Math.min(H - 40, p.y));
      });
    }

    var s = '';
    people.forEach(function (p) {
      groups.forEach(function (g, gi) {
        if (g.members.indexOf(p.c.id) === -1) return;
        var h = hubs[gi];
        var primary = gi === p.gi;
        s += '<line x1="' + p.x.toFixed(1) + '" y1="' + p.y.toFixed(1) + '" x2="' + h.x.toFixed(1) + '" y2="' + h.y.toFixed(1) +
          '" stroke="' + (primary ? '#d8d1bf' : '#eae5d9') + '" stroke-width="' + (primary ? 1 : 0.8) + '"/>';
      });
    });
    hubs.forEach(function (h, i) {
      var w = h.name.length * 15 + 22;
      var col = GRAPH_COLORS[i % GRAPH_COLORS.length];
      s += '<g><rect x="' + (h.x - w / 2).toFixed(1) + '" y="' + (h.y - 14).toFixed(1) + '" width="' + w + '" height="28" rx="14" fill="' + col + '" opacity="0.92"/>' +
        '<text x="' + h.x.toFixed(1) + '" y="' + (h.y + 5).toFixed(1) + '" text-anchor="middle" font-size="13" fill="#fff">' + esc(h.name) + '</text></g>';
    });
    people.forEach(function (p) {
      var col = GRAPH_COLORS[p.gi % GRAPH_COLORS.length];
      var memberships = groups.map(function (g) { return g.name; }).filter(function (n, i) { return groups[i].members.indexOf(p.c.id) !== -1; }).join(' · ');
      s += '<g class="gnode" data-id="' + p.c.id + '" style="cursor:pointer">' +
        '<title>' + esc(p.c.name + ' — ' + p.c.role) + '\n' + esc(memberships) + '</title>' +
        '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="7" fill="' + col + '" stroke="#fbfaf7" stroke-width="2"/>' +
        '<text x="' + p.x.toFixed(1) + '" y="' + (p.y + 22).toFixed(1) + '" text-anchor="middle" font-size="12.5" fill="#6b665c">' + esc(p.c.name) + '</text></g>';
    });
    svg.innerHTML = s;
    svg.onclick = function (e) {
      var g = e.target.closest && e.target.closest('.gnode');
      if (g) location.hash = '#/character/' + g.dataset.id;
    };
  }

  /* ---------- 全文搜索 ---------- */
  function hi(text, q) {
    // 原文转义后高亮命中片段
    var lower = text.toLowerCase(), i = lower.indexOf(q);
    if (i === -1) return esc(text);
    var start = Math.max(0, i - 18);
    var pre = (start > 0 ? '……' : '') + text.slice(start, i);
    var hit = text.slice(i, i + q.length);
    var tail = text.slice(i + q.length, i + q.length + 30);
    return esc(pre) + '<mark>' + esc(hit) + '</mark>' + esc(tail) + (i + q.length + 30 < text.length ? '……' : '');
  }

  function initSearch() {
    var input = document.getElementById('search-input');
    var panel = document.getElementById('search-results');
    if (!input) return;
    var timer = null;

    function doSearch(q) {
      var chap = [], ppl = [], quo = [];
      chapters.forEach(function (ch) {
        var hit = { num: ch.num, title: ch.title, excerpt: null };
        var tl = ch.title.toLowerCase();
        if (tl.indexOf(q) !== -1) { chap.push(hit); return; }
        for (var i = 0; i < ch.paragraphs.length; i++) {
          if (ch.paragraphs[i].toLowerCase().indexOf(q) !== -1) {
            hit.excerpt = { p: ch.paragraphs[i], pos: ch.paragraphs[i].toLowerCase().indexOf(q) };
            chap.push(hit);
            break;
          }
        }
      });
      chars.forEach(function (c) {
        var hay = (c.name + ' ' + c.aliases.join(' ') + ' ' + c.role + ' ' + c.tags.join(' ') + ' ' + c.profile).toLowerCase();
        if (hay.indexOf(q) !== -1) ppl.push(c);
      });
      EXTRAS.quotes.forEach(function (qt) {
        if ((qt.text + ' ' + qt.by).toLowerCase().indexOf(q) !== -1) quo.push(qt);
      });

      if (!chap.length && !ppl.length && !quo.length) {
        panel.innerHTML = '<div class="sr-empty">没有找到「' + esc(input.value.trim()) + '」相关的内容</div>';
        panel.hidden = false;
        return;
      }
      var html = '';
      if (chap.length) {
        html += '<div class="sr-group">章节</div>';
        chap.slice(0, 6).forEach(function (h) {
          html += '<a class="sr-item" href="#/read/' + h.num + '">' +
            '<span class="sr-title">' + hi(h.num + ' ' + h.title, q) + '</span>' +
            (h.excerpt ? '<span class="sr-excerpt">' + hi(h.excerpt.p, q) + '</span>' : '') +
            '</a>';
        });
      }
      if (ppl.length) {
        html += '<div class="sr-group">人物</div>';
        ppl.slice(0, 6).forEach(function (c) {
          html += '<a class="sr-item" href="#/character/' + c.id + '">' +
            '<span class="sr-title">' + hi(c.name + ' · ' + c.role, q) + '</span>' +
            '<span class="sr-excerpt">' + hi(c.profile, q) + '</span></a>';
        });
      }
      if (quo.length) {
        html += '<div class="sr-group">语录</div>';
        quo.slice(0, 4).forEach(function (qt) {
          html += '<a class="sr-item" href="#/read/' + qt.chapter + '">' +
            '<span class="sr-title">' + hi(qt.text, q) + '</span>' +
            '<span class="sr-excerpt">' + esc(qt.by) + ' · 第 ' + qt.chapter + ' 节</span></a>';
        });
      }
      panel.innerHTML = html;
      panel.hidden = false;
    }

    input.addEventListener('input', function () {
      clearTimeout(timer);
      var q = input.value.trim().toLowerCase();
      if (!q) { panel.hidden = true; return; }
      timer = setTimeout(function () { doSearch(q); }, 150);
    });
    input.addEventListener('focus', function () {
      if (input.value.trim() && panel.innerHTML) panel.hidden = false;
    });
    document.addEventListener('mousedown', function (e) {
      if (!e.target.closest || !e.target.closest('#search-box')) panel.hidden = true;
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { panel.hidden = true; input.blur(); }
      if (e.key === 'Enter') {
        var first = panel.querySelector('a.sr-item');
        if (first) { location.hash = first.getAttribute('href'); panel.hidden = true; input.blur(); }
      }
    });
    // 路由切换后收起面板并清空
    window.addEventListener('hashchange', function () {
      panel.hidden = true;
      input.value = '';
    });
  }
  initSearch();

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
    } else if (parts[0] === 'graph') {
      html = viewGraph(); navKey = 'graph';
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
    initComments();
    if (parts[0] === 'read' && showFont) { ensurePopLayer(); initQuotes(parts[1]); }
    if (parts[0] === 'graph') { buildGraph(); }

    document.querySelectorAll('.site-nav a').forEach(function (a) {
      a.classList.toggle('active', a.dataset.nav === navKey);
    });
    // 每页动态标题(分享/历史记录可辨识)
    var pageTitle = '';
    if (parts[0] === 'read') {
      var cur = chapters.filter(function (c) { return c.num === parts[1]; })[0];
      if (cur) pageTitle = '第 ' + cur.num + ' 节 · ' + cur.title;
    } else if (parts[0] === 'characters') pageTitle = '人物图鉴';
    else if (parts[0] === 'character') {
      var cc = charById[parts[1]];
      if (cc) pageTitle = cc.name + ' · 人物';
    } else if (parts[0] === 'graph') pageTitle = '人物关系图';
    else if (parts[0] === 'timeline') pageTitle = '时间线';
    else if (parts[0] === 'quotes') pageTitle = '高光语录';
    else if (parts[0] === 'about') pageTitle = '关于';
    document.title = pageTitle ? pageTitle + ' | 九十九散记' : '九十九散记 · 一部班级回忆录';

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
  // 三档直接改 html 根字号,全站 rem 字号一起缩放
  var FONT_SIZES = { small: '14.5px', normal: '16px', large: '18px' };
  var saved = null;
  try { saved = localStorage.getItem('jiushijiu-font'); } catch (e) {}
  if (saved && FONT_SIZES[saved]) {
    document.documentElement.style.fontSize = FONT_SIZES[saved];
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
    document.documentElement.style.fontSize = FONT_SIZES[saved];
    try { localStorage.setItem('jiushijiu-font', saved); } catch (err) {}
    markFontBtn();
  });
  markFontBtn();

  window.addEventListener('hashchange', route);
  route();
})();
