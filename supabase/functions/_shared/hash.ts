const encoder = new TextEncoder();

function getServerSalt(): string {
  const salt = Deno.env.get('SERVER_SALT');
  if (!salt) {
    throw new Error('SERVER_SALT is required.');
  }
  return salt;
}

export async function sha256Hex(input: string): Promise<string> {
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashCode(code: string, classCode: string): Promise<string> {
  const salt = getServerSalt();
  return sha256Hex(`${code}:${classCode}:${salt}`);
}

export async function hashToken(token: string): Promise<string> {
  const salt = getServerSalt();
  return sha256Hex(`${token}:${salt}`);
}

export function generateSessionToken(bytes = 32): string {
  const buffer = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(buffer)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
