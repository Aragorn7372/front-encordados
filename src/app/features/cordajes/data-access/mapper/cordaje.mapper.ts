import { toFormData } from '../../../../core/http/form-data';
import { contiene } from '../../../../shared/utils/texto';
import { CuerdaDto } from '../dto/cordaje.dto';
import { Cordaje, CordajeFormValue, FORMATO_LABEL, TIPO_LABEL } from '../model/cordaje.model';

export function toCordaje(dto: CuerdaDto): Cordaje {
  return {
    id: dto.id,
    marca: dto.marca,
    modelo: dto.modelo,
    stock: dto.stock,
    precio: dto.precio,
    formato: dto.stringFormat,
    tipo: dto.stringsType,
    calibre: dto.calibre,
    imagen: dto.imageUrl,
  };
}

/** Por marca, modelo o tipo, también en español («tripa», «poliéster»). */
export function coincideCordaje(cordaje: Cordaje, busqueda: string): boolean {
  return contiene(
    [cordaje.marca, cordaje.modelo, TIPO_LABEL[cordaje.tipo], FORMATO_LABEL[cordaje.formato]],
    busqueda,
  );
}

export function toCordajeFormValue(cordaje: Cordaje): CordajeFormValue {
  const { marca, modelo, stock, precio, formato, tipo, calibre } = cordaje;
  return { marca, modelo, stock, precio, formato, tipo, calibre, imagen: null };
}

/**
 * Multipart de CuerdaRequestDto / CuerdaPatchDto. Siempre todos los campos: así una edición
 * no depende de qué trata el backend como «sin cambios».
 */
export function toCuerdaFormData(value: CordajeFormValue, tournamentId?: string): FormData {
  return toFormData({
    TournamentId: tournamentId,
    Marca: value.marca.trim(),
    Modelo: value.modelo.trim(),
    Stock: value.stock,
    Precio: value.precio,
    StringFormat: value.formato,
    StringsType: value.tipo,
    Calibre: value.calibre,
    Imagen: value.imagen,
  });
}
