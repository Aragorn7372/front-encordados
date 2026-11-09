import fs from 'node:fs';
import { test as teardown } from '@playwright/test';
import { Api } from './soporte/api';
import { FICHERO_TORNEO, torneoPruebas } from './soporte/usuarios';

/** Después de todos los tests (pasen o fallen): se borra el torneo de esta ejecución. */
teardown('borrar el torneo de pruebas', async ({ request }) => {
  if (!fs.existsSync(FICHERO_TORNEO)) return;
  // Borrar torneos es solo del administrador (el owner recibe 403, igual que en la app)
  const admin = await Api.como(request, 'admin');
  await admin.borrarTorneo(torneoPruebas().id);
  fs.rmSync(FICHERO_TORNEO);
});
