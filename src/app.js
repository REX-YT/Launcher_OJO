/**
 * @author Luuxis
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 */

const { app, ipcMain, nativeTheme, BrowserWindow } = require('electron');
const { Microsoft } = require('minecraft-java-core');
const { autoUpdater } = require('electron-updater')

const path = require('path');
const fs = require('fs');
const { URLSearchParams } = require('url');
const express = require('express');

const UpdateWindow = require("./assets/js/windows/updateWindow.js");
const MainWindow = require("./assets/js/windows/mainWindow.js");

let dev = process.env.NODE_ENV === 'dev';
let server;
let authToken;
let config = {
    "clientId": "845014549853765632",
    "clientSecret": "0_7SCqEQwnvYrLSNNnBGr3vAlQY-lqAW",
    "redirectUri": "http://localhost:3030/auth/discord/"
  }

function startServer() {
    const expressApp = express();
    const port = 3030;

    expressApp.get("/auth/discord/", (request, response) => {
        var code = request.query["code"];
        var params = new URLSearchParams();
        params.append("client_id", config["clientId"]);
        params.append("client_secret", config["clientSecret"]);
        params.append("grant_type", "authorization_code");
        params.append("code", code);
        params.append("redirect_uri", config["redirectUri"]);
        fetch(`https://discord.com/api/oauth2/token`, {
            method: "POST",
            body: params
        })
        .then(res => res.json())
        .then(json => {
            // Guardar token
            const token = json.access_token;
            authToken = token;
            response.send(`<script>window.close();</script>`);
            server.close();

        })
        .catch(err => {
            console.error("Error al obtener la token de Discord:", err);
            response.status(500).send("Error al obtener la token de Discord.");
        });
    });

    server = expressApp.listen(port, () => {
        console.log(`Servidor escuchando en http://localhost:${port}`);
    });
}


function stopServer() {
    if (server) {
        server.close(() => {
            console.log('Servidor cerrado');
        });
    }
}

if (dev) {
    let appPath = path.resolve('./data/Launcher').replace(/\\/g, '/');
    let appdata = path.resolve('./data').replace(/\\/g, '/');
    if (!fs.existsSync(appPath)) fs.mkdirSync(appPath, { recursive: true });
    if (!fs.existsSync(appdata)) fs.mkdirSync(appdata, { recursive: true });
    app.setPath('userData', appPath);
    app.setPath('appData', appdata)
}

if (!app.requestSingleInstanceLock()) app.quit();
else app.whenReady().then(() => {
    if (dev) return MainWindow.createWindow()
    UpdateWindow.createWindow()
});

ipcMain.on('main-window-open', () => MainWindow.createWindow())
ipcMain.on('main-window-dev-tools', () => MainWindow.getWindow().webContents.openDevTools({ mode: 'detach' }))
ipcMain.on('main-window-dev-tools-close', () => MainWindow.getWindow().webContents.closeDevTools())
ipcMain.on('main-window-close', () => MainWindow.destroyWindow())
ipcMain.on('main-window-reload', () => MainWindow.getWindow().reload())
ipcMain.on('main-window-progress', (event, options) => MainWindow.getWindow().setProgressBar(options.progress / options.size))
ipcMain.on('main-window-progress-reset', () => MainWindow.getWindow().setProgressBar(-1))
ipcMain.on('main-window-progress-load', () => MainWindow.getWindow().setProgressBar(2))
ipcMain.on('main-window-minimize', () => MainWindow.getWindow().minimize())

ipcMain.on('update-window-close', () => UpdateWindow.destroyWindow())
ipcMain.on('update-window-dev-tools', () => UpdateWindow.getWindow().webContents.openDevTools({ mode: 'detach' }))
ipcMain.on('update-window-progress', (event, options) => UpdateWindow.getWindow().setProgressBar(options.progress / options.size))
ipcMain.on('update-window-progress-reset', () => UpdateWindow.getWindow().setProgressBar(-1))
ipcMain.on('update-window-progress-load', () => UpdateWindow.getWindow().setProgressBar(2))

ipcMain.handle('path-user-data', () => app.getPath('userData'))
ipcMain.handle('appData', e => app.getPath('appData'))

ipcMain.on('main-window-maximize', () => {
    if (MainWindow.getWindow().isMaximized()) {
        MainWindow.getWindow().unmaximize();
    } else {
        MainWindow.getWindow().maximize();
    }
})

ipcMain.on('main-window-hide', () => MainWindow.getWindow().hide())
ipcMain.on('main-window-show', () => MainWindow.getWindow().show())


ipcMain.on('open-discord-url', () => {
    require('electron').shell.openExternal(pkg.discord_url);
});

ipcMain.on('app-restart', () => {
    app.relaunch();
    app.quit();
});

ipcMain.handle('open-discord-auth', async () => {
    return new Promise((resolve, reject) => {
        authToken = null;
        startServer();

        const discordWin = new BrowserWindow({
            width: 1000,
            height: 725,
            minimizable: false,
            maximizable: false,
            resizable: false,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: true,
            }
        });

        discordWin.loadURL('https://discord.com/oauth2/authorize?client_id=845014549853765632&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A3030%2Fauth%2Fdiscord%2F&scope=guilds+identify');

        discordWin.on('closed', () => {
            stopServer();
            if (!authToken || authToken === "" || authToken === null) {
                reject(new Error('No se recibió un token de Discord.'));
            } else {
                resolve(authToken);
            }
        });
    });
});

ipcMain.handle('Microsoft-window', async (_, client_id) => {
    return await new Microsoft(client_id).getAuth();
})

ipcMain.handle('is-dark-theme', (_, theme) => {
    if (theme === 'dark') return true
    if (theme === 'light') return false
    return nativeTheme.shouldUseDarkColors;
})

app.on('window-all-closed', () => app.quit());

autoUpdater.autoDownload = false;

ipcMain.handle('update-app', async () => {
    return await new Promise(async (resolve, reject) => {
        autoUpdater.checkForUpdates().then(res => {
            resolve(res);
        }).catch(error => {
            reject({
                error: true,
                message: error
            })
        })
    })
})

autoUpdater.on('update-available', () => {
    const updateWindow = UpdateWindow.getWindow();
    if (updateWindow) updateWindow.webContents.send('updateAvailable');
});

ipcMain.on('start-update', () => {
    autoUpdater.downloadUpdate();
})

autoUpdater.on('update-not-available', () => {
    const updateWindow = UpdateWindow.getWindow();
    if (updateWindow) updateWindow.webContents.send('update-not-available');
});

autoUpdater.on('update-downloaded', () => {
    autoUpdater.quitAndInstall();
});

autoUpdater.on('download-progress', (progress) => {
    const updateWindow = UpdateWindow.getWindow();
    if (updateWindow) updateWindow.webContents.send('download-progress', progress);
})

autoUpdater.on('error', (err) => {
    const updateWindow = UpdateWindow.getWindow();
    if (updateWindow) updateWindow.webContents.send('error', err);
});