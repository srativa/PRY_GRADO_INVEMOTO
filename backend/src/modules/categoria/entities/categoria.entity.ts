import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('categoria')
export class CategoriaEntity {
  @PrimaryGeneratedColumn({
    name: 'id_categoria',
    type: 'int',
    unsigned: true,
  })
  idCategoria: number;

  @Column({ name: 'id_empresa', type: 'int', unsigned: true })
  idEmpresa: number;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  descripcion: string | null;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVO' })
  estado: string;
}
