/**
 * @author Luuxis
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 */
const { AZauth, Mojang } = require("minecraft-java-core");
const { ipcRenderer } = require("electron");

import {
  popup,
  database,
  changePanel,
  accountSelect,
  addAccount,
  config,
  setStatus,
  setUsername,
} from "../utils.js";

class Login {
  static id = "login";
  async init(config) {
    this.config = config;
    this.db = new database();

    if (typeof this.config.online == "boolean") {
      this.config.online ? this.getMicrosoft() : this.getCrack();
    } else if (typeof this.config.online == "string") {
      if (this.config.online.match(/^(http|https):\/\/[^ "]+$/)) {
        this.getAZauth();
      }
    }

    document.querySelector(".cancel-home").addEventListener("click", () => {
      document.querySelector(".cancel-home").style.display = "none";
      changePanel("settings");
    });
  }

  async getMicrosoft() {
    console.log("Initializing Microsoft login...");
    let popupLogin = new popup();
    let loginHome = document.querySelector(".login-home");
    let microsoftBtn = document.querySelector(".connect-home");
    loginHome.style.display = "block";

    microsoftBtn.addEventListener("click", () => {
      popupLogin.openPopup({
        title: "OJOLAND",
        content: "Espere por favor...",
        color: "var(--color)",
      });

      ipcRenderer
        .invoke("Microsoft-window", this.config.client_id)
        .then(async (account_connect) => {
          if (account_connect == "cancel" || !account_connect) {
            popupLogin.closePopup();
            return;
          } else {
            await this.saveData(account_connect);
            popupLogin.closePopup();
          }
        })
        .catch((err) => {
          popupLogin.openPopup({
            title: "Error",
            content: err,
            options: true,
          });
        });
    });
  }

  async getCrack() {
    console.log("Initializing offline login...");
    let popupLogin = new popup();
    let loginOffline = document.querySelector(".login-offline");

    let emailOffline = document.querySelector(".email-offline");
    let connectOffline = document.querySelector(".connect-offline");
    loginOffline.style.display = "block";

    connectOffline.addEventListener("click", async () => {
      if (emailOffline.value.length < 3) {
        popupLogin.openPopup({
          title: "Error",
          content: "Su apodo debe tener al menos 3 caracteres.",
          options: true,
        });
        return;
      }

      if (emailOffline.value.match(/ /g)) {
        popupLogin.openPopup({
          title: "Error",
          content: "Tu apodo no debe contener espacios.",
          options: true,
        });
        return;
      }

      let MojangConnect = await Mojang.login(emailOffline.value);

      if (MojangConnect.error) {
        popupLogin.openPopup({
          title: "Error",
          content: MojangConnect.message,
          options: true,
        });
        return;
      }
      await this.saveData(MojangConnect);
      popupLogin.closePopup();
    });
  }

  async getAZauth() {
    console.log("Initializing AZauth login...");
    let AZauthClient = new AZauth(this.config.online);
    let PopupLogin = new popup();
    let loginAZauth = document.querySelector(".login-AZauth");
    let loginAZauthA2F = document.querySelector(".login-AZauth-A2F");

    let AZauthEmail = document.querySelector(".email-AZauth");
    let AZauthPassword = document.querySelector(".password-AZauth");
    let AZauthA2F = document.querySelector(".A2F-AZauth");
    let connectAZauthA2F = document.querySelector(".connect-AZauth-A2F");
    let AZauthConnectBTN = document.querySelector(".connect-AZauth");
    let AZauthCancelA2F = document.querySelector(".cancel-AZauth-A2F");

    loginAZauth.style.display = "block";

    AZauthConnectBTN.addEventListener("click", async () => {
      PopupLogin.openPopup({
        title: "Conexión actual...",
        content: "Espere por favor...",
        color: "var(--color)",
      });

      if (AZauthEmail.value == "" || AZauthPassword.value == "") {
        PopupLogin.openPopup({
          title: "Error",
          content: "Porfavor complete todos los campos.",
          options: true,
        });
        return;
      }

      let AZauthConnect = await AZauthClient.login(
        AZauthEmail.value,
        AZauthPassword.value
      );

      if (AZauthConnect.error) {
        PopupLogin.openPopup({
          title: "Error",
          content: AZauthConnect.message,
          options: true,
        });
        return;
      } else if (AZauthConnect.A2F) {
        loginAZauthA2F.style.display = "block";
        loginAZauth.style.display = "none";
        PopupLogin.closePopup();

        AZauthCancelA2F.addEventListener("click", () => {
          loginAZauthA2F.style.display = "none";
          loginAZauth.style.display = "block";
        });

        connectAZauthA2F.addEventListener("click", async () => {
          PopupLogin.openPopup({
            title: "Conexión actual...",
            content: "Espere por favor...",
            color: "var(--color)",
          });

          if (AZauthA2F.value == "") {
            PopupLogin.openPopup({
              title: "Error",
              content: "Por favor ingrese el código A2F.",
              options: true,
            });
            return;
          }

          AZauthConnect = await AZauthClient.login(
            AZauthEmail.value,
            AZauthPassword.value,
            AZauthA2F.value
          );

          if (AZauthConnect.error) {
            PopupLogin.openPopup({
              title: "Error",
              content: AZauthConnect.message,
              options: true,
            });
            return;
          }

          await this.saveData(AZauthConnect);
          PopupLogin.closePopup();
        });
      } else if (!AZauthConnect.A2F) {
        await this.saveData(AZauthConnect);
        PopupLogin.closePopup();
      }
    });
  }

  async saveData(connectionData) {
    if (!connectionData) {
      console.error("Error: connectionData es undefined en saveData");
      let errorPopup = new popup();
      errorPopup.openPopup({
        title: "Error de autenticación",
        content:
          "Ha ocurrido un error durante la autenticación. Por favor, inténtalo de nuevo.",
        color: "red",
        options: true,
      });
      return;
    }

    let configClient = await this.db.readData("configClient");
    let account = await this.db.createData("accounts", connectionData);

    // Verificar que account se creó correctamente
    if (!account) {
      console.error("Error: No se pudo crear la cuenta en la base de datos");
      let errorPopup = new popup();
      errorPopup.openPopup({
        title: "Error al guardar cuenta",
        content:
          "No se pudo guardar la información de la cuenta. Por favor, inténtalo de nuevo.",
        color: "red",
        options: true,
      });
      return;
    }

    // Verificar que account.name existe
    if (!account.name) {
      console.error("Error: account.name es undefined");
      await this.db.deleteData("accounts", account.ID);
      let errorPopup = new popup();
      errorPopup.openPopup({
        title: "Error de datos de cuenta",
        content:
          "La información de la cuenta está incompleta. Por favor, inténtalo de nuevo.",
        color: "red",
        options: true,
      });
      return;
    }

    let instanceSelect = configClient.instance_selct;
    let instancesList = await config.getInstanceList();

    // Obtener referencia al botón de inicio de sesión según el tipo
    let connectButton = null;
    if (
      document.querySelector(".connect-offline") &&
      document.querySelector(".connect-offline").disabled
    ) {
      connectButton = document.querySelector(".connect-offline");
    } else if (
      document.querySelector(".connect-AZauth") &&
      document.querySelector(".connect-AZauth").disabled
    ) {
      connectButton = document.querySelector(".connect-AZauth");
    }

    // Verificar si la cuenta está protegida
    const serverConfig = await config.GetConfig();
    if (
        serverConfig &&
        Array.isArray(serverConfig.protectedUsers) &&
        serverConfig.protectedUsers.includes(account.name)
      ) {
      
          // Borrar la cuenta creada temporalmente
          await this.db.deleteData("accounts", account.ID);

          if (connectButton) {
            connectButton.disabled = false;
          }

          let popupError = new popup();

          await new Promise((resolve) => {
            popupError.openPopup({
              title: "Cuenta protegida",
              content:
                "Esta cuenta está protegida y no puede ser usada en este dispositivo. Por favor, contacta con el administrador si crees que esto es un error.",
              color: "red",
              options: {
                value: "Entendido",
                event: resolve,
              },
            });
          });

          return;
    }

    configClient.account_selected = account.ID;

    for (let instance of instancesList) {
      if (instance.whitelistActive) {
        let whitelist = instance.whitelist.find(
          (whitelist) => whitelist == account.name
        );
        if (whitelist !== account.name) {
          if (instance.name == instanceSelect) {
            let newInstanceSelect = instancesList.find(
              (i) => i.whitelistActive == false
            );
            configClient.instance_selct = newInstanceSelect.name;
            await setStatus(newInstanceSelect.status);
          }
        }
      }
    }

    await this.db.updateData("configClient", configClient);
    await addAccount(account);
    await accountSelect(account);
    await setUsername(account.name);
    changePanel("home");
  }
}
export default Login;
