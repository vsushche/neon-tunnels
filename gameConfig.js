export const GAME_CONFIG = Object.freeze({
    levels: {
        count: 3
    },
    tunnel: {
        segmentLength: 200,
        width: 1200,
        height: 800,
        focalLength: 400,
        visibleSegments: 50
    },
    ship: {
        accel: 8000,
        friction: 0.85,
        width: 200,
        height: 100,
        throttleAccel: 1500,
        brakeDecel: 3000,
        coastDecel: 800,
        wallBounce: 1.2,
        wallKick: 200,
        wallSpeedPenalty: 0.4,
        crashSpeedPenalty: 0.5,
        crashRewind: 200
    },
    mines: {
        radius: 50,
        laserHitRadius: 70
    },
    laser: {
        lifetimeMs: 500,
        fireCooldownMs: 200,
        startOffset: 200,
        range: 15000,
        hitSize: 10,
        triggerDistance: 4000,
        renderLength: 800,
        wingSpread: 600,
        convergeDistance: 8000,
        worldWidth: 40
    },
    track: {
        exitZoneSegments: 15
    },
    doors: {
        activationDistanceSegments: 15
    },
    autopilot: {
        centerDamping: 0.92,
        velocityDamping: 0.8,
        winDriftSpeedDamping: 0.95,
        finishPaddingSegments: 15
    },
    render: {
        starCount: 400,
        starSpread: 4000,
        starDepth: 4000,
        laserGlowDistance: 2000
    },
    countdown: {
        duration: 3,
        stepDuration: 0.75
    }
});
