import { FieldTree, TreeValidationResult } from '@angular/forms/signals';
import { AppError } from './app-error';

/**
 * Traduce un AppError a errores de Signal Forms: cada mensaje en su campo si el formulario
 * lo tiene, y si no, un error general del formulario.
 */
export function toFormErrors<T>(error: unknown, form: FieldTree<T>): TreeValidationResult {
  const { message, fieldErrors } = error as AppError;
  const fields = form as unknown as Record<string, FieldTree<unknown> | undefined>;

  const mapped = Object.entries(fieldErrors ?? {}).flatMap(([key, messages]) => {
    const fieldTree = fields[key];
    return fieldTree ? messages.map((m) => ({ kind: 'server', message: m, fieldTree })) : [];
  });

  return mapped.length > 0 ? mapped : { kind: 'server', message };
}
