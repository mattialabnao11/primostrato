const express = require('express');
const router = express.Router();
const { pool } = require('../db');

router.get('/', async (req, res) => {
  try {
    const [spese, guadagni, modelli, top_modelli] = await Promise.all([
      pool.query('SELECT COALESCE(SUM(importo),0) as totale, COUNT(*) as numero FROM spese'),
      pool.query('SELECT COALESCE(SUM(importo),0) as totale, COUNT(*) as numero FROM guadagni'),
      pool.query('SELECT COUNT(*) as numero, COALESCE(SUM(costo_totale),0) as costo_produzione FROM modelli'),
      pool.query('SELECT nome, costo_totale, created_at FROM modelli ORDER BY created_at DESC LIMIT 5'),
    ]);

    const totalSpese = parseFloat(spese.rows[0].totale);
    const totalGuadagni = parseFloat(guadagni.rows[0].totale);
    const saldo = totalGuadagni - totalSpese;

    // Ultimi 6 mesi spese/guadagni
    const { rows: andamento } = await pool.query(`
      WITH months AS (
        SELECT generate_series(
          date_trunc('month', NOW() - interval '5 months'),
          date_trunc('month', NOW()),
          '1 month'::interval
        ) AS mese
      )
      SELECT 
        to_char(months.mese, 'Mon YY') as label,
        COALESCE(s.tot, 0) as spese,
        COALESCE(g.tot, 0) as guadagni
      FROM months
      LEFT JOIN (
        SELECT date_trunc('month', data) as mese, SUM(importo) as tot FROM spese GROUP BY 1
      ) s ON s.mese = months.mese
      LEFT JOIN (
        SELECT date_trunc('month', data) as mese, SUM(importo) as tot FROM guadagni GROUP BY 1
      ) g ON g.mese = months.mese
      ORDER BY months.mese ASC
    `);

    res.json({
      spese: { totale: totalSpese, numero: parseInt(spese.rows[0].numero) },
      guadagni: { totale: totalGuadagni, numero: parseInt(guadagni.rows[0].numero) },
      saldo,
      modelli: {
        numero: parseInt(modelli.rows[0].numero),
        costo_produzione: parseFloat(modelli.rows[0].costo_produzione)
      },
      top_modelli: top_modelli.rows,
      andamento
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
