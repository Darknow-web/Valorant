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
 */
export const scenarios: Scenario[] = [
  {
    moduleId: 'm1',
    titulo: 'Primer turno del día',
    contexto:
      'Llegas a la tienda a las 8:45 a. m. La caja todavía está apagada y el jefe de tienda te pide que dejes el sistema listo antes de abrir las puertas. Sobre el mostrador está la tarjeta de acceso del terminal.',
    datos: {
      usuario: 'm1-s1|expectedState.user',
      clave: 'm1-s1|expectedState.password',
    },
    pistas: [
      'La tarjeta de acceso dice, en la línea de usuario: {{usuario}}.',
      'Debajo, en la línea de contraseña: {{clave}}.',
    ],
    objetivo: 'Deja el sistema con la sesión iniciada.',
  },
  {
    moduleId: 'm2',
    titulo: 'Abriendo la caja',
    contexto:
      'La sesión ya está iniciada y en unos minutos entra el primer cliente. Antes de vender tienes que dejar la registradora abierta con el sencillo del día. El jefe de tienda te entrega el sobre del fondo y te dice que lo cuentes delante de él.',
    datos: {
      fondo: 'm2-s4|expectedState.fondoCaja',
    },
    pistas: [
      'Cuentas el sobre delante del jefe de tienda y ambos coinciden: hay S/ {{fondo}} en billetes y monedas.',
    ],
    objetivo: 'Deja la registradora abierta con el fondo del día registrado.',
  },
  {
    moduleId: 'm3',
    titulo: 'La señora del gato',
    contexto:
      'Son las 10:15 a. m. Entra una señora con apuro, deja un saco de comida para gato sobre el mostrador y te dice: "solo esto, por favor, tengo el carro mal estacionado". Pide su boleta.',
    datos: {
      sku: 'm3-s2|targetValue',
      documento: 'm3-s3|targetValue',
      monto: 'm3-s6|expectedState.takeAmount',
    },
    pistas: [
      'Volteas el producto y lees el código de barras: {{sku}}.',
      'Te dicta su documento para la boleta: {{documento}}.',
      'Abre la cartera y te alcanza efectivo: S/ {{monto}}.',
    ],
    objetivo: 'Cierra la venta y entrega el vuelto correcto.',
  },
  {
    moduleId: 'm4',
    titulo: 'Paga con su tarjeta',
    contexto:
      'Un cliente frecuente llega con el mismo saco de comida de siempre. Al momento de pagar te dice: "hoy no traje efectivo, cóbrame con la tarjeta". El POS del banco está a un costado y la conexión automática está caída, así que el voucher se ingresa a mano.',
    datos: {
      sku: 'm4-s2|targetValue',
      documento: 'm4-s3|targetValue',
      marca: 'm4-s5|expectedState.cardType',
      e115: 'm4-s5|expectedState.e115',
      autorizacion: 'm4-s5|expectedState.noAutorizacion',
    },
    pistas: [
      'El código de barras del producto es {{sku}}.',
      'Su documento, el mismo de siempre: {{documento}}.',
      'La tarjeta que te entrega es {{marca}}.',
      'El voucher que sale del POS trae el E-115 {{e115}} y el número de autorización {{autorizacion}}.',
    ],
    objetivo: 'Cobra con tarjeta ingresando el voucher tal como salió impreso.',
  },
  {
    moduleId: 'm5',
    titulo: 'Le falta efectivo',
    contexto:
      'Una clienta lleva el saco de comida y al momento de pagar cuenta lo que tiene en la cartera: "solo tengo esto en efectivo, el resto pásamelo a la tarjeta". El POS del banco te obliga a ingresar el voucher manualmente.',
    datos: {
      sku: 'm5-s2|targetValue',
      documento: 'm5-s3|targetValue',
      efectivo: 'm5-s5|expectedState.takeAmount',
      marca: 'm5-s6|expectedState.cardType',
      e115: 'm5-s6|expectedState.e115',
      autorizacion: 'm5-s6|expectedState.noAutorizacion',
    },
    pistas: [
      'Código de barras del producto: {{sku}}.',
      'Documento de la clienta: {{documento}}.',
      'Lo que junta en efectivo es S/ {{efectivo}}; el resto va con tarjeta.',
      'La tarjeta es {{marca}} y el voucher trae E-115 {{e115}} y autorización {{autorizacion}}.',
    ],
    objetivo: 'Cierra la venta cobrando primero el efectivo y el saldo con la tarjeta.',
  },
  {
    moduleId: 'm6',
    titulo: 'Compra a nombre de la empresa',
    contexto:
      'Llega el asistente administrativo de una empresa que compra alimento para los perros de vigilancia. Te dice: "necesito comprobante a nombre de la empresa, no me sirve boleta porque lo tengo que rendir a contabilidad".',
    datos: {
      sku: 'm6-s2|targetValue',
      ruc: 'm6-s3|targetValue',
      comprobante: 'm6-s4|targetValue',
    },
    pistas: [
      'El producto que lleva tiene el código {{sku}}.',
      'Te alcanza una tarjeta de la empresa con el RUC {{ruc}}.',
      'El comprobante que necesita contabilidad es el tipo {{comprobante}}.',
    ],
    objetivo: 'Emite el comprobante que la empresa necesita y cierra el pago.',
  },
  {
    moduleId: 'm7',
    titulo: 'Pedido por aplicativo (Rappi)',
    contexto:
      'Suena la notificación del aplicativo: hay un pedido para recoger. El repartidor entra con su mochila y espera en el mostrador. Estos pedidos se cobran al agregador, no a la persona, y llevan la lista de precios del canal digital.',
    datos: {
      sku: 'm7-s2|targetValue',
      documento: 'm7-s3|targetValue',
      metodoPago: 'm7-s7|targetValue',
    },
    pistas: [
      'El producto del pedido tiene el código {{sku}}.',
      'En el sistema, el agregador está registrado como cliente con el documento {{documento}}.',
      'El cobro no va al repartidor: la forma de pago es {{metodoPago}}.',
      'Al asociar al agregador el sistema te preguntará si aplicas el nivel de precio del canal digital a lo que ya está en el carrito: sí, corresponde.',
    ],
    objetivo: 'Entrega el pedido con el precio del canal digital y el cobro al agregador.',
  },
  {
    moduleId: 'm8',
    titulo: 'Pedido por aplicativo (Pedidos Ya)',
    contexto:
      'Segundo pedido del día por aplicativo, esta vez del otro agregador. El repartidor llega con prisa y te muestra el número de pedido en su celular. Igual que el anterior, el cobro es al agregador y con la lista de precios del canal digital.',
    datos: {
      sku: 'm8-s2|targetValue',
      documento: 'm8-s3|targetValue',
      metodoPago: 'm8-s7|targetValue',
    },
    pistas: [
      'El producto del pedido tiene el código {{sku}}.',
      'El agregador está registrado en el sistema con el documento {{documento}}.',
      'La forma de pago que corresponde es {{metodoPago}}.',
      'Recuerda aplicar el nivel de precio del canal digital a lo que ya está en el carrito.',
    ],
    objetivo: 'Cierra el pedido cobrando al agregador correcto.',
  },
  {
    moduleId: 'm9',
    titulo: 'Cliente nuevo en el sistema',
    contexto:
      'Una clienta que viene por primera vez quiere afiliarse para acumular sus compras. Buscas su documento en el sistema y no aparece: hay que crearla. Ella te dicta sus datos mientras esperas que el sistema responda.',
    datos: {},
    pistas: [
      'La clienta te dicta su nombre, su apellido, su correo y su documento. Ninguno está todavía en el sistema.',
      'El tipo de documento debe corresponder al documento que te entregó.',
    ],
    objetivo: 'Deja al cliente creado y asociado a la transacción.',
  },
  {
    moduleId: 'm10',
    titulo: 'Le cayó mal el alimento',
    contexto:
      'Vuelve una clienta con el saco que compró hace unos días y la boleta en la mano: "a mi perro le cayó mal, no quiero cambiarlo por otra cosa, quiero que me devuelvan la plata". No hay efectivo suficiente en caja para devolverle, así que la devolución se hace por transferencia.',
    datos: {
      razon: 'm10-s7|targetValue',
      comprobante: 'm10-s10|targetValue',
      documento: 'catalog|returnDocument.id',
    },
    pistas: [
      'La boleta que te entrega tiene el número {{documento}}.',
      'Ella no quiere otro producto: la razón que corresponde en el sistema es {{razon}}.',
      'Toda devolución de dinero se documenta con el comprobante {{comprobante}}.',
      'Como el dinero se le devuelve a su cuenta, la forma de pago es la de transferencia.',
    ],
    objetivo: 'Deja registrada la devolución del dinero con el comprobante correcto.',
  },
  {
    moduleId: 'm11',
    titulo: 'Prefiere cambiarlo por otro',
    contexto:
      'Un cliente regresa con un producto y su boleta, pero a diferencia del caso anterior no quiere su dinero: "mejor dame otra cosa por el mismo valor". Se le genera una nota de crédito a su favor y con ese saldo paga el producto nuevo; si falta, completa en efectivo.',
    datos: {
      razon: 'm11-s7|targetValue',
      comprobante: 'm11-s10|targetValue',
      documento: 'catalog|returnDocument.id',
      productoNuevo: 'm11-s15|data.sku',
      clienteNc: 'm11-s15|data.doc',
    },
    pistas: [
      'La boleta que trae tiene el número {{documento}}.',
      'No pide su dinero de vuelta: la razón que corresponde es {{razon}}.',
      'La operación se documenta con el comprobante {{comprobante}}.',
      'El saldo a su favor queda como crédito de tienda; ese crédito se usa primero al pagar el producto nuevo.',
      'El producto que se lleva a cambio tiene el código {{productoNuevo}}, y va a nombre del cliente con documento {{clienteNc}}.',
    ],
    objetivo: 'Deja el cambio cerrado: nota de crédito emitida y producto nuevo pagado.',
  },
  {
    moduleId: 'm12',
    titulo: 'El jefe pide el corte',
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
    contexto:
      'Se juntó demasiado efectivo en la gaveta y la política de la tienda no permite tener tanto acumulado. El jefe de tienda cuenta el dinero contigo, lo mete en la bolsa de seguridad y te pide que registres el retiro en el sistema con la fecha en la nota.',
    datos: {
      monto: 'm13-s5|targetValue',
    },
    pistas: [
      'Cuentan la bolsa entre los dos y coinciden: S/ {{monto}}.',
      'En la nota del desembolso se escribe la fecha del cierre al que corresponde el retiro.',
      'Verifica que la tienda asociada al desembolso sea la tuya antes de agregar el pago.',
    ],
    objetivo: 'Deja el retiro de efectivo registrado por el monto exacto.',
  },
  {
    moduleId: 'm14',
    titulo: 'Fin de turno',
    contexto:
      'Son las 9:00 p. m., la tienda ya cerró y toca cuadrar la caja. Antes de irte tienes que cerrar el turno en el sistema y dejar el reporte impreso. En la hoja de apertura del turno está anotado el fondo con el que se abrió.',
    datos: {
      fondoApertura: 'm14-s4|targetValue',
    },
    pistas: [
      'La hoja de apertura del turno dice: fondo de caja S/ {{fondoApertura}}.',
      'El cierre debe incluir todas las transacciones del turno, sin dejar ninguna fuera.',
    ],
    objetivo: 'Cierra el turno y deja la conciliación impresa.',
  },
];

export interface ResolvedScenario {
  titulo: string;
  contexto: string;
  pistas: string[];
  objetivo: string;
}

/** Lee un valor del catálogo por ruta, p. ej. 'returnDocument.id'. */
function readCatalogValue(catalog: Catalog, path: string): string {
  const value = path.split('.').reduce<any>((acc, key) => (acc == null ? acc : acc[key]), catalog);
  return value === undefined || value === null ? '' : String(value);
}

/**
 * Devuelve la situación con los datos ya reemplazados. Si un dato no está
 * configurado, la pista que lo menciona se omite en vez de mostrar un hueco.
 */
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

  const pistas: string[] = [];
  for (const pista of scenario.pistas) {
    const placeholders = [...pista.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);
    if (placeholders.some((p) => !values[p])) continue;
    pistas.push(pista.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key]));
  }

  return { titulo: scenario.titulo, contexto: scenario.contexto, pistas, objetivo: scenario.objetivo };
}
