require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./db');
const authMiddleware = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Auth routes — pubbliche (login, setup, status)
app.use('/api/auth', require('./routes/auth'));

// Tutte le altre API richiedono JWT valido
app.use('/api/spese',         authMiddleware, require('./routes/spese'));
app.use('/api/guadagni',      authMiddleware, require('./routes/guadagni'));
app.use('/api/modelli',       authMiddleware, require('./routes/modelli'));
app.use('/api/materiali',     authMiddleware, require('./routes/materiali'));
app.use('/api/configurazione',authMiddleware, require('./routes/configurazione'));
app.use('/api/dashboard',     authMiddleware, require('./routes/dashboard'));
app.use('/api/vendite',       authMiddleware, require('./routes/vendite'));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

initDB().then(() => {
  app.listen(PORT, () => console.log(`🚀 Server attivo su porta ${PORT}`));
}).catch(err => {
  console.error('❌ Errore inizializzazione DB:', err);
  process.exit(1);
});
