"use strict";

import { character } from "./character.js";
import { titles } from "./content/titles.js";
import { leveling } from "./content/leveling.js";
import { getRarityName } from "./content/rarities.js";
import { bindDisplay, bindVisibility, bindBar, updateDisplay, setStyleClass, formatNumber, applyCompactSettings, styledSpan } from "./display.js";
import { t, tHTML, unwrapHTML, escapeHTML } from "./localization.js";
import { settings } from "./content/settings.js";
import { getLeagueTier } from "./content/ranking.js";
import { setTooltip, hideTooltip } from "./tooltip.js";
import { recalculateEffects } from "./effects.js";

function getSelectedTitle() {
    return titles[character.selected_title] ?? null; //null if nothing is selected or id no longer exists
}

function getTitleName(title) {
    return title.getName();
}

function selectTitle(title_id) {
    character.selected_title = title_id;
    //title effects don't depend on which title is selected, but re-applying them keeps everything in sync.
    //This also refreshes every display, including the title line.
    recalculateEffects();
}

//formatNumber truncates, so float noise like 1.15 * 100 = 114.99999999999999 would turn 1.15 into 1.14.
//This rounds the noise away and nudges the value up a hair first.
function cleanNumber(value) {
    return Math.round(value * 1e6) / 1e6 + 1e-9;
}

function formatSigned(value, decimals = 2) {
    return `${value < 0 ? "-" : "+"}${formatNumber(cleanNumber(Math.abs(value)), 6, decimals)}`;
}

//Stat bonuses and perks of a title as tooltip sections. Flags are deliberately not shown.
function getTitleEffectSections(title) {
    const effects = title.effects ?? {};
    const stat_effects = effects.stats ?? {};
    const sections = [];

    const stat_rows = [];
    Object.entries(stat_effects.flat ?? {}).forEach(([stat_key, value]) => {
        stat_rows.push([escapeHTML(getStatLongName(stat_key)), formatSigned(value)]);
    });
    Object.entries(stat_effects.percent ?? {}).forEach(([stat_key, value]) => {
        stat_rows.push([escapeHTML(getStatLongName(stat_key)), `${formatSigned(value)}%`]);
    });
    Object.entries(stat_effects.multiplier ?? {}).forEach(([stat_key, value]) => {
        stat_rows.push([escapeHTML(getStatLongName(stat_key)), escapeHTML(t("tooltips.effects.multiplier_value", { value: formatNumber(cleanNumber(value)) }))]);
    });
    if (stat_rows.length > 0) {
        sections.push({ heading: t("tooltips.effects.stat_bonuses"), rows: stat_rows });
    }

    const perk_items = (effects.perks ?? [])
        .filter((perk_key) => character.perks[perk_key])
        .map((perk_key) => [escapeHTML(t(`perks.${perk_key}.name`)), escapeHTML(character.perks[perk_key].description())]);
    if (perk_items.length > 0) {
        sections.push({ heading: t("tooltips.effects.perks"), items: perk_items });
    }

    return sections;
}

//title_id "" (or an id that no longer exists) is the "no title" case
function getTitleTooltip(title_id) {
    const title = titles[title_id];
    if (!title) {
        return {
            title: tHTML("tooltips.titles.no_title.title"),
            body: tHTML("tooltips.titles.no_title.description"),
        };
    }
    const rarity_name = getRarityName(title.rarity);
    return {
        title: unwrapHTML(styledSpan("rarity", rarity_name, getTitleName(title))),
        body: escapeHTML(title.description()),
        tag: tHTML("tooltips.titles.rarity_line", {
            rarity: styledSpan("rarity", rarity_name, t(`rarities.${rarity_name}`)),
        }),
        sections: getTitleEffectSections(title),
    };
}

function initTitleDropdown() {
    const wrapper = document.getElementById("title-select");
    const button = document.getElementById("title-select-button");
    const list = document.getElementById("title-select-list");

    function closeList() {
        if (list.hidden) return;
        list.hidden = true;
        hideTooltip(); //the hovered option vanishes with the list, so its mouseout would never fire
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
        setTooltip(item, () => getTitleTooltip(title_id));
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

    setTooltip(button, () => getTitleTooltip(character.selected_title));
    button.addEventListener("click", () => {
        hideTooltip(); //so the button's tooltip doesn't sit on top of the list
        list.hidden ? openList() : closeList();
    });
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
        resource: current_stat, //the resource's name inside stat keys, e.g. "health" for "health_regen_flat"
        getCurrent: () => character.stats.total[current_stat],
        getMax: () => character.stats.total[max_stat],
        //stats whose sources are broken down in the tooltip, and stats only listed by value
        breakdown_stats: [max_stat, `${current_stat}_regen_flat`, `${current_stat}_regen_proportion`],
        related_stats: [`${current_stat}_regen_flat_idle`, `${current_stat}_regen_proportion_idle`],
    };
}

//Bars in display order. show_if null = always visible.
//pair = key of the bar it shares a row with in the compact layout (must match the rows in index.html)
const bar_definitions = [
    {
        key: "xp",
        show_if: null,
        pair: null,
        resource: null, //no regeneration
        getCurrent: () => leveling.current_xp,
        getMax: () => leveling.getXPToLevel(leveling.character_level),
        breakdown_stats: ["level_xp", "all_skill_xp"],
        related_stats: [],
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

//Regeneration shown as "+1.5" or "-2" (more decimals for tiny amounts so they don't show up as 0)
function formatRegenAmount(amount, max_digits = 6) {
    const decimals = Math.abs(amount) >= 1 ? 2 : 4;
    return `${amount < 0 ? "-" : "+"}${formatNumber(cleanNumber(Math.abs(amount)), max_digits, decimals)}`;
}

function getBarRegen(definition) {
    return definition.resource ? character.getRegenPerSecond(definition.resource).total : 0;
}

//"{Resource} Balance": how the regeneration parts add up to the amount regenerated per second
function getBalanceSection(definition) {
    const regen = character.getRegenPerSecond(definition.resource);
    const rows = regen.parts
        .filter((part) => part.amount !== 0)
        .map((part) => [
            escapeHTML(t(`tooltips.balance.${part.key}`, part.rate === undefined ? {} : { percent: formatStatValue(part.stat, part.rate) })),
            escapeHTML(t("tooltips.balance.per_second", { amount: formatRegenAmount(part.amount) })),
        ]);
    return {
        heading: tHTML("tooltips.balance.heading", { resource: t(`tooltips.bars.${definition.key}.name`) }),
        table: {
            rows: rows,
            foot: [
                escapeHTML(t("tooltips.breakdown.total")),
                escapeHTML(t("tooltips.balance.per_second", { amount: formatRegenAmount(regen.total) })),
            ],
        },
    };
}

//Descriptions live in locales under tooltips.bars.<bar key>
function getBarTooltip(definition) {
    const sections = definition.breakdown_stats.map((stat_key) => getStatSourcesSection(stat_key));
    if (definition.related_stats.length > 0) sections.push(getRelatedStatsSection(definition.related_stats));
    if (definition.resource) sections.push(getBalanceSection(definition));
    return {
        title: tHTML(`tooltips.bars.${definition.key}.name`),
        body: tHTML(`tooltips.bars.${definition.key}.description`),
        sections: sections,
    };
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
                let text = t("ui.stats_box.bar_text", {
                    name: t(`ui.stats_box.bar_name_${key}`),
                    current: formatNumber(getCurrent(), max_digits, 0),
                    max: Number.isFinite(getMax()) ? formatNumber(getMax(), max_digits, 0) : "∞", //XP to level is Infinity past the last defined level
                });
                const regen = getBarRegen(definition);
                if (Number.isFinite(regen) && regen !== 0) {
                    text += " " + t("ui.stats_box.bar_regen", { amount: formatRegenAmount(regen, max_digits) });
                }
                return text;
            },
        });
        setTooltip(`bar-${key}`, () => getBarTooltip(definition));
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


//Long names are for places with room to spare (tooltips, detailed stats page)
function getStatLongName(stat_key) {
    return t(`stats.long_name.${stat_key}`);
}

//Proportion stats (regen rates, damage reduction...) are stored as fractions (0.02) but shown as percentages (2%)
function isProportionStat(stat_key) {
    return /_proportion(_idle)?$/.test(stat_key);
}

//A stat's value as shown in tooltips. signed adds a + (or -) for bonuses; leave it off for base and total values.
function formatStatValue(stat_key, value, { signed = false } = {}) {
    const is_proportion = isProportionStat(stat_key);
    const shown = is_proportion ? value * 100 : value;
    const sign = shown < 0 ? "-" : (signed ? "+" : "");
    const text = formatNumber(cleanNumber(Math.abs(shown)), 6, is_proportion ? 3 : 2);
    return `${sign}${text}${is_proportion ? "%" : ""}`;
}

//One bonus value, written by its kind: +N, +N%, xN or ^N
function formatBonus(stat_key, kind, value) {
    if (kind === "flat") return formatStatValue(stat_key, value, { signed: true });
    if (kind === "percent") return `${formatSigned(value)}%`;
    const text = formatNumber(cleanNumber(value));
    return t(kind === "multiplier" ? "tooltips.effects.multiplier_value" : "tooltips.effects.exponent_value", { value: text });
}

const empty_cell = "–";

//"Sources of {stat}": one row per source, one column per bonus type, a total row at the bottom, and a Total column
//with the final value (only when there is more than the flat column).
function getStatSourcesSection(stat_key) {
    const breakdown = character.getStatBreakdown(stat_key);
    const heading = tHTML("tooltips.breakdown.heading", { stat: getStatLongName(stat_key) });
    const base_label = escapeHTML(t("stats.source_name.base"));

    //nothing but the base value: a total row would only repeat it
    if (breakdown.sources.length === 0) {
        return { heading: heading, table: { rows: [[base_label, formatStatValue(stat_key, breakdown.base)]] } };
    }

    const columns = breakdown.columns;
    const has_total_column = columns.length > 1;
    const withTotalColumn = (cells, total_cell = "") => has_total_column ? [...cells, total_cell] : cells;

    const head = columns.length > 1
        ? withTotalColumn(["", ...columns.map((column) => escapeHTML(t(`tooltips.breakdown.${column.key}`)))], escapeHTML(t("tooltips.breakdown.total")))
        : null;

    const base_row = withTotalColumn([
        base_label,
        ...columns.map((column) => column.key === "flat" ? formatStatValue(stat_key, breakdown.base) : empty_cell),
    ]);

    const source_rows = breakdown.sources.map((source) => withTotalColumn([
        escapeHTML(t(`stats.source_name.${source}`)),
        ...columns.map((column) => column.values[source] !== undefined ? formatBonus(stat_key, column.kind, column.values[source]) : empty_cell),
    ]));

    //total row: each column's combined value (the flat column includes the base), then the final value of the stat
    const total_row = withTotalColumn([
        escapeHTML(t("tooltips.breakdown.total")),
        ...columns.map((column) => column.key === "flat"
            ? formatStatValue(stat_key, breakdown.base + column.total)
            : formatBonus(stat_key, column.kind, column.total)),
    ], formatStatValue(stat_key, breakdown.final));

    return { heading: heading, table: { head: head, rows: [base_row, ...source_rows], foot: total_row } };
}

//Other stats listed by value only, in their own section at the bottom of a tooltip
function getRelatedStatsSection(stat_keys) {
    return {
        heading: tHTML("tooltips.sections.related_stats"),
        rows: stat_keys.map((stat_key) => [
            escapeHTML(getStatLongName(stat_key)),
            formatStatValue(stat_key, character.stats.total[stat_key]),
        ]),
    };
}

//Related stats for the stats that have some. Description text lives in locales under tooltips.stats.<stat_key>
const stat_related_stats = {
    attack_power: ["physical_attack", "mystical_attack", "soul_attack", "crit", "crit_mult"],
    defense: ["defense_proportion", "crit_prot"],
};

function getStatTooltip(stat_key) {
    const sections = [getStatSourcesSection(stat_key)];
    if (stat_related_stats[stat_key]) sections.push(getRelatedStatsSection(stat_related_stats[stat_key]));
    return {
        title: escapeHTML(getStatLongName(stat_key)),
        body: tHTML(`tooltips.stats.${stat_key}`),
        sections: sections,
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
            setTooltip(slot, () => getStatTooltip(stat_key));
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

//PLACEHOLDERS: the realm lines and their tooltips are fixed to the "no cultivation" realms until realm tracking exists.
//Replace these with the character's actual realms once cultivation content is implemented.
const placeholder_realm_qi = "qi_cultivation.realms.latent_roots";
const placeholder_realm_body = "body_cultivation.realms.mortal_body";

//realm_path is the locale path of a realm, which holds its name and description
function getRealmTooltip(realm_path) {
    return {
        title: tHTML(`${realm_path}.name`),
        body: tHTML(`${realm_path}.description`),
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
        () => t(`${placeholder_realm_qi}.name`),
        { show_if: () => character.global_flags.inner_qi_unlocked, fit_text: true }
    );
    setTooltip("realm-qi-line", () => getRealmTooltip(placeholder_realm_qi));

    bindDisplay("realm_body", "realm-body-line",
        () => t(`${placeholder_realm_body}.name`),
        { show_if: () => character.global_flags.body_cultivation_unlocked, fit_text: true }
    );
    setTooltip("realm-body-line", () => getRealmTooltip(placeholder_realm_body));

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