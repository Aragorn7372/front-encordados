import fs from 'node:fs';
import { Download, expect } from '@playwright/test';

/**
 * Un .xlsx es un zip: empieza por «PK». Basta para saber que el Excel ha llegado entero y no es,
 * por ejemplo, una página de error HTML con otro nombre.
 */
export async function esperarExcel(descarga: Download, patron: RegExp) {
  expect(descarga.suggestedFilename()).toMatch(patron);
  const bytes = fs.readFileSync(await descarga.path());
  expect(bytes.length).toBeGreaterThan(100);
  expect(bytes.subarray(0, 2).toString()).toBe('PK');
}
