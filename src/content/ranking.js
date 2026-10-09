"use strict";

//Ranking setup per world. "population" is the number of creatures in that world's ranking pool.
//Tiers are listed best to worst and each one uses either:
//  max_rank: an absolute cutoff ("rank <= max_rank"), e.g. the podium positions
//  top_fraction: a cutoff as a fraction of the world's population, so changing a population rescales the tier
//Everything here is a PLACEHOLDER until world content and the combat power formula exist.
export const world_rankings = {
    modern: {
        population: 3e12, //placeholder pool: mostly wildlife, humanoids are only ~10 billion of it
        tiers: [
            { name: "ultimate", max_rank: 1 },
            { name: "prime", max_rank: 2 },
            { name: "unrivaled", max_rank: 3 },
            { name: "eternal", max_rank: 10 },
            { name: "legend", max_rank: 100 },
            { name: "champion", max_rank: 1000 },
            { name: "challenger", top_fraction: 1e-8 }, //30K
            { name: "grandmaster", top_fraction: 1e-7 }, //300K
            { name: "master", top_fraction: 1e-6 }, //3M
            { name: "diamond", top_fraction: 1e-5 }, //30M
            { name: "emerald", top_fraction: 1e-4 }, //300M
            { name: "platinum", top_fraction: 1e-3 }, //3B
            { name: "gold", top_fraction: 1e-2 }, //30B
            { name: "silver", top_fraction: 0.1 }, //300B
            { name: "bronze", top_fraction: 0.5 }, //1.5T
            { name: "iron", top_fraction: 1 }, //catch-all, must stay last
        ],
    },
    //cultivation: { population: ..., tiers: [...] } goes here later
};

//Returns the tier name (e.g. "iron") for a rank position in a world, or null for an unknown world
export function getLeagueTier(world, rank) {
    const config = world_rankings[world];
    if (!config) return null;

    for (const tier of config.tiers) {
        //rounded so float noise (1e-8 * 3e12 = 30000.000000000004) can't push an exact boundary rank into the wrong tier
        const max_rank = tier.max_rank ?? Math.round(tier.top_fraction * config.population);
        if (rank <= max_rank) return tier.name;
    }
    return config.tiers[config.tiers.length - 1].name; //rank beyond the population: worst tier
}