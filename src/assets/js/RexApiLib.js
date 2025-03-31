const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1189911236972908584/fqv1xJOm-EhHgptDGm744zdzT91B2VQClRAo57gCJFnfJMW7FP3pOLokRqYsmAfXm6Hi";

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
