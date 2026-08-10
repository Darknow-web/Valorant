# Prompt para Google AI Studio — Simulador Retail Pro Prism

> Copia TODO lo que hay debajo de la línea y pégalo en Google AI Studio junto con
> el ZIP del proyecto.

---

Vas a trabajar sobre el proyecto **Simulador Retail Pro Prism** (Vite + React + TypeScript +
Express) que te adjunto. Es un simulador de la caja de Retail Pro Prism para capacitar a los
colaboradores de tienda de SuperPet.

## Regla cero: este ZIP reemplaza lo que haya

El ZIP viene **plano**: `package.json`, `index.html`, `src/`, `tests/` y `server.ts` están en la
raíz misma, sin ninguna carpeta envolvente. Esa es la versión buena y la única que vale.

**Reemplaza con ella todo lo que ya esté en el proyecto.** Si al cargarlo queda algo duplicado
—archivos con sufijo (`server-1.ts`, `App-1.tsx`), una carpeta repetida, restos de la versión
anterior que este ZIP ya no trae— **quédate solo con lo que viene en el ZIP y borra el resto**.
Ante cualquier duda entre dos versiones del mismo archivo, gana la del ZIP.

Y dime en tu resumen qué borraste, para saber qué había de más.

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

Esta es la **ronda 10**, y va entera sobre una idea: **el colaborador no aprueba un módulo
haciendo el proceso mal, y hacer el proceso bien nunca se le castiga**. Todo lo de abajo está
hecho y verificado con pruebas que corren de verdad.

1. **Se descuenta por salirse del proceso.** Cualquier acción fuera del flujo del caso resta un
   punto: entrar a otra pantalla, cobrar por donde no toca, imprimir antes de tiempo. **No**
   resta rellenar un dato, repetir un paso ya cumplido ni usar «Reacomodar pantallas». Y resta
   **uno**, no dos: medio centenar de elementos llaman a `handleInteract` dos veces por clic
   (desde el envoltorio `Interactive` y desde el `onClick`), así que hay un antirrebote de 400 ms
   en `src/store/SimulatorContext.tsx`. **No lo quites.**

2. **Todo dato que la ficha del caso muestra se valida.** Los 47 datos de los guiones —código
   del producto, documento del cliente, importe, código de autorización del agregador, los cinco
   campos del cliente nuevo, la nota del desembolso— se comprueban de verdad. Los textos se
   comparan sin distinguir mayúsculas ni tildes (`normalizarTexto`); los documentos e importes,
   exactos. La ficha y la validación leen del **mismo sitio**, para que si el entrenador cambia
   un dato en el panel, la validación cambie con él.

3. **No se aprueba cobrando por donde no toca.** Un pedido de Rappi ya no se cierra cobrado en
   efectivo, ni una venta con tarjeta cobrada en efectivo, ni el pago mixto con un solo pago. Los
   validadores de cierre están en `src/data/modules.ts` (`cobradoCon`, `cubiertoCon`).

4. **Deshacer un cobro ya no mata el módulo.** Era el fallo reportado: se cobraba con Rappi, se
   anulaba el pago y no había forma de volver a cobrarle al agregador. Dos causas se sumaban, y
   las dos están arregladas:
   - El pago lo crea ahora **la pantalla** (`PaymentScreen.tsx`), no la `action` del paso. Las
     `action` solo corren cuando el paso **avanza**, nunca al repetir uno ya cumplido: cualquier
     cosa importante creada ahí es un callejón sin salida esperando a pasar.
   - Y la forma de pago vuelve a Efectivo, porque los botones RAPPI y PEDIDOS YA solo se dibujan
     con Efectivo seleccionado: dejándola en «RAPPI» desaparecían de la pantalla para siempre.
   - De la misma familia: **«Anular» repone el crédito de tienda** que consumió. Antes lo
     evaporaba y el Módulo 11 se quedaba sin saldo y sin forma de recuperarlo.

5. **El cobro al agregador ya no se convierte en efectivo.** «Reacomodar» devuelve la forma de
   pago a Efectivo —tiene que hacerlo— y reabre la ventana del código; el OK leía esa forma de
   pago y registraba el cobro **a nombre de Efectivo**. Ahora el agregador viaja en su propio
   dato (`authMethod` en `src/types.ts`), que «Reacomodar» no toca. Un cobro de S/.0,00 tampoco
   se crea: si el documento ya está cubierto, lo que toca es anular, y el aviso lo dice.

6. **«Reacomodar» ya no borra pagos buenos.** Antes vaciaba `payments`, y eso se llevaba por
   delante trabajo correcto: en el Módulo 5 borraba el efectivo que el paso final exige. Ahora
   solo quita el estorbo (ventanas abiertas, forma de pago a medias); un cobro equivocado se
   deshace con **«Anular»**, que está a la vista, es gratis y repone lo que consumió.

7. **Estado de pantalla que «Reacomodar» no alcanzaba.** La ventana «Registradora No esta
   Abierto» y el submenú «Desembolsos» vivían en `useState` de `MainMenuScreen.tsx`: abrirlos por
   error tapaba el menú y no había forma de destaparlo. Ahora viven en `appState`, igual que
   `posTab`. **Si añades una ventana que tape la pantalla, ponla en `appState` y añádela a
   `ESTADO_ESTORBO`.**

8. **Repetir un paso correcto no duplica nada.** Como repetir no suma puntos, el colaborador lo
   hace sin miedo. Pasar dos veces el mismo artículo ya no mete dos líneas en el documento, y
   contestar dos veces la ventana del nivel de precio ya no vuelve a subir el 5%. Importa porque
   en la pantalla de cobro **no** se puede quitar una línea del documento.

9. **La celda de Cantidad del desembolso se selecciona al entrar.** Reescribir el monto lo pegaba
   detrás del anterior (`774.41774.41`) y la celda solo se vacía sola cuando vale 0.00.

10. **Las ilustraciones del relato ya están.** `src/assets/iconos/historia/apertura.webp` (la
    tienda amaneciendo) y `cierre.webp` (la reja abajo y las mascotas dormidas). El preámbulo
    abre con la primera y la pantalla final cierra con la segunda. **No las quites ni las
    sustituyas por otra cosa**, y si añades más ilustraciones al relato, van en esa carpeta y se
    buscan por nombre (`ilustracionHistoria` en `src/assets/iconos/index.ts`).

Y sigue en pie todo lo de las rondas anteriores, que **no hay que deshacer**: los 32 iconos
redondos, «Reacomodar pantallas», los dos intentos por módulo con guardado a medias, el catálogo
de productos y clientes global, Google Sheets solo para el administrador, Firestore con aviso
cuando guarda en local, el ranking de los diez mejores, el diseño de celular y el relato del
turno.

## Ronda 11: identidad y personaje

1. **Identificación.** Nombre y apellido en campos separados, los dos obligatorios, y se elige
   entre **DNI** (ocho dígitos exactos, ni uno más ni uno menos) y **carnet de extranjería**
   (ocho o más). El número solo admite dígitos y el aviso dice qué falta en vez de dejar el
   botón muerto sin explicación. La tienda no cambió. El nombre sigue viajando junto en un solo
   campo («Ana Torres»): es lo que espera la hoja de cálculo y el ranking, y partirlo por dentro
   obligaría a tocar las dos cosas sin ganar nada.

2. **Personaje.** Después de identificarse elige un avatar, y puede cambiarlo tocándolo en su
   menú. Se guarda el **identificador**, no la imagen, para poder cambiar un dibujo sin que
   quien lo tenía elegido se quede con el viejo; y vive en el servidor, así que sigue siendo el
   suyo si entra desde otro equipo. Sale en la tabla de los mejores turnos.

3. **De dónde salen los personajes.** Los seis de fábrica están en
   `src/assets/iconos/personajes/` y se leen con un `import.meta.glob`, igual que las portadas.
   El administrador sube más desde la pestaña **«Personajes»** de su panel: el propio navegador
   los recorta al cuadrado del centro, los lleva a 512 px y los recorta en círculo antes de
   subirlos (`convertirAPersonaje` en `src/lib/personajes.ts`). Se guardan en
   `app/personajes_global` y llegan al colaborador con `/api/step-data`, que es la llamada que ya
   hacía al entrar. **Solo el administrador**, como Google Sheets: son globales y salen en el
   mismo ranking.

4. **El script de iconos ya es idempotente.** Antes, al no quedar fondo cuadrado, volvía a
   aplicar el margen y cada pasada encogía los 32 badges un 2% más. Si añades un grupo nuevo,
   respeta esa guarda.

5. **Firebase: manda el archivo.** La configuración se busca primero en
   `firebase-applet-config.json` y solo después en la variable de entorno, que es el orden que
   hace falta aquí: una variable a medio poner se imponía sobre el archivo bueno y dejaba la
   aplicación guardando en local sin avisar. Y un tropiezo de Firestore ya no tumba la petición:
   se registra en el log y se sigue (`leerDoc` / `escribirDoc` en `server.ts`).

## Cómo comprobar que no rompiste nada

```bash
npm install
npm run lint                      # tsc --noEmit, tiene que salir limpio
npm run build

node tests/e2e-identidad.mjs      # reglas del DNI/carnet y el personaje elegido
node tests/e2e-camino-feliz.mjs   # los 14 módulos se terminan, con CERO errores
node tests/e2e-guion.mjs          # los 47 datos de las fichas se validan de verdad
node tests/e2e-repetir.mjs        # repetir un paso correcto no rompe ni encarece nada
node tests/e2e-deshacer.mjs       # anular un cobro y rehacerlo, sin matar el módulo
node tests/e2e-proceso.mjs        # no se aprueba cobrando por donde no toca
node tests/e2e-errores.mjs        # qué resta puntos y qué no
node tests/e2e-iconos.mjs         # 32 iconos: discos, sin agujeros dentro
node tests/e2e-datos.mjs          # qué es compartido y quién puede tocar Sheets
node tests/e2e-ranking.mjs        # orden del ranking y que no se publique ningún DNI
node tests/e2e-intentos.mjs       # los dos intentos y el guardado a medias
node tests/e2e-movil.mjs          # todas las pantallas en dos tamaños de teléfono
node tests/e2e-atascos.mjs        # sabotaje paso a paso: 139 casos (tarda ~30 min)
```

Estos son los resultados **reales** con los que se entrega este ZIP. Tienen que seguir así:

| Prueba | Resultado |
|---|---|
| `e2e-identidad` | 18/18 |
| `e2e-camino-feliz` | 14/14 módulos, cero errores en el camino correcto |
| `e2e-guion` | 47/47 datos validados |
| `e2e-repetir` | 36/36 |
| `e2e-deshacer` | 17/17 |
| `e2e-proceso` | 7/7 |
| `e2e-errores` | 7/7 |
| `e2e-datos` | 20/20 |
| `e2e-movil` | todas las pantallas en los dos teléfonos |
| `e2e-atascos` | 2 casos de 139 |

Sobre esos 2 de `e2e-atascos`: **no son callejones sin salida**. Los dos son del Módulo 5 con la
tarjeta cubriendo el documento entero, y `e2e-deshacer` recorre ese caso completo y demuestra que
el módulo se termina anulando el pago y cobrando en el orden del caso. Los marca porque el guion
de sabotaje sigue un libreto fijo y no sabe reaccionar. **Si consigues bajarlos, mejor; si no, no
los tapes cambiando la prueba.**

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

