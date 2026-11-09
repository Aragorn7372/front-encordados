import fs from 'node:fs';
import path from 'node:path';
import { test as setup } from '@playwright/test';
import { Api, unico } from './soporte/api';
import { FICHERO_TORNEO, Rol, USUARIOS, sesion } from './soporte/usuarios';

/**
 * Antes de los tests:
 * 1. Un torneo propio para esta ejecución, con carlos_encordador de encordador y
 *    supervisor_luis de supervisor.
 * 2. Una sesión por rol, entrando por la API (rápido y sin depender del formulario, que tiene su
 *    propio test). Se guarda como storageState: el token y el torneo activo en el localStorage,
 *    que es donde los deja la app.
 * Es un solo paso: las sesiones necesitan el id del torneo.
 */
setup('torneo de pruebas y sesiones', async ({ request, baseURL }) => {
  const owner = await Api.como(request, 'owner');
  const nombre = unico('Torneo');
  const id = await owner.crearTorneo(nombre);
  await owner.añadirEncordador(id, USUARIOS.encordador.username, 'Máquina e2e');
  await owner.asignarSupervisor(id, USUARIOS.supervisor.username);
  fs.mkdirSync(path.dirname(FICHERO_TORNEO), { recursive: true });
  fs.writeFileSync(FICHERO_TORNEO, JSON.stringify({ id, nombre }));

  for (const rol of Object.keys(USUARIOS) as Rol[]) {
    const api = rol === 'owner' ? owner : await Api.como(request, rol);
    const localStorage = [{ name: 'etr_token', value: api.token }];
    // El jugador no elige torneo; el resto empieza en el de las pruebas
    if (rol !== 'jugador') localStorage.push({ name: 'etr_torneo', value: id });
    fs.writeFileSync(
      sesion(rol),
      JSON.stringify({
        cookies: [],
        origins: [{ origin: new URL(baseURL!).origin, localStorage }],
      }),
    );
  }
});
