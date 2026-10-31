import { Routes } from '@angular/router';
import { guestGuard } from '../../core/auth/guards/auth.guards';

export default [
  {
    path: 'login',
    title: 'Iniciar sesión',
    canMatch: [guestGuard],
    loadComponent: () => import('./pages/login'),
  },
  {
    path: 'registro',
    title: 'Crear cuenta',
    canMatch: [guestGuard],
    loadComponent: () => import('./pages/register'),
  },
  {
    path: 'recuperar',
    title: 'Recuperar contraseña',
    canMatch: [guestGuard],
    loadComponent: () => import('./pages/forgot-password'),
  },
  {
    // El backend genera esta URL en el email: no se puede renombrar
    path: 'changePassword',
    title: 'Cambiar contraseña',
    loadComponent: () => import('./pages/change-password'),
  },
] satisfies Routes;
