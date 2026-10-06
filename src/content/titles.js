"use strict";

import { t } from "../localization.js";

export const titles = {};

class Title {
    constructor({
        title_id = "default_id", // nothing should use this id
        name_key = "default_name",
        description = () => { return t("titles.description.default_description") }, // Made a function to allow more in depth manipulation of description. May allow for differences in sentence structure between languages to be implemented with minimal effort.
        rarity = 0, // 0 = common, 1 = uncommon, 2 = rare, 3 = epic, 4 = legendary, 5 = mythic, 6 = transcendental, 7 = divine
        effects, // planned to include global flags, stat increases, xp multipliers, and boosts for progression systems
        secret = false,
    }) {
        this.title_id = title_id;
        this.name_key = name_key;
        this.description = description;
        this.rarity = rarity;
        this.effects = effects;
        this.secret = secret;
    }
}

(function () {
    titles["placeholder"] = new Title({
        title_id: "placeholder",
        name_key: "placeholder",
        description: () => {
            return t("titles.description.placeholder_1");
        },
        rarity: 7,
        effects: {
            stats: {
                multiplier: {
                    level_xp: 10,
                    all_skill_xp: 10,
                }
            },
            flags: ["developer"]
        },
        secret: true,
    });
    titles["system_awakened"] = new Title({
        title_id: "system_awakened",
        name_key: "system_awakened",
        description: () => {
            return t("titles.description.system_awakened");
        },
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
        name_key: "common_test",
        description: () => {
            return t("titles.description.common_test");
        },
        rarity: 0,
        effects: {},
        secret: true,
    });
    titles["uncommon_test"] = new Title({
        title_id: "uncommon_test",
        name_key: "uncommon_test",
        description: () => {
            return t("titles.description.uncommon_test");
        },
        rarity: 1,
        effects: {},
        secret: true,
    });
    titles["rare_test"] = new Title({
        title_id: "rare_test",
        name_key: "rare_test",
        description: () => {
            return t("titles.description.rare_test");
        },
        rarity: 2,
        effects: {},
        secret: true,
    });
    titles["epic_test"] = new Title({
        title_id: "epic_test",
        name_key: "epic_test",
        description: () => {
            return t("titles.description.epic_test");
        },
        rarity: 3,
        effects: {},
        secret: true,
    });
    titles["legendary_test"] = new Title({
        title_id: "legendary_test",
        name_key: "legendary_test",
        description: () => {
            return t("titles.description.legendary_test");
        },
        rarity: 4,
        effects: {},
        secret: true,
    });
    titles["mythic_test"] = new Title({
        title_id: "mythic_test",
        name_key: "mythic_test",
        description: () => {
            return t("titles.description.mythic_test");
        },
        rarity: 5,
        effects: {},
        secret: true,
    });
    titles["transcendental_test"] = new Title({
        title_id: "transcendental_test",
        name_key: "transcendental_test",
        description: () => {
            return t("titles.description.transcendental_test");
        },
        rarity: 6,
        effects: {},
        secret: true,
    });
    titles["divine_test"] = new Title({
        title_id: "divine_test",
        name_key: "divine_test",
        description: () => {
            return t("titles.description.divine_test");
        },
        rarity: 7,
        effects: {},
        secret: true,
    });
})();