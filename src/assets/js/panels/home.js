/**
 * @author Luuxis
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 */
import { config, database, logger, changePanel, appdata, setStatus, pkg, popup, 
    discordAccount, toggleMusic, fadeOutAudio, setBackgroundMusic, getUsername } from '../utils.js'

const { Launch } = require('minecraft-java-core')
const { shell, ipcRenderer } = require('electron')
let playing = false;

class Home {
    static id = "home";
    async init(config) {
        this.config = config;
        this.db = new database();
        this.news()
        this.socialLick()
        this.startrandomNotis()
        this.instancesSelect()
        this.startButtonManager()
        document.querySelector('.settings-btn').addEventListener('click', e => discordAccount() && changePanel('settings'));
        this.jugadorTooltip();
        this.GuiElementsTooltip();
    }

    async news() {
        let newsElement = document.querySelector('.news-list');
        let news = await config.getNews().then(res => res).catch(err => false);
        if (news) {
            if (!news.length) {
                let blockNews = document.createElement('div');
                blockNews.classList.add('news-block');
                blockNews.innerHTML = `
                    <div class="news-header">
                        <img class="server-status-icon" src="assets/images/icon.png">
                        <div class="header-text">
                            <div class="title">Actualmente no hay noticias disponibles.</div>
                        </div>
                        <div class="date">
                            <div class="day">1</div>
                            <div class="month">Enero</div>
                        </div>
                    </div>
                    <div class="news-content">
                        <div class="bbWrapper">
                            <p>Puedes seguir todas las novedades relativas al servidor aquí.</p>
                        </div>
                    </div>`
                newsElement.appendChild(blockNews);
            } else {
                for (let News of news) {
                    let date = this.getdate(News.publish_date)
                    let blockNews = document.createElement('div');
                    blockNews.classList.add('news-block');
                    blockNews.innerHTML = `
                        <div class="news-header">
                            <img class="server-status-icon" src="assets/images/icon.png">
                            <div class="header-text">
                                <div class="title">${News.title}</div>
                            </div>
                            <div class="date">
                                <div class="day">${date.day}</div>
                                <div class="month">${date.month}</div>
                            </div>
                        </div>
                        <div class="news-content">
                            <div class="bbWrapper">
                                <p>${News.content.replace(/\n/g, '</br>')}</p>
                                <p class="news-author">Autor - <span>${News.author}</span></p>
                            </div>
                        </div>`
                    newsElement.appendChild(blockNews);
                }
            }
        } else {
            let blockNews = document.createElement('div');
            blockNews.classList.add('news-block');
            blockNews.innerHTML = `
                <div class="news-header">
                        <img class="server-status-icon" src="assets/images/icon.png">
                        <div class="header-text">
                            <div class="title">Error.</div>
                        </div>
                        <div class="date">
                            <div class="day">1</div>
                            <div class="month">Enero</div>
                        </div>
                    </div>
                    <div class="news-content">
                        <div class="bbWrapper">
                            <p>No se puede contactar con el servidor de noticias</p>
                        </div>
                    </div>`
            newsElement.appendChild(blockNews);
        }
    }

    socialLick() {
        let socials = document.querySelectorAll('.social-block')

        socials.forEach(social => {
            social.addEventListener('click', e => {
                shell.openExternal(e.target.dataset.url)
            })
        });
    }
    

    async notification() { 

        const tips = [
            {
                title: '¡Atencion!',
                message: 'Usa /sethome para guardar tu ubicación favorita.',
                color: '--notification-green',
                icon: 'assets/images/notification/info.png'
            },
            {
                title: 'Consejo de seguridad',
                message: 'No compartas tu contraseña con nadie. El staff nunca la pedirá.',
                color: '--notification-red',
                icon: 'assets/images/notification/exclamation.png'
            },
            {
                title: 'Evita sanciones',
                message: 'Lee las reglas del servidor en el Discord.',
                color: '--notification-red',
                icon: 'assets/images/notification/exclamation.png'
            },
            {
                title: 'Eventos activos',
                message: 'Revisa el Discord para enterarte de los próximos eventos del servidor.',
                color: '--notification-blue',
                icon: 'assets/images/notification/bell.png'
            },
            {
                title: 'Protege tu base',
                message: 'Recuerda usar /flanmenu o una azada de oro para proteger tu zona.',
                color: '--notification-yellow',
                icon: 'assets/images/notification/exclamation2.png'
            }
        ];        

        const randomIndex = Math.floor(Math.random() * tips.length);
        const tip = tips[randomIndex];
    
        const notification = document.querySelector('.message-container');
        const notificationIcon = document.querySelector('.message-icon');
        const notificationTitle = document.querySelector('.message-title');
        const notificationContent = document.querySelector('.message-content');
    
        const color = getComputedStyle(document.documentElement).getPropertyValue(tip.color);
    
        notificationTitle.innerHTML = tip.title;
        notificationContent.innerHTML = tip.message;
        notification.style.background = color;
        notificationIcon.src = tip.icon;
    
        await this.showNotification();
    }

    startrandomNotis() {
        this.notification(); // Muestra uno al inicio
        setInterval(() => {
            this.notification();
        }, 30000); // cada 30 segundos, cambia según tu gusto
    }
    

    async showNotification() {
        let notification = document.querySelector('.message-container');
        notification.style.display = 'flex';
        notification.style.visibility = 'visible';
        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                notification.style.opacity = '1';
            });
        });

    }
    
    async hideNotification() {
        let notification = document.querySelector('.message-container');
        notification.style.opacity = '0';
        await new Promise(resolve => setTimeout(resolve, 1000));
        notification.style.visibility = 'hidden';
        notification.style.display = 'none';
    }

    async startButtonManager() {
        this.startMusicButton()
    }

    async startMusicButton() {
            const db = new database();
            let configClient = await this.db.readData('configClient')
            document.querySelector('.music-btn').style.display = 'block';
            document.querySelector('.music-btn').addEventListener('click', function() {if (!playing) toggleMusic();});
            if (configClient.launcher_config.music_muted) {
                document.querySelector('.music-btn').classList.remove('icon-speaker-on');
                document.querySelector('.music-btn').classList.add('icon-speaker-off');
            } else {
                document.querySelector('.music-btn').classList.remove('icon-speaker-off');
                document.querySelector('.music-btn').classList.add('icon-speaker-on');
            }
    }

    async instancesSelect() {
        let configClient = await this.db.readData('configClient')
        let auth = await this.db.readData('accounts', configClient.account_selected)
        let instancesList = await config.getInstanceList()
        let instanceSelect = instancesList.find(i => i.name == configClient?.instance_selct) ? configClient?.instance_selct : null

        let instanceBTN = document.querySelector('.play-instance')
        let instanteBTNInstance = document.querySelector('.instance-select')
        let instancePopup = document.querySelector('.instance-popup')
        let instancesListPopup = document.querySelector('.instances-List')
        let instanceCloseBTN = document.querySelector('.close-popup')

        if (instancesList.length === 1) {
            document.querySelector('.instance-select').style.display = 'none'
        }

        if (!instanceSelect) {
            let newInstanceSelect = instancesList.find(i => i.whitelistActive == false)
            let configClient = await this.db.readData('configClient')
            configClient.instance_selct = newInstanceSelect.name
            instanceSelect = newInstanceSelect.name
            await this.db.updateData('configClient', configClient)
        }

        for (let instance of instancesList) {
            if (instance.whitelistActive) {
                let whitelist = instance.whitelist.find(whitelist => whitelist == auth?.name)
                if (whitelist !== auth?.name) {
                    if (instance.name == instanceSelect) {
                        let newInstanceSelect = instancesList.find(i => i.whitelistActive == false)
                        let configClient = await this.db.readData('configClient')
                        configClient.instance_selct = newInstanceSelect.name
                        instanceSelect = newInstanceSelect.name
                        setStatus(newInstanceSelect.status)
                        await this.db.updateData('configClient', configClient)
                    }
                }
            } else console.log(`Initializing instance ${instance.name}...`)
            if (instance.name == instanceSelect) setStatus(instance.status)
        }

        instancePopup.addEventListener('click', async e => {
            let configClient = await this.db.readData('configClient')

            if (e.target.classList.contains('instance-elements')) {
                let newInstanceSelect = e.target.id
                let activeInstanceSelect = document.querySelector('.active-instance')

                if (activeInstanceSelect) activeInstanceSelect.classList.toggle('active-instance');
                e.target.classList.add('active-instance');

                configClient.instance_selct = newInstanceSelect
                await this.db.updateData('configClient', configClient)
                instanceSelect = instancesList.filter(i => i.name == newInstanceSelect)
               instancePopup.classList.remove('show')
                let instance = await config.getInstanceList()
                let options = instance.find(i => i.name == configClient.instance_selct)
                await setStatus(options.status)
            }
        })

        instanteBTNInstance.addEventListener('click', async e => {
            let configClient = await this.db.readData('configClient')
            let instanceSelect = configClient.instance_selct
            let auth = await this.db.readData('accounts', configClient.account_selected)

            if (e.target.classList.contains('instance-select') || e.target.classList.contains('grid-icon')) {
                instancesListPopup.innerHTML = ''
                for (let instance of instancesList) {
                    if (instance.whitelistActive) {
                        instance.whitelist.map(whitelist => {
                            if (whitelist == auth?.name) {
                                if (instance.name == instanceSelect) {
                                    instancesListPopup.innerHTML += `<div id="${instance.name}" class="instance-elements active-instance">${instance.name}</div>`
                                } else {
                                    instancesListPopup.innerHTML += `<div id="${instance.name}" class="instance-elements">${instance.name}</div>`
                                }
                            }
                        })
                    } else {
                        if (instance.name == instanceSelect) {
                            instancesListPopup.innerHTML += `<div id="${instance.name}" class="instance-elements active-instance">${instance.name}</div>`
                        } else {
                            instancesListPopup.innerHTML += `<div id="${instance.name}" class="instance-elements">${instance.name}</div>`
                        }
                    }
                }

                instancePopup.classList.add('show')
            }
        })

        instanceBTN.addEventListener('click', () => {
          this.startGame()
        });

        instanceCloseBTN.addEventListener('click', () => instancePopup.classList.remove('show'));
    }

    addTooltipToElement(element, text) {
        if (!window.tooltipManager) {
            this.initializeTooltipManager();
        }
        
        element.addEventListener('mouseenter', (e) => {
            window.tooltipManager.showTooltip(element, text);
        });

        element.addEventListener('mouseleave', (e) => {
            window.tooltipManager.hideTooltip(element);
        });
        
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && 
                    Array.from(mutation.removedNodes).some(node => 
                        node === element || (node.contains && node.contains(element))
                    )) {
                    window.tooltipManager.hideTooltip(element);
                    observer.disconnect();
                }
            }
        });
        
        if (element.parentNode) {
            observer.observe(element.parentNode, { childList: true, subtree: true });
        }
    }

    jugadorTooltip() {
        const playerOptions = document.querySelector('.player-options');
        
        if (!window.tooltipManager) {
            this.initializeTooltipManager();
        }
        
        if (playerOptions) {
            let tooltipActive = false;
            
            playerOptions.addEventListener('mouseenter', async (e) => {
                if (tooltipActive) return;
                tooltipActive = true;
                
                try {
                    const username = await getUsername();
                    if (username) {
                        window.tooltipManager.showTooltip(playerOptions, username);
                    }
                } catch (error) {
                    console.error('Error al obtener el nombre de usuario:', error);
                }
            });
            
            playerOptions.addEventListener('mouseleave', (e) => {
                tooltipActive = false;
                window.tooltipManager.hideTooltip(playerOptions);
            });
            
            playerOptions.style.pointerEvents = 'auto';
        }
    }

    initializeTooltipManager() {
        if (window.tooltipManager) return;

        window.tooltipManager = {
            activeTooltips: new Map(),
            
            showTooltip(element, text) {
                this.hideTooltip(element);
                
                const tooltip = document.createElement('div');
                tooltip.classList.add('tooltip');
                tooltip.innerHTML = text;
                document.body.appendChild(tooltip);
                
                const rect = element.getBoundingClientRect();
                tooltip.style.left = `${rect.right + window.scrollX + 10}px`;
                tooltip.style.top = `${rect.top + window.scrollY + rect.height / 2 - tooltip.offsetHeight / 2}px`;
                
                tooltip.style.zIndex = '10000';
                
                this.activeTooltips.set(element, tooltip);
                
                tooltip.style.opacity = '1';
            },
            
            hideTooltip(element) {
                const tooltip = this.activeTooltips.get(element);
                if (tooltip) {
                    tooltip.style.opacity = '0';
                    this.activeTooltips.delete(element);
                    
                    setTimeout(() => {
                        if (document.body.contains(tooltip)) {
                            document.body.removeChild(tooltip);
                        }
                    }, 200);
                }
            },
            
            hideAllTooltips() {
                this.activeTooltips.forEach((tooltip, element) => {
                    this.hideTooltip(element);
                });
            },
            
            cleanupOrphanedTooltips() {
                document.querySelectorAll('.tooltip').forEach(tooltip => {
                    if (!Array.from(this.activeTooltips.values()).includes(tooltip)) {
                        if (document.body.contains(tooltip)) {
                            document.body.removeChild(tooltip);
                        }
                    }
                });
            }
        };
        
        document.addEventListener('mouseleave', () => {
            window.tooltipManager.hideAllTooltips();
        });
        
        window.addEventListener('blur', () => {
            window.tooltipManager.hideAllTooltips();
        });
        
        setInterval(() => {
            window.tooltipManager.cleanupOrphanedTooltips();
        }, 5000);
        
        document.addEventListener('click', () => {
            window.tooltipManager.hideAllTooltips();
        });
        
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                window.tooltipManager.hideAllTooltips();
            }
        });
    }

    GuiElementsTooltip() {
        if (!window.tooltipManager) {
            this.initializeTooltipManager();
        }
        
        const instanceSelectButton = document.querySelector('.instance-select');
        if (instanceSelectButton) {
            this.addTooltipToElement(instanceSelectButton, "Seleccionar instancia");
        }
        
        const musicButton = document.querySelector('.music-btn');
        if (musicButton) {
            this.addDynamicTooltipToElement(musicButton, () => 
                musicButton.classList.contains('icon-speaker-on') ? 
                    "Silenciar música" : "Activar música"
            );
        }
        
        const settingsButton = document.querySelector('.settings-btn');
        if (settingsButton) {
            this.addTooltipToElement(settingsButton, "Configuración");
        }
    }

    addDynamicTooltipToElement(element, textCallback) {
        if (!window.tooltipManager) {
            this.initializeTooltipManager();
        }
        
        element.addEventListener('mouseenter', (e) => {
            const text = typeof textCallback === 'function' ? textCallback() : textCallback;
            window.tooltipManager.showTooltip(element, text);
        });

        element.addEventListener('mouseleave', (e) => {
            window.tooltipManager.hideTooltip(element);
        });
        
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && 
                    Array.from(mutation.removedNodes).some(node => 
                        node === element || (node.contains && node.contains(element))
                    )) {
                    window.tooltipManager.hideTooltip(element);
                    observer.disconnect();
                }
            }
        });
        
        if (element.parentNode) {
            observer.observe(element.parentNode, { childList: true, subtree: true });
        }
    }

    async startGame() {
        let launch = new Launch()
        let configClient = await this.db.readData('configClient')
        let instance = await config.getInstanceList()
        let authenticator = await this.db.readData('accounts', configClient.account_selected)
        let options = instance.find(i => i.name == configClient.instance_selct)

        let playInstanceBTN = document.querySelector('.play-instance')
        let infoStartingBOX = document.querySelector('.info-starting-game')
        let infoStarting = document.querySelector(".info-starting-game-text")
        let progressBar = document.querySelector('.progress-bar')

        let opt = {
            url: options.url,
            authenticator: authenticator,
            timeout: 10000,
            path: `${await appdata()}/${process.platform == 'darwin' ? this.config.dataDirectory : `.${this.config.dataDirectory}`}`,
            instance: options.name,
            version: options.loadder.minecraft_version,
            detached: configClient.launcher_config.closeLauncher == "close-all" ? false : true,
            downloadFileMultiple: configClient.launcher_config.download_multi,
            intelEnabledMac: configClient.launcher_config.intelEnabledMac,

            loader: {
                type: options.loadder.loadder_type,
                build: options.loadder.loadder_version,
                enable: options.loadder.loadder_type == 'none' ? false : true
            },

            verify: options.verify,

            ignored: [...options.ignored],

            java: {
                path: configClient.java_config.java_path,
            },

            JVM_ARGS:  options.jvm_args ? options.jvm_args : [],
            GAME_ARGS: options.game_args ? options.game_args : [],

            screen: {
                width: configClient.game_config.screen_size.width,
                height: configClient.game_config.screen_size.height
            },

            memory: {
                min: `${configClient.java_config.java_memory.min * 1024}M`,
                max: `${configClient.java_config.java_memory.max * 1024}M`
            }
        }

        launch.Launch(opt);

        playInstanceBTN.style.display = "none"
        infoStartingBOX.style.display = "block"
        progressBar.style.display = "";
        ipcRenderer.send('main-window-progress-load')

      
    // Progreso de descarga
    launch.on('progress', (progress, size) => {
        if (!size || size <= 0) return;
        const percent = ((progress / size) * 100).toFixed(0);
        infoStarting.innerHTML = `Descargando ${percent}%`;
        ipcRenderer.send('main-window-progress', { progress, size });
        progressBar.value = progress;
        progressBar.max = size;
    });

    // Verificación de archivos
    launch.on('check', (progress, size) => {
        if (!size || size <= 0) return;
        const percent = ((progress / size) * 100).toFixed(0);
        infoStarting.innerHTML = `Verificación ${percent}%`;
        ipcRenderer.send('main-window-progress', { progress, size });
        progressBar.value = progress;
        progressBar.max = size;
    });

    // Tiempo estimado
    launch.on('estimated', (time) => {
        if (!isFinite(time) || time <= 0) return;
        let hours = Math.floor(time / 3600);
        let minutes = Math.floor((time % 3600) / 60);
        let seconds = Math.floor(time % 60);
        console.log(`[OJOLAND-Launcher]: ${hours}h ${minutes}m ${seconds}s`);
    });

    // Velocidad con limitador (una vez por segundo)
    let lastSpeedLog = 0;
    launch.on('speed', (speed) => {
        const now = Date.now();
        if (now - lastSpeedLog < 1000) return;
        lastSpeedLog = now;
        if (!isFinite(speed) || speed <= 0) return;
        console.log(`[OJOLAND-Launcher]: ${(speed / 1067008).toFixed(2)} Mb/s`);
    });

    // Parches
    launch.on('patch', patch => {
        console.log(patch);
        ipcRenderer.send('main-window-progress-load');
        infoStarting.innerHTML = `Parche en progreso...`;
    });

    // Extracción
    launch.on('extract', extract => {
        ipcRenderer.send('main-window-progress-load');
        console.log(extract);
    });

    // Cuando inicia el juego
    launch.on('data', (e) => {
        progressBar.style.display = "none";
        if (configClient.launcher_config.closeLauncher == 'close-launcher') {
            ipcRenderer.send("main-window-hide");
        }
        new logger('Minecraft', '#36b030');
        ipcRenderer.send('main-window-progress-load');
        infoStarting.innerHTML = `Empezando...`;
        console.log(e);
    });

    // Cuando se cierra el juego
    launch.on('close', code => {
        if (configClient.launcher_config.closeLauncher == 'close-launcher') {
            ipcRenderer.send("main-window-show");
        }
        ipcRenderer.send('main-window-progress-reset');
        infoStartingBOX.style.display = "none";
        playInstanceBTN.style.display = "flex";
        infoStarting.innerHTML = `Verificación`;
        new logger(pkg.name, '#7289da');
        console.log('Close');
    });

    // Manejo de errores
    launch.on('error', err => {
        // Filtrar errores comunes de red
        const msg = err?.message || err?.error || '';
        if (
            msg.includes('ERR_CONNECTION_RESET') ||
            msg.includes('network error') ||
            msg.includes('The user aborted a request')
        ) {
            console.warn('[OJOLAND-Launcher]: Problema de red detectado, reintentando...');
            // Si quieres reintentar:
             setTimeout(() => this.startGame(), 3000);
            return;
        }

        let popupError = new popup();
        popupError.openPopup({
            title: 'Error al iniciar el juego',
            content: msg || 'Error desconocido',
            color: 'red',
            options: true
        });

        if (configClient.launcher_config.closeLauncher == 'close-launcher') {
            ipcRenderer.send("main-window-show");
        }

        ipcRenderer.send('main-window-progress-reset');
        infoStartingBOX.style.display = "none";
        playInstanceBTN.style.display = "flex";
        infoStarting.innerHTML = `Verificación`;
        new logger(pkg.name, '#7289da');
        console.error(err);
    });

    }

    getdate(e) {
        let date = new Date(e)
        let year = date.getFullYear()
        let month = date.getMonth() + 1
        let day = date.getDate()
        let allMonth = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
        return { year: year, month: allMonth[month - 1], day: day }
    }

}
export default Home;