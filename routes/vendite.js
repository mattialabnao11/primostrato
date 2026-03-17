const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// POST — registra una vendita e crea automaticamente il guadagno netto
router.post('/', async (req, res) => {
  const {
    modello_id,
    modello_nome,
    quantita,
    prezzo_vendita,       // prezzo totale fatto dal venditore (già × qty)
    costo_produzione_unit,// costo produzione per singolo pezzo
    extra_usati,          // array { id, nome, prezzo_per_pezzo }
    note,
    data
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const qty = parseInt(quantita) || 1;
    const costoUnitExtra = (extra_usati || []).reduce(
      (s, ex) => s + parseFloat(ex.prezzo_per_pezzo), 0
    );
    const costoTotaleUnit = parseFloat(costo_produzione_unit) + costoUnitExtra;
    const costoTotale = costoTotaleUnit * qty;
    const profittoNetto = parseFloat(prezzo_vendita) - costoTotale;

    const descrizioneGuadagno = `Vendita: ${modello_nome}${qty > 1 ? ` × ${qty}` : ''}`;
    const noteGuadagno = [
      `Prezzo vendita: €${parseFloat(prezzo_vendita).toFixed(2)}`,
      `Costo prod. unitario: €${parseFloat(costo_produzione_unit).toFixed(2)}`,
      extra_usati?.length ? `Extra: ${extra_usati.map(e => e.nome).join(', ')}` : null,
      note || null
    ].filter(Boolean).join(' | ');

    // Inserisci guadagno netto
    const { rows: gRows } = await client.query(
      `INSERT INTO guadagni (data, descrizione, importo, categoria, note)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [data || new Date().toISOString().split('T')[0],
       descrizioneGuadagno, profittoNetto, 'Vendita 3D', noteGuadagno]
    );

    // Inserisci record vendita
    const { rows: vRows } = await client.query(
      `INSERT INTO vendite
         (modello_id, modello_nome, quantita, prezzo_vendita,
          costo_produzione_unit, costo_extra_unit, costo_totale,
          profitto_netto, extra_usati, note, data, guadagno_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        modello_id || null,
        modello_nome,
        qty,
        parseFloat(prezzo_vendita),
        parseFloat(costo_produzione_unit),
        costoUnitExtra,
        costoTotale,
        profittoNetto,
        JSON.stringify(extra_usati || []),
        note || null,
        data || new Date().toISOString().split('T')[0],
        gRows[0].id
      ]
    );

    await client.query('COMMIT');
    res.status(201).json({ vendita: vRows[0], guadagno: gRows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// GET — storico vendite
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM vendite ORDER BY data DESC, created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
