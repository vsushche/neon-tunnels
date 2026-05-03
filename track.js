import { SEGMENT_LENGTH, TUNNEL_WIDTH, TUNNEL_HEIGHT } from './constants.js';
import { DoubleDoor, SingleDoor, GateDoor, SensorDoor } from './doors.js';

export function createTrack(level) {
    let track = [];
    let trackLength = 200 + level * 100;
    let maxSpeed = 2000 + level * 500;
    
    let currentCurveX = 0;
    let currentCurveY = 0;
    
    let currentWidthFactor = 1.0;
    let targetWidthFactor = 1.0;
    let currentHeightFactor = 1.0;
    let targetHeightFactor = 1.0;
    
    const hue1 = (level * 60) % 360;
    const hue2 = (hue1 + 180) % 360;
    
    for (let i = 0; i < trackLength; i++) {
        // Change tunnel dimensions every 60 segments
        if (i % 60 === 0 && i > 20 && i < trackLength - 40) {
            targetWidthFactor = 0.5 + Math.random() * 1.0;  // 0.5 to 1.5
            targetHeightFactor = 0.5 + Math.random() * 1.0; // 0.5 to 1.5
            
            // Randomly change curves too
            currentCurveX = (Math.random() - 0.5) * 0.1 * (1 + level * 0.2);
            currentCurveY = (Math.random() - 0.5) * 0.1 * (1 + level * 0.2);
        }
        
        // Smooth interpolation
        currentWidthFactor += (targetWidthFactor - currentWidthFactor) * 0.08;
        currentHeightFactor += (targetHeightFactor - currentHeightFactor) * 0.08;
        
        if (i > trackLength - 20) {
            currentCurveX = 0;
            currentCurveY = 0;
            targetWidthFactor = 1.0;
            targetHeightFactor = 1.0;
        }

        let type = 'normal';
        let doorPhaseOffset = 0;
        let doorSpeed = 1 + level * 0.2;
        let doorObj = null;
        
        if (i > 30 && i < trackLength - 30) {
            if (i % 40 === 0) {
                type = 'door';
                doorPhaseOffset = Math.random() * Math.PI * 2;

                let rnd = Math.random();
                if (rnd < 0.25) {
                    let orientation = Math.random() > 0.5 ? 'vertical' : 'horizontal';
                    doorObj = new DoubleDoor(orientation, doorSpeed, doorPhaseOffset);
                    doorObj.hue = Math.random() * 260; // Avoid Purple range
                } else if (rnd < 0.50) {
                    const origins = ['top', 'bottom', 'left', 'right'];
                    let origin = origins[Math.floor(Math.random() * origins.length)];
                    doorObj = new SingleDoor(origin, doorSpeed, doorPhaseOffset);
                    doorObj.hue = Math.random() * 260;
                } else if (rnd < 0.75) {
                    let direction = Math.random() > 0.5 ? 'horizontal' : 'vertical';
                    doorObj = new GateDoor(direction, doorSpeed, doorPhaseOffset);
                    doorObj.hue = Math.random() * 260;
                } else {
                    let orientation = Math.random() > 0.5 ? 'vertical' : 'horizontal';
                    doorObj = new SensorDoor(orientation, doorSpeed, doorPhaseOffset);
                    doorObj.hue = 280; // Fixed Purple for SensorDoors
                }
                doorObj.doorZ = i * SEGMENT_LENGTH;
                
                // Randomize timing: 70% slow doors, 30% fast doors
                // Opening and closing use the same duration so panel speed matches both ways.
                let transitionTime;
                if (Math.random() < 0.7) {
                    transitionTime = 2.0 + Math.random() * 1.0;
                } else {
                    transitionTime = 1.0 + Math.random() * 0.5;
                }
                doorObj.closeTime = transitionTime;
                doorObj.openTime = transitionTime;
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
            widthFactor: currentWidthFactor,
            heightFactor: currentHeightFactor,
            doorPhaseOffset: doorPhaseOffset,
            doorSpeed: doorSpeed,
            mineX: type === 'mine' ? (Math.random() - 0.5) * (TUNNEL_WIDTH * currentWidthFactor - 200) : 0,
            mineY: type === 'mine' ? (Math.random() - 0.5) * (TUNNEL_HEIGHT * currentHeightFactor - 200) : 0,
            door: doorObj,
            hue: colorIndex === 0 ? hue1 : hue2,
            passed: false
        });
    }
    return { track, trackLength, maxSpeed };
}
