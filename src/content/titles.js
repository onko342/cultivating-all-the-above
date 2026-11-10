"use strict";

import { t } from "../localization.js";

export const titles = {};

class Title {
    //Name and description text live in the locale files at titles.<title_id>.name and titles.<title_id>.description
    constructor({
        title_id = "default_id", // nothing should use this id
        description = null, // optional override: a function returning the description text, for descriptions that depend on gameplay state
        rarity = 0, // 0 = common, 1 = uncommon, 2 = rare, 3 = epic, 4 = legendary, 5 = mythic, 6 = transcendental, 7 = divine
        effects, // planned to include global flags, stat increases, xp multipliers, and boosts for progression systems
        secret = false,
    }) {
        this.title_id = title_id;
        this.description = description ?? (() => t(`titles.${title_id}.description`));
        this.rarity = rarity;
        this.effects = effects;
        this.secret = secret;
    }

    getName() {
        return t(`titles.${this.title_id}.name`);
    }
}

(function () {
    titles["placeholder"] = new Title({
        title_id: "placeholder",
        rarity: 7,
        effects: {
            stats: {
                multiplier: {
                    level_xp: 10,
                    all_skill_xp: 10,
                }
            },
            flags: ["developer"], //unlocks developer-only actions/locations for debugging?
            perks: ["useless_perk"]
        },
        secret: true,
    });
    titles["system_awakened"] = new Title({
        title_id: "system_awakened",
        rarity: 2,
        effects: {
            stats: {
                multiplier: {
                    level_xp: 1.1,
                    all_skill_xp: 1.1,
                    luck: 1.05,
                }
            }
        }
    });
    titles["common_test"] = new Title({
        title_id: "common_test",
        rarity: 0,
        effects: {},
        secret: true,
    });
    titles["uncommon_test"] = new Title({
        title_id: "uncommon_test",
        rarity: 1,
        effects: {},
        secret: true,
    });
    titles["rare_test"] = new Title({
        title_id: "rare_test",
        rarity: 2,
        effects: {},
        secret: true,
    });
    titles["epic_test"] = new Title({
        title_id: "epic_test",
        rarity: 3,
        effects: {},
        secret: true,
    });
    titles["legendary_test"] = new Title({
        title_id: "legendary_test",
        rarity: 4,
        effects: {},
        secret: true,
    });
    titles["mythic_test"] = new Title({
        title_id: "mythic_test",
        rarity: 5,
        effects: {},
        secret: true,
    });
    titles["transcendental_test"] = new Title({
        title_id: "transcendental_test",
        rarity: 6,
        effects: {},
        secret: true,
    });
    titles["divine_test"] = new Title({
        title_id: "divine_test",
        rarity: 7,
        effects: {},
        secret: true,
    });
})();