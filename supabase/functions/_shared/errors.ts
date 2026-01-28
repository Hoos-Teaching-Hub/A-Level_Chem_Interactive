export const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
};

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-teacher-code-hash',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export const ErrorCode = {
  BAD_REQUEST: 'bad_request',
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
  NOT_FOUND: 'not_found',
  TOO_MANY_REQUESTS: 'too_many_requests',
  INTERNAL_SERVER_ERROR: 'internal_server_error',
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

export function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...JSON_HEADERS,
      ...CORS_HEADERS,
    },
  });
}

export function errorResponse(
  status: number,
  code: ErrorCodeType,
  message: string,
  details?: unknown,
): Response {
  return jsonResponse(
    {
      error: {
        code,
        message,
        details,
      },
    },
    status,
  );
}

export function badRequest(message: string, details?: unknown): Response {
  return errorResponse(400, ErrorCode.BAD_REQUEST, message, details);
}

export function unauthorized(message = 'Unauthorized'): Response {
  return errorResponse(401, ErrorCode.UNAUTHORIZED, message);
}

export function forbidden(message = 'Forbidden'): Response {
  return errorResponse(403, ErrorCode.FORBIDDEN, message);
}

export function notFound(message = 'Not found'): Response {
  return errorResponse(404, ErrorCode.NOT_FOUND, message);
}

export function tooManyRequests(message = 'Too many requests'): Response {
  return errorResponse(429, ErrorCode.TOO_MANY_REQUESTS, message);
}

export function internalServerError(message = 'Internal server error'): Response {
  return errorResponse(500, ErrorCode.INTERNAL_SERVER_ERROR, message);
}
