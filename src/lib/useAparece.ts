import { useCallback, useEffect, useRef } from "react";

/** Ref de callback: añade la clase `visible` cuando el bloque entra en pantalla, una sola vez.
 *  Funciona aunque el bloque se monte más tarde (por ejemplo, tras cargar datos). */
export function useAparece<T extends HTMLElement>(alVer?: () => void) {
  const io = useRef<IntersectionObserver | null>(null);
  const callback = useRef(alVer);
  useEffect(() => {
    callback.current = alVer;
  });

  return useCallback((el: T | null) => {
    io.current?.disconnect();
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      el.classList.add("visible");
      callback.current?.();
      return;
    }
    io.current = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          el.classList.add("visible");
          callback.current?.();
          io.current?.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.current.observe(el);
  }, []);
}
