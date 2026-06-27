const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer');
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

router.post('/generer', verifierToken, async (req, res) => {
  try {
    const { html, filename } = req.body;

    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    await page.setContent(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }

          html, body {
            width: 210mm;
            min-height: 297mm;
            background: white;
            font-family: Arial, sans-serif;
          }

          .devis-wrapper {
            width: 210mm;
            min-height: 297mm;
            display: flex;
            flex-direction: column;
            position: relative;
          }

          .devis-content {
            flex: 1;
            padding: 10mm;
          }

          .devis-footer {
            width: 100%;
            padding: 8mm 10mm;
            border-top: 1px dashed #ccc;
            margin-top: auto;
          }

          img { max-width: 100%; }
          table { border-collapse: collapse; width: 100%; }

          @page {
            size: A4;
            margin: 0;
          }
        </style>
      </head>
      <body>
        <div class="devis-wrapper">
          <div class="devis-content">
            ${html}
          </div>
        </div>
      </body>
      </html>
    `, { waitUntil: 'networkidle0' });

    // Forcer la page à occuper tout le A4
    await page.evaluate(() => {
      const wrapper = document.querySelector('.devis-wrapper');
      if (wrapper) {
        wrapper.style.minHeight = '297mm';
      }
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      printBackground: true,
      preferCSSPageSize: true
    });

    await browser.close();

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename || 'devis'}.pdf"`,
      'Content-Length': pdfBuffer.length
    });

    res.send(pdfBuffer);

  } catch (error) {
    console.error('Erreur génération PDF:', error);
    res.status(500).json({ message: 'Erreur génération PDF.' });
  }
});

module.exports = router;