/**
 * HDRezka × YDesign Full for Lampa
 * Версія: 5.0
 *
 * Повний гібрид:
 * - Стиль HDRezka (темна тема, червоний акцент)
 * - Сітка + оверлей карток як YDesign
 * - Логотипи студій (TMDB logos)
 * - Слогани / tagline
 * - Рейтинги: TMDB, IMDb, RT, Metacritic (OMDb), MDBList
 * - Налаштування в меню Lampa
 * - Кеш + Lazy (IntersectionObserver)
 * - GPU-оптимізації
 */

(function () {
    'use strict';

    if (window.hdrezka_ydesign_full) return;
    window.hdrezka_ydesign_full = true;

    var VERSION = '5.0';
    var STYLE_ID = 'hdrezka-ydesign-full-style';
    var CACHE_PREFIX = 'hdy_';
    var CACHE_TIME = 7 * 24 * 60 * 60 * 1000; // 7 днів

    /* ===================== DEFAULT SETTINGS ===================== */
    var DefaultSettings = {
        hdy_enabled: true,
        hdy_lazy_load: true,
        hdy_card_gap: '0.75',
        hdy_show_logo: true,
        hdy_show_slogan: true,
        hdy_show_title: true,
        hdy_show_ratings: true,
        hdy_show_badges: true,
        hdy_logo_quality: 'w300',
        hdy_slogan_lang: 'uk_en',
        hdy_ratings_order: 'tmdb,imdb,rt,mc',
        hdy_new_years: '1',
        hdy_min_year_hd: '2014',
        hdy_omdb_key: '',
        hdy_mdblist_key: '',
        hdy_scale_focus: '1.04'
    };

    function getSet(key) {
        try {
            if (window.Lampa && Lampa.Storage) {
                var val = Lampa.Storage.get(key);
                if (val !== null && val !== undefined && val !== '' && val !== 'undefined') return val;
            }
        } catch (e) {}
        return DefaultSettings.hasOwnProperty(key) ? DefaultSettings[key] : '';
    }

    function setSet(key, val) {
        try {
            if (window.Lampa && Lampa.Storage) Lampa.Storage.set(key, val);
        } catch (e) {}
    }

    /* ===================== ICONS ===================== */
    var rateIcons = {
        tmdb: 'https://upload.wikimedia.org/wikipedia/commons/8/89/Tmdb.new.logo.svg',
        imdb: 'https://upload.wikimedia.org/wikipedia/commons/5/53/IMDB_-_SuperTinyIcons.svg',
        rt: 'https://upload.wikimedia.org/wikipedia/commons/5/5b/Rotten_Tomatoes.svg',
        mc: 'https://yarikrazor-star.github.io/lmp/mc.svg'
    };

    /* ===================== CACHE ===================== */
    var ApiCache = {
        get: function (key) {
            try {
                var raw = localStorage.getItem(CACHE_PREFIX + key);
                if (!raw) return null;
                var obj = JSON.parse(raw);
                if (Date.now() - obj.t > CACHE_TIME) {
                    localStorage.removeItem(CACHE_PREFIX + key);
                    return null;
                }
                return obj.v;
            } catch (e) { return null; }
        },
        set: function (key, val) {
            try {
                localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ t: Date.now(), v: val }));
            } catch (e) {}
        }
    };

    /* ===================== TMDB KEY ===================== */
    function tmdbKey() {
        try {
            if (window.Lampa && Lampa.TMDB && Lampa.TMDB.key) return Lampa.TMDB.key();
        } catch (e) {}
        return '4ef0d7355d9ffb5151e987764708ce96';
    }

    /* ===================== NETWORK ===================== */
    function ajaxGet(url, timeout) {
        return new Promise(function (resolve) {
            if (!window.$ || !$.ajax) {
                // fallback fetch
                var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
                var timer = setTimeout(function () {
                    if (ctrl) ctrl.abort();
                    resolve(null);
                }, timeout || 4000);

                fetch(url, ctrl ? { signal: ctrl.signal } : {})
                    .then(function (r) { return r.json(); })
                    .then(function (data) { clearTimeout(timer); resolve(data); })
                    .catch(function () { clearTimeout(timer); resolve(null); });
                return;
            }

            $.ajax({
                url: url,
                timeout: timeout || 4000,
                success: function (data) { resolve(data); },
                error: function () { resolve(null); }
            });
        });
    }

    /* ===================== FETCH EXTENDED DATA ===================== */
    function fetchTmdbExtended(id, type) {
        var cacheKey = 'tmdb_ext_' + type + '_' + id;
        var cached = ApiCache.get(cacheKey);
        if (cached) return Promise.resolve(cached);

        var lang = 'uk-UA';
        var url = 'https://api.themoviedb.org/3/' + type + '/' + id +
            '?api_key=' + tmdbKey() +
            '&language=' + lang +
            '&append_to_response=images,external_ids' +
            '&include_image_language=uk,en,null';

        return ajaxGet(url, 4500).then(function (data) {
            if (!data || data.success === false) {
                ApiCache.set(cacheKey, null);
                return null;
            }

            var result = {
                tagline: data.tagline || '',
                vote_average: data.vote_average,
                imdb_id: (data.external_ids && data.external_ids.imdb_id) || null,
                logo: null,
                logo_lang: null
            };

            // Logo priority: uk → en → any
            var logos = (data.images && data.images.logos) || [];
            if (logos.length) {
                var uk = logos.filter(function (l) { return l.iso_639_1 === 'uk'; });
                var en = logos.filter(function (l) { return l.iso_639_1 === 'en'; });
                var logo = uk[0] || en[0] || logos[0];
                if (logo) {
                    result.logo = logo.file_path;
                    result.logo_lang = logo.iso_639_1;
                }
            }

            // English tagline fallback
            if (!result.tagline) {
                return ajaxGet('https://api.themoviedb.org/3/' + type + '/' + id + '?api_key=' + tmdbKey() + '&language=en-US', 3000)
                    .then(function (enData) {
                        if (enData && enData.tagline) result.tagline = enData.tagline;
                        ApiCache.set(cacheKey, result);
                        return result;
                    });
            }

            ApiCache.set(cacheKey, result);
            return result;
        });
    }

    function fetchExternalRatings(imdbId) {
        if (!imdbId) return Promise.resolve({});

        var cacheKey = 'ext_rates_' + imdbId;
        var cached = ApiCache.get(cacheKey);
        if (cached) return Promise.resolve(cached);

        var results = {};
        var omdbKey = String(getSet('hdy_omdb_key') || '').trim();
        var mdblistKey = String(getSet('hdy_mdblist_key') || '').trim();
        var tasks = [];

        if (omdbKey) {
            tasks.push(
                ajaxGet('https://www.omdbapi.com/?apikey=' + omdbKey + '&i=' + imdbId, 3500).then(function (omdb) {
                    if (!omdb || omdb.Response === 'False') return;
                    if (omdb.imdbRating && omdb.imdbRating !== 'N/A') results.imdb = omdb.imdbRating;
                    if (omdb.Metascore && omdb.Metascore !== 'N/A') results.mc = omdb.Metascore;
                    var rt = (omdb.Ratings || []).filter(function (r) { return r.Source === 'Rotten Tomatoes'; });
                    if (rt.length && rt[0].Value) results.rt = rt[0].Value.replace('%', '');
                })
            );
        }

        if (mdblistKey) {
            tasks.push(
                ajaxGet('https://mdblist.com/api/?apikey=' + mdblistKey + '&i=' + imdbId, 3500).then(function (mdb) {
                    if (!mdb || !mdb.ratings) return;
                    (mdb.ratings || []).forEach(function (r) {
                        if (r.source === 'imdb' && !results.imdb) results.imdb = r.value;
                        if (r.source === 'tomatoes' && !results.rt) results.rt = r.value;
                        if (r.source === 'metacritic' && !results.mc) results.mc = r.value;
                        if (r.source === 'mdblist') results.mdblist = r.value;
                    });
                })
            );
        }

        if (!tasks.length) {
            ApiCache.set(cacheKey, results);
            return Promise.resolve(results);
        }

        return Promise.all(tasks).then(function () {
            ApiCache.set(cacheKey, results);
            return results;
        });
    }

    /* ===================== UTILS ===================== */
    function getYear(data) {
        if (!data) return 0;
        if (data.release_date) return parseInt(data.release_date.slice(0, 4), 10) || 0;
        if (data.first_air_date) return parseInt(data.first_air_date.slice(0, 4), 10) || 0;
        if (data.year) return parseInt(data.year, 10) || 0;
        return 0;
    }

    function detectQuality(data, title) {
        var full = ((title || '') + ' ' + ((data && data.original_title) || '') + ' ' +
            ((data && data.quality) || '') + ' ' + ((data && data.video) || '')).toLowerCase();
        if (/4k|2160|uhd|ultra\s*hd/.test(full)) return '4K';
        if (/1080|full\s*hd|\bhd\b|720p/.test(full)) return 'HD';
        return null;
    }

    function formatRate(val, is100) {
        if (val === null || val === undefined || val === '' || val === 'N/A') return null;
        var n = parseFloat(String(val).replace('%', ''));
        if (isNaN(n) || n <= 0) return null;
        if (is100 || n > 10) n = n / 10;
        return (Math.round(n * 10) / 10).toFixed(1);
    }

    function mediaType(data) {
        if (!data) return 'movie';
        if (data.seasons || data.first_air_date || data.name) return 'tv';
        return 'movie';
    }

    /* ===================== LAZY LOADER ===================== */
    var LazyLoader = {
        observer: null,
        init: function () {
            if (this.observer || typeof IntersectionObserver === 'undefined') return;
            var self = this;
            this.observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        var el = entry.target;
                        if (el._hdyQueue) {
                            el._hdyQueue();
                            delete el._hdyQueue;
                        }
                        self.observer.unobserve(el);
                    }
                });
            }, { rootMargin: '160px', threshold: 0.01 });
        },
        add: function (el, fn) {
            if (getSet('hdy_lazy_load') !== true && getSet('hdy_lazy_load') !== 'true') {
                fn();
                return;
            }
            if (typeof IntersectionObserver === 'undefined') {
                fn();
                return;
            }
            if (!this.observer) this.init();
            el._hdyQueue = fn;
            this.observer.observe(el);
        }
    };

    /* ===================== BUILD CARD ===================== */
    function buildCard(cardInstance) {
        var html = cardInstance.html;
        if (!html || html.querySelector('.hdy-overlay')) return;

        var view = html.querySelector('.card__view');
        if (!view) return;

        var data = cardInstance.data || {};
        var id = data.id;
        if (!id) return;

        var type = mediaType(data);
        var title = data.title || data.name || '';
        var year = getYear(data);
        var quality = detectQuality(data, title);
        var currentYear = new Date().getFullYear();

        html.classList.add('hdy-card');

        // Badge
        if (getSet('hdy_show_badges') === true || getSet('hdy_show_badges') === 'true') {
            if (!view.querySelector('.card__badge-hdrezka')) {
                var newYears = parseInt(getSet('hdy_new_years'), 10) || 1;
                var minHD = parseInt(getSet('hdy_min_year_hd'), 10) || 2014;
                var badgeText = null, badgeType = null;

                if (year >= currentYear - newYears) {
                    badgeText = 'NEW'; badgeType = 'new';
                } else if (quality === '4K') {
                    badgeText = '4K'; badgeType = '4k';
                } else if (quality === 'HD' || year >= minHD) {
                    badgeText = 'HD'; badgeType = 'hd';
                }

                if (badgeText) {
                    var b = document.createElement('div');
                    b.className = 'card__badge-hdrezka card__badge-hdrezka--' + badgeType;
                    b.textContent = badgeText;
                    view.appendChild(b);
                }
            }
        }

        // Extended data
        fetchTmdbExtended(id, type).then(function (ext) {
            if (!ext) ext = {};

            var imdbId = ext.imdb_id || data.imdb_id || null;

            return fetchExternalRatings(imdbId).then(function (extRates) {
                renderOverlay(view, data, ext, extRates, title, year);
            });
        }).catch(function () {
            renderOverlay(view, data, {}, {}, title, year);
        });
    }

    function renderOverlay(view, data, ext, extRates, title, year) {
        if (view.querySelector('.hdy-overlay')) return;

        var overlay = document.createElement('div');
        overlay.className = 'hdy-overlay';

        // Logo
        if ((getSet('hdy_show_logo') === true || getSet('hdy_show_logo') === 'true') && ext.logo) {
            var logoWrap = document.createElement('div');
            logoWrap.className = 'hdy-logo-wrap';
            var logoImg = document.createElement('img');
            logoImg.className = 'hdy-logo';
            logoImg.src = 'https://image.tmdb.org/t/p/' + (getSet('hdy_logo_quality') || 'w300') + ext.logo;
            logoImg.alt = title;
            logoImg.loading = 'lazy';
            logoWrap.appendChild(logoImg);
            overlay.appendChild(logoWrap);
        } else if (getSet('hdy_show_title') === true || getSet('hdy_show_title') === 'true') {
            var t = document.createElement('div');
            t.className = 'hdy-title';
            t.textContent = title;
            overlay.appendChild(t);
        }

        // Slogan / tagline
        if ((getSet('hdy_show_slogan') === true || getSet('hdy_show_slogan') === 'true') && ext.tagline) {
            var slogan = document.createElement('div');
            slogan.className = 'hdy-slogan';
            slogan.textContent = ext.tagline;
            overlay.appendChild(slogan);
        }

        // Ratings
        if (getSet('hdy_show_ratings') === true || getSet('hdy_show_ratings') === 'true') {
            var rates = document.createElement('div');
            rates.className = 'hdy-ratings';

            var order = String(getSet('hdy_ratings_order') || 'tmdb,imdb,rt,mc')
                .split(',')
                .map(function (s) { return s.trim().toLowerCase(); });

            var available = {
                tmdb: formatRate(ext.vote_average || data.vote_average, false),
                imdb: formatRate((extRates && extRates.imdb) || data.imdb_rating, false),
                rt: formatRate(extRates && extRates.rt, true),
                mc: formatRate(extRates && extRates.mc, true),
                mdblist: formatRate(extRates && extRates.mdblist, true)
            };

            order.forEach(function (key) {
                if (!available[key]) return;
                var span = document.createElement('span');
                span.className = 'hdy-rate hdy-rate--' + key;
                if (rateIcons[key]) {
                    span.innerHTML = '<img src="' + rateIcons[key] + '" alt="' + key + '"> ' + available[key];
                } else {
                    span.textContent = key.toUpperCase() + ' ' + available[key];
                }
                rates.appendChild(span);
            });

            if (year > 0) {
                var y = document.createElement('span');
                y.className = 'hdy-rate';
                y.textContent = year;
                rates.appendChild(y);
            }

            if (rates.childNodes.length) overlay.appendChild(rates);
        }

        if (overlay.childNodes.length) view.appendChild(overlay);
    }

    /* ===================== HOOK ===================== */
    function setupCards() {
        try {
            var CardMaker = Lampa.Maker && Lampa.Maker.map && Lampa.Maker.map('Card');
            if (!CardMaker || !CardMaker.Card) return;

            var original = CardMaker.Card.onVisible;
            CardMaker.Card.onVisible = function () {
                original.apply(this, arguments);
                var self = this;
                var html = this.html;
                if (!html) return;
                LazyLoader.add(html, function () {
                    buildCard(self);
                });
            };
        } catch (e) {
            console.log('[HDY] Card hook error', e);
        }
    }

    /* ===================== STYLES ===================== */
    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;

        var gap = (getSet('hdy_card_gap') || '0.75') + 'em';
        var scale = getSet('hdy_scale_focus') || '1.04';

        var css = `
:root {
    --hd-accent: #e50914;
    --hd-accent-soft: rgba(229,9,20,0.35);
    --hd-bg: #0a0a0a;
    --hd-card: #141414;
    --hd-border: #2a2a2a;
    --hd-gap: ${gap};
}

body.hdy-active { background: var(--hd-bg) !important; }

body.hdy-active .head {
    background: rgba(10,10,10,0.96) !important;
    border-bottom: 1px solid var(--hd-border);
    backdrop-filter: blur(12px);
}

body.hdy-active .head__action.focus,
body.hdy-active .head__action.hover {
    background: var(--hd-accent) !important;
    color: #fff !important;
    border-radius: 8px;
}

body.hdy-active .menu { background: #0d0d0d !important; }
body.hdy-active .menu__item {
    border-radius: 9px !important;
    margin: 3px 8px;
    transition: background .16s ease, transform .16s ease;
}
body.hdy-active .menu__item.focus,
body.hdy-active .menu__item.hover {
    background: var(--hd-accent) !important;
    color: #fff !important;
    transform: scale(1.02) translateZ(0);
}

/* Grid */
body.hdy-active .items-line:not(.vinyl-line) .items-cards,
body.hdy-active .items-line:not(.vinyl-line) .scroll__body {
    display: flex !important;
    flex-wrap: nowrap !important;
    gap: var(--hd-gap) !important;
}

/* Card */
body.hdy-active .hdy-card {
    position: relative;
    background: transparent !important;
    border: none !important;
    border-radius: 12px !important;
    overflow: visible !important;
    flex: 0 0 auto;
    transform: translateZ(0);
    backface-visibility: hidden;
    transition: transform .22s cubic-bezier(0.16,1,0.3,1);
    will-change: transform;
    box-shadow: none !important;
}
body.hdy-active .hdy-card.focus {
    transform: translateY(-6px) scale(${scale}) translateZ(0);
    z-index: 20;
}
body.hdy-active .hdy-card.focus .card__view {
    box-shadow: 0 0 0 3px #fff, 0 12px 28px rgba(0,0,0,.6) !important;
}
body.hdy-active .hdy-card .card__view {
    border-radius: 12px !important;
    overflow: hidden;
    position: relative;
    background: var(--hd-card);
}
body.hdy-active .hdy-card .card__title,
body.hdy-active .hdy-card .card__age,
body.hdy-active .hdy-card .card__vote {
    display: none !important;
}

/* Overlay */
.hdy-overlay {
    position: absolute;
    left: 0; right: 0; bottom: 0;
    z-index: 4;
    padding: 30px 10px 10px;
    background: linear-gradient(to top, rgba(0,0,0,.93) 0%, rgba(0,0,0,.55) 60%, transparent 100%);
    display: flex;
    flex-direction: column;
    gap: 5px;
    pointer-events: none;
    transform: translateZ(0);
}
.hdy-logo-wrap {
    display: flex;
    justify-content: center;
    margin-bottom: 4px;
}
.hdy-logo {
    max-width: 78%;
    max-height: 42px;
    object-fit: contain;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,.7));
}
.hdy-title {
    color: #fff;
    font-size: .92em;
    font-weight: 650;
    line-height: 1.25;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-shadow: 0 1px 3px rgba(0,0,0,.85);
}
.hdy-slogan {
    color: #ccc;
    font-size: .72em;
    font-style: italic;
    line-height: 1.25;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    opacity: .9;
}
.hdy-ratings {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
}
.hdy-rate {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: .78em;
    font-weight: 700;
    color: #fff;
    background: rgba(0,0,0,.45);
    padding: 2px 6px;
    border-radius: 5px;
    line-height: 1.2;
}
.hdy-rate img {
    width: 13px;
    height: 13px;
    object-fit: contain;
}

/* Badges */
.card__badge-hdrezka {
    position: absolute;
    top: 8px; left: 8px;
    z-index: 6;
    font-size: 11px;
    font-weight: 800;
    padding: 3px 8px;
    border-radius: 5px;
    color: #fff;
    text-transform: uppercase;
    letter-spacing: .4px;
    pointer-events: none;
    box-shadow: 0 3px 8px rgba(0,0,0,.5);
}
.card__badge-hdrezka--new { background: linear-gradient(135deg,#00c853,#00e676); }
.card__badge-hdrezka--hd  { background: linear-gradient(135deg,#1a73e8,#42a5f5); }
.card__badge-hdrezka--4k  { background: linear-gradient(135deg,#e50914,#ff2a2a); }

/* Section titles */
body.hdy-active .items-line__title {
    font-weight: 700 !important;
    font-size: 1.15em !important;
    color: #fff !important;
    display: flex;
    align-items: center;
    gap: 10px;
}
body.hdy-active .items-line__title::before {
    content: '';
    width: 4px;
    height: 1.1em;
    background: var(--hd-accent);
    border-radius: 2px;
}

/* Buttons / selects */
body.hdy-active .full-start__button.focus,
body.hdy-active .full-start__button.hover {
    background: var(--hd-accent) !important;
    color: #fff !important;
    box-shadow: 0 0 0 3px var(--hd-accent-soft);
}
body.hdy-active .selectbox-item.focus,
body.hdy-active .selectbox-item.hover {
    background: var(--hd-accent) !important;
    color: #fff !important;
}
body.hdy-active .search__input {
    border-bottom: 2px solid var(--hd-accent) !important;
}
`;

        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = css;
        document.head.appendChild(style);
    }

    /* ===================== SETTINGS ===================== */
    function addSettings() {
        if (!Lampa.SettingsApi) return;

        // Компонент налаштувань
        try {
            Lampa.SettingsApi.addComponent({
                component: 'hdy_settings',
                name: 'HDRezka × YDesign',
                icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-10-5v6l10 5 10-5v-6l-10 5z"/></svg>'
            });
        } catch (e) {}

        var params = [
            { name: 'hdy_enabled', type: 'trigger', default: true, field: { name: 'Увімкнути плагін', description: 'Головний перемикач' } },
            { name: 'hdy_lazy_load', type: 'trigger', default: true, field: { name: 'Ліниве завантаження', description: 'Дані підвантажуються лише для видимих карток' } },
            { name: 'hdy_show_logo', type: 'trigger', default: true, field: { name: 'Логотипи студій', description: 'Показувати лого з TMDB' } },
            { name: 'hdy_show_slogan', type: 'trigger', default: true, field: { name: 'Слогани', description: 'Tagline фільму/серіалу' } },
            { name: 'hdy_show_title', type: 'trigger', default: true, field: { name: 'Назва (якщо немає лого)', description: 'Текстова назва' } },
            { name: 'hdy_show_ratings', type: 'trigger', default: true, field: { name: 'Рейтинги', description: 'TMDB / IMDb / RT / MC' } },
            { name: 'hdy_show_badges', type: 'trigger', default: true, field: { name: 'Бейджі NEW / HD / 4K', description: '' } },
            { name: 'hdy_card_gap', type: 'input', default: '0.75', field: { name: 'Відступ між картками (em)', description: 'Наприклад 0.75' } },
            { name: 'hdy_logo_quality', type: 'select', values: { w200: 'w200', w300: 'w300', w500: 'w500' }, default: 'w300', field: { name: 'Якість лого', description: '' } },
            { name: 'hdy_ratings_order', type: 'input', default: 'tmdb,imdb,rt,mc', field: { name: 'Порядок рейтингів', description: 'tmdb,imdb,rt,mc' } },
            { name: 'hdy_new_years', type: 'input', default: '1', field: { name: 'NEW = поточний + N років', description: '1 = цей і минулий рік' } },
            { name: 'hdy_min_year_hd', type: 'input', default: '2014', field: { name: 'Мін. рік для HD-бейджа', description: '' } },
            { name: 'hdy_omdb_key', type: 'input', default: '', field: { name: 'OMDb API Key', description: 'Для IMDb / RT / Metacritic. Безкоштовно на omdbapi.com' } },
            { name: 'hdy_mdblist_key', type: 'input', default: '', field: { name: 'MDBList API Key', description: 'Додаткові рейтинги. mdblist.com' } },
            { name: 'hdy_scale_focus', type: 'input', default: '1.04', field: { name: 'Scale при фокусі', description: '1.04 = +4%' } }
        ];

        params.forEach(function (p) {
            try {
                Lampa.SettingsApi.addParam({
                    component: 'hdy_settings',
                    param: {
                        name: p.name,
                        type: p.type,
                        default: p.default,
                        values: p.values
                    },
                    field: p.field,
                    onChange: function () {
                        // Перезавантаження стилів при зміні gap/scale
                        var old = document.getElementById(STYLE_ID);
                        if (old) old.remove();
                        injectStyles();
                    }
                });
            } catch (e) {}
        });
    }

    /* ===================== START ===================== */
    function start() {
        if (getSet('hdy_enabled') === false || getSet('hdy_enabled') === 'false') {
            console.log('[HDY] Disabled in settings');
            return;
        }

        document.body.classList.add('hdy-active');
        injectStyles();
        setupCards();
        addSettings();
        console.log('[HDRezka × YDesign Full] v' + VERSION + ' loaded');
    }

    if (window.appready) start();
    else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') start();
        });
    }
})();
