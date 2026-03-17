const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Helper: carica materiali ed extra per un modello
async function loadRelated(pool, modelloId) {
  const [{ rows: mat }, { rows: extra }] = await Promise.all([
    pool.query(`
      SELECT mm.*, mat.nome, mat.colore, mat.prezzo_per_grammo
      FROM modello_materiali mm
      JOIN materiali mat ON mm.materiale_id = mat.id
      WHERE mm.modello_id = $1
    `, [modelloId]),
    pool.query(
      'SELECT * FROM modello_extra WHERE modello_id = $1 ORDER BY id ASC',
      [modelloId]
    )
  ]);
  return { mat, extra };
}

// GET all models with their materials and extra
router.get('/', async (req, res) => {
  try {
    const { rows: modelli } = await pool.query(
      'SELECT * FROM modelli ORDER BY created_at DESC'
    );
    for (const m of modelli) {
      const { mat, extra } = await loadRelated(pool, m.id);
      m.materiali = mat;
      m.extra = extra;
    }
    res.json(modelli);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single model
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM modelli WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Non trovato' });
    const modello = rows[0];
    const { mat, extra } = await loadRelated(pool, modello.id);
    modello.materiali = mat;
    modello.extra = extra;
    res.json(modello);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create model with materials, extra and auto-calculate cost
router.post('/', async (req, res) => {
  const { nome, tempo_ore, link_modello, link_immagini, note, materiali, extra } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows: cfg } = await client.query(
      "SELECT valore FROM configurazione WHERE chiave = 'costo_ora_luce'"
    );
    const costoOraLuce = parseFloat(cfg[0]?.valore || 0.25);

    let costoMateriali = 0;
    if (materiali && materiali.length > 0) {
      for (const mat of materiali) {
        const { rows: matInfo } = await client.query(
          'SELECT prezzo_per_grammo FROM materiali WHERE id=$1', [mat.materiale_id]
        );
        if (matInfo.length > 0) {
          costoMateriali += parseFloat(matInfo[0].prezzo_per_grammo) * parseFloat(mat.grammi);
        }
      }
    }

    const costoEnergia = parseFloat(tempo_ore || 0) * costoOraLuce;
    const costoTotale = costoMateriali + costoEnergia;

    const { rows } = await client.query(
      `INSERT INTO modelli (nome, tempo_ore, link_modello, link_immagini, note, costo_totale)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [nome, tempo_ore || 0, link_modello || null,
       JSON.stringify(link_immagini || []), note || null, costoTotale]
    );
    const modello = rows[0];

    if (materiali && materiali.length > 0) {
      for (const mat of materiali) {
        await client.query(
          'INSERT INTO modello_materiali (modello_id, materiale_id, grammi) VALUES ($1,$2,$3)',
          [modello.id, mat.materiale_id, mat.grammi]
        );
      }
    }

    if (extra && extra.length > 0) {
      for (const ex of extra) {
        await client.query(
          'INSERT INTO modello_extra (modello_id, nome, prezzo_per_pezzo) VALUES ($1,$2,$3)',
          [modello.id, ex.nome, ex.prezzo_per_pezzo]
        );
      }
    }

    await client.query('COMMIT');

    const { mat: matRows, extra: extraRows } = await loadRelated(pool, modello.id);
    modello.materiali = matRows;
    modello.extra = extraRows;

    res.status(201).json(modello);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PUT update model
router.put('/:id', async (req, res) => {
  const { nome, tempo_ore, link_modello, link_immagini, note, materiali, extra } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows: cfg } = await client.query(
      "SELECT valore FROM configurazione WHERE chiave = 'costo_ora_luce'"
    );
    const costoOraLuce = parseFloat(cfg[0]?.valore || 0.25);

    let costoMateriali = 0;
    if (materiali && materiali.length > 0) {
      for (const mat of materiali) {
        const { rows: matInfo } = await client.query(
          'SELECT prezzo_per_grammo FROM materiali WHERE id=$1', [mat.materiale_id]
        );
        if (matInfo.length > 0) {
          costoMateriali += parseFloat(matInfo[0].prezzo_per_grammo) * parseFloat(mat.grammi);
        }
      }
    }

    const costoEnergia = parseFloat(tempo_ore || 0) * costoOraLuce;
    const costoTotale = costoMateriali + costoEnergia;

    const { rows } = await client.query(
      `UPDATE modelli SET nome=$1, tempo_ore=$2, link_modello=$3, link_immagini=$4, note=$5, costo_totale=$6
       WHERE id=$7 RETURNING *`,
      [nome, tempo_ore || 0, link_modello || null,
       JSON.stringify(link_immagini || []), note || null, costoTotale, req.params.id]
    );
    if (!rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Non trovato' });
    }

    await client.query('DELETE FROM modello_materiali WHERE modello_id=$1', [req.params.id]);
    if (materiali && materiali.length > 0) {
      for (const mat of materiali) {
        await client.query(
          'INSERT INTO modello_materiali (modello_id, materiale_id, grammi) VALUES ($1,$2,$3)',
          [req.params.id, mat.materiale_id, mat.grammi]
        );
      }
    }

    await client.query('DELETE FROM modello_extra WHERE modello_id=$1', [req.params.id]);
    if (extra && extra.length > 0) {
      for (const ex of extra) {
        await client.query(
          'INSERT INTO modello_extra (modello_id, nome, prezzo_per_pezzo) VALUES ($1,$2,$3)',
          [req.params.id, ex.nome, ex.prezzo_per_pezzo]
        );
      }
    }

    await client.query('COMMIT');

    const modello = rows[0];
    const { mat: matRows, extra: extraRows } = await loadRelated(pool, modello.id);
    modello.materiali = matRows;
    modello.extra = extraRows;

    res.json(modello);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM modelli WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
