const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.get('/', (req, res) => res.send('ok'));

// Crash point එක සර්වර් එකේ විතරයි හැදෙන්නේ
function makeCrashPoint() {
  const r = crypto.randomInt(0, 1_000_000_000) / 1_000_000_000;
  const point = 0.97 / (1 - r);
  return Math.max(1.0, Math.floor(point * 100) / 100);
}

const GROWTH = 0.0001; // multiplier වැඩිවෙන වේගය
let state = { phase: 'waiting', multiplier: 1.0 };

function runRound() {
  const crashPoint = makeCrashPoint(); // client එකට කවදාවත් යවන්නේ නෑ (crash වෙනකම්)
  state = { phase: 'waiting', multiplier: 1.0 };
  io.emit('waiting', { seconds: 5 });

  setTimeout(() => {
    const start = Date.now();
    state.phase = 'flying';
    io.emit('start');

    const timer = setInterval(() => {
      const m = Math.exp(GROWTH * (Date.now() - start));
      if (m >= crashPoint) {
        clearInterval(timer);
        state = { phase: 'crashed', multiplier: crashPoint };
        io.emit('crash', { multiplier: crashPoint });
        setTimeout(runRound, 3000);
      } else {
        state.multiplier = Math.round(m * 100) / 100;
        io.emit('tick', { multiplier: state.multiplier });
      }
    }, 100);
  }, 5000);
}

// අලුතින් connect වෙන කෙනාට දැන් තියෙන තත්වය දෙනවා
io.on('connection', (socket) => socket.emit('state', state));

runRound();
server.listen(process.env.PORT || 3000);
