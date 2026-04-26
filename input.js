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
            'Space':         'fire',
            'AltLeft':       'throttle',
            'AltRight':      'throttle',
            'ControlLeft':   'brake',
            'ControlRight':  'brake',
            'ArrowLeft':     'left',
            'ArrowRight':    'right',
            'ArrowUp':       'up',
            'ArrowDown':     'down',
            'KeyA':          'left',
            'KeyD':          'right',
            'KeyW':          'up',
            'KeyS':          'down',
        };

        const preventDefaultKeys = ['Space', 'AltLeft', 'AltRight', 'ControlLeft', 'ControlRight', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

        window.addEventListener('keydown', e => {
            const control = this.keyBindings[e.code];
            if (control) {
                this.controls[control] = true;
            }
            if (preventDefaultKeys.includes(e.code)) {
                e.preventDefault();
            }
        });

        window.addEventListener('keyup', e => {
            const control = this.keyBindings[e.code];
            if (control) {
                this.controls[control] = false;
            }
            if (preventDefaultKeys.includes(e.code)) {
                e.preventDefault();
            }
        });
    }

    isPressed(control) {
        return !!this.controls[control];
    }
}
