# Prompt para Google AI Studio — Simulador Retail Pro Prism

> Copia TODO lo que hay debajo de la línea y pégalo en Google AI Studio junto con
> el ZIP del proyecto.

---

Vas a trabajar sobre el proyecto **Simulador Retail Pro Prism** (Vite + React + TypeScript +
Express) que te adjunto. Es un simulador de la caja de Retail Pro Prism para capacitar a los
colaboradores de tienda de SuperPet.

## Regla número uno: no rompas las pantallas del POS

Los archivos de **`src/screens/`** son réplicas del sistema real. Su valor didáctico es
parecerse a Retail Pro, no verse bonitos. **No los rediseñes, no les cambies la paleta, no les
cambies los identificadores (`id=`) ni la disposición.** Si necesitas tocar uno, cambia lo
mínimo y di exactamente qué cambiaste y por qué.

Los identificadores de los elementos (`pos-btn-pay`, `pay-btn-apply`, `modal-auth-ok`…) son el
contrato entre las pantallas, los pasos de `src/data/modules.ts` y las pruebas de `tests/`.
Cambiar uno rompe las tres cosas a la vez.

## Regla número dos: nada de archivos basura

Este proyecto ya viene limpio. **Al terminar, borra todo lo que no se use**, y sobre todo:

- **No generes archivos duplicados con sufijo** (`server-1.ts`, `README-1.md`,
  `vite,config-1.ts`, `firebase-applet-config,example-1.json`…). En la entrega anterior
  aparecieron 14 de estos y hubo que borrarlos a mano. Si necesitas reescribir un archivo,
  **sobrescríbelo**.
- **No crees carpetas de recursos que nadie importa.** Ya se eliminó `public/icons/` (4,8 MB de
  PNG que ningún archivo importaba: las pantallas del POS cargan sus iconos desde Firebase
  Storage vía `src/config/icons.ts`). No la vuelvas a crear.
- **No dejes fragmentos sueltos** tipo `fix.ts` (un trozo de inicialización de Firebase que ya
  estaba dentro de `server.ts`).
- No añadas `bun.lock` si el proyecto usa npm.

Antes de entregar, revisa la carpeta entera y comprueba que **cada archivo lo importa alguien o
es documentación viva**. Si no, bórralo y dilo en tu resumen.

## Qué se acaba de cambiar (no lo deshagas)

Esta es la ronda 9. Los cambios que ya están hechos y probados:

1. **Iconos.** Los 32 badges de `src/assets/iconos/modulos/` y `errores/` son ahora **discos
   perfectos**. Se arregló el icono final (`modulos/8.webp`), donde el recorte de fondo se había
   comido el blanco del perrito y sobre el azul marino el perro desaparecía. El script que lo
   hace es `scripts/redondear-iconos.py` (se ejecuta a mano, no es parte del build). Las
   `portadas/` NO se tocan: son line-art y recortarlas les cortaría los detalles.

2. **Anti-atascos.** Ninguna combinación de clics puede dejar un módulo sin salida:
   - Botón **«Reacomodar pantallas»** en la barra del simulador: recoloca la pantalla del paso
     en curso sin retroceder pasos, sin borrar errores y sin gastar intento.
   - El `action` de cada paso corre dentro de `try/catch` y `advancingRef` tiene una suelta de
     emergencia, para que un fallo no congele la aplicación.
   - Lo verifica `tests/e2e-atascos.mjs`.

3. **Dos intentos por módulo.** Terminar gasta uno; **salir al menú a medias no gasta ninguno**
   (se guarda el paso, las pantallas y los errores, y al volver retoma ahí); «Volver a empezar»
   sí gasta uno, porque borra los errores. El límite lo hace cumplir el **servidor**.

4. **Datos.** El catálogo de **productos y clientes es global** (`app/catalog_global`), lo ven
   todas las cuentas. La **conexión con Google Sheets es una sola y solo la toca el
   administrador** (`app/sheet_global`, endpoints con `requireAdmin`). Los datos de los módulos y
   las reglas de nota siguen siendo de cada entrenador.

5. **Firestore.** `GET /api/health` dice si está guardando en `firestore` o en `local`, y el
   panel del administrador muestra una franja roja cuando es local. Hay migración automática del
   archivo local a Firestore la primera vez. Guía en `docs/conectar-firebase.md`.

6. **Ranking.** `GET /api/ranking` devuelve los diez mejores de toda la empresa (módulos
   completados → promedio → tiempo), sin publicar ningún DNI, y se ve desde «Ver el ranking» en
   el menú del colaborador.

7. **Celular.** La barra del simulador recorta el título y agrupa «Reacomodar» y «Volver a
   empezar» tras un menú «⋯»; los datos del caso van a una columna. Todo está cubierto por
   `tests/e2e-movil.mjs`, que exige que no haya desbordes, ni texto cortado, ni botones por
   debajo de 40 px, ni una barra de más de 72 px de alto.

8. **Relato.** Preámbulo personalizado (`src/components/PreambuloHistoria.tsx`), frase de
   enganche entre casos (`enlace` en `src/data/scenarios.ts`), menú agrupado en mañana / tarde /
   cierre, y cierre del turno con celebración a pantalla completa o mensaje de ánimo.

## Cómo comprobar que no rompiste nada

```bash
npm install
npm run lint                      # tsc --noEmit, tiene que salir limpio
npm run build

node tests/e2e-iconos.mjs         # 32 iconos: discos, sin agujeros dentro
node tests/e2e-datos.mjs          # qué es compartido y quién puede tocar Sheets
node tests/e2e-ranking.mjs        # orden del ranking y que no se publique ningún DNI
node tests/e2e-camino-feliz.mjs   # los 14 módulos se terminan
node tests/e2e-intentos.mjs       # los dos intentos y el guardado a medias
node tests/e2e-movil.mjs          # todas las pantallas en dos tamaños de teléfono
node tests/e2e-atascos.mjs        # ningún error atasca un módulo (tarda ~1 h)
```

Las pruebas usan Playwright con el Chromium que ya está instalado en el entorno. **Si una prueba
falla, arregla el código, no la prueba.** Si de verdad crees que la prueba está mal, dilo
explícitamente y explica por qué antes de tocarla.

## Cómo quiero que trabajes

- **Español** en todo: código, comentarios, textos de la interfaz y tu resumen.
- Comentarios que expliquen **por qué**, no qué. Los que ya están en el proyecto son el modelo:
  cuentan el problema que resolvían.
- Nada de dejar cosas a medias. Si algo no se puede hacer, dilo claramente en vez de entregar
  una versión parcial silenciosamente.
- Al terminar, un resumen corto: qué cambiaste, qué archivos borraste y qué pruebas corriste con
  su resultado real (no "debería funcionar").

## Lo que te toca hacer ahora

<!-- ESCRIBE AQUÍ LO QUE QUIERES EN ESTA RONDA -->

