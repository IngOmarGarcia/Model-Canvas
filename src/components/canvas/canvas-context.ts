'use client';

import { createContext, useContext } from 'react';

/**
 * Escala actual del lienzo. Las notas la necesitan porque dnd-kit entrega el
 * desplazamiento en píxeles de pantalla: dentro de un contenedor escalado hay
 * que dividirlo por la escala para que la nota siga al puntero.
 */
export const CanvasScaleContext = createContext(1);

export function useCanvasScale() {
  return useContext(CanvasScaleContext);
}
