# Conectar Firestore (para que los datos no se borren)

## El problema que resuelve

Sin esta configuración, el servidor guarda TODO —entrenadores, claves, notas,
catálogo de productos y avance de los colaboradores— en un archivo llamado
`local_data.json`, dentro del disco del contenedor donde corre la aplicación.

Ese disco es temporal. Cada vez que el despliegue se reinicia, se actualiza o se
duerme por inactividad, el archivo desaparece con todo dentro. La aplicación
vuelve a arrancar como recién instalada, con el usuario `admin` por defecto y sin
una sola nota.

Con Firestore conectado, los datos viven fuera del contenedor y sobreviven a
todo.

## Cómo saber en cuál de los dos estás

Entra al panel con el usuario administrador. Si arriba del todo aparece una
**franja roja** que dice «Los datos se están guardando en el disco del servidor y
se borran al reiniciar», todavía no está conectado.

También puedes abrir `https://TU-DOMINIO/api/health` en el navegador:

```json
{ "almacen": "firestore", "proyecto": "simulador-retail-pro" }   ← conectado
{ "almacen": "local",     "motivo": "No se encontró configuración de Firebase." }
```

## Los datos que necesitas de Firebase

En la [consola de Firebase](https://console.firebase.google.com), dentro de tu
proyecto:

1. **Configuración del proyecto ▸ Tus apps ▸ Configuración del SDK.** De ahí
   salen `projectId`, `appId`, `apiKey`, `authDomain`, `storageBucket` y
   `messagingSenderId`.
2. **Compilación ▸ Firestore Database.** Si no existe, créala. Anota el
   identificador de la base: normalmente es `(default)`.

Con eso armas este JSON (el mismo formato que
`firebase-applet-config.example.json`):

```json
{
  "projectId": "simulador-retail-pro",
  "appId": "1:000000000000:web:0000000000000000000000",
  "apiKey": "AIza...",
  "authDomain": "simulador-retail-pro.firebaseapp.com",
  "firestoreDatabaseId": "(default)",
  "storageBucket": "simulador-retail-pro.firebasestorage.app",
  "messagingSenderId": "000000000000"
}
```

## Dónde se pega

Hay dos caminos y el servidor acepta cualquiera de los dos. **Elige uno.**

### Opción A — variable de entorno (la recomendada para un despliegue)

En la configuración de variables de entorno de tu hosting, crea:

| Variable | Valor |
|---|---|
| `FIREBASE_CONFIG` | Todo el JSON de arriba **en una sola línea** |

Para dejarlo en una línea:

```bash
node -e "console.log(JSON.stringify(require('./firebase-applet-config.json')))"
```

Aprovecha y define también `JWT_SECRET`, que es obligatoria en producción:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Opción B — archivo en el proyecto (para probar en tu computadora)

Guarda el JSON como `firebase-applet-config.json` en la raíz del proyecto. Ya
está en el `.gitignore`, así que **no se sube al repositorio**: esa clave no debe
versionarse nunca.

Si prefieres otra ruta, indícala con `FIREBASE_CONFIG_PATH`.

## Reglas de seguridad

En **Firestore Database ▸ Reglas**, pega el contenido de `firestore.rules` y
publica:

```
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Parece que lo cierra todo, y es a propósito. La aplicación **nunca** habla con
Firestore desde el navegador: solo lo hace su servidor, que usa credenciales de
administrador y no pasa por estas reglas. Dejarlo abierto (`if true`) publicaría
los hashes de las claves, la URL del webhook y las notas de todos los
colaboradores a cualquiera que tuviera la `apiKey`, que es pública por diseño.

## Al conectarlo por primera vez

Si ya venías usando la aplicación sin Firestore, **no pierdes lo que tenías**.
Al arrancar, si Firestore está vacío y hay un `local_data.json` con datos, el
servidor los sube una sola vez y lo dice en el log:

```
[prism] Firestore está vacío y hay datos locales: subiéndolos una sola vez…
[prism] Migración terminada.
```

Nunca pisa datos buenos: si Firestore ya tiene usuarios, no toca nada.

## Comprobación final

1. Reinicia el despliegue.
2. En el log de arranque debe aparecer `[prism] Datos en Firestore (proyecto …)`.
3. Entra al panel: la franja roja ya no está.
4. Crea un entrenador de prueba, reinicia el despliegue otra vez y comprueba que
   sigue ahí. Ese es el examen de verdad.

## Qué se guarda en cada documento

| Documento | Qué contiene | Alcance |
|---|---|---|
| `app/users` | Entrenadores y administradores, con la clave cifrada | Global |
| `app/configs_<usuario>` | Datos de los módulos y reglas de nota de ese entrenador | Por entrenador |
| `app/logs_<usuario>` | Intentos de sus colaboradores | Por entrenador |
| `app/catalog_global` | Productos y clientes | **Compartido por todas las cuentas** |
| `app/sheet_global` | Conexión con Google Sheets | **Global, solo el administrador** |
| `app/estado_<usuario>__<dni>` | Avance del colaborador: intentos y módulo a medias | Por colaborador |
