import { leerCodigo, textoBarras, textoQr } from './codigo-pedido';

const ID = '01KS0Q28TEJ0SYA6JJ5H4W4CMP';

describe('códigos de pedido', () => {
  it('el QR es una URL al escáner; el de barras, el id', () => {
    expect(textoQr(ID, 'https://encordados.app')).toBe(
      `https://encordados.app/escanear?codigo=${ID}`,
    );
    expect(textoBarras(ID.toLowerCase())).toBe(ID);
  });

  it('lee lo que genera: el QR y el código de barras', () => {
    expect(leerCodigo(textoQr(ID, 'https://encordados.app'))).toEqual({ tipo: 'pedido', id: ID });
    expect(leerCodigo(textoBarras(ID))).toEqual({ tipo: 'pedido', id: ID });
  });

  it('un lector puede añadir espacios o devolverlo en minúsculas', () => {
    expect(leerCodigo(`  ${ID.toLowerCase()}\n`)).toEqual({ tipo: 'pedido', id: ID });
  });

  it('entiende los códigos del front antiguo (JSON y openPedido)', () => {
    const json = JSON.stringify({ v: 1, type: 'pedido', id: ID, player: 'ana' });
    expect(leerCodigo(json)).toEqual({ tipo: 'pedido', id: ID });
    expect(leerCodigo(`https://otro.dominio/pedidos?openPedido=${ID}&detail=1`)).toEqual({
      tipo: 'pedido',
      id: ID,
    });
  });

  it('lo que no es un pedido se dice, no se abre', () => {
    expect(leerCodigo('8412345678905')).toEqual({ tipo: 'desconocido', texto: '8412345678905' });
    expect(leerCodigo('{"type":"otro","id":"x"}').tipo).toBe('desconocido');
    expect(leerCodigo('https://example.com/').tipo).toBe('desconocido');
  });
});
