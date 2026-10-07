"use strict";

import { character } from "./character.js";
import { titles } from "./content/titles.js";
import { leveling } from "./content/leveling.js";
import { getRarityName } from "./content/rarities.js";
import { bindDisplay, bindBar, updateDisplay, setStyleClass, formatNumber, applyCompactSettings } from "./display.js";
import { t } from "./localization.js";
import { settings } from "./content/settings.js";

function getSelectedTitle() {
    return titles[character.selected_title] ?? null; //null if nothing is selected or id no longer exists
}

function getTitleName(title) {
    return t(`titles.name.${title.name_key}`);
}

function selectTitle(title_id) {
    character.selected_title = title_id;
    updateDisplay("title");
    //later: recalculate stats here when titles have effects
}

function initTitleDropdown() {
    const wrapper = document.getElementById("title-select");
    const button = document.getElementById("title-select-button");
    const list = document.getElementById("title-select-list");

    function closeList() {
        list.hidden = true;
    }

    function addOption(title_id, label, rarity_name) {
        const item = document.createElement("li");
        //rarity class goes on an inner span so the li's hover background doesn't clash with gradient text
        const text = document.createElement("span");
        text.textContent = label;
        setStyleClass(text, "rarity", rarity_name);
        item.appendChild(text);
        item.addEventListener("click", () => {
            selectTitle(title_id);
            closeList();
        });
        list.appendChild(item);
    }

    //rebuilt on every open so newly gained titles and language changes are always reflected
    function openList() {
        list.replaceChildren();
        addOption("", t("ui.stats_box.no_title"), null);
        character.titles.forEach((title_id) => {
            const title = titles[title_id];
            if (title) addOption(title_id, getTitleName(title), getRarityName(title.rarity));
        });
        list.hidden = false;
    }

    button.addEventListener("click", () => list.hidden ? openList() : closeList());
    document.addEventListener("click", (event) => {
        if (!wrapper.contains(event.target)) closeList();
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeList();
    });
}

//Digits shown in regular notation before bars switch to the player's large number format.
//Half-width bars (two sharing a row in the compact layout) get half as many.
const bar_max_digits_full = 12;
const bar_max_digits_half = bar_max_digits_full / 2; //6, formatNumber's default

function resourceBar(key, current_stat, max_stat, { show_if = null, pair = null } = {}) {
    return {
        key: key,
        show_if: show_if,
        pair: pair,
        getCurrent: () => character.stats.total[current_stat],
        getMax: () => character.stats.total[max_stat],
    };
}

//Bars in display order. show_if null = always visible.
//pair = key of the bar it shares a row with in the compact layout (must match the rows in index.html)
const bar_definitions = [
    {
        key: "xp",
        show_if: null,
        pair: null,
        getCurrent: () => leveling.current_xp,
        getMax: () => leveling.getXPToLevel(leveling.character_level),
    },
    resourceBar("hp", "health", "max_health"),
    resourceBar("st", "stamina", "max_stamina", { pair: "mp" }),
    resourceBar("mp", "mana", "max_mana", { pair: "st" }),
    resourceBar("qi", "inner_qi", "max_inner_qi", { show_if: () => character.global_flags.inner_qi_unlocked, pair: "sp" }),
    resourceBar("sp", "spirit", "max_spirit", { show_if: () => character.global_flags.spirit_unlocked, pair: "qi" }),
];

//A bar is drawn at half width when the compact layout is on and the bar it shares a row with is visible too
function isHalfWidthBar(definition) {
    if (!settings.compact_bars || !definition.pair) return false;
    const partner = bar_definitions.find((other) => other.key === definition.pair);
    return !partner.show_if || partner.show_if();
}

function initBars() {
    bar_definitions.forEach((definition) => {
        const { key, getCurrent, getMax, show_if } = definition;
        bindBar(`bar_${key}`, `bar-${key}`, {
            getCurrent: getCurrent,
            getMax: getMax,
            show_if: show_if,
            getText: () => {
                const max_digits = isHalfWidthBar(definition) ? bar_max_digits_half : bar_max_digits_full;
                return t("ui.stats_box.bar_text", {
                    name: t(`ui.stats_box.bar_name_${key}`),
                    current: formatNumber(getCurrent(), max_digits, 0),
                    max: Number.isFinite(getMax()) ? formatNumber(getMax(), max_digits, 0) : "∞", //XP to level is Infinity past the last defined level
                });
            },
        });
    });
}

export function initStatsPage() {
    bindDisplay("level", "level-text",
        () => t("ui.stats_box.level_text", { level: formatNumber(leveling.character_level, 9) }),
        { style_group: "rank", getStyle: () => leveling.getRank(leveling.character_level) }
    );

    bindDisplay("title", "character-title",
        () => {
            const title = getSelectedTitle();
            return title ? getTitleName(title) : t("ui.stats_box.no_title");
        },
        {
            style_group: "rarity",
            getStyle: () => {
                const title = getSelectedTitle();
                return title ? getRarityName(title.rarity) : null;
            },
        }
    );

    //PLACEHOLDERS: realm tracking doesn't exist yet. Replace with the character's actual realms once cultivation content is implemented
    bindDisplay("realm_qi", "realm-qi-line",
        () => t("qi_cultivation.realms.latent_roots"),
        { show_if: () => character.global_flags.inner_qi_unlocked }
    );

    bindDisplay("realm_body", "realm-body-line",
        () => t("body_cultivation.realms.mortal_body"),
        { show_if: () => character.global_flags.body_cultivation_unlocked }
    );

    initBars();
    applyCompactSettings();
    initTitleDropdown();
}