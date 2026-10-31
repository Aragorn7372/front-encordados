import {
  LineStatusLabelPipe,
  PaymentLabelPipe,
  RoleLabelPipe,
  TournamentStatusPipe,
} from './status-labels.pipe';

describe('pipes de etiquetas', () => {
  it('traduce el estado de línea, incluida la errata del backend', () => {
    expect(new LineStatusLabelPipe().transform('DELIVERED_TOpLAYER')).toBe('Entregado');
  });

  it('traduce el estado de pago, incluida la errata del backend', () => {
    expect(new PaymentLabelPipe().transform('FINNISH_TOURNAMENT')).toBe('Cerrado por torneo');
  });

  it('un valor nuevo del backend se muestra tal cual en vez de romper la pantalla', () => {
    expect(new PaymentLabelPipe().transform('REEMBOLSADO' as never)).toBe('REEMBOLSADO');
  });

  it('traduce el rol', () => {
    expect(new RoleLabelPipe().transform('ENCORDER')).toBe('Encordador');
  });

  it('calcula la etiqueta del estado del torneo', () => {
    const pipe = new TournamentStatusPipe();
    expect(pipe.transform({ startTournament: '2000-01-01', endTournament: '2000-01-02' })).toBe(
      'Cerrado',
    );
  });
});
