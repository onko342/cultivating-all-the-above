import { character } from "./character.js";
import { updateBoxUnlocks, initTabs } from "./display.js";
import { initLocalization, applyTranslationsToDOM } from "./localization.js";

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
}

init();