/**
 * @author Luuxis
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 */
// import panel
import Login from './panels/login.js';
import Home from './panels/home.js';
import Settings from './panels/settings.js';

// import modules
import { logger, config, changePanel, database, popup,
    setBackground, 
    accountSelect, 
    addAccount, 
    pkg , 
    setUsername,
    getUsername,
    setDiscordUsername,
    getDiscordUsername,
    setBackgroundMusic,
    setDiscordPFP, } from './utils.js';
const { AZauth, Microsoft, Mojang } = require('minecraft-java-core');

// libs
const { ipcRenderer } = require('electron');
const fs = require('fs');

class Launcher {
    async init() {
        this.initLog();
        console.log('Initializing Launcher...');
        this.shortcut()
        await setBackground()
        if (process.platform == 'win32') this.initFrame();
        this.config = await config.GetConfig().then(res => res).catch(err => err);
        if (await this.config.error) return this.errorConnect()
        this.db = new database();
        await this.initConfigClient();
        this.createPanels(Login, Home, Settings);
        setBackgroundMusic();
        await this.verifyDiscordAccount();
    }

    initLog() {
        document.addEventListener('keydown', e => {
            if (e.ctrlKey && e.shiftKey && e.keyCode == 73 || e.keyCode == 123) {
                ipcRenderer.send('main-window-dev-tools-close');
                ipcRenderer.send('main-window-dev-tools');
            }
        })
        new logger(pkg.name, '#7289da')
    }

    shortcut() {
        document.addEventListener('keydown', e => {
            if (e.ctrlKey && e.keyCode == 87) {
                ipcRenderer.send('main-window-close');
            }
        })
    }


    errorConnect() {
        new popup().openPopup({
            title: this.config.error.code,
            content: this.config.error.message,
            color: 'red',
            exit: true,
            options: true
        });
    }

    initFrame() {
        console.log('Initializing Frame...')
        document.querySelector('.frame').classList.toggle('hide')
        document.querySelector('.dragbar').classList.toggle('hide')

        document.querySelector('#minimize').addEventListener('click', () => {
            ipcRenderer.send('main-window-minimize');
        });

        let maximized = false;
        let maximize = document.querySelector('#maximize')
        maximize.addEventListener('click', () => {
            if (maximized) ipcRenderer.send('main-window-maximize')
            else ipcRenderer.send('main-window-maximize');
            maximized = !maximized
            maximize.classList.toggle('icon-maximize')
            maximize.classList.toggle('icon-restore-down')
        });

        document.querySelector('#close').addEventListener('click', () => {
            ipcRenderer.send('main-window-close');
        })
    }

    async initConfigClient() {
        console.log('Initializing Config Client...')
        let configClient = await this.db.readData('configClient')

        if (!configClient) {
            await this.db.createData('configClient', {
                account_selected: null,
                instance_selct: null,
                discord_token: null,
                music_muted: false,
                java_config: {
                    java_path: null,
                    java_memory: {
                        min: 2,
                        max: 4
                    }
                },
                game_config: {
                    screen_size: {
                        width: 854,
                        height: 480
                    }
                },
                launcher_config: {
                    download_multi: 5,
                    theme: 'auto',
                    closeLauncher: 'close-launcher',
                    intelEnabledMac: true,
                    music_muted: false
                }
            })
        }
    }

    createPanels(...panels) {
        let panelsElem = document.querySelector('.panels')
        for (let panel of panels) {
            console.log(`Initializing ${panel.name} Panel...`);
            let div = document.createElement('div');
            div.classList.add('panel', panel.id)
            div.innerHTML = fs.readFileSync(`${__dirname}/panels/${panel.id}.html`, 'utf8');
            panelsElem.appendChild(div);
            new panel().init(this.config);
        }
    }

    async verifyDiscordAccount() {
        let configClient = await this.db.readData("configClient");
        let token;
        let isMember;
        let isTokenValid;
    
        try {
          console.log("Verificando token de discord...");
          isTokenValid = await this.checkTokenValidity();
        } catch (error) {
          let discorderrdialog = new popup();
    
          let dialogResult = await new Promise((resolve) => {
            discorderrdialog.openDialog({
              title: "Error de autenticación",
              content:
                "No se ha podido verificar la sesión de Discord. <br><br>Quieres volver a intentarlo?",
              options: true,
              callback: resolve,
            });
          });
    
          if (dialogResult === "cancel") {
            configClient.discord_token = null;
            await this.db.updateData("configClient", configClient);
            await this.verifyDiscordAccount();
            return;
          } else {
            await this.verifyDiscordAccount();
            return;
          }
        }
    
        if (!isTokenValid) {
          let discorderrdialog = new popup();
          console.error("Token de discord no válido");
          let dialogResult = await new Promise((resolve) => {
            discorderrdialog.openDialog({
              title: "Verificación de Discord",
              content:
                "Para poder acceder al launcher debes iniciar sesión con tu cuenta de Discord y estar en el discord<br>Quieres iniciar sesión ahora?",
              options: true,
              callback: resolve,
            });
          });
    
          if (dialogResult === "cancel") {
            let connectingPopup = new popup();

            connectingPopup.openPopup({
                title: 'Lanzador de OJOLAND',
                content: 'Cerrando el lanzador...',
                color: 'var(--color)'
            });
                      ipcRenderer.send('main-window-close');
          } else {
            let retry = true;
    
            while (retry) {
              let connectingPopup = new popup();
              try {
                connectingPopup.openPopup({
                  title: 'Verificación de Discord',
                  content: 'Esperando a la autorización...',
                  color: 'var(--color)'
              });
                token = await ipcRenderer.invoke("open-discord-auth");
                connectingPopup.closePopup();
                retry = false;
              } catch (error) {
                connectingPopup.closePopup();
                console.error("Error al obtener el token de Discord");
                let discorderrdialog = new popup();
    
                let dialogResult = await new Promise((resolve) => {
                  discorderrdialog.openDialog({
                    title: "Error al verificar la cuenta de Discord",
                    content:
                      "No se ha podido verificar la cuenta de Discord. <br><br>Quieres intentarlo de nuevo?",
                    options: true,
                    callback: resolve,
                  });
                });
    
                if (dialogResult === "cancel") {
                    let connectingPopup = new popup();

                    connectingPopup.openPopup({
                        title: 'Lanzador de OJOLAND',
                        content: 'Cerrando el lanzador...',
                        color: 'var(--color)'
                    });
                    ipcRenderer.send('main-window-close');
                  retry = false;
                }
              }
            }
    
            if (token) {
              configClient.discord_token = token;
              await this.db.updateData("configClient", configClient);
            }
          }
        } else {
          token = configClient.discord_token;
        }
        let verifypopup = new popup();
        verifypopup.openPopup({
          title: "Verificando cuenta de Discord...",
          content: "Por favor, espera un momento...",
          color: "var(--color)",
          background: false,
        });
        isMember = (await this.isUserInGuild(token, pkg.discord_server_id))
          .isInGuild;
          verifypopup.closePopup();
        if (!isMember) {
          let discorderrdialog = new popup();
    
          let dialogResult = await new Promise((resolve) => {
            discorderrdialog.openDialog({
              title: "Error al verificar la cuenta de Discord",
              content:
                "No se ha detectado que seas miembro del servidor de Discord. Para poder utilizar el launcher debes ser miembro del servidor. <br><br>Quieres unirte ahora? Se abrirá una ventana en tu navegador.",
              options: true,
              callback: resolve,
            });
          });
    
          if (dialogResult === "cancel") {
            configClient.discord_token = null;
            await this.db.updateData("configClient", configClient);
            await this.verifyDiscordAccount();
            return;
          } else {
            ipcRenderer.send("open-discord-url");
            configClient.discord_token = null;
            await this.db.updateData("configClient", configClient);
            await this.verifyDiscordAccount();
            return;
          }
        } else {
          await this.startLauncher();
        }
      }
    
      async checkTokenValidity() {
        let configClient = await this.db.readData("configClient");
        let token = configClient.discord_token;
        if (!token || token == "" || token == null) return false;
        try {
          const response = await fetch("https://discord.com/api/users/@me", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
    
          if (response.ok) {
            return true;
          } else {
            return false;
          }
        } catch (error) {
          return false;
        }
      }
    
      async isUserInGuild(accessToken, guildId) {
        let username;
        let userpfp;
        try {
          const response = await fetch("https://discord.com/api/users/@me/guilds", {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });
    
          if (!response.ok) {
            throw new Error("Failed to fetch guilds");
          }
          const userResponse = await fetch("https://discord.com/api/users/@me", {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });
          username = "Desconocido";
          userpfp = "https://cdn.discordapp.com/embed/avatars/0.png?size=1024";
          if (!userResponse.ok) {
            throw new Error("Failed to fetch user info");
          } else {
            const user = await userResponse.json();
            username = user.username;
            //si user.avatar es null, se pone el avatar por defecto
            if (user.avatar === null) {
              userpfp = "https://cdn.discordapp.com/embed/avatars/0.png?size=1024";
            } else {
            userpfp = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}?size=1024`;
            }
          }
          setDiscordPFP(userpfp);
          setDiscordUsername(username);
    
          const guilds = await response.json();
    
          const isInGuild = guilds.some((guild) => guild.id === guildId);
 
          return { isInGuild };
        } catch (error) {
          console.error("Error al verificar la pertenencia al servidor:", error);
          return { isInGuild: false, error: error.message };
        }
      }

    async startLauncher() {
        let accounts = await this.db.readAllData('accounts')
        let configClient = await this.db.readData('configClient')
        let account_selected = configClient ? configClient.account_selected : null
        let popupRefresh = new popup();

        if (accounts?.length) {
            for (let account of accounts) {
                let account_ID = account.ID
                if (account.error) {
                    await this.db.deleteData('accounts', account_ID)
                    continue
                }
                if (account.meta.type === 'Xbox') {
                    console.log(`Account Type: ${account.meta.type} | Username: ${account.name}`);
                    popupRefresh.openPopup({
                        title: 'OJOLAND',
                        content: `Iniciando como: ${account.name}`,
                        color: 'var(--color)',
                        background: false
                    });

                    let refresh_accounts = await new Microsoft(this.config.client_id).refresh(account);

                    if (refresh_accounts.error) {
                        await this.db.deleteData('accounts', account_ID)
                        if (account_ID == account_selected) {
                            configClient.account_selected = null
                            await this.db.updateData('configClient', configClient)
                        }
                        console.error(`[Account] ${account.name}: ${refresh_accounts.errorMessage}`);
                        continue;
                    }

                    refresh_accounts.ID = account_ID
                    await this.db.updateData('accounts', refresh_accounts, account_ID)
                    await addAccount(refresh_accounts)
                    if (account_ID == account_selected) accountSelect(refresh_accounts)
                } else if (account.meta.type == 'AZauth') {
                    console.log(`Account Type: ${account.meta.type} | Username: ${account.name}`);
                    popupRefresh.openPopup({
                        title: 'OJOLAND',
                        content: `Iniciando como: ${account.name}`,
                        color: 'var(--color)',
                        background: false
                    });
                    let refresh_accounts = await new AZauth(this.config.online).verify(account);

                    if (refresh_accounts.error) {
                        this.db.deleteData('accounts', account_ID)
                        if (account_ID == account_selected) {
                            configClient.account_selected = null
                            this.db.updateData('configClient', configClient)
                        }
                        console.error(`[Account] ${account.name}: ${refresh_accounts.message}`);
                        continue;
                    }

                    refresh_accounts.ID = account_ID
                    this.db.updateData('accounts', refresh_accounts, account_ID)
                    await addAccount(refresh_accounts)
                    if (account_ID == account_selected) accountSelect(refresh_accounts)
                } else if (account.meta.type == 'Mojang') {
                    console.log(`Account Type: ${account.meta.type} | Username: ${account.name}`);
                    popupRefresh.openPopup({
                        title: 'OJOLAND',
                        content: `Iniciando como: ${account.name}`,
                        color: 'var(--color)',
                        background: false
                    });
                    if (account.meta.online == false) {
                        let refresh_accounts = await Mojang.login(account.name);

                        refresh_accounts.ID = account_ID
                        await addAccount(refresh_accounts)
                        this.db.updateData('accounts', refresh_accounts, account_ID)
                        if (account_ID == account_selected) accountSelect(refresh_accounts)
                        continue;
                    }

                    let refresh_accounts = await Mojang.refresh(account);

                    if (refresh_accounts.error) {
                        this.db.deleteData('accounts', account_ID)
                        if (account_ID == account_selected) {
                            configClient.account_selected = null
                            this.db.updateData('configClient', configClient)
                        }
                        console.error(`[Account] ${account.name}: ${refresh_accounts.errorMessage}`);
                        continue;
                    }

                    refresh_accounts.ID = account_ID
                    this.db.updateData('accounts', refresh_accounts, account_ID)
                    await addAccount(refresh_accounts)
                    if (account_ID == account_selected) accountSelect(refresh_accounts)
                } else {
                    console.error(`[Account] ${account.name}: Account Type Not Found`);
                    this.db.deleteData('accounts', account_ID)
                    if (account_ID == account_selected) {
                        configClient.account_selected = null
                        this.db.updateData('configClient', configClient)
                    }
                }
            }

            accounts = await this.db.readAllData('accounts')
            configClient = await this.db.readData('configClient')
            account_selected = configClient ? configClient.account_selected : null

            if (!account_selected) {
                let uuid = accounts[0].ID
                if (uuid) {
                    configClient.account_selected = uuid
                    await this.db.updateData('configClient', configClient)
                    accountSelect(uuid)
                }
            }

            if (!accounts.length) {
                config.account_selected = null
                await this.db.updateData('configClient', config);
                popupRefresh.closePopup()
                return changePanel("login");
            }

            popupRefresh.closePopup()
            changePanel("home");
        } else {
            popupRefresh.closePopup()
            changePanel('login');
        }
    }
}

new Launcher().init();
