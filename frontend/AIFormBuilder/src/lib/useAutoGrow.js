import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

/**
 * Texto editable que crece con su contenido, en vez de esconderlo.
 *
 * Por qué existe: para editar un título o una descripción a los que el usuario
 * no ha puesto ningún límite, `<input>` no sirve — es una línea con scroll
 * horizontal, así que el texto largo sigue sin verse aunque no lleve
 * `truncate`. Y un `<textarea>` con `rows` fijo tampoco: con `rows={3}` una
 * descripción de dos líneas deja hueco, y una de diez se corta igual. Este
 * textarea mide su contenido y ajusta su altura, así que se ve entero siempre
 * y ocupa lo que ocupa.
 *
 * Por qué engancha el ResizeObserver en el REF CALLBACK y no en un efecto: el
 * builder hace `return <PageLoader/>` mientras carga, así que el textarea no
 * existe en el primer render. Un efecto normal correría en ese primer render,
 * no encontraría el nodo, y no volvería a correr nunca: el autogrow no
 * reacciona ni a escribir ni a rotar. El ref callback es el único sitio que
 * se activa cuando el elemento aparece de verdad.
 *
 * Por qué `useLayoutEffect` y no `useEffect` para el ajuste: tiene que ocurrir
 * ANTES de que el navegador pinte. Con `useEffect` hay un fotograma en el que
 * el textarea sale con la altura de `rows` y el texto asoma por debajo antes de
 * crecer; se ve un parpadeo al abrir el builder o al pegar un texto largo.
 *
 * `overflow: hidden` no es decorativo: si el navegador nunca deja que
 * `scrollHeight` dé el alto exacto (fuentes web que cargan tarde, zoom), se ve
 * la barra de scroll por dentro de un campo que se supone autoajustado.
 *
 * `rows` no se fija aquí: cada sitio decide (un título no debería aceptar Enter
 * como salto de línea, una descripción sí).
 */
export function useAutoGrow(value, { maxRows = null } = {}) {
  const nodoRef = useRef(null);
  const observerRef = useRef(null);
  const ultimoAncho = useRef(0);

  /* Stable entre renders a propósito: si fuera una arrow nueva cada vez,
     React la llamaría con null y luego con el nodo en cada repintado, y el
     observer se desengancharía y volvería a engancharse sin parar. */
  const ajustar = useCallback(() => {
    const el = nodoRef.current;
    if (!el) return;
    /* Al ancho del contenido, no al actual: si el texto pasa a ser más corto
       que la caja, `scrollHeight` seguiría dando el alto viejo y el campo no
       encogería nunca. */
    el.style.height = "auto";
    const alto = el.scrollHeight;
    if (maxRows) {
      /* `line-height` real del getComputedStyle, no un estimado: si se calcula
         mal, el tope cae entre dos líneas y parte un texto a la mitad. */
      const lh = parseFloat(getComputedStyle(el).lineHeight) || 20;
      const tope = maxRows * lh;
      if (alto > tope) {
        el.style.height = `${tope}px`;
        el.style.overflowY = "auto";
        return;
      }
    }
    el.style.height = `${alto}px`;
    el.style.overflowY = "hidden";
  }, [maxRows]);

  /* Antes de pintar: sin esto se ve el textarea con la altura de `rows` y el
     texto asomando por debajo durante un fotograma. */
  useLayoutEffect(ajustar, [ajustar, value]);

  /* La fuente web carga después del primer pintado y cambia `scrollHeight`.
     Sin esto, el alto se queda calculado con la fuente de reserva y el texto se
     sale de la caja al cargar la buena. */
  useEffect(() => {
    if (!nodoRef.current || !document.fonts?.ready) return;
    let vivo = true;
    document.fonts.ready.then(() => {
      if (vivo) ajustar();
    });
    return () => {
      vivo = false;
    };
  }, [ajustar, value]);

  const ref = useCallback((nodo) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    nodoRef.current = nodo;
    if (!nodo || typeof ResizeObserver === "undefined") return;

    /* Reflujo: rotar el móvil o redimensionar cambia el ancho, el texto
       reenvuelve y el alto necesario cambia.
       Se observa el PROPIO textarea y se filtra por ANCHO. Si se observara su
       altura, cada ajuste dispararía el observer otra vez y se realimentaría en
       bucle. Y si se observara al padre, no serviría: el padre puede no cambiar
       de ancho (en el builder la tarjeta conserva el suyo mientras el canvas se
       estrecha) y entonces el texto se saldría de la caja sin que nadie se
       entere. */
    ultimoAncho.current = nodo.getBoundingClientRect().width;
    const ro = new ResizeObserver(() => {
      const ancho = nodo.getBoundingClientRect().width;
      /* +0.5px: el reflujo mueve el ancho décimas y no merece reajustar. */
      if (Math.abs(ancho - ultimoAncho.current) < 0.5) return;
      ultimoAncho.current = ancho;
      ajustar();
    });
    ro.observe(nodo);
    observerRef.current = ro;
    ajustar();
  }, [ajustar]);

  /* El nodo puede desaparecer sin que el ref callback se dispare (si el
     componente se desmonta, React llama al ref con null: eso ya está cubierto).
     Esto es la red de seguridad por si se queda huérfano. */
  useEffect(() => () => observerRef.current?.disconnect(), []);

  return ref;
}
