// Define la URL base de tu bucket de Firebase Storage.
// Si subiste los archivos dentro de una carpeta "icons", usa "icons%2F".
// Si los subiste sueltos en la raíz, deja el prefijo vacío o usa solo la URL base.
const BUCKET_URL = 'https://firebasestorage.googleapis.com/v0/b/simulador-retail-pro.firebasestorage.app/o/';
const FOLDER_PREFIX = ''; // Deja esto vacío si las subiste en la raíz, o pon 'icons%2F' si están en una carpeta llamada icons
const SUFFIX = '?alt=media';

const getIconUrl = (filename: string) => `${BUCKET_URL}${FOLDER_PREFIX}${encodeURIComponent(filename)}${SUFFIX}`;

export const Icons = {
  puntoDeVenta: getIconUrl('Punto de venta.png'),
  clientes: getIconUrl('Menu Principal - Clientes.png'),
  xzOut: getIconUrl('Menu principal - xz-out.png'),
  nuevaTransaccion: getIconUrl('Nueva Transaccion.png'),
  busquedaTransaccion: getIconUrl('Busqueda de transaccion.png'),
  transaccionesPendientes: getIconUrl('Transacciones Pendientes.png'),
  promociones: getIconUrl('Promociones.png'),
  nuevoDesembolso: getIconUrl('Nuevo Desembolso.png'),
  buscarDesembolso: getIconUrl('Buscar Desembolso.png'),
  abrirGaveta: getIconUrl('Cambiar Gaveta Cajon.png'),
  cambiarGaveta: getIconUrl('Cambiar Gaveta Cajon.png'),
  retailProMenu: getIconUrl('Retail Pro menú.png'),
  arqueo: 'https://firebasestorage.googleapis.com/v0/b/simulador-retail-pro.firebasestorage.app/o/Modulo%2013%20arqueo%20de%20caja%2Fimagen%20de%20arqueo.PNG?alt=media',
  zOutCierre: 'https://firebasestorage.googleapis.com/v0/b/simulador-retail-pro.firebasestorage.app/o/Modulo%2013%20arqueo%20de%20caja%2FZ%20out%20cierre.PNG?alt=media',
  zOutHistorico: 'https://firebasestorage.googleapis.com/v0/b/simulador-retail-pro.firebasestorage.app/o/Modulo%2013%20arqueo%20de%20caja%2FZ%20out%20historico.PNG?alt=media'
};
