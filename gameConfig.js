export const GAME_CONFIG = Object.freeze({
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
        baseLength: 200,
        levelLengthStep: 100,
        baseMaxSpeed: 2000,
        levelMaxSpeedStep: 500,
        dimensionChangeInterval: 60,
        doorInterval: 40,
        mineInterval: 27,
        safeStartSegments: 30,
        safeEndSegments: 30,
        exitZoneSegments: 15,
        finalStraightSegments: 20,
        dimensionChangeStart: 20,
        dimensionChangeEndPadding: 40,
        minDimensionFactor: 0.5,
        dimensionFactorRange: 1.0,
        dimensionLerp: 0.08,
        minePadding: 200
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
