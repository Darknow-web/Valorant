import express from 'express';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { createServer as createViteServer } from 'vite';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

// --- Firebase (opcional). La configuración se lee de variable de entorno o de
// un archivo local que NUNCA debe versionarse. Sin ella la app usa el almacén local. ---
let db: any;
/** Dónde están cayendo los datos ahora mismo. Se expone en /api/health. */
let almacen: 'firestore' | 'local' = 'local';
let almacenProyecto = '';
let almacenMotivo = 'No se encontró configuración de Firebase.';

try {
  // El ARCHIVO manda sobre la variable de entorno, y no al revés.
  //
  // Es el orden que hace falta en AI Studio: allí la herramienta genera
  // `firebase-applet-config.json` con la configuración buena, y una variable de
  // entorno a medio poner se imponía sobre él y dejaba la aplicación guardando
  // en local sin que nadie se enterara. La variable sigue existiendo para los
  // despliegues que no pueden dejar un archivo con credenciales en el disco, y
  // para que las pruebas puedan forzar el almacén local.
  const configPath = process.env.FIREBASE_CONFIG_PATH || './firebase-applet-config.json';
  const desdeArchivo = fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf8') : '';
  const rawConfig = desdeArchivo || process.env.FIREBASE_CONFIG || '';
  if (rawConfig) {
    const firebaseConfig = JSON.parse(rawConfig);
    if (typeof firebaseConfig === 'object' && firebaseConfig !== null && firebaseConfig.projectId) {
      const appFirebase = initializeApp(firebaseConfig);
      db = getFirestore(appFirebase, firebaseConfig.firestoreDatabaseId);
      almacen = 'firestore';
      almacenProyecto = String(firebaseConfig.projectId);
      almacenMotivo = '';
    } else {
      almacenMotivo = 'La configuración de Firebase no trae "projectId".';
    }
  }
} catch (e: any) {
  almacenMotivo = `No se pudo leer la configuración de Firebase: ${e?.message || e}`;
}

// El aviso va en grande y al arranque. La versión anterior lo decía con un
// console.log discreto, y por eso nadie se enteraba de que la aplicación estaba
// guardando en un disco que el despliegue borra en cada reinicio.
if (almacen === 'firestore') {
  console.log(`[prism] Datos en Firestore (proyecto ${almacenProyecto}).`);
} else {
  console.warn(
    '\n' +
      '='.repeat(72) + '\n' +
      '  ATENCIÓN: los datos se están guardando en el disco del servidor.\n' +
      `  ${almacenMotivo}\n` +
      '  Todo (usuarios, notas, catálogo y avance) SE BORRA al reiniciar.\n' +
      '  Conecta Firestore: ver docs/conectar-firebase.md\n' +
      '='.repeat(72) + '\n'
  );
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', almacen, proyecto: almacenProyecto, motivo: almacenMotivo })
);

// --- Secreto JWT: sin fallback fijo. Si no está definido se genera uno efímero
// (las sesiones se invalidan al reiniciar, que es el comportamiento seguro). ---
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(48).toString('hex');
if (!process.env.JWT_SECRET) {
  console.warn('[prism] JWT_SECRET no está definido. Se generó uno temporal: las sesiones se cerrarán al reiniciar el servidor. Define JWT_SECRET en las variables de entorno del despliegue.');
}

// Claves iniciales: se toman del entorno; si no existen se generan al azar y se
// imprimen UNA sola vez en el log de arranque. Nunca se muestran en la interfaz.
function initialPassword(envVar: string, label: string) {
  const fromEnv = process.env[envVar];
  if (fromEnv) return fromEnv;
  const defaultPwd = label === 'admin' ? 'admin123' : 'entrenador123';
  console.warn(`[prism] Usando clave por defecto para "${label}": ${defaultPwd} (defínela con ${envVar} para fijarla). Deberá cambiarse en el primer ingreso.`);
  return defaultPwd;
}

// --- Rate limiting simple para el login ---
const loginAttempts = new Map<string, { count: number; blockedUntil?: number }>();
const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 15 * 60 * 1000;

function checkRateLimit(ip: string) {
  const attempt = loginAttempts.get(ip);
  if (!attempt) return true;
  if (attempt.blockedUntil && Date.now() < attempt.blockedUntil) return false;
  if (attempt.blockedUntil && Date.now() >= attempt.blockedUntil) {
    loginAttempts.delete(ip);
  }
  return true;
}

function recordFailedLogin(ip: string) {
  const attempt = loginAttempts.get(ip) || { count: 0 };
  attempt.count += 1;
  if (attempt.count >= MAX_ATTEMPTS) attempt.blockedUntil = Date.now() + BLOCK_DURATION_MS;
  loginAttempts.set(ip, attempt);
}

function clearLoginAttempts(ip: string) {
  loginAttempts.delete(ip);
}

// --- Auth middleware ---
const requireAuth = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  try {
    req.user = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Sesión inválida o expirada' });
  }
};

const requireAdmin = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Requiere privilegios de administrador' });
  next();
};

// --- Estado en memoria (fallback sin Firestore) ---
function seedUsers() {
  return [
    {
      username: 'admin',
      password: bcrypt.hashSync(initialPassword('ADMIN_INITIAL_PASSWORD', 'admin'), 10),
      role: 'admin',
      name: 'Administrador Principal',
      mustChangePassword: true,
    },
    {
      username: 'entrenador',
      password: bcrypt.hashSync(initialPassword('TEACHER_INITIAL_PASSWORD', 'entrenador'), 10),
      role: 'teacher',
      name: 'Entrenador',
      mustChangePassword: true,
    },
  ];
}

let mockUsers: any[] = [];
let mockConfigs: Record<string, any> = {};
let mockLogs: Record<string, any[]> = {};
/** Catálogo de tienda: uno solo para toda la aplicación (ver readCatalogGlobal). */
let mockCatalog: any = null;
/** Conexión a la hoja de cálculo: una sola, y solo el administrador la toca. */
let mockSheet: any = null;

/** Personajes subidos por el administrador (ver readPersonajesGlobal). */
let mockPersonajes: { id: string; url: string }[] = [];
/** Avance de cada colaborador, con clave `entrenador__dni`. */
let mockEstados: Record<string, any> = {};

// --- Firestore helpers ---

/**
 * Lectura y escritura de Firestore que no tumban la petición.
 *
 * Un tropiezo de red o un permiso mal puesto en las reglas hacía que la promesa
 * se rechazara y la petición entera acabara en un 500 sin explicación: al
 * colaborador se le quedaba la pantalla colgada en mitad de un módulo. Ahora el
 * fallo se escribe en el log del servidor —que es donde se puede diagnosticar— y
 * quien llama recibe `null`, que ya sabe tratar como "no hay nada guardado".
 */
async function leerDoc(ruta: string): Promise<any | null> {
  try {
    return await getDoc(doc(db, 'app', ruta));
  } catch (e: any) {
    console.error(`[prism] Error leyendo app/${ruta} en Firestore:`, e?.message || e);
    return null;
  }
}

async function escribirDoc(ruta: string, datos: any): Promise<boolean> {
  try {
    await setDoc(doc(db, 'app', ruta), datos);
    return true;
  } catch (e: any) {
    console.error(`[prism] Error escribiendo app/${ruta} en Firestore:`, e?.message || e);
    return false;
  }
}

async function readUsers() {
  if (!db) {
    if (!mockUsers.length) {
      mockUsers = seedUsers();
      saveLocalDB();
    }
    return mockUsers;
  }
  const d = await leerDoc('users');
  let users = d?.exists() ? d.data().users : [];
  let needsSave = false;
  if (!users.length) {
    users = seedUsers();
    needsSave = true;
  }
  users = users.map((u: any) => {
    if (u.password && !u.password.startsWith('$2')) {
      u.password = bcrypt.hashSync(u.password, 10);
      u.mustChangePassword = true;
      needsSave = true;
    }
    if (!u.role) {
      u.role = 'teacher';
      needsSave = true;
    }
    return u;
  });
  if (needsSave) await writeUsers(users);
  return users;
}

async function writeUsers(users: any[]) {
  if (db) {
    await escribirDoc('users', { users });
  } else {
    mockUsers = users;
    saveLocalDB();
  }
}

/**
 * Configuración PROPIA de cada entrenador.
 *
 * Aquí ya no vive ni el catálogo ni la conexión a Google Sheets: el catálogo se
 * comparte entre todas las cuentas y la hoja la conecta únicamente el
 * administrador. Ver `readCatalogGlobal` y `readSheetGlobal`.
 */
const defaultConfig = {
  penaltyPerError: 1,
  penaltyPerHint: 0.5,
  gradingScale: 'vigesimal' as 'vigesimal' | 'percentage',
  passingScore: 14,
  // Overrides de DATOS por paso: { [stepId]: { targetValue?, expectedState?, data? } }
  stepData: {} as Record<string, any>,
};

/** Cuántas veces puede hacer un colaborador cada módulo (1 + 1 repetición). */
const MAX_INTENTOS = 2;

async function readConfig(username: string) {
  let conf: any;
  if (username) {
    if (db) {
      const d = await leerDoc('configs_' + username);
      if (d?.exists()) conf = d.data();
    } else {
      conf = mockConfigs[username];
    }
  }
  return { ...defaultConfig, ...(conf || {}) };
}

async function writeConfig(username: string, config: any) {
  const clean: any = {};
  for (const k in config) if (config[k] !== undefined) clean[k] = config[k];
  if (db) {
    await escribirDoc('configs_' + username, clean);
  } else {
    mockConfigs[username] = clean;
    saveLocalDB();
  }
}

/**
 * Catálogo de tienda: productos, clientes, tarjetas y documento de devolución.
 *
 * Es el ÚNICO apartado compartido por todas las cuentas. Antes vivía dentro de
 * la configuración de cada entrenador, así que dos entrenadores que trabajaban
 * la misma tienda mantenían dos listas de productos distintas y un colaborador
 * podía encontrarse con un SKU que su compañero no tenía.
 */
async function readCatalogGlobal() {
  if (!db) return mockCatalog;
  const d = await leerDoc('catalog_global');
  return d?.exists() ? d.data().catalog ?? null : null;
}

async function writeCatalogGlobal(catalog: any) {
  if (db) {
    await escribirDoc('catalog_global', { catalog });
  } else {
    mockCatalog = catalog;
    saveLocalDB();
  }
}

/**
 * Personajes que el administrador sube para que el colaborador elija su avatar.
 *
 * Son globales, como el catálogo: el avatar de un colaborador tiene que
 * significar lo mismo mire quien lo mire, y el ranking cruza a gente de
 * entrenadores distintos.
 *
 * Se guardan como `data:` URL ya convertida por el navegador del administrador
 * (cuadrada, 512 px y recortada en círculo). Van dentro del documento y no en un
 * almacenamiento aparte porque un documento de Firestore admite 1 MB y un avatar
 * convertido pesa unos 25 KB: caben de sobra los que hagan falta, sin montar un
 * servicio de archivos para seis dibujos.
 */
async function readPersonajesGlobal(): Promise<{ id: string; url: string }[]> {
  if (!db) return mockPersonajes;
  const d = await leerDoc('personajes_global');
  return (d?.exists() ? d.data().personajes : null) || [];
}

async function writePersonajesGlobal(personajes: { id: string; url: string }[]) {
  if (db) {
    await escribirDoc('personajes_global', { personajes });
  } else {
    mockPersonajes = personajes;
    saveLocalDB();
  }
}

/** Cuántos caben y cuánto puede pesar cada uno. Ver `src/lib/personajes.ts`. */
const MAXIMO_PERSONAJES = 24;
const MAXIMO_BYTES_PERSONAJE = 90 * 1024;

/**
 * Deja la lista de personajes en algo que se pueda guardar sin miedo.
 *
 * Lo que llega es una imagen entera dentro de un texto, así que se comprueba que
 * sea de verdad una `data:` URL de imagen y que no venga inflada: sin esto, un
 * panel comprometido podría meter un `javascript:` en el `src` de una etiqueta
 * que se pinta en la pantalla de todos los colaboradores.
 */
function sanitizePersonajes(raw: any): { id: string; url: string }[] {
  if (!Array.isArray(raw)) return [];
  const limpios: { id: string; url: string }[] = [];
  for (const p of raw.slice(0, MAXIMO_PERSONAJES)) {
    const id = String(p?.id || '').trim().slice(0, 40);
    const url = String(p?.url || '').trim();
    if (!id || !/^data:image\/(webp|png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(url)) continue;
    if ((url.length * 3) / 4 > MAXIMO_BYTES_PERSONAJE) continue;
    if (limpios.some((otro) => otro.id === id)) continue;
    limpios.push({ id, url });
  }
  return limpios;
}

const defaultSheet = {
  googleSpreadsheetId: '',
  googleWebhookUrl: '',
  googleAccessToken: '',
};

/**
 * Conexión a la hoja de cálculo: una sola para toda la aplicación.
 *
 * Los entrenadores no pueden cambiarla (ni verla entera): las notas de todos
 * caen en la misma hoja y se distinguen por la columna "Entrenador".
 */
async function readSheetGlobal() {
  let guardado: any = null;
  if (db) {
    const d = await leerDoc('sheet_global');
    if (d?.exists()) guardado = d.data();
  } else {
    guardado = mockSheet;
  }
  return { ...defaultSheet, ...(guardado || {}) };
}

async function writeSheetGlobal(config: any) {
  const limpio: any = {};
  for (const k of Object.keys(defaultSheet)) if (config[k] !== undefined) limpio[k] = config[k];
  if (db) {
    await escribirDoc('sheet_global', limpio);
  } else {
    mockSheet = limpio;
    saveLocalDB();
  }
}

/** Un DNI puede traer cualquier cosa; esto lo deja apto para nombrar documentos. */
function claveEstado(teacher: string, dni: string) {
  const limpio = String(dni).replace(/[^a-zA-Z0-9]/g, '').slice(0, 32);
  return `${teacher}__${limpio}`;
}

const estadoVacio = () => ({
  /** { [moduleId]: { intentosUsados, enCurso } } */
  modulos: {} as Record<string, any>,
  /** El colaborador dio por terminada la capacitación. */
  finalizado: false,
  /** Ya vio el preámbulo de la historia. */
  preambuloVisto: false,
  /** El avatar que eligió. Vacío mientras no ha pasado por la elección. */
  personaje: '',
  /**
   * Momento en que reinició todo. Las notas anteriores siguen guardadas en el
   * panel y en la hoja, pero dejan de contar para su avance.
   */
  reiniciadoEn: 0,
});

/**
 * Avance del colaborador dentro de la capacitación: intentos gastados por
 * módulo y el módulo que dejó a medias.
 *
 * Va en el servidor y no en el navegador, para que salir del módulo, cerrar la
 * pestaña o cambiar de teléfono no le borre lo que llevaba hecho.
 */
async function readEstado(teacher: string, dni: string) {
  if (!teacher || !dni) return estadoVacio();
  const clave = claveEstado(teacher, dni);
  if (!db) return { ...estadoVacio(), ...(mockEstados[clave] || {}) };
  const d = await leerDoc('estado_' + clave);
  return { ...estadoVacio(), ...(d?.exists() ? d.data() : {}) };
}

async function writeEstado(teacher: string, dni: string, estado: any) {
  if (!teacher || !dni) return;
  const clave = claveEstado(teacher, dni);
  if (db) {
    await escribirDoc('estado_' + clave, estado);
  } else {
    mockEstados[clave] = estado;
    saveLocalDB();
  }
}

async function readStudentLogs(username: string) {
  if (!username) return [];
  if (!db) return mockLogs[username] || [];
  const d = await leerDoc('logs_' + username);
  return d?.exists() ? d.data().logs || [] : [];
}

async function writeStudentLogs(username: string, logs: any[]) {
  if (!username) return;
  if (db) {
    await escribirDoc('logs_' + username, { logs });
  } else {
    mockLogs[username] = logs;
    saveLocalDB();
  }
}

// --- Almacén local (cuando no hay Firestore) ---
const LOCAL_DB_PATH = path.resolve(process.cwd(), 'local_data.json');
function loadLocalDB() {
  if (!fs.existsSync(LOCAL_DB_PATH)) return;
  try {
    const data = JSON.parse(fs.readFileSync(LOCAL_DB_PATH, 'utf8'));
    if (data.mockUsers) mockUsers = data.mockUsers;
    if (data.mockConfigs) mockConfigs = data.mockConfigs;
    if (data.mockLogs) mockLogs = data.mockLogs;
    if (data.mockCatalog) mockCatalog = data.mockCatalog;
    if (data.mockSheet) mockSheet = data.mockSheet;
    if (data.mockPersonajes) mockPersonajes = data.mockPersonajes;
    if (data.mockEstados) mockEstados = data.mockEstados;
  } catch (e) {
    console.error('[prism] Error leyendo el almacén local.', e);
  }
}
function saveLocalDB() {
  try {
    fs.writeFileSync(
      LOCAL_DB_PATH,
      JSON.stringify(
        { mockUsers, mockConfigs, mockLogs, mockCatalog, mockSheet, mockEstados, mockPersonajes },
        null,
        2
      )
    );
  } catch (e) {
    console.error('[prism] Error escribiendo el almacén local.', e);
  }
}
loadLocalDB();

/**
 * Sube al Firestore recién conectado lo que hubiera quedado en el archivo local.
 *
 * Es la única forma de que conectar Firestore no cueste perder lo ya cargado:
 * quien venía usando la app sin configurar nada tiene sus entrenadores y sus
 * notas en `local_data.json`, y si al conectar Firestore la app arrancara vacía
 * tendría que rehacerlo todo. Solo corre si Firestore está SIN usuarios, así que
 * nunca pisa datos buenos.
 */
async function migrarLocalAFirestore() {
  if (!db) return;
  if (!mockUsers.length && !Object.keys(mockLogs).length) return;
  try {
    const d = await getDoc(doc(db, 'app', 'users'));
    const yaHayDatos = d.exists() && Array.isArray(d.data().users) && d.data().users.length > 0;
    if (yaHayDatos) return;

    console.log('[prism] Firestore está vacío y hay datos locales: subiéndolos una sola vez…');
    if (mockUsers.length) await setDoc(doc(db, 'app', 'users'), { users: mockUsers });
    for (const [usuario, config] of Object.entries(mockConfigs)) {
      await setDoc(doc(db, 'app', 'configs_' + usuario), config as any);
    }
    for (const [usuario, logs] of Object.entries(mockLogs)) {
      await setDoc(doc(db, 'app', 'logs_' + usuario), { logs });
    }
    if (mockCatalog) await writeCatalogGlobal(mockCatalog);
    if (mockSheet) await setDoc(doc(db, 'app', 'sheet_global'), mockSheet);
    for (const [clave, estado] of Object.entries(mockEstados)) {
      await setDoc(doc(db, 'app', 'estado_' + clave), estado as any);
    }
    console.log('[prism] Migración terminada.');
  } catch (e) {
    console.error('[prism] No se pudo migrar el almacén local a Firestore.', e);
  }
}

function publicUser(u: any) {
  return { username: u.username, role: u.role, name: u.name, mustChangePassword: !!u.mustChangePassword };
}

// --- Auth ---
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body || {};
  const ip = req.ip || (req.socket && req.socket.remoteAddress) || 'unknown';

  if (!checkRateLimit(ip)) {
    return res.status(429).json({ success: false, error: 'Demasiados intentos fallidos. Intenta en 15 minutos.' });
  }

  const users = await readUsers();
  const user = users.find((u: any) => u.username === username);

  if (user && password && bcrypt.compareSync(password, user.password)) {
    clearLoginAttempts(ip);
    const token = jwt.sign(
      { username: user.username, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    return res.json({ success: true, token, user: publicUser(user) });
  }

  recordFailedLogin(ip);
  return res.status(401).json({ success: false, error: 'Credenciales incorrectas' });
});

app.get('/api/me', requireAuth, async (req: any, res) => {
  const users = await readUsers();
  const user = users.find((u: any) => u.username === req.user.username);
  if (!user) return res.status(401).json({ error: 'Sesión inválida' });
  res.json(publicUser(user));
});

app.post('/api/change-password', requireAuth, async (req: any, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!newPassword || String(newPassword).length < 8) {
    return res.status(400).json({ error: 'La nueva clave debe tener al menos 8 caracteres.' });
  }
  const users = await readUsers();
  const user = users.find((u: any) => u.username === req.user.username);
  if (!user) return res.status(401).json({ error: 'Sesión inválida' });
  if (!currentPassword || !bcrypt.compareSync(currentPassword, user.password)) {
    return res.status(401).json({ error: 'La clave actual no es correcta.' });
  }
  if (bcrypt.compareSync(newPassword, user.password)) {
    return res.status(400).json({ error: 'La nueva clave debe ser distinta de la actual.' });
  }
  user.password = bcrypt.hashSync(newPassword, 10);
  user.mustChangePassword = false;
  await writeUsers(users);
  res.json({ success: true });
});

// --- Gestión de entrenadores (solo admin) ---
app.get('/api/users', requireAuth, requireAdmin, async (_req, res) => {
  const users = await readUsers();
  res.json(users.map(publicUser));
});

app.post('/api/users', requireAuth, requireAdmin, async (req, res) => {
  const { username, password, role, name } = req.body || {};
  if (!username || !password || String(password).length < 8) {
    return res.status(400).json({ error: 'Usuario y clave (mínimo 8 caracteres) son obligatorios.' });
  }
  if (!/^[a-z0-9_.-]{3,32}$/i.test(username)) {
    return res.status(400).json({ error: 'El usuario solo admite letras, números, punto, guion y guion bajo (3 a 32 caracteres).' });
  }
  const users = await readUsers();
  if (users.find((u: any) => u.username === username)) {
    return res.status(400).json({ error: 'El usuario ya existe' });
  }
  users.push({
    username,
    password: bcrypt.hashSync(password, 10),
    role: role === 'admin' ? 'admin' : 'teacher',
    name: name || username,
    mustChangePassword: true,
  });
  await writeUsers(users);
  res.json({ success: true });
});

app.delete('/api/users/:username', requireAuth, requireAdmin, async (req: any, res) => {
  if (req.params.username === req.user.username) {
    return res.status(400).json({ error: 'No puedes eliminar tu propio usuario.' });
  }
  const users = (await readUsers()).filter((u: any) => u.username !== req.params.username);
  await writeUsers(users);
  res.json({ success: true });
});

// --- Reglas de calificación: cada entrenador las suyas ---
function safeConfig(config: any) {
  return {
    penaltyPerError: config.penaltyPerError,
    penaltyPerHint: config.penaltyPerHint,
    gradingScale: config.gradingScale,
    passingScore: config.passingScore,
  };
}

app.get('/api/admin/config', requireAuth, async (req: any, res) => {
  res.json(safeConfig(await readConfig(req.user.username)));
});

app.post('/api/admin/config', requireAuth, async (req: any, res) => {
  const current = await readConfig(req.user.username);
  const fields = ['penaltyPerError', 'penaltyPerHint', 'gradingScale', 'passingScore'];
  const updated: any = { ...current };
  fields.forEach((f) => {
    if (req.body[f] !== undefined) updated[f] = req.body[f];
  });
  await writeConfig(req.user.username, updated);
  res.json({ success: true, ...safeConfig(updated) });
});

// --- Conexión a Google Sheets: una sola, y solo la toca el administrador ---
//
// Antes cada entrenador guardaba su propia URL y estos endpoints solo pedían
// `requireAuth`: cualquier entrenador podía cambiar a qué hoja iban las notas.
// Ahora la hoja es de la organización y los entrenadores solo pueden ver si
// está conectada.
app.get('/api/admin/sheet', requireAuth, requireAdmin, async (_req, res) => {
  const sheet = await readSheetGlobal();
  res.json({
    googleWebhookUrl: sheet.googleWebhookUrl,
    googleSpreadsheetId: sheet.googleSpreadsheetId,
    hasToken: !!sheet.googleAccessToken,
  });
});

app.post('/api/admin/sheet', requireAuth, requireAdmin, async (req: any, res) => {
  const current = await readSheetGlobal();
  const updated: any = { ...current };
  for (const f of Object.keys(defaultSheet)) {
    if (req.body[f] !== undefined) updated[f] = String(req.body[f] ?? '');
  }
  await writeSheetGlobal(updated);
  res.json({ success: true });
});

/** Lo que un entrenador puede saber de la hoja: si está conectada, nada más. */
app.get('/api/admin/sheet-info', requireAuth, async (_req, res) => {
  const sheet = await readSheetGlobal();
  res.json({ conectada: !!(sheet.googleWebhookUrl || sheet.googleSpreadsheetId) });
});

/**
 * Prueba de conexión con la hoja.
 *
 * Sin esto, el entrenador no tenía forma de saber si su hoja estaba bien
 * conectada hasta que un colaborador terminaba un módulo — y entonces el aviso
 * llegaba tarde. Envía un ping que el Apps Script reconoce y no escribe fila.
 */
app.post('/api/admin/test-sync', requireAuth, requireAdmin, async (req: any, res) => {
  const config = await readSheetGlobal();

  if (!config.googleWebhookUrl) {
    return res.json({
      ok: false,
      motivo: 'sin-configurar',
      mensaje: 'Todavía no has pegado la URL del Apps Script.',
    });
  }

  const resultado = await enviarAlWebhook(config, {
    action: 'test',
    data: { esPrueba: true, entrenador: req.user.username },
  });

  if (resultado.ok) {
    const info: any = (resultado as any).info || {};
    // El script actual declara su versión. Si no llega, lo que responde es una
    // implementación antigua: escribe en su propia pestaña y con sus valores por
    // defecto ("Desconocido", "main", "N/A"). Ahora los datos también viajan como
    // parámetros, así que la fila igual sale completa, pero conviene avisarlo.
    const esAntiguo = !info.version;
    return res.json({
      ok: true,
      version: info.version || null,
      antiguo: esAntiguo,
      mensaje: esAntiguo
        ? 'Conectado, y los resultados van a llegar completos. Ojo: la URL está sirviendo una versión ANTIGUA del script, que escribe en su propia pestaña. Para dejarlo al día, pega de nuevo docs/apps-script.gs y publica una versión NUEVA de la implementación (guardar no basta).'
        : info.documento
          ? `Conectado a «${info.documento}», escribiendo en la pestaña «${info.hoja || 'Resultados'}». Script al día (versión ${info.version}).`
          : `Conexión correcta. Script al día (versión ${info.version}).`,
      documento: info.documento,
      hoja: info.hoja,
    });
  }

  return res.json({ ok: false, motivo: 'error', mensaje: resultado.error });
});

app.post('/api/admin/disconnect', requireAuth, requireAdmin, async (_req, res) => {
  await writeSheetGlobal({ ...defaultSheet });
  res.json({ success: true });
});

// --- Datos de validación por paso (overrides). El alumno los lee en modo público:
// son datos del simulador (SKU, DNI de prueba, montos), no información sensible. ---
app.get('/api/step-data', async (req, res) => {
  const teacher = String(req.query.teacher || '').trim();
  if (!teacher) return res.json({ stepData: {}, catalog: null, teacherExists: false });
  const users = await readUsers();
  if (!users.find((u: any) => u.username === teacher)) {
    // El enlace apunta a un entrenador que no existe. Antes esto pasaba en
    // silencio y el colaborador entrenaba con datos que nadie iba a recibir.
    return res.json({ stepData: {}, catalog: null, teacherExists: false });
  }
  const config = await readConfig(teacher);
  // El catálogo es el mismo para todas las cuentas; los datos de cada paso, no.
  res.json({
    stepData: config.stepData || {},
    catalog: await readCatalogGlobal(),
    // Los personajes subidos van en esta misma respuesta a propósito: es la
    // llamada que el colaborador YA hace al entrar, así que la pantalla de
    // elección no cuesta ni un viaje más.
    personajes: await readPersonajesGlobal(),
    teacherExists: true,
  });
});

/**
 * Progreso del colaborador: la mejor nota de cada módulo y el promedio.
 *
 * Se calcula sobre los intentos ya guardados en el servidor, no en el navegador,
 * así que sobrevive a cambiar de equipo o de teléfono. La nota final es el
 * promedio del MEJOR intento de cada módulo: repetir un módulo siempre suma.
 */
app.get('/api/my-progress', async (req, res) => {
  const teacher = String(req.query.teacher || '').trim();
  const dni = String(req.query.dni || '').trim();
  if (!teacher || !dni) {
    return res.json({ ...PROGRESO_VACIO_SERVIDOR });
  }

  const config = await readConfig(teacher);
  const logs = await readStudentLogs(teacher);
  const estado = await readEstado(teacher, dni);

  const mejores: Record<string, { score: number; approved: boolean; rating: string; moduleTitle: string }> = {};
  for (const log of logs) {
    if (String(log.studentDni || '').trim() !== dni) continue;
    // Si el colaborador reinició la capacitación, lo anterior deja de contar
    // para su avance. La fila sigue guardada en el panel y en la hoja.
    if (estado.reiniciadoEn && Number(log.registradoEn || 0) < estado.reiniciadoEn) continue;
    const id = String(log.moduleId || '').trim();
    if (!id) continue;
    const actual = mejores[id];
    if (!actual || Number(log.score) > actual.score) {
      mejores[id] = {
        score: Number(log.score) || 0,
        approved: !!log.approved,
        rating: log.rating || '',
        moduleTitle: log.moduleTitle || '',
      };
    }
  }

  const notas = Object.values(mejores).map((m) => m.score);
  const promedio = notas.length ? Math.round((notas.reduce((a, b) => a + b, 0) / notas.length) * 10) / 10 : null;
  const maxScore = config.gradingScale === 'percentage' ? 100 : 20;
  const passingScore = Number(config.passingScore ?? (config.gradingScale === 'percentage' ? 70 : 14));

  // Intentos gastados y módulo dejado a medias, para que el menú pueda mostrar
  // "te queda 1 repetición" y "a medias · paso 7".
  const intentos: Record<string, number> = {};
  const aMedias: Record<string, { currentStepIndex: number; totalPasos: number }> = {};
  for (const [moduleId, datos] of Object.entries<any>(estado.modulos || {})) {
    intentos[moduleId] = Number(datos?.intentosUsados) || 0;
    if (datos?.enCurso) {
      aMedias[moduleId] = {
        currentStepIndex: Number(datos.enCurso.currentStepIndex) || 0,
        totalPasos: Number(datos.enCurso.totalPasos) || 0,
      };
    }
  }

  res.json({
    modulos: mejores,
    promedio,
    aprobado: promedio !== null && promedio >= passingScore,
    notaMinima: passingScore,
    notaMaxima: maxScore,
    intentos,
    aMedias,
    limiteIntentos: MAX_INTENTOS,
    finalizado: !!estado.finalizado,
    preambuloVisto: !!estado.preambuloVisto,
    // El avatar guardado manda sobre el del navegador: es lo que hace que
    // siga siendo el suyo al entrar desde otro equipo.
    personaje: String(estado.personaje || ''),
  });
});

/**
 * Los diez colaboradores con mejor turno de toda la empresa.
 *
 * Se agrupa por DNI y no por entrenador: quien entrenó con dos entrenadores es
 * una sola persona en la tabla. El orden lo decide, en este orden, cuántos
 * módulos completó, su promedio y el tiempo que le tomó — así terminar el turno
 * entero pesa más que sacar un 20 en un solo módulo, que es lo que hace que la
 * competencia empuje hacia donde interesa.
 *
 * La respuesta NUNCA lleva el DNI de nadie. Es un endpoint público (el
 * colaborador no tiene sesión), así que solo salen nombre y tienda, que es lo
 * que el propio ranking necesita para motivar.
 */
const CUANTOS_EN_EL_RANKING = 10;
const CACHE_RANKING_MS = 60_000;

interface FilaRanking {
  dni: string;
  nombre: string;
  tienda: string;
  /** Identificador de su avatar, no la imagen: la resuelve el navegador. */
  personaje: string;
  modulos: number;
  promedio: number;
  segundos: number;
}

let cacheRanking: { calculadoEn: number; filas: FilaRanking[] } | null = null;

async function calcularRanking(): Promise<FilaRanking[]> {
  if (cacheRanking && Date.now() - cacheRanking.calculadoEn < CACHE_RANKING_MS) {
    return cacheRanking.filas;
  }

  const users = await readUsers();
  // { dni: { nombre, tienda, entrenadores, mejores: { moduleId: {score, segundos, cuando} } } }
  const personas = new Map<string, any>();

  for (const user of users) {
    const logs = await readStudentLogs(user.username);
    for (const log of logs) {
      const dni = String(log.studentDni || '').trim();
      const moduleId = String(log.moduleId || '').trim();
      if (!dni || !moduleId) continue;
      if (!isValidLog(log)) continue;

      let persona = personas.get(dni);
      if (!persona) {
        persona = { dni, nombre: '', tienda: '', personaje: '', entrenadores: new Set<string>(), mejores: {} as Record<string, any> };
        personas.set(dni, persona);
      }
      persona.entrenadores.add(user.username);
      // Se queda el nombre y la tienda del intento más reciente.
      const cuando = Number(log.registradoEn || 0);
      if (!persona.ultimoDato || cuando >= persona.ultimoDato) {
        persona.ultimoDato = cuando;
        persona.nombre = String(log.studentName || '').trim() || persona.nombre;
        persona.tienda = String(log.storeName || '').trim() || persona.tienda;
        // El avatar del intento más reciente, igual que el nombre y la tienda:
        // así cambiar de personaje se refleja solo en la tabla.
        persona.personaje = String(log.personaje || '').trim() || persona.personaje;
      }

      const anterior = persona.mejores[moduleId];
      const score = Number(log.score) || 0;
      if (!anterior || score > anterior.score) {
        persona.mejores[moduleId] = { score, segundos: Number(log.totalSeconds) || 0, cuando };
      }
    }
  }

  // Quien reinició su capacitación arranca de cero también aquí: sus intentos
  // anteriores dejan de contar, igual que en su propio avance.
  for (const persona of personas.values()) {
    let reiniciadoEn = 0;
    for (const entrenador of persona.entrenadores) {
      const estado = await readEstado(entrenador, persona.dni);
      if (Number(estado.reiniciadoEn) > reiniciadoEn) reiniciadoEn = Number(estado.reiniciadoEn);
    }
    if (!reiniciadoEn) continue;
    for (const [moduleId, mejor] of Object.entries<any>(persona.mejores)) {
      if (mejor.cuando < reiniciadoEn) delete persona.mejores[moduleId];
    }
  }

  const filas: FilaRanking[] = [];
  for (const persona of personas.values()) {
    const mejores = Object.values<any>(persona.mejores);
    if (!mejores.length) continue;
    const suma = mejores.reduce((a, m) => a + m.score, 0);
    filas.push({
      dni: persona.dni,
      nombre: persona.nombre,
      tienda: persona.tienda,
      personaje: persona.personaje,
      modulos: mejores.length,
      promedio: Math.round((suma / mejores.length) * 10) / 10,
      segundos: mejores.reduce((a, m) => a + m.segundos, 0),
    });
  }

  filas.sort(
    (a, b) => b.modulos - a.modulos || b.promedio - a.promedio || a.segundos - b.segundos
  );

  cacheRanking = { calculadoEn: Date.now(), filas };
  return filas;
}

app.get('/api/ranking', async (req, res) => {
  const dni = String(req.query.dni || '').trim();
  const filas = await calcularRanking();

  // El DNI se usa solo para señalar la fila propia, y jamás se devuelve.
  const publica = (fila: FilaRanking, puesto: number) => ({
    puesto,
    nombre: fila.nombre,
    tienda: fila.tienda,
    personaje: fila.personaje,
    modulos: fila.modulos,
    promedio: fila.promedio,
    segundos: fila.segundos,
    esTu: !!dni && fila.dni === dni,
  });

  const top = filas.slice(0, CUANTOS_EN_EL_RANKING).map((f, i) => publica(f, i + 1));

  // Si el colaborador quedó fuera del top, se le devuelve su fila aparte con su
  // puesto real: un ranking que no te dice dónde estás desanima en vez de picar.
  const miIndice = dni ? filas.findIndex((f) => f.dni === dni) : -1;
  const tuFila =
    miIndice >= CUANTOS_EN_EL_RANKING ? publica(filas[miIndice], miIndice + 1) : null;

  res.json({ top, tuFila, totalColaboradores: filas.length });
});

const PROGRESO_VACIO_SERVIDOR = {
  modulos: {},
  promedio: null,
  aprobado: false,
  notaMinima: 14,
  notaMaxima: 20,
  intentos: {},
  aMedias: {},
  limiteIntentos: MAX_INTENTOS,
  finalizado: false,
  preambuloVisto: false,
};

// --- Módulo a medias: guardar, recuperar y descartar ---
//
// Salir al menú ya NO borra lo que el colaborador llevaba hecho. Se guarda el
// paso en el que iba, el estado de las pantallas y los errores del intento, y
// al volver a entrar retoma exactamente ahí, con el mismo intento y sin gastar
// una de sus dos oportunidades.

function datosDelEstudiante(req: any) {
  const teacher = String(req.body?.teacher ?? req.query?.teacher ?? '').trim();
  const dni = String(req.body?.dni ?? req.query?.dni ?? '').trim();
  const moduleId = String(req.body?.moduleId ?? req.query?.moduleId ?? '').trim();
  return { teacher, dni, moduleId };
}

app.get('/api/module-state', async (req, res) => {
  const { teacher, dni, moduleId } = datosDelEstudiante(req);
  if (!teacher || !dni || !moduleId) return res.json({ enCurso: null });
  const estado = await readEstado(teacher, dni);
  res.json({ enCurso: estado.modulos?.[moduleId]?.enCurso || null });
});

app.post('/api/module-state', async (req: any, res) => {
  const { teacher, dni, moduleId } = datosDelEstudiante(req);
  if (!teacher || !dni || !moduleId) return res.status(400).json({ error: 'Faltan datos del colaborador.' });

  const estado = await readEstado(teacher, dni);
  const anterior = estado.modulos[moduleId] || { intentosUsados: 0, enCurso: null };
  estado.modulos[moduleId] = {
    ...anterior,
    enCurso: {
      attemptId: String(req.body.attemptId || ''),
      currentStepIndex: Number(req.body.currentStepIndex) || 0,
      totalPasos: Number(req.body.totalPasos) || 0,
      appState: req.body.appState ?? null,
      errors: Number(req.body.errors) || 0,
      mistakeLog: Array.isArray(req.body.mistakeLog) ? req.body.mistakeLog : [],
      processSteps: Array.isArray(req.body.processSteps) ? req.body.processSteps : [],
      elapsedMs: Number(req.body.elapsedMs) || 0,
      guardadoEn: Date.now(),
    },
  };
  await writeEstado(teacher, dni, estado);
  res.json({ success: true });
});

app.delete('/api/module-state', async (req: any, res) => {
  const { teacher, dni, moduleId } = datosDelEstudiante(req);
  if (!teacher || !dni || !moduleId) return res.status(400).json({ error: 'Faltan datos del colaborador.' });
  const estado = await readEstado(teacher, dni);
  if (estado.modulos[moduleId]) estado.modulos[moduleId].enCurso = null;
  await writeEstado(teacher, dni, estado);
  res.json({ success: true });
});

/**
 * Gasta un intento del módulo.
 *
 * Lo llama "Volver a empezar": reiniciar borra los errores del intento, así que
 * tiene que costar una de las dos oportunidades. Si no, bastaría con reiniciar
 * cada vez que se falla para llegar siempre a nota perfecta.
 */
app.post('/api/module-restart', async (req: any, res) => {
  const { teacher, dni, moduleId } = datosDelEstudiante(req);
  if (!teacher || !dni || !moduleId) return res.status(400).json({ error: 'Faltan datos del colaborador.' });

  const estado = await readEstado(teacher, dni);
  const anterior = estado.modulos[moduleId] || { intentosUsados: 0, enCurso: null };
  const usados = (Number(anterior.intentosUsados) || 0) + 1;
  estado.modulos[moduleId] = { ...anterior, intentosUsados: usados, enCurso: null };
  await writeEstado(teacher, dni, estado);
  res.json({ success: true, intentosUsados: usados, quedan: Math.max(0, MAX_INTENTOS - usados) });
});

/** Marca del colaborador: preámbulo visto y capacitación dada por terminada. */
app.post('/api/student-flag', async (req: any, res) => {
  const { teacher, dni } = datosDelEstudiante(req);
  if (!teacher || !dni) return res.status(400).json({ error: 'Faltan datos del colaborador.' });
  const estado = await readEstado(teacher, dni);
  if (req.body.preambuloVisto !== undefined) estado.preambuloVisto = !!req.body.preambuloVisto;
  if (req.body.finalizado !== undefined) estado.finalizado = !!req.body.finalizado;
  // El avatar va aquí y no en el navegador para que siga siendo el suyo si
  // entra desde otro equipo.
  if (req.body.personaje !== undefined) estado.personaje = String(req.body.personaje || '').slice(0, 40);
  await writeEstado(teacher, dni, estado);
  res.json({ success: true });
});

/**
 * Reinicia toda la capacitación del colaborador.
 *
 * Devuelve los intentos y borra los módulos a medias. Las notas ya registradas
 * NO se borran: siguen en el panel del entrenador y en la hoja de cálculo, solo
 * dejan de contar para su avance.
 */
app.post('/api/student-reset', async (req: any, res) => {
  const { teacher, dni } = datosDelEstudiante(req);
  if (!teacher || !dni) return res.status(400).json({ error: 'Faltan datos del colaborador.' });
  await writeEstado(teacher, dni, { ...estadoVacio(), reiniciadoEn: Date.now() });
  res.json({ success: true });
});

/**
 * Los personajes que puede elegir el colaborador.
 *
 * Los sube SOLO el administrador, como la conexión con la hoja de cálculo: son
 * globales, así que un entrenador no debería poder cambiárselos a todas las
 * tiendas. Llegan ya convertidos por el navegador (cuadrados, 512 px y
 * recortados en círculo); aquí solo se comprueba que lo que entra sea de verdad
 * una imagen y quepa.
 */
app.get('/api/admin/personajes', requireAuth, requireAdmin, async (_req, res) => {
  res.json({ personajes: await readPersonajesGlobal() });
});

app.post('/api/admin/personajes', requireAuth, requireAdmin, async (req: any, res) => {
  if (!Array.isArray(req.body?.personajes)) {
    return res.status(400).json({ error: 'Formato de personajes inválido.' });
  }
  if (req.body.personajes.length > MAXIMO_PERSONAJES) {
    return res.status(400).json({ error: `No caben más de ${MAXIMO_PERSONAJES} personajes.` });
  }
  const limpios = sanitizePersonajes(req.body.personajes);
  // Si entró algo y no sobrevivió nada, es que venía mal: decirlo es mejor que
  // guardar una lista vacía y dejar al administrador pensando que se guardó.
  if (req.body.personajes.length && !limpios.length) {
    return res.status(400).json({ error: 'Ninguna de las imágenes se pudo guardar. Revisa que sean imágenes y que no pesen demasiado.' });
  }
  await writePersonajesGlobal(limpios);
  res.json({ success: true, personajes: limpios });
});

app.get('/api/admin/step-data', requireAuth, async (req: any, res) => {
  const config = await readConfig(req.user.username);
  res.json({ stepData: config.stepData || {}, catalog: await readCatalogGlobal(), personajes: await readPersonajesGlobal() });
});

app.post('/api/admin/step-data', requireAuth, async (req: any, res) => {
  const incoming = req.body?.stepData;
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
    return res.status(400).json({ error: 'Formato de datos inválido.' });
  }
  // Solo se aceptan valores de texto: nunca funciones ni estructuras anidadas
  // arbitrarias, que es lo que rompía la validación al guardar módulos completos.
  const clean: Record<string, any> = {};
  for (const [stepId, raw] of Object.entries<any>(incoming)) {
    if (!raw || typeof raw !== 'object') continue;
    const entry: any = {};
    if (typeof raw.targetValue === 'string') entry.targetValue = raw.targetValue;
    if (raw.expectedState && typeof raw.expectedState === 'object' && !Array.isArray(raw.expectedState)) {
      const st: Record<string, string> = {};
      for (const [k, v] of Object.entries<any>(raw.expectedState)) {
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') st[k] = String(v);
      }
      if (Object.keys(st).length) entry.expectedState = st;
    }
    if (raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)) {
      const extra: Record<string, string> = {};
      for (const [k, v] of Object.entries<any>(raw.data)) {
        if (typeof v === 'string' || typeof v === 'number') extra[k] = String(v);
      }
      if (Object.keys(extra).length) entry.data = extra;
    }
    if (Object.keys(entry).length) clean[stepId] = entry;
  }

  const config = await readConfig(req.user.username);
  config.stepData = clean;
  await writeConfig(req.user.username, config);

  // El catálogo NO va a la configuración del entrenador: es el único apartado
  // compartido, así que se guarda aparte y lo ven todas las cuentas.
  if (req.body?.catalog !== undefined) {
    await writeCatalogGlobal(sanitizeCatalog(req.body.catalog));
  }
  res.json({ success: true, stepData: clean, catalog: await readCatalogGlobal() });
});

/**
 * Acepta únicamente la forma esperada del catálogo, con textos y números.
 * `null` restaura el catálogo por defecto de la app.
 */
function sanitizeCatalog(raw: any) {
  if (raw === null) return null;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const text = (v: any) => (typeof v === 'string' || typeof v === 'number' ? String(v) : '');
  const num = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

  return {
    products: Array.isArray(raw.products)
      ? raw.products.slice(0, 50).map((p: any) => ({
          sku: text(p?.sku),
          ean: text(p?.ean) || text(p?.sku),
          desc: text(p?.desc),
          price: num(p?.price),
          stock: num(p?.stock),
        }))
      : [],
    customers: Array.isArray(raw.customers)
      ? raw.customers.slice(0, 50).map((c: any, i: number) => ({
          id: text(c?.id) || String(i + 1),
          doc: text(c?.doc),
          name: text(c?.name),
          email: text(c?.email),
          esAgregador: !!c?.esAgregador,
        }))
      : [],
    cardTypes: Array.isArray(raw.cardTypes) ? raw.cardTypes.slice(0, 20).map(text).filter(Boolean) : [],
    returnDocument: {
      id: text(raw.returnDocument?.id),
      date: text(raw.returnDocument?.date),
      customerDoc: text(raw.returnDocument?.customerDoc),
      total: text(raw.returnDocument?.total),
      docType: text(raw.returnDocument?.docType),
    },
    fondoCajaInicial: text(raw.fondoCajaInicial),
  };
}

// --- Resultados de colaboradores ---
app.get('/api/admin/students', requireAuth, async (req: any, res) => {
  res.json(await readStudentLogs(req.user.username));
});

app.post('/api/admin/clear-logs', requireAuth, async (req: any, res) => {
  await writeStudentLogs(req.user.username, []);
  res.json({ success: true });
});

function isValidLog(l: any) {
  const name = String(l?.studentName || '').trim();
  const mod = String(l?.moduleTitle || '').trim();
  if (!name || name.toLowerCase() === 'desconocido') return false;
  if (!mod || mod.toUpperCase() === 'N/A') return false;
  return true;
}

// Borra únicamente las filas basura (sin colaborador o sin módulo real)
app.post('/api/admin/clear-invalid-logs', requireAuth, async (req: any, res) => {
  const logs = await readStudentLogs(req.user.username);
  const kept = logs.filter((l: any) => isValidLog(l));
  await writeStudentLogs(req.user.username, kept);
  res.json({ success: true, removed: logs.length - kept.length, kept: kept.length });
});

// --- Sincronización con Google Sheets ---
// Se envía un OBJETO CON NOMBRES (data) además del array posicional (row), con
// Content-Type explícito y siguiendo el redirect 302 que devuelve /exec de Apps Script.
// El Apps Script escribe por NOMBRE de columna, así que este orden solo se usa
// como respaldo para clientes antiguos. Aun así se mantiene alineado con
// `buildRow` y con el script para que nada quede corrido.
const SHEET_HEADERS = [
  'Fecha', 'Cajero', 'DNI', 'Tienda', 'Módulo', 'Puntaje', 'Tiempo (s)',
  'Errores', 'Ayudas', 'Aprobado', 'Calificación', 'Entrenador',
  'Detalle de errores', 'Detalle del proceso', 'ID de intento',
];

function buildData(log: any) {
  return {
    fecha: log.timestamp,
    cajero: log.studentName,
    tienda: log.storeName,
    modulo: log.moduleTitle,
    puntaje: log.score,
    tiempoSeg: log.totalSeconds,
    tiempo: log.totalTime,
    errores: log.mistakesCount,
    ayudas: log.hintsCount,
    aprobado: log.approved ? 'Sí' : 'No',
    calificacion: log.rating,
    entrenador: log.teacherName,
    detalleErrores: log.mistakeLogStr,
    detalleProceso: log.processLogStr,
    intentoId: log.attemptId,
    dni: log.studentDni,
    headers: SHEET_HEADERS,
  };
}

function buildRow(log: any) {
  const d = buildData(log);
  return [
    d.fecha, d.cajero, d.dni, d.tienda, d.modulo, d.puntaje, d.tiempoSeg,
    d.errores, d.ayudas, d.aprobado, d.calificacion, d.entrenador,
    d.detalleErrores, d.detalleProceso, d.intentoId,
  ];
}

/**
 * Traduce lo que respondió Google a algo accionable.
 *
 * El caso más común y más confuso: Apps Script devuelve su PÁGINA DE INICIO DE
 * SESIÓN en HTML cuando la implementación no está publicada para "Cualquier
 * usuario". Sin esta traducción, en el panel aparecía un volcado de HTML.
 */
function interpretarRespuesta(text: string, status: number): { ok: boolean; error?: string; info?: any } {
  const recorte = text.trim().slice(0, 400);
  const pareceHtml = /^<!DOCTYPE html|^<html/i.test(recorte);

  if (pareceHtml) {
    if (/accounts\.google\.com|iniciar sesión|sign in|ServiceLogin/i.test(text)) {
      return {
        ok: false,
        error:
          'Google devolvió su página de inicio de sesión. Tu implementación del Apps Script no está publicada para "Cualquier usuario": entra a Implementar ▸ Gestionar implementaciones y cámbialo.',
      };
    }
    return {
      ok: false,
      error:
        'La URL no respondió como un Apps Script (devolvió una página web). Revisa que sea la que termina en /exec y que la implementación esté activa.',
    };
  }

  try {
    const parsed = JSON.parse(recorte === text.trim() ? text : text);
    if (parsed && parsed.ok === false) {
      return { ok: false, error: parsed.error || 'El Apps Script devolvió un error.' };
    }
    return { ok: true, info: parsed };
  } catch {
    // Respuesta corta y no-JSON con 200: se acepta.
    if (status >= 200 && status < 300) return { ok: true };
    return { ok: false, error: `HTTP ${status}: ${recorte}` };
  }
}

/**
 * Añade los datos a la URL como parámetros, además de mandarlos en el cuerpo.
 *
 * Por qué: los Apps Script antiguos leen los datos de `e.parameter`, no del
 * cuerpo. Si solo mandamos el cuerpo, ese script no encuentra nada y rellena la
 * hoja con sus valores por defecto ("Desconocido", "main", "N/A", ceros). Como
 * `e.parameter` se llena también desde la cadena de consulta, mandarlo por los
 * dos caminos hace que la fila salga completa con CUALQUIER versión del script,
 * sin que el entrenador tenga que volver a publicar nada en Google.
 */
function urlConParametros(base: string, data: any): string {
  try {
    const url = new URL(base);
    for (const [clave, valor] of Object.entries(data || {})) {
      if (valor === undefined || valor === null) continue;
      // Las cabeceras son un arreglo de apoyo para el script nuevo; como
      // parámetro solo estorbaría.
      if (clave === 'headers') continue;
      url.searchParams.set(clave, String(valor));
    }
    return url.toString();
  } catch {
    return base; // URL mal formada: se avisa más adelante al interpretar la respuesta.
  }
}

/** Envía un objeto ya listo al webhook o a la API de Sheets. */
async function enviarAlWebhook(config: any, payload: any) {
  if (config.googleWebhookUrl) {
    const destino = urlConParametros(config.googleWebhookUrl, payload?.data);
    const response = await fetch(destino, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    const text = await response.text();
    if (!response.ok && !text.trim()) {
      return { ok: false, error: `Google respondió con el código ${response.status}.` };
    }
    return interpretarRespuesta(text, response.status);
  }
  return { ok: false, error: 'Google Sheets / Webhook no configurado.' };
}

async function syncRow(config: any, log: any) {
  const payload = {
    action: 'appendRow',
    data: buildData(log),
    row: buildRow(log),
  };
  try {
    if (config.googleWebhookUrl) {
      return await enviarAlWebhook(config, payload);
    }
    if (config.googleSpreadsheetId && config.googleAccessToken) {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${config.googleSpreadsheetId}/values/Sheet1!A1:append?valueInputOption=USER_ENTERED`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.googleAccessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [buildRow(log)] }),
      });
      if (response.ok) return { ok: true };
      return { ok: false, error: (await response.text()).slice(0, 300) };
    }
    return { ok: false, error: 'Google Sheets / Webhook no configurado.' };
  } catch (error: any) {
    return { ok: false, error: error.message || 'Error de red' };
  }
}

// --- Registro de nota del colaborador ---
app.post('/api/submit-score', async (req, res) => {
  const {
    studentName, studentDni, storeName, personaje, moduleId, moduleTitle,
    teacherUsername, mistakeLog, totalSeconds, processSteps, attemptId,
  } = req.body || {};

  // Validación estricta: sin estos datos la fila no sirve para nada, y es
  // exactamente lo que llenaba la hoja de "Desconocido" / "N/A" / ceros.
  if (!attemptId || typeof attemptId !== 'string') {
    return res.status(400).json({ error: 'Falta el identificador del intento.' });
  }
  if (!String(studentName || '').trim() || !String(studentDni || '').trim()) {
    return res.status(400).json({ error: 'Nombre y DNI del colaborador son requeridos.' });
  }
  if (!String(moduleTitle || '').trim() || !String(moduleId || '').trim()) {
    return res.status(400).json({ error: 'Falta el módulo del intento.' });
  }
  const teacher = String(teacherUsername || '').trim();
  if (!teacher) {
    return res.status(400).json({ error: 'Falta el entrenador asignado.' });
  }
  const users = await readUsers();
  if (!users.find((u: any) => u.username === teacher)) {
    return res.status(400).json({ error: 'El entrenador indicado no existe.' });
  }

  const existing = await readStudentLogs(teacher);
  const duplicate = existing.find((l: any) => l.attemptId === attemptId);
  if (duplicate) {
    // Reintento del mismo intento (doble montaje de React, recarga, reenvío):
    // se responde con el registro ya guardado en vez de duplicar la fila.
    return res.json({
      success: true,
      status: duplicate.syncStatus === 'Sincronizado' ? 'synced' : 'saved_locally',
      message: 'Este intento ya estaba registrado.',
      log: duplicate,
    });
  }

  // El límite de intentos se comprueba AQUÍ y no solo en el navegador: si no,
  // bastaría con recargar la página para saltárselo.
  const dniLimpio = String(studentDni).trim();
  const estado = await readEstado(teacher, dniLimpio);
  const usadosAntes = Number(estado.modulos?.[moduleId]?.intentosUsados) || 0;
  if (usadosAntes >= MAX_INTENTOS) {
    return res.status(409).json({
      error: `Ya usaste tus ${MAX_INTENTOS} oportunidades en este módulo. Se conserva tu mejor nota.`,
      limiteAlcanzado: true,
    });
  }

  const config = await readConfig(teacher);
  const penaltyPerError = Number(config.penaltyPerError ?? 1);
  const penaltyPerHint = Number(config.penaltyPerHint ?? 0.5);

  const mistakes = Array.isArray(mistakeLog) ? mistakeLog : [];
  const hintsCount = mistakes.filter((m: any) => m.isHint).length;
  const mistakesCount = mistakes.length - hintsCount;
  const penalty = mistakes.reduce(
    (sum: number, m: any) => sum + (m.isHint ? penaltyPerHint : penaltyPerError),
    0
  );

  const maxScore = config.gradingScale === 'percentage' ? 100 : 20;
  const score = Math.round(Math.max(0, maxScore - penalty) * 10) / 10;

  const defaultPass = config.gradingScale === 'percentage' ? 70 : 14;
  const passingScore = Number(config.passingScore ?? defaultPass);
  const approved = score >= passingScore;

  let rating: string;
  if (config.gradingScale === 'percentage') {
    rating = score >= 90 ? 'Excelente' : score >= 70 ? 'Aprobado' : score >= 55 ? 'Regular' : 'Debe reforzar';
  } else {
    rating = score >= 18 ? 'Excelente' : score >= 14 ? 'Aprobado' : score >= 11 ? 'Regular' : 'Debe reforzar';
  }

  const seconds = Number.isFinite(Number(totalSeconds)) ? Math.max(0, Math.round(Number(totalSeconds))) : 0;
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  const newLog: any = {
    id: 'log_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    attemptId,
    timestamp: new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' }),
    // Marca de tiempo comparable, para saber qué filas son anteriores a un
    // reinicio de la capacitación. La de arriba es texto para la hoja.
    registradoEn: Date.now(),
    studentName: String(studentName).trim(),
    studentDni: String(studentDni).trim(),
    storeName: String(storeName || '').trim() || 'Sin tienda',
    personaje: String(personaje || '').trim().slice(0, 40),
    moduleId,
    moduleTitle,
    score,
    mistakesCount,
    hintsCount,
    approved,
    rating,
    totalSeconds: seconds,
    totalTime: `${mm}:${ss}`,
    mistakeLogStr: mistakes.length
      ? mistakes
          .map((m: any) => `${m.isHint ? '[pista] ' : ''}${m.step} (-${m.isHint ? penaltyPerHint : penaltyPerError} pts)`)
          .join('\n')
      : 'Sin errores',
    processLogStr: Array.isArray(processSteps) && processSteps.length
      ? processSteps.map((s: any) => `[${s.time}] ${s.action}`).join('\n')
      : '',
    teacherName: teacher,
    syncStatus: 'No sincronizado',
    errorDetails: '',
  };

  const result = await syncRow(await readSheetGlobal(), newLog);
  if (result.ok) {
    newLog.syncStatus = 'Sincronizado';
  } else {
    newLog.syncStatus = 'Error de sincronización';
    newLog.errorDetails = result.error || '';
  }

  existing.unshift(newLog);
  await writeStudentLogs(teacher, existing.slice(0, 500));

  // La tabla de los diez mejores acaba de quedar desactualizada. Sin esto, un
  // colaborador que termina su módulo y entra al ranking se ve todavía sin la
  // nota que acaba de sacar, que es justo cuando más ganas tiene de mirarla.
  cacheRanking = null;

  // Terminar el módulo consume un intento y cierra el guardado a medias.
  const usados = usadosAntes + 1;
  estado.modulos[moduleId] = { ...(estado.modulos[moduleId] || {}), intentosUsados: usados, enCurso: null };
  await writeEstado(teacher, dniLimpio, estado);

  res.json({
    success: true,
    status: result.ok ? 'synced' : 'saved_locally',
    message: result.ok
      ? '¡Nota registrada y sincronizada en Google Sheets!'
      : 'Nota guardada en el panel del entrenador (no se pudo sincronizar con Sheets).',
    warning: result.ok ? undefined : result.error,
    log: newLog,
    intentosUsados: usados,
    quedan: Math.max(0, MAX_INTENTOS - usados),
  });
});

/**
 * Reintenta subir a la hoja todo lo que quedó sin sincronizar.
 *
 * Recorre a TODOS los entrenadores, no solo al que pulsa el botón: la hoja es
 * una sola y la conecta el administrador, así que arreglar la conexión tiene
 * que arrastrar consigo las filas pendientes de todo el mundo.
 */
app.post('/api/admin/retry-sync', requireAuth, requireAdmin, async (_req: any, res) => {
  const config = await readSheetGlobal();
  const users = await readUsers();
  let successCount = 0;
  let lastError = '';

  for (const user of users) {
    const logs = await readStudentLogs(user.username);
    let cambiado = false;
    for (const log of logs) {
      if (log.syncStatus === 'Sincronizado') continue;
      if (!isValidLog(log)) continue;
      const result = await syncRow(config, log);
      if (result.ok) {
        log.syncStatus = 'Sincronizado';
        log.errorDetails = '';
        successCount++;
        cambiado = true;
      } else {
        log.errorDetails = result.error;
        lastError = result.error || '';
        cambiado = true;
        break;
      }
    }
    if (cambiado) await writeStudentLogs(user.username, logs);
    if (lastError) break;
  }

  res.json({ success: true, successCount, error: lastError || undefined });
});

async function startServer() {
  await migrarLocalAFirestore();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => console.log(`Retail Pro Prism Simulator escuchando en http://localhost:${PORT}`));
}

startServer();
