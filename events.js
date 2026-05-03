export const GameEventType = Object.freeze({
    MENU_ACTIVATED: 'menuActivated',
    LEVEL_STARTED: 'levelStarted',
    COUNTDOWN_BEEP: 'countdownBeep',
    COUNTDOWN_FINISHED: 'countdownFinished',
    LASER_FIRED: 'laserFired',
    LASER_HIT_DOOR: 'laserHitDoor',
    SHIP_CRASHED: 'shipCrashed',
    WALL_SCRAPED: 'wallScraped',
    DOOR_PASSED: 'doorPassed',
    EXIT_STARTED: 'exitStarted',
    LEVEL_COMPLETED: 'levelCompleted',
    GAME_COMPLETED: 'gameCompleted'
});

export function gameEvent(type, payload = {}) {
    return { type, payload };
}
