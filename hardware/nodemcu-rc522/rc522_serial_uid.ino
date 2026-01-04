#include <SPI.h>
#include <MFRC522.h>

// NodeMCU (ESP8266) recommended pins (avoid boot-strap issues):
// SS  = D2 (GPIO4)
// RST = D1 (GPIO5)

static constexpr uint8_t SS_PIN  = D2;
static constexpr uint8_t RST_PIN = D1;

// Indicators (add external components)
// Recommended wiring keeps boot-strap pins HIGH at boot (LED -> GND style).
static constexpr uint8_t GREEN_LED_PIN = D0; // GPIO16
static constexpr uint8_t RED_LED_PIN   = D3; // GPIO0
static constexpr uint8_t BUZZER_PIN    = D4; // GPIO2 (active buzzer via transistor recommended)

MFRC522 rfid(SS_PIN, RST_PIN);

static String cmdBuffer;
static bool scanning = false;
static unsigned long scanStartedAt = 0;
static constexpr unsigned long SCAN_TIMEOUT_MS = 10000;

static inline void ledsOff() {
  digitalWrite(GREEN_LED_PIN, LOW);
  digitalWrite(RED_LED_PIN, LOW);
}

static inline void buzzerOff() {
  digitalWrite(BUZZER_PIN, LOW);
}

static void beep(unsigned long ms) {
  digitalWrite(BUZZER_PIN, HIGH);
  delay(ms);
  digitalWrite(BUZZER_PIN, LOW);
}

static void signalPowerUp() {
  // Long beep on power up
  beep(700);
}

static void signalSuccess() {
  // Double beep + green
  digitalWrite(GREEN_LED_PIN, HIGH);
  beep(90);
  delay(90);
  beep(90);
  delay(120);
  digitalWrite(GREEN_LED_PIN, LOW);
}

static void signalFail() {
  // Red + longer beep
  digitalWrite(RED_LED_PIN, HIGH);
  beep(300);
  delay(120);
  digitalWrite(RED_LED_PIN, LOW);
}

String uidToHex(const MFRC522::Uid &uid) {
  String out;
  out.reserve(uid.size * 2);
  for (byte i = 0; i < uid.size; i++) {
    if (uid.uidByte[i] < 0x10) out += '0';
    out += String(uid.uidByte[i], HEX);
  }
  out.toUpperCase();
  return out;
}

void setup() {
  Serial.begin(115200);
  delay(200);

  pinMode(GREEN_LED_PIN, OUTPUT);
  pinMode(RED_LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  ledsOff();
  buzzerOff();

  SPI.begin();
  rfid.PCD_Init();

  Serial.println("READY");
  Serial.println("Send SCAN then present a tag...");
  signalPowerUp();
}

static void startScan() {
  if (scanning) {
    Serial.println("ERR:BUSY");
    signalFail();
    return;
  }

  scanning = true;
  scanStartedAt = millis();
  Serial.println("SCANNING");
}

static void handleCommand(const String &raw) {
  String cmd = raw;
  cmd.trim();
  cmd.toUpperCase();

  if (cmd == "SCAN") {
    startScan();
    return;
  }
}

void loop() {
  // Read commands (non-blocking line buffer)
  while (Serial.available() > 0) {
    const char c = (char)Serial.read();
    if (c == '\n' || c == '\r') {
      if (cmdBuffer.length() > 0) {
        handleCommand(cmdBuffer);
        cmdBuffer = "";
      }
    } else {
      if (cmdBuffer.length() < 32) cmdBuffer += c;
    }
  }

  if (!scanning) return;

  // Scan window
  if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
    const String uid = uidToHex(rfid.uid);

    // IMPORTANT: newline-terminated line.
    Serial.print("RFID:");
    Serial.println(uid);

    signalSuccess();

    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();

    scanning = false;
    delay(300);
    return;
  }

  if (millis() - scanStartedAt > SCAN_TIMEOUT_MS) {
    Serial.println("ERR:TIMEOUT");
    signalFail();
    scanning = false;
    delay(200);
    return;
  }
}
