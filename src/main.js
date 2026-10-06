"use strict";

import { character } from "./character.js";
import { updateBoxUnlocks, initTabs, formatNumber, bindDisplay, updateAllDisplays, styledSpan } from "./display.js";
import { initLocalization, applyTranslationsToDOM, t, tHTML } from "./localization.js";
import { initStatsPage } from "./stats_page.js";
import { leveling } from "./content/leveling.js";
import { settings } from "./content/settings.js";

const name_input = document.getElementById("character-name-input");
name_input.value = character.name;
name_input.addEventListener("change", () => character.name = name_input.value.toString().trim().length > 0 ? name_input.value : "Player");

async function init() {
    try {
        await initLocalization();
        applyTranslationsToDOM();
    } catch (err) {
        console.error("[localization] Failed to initialize:", err);
        //falls back to whatever text is already hardcoded in index.html
    }

    //all boxes shown for testing purposes
    Object.keys(character.box_unlocks).forEach(box => {
        character.unlockBox(box);
    })

    updateBoxUnlocks();
    initTabs();

    initStatsPage();

    //testing formatNumber
    settings.setSetting("number_type", "standard");
    console.log(formatNumber(123456));
    console.log(formatNumber(123456.789));
    console.log(formatNumber(12345678));
    settings.setSetting("number_type", "chinese_t");
    console.log(formatNumber(1000.0001e64));
    console.log(formatNumber(1.234e123));
    settings.setSetting("number_type", "emoji");
    console.log(formatNumber(9.99e64));
    settings.setSetting("number_type", "scientific");
    console.log(formatNumber(123456789));
    console.log(formatNumber(234597826347562987345629845, 99, 0))
    console.log(formatNumber(10000000000000));

    //XP test
    leveling.addXP(500000000000);

    //Add placeholder title (remove later)
    character.titles.push("placeholder");
    character.titles.push("common_test", "uncommon_test", "rare_test", "epic_test", "legendary_test", "mythic_test", "transcendental_test", "divine_test");
}

init();