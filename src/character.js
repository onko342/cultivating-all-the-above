"use strict";

import { InventoryOwner } from "./content/inventory.js";
import { titles } from "./content/titles.js";
import { t } from "./localization.js"

class Player extends InventoryOwner {
    constructor() {
        super();
    }
}

export const character = new Player();
character.name = "Player";
character.race = "human";
character.gender = "male";
character.height = 170;
character.titles = ["system_awakened"];
character.selected_title = "";
//World variable here only temporarily, all associated logic must reference locations.js when that is built.
character.current_world = "modern";
character.base_stats = {
    //resource stats (many things contribute)
    max_health: 100, //change to 0 when basic health conversion from stats is added (mostly constitution, a little strength)
    health: 100,
    health_regen_flat: 0, //_flat: base regen always active
    health_regen_proportion: 0, //_proportion: multiple of max always regenerated
    health_regen_flat_idle: 0, //_flat_idle: additional flat regen when not in combat
    health_regen_proportion_idle: 0.02, //_proportion_idle: additional regen proportion not in combat, default 50 seconds to recover to full

    max_stamina: 100, //change to 0 when basic stamina conversion from stats is added (mostly agility, less of constitution)
    stamina: 100,
    stamina_regen_flat: 0,
    stamina_regen_proportion: 0,
    stamina_regen_flat_idle: 0,
    stamina_regen_proportion_idle: 0.03, //default 33.33 seconds to recover to full out of combat

    max_mana: 0,
    mana: 0,
    mana_regen_flat: 0,
    mana_regen_proportion: 0,
    mana_regen_flat_idle: 0,
    mana_regen_proportion_idle: 0.01, //default 100 seconds to recover to full out of combat

    //since cultivation is locked by default, qi, and therefore inner qi, is locked as well. lock variables moved to global flags
    max_inner_qi: 0,
    inner_qi: 0,
    inner_qi_regen_flat: 0,
    inner_qi_regen_proportion: 0,
    inner_qi_regen_flat_idle: 0,
    inner_qi_regen_proportion_idle: 0, //qi by default doesn't recover on its own, you need to be in the cultivation world for it

    //spirit is unlocked when detecting the soul or receiving a soul attack
    max_spirit: 1, //change to 0 when soul stat conversion (resilience) added
    spirit: 1,
    spirit_regen_flat: 0,
    spirit_regen_proportion: 0,
    spirit_regen_flat_idle: 0,
    spirit_regen_proportion_idle: 0.002, //default 500 seconds to recover to full out of combat. It's really hard to recover damage to the soul! Sleep it off.

    //body stats
    strength: 10,
    constitution: 10,
    agility: 10,

    //essence stats
    affinity: 0,
    capacity: 0,
    flow: 0,

    //mind stats, only unlocked when the soul is learned
    ego: 1,
    resilience: 1,
    charm: 1,

    //special stats
    luck: 1, //drop rate, possibly affects other luck-based events?
    talent: 1, //ease of cultivation (separate from leveling)
    comprehension: 1, //raw intellect, how easy it is for you to learn things (not skill xp multiplier, this contributes but is not the only factor and may be directly used in checks)

    //derived stats
    physical_attack: 0,
    physical_effectiveness: { //based on weapon and other factors, multiplies physical attack to get damage of each type
        slash: 0,
        pierce: 0,
        blunt: 0,
    },
    mystical_attack: 0,
    mystical_effectiveness: { //based on mystical mastery, multiplies mystical attacks/quantifiable effects to get total damage/other effects of each type
        metal: 0,
        wood: 0,
        water: 0,
        fire: 0,
        earth: 0,
        dark: 0,
        light: 0,
        wind: 0,
        lightning: 0,
        ice: 0,
    },
    soul_attack: 0,
    attack_power: 0, //aggregate of all damage of current normal attack, must be calculated AFTER the above attack stats
    attack_speed: 1, //physical attack rate
    cast_speed: 1, //magic/cultivation technique use time reduction
    defense: 0,
    defense_proportion: 0,
    hit_score: 0,
    dodge_score: 0,
    crit: 1, //score compared against enemy crit_prot to find crit chance
    crit_prot: 1, //score compared against enemy crit to reduce their crit chance
    crit_mult: 1.3, //possible change to system like the two variables above?
    def_penetration: 0,
    def_penetration_proportion: 0,

    //progression modifiers
    level_xp: 1,
    all_skill_xp: 1, //comprehension * system-specific boosts such as levels
    cultivation_qi: 1,
}
character.stats = {};
character.stats.total = structuredClone(character.base_stats);

character.misc_stats = {
    //total kill count isn't listed here since it's to be summed from enemies
    death_count: 0,
    playtime: 0,
    //total ingame time passed not listed here
    //total craft count summed from recipes, not listed here
    //total craft fail count same as above
    total_money_earned: 0,
    items_gained: 0, //increment by 1 for every time an item is gained, this should equal the bottom 4 summed
    items_from_drops: 0, //only enemy drops here
    items_from_crafts: 0, //from crafting, some recipes may craft multiple items at a time
    items_from_traders: 0, //bought
    items_from_rewards: 0, //storyline rewards, etc.
}

character.stats.flat_bonuses = {
    //flat, fixed magnitude bonuses that add with each other

    //format: stat first then source category
    //example:
    //strength: { level: 123 }
    //for nested stats:
    //physical_attack.slash: { equipment: 69420 }
}

character.stats.percent_bonuses = {
    //multiply all flat stats, but individial percent bonuses add with each other (30% + 30% = 60% = 1.6x flat stats)
}

character.stats.multiplier_bonuses = {
    //multiply stats after percents, multipliers multiply with each other (1.3x * 1.3x = 1.69x stats)
}

character.stats.exponent_bonuses = {
    //too broken for anything to be added here right now
    //theoretically, exponent bonuses multiply each other due to the properties of exponents ((x^1.1)^1.1 = x^1.21)
}

character.stats.final_flat_bonuses = {
    //same as flat_bonuses from earlier but applies after everything that's not final, otherwise they follow the same order of execution
    //the other final bonuses are self-explanatory
}

character.stats.final_percent_bonuses = {

}

character.stats.final_multiplier_bonuses = {

}

character.stats.final_exponent_bonuses = {

}

character.box_unlocks = {
    stats_box: false,
    inventory_box: false,
    skills_box: false,
    log_box: false,
    location_top_box: false,
    cultivation_box: false,
    misc_box: false,
    //add other UI unlocks here
}

character.tab_unlocks = {

}

character.global_flags = {
    //note: flags don't update displays by themselves, updateDisplay or updateAllDisplays has to be called whenever the flag is set
    //flags are for important gameplay triggers and story progression, not for skill/title/progression perks!
    //directly included in saves
    character_creation_complete: false,
    inner_qi_unlocked: false,
    body_cultivation_unlocked: false,
    spirit_unlocked: false,
    mind_stats_unlocked: false,
    //don't give the developer flag during real gameplay, also leave this flag and other similar ones at the bottom below this comment
    developer: false,
}

character.perks = {
    //possible sources: skills, titles, cultivation, ...
    //list perks as all false here to prevent perks from being undefined or lost in the code
    //key difference between flags and perks:
    //  - perks have descriptions and flags do not
    //  - perks often directly modify aspects of mechanics
    //  - [IMPORTANT] perks are to be directly compiled from other saved gameplay data on load, not directly saved
    useless_perk: { //does nothing
        status: false,
        description: () => { return t("perks.useless_perk.description"); },
    }
}

//Which sources currently grant perks, e.g. { titles: Set(["useless_perk"]) }. Perk statuses are recompiled from this, never saved.
character.perk_sources = { titles: new Set() };

character.refreshPerks = function () {
    Object.entries(character.perks).forEach(([perk_key, perk]) => {
        perk.status = Object.values(character.perk_sources).some((source) => source.has(perk_key));
    });
}

character.unlockBox = function (key) {
    character.box_unlocks[key] = true;
}

character.setFlag = function (key, state) {
    character.global_flags[key] = state;
}

//Stats that hold a current amount instead of a calculated value. Recalculation leaves these alone.
const current_amount_stats = ["health", "stamina", "mana", "inner_qi", "spirit"];

function getStatPath(object, path) {
    return path.split(".").reduce((value, key) => (value === undefined || value === null) ? undefined : value[key], object);
}

function setStatPath(object, path, value) {
    const keys = path.split(".");
    const last_key = keys.pop();
    keys.reduce((parent, key) => parent[key], object)[last_key] = value;
}

//Paths of every number inside a (possibly nested) stats object, nested ones joined with dots: "physical_attack.slash"
function listStatPaths(object, prefix = "") {
    return Object.entries(object).flatMap(([key, value]) => {
        if (typeof value === "number") return [prefix + key];
        if (value !== null && typeof value === "object") return listStatPaths(value, `${prefix}${key}.`);
        return [];
    });
}

//bonus tables are stat first, then source: { strength: { level: 123, titles: 5 } }
function sumBonuses(table, stat_key) {
    return Object.values(table[stat_key] ?? {}).reduce((sum, value) => sum + value, 0);
}

function multiplyBonuses(table, stat_key) {
    return Object.values(table[stat_key] ?? {}).reduce((product, value) => product * value, 1);
}

//Flat bonuses, then percents (added together, 30 = +30%), then multipliers, then exponents (multiplied together)
function applyBonusStage(value, stat_key, flat, percent, multiplier, exponent) {
    value = (value + sumBonuses(flat, stat_key)) * (1 + sumBonuses(percent, stat_key) / 100);
    value *= multiplyBonuses(multiplier, stat_key);
    return value ** multiplyBonuses(exponent, stat_key);
}

character.calculateStat = function (stat_key) {
    const bonuses = character.stats;
    let value = getStatPath(character.base_stats, stat_key);
    value = applyBonusStage(value, stat_key, bonuses.flat_bonuses, bonuses.percent_bonuses, bonuses.multiplier_bonuses, bonuses.exponent_bonuses);
    //derived stat conversions (e.g. constitution -> max health) will go here, between the normal and final bonuses
    return applyBonusStage(value, stat_key, bonuses.final_flat_bonuses, bonuses.final_percent_bonuses, bonuses.final_multiplier_bonuses, bonuses.final_exponent_bonuses);
}

character.recalculateStats = function () {
    listStatPaths(character.base_stats).forEach((stat_key) => {
        if (current_amount_stats.includes(stat_key)) return;
        setStatPath(character.stats.total, stat_key, character.calculateStat(stat_key));
    });
}

//PLACEHOLDER: returns the character's ranking position in a world (1 = strongest).
//Will eventually use combat power and the world's population. For now it's a fixed starting rank.
character.getRanking = function (world = character.current_world) {
    return 2.4e12;
}