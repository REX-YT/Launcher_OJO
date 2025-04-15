import config from '../js/utils/config.js';
const os = require('os');
const https = require('https');

let res = await config.GetConfig();

// Función para verificar conectividad
const checkConnectivity = (url) => {
    return new Promise((resolve) => {
        const startTime = Date.now();

        const req = https.request(url, { method: 'HEAD', timeout: 3000 }, (res) => {
            const latency = Date.now() - startTime;
            resolve(`✅ ${url} - ${latency} ms`);
        });

        req.on('error', () => {
            const latency = Date.now() - startTime;
            resolve(`❌ ${url} - Fallo (${latency} ms)`);
        });

        req.on('timeout', () => {
            req.destroy();
            resolve(`⚠️ ${url} - Tiempo de espera (> 3000 ms)`);
        });

        req.end();
    });
};

export const sendClientReport = async (logContent) => {
    if (!logContent) return;

     // Obtener información del sistema operativo
     const systemInfo = `
     **Sistema Operativo:** ${os.type()} ${os.release()} (${os.platform()})
     **Arquitectura:** ${os.arch()}
     **CPU:** ${os.cpus()[0].model}
     **Memoria Total:** ${(os.totalmem() / (1024 ** 3)).toFixed(2)} GB
     **Host:** ${os.hostname()}
     `;
     
         // Verificar conectividad
    const urlsToCheck = [
        'https://api.comunidadojo.xyz',
        'https://github.com'
    ];
    const connectivityResults = await Promise.all(urlsToCheck.map(checkConnectivity));
    const connectivityInfo = connectivityResults.join('\n');
    
    const payload = {
        embeds: [{
            title: "📢 Nuevo Reporte",
            description: `${logContent}\n\n${systemInfo}\n**Conectividad:**\n${connectivityInfo}`,
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
