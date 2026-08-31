# Animaciones nativas de PowerPoint

`scripts/animar.py` escribe el OOXML de animación directamente. pptxgenjs no
tiene API para esto, así que es un post-proceso obligatorio sobre el `.pptx`
ya generado.

```bash
python3 scripts/animar.py salida/deck.pptx salida/deck.plan.json
```

Usa los `objectName` que `build_deck.cjs` dejó en cada shape (`s3_titulo`,
`s4_kpi0_caja`…) para saber a qué objeto le toca cada efecto, y respeta el
orden de aparición que definió el arquetipo.

## Qué aplica por defecto

Cada arquetipo trae su animación, en `POR_ARQUETIPO`. No hay que configurar
nada para que el deck se vea trabajado:

| Arquetipo | Entrada | Detalle |
|---|---|---|
| `portada` | `floatIn` desde abajo | Entrada suave, 220 ms entre objetos |
| `divisor` | `wipe` desde la izquierda | Rápido, marca el corte |
| `dato_gigante` | `zoom` + énfasis `pulso` | La cifra entra creciendo y late |
| `kpis`, `tarjetas` | `floatIn` escalonado | Las tarjetas caen una tras otra |
| `comparacion` | `flyIn` lateral | Los dos lados entran enfrentándose |
| `proceso` | `fade` rápido | Paso a paso |
| `timeline` | `wipe` lateral | Acompaña la línea del tiempo |
| `matriz` | `zoom` | Los cuadrantes aparecen |
| `embudo` | `wipe` lateral | Nivel por nivel |
| `grafico`, `tabla` | `fade` | No compite con el dato |
| `bullets` | `floatIn` + build por párrafo | Viñeta a viñeta |
| `cierre` | `zoom` | Cierra con peso |

## Sobrescribir en el `deck.json`

```json
"animacion": {
  "entrada": "flyIn",           // fade flyIn wipe zoom floatIn growTurn split ninguna
  "direccion": "izquierda",     // arriba abajo izquierda derecha
  "escalonado": true,
  "retardo_ms": 180,
  "disparador": "onClick",      // onClick withPrev afterPrev withEffect
  "enfasis": "pulso",           // pulso crecer girar color ninguno
  "salida": "fade"
}
```

## Transiciones

`"transicion"` por slide: `fade`, `push`, `wipe`, `split`, `cover`, `morph`,
`ninguna`.

**Morph** es la que da el efecto cinematográfico: si dos slides seguidas
comparten objetos parecidos (mismo texto, misma forma), PowerPoint los
interpola en vez de cortar. Úsala entre slides hermanas — un `dato_gigante`
seguido de sus `kpis`, un antes seguido de un después.

Se escribe dentro de un `mc:AlternateContent`:

```xml
<mc:AlternateContent>
  <mc:Choice Requires="p159">
    <p:transition spd="slow" p14:dur="1200"><p159:morph option="byObject"/></p:transition>
  </mc:Choice>
  <mc:Fallback>
    <p:transition spd="slow"><p:fade/></p:transition>
  </mc:Fallback>
</mc:AlternateContent>
```

El `Fallback` importa: un visor sin soporte de Morph hace un fundido en vez de
quedarse sin efecto.

## Detalles del OOXML que cuestan una tarde si no se saben

- **El retardo no es un atributo de `<p:cTn>`.** Va en
  `<p:stCondLst><p:cond delay="500"/></p:stCondLst>`, y ese elemento debe ir
  **antes** de `<p:childTnLst>`. Con `delay` como atributo, el esquema lo
  rechaza.
- **Cada objeto animado necesita su `<p:set>` de `style.visibility` a
  `visible`.** Sin él, el objeto se ve desde el principio y la entrada no se
  aprecia.
- **`p14:dur` solo es válido bajo un `mc:Choice` que declare ese namespace.**
  En una transición simple hay que usar `spd` (`slow`/`med`/`fast`).
- **Los prefijos de namespace se declaran con el `nsmap` de lxml**, nunca como
  atributo `xmlns` a mano: lxml falla con *"reuse of the xmlns namespace name
  is forbidden"*.
- **Parsea con `lxml`, jamás con `xml.etree.ElementTree`**: este último
  reescribe los prefijos y corrompe el paquete.
- **`<p:transition>` va antes de `<p:timing>`** en el orden del esquema.
- La estructura del árbol de tiempo es obligatoria hasta el último nivel:
  `timing → tnLst → par → cTn(tmRoot) → childTnLst → seq(mainSeq) → cTn →
  childTnLst → par(un clic) → par(grupo) → efectos`.
- Cada `<p:cTn>` necesita un `id` único dentro del slide.

## Builds

- **Por párrafo** (`<p:bldP>`): revela las viñetas de a una. Se aplica solo en
  el arquetipo `bullets`.
- **Por serie de gráfico** (`<p:bldGraphic>` con `<a:bldChart bld="series">`):
  se activa poniendo `"animar_dibujo": true` en el gráfico. Sin eso el gráfico
  entra completo.

## Verificar que quedó bien

```bash
python3 scripts/qa.py salida/deck.pptx salida/deck.plan.json
```

Valida el paquete, el esquema y que las animaciones estén escritas. Lo que no
puede hacer nadie aquí es **verlas correr**: eso requiere PowerPoint. Si Carlos
reporta que algo no anima, revisa primero que el objeto exista en `objetos`
dentro del `deck.plan.json`.
