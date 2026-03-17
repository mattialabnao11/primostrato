# 3D Model Manager

Applicazione web per gestire modelli 3D: costi di produzione, spese reali, guadagni e materiali.

## Stack
- **Backend**: Node.js + Express
- **Database**: Neon PostgreSQL (serverless)
- **Frontend**: Vanilla JS/CSS — SPA senza framework
- **Deploy**: Render.com

---

## Setup Locale

### 1. Clona e installa
```bash
git clone <tuo-repo>
cd 3d-model-manager
npm install
```

### 2. Configura il database Neon
1. Vai su [console.neon.tech](https://console.neon.tech)
2. Crea un nuovo progetto
3. Copia la **Connection String** (formato: `postgresql://...`)

### 3. Crea il file `.env`
```bash
cp .env.example .env
# Poi modifica .env con la tua DATABASE_URL
```

### 4. Avvia
```bash
npm start
# oppure in sviluppo:
npm run dev
```

Apri http://localhost:3000

---

## Deploy su Render

1. Pusha il codice su GitHub (repo privato consigliato)
2. Vai su [render.com](https://render.com) → **New Web Service**
3. Collega il repository
4. Render riconoscerà automaticamente il `render.yaml`
5. Aggiungi la variabile d'ambiente:
   - **Key**: `DATABASE_URL`
   - **Value**: la tua connection string Neon
6. Click **Deploy**

---

## Funzionalità

### 📊 Dashboard
- Totale guadagni, spese e saldo netto
- Grafico andamento ultimi 6 mesi
- Ultimi modelli inseriti

### ◻ Modelli 3D
- Scheda per ogni modello con nome, tempo di stampa, materiali usati
- **Calcolo automatico costo** = costo materiali + costo energia
- Link a file 3D e immagini su Google Drive
- **Anteprima immagini** da Drive senza scaricarle nel DB (solo URL)
- Vista dettaglio con breakdown costi

### 📉 Spese
- Registro spese con data, descrizione, categoria e importo
- Totale automatico

### 📈 Guadagni
- Registro vendite/entrate con le stesse informazioni

### ⚙ Configurazione
- **Materiali/Filamenti**: nome, colore, prezzo al grammo (con helper €/kg)
- **Costo ora di luce** (€/h) per calcolo energia stampa
- **IVA %** e margine minimo di riferimento

---

## Google Drive — Anteprima Immagini

Incolla i link di Google Drive nelle immagini del modello.  
L'app estrae l'ID del file e usa `drive.google.com/thumbnail?id=...` per mostrare l'anteprima — **nessun file viene salvato nel DB**, solo l'URL.

⚠️ Assicurati che i file su Drive siano condivisi come **"Chiunque abbia il link"** (almeno visualizzazione) per far funzionare le anteprime.

---

## Struttura Progetto

```
├── server.js          # Entry point Express
├── db.js              # Connessione Neon + init schema
├── routes/
│   ├── spese.js
│   ├── guadagni.js
│   ├── modelli.js
│   ├── materiali.js
│   ├── configurazione.js
│   └── dashboard.js
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── render.yaml
└── .env.example
```
