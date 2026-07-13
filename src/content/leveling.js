"use strict";

export const leveling = {};
leveling.character_level = 0;
leveling.current_xp = 0;
leveling.getXPToLevel = function (level) {
    //level 0 -> 1 needs 10 xp, 11 for next, ..., 10 -> 11 is 20, 11 -> 12 needs 22...
    return 10 * (2 ** Math.floor(level / 10)) * (1 + 0.1 * (level % 10));
}