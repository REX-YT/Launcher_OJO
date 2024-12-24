/**
 * @author Luuxis
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 */

const { ipcRenderer } = require('electron')
const { Status } = require('minecraft-java-core')
const fs = require('fs');
const pkg = require('../package.json');

import config from './utils/config.js';
import database from './utils/database.js';
import logger from './utils/logger.js';
import popup from './utils/popup.js';
import { skin2D } from './utils/skin.js';
import slider from './utils/slider.js';
let username = '';
let DiscordUsername = '';
let DiscordPFP = '';
let musicAudio = new Audio();
let musicSource = '';
let isMusicPlaying = false;
const fadeDuration = 1000;

async function setBackground(theme) {
    if (typeof theme == 'undefined') {
        let databaseLauncher = new database();
        let configClient = await databaseLauncher.readData('configClient');
        theme = configClient?.launcher_config?.theme || "auto"
        theme = await ipcRenderer.invoke('is-dark-theme', theme).then(res => res)
    }
    let background
    let body = document.body;
    body.className = theme ? 'dark global' : 'light global';
    if (fs.existsSync(`${__dirname}/assets/images/background/easterEgg`) && Math.random() < 0.005) {
        let backgrounds = fs.readdirSync(`${__dirname}/assets/images/background/easterEgg`);
        let Background = backgrounds[Math.floor(Math.random() * backgrounds.length)];
        background = `url(./assets/images/background/easterEgg/${Background})`;
    } else if (fs.existsSync(`${__dirname}/assets/images/background/${theme ? 'dark' : 'light'}`)) {
        let backgrounds = fs.readdirSync(`${__dirname}/assets/images/background/${theme ? 'dark' : 'light'}`);
        let Background = backgrounds[Math.floor(Math.random() * backgrounds.length)];
        background = `linear-gradient(#00000080, #00000080), url(./assets/images/background/${theme ? 'dark' : 'light'}/${Background})`;
    }
    body.style.backgroundImage = background ? background : theme ? '#000' : '#fff';
    body.style.backgroundSize = 'cover';
}

async function changePanel(id) {
    let panel = document.querySelector(`.${id}`);
    let active = document.querySelector(`.active`)
    if (active) active.classList.toggle("active");
    panel.classList.add("active");
}

async function appdata() {
    return await ipcRenderer.invoke('appData').then(path => path)
}

async function addAccount(data) {
    let skin = false
    if (data?.profile?.skins[0]?.base64) skin = await new skin2D().creatHeadTexture(data.profile.skins[0].base64);
    else {
        try {
            if (data?.name) {
                let response = await fetch(`https://mineskin.eu/helm/${data.name}`);
                if (response.ok) skin = `https://mineskin.eu/helm/${data.name}`;
                else skin = false;
            }
        } catch (error) {
            skin = false;
        }
    }
    let div = document.createElement("div");
    div.classList.add("account");
    div.id = data.ID;
    div.innerHTML = `
        <div class="profile-image" ${skin ? 'style="background-image: url(' + skin + ');"' : ''}></div>
        <div class="profile-infos">
            <div class="profile-pseudo">${data.name}</div>
            <div class="profile-uuid">${data.uuid}</div>
        </div>
        <div class="delete-profile" id="${data.ID}">
            <div class="icon-account-delete delete-profile-icon"></div>
        </div>
    `
    return document.querySelector('.accounts-list').appendChild(div);
}

async function accountSelect(data) {
    let account = document.getElementById(`${data.ID}`);
    let activeAccount = document.querySelector('.account-select')

    if (activeAccount) activeAccount.classList.toggle('account-select');
    if (account) account.classList.add('account-select');
    if (data?.profile?.skins[0]?.base64) headplayer(data.profile.skins[0].base64); 
    else if (data?.name) {
        let img = new Image();
        img.onerror = function() {
            console.warn("Error al cargar la imagen de la cabeza del jugador, se cargará la imagen por defecto");
            document.querySelector(".player-head").style.backgroundImage = 'url("assets/images/default/setve.png")';
        }
        img.onload = function() {
            document.querySelector(".player-head").style.backgroundImage = `url(${img.src})`;
        }
        img.src = `https://mineskin.eu/helm/${data.name}`;
    }

}

async function getUsername() {
    return username;
}
async function setUsername(name) {
    username = name;
}

async function getDiscordUsername() {
    return DiscordUsername;
}
async function setDiscordUsername(name) {
    DiscordUsername = name;
}

async function getDiscordPFP() {
    return DiscordPFP;
}

async function setDiscordPFP(pfp) {
    DiscordPFP = pfp;
}

async function setBackgroundMusic(opt) {
    let music = opt
    if (music === undefined) {
        setMusicSource()
    } else if (music.match(/^(http|https):\/\/[^ "]+$/)) {
        setMusicSource(music)
    } else {
        setMusicSource()
    }
}


async function setMusicSource(source) {
    if (source === undefined || source === '' || source === 'none') {
        source = './assets/sounds/music/default-music.mp3';
    }
    if (musicSource === source) return;
    musicSource = source;

    const db = new database();
    const configClient = await db.readData('configClient');

    if (isMusicPlaying) await fadeOutAudio();

    musicAudio.muted = configClient.launcher_config.music_muted;
    musicAudio.src = source;
    musicAudio.loop = true;
    musicAudio.volume = 0;
    musicAudio.disableRemotePlayback = true;

    navigator.mediaSession.setActionHandler('play', null);
    navigator.mediaSession.setActionHandler('pause', null);
    navigator.mediaSession.setActionHandler('seekbackward', null);
    navigator.mediaSession.setActionHandler('seekforward', null);
    navigator.mediaSession.setActionHandler('previoustrack', null);
    navigator.mediaSession.setActionHandler('nexttrack', null);

    if (musicAudio.muted) {
        musicAudio.play();
    } else {
        musicAudio.play().then(() => fadeInAudio());
    }

    isMusicPlaying = true;
}


function fadeInAudio() {
    let volume = 0;
    const maxVolume = 0.008;
    const interval = setInterval(() => {
        volume += 0.0005;
        if (volume >= maxVolume) {
            musicAudio.volume = maxVolume;
            clearInterval(interval);
        } else {
            musicAudio.volume = volume;
        }
    }, fadeDuration / 25);
}

function fadeOutAudio() {
    return new Promise((resolve) => {
        let volume = musicAudio.volume;
        const interval = setInterval(() => {
            volume -= 0.0005;
            if (volume <= 0) {
                musicAudio.volume = 0;
                musicAudio.pause();
                clearInterval(interval);
                resolve();
            } else {
                musicAudio.volume = volume;
            }
        }, fadeDuration / 25);
    });
}

async function toggleMusic() {
    const db = new database();
    let configClient = await db.readData('configClient');

    if (configClient.launcher_config.music_muted) {
        document.querySelector('.music-btn').classList.remove('icon-speaker-off');
        document.querySelector('.music-btn').classList.add('icon-speaker-on');
        configClient.launcher_config.music_muted = false;
        musicAudio.muted = false;
        await db.updateData('configClient', configClient);
        await fadeInAudio();
        
        if (!isMusicPlaying) {
            await musicAudio.play();
            isMusicPlaying = true;
        }
    } else {
        document.querySelector('.music-btn').classList.remove('icon-speaker-on');
        document.querySelector('.music-btn').classList.add('icon-speaker-off');
        configClient.launcher_config.music_muted = true;
        await db.updateData('configClient', configClient);
        await fadeOutAudio();
        isMusicPlaying = false;
    }
}

async function headplayer(skinBase64) {
    let skin = await new skin2D().creatHeadTexture(skinBase64);
    document.querySelector(".player-head").style.backgroundImage = `url(${skin})`;
}

async function discordAccount() {
    let discordLogoutBtn = document.querySelector('.discord-logout-btn');
    let discordAccountManagerTitle = document.querySelector('#discord-account-manager-title');
    let discordAccountManagerPanel = document.querySelector('#discord-account-manager');
    let discordUsername = await getDiscordUsername();
    let discordUsernameText = document.querySelector('.profile-username');
    let discordPFP = await getDiscordPFP();
    let discordPFPElement = document.querySelector('.discord-profile-image');

    if (discordUsername !== '') {
        discordUsernameText.textContent = discordUsername;
        discordPFPElement.src = discordPFP;
        discordLogoutBtn.addEventListener('click', async () => {
            discordLogoutBtn.style.display = 'none';
            logOutDiscord();
        });
    } else {
        discordAccountManagerTitle.style.display = 'none';
        discordAccountManagerPanel.style.display = 'none';
    }
}

async function logOutDiscord() {
    const db = new database();
    let configClient = await db.readData('configClient')
    await setDiscordUsername('');
    configClient.discord_token = null;
    await db.updateData('configClient', configClient);
    ipcRenderer.send('app-restart');

}

async function setStatus(opt) {
    let nameServerElement = document.querySelector('.server-status-name')
    let statusServerElement = document.querySelector('.server-status-text')
    let playersOnline = document.querySelector('.status-player-count .player-count')

    if (!opt) {
        statusServerElement.classList.add('red')
        statusServerElement.innerHTML = `Apagado - 0 ms`
        document.querySelector('.status-player-count').classList.add('red')
        playersOnline.innerHTML = '0'
        return
    }

    let { ip, port, nameServer } = opt
    nameServerElement.innerHTML = nameServer
    let status = new Status(ip, port);
    let statusServer = await status.getStatus().then(res => res).catch(err => err);

    if (!statusServer.error) {
        statusServerElement.classList.remove('red')
        document.querySelector('.status-player-count').classList.remove('red')
        statusServerElement.innerHTML = `En línea - ${statusServer.ms} ms`
        playersOnline.innerHTML = statusServer.playersConnect
    } else {
        statusServerElement.classList.add('red')
        statusServerElement.innerHTML = `Apagado - 0 ms`
        document.querySelector('.status-player-count').classList.add('red')
        playersOnline.innerHTML = '0'
    }
}


export {
    appdata as appdata,
    changePanel as changePanel,
    config as config,
    database as database,
    logger as logger,
    popup as popup,
    setBackground as setBackground,
    skin2D as skin2D,
    addAccount as addAccount,
    accountSelect as accountSelect,
    getUsername as getUsername,
    setUsername as setUsername,
    slider as Slider,
    getDiscordUsername as getDiscordUsername,
    setDiscordUsername as setDiscordUsername,
    getDiscordPFP as getDiscordPFP,
    setDiscordPFP as setDiscordPFP,
    discordAccount as discordAccount,
    logOutDiscord as logOutDiscord,
    toggleMusic as toggleMusic,
    fadeOutAudio as fadeOutAudio,
    fadeInAudio as fadeInAudio,
    setBackgroundMusic as setBackgroundMusic,
    pkg as pkg,
    setStatus as setStatus
}