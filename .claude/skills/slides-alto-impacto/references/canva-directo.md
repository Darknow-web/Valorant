# Construir el deck directamente en Canva

Esta es la **ruta por defecto**. El deck se construye dentro de la cuenta de
Canva de Carlos elemento por elemento, así que su documento no pasa por ninguna
URL pública. El `.pptx` completo se entrega igual, en paralelo.

Procedimiento verificado contra la API real: un slide construido así queda
idéntico al render del `.pptx`.

## Equivalencias (medidas, no estimadas)

| Del deck | A Canva |
|---|---|
| posición y tamaño | `px = pulgadas × 144` |
| cuerpo de letra | `px = puntos × 2` |
| lienzo | 13.333 × 7.5 in = **1920 × 1080 px** |

## Paso a paso

### 1. Traducir

```bash
node scripts/plan_a_canva.cjs salida/deck.plan.json -o salida/canva
```

Escribe `salida/canva/pagina-NN.json` con, por página: la operación `add_page`,
las `inserciones` (formas, textos, iconos, gráficos y tablas dibujados) y los
`formatos` que hay que aplicar después.

### 2. Conseguir un lienzo

`edit-design` necesita un diseño que ya exista. Se copia el ejemplo genérico
del repo, que no contiene nada del usuario:

```
mcp__Canva__copy-design  design_id: <el demo>  page_numbers: [1]
```

### 3. Abrir transacción

```
mcp__Canva__read-design  design_id: <la copia>  open_transaction: true
   filter: { fields: ["design_content"] }
```

Devuelve el `transaction_id` y los `locator_id` de lo que haya en la página.

### 4. Construir cada página, en dos pasadas

**Pasada A — estructura.** En una sola llamada: los `delete_element` de lo que
sobra, y todas las `inserciones` de la página con el `page_id` real sustituyendo
`__PAGE__`.

**Pasada B — formato.** `add_text` **no acepta formato**: el texto entra en
negro de 16 px, invisible sobre fondo oscuro. La respuesta de la pasada A trae
los `locator_id` de los textos recién creados, **en el mismo orden en que se
insertaron**. Se emparejan con la lista `formatos` y se aplican los
`format_text`.

Entre página y página se mira la miniatura que devuelve cada llamada. Si algo
salió mal, se corrige antes de seguir.

### 5. Notas del expositor

```
{ "type": "replace_speaker_notes", "page_id": "<id>", "notes": "<el guion>" }
```

### 6. Cerrar

```
mcp__Canva__edit-design  transaction_id: <id>  finalize: "commit"
```

**El commit es irreversible y no admite operaciones en la misma llamada.** Si
algo quedó mal, `finalize: "cancel"` descarta todo y se vuelve a empezar.

## Lo que se pierde por esta ruta

- **Gráficos**: se dibujan con formas. Quedan editables y con buen aspecto, pero
  sin datos vinculados: cambiar una cifra es mover una barra, no editar una
  tabla. Si el deck vive de sus gráficos, conviene la ruta del `.pptx`
  importado (ver `canva.md`).
- **Animaciones**: no hay API para aplicarlas. Se entregan como lista para
  aplicar en dos clics (ver `animaciones-canva.md`).
- **Fondos generados y fotos**: `insert_shape` no admite imágenes. Un fondo
  compuesto o una foto del documento requeriría subirla como asset, y para eso
  hace falta una URL pública. En esta ruta el fondo es color sólido, y la
  textura la aportan las formas. Si el fondo generado es parte esencial del
  diseño, va por la ruta del `.pptx`.

## Cuándo usar cada ruta

- **Construcción directa** (esta): material de trabajo, cualquier cosa con datos
  que no deban publicarse, y cuando se quiere el link ya listo.
- **Importar el `.pptx`** (`canva.md`): cuando los gráficos nativos o los fondos
  generados importan más que el ahorro de pasos, y el contenido no es sensible.
