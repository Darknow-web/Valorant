/**
 * Catálogo simulado de la tienda: productos, clientes, marcas de tarjeta y el
 * documento que se busca en las devoluciones.
 *
 * Antes estos datos estaban fijos en el código (`mockProducts`/`mockCustomers`
 * en `modules.ts`, y literales sueltos dentro de las pantallas). Eso hacía que,
 * si el entrenador cambiaba el SKU o el documento de un cliente, la pantalla no
 * encontrara nada al buscarlo y el módulo quedara bloqueado aunque el
 * colaborador escribiera exactamente lo que decía la situación.
 *
 * Ahora el catálogo es parte de la configuración del entrenador y las pantallas
 * lo leen del contexto del simulador.
 */

export interface CatalogProduct {
  sku: string;
  ean: string;
  desc: string;
  price: number;
  stock: number;
}

export interface CatalogCustomer {
  id: string;
  doc: string;
  name: string;
  email: string;
  /** Agregador (Rappi, Pedidos Ya): dispara el modal de nivel de precio. */
  esAgregador?: boolean;
}

export interface Catalog {
  products: CatalogProduct[];
  customers: CatalogCustomer[];
  /** Marcas de tarjeta que ofrece el POS al cobrar. */
  cardTypes: string[];
  /** Documento que se busca en el módulo de devoluciones. */
  returnDocument: {
    id: string;
    date: string;
    customerDoc: string;
    total: string;
    docType: string;
  };
  /** Fondo con el que arrancan los módulos posteriores a la apertura de caja. */
  fondoCajaInicial: string;
}

export const defaultCatalog: Catalog = {
  products: [
    { sku: '0065672265034', ean: '0065672265034', desc: '[Gato] 1St Choice Control De P', price: 118.9, stock: 5 },
    { sku: '1001', ean: '4002633513106', desc: '[Perro] - Belcando Pavo, arroz', price: 28.0, stock: 5 },
    { sku: '1002', ean: '7751234567890', desc: 'Correa Retráctil Flexi', price: 45.5, stock: 12 },
    { sku: '1003', ean: '7750987654321', desc: 'Juguete Kong Classic M', price: 35.9, stock: 8 },
  ],
  customers: [
    { id: '1', doc: '76543210', name: 'CARMEN VELAZCO', email: 'carmen@email.com' },
    { id: '2', doc: '45678901', name: 'KARLA GABRIELA PINEDA', email: 'karla@email.com' },
    { id: '3', doc: '22222222', name: 'RAPPI', email: 'rappi@agregador.com', esAgregador: true },
    { id: '4', doc: '33333333', name: 'PEDIDOS YA', email: 'pedidosya@agregador.com', esAgregador: true },
    { id: '5', doc: '20123456789', name: 'EMPRESA EJEMPLO S.A.C.', email: 'empresa@ejemplo.com' },
    { id: '6', doc: '116002997', name: 'ELBA FARRO', email: 'elba.farro@email.com' },
  ],
  cardTypes: ['Visa', 'Mastercard', 'American Express'],
  returnDocument: {
    id: 'BA70-00003928',
    date: '7/30/2026 6:45:29 PM',
    customerDoc: '116002997',
    total: '26.90',
    docType: '03-BOL ELECT',
  },
  fondoCajaInicial: '150.00',
};

/** Copia profunda del catálogo por defecto, para poder editarlo sin tocar el original. */
export function cloneDefaultCatalog(): Catalog {
  return JSON.parse(JSON.stringify(defaultCatalog));
}

/**
 * Completa un catálogo guardado con los valores por defecto que le falten, para
 * que una configuración vieja o incompleta nunca deje al simulador sin datos.
 */
export function normalizeCatalog(raw: Partial<Catalog> | null | undefined): Catalog {
  const base = cloneDefaultCatalog();
  if (!raw) return base;

  const products = Array.isArray(raw.products) && raw.products.length
    ? raw.products.map((p, i) => ({
        sku: String(p?.sku ?? base.products[i]?.sku ?? ''),
        ean: String(p?.ean ?? p?.sku ?? ''),
        desc: String(p?.desc ?? ''),
        price: Number(p?.price) || 0,
        stock: Number(p?.stock) || 0,
      }))
    : base.products;

  const customers = Array.isArray(raw.customers) && raw.customers.length
    ? raw.customers.map((c, i) => ({
        id: String(c?.id ?? base.customers[i]?.id ?? String(i + 1)),
        doc: String(c?.doc ?? ''),
        name: String(c?.name ?? ''),
        email: String(c?.email ?? ''),
        esAgregador: !!c?.esAgregador,
      }))
    : base.customers;

  const cardTypes = Array.isArray(raw.cardTypes) && raw.cardTypes.length
    ? raw.cardTypes.map(String).filter(Boolean)
    : base.cardTypes;

  return {
    products,
    customers,
    cardTypes,
    returnDocument: { ...base.returnDocument, ...(raw.returnDocument || {}) },
    fondoCajaInicial: String(raw.fondoCajaInicial ?? base.fondoCajaInicial),
  };
}

/** Busca un producto por SKU o código de barras. */
export function findProduct(catalog: Catalog, code: string): CatalogProduct | undefined {
  const v = code.trim();
  if (!v) return undefined;
  return catalog.products.find((p) => p.sku === v || p.ean === v);
}

/** Busca un cliente por documento (DNI o RUC). */
export function findCustomer(catalog: Catalog, doc: string): CatalogCustomer | undefined {
  const v = doc.trim();
  if (!v) return undefined;
  return catalog.customers.find((c) => c.doc === v);
}
