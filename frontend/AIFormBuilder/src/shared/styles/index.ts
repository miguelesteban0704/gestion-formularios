/**
 * Estilos compartidos — barrel de `src/shared/styles`.
 *
 * Punto de entrada único para tokens, roles de tema y mixins. El código nuevo
 * importa desde aquí (`@/shared/styles/index`) en vez de recordar los tres
 * módulos; el JS heredado sigue leyendo `var(--token)` directamente.
 *
 * `export *` NO reexporta los `default` (los `tokens` y `semantic` sueltos):
 * si los necesitas, importa el módulo concreto.
 */
export * from "./tokens";
export * from "./theme";
export * from "./mixins";
