const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
require('dotenv').config();

function verifierToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token manquant.' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.entreprise = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Token invalide.' });
  }
}

router.get('/', verifierToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, nom, email, telephone, adresse, ifu, logo FROM entreprises WHERE id = $1',
      [req.entreprise.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Entreprise introuvable.' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

router.put('/', verifierToken, async (req, res) => {
  try {
    const { nom, telephone, adresse, ifu, logo } = req.body;
    await db.query(
      'UPDATE entreprises SET nom=$1, telephone=$2, adresse=$3, ifu=$4, logo=$5 WHERE id=$6',
      [nom, telephone, adresse, ifu, logo, req.entreprise.id]
    );
    res.json({ message: 'Profil mis à jour avec succès !' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;