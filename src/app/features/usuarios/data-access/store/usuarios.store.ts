import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { AuthStore } from '../../../../core/auth/store/auth.store';
import { UsuariosApi } from '../api/usuarios.api';
import { coincideUsuario, grupoDe, gruposVisibles } from '../mapper/usuario.mapper';
import { Grupo, Usuario } from '../model/usuario.model';

@Injectable()
export class UsuariosStore {
  private readonly api = inject(UsuariosApi);
  private readonly auth = inject(AuthStore);

  readonly busqueda = signal('');
  readonly grupo = signal<Grupo | ''>('');

  private readonly result = rxResource({ stream: () => this.api.list() });
  private readonly page = computed(() => (this.result.hasValue() ? this.result.value() : null));

  readonly grupos = computed(() => gruposVisibles(this.auth.role()));
  /** Lo que este rol puede ver, antes de buscar. */
  readonly todos = computed<Usuario[]>(() =>
    (this.page()?.usuarios ?? []).filter((u) => this.grupos().includes(grupoDe(u))),
  );
  readonly usuarios = computed(() =>
    this.todos().filter(
      (usuario) =>
        coincideUsuario(usuario, this.busqueda()) &&
        (!this.grupo() || grupoDe(usuario) === this.grupo()),
    ),
  );
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
