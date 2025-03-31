import config from '../js/utils/config.js';

let res = await config.GetConfig();

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
    
    fetch(res.discord_webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    }).catch(console.error);
};
