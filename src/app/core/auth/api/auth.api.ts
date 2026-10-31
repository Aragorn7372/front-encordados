import { HttpClient, HttpContext, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { SILENT_ERRORS } from '../../http/error.interceptor';
import {
  AuthResponse,
  ChangePasswordRequest,
  LoginRequest,
  RegisterRequest,
} from '../dto/auth.models';

const BASE = '/api/auth';

/** Los formularios pintan estos errores en línea, así que no queremos además un toast. */
const silent = () => ({ context: new HttpContext().set(SILENT_ERRORS, true) });

@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);

  signIn(body: LoginRequest) {
    return this.http.post<AuthResponse>(`${BASE}/signin`, body, silent());
  }

  signUp(body: RegisterRequest) {
    return this.http.post<AuthResponse>(`${BASE}/signup`, body, silent());
  }

  /** El backend espera un string JSON suelto: hay que serializarlo y fijar el Content-Type. */
  requestPasswordChange(email: string) {
    return this.http.post<void>(`${BASE}/change-password-request`, JSON.stringify(email), {
      ...silent(),
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  changePassword(guid: string, body: ChangePasswordRequest) {
    return this.http.post<void>(`${BASE}/change-password/${guid}`, body, silent());
  }
}
