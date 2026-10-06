// Para usar con @Transform(): quita espacios al inicio y al final de un texto,
// de modo que un valor con solo espacios cuente como vacío al validar.
export function recortarTexto({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}
