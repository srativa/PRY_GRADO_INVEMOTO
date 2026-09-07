import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('empresa')
export class EmpresaEntity {
  @PrimaryGeneratedColumn({ name: 'id_empresa', type: 'int', unsigned: true })
  idEmpresa: number;

  @Column({ type: 'varchar', length: 30, nullable: true, unique: true })
  nit: string | null;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Column({ type: 'varchar', length: 250, nullable: true })
  direccion: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  telefono: string | null;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVO' })
  estado: string;

  @CreateDateColumn({ name: 'fecha_creacion', type: 'datetime' })
  fechaCreacion: Date;
}
