export class InputHandler {
    constructor() {
        // Abstract controls — game logic uses these
        this.controls = {
            throttle: false,
            brake: false,
            left: false,
            right: false,
            up: false,
            down: false,
            fire: false
        };

        // Key bindings: keyboard code → control name
        this.keyBindings = {
            'Space':      'throttle',
            'ShiftLeft':  'brake',
            'ShiftRight': 'brake',
            'ArrowLeft':  'left',
            'ArrowRight': 'right',
            'ArrowUp':    'up',
            'ArrowDown':  'down',
            'KeyA':       'left',
            'KeyD':       'right',
            'KeyW':       'up',
            'KeyS':       'down',
            'KeyF':       'fire',
        };

        window.addEventListener('keydown', e => {
            const control = this.keyBindings[e.code];
            if (control) {
                this.controls[control] = true;
            }
        });

        window.addEventListener('keyup', e => {
            const control = this.keyBindings[e.code];
            if (control) {
                this.controls[control] = false;
            }
        });
    }

    isPressed(control) {
        return !!this.controls[control];
    }
}
