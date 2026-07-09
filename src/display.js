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

        const is_unlocked = character.box_unlocks[unlock_key];
        box_element.classList.toggle('is-unlocked', is_unlocked);
    }
}

function initTabs() {
    const tab_containers = document.querySelectorAll('.tab-container');

    tab_containers.forEach((container) => {
        const buttons = container.querySelectorAll(':scope > .tab-buttons > .tab-button');
        const panels = container.querySelectorAll(':scope > .tab-content-area > .tab-panel');

        buttons.forEach((button) => {
            button.addEventListener('click', () => {
                buttons.forEach((b) => b.classList.remove('active-tab'));
                panels.forEach((p) => p.classList.remove('active-tab'));

                button.classList.add('active-tab');
                container
                    .querySelector(`:scope > .tab-content-area > [data-tab-panel="${button.dataset.tabTarget}"]`)
                    .classList.add('active-tab');
            })
        })
    })
}

export { updateBoxUnlocks, initTabs };