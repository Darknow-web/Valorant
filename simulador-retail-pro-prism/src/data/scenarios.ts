import { ModuleData, Scenario } from '../types';
import { readFieldValue } from '../lib/stepData';
import { Catalog, defaultCatalog } from './catalog';

/**
 * Guías de situación.
 *
 * Cada módulo tiene un caso de tienda. El colaborador NO lee el paso a paso:
 * lee una escena y de ahí saca los datos (el código del producto, el documento
 * del cliente, el monto con el que paga…). Los datos se toman de la
 * configuración del entrenador mediante referencias 'idDelPaso|ruta', así que
 * cuando el entrenador cambia un valor, la situación cambia con él.
 *
 * Regla de oro: si el sistema lo valida, la situación tiene que decirlo. Nada
 * de lo que el colaborador deba escribir puede quedar a su imaginación.
 *
 * Todos los módulos ocurren en un mismo turno, en orden: se abre la caja, se
 * vende, se atienden devoluciones, se saca el arqueo, se retira el efectivo
 * acumulado y se cierra.
 */
export const scenarios: Scenario[] = [
  {
    moduleId: 'm1',
    titulo: 'Primer turno del día',
    tramo: 'manana',
    contexto:
      'Llegas a la tienda a las 8:45 a. m. La caja todavía está apagada y el jefe de tienda te pide que dejes el sistema listo antes de abrir las puertas. Sobre el mostrador está la tarjeta de acceso del terminal.',
    datos: {
      usuario: 'm1-s1|expectedState.user',
      clave: 'm1-s1|expectedState.password',
    },
    etiquetas: { usuario: 'Usuario', clave: 'Contraseña' },
    pistas: [],
    objetivo: 'Deja el sistema con la sesión iniciada.',
  },
  {
    moduleId: 'm2',
    titulo: 'Abriendo la caja',
    enlace:
      'Con la sesión abierta, el turno todavía no arranca: falta el dinero en la gaveta.',
    tramo: 'manana',
    contexto:
      'La sesión ya está iniciada y en unos minutos entra el primer cliente. Antes de vender tienes que dejar la registradora abierta con el sencillo del día. El jefe de tienda te entrega el sobre del fondo y te dice que lo cuentes delante de él.',
    datos: {
      fondo: 'm2-s4|expectedState.fondoCaja',
    },
    etiquetas: { fondo: 'Fondo de caja' },
    pistas: [
      'Anota ese monto: al cerrar el turno te lo van a volver a pedir como fondo de apertura.',
    ],
    objetivo: 'Deja la registradora abierta con el fondo del día registrado.',
  },
  {
    moduleId: 'm3',
    titulo: 'La señora del gato',
    enlace:
      'La caja ya está lista. Suena la campanilla de la puerta.',
    tramo: 'manana',
    contexto:
      'Son las 10:15 a. m. Entra una señora con apuro, deja un saco de comida para gato sobre el mostrador y te dice: "solo esto, por favor, tengo el carro mal estacionado". Pide su boleta.',
    datos: {
      sku: 'm3-s2|targetValue',
      documento: 'm3-s3|targetValue',
      monto: 'm3-s6|expectedState.takeAmount',
    },
    etiquetas: { sku: 'Código del producto', documento: 'Documento de la clienta', monto: 'Efectivo que entrega' },
    pistas: [
      'Te paga en efectivo con más de lo que cuesta, así que hay que devolverle su vuelto.',
    ],
    objetivo: 'Cierra la venta y entrega el vuelto correcto.',
  },
  {
    moduleId: 'm4',
    titulo: 'Paga con su tarjeta',
    enlace:
      'Apenas sale la señora, entra el siguiente.',
    tramo: 'manana',
    contexto:
      'Un cliente frecuente llega con el mismo saco de comida de siempre. Al momento de pagar te dice: "hoy no traje efectivo, cóbrame todo con mi tarjeta de crédito". El POS del banco está a un costado y la conexión automática está caída, así que el voucher se ingresa a mano.',
    datos: {
      sku: 'm4-s2|targetValue',
      documento: 'm4-s3|targetValue',
      metodo: 'm4-s5|expectedState.selectedPaymentMethod',
      marca: 'm4-s5|expectedState.cardType',
      e115: 'm4-s5|expectedState.e115',
      autorizacion: 'm4-s5|expectedState.noAutorizacion',
    },
    etiquetas: { sku: 'Código del producto', documento: 'Documento del cliente', metodo: 'Forma de pago', marca: 'Marca de la tarjeta', e115: 'Voucher E-115', autorizacion: 'N.º de autorización' },
    pistas: [
      'Es tarjeta de crédito, no de débito, y cubre el total: un solo pago.',
      'El POS no está integrado, así que el procesamiento va en Manual. No es venta en cuotas (E-116 vacío) y no se marca «Autorización forzada».',
    ],
    objetivo: 'Cobra con tarjeta de crédito ingresando el voucher tal como salió impreso.',
  },
  {
    moduleId: 'm5',
    titulo: 'Le falta efectivo',
    enlace:
      'Media hora después, otra clienta con el mismo saco.',
    tramo: 'manana',
    contexto:
      'Una clienta lleva el saco de comida y al momento de pagar cuenta lo que tiene en la cartera: "solo tengo esto en efectivo, el resto pásamelo a mi tarjeta de crédito". El POS del banco te obliga a ingresar el voucher manualmente.',
    datos: {
      sku: 'm5-s2|targetValue',
      documento: 'm5-s3|targetValue',
      efectivo: 'm5-s5|expectedState.takeAmount',
      metodo: 'm5-s6|expectedState.selectedPaymentMethod',
      marca: 'm5-s6|expectedState.cardType',
      e115: 'm5-s6|expectedState.e115',
      autorizacion: 'm5-s6|expectedState.noAutorizacion',
    },
    etiquetas: { sku: 'Código del producto', documento: 'Documento de la clienta', efectivo: 'Parte en efectivo', metodo: 'Forma de pago del saldo', marca: 'Marca de la tarjeta', e115: 'Voucher E-115', autorizacion: 'N.º de autorización' },
    pistas: [
      'Primero cobra el efectivo: es un pago parcial, no cubre el total. El saldo va con la tarjeta de crédito y el sistema ya trae ese monto calculado.',
      'Procesamiento Manual, sin cuotas (E-116 vacío) y sin marcar «Autorización forzada».',
    ],
    objetivo: 'Cierra la venta cobrando primero el efectivo y el saldo con la tarjeta de crédito.',
  },
  {
    moduleId: 'm6',
    titulo: 'Compra a nombre de la empresa',
    enlace:
      'Antes del mediodía llega alguien que no viene por su mascota.',
    tramo: 'manana',
    contexto:
      'Llega el asistente administrativo de una empresa que compra alimento para los gatos del almacén. Te dice: "necesito comprobante a nombre de la empresa, no me sirve boleta porque lo tengo que rendir a contabilidad".',
    datos: {
      sku: 'm6-s2|targetValue',
      ruc: 'm6-s3|targetValue',
      comprobante: 'm6-s4|targetValue',
      efectivo: 'm6-s6|data.efectivoEntregado',
    },
    etiquetas: { sku: 'Código del producto', ruc: 'RUC de la empresa', comprobante: 'Comprobante', efectivo: 'Efectivo que entrega' },
    pistas: [
      'Te paga en efectivo con más de lo que cuesta: aplica el pago y entrégale el vuelto antes de imprimir.',
    ],
    objetivo: 'Emite la factura, cobra en efectivo y devuelve el vuelto antes de cerrar.',
  },
  {
    moduleId: 'm7',
    titulo: 'Pedido por aplicativo (Rappi)',
    enlace:
      'Terminas de guardar la factura y vibra el celular del mostrador.',
    tramo: 'tarde',
    contexto:
      'Suena la notificación del aplicativo: hay un pedido para recoger. El repartidor entra con su mochila y espera en el mostrador. Estos pedidos se cobran al agregador, no a la persona, y llevan la lista de precios del canal digital.',
    datos: {
      sku: 'm7-s2|targetValue',
      documento: 'm7-s3|targetValue',
      metodoPago: 'm7-s7|targetValue',
      codigo: 'm7-s8|expectedState.authCode',
    },
    etiquetas: { sku: 'Código del producto', documento: 'Documento del agregador', metodoPago: 'Forma de pago', codigo: 'Código de autorización' },
    pistas: [
      'El cobro es al agregador, no al repartidor, y cubre el total del pedido.',
      'Al asociar al agregador, marca la casilla «Change price level for existing items» y responde que sí, para que el precio del canal digital alcance a lo que ya está en el carrito.',
    ],
    objetivo: 'Entrega el pedido con el precio del canal digital y el cobro al agregador.',
  },
  {
    moduleId: 'm8',
    titulo: 'Pedido por aplicativo (Pedidos Ya)',
    enlace:
      'No acabas de despachar al de Rappi cuando suena la otra aplicación.',
    tramo: 'tarde',
    contexto:
      'Segundo pedido del día por aplicativo, esta vez del otro agregador. El repartidor llega con prisa y te muestra el número de pedido en su celular. Igual que el anterior, el cobro es al agregador y con la lista de precios del canal digital.',
    datos: {
      sku: 'm8-s2|targetValue',
      documento: 'm8-s3|targetValue',
      metodoPago: 'm8-s7|targetValue',
      codigo: 'm8-s8|expectedState.authCode',
    },
    etiquetas: { sku: 'Código del producto', documento: 'Documento del agregador', metodoPago: 'Forma de pago', codigo: 'Código de autorización' },
    pistas: [
      'Igual que el pedido anterior: el cobro va al agregador, por el total.',
      'Marca «Change price level for existing items» y responde que sí, para aplicar el precio del canal digital a lo que ya está en el carrito.',
    ],
    objetivo: 'Cierra el pedido cobrando al agregador correcto.',
  },
  {
    moduleId: 'm9',
    titulo: 'Cliente nuevo en el sistema',
    enlace:
      'Se va el repartidor y en la puerta hay una clienta que no habías visto antes.',
    tramo: 'tarde',
    contexto:
      'Una clienta que viene por primera vez quiere afiliarse para acumular sus compras. Buscas su documento en el sistema y no aparece: hay que crearla. Ella te dicta sus datos mientras esperas que el sistema responda.',
    datos: {
      nombre: 'm9-s3|expectedState.newCustomerName',
      apellido: 'm9-s3|expectedState.newCustomerLastName',
      correo: 'm9-s3|expectedState.newCustomerEmail',
      documento: 'm9-s3|expectedState.newCustomerDoc',
      tipoDocumento: 'm9-s3|expectedState.newCustomerDocType',
    },
    etiquetas: { nombre: 'Nombre', apellido: 'Apellido', correo: 'Correo', documento: 'N.º de documento', tipoDocumento: 'Tipo de documento' },
    pistas: [
      'Los cuatro campos son obligatorios: sin uno de ellos el sistema no deja guardar. Y el tipo de documento tiene que coincidir con el que te entrega.',
    ],
    objetivo: 'Deja al cliente creado y asociado a la transacción.',
  },
  {
    moduleId: 'm10',
    titulo: 'Le cayó mal el producto',
    enlace:
      'La tarde trae lo que la mañana no: los que vuelven.',
    tramo: 'tarde',
    contexto:
      'Vuelve una clienta con un producto que compró hace unos días y la boleta en la mano: "no me sirvió, no quiero cambiarlo por otra cosa, quiero que me devuelvan la plata". Como la devolución de dinero no se hace por caja, se registra a su cuenta bancaria.',
    datos: {
      razon: 'm10-s7|targetValue',
      comprobante: 'm10-s10|targetValue',
      documento: 'catalog|returnDocument.id',
    },
    etiquetas: { documento: 'N.º de la boleta', razon: 'Razón de la devolución', comprobante: 'Comprobante a emitir' },
    pistas: [
      'Es el único artículo de esa boleta: selecciónalo y devuélvelo.',
      'Después de la razón, el sistema pide además un «Motivo». Es obligatorio: sin él no te deja regresar al documento.',
      'El dinero se le devuelve a su cuenta, así que la forma de pago es la de transferencia. Los datos bancarios ya vienen cargados: solo acéptalos.',
    ],
    objetivo: 'Deja registrada la devolución del dinero con el comprobante correcto.',
  },
  {
    moduleId: 'm11',
    titulo: 'Prefiere cambiarlo por otro',
    enlace:
      'Detrás de ella, otro cliente con una bolsa y la misma cara.',
    tramo: 'tarde',
    contexto:
      'Un cliente regresa con un producto y su boleta, pero a diferencia del caso anterior no quiere su dinero: "mejor dame otra cosa por el mismo valor". Se le genera una nota de crédito a su favor y con ese saldo paga el producto nuevo; si falta, completa en efectivo.',
    datos: {
      razon: 'm11-s7|targetValue',
      comprobante: 'm11-s10|targetValue',
      documento: 'catalog|returnDocument.id',
      productoNuevo: 'm11-s15|data.sku',
      clienteNc: 'm11-s15|data.doc',
    },
    etiquetas: { documento: 'N.º de la boleta', razon: 'Razón de la devolución', comprobante: 'Comprobante a emitir', productoNuevo: 'Código del producto nuevo', clienteNc: 'Documento del cliente' },
    pistas: [
      'El «Motivo» que pide después de la razón también es obligatorio.',
      'Ojo con esta parte: la nota de crédito se emite con la forma de pago «Crédito de Tienda» y pulsando el botón «Vuelto». Se llama así, pero aquí no entregas dinero: es el saldo que le queda a favor.',
      'El producto nuevo cuesta más que la nota de crédito: primero se aplica todo el crédito de tienda y después se cobra el resto en efectivo.',
    ],
    objetivo: 'Deja el cambio cerrado: nota de crédito emitida y producto nuevo pagado.',
  },
  {
    moduleId: 'm12',
    titulo: 'El jefe pide el corte',
    enlace:
      'La tienda respira un rato y el jefe se acerca al mostrador.',
    tramo: 'cierre',
    contexto:
      'A media tarde el jefe de tienda se acerca: "sácame el arqueo, quiero ver cómo vamos hasta ahora". No es un cierre: la caja sigue operando y solo se necesita el reporte del momento.',
    datos: {},
    pistas: [
      'No se cierra el turno: solo se emite el reporte de arqueo desde el módulo de X/Z-Out.',
    ],
    objetivo: 'Deja el arqueo impreso sin cerrar la caja.',
  },
  {
    moduleId: 'm13',
    titulo: 'Retiro para el banco',
    enlace:
      'Con el arqueo en la mano, el jefe mira la gaveta y frunce el ceño.',
    tramo: 'cierre',
    contexto:
      'Con las ventas del día se juntó demasiado efectivo en la gaveta y la política de la tienda no permite tener tanto acumulado. El jefe de tienda cuenta el dinero contigo, lo mete en la bolsa de seguridad y te pide que registres el retiro antes del cierre.',
    datos: {
      monto: 'm13-s5|targetValue',
      nota: 'm13-s3|targetValue',
    },
    etiquetas: { monto: 'Monto del retiro', nota: 'Nota del desembolso' },
    pistas: [
      'Antes de agregar el pago, revisa que la tienda que aparece asociada al desembolso sea la correcta.',
    ],
    objetivo: 'Deja el retiro de efectivo registrado por el monto exacto.',
  },
  {
    moduleId: 'm14',
    titulo: 'Fin de turno',
    enlace:
      'Ya no entra nadie más. Toca cuadrar y apagar.',
    tramo: 'cierre',
    contexto:
      'Son las 9:00 p. m., la tienda ya cerró y toca cuadrar la caja. Antes de irte tienes que cerrar el turno en el sistema y dejar el reporte impreso. En la hoja de apertura del turno está anotado el fondo con el que abriste esta mañana.',
    datos: {
      fondoApertura: 'm14-s4|targetValue',
    },
    etiquetas: { fondoApertura: 'Fondo de apertura' },
    pistas: [
      'El cierre debe incluir todas las transacciones del turno, sin dejar ninguna fuera.',
      'El sistema avisará que el cierre no se puede revertir: es correcto, confirma que sí.',
    ],
    objetivo: 'Cierra el turno y deja la conciliación impresa.',
  },
];

/** Un dato del caso, listo para mostrarse como ficha aparte. */
export interface Evidencia {
  clave: string;
  etiqueta: string;
  valor: string;
  /** El entrenador dejó este dato vacío. */
  pendiente: boolean;
}

export interface ResolvedScenario {
  titulo: string;
  /** Frase de enganche con el caso anterior; vacía en el primero del turno. */
  enlace: string;
  contexto: string;
  pistas: string[];
  /** Los datos sueltos, para consultarlos sin releer el relato. */
  evidencias: Evidencia[];
  objetivo: string;
  /**
   * Datos que el entrenador dejó vacíos. La pista se muestra igual, señalando
   * el hueco: antes desaparecía entera y el colaborador se quedaba sin ese dato
   * sin enterarse de que faltaba.
   */
  faltantes: string[];
}

/** Marca visible que ocupa el lugar de un dato sin configurar. */
export const DATO_PENDIENTE = '⚠ dato sin configurar';

/** Lee un valor del catálogo por ruta, p. ej. 'returnDocument.id'. */
function readCatalogValue(catalog: Catalog, path: string): string {
  const value = path.split('.').reduce<any>((acc, key) => (acc == null ? acc : acc[key]), catalog);
  return value === undefined || value === null ? '' : String(value);
}

/** Devuelve la situación con los datos ya reemplazados. */
export function resolveScenario(
  moduleId: string,
  modules: ModuleData[],
  catalog: Catalog = defaultCatalog
): ResolvedScenario | null {
  const scenario = scenarios.find((s) => s.moduleId === moduleId);
  if (!scenario) return null;

  const values: Record<string, string> = {};
  for (const [key, reference] of Object.entries(scenario.datos)) {
    values[key] = reference.startsWith('catalog|')
      ? readCatalogValue(catalog, reference.slice('catalog|'.length))
      : readFieldValue(modules, reference);
  }

  const faltantes: string[] = [];
  const pistas = scenario.pistas.map((pista) =>
    pista.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      if (values[key]) return values[key];
      if (!faltantes.includes(key)) faltantes.push(key);
      return DATO_PENDIENTE;
    })
  );

  // Solo se listan como evidencia los datos con nombre propio: los que el
  // colaborador tendrá que teclear o elegir.
  const evidencias: Evidencia[] = Object.entries(scenario.etiquetas || {}).map(([clave, etiqueta]) => ({
    clave,
    etiqueta,
    valor: values[clave] || '',
    pendiente: !values[clave],
  }));

  return {
    titulo: scenario.titulo,
    enlace: scenario.enlace || '',
    contexto: scenario.contexto,
    pistas,
    evidencias,
    objetivo: scenario.objetivo,
    faltantes,
  };
}
