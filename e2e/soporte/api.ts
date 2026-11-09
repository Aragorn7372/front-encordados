import { APIRequestContext, expect } from '@playwright/test';
import { Rol, USUARIOS } from './usuarios';

/**
 * Atajos contra la API para preparar y limpiar datos. Lo que se prueba es la interfaz: la API
 * solo pone las cosas en su sitio antes (crear un pedido) y las quita después.
 */
export class Api {
  private constructor(
    private readonly request: APIRequestContext,
    readonly token: string,
  ) {}

  static async como(request: APIRequestContext, rol: Rol): Promise<Api> {
    const { username, password } = USUARIOS[rol];
    const respuesta = await request.post('/api/auth/signin', { data: { username, password } });
    expect(respuesta.ok(), `login de ${username}`).toBeTruthy();
    const { token } = await respuesta.json();
    return new Api(request, token);
  }

  private opciones(data?: unknown) {
    return { headers: { Authorization: `Bearer ${this.token}` }, data };
  }

  async get<T>(url: string): Promise<T> {
    const respuesta = await this.request.get(url, this.opciones());
    expect(respuesta.ok(), `GET ${url}`).toBeTruthy();
    return respuesta.json();
  }

  async torneoId(nombre: string): Promise<string> {
    const pagina = await this.get<{ content: { id: string; name: string }[] }>(
      '/api/tournaments?page=0&pageSize=100',
    );
    const torneo = pagina.content.find((t) => t.name === nombre);
    expect(torneo, `torneo «${nombre}»`).toBeTruthy();
    return torneo!.id;
  }

  /** Torneo propio de la ejecución (como owner): de hoy a dentro de una semana. */
  async crearTorneo(nombre: string): Promise<string> {
    const hoy = new Date();
    const fin = new Date(hoy.getTime() + 7 * 86_400_000);
    const respuesta = await this.request.post('/api/tournaments/owner-create', {
      headers: { Authorization: `Bearer ${this.token}` },
      multipart: {
        Name: nombre,
        StartTournament: hoy.toISOString(),
        EndTournament: fin.toISOString(),
      },
    });
    expect(respuesta.ok(), `crear torneo ${nombre}: ${respuesta.status()}`).toBeTruthy();
    return this.torneoId(nombre);
  }

  async añadirEncordador(torneoId: string, username: string, machineName: string) {
    const encordadores = await this.get<{ content: { userId: string; username: string }[] }>(
      '/api/user/encorders?page=0&size=200',
    );
    const userId = encordadores.content.find((u) => u.username === username)?.userId;
    expect(userId, `encordador ${username}`).toBeTruthy();
    const respuesta = await this.request.patch(
      `/api/tournaments/add-worker/${torneoId}`,
      this.opciones({ userId, machineName }),
    );
    expect(respuesta.ok(), `añadir ${username} al torneo`).toBeTruthy();
  }

  async borrarTorneo(id: string) {
    const respuesta = await this.request.delete(`/api/tournaments/${id}`, this.opciones());
    expect(respuesta.ok(), `borrar torneo ${id}: ${respuesta.status()}`).toBeTruthy();
  }

  /** Contacto (jugador sin cuenta) en el torneo. Devuelve su username y su id. */
  async crearContacto(tournamentId: string, name: string) {
    const respuesta = await this.request.post(
      '/api/user/create-contact',
      this.opciones({ name, email: null, phone: null, tournamentId }),
    );
    expect(respuesta.ok(), `crear contacto ${name}`).toBeTruthy();
    const { username } = await respuesta.json();
    const jugadores = await this.get<{ content: { userId: string; username: string }[] }>(
      `/api/user/users/${tournamentId}?page=0&size=500`,
    );
    const id = jugadores.content.find((j) => j.username === username)?.userId;
    expect(id, `id del contacto ${username}`).toBeTruthy();
    return { username: username as string, id: id! };
  }

  async borrarUsuario(id: string) {
    const respuesta = await this.request.delete(`/api/user/${id}`, this.opciones());
    // Que no falle en silencio: si no se puede borrar, se ve (ya pasó con el owner y un 403)
    expect(
      respuesta.ok() || respuesta.status() === 404,
      `borrar usuario ${id}: ${respuesta.status()}`,
    ).toBeTruthy();
  }

  async crearPedido(datos: {
    tournamentId: string;
    jugador: string;
    encordador: string;
    raquetas: string[];
    payStatus?: string;
    comentarios?: string;
  }) {
    const respuesta = await this.request.post(
      '/api/purchased',
      this.opciones({
        tournamentId: datos.tournamentId,
        playerName: datos.jugador,
        assignedToName: datos.encordador,
        machine: 'Máquina e2e',
        comments: datos.comentarios ?? '',
        payStatus: datos.payStatus ?? 'PENDING_PAYMENT',
        price: 18 * datos.raquetas.length,
        lineas: datos.raquetas.map((raquet) => ({
          raquetModel: raquet,
          nudos: 2,
          dateString: new Date(Date.now() + 86_400_000).toISOString(),
          logotype: false,
          color: '',
          stringSetup: {
            stringV: 'RPM e2e',
            tensionV: 24,
            preStetchV: 0,
            stringH: 'RPM e2e',
            tensionH: 24,
            preStetchH: 0,
          },
        })),
      }),
    );
    expect(respuesta.ok(), `crear pedido de ${datos.jugador}`).toBeTruthy();
    return (await respuesta.json()) as { id: string; lineas: { id: string }[] };
  }

  /** Cuenta nueva, registrándose como cualquiera (sale con rol USER). */
  static async registrar(request: APIRequestContext, username: string, password: string) {
    const respuesta = await request.post('/api/auth/signup', {
      data: { username, email: `${username}@example.com`, password },
    });
    expect(respuesta.ok(), `registrar ${username}: ${respuesta.status()}`).toBeTruthy();
  }

  /** Id de un usuario por su username (con la lista completa: hace falta ser ADMIN u OWNER). */
  async usuarioId(username: string): Promise<string | undefined> {
    const pagina = await this.get<{ content: { userId: string; username: string }[] }>(
      '/api/user?page=0&size=1000',
    );
    return pagina.content.find((u) => u.username === username)?.userId;
  }

  async asignarSupervisor(tournamentId: string, username: string) {
    const supervisores = await this.get<{ content: { userId: string; username: string }[] }>(
      '/api/user/supervisors?page=0&size=200',
    );
    const supervisorId = supervisores.content.find((u) => u.username === username)?.userId;
    expect(supervisorId, `supervisor ${username}`).toBeTruthy();
    const respuesta = await this.request.patch(
      '/api/tournaments/assign-supervisor',
      this.opciones({ tournamentId, supervisorId }),
    );
    expect(respuesta.ok(), `asignar supervisor ${username}`).toBeTruthy();
  }

  /** Borra un cordaje o material del torneo por su modelo (si sigue ahí). */
  async borrarInventario(tipo: 'cuerdas' | 'materials', tournamentId: string, modelo: string) {
    const pagina = await this.get<{ content: { id: number; modelo: string }[] }>(
      `/api/${tipo}?page=0&size=500&tournamentId=${tournamentId}`,
    );
    for (const item of pagina.content.filter((i) => i.modelo === modelo)) {
      await this.request.delete(`/api/${tipo}/${item.id}`, this.opciones());
    }
  }

  /** Estado de una raqueta: PENDING, IN_PROGRESS, COMPLETED, DELIVERED_TOpLAYER… */
  async estadoLinea(lineaId: string, estado: string) {
    const respuesta = await this.request.patch(`/api/purchased/lineas/${lineaId}/status`, {
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      data: JSON.stringify(estado),
    });
    expect(respuesta.ok(), `estado ${estado}: ${respuesta.status()}`).toBeTruthy();
  }

  async cancelarPedido(id: string) {
    await this.request.patch(`/api/purchased/cancel/${id}`, this.opciones());
  }

  /** Pedidos del torneo con un jugador concreto, directamente del servidor. */
  async pedidosDe(tournamentId: string, jugador: string) {
    const pagina = await this.get<{
      content: { id: string; player: { username: string }; lineas: { status: string }[] }[];
    }>(`/api/purchased?page=0&size=500&tournamentId=${tournamentId}`);
    return pagina.content.filter((p) => p.player.username === jugador);
  }
}

/** Un nombre que no choca con nada: los dos workers crean datos a la vez. */
export const unico = (prefijo: string) =>
  `${prefijo} e2e ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
