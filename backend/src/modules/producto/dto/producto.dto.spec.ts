import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateProductoDto } from './create-producto.dto';
import { UpdateProductoDto } from './update-producto.dto';
import { UpdateStockDto } from './update-stock.dto';
import { UpdateStockMinimoDto } from './update-stock-minimo.dto';
import { ListarProductosQueryDto } from './listar-productos.dto';
import { PRECIO_MAXIMO, STOCK_MAXIMO } from '../producto.constants';

// Valida igual que el ValidationPipe global de main.ts y devuelve los campos
// con error junto con la instancia ya transformada.
async function validar<T extends object>(
  clase: new () => T,
  datos: Record<string, unknown>,
) {
  const instancia = plainToInstance(clase, datos);
  const errores = await validate(instancia, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return { instancia, campos: errores.map((error) => error.property) };
}

const productoValido = {
  idCategoria: 3,
  codigoProducto: 'CASCO-001',
  nombre: 'Casco integral',
  precioVenta: 250000,
  costo: 160000,
};

describe('CreateProductoDto', () => {
  it('acepta un producto válido', async () => {
    const { campos } = await validar(CreateProductoDto, {
      ...productoValido,
      stockInicial: 5,
      stockMinimo: 2,
    });
    expect(campos).toEqual([]);
  });

  it('acepta precio y costo exactamente en el tope', async () => {
    const { campos } = await validar(CreateProductoDto, {
      ...productoValido,
      precioVenta: PRECIO_MAXIMO,
      costo: PRECIO_MAXIMO,
    });
    expect(campos).toEqual([]);
  });

  it('rechaza un precio de venta por encima del tope', async () => {
    const { campos } = await validar(CreateProductoDto, {
      ...productoValido,
      precioVenta: PRECIO_MAXIMO + 0.01,
    });
    expect(campos).toEqual(['precioVenta']);
  });

  it('rechaza un costo por encima del tope', async () => {
    const { campos } = await validar(CreateProductoDto, {
      ...productoValido,
      costo: PRECIO_MAXIMO + 1,
    });
    expect(campos).toEqual(['costo']);
  });

  it('rechaza precios negativos o con más de 2 decimales', async () => {
    const negativo = await validar(CreateProductoDto, {
      ...productoValido,
      precioVenta: -1,
    });
    const tresDecimales = await validar(CreateProductoDto, {
      ...productoValido,
      costo: 10.123,
    });
    expect(negativo.campos).toEqual(['precioVenta']);
    expect(tresDecimales.campos).toEqual(['costo']);
  });

  it('rechaza stock inicial y mínimo por encima del tope', async () => {
    const { campos } = await validar(CreateProductoDto, {
      ...productoValido,
      stockInicial: STOCK_MAXIMO + 1,
      stockMinimo: STOCK_MAXIMO + 1,
    });
    expect(campos.sort()).toEqual(['stockInicial', 'stockMinimo']);
  });

  it('no deja enviar idEmpresa: la empresa sale siempre del token', async () => {
    const { campos } = await validar(CreateProductoDto, {
      ...productoValido,
      idEmpresa: 2,
    });
    expect(campos).toEqual(['idEmpresa']);
  });
});

describe('UpdateProductoDto', () => {
  it('acepta una actualización parcial', async () => {
    const { campos } = await validar(UpdateProductoDto, {
      precioVenta: 1000,
      estado: 'INACTIVO',
    });
    expect(campos).toEqual([]);
  });

  it('rechaza precio o costo por encima del tope', async () => {
    const { campos } = await validar(UpdateProductoDto, {
      precioVenta: PRECIO_MAXIMO + 1,
      costo: PRECIO_MAXIMO + 1,
    });
    expect(campos.sort()).toEqual(['costo', 'precioVenta']);
  });

  it('rechaza un estado inválido', async () => {
    const { campos } = await validar(UpdateProductoDto, { estado: 'BORRADO' });
    expect(campos).toEqual(['estado']);
  });
});

describe('UpdateStockDto', () => {
  it('acepta stock y motivo válidos', async () => {
    const { campos } = await validar(UpdateStockDto, {
      stockActual: 4,
      motivo: 'Conteo físico',
    });
    expect(campos).toEqual([]);
  });

  it('exige motivo', async () => {
    const { campos } = await validar(UpdateStockDto, { stockActual: 4 });
    expect(campos).toEqual(['motivo']);
  });

  it('rechaza un motivo vacío o con solo espacios', async () => {
    const vacio = await validar(UpdateStockDto, { stockActual: 4, motivo: '' });
    const espacios = await validar(UpdateStockDto, {
      stockActual: 4,
      motivo: '    ',
    });
    expect(vacio.campos).toEqual(['motivo']);
    expect(espacios.campos).toEqual(['motivo']);
  });

  it('recorta los espacios del motivo', async () => {
    const { instancia } = await validar(UpdateStockDto, {
      stockActual: 4,
      motivo: '  Conteo físico  ',
    });
    expect(instancia.motivo).toBe('Conteo físico');
  });

  it('rechaza un motivo de más de 255 caracteres', async () => {
    const { campos } = await validar(UpdateStockDto, {
      stockActual: 4,
      motivo: 'x'.repeat(256),
    });
    expect(campos).toEqual(['motivo']);
  });

  it('rechaza stock negativo, decimal o por encima del tope', async () => {
    for (const stockActual of [-1, 1.5, STOCK_MAXIMO + 1]) {
      const { campos } = await validar(UpdateStockDto, {
        stockActual,
        motivo: 'Conteo',
      });
      expect(campos).toEqual(['stockActual']);
    }
  });

  it('ya no acepta stockMinimo en este endpoint', async () => {
    const { campos } = await validar(UpdateStockDto, {
      stockActual: 4,
      motivo: 'Conteo',
      stockMinimo: 3,
    });
    expect(campos).toEqual(['stockMinimo']);
  });
});

describe('UpdateStockMinimoDto', () => {
  it('acepta 0 y el tope', async () => {
    const cero = await validar(UpdateStockMinimoDto, { stockMinimo: 0 });
    const tope = await validar(UpdateStockMinimoDto, {
      stockMinimo: STOCK_MAXIMO,
    });
    expect(cero.campos).toEqual([]);
    expect(tope.campos).toEqual([]);
  });

  it('rechaza valores negativos, decimales, ausentes o por encima del tope', async () => {
    for (const datos of [
      { stockMinimo: -1 },
      { stockMinimo: 2.5 },
      { stockMinimo: STOCK_MAXIMO + 1 },
      {},
    ]) {
      const { campos } = await validar(UpdateStockMinimoDto, datos);
      expect(campos).toEqual(['stockMinimo']);
    }
  });
});

describe('ListarProductosQueryDto', () => {
  it('acepta filtros válidos y convierte idCategoria a número', async () => {
    const { instancia, campos } = await validar(ListarProductosQueryDto, {
      nombre: 'casco',
      codigo: 'CAS',
      idCategoria: '3',
      estado: 'ACTIVO',
      disponibilidad: 'BAJO_STOCK',
    });
    expect(campos).toEqual([]);
    expect(instancia.idCategoria).toBe(3);
  });

  it('acepta una consulta sin filtros', async () => {
    const { campos } = await validar(ListarProductosQueryDto, {});
    expect(campos).toEqual([]);
  });

  it('recorta los espacios de nombre y código', async () => {
    const { instancia } = await validar(ListarProductosQueryDto, {
      nombre: '  casco  ',
      codigo: ' CAS ',
    });
    expect(instancia.nombre).toBe('casco');
    expect(instancia.codigo).toBe('CAS');
  });

  it('rechaza un estado o una disponibilidad inválidos', async () => {
    const estado = await validar(ListarProductosQueryDto, { estado: 'X' });
    const disponibilidad = await validar(ListarProductosQueryDto, {
      disponibilidad: 'LLENO',
    });
    expect(estado.campos).toEqual(['estado']);
    expect(disponibilidad.campos).toEqual(['disponibilidad']);
  });

  it('rechaza un idCategoria no numérico, cero o negativo', async () => {
    for (const idCategoria of ['abc', '0', '-2', '1.5']) {
      const { campos } = await validar(ListarProductosQueryDto, {
        idCategoria,
      });
      expect(campos).toEqual(['idCategoria']);
    }
  });

  it('rechaza parámetros desconocidos', async () => {
    const { campos } = await validar(ListarProductosQueryDto, {
      idEmpresa: '2',
    });
    expect(campos).toEqual(['idEmpresa']);
  });
});
