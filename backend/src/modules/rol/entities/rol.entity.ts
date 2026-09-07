import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { RolCodigo } from '../../../common/enums/rol-codigo.enum';

@Entity('rol')
export class RolEntity {
  @PrimaryGeneratedColumn({ name: 'id_rol', type: 'int', unsigned: true })
  idRol: number;

  @Column({ type: 'varchar', length: 20, unique: true })
  codigo: RolCodigo;

  @Column({ type: 'varchar', length: 50 })
  nombre: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  descripcion: string | null;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVO' })
  estado: string;
}
