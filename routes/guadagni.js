const express = require('express');
const router = express.Router();
const { pool } = require('../db');

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM guadagni ORDER BY data DESC, created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/riepilogo', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        categoria,
        SUM(importo) as totale,
        COUNT(*) as numero
      FROM guadagni
      GROUP BY categoria
      ORDER BY totale DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { data, descrizione, importo, categoria, note } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO guadagni (data, descrizione, importo, categoria, note) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [data, descrizione, importo, categoria || null, note || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { data, descrizione, importo, categoria, note } = req.body;
  try {
    const { rows } = await pool.query(
      'UPDATE guadagni SET data=$1, descrizione=$2, importo=$3, categoria=$4, note=$5 WHERE id=$6 RETURNING *',
      [data, descrizione, importo, categoria || null, note || null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Non trovato' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM guadagni WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
