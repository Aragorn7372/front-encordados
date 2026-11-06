/** Las hojas que entiende /api/excel/advanced (parámetro `types`). */
export type ExcelTipo = 'users' | 'materials' | 'cuerdas' | 'tournament' | 'pedidos';

/** ExcelImportResultDto. */
export interface ExcelImportResult {
  usersCreated: number;
  usersUpdated: number;
  materialsCreated: number;
  materialsUpdated: number;
  cuerdasCreated: number;
  cuerdasUpdated: number;
  tournamentsCreated: number;
  tournamentsUpdated: number;
  pedidosCreated: number;
  pedidosUpdated: number;
  pedidosLineasUpdated: number;
  errors: string[];
}

const ETIQUETAS: [keyof ExcelImportResult, string][] = [
  ['usersCreated', 'jugadores creados'],
  ['usersUpdated', 'jugadores actualizados'],
  ['materialsCreated', 'materiales creados'],
  ['materialsUpdated', 'materiales actualizados'],
  ['cuerdasCreated', 'cordajes creados'],
  ['cuerdasUpdated', 'cordajes actualizados'],
  ['tournamentsCreated', 'torneos creados'],
  ['tournamentsUpdated', 'torneos actualizados'],
  ['pedidosCreated', 'pedidos creados'],
  ['pedidosUpdated', 'pedidos actualizados'],
  ['pedidosLineasUpdated', 'líneas de pedido actualizadas'],
];

/** Solo lo que ha cambiado algo: «3 jugadores creados», «1 jugadores actualizados»… */
export function resumenImportacion(result: ExcelImportResult): string[] {
  return ETIQUETAS.flatMap(([clave, etiqueta]) => {
    const n = result[clave] as number | undefined;
    return n ? [`${n} ${etiqueta}`] : [];
  });
}
