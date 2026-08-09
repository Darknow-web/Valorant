# Simulador Retail Pro Prism

Simulador interactivo de **Retail Pro Prism** (POS) para capacitar al personal de tienda en
venta, pagos, clientes, devoluciones y cierre de caja, sin tocar el sistema real.

Hay dos formas de entrar:

- **Colaborador** — abre el enlace o el QR que le compartió su entrenador. No necesita clave:
  solo escribe su nombre, DNI y tienda. Ve la lista de módulos y, en cada uno, una
  **situación de tienda** de la que tiene que deducir los datos. No hay paso a paso.
- **Entrenador / administrador** — entra en `/#/entrenador` con usuario y clave. Configura los
  datos de cada módulo, comparte su enlace y QR, conecta su Google Sheet y ve los resultados.

## Ejecutar

**Requisitos:** Node.js 20 o superior.

```bash
npm install
npm run dev      # backend Express + Vite en http://localhost:3000
npm run build    # compila el frontend y el servidor
npm start        # producción (sirve dist/)
```

## Variables de entorno

Copia `.env.example` y define al menos `JWT_SECRET` en el despliegue.

| Variable | Para qué sirve |
|---|---|
| `JWT_SECRET` | **Obligatoria en producción.** Firma las sesiones del panel. Si falta, el servidor genera una temporal y todas las sesiones se cierran al reiniciar. |
| `ADMIN_INITIAL_PASSWORD` | Clave inicial de `admin`. Si no la defines, se genera al azar y se imprime en el log de arranque. |
| `TEACHER_INITIAL_PASSWORD` | Clave inicial de `entrenador`, igual que la anterior. |
| `FIREBASE_CONFIG` | Configuración de Firebase en una sola línea de JSON. Sin ella todo se guarda en `local_data.json`. |
| `FIREBASE_CONFIG_PATH` | Alternativa: ruta a un archivo JSON con esa configuración. |

Genera un secreto con:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Las claves iniciales **se piden cambiar en el primer ingreso** y nunca se muestran en pantalla.

## Dónde se guardan los datos

Sin configuración de Firebase, **todo se guarda en un archivo del disco del contenedor y se
borra en cada reinicio**: entrenadores, notas, catálogo y avance. El panel del administrador
lo avisa con una franja roja, y `GET /api/health` responde `{"almacen":"local"}`.

Para que los datos sobrevivan hay que conectar Firestore: **[`docs/conectar-firebase.md`](docs/conectar-firebase.md)**.

| Dato | Alcance |
|---|---|
| Datos de los módulos, reglas de nota, resultados | De cada entrenador |
| **Productos y clientes** | **Compartidos por todas las cuentas** |
| **Conexión con Google Sheets** | **Una sola, y la configura solo el administrador** |
| Avance del colaborador (intentos, módulo a medias) | De cada colaborador, por DNI |

## Conectar el Google Sheet

> **Solo el administrador.** La hoja es **una sola para toda la organización**: las notas de
> todos los entrenadores caen ahí y se distinguen por la columna «Entrenador». Los entrenadores
> ven si está conectada, pero no pueden cambiarla — antes cualquiera podía, y bastaba con que
> uno se equivocara de usuario al pegar la URL para que sus notas no llegaran a ninguna parte.
>
> Usa el botón **«Probar conexión»** del panel: envía un ping y te dice en claro
> qué respondió Google (sin configurar, implementación no pública, o listo).

1. Abre tu hoja de cálculo → **Extensiones ▸ Apps Script**.
2. Borra lo que haya y pega el contenido de [`docs/apps-script.gs`](docs/apps-script.gs).
3. **Implementar ▸ Nueva implementación ▸ Aplicación web**, ejecutando como tú y con acceso
   para "Cualquier usuario".
4. En **«Quién tiene acceso»** elige **«Cualquier usuario»**. Si eliges otra cosa,
   Google responde con su página de inicio de sesión y no se escribe nada: es el
   fallo más común.
5. Copia la URL que termina en `/exec` y pégala en **Panel ▸ Google Sheets ▸ URL del Webhook**
   (con la sesión de administrador).
6. Pulsa **«Probar conexión»** para confirmarlo antes de compartir el enlace.

Cada vez que cambies el Apps Script hay que crear una implementación nueva (o
subir la versión de la existente): guardar no basta.

El script escribe **por nombre de columna**: lee los títulos de tu hoja y coloca
cada dato bajo el suyo, sin importar el orden, y agrega al final las columnas que
falten. Si tenías columnas propias, no se tocan.

Cada fila lleva: fecha, cajero, DNI, tienda, módulo, puntaje, tiempo en segundos, errores,
ayudas, aprobado, calificación, entrenador, detalle de errores, detalle del proceso e ID de
intento. El ID de intento es lo que evita filas repetidas: si el mismo intento se reenvía, el
script lo ignora.

Si tu hoja quedó con filas antiguas de `Desconocido` / `N/A` / ceros, límpialas con el botón
**Limpiar filas inválidas** del panel y con la función `limpiarFilasInvalidas()` del Apps
Script (se ejecuta a mano desde el editor, una sola vez).

## Configurar los datos de cada módulo

En **Panel ▸ Datos de los módulos** el entrenador solo ve **los valores que se validan** (el
SKU del producto, el documento del cliente, el monto recibido, los datos del voucher, el fondo
de caja…), agrupados por módulo y con su nombre legible. El proceso y el texto de los pasos no
se editan: viven en `src/data/modules.ts`.

Debajo de cada módulo se muestra **cómo le va a llegar la situación al colaborador** con los
valores actuales, así que se ve el efecto del cambio antes de guardarlo.

## Productos y clientes

> Es el **único apartado compartido**: lo que edita un entrenador lo ven todas las cuentas. Los
> datos de los módulos y las reglas de nota siguen siendo de cada uno.

En **Panel ▸ Productos y clientes** está el catálogo de la tienda simulada: es lo que la caja
encuentra cuando el colaborador escribe un código. Ahí se editan el código, la descripción y el
precio de cada producto; el documento, el nombre y el correo de cada cliente; las marcas de
tarjeta que ofrece el POS; el fondo de caja inicial, y el número del documento que se busca en
los módulos de devolución.

**Los dos editores tienen que ser coherentes.** Si en «Datos de los módulos» pones un código que
no está en el catálogo, la caja no lo encuentra al buscarlo y el módulo se queda bloqueado, por
más que el colaborador escriba exactamente lo que dice la situación. El panel lo avisa en rojo y
ofrece «Agregarlo al catálogo» para arreglarlo de una vez.

Un cliente marcado como **agregador** (Rappi, Pedidos Ya) hace que, al asociarlo, la caja pida
aplicar el nivel de precio del canal digital. Así funcionan los módulos 7 y 8.

## El turno del colaborador

Los 14 módulos son **un turno seguido**, de la apertura al cierre. Al entrar por primera vez ve
un preámbulo con su nombre y su tienda, y cada caso arranca con una frase que lo engancha con el
anterior. El menú los agrupa en «La mañana», «La tarde» y «El cierre».

### Dos intentos por módulo

Cada módulo se puede hacer **dos veces** (uno más una repetición) y cuenta el mejor. Lo que
gasta un intento y lo que no:

| Acción | ¿Gasta intento? |
|---|---|
| Terminar el módulo | Sí |
| **Salir al menú a medias** | **No** — se guarda el paso, las pantallas y los errores, y al volver retoma ahí |
| **«Volver a empezar»** | **Sí** — empieza limpio, sin errores, así que tiene que costar |
| **«Reacomodar pantallas»** | **No** — solo recoloca la pantalla del paso en curso |

«Reacomodar» es la salida garantizada: no retrocede pasos, no borra errores y no gasta nada. Es
lo que asegura que ninguna combinación de clics pueda dejar a un colaborador encerrado.

El límite lo hace cumplir el servidor, no el navegador: recargar la página no lo esquiva.

### Cómo se puntúa

Se descuenta por **cualquier acción que se salga del proceso del caso**: entrar a otra pantalla,
cobrar por donde no toca, imprimir antes de tiempo. No se descuenta por rellenar datos, por
repetir un paso que ya hizo bien, ni por usar «Reacomodar pantallas».

Y **todo dato que la ficha del caso le muestra se valida**: el código del producto, el documento
del cliente, el importe, el código de autorización del agregador, los datos del cliente nuevo.
Si la situación le da un dato, ese dato manda. Los textos se comparan sin distinguir mayúsculas
ni tildes; los documentos y los importes, exactos.

Un módulo tampoco se cierra si el cobro no se hizo como pide el caso: un pedido de Rappi no
aprueba cobrado en efectivo. Cuando el cobro está mal, el aviso dice qué falta, y el colaborador
puede anular el pago y rehacerlo — anular siempre devuelve lo que consumió, incluido el crédito
de tienda.

Y como repetir algo correcto no suma puntos, tampoco puede costar nada ni estropear nada: volver
a pasar el mismo artículo no lo mete dos veces en el documento, y volver a contestar la ventana
del nivel de precio no le vuelve a subir el 5%.

### El ranking de los diez mejores

Desde el botón **«Ver el ranking»**, junto a su promedio, el colaborador ve la tabla de los diez
mejores turnos **de toda la empresa** (`GET /api/ranking`). Manda quien completó más módulos; a
igualdad de módulos, el promedio; y si también empatan, el tiempo — así terminar el turno entero
pesa más que sacar un 20 suelto.

Los tres primeros van en un podio y del cuarto al décimo en una lista. Quien queda fuera del top
ve su fila al final, con su puesto real: un ranking que no te dice dónde estás desanima en vez de
picar.

Se publican **nombre y tienda**, nunca el DNI: el endpoint es público, igual que el enlace del
colaborador. El resultado se cachea 60 segundos y se refresca en cuanto alguien registra una nota.

### La nota final y el cierre

La nota final es el **promedio del mejor intento de cada módulo**: repetir un módulo siempre
suma y nunca resta. Al completar los 14 aparece, al pie del menú, el cierre del relato: puede
usar las repeticiones que le queden o **cerrar el turno**, que lanza la celebración a pantalla
completa (o un mensaje de ánimo si no llegó a la nota mínima). También puede **reiniciar toda la
capacitación**: recupera sus intentos, y las notas ya enviadas siguen guardadas en el panel y en
la hoja.

El progreso lo calcula el servidor (`GET /api/my-progress`) sobre los intentos ya
guardados, así que sigue ahí aunque el colaborador entre desde otro equipo.

## Identidad visual

El marco de entrenamiento usa la paleta SuperPet: rojo `#E21600` para acciones y
marca, azul oscuro `#060643` como tinta, y beige `#FFECE5` / arena `#f4d0a8` como
superficies. Los logotipos están en `public/marca/`.

Como el rojo ya significa "SuperPet" y "acción principal", **no** se usa además
para señalar fallas: los avisos van en ámbar y granate, siempre con icono y con
una palabra explícita, para que el color nunca sea la única señal.

Las animaciones viven en `src/lib/motion.ts` y respetan `prefers-reduced-motion`.

**Las pantallas de `src/screens/` no llevan nada de esto**: replican Retail Pro y
conservan su aspecto original. Ese contraste es intencional — el marco es claro y
cálido, el sistema replicado es oscuro y denso, así que el colaborador siempre
sabe dónde está.

## En celular

El sistema de caja está diseñado para pantallas anchas (unos 1280 px) y con tipografías de 10 a
13 px, así que encogerlo al ancho de un teléfono en vertical lo dejaría ilegible. En su lugar:

- **En horizontal** (y en tablet) el simulador se escala para caber completo en el ancho.
- **En vertical** se sugiere girar el teléfono. Quien prefiera seguir así navega a tamaño real,
  con desplazamiento en ambos ejes y zoom con los dedos.
- La barra del módulo se compacta en pantallas angostas y los controles más pequeños del POS
  tienen un área táctil de 44 px sin cambiar de aspecto.

El resto del marco de entrenamiento (bienvenida, módulos, guía de situación, panel) es
responsive y se usa con normalidad en el teléfono.

## Firebase

El backend guarda usuarios, configuración, resultados y avance en **Firestore**. Sin configurar,
cae a un archivo local que el despliegue borra en cada reinicio — ver [«Dónde se guardan los
datos»](#dónde-se-guardan-los-datos) y la guía [`docs/conectar-firebase.md`](docs/conectar-firebase.md).

Todo el acceso pasa por el servidor, así que `firestore.rules` está **cerrado**
(`allow read, write: if false`) y debe quedarse así: abrirlo expondría los hashes de las claves,
los webhooks y los resultados a cualquiera que tenga la apiKey del proyecto.

Nunca versiones `firebase-applet-config.json`; usa `FIREBASE_CONFIG` en el despliegue.

Al conectar Firestore por primera vez, si está vacío y hay datos en `local_data.json`, el
servidor los sube una sola vez para que no se pierda lo ya cargado.

> Aparte de Firestore, las pantallas del POS cargan sus iconos desde un **bucket público de
> Firebase Storage** (`src/config/icons.ts`). Si ese bucket se borra o cambia de proyecto, las
> pantallas se quedan sin iconos: conviene no tocarlo.

## Pruebas

Necesitan el proyecto compilado (`npm run build`) y Playwright con el Chromium del entorno.

```bash
node tests/e2e-guion.mjs          # TODO dato que la ficha muestra se valida de verdad
node tests/e2e-deshacer.mjs       # anular un cobro y rehacerlo, sin matar el módulo
node tests/e2e-proceso.mjs        # no se aprueba cobrando por donde no toca
node tests/e2e-errores.mjs        # qué resta puntos y qué no
node tests/e2e-repetir.mjs        # repetir un paso correcto no rompe ni encarece nada
node tests/e2e-iconos.mjs         # los 32 badges son discos, sin agujeros dentro
node tests/e2e-datos.mjs          # qué es compartido, qué es de cada uno, quién puede tocar Sheets
node tests/e2e-ranking.mjs        # orden del ranking, top 10 y que no se publique ningún DNI
node tests/e2e-camino-feliz.mjs   # los 14 módulos se terminan haciendo lo correcto
node tests/e2e-intentos.mjs       # los dos intentos, salir a medias y volver a empezar
node tests/e2e-movil.mjs          # todas las pantallas en dos tamaños de teléfono
node tests/e2e-atascos.mjs        # NINGÚN error deja un módulo atascado (el largo)
```

`e2e-movil.mjs` recorre las pantallas a 360×740 y 390×844 y exige cuatro cosas: que la página no
se desplace en horizontal, que ningún texto quede cortado, que todo lo que se pulsa mida 40 px y
que la barra del simulador no pase de 72 px de alto. Las pantallas del POS quedan fuera del
control de tamaño táctil: replican el sistema real y se usan con zoom, a propósito.

`e2e-atascos.mjs` es la prueba que da la garantía: para cada módulo y cada paso, llega hasta ese
paso, pulsa a lo tonto todo lo que hay en pantalla —incluidos los «No» y «Cancelar» de los
modales— y exige que el módulo todavía se pueda terminar. Si falla, dice el módulo, el paso y la
secuencia exacta de clics.

## Estructura

- `server.ts` — backend Express: sesiones, configuración, registro de notas y sincronización.
- `docs/apps-script.gs` — el script que va en la hoja de cálculo.
- `src/App.tsx` — decide qué se ve según el enlace y el rol.
- `src/components/StudentApp.tsx` — vista del colaborador (módulos, briefing, simulación, cierre).
- `src/components/ScenarioBriefing.tsx` — la situación de tienda.
- `src/components/teacher/` — panel del entrenador (compartir/QR, datos, Sheets, resultados, usuarios).
- `src/components/ui/Kit.tsx` — primitivas del tema claro corporativo.
- `src/data/modules.ts` — los módulos y sus pasos (fuente de verdad del proceso).
- `src/data/catalog.ts` — catálogo de la tienda simulada (productos, clientes, tarjetas).
- `src/components/SimulatorViewport.tsx` — escalado, desplazamiento y aviso de rotar en móvil.
- `src/data/scenarios.ts` — las 14 situaciones de tienda.
- `src/lib/stepData.ts` — datos configurables y cómo se aplican sobre los módulos.
- `src/lib/session.ts` — sesión, enlaces de colaborador e identificadores de intento.
- `src/screens/` — pantallas simuladas de Retail Pro Prism. **Conservan su apariencia original
  a propósito:** su valor didáctico es parecerse al sistema real, así que el tema claro se
  aplica solo al marco de entrenamiento que las envuelve.
- `src/store/SimulatorContext.tsx` — estado del simulador (pasos, errores, nota, sincronización).
- `src/components/PreambuloHistoria.tsx` — la entrada del relato, con el nombre y la tienda.
- `src/lib/estadoModulo.ts` — guardar y retomar un módulo a medias, y gastar intentos.
- `src/lib/progreso.ts` — avance, intentos restantes y qué se puede repetir.
- `scripts/redondear-iconos.py` — deja los badges como discos perfectos (se corre a mano).
- `src/components/RankingColaboradores.tsx` — el podio y la tabla de los diez mejores.
- `src/lib/ranking.ts` — consulta del ranking y formato del tiempo.
- `tests/` — pruebas de extremo a extremo; ver «Pruebas».
