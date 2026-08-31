# QA

```bash
python3 scripts/qa.py salida/deck.pptx salida/deck.plan.json
```

Debe terminar con **0 errores**. Los avisos se juzgan uno a uno.

## Qué comprueba

1. El `.pptx` abre y pasa `validate.py` de la skill `pptx` (esquema,
   relaciones, tipos de contenido, gráficos).
2. Cada slide valida contra `pml.xsd`. Antes resuelve el markup-compatibility
   al `Fallback`, porque ese esquema no modela `mc:AlternateContent` — que es
   justo lo que usa Morph. Sin ese paso, todas las slides con Morph darían un
   falso error.
3. Los límites de `assets/temas.json`: palabras de cuerpo por arquetipo,
   bloques de texto demasiado largos, número de elementos.
4. Que ninguna slide se quede sin guion del expositor.
5. Contraste mínimo 3:1, mirando la forma que hay **debajo** del texto, no el
   fondo del slide (si no, un número blanco sobre un círculo de acento daría
   un 1:1 inexistente).
6. Que las animaciones y transiciones estén escritas de verdad.

## Errores típicos y qué hacer

| Mensaje | Causa | Arreglo |
|---|---|---|
| `N palabras de cuerpo, el tope es M` | El slide tiene más texto del que se puede leer proyectado | Parte la slide en dos, o manda el detalle a `notas` |
| `sin guion del expositor` | Falta `notas` en el `deck.json` | Escríbelo: qué se dice mientras esa slide está en pantalla |
| `ninguna slide tiene animaciones` | Se saltó `animar.py` | Córrelo |
| `slideN no valida` | El XML de animación quedó mal | Ver `animaciones-pptx.md`, sección de detalles del OOXML |
| `el .pptx no es un ZIP válido` | El paquete se corrompió al reempaquetar | Regenera desde `build_deck.cjs`; no edites el ZIP a mano |
| `contraste X:1 por debajo de 3:1` | Color de texto mal elegido para ese fondo | Usa `texto` o `texto_suave` del tema, no un color suelto |

## El QA visual no lo hace el script

Esto es obligatorio y no se puede automatizar:

```bash
node scripts/render_html.cjs salida/deck.plan.json -o salida/vista.html
node scripts/capturar.cjs salida/vista.html -o salida/png --grid
```

**Abre `salida/png/contacto.png` con la herramienta Read y míralo.** Busca:

- Texto que desborda su caja o pisa otro elemento.
- Slides desequilibradas: todo el peso a un lado, un hueco enorme.
- Repetición: tres slides seguidas con la misma pinta.
- Elementos huérfanos: una tarjeta vacía, un icono suelto.
- Un dato que debería resaltar y se pierde.

La vista previa dibuja **los mismos shapes** que se mandaron a pptxgenjs
(`build_deck.cjs` los registra en el plan), así que lo que se ve ahí es lo que
hay en el `.pptx`.

**Por qué no se renderiza el .pptx directamente:** el LibreOffice de este
entorno está incompleto — le faltan los módulos de Writer e Impress — y no
convierte ni `.docx` ni `.pptx`. Chromium sí está, y por eso el render pasa
por HTML.

Lo único que no se puede verificar aquí es **ver las animaciones correr**: eso
necesita PowerPoint. El esquema garantiza que son válidas y que están donde
deben, pero la reproducción se comprueba abriendo el archivo.
