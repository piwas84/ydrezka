/**
 * HDRezka Style for Lampa — UA edition
 * на базі hdrezka-ui-full-ydesign(5).js
 *
 * Тільки оформлення (CSS). Не чіпає логіку карток / YDesign / Nova Skin.
 * Акценти та обводка: жовто-блакитні (прапор України).
 */
(function () {
    'use strict';

    if (window.hdrezka_style_ua_v1) return;
    window.hdrezka_style_ua_v1 = true;

    var STYLE_ID = 'hdrezka-style-ua-v1';
    var VERSION = '7.0-ua';

    // Прапор України
    var BLUE = '#0057B8';
    var YELLOW = '#FFD700';
    var BLUE_SOFT = 'rgba(0, 87, 184, 0.40)';
    var YELLOW_SOFT = 'rgba(255, 215, 0, 0.35)';

    function inject() {
        if (document.getElementById(STYLE_ID)) return;

        var css = `
/* =====================================================
   HDRezka Style ${VERSION} — UA yellow-blue
   ===================================================== */

:root {
    --hd-accent: ${BLUE};
    --hd-accent-yellow: ${YELLOW};
    --hd-accent-soft: ${BLUE_SOFT};
    --hd-accent-yellow-soft: ${YELLOW_SOFT};
    --hd-bg: #0b0b0b;
    --hd-card: #141414;
    --hd-border: #1a2a4a;
    --hd-text: #f0f0f0;
    --hd-muted: #9a9a9a;
}

/* Фон */
body {
    background: var(--hd-bg) !important;
}

/* Хедер */
.head {
    background: rgba(11, 11, 11, 0.95) !important;
    border-bottom: 1px solid var(--hd-border) !important;
}

.head__action.focus,
.head__action.hover {
    background: linear-gradient(135deg, ${BLUE} 50%, ${YELLOW} 50%) !important;
    color: #fff !important;
    border-radius: 8px !important;
}

/* Меню */
.menu {
    background: #0e0e0e !important;
}

.menu__item {
    border-radius: 8px !important;
    margin: 2px 8px !important;
    transition: background 0.15s ease !important;
}

.menu__item.focus,
.menu__item.hover {
    background: ${BLUE} !important;
    color: #fff !important;
}

.menu__item.focus .menu__ico,
.menu__item.hover .menu__ico {
    color: #fff !important;
}

/* Картки — фон + жовто-блакитна обводка */
.card {
    border-radius: 12px !important;
    overflow: hidden !important;
    background: var(--hd-card) !important;
    transition: transform 0.2s ease, box-shadow 0.2s ease !important;
    position: relative !important;
    /* обводка UA */
    box-shadow: 0 0 0 1px rgba(0, 87, 184, 0.35) !important;
}

.card::before {
    content: "" !important;
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    height: 3px !important;
    background: linear-gradient(90deg, ${BLUE} 0%, ${BLUE} 50%, ${YELLOW} 50%, ${YELLOW} 100%) !important;
    z-index: 15 !important;
    pointer-events: none !important;
}

.card.focus,
.card.hover {
    transform: translateY(-5px) scale(1.03) !important;
    box-shadow:
        0 10px 26px rgba(0, 0, 0, 0.6),
        0 0 0 2px ${BLUE},
        0 0 0 4px ${YELLOW_SOFT} !important;
    z-index: 5;
}

.card.focus .card__view,
.card.hover .card__view {
    box-shadow: 0 0 0 2px var(--hd-accent-soft) !important;
}

.card__view {
    border-radius: 12px 12px 0 0 !important;
    overflow: hidden !important;
}

.card__title {
    color: var(--hd-text) !important;
    font-weight: 600 !important;
}

/* Рейтинг на картці */
.card__vote {
    background: ${BLUE} !important;
    color: #fff !important;
    border-radius: 6px 0 8px 0 !important;
    font-weight: 700 !important;
}

/* Заголовки секцій */
.items-line__title {
    font-weight: 700 !important;
    color: #fff !important;
}

.items-line__title::before {
    content: "" !important;
    display: inline-block !important;
    width: 4px !important;
    height: 0.95em !important;
    background: linear-gradient(180deg, ${BLUE} 50%, ${YELLOW} 50%) !important;
    border-radius: 2px !important;
    margin-right: 10px !important;
    vertical-align: -0.1em !important;
}

/* Кнопки */
.full-start__button {
    border-radius: 8px !important;
}

.full-start__button.focus,
.full-start__button.hover {
    background: ${BLUE} !important;
    color: #fff !important;
    box-shadow: 0 0 0 2px var(--hd-accent-soft), 0 0 0 4px ${YELLOW_SOFT} !important;
}

/* Селекти / модалки */
.selectbox-item.focus,
.selectbox-item.hover {
    background: ${BLUE} !important;
    color: #fff !important;
    border-radius: 8px !important;
}

.selectbox__content,
.modal__content,
.settings__content {
    border-radius: 12px !important;
    border: 1px solid rgba(0, 87, 184, 0.35) !important;
}

/* Пошук */
.search__input {
    border-bottom: 2px solid ${YELLOW} !important;
}

/* Клавіатура */
.simple-keyboard .hg-button.focus {
    background: ${BLUE} !important;
    color: #fff !important;
    box-shadow: 0 0 0 2px ${YELLOW_SOFT} !important;
}

/* Скролбар */
::-webkit-scrollbar {
    width: 6px;
    height: 6px;
}
::-webkit-scrollbar-thumb {
    background: #333;
    border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
    background: ${BLUE};
}

/* Дрібниці */
.noty {
    border-radius: 8px !important;
    border-left: 3px solid ${YELLOW} !important;
}

.explorer-card__head-img.focus::after {
    border-color: ${BLUE} !important;
    box-shadow: 0 0 0 2px ${YELLOW_SOFT} !important;
}

/* YDesign / HDRezka бейджі — акцент UA, обводка */
.card .ydesign,
.card [class*="ydesign"],
.card [data-yd],
.card .hdrezka,
.card [class*="hdrezka"],
.card [data-hdrezka],
.card .hdrezka-ua {
    box-shadow: 0 0 0 1px ${BLUE}, 0 0 0 2px ${YELLOW_SOFT} !important;
    border-radius: 6px !important;
}
`;

        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = css;
        document.head.appendChild(style);
    }

    function start() {
        inject();
        console.log('[HDRezka Style UA] v' + VERSION + ' loaded (yellow-blue accents + outline)');
    }

    if (window.appready) {
        start();
    } else if (window.Lampa && Lampa.Listener) {
        Lampa.Listener.follow('app', function (e) {
            if (e && e.type === 'ready') start();
        });
    } else {
        setTimeout(function () {
            if (document.head) start();
        }, 1000);
    }
})();
