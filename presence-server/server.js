const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// mappa: "utente" -> timestamp ultimo ping
const users = new Map();

// quanto tempo consideriamo "online" (ms)
const ONLINE_WINDOW = 20 * 1000; // 20 secondi

// === Conteggio utenti unici al giorno ===
let currentDay = null;
let currentDayUsers = new Set();

function getTodayKey() {
  const d = new Date();
  // formato YYYY-MM-DD
  return d.toISOString().slice(0, 10);
}

function ensureToday() {
  const today = getTodayKey();
  if (today !== currentDay) {
    currentDay = today;
    currentDayUsers = new Set();
  }
}

function registerDailyUser(id) {
  ensureToday();
  currentDayUsers.add(id);
}

// rimuove utenti considerati offline
function purgeOldUsers() {
  const now = Date.now();
  for (const [id, lastSeen] of users) {
    if (now - lastSeen > ONLINE_WINDOW) {
      users.delete(id);
    }
  }
}

// endpoint chiamato dai client per dire "sono ancora qui"
app.post('/ping', (req, res) => {
  const id = req.ip + '|' + (req.headers['user-agent'] || '');
  users.set(id, Date.now());

  // registra l'utente per il conteggio giornaliero
  registerDailyUser(id);

  purgeOldUsers();
  res.json({ ok: true });
});

// endpoint per sapere quanti sono online
app.get('/online-count', (req, res) => {
  purgeOldUsers();
  res.json({ count: users.size });
});

// endpoint per sapere quanti utenti unici si sono collegati oggi
app.get('/daily-count', (req, res) => {
  ensureToday();
  res.json({
    day: currentDay,
    count: currentDayUsers.size,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Presence server in ascolto sulla porta', PORT);
});
