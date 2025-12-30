// WebSocket server for mobile scanner pairing on dedicated port
import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { createServer } from "http";
import crypto from "crypto";

interface ScannerSession {
  id: string;
  pairingCode: string;
  pcSocket: WebSocket | null;
  mobileSocket: WebSocket | null;
  createdAt: Date;
  expiresAt: Date;
}

const sessions = new Map<string, ScannerSession>();
const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const WS_PORT = 5001; // Separate port to avoid Vite HMR conflicts

// Generate random pairing code
function generatePairingCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

// Clean expired sessions
setInterval(() => {
  const now = new Date();
  for (const [sessionId, session] of sessions.entries()) {
    if (session.expiresAt < now) {
      session.pcSocket?.close();
      session.mobileSocket?.close();
      sessions.delete(sessionId);
      console.log(`Session ${sessionId} expired and removed`);
    }
  }
}, 60000); // Check every minute

export function setupScannerWebSocket(_mainServer: Server) {
  // Create a separate HTTP server for WebSocket on port 5001
  const wsHttpServer = createServer();
  const wss = new WebSocketServer({ server: wsHttpServer });

  wss.on("connection", (ws: WebSocket, req) => {
    console.log(
      "✅ New WebSocket connection established from:",
      req.socket.remoteAddress
    );

    // Set up ping/pong to keep connection alive
    let isAlive = true;
    ws.on("pong", () => {
      isAlive = true;
    });

    const pingInterval = setInterval(() => {
      if (!isAlive) {
        console.log("⚠️ WebSocket not responding to ping, terminating");
        return ws.terminate();
      }
      isAlive = false;
      ws.ping();
    }, 30000); // Ping every 30 seconds

    ws.on("message", (message: string) => {
      console.log("📨 Received message:", message.toString().substring(0, 100));
      try {
        const data = JSON.parse(message.toString());
        console.log("📋 Parsed message type:", data.type);

        switch (data.type) {
          case "pc_request_pairing":
            handlePCPairingRequest(ws);
            break;

          case "mobile_pair":
            console.log(
              "🔗 Mobile pairing attempt with code:",
              data.pairingCode
            );
            handleMobilePairing(ws, data.pairingCode);
            break;

          case "mobile_scan_result":
            handleScanResult(ws, data.qrData);
            break;

          case "ping":
            // Respond to client ping
            ws.send(JSON.stringify({ type: "pong" }));
            break;

          default:
            console.log("Unknown message type:", data.type);
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Invalid message format",
          })
        );
      }
    });

    ws.on("close", () => {
      console.log("WebSocket connection closed");
      clearInterval(pingInterval);
      // Clean up any sessions associated with this socket
      for (const [sessionId, session] of sessions.entries()) {
        if (session.pcSocket === ws || session.mobileSocket === ws) {
          // Notify the other party
          if (session.pcSocket === ws && session.mobileSocket) {
            session.mobileSocket.send(
              JSON.stringify({
                type: "pc_disconnected",
              })
            );
          } else if (session.mobileSocket === ws && session.pcSocket) {
            session.pcSocket.send(
              JSON.stringify({
                type: "mobile_disconnected",
              })
            );
          }
          sessions.delete(sessionId);
          console.log(`Session ${sessionId} cleaned up after disconnect`);
        }
      }
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  });

  // Start the WebSocket server on dedicated port
  wsHttpServer.listen(WS_PORT, "0.0.0.0", () => {
    console.log(`✅ WebSocket server listening on ws://localhost:${WS_PORT}`);
  });
}

// PC requests pairing - generate code and create session
function handlePCPairingRequest(ws: WebSocket) {
  const sessionId = crypto.randomUUID();
  const pairingCode = generatePairingCode();

  const session: ScannerSession = {
    id: sessionId,
    pairingCode,
    pcSocket: ws,
    mobileSocket: null,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + SESSION_TIMEOUT),
  };

  sessions.set(sessionId, session);

  const responseMessage = JSON.stringify({
    type: "pairing_code",
    pairingCode: pairingCode, // Match the field name expected by client
    sessionId,
  });

  console.log(`📤 Sending pairing code to PC:`, responseMessage);
  ws.send(responseMessage);

  console.log(
    `✅ New pairing session created: ${sessionId}, code: ${pairingCode}`
  );
}

// Mobile device pairs with PC using code
function handleMobilePairing(ws: WebSocket, pairingCode: string) {
  console.log(`🔍 Looking for pairing code: ${pairingCode}`);
  console.log(`📊 Active sessions: ${sessions.size}`);

  // Log all active sessions
  for (const [sessionId, session] of sessions.entries()) {
    console.log(
      `  Session ${sessionId.substring(0, 8)}...: code=${
        session.pairingCode
      }, hasMobile=${!!session.mobileSocket}, expires=${session.expiresAt.toISOString()}`
    );
  }

  // Find session with this pairing code
  let targetSession: ScannerSession | null = null;
  let targetSessionId: string | null = null;

  for (const [sessionId, session] of sessions.entries()) {
    if (session.pairingCode === pairingCode && !session.mobileSocket) {
      targetSession = session;
      targetSessionId = sessionId;
      break;
    }
  }

  if (!targetSession || !targetSessionId) {
    console.log(`❌ Pairing failed: No session found with code ${pairingCode}`);
    ws.send(
      JSON.stringify({
        type: "pairing_failed",
        message: "Invalid or expired pairing code",
      })
    );
    console.log(`Pairing failed: Invalid code ${pairingCode}`);
    return;
  }

  // Check if session expired
  if (targetSession.expiresAt < new Date()) {
    console.log(`❌ Session expired: ${targetSessionId}`);
    sessions.delete(targetSessionId);
    ws.send(
      JSON.stringify({
        type: "pairing_failed",
        message: "Pairing code expired",
      })
    );
    console.log(`Pairing failed: Expired code ${pairingCode}`);
    return;
  }

  // Pair the mobile device
  targetSession.mobileSocket = ws;

  // Notify mobile
  ws.send(
    JSON.stringify({
      type: "pairing_success",
      sessionId: targetSessionId,
    })
  );

  // Notify PC
  targetSession.pcSocket?.send(
    JSON.stringify({
      type: "mobile_connected",
    })
  );

  console.log(`✅ Mobile paired to session ${targetSessionId}`);
}

// Mobile sends scan result to PC
function handleScanResult(ws: WebSocket, qrData: string) {
  // Find session for this mobile socket
  let session: ScannerSession | null = null;

  for (const s of sessions.values()) {
    if (s.mobileSocket === ws) {
      session = s;
      break;
    }
  }

  if (!session) {
    ws.send(
      JSON.stringify({
        type: "error",
        message: "Not paired with any PC",
      })
    );
    return;
  }

  // Send scan result to PC
  session.pcSocket?.send(
    JSON.stringify({
      type: "scan_result",
      qrData,
      timestamp: new Date().toISOString(),
    })
  );

  // Confirm to mobile
  ws.send(
    JSON.stringify({
      type: "scan_sent",
      qrData,
    })
  );

  console.log(`QR data sent from mobile to PC: ${qrData.substring(0, 20)}...`);
}
