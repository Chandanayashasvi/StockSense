import type { ErrorRequestHandler } from 'express';
import { errorResponse } from '../utils/response.js';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const message = err instanceof Error ? err.message : 'Unexpected server error';
  const errorCode = (err as any).code;
  const status = errorCode === 'LIMIT_FILE_SIZE'
    ? 413
    : errorCode === 'LIMIT_UNEXPECTED_FILE'
      ? 400
      : typeof (err as any).statusCode === 'number' ? (err as any).statusCode : 500;
  res.status(status).json(errorResponse(message, errorCode ?? 'INTERNAL_ERROR'));
};
