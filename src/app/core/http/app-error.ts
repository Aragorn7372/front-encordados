import { HttpErrorResponse } from '@angular/common/http';

export interface AppError {
  status: number;
  message: string;
  fieldErrors: Record<string, string[]>;
}

export function toAppError(err: HttpErrorResponse): AppError {
  const body = err.error;
  const fieldErrors: Record<string, string[]> = {};
  let message = 'Ha ocurrido un error inesperado';

  if (err.status === 0) message = 'Sin conexión con el servidor';
  else if (err.status === 429) message = 'Demasiadas peticiones, espera unos segundos';
  else if (Array.isArray(body)) {
    // FluentValidation: [{propertyName, errorMessage}]
    for (const e of body) (fieldErrors[e.propertyName] ??= []).push(e.errorMessage);
    message = body[0]?.errorMessage ?? message;
  } else if (body?.errors) {
    // ValidationProblemDetails
    Object.assign(fieldErrors, body.errors);
    message = body.title ?? message;
  } else if (typeof body === 'string' && body.trim()) message = body;
  else message = body?.message ?? body?.error ?? message; // {message} | {error} | GlobalExceptionHandler

  return { status: err.status, message, fieldErrors };
}
