const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const authMiddleware = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'cambia-questa-chiave-in-produzione';
const SALT_ROUNDS = 12;

// GET /api/auth/status — controlla se esiste già un utente (primo avvio)
router.get('/status', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT COUNT(*) as n FROM utenti');
    res.json({ setup_required: parseInt(rows[0].n) === 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/setup — crea il primo utente admin (solo se non esistono utenti)
router.post('/setup', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username e password obbligatori' });
  if (password.length < 8) return res.status(400).json({ error: 'Password minimo 8 caratteri' });

  try {
    const { rows } = await pool.query('SELECT COUNT(*) as n FROM utenti');
    if (parseInt(rows[0].n) > 0) {
      return res.status(403).json({ error: 'Setup già completato' });
    }

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    await pool.query(
      'INSERT INTO utenti (username, password_hash) VALUES ($1, $2)',
      [username.trim().toLowerCase(), hash]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Credenziali mancanti' });

  try {
    const { rows } = await pool.query(
      'SELECT * FROM utenti WHERE username=$1',
      [username.trim().toLowerCase()]
    );
    if (!rows.length) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, username: user.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/change-password — cambia password (richiede autenticazione)
router.post('/change-password', authMiddleware, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) return res.status(400).json({ error: 'Campi obbligatori' });
  if (new_password.length < 8) return res.status(400).json({ error: 'Nuova password minimo 8 caratteri' });

  try {
    const { rows } = await pool.query('SELECT * FROM utenti WHERE id=$1', [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'Utente non trovato' });

    const match = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!match) return res.status(401).json({ error: 'Password attuale non corretta' });

    const hash = await bcrypt.hash(new_password, SALT_ROUNDS);
    await pool.query('UPDATE utenti SET password_hash=$1 WHERE id=$2', [hash, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
