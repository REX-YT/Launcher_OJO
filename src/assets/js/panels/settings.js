/**
 * @author Luuxis
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 */

import { changePanel, accountSelect, database, Slider, config, setStatus, popup, appdata, setBackground } from '../utils.js'
const { ipcRenderer } = require('electron');
const os = require('os');
const fs = require('fs');
const path = require('path');

class Settings {
    static id = "settings";
    async init(config) {
        this.config = config;
        this.db = new database();
        this.navBTN()
        this.accounts()
        this.ram()
        this.javaPath()
        this.resolution()
        this.launcher()
    }

    navBTN() {
        document.querySelector('.nav-box').addEventListener('click', e => {
            if (e.target.classList.contains('nav-settings-btn')) {
                let id = e.target.id

                let activeSettingsBTN = document.querySelector('.active-settings-BTN')
                let activeContainerSettings = document.querySelector('.active-container-settings')

                if (id == 'save') {
                    if (activeSettingsBTN) activeSettingsBTN.classList.toggle('active-settings-BTN');
                    document.querySelector('#account').classList.add('active-settings-BTN');

                    if (activeContainerSettings) activeContainerSettings.classList.toggle('active-container-settings');
                    document.querySelector(`#account-tab`).classList.add('active-container-settings');
                    return changePanel('home')
                }

                if (activeSettingsBTN) activeSettingsBTN.classList.toggle('active-settings-BTN');
                e.target.classList.add('active-settings-BTN');

                if (activeContainerSettings) activeContainerSettings.classList.toggle('active-container-settings');
                document.querySelector(`#${id}-tab`).classList.add('active-container-settings');
            }
        })
    }

    accounts() {
        document.querySelector('.accounts-list').addEventListener('click', async e => {
            let popupAccount = new popup()
            try {
                let id = e.target.id
                if (e.target.classList.contains('account')) {
                    popupAccount.openPopup({
                        title: 'OJOLAND',
                        content: 'Espere por favor...',
                        color: 'var(--color)'
                    })

                    if (id == 'add') {
                        document.querySelector('.cancel-home').style.display = 'inline'
                        return changePanel('login')
                    }

                    let account = await this.db.readData('accounts', id);
                    let configClient = await this.setInstance(account);
                    await accountSelect(account);
                    configClient.account_selected = account.ID;
                    return await this.db.updateData('configClient', configClient);
                }

                if (e.target.classList.contains("delete-profile")) {
                    popupAccount.openPopup({
                        title: 'OJOLAND',
                        content: 'Espere por favor...',
                        color: 'var(--color)'
                    })
                    await this.db.deleteData('accounts', id);
                    let deleteProfile = document.getElementById(`${id}`);
                    let accountListElement = document.querySelector('.accounts-list');
                    accountListElement.removeChild(deleteProfile);

                    if (accountListElement.children.length == 1) return changePanel('login');

                    let configClient = await this.db.readData('configClient');

                    if (configClient.account_selected == id) {
                        let allAccounts = await this.db.readAllData('accounts');
                        configClient.account_selected = allAccounts[0].ID
                        accountSelect(allAccounts[0]);
                        let newInstanceSelect = await this.setInstance(allAccounts[0]);
                        configClient.instance_selct = newInstanceSelect.instance_selct
                        return await this.db.updateData('configClient', configClient);
                    }
                }
            } catch (err) {
                console.error(err)
            } finally {
                popupAccount.closePopup();
            }
        })
    }

    async setInstance(auth) {
        let configClient = await this.db.readData('configClient')
        let instanceSelect = configClient.instance_selct
        let instancesList = await config.getInstanceList()

        for (let instance of instancesList) {
            if (instance.whitelistActive) {
                let whitelist = instance.whitelist.find(whitelist => whitelist == auth.name)
                if (whitelist !== auth.name) {
                    if (instance.name == instanceSelect) {
                        let newInstanceSelect = instancesList.find(i => i.whitelistActive == false)
                        configClient.instance_selct = newInstanceSelect.name
                        await setStatus(newInstanceSelect.status)
                    }
                }
            }
        }
        return configClient
    }

    async ram() {
        let config = await this.db.readData('configClient');
        let totalMem = Math.trunc(os.totalmem() / 1073741824 * 10) / 10;
        let freeMem = Math.trunc(os.freemem() / 1073741824 * 10) / 10;

        document.getElementById("total-ram").textContent = `${totalMem} GB`;
        document.getElementById("free-ram").textContent = `${freeMem} GB`;

        let sliderDiv = document.querySelector(".memory-slider");
        sliderDiv.setAttribute("max", Math.trunc((80 * totalMem) / 100));

        let ram = config?.java_config?.java_memory ? {
            ramMin: config.java_config.java_memory.min,
            ramMax: config.java_config.java_memory.max
        } : { ramMin: "1", ramMax: "2" };

        if (totalMem < ram.ramMin) {
            config.java_config.java_memory = { min: 1, max: 2 };
            this.db.updateData('configClient', config);
            ram = { ramMin: "1", ramMax: "2" }
        };

        let slider = new Slider(".memory-slider", parseFloat(ram.ramMin), parseFloat(ram.ramMax));

        let minSpan = document.querySelector(".slider-touch-left span");
        let maxSpan = document.querySelector(".slider-touch-right span");

        minSpan.setAttribute("value", `${ram.ramMin} GB`);
        maxSpan.setAttribute("value", `${ram.ramMax} GB`);

        slider.on("change", async (min, max) => {
            let config = await this.db.readData('configClient');
            minSpan.setAttribute("value", `${min} GB`);
            maxSpan.setAttribute("value", `${max} GB`);
            config.java_config.java_memory = { min: min, max: max };
            this.db.updateData('configClient', config);
        });
    }

    async javaPath() {
        let javaPathText = document.querySelector(".java-path-txt")
        javaPathText.textContent = `${await appdata()}/${process.platform == 'darwin' ? this.config.dataDirectory : `.${this.config.dataDirectory}`}/runtime`;

        let configClient = await this.db.readData('configClient')
        let javaPath = configClient?.java_config?.java_path || 'Utilice la versión del Java con el lanzador';
        let javaPathInputTxt = document.querySelector(".java-path-input-text");
        let javaPathInputFile = document.querySelector(".java-path-input-file");
        javaPathInputTxt.value = javaPath;

        document.querySelector(".java-path-set").addEventListener("click", async () => {
            javaPathInputFile.value = '';
            javaPathInputFile.click();
            await new Promise((resolve) => {
                let interval;
                interval = setInterval(() => {
                    if (javaPathInputFile.value != '') resolve(clearInterval(interval));
                }, 100);
            });

            if (javaPathInputFile.value.replace(".exe", '').endsWith("java") || javaPathInputFile.value.replace(".exe", '').endsWith("javaw")) {
                let configClient = await this.db.readData('configClient')
                let file = javaPathInputFile.files[0].path;
                javaPathInputTxt.value = file;
                configClient.java_config.java_path = file
                await this.db.updateData('configClient', configClient);
            } else alert("El nombre del archivo debe ser java o javaw.");
        });

        document.querySelector(".java-path-reset").addEventListener("click", async () => {
            let configClient = await this.db.readData('configClient')
            javaPathInputTxt.value = 'Utilice la versión del Java con el lanzador';
            configClient.java_config.java_path = null
            await this.db.updateData('configClient', configClient);
        });
    }

    async resolution() {
        let configClient = await this.db.readData('configClient')
        let resolution = configClient?.game_config?.screen_size || { width: 1920, height: 1080 };

        let width = document.querySelector(".width-size");
        let height = document.querySelector(".height-size");
        let resolutionReset = document.querySelector(".size-reset");

        width.value = resolution.width;
        height.value = resolution.height;

        width.addEventListener("change", async () => {
            let configClient = await this.db.readData('configClient')
            configClient.game_config.screen_size.width = width.value;
            await this.db.updateData('configClient', configClient);
        })

        height.addEventListener("change", async () => {
            let configClient = await this.db.readData('configClient')
            configClient.game_config.screen_size.height = height.value;
            await this.db.updateData('configClient', configClient);
        })

        resolutionReset.addEventListener("click", async () => {
            let configClient = await this.db.readData('configClient')
            configClient.game_config.screen_size = { width: '854', height: '480' };
            width.value = '854';
            height.value = '480';
            await this.db.updateData('configClient', configClient);
        })
    }

    async launcher() {
        let configClient = await this.db.readData('configClient');

        let maxDownloadFiles = configClient?.launcher_config?.download_multi || 10;
        let maxDownloadFilesInput = document.querySelector(".max-files");
        let maxDownloadFilesReset = document.querySelector(".max-files-reset");
        maxDownloadFilesInput.value = maxDownloadFiles;

        maxDownloadFilesInput.addEventListener("change", async () => {
            let configClient = await this.db.readData('configClient')
            configClient.launcher_config.download_multi = maxDownloadFilesInput.value;
            await this.db.updateData('configClient', configClient);
        })

        maxDownloadFilesReset.addEventListener("click", async () => {
            let configClient = await this.db.readData('configClient')
            maxDownloadFilesInput.value = 10
            configClient.launcher_config.download_multi = 10;
            await this.db.updateData('configClient', configClient);
        })

        let themeBox = document.querySelector(".theme-box");
        let theme = configClient?.launcher_config?.theme || "auto";

        if (theme == "auto") {
            document.querySelector('.theme-btn-auto').classList.add('active-theme');
        } else if (theme == "dark") {
            document.querySelector('.theme-btn-sombre').classList.add('active-theme');
        } else if (theme == "light") {
            document.querySelector('.theme-btn-clair').classList.add('active-theme');
        }

        themeBox.addEventListener("click", async e => {
            if (e.target.classList.contains('theme-btn')) {
                let activeTheme = document.querySelector('.active-theme');
                if (e.target.classList.contains('active-theme')) return
                activeTheme?.classList.remove('active-theme');

                if (e.target.classList.contains('theme-btn-auto')) {
                    setBackground();
                    theme = "auto";
                    e.target.classList.add('active-theme');
                } else if (e.target.classList.contains('theme-btn-sombre')) {
                    setBackground(true);
                    theme = "dark";
                    e.target.classList.add('active-theme');
                } else if (e.target.classList.contains('theme-btn-clair')) {
                    setBackground(false);
                    theme = "light";
                    e.target.classList.add('active-theme');
                }

                let configClient = await this.db.readData('configClient')
                configClient.launcher_config.theme = theme;
                await this.db.updateData('configClient', configClient);
            }
        })

        let closeBox = document.querySelector(".close-box");
        let closeLauncher = configClient?.launcher_config?.closeLauncher || "close-launcher";

        if (closeLauncher == "close-launcher") {
            document.querySelector('.close-launcher').classList.add('active-close');
        } else if (closeLauncher == "close-all") {
            document.querySelector('.close-all').classList.add('active-close');
        } else if (closeLauncher == "close-none") {
            document.querySelector('.close-none').classList.add('active-close');
        }

        closeBox.addEventListener("click", async e => {
            if (e.target.classList.contains('close-btn')) {
                let activeClose = document.querySelector('.active-close');
                if (e.target.classList.contains('active-close')) return
                activeClose?.classList.toggle('active-close');

                let configClient = await this.db.readData('configClient')

                if (e.target.classList.contains('close-launcher')) {
                    e.target.classList.toggle('active-close');
                    configClient.launcher_config.closeLauncher = "close-launcher";
                    await this.db.updateData('configClient', configClient);
                } else if (e.target.classList.contains('close-all')) {
                    e.target.classList.toggle('active-close');
                    configClient.launcher_config.closeLauncher = "close-all";
                    await this.db.updateData('configClient', configClient);
                } else if (e.target.classList.contains('close-none')) {
                    e.target.classList.toggle('active-close');
                    configClient.launcher_config.closeLauncher = "close-none";
                    await this.db.updateData('configClient', configClient);
                }
            }
        })

        const resetConfigBtn = document.querySelector('.reset-config-btn');
        const deleteAllBtn = document.querySelector('.delete-all-btn');

        if (resetConfigBtn) {
            resetConfigBtn.addEventListener('click', async () => {
                this.handleResetConfig();
            });
        }

        if (deleteAllBtn) {
            deleteAllBtn.addEventListener('click', async () => {
                this.handleDeleteAll();
            });
        }

    }

    async handleResetConfig() {
        const resetPopup = new popup();
        const result = await new Promise(resolve => {
            resetPopup.openDialog({
                title: 'Reiniciar configuración',
                content: '¿Estás seguro de que quieres reiniciar toda la configuración del launcher? Esta acción no puede deshacerse y el launcher se reiniciará.<br><br>Los archivos del juego (assets, bibliotecas, instancias) no se eliminarán.',
                options: true,
                callback: resolve
            });
        });

        if (result === 'cancel') {
            return;
        }
        
        try {
            const processingPopup = new popup();
            processingPopup.openPopup({
                title: 'Reiniciando configuración',
                content: 'Por favor, espera mientras se reinicia la configuración...',
                color: 'var(--color)'
            });
            
            // Primero, vaciar la tabla de cuentas
            const accounts = await this.db.readAllData("accounts");
            if (accounts && accounts.length > 0) {
                console.log(`Eliminando ${accounts.length} cuentas...`);
                for (const account of accounts) {
                    await this.db.deleteData('accounts', account.ID);
                }
            }
            
            // Luego eliminar configClient
            await this.db.deleteData('configClient');
            
            // Doble verificación - comprobar si realmente se eliminaron las cuentas
            const remainingAccounts = await this.db.readAllData("accounts");
            if (remainingAccounts && remainingAccounts.length > 0) {
                console.warn(`Aún quedan ${remainingAccounts.length} cuentas, forzando limpieza completa...`);
                await this.db.clearDatabase(); // Método que elimina todo el contenido de la base de datos
            }
        
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            processingPopup.closePopup();
            console.log('Reiniciando launcher...');
            ipcRenderer.send('app-restart');
            
        } catch (error) {
            console.error('Error resetting config:', error);
            const errorPopup = new popup();
            errorPopup.openPopup({
                title: 'Error',
                content: `Ha ocurrido un error al reiniciar la configuración: ${error.message}`,
                color: 'red',
                options: true
            });
        }
    }

    async handleDeleteAll() {
        const deletePopup = new popup();
        const result = await new Promise(resolve => {
            deletePopup.openDialog({
                title: 'Eliminar todos los datos',
                content: '⚠️ ADVERTENCIA ⚠️<br><br>¿Estás seguro de que quieres eliminar TODOS los datos del launcher? Esta acción eliminará:<br>- Todas las configuraciones<br>- Todas las instancias de juego<br>- Todos los assets y bibliotecas descargados<br><br>Esta acción no puede deshacerse y el launcher se reiniciará.',
                options: true,
                callback: resolve
            });
        });

        if (result === 'cancel') {
            return;
        }
        
        const confirmDeletePopup = new popup();
        const confirmResult = await new Promise(resolve => {
            confirmDeletePopup.openDialog({
                title: 'Confirmar eliminación total',
                content: '¿Estás ABSOLUTAMENTE seguro? Esta acción eliminará todos los datos y no podrás recuperarlos.',
                options: true,
                callback: resolve
            });
        });

        if (confirmResult === 'cancel') {
            return;
        }
        
        try {
            const processingPopup = new popup();
            processingPopup.openPopup({
                title: 'Eliminando datos',
                content: 'Por favor, espera mientras se eliminan todos los datos...',
                color: 'var(--color)'
            });
            
            const appdataPath = await appdata();
            const dataPath = path.join(
                appdataPath,
                process.platform == 'darwin' ? this.config.dataDirectory : `.${this.config.dataDirectory}`
            );
            
            if (fs.existsSync(dataPath)) {
                await this.recursiveDelete(dataPath);
                console.log('Data directory deleted successfully');
            }

            await this.db.deleteData('configClient');
            await this.db.deleteData('accounts');
            
            // Wait a moment before restarting
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Restart the launcher
            processingPopup.closePopup();
            ipcRenderer.send('app-restart');
            
        } catch (error) {
            console.error('Error deleting all data:', error);
            const errorPopup = new popup();
            errorPopup.openPopup({
                title: 'Error',
                content: `Ha ocurrido un error al eliminar los datos: ${error.message}`,
                color: 'red',
                options: true
            });
        }
    }

    async recursiveDelete(directoryPath) {
        return new Promise((resolve, reject) => {
            if (typeof fs.rm === 'function') {
                fs.rm(directoryPath, { recursive: true, force: true }, err => {
                    if (err) reject(err);
                    else resolve();
                });
            } 
            else {
                fs.rmdir(directoryPath, { recursive: true }, err => {
                    if (err) reject(err);
                    else resolve();
                });
            }
        });
    }
}
export default Settings;