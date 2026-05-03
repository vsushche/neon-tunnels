const levelCache = new Map();

export async function loadLevel(levelNumber) {
    if (levelCache.has(levelNumber)) {
        return levelCache.get(levelNumber);
    }

    const response = await fetch(`./levels/level-${levelNumber}.json`);
    if (!response.ok) {
        throw new Error(`Level ${levelNumber} is not available.`);
    }

    const levelData = await response.json();
    levelCache.set(levelNumber, levelData);
    return levelData;
}
