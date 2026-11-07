import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Role, isRole } from '../../../shared/models/roles';
import { ToastService } from '../../toast/toast.service';
import { AuthApi } from '../api/auth.api';
import { LoginRequest, RegisterRequest } from '../dto/auth.models';
import { CLAIM_ID, CLAIM_ROLE, decodeJwt, isExpired } from '../jwt/jwt';

const TOKEN_KEY = 'etr_token';
const WARNING_BEFORE_MS = 5 * 60 * 1000;
const MAX_TIMEOUT_MS = 2_147_483_647; // setTimeout desborda por encima de este valor

function readStoredToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY);
  const claims = decodeJwt(token);
  if (claims && !isExpired(claims)) return token;
  localStorage.removeItem(TOKEN_KEY);
  return null;
}

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly api = inject(AuthApi);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  private readonly _token = signal(readStoredToken());
  private readonly claims = computed(() => decodeJwt(this._token()));

  readonly token = this._token.asReadonly();
  readonly role = computed<Role | null>(() => {
    const role = this.claims()?.[CLAIM_ROLE];
    return isRole(role) ? role : null;
  });
  readonly isLoggedIn = computed(() => this.role() !== null);
  readonly userId = computed(() => this.claims()?.[CLAIM_ID] ?? null);
  readonly username = computed(() => this.claims()?.sub ?? null);
  readonly email = computed(() => this.claims()?.email ?? null);
  /**
   * Si la última salida fue cerrar sesión a mano (true) o porque caducó (false). Al caducar se
   * conserva lo guardado en el dispositivo, incluidos los cambios sin enviar (ENCUERDATU-51).
   */
  salidaVoluntaria = false;

  constructor() {
    // No hay refresh token: avisamos antes de caducar y cerramos la sesión al llegar a exp.
    effect((onCleanup) => {
      const exp = this.claims()?.exp;
      if (!exp) return;

      const remaining = exp * 1000 - Date.now();
      const warning = setTimeout(
        () => this.toast.warning('Tu sesión caduca en 5 minutos'),
        Math.min(remaining - WARNING_BEFORE_MS, MAX_TIMEOUT_MS),
      );
      const expiry = setTimeout(
        () => this.logout('Tu sesión ha caducado'),
        Math.min(remaining, MAX_TIMEOUT_MS),
      );

      onCleanup(() => {
        clearTimeout(warning);
        clearTimeout(expiry);
      });
    });
  }

  hasRole(...roles: Role[]): boolean {
    const role = this.role();
    return role !== null && roles.includes(role);
  }

  async login(credentials: LoginRequest): Promise<void> {
    const { token } = await firstValueFrom(this.api.signIn(credentials));
    this.setToken(token);
  }

  async register(data: RegisterRequest): Promise<void> {
    const { token } = await firstValueFrom(this.api.signUp(data));
    this.setToken(token);
  }

  /** Lo que dependa de la sesión debe reaccionar a `isLoggedIn`, no llamarse desde aquí. */
  logout(reason?: string): void {
    // Con motivo es que la sesión ha caducado; sin él, lo ha pedido el usuario
    this.salidaVoluntaria = !reason;
    this.setToken(null);
    if (reason) this.toast.warning(reason);
    void this.router.navigate(['/login']);
  }

  private setToken(token: string | null): void {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
    this._token.set(token);
  }
}
