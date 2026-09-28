/* =====================================================================
   STUDIO41 — LIVE VIDEOS
   Every Studio41 page loads this file. It fetches the page's video lists
   from the Supabase database (where studio41_admin.html saves them) and
   draws them into the page, so admin changes show up on the next visit.

   If the database can't be reached (or isn't set up yet), the page simply
   shows the videos already written into its HTML.

   SETUP: paste your Supabase project's URL and "anon public" key below.
   Both are meant to be public: the database only lets the admin account
   change anything.
   ===================================================================== */
(function(){
  'use strict';

  var CONFIG = {
    url: 'PASTE-YOUR-SUPABASE-URL-HERE',          // e.g. https://abcdefghijkl.supabase.co
    anonKey: 'PASTE-YOUR-SUPABASE-ANON-KEY-HERE',  // Project Settings → API Keys: the publishable key (or legacy "anon public" key)
    table: 'site_videos',
    adminEmail: 'admin@studio41.tv',                // the admin account's email ("Admin" signs in as this)
    waitMs: 3000                                    // longest the page waits for the database
  };

  var HOME_DEFAULT_DESC = "Studio41's premier showcase of student-produced content, shown to High School Advisory groups across SAS.";
  var KINDS = { sports: 'Sports', arts: 'Arts & events' };

  /* ---------- helpers ---------- */
  function escT(s){ return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/ /g, '&nbsp;'); }
  function escA(s){ return escT(s).replace(/"/g, '&quot;'); }
  function bgStyle(url){ return "background-image:url('" + String(url).replace(/'/g, '%27').replace(/\)/g, '%29') + "')"; }
  function vimeoPage(id){ var p = String(id || '').split('?h='); return 'https://vimeo.com/' + p[0] + (p[1] ? '/' + p[1] : ''); }
  function ytIdFromEmbed(u){ var m = /\/embed\/([\w-]{11})/.exec(u || ''); return m ? m[1] : ''; }
  function thumbAttrs(base, t){
    t = t || {};
    var s = ' class="' + base + (!t.url && t.cls ? ' ' + t.cls : '') + '"';
    if(t.url) s += ' style="' + escA(bgStyle(t.url)) + '"';
    return s;
  }
  function autoCh(e){
    var m = /season\s*(\d+)/i.exec(e.code || '');
    return (m ? 'S' + m[1] : String(e.code || '').toUpperCase()) + (e.codeB ? ' · ' + e.codeB : '');
  }
  function seasonLabel(d, id){ for(var i = 0; i < d.seasons.length; i++) if(d.seasons[i].id === id) return d.seasons[i].label; return id; }
  // When a different episode reaches the top of the home strip, the big player's words follow it.
  function syncHero(d){
    var e0 = d.episodes[0];
    if(e0 && e0.vimeo !== d.heroVimeo){ d.heroVimeo = e0.vimeo; d.heroTag = e0.tag; d.heroDesc = e0.desc || HOME_DEFAULT_DESC; }
  }

  /* ---------- what each page's data turns into ----------
     regions: HTML for the parts between the <!-- S41-ADMIN:name:START/END --> comments
     ops:     ['attr', id, attribute, value|null]   ['html', id, innerHTML]   ['eps', sectionId, count] */
  var RENDER = {
    home: function(d){
      syncHero(d);
      var I = '          ', P = '         ', e0 = d.episodes[0], ops = [['html', 'nowTitle', escT(d.heroTitle || 'Latest Release')]];
      if(e0){
        var link = e0.href || vimeoPage(e0.vimeo);
        ops.push(['attr', 'monitor', 'class', 'monitor' + (!e0.thumb.url && e0.thumb.cls ? ' ' + e0.thumb.cls : '')],
                 ['attr', 'monitor', 'style', e0.thumb.url ? bgStyle(e0.thumb.url) : null],
                 ['attr', 'monitor', 'data-vimeo', e0.vimeo],
                 ['attr', 'playBtn', 'href', link], ['attr', 'watchBtn', 'href', link], ['attr', 'openBtn', 'href', link],
                 ['html', 'nowTag', escT(d.heroTag)], ['html', 'nowDesc', escT(d.heroDesc || HOME_DEFAULT_DESC)]);
      }
      return {
        regions: {
          'home-episodes': d.episodes.map(function(e, i){
            var first = i === 0;
            return I + '<a class="ep-card' + (first ? ' is-current' : '') + '" href="' + escA(e.href || vimeoPage(e.vimeo)) + '" data-vimeo="' + escA(e.vimeo) + '" data-tag="' + escA(e.tag) + '"' + (e.desc ? ' data-desc="' + escA(e.desc) + '"' : '') + '>\n' +
              I + '  <div class="ep-media' + (first ? ' latest' : '') + '"><div' + thumbAttrs('ep-thumb', e.thumb) + '></div></div>\n' +
              I + '  <div class="ep-body"><div class="code">' + escT(e.code) + '</div><div class="title">' + escT(e.title) + '</div></div>\n' +
              I + '</a>';
          }).join('\n\n'),
          'home-promos': d.promos.map(function(p){
            var ytid = ytIdFromEmbed(p.embed);
            var href = p.href || (p.embed ? (ytid ? 'https://www.youtube.com/watch?v=' + ytid : p.embed) : vimeoPage(p.vimeo));
            return P + '<div class="promo"' + (p.embed ? ' data-embed="' + escA(p.embed) + '"' : ' data-vimeo="' + escA(p.vimeo) + '"') + '>\n' +
              P + '  <a' + thumbAttrs('promo-thumb', p.thumb) + ' href="' + escA(href) + '" aria-label="Play ' + escA(p.title) + '"><span class="promo-play" aria-hidden="true">▶</span></a>\n' +
              P + '  <div class="promo-info"><div><div class="tag">' + escT(p.tag) + '</div><h3>' + escT(p.title) + '</h3></div>' + (p.len ? '<div class="len">' + escT(p.len) + '</div>' : '') + '</div>\n' +
              P + '  <div class="promo-slot"></div>\n' +
              P + '</div>';
          }).join('\n')
        },
        ops: ops
      };
    },

    firsttake: function(d){
      var T = '          ', I = '        ', e0 = d.episodes[0], ops = [['html', 'epCount', String(d.episodes.length)]];
      if(e0) ops.push(['attr', 'screen', 'class', 'screen' + (!e0.thumb.url && e0.thumb.cls ? ' ' + e0.thumb.cls : '')],
                      ['attr', 'screen', 'style', e0.thumb.url ? bgStyle(e0.thumb.url) : null],
                      ['html', 'nowLine', '<b>NOW ›</b> ' + escT(e0.code ? e0.code + ' · ' + e0.title : e0.title)]);
      return {
        regions: {
          'ft-tabs': [T + '<button type="button" data-filter="all" aria-pressed="true">All</button>'].concat(d.tabs.map(function(t){
            return T + '<button type="button" data-filter="' + escA(t.id) + '" aria-pressed="false">' + escT(t.label) + '</button>';
          })).join('\n'),
          'ft-episodes': d.episodes.map(function(e, i){
            return I + '<a class="listing' + (i === 0 ? ' is-current' : '') + '" href="' + escA(e.href || vimeoPage(e.vimeo)) + '" data-vimeo="' + escA(e.vimeo) + '" data-group="' + escA(e.group) + '" data-ch="' + escA(e.ch || autoCh(e)) + '">\n' +
              I + '  <div class="slot-code">' + escT(e.code) + '<b>' + escT(e.codeB) + '</b></div>\n' +
              I + '  <div' + thumbAttrs('l-thumb', e.thumb) + '></div>\n' +
              I + '  <div class="l-body"><h3>' + escT(e.title) + '</h3>' + (e.desc ? '<p>' + escT(e.desc) + '</p>' : '') + '</div>\n' +
              I + '  <span class="l-go">▶ Tune in</span>\n' +
              I + '</a>';
          }).join('\n')
        },
        ops: ops
      };
    },

    originals: function(d){
      var I = '          ', regions = {}, ops = [];
      d.series.forEach(function(s){
        regions['orig-' + s.id] = s.episodes.map(function(e){
          return I + '<button class="ticket" type="button" data-vimeo="' + escA(e.vimeo) + '" data-title="' + escA(e.dataTitle || s.name + ' · ' + e.title) + '">\n' +
            I + '  <span class="stub"><small>' + escT(e.stub || 'EP') + '</small><b>' + escT(e.num) + '</b></span>\n' +
            I + '  <span class="t-body"><span class="admit">' + escT(e.admit || 'ADMIT ONE') + '</span><span class="t-title" style="display:block">' + escT(e.title) + '</span>' +
                 (e.desc ? '<span class="t-desc" style="display:block">' + escT(e.desc) + '</span>' : '') + '</span>\n' +
            I + '  <span class="t-play">▶ Screen</span>\n' +
            I + '</button>';
        }).join('\n');
        ops.push(['eps', s.id, s.episodes.length]);
      });
      return { regions: regions, ops: ops };
    },

    promos: function(d){
      var I = '        ', S = '          ';
      var roster = d.roster.map(function(e){
        var fb = e.thumb.cls || e.thumb.url, dt = fb ? ' data-thumb="' + escA(fb) + '"' : '';
        var jt = '<span class="j-thumb"' + (e.jStyle ? ' style="' + escA(bgStyle(e.jStyle)) + '"' : '') + '>';
        var body = '<span class="j-body"><span class="j-tag" style="display:block">' + escT(e.tag) + '</span><span class="j-title">' + escT(e.title) + '</span><span class="stats">';
        if(e.soon) return I + '<div class="jersey soon" aria-label="' + escA(e.title) + ' promo, coming soon"' + dt + '>\n' +
          I + '  ' + jt + '<span class="soon-badge">Coming soon</span><span class="num">' + escT(e.num) + '</span></span>\n' +
          I + '  ' + body + '<span class="st">● In production</span><span>' + escT(e.len || '--:--') + '</span></span></span>\n' +
          I + '</div>';
        return I + '<button class="jersey" type="button" data-vimeo="' + escA(e.vimeo) + '" data-len="' + escA(e.len || '0:00') + '"' + dt + '>\n' +
          I + '  ' + jt + '<span class="num">' + escT(e.num) + '</span></span>\n' +
          I + '  ' + body + '<span class="st">▶ Play</span><span>' + escT(e.len) + '</span></span></span>\n' +
          I + '</button>';
      }).join('\n');
      var out = [], last = null;
      d.archive.forEach(function(a){
        if(a.season !== last){ out.push((out.length ? '\n' : '') + I + '<!-- ' + seasonLabel(d, a.season).replace(/--/g, '-') + ' season -->'); last = a.season; }
        out.push(I + '<button class="arc" type="button" data-vimeo="' + escA(a.vimeo) + '" data-season="' + escA(a.season) + '" data-kind="' + escA(a.kind) + '" data-len="' + escA(a.len) + '">\n' +
          I + '  <img src="' + escA(a.img) + '" alt="" loading="lazy">\n' +
          I + '  <span class="arc-body"><span class="arc-tag">' + escT((KINDS[a.kind] || a.kind) + ' · ' + seasonLabel(d, a.season)) + '</span><span class="arc-title">' + escT(a.title) + '</span></span>\n' +
          I + '  <span class="arc-len">' + escT(a.len) + '</span>\n' +
          I + '</button>');
      });
      // 3 or 4 across, whichever leaves the fullest last row
      var n = d.roster.length, three = n % 4 !== 0 && (n % 3 === 0 || n % 3 > n % 4);
      var ops = [['attr', 'jerseys', 'class', 'jerseys' + (three ? ' three' : '')]];
      // What the big screen says before anyone clicks
      var up = d.roster.filter(function(j){ return !j.soon && j.vimeo; })[0], upName = up ? [up.tag, up.title].filter(Boolean).join(' ') : d.archive[0] ? d.archive[0].title : '';
      if(upName){
        var crawl = escT('NOW PLAYING ▸ ' + upName.toUpperCase() + ' ▸ STUDIO41 PROMOS ▸ GO EAGLES ▸');
        ops.push(['html', 'jumboLabel', escT(upName)], ['html', 'crawlA', crawl], ['html', 'crawlB', crawl]);
      }
      return {
        regions: {
          'promo-roster': roster,
          'promo-seasons': d.seasons.map(function(s, i){
            return S + '<button type="button" data-season="' + escA(s.id) + '" aria-pressed="' + (i === 0) + '">' + escT(s.label) + '</button>';
          }).concat([S + '<button type="button" data-season="all" aria-pressed="false">All</button>']).join('\n'),
          'promo-archive': out.join('\n')
        },
        ops: ops
      };
    },

    // The Live Streams page reads S41.data inside its own script.
    live: function(){ return { regions: {}, ops: [] }; }
  };

  /* ---------- talking to Supabase ---------- */
  var configured = /^https?:\/\/[\w.-]+/.test(CONFIG.url) && CONFIG.anonKey.indexOf('PASTE-') !== 0;
  function rest(path, opts){
    opts = opts || {};
    var headers = { apikey: CONFIG.anonKey };
    if(opts.token) headers.Authorization = 'Bearer ' + opts.token;   // the signed-in admin
    if(opts.body !== undefined) headers['Content-Type'] = 'application/json';
    Object.keys(opts.headers || {}).forEach(function(k){ headers[k] = opts.headers[k]; });
    return fetch(CONFIG.url.replace(/\/+$/, '') + path, { method: opts.method || 'GET', headers: headers, cache: 'no-store',
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined });
  }
  // All saved pages (or just some): resolves to { page: {data, updated_at} }
  function loadRows(pages){
    var q = '/rest/v1/' + CONFIG.table + '?select=page,data,updated_at' + (pages ? '&page=in.(' + pages.join(',') + ')' : '');
    return rest(q).then(function(r){ if(!r.ok) throw new Error('database ' + r.status); return r.json(); })
      .then(function(rows){ var out = {}; rows.forEach(function(row){ out[row.page] = row; }); return out; });
  }

  /* ---------- putting the data into this page ---------- */
  function markers(){
    var out = {}, it = document.createNodeIterator(document.body, NodeFilter.SHOW_COMMENT), n, m;
    while((n = it.nextNode())){
      m = /^\s*S41-ADMIN:([\w-]+):(START|END)/.exec(n.nodeValue);
      if(m){ out[m[1]] = out[m[1]] || {}; out[m[1]][m[2]] = n; }
    }
    return out;
  }
  function apply(page, data){
    var r = RENDER[page](JSON.parse(JSON.stringify(data))), mk = markers();
    Object.keys(r.regions).forEach(function(name){
      var m = mk[name]; if(!m || !m.START || !m.END) return;
      var n = m.START.nextSibling;
      while(n && n !== m.END){ var next = n.nextSibling; n.parentNode.removeChild(n); n = next; }
      var t = document.createElement('template'); t.innerHTML = '\n' + r.regions[name] + '\n';
      m.END.parentNode.insertBefore(t.content, m.END);
    });
    r.ops.forEach(function(op){
      if(op[0] === 'eps'){
        var p = document.querySelector('#' + op[1] + ' .p-rating');
        if(p) p.textContent = p.textContent.replace(/\d+\s*EPS?/, op[2] + (op[2] === 1 ? ' EP' : ' EPS'));
        return;
      }
      var el = document.getElementById(op[1]); if(!el) return;
      if(op[0] === 'html') el.innerHTML = op[2];
      else if(op[3] == null) el.removeAttribute(op[2]);
      else el.setAttribute(op[2], op[3]);
    });
  }

  var S41 = window.S41 = {
    config: CONFIG, configured: configured, render: RENDER, loadRows: loadRows, rest: rest,
    util: { escT: escT, escA: escA, bgStyle: bgStyle, vimeoPage: vimeoPage, ytIdFromEmbed: ytIdFromEmbed, autoCh: autoCh,
            seasonLabel: seasonLabel, syncHero: syncHero, HOME_DEFAULT_DESC: HOME_DEFAULT_DESC, KINDS: KINDS },
    data: null,
    // Page scripts run through this, so they start after the live videos are in place.
    ready: function(fn){ if(done) fn(); else queue.push(fn); }
  };

  var me = document.currentScript, page = me && me.getAttribute('data-page');
  var queue = [], done = !page;   // the admin page loads this file without data-page
  if(!page) return;

  function finish(){
    if(done) return; done = true;
    document.documentElement.classList.remove('s41-wait');
    queue.forEach(function(fn){ try{ fn(); }catch(e){ setTimeout(function(){ throw e; }); } });
    queue = [];
  }
  if(!configured || !window.fetch || !('content' in document.createElement('template'))){ done = true; return; }

  // Hide the video areas for a moment so the old list doesn't flash before the live one.
  var style = document.createElement('style');
  style.textContent = '.s41-wait main{opacity:0}main{transition:opacity .2s ease}';
  document.head.appendChild(style);
  document.documentElement.classList.add('s41-wait');

  var domReady = new Promise(function(res){ if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', res); else res(); });
  var timeout = new Promise(function(res){ setTimeout(res, CONFIG.waitMs); });
  var fetched = loadRows([page]).then(function(rows){ return rows[page] ? rows[page].data : null; }).catch(function(){ return null; });
  Promise.race([Promise.all([fetched, domReady]), timeout.then(function(){ return null; })]).then(function(res){
    return domReady.then(function(){
      if(done) return;
      var data = res && res[0];
      if(data){ try{ S41.data = data; apply(page, data); }catch(e){ S41.data = null; } }
      finish();
    });
  });
})();
