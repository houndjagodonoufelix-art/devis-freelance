const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
require('dotenv').config();

// INSCRIPTION
router.post('/inscription', async (req, res) => {
  try {
    const { nom, email, mot_de_passe, telephone, adresse, ifu } = req.body;

    // Vérifier si l'email existe déjà
    const [existing] = await db.query(
      'SELECT id FROM entreprises WHERE email = ?', [email]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé.' });
    }

    // Chiffrer le mot de passe
    const hash = await bcrypt.hash(mot_de_passe, 10);

    // Insérer l'entreprise
    const [result] = await db.query(
      'INSERT INTO entreprises (nom, email, mot_de_passe, telephone, adresse, ifu) VALUES (?, ?, ?, ?, ?, ?)',
      [nom, email, hash, telephone, adresse, ifu]
    );

    // Créer le token
    const token = jwt.sign(
      { id: result.insertId, email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Compte créé avec succès !',
      token,
      entreprise: { id: result.insertId, nom, email }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// CONNEXION
router.post('/connexion', async (req, res) => {
  try {
    const { email, mot_de_passe } = req.body;

    // Chercher l'entreprise
    const [rows] = await db.query(
      'SELECT * FROM entreprises WHERE email = ?', [email]
    );
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });
    }

    const entreprise = rows[0];

    // Vérifier le mot de passe
    const valid = await bcrypt.compare(mot_de_passe, entreprise.mot_de_passe);
    if (!valid) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });
    }

    // Créer le token
    const token = jwt.sign(
      { id: entreprise.id, email: entreprise.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Connexion réussie !',
      token,
      entreprise: {
        id: entreprise.id,
        nom: entreprise.nom,
        email: entreprise.email,
        telephone: entreprise.telephone,
        adresse: entreprise.adresse,
        ifu: entreprise.ifu,
        logo: entreprise.logo
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;