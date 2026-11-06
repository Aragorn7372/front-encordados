import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthStore } from '../../../core/auth/store/auth.store';
import { UsuariosApi } from '../data-access/api/usuarios.api';
import { BackupPanel } from './backup-panel';

describe('BackupPanel', () => {
  const api = {
    manifest: vi.fn(() =>
      of({
        version: '1.0',
        exportedAt: '2026-11-06T15:24:09Z',
        description: 'Full database export',
        entities: [
          { name: 'users', recordCount: 14, fileName: 'users.json' },
          { name: 'orders', recordCount: 16, fileName: 'orders.json' },
        ],
      }),
    ),
    restaurar: vi.fn(() => of({ message: 'ok' })),
  };
  const auth = { logout: vi.fn() };
  let fixture: ComponentFixture<BackupPanel>;
  const element = () => fixture.nativeElement as HTMLElement;
  const restaurarBtn = () =>
    [...element().querySelectorAll('button')].find((b) => b.textContent?.includes('restaurar'))!;

  const elegirZip = async () => {
    const input = element().querySelector<HTMLInputElement>('input[type=file]')!;
    Object.defineProperty(input, 'files', {
      value: [new File(['zip'], 'copia.zip')],
      configurable: true,
    });
    input.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  };
  const escribir = async (texto: string) => {
    const input = element().querySelector<HTMLInputElement>('#backup-confirmar')!;
    input.value = texto;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: UsuariosApi, useValue: api },
        { provide: AuthStore, useValue: auth },
      ],
    });
    fixture = TestBed.createComponent(BackupPanel);
    await fixture.whenStable();
  });

  it('al elegir el zip enseña lo que trae, sin restaurar nada', async () => {
    await elegirZip();

    const contenido = element().querySelector('[aria-label="Contenido de la copia"]')!.textContent;
    expect(contenido).toContain('Usuarios: 14');
    expect(contenido).toContain('Pedidos: 16');
    expect(contenido).toContain('borra toda la base de datos');
    expect(api.restaurar).not.toHaveBeenCalled();
  });

  it('no deja restaurar sin escribir la palabra', async () => {
    await elegirZip();
    expect(restaurarBtn().disabled).toBe(true);

    await escribir('restaura');
    expect(restaurarBtn().disabled).toBe(true);

    await escribir('restaurar');
    expect(restaurarBtn().disabled).toBe(false);
  });

  it('restaurar envía el zip y cierra la sesión', async () => {
    await elegirZip();
    await escribir('RESTAURAR');

    restaurarBtn().click();
    await fixture.whenStable();

    expect(api.restaurar).toHaveBeenCalledWith(expect.any(File));
    expect(auth.logout).toHaveBeenCalled();
  });

  it('un zip que no es una copia lo dice', async () => {
    api.manifest.mockReturnValueOnce(
      throwError(() => ({ status: 500, message: 'Error reading manifest' })),
    );

    await elegirZip();

    expect(element().querySelector('[role=alert]')!.textContent).toContain(
      'No parece una copia válida',
    );
    expect(element().querySelector('#backup-confirmar')).toBeNull();
  });
});
