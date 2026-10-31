import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthApi } from '../../../core/auth/api/auth.api';
import ChangePassword from './change-password';

describe('ChangePassword', () => {
  const api = { changePassword: vi.fn() };
  let fixture: ComponentFixture<ChangePassword>;

  const element = () => fixture.nativeElement as HTMLElement;

  const type = (id: string, value: string) => {
    const input = element().querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };

  const submit = async () => {
    element()
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  };

  const open = async (guid?: string) => {
    fixture = TestBed.createComponent(ChangePassword);
    fixture.componentRef.setInput('guid', guid);
    await fixture.whenStable();
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false })),
    );
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthApi, useValue: api }],
    });
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('sin guid avisa de que el enlace no es válido', async () => {
    await open(undefined);

    expect(element().textContent).toContain('El enlace no es válido');
    expect(element().querySelector('form')).toBeNull();
  });

  it('quita el prefijo password_ antes de llamar a la API', async () => {
    api.changePassword.mockReturnValue(of(undefined));
    await open('password_abc-123');
    type('newPassword', 'secreta1');
    type('confirmPassword', 'secreta1');

    await submit();

    expect(api.changePassword).toHaveBeenCalledWith('abc-123', {
      newPassword: 'secreta1',
      confirmPassword: 'secreta1',
    });
  });

  it('no envía si las contraseñas no coinciden', async () => {
    await open('abc');
    type('newPassword', 'secreta1');
    type('confirmPassword', 'otra');

    await submit();

    expect(api.changePassword).not.toHaveBeenCalled();
    expect(element().textContent).toContain('Las contraseñas no coinciden');
  });
});
