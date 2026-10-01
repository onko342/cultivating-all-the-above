"use strict";

import { t, rawHTML, escapeHTML } from "./localization.js";
import { character } from "./character.js";
import { settings } from "./content/settings.js";

const display_bindings = {};

/**
 * Gives an element exactly one class from a style group, e.g. group "rank" + value "f" -> class "rank-f".
 * Any other "rank-*" class on the element is removed. A null/undefined value just clears the group.
 * Does nothing if the element already has the right class.
 */
export function setStyleClass(element, group, value) {
    const prefix = `${group}-`;
    const wanted = (value === null || value === undefined) ? null : prefix + value;

    [...element.classList].forEach((class_name) => {
        if (class_name.startsWith(prefix) && class_name !== wanted) {
            element.classList.remove(class_name);
        }
    });
    if (wanted) element.classList.add(wanted);
}

/**
 * Builds a styled span for use as a {var} inside tHTML() translations.
 * styledSpan("rank", "d", "D-Rank") -> <span class="rank-d">D-Rank</span>
 * Uses the same group-prefix class naming as setStyleClass.
 */
export function styledSpan(group, value, text) {
    return rawHTML(`<span class="${escapeHTML(group)}-${escapeHTML(value)}">${escapeHTML(text)}</span>`);
}

/**
 * @param {string} key Unique key, e.g. "level"
 * @param {string} element_id ID of the element to manage
 * @param {() => string} getText Returns the text/HTML to show, called on every update
 * @param {Object} [options]
 * @param {boolean} [options.html = false] If true, getText's result is inserted as HTML (use tHTML for it)
 * @param {string} [options.style_group] Class group prefix, e.g. "rank" or "rarity"
 * @param {() => (string|null)} [options.getStyle] Returns the group's current value, e.g. "f"
 */
export function bindDisplay(key, element_id, getText, { html = false, style_group = null, getStyle = null } = {}) {
    display_bindings[key] = {
        element: document.getElementById(element_id),
        getText: getText,
        html: html,
        style_group: style_group,
        getStyle: getStyle,
    };
    updateDisplay(key);
}

export function updateDisplay(key) {
    const binding = display_bindings[key];
    if (!binding || !binding.element) return;

    if (binding.html) {
        binding.element.innerHTML = binding.getText();
    } else {
        binding.element.textContent = binding.getText();
    }

    if (binding.style_group && binding.getStyle) {
        setStyleClass(binding.element, binding.style_group, binding.getStyle());
    }
}

export function updateAllDisplays() {
    Object.keys(display_bindings).forEach(updateDisplay);
}

const box_elements = {
    stats_box: document.getElementById('stats-box'),
    inventory_box: document.getElementById('inventory-box'),
    skills_box: document.getElementById('skills-box'),
    log_box: document.getElementById('log-box'),
    location_top_box: document.getElementById('location-top-box'),
    cultivation_box: document.getElementById('cultivation-box'),
    misc_box: document.getElementById('misc-box'),
}

export function updateBoxUnlocks() {
    for (const [unlock_key, box_element] of Object.entries(box_elements)) {
        if (!box_element) continue;

        const is_unlocked = character.box_unlocks[unlock_key];
        box_element.classList.toggle('is-unlocked', is_unlocked);
    }
}

export function initTabs() {
    const tab_containers = document.querySelectorAll('.tab-container');

    tab_containers.forEach((container) => {
        const buttons = container.querySelectorAll(':scope > .tab-buttons > .tab-button');
        const panels = container.querySelectorAll(':scope > .tab-content-area > .tab-panel');

        buttons.forEach((button) => {
            button.addEventListener('click', () => {
                buttons.forEach((b) => b.classList.remove('active-tab'));
                panels.forEach((p) => p.classList.remove('active-tab'));

                button.classList.add('active-tab');
                container
                    .querySelector(`:scope > .tab-content-area > [data-tab-panel="${button.dataset.tabTarget}"]`)
                    .classList.add('active-tab');
            })
        })
    })
}

/**
 * Formats a number. Number will be TRUNCATED by default!
 * @param {Number} number The number to be formatted
 * @param {Number} [max_regular = 6] Maximum number of digits allowed (not counting decimals) for regular notation, default 6, example: 999,999
 * @param {number} [regular_decimals = 2] Number of digits after the decimal point to be shown for regular numbers, default 2, example: 1,234.56 
 */
export function formatNumber(number, max_regular = 6, regular_decimals = 2) {
    const standard_units = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'Ud', 'Dd', 'Td', 'Qad', 'Qid', 'Sxd', 'Spd', 'Ocd', 'Nod', 'Vg'];
    const chinese_t_units = ['', '萬', '億', '兆', '京', '垓', '秭', '穰', '溝', '澗', '正', '載', '極', '恆河沙', '阿僧祇', '那由他', '不可思議', '無量', '大數'];
    const chinese_s_units = ['', '万', '亿', '兆', '京', '垓', '秭', '穣', '沟', '涧', '正', '载', '极', '恒河沙', '阿僧祇', '那由他', '不可思议', '无量', '大数'];
    const emoji_units = ['', '▫️', '▪️', '◽', '◾', '◻️', '◼️', '⬜', '⬛', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣'];

    function exponential() {
        let exponent = Math.floor(Math.log10(number));
        number = number / 10 ** exponent;
        return String(number).substring(0, 6) + 'e' + String(exponent);
    }
    function getChineseUnit(index) {
        if (settings.number_type == "chinese_t") {
            return chinese_t_units[index];
        } else if (settings.number_type == "chinese_s") {
            return chinese_s_units[index];
        } else {
            throw new Error("Attempted to access chinese number units while not using chinese number format!");
            return "ERROR";
        }
    }

    if (number < 10 ** max_regular) {
        number = Math.floor(number * (10 ** regular_decimals)) / (10 ** regular_decimals); //truncate to correct number of decimals
        return number.toLocaleString("en-us", { maximumFractionDigits: regular_decimals });
    }

    let magnitude = Math.floor(Math.log10(number));

    if (settings.number_type == "standard") {
        let unit_index = Math.floor(magnitude / 3);
        let changed_number = number / (10 ** (unit_index * 3));
        if (unit_index < standard_units.length) {
            return String(changed_number).substring(0, 6) + standard_units[unit_index];
        } else {
            return exponential();
        }
    } else if (settings.number_type == "chinese_t" || settings.number_type == "chinese_s") {
        let unit_index = Math.floor(magnitude / 4);
        let changed_number = number / (10 ** (unit_index * 4));
        if (unit_index < chinese_t_units.length) { //the two chinese arrays have the same length so I'm not comparing for both of them
            let c_result = '';
            c_result += String(Math.floor(changed_number));
            c_result += getChineseUnit(unit_index);
            let next_digits = Math.floor((changed_number - Math.floor(changed_number)) * 10000); //get the decimal part only, then reveal only 4 more digits
            if (next_digits) {
                c_result += String(10000 + next_digits).substring(1, 5); //hacky solution for ensuring leading zeros exist if needed
                c_result += getChineseUnit(unit_index - 1);
            }
            return c_result;
        } else {
            return exponential();
        }
    } else if (settings.number_type == "emoji") {
        let unit_index = Math.floor(magnitude / 5);
        let changed_number = number / (10 ** (unit_index * 5));
        if (unit_index < emoji_units.length) {
            if (changed_number >= 10000) {
                return String(changed_number).substring(0, 5) + emoji_units[unit_index];
            } else {
                return String(changed_number).substring(0, 6) + emoji_units[unit_index]; //period present
            }
        } else {
            return exponential();
        }
    } else if (settings.number_type == "scientific") {
        return exponential();
    } else {
        console.warn("Number type setting unrecognized!");
        return exponential();
    }
}