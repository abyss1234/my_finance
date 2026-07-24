import { scrypt, timingSafeEqual } from 'node:crypto';

const scryptCost = 2 ** 15;
const scryptBlockSize = 8;
const scryptParallelization = 3;
const saltBytes = 16;
const hashBytes = 64;
const maxMemory = 64 * 1024 * 1024;

type PasswordHash = {
  salt: Buffer;
  hash: Buffer;
};

function isHex(value: string, bytes: number) {
  return value.length === bytes * 2 && /^[0-9a-f]+$/i.test(value);
}

function parsePasswordHash(value: string | undefined): PasswordHash | null {
  if (!value) return null;

  const [algorithm, version, cost, blockSize, parallelization, salt, hash] = value.split(':');
  if (
    algorithm !== 'scrypt' ||
    version !== 'v1' ||
    cost !== String(scryptCost) ||
    blockSize !== String(scryptBlockSize) ||
    parallelization !== String(scryptParallelization) ||
    !isHex(salt, saltBytes) ||
    !isHex(hash, hashBytes)
  ) {
    return null;
  }

  return {
    salt: Buffer.from(salt, 'hex'),
    hash: Buffer.from(hash, 'hex'),
  };
}

function deriveKey(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
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

        resolve(derivedKey);
      }
    );
  });
}

export function isSupportedPasswordHash(value: string | undefined): value is string {
  return parsePasswordHash(value) !== null;
}

export async function verifyPassword(password: string, encodedHash: string) {
  const parsed = parsePasswordHash(encodedHash);
  if (!parsed) return false;

  const actualHash = await deriveKey(password, parsed.salt);
  return timingSafeEqual(actualHash, parsed.hash);
}
