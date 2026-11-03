import { useEffect, useRef, useState } from "react";

/**
 * Anima el recambio de un listado filtrado sin librerías externas.
 *
 * Compara los items actuales con los previos por id: los que salen se
 * mantienen en `renderedItems` marcados en `exitingIds` durante su
 * animación de salida y se retiran después; los que entran se anuncian
 * en `enteringIds` para escalonarlos. Los que permanecen no se re-animan
 * (conservan nodo y clases por key estable).
 *
 * @param {Array} items lista actual ya filtrada
 * @param {object} options { duration = 320, stagger = 30, getId }
 * @returns {{ renderedItems: Array, exitingIds: Set, enteringIds: Set }}
 */
export function useFilterAnimation(
  items,
  { duration = 320, stagger = 30, getId = (it) => it?.id ?? it?._id } = {},
) {
  const [rendered, setRendered] = useState(items);
  const [exitingIds, setExitingIds] = useState(() => new Set());
  const [enteringIds, setEnteringIds] = useState(() => new Set());
  const prevMap = useRef(new Map());
  const timer = useRef(null);
  // getId puede ser una flecha nueva en cada render: se publica por ref en
  // un efecto (nunca durante el render) para no re-disparar timeouts.
  const getIdRef = useRef(getId);
  useEffect(() => {
    getIdRef.current = getId;
  });

  useEffect(() => {
    const at = (it) => getIdRef.current(it);
    const nextIds = new Set(items.map(at));
    const prev = prevMap.current;
    const exiting = [...prev.keys()].filter((id) => !nextIds.has(id));
    const entering = items.filter((it) => !prev.has(at(it)));

    // La ref siempre refleja lo último comprometido, cambie o no el DOM.
    prevMap.current = new Map(items.map((it) => [at(it), it]));

    if (exiting.length === 0) {
      setExitingIds(new Set());
      setEnteringIds(new Set(entering.map(at)));
      // Solo se toca rendered si cambió el contenido (evita re-animar).
      setRendered((current) => {
        if (
          current.length === items.length &&
          current.every((it, i) => at(it) === at(items[i]))
        ) {
          return current;
        }
        return items;
      });
      return undefined;
    }

    const exitingItems = exiting.map((id) => prev.get(id)).filter(Boolean);
    setRendered([...items, ...exitingItems]);
    setExitingIds(new Set(exiting));
    setEnteringIds(new Set(entering.map(at)));

    clearTimeout(timer.current);
    timer.current = setTimeout(
      () => {
        setRendered(items);
        setExitingIds(new Set());
        setEnteringIds(new Set());
      },
      duration + stagger * exiting.length + 50,
    );
    return () => clearTimeout(timer.current);
  }, [items, duration, stagger]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return { renderedItems: rendered, exitingIds, enteringIds };
}
