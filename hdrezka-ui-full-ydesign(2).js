/**
 * HDRezka × YDesign Full for Lampa
 * Версія: 5.2 (anti-duplicate)
 *
 * Виправлено:
 * - Дублювання логотипів
 * - Неможливість відкрити налаштування
 * - Накладання тексту / дописів
 * - Помилки, що виглядали як збій плагіна
 */

(function () {
    'use strict';

    if (window.hdrezka_ydesign_full) return;
    window.hdrezka_ydesign_full = true;

    var VERSION = '5.2';
    var STYLE_ID = 'hdrezka-ydesign-full-style';
    var CACHE_PREFIX = 'hdy_';
    var CACHE_TIME = 7 * 24 * 60 * 60 * 1000;

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
                if (val !== null && val !== undefined && val !== '' && String(val) !== 'undefined') {
                    return val;
                }
            }
        } catch (e) {}
        return DefaultSettings.hasOwnProperty(key) ? DefaultSettings[key] : '';
    }

    function isOn(key) {
        var v = getSet(key);
        return v === true || v === 'true' || v === 1 || v === '1';
    }

    var rateIcons = {
        tmdb: 'https://upload.wikimedia.org/wikipedia/commons/8/89/Tmdb.new.logo.svg',
        imdb: 'https://upload.wikimedia.org/wikipedia/commons/5/53/IMDB_-_SuperTinyIcons.svg',
        rt: 'https://upload.wikimedia.org/wikipedia/commons/5/5b/Rotten_Tomatoes.svg',
        mc: 'https://yarikrazor-star.github.io/lmp/mc.svg'
    };

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
            } catch (e) {
                return null;
            }
        },
        set: function (key, val) {
            try {
                localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ t: Date.now(), v: val }));
            } catch (e) {}
        }
    };

    function tmdbKey() {
        try {
            if (window.Lampa && Lampa.TMDB && typeof Lampa.TMDB.key === 'function') {
                return Lampa.TMDB.key();
            }
        } catch (e) {}
        return '4ef0d7355d9ffb5151e987764708ce96';
    }

    function ajaxGet(url, timeout) {
        return new Promise(function (resolve) {
            timeout = timeout || 4000;

            if (window.$ && $.ajax) {
                $.ajax({
                    url: url,
                    timeout: timeout,
                    success: function (data) { resolve(data); },
                    error: function () { resolve(null); }
                });
                return;
            }

            var done = false;
            var timer = setTimeout(function () {
                if (!done) {
                    done = true;
                    resolve(null);
                }
            }, timeout);

            try {
                fetch(url)
                    .then(function (r) { return r.json(); })
                    .then(function (data) {
                        if (!done) {
                            done = true;
                            clearTimeout(timer);
                            resolve(data);
                        }
                    })
                    .catch(function () {
                        if (!done) {
                            done = true;
                            clearTimeout(timer);
                            resolve(null);
                        }
                    });
            } catch (e) {
                if (!done) {
                    done = true;
                    clearTimeout(timer);
                    resolve(null);
                }
            }
        });
    }

    function fetchTmdbExtended(id, type) {
        var cacheKey = 'tmdb_ext_' + type + '_' + id;
        var cached = ApiCache.get(cacheKey);
        if (cached) return Promise.resolve(cached);

        var url = 'https://api.themoviedb.org/3/' + type + '/' + id +
            '?api_key=' + tmdbKey() +
            '&language=uk-UA' +
            '&append_to_response=images,external_ids' +
            '&include_image_language=uk,en,null';

        return ajaxGet(url, 4500).then(function (data) {
            if (!data || data.success === false || data.status_code) {
                ApiCache.set(cacheKey, {});
                return {};
            }

            var result = {
                tagline: data.tagline || '',
                vote_average: data.vote_average,
                imdb_id: (data.external_ids && data.external_ids.imdb_id) || null,
                logo: null
            };

            var logos = (data.images && data.images.logos) || [];
            if (logos.length) {
                var uk = logos.filter(function (l) { return l.iso_639_1 === 'uk'; });
                var en = logos.filter(function (l) { return l.iso_639_1 === 'en'; });
                var logo = (uk[0] || en[0] || logos[0]);
                if (logo && logo.file_path) result.logo = logo.file_path;
            }

            if (!result.tagline) {
                return ajaxGet(
                    'https://api.themoviedb.org/3/' + type + '/' + id + '?api_key=' + tmdbKey() + '&language=en-US',
                    3000
                ).then(function (enData) {
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
                ajaxGet('https://www.omdbapi.com/?apikey=' + encodeURIComponent(omdbKey) + '&i=' + encodeURIComponent(imdbId), 3500)
                    .then(function (omdb) {
                        if (!omdb || omdb.Response === 'False') return;
                        if (omdb.imdbRating && omdb.imdbRating !== 'N/A') results.imdb = omdb.imdbRating;
                        if (omdb.Metascore && omdb.Metascore !== 'N/A') results.mc = omdb.Metascore;
                        var rtArr = (omdb.Ratings || []).filter(function (r) { return r.Source === 'Rotten Tomatoes'; });
                        if (rtArr.length && rtArr[0].Value) {
                            results.rt = String(rtArr[0].Value).replace('%', '');
                        }
                    })
            );
        }

        if (mdblistKey) {
            tasks.push(
                ajaxGet('https://mdblist.com/api/?apikey=' + encodeURIComponent(mdblistKey) + '&i=' + encodeURIComponent(imdbId), 3500)
                    .then(function (mdb) {
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

    function getYear(data) {
        if (!data) return 0;
        if (data.release_date) return parseInt(String(data.release_date).slice(0, 4), 10) || 0;
        if (data.first_air_date) return parseInt(String(data.first_air_date).slice(0, 4), 10) || 0;
        if (data.year) return parseInt(data.year, 10) || 0;
        return 0;
    }

    function detectQuality(data, title) {
        var full = (
            (title || '') + ' ' +
            ((data && data.original_title) || '') + ' ' +
            ((data && data.quality) || '') + ' ' +
            ((data && data.video) || '')
        ).toLowerCase();

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
        if (data.seasons || data.first_air_date || (data.name && !data.title)) return 'tv';
        return 'movie';
    }

    var LazyLoader = {
        observer: null,
        init: function () {
            if (this.observer || typeof IntersectionObserver === 'undefined') return;
            var self = this;
            this.observer = new IntersectionObserver(function (entries) {
                for (var i = 0; i < entries.length; i++) {
                    var entry = entries[i];
                    if (!entry.isIntersecting) continue;
                    var el = entry.target;
                    if (typeof el._hdyQueue === 'function') {
                        var fn = el._hdyQueue;
                        el._hdyQueue = null;
                        try { fn(); } catch (e) {}
                    }
                    self.observer.unobserve(el);
                }
            }, { rootMargin: '160px', threshold: 0.01 });
        },
        add: function (el, fn) {
            if (!isOn('hdy_lazy_load') || typeof IntersectionObserver === 'undefined') {
                try { fn(); } catch (e) {}
                return;
            }
            if (!this.observer) this.init();
            if (!this.observer) {
                try { fn(); } catch (e) {}
                return;
            }
            el._hdyQueue = fn;
            this.observer.observe(el);
        }
    };

    // Жорсткий захист від дублів (WeakSet + data-атрибут + токен запиту)
    var processedCards = typeof WeakSet !== 'undefined' ? new WeakSet() : null;
    var cardTokens = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
    var tokenSeq = 0;

    function markProcessed(html) {
        if (!html) return;
        try { html.setAttribute('data-hdy', '1'); } catch (e) {}
        if (processedCards) {
            try { processedCards.add(html); } catch (e) {}
        }
    }

    function isProcessed(html) {
        if (!html) return true;
        try {
            if (html.getAttribute && html.getAttribute('data-hdy') === '1') return true;
        } catch (e) {}
        if (processedCards) {
            try { if (processedCards.has(html)) return true; } catch (e) {}
        }
        // вже є наш оверлей
        try {
            if (html.querySelector && html.querySelector('.hdy-overlay')) return true;
        } catch (e) {}
        return false;
    }

    function nextToken(html) {
        tokenSeq += 1;
        var t = tokenSeq;
        if (cardTokens && html) {
            try { cardTokens.set(html, t); } catch (e) {}
        }
        return t;
    }

    function isCurrentToken(html, token) {
        if (!cardTokens || !html) return true;
        try {
            return cardTokens.get(html) === token;
        } catch (e) {
            return true;
        }
    }

    function clearOldOverlay(root) {
        if (!root || !root.querySelectorAll) return;
        var old = root.querySelectorAll('.hdy-overlay, .card__badge-hdrezka, .hdy-logo-wrap, .hdy-logo, .hdy-title, .hdy-slogan, .hdy-ratings');
        for (var i = 0; i < old.length; i++) {
            try {
                if (old[i].parentNode) old[i].parentNode.removeChild(old[i]);
            } catch (e) {}
        }
    }

    function buildCard(cardInstance) {
        try {
            var html = cardInstance && cardInstance.html;
            if (!html || isProcessed(html)) return;

            var view = html.querySelector('.card__view');
            if (!view) return;

            // Синхронно блокуємо повторну обробку цієї картки
            markProcessed(html);
            html.classList.add('hdy-card');
            clearOldOverlay(view);
            clearOldOverlay(html);

            var token = nextToken(html);

            var data = cardInstance.data || {};
            var id = data.id;
            if (!id) return;

            var type = mediaType(data);
            var title = data.title || data.name || '';
            var year = getYear(data);
            var quality = detectQuality(data, title);
            var currentYear = new Date().getFullYear();

            if (isOn('hdy_show_badges') && !view.querySelector('.card__badge-hdrezka')) {
                var newYears = parseInt(getSet('hdy_new_years'), 10);
                if (isNaN(newYears)) newYears = 1;
                var minHD = parseInt(getSet('hdy_min_year_hd'), 10);
                if (isNaN(minHD)) minHD = 2014;

                var badgeText = null;
                var badgeType = null;

                if (year >= currentYear - newYears) {
                    badgeText = 'NEW';
                    badgeType = 'new';
                } else if (quality === '4K') {
                    badgeText = '4K';
                    badgeType = '4k';
                } else if (quality === 'HD' || year >= minHD) {
                    badgeText = 'HD';
                    badgeType = 'hd';
                }

                if (badgeText) {
                    var badge = document.createElement('div');
                    badge.className = 'card__badge-hdrezka card__badge-hdrezka--' + badgeType;
                    badge.textContent = badgeText;
                    view.appendChild(badge);
                }
            }

            fetchTmdbExtended(id, type).then(function (ext) {
                if (!isCurrentToken(html, token)) return; // застаріла відповідь
                ext = ext || {};
                var imdbId = ext.imdb_id || data.imdb_id || null;

                return fetchExternalRatings(imdbId).then(function (extRates) {
                    if (!isCurrentToken(html, token)) return;
                    renderOverlay(view, html, data, ext, extRates || {}, title, year, token);
                });
            }).catch(function () {
                if (!isCurrentToken(html, token)) return;
                renderOverlay(view, html, data, {}, {}, title, year, token);
            });
        } catch (e) {}
    }

    function renderOverlay(view, html, data, ext, extRates, title, year, token) {
        try {
            if (!view || !html) return;
            if (!isCurrentToken(html, token)) return;

            // Завжди чистимо перед вставкою — один оверлей на картку
            clearOldOverlay(view);

            // якщо за цей час хтось уже вставив — виходимо
            if (view.querySelector('.hdy-overlay')) return;

            var overlay = document.createElement('div');
            overlay.className = 'hdy-overlay';
            overlay.setAttribute('data-hdy-overlay', '1');

            var hasLogo = false;

            if (isOn('hdy_show_logo') && ext && ext.logo) {
                var logoWrap = document.createElement('div');
                logoWrap.className = 'hdy-logo-wrap';

                var logoImg = document.createElement('img');
                logoImg.className = 'hdy-logo';
                logoImg.alt = title || '';
                logoImg.loading = 'lazy';
                logoImg.decoding = 'async';
                logoImg.src = 'https://image.tmdb.org/t/p/' + (getSet('hdy_logo_quality') || 'w300') + ext.logo;

                logoImg.onerror = function () {
                    try {
                        if (logoWrap.parentNode) logoWrap.parentNode.removeChild(logoWrap);
                        if (isOn('hdy_show_title') && title && overlay && !overlay.querySelector('.hdy-title')) {
                            var t = document.createElement('div');
                            t.className = 'hdy-title';
                            t.textContent = title;
                            if (overlay.firstChild) overlay.insertBefore(t, overlay.firstChild);
                            else overlay.appendChild(t);
                        }
                    } catch (e) {}
                };

                logoWrap.appendChild(logoImg);
                overlay.appendChild(logoWrap);
                hasLogo = true;
            }

            // Назва тільки якщо НЕмає лого (щоб не дублювати)
            if (!hasLogo && isOn('hdy_show_title') && title) {
                var titleEl = document.createElement('div');
                titleEl.className = 'hdy-title';
                titleEl.textContent = title;
                overlay.appendChild(titleEl);
            }

            if (isOn('hdy_show_slogan') && ext && ext.tagline) {
                var slogan = document.createElement('div');
                slogan.className = 'hdy-slogan';
                slogan.textContent = ext.tagline;
                overlay.appendChild(slogan);
            }

            if (isOn('hdy_show_ratings')) {
                var rates = document.createElement('div');
                rates.className = 'hdy-ratings';

                var order = String(getSet('hdy_ratings_order') || 'tmdb,imdb,rt,mc')
                    .split(',')
                    .map(function (s) { return s.trim().toLowerCase(); })
                    .filter(Boolean);

                var available = {
                    tmdb: formatRate((ext && ext.vote_average) || data.vote_average, false),
                    imdb: formatRate((extRates && extRates.imdb) || data.imdb_rating, false),
                    rt: formatRate(extRates && extRates.rt, true),
                    mc: formatRate(extRates && extRates.mc, true),
                    mdblist: formatRate(extRates && extRates.mdblist, true)
                };

                var added = {};
                for (var i = 0; i < order.length; i++) {
                    var key = order[i];
                    if (!available[key] || added[key]) continue;
                    added[key] = true;

                    var span = document.createElement('span');
                    span.className = 'hdy-rate hdy-rate--' + key;

                    if (rateIcons[key]) {
                        var img = document.createElement('img');
                        img.src = rateIcons[key];
                        img.alt = key;
                        span.appendChild(img);
                        span.appendChild(document.createTextNode(' ' + available[key]));
                    } else {
                        span.textContent = key.toUpperCase() + ' ' + available[key];
                    }
                    rates.appendChild(span);
                }

                if (year > 0) {
                    var y = document.createElement('span');
                    y.className = 'hdy-rate';
                    y.textContent = String(year);
                    rates.appendChild(y);
                }

                if (rates.childNodes.length) overlay.appendChild(rates);
            }

            if (!isCurrentToken(html, token)) return;
            if (view.querySelector('.hdy-overlay')) return;

            if (overlay.childNodes.length) {
                view.appendChild(overlay);
            }
        } catch (e) {}
    }

    function setupCards() {
        try {
            if (!Lampa.Maker || typeof Lampa.Maker.map !== 'function') return;

            var CardMaker = Lampa.Maker.map('Card');
            if (!CardMaker || !CardMaker.Card || typeof CardMaker.Card.onVisible !== 'function') return;

            if (CardMaker.Card.__hdy_hooked) return;
            CardMaker.Card.__hdy_hooked = true;

            var original = CardMaker.Card.onVisible;

            CardMaker.Card.onVisible = function () {
                try {
                    original.apply(this, arguments);
                } catch (e) {}

                try {
                    var self = this;
                    var html = this.html;
                    if (!html || isProcessed(html)) return;
                    // додатковий ранній прапор, щоб паралельні onVisible не стартували двічі
                    try { html.setAttribute('data-hdy-pending', '1'); } catch (e) {}

                    LazyLoader.add(html, function () {
                        if (isProcessed(html) && html.querySelector && html.querySelector('.hdy-overlay')) return;
                        buildCard(self);
                    });
                } catch (e) {}
            };
        } catch (e) {
            console.log('[HDY] Card hook skipped');
        }
    }

    function injectStyles() {
        var old = document.getElementById(STYLE_ID);
        if (old && old.parentNode) old.parentNode.removeChild(old);

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
}
body.hdy-active .menu__item.focus,
body.hdy-active .menu__item.hover {
    background: var(--hd-accent) !important;
    color: #fff !important;
}
body.hdy-active .items-line:not(.vinyl-line) .items-cards,
body.hdy-active .items-line:not(.vinyl-line) .scroll__body {
    display: flex !important;
    flex-wrap: nowrap !important;
    gap: var(--hd-gap) !important;
}
body.hdy-active .hdy-card {
    position: relative !important;
    background: transparent !important;
    border: none !important;
    border-radius: 12px !important;
    overflow: visible !important;
    flex: 0 0 auto;
    transform: translateZ(0);
    transition: transform .2s ease;
    box-shadow: none !important;
}
body.hdy-active .hdy-card.focus {
    transform: translateY(-6px) scale(${scale}) translateZ(0);
    z-index: 20;
}
body.hdy-active .hdy-card.focus .card__view {
    box-shadow: 0 0 0 3px #fff, 0 12px 28px rgba(0,0,0,.55) !important;
}
body.hdy-active .hdy-card .card__view {
    border-radius: 12px !important;
    overflow: hidden !important;
    position: relative !important;
    background: var(--hd-card);
}
body.hdy-active .hdy-card .card__title,
body.hdy-active .hdy-card .card__age,
body.hdy-active .hdy-card .card__vote,
body.hdy-active .hdy-card .card__type {
    display: none !important;
}
.hdy-overlay {
    position: absolute !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    top: auto !important;
    z-index: 4 !important;
    padding: 28px 10px 10px !important;
    margin: 0 !important;
    background: linear-gradient(to top, rgba(0,0,0,.94) 0%, rgba(0,0,0,.6) 55%, transparent 100%) !important;
    display: flex !important;
    flex-direction: column !important;
    justify-content: flex-end !important;
    align-items: stretch !important;
    gap: 5px !important;
    pointer-events: none !important;
    box-sizing: border-box !important;
}
.hdy-logo-wrap {
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
    width: 100% !important;
    margin: 0 0 2px 0 !important;
    padding: 0 !important;
}
.hdy-logo {
    display: block !important;
    max-width: 75% !important;
    max-height: 40px !important;
    width: auto !important;
    height: auto !important;
    object-fit: contain !important;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,.75));
}
.hdy-title {
    color: #fff !important;
    font-size: 0.9em !important;
    font-weight: 650 !important;
    line-height: 1.25 !important;
    margin: 0 !important;
    padding: 0 !important;
    display: -webkit-box !important;
    -webkit-line-clamp: 2 !important;
    -webkit-box-orient: vertical !important;
    overflow: hidden !important;
    text-shadow: 0 1px 3px rgba(0,0,0,.85);
}
.hdy-slogan {
    color: #cfcfcf !important;
    font-size: 0.7em !important;
    font-style: italic !important;
    line-height: 1.25 !important;
    margin: 0 !important;
    padding: 0 !important;
    display: -webkit-box !important;
    -webkit-line-clamp: 2 !important;
    -webkit-box-orient: vertical !important;
    overflow: hidden !important;
    opacity: 0.92;
}
.hdy-ratings {
    display: flex !important;
    flex-wrap: wrap !important;
    gap: 5px !important;
    align-items: center !important;
    margin: 0 !important;
    padding: 0 !important;
}
.hdy-rate {
    display: inline-flex !important;
    align-items: center !important;
    gap: 3px !important;
    font-size: 0.75em !important;
    font-weight: 700 !important;
    color: #fff !important;
    background: rgba(0,0,0,.5) !important;
    padding: 2px 6px !important;
    border-radius: 5px !important;
    line-height: 1.2 !important;
    white-space: nowrap !important;
}
.hdy-rate img {
    width: 12px !important;
    height: 12px !important;
    object-fit: contain !important;
    display: block !important;
    flex-shrink: 0 !important;
}
.card__badge-hdrezka {
    position: absolute !important;
    top: 8px !important;
    left: 8px !important;
    right: auto !important;
    bottom: auto !important;
    z-index: 6 !important;
    font-size: 11px !important;
    font-weight: 800 !important;
    padding: 3px 7px !important;
    border-radius: 5px !important;
    color: #fff !important;
    text-transform: uppercase !important;
    letter-spacing: 0.4px !important;
    pointer-events: none !important;
    box-shadow: 0 2px 6px rgba(0,0,0,.5) !important;
    line-height: 1.25 !important;
}
.card__badge-hdrezka--new { background: linear-gradient(135deg,#00c853,#00e676) !important; }
.card__badge-hdrezka--hd  { background: linear-gradient(135deg,#1a73e8,#42a5f5) !important; }
.card__badge-hdrezka--4k  { background: linear-gradient(135deg,#e50914,#ff2a2a) !important; }
body.hdy-active .items-line__title {
    font-weight: 700 !important;
    color: #fff !important;
    display: flex !important;
    align-items: center !important;
    gap: 10px !important;
}
body.hdy-active .items-line__title::before {
    content: '' !important;
    width: 4px !important;
    height: 1em !important;
    background: var(--hd-accent) !important;
    border-radius: 2px !important;
    flex-shrink: 0 !important;
}
body.hdy-active .full-start__button.focus,
body.hdy-active .full-start__button.hover {
    background: var(--hd-accent) !important;
    color: #fff !important;
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

    function addSettings() {
        if (!window.Lampa || !Lampa.SettingsApi) return;

        var list = [
            { name: 'hdy_enabled', type: 'trigger', default: true, field: { name: 'HDY: Увімкнути', description: 'HDRezka × YDesign' } },
            { name: 'hdy_lazy_load', type: 'trigger', default: true, field: { name: 'HDY: Ліниве завантаження', description: 'Дані лише для видимих карток' } },
            { name: 'hdy_show_logo', type: 'trigger', default: true, field: { name: 'HDY: Логотипи', description: 'Лого з TMDB' } },
            { name: 'hdy_show_slogan', type: 'trigger', default: true, field: { name: 'HDY: Слогани', description: 'Tagline' } },
            { name: 'hdy_show_title', type: 'trigger', default: true, field: { name: 'HDY: Назва без лого', description: 'Якщо лого немає' } },
            { name: 'hdy_show_ratings', type: 'trigger', default: true, field: { name: 'HDY: Рейтинги', description: 'TMDB / IMDb / RT / MC' } },
            { name: 'hdy_show_badges', type: 'trigger', default: true, field: { name: 'HDY: Бейджі NEW/HD/4K', description: '' } },
            { name: 'hdy_card_gap', type: 'input', default: '0.75', field: { name: 'HDY: Відступ карток (em)', description: 'Наприклад 0.75' } },
            { name: 'hdy_omdb_key', type: 'input', default: '', field: { name: 'HDY: OMDb API Key', description: 'omdbapi.com' } },
            { name: 'hdy_mdblist_key', type: 'input', default: '', field: { name: 'HDY: MDBList API Key', description: 'mdblist.com' } }
        ];

        list.forEach(function (p) {
            try {
                Lampa.SettingsApi.addParam({
                    component: 'interface',
                    param: {
                        name: p.name,
                        type: p.type,
                        default: p.default
                    },
                    field: p.field,
                    onChange: function () {
                        try { injectStyles(); } catch (e) {}
                    }
                });
            } catch (e) {}
        });
    }

    function start() {
        try {
            if (getSet('hdy_enabled') === false || getSet('hdy_enabled') === 'false') {
                console.log('[HDY] disabled');
                return;
            }

            document.body.classList.add('hdy-active');
            injectStyles();
            setupCards();
            addSettings();
            console.log('[HDRezka × YDesign Full] v' + VERSION + ' loaded');
        } catch (e) {
            console.log('[HDY] start error', e);
        }
    }

    if (window.appready) {
        start();
    } else if (window.Lampa && Lampa.Listener) {
        Lampa.Listener.follow('app', function (e) {
            if (e && e.type === 'ready') start();
        });
    } else {
        setTimeout(function () {
            if (window.Lampa) start();
        }, 1500);
    }
})();
