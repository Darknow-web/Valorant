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
try {
  const configPath = process.env.FIREBASE_CONFIG_PATH || './firebase-applet-config.json';
  const rawConfig = process.env.FIREBASE_CONFIG || (fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf8') : '');
  if (rawConfig) {
    const firebaseConfig = JSON.parse(rawConfig);
    const appFirebase = initializeApp(firebaseConfig);
    db = getFirestore(appFirebase, firebaseConfig.firestoreDatabaseId);
  } else {
    console.log('[prism] Firebase no configurado. Usando almacenamiento local.');
  }
} catch (e) {
  console.error('[prism] Error inicializando Firebase.', e);
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

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
  const generated = crypto.randomBytes(6).toString('base64url');
  console.warn(`[prism] Clave inicial generada para "${label}": ${generated} (defínela con ${envVar} para fijarla). Deberá cambiarse en el primer ingreso.`);
  return generated;
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

// --- Firestore helpers ---
async function readUsers() {
  if (!db) {
    if (!mockUsers.length) {
      mockUsers = seedUsers();
      saveLocalDB();
    }
    return mockUsers;
  }
  const d = await getDoc(doc(db, 'app', 'users'));
  let users = d.exists() ? d.data().users : [];
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
    await setDoc(doc(db, 'app', 'users'), { users });
  } else {
    mockUsers = users;
    saveLocalDB();
  }
}

const defaultConfig = {
  googleSpreadsheetId: '',
  googleWebhookUrl: '',
  googleAccessToken: '',
  penaltyPerError: 1,
  penaltyPerHint: 0.5,
  gradingScale: 'vigesimal' as 'vigesimal' | 'percentage',
  passingScore: 14,
  // Overrides de DATOS por paso: { [stepId]: { targetValue?, expectedState? } }
  stepData: {} as Record<string, any>,
};

async function readConfig(username: string) {
  let conf: any;
  if (username) {
    if (db) {
      const d = await getDoc(doc(db, 'app', 'configs_' + username));
      if (d.exists()) conf = d.data();
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
    await setDoc(doc(db, 'app', 'configs_' + username), clean);
  } else {
    mockConfigs[username] = clean;
    saveLocalDB();
  }
}

async function readStudentLogs(username: string) {
  if (!username) return [];
  if (!db) return mockLogs[username] || [];
  const d = await getDoc(doc(db, 'app', 'logs_' + username));
  return d.exists() ? d.data().logs || [] : [];
}

async function writeStudentLogs(username: string, logs: any[]) {
  if (!username) return;
  if (db) {
    await setDoc(doc(db, 'app', 'logs_' + username), { logs });
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
  } catch (e) {
    console.error('[prism] Error leyendo el almacén local.', e);
  }
}
function saveLocalDB() {
  try {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify({ mockUsers, mockConfigs, mockLogs }, null, 2));
  } catch (e) {
    console.error('[prism] Error escribiendo el almacén local.', e);
  }
}
loadLocalDB();

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

// --- Configuración del entrenador (siempre la propia; nunca la de otro) ---
function safeConfig(config: any) {
  return {
    hasWebhook: !!config.googleWebhookUrl,
    hasToken: !!config.googleAccessToken,
    googleSpreadsheetId: config.googleSpreadsheetId,
    googleWebhookUrl: config.googleWebhookUrl,
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
  const fields = ['googleSpreadsheetId', 'googleWebhookUrl', 'googleAccessToken', 'penaltyPerError', 'penaltyPerHint', 'gradingScale', 'passingScore'];
  const updated: any = { ...current };
  fields.forEach((f) => {
    if (req.body[f] !== undefined) updated[f] = req.body[f];
  });
  await writeConfig(req.user.username, updated);
  res.json({ success: true, ...safeConfig(updated) });
});

app.post('/api/admin/disconnect', requireAuth, async (req: any, res) => {
  const current = await readConfig(req.user.username);
  current.googleAccessToken = '';
  current.googleWebhookUrl = '';
  await writeConfig(req.user.username, current);
  res.json({ success: true });
});

// --- Datos de validación por paso (overrides). El alumno los lee en modo público:
// son datos del simulador (SKU, DNI de prueba, montos), no información sensible. ---
app.get('/api/step-data', async (req, res) => {
  const teacher = String(req.query.teacher || '');
  if (!teacher) return res.json({ stepData: {} });
  const config = await readConfig(teacher);
  res.json({ stepData: config.stepData || {} });
});

app.get('/api/admin/step-data', requireAuth, async (req: any, res) => {
  const config = await readConfig(req.user.username);
  res.json({ stepData: config.stepData || {} });
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
    if (Object.keys(entry).length) clean[stepId] = entry;
  }
  const config = await readConfig(req.user.username);
  config.stepData = clean;
  await writeConfig(req.user.username, config);
  res.json({ success: true, stepData: clean });
});

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
const SHEET_HEADERS = [
  'Fecha', 'Cajero', 'DNI', 'Tienda', 'Módulo', 'Puntaje', 'Tiempo (s)',
  'Errores', 'Ayudas', 'Aprobado', 'Calificación', 'Entrenador',
  'Detalle de errores', 'Detalle del proceso', 'ID de intento',
];

function buildData(log: any) {
  return {
    fecha: log.timestamp,
    cajero: log.studentName,
    dni: log.studentDni,
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

async function syncRow(config: any, log: any) {
  const payload = {
    action: 'appendRow',
    data: buildData(log),
    row: buildRow(log),
  };
  try {
    if (config.googleWebhookUrl) {
      const response = await fetch(config.googleWebhookUrl, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });
      const text = await response.text();
      if (!response.ok) return { ok: false, error: `HTTP ${response.status}: ${text.slice(0, 300)}` };
      // Apps Script devuelve 200 incluso ante errores internos; si responde JSON
      // con ok:false lo tratamos como fallo para no marcarlo como sincronizado.
      try {
        const parsed = JSON.parse(text);
        if (parsed && parsed.ok === false) return { ok: false, error: parsed.error || 'El Apps Script devolvió un error.' };
      } catch {
        /* respuesta no-JSON: se asume éxito por el 200 */
      }
      return { ok: true };
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
    studentName, studentDni, storeName, moduleId, moduleTitle,
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
    studentName: String(studentName).trim(),
    studentDni: String(studentDni).trim(),
    storeName: String(storeName || '').trim() || 'Sin tienda',
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

  const result = await syncRow(config, newLog);
  if (result.ok) {
    newLog.syncStatus = 'Sincronizado';
  } else {
    newLog.syncStatus = 'Error de sincronización';
    newLog.errorDetails = result.error || '';
  }

  existing.unshift(newLog);
  await writeStudentLogs(teacher, existing.slice(0, 500));

  res.json({
    success: true,
    status: result.ok ? 'synced' : 'saved_locally',
    message: result.ok
      ? '¡Nota registrada y sincronizada en Google Sheets!'
      : 'Nota guardada en el panel del entrenador (no se pudo sincronizar con Sheets).',
    warning: result.ok ? undefined : result.error,
    log: newLog,
  });
});

app.post('/api/admin/retry-sync', requireAuth, async (req: any, res) => {
  const config = await readConfig(req.user.username);
  const logs = await readStudentLogs(req.user.username);
  let successCount = 0;
  let lastError = '';

  for (const log of logs) {
    if (log.syncStatus === 'Sincronizado') continue;
    if (!isValidLog(log)) continue;
    const result = await syncRow(config, log);
    if (result.ok) {
      log.syncStatus = 'Sincronizado';
      log.errorDetails = '';
      successCount++;
    } else {
      log.errorDetails = result.error;
      lastError = result.error || '';
      break;
    }
  }

  await writeStudentLogs(req.user.username, logs);
  res.json({ success: true, successCount, error: lastError || undefined });
});

async function startServer() {
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
