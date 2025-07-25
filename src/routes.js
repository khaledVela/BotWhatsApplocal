const express = require('express');
const router = express.Router();
const manager = require('./wppManager');
const multer = require('multer');
const path = require('path');
const { sendMediaToList } = require("./wppManager");
const fs = require('fs');

// Configuración de carpeta temporal para imágenes
const upload = multer({ dest: path.join(__dirname, '..', 'uploads') });

// ✅ Obtener QR por sesión
router.get('/qr/:session', async (req, res) => {
    const { session } = req.params;

    try {
        await manager.createSession(session);
        let qr = manager.getQR(session);
        // Si no hay QR, intentamos reiniciar la sesión
        if (!qr) {
            console.log(`⚠️ QR no disponible para ${session}, reiniciando sesión...`);
            await manager.resetSession(session);
            await manager.createSession(session);
            qr = manager.getQR(session);
        }
        if (qr) {
            res.json({ qr });
        } else {
            res.status(500).json({ message: 'No se pudo regenerar QR.' });
        }
    } catch (err) {
        res.status(500).json({ message: 'Error al generar QR', error: err.message });
    }
});

// ✅ Verificar si sesión está logueada
router.get('/estado/:session', async (req, res) => {
    const { session } = req.params;

    try {
        await manager.createSession(session);
        const conectado = await manager.isLogged(session);
        res.json({ logueado: conectado });
    } catch (err) {
        res.status(500).json({ logueado: false, error: err.message });
    }
});

// ✅ Enviar mensaje y/o imagen
router.post('/enviar-imagen/:session', upload.single('imagen'), async (req, res) => {
    const { session } = req.params;
    const { numero, texto } = req.body;
    const file = req.file;

    try {
        await manager.createSession(session);
        const sessionData = manager.sessions[session];
        let result;

        if (file) {
            result = await sessionData.client.sendImage(
                `${numero}@c.us`,
                file.path,
                file.originalname,
                texto || ''
            );
            fs.unlinkSync(file.path); // eliminar imagen temporal
        } else {
            result = await sessionData.client.sendText(`${numero}@c.us`, texto || '');
        }

        res.send({ success: true, result });
    } catch (err) {
        if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
        res.status(500).send({ success: false, error: err.message });
    }
});

// ✅ Reiniciar manualmente una sesión (opcional)
router.get('/reiniciar/:session', async (req, res) => {
    const { session } = req.params;

    try {
        await manager.resetSession(session);
        res.json({ success: true, message: `Sesión "${session}" reiniciada` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
