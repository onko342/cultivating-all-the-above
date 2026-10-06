"use strict";

import { character } from "./character.js";
import { titles } from "./content/titles.js";
import { leveling } from "./content/leveling.js";
import { getRarityName } from "./content/rarities.js";
import { bindDisplay, updateDisplay, setStyleClass, formatNumber } from "./display.js";
import { t } from "./localization.js";

function getSelectedTitle() {
    return titles[character.selected_title] ?? null; //null if nothing is selected or id no longer exists
}

function getTitleName(title) {
    return t(`titles.name.${title.name_key}`);
}

function selectTitle(title_id) {
    character.selected_title = title_id;
    updateDisplay("title");
    //later: recalculate stats here when titles have effects
}

function initTitleDropdown() {
    const wrapper = document.getElementById("title-select");
    const button = document.getElementById("title-select-button");
    const list = document.getElementById("title-select-list");

    function closeList() {
        list.hidden = true;
    }

    function addOption(title_id, label, rarity_name) {
        const item = document.createElement("li");
        //rarity class goes on an inner span so the li's hover background doesn't clash with gradient text
        const text = document.createElement("span");
        text.textContent = label;
        setStyleClass(text, "rarity", rarity_name);
        item.appendChild(text);
        item.addEventListener("click", () => {
            selectTitle(title_id);
            closeList();
        });
        list.appendChild(item);
    }

    //rebuilt on every open so newly gained titles and language changes are always reflected
    function openList() {
        list.replaceChildren();
        addOption("", t("ui.stats_box.no_title"), null);
        character.titles.forEach((title_id) => {
            const title = titles[title_id];
            if (title) addOption(title_id, getTitleName(title), getRarityName(title.rarity));
        });
        list.hidden = false;
    }

    button.addEventListener("click", () => list.hidden ? openList() : closeList());
    document.addEventListener("click", (event) => {
        if (!wrapper.contains(event.target)) closeList();
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeList();
    });
}

export function initStatsPage() {
    bindDisplay("level", "level-text",
        () => t("ui.stats_box.level_text", { level: formatNumber(leveling.character_level) }),
        { style_group: "rank", getStyle: () => leveling.getRank(leveling.character_level) }
    );

    bindDisplay("title", "character-title",
        () => {
            const title = getSelectedTitle();
            return title ? getTitleName(title) : t("ui.stats_box.no_title");
        },
        {
            style_group: "rarity",
            getStyle: () => {
                const title = getSelectedTitle();
                return title ? getRarityName(title.rarity) : null;
            },
        }
    );

    initTitleDropdown();
}