import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ProductoEntity } from './producto.entity';
import { UsuarioEntity } from '../../usuario/entities/usuario.entity';
import {
  TipoMovimiento,
  TipoReferencia,
} from '../../../common/enums/movimiento-inventario.enum';

// Historial del inventario: cada vez que cambia el stock, aquí queda anotado
// quién lo hizo, cuánto cambió, cuándo y por qué (RF-11, RF-14, RNF-05).
@Entity('movimiento_inventario')
export class MovimientoInventarioEntity {
  @PrimaryGeneratedColumn({
    name: 'id_movimiento',
    type: 'int',
    unsigned: true,
  })
  idMovimiento: number;

  @Column({ name: 'id_empresa', type: 'int', unsigned: true })
  idEmpresa: number;

  @Column({ name: 'id_usuario', type: 'int', unsigned: true })
  idUsuario: number;

  @ManyToOne(() => UsuarioEntity)
  @JoinColumn({ name: 'id_usuario' })
  usuario: UsuarioEntity;

  @Column({ name: 'id_producto', type: 'int', unsigned: true })
  idProducto: number;

  @ManyToOne(() => ProductoEntity)
  @JoinColumn({ name: 'id_producto' })
  producto: ProductoEntity;

  @Column({ name: 'tipo_movimiento', type: 'varchar', length: 30 })
  tipoMovimiento: TipoMovimiento;

  // Si el número es positivo, entraron unidades; si es negativo, salieron.
  @Column({ type: 'int' })
  cantidad: number;

  @Column({
    name: 'precio_unitario',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  precioUnitario: string | null;

  @CreateDateColumn({ name: 'fecha', type: 'datetime' })
  fecha: Date;

  @Column({ name: 'tipo_referencia', type: 'varchar', length: 30 })
  tipoReferencia: TipoReferencia;

  @Column({
    name: 'referencia_id',
    type: 'int',
    unsigned: true,
    nullable: true,
  })
  referenciaId: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  motivo: string | null;
}
