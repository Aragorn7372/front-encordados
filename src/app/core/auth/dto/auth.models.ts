export interface LoginRequest {
  /** El backend acepta aquí el nombre de usuario o el email. */
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface ChangePasswordRequest {
  newPassword: string;
  confirmPassword: string;
}

export interface AuthResponse {
  token: string;
  user: { id: string; username: string; email: string; role: string; createdAt: string };
}
