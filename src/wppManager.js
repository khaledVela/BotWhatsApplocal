const wppconnect = require('@wppconnect-team/wppconnect');
const path = require('path');
const fs = require('fs');

class WppManager {
    constructor() {
        this.sessions = {};
    }

    async createSession(sessionName) {
        // Si ya existe, no la vuelvas a crear
        if (this.sessions[sessionName]) return this.sessions[sessionName];

        const sessionData = {
            client: null,
            qr: null,
            ready: false,
        };

        this.sessions[sessionName] = sessionData;

        const userDataDir = path.join(__dirname, '..', 'tokens', sessionName);
        const singletonLockPath = path.join(userDataDir, 'SingletonLock');

        // 🧹 Eliminar archivo de bloqueo si quedó colgado
        if (fs.existsSync(singletonLockPath)) {
            try {
                fs.unlinkSync(singletonLockPath);
                console.log(`🧹 Eliminado bloqueo previo: ${singletonLockPath}`);
            } catch (err) {
                console.warn(`⚠️ No se pudo eliminar SingletonLock: ${err.message}`);
            }
        }

        await wppconnect
            .create({
                session: sessionName,
                userDataDir,
                puppeteerOptions: {
                    executablePath: process.env.CHROME_PATH,
                    headless: true,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        `--user-data-dir=${userDataDir}`
                    ]
                },
                catchQR: (base64Qr) => {
                    sessionData.qr = base64Qr;
                    sessionData.ready = false;
                    console.log(`📲 QR generado para sesión "${sessionName}"`);
                },
                statusFind: (status) => {
                    console.log(`📡 Estado de "${sessionName}": ${status}`);
                },
            })
            .then((client) => {
                sessionData.client = client;
                sessionData.ready = true;
                console.log(`✅ Sesión "${sessionName}" conectada`);
            })
            .catch((err) => {
                console.error(`❌ Error al iniciar sesión "${sessionName}":`, err);
            });

        return sessionData;
    }

    getQR(sessionName) {
        return this.sessions[sessionName]?.qr || null;
    }

    async isLogged(sessionName) {
        const session = this.sessions[sessionName];
        if (!session || !session.client) return false;

        try {
            return await session.client.isConnected();
        } catch {
            return false;
        }
    }

    async sendMessage(sessionName, numero, mensaje) {
        const session = this.sessions[sessionName];
        if (!session || !session.ready) {
            throw new Error(`Sesión "${sessionName}" no está conectada`);
        }

        return await session.client.sendText(`${numero}@c.us`, mensaje);
    }

    async resetSession(sessionName) {
        const session = this.sessions[sessionName];
        if (session && session.client) {
            try {
                await session.client.logout();
                await session.client.close();
                console.log(`🔁 Sesión "${sessionName}" cerrada y limpiada`);
            } catch (e) {
                console.warn(`⚠️ Error al cerrar sesión "${sessionName}": ${e.message}`);
            }
        }
        delete this.sessions[sessionName];
    }
}

module.exports = new WppManager();
