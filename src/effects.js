"use strict";

import { character } from "./character.js";
import { titles } from "./content/titles.js";
import { updateAllDisplays } from "./display.js";

//Title effects are applied to the character under this source name in the bonus tables and perk sources
const effect_source = "titles";

//Kinds of stat effects a title can have: which bonus table they go into and how several of the same kind combine
const stat_effect_types = {
    flat: { table: "flat_bonuses", start: 0, combine: (a, b) => a + b },
    percent: { table: "percent_bonuses", start: 0, combine: (a, b) => a + b }, //in percentage points: 3 = +3%
    multiplier: { table: "multiplier_bonuses", start: 1, combine: (a, b) => a * b },
};

//Adds up the effects of every owned title into one combined set, using the same rules as the stat calculation
export function gatherTitleEffects() {
    const combined = {
        stats: { flat: {}, percent: {}, multiplier: {} },
        perks: new Set(),
        flags: new Set(),
    };

    character.titles.forEach((title_id) => {
        const effects = titles[title_id]?.effects;
        if (!effects) return;

        Object.entries(stat_effect_types).forEach(([type, { start, combine }]) => {
            Object.entries(effects.stats?.[type] ?? {}).forEach(([stat_key, value]) => {
                combined.stats[type][stat_key] = combine(combined.stats[type][stat_key] ?? start, value);
            });
        });
        (effects.perks ?? []).forEach((perk_key) => combined.perks.add(perk_key));
        (effects.flags ?? []).forEach((flag_key) => combined.flags.add(flag_key));
    });

    return combined;
}

//Writes a combined set of title effects into the character's bonus tables, perk sources and flags
function applyTitleEffects(combined) {
    //stats: wipe what titles contributed last time, then write the new totals
    Object.values(stat_effect_types).forEach(({ table }) => {
        const bonus_table = character.stats[table];
        Object.keys(bonus_table).forEach((stat_key) => {
            delete bonus_table[stat_key][effect_source];
            if (Object.keys(bonus_table[stat_key]).length === 0) delete bonus_table[stat_key];
        });
    });
    Object.entries(stat_effect_types).forEach(([type, { table }]) => {
        Object.entries(combined.stats[type]).forEach(([stat_key, value]) => {
            if (!(stat_key.split(".")[0] in character.base_stats)) {
                console.warn(`[effects] A title has a ${type} effect on unknown stat "${stat_key}"`);
                return;
            }
            (character.stats[table][stat_key] ??= {})[effect_source] = value;
        });
    });

    //perks: statuses are recompiled from the sources in character.refreshPerks()
    const known_perks = new Set();
    combined.perks.forEach((perk_key) => {
        if (perk_key in character.perks) known_perks.add(perk_key);
        else console.warn(`[effects] A title grants unknown perk "${perk_key}"`);
    });
    character.perk_sources[effect_source] = known_perks;

    //flags: only ever switched on here, since other things can set flags too
    combined.flags.forEach((flag_key) => {
        if (flag_key in character.global_flags) character.setFlag(flag_key, true);
        else console.warn(`[effects] A title sets unknown flag "${flag_key}"`);
    });
}

//Re-applies every effect source to the character, recalculates the stats and refreshes the displays.
//Call on load, whenever titles change, and after changing base stats.
export function recalculateEffects() {
    applyTitleEffects(gatherTitleEffects());
    character.recalculateStats();
    character.refreshPerks();
    updateAllDisplays();
}

//Gives the character a title (if they don't have it yet) and applies its effects. Returns whether it was newly added.
export function addTitle(title_id) {
    if (!titles[title_id]) {
        console.warn(`[effects] Tried to add unknown title "${title_id}"`);
        return false;
    }
    if (character.titles.includes(title_id)) return false;
    character.titles.push(title_id);
    recalculateEffects();
    return true;
}