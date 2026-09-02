/**
 * HDRezka UI for Lampa
 * v6.0 — stable
 *
 * - Окремий пункт у налаштуваннях
 * - Лого АБО назва (без дубля)
 * - Без збоїв меню налаштувань
 * - Мінімум конфліктів, оверлей поверх картки
 */
(function () {
    'use strict';

    if (window.hdrezka_ui_v6) return;
    window.hdrezka_ui_v6 = true;

    var VERSION = '6.0';
    var STYLE_ID = 'hdrezka-ui-v6-style';
    var COMP = 'hdrezka_ui';
    var CACHE_TIME = 7 * 24 * 60 * 60 * 1000;
    var PREFIX = 'hru_';

    var Defaults = {
        hru_enabled: true,
        hru_lazy: true,
        hru_logo: true,
        hru_slogan: true,
        hru_title: true,
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

    /* ---------- cache ---------- */
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
            try {
                localStorage.setItem(PREFIX + k, JSON.stringify({ t: Date.now(), v: v }));
            } catch (e) {}
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
                    url: url,
                    timeout: ms,
                    success: function (d) { resolve(d); },
                    error: function () { resolve(null); }
                });
                return;
            }
            var done = false;
            var t = setTimeout(function () {
                if (!done) { done = true; resolve(null); }
            }, ms);
            try {
                fetch(url).then(function (r) { return r.json(); })
                    .then(function (d) {
                        if (!done) { done = true; clearTimeout(t); resolve(d); }
                    })
                    .catch(function () {
                        if (!done) { done = true; clearTimeout(t); resolve(null); }
                    });
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

    /* ---------- TMDB / ratings ---------- */
    function fetchExt(id, type) {
        var ck = 'ext_' + type + '_' + id;
        var c = Cache.get(ck);
        if (c) return Promise.resolve(c);

        var url = 'https://api.themoviedb.org/3/' + type + '/' + id +
            '?api_key=' + tmdbKey() +
            '&language=uk-UA&append_to_response=images,external_ids&include_image_language=uk,en,null';

        return httpGet(url, 4500).then(function (data) {
            if (!data || data.status_code) {
                Cache.set(ck, {});
                return {};
            }
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
                    'https://api.themoviedb.org/3/' + type + '/' + id +
                    '?api_key=' + tmdbKey() + '&language=en-US', 3000
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
        if (!jobs.length) {
            Cache.set(ck, res);
            return Promise.resolve(res);
        }
        return Promise.all(jobs).then(function () {
            Cache.set(ck, res);
            return res;
        });
    }

    /* ---------- DOM helpers ---------- */
    function wipe(el) {
        if (!el || !el.querySelectorAll) return;
        var list = el.querySelectorAll('.hru-layer, .hru-badge');
        for (var i = 0; i < list.length; i++) {
            try {
                if (list[i].parentNode) list[i].parentNode.removeChild(list[i]);
            } catch (e) {}
        }
    }

    function processed(html) {
        return !!(html && html.getAttribute && html.getAttribute('data-hru') === '1');
    }

    function mark(html) {
        try { if (html) html.setAttribute('data-hru', '1'); } catch (e) {}
    }

    /* ---------- build card layer ---------- */
    function build(card) {
        try {
            var html = card && card.html;
            if (!html || processed(html)) return;

            var view = html.querySelector('.card__view');
            if (!view) return;

            // lock immediately
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

            // badge once
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

            var token = id + '_' + Date.now();
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

    /**
     * Головне правило: ЛОГО АБО НАЗВА — ніколи разом.
     */
    function paint(view, html, data, ext, rates, title, year, token) {
        try {
            if (!view || !html) return;
            if (html._hruToken !== token) return;

            wipe(view);
            if (view.querySelector('.hru-layer')) return;

            var layer = document.createElement('div');
            layer.className = 'hru-layer';

            var hasLogo = false;

            // --- LOGO only (no title if logo ok) ---
            if (on('hru_logo') && ext.logo) {
                var wrap = document.createElement('div');
                wrap.className = 'hru-logo-wrap';
                var img = document.createElement('img');
                img.className = 'hru-logo';
                img.alt = '';
                img.loading = 'lazy';
                img.src = 'https://image.tmdb.org/t/p/' + (get('hru_logo_q') || 'w300') + ext.logo;

                img.onload = function () {
                    hasLogo = true;
                    // прибрати назву якщо вона якось з’явилась
                    var t = layer.querySelector('.hru-title');
                    if (t && t.parentNode) t.parentNode.removeChild(t);
                };
                img.onerror = function () {
                    try {
                        if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
                        // fallback: тільки назва
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
                hasLogo = true; // оптимістично; onerror прибере
            }

            // --- TITLE only if NO logo ---
            if (!hasLogo && on('hru_title') && title) {
                var te2 = document.createElement('div');
                te2.className = 'hru-title';
                te2.textContent = title;
                layer.appendChild(te2);
            }

            // slogan
            if (on('hru_slogan') && ext.tagline) {
                var sg = document.createElement('div');
                sg.className = 'hru-slogan';
                sg.textContent = ext.tagline;
                layer.appendChild(sg);
            }

            // ratings
            if (on('hru_ratings')) {
                var row = document.createElement('div');
                row.className = 'hru-rates';

                var map = {
                    tmdb: fmtRate(ext.vote_average || data.vote_average, false),
                    imdb: fmtRate(rates.imdb || data.imdb_rating, false),
                    rt: fmtRate(rates.rt, true),
                    mc: fmtRate(rates.mc, true)
                };

                ['tmdb', 'imdb', 'rt', 'mc'].forEach(function (k) {
                    if (!map[k]) return;
                    var s = document.createElement('span');
                    s.className = 'hru-rate';
                    s.textContent = k.toUpperCase() + ' ' + map[k];
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

    /* ---------- card hook ---------- */
    function hookCards() {
        try {
            if (!Lampa.Maker || typeof Lampa.Maker.map !== 'function') return;
            var M = Lampa.Maker.map('Card');
            if (!M || !M.Card || typeof M.Card.onVisible !== 'function') return;
            if (M.Card.__hru) return;
            M.Card.__hru = true;

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

    /* ---------- styles ---------- */
    function styles() {
        var old = document.getElementById(STYLE_ID);
        if (old && old.parentNode) old.parentNode.removeChild(old);

        var gap = (get('hru_gap') || '0.75') + 'em';

        var css = [
            'body.hru-on{background:#0a0a0a!important}',
            'body.hru-on .head{background:rgba(10,10,10,.96)!important;border-bottom:1px solid #2a2a2a}',
            'body.hru-on .head__action.focus,body.hru-on .head__action.hover{background:#e50914!important;color:#fff!important;border-radius:8px}',
            'body.hru-on .menu{background:#0d0d0d!important}',
            'body.hru-on .menu__item{border-radius:9px!important;margin:3px 8px}',
            'body.hru-on .menu__item.focus,body.hru-on .menu__item.hover{background:#e50914!important;color:#fff!important}',
            'body.hru-on .items-line:not(.vinyl-line) .items-cards,body.hru-on .items-line:not(.vinyl-line) .scroll__body{display:flex!important;flex-wrap:nowrap!important;gap:' + gap + '!important}',
            'body.hru-on .hru-card{position:relative!important;background:transparent!important;border:none!important;border-radius:12px!important;overflow:visible!important;flex:0 0 auto;transform:translateZ(0);transition:transform .2s ease;box-shadow:none!important}',
            'body.hru-on .hru-card.focus{transform:translateY(-6px) scale(1.04) translateZ(0);z-index:30}',
            'body.hru-on .hru-card.focus .card__view{box-shadow:0 0 0 3px #fff,0 12px 28px rgba(0,0,0,.55)!important}',
            'body.hru-on .hru-card .card__view{border-radius:12px!important;overflow:hidden!important;position:relative!important;background:#141414}',
            /* ховаємо ВСІ стандартні підписи Lampa на наших картках */
            'body.hru-on .hru-card .card__title,body.hru-on .hru-card .card__age,body.hru-on .hru-card .card__vote,body.hru-on .hru-card .card__type,body.hru-on .hru-card .card__details,body.hru-on .hru-card .card__promo{display:none!important;opacity:0!important;height:0!important;overflow:hidden!important;pointer-events:none!important}',
            /* шар поверх постера */
            '.hru-layer{position:absolute!important;left:0!important;right:0!important;bottom:0!important;top:auto!important;z-index:20!important;padding:30px 10px 10px!important;margin:0!important;background:linear-gradient(to top,rgba(0,0,0,.94) 0%,rgba(0,0,0,.55) 55%,transparent 100%)!important;display:flex!important;flex-direction:column!important;justify-content:flex-end!important;gap:5px!important;pointer-events:none!important;box-sizing:border-box!important}',
            '.hru-logo-wrap{display:flex!important;justify-content:center!important;width:100%!important;margin:0!important;padding:0!important}',
            '.hru-logo{display:block!important;max-width:75%!important;max-height:40px!important;width:auto!important;height:auto!important;object-fit:contain!important;filter:drop-shadow(0 2px 4px rgba(0,0,0,.75))}',
            '.hru-title{color:#fff!important;font-size:.9em!important;font-weight:650!important;line-height:1.25!important;margin:0!important;padding:0!important;display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important;overflow:hidden!important;text-shadow:0 1px 3px rgba(0,0,0,.85)}',
            '.hru-slogan{color:#ccc!important;font-size:.7em!important;font-style:italic!important;line-height:1.25!important;margin:0!important;display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important;overflow:hidden!important}',
            '.hru-rates{display:flex!important;flex-wrap:wrap!important;gap:5px!important;align-items:center!important;margin:0!important}',
            '.hru-rate{display:inline-flex!important;font-size:.72em!important;font-weight:700!important;color:#fff!important;background:rgba(0,0,0,.5)!important;padding:2px 6px!important;border-radius:5px!important;white-space:nowrap!important}',
            '.hru-badge{position:absolute!important;top:8px!important;left:8px!important;z-index:25!important;font-size:11px!important;font-weight:800!important;padding:3px 7px!important;border-radius:5px!important;color:#fff!important;text-transform:uppercase!important;pointer-events:none!important;box-shadow:0 2px 6px rgba(0,0,0,.5)!important}',
            '.hru-badge--new{background:linear-gradient(135deg,#00c853,#00e676)!important}',
            '.hru-badge--hd{background:linear-gradient(135deg,#1a73e8,#42a5f5)!important}',
            '.hru-badge--k4{background:linear-gradient(135deg,#e50914,#ff2a2a)!important}',
            'body.hru-on .items-line__title{font-weight:700!important;color:#fff!important;display:flex!important;align-items:center!important;gap:10px!important}',
            'body.hru-on .items-line__title::before{content:""!important;width:4px!important;height:1em!important;background:#e50914!important;border-radius:2px!important;flex-shrink:0!important}',
            'body.hru-on .full-start__button.focus,body.hru-on .full-start__button.hover{background:#e50914!important;color:#fff!important}',
            'body.hru-on .selectbox-item.focus,body.hru-on .selectbox-item.hover{background:#e50914!important;color:#fff!important}',
            'body.hru-on .search__input{border-bottom:2px solid #e50914!important}'
        ].join('');

        var st = document.createElement('style');
        st.id = STYLE_ID;
        st.textContent = css;
        document.head.appendChild(st);
    }

    /* ---------- settings (окремий пункт) ---------- */
    function addSettings() {
        try {
            if (!Lampa.SettingsApi) return;

            // обов’язково для окремого розділу
            try {
                Lampa.Template.add('settings_' + COMP, '<div></div>');
            } catch (e) {}

            try {
                Lampa.SettingsApi.addComponent({
                    component: COMP,
                    name: 'HDRezka UI',
                    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-10-5v6l10 5 10-5v-6l-10 5z"/></svg>'
                });
            } catch (e) {
                // якщо addComponent недоступний — параметри підуть у interface
            }

            var target = COMP;
            // перевірка: якщо компонент не з’явився, fallback
            try {
                if (!Lampa.Template.get || !Lampa.Template.get('settings_' + COMP)) {
                    target = 'interface';
                }
            } catch (e) {}

            var items = [
                { name: 'hru_enabled', type: 'trigger', def: true, field: { name: 'Увімкнути HDRezka UI', description: 'Головний перемикач' } },
                { name: 'hru_lazy', type: 'trigger', def: true, field: { name: 'Ліниве завантаження', description: 'Дані лише для видимих карток' } },
                { name: 'hru_logo', type: 'trigger', def: true, field: { name: 'Логотипи', description: 'Лого з TMDB (без дубля з назвою)' } },
                { name: 'hru_title', type: 'trigger', def: true, field: { name: 'Назва якщо немає лого', description: 'Показувати текст лише коли лого немає' } },
                { name: 'hru_slogan', type: 'trigger', def: true, field: { name: 'Слогани', description: 'Tagline' } },
                { name: 'hru_ratings', type: 'trigger', def: true, field: { name: 'Рейтинги', description: 'TMDB / IMDb / RT / MC' } },
                { name: 'hru_badges', type: 'trigger', def: true, field: { name: 'Бейджі NEW / HD / 4K', description: '' } },
                { name: 'hru_gap', type: 'input', def: '0.75', field: { name: 'Відступ між картками (em)', description: 'Наприклад 0.75' } },
                { name: 'hru_omdb', type: 'input', def: '', field: { name: 'OMDb API Key', description: 'omdbapi.com — IMDb/RT/MC' } },
                { name: 'hru_mdblist', type: 'input', def: '', field: { name: 'MDBList API Key', description: 'mdblist.com' } }
            ];

            items.forEach(function (it) {
                try {
                    Lampa.SettingsApi.addParam({
                        component: target,
                        param: { name: it.name, type: it.type, default: it.def },
                        field: it.field,
                        onChange: function () {
                            try {
                                if (it.name === 'hru_enabled') {
                                    if (on('hru_enabled')) document.body.classList.add('hru-on');
                                    else document.body.classList.remove('hru-on');
                                }
                                styles();
                            } catch (e) {}
                        }
                    });
                } catch (e) {}
            });
        } catch (e) {}
    }

    /* ---------- start ---------- */
    function start() {
        try {
            if (get('hru_enabled') === false || get('hru_enabled') === 'false') {
                console.log('[HDRezka UI] off');
                return;
            }
            document.body.classList.add('hru-on');
            styles();
            hookCards();
            addSettings();
            console.log('[HDRezka UI] v' + VERSION);
        } catch (e) {
            console.log('[HDRezka UI] start error', e);
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
