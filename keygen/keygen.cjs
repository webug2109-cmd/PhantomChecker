#!/usr/bin/env node
/**
 * Phantom Checker — Machine-Locked License Keygen CLI
 * CommonJS format for clean standalone compilation with pkg.
 *
 * Usage:
 *   phantom-keygen.exe
 *   phantom-keygen.exe --id <machine-id>
 *   phantom-keygen.exe --id <machine-id> --label "Customer Name" --out keys.txt
 *   phantom-keygen.exe --id <machine-id> --count 1
 */

const crypto = require('crypto');
const os = require('os');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ─── Must match electron/license.js exactly ──────────────────────────────────
const _S = ['Ph4nt0m', 'Ch3ck3r', 'K3yS3cr3t', '2026!XZ'];
const MASTER_SECRET = _S.join('::');
const PREFIX = 'PHANTOM';
const SEGMENT_LEN = 8;
const NUM_SEGMENTS = 4;
const TOTAL_HEX = SEGMENT_LEN * NUM_SEGMENTS;

function generateKey(machineId) {
  if (typeof machineId !== 'string' || !/^[0-9a-fA-F]{64}$/.test(machineId.trim())) {
    throw new Error('Machine ID must contain exactly 64 hexadecimal characters');
  }
  const hmac = crypto.createHmac('sha256', MASTER_SECRET);
  hmac.update(machineId.toLowerCase().trim());
  const full = hmac.digest('hex').toUpperCase();
  const keyBody = full.slice(0, TOTAL_HEX);
  const segments = [];
  for (let i = 0; i < NUM_SEGMENTS; i++) {
    segments.push(keyBody.slice(i * SEGMENT_LEN, (i + 1) * SEGMENT_LEN));
  }
  return `${PREFIX}-${segments.join('-')}`;
}

// ─── CLI Argument Parser ─────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--id') args.id = argv[++i];
    else if (argv[i] === '--label') args.label = argv[++i];
    else if (argv[i] === '--out') args.out = argv[++i];
    else if (argv[i] === '--count') args.count = parseInt(argv[++i], 10) || 1;
    else if (argv[i] === '--help' || argv[i] === '-h') args.help = true;
    else if (argv[i] === '--batch') args.batch = argv[++i]; // path to txt file of machine IDs
  }
  return args;
}

// ─── Pretty Print ─────────────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[96m',
  green: '\x1b[92m',
  purple: '\x1b[95m',
  red: '\x1b[91m',
  yellow: '\x1b[93m',
  white: '\x1b[97m',
  gray: '\x1b[90m',
};

function banner() {
  console.log('');
  console.log(`${C.purple}${C.bold}  ██████╗ ██╗  ██╗ █████╗ ███╗   ██╗████████╗ ██████╗ ███╗   ███╗${C.reset}`);
  console.log(`${C.purple}${C.bold}  ██╔══██╗██║  ██║██╔══██╗████╗  ██║╚══██╔══╝██╔═══██╗████╗ ████║${C.reset}`);
  console.log(`${C.cyan}${C.bold}  ██████╔╝███████║███████║██╔██╗ ██║   ██║   ██║   ██║██╔████╔██║${C.reset}`);
  console.log(`${C.cyan}  ██╔═══╝ ██╔══██║██╔══██║██║╚██╗██║   ██║   ██║   ██║██║╚██╔╝██║${C.reset}`);
  console.log(`${C.white}  ██║     ██║  ██║██║  ██║██║ ╚████║   ██║   ╚██████╔╝██║ ╚═╝ ██║${C.reset}`);
  console.log(`${C.white}  ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝   ╚═╝    ╚═════╝ ╚═╝     ╚═╝${C.reset}`);
  console.log('');
  console.log(`${C.gray}  ─────────────────────────────────────────────────────────────────${C.reset}`);
  console.log(`${C.white}${C.bold}  MACHINE-LOCKED LICENSE KEYGEN${C.reset}  ${C.gray}// Phantom Checker v1.0${C.reset}`);
  console.log(`${C.gray}  ─────────────────────────────────────────────────────────────────${C.reset}`);
  console.log('');
}

function printHelp() {
  console.log(`${C.cyan}Usage:${C.reset}`);
  console.log(`  phantom-keygen ${C.gray}[options]${C.reset}`);
  console.log('');
  console.log(`${C.cyan}Options:${C.reset}`);
  console.log(`  ${C.green}--id <machine-id>${C.reset}      Machine ID from the Phantom Checker app`);
  console.log(`  ${C.green}--label <name>${C.reset}         Customer/label name for record keeping`);
  console.log(`  ${C.green}--out <file.txt>${C.reset}       Write generated key(s) to a file`);
  console.log(`  ${C.green}--batch <ids.txt>${C.reset}      Generate keys for multiple IDs from file (one per line)`);
  console.log(`  ${C.green}--help${C.reset}                 Show this help`);
  console.log('');
  console.log(`${C.cyan}Examples:${C.reset}`);
  console.log(`  phantom-keygen --id abc123def456...`);
  console.log(`  phantom-keygen --id abc123... --label "John Doe" --out john_doe.txt`);
  console.log(`  phantom-keygen --batch machine_ids.txt --out all_keys.txt`);
  console.log('');
}

function generateAndPrint(machineId, label) {
  const key = generateKey(machineId);
  const mid = machineId.slice(0, 16) + '...' + machineId.slice(-8);
  console.log(`  ${C.gray}Machine ID :${C.reset} ${C.cyan}${mid}${C.reset}`);
  if (label) console.log(`  ${C.gray}Label      :${C.reset} ${C.white}${label}${C.reset}`);
  console.log(`  ${C.gray}License Key:${C.reset} ${C.green}${C.bold}${key}${C.reset}`);
  console.log('');
  return key;
}

// ─── Interactive Mode ─────────────────────────────────────────────────────────
async function interactiveMode() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise(res => rl.question(q, res));

  console.log(`${C.yellow}  → Interactive Mode${C.reset}`);
  console.log('');

  const machineId = (await ask(`  ${C.white}Enter Machine ID:${C.reset} `)).trim();
  if (!machineId || machineId.length < 16) {
    console.log(`\n  ${C.red}Invalid Machine ID.${C.reset}\n`);
    rl.close(); process.exit(1);
  }

  const label = (await ask(`  ${C.white}Customer label (optional, press Enter to skip):${C.reset} `)).trim();
  const outFile = (await ask(`  ${C.white}Output file (optional, press Enter to skip):${C.reset} `)).trim();

  console.log('');
  console.log(`${C.gray}  ─── Generated Key ────────────────────────────────────────────────${C.reset}`);
  const key = generateAndPrint(machineId, label);

  if (outFile) {
    const line = label
      ? `Label: ${label}\nMachine ID: ${machineId}\nLicense Key: ${key}\n---\n`
      : `Machine ID: ${machineId}\nLicense Key: ${key}\n---\n`;
    fs.appendFileSync(outFile, line, 'utf8');
    console.log(`  ${C.green}✓${C.reset} Key saved to ${C.cyan}${outFile}${C.reset}`);
  }

  rl.close();
}

// ─── Entry Point ──────────────────────────────────────────────────────────────
async function main() {
  banner();

  const args = parseArgs(process.argv.slice(2));

  if (args.help) { printHelp(); process.exit(0); }

  // ── Batch mode: read multiple IDs from file ──
  if (args.batch) {
    if (!fs.existsSync(args.batch)) {
      console.log(`  ${C.red}Error: File not found: ${args.batch}${C.reset}\n`); process.exit(1);
    }
    const lines = fs.readFileSync(args.batch, 'utf8').split(/\r?\n/).filter(l => l.trim());
    const outputLines = [];
    console.log(`${C.yellow}  → Batch Mode — ${lines.length} machine IDs${C.reset}\n`);
    console.log(`${C.gray}  ─── Generated Keys ───────────────────────────────────────────────${C.reset}`);

    for (const line of lines) {
      const [id, label] = line.split('|').map(s => s.trim());
      if (!id) continue;
      const key = generateAndPrint(id, label);
      outputLines.push(label
        ? `Label: ${label}\nMachine ID: ${id}\nLicense Key: ${key}\n---`
        : `Machine ID: ${id}\nLicense Key: ${key}\n---`
      );
    }

    if (args.out) {
      fs.writeFileSync(args.out, outputLines.join('\n') + '\n', 'utf8');
      console.log(`  ${C.green}✓${C.reset} ${lines.length} key(s) saved to ${C.cyan}${args.out}${C.reset}\n`);
    }
    return;
  }

  // ── Single key mode with --id flag ──
  if (args.id) {
    const machineId = args.id.trim();
    console.log(`${C.yellow}  → Single Key Mode${C.reset}\n`);
    console.log(`${C.gray}  ─── Generated Key ────────────────────────────────────────────────${C.reset}`);
    const key = generateAndPrint(machineId, args.label);

    if (args.out) {
      const line = args.label
        ? `Label: ${args.label}\nMachine ID: ${machineId}\nLicense Key: ${key}\n---\n`
        : `Machine ID: ${machineId}\nLicense Key: ${key}\n---\n`;
      fs.appendFileSync(args.out, line, 'utf8');
      console.log(`  ${C.green}✓${C.reset} Key saved to ${C.cyan}${args.out}${C.reset}\n`);
    }
    return;
  }

  // ── No flags: drop into interactive mode ──
  await interactiveMode();
}

main().catch(err => {
  console.error(`\n  ${C.red}Fatal error: ${err.message}${C.reset}\n`);
  process.exit(1);
});
