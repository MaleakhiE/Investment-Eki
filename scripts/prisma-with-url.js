#!/usr/bin/env node
/**
 * Wrapper script that sets DATABASE_URL from individual env vars
 * and then runs prisma commands
 * 
 * Usage: node scripts/prisma-with-url.js migrate dev
 *        node scripts/prisma-with-url.js db seed
 */

const { spawn } = require('child_process');
const path = require('path');

// Load .env file manually
const fs = require('fs');
const envPath = path.join(__dirname, '..', '.env');

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)="?([^"]*)"?$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2];
    }
  });
}

// Build DATABASE_URL if not set
if (!process.env.DATABASE_URL) {
  const type = process.env.DATABASE_TYPE || 'mysql';
  const username = process.env.DATABASE_USERNAME;
  const password = process.env.DATABASE_PASSWORD;
  const host = process.env.DATABASE_HOST || 'localhost';
  const port = process.env.DATABASE_PORT || '3306';
  const name = process.env.DATABASE_NAME;

  if (username && password && name) {
    process.env.DATABASE_URL = `${type}://${username}:${password}@${host}:${port}/${name}`;
    console.log(`DATABASE_URL set to: ${type}://${username}:****@${host}:${port}/${name}`);
  } else {
    console.error('Missing database configuration');
    process.exit(1);
  }
}

// Run prisma with the remaining arguments
const args = process.argv.slice(2);
const prisma = spawn('npx', ['prisma', ...args], {
  stdio: 'inherit',
  env: process.env,
  shell: true
});

prisma.on('close', (code) => {
  process.exit(code);
});
