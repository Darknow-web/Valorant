# Deck de ejemplo

`demo.deck.json` es la entrada y `demo.pptx` la salida: 6 slides con contenido
genérico que ejercitan portada, dato protagonista, KPIs, gráfico, proceso y
cierre, con animaciones y fuentes incrustadas.

Sirve para dos cosas: ver de un vistazo cómo se escribe un `deck.json`, y tener
un archivo en una URL pública con el que probar
`mcp__Canva__import-design-from-url` sin exponer ningún documento real.

Regenerarlo:

```bash
node scripts/build_deck.cjs ejemplo/demo.deck.json -o ejemplo/demo.pptx
python3 scripts/fuentes.py incrustar ejemplo/demo.pptx Inter Sora
python3 scripts/animar.py ejemplo/demo.pptx ejemplo/demo.plan.json
```
