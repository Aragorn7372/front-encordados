import { HttpResponse } from '@angular/common/http';

/** Nombre que propone el servidor en Content-Disposition, si lo hay. */
export function nombreDeFichero(response: HttpResponse<Blob>, porDefecto: string): string {
  const header = response.headers.get('Content-Disposition') ?? '';
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header)?.[1];
  if (utf8) return decodeURIComponent(utf8);
  return /filename="?([^";]+)"?/i.exec(header)?.[1] ?? porDefecto;
}

/** Descarga un blob como fichero sin abrir ventanas nuevas. */
export function guardarFichero(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  // El navegador ya tiene el fichero: liberar la memoria del blob
  setTimeout(() => URL.revokeObjectURL(url));
}
