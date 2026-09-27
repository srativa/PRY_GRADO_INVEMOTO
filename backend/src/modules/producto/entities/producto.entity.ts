import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EmpresaEntity } from '../../empresa/entities/empresa.entity';
import { CategoriaEntity } from '../../categoria/entities/categoria.entity';
import { InventarioEntity } from './inventario.entity';

@Entity('producto')
export class ProductoEntity {
  @PrimaryGeneratedColumn({ name: 'id_producto', type: 'int', unsigned: true })
  idProducto: number;

  @Column({ name: 'id_empresa', type: 'int', unsigned: true })
  idEmpresa: number;

  @ManyToOne(() => EmpresaEntity)
  @JoinColumn({ name: 'id_empresa' })
  empresa: EmpresaEntity;

  @Column({ name: 'id_categoria', type: 'int', unsigned: true })
  idCategoria: number;

  @ManyToOne(() => CategoriaEntity)
  @JoinColumn({ name: 'id_categoria' })
  categoria: CategoriaEntity;

  @Column({ name: 'codigo_producto', type: 'varchar', length: 50 })
  codigoProducto: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  presentacion: string | null;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  descripcion: string | null;

  @Column({
    name: 'precio_venta',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  precioVenta: string;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  costo: string;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVO' })
  estado: string;

  // Lado inverso de la relación 1:1 — la FK vive en `inventario.id_producto`.
  @OneToOne(() => InventarioEntity, (inventario) => inventario.producto)
  inventario: InventarioEntity;
}
