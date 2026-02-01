export class HttpError extends Error {
  status: number;
  bodyText: string;

  constructor(message: string, status: number, bodyText: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.bodyText = bodyText;
  }
}

async function readBodyOnce(resp: Response): Promise<string> {
  // Always consume exactly once.
  return await resp.text();
}

export async function fetchOk(
  url: string,
  init: RequestInit,
  expectedStatus = 200,
): Promise<Response> {
  const resp = await fetch(url, init);
  if (resp.status !== expectedStatus) {
    const bodyText = await readBodyOnce(resp);
    throw new HttpError(
      `Expected ${expectedStatus}, got ${resp.status} for ${init.method ?? "GET"} ${url}`,
      resp.status,
      bodyText,
    );
  }
  return resp;
}

export async function fetchJson(
  url: string,
  init: RequestInit,
  expectedStatus = 200,
): Promise<unknown> {
  const resp = await fetchOk(url, init, expectedStatus);
  const raw = await readBodyOnce(resp);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new Error(`Failed to parse JSON. Body: ${raw}`);
  }
}

export async function fetchDiscard(
  url: string,
  init: RequestInit,
  expectedStatus = 200,
): Promise<void> {
  const resp = await fetch(url, init);
  if (resp.status !== expectedStatus) {
    const bodyText = await readBodyOnce(resp);
    throw new HttpError(
      `Expected ${expectedStatus}, got ${resp.status} for ${init.method ?? "GET"} ${url}`,
      resp.status,
      bodyText,
    );
  }
  try {
    await resp.body?.cancel();
  } catch {
    // Ignore if already consumed/locked.
  }
}

export async function fetchErrorJson(
  url: string,
  init: RequestInit,
  expectedStatus: number,
): Promise<unknown> {
  const resp = await fetchOk(url, init, expectedStatus);
  const raw = await readBodyOnce(resp);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new Error(`Failed to parse JSON. Body: ${raw}`);
  }
}
