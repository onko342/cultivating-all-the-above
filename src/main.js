import { character } from "./character.js";
import { updateBoxUnlocks, initTabs } from "./display.js";

//all boxes shown for testing purposes
Object.keys(character.UI_unlocks).forEach(box => {
    character.unlockBox(box);
})

updateBoxUnlocks();
initTabs();