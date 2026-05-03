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

        // Key bindings: keyboard code -> control name
        this.keyBindings = {
            'Space':         'throttle',
            'AltLeft':       'brake',
            'KeyX':          'fire',
            'ArrowLeft':     'left',
            'ArrowRight':    'right',
            'ArrowUp':       'up',
            'ArrowDown':     'down'
        };

        const preventDefaultKeys = ['Space', 'AltLeft', 'KeyX', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

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
