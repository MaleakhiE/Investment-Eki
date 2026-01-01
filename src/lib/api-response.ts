export type ResponseStatus = 'SUCCESS' | 'ERROR';

export interface APIResponse<T = unknown> {
  responseCode: number;
  responseStatus: ResponseStatus;
  responseMessage: string;
  responseDetails: T | null;
}

export function responseAPI<T = unknown>(
  code: number,
  status: ResponseStatus,
  message: string,
  data: T | null = null
): APIResponse<T> {
  return {
    responseCode: code,
    responseStatus: status,
    responseMessage: message,
    responseDetails: data,
  };
}

// Convenience functions for common responses
export function successResponse<T>(
  data: T,
  message: string = 'Operation successful',
  code: number = 200
): APIResponse<T> {
  return responseAPI(code, 'SUCCESS', message, data);
}

export function errorResponse(
  message: string,
  code: number = 400,
  details: unknown = null
): APIResponse<unknown> {
  return responseAPI(code, 'ERROR', message, details);
}

export function validationErrorResponse(
  errors: string[],
  message: string = 'Validation failed'
): APIResponse<{ errors: string[] }> {
  return responseAPI(400, 'ERROR', message, { errors });
}

export function unauthorizedResponse(
  message: string = 'Unauthorized'
): APIResponse<null> {
  return responseAPI(401, 'ERROR', message, null);
}

export function notFoundResponse(
  message: string = 'Resource not found'
): APIResponse<null> {
  return responseAPI(404, 'ERROR', message, null);
}

export function serverErrorResponse(
  message: string = 'Internal server error'
): APIResponse<null> {
  return responseAPI(500, 'ERROR', message, null);
}
