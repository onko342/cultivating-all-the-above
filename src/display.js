import { character } from "./character.js";

const box_elements = {
    stats_box: document.getElementById('stats-box'),
    inventory_box: document.getElementById('inventory-box'),
    skills_box: document.getElementById('skills-box'),
    log_box: document.getElementById('log-box'),
    location_top_box: document.getElementById('location-top-box'),
    cultivation_box: document.getElementById('cultivation-box'),
    misc_box: document.getElementById('misc-box'),
}

function updateBoxUnlocks() {
    for (const [unlock_key, box_element] of Object.entries(box_elements)) {
        if (!box_element) continue;

        const is_unlocked = character.UI_unlocks[unlock_key];
        box_element.classList.toggle('is-unlocked', is_unlocked);
    }
}

export { updateBoxUnlocks };