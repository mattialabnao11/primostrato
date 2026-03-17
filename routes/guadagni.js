const express = require('express');
const router = express.Router();
const { pool } = require('../db');

router.get('/', async (req, res) => {
  try {
    // Porta con sé anche il vendita_id se esiste, per sapere se aprire il dettaglio
    const { rows } = await pool.query(`
      SELECT g.*, v.id as vendita_id
      FROM guadagni g
      LEFT JOIN vendite v ON v.guadagno_id = g.id
      ORDER BY g.data DESC, g.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET singolo guadagno con dettaglio vendita completo
router.get('/:id', async (req, res) => {
  try {
    const { rows: gRows } = await pool.query(
      'SELECT * FROM guadagni WHERE id=$1', [req.params.id]
    );
    if (!gRows.length) return res.status(404).json({ error: 'Non trovato' });
    const g = gRows[0];

    // Cerca vendita collegata
    const { rows: vRows } = await pool.query(
      'SELECT * FROM vendite WHERE guadagno_id=$1', [g.id]
    );
    g.vendita = vRows[0] || null;

    // Se c'è una vendita, carica anche il modello collegato
    if (g.vendita && g.vendita.modello_id) {
      const { rows: mRows } = await pool.query(
        'SELECT id, nome, link_modello, link_immagini, costo_totale, tempo_ore FROM modelli WHERE id=$1',
        [g.vendita.modello_id]
      );
      g.vendita.modello = mRows[0] || null;
    }

    res.json(g);
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
