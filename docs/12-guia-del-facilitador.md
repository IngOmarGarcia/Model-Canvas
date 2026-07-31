# 12 — Guía rápida del facilitador

Todo lo que necesitas para dar una sesión, en orden.

## Antes de la capacitación

1. **Entra** con tu usuario y contraseña. Si es la primera vez, la aplicación te pedirá cambiarla.
2. **Ve a Configuración → Inteligencia artificial** si vas a usar el análisis: elige proveedor,
   escribe el modelo, pega la clave, marca *Habilitar el análisis por IA* y guarda. Después pulsa
   **Probar conexión**: debe responder en verde con el nombre del modelo.
   - Si usas Ollama, la URL base es obligatoria y tiene que ser alcanzable desde el servidor.
3. **Ve a Usuarios** y da de alta a los participantes:
   - *Agregar participante* para uno.
   - *Alta masiva* para pegar una lista (un nombre por línea, o "Nombre, correo").
4. **Copia o descarga las credenciales** en cuanto aparezcan.
   > La contraseña temporal deja de poder mostrarse en cuanto el participante inicia sesión. Si se
   > pierde antes, usa *Reiniciar contraseña*; si se pierde después, también.

## Durante la capacitación

5. **Metodología** — proyecta esta vista para explicar los nueve módulos. Usa el *Recorrido* para ir
   uno por uno con las flechas, o el *Índice* para verlos todos. El paso vive en la dirección, así
   que puedes compartir el enlace de un módulo concreto.
6. **Monitoreo** — deja esta pantalla abierta. Verás el avance de cada persona, cuántas notas lleva
   y un punto que parpadea cuando está trabajando en ese momento.
   - El chip de la derecha indica el estado del canal: *En vivo* (SSE), *Actualizando* (respaldo por
     consultas) o *Sin conexión*.
   - *Abrir* muestra su lienzo en solo lectura. Nunca escribes en el lienzo de un participante.
   - *Proyectar* pasa a modo presentación.
7. **Modo presentación** — pantalla completa sin menús, pensada para proyector o para compartir
   pantalla en Meet o Zoom. El selector de arriba alterna entre tu lienzo y el de cualquier
   participante. Los controles se ocultan solos a los 3 segundos; muévete con el ratón para
   recuperarlos.
8. **Tu lienzo** — puedes construir el ejemplo en vivo. Atajos: `N` nueva nota, `Supr` eliminar la
   seleccionada, `F` pantalla completa, `Ctrl` `+` / `−` zoom.

## Análisis por IA

9. **Individual** — al abrir el lienzo de un participante, abajo aparece su análisis. *Forzar uno
   nuevo* ignora el análisis vigente y vuelve a consultar al proveedor.
10. **General** — la sección *Análisis* del menú analiza toda la capacitación buscando patrones
    comunes y vacíos que se repiten. Los lienzos se envían de forma anónima: el modelo no recibe
    nombres ni correos.

> Si el contenido de un lienzo no cambió, se reutiliza el análisis anterior en lugar de gastar una
> consulta. Mover o recolorar notas no cuenta como cambio; editar su texto sí.

## Después

11. **Usuarios → Descargar CSV** conserva las credenciales que aún no se han usado.
12. *Desactivar acceso* cierra la sesión de una persona de inmediato, sin borrar su trabajo.
    *Eliminar participante* borra también su lienzo, sus notas y sus análisis.

## Preguntas frecuentes

**Un participante no puede entrar.** Comprueba en Usuarios que no esté *Desactivado* y usa
*Reiniciar contraseña* para generarle una nueva.

**El monitoreo no se actualiza.** Mira el chip de estado. Si dice *Sin conexión*, revisa la red; la
aplicación reintenta sola y no se pierde nada al recuperarse.

**No aparece el botón de análisis.** Falta configurar el proveedor de IA, o está deshabilitado.

**Alcancé el límite de análisis.** Hay un tope por hora para evitar gastos accidentales. El mensaje
indica cuánto falta para poder volver a pedirlo.
