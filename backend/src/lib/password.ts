// Hash de senha com PBKDF2 via Web Crypto — funciona em Workers e em Node 20+
// (seed roda em Node, login roda no Workers; o formato tem que ser o mesmo).

const ITERATIONS = 100_000;
const enc = new TextEncoder();

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

async function deriveBits(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number
) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    key,
    256
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await deriveBits(password, salt, ITERATIONS);
  return `${toHex(salt)}:${ITERATIONS}:${toHex(hash)}`;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 3) return false;
  const [saltHex, iterStr, expectedHex] = parts;
  const iterations = Number(iterStr);
  if (!Number.isInteger(iterations) || iterations < 1) return false;

  const actual = await deriveBits(password, fromHex(saltHex), iterations);
  const expected = fromHex(expectedHex);
  if (actual.length !== expected.length) return false;

  // Comparação em tempo constante
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}
