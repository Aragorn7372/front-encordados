import { toFormData } from '../../../../core/http/form-data';
import { contiene } from '../../../../shared/utils/texto';
import { MaterialDto } from '../dto/material.dto';
import { Material, MaterialFormValue, TIPO_MATERIAL_LABEL } from '../model/material.model';

export function toMaterial(dto: MaterialDto): Material {
  return {
    id: dto.id,
    marca: dto.marca,
    modelo: dto.modelo,
    stock: dto.stock,
    precio: dto.precio,
    tipo: dto.materialType,
    imagen: dto.imageUrl,
  };
}

export function coincideMaterial(material: Material, busqueda: string): boolean {
  return contiene([material.marca, material.modelo, TIPO_MATERIAL_LABEL[material.tipo]], busqueda);
}

export function toMaterialFormValue(material: Material): MaterialFormValue {
  const { marca, modelo, stock, precio, tipo } = material;
  return { marca, modelo, stock, precio, tipo, imagen: null };
}

/**
 * Multipart de MaterialRequestDto / MaterialPatchDto. Marca, Modelo y Type van siempre (el backend
 * los exige también al editar). Stock y precio, también, salvo en el ± de stock (`soloStock`): ahí
 * va solo el stock y el precio no se envía, así el backend lo deja como esté (ENCUERDATU-69) y no
 * se pisa un precio cambiado por otra persona entre tanto.
 */
export function toMaterialFormData(
  value: MaterialFormValue,
  tournamentId?: string,
  soloStock = false,
): FormData {
  return toFormData({
    TournamentId: tournamentId,
    Marca: value.marca.trim(),
    Modelo: value.modelo.trim(),
    Stock: value.stock,
    Precio: soloStock ? undefined : value.precio,
    Type: value.tipo,
    Imagen: value.imagen,
  });
}
