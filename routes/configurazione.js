const express = require('express');
const router = express.Router();
const { pool } = require('../db');

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM configurazione ORDER BY chiave ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:chiave', async (req, res) => {
  const { valore, descrizione } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO configurazione (chiave, valore, descrizione, updated_at)
       VALUES ($1,$2,$3,NOW())
       ON CONFLICT (chiave) DO UPDATE SET valore=$2, descrizione=$3, updated_at=NOW()
       RETURNING *`,
      [req.params.chiave, valore, descrizione || null]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
