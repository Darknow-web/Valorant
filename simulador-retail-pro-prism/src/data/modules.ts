import { AppState, ModuleData } from '../types';

// Helper to update app state cleanly
const updateState = (update: Partial<AppState>) => (state: AppState) => {
  Object.assign(state, update);
};

export const modulesData: ModuleData[] = [
  {
    id: 'm1',
    title: 'Módulo 1 — Ingreso al sistema',
    steps: [
      { id: 'm1-s1', instruction: 'Ingresa tu usuario (sysadmin) y contraseña (sysadmin) y presiona Iniciar sesión.', targetId: 'login-btn-submit', screenId: 'login', expectedState: { user: 'sysadmin', password: 'sysadmin' }, action: (s) => { s.user = ''; s.password = ''; } },
      { id: 'm1-s2', instruction: 'Revisa que el inicio de sesión se ha completado.', targetId: 'auto', screenId: 'login' }
    ]
  },
  {
    id: 'm2',
    title: 'Módulo 2 — Apertura de caja',
    steps: [
      { id: 'm2-s1', instruction: 'Haz clic en la pestaña "Punto de Venta".', targetId: 'menu-btn-pos', screenId: 'main-menu' },
      { id: 'm2-s2', instruction: 'Inicia una nueva transacción.', targetId: 'pos-menu-new-trans', screenId: 'pos-menu' },
      { id: 'm2-s3', instruction: 'La registradora no está abierta. Haz clic en "Sí" para abrirla.', targetId: 'modal-register-yes', screenId: 'pos-menu' },
      { id: 'm2-s3-1', instruction: 'En la pantalla de criterios de la registradora, haz clic en "Abrir Caja" (el botón celeste).', targetId: 'zout-btn-abrir', screenId: 'z-out-close' },
      { id: 'm2-s4', instruction: 'Ingresa el Fondo de Caja (150.00) en la sección "Total Nuevo Sol" y haz clic en Siguiente.', targetId: 'btn-siguiente', screenId: 'registro', expectedState: { fondoCaja: '150.00' }, action: (s) => { s.registerOpen = true; } },
      { id: 'm2-s7', instruction: 'Revisa que la registradora se ha abierto.', targetId: 'auto', screenId: 'pos-menu' }
    ]
  },
  {
    id: 'm3',
    title: 'Módulo 3 — Proceso de venta pago con efectivo',
    steps: [
      { id: 'm3-s1', instruction: 'Inicia una nueva transacción.', targetId: 'pos-menu-new-trans', screenId: 'pos-menu', action: (s) => { s.registerOpen = true; } },
      { id: 'm3-s2', instruction: 'Ingresa el SKU del producto en la barra de búsqueda y presiona Enter.', targetId: 'pos-search-item', screenId: 'pos-main', targetValue: '0065672265034' },
      { id: 'm3-s3', instruction: 'Busca y selecciona un cliente ingresando su DNI y presionando Enter.', targetId: 'pos-search-customer', screenId: 'pos-main', targetValue: '76543210' },
      { id: 'm3-s4', instruction: 'Procede a pagar la transacción.', targetId: 'pos-btn-pay', screenId: 'pos-main' },
      { id: 'm3-s6', instruction: 'Ingresa el monto recibido (200.00) y haz clic en el botón "Pago" para aplicar el pago.', targetId: 'pay-btn-apply', screenId: 'payment', expectedState: { takeAmount: '200.00' } },
      { id: 'm3-s7', instruction: 'Haz clic en el botón "Vuelto" para confirmar la entrega del vuelto.', targetId: 'pay-btn-vuelto', screenId: 'payment' },
      { id: 'm3-s8', instruction: 'Imprime y actualiza el documento para finalizar.', targetId: 'pay-btn-print-update', screenId: 'payment', action: (s) => { s.cart = []; s.currentCustomer = null; s.payments = []; s.takeAmount = ''; s.vueltoGiven = false; } },
      { id: 'm3-s9', instruction: 'Revisa que la transacción se ha completado.', targetId: 'auto', screenId: 'payment' }
    ]
  },
  {
    id: 'm4',
    title: 'Módulo 4 — Proceso de venta pago con tarjeta',
    steps: [
      { id: 'm4-s1', instruction: 'Inicia una nueva transacción.', targetId: 'pos-menu-new-trans', screenId: 'pos-menu', action: (s) => { s.registerOpen = true; } },
      { id: 'm4-s2', instruction: 'Ingresa el SKU del producto en la barra de búsqueda y presiona Enter.', targetId: 'pos-search-item', screenId: 'pos-main', targetValue: '0065672265034' },
      { id: 'm4-s3', instruction: 'Busca y selecciona un cliente ingresando su DNI y presionando Enter.', targetId: 'pos-search-customer', screenId: 'pos-main', targetValue: '76543210' },
      { id: 'm4-s4', instruction: 'Procede a pagar la transacción.', targetId: 'pos-btn-pay', screenId: 'pos-main' },
      { id: 'm4-s5', instruction: 'Selecciona "Tarjeta de Crédito", elige "Visa" en Tipo de Tarjeta, llena los datos del voucher (E-115: 1234, No. Autorización: 098765) y haz clic en "Pago".', targetId: 'pay-btn-apply', screenId: 'payment', expectedState: { selectedPaymentMethod: 'Tarjeta de Crédito', cardType: 'Visa', tipoProcesamiento: 'Manual', e115: '1234', noAutorizacion: '098765', autorizacionForzada: '', e116: '' } },
      { id: 'm4-s6', instruction: 'Imprime y actualiza el documento para finalizar.', targetId: 'pay-btn-print-update', screenId: 'payment', action: (s) => { s.cart = []; s.currentCustomer = null; s.payments = []; s.takeAmount = ''; s.cardType = ''; s.tipoProcesamiento = 'Manual'; s.e115 = ''; s.noAutorizacion = ''; s.selectedPaymentMethod = 'Efectivo'; } },
      { id: 'm4-s7', instruction: 'Revisa que la transacción se ha completado.', targetId: 'auto', screenId: 'payment' }
    ]
  },
  {
    id: 'm5',
    title: 'Módulo 5 — Proceso de pago mixto',
    steps: [
      { id: 'm5-s1', instruction: 'Inicia una nueva transacción.', targetId: 'pos-menu-new-trans', screenId: 'pos-menu', action: (s) => { s.registerOpen = true; } },
      { id: 'm5-s2', instruction: 'Ingresa el SKU del producto en la barra de búsqueda y presiona Enter.', targetId: 'pos-search-item', screenId: 'pos-main', targetValue: '0065672265034' },
      { id: 'm5-s3', instruction: 'Busca y selecciona un cliente ingresando su DNI y presionando Enter.', targetId: 'pos-search-customer', screenId: 'pos-main', targetValue: '76543210' },
      { id: 'm5-s4', instruction: 'Procede a pagar la transacción.', targetId: 'pos-btn-pay', screenId: 'pos-main' },
      { id: 'm5-s5', instruction: 'Ingresa un pago parcial de 50.00 en Efectivo y haz clic en "Pago".', targetId: 'pay-btn-apply', screenId: 'payment', expectedState: { selectedPaymentMethod: 'Efectivo', takeAmount: '50.00' } },
      { id: 'm5-s6', instruction: 'Selecciona "Tarjeta de Crédito", elige "Visa" en Tipo de Tarjeta, llena los datos del voucher (E-115: 1234, No. Autorización: 098765) y haz clic en "Pago" para el saldo restante.', targetId: 'pay-btn-apply', screenId: 'payment', expectedState: { selectedPaymentMethod: 'Tarjeta de Crédito', cardType: 'Visa', tipoProcesamiento: 'Manual', e115: '1234', noAutorizacion: '098765', autorizacionForzada: '', e116: '' } },
      { id: 'm5-s7', instruction: 'Imprime y actualiza el documento para finalizar.', targetId: 'pay-btn-print-update', screenId: 'payment', action: (s) => { s.cart = []; s.currentCustomer = null; s.payments = []; s.takeAmount = ''; s.cardType = ''; s.tipoProcesamiento = 'Manual'; s.e115 = ''; s.noAutorizacion = ''; s.selectedPaymentMethod = 'Efectivo'; } },
      { id: 'm5-s8', instruction: 'Revisa que la transacción se ha completado.', targetId: 'auto', screenId: 'payment' }
    ]
  },
  {
    id: 'm6',
    title: 'Módulo 6 — Proceso de venta con factura',
    steps: [
      { id: 'm6-s1', instruction: 'Inicia una nueva transacción.', targetId: 'pos-menu-new-trans', screenId: 'pos-menu', action: (s) => { s.registerOpen = true; } },
      { id: 'm6-s2', instruction: 'Ingresa el SKU del producto en la barra de búsqueda y presiona Enter.', targetId: 'pos-search-item', screenId: 'pos-main', targetValue: '0065672265034' },
      { id: 'm6-s3', instruction: 'Busca y selecciona un cliente ingresando su RUC y presionando Enter.', targetId: 'pos-search-customer', screenId: 'pos-main', targetValue: '20123456789' },
      { id: 'm6-s4', instruction: 'Cambia el tipo de comprobante a "01-FACTURA".', targetId: 'pos-select-comprobante', screenId: 'pos-main', targetValue: '01-FACTURA', action: (s) => { s.comprobanteType = '01-FACTURA'; } },
      { id: 'm6-s5', instruction: 'Procede a pagar la transacción.', targetId: 'pos-btn-pay', screenId: 'pos-main' },
      { 
        id: 'm6-s6', 
        instruction: 'Aplica el pago y completa la transacción (Efectivo, Tarjeta o Mixto). Recuerda dar vuelto si el monto recibido es mayor al total. Al finalizar, presiona Imprimir Actualizar.',
        targetId: 'pay-btn-print-update',
        screenId: 'payment',
        // El paso pide expresamente aplicar el pago y dar el vuelto antes de
        // imprimir: esas acciones no son un error.
        allowedTargets: ['pay-btn-apply', 'pay-btn-vuelto'],
        validator: (state) => {
            const totalDoc = state.cart.reduce((sum, item) => sum + item.price, 0);
            const totalPaid = state.payments.reduce((sum, p) => sum + p.amount, 0);
            if (totalPaid + 0.01 < totalDoc) return 'Debes cubrir el total del documento antes de finalizar. Primero haz clic en el botón "Pago" para aplicarlo.';
            const vuelto = totalPaid - totalDoc;
            if (vuelto > 0.01 && !state.vueltoGiven) return 'El pago es mayor al total. Debes entregar vuelto haciendo clic en el botón "Vuelto" antes de finalizar.';
            return true;
        },
        action: (s) => { s.cart = []; s.currentCustomer = null; s.payments = []; s.takeAmount = ''; s.cardType = ''; s.tipoProcesamiento = 'Manual'; s.e115 = ''; s.noAutorizacion = ''; s.selectedPaymentMethod = 'Efectivo'; s.comprobanteType = '03-BOL ELECT'; s.vueltoGiven = false; } 
       },
      { id: 'm6-s7', instruction: 'Revisa que la transacción se ha completado.', targetId: 'auto', screenId: 'payment' }
    ]
  },
  {
    id: 'm7',
    title: 'Módulo 7 — Proceso de venta por Rappi',
    steps: [
      { id: 'm7-s1', instruction: 'Inicia una nueva transacción.', targetId: 'pos-menu-new-trans', screenId: 'pos-menu', action: (s) => { s.registerOpen = true; } },
      { id: 'm7-s2', instruction: 'Ingresa el SKU del producto en la barra de búsqueda y presiona Enter.', targetId: 'pos-search-item', screenId: 'pos-main', targetValue: '0065672265034' },
      { id: 'm7-s3', instruction: 'Busca al cliente ingresando el DNI de Rappi (22222222) y presiona Enter.', targetId: 'pos-search-customer', screenId: 'pos-main', targetValue: '22222222' },
      { id: 'm7-s4', instruction: 'En la ventana emergente, marca la casilla "Change price level for existing items" y haz clic en "Sí".', targetId: 'modal-price-level-yes', screenId: 'pos-main', expectedState: { applyPriceLevelToExisting: true } },
      { id: 'm7-s6', instruction: 'Procede a pagar la transacción.', targetId: 'pos-btn-pay', screenId: 'pos-main', validator: (s) => s.priceLevelActive ? true : 'El precio incrementado no se ha aplicado' },
      { id: 'm7-s7', instruction: 'Selecciona RAPPI como método de pago.', targetId: 'pay-btn-rappi-pedidos', screenId: 'payment', targetValue: 'RAPPI', action: (s) => { s.showAuthModal = true; s.selectedPaymentMethod = 'RAPPI'; } },
      { id: 'm7-s8', instruction: 'Ingresa el código de autorización en la ventana emergente y haz clic en OK.', targetId: 'modal-auth-ok', screenId: 'payment', action: (s) => { 
          const amount = Number(s.takeAmount || s.cart.reduce((sum, item) => sum + item.price, 0));
          s.payments = [...s.payments, { method: s.selectedPaymentMethod, amount }];
          s.showAuthModal = false;
          s.authCode = '';
      } },
      { id: 'm7-s9', instruction: 'Imprime y actualiza el documento para finalizar.', targetId: 'pay-btn-print-update', screenId: 'payment', action: (s) => { s.cart = []; s.currentCustomer = null; s.payments = []; s.priceLevelActive = false; s.takeAmount = ''; s.selectedPaymentMethod = 'Efectivo'; } },
      { id: 'm7-s10', instruction: 'Revisa que la transacción se ha completado.', targetId: 'auto', screenId: 'payment' }
    ]
  },
  {
    id: 'm8',
    title: 'Módulo 8 — Proceso de venta por Pedidos Ya',
    steps: [
      { id: 'm8-s1', instruction: 'Inicia una nueva transacción.', targetId: 'pos-menu-new-trans', screenId: 'pos-menu', action: (s) => { s.registerOpen = true; } },
      { id: 'm8-s2', instruction: 'Ingresa el SKU del producto en la barra de búsqueda y presiona Enter.', targetId: 'pos-search-item', screenId: 'pos-main', targetValue: '0065672265034' },
      { id: 'm8-s3', instruction: 'Busca al cliente ingresando el DNI de Pedidos Ya (33333333) y presiona Enter.', targetId: 'pos-search-customer', screenId: 'pos-main', targetValue: '33333333' },
      { id: 'm8-s4', instruction: 'En la ventana emergente, marca la casilla "Change price level for existing items" y haz clic en "Sí".', targetId: 'modal-price-level-yes', screenId: 'pos-main', expectedState: { applyPriceLevelToExisting: true } },
      { id: 'm8-s6', instruction: 'Procede a pagar la transacción.', targetId: 'pos-btn-pay', screenId: 'pos-main', validator: (s) => s.priceLevelActive ? true : 'El precio incrementado no se ha aplicado' },
      { id: 'm8-s7', instruction: 'Selecciona PEDIDOS YA como método de pago.', targetId: 'pay-btn-rappi-pedidos', screenId: 'payment', targetValue: 'PEDIDOS YA', action: (s) => { s.showAuthModal = true; s.selectedPaymentMethod = 'PEDIDOS YA'; } },
      { id: 'm8-s8', instruction: 'Ingresa el código de autorización en la ventana emergente y haz clic en OK.', targetId: 'modal-auth-ok', screenId: 'payment', action: (s) => { 
          const amount = Number(s.takeAmount || s.cart.reduce((sum, item) => sum + item.price, 0));
          s.payments = [...s.payments, { method: s.selectedPaymentMethod, amount }];
          s.showAuthModal = false;
          s.authCode = '';
      } },
      { id: 'm8-s9', instruction: 'Imprime y actualiza el documento para finalizar.', targetId: 'pay-btn-print-update', screenId: 'payment', action: (s) => { s.cart = []; s.currentCustomer = null; s.payments = []; s.priceLevelActive = false; s.takeAmount = ''; s.selectedPaymentMethod = 'Efectivo'; } },
      { id: 'm8-s10', instruction: 'Revisa que la transacción se ha completado.', targetId: 'auto', screenId: 'payment' }
    ]
  },
  {
    id: 'm9',
    title: 'Módulo 9 — Creación de Cliente',
    steps: [
      { id: 'm9-s1', instruction: 'Inicia una nueva transacción.', targetId: 'pos-menu-new-trans', screenId: 'pos-menu', action: (s) => { s.registerOpen = true; } },
      { id: 'm9-s2', instruction: 'Haz clic en el botón "Nuevo" debajo de la búsqueda de clientes.', targetId: 'pos-btn-new-cust', screenId: 'pos-main', action: (s) => { s.showNewCustomerModal = true; } },
      { id: 'm9-s3', instruction: 'Llena los datos obligatorios (Nombre, Apellido, Email, DNI/Tipo) y haz clic en Guardar.', targetId: 'cust-new-save', screenId: 'pos-main', action: (s) => {
          s.currentCustomer = { name: s.newCustomerName + ' ' + s.newCustomerLastName, doc: s.newCustomerDoc };
          s.showNewCustomerModal = false;
          s.newCustomerName = '';
          s.newCustomerLastName = '';
          s.newCustomerEmail = '';
          s.newCustomerDoc = '';
          s.newCustomerDocType = '';
      } }
    ]
  },
  {
    id: 'm10',
    title: 'Módulo 10 — Notas de crédito (Devolución)',
    steps: [
      { id: 'm10-s1', instruction: 'En Punto de Venta, ve a la pestaña "Devolución".', targetId: 'pos-tab-devolucion', screenId: 'pos-main', action: (s) => { s.registerOpen = true; } },
      { id: 'm10-s2', instruction: 'Haz clic en Buscar Documento.', targetId: 'pos-btn-buscar-doc', screenId: 'pos-main' },
      { id: 'm10-s3', instruction: 'Ingresa el número de documento y haz clic en Buscar.', targetId: 'ret-btn-buscar', screenId: 'returns-main' },
      { id: 'm10-s4', instruction: 'Selecciona la transacción de la lista.', targetId: 'ret-txn-doc', screenId: 'returns-main' },
      { id: 'm10-s5', instruction: 'Selecciona el artículo a devolver.', targetId: 'ret-item-item1', screenId: 'returns-main' },
      { id: 'm10-s6', instruction: 'Haz clic en Devolver Artículo.', targetId: 'ret-btn-devolver-articulo', screenId: 'returns-main' },
      { id: 'm10-s7', instruction: 'Selecciona la razón para devolver.', targetId: 'ret-reason-select', targetValue: 'Devo', screenId: 'returns-main' },
      { id: 'm10-s8', instruction: 'Selecciona cualquier motivo.', targetId: 'ret-motivo-select', screenId: 'returns-main' },
      { id: 'm10-s9', instruction: 'Regresa al documento principal.', targetId: 'ret-btn-regresar', screenId: 'returns-main' },
      { id: 'm10-s10', instruction: 'Cambia el comprobante a NOTA CRED ELECT.', targetId: 'pos-select-comprobante', targetValue: '07-NOTA CRED ELECT', screenId: 'pos-main', action: (s) => { s.comprobanteType = '07-NOTA CRED ELECT'; } },
      { id: 'm10-s11', instruction: 'Procede a pagar la transacción.', targetId: 'pos-btn-pay', screenId: 'pos-main', validator: (s) => s.cart.length > 0 && s.cart[0].price < 0 ? true : 'No hay artículos en devolución' },
      { id: 'm10-s12', instruction: 'Selecciona "NC TRANSFERENCIA" como método de pago.', targetId: 'pay-btn-nc-transferencia', screenId: 'payment' },
      { id: 'm10-s13', instruction: 'Acepta el modal de datos bancarios.', targetId: 'modal-nctransf-ok', screenId: 'payment' },
      { id: 'm10-s14', instruction: 'Haz clic en Imprimir Actualizar.', targetId: 'pay-btn-print-update', screenId: 'payment', action: (s) => { s.cart = []; s.currentCustomer = null; s.payments = []; s.takeAmount = ''; s.selectedPaymentMethod = 'Efectivo'; s.returnReason = ''; s.returnItems = []; s.comprobanteType = '03-BOL ELECT'; } },
      { id: 'm10-s15', instruction: 'Revisa que la transacción se ha completado.', targetId: 'auto', screenId: 'pos-main' }
    ]
  },
  {
    id: 'm11',
    title: 'Módulo 11 — Notas de crédito (Cambio)',
    steps: [
      { id: 'm11-s1', instruction: 'En Punto de Venta, ve a la pestaña "Devolución".', targetId: 'pos-tab-devolucion', screenId: 'pos-main', action: (s) => { s.registerOpen = true; } },
      { id: 'm11-s2', instruction: 'Haz clic en Buscar Documento.', targetId: 'pos-btn-buscar-doc', screenId: 'pos-main' },
      { id: 'm11-s3', instruction: 'Ingresa el número de documento y haz clic en Buscar.', targetId: 'ret-btn-buscar', screenId: 'returns-main' },
      { id: 'm11-s4', instruction: 'Selecciona la transacción de la lista.', targetId: 'ret-txn-doc', screenId: 'returns-main' },
      { id: 'm11-s5', instruction: 'Selecciona el artículo a devolver.', targetId: 'ret-item-item1', screenId: 'returns-main' },
      { id: 'm11-s6', instruction: 'Haz clic en Devolver Artículo.', targetId: 'ret-btn-devolver-articulo', screenId: 'returns-main' },
      { id: 'm11-s7', instruction: 'Selecciona la razón para devolver.', targetId: 'ret-reason-select', targetValue: 'Cambio', screenId: 'returns-main' },
      { id: 'm11-s8', instruction: 'Selecciona cualquier motivo.', targetId: 'ret-motivo-select', screenId: 'returns-main' },
      { id: 'm11-s9', instruction: 'Regresa al documento principal.', targetId: 'ret-btn-regresar', screenId: 'returns-main' },
      { id: 'm11-s10', instruction: 'Cambia el comprobante a NOTA CRED ELECT.', targetId: 'pos-select-comprobante', targetValue: '07-NOTA CRED ELECT', screenId: 'pos-main', action: (s) => { s.comprobanteType = '07-NOTA CRED ELECT'; } },
      { id: 'm11-s11', instruction: 'Procede a pagar la transacción.', targetId: 'pos-btn-pay', screenId: 'pos-main', validator: (s) => s.cart.length > 0 && s.cart[0].price < 0 ? true : 'No hay artículos en devolución' },
      { id: 'm11-s12', instruction: 'Selecciona "Crédito de Tienda" como método de pago.', targetId: 'pay-method-Crédito-de-Tienda', screenId: 'payment' },
      { id: 'm11-s13', instruction: 'Haz clic en Vuelto.', targetId: 'pay-btn-vuelto', screenId: 'payment', validator: (s) => s.selectedPaymentMethod === 'Crédito de Tienda' ? true : 'Debes seleccionar "Crédito de Tienda" como método de pago.' },
      { id: 'm11-s14', instruction: 'Haz clic en Imprimir Actualizar.', targetId: 'pay-btn-print-update', screenId: 'payment', action: (s) => { s.storeCredit = Math.abs(s.cart.reduce((sum, item) => sum + item.price, 0)); s.cart = []; s.currentCustomer = null; s.payments = []; s.takeAmount = ''; s.selectedPaymentMethod = 'Efectivo'; s.returnReason = ''; s.returnItems = []; s.comprobanteType = '03-BOL ELECT'; s.vueltoGiven = false; } },
      {
        id: 'm11-s15',
        instruction: 'Busca el nuevo producto y asocia al cliente de la nota de crédito. Luego, procede a pagar.',
        targetId: 'pos-btn-pay',
        screenId: 'pos-main',
        // El producto y el cliente salen de los datos que configuró el
        // entrenador, no de códigos fijos en el código.
        data: { sku: '0065672265034', doc: '116002997' },
        dataLabels: { sku: 'Código del producto del cambio', doc: 'Documento del cliente de la nota de crédito' },
        validator: (s, ctx) => {
          const sku = (ctx.step.data?.sku || '').trim();
          const doc = (ctx.step.data?.doc || '').trim();
          const tieneProducto = s.cart.some((i) => i.sku === sku || i.ean === sku);
          const tieneCliente = s.currentCustomer?.doc === doc;
          return tieneProducto && tieneCliente
            ? true
            : 'Debes agregar el producto y asociar al cliente de la nota de crédito antes de pagar.';
        },
      },
      { id: 'm11-s18', instruction: 'Haz clic en "Sí" en la ventana de crédito de tienda.', targetId: 'modal-store-credit-yes', screenId: 'payment' },
      { id: 'm11-s19', instruction: 'Haz clic en Pago para aplicar el crédito de tienda.', targetId: 'pay-btn-apply', screenId: 'payment', validator: (s) => s.selectedPaymentMethod === 'Crédito de Tienda' ? true : 'Debes usar el Crédito de Tienda primero.' },
      { id: 'm11-s19-2', instruction: 'Haz clic en Pago para completar el monto restante con Efectivo.', targetId: 'pay-btn-apply', screenId: 'payment', validator: (s) => s.selectedPaymentMethod === 'Efectivo' ? true : 'Debes completar el pago con Efectivo.' },
      { id: 'm11-s20', instruction: 'Haz clic en Imprimir Actualizar.', targetId: 'pay-btn-print-update', screenId: 'payment', action: (s) => { s.storeCredit = 0; s.cart = []; s.currentCustomer = null; s.payments = []; s.takeAmount = ''; s.selectedPaymentMethod = 'Efectivo'; } },
      { id: 'm11-s21', instruction: 'Revisa que la transacción se ha completado.', targetId: 'auto', screenId: 'pos-main' }
    ]
  },
  {
    id: 'm12',
    title: 'Módulo 12 — Cierre de caja (Z Out)',
    steps: [
      { id: 'm12-s1', instruction: 'En el menú principal, haz clic en el botón X/Z-Out.', targetId: 'menu-btn-xz', screenId: 'main-menu' },
      { id: 'm12-s2', instruction: 'En el menú de opciones, selecciona Z Out Cierre.', targetId: 'xz-btn-close', screenId: 'xz-menu' },
      { id: 'm12-s3', instruction: 'Haz clic en el botón Cierre /Auditoría en los resultados de búsqueda.', targetId: 'zout-btn-auditoria', screenId: 'z-out-close' },
      { id: 'm12-s4', instruction: 'Ingresa el monto del fondo de caja de apertura (300.00).', targetId: 'input-fondo-caja', targetValue: '300.00', screenId: 'registro' },
      { id: 'm12-s5', instruction: 'Haz clic en el botón Siguiente.', targetId: 'btn-siguiente', screenId: 'registro' },
      { id: 'm12-s6', instruction: 'Selecciona todas las transacciones haciendo clic en el botón con signo de interrogación en la cabecera de la tabla.', targetId: 'btn-check-all-trans', screenId: 'cerrar-caja' },
      { id: 'm12-s7', instruction: 'Haz clic en el botón Cerrar en la parte inferior.', targetId: 'btn-cerrar-caja', screenId: 'cerrar-caja' },
      { id: 'm12-s8', instruction: 'Confirma el cierre seleccionando Sí en la advertencia.', targetId: 'modal-confirm-yes', screenId: 'cerrar-caja' },
      { id: 'm12-s9', instruction: 'Verifica la conciliación y haz clic en Finalizar e Imprimir.', targetId: 'btn-finalizar-imprimir', screenId: 'conciliacion' }
    ]
  },
  {
    id: 'm13',
    title: 'Módulo 13 — Arqueo de caja',
    steps: [
      { id: 'm13-s1', instruction: 'En el menú principal, ve a X/Z-Out.', targetId: 'menu-btn-xz', screenId: 'main-menu' },
      { id: 'm13-s2', instruction: 'Selecciona Arqueo en el menú de opciones.', targetId: 'xz-btn-arqueo', screenId: 'xz-menu' },
      { id: 'm13-s3', instruction: 'Haz clic en el botón Imprimir.', targetId: 'arqueo-btn-imprimir', screenId: 'arqueo' }
    ]
  },
  {
    id: 'm14',
    title: 'Módulo 14 — Depósito de efectivo',
    steps: [
      { id: 'm14-s1', instruction: 'En Punto de Venta, haz clic en Nuevo Desembolso.', targetId: 'pos-menu-new-desembolso', screenId: 'main-menu' },
      { id: 'm14-s2', instruction: 'En el submenú, haz clic en Retiro de Dinero.', targetId: 'desembolso-retiro-dinero', screenId: 'main-menu' },
      { id: 'm14-s3', instruction: 'Verifica la tienda asociada (Sp15 mayolo), en Nota ingresa la fecha (ej. "Cierre 12/08/2026") y haz clic en Agregar Pago.', targetId: 'desembolso-add-payment', screenId: 'desembolso' },
      { id: 'm14-s4', instruction: 'Haz clic en el apartado de Cantidad.', targetId: 'desembolso-click-cantidad', screenId: 'desembolso' },
      { id: 'm14-s5', instruction: 'Ingresa el monto del retiro y haz clic en Sólo Actualizar.', targetId: 'desembolso-update', targetValue: '774.41', screenId: 'desembolso' }
    ]
  }
];
