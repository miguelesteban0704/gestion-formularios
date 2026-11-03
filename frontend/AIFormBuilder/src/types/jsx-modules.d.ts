/* El repo es JS/JSX con tsconfig acotado a .ts/.tsx (allowJs off).
   Este shim permite que el subsistema TS importe el resto del proyecto
   (.jsx/.js/.css) sin que `tsc --noEmit` falle. Las declaraciones sin
   cuerpo valen `any`: lo que se persigue es poder escribir .tsx, no
   tipar el código JS heredado. */
declare module "*.jsx";
declare module "*.js";
declare module "*.css";