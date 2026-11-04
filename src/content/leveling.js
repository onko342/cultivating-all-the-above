"use strict";

import { character } from "../character.js";
import { updateDisplay } from "../display.js";
import { refreshTooltip } from "../tooltip.js";

export const leveling = {};
leveling.character_level = 0;
leveling.current_xp = 0;

//Level ranges for each letter rank, lowest first. Each rank is split into subranks, listed lowest first.
//A subrank starts at its min_level and lasts until the next subrank (or the next rank) starts.
//suffix is added after the rank letter in displays ("" = the plain rank, e.g. "F-", "F", "F+").
//The first subrank's min_level is also where the rank itself starts. Add new ranks at the end as their XP progressions get defined.
leveling.rank_thresholds = [
    { rank: "h", subranks: [{ min_level: 0, suffix: "" }] },
    {
        rank: "g", subranks: [
            { min_level: 1, suffix: "-" },
            { min_level: 4, suffix: "" },
            { min_level: 7, suffix: "+" },
        ]
    },
    {
        rank: "f", subranks: [
            { min_level: 10, suffix: "-" },
            { min_level: 20, suffix: "" },
            { min_level: 30, suffix: "+" },
        ]
    },
    {
        rank: "e", subranks: [
            { min_level: 40, suffix: "-" },
            { min_level: 60, suffix: "" },
            { min_level: 80, suffix: "+" },
        ]
    },
    {
        rank: "d", subranks: [
            { min_level: 100, suffix: "-" },
            { min_level: 130, suffix: "" },
            { min_level: 160, suffix: "+" },
            { min_level: 190, suffix: "+" },
            { min_level: 220, suffix: "++" },
        ]
    },
    {
        rank: "c", subranks: [
            { min_level: 250, suffix: "--" },
            { min_level: 400, suffix: "-" },
            { min_level: 550, suffix: "" },
            { min_level: 700, suffix: "+" },
            { min_level: 850, suffix: "++" },
        ]
    },
    {
        rank: "b", subranks: [
            { min_level: 1000, suffix: "--" },
            { min_level: 1400, suffix: "-" },
            { min_level: 1800, suffix: "" },
            { min_level: 2200, suffix: "+" },
            { min_level: 2600, suffix: "++" },
        ]
    },
    {
        rank: "a", subranks: [
            { min_level: 3000, suffix: "---" },
            { min_level: 4000, suffix: "--" },
            { min_level: 5000, suffix: "-" },
            { min_level: 6000, suffix: "" },
            { min_level: 7000, suffix: "+" },
            { min_level: 8000, suffix: "++" },
            { min_level: 9000, suffix: "+++" },
        ]
    },
    {
        rank: "s", subranks: [
            { min_level: 10000, suffix: "---" },
            { min_level: 15000, suffix: "--" },
            { min_level: 20000, suffix: "-" },
            { min_level: 25000, suffix: "" },
            { min_level: 30000, suffix: "+" },
            { min_level: 35000, suffix: "++" },
            { min_level: 40000, suffix: "+++" },
            { min_level: 45000, suffix: "✦"}
        ]
    },
    {
        rank: "ss", subranks: [
            { min_level: 50000, suffix: "---" },
            { min_level: 75000, suffix: "--" },
            { min_level: 100000, suffix: "-" },
            { min_level: 125000, suffix: "" },
            { min_level: 150000, suffix: "+" },
            { min_level: 175000, suffix: "++" },
            { min_level: 200000, suffix: "+++" },
            { min_level: 225000, suffix: "✦" },
        ]
    },
    {
        rank: "sss", subranks: [
            { min_level: 250000, suffix: "---" },
            { min_level: 325000, suffix: "--" },
            { min_level: 400000, suffix: "-" },
            { min_level: 475000, suffix: "" },
            { min_level: 550000, suffix: "+" },
            { min_level: 625000, suffix: "++" },
            { min_level: 700000, suffix: "+++" },
            { min_level: 775000, suffix: "✦" },
            { min_level: 850000, suffix: "✦✦" },
            { min_level: 925000, suffix: "✦✦✦" },
        ]
    },
    //Far future: U rank starting from 1 million
];

//All subranks of all ranks in one list, lowest first: [{ rank, suffix, min_level }, ...]
leveling.getSubranks = function () {
    return leveling.rank_thresholds.flatMap(({ rank, subranks }) =>
        subranks.map(({ min_level, suffix }) => ({ rank, suffix, min_level })));
};

//The subrank a level is in: { rank, suffix, min_level, next } where next is the following subrank (or null at the very top)
leveling.getSubrank = function (level) {
    const subranks = leveling.getSubranks();
    let index = 0;
    subranks.forEach((subrank, i) => {
        if (level >= subrank.min_level) index = i;
    });
    return { ...subranks[index], next: subranks[index + 1] ?? null };
};

leveling.getRank = function (level) {
    return leveling.getSubrank(level).rank;
};

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
    if (leveled_up) {
        updateDisplay("level");
        refreshTooltip();
    }
    updateDisplay("bar_xp");
    // call character data refreshing function here
}

// redundant since I'll likely have to use the level_xp value anyway in log messages whenever scaled xp is added
// leveling.addScaledXP = function (XP) {
//     leveling.addRawXP(XP * character.stats.total.level_xp);
// }