export function successResponse<T>(data: T) {
  return { success: true, data };
}

export function errorResponse(message: string, code = 'INTERNAL_ERROR') {
  return { success: false, message, code };
}
