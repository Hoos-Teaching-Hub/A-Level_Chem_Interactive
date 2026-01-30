import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { badRequest, CORS_HEADERS } from './errors.ts';

export { z };

// Helper type so callers can return either validated data or a Response.
export type ValidationResult<T> =
  | { data: T; response?: never }
  | { data?: never; response: Response };

export async function validateJson<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<ValidationResult<T>> {
  // JSON parsing errors are surfaced as structured 400 responses.
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    return {
      response: badRequest('Invalid JSON body.', {
        message: error instanceof Error ? error.message : 'Invalid JSON body.',
      }),
    };
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      response: badRequest('Validation failed.', {
        issues: parsed.error.issues,
      }),
    };
  }

  return { data: parsed.data };
}

export function validateQuery<T>(
  request: Request,
  schema: z.ZodType<T>,
): ValidationResult<T> {
  // Convert URLSearchParams into a plain object before schema validation.
  const url = new URL(request.url);
  const query = Object.fromEntries(url.searchParams.entries());
  const parsed = schema.safeParse(query);

  if (!parsed.success) {
    return {
      response: badRequest('Validation failed.', {
        issues: parsed.error.issues,
      }),
    };
  }

  return { data: parsed.data };
}

export function getBearerToken(request: Request): string | null {
  // Expect `Authorization: Bearer <token>` format.
  const header = request.headers.get('authorization');
  if (!header) {
    return null;
  }
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

export function handlePreflight(request: Request): Response | null {
  // Respond to OPTIONS requests with CORS headers so browsers can proceed.
  if (request.method !== 'OPTIONS') {
    return null;
  }
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
