"use strict";

export const settings = {
    language: "en-us",
    number_type: "standard", //allowed values: "standard", "chinese_t", "chinese_s", "scientific", "emoji"
    compact_realms: false, //show cultivation realms two per line
    compact_bars: false, //show ST/MP and QI/SP bars two per line (XP and HP always get their own line)
    //other settings here
}

settings.setSetting = function (key, value) {
    settings[key] = value;
}