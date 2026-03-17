require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/spese', require('./routes/spese'));
app.use('/api/guadagni', require('./routes/guadagni'));
app.use('/api/modelli', require('./routes/modelli'));
app.use('/api/materiali', require('./routes/materiali'));
app.use('/api/configurazione', require('./routes/configurazione'));
app.use('/api/dashboard', require('./routes/dashboard'));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server attivo su porta ${PORT}`);
  });
}).catch(err => {
  console.error('❌ Errore inizializzazione DB:', err);
  process.exit(1);
});
