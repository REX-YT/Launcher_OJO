require('dotenv').config();

// Usar la variable de entorno
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

export const sendClientReport = (logContent) => {
    if (!logContent) return;
    
    const payload = {
        embeds: [{
            title: "📢 Nuevo Reporte",
            description: logContent,
            color: 16711680, // Rojo
            timestamp: new Date().toISOString()
        }]
    };
    
    fetch(DISCORD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    }).catch(console.error);
};
