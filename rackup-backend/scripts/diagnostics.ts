// scripts/diagnostics.ts
import { createClient } from "redis";
import { Client } from "pg";
import WebSocket from "ws";

async function checkPostgres() {
  const client = new Client({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASS || "postgres",
    database: process.env.DB_NAME || "rackup",
  });

  try {
    await client.connect();
    await client.query("SELECT NOW()");
    console.log("✔ Postgres OK");
  } catch (err) {
    console.error("❌ Postgres ERROR:", err.message);
  } finally {
    await client.end();
  }
}

async function checkRedis() {
  const redis = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
  });

  try {
    await redis.connect();
    await redis.ping();
    console.log("✔ Redis OK");
  } catch (err) {
    console.error("❌ Redis ERROR:", err.message);
  } finally {
    await redis.disconnect();
  }
}

async function checkWebSocket() {
  return new Promise((resolve) => {
    const wsUrl =
      process.env.WS_URL ||
      "wss://potential-parakeet-4rw9gxrgvxpcq579-3000.app.github.dev/socket.io";

    console.log("Testing WebSocket:", wsUrl);

    const ws = new WebSocket(wsUrl);

    ws.on("open", () => {
      console.log("✔ WebSocket handshake OK");
      ws.close();
      resolve(true);
    });

    ws.on("error", (err) => {
      console.error("❌ WebSocket ERROR:", err.message || "(no message)");
      resolve(false);
    });

    ws.on("close", () => {
      // If it closes immediately, handshake failed
    });
  });
}

async function runDiagnostics() {
  console.log("=== RackUp Backend Diagnostics ===");

  await checkPostgres();
  await checkRedis();
  await checkWebSocket();

  console.log("=== Diagnostics Complete ===");
}

runDiagnostics();
