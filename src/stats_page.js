"use strict";

import { character } from "./character.js";
import { titles } from "./content/titles.js";
import { leveling } from "./content/leveling.js";
import { getRarityName } from "./content/rarities.js";
import { bindDisplay, bindVisibility, bindBar, updateDisplay, setStyleClass, formatNumber, applyCompactSettings, styledSpan } from "./display.js";
import { t, tHTML, unwrapHTML } from "./localization.js";
import { settings } from "./content/settings.js";
import { getLeagueTier } from "./content/ranking.js";
import { setTooltip } from "./tooltip.js";

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

//Regular notation digits for the ranking number (must be enough for it to never spill into large number notation)
const ranking_max_digits = 30;
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

//Core stats on the stats page, one group per row, three stats per group, in display order.
//key: row id. color: row background class (the two derived rows share "derived"). show_if null = always visible.
const stat_group_definitions = [
    { key: "body", color: "body", stats: ["strength", "constitution", "agility"] },
    { key: "essence", color: "essence", stats: ["affinity", "capacity", "flow"] },
    { key: "mind", color: "mind", stats: ["ego", "resilience", "charm"], show_if: () => character.global_flags.mind_stats_unlocked },
    { key: "special", color: "special", stats: ["luck", "talent", "comprehension"] },
    { key: "offense", color: "derived", stats: ["attack_power", "attack_speed", "cast_speed"] },
    { key: "defense", color: "derived", stats: ["defense", "hit_score", "dodge_score"] },
];

//Tooltips for the derived stats. related = other stats shown in a table under the description.
//Description text lives in locales under tooltips.stats.<stat_key>
const stat_tooltip_definitions = {
    attack_power: { related: ["physical_attack", "mystical_attack", "soul_attack", "crit", "crit_mult"] },
    attack_speed: { related: [] },
    cast_speed: { related: [] },
    defense: { related: ["defense_proportion", "crit_prot"] },
    hit_score: { related: [] },
    dodge_score: { related: [] },
};

//Long names are for places with room to spare (tooltips, detailed stats page)
function getStatLongName(stat_key) {
    return t(`stats.long_name.${stat_key}`);
}

function getStatTooltip(stat_key) {
    const definition = stat_tooltip_definitions[stat_key];
    return {
        title: getStatLongName(stat_key),
        body: tHTML(`tooltips.stats.${stat_key}`),
        rows: definition.related.map((related_key) => [
            getStatLongName(related_key),
            formatNumber(character.stats.total[related_key]),
        ]),
    };
}

function initStatGroups() {
    const area = document.getElementById("stat-group-area");

    stat_group_definitions.forEach(({ key, color, stats, show_if }) => {
        const row = document.createElement("div");
        row.id = `stat-group-${key}`;
        row.className = `stat-group stat-group-${color}`;

        //every stat gets a slot (the grid item, holds the padding and divider) around the cell (the text that gets fitted)
        stats.forEach((stat_key) => {
            const slot = document.createElement("div");
            slot.className = "stat-slot";
            const cell = document.createElement("div");
            cell.id = `stat-${stat_key.replaceAll("_", "-")}`;
            cell.className = "stat-cell";
            cell.dataset.stat = stat_key; //for the tooltips later
            if (stat_tooltip_definitions[stat_key]) setTooltip(slot, () => getStatTooltip(stat_key));
            slot.appendChild(cell);
            row.appendChild(slot);
        });
        area.appendChild(row); //must be in the document before binding

        if (show_if) bindVisibility(`stat_group_${key}`, row.id, show_if);

        stats.forEach((stat_key) => {
            bindDisplay(`stat_${stat_key}`, `stat-${stat_key.replaceAll("_", "-")}`,
                () => tHTML("ui.stats_box.stat_text", {
                    name: styledSpan("stat", "name", t(`ui.stats_box.stat_name_${stat_key}`)),
                    value: styledSpan("stat", "value", formatNumber(character.stats.total[stat_key])),
                }),
                { html: true, fit_text: true }
            );
        });
    });
}

function getSubrankSpan(subrank) {
    return styledSpan("rank", subrank.rank, subrank.rank.toUpperCase() + subrank.suffix);
}

function getLevelTooltip() {
    const level = leveling.character_level;
    const subrank = leveling.getSubrank(level);

    const rows = [[t("tooltips.level.rank_label"), unwrapHTML(getSubrankSpan(subrank))]];
    if (subrank.next) {
        rows.push([
            t("tooltips.level.next_rank_label"),
            tHTML("tooltips.level.next_rank_value", {
                rank: getSubrankSpan(subrank.next),
                level: formatNumber(subrank.next.min_level, 9),
            }),
        ]);
    }

    return {
        title: tHTML("tooltips.level.title", { level: formatNumber(level, 9) }),
        body: tHTML(`tooltips.level.description.${subrank.rank}`),
        rows: rows,
    };
}

export function initStatsPage() {
    bindDisplay("level", "level-text",
        () => t("ui.stats_box.level_text", { level: formatNumber(leveling.character_level, 9) }),
        { style_group: "rank", getStyle: () => leveling.getRank(leveling.character_level) }
    );

    setTooltip("level-text", getLevelTooltip);

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
        { show_if: () => character.global_flags.inner_qi_unlocked, fit_text: true }
    );

    bindDisplay("realm_body", "realm-body-line",
        () => t("body_cultivation.realms.mortal_body"),
        { show_if: () => character.global_flags.body_cultivation_unlocked, fit_text: true }
    );

    initBars();

    bindDisplay("ranking", "ranking-line",
        () => {
            const rank = character.getRanking();
            const tier = getLeagueTier(character.current_world, rank);
            return tHTML("ui.stats_box.ranking_text", {
                world: t(`locations.worlds.${character.current_world}`),
                rank: styledSpan("league", tier, `#${formatNumber(rank, ranking_max_digits, 0)}`),
            });
        },
        { html: true, fit_text: true }
    );

    initStatGroups();
    applyCompactSettings();
    initTitleDropdown();
}