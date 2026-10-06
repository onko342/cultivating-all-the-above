"use strict";

//Index = rarity number used in content definitions. Class names are "rarity-<name>".
export const rarity_names = ["common", "uncommon", "rare", "epic", "legendary", "mythic", "transcendental", "divine"];

export function getRarityName(rarity) {
    return rarity_names[rarity] ?? rarity_names[0];
}