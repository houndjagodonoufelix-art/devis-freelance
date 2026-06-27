const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const devisRoutes = require('./routes/devis');
const profileRoutes = require('./routes/profile');
const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir les fichiers statiques (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '..')));

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/devis', devisRoutes);
app.use('/api/profile', profileRoutes);
// Route principale
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Serveur démarré sur http://localhost:${PORT}`);
});
// Ajoute ceci à la fin de ton server.js
app.use(express.static('frontend')); // Sert les fichiers statiques
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});