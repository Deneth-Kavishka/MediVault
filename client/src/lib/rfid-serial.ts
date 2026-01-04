export type RfidSerialScanOptions = {
  baudRate?: number;
  timeoutMs?: number;
};

function normalizeUid(uid: string): string {
  const normalized = uid
    .trim()
    .replace(/^RFID\s*:\s*/i, "")
    .replace(/\s+/g, "")
    .toUpperCase();

  // Accept only hex UID strings (RC522 typically 4/7/10 bytes => 8/14/20 hex chars)
  if (!/^[0-9A-F]+$/.test(normalized)) return "";
  if (normalized.length < 8 || normalized.length > 32) return "";
  if (normalized.length % 2 !== 0) return "";
  return normalized;
}

function friendlySerialError(err: unknown): Error {
  const message = err instanceof Error ? err.message : String(err);
  const name = err instanceof Error ? (err as any).name : undefined;

  // Happens when the user cancels the browser's port picker.
  if (
    name === "NotFoundError" ||
    /no port selected by the user/i.test(message) ||
    /the user did not select a port/i.test(message)
  ) {
    return new Error(
      "No serial port selected. Please choose the NodeMCU port."
    );
  }

  return new Error(message || "Serial connection failed");
}

export function isWebSerialSupported(): boolean {
  return typeof navigator !== "undefined" && "serial" in navigator;
}

// Keep a single port open across scans.
let activePort: any = null;
let activeReader: any = null;
let activeTextDecoder: any = null;
let isOpen = false;
let readBuffer = "";
let scanInFlight: Promise<string> | null = null;

async function disconnectInternal(): Promise<void> {
  const port = activePort;
  const reader = activeReader;
  const decoder = activeTextDecoder;

  activePort = null;
  activeReader = null;
  activeTextDecoder = null;
  isOpen = false;
  readBuffer = "";

  try {
    await reader?.cancel?.();
  } catch {
    // ignore
  }
  try {
    reader?.releaseLock?.();
  } catch {
    // ignore
  }
  try {
    await decoder?.readable?.cancel?.();
  } catch {
    // ignore
  }
  try {
    await port?.close?.();
  } catch {
    // ignore
  }
}

export async function disconnectRfidSerial(): Promise<void> {
  await disconnectInternal();
}

async function ensureConnected(baudRate: number): Promise<void> {
  if (!isWebSerialSupported()) {
    throw new Error(
      "Web Serial is not supported in this browser. Use Chrome or Edge."
    );
  }

  if (activePort && isOpen) return;

  if (!activePort) {
    try {
      // Must be called from a user gesture (button click)
      activePort = await (navigator as any).serial.requestPort();
    } catch (err) {
      throw friendlySerialError(err);
    }
  }

  try {
    await activePort.open({ baudRate });

    // Keep a long-lived text decoder + reader so subsequent scans don't reprompt.
    activeTextDecoder = new TextDecoderStream();
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    activePort.readable.pipeTo(activeTextDecoder.writable);
    activeReader = activeTextDecoder.readable.getReader();

    isOpen = true;
    readBuffer = "";
  } catch (err) {
    await disconnectInternal();
    throw friendlySerialError(err);
  }
}

async function writeLine(line: string): Promise<void> {
  if (!activePort?.writable) return;
  const writer = activePort.writable.getWriter();
  try {
    const data = new TextEncoder().encode(`${line}\n`);
    await writer.write(data);
  } finally {
    try {
      writer.releaseLock();
    } catch {
      // ignore
    }
  }
}

async function readNextUsefulLine(timeoutMs: number): Promise<string> {
  const start = Date.now();

  while (true) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("RFID scan timed out. Please scan again.");
    }

    let chunk: string | undefined;
    try {
      const result = await activeReader.read();
      if (result?.done) {
        throw new Error("Serial port closed");
      }
      chunk = result?.value;
    } catch (err) {
      // If the device disconnects, reset state so the next click can reprompt.
      await disconnectInternal();
      throw friendlySerialError(err);
    }

    if (!chunk) continue;

    readBuffer += chunk;
    const lines = readBuffer.split(/\r?\n/);
    readBuffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = String(line ?? "").trim();
      if (!trimmed) continue;
      return trimmed;
    }
  }
}

/**
 * Scans one RFID UID.
 *
 * Behavior:
 * - First scan prompts to pick the NodeMCU serial port.
 * - Subsequent scans reuse the already-open port (no reprompt).
 * - Sends a `SCAN` command to the device and waits for either:
 *   - `RFID:<HEXUID>`  => resolves HEXUID
 *   - `ERR:TIMEOUT`    => throws a timeout error
 */
export async function scanRfidOnce(
  options: RfidSerialScanOptions = {}
): Promise<string> {
  if (scanInFlight) return scanInFlight;

  const baudRate = options.baudRate ?? 115200;
  const timeoutMs = options.timeoutMs ?? 15000;

  scanInFlight = (async () => {
    await ensureConnected(baudRate);

    // Trigger one explicit scan on the firmware so we can detect failures.
    await writeLine("SCAN");

    while (true) {
      const line = await readNextUsefulLine(timeoutMs);

      // Ignore firmware status/chatter lines
      if (/^(READY|SCANNING|PRESENT\s+A\s+TAG)/i.test(line)) {
        continue;
      }

      if (/^ERR:/i.test(line)) {
        const code = line.replace(/^ERR:\s*/i, "").trim();
        if (/busy/i.test(code)) {
          // Scan already running; keep waiting for RFID or TIMEOUT.
          continue;
        }
        if (/timeout/i.test(code)) {
          throw new Error("RFID scan timed out. Please try again.");
        }
        throw new Error(`RFID scan failed: ${code || "unknown error"}`);
      }

      // Accept both prefixed and raw UID lines
      const uid = normalizeUid(line);
      if (uid) return uid;
    }
  })();

  try {
    return await scanInFlight;
  } finally {
    scanInFlight = null;
  }
}
