/**
 * HDRezka Style for Lampa
 * v7.0 — тільки оформлення (CSS)
 *
 * Не чіпає логіку карток / YDesign / Nova Skin.
 * Лише кольори, акценти, рамки, тіні — вигляд як HDRezka.
 * Без API, без оверлеїв, без дублів, без зламів налаштувань.
 */
(function () {
    'use strict';

    if (window.hdrezka_style_v7) return;
    window.hdrezka_style_v7 = true;

    var STYLE_ID = 'hdrezka-style-v7';
    var VERSION = '7.0';

    function inject() {
        if (document.getElementById(STYLE_ID)) return;

        var css = `
/* =====================================================
   HDRezka Style v${VERSION} — pure CSS
   ===================================================== */

:root {
    --hd-accent: #e50914;
    --hd-accent-soft: rgba(229, 9, 20, 0.35);
    --hd-bg: #0b0b0b;
    --hd-card: #141414;
    --hd-border: #2a2a2a;
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
    background: var(--hd-accent) !important;
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
    background: var(--hd-accent) !important;
    color: #fff !important;
}

.menu__item.focus .menu__ico,
.menu__item.hover .menu__ico {
    color: #fff !important;
}

/* Картки — лише вигляд, без перебудови */
.card {
    border-radius: 12px !important;
    overflow: hidden !important;
    background: var(--hd-card) !important;
    transition: transform 0.2s ease, box-shadow 0.2s ease !important;
}

.card.focus,
.card.hover {
    transform: translateY(-5px) scale(1.03) !important;
    box-shadow: 0 10px 26px rgba(0, 0, 0, 0.6) !important;
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
    background: var(--hd-accent) !important;
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
    background: var(--hd-accent) !important;
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
    background: var(--hd-accent) !important;
    color: #fff !important;
    box-shadow: 0 0 0 2px var(--hd-accent-soft) !important;
}

/* Селекти / модалки */
.selectbox-item.focus,
.selectbox-item.hover {
    background: var(--hd-accent) !important;
    color: #fff !important;
    border-radius: 8px !important;
}

.selectbox__content,
.modal__content,
.settings__content {
    border-radius: 12px !important;
}

/* Пошук */
.search__input {
    border-bottom: 2px solid var(--hd-accent) !important;
}

/* Клавіатура */
.simple-keyboard .hg-button.focus {
    background: var(--hd-accent) !important;
    color: #fff !important;
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
    background: var(--hd-accent);
}

/* Дрібниці */
.noty {
    border-radius: 8px !important;
}

.explorer-card__head-img.focus::after {
    border-color: var(--hd-accent) !important;
}
`;

        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = css;
        document.head.appendChild(style);
    }

    function start() {
        inject();
        console.log('[HDRezka Style] v' + VERSION + ' loaded (CSS only)');
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
