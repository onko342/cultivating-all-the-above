"use strict";

import { character } from "../character.js";
import { updateDisplay } from "../display.js";

export const leveling = {};
leveling.character_level = 0;
leveling.current_xp = 0;

//Level thresholds for each letter rank. Add new ranks at the end as their XP progressions get defined.
leveling.rank_thresholds = [
    { min_level: 0, rank: "h"},
    { min_level: 1, rank: "g" },
    { min_level: 10, rank: "f" },
    { min_level: 40, rank: "e" },
    { min_level: 100, rank: "d" },
    { min_level: 250, rank: "c" },
    { min_level: 1000, rank: "b" },
    { min_level: 3000, rank: "a" },
    { min_level: 10000, rank: "s" },
    { min_level: 50000, rank: "ss" },
    { min_level: 250000, rank: "sss" },
];

leveling.getRank = function (level) {
    let result = leveling.rank_thresholds[0].rank;
    for (const threshold of leveling.rank_thresholds) {
        if (level >= threshold.min_level) result = threshold.rank;
    }
    return result;
}

leveling.getXPToLevel = function (level) {
    if (level < 10) {
        // G-rank progression: Lv. 0-9 (0 is H)
        return Math.floor(10 * 1.6 ** level);
    } else if (level < 40) {
        // F-rank progression: Lv. 10-39
        return Math.floor(10 * (1.6 ** 9) * (1.2 ** (level - 9)));
    } else if (level < 100) {
        // E-rank progression: Lv. 40-99
        return Math.floor(10 * (1.6 ** 9) * (1.2 ** 30) * (1.1 ** (level - 39)));
    } else if (level < 250) {
        // D-rank progression: Lv. 100-249
        return Math.floor(10 * (1.6 ** 9) * (1.2 ** 30) * (1.1 ** 60) * (1.03 ** (level - 99)));
    } else {
        console.warn(`XP requirement of level ${level} is not defined yet! Defaulted to NaN`);
        return Number.POSITIVE_INFINITY;
    }
    // [OLD FORMULA] level 0 -> 1 needs 10 xp, 11 for next, ..., 10 -> 11 is 20, 11 -> 12 needs 22...
    // return 10 * (2 ** Math.floor(level / 10)) * (1 + 0.1 * (level % 10));
}

leveling.addXP = function (XP) {
    leveling.current_xp += XP;
    let leveled_up = false;
    while (leveling.current_xp >= leveling.getXPToLevel(leveling.character_level)) {
        leveling.current_xp -= leveling.getXPToLevel(leveling.character_level);
        leveling.character_level += 1;
        leveled_up = true;
    }
    if (leveled_up) updateDisplay("level");
    updateDisplay("bar_xp");
    // call character data refreshing function here
}

// redundant since I'll likely have to use the level_xp value anyway in log messages whenever scaled xp is added
// leveling.addScaledXP = function (XP) {
//     leveling.addRawXP(XP * character.stats.total.level_xp);
// }