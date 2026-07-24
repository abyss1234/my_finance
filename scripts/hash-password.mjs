import { randomBytes, scrypt } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const scryptCost = 2 ** 15;
const scryptBlockSize = 8;
const scryptParallelization = 3;
const saltBytes = 16;
const hashBytes = 64;
const maxMemory = 64 * 1024 * 1024;

function deriveKey(password, salt) {
  return new Promise((resolvePromise, reject) => {
    scrypt(
      password,
      salt,
      hashBytes,
      {
        N: scryptCost,
        r: scryptBlockSize,
        p: scryptParallelization,
        maxmem: maxMemory,
      },
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }

        resolvePromise(derivedKey);
      }
    );
  });
}

function readHidden(prompt) {
  return new Promise((resolvePromise, reject) => {
    if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
      reject(new Error('Set PASSWORD_TO_HASH when running without an interactive terminal.'));
      return;
    }

    let password = '';
    const previousRawMode = process.stdin.isRaw;
    process.stdout.write(prompt);
    process.stdin.setRawMode(true);
    process.stdin.setEncoding('utf8');
    process.stdin.resume();

    function finish() {
      process.stdin.off('data', onData);
      process.stdin.setRawMode(previousRawMode);
      process.stdin.pause();
      process.stdout.write('\n');
    }

    function onData(input) {
      for (const character of input) {
        if (character === '\u0003') {
          finish();
          reject(new Error('Cancelled.'));
          return;
        }

        if (character === '\r' || character === '\n') {
          finish();
          resolvePromise(password);
          return;
        }

        if (character === '\u0008' || character === '\u007f') {
          password = password.slice(0, -1);
          continue;
        }

        if (character >= ' ') {
          password += character;
        }
      }
    }

    process.stdin.on('data', onData);
  });
}

async function getPassword() {
  const environmentPassword = process.env.PASSWORD_TO_HASH || process.env.APP_PASSWORD;
  if (environmentPassword) return environmentPassword;

  const password = await readHidden('New password: ');
  const confirmation = await readHidden('Confirm password: ');

  if (password !== confirmation) {
    throw new Error('Passwords do not match.');
  }

  return password;
}

async function updateEnvironmentFile(hash) {
  const environmentPath = resolve(process.cwd(), '.env');
  const source = await readFile(environmentPath, 'utf8');
  const hashLine = `APP_PASSWORD_HASH="${hash}"`;
  let updated = source;

  if (/^APP_PASSWORD_HASH=.*$/m.test(updated)) {
    updated = updated.replace(/^APP_PASSWORD_HASH=.*$/m, hashLine);
  } else if (/^APP_PASSWORD=.*$/m.test(updated)) {
    updated = updated.replace(/^APP_PASSWORD=.*$/m, hashLine);
  } else {
    const newline = updated.includes('\r\n') ? '\r\n' : '\n';
    updated = `${updated.trimEnd()}${newline}${hashLine}${newline}`;
  }

  updated = updated.replace(/^APP_PASSWORD=.*(?:\r?\n)?/m, '');
  await writeFile(environmentPath, updated, 'utf8');
}

async function main() {
  const password = await getPassword();
  if (!password) throw new Error('Password cannot be empty.');

  const salt = randomBytes(saltBytes);
  const hash = await deriveKey(password, salt);
  const encodedHash = [
    'scrypt',
    'v1',
    scryptCost,
    scryptBlockSize,
    scryptParallelization,
    salt.toString('hex'),
    hash.toString('hex'),
  ].join(':');

  if (process.argv.includes('--update-env')) {
    await updateEnvironmentFile(encodedHash);
    console.log('Updated .env: APP_PASSWORD was replaced with APP_PASSWORD_HASH.');
    return;
  }

  console.log(`APP_PASSWORD_HASH="${encodedHash}"`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Unable to hash password.');
  process.exitCode = 1;
});
