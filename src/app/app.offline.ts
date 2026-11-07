import { FuncionesOffline } from './core/offline/funciones-offline';
import { cordajesManejadores } from './features/cordajes/cordajes.outbox';
import { cordajesPrecarga } from './features/cordajes/cordajes.precarga';
import { informesPrecarga } from './features/informes/informes.precarga';
import { jugadoresManejadores } from './features/jugadores/jugadores.outbox';
import { jugadoresPrecarga } from './features/jugadores/jugadores.precarga';
import { materialesManejadores } from './features/materiales/materiales.outbox';
import { materialesPrecarga } from './features/materiales/materiales.precarga';
import { pedidosManejadores } from './features/pedidos/pedidos.outbox';
import { pedidosPrecarga } from './features/pedidos/pedidos.precarga';
import { torneosPrecarga } from './features/torneos/torneos.precarga';
import { usuariosPrecarga } from './features/usuarios/usuarios.precarga';

/**
 * Lo que cada feature hace sin conexión (ENCUERDATU-51): qué guarda de un torneo al elegirlo y
 * cómo se envían sus escrituras de la cola. Se carga aparte, no en la carga inicial.
 */
const funciones: FuncionesOffline = {
  precargas: [
    pedidosPrecarga,
    jugadoresPrecarga,
    cordajesPrecarga,
    materialesPrecarga,
    informesPrecarga,
    torneosPrecarga,
    usuariosPrecarga,
  ],
  manejadores: [
    ...pedidosManejadores,
    ...jugadoresManejadores,
    ...cordajesManejadores,
    ...materialesManejadores,
  ],
};

export default funciones;
