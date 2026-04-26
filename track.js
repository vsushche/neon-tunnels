import { SEGMENT_LENGTH, TUNNEL_WIDTH, TUNNEL_HEIGHT } from './constants.js';
import { DoubleDoor, SingleDoor } from './doors.js';

export function createTrack(level) {
    let track = [];
    let trackLength = 200 + level * 100;
    let maxSpeed = 2000 + level * 500;
    
    let currentCurveX = 0;
    let currentCurveY = 0;
    
    const hue1 = (level * 60) % 360;
    const hue2 = (hue1 + 180) % 360;
    
    for (let i = 0; i < trackLength; i++) {
        if (i % 20 === 0 && i > 10 && i < trackLength - 20) {
            currentCurveX = (Math.random() - 0.5) * 0.1 * (1 + level * 0.2);
            currentCurveY = (Math.random() - 0.5) * 0.1 * (1 + level * 0.2);
        }
        
        if (i > trackLength - 20) {
            currentCurveX = 0;
            currentCurveY = 0;
        }

        let type = 'normal';
        let widthFactor = 1.0;
        let doorPhaseOffset = 0;
        let doorSpeed = 1 + level * 0.2;
        let doorObj = null;
        
        if (i > 30 && i < trackLength - 30) {
            if (i % 40 === 0) {
                type = 'door';
                doorPhaseOffset = Math.random() * Math.PI * 2;
                
                let rnd = Math.random();
                if (rnd < 0.5) {
                    let orientation = Math.random() > 0.5 ? 'vertical' : 'horizontal';
                    doorObj = new DoubleDoor(orientation, doorSpeed, doorPhaseOffset);
                } else {
                    const origins = ['top', 'bottom', 'left', 'right'];
                    let origin = origins[Math.floor(Math.random() * origins.length)];
                    doorObj = new SingleDoor(origin, doorSpeed, doorPhaseOffset);
                }
                doorObj.doorZ = i * SEGMENT_LENGTH;
            } else if (i % 75 === 0) {
                type = 'narrow';
                widthFactor = 0.5;
            } else if (i % 27 === 0) {
                type = 'mine';
            }
        }
        
        let colorIndex = Math.floor(i / 2) % 2;
        
        track.push({
            index: i,
            z: i * SEGMENT_LENGTH,
            curveX: currentCurveX,
            curveY: currentCurveY,
            colorIndex: colorIndex,
            type: type,
            widthFactor: widthFactor,
            doorPhaseOffset: doorPhaseOffset,
            doorSpeed: doorSpeed,
            mineX: type === 'mine' ? (Math.random() - 0.5) * (TUNNEL_WIDTH - 200) : 0,
            mineY: type === 'mine' ? (Math.random() - 0.5) * (TUNNEL_HEIGHT - 200) : 0,
            door: doorObj,
            hue: colorIndex === 0 ? hue1 : hue2,
            passed: false
        });
    }
    return { track, trackLength, maxSpeed };
}
