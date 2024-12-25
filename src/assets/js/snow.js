class Snowfall {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext("2d");
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.snowflakes = [];
        this.init();
    }

    init() {
        // Crear 150 copos para mayor belleza
        for (let i = 0; i < 150; i++) {
            this.snowflakes.push(this.createSnowflake());
        }

        this.animate();
        window.addEventListener("resize", () => this.resizeCanvas());
    }

    createSnowflake() {
        return {
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
            radius: Math.random() * 3 + 1, // Tamaños más variados
            speed: Math.random() * 0.5 + 0.2, // Velocidad más lenta
            wind: Math.random() * 0.3 - 0.15, // Movimiento horizontal leve
            opacity: Math.random() * 0.8 + 0.2, // Transparencia
            rotation: Math.random() * 360, // Rotación inicial
        };
    }

    drawSnowflake(snowflake) {
        const { x, y, radius, opacity, rotation } = snowflake;

        this.ctx.save();
        this.ctx.globalAlpha = opacity; // Aplicar transparencia
        this.ctx.translate(x, y);
        this.ctx.rotate((rotation * Math.PI) / 180); // Rotación

        // Crear un copo con gradiente
        const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
        gradient.addColorStop(0, "rgba(255, 255, 255, 0.9)");
        gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.5)");
        gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.closePath();

        this.ctx.restore();
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (let snowflake of this.snowflakes) {
            // Movimiento lento hacia abajo y horizontalmente
            snowflake.y += snowflake.speed;
            snowflake.x += snowflake.wind;
            snowflake.rotation += 0.2; // Rotación suave

            // Reaparece arriba si baja demasiado
            if (snowflake.y > this.canvas.height) {
                snowflake.y = -snowflake.radius;
                snowflake.x = Math.random() * this.canvas.width;
            }

            // Reaparece en el lado contrario si se va por los lados
            if (snowflake.x > this.canvas.width) {
                snowflake.x = 0;
            } else if (snowflake.x < 0) {
                snowflake.x = this.canvas.width;
            }

            this.drawSnowflake(snowflake);
        }

        requestAnimationFrame(() => this.animate());
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
}

export default Snowfall;
