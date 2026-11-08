// Lo que el navegador tiene y jsdom (el DOM de los tests) no.
// phantom-ui vigila el tamaño del contenido con ResizeObserver: en los tests basta con que exista
// (no hay maquetación que medir), así que no hace nada.
const nada = () => undefined;

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe = nada;
    unobserve = nada;
    disconnect = nada;
  } as unknown as typeof ResizeObserver;
}
