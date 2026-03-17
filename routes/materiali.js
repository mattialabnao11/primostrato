const express = require('express');
const router = express.Router();
const { pool } = require('../db');

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM materiali ORDER BY nome ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { nome, colore, prezzo_per_grammo, note } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO materiali (nome, colore, prezzo_per_grammo, note) VALUES ($1,$2,$3,$4) RETURNING *',
      [nome, colore || null, prezzo_per_grammo, note || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { nome, colore, prezzo_per_grammo, note } = req.body;
  try {
    const { rows } = await pool.query(
      'UPDATE materiali SET nome=$1, colore=$2, prezzo_per_grammo=$3, note=$4 WHERE id=$5 RETURNING *',
      [nome, colore || null, prezzo_per_grammo, note || null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Non trovato' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM materiali WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
