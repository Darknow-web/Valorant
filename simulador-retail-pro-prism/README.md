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

## Conectar el Google Sheet

> **La conexión es de CADA ENTRENADOR.** Si pegas la URL estando en la sesión de
> `admin`, los colaboradores que entren con el enlace de otro entrenador no van a
> llegar a esa hoja. Entra con el usuario cuyo enlace vas a compartir.
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
5. Copia la URL que termina en `/exec` y pégala en **Panel ▸ Google Sheets y nota ▸ URL del Webhook**.
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

## Nota final del colaborador

La nota final es el **promedio del mejor intento de cada módulo**: repetir un
módulo siempre suma y nunca resta. Al terminar todos aparece la nota final con
una celebración si aprueba, o con la lista de módulos por reforzar si todavía no.

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

## Firebase (opcional)

El backend puede guardar usuarios, configuración y resultados en **Firestore**. Todo el acceso
pasa por el servidor, así que `firestore.rules` está **cerrado** (`allow read, write: if false`)
y debe quedarse así: abrirlo expondría los hashes de las claves, los webhooks y los resultados
a cualquiera que tenga la apiKey del proyecto.

Nunca versiones `firebase-applet-config.json`; usa `FIREBASE_CONFIG` en el despliegue.

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
