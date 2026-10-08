export class Spring {
    constructor(config) {
        this.damping = config.damping || 45;
        this.stiffness = config.stiffness || 400;
        this.mass = config.mass || 1;
        this.value = config.initial || 0;
        this.target = config.initial || 0;
        this.velocity = 0;
    }

    set(target) {
        this.target = target;
    }

    update(dt) {
        const force = -this.stiffness * (this.value - this.target) - this.damping * this.velocity;
        const acceleration = force / this.mass;
        this.velocity += acceleration * dt;
        this.value += this.velocity * dt;
        return this.value;
    }
}
