import { toComments } from './pedido.mapper';
import {
  LineaForm,
  PedidoFormValue,
  nuevaLinea,
  nuevoArticulo,
  pedidoVacio,
} from '../model/pedido-form.model';
import { CambiosPedido, Pedido } from '../model/pedido.model';

/** PurchasedRequestDto. */
export interface PurchasedRequest {
  tournamentId: string;
  playerName: string;
  assignedToName: string;
  machine: string;
  comments: string;
  payStatus: string;
  price: number;
  lineas: {
    raquetModel: string;
    nudos: number;
    dateString: string;
    logotype: boolean;
    color: string;
    stringSetup: {
      stringV: string;
      tensionV: number;
      preStetchV: number;
      stringH: string;
      tensionH: number;
      preStetchH: number;
    };
  }[];
}

const TALLER_MARK = 'ORDEN_DE_TALLER';
/** El backend exige tensiones entre 5 y 40 también en los artículos de taller. */
const TENSION_TALLER = 21;

/**
 * Inverso de toPedido: codifica en los campos del backend lo que no tiene campo propio
 * (taller, cantidad y notas, material propio).
 */
export function toPurchasedRequest(value: PedidoFormValue, tournamentId: string): PurchasedRequest {
  const dateString = new Date(value.fecha).toISOString();
  const base = {
    tournamentId,
    playerName: value.jugador,
    assignedToName: value.encordador,
    machine: value.maquina.trim(),
    comments: toComments(value.comentarios, value.tipo === 'encordado' && value.materialPropio),
    payStatus: value.pago,
    price: value.precio,
  };

  if (value.tipo === 'taller') {
    return {
      ...base,
      lineas: value.articulos.map((articulo) => ({
        raquetModel: articulo.articulo.trim(),
        nudos: 2,
        dateString,
        logotype: false,
        color: `Cant: ${articulo.cantidad}${articulo.notas.trim() ? ` | ${articulo.notas.trim()}` : ''}`,
        stringSetup: {
          stringV: value.cuando.trim() || 'N/A',
          tensionV: TENSION_TALLER,
          preStetchV: 0,
          stringH: TALLER_MARK,
          tensionH: TENSION_TALLER,
          preStetchH: 0,
        },
      })),
    };
  }

  return {
    ...base,
    // El backend no tiene cantidad: N raquetas iguales son N líneas, cada una con su estado
    lineas: value.lineas.flatMap((linea) => {
      const dto = {
        raquetModel: linea.raqueta.trim(),
        nudos: linea.nudos,
        dateString: linea.fecha ? new Date(linea.fecha).toISOString() : dateString,
        logotype: linea.logo,
        // El color es el del logo: sin logo no hay color
        color: linea.logo ? linea.color.trim() : '',
        stringSetup: {
          stringV: linea.cuerdaV.trim(),
          tensionV: linea.tensionV,
          preStetchV: linea.preestiradoV,
          stringH: linea.cuerdaH.trim(),
          tensionH: linea.tensionH,
          preStetchH: linea.preestiradoH,
        },
      };
      return Array.from({ length: linea.cantidad }, () => ({ ...dto }));
    }),
  };
}

/** Clave de lo que hace iguales a dos raquetas al repetir: todo menos cantidad y fecha. */
const claveLinea = (linea: LineaForm) => JSON.stringify({ ...linea, cantidad: 0, fecha: '' });

/** Las líneas iguales seguidas vuelven a ser una raqueta con cantidad. */
function agrupar(lineas: LineaForm[]): LineaForm[] {
  return lineas.reduce<LineaForm[]>((grupos, linea) => {
    const ultima = grupos.at(-1);
    if (ultima && claveLinea(ultima) === claveLinea(linea)) {
      grupos[grupos.length - 1] = { ...ultima, cantidad: ultima.cantidad + 1 };
      return grupos;
    }
    return [...grupos, linea];
  }, []);
}

/** Para repetir un pedido: mismos datos, fecha nueva y sin estado. */
export function toFormValue(pedido: Pedido): PedidoFormValue {
  const vacio = pedidoVacio();
  const lineas = pedido.lineas.flatMap((linea) =>
    linea.tipo === 'encordado'
      ? [
          {
            ...nuevaLinea(),
            raqueta: linea.raqueta,
            nudos: linea.nudos,
            logo: linea.logo,
            color: linea.logo ? linea.color : '',
            cuerdaV: linea.vertical.cuerda,
            tensionV: linea.vertical.tension,
            preestiradoV: linea.vertical.preestirado,
            cuerdaH: linea.horizontal.cuerda,
            tensionH: linea.horizontal.tension,
            preestiradoH: linea.horizontal.preestirado,
          },
        ]
      : [],
  );
  const articulos = pedido.lineas.flatMap((linea) =>
    linea.tipo === 'taller'
      ? [
          {
            ...nuevoArticulo(),
            articulo: linea.articulo,
            cantidad: linea.cantidad,
            notas: linea.notas,
          },
        ]
      : [],
  );
  const cuando = pedido.lineas.find((linea) => linea.tipo === 'taller');

  return {
    ...vacio,
    tipo: pedido.tipo,
    jugador: pedido.jugador.username,
    encordador: pedido.encordador.username,
    maquina: pedido.maquina,
    materialPropio: pedido.materialPropio,
    precio: pedido.precio,
    comentarios: pedido.comentarios,
    cuando: cuando?.tipo === 'taller' ? cuando.cuando : '',
    lineas: lineas.length > 0 ? agrupar(lineas) : vacio.lineas,
    articulos: articulos.length > 0 ? articulos : vacio.articulos,
  };
}

/** Cuerpo del PUT de un pedido: solo los campos que cambian. */
export type CuerpoCambios = Partial<Record<'machine' | 'payStatus' | 'comments', string>>;

/**
 * Solo se envía lo que cambia: el backend rechaza comentarios vacíos. PUT y no
 * change-payment-status: PUT emite PEDIDO_ACTUALIZADO y el pago llega en vivo a otros tableros.
 */
export function cuerpoCambios(pedido: Pedido, cambios: CambiosPedido): CuerpoCambios {
  const cuerpo: CuerpoCambios = {};
  if (cambios.maquina.trim() !== pedido.maquina) cuerpo.machine = cambios.maquina.trim();
  if (cambios.pago !== pedido.pago) cuerpo.payStatus = cambios.pago;
  const comments = toComments(cambios.comentarios, pedido.materialPropio);
  if (comments && comments !== toComments(pedido.comentarios, pedido.materialPropio)) {
    cuerpo.comments = comments;
  }
  return cuerpo;
}
