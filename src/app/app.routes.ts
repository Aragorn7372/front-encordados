import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/auth/guards/auth.guards';
import { AuthStore } from './core/auth/store/auth.store';
import { homeFor } from './core/auth/guards/role-home';
import { inject } from '@angular/core';
import { Role } from './shared/models/roles';

const TODOS: Role[] = ['ADMIN', 'OWNER', 'SUPERVISOR', 'ENCORDER', 'USER'];

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: () => {
      const role = inject(AuthStore).role();
      return role ? homeFor(role) : '/login';
    },
  },
  { path: '', loadChildren: () => import('./features/auth/auth.routes') },
  {
    path: '403',
    title: 'Acceso no permitido',
    loadComponent: () => import('./shared/ui/forbidden'),
  },
  {
    path: '',
    canMatch: [authGuard],
    loadComponent: () => import('./layout/shell'),
    children: [
      {
        path: 'pedidos',
        title: 'Pedidos',
        canMatch: [roleGuard],
        data: {
          roles: ['ADMIN', 'OWNER'],
          nav: { label: 'Pedidos', icon: 'pedido' },
        },
        loadComponent: () => import('./features/pedidos/pages/pedidos-board'),
      },
      {
        path: 'mis-asignados',
        title: 'Mis asignados',
        canMatch: [roleGuard],
        data: { roles: ['ENCORDER'], nav: { label: 'Mis asignados', icon: 'asignados' } },
        loadComponent: () => import('./features/pedidos/pages/pedidos-board'),
      },
      {
        path: 'mis-pedidos',
        title: 'Mis pedidos',
        canMatch: [roleGuard],
        data: {
          roles: ['USER'],
          readonly: true,
          nav: { label: 'Mis pedidos', icon: 'pedido' },
        },
        loadComponent: () => import('./features/pedidos/pages/pedidos-board'),
      },
      {
        path: 'terminados',
        title: 'Terminados',
        canMatch: [roleGuard],
        data: { roles: ['ADMIN', 'OWNER'], nav: { label: 'Terminados', icon: 'terminados' } },
        loadComponent: () => import('./features/pedidos/pages/terminados'),
      },
      {
        path: 'jugadores',
        title: 'Jugadores',
        canMatch: [roleGuard],
        data: {
          roles: ['ADMIN', 'OWNER', 'ENCORDER'],
          nav: { label: 'Jugadores', icon: 'jugadores' },
        },
        loadComponent: () => import('./features/jugadores/pages/jugadores-page'),
      },
      {
        path: 'cordajes',
        title: 'Cordajes',
        canMatch: [roleGuard],
        data: { roles: ['ADMIN', 'OWNER'], nav: { label: 'Cordajes', icon: 'cordajes' } },
        loadComponent: () => import('./features/cordajes/pages/cordajes-page'),
      },
      {
        path: 'materiales',
        title: 'Materiales',
        canMatch: [roleGuard],
        data: { roles: ['ADMIN', 'OWNER'], nav: { label: 'Materiales', icon: 'materiales' } },
        loadComponent: () => import('./features/materiales/pages/materiales-page'),
      },
      {
        path: 'torneos',
        title: 'Torneos',
        canMatch: [roleGuard],
        data: {
          roles: ['ADMIN', 'OWNER', 'ENCORDER'],
          nav: { label: 'Torneos', icon: 'torneos' },
          // Aquí se elige el torneo de la lista: el selector de arriba solo confundiría
          ocultarSelectorTorneo: true,
        },
        loadComponent: () => import('./features/torneos/pages/torneos-list'),
      },
      {
        path: 'torneos/:id',
        title: 'Torneo',
        canMatch: [roleGuard],
        data: { roles: ['ADMIN', 'OWNER', 'ENCORDER'], ocultarSelectorTorneo: true },
        loadComponent: () => import('./features/torneos/pages/torneo-detail'),
      },
      {
        path: 'informes',
        title: 'Informes',
        canMatch: [roleGuard],
        data: {
          roles: ['ADMIN', 'OWNER', 'SUPERVISOR'],
          nav: { label: 'Informes', icon: 'informes' },
        },
        loadComponent: () => import('./features/informes/pages/informes-page'),
      },
      {
        path: 'usuarios',
        title: 'Usuarios',
        canMatch: [roleGuard],
        data: { roles: ['ADMIN', 'OWNER'], nav: { label: 'Usuarios', icon: 'usuarios' } },
        loadComponent: () => import('./features/usuarios/pages/usuarios-page'),
      },
      {
        path: 'escanear',
        // Sin entrada en el menú: se abre con el botón de la cámara de la barra superior
        title: 'Escanear',
        canMatch: [roleGuard],
        data: { roles: ['ADMIN', 'OWNER', 'ENCORDER', 'USER'] },
        loadComponent: () => import('./features/scanner/pages/escaner-page'),
      },
      {
        path: 'perfil',
        title: 'Mi perfil',
        canMatch: [roleGuard],
        data: { roles: TODOS },
        loadComponent: () => import('./features/perfil/pages/perfil-page'),
      },
      {
        path: '**',
        title: 'Página no encontrada',
        loadComponent: () => import('./shared/ui/not-found'),
      },
    ],
  },
];
