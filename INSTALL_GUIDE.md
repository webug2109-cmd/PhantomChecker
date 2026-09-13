# 👻 PhantomChecker v3.8 — Complete Installation, Keygen & User Manual

Welcome to **PhantomChecker v3.8**, the staff-grade IMAP verification, asset intelligence extraction, and mass relay platform.

---

## 📋 System Requirements

| Component | Minimum Requirement | Recommended |
| :--- | :--- | :--- |
| **Node.js** | v18.0.0+ | v20 LTS or v22 |
| **npm** | v9.0.0+ | v10+ |
| **Operating System** | Windows 10/11 (x64), Linux (Ubuntu, Debian, Kali, Fedora, Arch), macOS 12+ | Windows 11 or Linux Kali/Ubuntu |
| **RAM** | 2 GB free | 4 GB+ |
| **Network** | Direct broadband or HTTP/SOCKS4/SOCKS5 proxies | SOCKS5 residential rotating pool |

---

## 🔑 License Activation & Keygen Guide

PhantomChecker features machine-locked hardware cryptographic licensing (HMAC-SHA256).

### 1. Pre-Activated Key for This Device
Your local machine identifier and matching master license key are already calculated:
- **Machine ID**: `6e9387735fe4d24825555eae745185604fc112a59fa3a3943ab763c39ed1727e`
- **Lifetime License Key**: `PHANTOM-D010D36D-B8A92128-79A4C216-E14BD06E`

### 2. Generating Keys for Customers or Other Computers
When PhantomChecker is opened on any target computer, the initial screen displays the computer's unique 64-character **Machine ID**.

Use the included offline Keygen tools to generate activation keys:

#### Option A: Standalone Windows Binary (No Node.js Required)
```cmd
cd dist-keygen
phantom-keygen.exe --id <PASTE_CUSTOMER_MACHINE_ID>
```

#### Option B: Standalone Linux Binary (No Node.js Required)
```bash
chmod +x dist-keygen/phantom-keygen-linux
./dist-keygen/phantom-keygen-linux --id <PASTE_CUSTOMER_MACHINE_ID>
```

#### Option C: Cross-Platform Node.js Keygen CLI
```bash
node keygen/keygen.cjs --id <PASTE_CUSTOMER_MACHINE_ID>
```

**Batch Mode Example:**
```bash
# Generate keys for an entire list of machine IDs in a text file
node keygen/keygen.cjs --batch machine_ids.txt --out customer_keys.txt
```

---

## 🚀 Step-by-Step Installation & Running

### Step 1: Extract the Archive
Extract `PhantomChecker-v3.8-Distribution.zip` to your chosen workspace:
- **Windows**: Right-click `.zip` -> Extract All to `C:\PhantomChecker`
- **Linux / Kali**:
  ```bash
  unzip -q PhantomChecker-v3.8-Distribution.zip -d ~/PhantomChecker
  cd ~/PhantomChecker
  ```

### Step 2: Install Node Dependencies
Open your shell/command prompt inside the folder:
```bash
npm install
```
*(All necessary modules including `imapflow`, `mailparser`, `dompurify`, `nodemailer`, and `socks` will install automatically).*

### Step 3: Run the Application

#### Mode 1: Desktop Application (Recommended)
Launch PhantomChecker as a native desktop application with full hardware acceleration:
```bash
npm run electron:dev
```

#### Mode 2: Web Studio Mode (Browser Interface)
Launch PhantomChecker via the Vite development server:
```bash
npm run dev
```
Open your web browser and go to:
👉 **`http://localhost:5173`**

### Step 4: Activating Your License
1. Launch PhantomChecker.
2. The **License Gate** modal will appear showing your Hardware Machine ID.
3. Paste your license key:
   `PHANTOM-D010D36D-B8A92128-79A4C216-E14BD06E`
4. Click **Activate License**. Activation is saved permanently to local storage.

---

## 🛠️ How to Use PhantomChecker Features

### 1. Checker Studio (Batch Combo Verification)
- **Import Combos**: Click **Load Combos** (.txt, .csv) with `email:pass` format.
- **Configure Targets & Keywords**:
  - Add search keywords in the Target Keywords panel (e.g. `bestbuy`, `amazon`, `walmart`, `steam`, `crypto`, `interac`).
  - Brand roots and domains are token-matched across subject, sender, and email bodies.
- **Start Check**: Click **Start Checker**.
- **Metrics**: Real-time CPM, CPS, Hits, and Errors are rendered on the live telemetry HUD.

### 2. Multi-Format Data Export
In the Metrics & Exporter Panel, select your format and click **Export Hits**:
- **Format: email:pass**: Standard credential dump.
- **Format: email:pass:host:port**: Full server endpoint dump.
- **Format: CSV (Standard)**: Comma-separated values for spreadsheets.
- **Format: CSV + Assets & Balances**: Detailed export including currency balances, tracking numbers, gaming accounts, order IDs, and membership tiers.
- **Format: JSON (Pretty)**: Full nested JSON objects.
- **Format: JSONL (Streaming Lines)**: NDJSON format for high-scale pipeline processing.
- **Format: SQL Inserts (SQLite / PostgreSQL)**: Dual-engine compatible `ON CONFLICT (email) DO UPDATE` statements ready to pipe directly into your relational database.

### 3. Proxy Management Tab
- **Import**: Paste proxies (`host:port` or `host:port:user:pass` or `protocol://user:pass@host:port`).
- **Rotation Modes**: Direct Connection, Round-Robin Sequential, or Random Selection.
- **Health Tester**: Click **Test Proxies** to benchmark SSL handshake latency concurrently.
- **Sort by Speed**: Re-orders proxy pool with lowest millisecond latency first.
- **Prune Slow (>1.5s)**: Eliminates dead sockets and sluggish proxies with one click.

### 4. Mail Viewer & Asset Intelligence Tab
- Select any hit from the left account column to load its live mailbox.
- **Asset Intelligence Badges**:
  - 💰 **Balances**: Automatically captures USD, CAD, EUR, GBP, and Crypto balances.
  - 🎮 **Gaming Assets**: Detects Ubisoft / Rainbow Six, Steam, PlayStation, Xbox, Epic Games, Riot, Battle.net.
  - 📦 **Shipping Tracking**: Carrier detection for UPS, FedEx, Canada Post / USPS, and DHL.
  - 🧾 **Order Numbers**: E-commerce order IDs.
  - 👑 **Memberships**: VIP, Prime, Platinum, Gold, Elite, and loyalty statuses.
- **HTML Security Sandbox**:
  - **DOMPurify Sanitization**: Zero remote script execution or base URL hijacking.
  - **Trackers Blocked Toggle**: Auto-neutralizes remote `<img>` tracking beacons and external CSS triggers.
  - **Links Inspector**: Click **Links (N)** to preview and copy all decoded URLs without triggering click-trackers.

### 5. Mail Reply, Forward & Mass Webhook Relay
- **Reply / Forward**: Open any email, click **Reply** or **Forward** to send threaded responses (`Re:`, `In-Reply-To`, `References`) with localized IMAP Sent folder appending.
- **Mass Forward Without SMTP (Webhook Relay)**:
  1. Check multiple emails or click **Select All Hits**.
  2. Click **Mass Forward**.
  3. Select **Webhook Relay (No SMTP)**.
  4. Paste your Discord Webhook, Telegram forwarder, or custom REST endpoint.
  5. Click **Dispatch to Webhook** — the emails are relayed as structured JSON payloads without requiring local SMTP credentials.

---

## 🏗️ Building Standalone Windows Executable (.exe)

If you want to package PhantomChecker as a standalone Windows installer:
```bash
npm run electron:build
```
The compiled setup and portable `.exe` will be generated in `dist-electron/`.

---
*PhantomChecker v3.8 — Engineered for Maximum Throughput, Security, and Reliability.*
