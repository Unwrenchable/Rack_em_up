// Node-based Socket.IO client (avoids PowerShell/wscat escaping issues).
const { io } = require('socket.io-client');

const URL = process.env.RACKUP_WS_URL || 'http://localhost:3000';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

(async () => {
  console.log(`[test-socket] Connecting to ${URL}...`);

  const socket = io(URL, {
    transports: ['websocket'],
    autoConnect: true,
    reconnection: false,
    timeout: 10_000,
  });

  socket.on('connect', () => {
    console.log('[test-socket] Connected. socket.id =', socket.id);
  });

  socket.on('connect_error', (err) => {
    console.error('[test-socket] connect_error:', err?.message || err);
  });

  socket.on('disconnect', (reason) => {
    console.warn('[test-socket] Disconnected:', reason);
  });

  socket.on('presence', (payload) => {
    console.log('[test-socket] presence:', payload);
  });

  socket.on('message', (payload) => {
    console.log('[test-socket] message received:', payload);
  });

  await new Promise((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('connect_error', reject);
  });

  const payload = { text: 'hello world (from test-socket)', threadId: null };
  console.log('[test-socket] Sending event: message', payload);
  socket.emit('message', payload);

  await sleep(1500);

  console.log('[test-socket] Done. Disconnecting.');
  socket.disconnect();
  process.exit(0);
})().catch((e) => {
  console.error('[test-socket] Fatal:', e);
  process.exit(1);
});