/** Contrato del backend para la gestión de cuentas (/api/user y /api/export). */

/** UserWithIdDto. */
export interface UsuarioDto {
  userId: string;
  username: string;
  imageUrl: string;
  name: string;
  email: string;
  role: string;
  tournamentId: string | null;
  bonos: number;
}

/** ExportEntityInfo. */
export interface EntidadBackupDto {
  name: string;
  recordCount: number;
  fileName: string;
}

/** ExportManifestDto: lo que trae un zip de backup, sin importarlo. */
export interface ManifestDto {
  version: string;
  exportedAt: string;
  description: string;
  entities: EntidadBackupDto[];
}
