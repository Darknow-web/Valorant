/**
 * El camino correcto de cada módulo, expresado como acciones sobre la pantalla.
 *
 * Es lo que hace posible la prueba anti-atascos: para comprobar que un módulo
 * SIGUE siendo completable después de una secuencia de clics equivocados, hace
 * falta saber completarlo. Aquí está ese conocimiento, y solo aquí.
 *
 * Ojo: esto imita a un colaborador con el ratón, no llama a funciones internas.
 * Si un botón deja de existir o queda tapado, esta prueba falla — que es
 * exactamente lo que se quiere detectar.
 */

const SKU = '0065672265034';
const DNI = '76543210';
const RUC = '20123456789';
const DOC_DEVOLUCION = 'BA70-00003928';
const DNI_NC = '116002997';

/** Abre el desplegable que hay al lado de una etiqueta y elige una opción. */
const desplegable = (etiqueta, opcionId, texto) => [
  { tipo: 'abrirDesplegable', etiqueta },
  { tipo: 'elegirOpcion', id: opcionId, texto },
];

/** El bloque de datos del voucher de tarjeta, que se repite en los módulos 4 y 5. */
const voucherTarjeta = () => [
  ...desplegable('Metodo de Pago', 'pay-method-Tarjeta-de-Crédito'),
  ...desplegable('Tipo de Tarjeta', 'pay-select-card-type', 'Visa'),
  { tipo: 'escribirEn', id: 'input-e115', valor: '1234' },
  { tipo: 'escribirEn', id: 'input-no-autorizacion', valor: '098765' },
  { tipo: 'clic', id: 'pay-btn-apply' },
];

/** El recorrido de la pestaña de devolución, común a los módulos 10 y 11. */
const devolucion = (razon) => [
  { tipo: 'clic', id: 'pos-tab-devolucion' },
  { tipo: 'clic', id: 'pos-btn-buscar-doc' },
  { tipo: 'escribirEtiqueta', etiqueta: 'No. Documento', valor: DOC_DEVOLUCION },
  { tipo: 'clic', id: 'ret-btn-buscar' },
  { tipo: 'clic', id: 'ret-txn-doc' },
  { tipo: 'clic', id: 'ret-item-item1' },
  { tipo: 'clic', id: 'ret-btn-devolver-articulo' },
  { tipo: 'seleccionar', id: 'ret-reason-select', valor: razon },
  { tipo: 'seleccionarPrimera', id: 'ret-motivo-select' },
  { tipo: 'clic', id: 'ret-btn-regresar' },
  { tipo: 'seleccionar', id: 'pos-select-comprobante', valor: '07-NOTA CRED ELECT' },
  { tipo: 'clic', id: 'pos-btn-pay' },
];

export const CAMINOS = {
  m1: [
    { tipo: 'escribirEn', id: 'login-input-user', valor: 'sysadmin' },
    { tipo: 'escribirEn', id: 'login-input-password', valor: 'sysadmin' },
    { tipo: 'clic', id: 'login-btn-submit' },
  ],

  m2: [
    { tipo: 'clic', id: 'menu-btn-pos' },
    { tipo: 'clic', id: 'pos-menu-new-trans' },
    { tipo: 'clic', id: 'modal-register-yes' },
    { tipo: 'clic', id: 'zout-btn-abrir' },
    { tipo: 'escribirEn', id: 'input-fondo-caja', valor: '150.00' },
    { tipo: 'clic', id: 'btn-siguiente' },
  ],

  m3: [
    { tipo: 'clic', id: 'pos-menu-new-trans' },
    { tipo: 'buscar', id: 'pos-search-item', valor: SKU },
    { tipo: 'buscar', id: 'pos-search-customer', valor: DNI },
    { tipo: 'clic', id: 'pos-btn-pay' },
    { tipo: 'escribirEtiqueta', etiqueta: 'Take (!) Cantidad', valor: '200.00' },
    { tipo: 'clic', id: 'pay-btn-apply' },
    { tipo: 'clic', id: 'pay-btn-vuelto' },
    { tipo: 'clic', id: 'pay-btn-print-update' },
  ],

  m4: [
    { tipo: 'clic', id: 'pos-menu-new-trans' },
    { tipo: 'buscar', id: 'pos-search-item', valor: SKU },
    { tipo: 'buscar', id: 'pos-search-customer', valor: DNI },
    { tipo: 'clic', id: 'pos-btn-pay' },
    ...voucherTarjeta(),
    { tipo: 'clic', id: 'pay-btn-print-update' },
  ],

  m5: [
    { tipo: 'clic', id: 'pos-menu-new-trans' },
    { tipo: 'buscar', id: 'pos-search-item', valor: SKU },
    { tipo: 'buscar', id: 'pos-search-customer', valor: DNI },
    { tipo: 'clic', id: 'pos-btn-pay' },
    { tipo: 'escribirEtiqueta', etiqueta: 'Take (!) Cantidad', valor: '50.00' },
    { tipo: 'clic', id: 'pay-btn-apply' },
    ...voucherTarjeta(),
    { tipo: 'clic', id: 'pay-btn-print-update' },
  ],

  m6: [
    { tipo: 'clic', id: 'pos-menu-new-trans' },
    { tipo: 'buscar', id: 'pos-search-item', valor: SKU },
    { tipo: 'buscar', id: 'pos-search-customer', valor: RUC },
    { tipo: 'seleccionar', id: 'pos-select-comprobante', valor: '01-FACTURA' },
    { tipo: 'clic', id: 'pos-btn-pay' },
    { tipo: 'escribirEtiqueta', etiqueta: 'Take (!) Cantidad', valor: '200.00' },
    { tipo: 'clic', id: 'pay-btn-apply' },
    { tipo: 'clic', id: 'pay-btn-vuelto' },
    { tipo: 'clic', id: 'pay-btn-print-update' },
  ],

  m7: [
    { tipo: 'clic', id: 'pos-menu-new-trans' },
    { tipo: 'buscar', id: 'pos-search-item', valor: SKU },
    { tipo: 'buscar', id: 'pos-search-customer', valor: '22222222' },
    { tipo: 'marcar', selector: '#price-level-existing' },
    { tipo: 'clic', id: 'modal-price-level-yes' },
    { tipo: 'clic', id: 'pos-btn-pay' },
    { tipo: 'clic', id: 'pay-btn-rappi-pedidos', indice: 0 },
    { tipo: 'escribirEtiqueta', etiqueta: 'Código de autorización', valor: '884512' },
    { tipo: 'clic', id: 'modal-auth-ok' },
    { tipo: 'clic', id: 'pay-btn-print-update' },
  ],

  m8: [
    { tipo: 'clic', id: 'pos-menu-new-trans' },
    { tipo: 'buscar', id: 'pos-search-item', valor: SKU },
    { tipo: 'buscar', id: 'pos-search-customer', valor: '33333333' },
    { tipo: 'marcar', selector: '#price-level-existing' },
    { tipo: 'clic', id: 'modal-price-level-yes' },
    { tipo: 'clic', id: 'pos-btn-pay' },
    { tipo: 'clic', id: 'pay-btn-rappi-pedidos', indice: 1 },
    { tipo: 'escribirEtiqueta', etiqueta: 'Código de autorización', valor: '773190' },
    { tipo: 'clic', id: 'modal-auth-ok' },
    { tipo: 'clic', id: 'pay-btn-print-update' },
  ],

  m9: [
    { tipo: 'clic', id: 'pos-menu-new-trans' },
    { tipo: 'clic', id: 'pos-btn-new-cust' },
    { tipo: 'escribirEn', id: 'cust-new-name', valor: 'ROSA' },
    { tipo: 'escribirEn', id: 'cust-new-lastname', valor: 'QUISPE' },
    { tipo: 'escribirEn', id: 'cust-new-email', valor: 'rosa.quispe@correo.com' },
    { tipo: 'escribirEn', id: 'cust-new-doc', valor: '70418823' },
    { tipo: 'seleccionar', id: 'cust-new-doctype', valor: 'DNI' },
    { tipo: 'clic', id: 'cust-new-save' },
  ],

  m10: [
    ...devolucion('Devo'),
    { tipo: 'clic', id: 'pay-btn-nc-transferencia' },
    { tipo: 'clic', id: 'modal-nctransf-ok' },
    { tipo: 'clic', id: 'pay-btn-print-update' },
  ],

  m11: [
    ...devolucion('Cambio'),
    ...desplegable('Metodo de Pago', 'pay-method-Crédito-de-Tienda'),
    { tipo: 'clic', id: 'pay-btn-vuelto' },
    { tipo: 'clic', id: 'pay-btn-print-update' },
    { tipo: 'buscar', id: 'pos-search-item', valor: SKU },
    { tipo: 'buscar', id: 'pos-search-customer', valor: DNI_NC },
    { tipo: 'clic', id: 'pos-btn-pay' },
    { tipo: 'clic', id: 'modal-store-credit-yes' },
    { tipo: 'clic', id: 'pay-btn-apply' },
    ...desplegable('Metodo de Pago', 'pay-method-Efectivo'),
    { tipo: 'clic', id: 'pay-btn-apply' },
    { tipo: 'clic', id: 'pay-btn-print-update' },
  ],

  m12: [
    { tipo: 'clic', id: 'menu-btn-xz' },
    { tipo: 'clic', id: 'xz-btn-arqueo' },
    { tipo: 'clic', id: 'arqueo-btn-imprimir' },
  ],

  m13: [
    { tipo: 'clic', id: 'pos-menu-new-desembolso' },
    { tipo: 'clic', id: 'desembolso-retiro-dinero' },
    { tipo: 'escribirEtiqueta', etiqueta: 'Nota', valor: 'Cierre 12/08/2026' },
    { tipo: 'clic', id: 'desembolso-add-payment' },
    { tipo: 'clic', id: 'desembolso-click-cantidad' },
    { tipo: 'escribirEnfocado', valor: '774.41' },
    { tipo: 'clic', id: 'desembolso-update' },
  ],

  m14: [
    { tipo: 'clic', id: 'menu-btn-xz' },
    { tipo: 'clic', id: 'xz-btn-close' },
    { tipo: 'clic', id: 'zout-btn-auditoria' },
    { tipo: 'escribirEn', id: 'input-fondo-caja', valor: '150.00' },
    { tipo: 'clic', id: 'btn-siguiente' },
    { tipo: 'clic', id: 'btn-check-all-trans' },
    { tipo: 'clic', id: 'btn-cerrar-caja' },
    { tipo: 'clic', id: 'modal-confirm-yes' },
    { tipo: 'clic', id: 'btn-finalizar-imprimir' },
  ],
};

export const MODULOS = Object.keys(CAMINOS);
