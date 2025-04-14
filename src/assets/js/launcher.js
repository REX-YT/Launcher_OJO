/**
 * @author Luuxis
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 */
// import panel
import Login from './panels/login.js';
import Home from './panels/home.js';
import Settings from './panels/settings.js';
import LogsSystem from "./logsSystem.js";

//import Snowfall from './snow.js';

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
    setPerformanceMode,
    setBackgroundMusic,
    setDiscordPFP, } from './utils.js';

import { sendClientReport } from './RexApiLib.js';
const { AZauth, Microsoft, Mojang } = require('minecraft-java-core');

// libs
const { ipcRenderer } = require('electron');
const fs = require('fs');
const os = require('os');
let dev = process.env.NODE_ENV === "dev";

class Launcher {
    async init() {
      if (dev) this.initLog();
      else this.initWindow();  
  
      console.log("Iniciando Launcher...");

        this.shortcut()
        await setBackground()
     //   new Snowfall("snowCanvas"); // Inicia los copos de nieve
        this.initFrame();
        this.config = await config.GetConfig().then(res => res).catch(err => err);
        if (await this.config.error) return this.errorConnect()
        this.db = new database();
        const configClient = await this.db.readData("configClient");
        const isFirstRun = !configClient;

            
    if (isFirstRun) {
      await this.initConfigClient();
    } else {

        if (configClient.launcher_config.performance_mode) {
          console.log("Modo de rendimiento activado");
          document.body.classList.add('performance-mode');
          
          this.applyPerformanceModeOverrides();
          
          setPerformanceMode(true);
        } else {
          this.PantallaCarga();
        }

     }
     
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

    PantallaCarga() {
    
      if (this.loadingDisplayTimer) {
        clearTimeout(this.loadingDisplayTimer);
      }
      
      const loadingOverlay = document.querySelector('.loading-overlay');
      if (loadingOverlay) {
        loadingOverlay.classList.add('active');
        loadingOverlay.style.visibility = 'visible';
        loadingOverlay.style.opacity = '1';
        loadingOverlay.style.display = 'flex';
      }
      
      this.loadingDisplayTimer = setTimeout(() => {
        this.OcultarPantallaCarga();
      }, 3000);
    }

    OcultarPantallaCarga() {
      const loadingOverlay = document.querySelector('.loading-overlay');
      if (!loadingOverlay) {
        console.warn("No se encontró elemento loading-overlay");
        return;
      }
      
      
      const configClient = this.db.readData('configClient');
      if (configClient && configClient.launcher_config && configClient.launcher_config.performance_mode) {
        loadingOverlay.style.transition = 'none';
        loadingOverlay.style.opacity = '0';
        loadingOverlay.style.visibility = 'hidden';
        loadingOverlay.classList.remove('active');
        return;
      }
      
      try {
        loadingOverlay.classList.remove('active');
        
        setTimeout(() => {
          loadingOverlay.style.opacity = '0';
          loadingOverlay.style.visibility = 'hidden';
        }, 800);
      } catch (err) {
        console.error("Error al ocultar pantalla de carga:", err);
        loadingOverlay.style.opacity = '0';
        loadingOverlay.style.visibility = 'hidden';
        loadingOverlay.style.display = 'none';
      }
    }
    

    shortcut() {
        document.addEventListener('keydown', e => {
            if (e.ctrlKey && e.keyCode == 87) {
                ipcRenderer.send('main-window-close');
            }
        })
    }

    async initWindow() {
      window.logger2 = {
        launcher: new LogsSystem("Launcher", "#FF7F18"),
        minecraft: new LogsSystem("Minecraft", "#43B581"),
      };
  
      this.initLogs();
  
      window.console = window.logger2.launcher;
  
      window.onerror = (message, source, lineno, colno, error) => {
        console.error(error);
        source = source.replace(`${window.location.origin}/app/`, "");
        let stack = error.stack
          .replace(
            new RegExp(
              `${window.location.origin}/app/`.replace(/\//g, "\\/"),
              "g"
            ),
            ""
          )
          .replace(/\n/g, "<br>")
          .replace(/\x20/g, "&nbsp;");
        new popup().openPopup(
          "Se ha producido un error.",
          `
              <b>Error:</b> ${error.message}<br>
              <b>Archivo:</b> ${source}:${lineno}:${colno}<br>
              <b>Stacktrace:</b> ${stack}`,
          "warning",
          {
            value: "Relancer",
            func: () => {
              document.body.classList.add("hide");
              win.reload();
            },
          }
        );
        document.body.classList.remove("hide");
        return true;
      };
  
      window.onclose = () => {
        localStorage.removeItem("distribution");
      };

      const baseVersionInfoElement = document.getElementById('base-version-info');
    
      if (pkg.version && baseVersionInfoElement) {
          baseVersionInfoElement.textContent = `v${pkg.version}`;
          baseVersionInfoElement.style.display = 'inline';
        }

    }


    async initLogs() {
      let logs = document.querySelector(".log-bg");
      let logs1 = document.querySelector(".logger");
      let logContent = document.querySelector(".logger .content");
      let scrollToBottomButton = document.querySelector(".scroll-to-bottom");
      let autoScroll = true;
  
      document.addEventListener("keydown", (e) => {
        if ((e.ctrlKey && e.shiftKey && e.keyCode == 73) || e.keyCode == 123) {
          logs.classList.toggle("show");
          logs1.classList.toggle("open");
        }
      });
  
      document.addEventListener("keydown", (e) => {
        if (e.key === 'Escape' && logs.classList.contains('show')) {
          logs.classList.toggle("show");
          logs1.classList.toggle("open");
        }
      });
  
      let close = document.querySelector(".log-close");
      close.addEventListener("click", () => {
        logs.classList.toggle("show");
        logs1.classList.toggle("open");
      });
  
      logContent.addEventListener("scroll", () => {
        if (logContent.scrollTop + logContent.clientHeight < logContent.scrollHeight) {
          autoScroll = false;
          scrollToBottomButton.classList.add("show");
          scrollToBottomButton.style.pointerEvents = "auto";
        } else {
          autoScroll = true;
          scrollToBottomButton.classList.remove("show");
          scrollToBottomButton.style.pointerEvents = "none";
        }
      });
  
      scrollToBottomButton.addEventListener("click", () => {
        autoScroll = true;
        logContent.scrollTo({
          top: logContent.scrollHeight,
          behavior: "smooth"
        });
        scrollToBottomButton.classList.remove("show");
        scrollToBottomButton.style.pointerEvents = "none";
      });
  
      let reportIssueButton = document.querySelector(".report-issue");
      reportIssueButton.classList.add("show");
      reportIssueButton.addEventListener("click", () => {
        logs.classList.toggle("show");
        this.confirmReportIssue();
      });
  
      logger2.launcher.on("info", (...args) => {
        addLog(logContent, "info", args);
      });
  
      logger2.launcher.on("warn", (...args) => {
        addLog(logContent, "warn", args);
      });
  
      logger2.launcher.on("debug", (...args) => {
        addLog(logContent, "debug", args);
      });
  
      logger2.launcher.on("error", (...args) => {
        addLog(logContent, "error", args);
      });
  
      function addLog(content, type, args) {
        let final = [];
        for (let arg of args) {
          if (typeof arg == "string") {
            final.push(arg);
          } else if (arg instanceof Error) {
            final.push(arg.stack);
          } else if (typeof arg == "object") {
            final.push(JSON.stringify(arg));
          } else {
            final.push(arg);
          }
        }
        let span = document.createElement("span");
        span.classList.add(type);
        span.innerHTML = `${final.join(" ")}<br>`
          .replace(/\x20/g, "&nbsp;")
          .replace(/\n/g, "<br>");
  
        content.appendChild(span);
        if (autoScroll) {
          content.scrollTop = content.scrollHeight;
        }
      }
  
      logContent.scrollTop = logContent.scrollHeight;
    }

    async confirmReportIssue() {
      let reportPopup = new popup();
      let logs = document.querySelector(".log-bg");
      let dialogResult = await new Promise(resolve => {
        reportPopup.openDialog({
              title: 'Enviar reporte?',
              content: 'Si estas experimentando problemas con el launcher, puedes enviar un reporte de rendimiento para ayudarnos a solucionar el problema. <br><br>Quieres enviar un reporte a DevRex?',
              options: true,
              callback: resolve
          });
      });
      if (dialogResult === 'cancel') {
          logs.classList.toggle("show");
          return;
      }
      this.sendReport();
    }
  
    sendReport() {
      let logContent = document.querySelector(".logger .content").innerText;
      sendClientReport(logContent);
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
      const platform = os.platform() === 'darwin' ? "darwin" : "other";
      
      document.querySelector(`.${platform} .frame`).classList.toggle('hide');
      
      if (platform === "darwin") document.querySelector(".dragbar").classList.toggle("hide");
  
      const minimizeBtn = document.querySelector(`.${platform} #minimize`);
      const closeBtn = document.querySelector(`.${platform} #close`);
  
      if (minimizeBtn) {
        minimizeBtn.addEventListener("click", () => {
          ipcRenderer.send("main-window-minimize");
        });
      }
  
      if (closeBtn) {
        closeBtn.addEventListener("click", async () => {
          ipcRenderer.send('main-window-close');
        });
      }
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
                    download_multi: 10,
                    theme: 'auto',
                    closeLauncher: 'close-launcher',
                    intelEnabledMac: true,
                    music_muted: false,
                    performance_mode: false
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
                    await setUsername(refresh_accounts.name)
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
                    await setUsername(refresh_accounts.name)
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
                        await setUsername(refresh_accounts.name)
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
                    await setUsername(refresh_accounts.name)
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

    applyPerformanceModeOverrides() {
      const panels = document.querySelectorAll('.panel');
      panels.forEach(panel => {
        panel.style.transition = 'none';
        panel.style.transitionProperty = 'none';
        panel.style.transitionDuration = '0s';
        panel.style.transitionDelay = '0s';
      });
      
      const settingsContainers = document.querySelectorAll('.container-settings');
      settingsContainers.forEach(container => {
        container.style.transition = 'none';
        container.style.transform = 'none';
      });
      
      const settingsBtns = document.querySelectorAll('.nav-settings-btn');
      settingsBtns.forEach(btn => {
        btn.style.transition = 'none';
      });
      
      const settingsContent = document.querySelector('.settings-content');
      if (settingsContent) {
        settingsContent.style.transition = 'none';
      }
      
      console.log("Aplicados ajustes específicos para el modo rendimiento");
    }
  }

new Launcher().init();
