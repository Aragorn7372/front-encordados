import { Injectable, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { AuthStore } from '../../../../core/auth/store/auth.store';
import { UsuariosApi } from '../api/usuarios.api';
import { coincideUsuario, grupoDe, gruposVisibles } from '../mapper/usuario.mapper';
import { Grupo, Usuario } from '../model/usuario.model';

/** Cuántas cuentas se pintan a la vez: con cientos, la tabla entera era muy larga. */
export const USUARIOS_POR_PAGINA = 20;

@Injectable()
export class UsuariosStore {
  private readonly api = inject(UsuariosApi);
  private readonly auth = inject(AuthStore);

  readonly busqueda = signal('');
  /** La pestaña que se ve: siempre una (no hay vista de «todos»). */
  readonly grupo = signal<Grupo>('encordadores');

  private readonly result = rxResource({ stream: () => this.api.list() });
  private readonly page = computed(() => (this.result.hasValue() ? this.result.value() : null));

  readonly grupos = computed(() => gruposVisibles(this.auth.role()));
  /** Lo que este rol puede ver, antes de buscar. */
  readonly todos = computed<Usuario[]>(() =>
    (this.page()?.usuarios ?? []).filter((u) => this.grupos().includes(grupoDe(u))),
  );
  readonly usuarios = computed(() =>
    this.todos().filter(
      (usuario) => grupoDe(usuario) === this.grupo() && coincideUsuario(usuario, this.busqueda()),
    ),
  );
  /**
   * Página que se ve. Se pagina aquí y no en el servidor: el backend no filtra por los grupos de
   * esta pantalla (sin rol, propietarios…) y el aviso de «sin rol» necesita contarlas todas.
   * Buscar o cambiar de grupo vuelve a la primera.
   */
  readonly pagina = linkedSignal({
    source: () => [this.busqueda(), this.grupo()],
    computation: () => 0,
  });
  readonly paginas = computed(() =>
    Math.max(1, Math.ceil(this.usuarios().length / USUARIOS_POR_PAGINA)),
  );
  /** Si se borra la última de la última página, se queda en la anterior. */
  readonly visibles = computed(() => {
    const pagina = Math.min(this.pagina(), this.paginas() - 1);
    return this.usuarios().slice(pagina * USUARIOS_POR_PAGINA, (pagina + 1) * USUARIOS_POR_PAGINA);
  });

  /** Cuántas hay en cada pestaña (sin contar la búsqueda), para el número de cada una. */
  readonly porGrupo = computed(() => {
    const cuenta = Object.fromEntries(this.grupos().map((g) => [g, 0])) as Record<Grupo, number>;
    for (const u of this.todos()) cuenta[grupoDe(u)]++;
    return cuenta;
  });

  readonly sinRol = computed(() => this.todos().filter((u) => grupoDe(u) === 'sin-rol').length);
  readonly total = computed(() => this.page()?.total ?? 0);
  readonly loading = this.result.isLoading;
  readonly failed = computed(() => this.result.error() !== undefined);

  reload(): void {
    this.result.reload();
  }

  async hacerEncordador(id: string): Promise<void> {
    await firstValueFrom(this.api.hacerEncordador(id));
    this.reload();
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(this.api.remove(id));
    this.reload();
  }
}
