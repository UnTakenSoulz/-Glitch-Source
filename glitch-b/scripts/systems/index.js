import { Player, Entity, world, ScoreboardIdentityType, ScoreboardIdentity, ScoreboardObjective } from "@minecraft/server";

/**
 * Get all scoreboard scores from a player or entity.
 * Does not support fake players.
 * @param {Player | Entity} target
 * @return {object}
 */
export function getScores(target) {
    const objectives = world.scoreboard.getObjectives();
    const targetScoreboard = {};

    // Check if the target has a valid scoreboard identity
    if (!(target.scoreboardIdentity instanceof ScoreboardIdentity)) {
        return targetScoreboard;
    }

    // Iterate through all objectives and find the target's scores
    for (const objective of objectives) {
        const scores = objective.getScores();
        const score = scores.find((score) => {
            if (score.participant.type !== ScoreboardIdentityType.FakePlayer) {
                const entity = score.participant.getEntity();
                return entity && entity.id === target.id;
            }
            return false;
        });
        targetScoreboard[objective.id] = score?.score || 0;
    }

    return targetScoreboard;
}

/**
 * Get a specific scoreboard score from a player or entity.
 * Does not support fake players.
 * @param {Player | Entity} target 
 * @param {string} objectiveId 
 * @return {number}
 */
export function getScore(target, objectiveId) {
    const objective = world.scoreboard.getObjective(objectiveId);

    // Check if the target has a valid scoreboard identity and the objective exists
    if (!(target.scoreboardIdentity instanceof ScoreboardIdentity)) {
        return 0;
    }
    if (!(objective instanceof ScoreboardObjective)) {
        return 0;
    }

    try {
        return objective.getScore(target.scoreboardIdentity);
    } catch (err) {
        console.error(err);
        return 0;
    }
}

/**
 * Format large numbers into a more readable format (e.g., 1K, 1M, 1B).
 * @param {number} num 
 * @return {string}
 */
export function formatNumbers(num) {
    if (num >= 1000000000) {
        return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B'; // Billion
    }
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'; // Million
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K'; // Thousand
    }
    return num.toString();
}
