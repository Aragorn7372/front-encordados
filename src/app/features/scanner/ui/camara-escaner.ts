import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  Detector,
  ErrorLector,
  MENSAJE_CAMARA,
  MENSAJE_LECTOR,
  crearDetector,
  errorCamara,
} from '../data-access/api/detector';

/** Cada cuánto se mira un fotograma: suficiente para leer al momento sin gastar batería. */
const CADA_MS = 150;
/** El mismo código seguido no se vuelve a emitir hasta pasado este tiempo. */
const REPETIDO_MS = 2500;
/** Tantos fotogramas seguidos con error (unos 3 s) es que el lector no funciona: se dice. */
const MAX_FALLOS = 20;

/**
 * La cámara trasera leyendo QR y códigos de barras, y la alternativa de leerlos desde una foto
 * (en el móvil abre la cámara de fotos, que enfoca mucho mejor que el vídeo). Emite el texto de
 * cada código; qué hacer con él lo decide la página. La cámara se apaga al salir y al cambiar
 * de pestaña.
 */
@Component({
  selector: 'app-camara-escaner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-box relative aspect-[4/3] w-full overflow-hidden bg-black">
      <video #video class="size-full object-cover" playsinline muted></video>
      <!-- Marco de guía: el lector mira toda la imagen, el marco solo orienta -->
      <div
        class="pointer-events-none absolute inset-[12%] rounded-xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
      ></div>
      @if (estado() === 'iniciando') {
        <div class="absolute inset-0 grid place-items-center text-white">
          <span class="loading loading-spinner loading-lg"></span>
        </div>
      }
    </div>

    @if (error(); as mensaje) {
      <div role="alert" class="alert alert-warning alert-soft mt-3">
        <span>{{ mensaje }}</span>
        <button type="button" class="btn btn-sm" (click)="iniciar(camaraId())">Reintentar</button>
      </div>
    }

    <div class="mt-3 flex flex-wrap items-center gap-2">
      <label class="btn btn-sm" [class.btn-disabled]="leyendoFoto()">
        @if (leyendoFoto()) {
          <span class="loading loading-spinner loading-xs"></span>
        }
        Leer desde una foto
        <input
          type="file"
          class="hidden"
          accept="image/*"
          capture="environment"
          aria-label="Foto del código"
          (change)="leerFoto($event)"
        />
      </label>
      @if (camaras().length > 1) {
        <label class="flex items-center gap-2 text-sm">
          Cámara
          <select class="select select-sm" (change)="cambiarCamara($event)">
            @for (camara of camaras(); track camara.deviceId; let i = $index) {
              <option [value]="camara.deviceId" [selected]="camara.deviceId === camaraId()">
                {{ camara.label || 'Cámara ' + (i + 1) }}
              </option>
            }
          </select>
        </label>
      }
    </div>
  `,
})
export class CamaraEscaner {
  readonly leido = output<string>();

  protected readonly estado = signal<'iniciando' | 'leyendo' | 'parada'>('iniciando');
  protected readonly error = signal<string | null>(null);
  protected readonly camaras = signal<MediaDeviceInfo[]>([]);
  protected readonly camaraId = signal<string | null>(null);
  protected readonly leyendoFoto = signal(false);

  private readonly video = viewChild.required<ElementRef<HTMLVideoElement>>('video');
  private stream: MediaStream | null = null;
  private detector: Promise<Detector> | null = null;
  private temporizador: ReturnType<typeof setTimeout> | null = null;
  private ultimo = { texto: '', cuando: 0 };
  private fallos = 0;
  private vivo = true;

  constructor() {
    const doc = inject(DOCUMENT);
    // En segundo plano no se gasta batería ni se deja la cámara encendida
    const visibilidad = () => {
      if (doc.hidden) this.parar();
      else if (this.vivo && this.estado() === 'parada' && !this.error())
        void this.iniciar(this.camaraId());
    };
    afterNextRender(() => {
      void this.iniciar(null);
      doc.addEventListener('visibilitychange', visibilidad);
    });
    inject(DestroyRef).onDestroy(() => {
      this.vivo = false;
      doc.removeEventListener('visibilitychange', visibilidad);
      this.parar();
    });
  }

  protected async iniciar(deviceId: string | null): Promise<void> {
    this.parar();
    this.error.set(null);
    this.estado.set('iniciando');
    try {
      // El lector se prepara a la vez que se abre la cámara
      const detector = this.lector();
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
      });
      if (!this.vivo) return this.parar();
      const pista = this.stream.getVideoTracks()[0];
      await enfocar(pista);
      const video = this.video().nativeElement;
      video.srcObject = this.stream;
      await video.play();
      this.camaraId.set(pista?.getSettings().deviceId ?? deviceId);
      // Con permiso ya dado, las cámaras tienen nombre
      const dispositivos = await navigator.mediaDevices.enumerateDevices();
      this.camaras.set(dispositivos.filter((d) => d.kind === 'videoinput'));
      this.fallos = 0;
      const lector = await detector;
      this.estado.set('leyendo');
      this.mirar(lector);
    } catch (error) {
      this.parar();
      this.mostrarError(error);
    }
  }

  protected cambiarCamara(event: Event): void {
    void this.iniciar((event.target as HTMLSelectElement).value);
  }

  /** Una foto (o una imagen del ordenador): más nítida que el vídeo, sirve también sin https. */
  protected async leerFoto(event: Event): Promise<void> {
    const campo = event.target as HTMLInputElement;
    const fichero = campo.files?.[0];
    campo.value = ''; // Para poder elegir la misma foto otra vez
    if (!fichero) return;
    this.leyendoFoto.set(true);
    try {
      const imagen = await createImageBitmap(fichero);
      const codigos = await (await this.lector()).detect(imagen);
      imagen.close();
      const texto = codigos[0]?.rawValue;
      if (texto) {
        this.error.set(null);
        this.ultimo = { texto: '', cuando: 0 }; // La foto se elige a propósito: siempre cuenta
        this.emitir(texto);
      } else {
        this.error.set('No se ve ningún código en la foto. Acércate más y que salga nítido.');
      }
    } catch (error) {
      this.mostrarError(error instanceof ErrorLector ? error : new Error('foto'));
    } finally {
      this.leyendoFoto.set(false);
    }
  }

  private lector(): Promise<Detector> {
    // Si falla se vuelve a intentar la próxima vez (por ejemplo, al volver la red)
    this.detector ??= crearDetector().catch((error: unknown) => {
      this.detector = null;
      throw error;
    });
    return this.detector;
  }

  private mostrarError(error: unknown): void {
    if (error instanceof ErrorLector) this.error.set(MENSAJE_LECTOR);
    else if ((error as Error)?.message === 'foto')
      this.error.set('No se ha podido leer esa imagen. Prueba con otra foto.');
    else this.error.set(MENSAJE_CAMARA[errorCamara(error)]);
  }

  private mirar(detector: Detector): void {
    if (this.estado() !== 'leyendo' || this.temporizador) return;
    const video = this.video().nativeElement;
    const siguiente = () => {
      this.temporizador = setTimeout(() => {
        this.temporizador = null;
        this.mirar(detector);
      }, CADA_MS);
    };
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return siguiente();
    detector
      .detect(video)
      .then((codigos) => {
        this.fallos = 0;
        const texto = codigos[0]?.rawValue;
        if (texto) this.emitir(texto);
        siguiente();
      })
      .catch(() => {
        // Un fotograma suelto que no se puede leer no importa; muchos seguidos, sí
        if (++this.fallos < MAX_FALLOS) return siguiente();
        this.parar();
        this.error.set(MENSAJE_LECTOR);
      });
  }

  private emitir(texto: string): void {
    const ahora = Date.now();
    if (texto === this.ultimo.texto && ahora - this.ultimo.cuando < REPETIDO_MS) return;
    this.ultimo = { texto, cuando: ahora };
    navigator.vibrate?.(60);
    this.leido.emit(texto);
  }

  private parar(): void {
    if (this.temporizador) clearTimeout(this.temporizador);
    this.temporizador = null;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.estado.set('parada');
  }
}

/** Enfoque automático continuo si la cámara lo admite: sin él, muchas no enfocan de cerca. */
async function enfocar(pista: MediaStreamTrack | undefined): Promise<void> {
  const capacidades = pista?.getCapabilities?.() as { focusMode?: string[] } | undefined;
  if (!pista || !capacidades?.focusMode?.includes('continuous')) return;
  await pista
    .applyConstraints({ advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet] })
    .catch(() => undefined);
}
