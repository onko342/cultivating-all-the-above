"use strict";

import { InventoryOwner } from "./content/inventory.js";

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
character.titles = {};
character.base_stats = {
    //resource stats (many things contribute)
    max_health: 100,
    health: 100,
    health_regen_flat: 0, //_flat: base regen always active
    health_regen_proportion: 0, //_proportion: multiple of max always regenerated
    health_regen_flat_idle: 0, //_flat_idle: additional flat regen when not in combat
    health_regen_proportion_idle: 0.02, //_proportion_idle: additional regen proportion not in combat, default 50 seconds to recover to full

    max_stamina: 100,
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

    inner_qi_unlocked: false, //since cultivation is locked by default, qi, and therefore inner qi, is locked as well
    max_inner_qi: 0,
    inner_qi: 0,
    inner_qi_regen_flat: 0,
    inner_qi_regen_proportion: 0,
    inner_qi_regen_flat_idle: 0,
    inner_qi_regen_proportion_idle: 0, //qi by default doesn't recover on its own, you need to be in the cultivation world for it

    spirit_unlocked: false, //most cultivators can't even detect the soul, unlocked when detecting the soul through own means or receiving soul attack
    max_spirit: 1,
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

    //mind stats
    mind_unlocked: false, //these stats are not visible to those who don't know about the soul
    ego: 1,
    resilience: 1,
    charm: 1,

    //special stats
    luck: 1, //drop rate, possibly affects other luck-based events?
    talent: 1, //ease of cultivation (separate from leveling)
    comprehension: 1, //raw intellect, how easy it is for you to learn things (not skill xp multiplier, this contributes but is not the only factor and may be directly used in checks)

    //derived stats
    attack_power: 0,
    attack_speed: 1,
    defense: 0,
    defense_proportion: 0,
    crit_rate: 0.03,
    crit_mult: 1.3,
    hit_score: 0,
    dodge_score: 0,
    def_penetration: 0,
    def_penetration_proportion: 0,
};
character.stats = {};
character.stats.full = { ...character.base_stats };

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
};

character.stats.flat_bonuses = {

};

character.stats.percent_bonuses = {

};

character.stats.multiplier_bonuses = {

};

character.box_unlocks = {
    character_creation_complete: false,
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

character.unlockBox = function (key) {
    character.box_unlocks[key] = true;
}