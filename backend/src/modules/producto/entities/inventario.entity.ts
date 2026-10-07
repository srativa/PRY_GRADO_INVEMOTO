import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProductoEntity } from './producto.entity';

@Entity('inventario')
export class InventarioEntity {
  @PrimaryGeneratedColumn({
    name: 'id_inventario',
    type: 'int',
    unsigned: true,
  })
  idInventario: number;

  @Column({ name: 'id_producto', type: 'int', unsigned: true, unique: true })
  idProducto: number;

  // Cada inventario pertenece a un solo producto, y es esta tabla la que
  // guarda a qué producto corresponde.
  @OneToOne(() => ProductoEntity)
  @JoinColumn({ name: 'id_producto' })
  producto: ProductoEntity;

  @Column({
    name: 'stock_actual',
    type: 'int',
    unsigned: true,
    default: 0,
  })
  stockActual: number;

  @Column({
    name: 'stock_minimo',
    type: 'int',
    unsigned: true,
    nullable: true,
  })
  stockMinimo: number | null;

  @UpdateDateColumn({
    name: 'fecha_actualizacion',
    type: 'datetime',
  })
  fechaActualizacion: Date;
}
