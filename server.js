const express = require('express');
const path = require('path');
const app = express();
const router = require('./routes'); // Ruta de tus APIs y lógicas de backend

// Configurar puerto
const PORT = process.env.PORT || 3000;

// Servir archivos estáticos (HTML, CSS, JS) desde la carpeta "public"
app.use(express.static(path.join(__dirname, 'public')));

// Configuración para manejar JSON y formularios
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas de API
app.use('/api', router);

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor web escuchando en http://localhost:${PORT}`);
});
