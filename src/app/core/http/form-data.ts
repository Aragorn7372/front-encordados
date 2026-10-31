type FormValue = string | number | boolean | Blob | null | undefined;

/** Para los endpoints multipart. Omite los valores vacíos: el backend los trata como "sin cambios". */
export function toFormData(values: Record<string, FormValue>): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (value === null || value === undefined || value === '') continue;
    form.append(key, value instanceof Blob ? value : String(value));
  }
  return form;
}
