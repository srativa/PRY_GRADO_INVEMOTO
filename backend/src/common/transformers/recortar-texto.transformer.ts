// Quita los espacios que sobran al inicio y al final de un texto. Así, si
// alguien escribe solo espacios, el sistema lo toma como un campo vacío.
export function recortarTexto({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}
