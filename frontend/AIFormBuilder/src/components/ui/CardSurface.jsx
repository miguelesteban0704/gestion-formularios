/**
 * Las capas de fondo de una tarjeta: mesh, grano y filo interior.
 *
 * Existe para que el bento del panel, las tarjetas de métricas y las de
 * formularios no se separen con el tiempo. Las tres pintan exactamente las
 * mismas capas y en el mismo orden; lo único que cambia es el acento, que cada
 * una pone en `--card-accent` desde su elemento padre.
 *
 * Es puramente decorativo: no recibe estado, no recibe callbacks y todo lo que
 * pinta va marcado `aria-hidden`, porque para un lector de pantalla esto no
 * existe. La superficie real la pone `card-surface` (ver `src/index.css`), que
 * es quien define el borde, el fondo y las sombras.
 *
 * El orden importa y es el que da el relieve: el mesh va pegado a la tarjeta,
 * el grano encima (para que se mezcle con el mesh, no con el texto) y el filo
 * interior el último, porque es el que dibuja el borde de cristal.
 *
 * `mesh={false}` para las superficies que ya son un degradado (la insignia):
 * un mesh encima de un gradiente plano se lee como una mancha, no como luz.
 */
export function CardSurface({ mesh = true, radiusClass = "rounded-[var(--card-radius)]" }) {
  return (
    <>
      {mesh && (
        <div aria-hidden="true" className={`card-mesh pointer-events-none absolute inset-0 ${radiusClass}`} />
      )}
      <div aria-hidden="true" className={`card-grain pointer-events-none absolute inset-0 ${radiusClass}`} />
      <div aria-hidden="true" className={`card-rim pointer-events-none absolute inset-0 ${radiusClass}`} />
    </>
  );
}
