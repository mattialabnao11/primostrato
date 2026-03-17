const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const initDB = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS configurazione (
        id SERIAL PRIMARY KEY,
        chiave VARCHAR(100) UNIQUE NOT NULL,
        valore DECIMAL(10,4) NOT NULL DEFAULT 0,
        descrizione TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS materiali (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        colore VARCHAR(50),
        prezzo_per_grammo DECIMAL(10,6) NOT NULL DEFAULT 0,
        note TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS spese (
        id SERIAL PRIMARY KEY,
        data DATE NOT NULL,
        descrizione TEXT NOT NULL,
        importo DECIMAL(10,2) NOT NULL,
        categoria VARCHAR(100),
        note TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS guadagni (
        id SERIAL PRIMARY KEY,
        data DATE NOT NULL,
        descrizione TEXT NOT NULL,
        importo DECIMAL(10,2) NOT NULL,
        categoria VARCHAR(100),
        note TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS modelli (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(200) NOT NULL,
        tempo_ore DECIMAL(6,2) NOT NULL DEFAULT 0,
        link_modello TEXT,
        link_immagini JSONB DEFAULT '[]',
        note TEXT,
        costo_totale DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS modello_materiali (
        id SERIAL PRIMARY KEY,
        modello_id INTEGER REFERENCES modelli(id) ON DELETE CASCADE,
        materiale_id INTEGER REFERENCES materiali(id) ON DELETE SET NULL,
        grammi DECIMAL(8,2) NOT NULL DEFAULT 0
      );
    `);

    // Inserisci configurazioni di default se non esistono
    await client.query(`
      INSERT INTO configurazione (chiave, valore, descrizione)
      VALUES
        ('costo_ora_luce', 0.25, 'Costo energia elettrica per ora di stampa (€)'),
        ('iva_percentuale', 22, 'Aliquota IVA applicata (%)'),
        ('margine_minimo', 30, 'Margine minimo consigliato (%)')
      ON CONFLICT (chiave) DO NOTHING;
    `);

    console.log('✅ Database inizializzato correttamente');
  } finally {
    client.release();
  }
};

module.exports = { pool, initDB };
