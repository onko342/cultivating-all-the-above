"use strict";

import { character } from "../character.js";

export const leveling = {};
leveling.character_level = 0;
leveling.current_xp = 0;
leveling.getXPToLevel = function (level) {
    if (level < 10) {
        // G-rank progression: Lv. 0-9
        return Math.floor(10 * 1.6 ** level);
    } else if (level < 40) {
        // F-rank progression: Lv. 10-39
        return Math.floor(10 * (1.6 ** 9) * (1.2 ** (level - 9)));
    } else if (level < 100) {
        // E-rank progression: Lv. 40-99
        return Math.floor(10 * (1.6 ** 9) * (1.2 ** 30) * (1.1 ** (level - 39)));
    } else {
        throw new Error(`XP requirement of level ${level} is not defined yet!`);
        return NaN;
    }
    // [OLD FORMULA] level 0 -> 1 needs 10 xp, 11 for next, ..., 10 -> 11 is 20, 11 -> 12 needs 22...
    // return 10 * (2 ** Math.floor(level / 10)) * (1 + 0.1 * (level % 10));
}

leveling.addXP = function (XP) {
    leveling.current_xp += XP;
    while (leveling.current_xp >= leveling.getXPToLevel(leveling.character_level)) {
        leveling.current_xp -= leveling.getXPToLevel(leveling.character_level);
        leveling.character_level += 1;
    }
    // call character data refreshing function here
}

// redundant since I'll likely have to use the level_xp value anyway in log messages whenever scaled xp is added
// leveling.addScaledXP = function (XP) {
//     leveling.addRawXP(XP * character.stats.full.level_xp);
// }