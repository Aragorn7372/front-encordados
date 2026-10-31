import { HttpErrorResponse } from '@angular/common/http';
import { toAppError, AppError } from './app-error';

describe('toAppError', () => {
  it('sin conexión con el servidor', () => {
    const err = new HttpErrorResponse({ status: 0 });
    expect(toAppError(err)).toEqual<AppError>({
      status: 0,
      message: 'Sin conexión con el servidor',
      fieldErrors: {},
    });
  });

  it('demasiadas peticiones', () => {
    const err = new HttpErrorResponse({ status: 429 });
    expect(toAppError(err)).toEqual<AppError>({
      status: 429,
      message: 'Demasiadas peticiones, espera unos segundos',
      fieldErrors: {},
    });
  });

  it('FluentValidation', () => {
    const err = new HttpErrorResponse({
      status: 400,
      error: [
        { propertyName: 'name', errorMessage: 'El nombre es obligatorio' },
        { propertyName: 'email', errorMessage: 'El email no es válido' },
      ],
    });
    expect(toAppError(err)).toEqual<AppError>({
      status: 400,
      message: 'El nombre es obligatorio',
      fieldErrors: {
        name: ['El nombre es obligatorio'],
        email: ['El email no es válido'],
      },
    });
  });

  it('ValidationProblemDetails', () => {
    const err = new HttpErrorResponse({
      status: 400,
      error: {
        title: 'One or more validation errors occurred.',
        errors: { Username: ['Requerido'] },
      },
    });
    expect(toAppError(err)).toEqual<AppError>({
      status: 400,
      message: 'One or more validation errors occurred.',
      fieldErrors: { username: ['Requerido'] },
    });
  });

  it('{ message } (errores de negocio)', () => {
    const err = new HttpErrorResponse({ status: 409, error: { message: 'El usuario ya existe' } });
    expect(toAppError(err)).toEqual<AppError>({
      status: 409,
      message: 'El usuario ya existe',
      fieldErrors: {},
    });
  });

  it('{ error } (algunos endpoints de pedidos)', () => {
    const err = new HttpErrorResponse({ status: 400, error: { error: 'El pedido cancelado' } });
    expect(toAppError(err)).toEqual<AppError>({
      status: 400,
      message: 'El pedido cancelado',
      fieldErrors: {},
    });
  });

  it('texto plano', () => {
    const err = new HttpErrorResponse({ status: 400, error: 'Texto del servidor' });
    expect(toAppError(err)).toEqual<AppError>({
      status: 400,
      message: 'Texto del servidor',
      fieldErrors: {},
    });
  });

  it('cuerpo vacío o desconocido mensaje genérico', () => {
    const err = new HttpErrorResponse({ status: 500, error: {} });
    expect(toAppError(err)).toEqual<AppError>({
      status: 500,
      message: 'Ha ocurrido un error inesperado',
      fieldErrors: {},
    });
  });

  it('cuerpo nulo mensaje genérico', () => {
    const err = new HttpErrorResponse({ status: 500, error: null });
    expect(toAppError(err)).toEqual<AppError>({
      status: 500,
      message: 'Ha ocurrido un error inesperado',
      fieldErrors: {},
    });
  });

  it('sin cuerpo (undefined) mensaje genérico', () => {
    const err = new HttpErrorResponse({ status: 500 });
    expect(toAppError(err)).toEqual<AppError>({
      status: 500,
      message: 'Ha ocurrido un error inesperado',
      fieldErrors: {},
    });
  });

  it('texto vacío 401 mensaje genérico', () => {
    const err = new HttpErrorResponse({ status: 401, error: '' });
    expect(toAppError(err).message).toBe('Ha ocurrido un error inesperado');
  });
});
