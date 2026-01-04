# RFID (RC522 + NodeMCU) integration (Laptop via USB)

This project supports scanning RFID tags using:

- RC522 (MFRC522) RFID reader
- NodeMCU (ESP8266) over USB
- Chrome/Edge **Web Serial API** to read the UID into the React UI

## 1) Wiring (RC522 ↔ NodeMCU ESP8266)

**Important:** RC522 is **3.3V only**. Do **NOT** connect it to 5V.

| RC522 pin | NodeMCU pin | ESP8266 GPIO | Notes            |
| --------- | ----------- | -----------: | ---------------- |
| SDA / SS  | D2          |        GPIO4 | Chip select (SS) |
| SCK       | D5          |       GPIO14 | SPI clock        |
| MOSI      | D7          |       GPIO13 | SPI MOSI         |
| MISO      | D6          |       GPIO12 | SPI MISO         |
| RST       | D1          |        GPIO5 | Reset            |
| 3.3V      | 3V3         |            — | Power            |
| GND       | GND         |            — | Ground           |

**Not used:** IRQ

Tip: These pins avoid common boot issues on ESP8266 (e.g., using D8/GPIO15 can be tricky).

### Optional indicators (Buzzer + Green/Red LED)

The firmware supports:

- Power up: **long beep**
- Successful scan: **double beep + green LED**
- Scan timeout/failure: **red LED + longer beep**

Recommended pins:

| Part            | NodeMCU pin | ESP8266 GPIO | Wiring notes                 |
| --------------- | ----------- | -----------: | ---------------------------- |
| Green LED       | D0          |       GPIO16 | GPIO → 220–330Ω → LED → GND  |
| Red LED         | D3          |        GPIO0 | GPIO → 220–330Ω → LED → GND  |
| Buzzer (active) | D4          |        GPIO2 | Prefer NPN transistor driver |

**Buzzer driver (recommended):**

- Use an NPN (2N2222/2N3904):
  - D4 → 1kΩ → transistor base
  - emitter → GND
  - collector → buzzer “-”
  - buzzer “+” → 3.3V

(If you use a tiny 3.3V active buzzer that draws very little current, it may work directly from the GPIO, but the transistor is safer.)

## 2) NodeMCU firmware (SCAN command + UID over Serial)

Flash this Arduino sketch:

- [hardware/nodemcu-rc522/rc522_serial_uid.ino](../hardware/nodemcu-rc522/rc522_serial_uid.ino)

### Arduino IDE setup

1. Install **ESP8266** boards package.
2. Install library: **MFRC522** (by Miguel Balboa).
3. Select board: _NodeMCU 1.0 (ESP-12E Module)_.
4. Select correct COM port.
5. Upload.

Expected Serial Monitor output (115200):

- `READY`
- When a scan is triggered: `SCANNING`
- On success: `RFID:DEADBEEF...`
- On failure: `ERR:TIMEOUT`

The web app triggers scans by sending `SCAN` to the device and waiting for either `RFID:<uid>` or `ERR:TIMEOUT`.

## 3) Web app scanning (Doctor + Admin)

RFID scanning is implemented using a USB serial workflow:

- Device: NodeMCU connected to laptop via USB
- Browser: Chrome or Edge

### Doctor flow

Open the **Patient Medical Records Access** screen and press the scan icon next to the RFID input.

### Admin flow

RFID scanning is available in:

- Admin user creation/edit (patient role)
- Approving patient registration requests (assign RFID)

### Browser requirements

- Must be served on **https** or **localhost**.
- Web Serial works only on Chromium browsers.

If Web Serial isn’t supported, the UI will show an error (or fall back to the existing remote scanner flow where present).

### Connection behavior (no re-prompt every scan)

- The first time you click **Scan**, the browser asks you to pick the NodeMCU serial port.
- After that, the app **keeps the port open** and reuses it for the next scans.
- If you unplug the device or refresh the page, you’ll be asked to select the port again.

## 4) Operational notes / best practices

- **Security:** UID is an identifier, not a secret. For higher security later, consider pairing UID with a server-issued random token stored on a secure card, or using authenticated NFC.
- **Uniqueness:** The backend already enforces RFID uniqueness on approval.
- **Format:** The UI stores UIDs as uppercase hex with no spaces.
