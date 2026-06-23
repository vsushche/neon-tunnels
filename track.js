import { GAME_CONFIG } from './gameConfig.js';
import { DoubleDoor, SingleDoor, GateDoor, SensorDoor } from './doors.js';
import { loadLevel } from './levelLoader.js';

const { tunnel: TUNNEL_CONFIG } = GAME_CONFIG;
const SEGMENT_LENGTH = TUNNEL_CONFIG.segmentLength;

export async function createTrack(level) {
    const levelData = await loadLevel(level);
    const trackLength = levelData.length;
    const obstacleMap = buildObstacleMap(levelData.obstacles || []);
    const track = [];

    for (let i = 0; i < trackLength; i++) {
        const section = findSection(levelData.sections, i);
        const obstacle = obstacleMap.get(i);
        const door = obstacle?.type === 'door' ? createDoor(obstacle, i) : null;
        const colorIndex = Math.floor(i / 2) % 2;

        track.push({
            index: i,
            z: i * SEGMENT_LENGTH,
            curveX: section.curveX || 0,
            curveY: section.curveY || 0,
            colorIndex,
            type: obstacle?.type || 'normal',
            widthFactor: section.widthFactor ?? 1,
            heightFactor: section.heightFactor ?? 1,
            doorPhaseOffset: obstacle?.phaseOffset || 0,
            doorSpeed: obstacle?.speed || 1,
            mineX: obstacle?.type === 'mine' ? obstacle.x || 0 : 0,
            mineY: obstacle?.type === 'mine' ? obstacle.y || 0 : 0,
            mineDestroyed: false,
            mineExplosionStart: 0,
            door,
            hue: colorIndex === 0 ? levelData.theme.hue1 : levelData.theme.hue2,
            passed: false
        });
    }

    return {
        track,
        trackLength,
        maxSpeed: levelData.maxSpeed,
        levelName: levelData.name
    };
}

function buildObstacleMap(obstacles) {
    const obstacleMap = new Map();
    for (const obstacle of obstacles) {
        obstacleMap.set(obstacle.segment, obstacle);
    }
    return obstacleMap;
}

function findSection(sections, segmentIndex) {
    return (
        sections.find((section) => segmentIndex >= section.from && segmentIndex < section.to) ||
        sections[sections.length - 1]
    );
}

function createDoor(obstacle, segmentIndex) {
    const speed = obstacle.speed || 1;
    const phaseOffset = obstacle.phaseOffset || 0;
    let door;

    if (obstacle.doorType === 'double') {
        door = new DoubleDoor(obstacle.orientation || 'vertical', speed, phaseOffset);
    } else if (obstacle.doorType === 'single') {
        door = new SingleDoor(obstacle.origin || 'top', speed, phaseOffset);
    } else if (obstacle.doorType === 'gate') {
        door = new GateDoor(obstacle.direction || 'horizontal', speed, phaseOffset);
        if (obstacle.gapRatio) {
            door.gapRatio = obstacle.gapRatio;
        }
    } else if (obstacle.doorType === 'sensor') {
        door = new SensorDoor(obstacle.orientation || 'vertical', speed, phaseOffset);
        if (obstacle.openTime) {
            door.openTime = obstacle.openTime;
        }
    } else {
        throw new Error(`Unknown door type: ${obstacle.doorType}`);
    }

    door.doorZ = segmentIndex * SEGMENT_LENGTH;
    door.hue = obstacle.hue ?? door.hue;

    if (obstacle.transitionTime) {
        door.closeTime = obstacle.transitionTime;
        door.openTime = obstacle.transitionTime;
    }

    return door;
}
