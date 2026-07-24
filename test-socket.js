const { io } = require("socket.io-client");

const URL = process.env.RACKUP_WS_URL || "http://localhost:3000";

console.log("[RackUp Test] Connecting to " + URL + "...");

const socket = io(URL, {
  transports: ["websocket"],
  autoConnect: true,
  reconnection: false,
  timeout: 10000,
});

socket.on("connect", () => {
  console.log("✅ Connected successfully! Socket ID:", socket.id);

  const payload = {
    text: "hello world from test-socket.js",
    threadId: null,
    type: "test"
  };

  console.log("📤 Sending message event...");
  socket.emit("message", payload);
});

socket.on("connect_error", (err) => {
  console.error("❌ Connection Error:", err.message);
  console.error("Is the backend running on http://localhost:3000 ?");
});

socket.on("disconnect", (reason) => {
  console.log("Disconnected:", reason);
});

socket.on("message", (msg) => {
  console.log("📨 Received:", msg);
});

socket.on("presence", (data) => {
  console.log("👥 Presence:", data);
});

// Auto close
setTimeout(() => {
  console.log("🛑 Test finished.");
  socket.disconnect();
  process.exit(0);
}, 4000);
