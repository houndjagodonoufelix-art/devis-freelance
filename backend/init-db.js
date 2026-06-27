const db = require('./db');

async function initDatabase() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS entreprises (
        id SERIAL PRIMARY KEY,
        nom VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        mot_de_passe VARCHAR(255) NOT NULL,
        telephone VARCHAR(50),
        adresse TEXT,
        ifu VARCHAR(100),
        logo TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table entreprises OK');

    await db.query(`
      CREATE TABLE IF NOT EXISTS devis (
        id SERIAL PRIMARY KEY,
        entreprise_id INT NOT NULL,
        client_nom VARCHAR(255),
        client_email VARCHAR(255),
        client_telephone VARCHAR(50),
        client_adresse TEXT,
        client_contact VARCHAR(255),
        client_logo TEXT,
        numero VARCHAR(100),
        date_emission DATE,
        date_expiration DATE,
        objet TEXT,
        notes TEXT,
        conditions_paiement TEXT,
        tva DECIMAL(5,2) DEFAULT 0,
        devise VARCHAR(20) DEFAULT 'FCFA',
        template INT DEFAULT 0,
        couleur VARCHAR(20) DEFAULT '#4F46E5',
        total DECIMAL(15,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (entreprise_id) REFERENCES entreprises(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Table devis OK');

    await db.query(`
      CREATE TABLE IF NOT EXISTS taches (
        id SERIAL PRIMARY KEY,
        devis_id INT NOT NULL,
        description TEXT,
        quantite DECIMAL(10,2) DEFAULT 1,
        prix_unitaire DECIMAL(15,2) DEFAULT 0,
        total DECIMAL(15,2) DEFAULT 0,
        FOREIGN KEY (devis_id) REFERENCES devis(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Table taches OK');

    console.log('✅ Base de données initialisée avec succès !');

  } catch (error) {
    console.error('❌ Erreur initialisation DB:', error.message);
  }
}

module.exports = initDatabase;