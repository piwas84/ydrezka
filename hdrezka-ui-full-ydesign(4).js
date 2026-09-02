/**
 * HDRezka UI for Lampa — v6.1 (Nova Skin compatible)
 *
 * - Окремі пункти в Налаштування → Інтерфейс (префікс «HDRezka UI»)
 * - Без addComponent — не ламає меню налаштувань
 * - Режим сумісності з Nova Skin: без дублів лого/назви
 * - Мінімум конфліктів
 */
(function () {
    'use strict';

    if (window.hdrezka_ui_v61) return;
    window.hdrezka_ui_v61 = true;

    var VERSION = '6.1';
    var STYLE_ID = 'hdrezka-ui-v61-style';
    var PREFIX = 'hru_';
    var CACHE_TIME = 7 * 24 * 60 * 60 * 1000;

    var Defaults = {
        hru_enabled: true,
        hru_compat_nova: true,   // авто-режим з Nova Skin
        hru_force_overlay: false, // примусово оверлеї навіть з Nova
        hru_lazy: true,
        hru_logo: true,
        hru_title: true,
        hru_slogan: true,
        hru_ratings: true,
        hru_badges: true,
        hru_gap: '0.75',
        hru_logo_q: 'w300',
        hru_omdb: '',
        hru_mdblist: ''
    };

    function get(key) {
        try {
            if (window.Lampa && Lampa.Storage) {
                var v = Lampa.Storage.get(key, Defaults[key]);
                if (v !== null && v !== undefined && String(v) !== 'undefined') return v;
            }
        } catch (e) {}
        return Defaults.hasOwnProperty(key) ? Defaults[key] : '';
    }

    function on(key) {
        var v = get(key);
        return v === true || v === 'true' || v === 1 || v === '1';
    }

    /* ---- detect Nova Skin / heavy skins ---- */
    function hasNovaSkin() {
        try {
            if (window.nova_skin || window.NovaSkin || window.nova_skin_ready) return true;
            if (window.nova_skin_premium || window.__nova_skin) return true;
            if (document.body && (
                document.body.classList.contains('nova') ||
                document.body.classList.contains('nova-skin') ||
                document.body.className.indexOf('nova') !== -1
            )) return true;
            // DOM markers
            if (document.querySelector('.nova-card, .nova_skin, [class*="nova-skin"], [class*="novaskin"]')) return true;
            // scripts
            var scripts = document.getElementsByTagName('script');
            for (var i = 0; i < scripts.length; i++) {
                var s = scripts[i].src || '';
                if (/nova_skin|novaskin|nova-skin/i.test(s)) return true;
            }
        } catch (e) {}
        return false;
    }

    function useOverlays() {
        if (!on('hru_enabled')) return false;
        if (on('hru_force_overlay')) return true;
        if (on('hru_compat_nova') && hasNovaSkin()) return false; // тільки тема, без оверлеїв
        return true;
    }

    /* ---- cache / network ---- */
    var Cache = {
        get: function (k) {
            try {
                var raw = localStorage.getItem(PREFIX + k);
                if (!raw) return null;
                var o = JSON.parse(raw);
                if (Date.now() - o.t > CACHE_TIME) {
                    localStorage.removeItem(PREFIX + k);
                    return null;
                }
                return o.v;
            } catch (e) { return null; }
        },
        set: function (k, v) {
            try { localStorage.setItem(PREFIX + k, JSON.stringify({ t: Date.now(), v: v })); } catch (e) {}
        }
    };

    function tmdbKey() {
        try {
            if (Lampa.TMDB && typeof Lampa.TMDB.key === 'function') return Lampa.TMDB.key();
        } catch (e) {}
        return '4ef0d7355d9ffb5151e987764708ce96';
    }

    function httpGet(url, ms) {
        return new Promise(function (resolve) {
            ms = ms || 4000;
            if (window.$ && $.ajax) {
                $.ajax({
                    url: url, timeout: ms,
                    success: function (d) { resolve(d); },
                    error: function () { resolve(null); }
                });
                return;
            }
            var done = false;
            var t = setTimeout(function () { if (!done) { done = true; resolve(null); } }, ms);
            try {
                fetch(url).then(function (r) { return r.json(); })
                    .then(function (d) { if (!done) { done = true; clearTimeout(t); resolve(d); } })
                    .catch(function () { if (!done) { done = true; clearTimeout(t); resolve(null); } });
            } catch (e) {
                if (!done) { done = true; clearTimeout(t); resolve(null); }
            }
        });
    }

    function yearOf(d) {
        if (!d) return 0;
        if (d.release_date) return parseInt(String(d.release_date).slice(0, 4), 10) || 0;
        if (d.first_air_date) return parseInt(String(d.first_air_date).slice(0, 4), 10) || 0;
        if (d.year) return parseInt(d.year, 10) || 0;
        return 0;
    }

    function mediaType(d) {
        if (!d) return 'movie';
        if (d.seasons || d.first_air_date || (d.name && !d.title)) return 'tv';
        return 'movie';
    }

    function qualityOf(d, title) {
        var s = ((title || '') + ' ' + ((d && d.original_title) || '') + ' ' +
            ((d && d.quality) || '') + ' ' + ((d && d.video) || '')).toLowerCase();
        if (/4k|2160|uhd/.test(s)) return '4K';
        if (/1080|full\s*hd|\bhd\b|720/.test(s)) return 'HD';
        return null;
    }

    function fmtRate(v, is100) {
        if (v === null || v === undefined || v === '' || v === 'N/A') return null;
        var n = parseFloat(String(v).replace('%', ''));
        if (isNaN(n) || n <= 0) return null;
        if (is100 || n > 10) n = n / 10;
        return (Math.round(n * 10) / 10).toFixed(1);
    }

    function fetchExt(id, type) {
        var ck = 'ext_' + type + '_' + id;
        var c = Cache.get(ck);
        if (c) return Promise.resolve(c);

        var url = 'https://api.themoviedb.org/3/' + type + '/' + id +
            '?api_key=' + tmdbKey() +
            '&language=uk-UA&append_to_response=images,external_ids&include_image_language=uk,en,null';

        return httpGet(url, 4500).then(function (data) {
            if (!data || data.status_code) { Cache.set(ck, {}); return {}; }
            var out = {
                tagline: data.tagline || '',
                vote_average: data.vote_average,
                imdb_id: (data.external_ids && data.external_ids.imdb_id) || null,
                logo: null
            };
            var logos = (data.images && data.images.logos) || [];
            if (logos.length) {
                var uk = logos.filter(function (l) { return l.iso_639_1 === 'uk'; });
                var en = logos.filter(function (l) { return l.iso_639_1 === 'en'; });
                var L = uk[0] || en[0] || logos[0];
                if (L && L.file_path) out.logo = L.file_path;
            }
            if (!out.tagline) {
                return httpGet(
                    'https://api.themoviedb.org/3/' + type + '/' + id + '?api_key=' + tmdbKey() + '&language=en-US', 3000
                ).then(function (en) {
                    if (en && en.tagline) out.tagline = en.tagline;
                    Cache.set(ck, out);
                    return out;
                });
            }
            Cache.set(ck, out);
            return out;
        });
    }

    function fetchRates(imdbId) {
        if (!imdbId) return Promise.resolve({});
        var ck = 'rate_' + imdbId;
        var c = Cache.get(ck);
        if (c) return Promise.resolve(c);

        var res = {};
        var omdb = String(get('hru_omdb') || '').trim();
        var mdb = String(get('hru_mdblist') || '').trim();
        var jobs = [];

        if (omdb) {
            jobs.push(httpGet('https://www.omdbapi.com/?apikey=' + encodeURIComponent(omdb) + '&i=' + encodeURIComponent(imdbId), 3500)
                .then(function (o) {
                    if (!o || o.Response === 'False') return;
                    if (o.imdbRating && o.imdbRating !== 'N/A') res.imdb = o.imdbRating;
                    if (o.Metascore && o.Metascore !== 'N/A') res.mc = o.Metascore;
                    var rt = (o.Ratings || []).filter(function (r) { return r.Source === 'Rotten Tomatoes'; });
                    if (rt[0] && rt[0].Value) res.rt = String(rt[0].Value).replace('%', '');
                }));
        }
        if (mdb) {
            jobs.push(httpGet('https://mdblist.com/api/?apikey=' + encodeURIComponent(mdb) + '&i=' + encodeURIComponent(imdbId), 3500)
                .then(function (m) {
                    if (!m || !m.ratings) return;
                    m.ratings.forEach(function (r) {
                        if (r.source === 'imdb' && !res.imdb) res.imdb = r.value;
                        if (r.source === 'tomatoes' && !res.rt) res.rt = r.value;
                        if (r.source === 'metacritic' && !res.mc) res.mc = r.value;
                    });
                }));
        }
        if (!jobs.length) { Cache.set(ck, res); return Promise.resolve(res); }
        return Promise.all(jobs).then(function () { Cache.set(ck, res); return res; });
    }

    /* ---- card layer ---- */
    function wipe(el) {
        if (!el || !el.querySelectorAll) return;
        var list = el.querySelectorAll('.hru-layer, .hru-badge');
        for (var i = 0; i < list.length; i++) {
            try { if (list[i].parentNode) list[i].parentNode.removeChild(list[i]); } catch (e) {}
        }
    }

    function processed(html) {
        return !!(html && html.getAttribute && html.getAttribute('data-hru') === '1');
    }

    function mark(html) {
        try { if (html) html.setAttribute('data-hru', '1'); } catch (e) {}
    }

    function alreadyHasForeignOverlay(view) {
        if (!view) return false;
        // якщо Nova / інший скін уже намалював свій шар — не чіпаємо
        try {
            if (view.querySelector('.nova-layer, .nova-overlay, .nova-card__info, .ydesign-card, .ydesign-overlay, [class*="nova"][class*="logo"], [class*="nova"][class*="title"]')) return true;
            // багато сторонніх елементів у view
            var kids = view.children;
            if (kids && kids.length > 4) return true;
        } catch (e) {}
        return false;
    }

    function build(card) {
        try {
            if (!useOverlays()) return;

            var html = card && card.html;
            if (!html || processed(html)) return;

            var view = html.querySelector('.card__view');
            if (!view) return;

            if (alreadyHasForeignOverlay(view)) {
                mark(html);
                return;
            }

            mark(html);
            html.classList.add('hru-card');
            wipe(view);

            var data = card.data || {};
            var id = data.id;
            if (!id) return;

            var type = mediaType(data);
            var title = data.title || data.name || '';
            var year = yearOf(data);
            var q = qualityOf(data, title);
            var nowY = new Date().getFullYear();

            if (on('hru_badges') && !view.querySelector('.hru-badge')) {
                var txt = null, cls = null;
                if (year >= nowY - 1) { txt = 'NEW'; cls = 'new'; }
                else if (q === '4K') { txt = '4K'; cls = 'k4'; }
                else if (q === 'HD' || year >= 2014) { txt = 'HD'; cls = 'hd'; }
                if (txt) {
                    var b = document.createElement('div');
                    b.className = 'hru-badge hru-badge--' + cls;
                    b.textContent = txt;
                    view.appendChild(b);
                }
            }

            var token = String(id) + '_' + Date.now();
            html._hruToken = token;

            fetchExt(id, type).then(function (ext) {
                if (html._hruToken !== token) return;
                ext = ext || {};
                return fetchRates(ext.imdb_id || data.imdb_id || null).then(function (rates) {
                    if (html._hruToken !== token) return;
                    paint(view, html, data, ext, rates || {}, title, year, token);
                });
            }).catch(function () {
                if (html._hruToken !== token) return;
                paint(view, html, data, {}, {}, title, year, token);
            });
        } catch (e) {}
    }

    function paint(view, html, data, ext, rates, title, year, token) {
        try {
            if (!view || !html) return;
            if (html._hruToken !== token) return;
            if (alreadyHasForeignOverlay(view)) return;

            wipe(view);
            if (view.querySelector('.hru-layer')) return;

            var layer = document.createElement('div');
            layer.className = 'hru-layer';

            var logoOk = false;

            // ЛОГО — без назви
            if (on('hru_logo') && ext.logo) {
                var wrap = document.createElement('div');
                wrap.className = 'hru-logo-wrap';
                var img = document.createElement('img');
                img.className = 'hru-logo';
                img.alt = '';
                img.loading = 'lazy';
                img.src = 'https://image.tmdb.org/t/p/' + (get('hru_logo_q') || 'w300') + ext.logo;

                img.onload = function () {
                    logoOk = true;
                    var t = layer.querySelector('.hru-title');
                    if (t && t.parentNode) t.parentNode.removeChild(t);
                };
                img.onerror = function () {
                    try {
                        if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
                        if (on('hru_title') && title && !layer.querySelector('.hru-title')) {
                            var te = document.createElement('div');
                            te.className = 'hru-title';
                            te.textContent = title;
                            layer.insertBefore(te, layer.firstChild);
                        }
                    } catch (e) {}
                };

                wrap.appendChild(img);
                layer.appendChild(wrap);
                logoOk = true;
            }

            // НАЗВА — тільки якщо немає лого
            if (!logoOk && on('hru_title') && title) {
                var te2 = document.createElement('div');
                te2.className = 'hru-title';
                te2.textContent = title;
                layer.appendChild(te2);
            }

            if (on('hru_slogan') && ext.tagline) {
                var sg = document.createElement('div');
                sg.className = 'hru-slogan';
                sg.textContent = ext.tagline;
                layer.appendChild(sg);
            }

            if (on('hru_ratings')) {
                var row = document.createElement('div');
                row.className = 'hru-rates';
                var map = {
                    TMDB: fmtRate(ext.vote_average || data.vote_average, false),
                    IMDb: fmtRate(rates.imdb || data.imdb_rating, false),
                    RT: fmtRate(rates.rt, true),
                    MC: fmtRate(rates.mc, true)
                };
                Object.keys(map).forEach(function (k) {
                    if (!map[k]) return;
                    var s = document.createElement('span');
                    s.className = 'hru-rate';
                    s.textContent = k + ' ' + map[k];
                    row.appendChild(s);
                });
                if (year > 0) {
                    var ys = document.createElement('span');
                    ys.className = 'hru-rate';
                    ys.textContent = String(year);
                    row.appendChild(ys);
                }
                if (row.childNodes.length) layer.appendChild(row);
            }

            if (html._hruToken !== token) return;
            if (view.querySelector('.hru-layer')) return;
            if (layer.childNodes.length) view.appendChild(layer);
        } catch (e) {}
    }

    function hookCards() {
        try {
            if (!useOverlays()) return;
            if (!Lampa.Maker || typeof Lampa.Maker.map !== 'function') return;
            var M = Lampa.Maker.map('Card');
            if (!M || !M.Card || typeof M.Card.onVisible !== 'function') return;
            if (M.Card.__hru61) return;
            M.Card.__hru61 = true;

            var prev = M.Card.onVisible;
            M.Card.onVisible = function () {
                try { prev.apply(this, arguments); } catch (e) {}
                try {
                    var self = this;
                    var html = this.html;
                    if (!html || processed(html)) return;

                    if (on('hru_lazy') && typeof IntersectionObserver !== 'undefined') {
                        if (!hookCards._obs) {
                            hookCards._obs = new IntersectionObserver(function (entries) {
                                entries.forEach(function (en) {
                                    if (!en.isIntersecting) return;
                                    var el = en.target;
                                    hookCards._obs.unobserve(el);
                                    if (el._hruFn) {
                                        var fn = el._hruFn;
                                        el._hruFn = null;
                                        try { fn(); } catch (e) {}
                                    }
                                });
                            }, { rootMargin: '140px', threshold: 0.01 });
                        }
                        html._hruFn = function () { build(self); };
                        hookCards._obs.observe(html);
                    } else {
                        build(self);
                    }
                } catch (e) {}
            };
        } catch (e) {}
    }

    /* ---- styles (тема завжди; оверлеї — умовно) ---- */
    function styles() {
        var old = document.getElementById(STYLE_ID);
        if (old && old.parentNode) old.parentNode.removeChild(old);

        var gap = (get('hru_gap') || '0.75') + 'em';
        var overlays = useOverlays();

        var css = [
            'body.hru-on{background:#0a0a0a!important}',
            'body.hru-on .head{background:rgba(10,10,10,.96)!important;border-bottom:1px solid #2a2a2a}',
            'body.hru-on .head__action.focus,body.hru-on .head__action.hover{background:#e50914!important;color:#fff!important;border-radius:8px}',
            'body.hru-on .menu{background:#0d0d0d!important}',
            'body.hru-on .menu__item{border-radius:9px!important;margin:3px 8px}',
            'body.hru-on .menu__item.focus,body.hru-on .menu__item.hover{background:#e50914!important;color:#fff!important}',
            'body.hru-on .full-start__button.focus,body.hru-on .full-start__button.hover{background:#e50914!important;color:#fff!important}',
            'body.hru-on .selectbox-item.focus,body.hru-on .selectbox-item.hover{background:#e50914!important;color:#fff!important}',
            'body.hru-on .search__input{border-bottom:2px solid #e50914!important}',
            'body.hru-on .items-line__title{font-weight:700!important;color:#fff!important}',
            'body.hru-on .items-line__title::before{content:"";display:inline-block;width:4px;height:1em;background:#e50914;border-radius:2px;margin-right:8px;vertical-align:middle}'
        ];

        if (overlays) {
            css = css.concat([
                'body.hru-on .items-line:not(.vinyl-line) .items-cards,body.hru-on .items-line:not(.vinyl-line) .scroll__body{display:flex!important;flex-wrap:nowrap!important;gap:' + gap + '!important}',
                'body.hru-on .hru-card{position:relative!important;background:transparent!important;border:none!important;border-radius:12px!important;overflow:visible!important;flex:0 0 auto;transform:translateZ(0);transition:transform .2s ease;box-shadow:none!important}',
                'body.hru-on .hru-card.focus{transform:translateY(-6px) scale(1.04) translateZ(0);z-index:30}',
                'body.hru-on .hru-card.focus .card__view{box-shadow:0 0 0 3px #fff,0 12px 28px rgba(0,0,0,.55)!important}',
                'body.hru-on .hru-card .card__view{border-radius:12px!important;overflow:hidden!important;position:relative!important;background:#141414}',
                'body.hru-on .hru-card .card__title,body.hru-on .hru-card .card__age,body.hru-on .hru-card .card__vote,body.hru-on .hru-card .card__type,body.hru-on .hru-card .card__details,body.hru-on .hru-card .card__promo{display:none!important}',
                '.hru-layer{position:absolute!important;left:0!important;right:0!important;bottom:0!important;z-index:20!important;padding:30px 10px 10px!important;background:linear-gradient(to top,rgba(0,0,0,.94) 0%,rgba(0,0,0,.55) 55%,transparent 100%)!important;display:flex!important;flex-direction:column!important;gap:5px!important;pointer-events:none!important}',
                '.hru-logo-wrap{display:flex!important;justify-content:center!important;width:100%!important}',
                '.hru-logo{display:block!important;max-width:75%!important;max-height:40px!important;object-fit:contain!important;filter:drop-shadow(0 2px 4px rgba(0,0,0,.75))}',
                '.hru-title{color:#fff!important;font-size:.9em!important;font-weight:650!important;line-height:1.25!important;display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important;overflow:hidden!important}',
                '.hru-slogan{color:#ccc!important;font-size:.7em!important;font-style:italic!important;display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important;overflow:hidden!important}',
                '.hru-rates{display:flex!important;flex-wrap:wrap!important;gap:5px!important}',
                '.hru-rate{font-size:.72em!important;font-weight:700!important;color:#fff!important;background:rgba(0,0,0,.5)!important;padding:2px 6px!important;border-radius:5px!important}',
                '.hru-badge{position:absolute!important;top:8px!important;left:8px!important;z-index:25!important;font-size:11px!important;font-weight:800!important;padding:3px 7px!important;border-radius:5px!important;color:#fff!important;text-transform:uppercase!important;pointer-events:none!important}',
                '.hru-badge--new{background:linear-gradient(135deg,#00c853,#00e676)!important}',
                '.hru-badge--hd{background:linear-gradient(135deg,#1a73e8,#42a5f5)!important}',
                '.hru-badge--k4{background:linear-gradient(135deg,#e50914,#ff2a2a)!important}'
            ]);
        }

        var st = document.createElement('style');
        st.id = STYLE_ID;
        st.textContent = css.join('');
        document.head.appendChild(st);
    }

    /* ---- settings: ТІЛЬКИ interface, без addComponent ---- */
    function addSettings() {
        try {
            if (!Lampa.SettingsApi || typeof Lampa.SettingsApi.addParam !== 'function') return;
            if (window.__hru_settings_added) return;
            window.__hru_settings_added = true;

            var items = [
                { name: 'hru_enabled', type: 'trigger', def: true, field: { name: 'HDRezka UI — увімкнути', description: 'Тема + (опційно) оверлеї карток' } },
                { name: 'hru_compat_nova', type: 'trigger', def: true, field: { name: 'HDRezka UI — сумісність з Nova Skin', description: 'Увімкніть, якщо стоїть Nova Skin (без дублів лого/назви)' } },
                { name: 'hru_force_overlay', type: 'trigger', def: false, field: { name: 'HDRezka UI — примусові оверлеї', description: 'Лого/рейтинги навіть з Nova Skin (можуть дублюватись)' } },
                { name: 'hru_lazy', type: 'trigger', def: true, field: { name: 'HDRezka UI — ліниве завантаження', description: '' } },
                { name: 'hru_logo', type: 'trigger', def: true, field: { name: 'HDRezka UI — логотипи', description: 'Без дубля з назвою' } },
                { name: 'hru_title', type: 'trigger', def: true, field: { name: 'HDRezka UI — назва без лого', description: '' } },
                { name: 'hru_slogan', type: 'trigger', def: true, field: { name: 'HDRezka UI — слогани', description: '' } },
                { name: 'hru_ratings', type: 'trigger', def: true, field: { name: 'HDRezka UI — рейтинги', description: '' } },
                { name: 'hru_badges', type: 'trigger', def: true, field: { name: 'HDRezka UI — бейджі NEW/HD/4K', description: '' } },
                { name: 'hru_gap', type: 'input', def: '0.75', field: { name: 'HDRezka UI — відступ карток (em)', description: '0.75' } },
                { name: 'hru_omdb', type: 'input', def: '', field: { name: 'HDRezka UI — OMDb API Key', description: 'omdbapi.com' } },
                { name: 'hru_mdblist', type: 'input', def: '', field: { name: 'HDRezka UI — MDBList API Key', description: 'mdblist.com' } }
            ];

            items.forEach(function (it) {
                try {
                    Lampa.SettingsApi.addParam({
                        component: 'interface',
                        param: { name: it.name, type: it.type, default: it.def },
                        field: it.field,
                        onChange: function () {
                            try {
                                if (on('hru_enabled')) document.body.classList.add('hru-on');
                                else document.body.classList.remove('hru-on');
                                styles();
                            } catch (e) {}
                        }
                    });
                } catch (e) {}
            });
        } catch (e) {}
    }

    function start() {
        try {
            if (get('hru_enabled') === false || get('hru_enabled') === 'false') {
                console.log('[HDRezka UI] off');
                return;
            }
            document.body.classList.add('hru-on');
            styles();
            // Nova може підвантажитись пізніше — перевіряємо ще раз
            setTimeout(function () {
                try {
                    styles();
                    if (useOverlays()) hookCards();
                } catch (e) {}
            }, 800);
            hookCards();
            addSettings();
            console.log('[HDRezka UI] v' + VERSION + (hasNovaSkin() ? ' | Nova Skin detected → compat mode' : ''));
        } catch (e) {
            console.log('[HDRezka UI] start', e);
        }
    }

    if (window.appready) start();
    else if (window.Lampa && Lampa.Listener) {
        Lampa.Listener.follow('app', function (e) {
            if (e && e.type === 'ready') start();
        });
    } else {
        setTimeout(function () { if (window.Lampa) start(); }, 1200);
    }
})();
