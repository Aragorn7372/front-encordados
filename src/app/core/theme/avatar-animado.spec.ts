import { TestBed } from '@angular/core/testing';
import { AvatarAnimado } from './avatar-animado';

describe('AvatarAnimado', () => {
  afterEach(() => localStorage.clear());

  it('empieza desactivado', () => {
    expect(TestBed.inject(AvatarAnimado).activo()).toBe(false);
  });

  it('se guarda en el dispositivo y se recuerda al volver', () => {
    const servicio = TestBed.inject(AvatarAnimado);
    servicio.toggle();
    TestBed.tick();
    expect(localStorage.getItem('etr_avatar_animado')).toBe('1');

    TestBed.resetTestingModule();
    expect(TestBed.inject(AvatarAnimado).activo()).toBe(true);
  });
});
