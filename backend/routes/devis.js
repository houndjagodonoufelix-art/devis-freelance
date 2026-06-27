const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Middleware vérification token
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

// CRÉER un devis
router.post('/', verifierToken, async (req, res) => {
  try {
    const {
      client_nom, client_email, client_telephone, client_adresse,
      client_contact, client_logo, numero, date_emission, date_expiration,
      objet, notes, conditions_paiement, tva, devise, template,
      couleur, total, taches
    } = req.body;

    // Insérer le devis
    const [result] = await db.query(
      `INSERT INTO devis 
      (entreprise_id, client_nom, client_email, client_telephone, client_adresse,
      client_contact, client_logo, numero, date_emission, date_expiration,
      objet, notes, conditions_paiement, tva, devise, template, couleur, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.entreprise.id, client_nom, client_email, client_telephone,
        client_adresse, client_contact, client_logo, numero,
        date_emission || null, date_expiration || null,
        objet, notes, conditions_paiement, tva, devise, template, couleur, total
      ]
    );

    const devisId = result.insertId;

    // Insérer les tâches
    if (taches && taches.length > 0) {
      const tachesValues = taches.map(t => [
        devisId, t.desc, t.qty, t.prix, t.qty * t.prix
      ]);
      await db.query(
        'INSERT INTO taches (devis_id, description, quantite, prix_unitaire, total) VALUES ?',
        [tachesValues]
      );
    }

    res.status(201).json({
      message: 'Devis sauvegardé avec succès !',
      id: devisId
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// OBTENIR tous les devis de l'entreprise
router.get('/', verifierToken, async (req, res) => {
  try {
    const [devis] = await db.query(
      `SELECT id, client_nom, client_logo, numero, date_emission, 
      date_expiration, objet, tva, devise, template, couleur, total, created_at
      FROM devis WHERE entreprise_id = ? ORDER BY created_at DESC`,
      [req.entreprise.id]
    );
    res.json(devis);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// OBTENIR un devis par ID
router.get('/:id', verifierToken, async (req, res) => {
  try {
    const [devis] = await db.query(
      'SELECT * FROM devis WHERE id = ? AND entreprise_id = ?',
      [req.params.id, req.entreprise.id]
    );
    if (devis.length === 0) return res.status(404).json({ message: 'Devis introuvable.' });

    const [taches] = await db.query(
      'SELECT * FROM taches WHERE devis_id = ?',
      [req.params.id]
    );

    res.json({ ...devis[0], taches });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// MODIFIER un devis
router.put('/:id', verifierToken, async (req, res) => {
  try {
    const {
      client_nom, client_email, client_telephone, client_adresse,
      client_contact, client_logo, numero, date_emission, date_expiration,
      objet, notes, conditions_paiement, tva, devise, template,
      couleur, total, taches
    } = req.body;

    await db.query(
      `UPDATE devis SET 
      client_nom=?, client_email=?, client_telephone=?, client_adresse=?,
      client_contact=?, client_logo=?, numero=?, date_emission=?, date_expiration=?,
      objet=?, notes=?, conditions_paiement=?, tva=?, devise=?, template=?, couleur=?, total=?
      WHERE id=? AND entreprise_id=?`,
      [
        client_nom, client_email, client_telephone, client_adresse,
        client_contact, client_logo, numero,
        date_emission || null, date_expiration || null,
        objet, notes, conditions_paiement, tva, devise, template,
        couleur, total, req.params.id, req.entreprise.id
      ]
    );

    // Supprimer les anciennes tâches et réinsérer
    await db.query('DELETE FROM taches WHERE devis_id = ?', [req.params.id]);
    if (taches && taches.length > 0) {
      const tachesValues = taches.map(t => [
        req.params.id, t.desc, t.qty, t.prix, t.qty * t.prix
      ]);
      await db.query(
        'INSERT INTO taches (devis_id, description, quantite, prix_unitaire, total) VALUES ?',
        [tachesValues]
      );
    }

    res.json({ message: 'Devis modifié avec succès !' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// SUPPRIMER un devis
router.delete('/:id', verifierToken, async (req, res) => {
  try {
    await db.query(
      'DELETE FROM devis WHERE id = ? AND entreprise_id = ?',
      [req.params.id, req.entreprise.id]
    );
    res.json({ message: 'Devis supprimé avec succès !' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// DUPLIQUER un devis
router.post('/:id/dupliquer', verifierToken, async (req, res) => {
  try {
    const [devis] = await db.query(
      'SELECT * FROM devis WHERE id = ? AND entreprise_id = ?',
      [req.params.id, req.entreprise.id]
    );
    if (devis.length === 0) return res.status(404).json({ message: 'Devis introuvable.' });

    const d = devis[0];
    const [result] = await db.query(
      `INSERT INTO devis 
      (entreprise_id, client_nom, client_email, client_telephone, client_adresse,
      client_contact, client_logo, numero, date_emission, date_expiration,
      objet, notes, conditions_paiement, tva, devise, template, couleur, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.entreprise.id, d.client_nom, d.client_email, d.client_telephone,
        d.client_adresse, d.client_contact, d.client_logo,
        d.numero + '-copie', d.date_emission, d.date_expiration,
        d.objet, d.notes, d.conditions_paiement, d.tva,
        d.devise, d.template, d.couleur, d.total
      ]
    );

    const [taches] = await db.query(
      'SELECT * FROM taches WHERE devis_id = ?', [req.params.id]
    );
    if (taches.length > 0) {
      const tachesValues = taches.map(t => [
        result.insertId, t.description, t.quantite, t.prix_unitaire, t.total
      ]);
      await db.query(
        'INSERT INTO taches (devis_id, description, quantite, prix_unitaire, total) VALUES ?',
        [tachesValues]
      );
    }

    res.status(201).json({ message: 'Devis dupliqué !', id: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;