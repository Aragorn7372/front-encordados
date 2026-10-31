import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthStore } from '../../../core/auth/store/auth.store';
import Login from './login';

describe('Login', () => {
  const auth = { login: vi.fn(), role: () => 'ENCORDER' };
  let fixture: ComponentFixture<Login>;
  let navigate: ReturnType<typeof vi.spyOn>;

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

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false })),
    );
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthStore, useValue: auth }],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(Login);
    await fixture.whenStable();
  });

  afterEach(() => vi.unstubAllGlobals());

  it('no envía el formulario vacío y marca los campos', async () => {
    await submit();

    expect(auth.login).not.toHaveBeenCalled();
    expect(element().textContent).toContain('Escribe tu usuario o email');
  });

  it('con credenciales válidas entra y va a la home del rol', async () => {
    auth.login.mockResolvedValue(undefined);
    type('username', 'rafa');
    type('password', '123456');

    await submit();

    expect(auth.login).toHaveBeenCalledWith({ username: 'rafa', password: '123456' });
    expect(navigate).toHaveBeenCalledWith('/mis-asignados');
  });

  it('vuelve a la página que pedía el usuario', async () => {
    auth.login.mockResolvedValue(undefined);
    fixture.componentRef.setInput('returnUrl', '/torneos/1');
    type('username', 'rafa');
    type('password', '123456');

    await submit();

    expect(navigate).toHaveBeenCalledWith('/torneos/1');
  });

  it('muestra el error del servidor en el formulario', async () => {
    auth.login.mockRejectedValue({
      status: 401,
      message: 'credenciales invalidas',
      fieldErrors: {},
    });
    type('username', 'rafa');
    type('password', 'mala');

    await submit();

    expect(element().querySelector('[role=alert]')?.textContent).toContain(
      'credenciales invalidas',
    );
    expect(navigate).not.toHaveBeenCalled();
  });
});
