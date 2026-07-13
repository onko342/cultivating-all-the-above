"use strict";

export const settings = {
    language: "en-us",
    number_type: "standard", //allowed values: "standard", "chinese_t", "chinese_s", "scientific", "emoji"
    //other settings here
}

settings.setSetting = function (key, value) {
    settings[key] = value;
}