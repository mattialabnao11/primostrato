const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// GET all
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM spese ORDER BY data DESC, created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET summary by category
router.get('/riepilogo', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        categoria,
        SUM(importo) as totale,
        COUNT(*) as numero
      FROM spese
      GROUP BY categoria
      ORDER BY totale DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create
router.post('/', async (req, res) => {
  const { data, descrizione, importo, categoria, note } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO spese (data, descrizione, importo, categoria, note) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [data, descrizione, importo, categoria || null, note || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update
router.put('/:id', async (req, res) => {
  const { data, descrizione, importo, categoria, note } = req.body;
  try {
    const { rows } = await pool.query(
      'UPDATE spese SET data=$1, descrizione=$2, importo=$3, categoria=$4, note=$5 WHERE id=$6 RETURNING *',
      [data, descrizione, importo, categoria || null, note || null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Non trovato' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM spese WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
