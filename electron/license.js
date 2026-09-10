/**
 * Phantom Checker — License Core
 * Machine-locked HMAC-SHA256 license system.
 * This module is shared between electron/main.js and the keygen CLI.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';

// ─── Master Secret ────────────────────────────────────────────────────────────
// Split into segments so simple string search won't find it in the binary.
const _S = ['Ph4nt0m', 'Ch3ck3r', 'K3yS3cr3t', '2026!XZ'];
const MASTER_SECRET = _S.join('::');

// ─── Key Format ───────────────────────────────────────────────────────────────
// PHANTOM-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX  (32 uppercase hex chars)
const PREFIX = 'PHANTOM';
const SEGMENT_LEN = 8;
const NUM_SEGMENTS = 4;
const TOTAL_HEX = SEGMENT_LEN * NUM_SEGMENTS; // 32

// ─── Machine ID ───────────────────────────────────────────────────────────────
/**
 * Returns a stable hardware fingerprint for this machine.
 * Uses: CPU model + hostname + platform + network MAC addresses.
 * Falls back gracefully on any OS without requiring native modules.
 */
export function getMachineId() {
  try {
    const ifaces = os.networkInterfaces();
    const macs = [];
    for (const name of Object.keys(ifaces)) {
      for (const iface of ifaces[name]) {
        if (!iface.internal && iface.mac && iface.mac !== '00:00:00:00:00:00') {
          macs.push(iface.mac);
        }
      }
    }
    macs.sort();

    const cpus = os.cpus();
    const cpuModel = cpus.length > 0 ? cpus[0].model : 'unknown-cpu';
    const hostname = os.hostname();
    const platform = os.platform();

    const raw = [hostname, platform, cpuModel, ...macs].join('|');
    return crypto.createHash('sha256').update(raw).digest('hex');
  } catch {
    // Absolute fallback — hostname only
    return crypto.createHash('sha256').update(os.hostname()).digest('hex');
  }
}

// ─── Key Generation ───────────────────────────────────────────────────────────
/**
 * Generate a valid machine-locked license key for the given machine ID.
 * @param {string} machineId - 64-char hex string from getMachineId()
 * @returns {string} PHANTOM-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX
 */
export function generateKey(machineId) {
  const hmac = crypto.createHmac('sha256', MASTER_SECRET);
  hmac.update(machineId.toLowerCase());
  const full = hmac.digest('hex').toUpperCase();
  const keyBody = full.slice(0, TOTAL_HEX);
  const segments = [];
  for (let i = 0; i < NUM_SEGMENTS; i++) {
    segments.push(keyBody.slice(i * SEGMENT_LEN, (i + 1) * SEGMENT_LEN));
  }
  return `${PREFIX}-${segments.join('-')}`;
}

// ─── Key Validation ───────────────────────────────────────────────────────────
/**
 * Validate a license key against the current machine's hardware ID.
 * @param {string} key - The license key to validate
 * @returns {{ valid: boolean, reason: string }}
 */
export function validateKey(key) {
  if (!key || typeof key !== 'string') {
    return { valid: false, reason: 'No license key provided.' };
  }

  const cleaned = key.trim().toUpperCase();

  // Format check
  const pattern = new RegExp(`^${PREFIX}(-[0-9A-F]{${SEGMENT_LEN}}){${NUM_SEGMENTS}}$`);
  if (!pattern.test(cleaned)) {
    return { valid: false, reason: 'Invalid key format. Expected: PHANTOM-XXXX-XXXX-XXXX-XXXX' };
  }

  // Machine-lock check
  const machineId = getMachineId();
  const expected = generateKey(machineId);

  if (cleaned !== expected) {
    return { valid: false, reason: 'This license key is not valid for this machine.' };
  }

  return { valid: true, reason: 'License valid.' };
}

// ─── Persistence ─────────────────────────────────────────────────────────────
function getLicensePath() {
  const appData = process.env.APPDATA || path.join(os.homedir(), '.config');
  const dir = path.join(appData, 'phantom-checker');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'license.dat');
}

/**
 * Save a validated license key to disk.
 * @param {string} key
 */
export function saveLicense(key) {
  fs.writeFileSync(getLicensePath(), key.trim(), 'utf8');
}

/**
 * Load the saved license key from disk.
 * @returns {string|null}
 */
export function loadLicense() {
  try {
    const p = getLicensePath();
    if (!fs.existsSync(p)) return null;
    return fs.readFileSync(p, 'utf8').trim();
  } catch {
    return null;
  }
}

/**
 * Full startup check: load saved key and validate it against this machine.
 * @returns {{ licensed: boolean, key: string|null, reason: string }}
 */
export function checkLicenseOnStartup() {
  const key = loadLicense();
  if (!key) return { licensed: false, key: null, reason: 'No license key found.' };
  const result = validateKey(key);
  return { licensed: result.valid, key, reason: result.reason };
}
