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

// CRÉER un devis
router.post('/', verifierToken, async (req, res) => {
  try {
    const {
      client_nom, client_email, client_telephone, client_adresse,
      client_contact, client_logo, numero, date_emission, date_expiration,
      objet, notes, conditions_paiement, tva, devise, template,
      couleur, total, taches
    } = req.body;

    const result = await db.query(
      `INSERT INTO devis 
      (entreprise_id, client_nom, client_email, client_telephone, client_adresse,
      client_contact, client_logo, numero, date_emission, date_expiration,
      objet, notes, conditions_paiement, tva, devise, template, couleur, total)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      RETURNING id`,
      [
        req.entreprise.id, client_nom, client_email, client_telephone,
        client_adresse, client_contact, client_logo, numero,
        date_emission || null, date_expiration || null,
        objet, notes, conditions_paiement, tva, devise, template, couleur, total
      ]
    );

    const devisId = result.rows[0].id;

    if (taches && taches.length > 0) {
      for (const t of taches) {
        await db.query(
          'INSERT INTO taches (devis_id, description, quantite, prix_unitaire, total) VALUES ($1,$2,$3,$4,$5)',
          [devisId, t.desc, t.qty, t.prix, t.qty * t.prix]
        );
      }
    }

    res.status(201).json({ message: 'Devis sauvegardé !', id: devisId });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// OBTENIR tous les devis
router.get('/', verifierToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, client_nom, client_logo, numero, date_emission,
      date_expiration, objet, tva, devise, template, couleur, total, created_at
      FROM devis WHERE entreprise_id = $1 ORDER BY created_at DESC`,
      [req.entreprise.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// OBTENIR un devis par ID
router.get('/:id', verifierToken, async (req, res) => {
  try {
    const devis = await db.query(
      'SELECT * FROM devis WHERE id = $1 AND entreprise_id = $2',
      [req.params.id, req.entreprise.id]
    );
    if (devis.rows.length === 0) return res.status(404).json({ message: 'Devis introuvable.' });

    const taches = await db.query(
      'SELECT * FROM taches WHERE devis_id = $1',
      [req.params.id]
    );

    res.json({ ...devis.rows[0], taches: taches.rows });
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
      objet, notes, conditions_paiement, tva, devise, template, couleur, total, taches
    } = req.body;

    await db.query(
      `UPDATE devis SET 
      client_nom=$1, client_email=$2, client_telephone=$3, client_adresse=$4,
      client_contact=$5, client_logo=$6, numero=$7, date_emission=$8,
      date_expiration=$9, objet=$10, notes=$11, conditions_paiement=$12,
      tva=$13, devise=$14, template=$15, couleur=$16, total=$17
      WHERE id=$18 AND entreprise_id=$19`,
      [
        client_nom, client_email, client_telephone, client_adresse,
        client_contact, client_logo, numero,
        date_emission || null, date_expiration || null,
        objet, notes, conditions_paiement, tva, devise,
        template, couleur, total, req.params.id, req.entreprise.id
      ]
    );

    await db.query('DELETE FROM taches WHERE devis_id = $1', [req.params.id]);
    if (taches && taches.length > 0) {
      for (const t of taches) {
        await db.query(
          'INSERT INTO taches (devis_id, description, quantite, prix_unitaire, total) VALUES ($1,$2,$3,$4,$5)',
          [req.params.id, t.desc, t.qty, t.prix, t.qty * t.prix]
        );
      }
    }

    res.json({ message: 'Devis modifié !' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// SUPPRIMER un devis
router.delete('/:id', verifierToken, async (req, res) => {
  try {
    await db.query(
      'DELETE FROM devis WHERE id = $1 AND entreprise_id = $2',
      [req.params.id, req.entreprise.id]
    );
    res.json({ message: 'Devis supprimé !' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// DUPLIQUER un devis
router.post('/:id/dupliquer', verifierToken, async (req, res) => {
  try {
    const devis = await db.query(
      'SELECT * FROM devis WHERE id = $1 AND entreprise_id = $2',
      [req.params.id, req.entreprise.id]
    );
    if (devis.rows.length === 0) return res.status(404).json({ message: 'Devis introuvable.' });

    const d = devis.rows[0];
    const result = await db.query(
      `INSERT INTO devis 
      (entreprise_id, client_nom, client_email, client_telephone, client_adresse,
      client_contact, client_logo, numero, date_emission, date_expiration,
      objet, notes, conditions_paiement, tva, devise, template, couleur, total)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      RETURNING id`,
      [
        req.entreprise.id, d.client_nom, d.client_email, d.client_telephone,
        d.client_adresse, d.client_contact, d.client_logo,
        d.numero + '-copie', d.date_emission, d.date_expiration,
        d.objet, d.notes, d.conditions_paiement, d.tva,
        d.devise, d.template, d.couleur, d.total
      ]
    );

    const taches = await db.query(
      'SELECT * FROM taches WHERE devis_id = $1', [req.params.id]
    );

    for (const t of taches.rows) {
      await db.query(
        'INSERT INTO taches (devis_id, description, quantite, prix_unitaire, total) VALUES ($1,$2,$3,$4,$5)',
        [result.rows[0].id, t.description, t.quantite, t.prix_unitaire, t.total]
      );
    }

    res.status(201).json({ message: 'Devis dupliqué !', id: result.rows[0].id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;