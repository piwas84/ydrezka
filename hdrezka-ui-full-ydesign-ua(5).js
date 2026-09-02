/**
 * HDRezka Style for Lampa — UA edition
 * на базі hdrezka-ui-full-ydesign(5).js
 *
 * Тільки CSS. Без повторної інжекції, без важких псевдоелементів.
 * Жовто-блакитний акцент + рамка навколо картки + смужки зверху/з боків.
 */
(function () {
    'use strict';

    if (window.hdrezka_style_ua_v1) return;
    window.hdrezka_style_ua_v1 = true;

    var STYLE_ID = 'hdrezka-style-ua-v1';
    var VERSION = '7.4-ua';

    var BLUE = '#0057B8';
    var YELLOW = '#FFD700';

    function inject() {
        var old = document.getElementById(STYLE_ID);
        if (old) old.remove();

        var css = `
/* HDRezka Style ${VERSION} — UA, stable */

:root {
    --hd-accent: ${BLUE};
    --hd-accent-yellow: ${YELLOW};
    --hd-accent-soft: rgba(0, 87, 184, 0.35);
    --hd-bg: #0b0b0b;
    --hd-card: #141414;
    --hd-border: #1a2a4a;
    --hd-text: #f0f0f0;
}

body {
    background: var(--hd-bg) !important;
}

.head {
    background: rgba(11, 11, 11, 0.95) !important;
    border-bottom: 1px solid var(--hd-border) !important;
}

.head__action.focus,
.head__action.hover {
    background: ${BLUE} !important;
    color: #fff !important;
    border-radius: 8px !important;
}

/* Не чіпаємо структуру меню — лише колір focus */
.menu__item.focus,
.menu__item.hover {
    background: ${BLUE} !important;
    color: #fff !important;
}

.menu__item.focus .menu__ico,
.menu__item.hover .menu__ico {
    color: #fff !important;
}

/*
 * Картка:
 * - рамка = border (не box-shadow шари)
 * - смужка зверху = linear-gradient у background-image (не ::before)
 * - боки = border-left / border-right
 * Без transform scale — менше блимання з іншими темами
 */
.card {
    border-radius: 12px !important;
    overflow: hidden !important;
    background-color: var(--hd-card) !important;
    background-image: linear-gradient(90deg, ${BLUE} 0%, ${BLUE} 50%, ${YELLOW} 50%, ${YELLOW} 100%) !important;
    background-size: 100% 3px !important;
    background-repeat: no-repeat !important;
    background-position: top left !important;
    border: 2px solid ${BLUE} !important;
    border-left: 3px solid ${BLUE} !important;
    border-right: 3px solid ${YELLOW} !important;
    border-top-color: transparent !important;
    box-sizing: border-box !important;
    transition: box-shadow 0.15s ease !important;
}

.card.focus,
.card.hover {
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.55) !important;
    border-color: ${BLUE} !important;
    border-left-color: ${BLUE} !important;
    border-right-color: ${YELLOW} !important;
    border-top-color: transparent !important;
    z-index: 5;
}

.card.focus .card__view,
.card.hover .card__view {
    box-shadow: none !important;
}

.card__view {
    border-radius: 10px 10px 0 0 !important;
    overflow: hidden !important;
}

.card__title {
    color: var(--hd-text) !important;
    font-weight: 600 !important;
}

.card__vote {
    background: ${BLUE} !important;
    color: #fff !important;
    border-radius: 6px 0 8px 0 !important;
    font-weight: 700 !important;
}

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

.full-start__button {
    border-radius: 8px !important;
}

.full-start__button.focus,
.full-start__button.hover {
    background: ${BLUE} !important;
    color: #fff !important;
}

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
}

.search__input {
    border-bottom: 2px solid ${YELLOW} !important;
}

.simple-keyboard .hg-button.focus {
    background: ${BLUE} !important;
    color: #fff !important;
}

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

.noty {
    border-radius: 8px !important;
}

.explorer-card__head-img.focus::after {
    border-color: ${BLUE} !important;
}
`;

        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = css;
        document.head.appendChild(style);
    }

    function start() {
        inject();
        console.log('[HDRezka Style UA] v' + VERSION + ' loaded');
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
