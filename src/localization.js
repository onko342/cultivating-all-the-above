"use strict";

import { settings } from "./content/settings.js";

const LOCALES_BASE_URL = new URL("../locales/", import.meta.url);
const FALLBACK_LANGUAGE = "en-us";

let active_locale = {};
let fallback_locale = {};

async function loadLocaleFile(lang) {
    const url = new URL(`${lang}.json`, LOCALES_BASE_URL);
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Could not load locale file for "${lang}" (${response.status})`);
    }

    return response.json();
}

//resolves a dot-separated key path, e.g. "ui.stats_box.tab_stat", against a locale object
function resolveKey(locale_obj, key) {
    return key.split(".").reduce((obj, part) => {
        return (obj && obj[part] !== undefined) ? obj[part] : undefined;
    }, locale_obj);
}

//Marks a string as trusted HTML so tHTML() inserts it as-is instead of escaping it.
//Only wrap markup you built yourself, and run any plain text inside it through escapeHTML.
class RawHTML {
    constructor(html) {
        this.html = String(html);
    }
}

export function rawHTML(html) {
    return new RawHTML(html);
}

export function escapeHTML(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

//used when a RawHTML var ends up in a plain-text lookup (t()), e.g. a tooltip: tags are dropped, entities decoded
function htmlToPlainText(html) {
    return new DOMParser().parseFromString(html, "text/html").body.textContent;
}

function formatVar(value, escape_vars) {
    if (value instanceof RawHTML) {
        return escape_vars ? value.html : htmlToPlainText(value.html);
    }
    return escape_vars ? escapeHTML(value) : String(value);
}

//shared lookup. escape_vars should be true whenever the result will be inserted as HTML
function translate(key, vars, escape_vars) {
    let text = resolveKey(active_locale, key);

    if (text === undefined) {
        text = resolveKey(fallback_locale, key);
    }

    if (text === undefined) {
        console.warn(`[localization] Missing translation key: "${key}"`);
        return key;
    }

    //simple {var_name} substitution
    return text.replace(/\{(\w+)\}/g, (match, var_name) => {
        if (vars[var_name] === undefined) return match;
        return formatVar(vars[var_name], escape_vars);
    });
}

//plain text lookup, for textContent / attributes
export function t(key, vars = {}) {
    return translate(key, vars, false);
}

//HTML lookup, for innerHTML. The translation text may contain tags, but {vars} are escaped
export function tHTML(key, vars = {}) {
    return translate(key, vars, true);
}

//applies data-i18n / data-i18n-attr translations to everything under root
export function applyTranslationsToDOM(root = document) {
    root.querySelectorAll("[data-i18n]").forEach((el) => {
        el.textContent = t(el.dataset.i18n);
    });

    root.querySelectorAll("[data-i18n-html]").forEach((el) => {
        el.innerHTML = tHTML(el.dataset.i18nHtml);
    });

    root.querySelectorAll("[data-i18n-attr]").forEach((el) => {
        const pairs = el.dataset.i18nAttr.split(";").filter(Boolean);

        pairs.forEach((pair) => {
            const [attr_name, key] = pair.split(":").map((s) => s.trim());
            if (attr_name && key) {
                el.setAttribute(attr_name, t(key));
            }
        });
    });
}

//loads the language currently set in settings, plus the fallback language if different
export async function initLocalization() {
    fallback_locale = await loadLocaleFile(FALLBACK_LANGUAGE);

    active_locale = (settings.language === FALLBACK_LANGUAGE)
        ? fallback_locale
        : await loadLocaleFile(settings.language);
}

//switches language at runtime and re-applies translations to the whole document
export async function setLanguage(lang) {
    active_locale = (lang === FALLBACK_LANGUAGE) ? fallback_locale : await loadLocaleFile(lang);
    settings.language = lang;
    applyTranslationsToDOM();
}