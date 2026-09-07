import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EmpresaEntity } from '../../empresa/entities/empresa.entity';
import { RolEntity } from '../../rol/entities/rol.entity';

@Entity('usuario')
export class UsuarioEntity {
  @PrimaryGeneratedColumn({ name: 'id_usuario', type: 'int', unsigned: true })
  idUsuario: number;

  @Column({ name: 'id_empresa', type: 'int', unsigned: true })
  idEmpresa: number;

  @ManyToOne(() => EmpresaEntity)
  @JoinColumn({ name: 'id_empresa' })
  empresa: EmpresaEntity;

  @Column({ name: 'id_rol', type: 'int', unsigned: true })
  idRol: number;

  @ManyToOne(() => RolEntity)
  @JoinColumn({ name: 'id_rol' })
  rol: RolEntity;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Column({ type: 'varchar', length: 150, unique: true })
  correo: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVO' })
  estado: string;

  @CreateDateColumn({ name: 'fecha_creacion', type: 'datetime' })
  fechaCreacion: Date;
}
