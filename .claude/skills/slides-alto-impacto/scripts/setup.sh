#!/usr/bin/env bash
# Instala (idempotente) todo lo que necesita la skill slides-alto-impacto.
# Ejecutar una vez por sesión. npm y PyPI están permitidos por el proxy de egress.
set -euo pipefail
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENDOR="${SLIDES_VENDOR_DIR:-$SKILL_DIR/.vendor}"
mkdir -p "$VENDOR"

echo "==> Dependencias Node en $VENDOR"
if [ ! -d "$VENDOR/node_modules/pptxgenjs" ]; then
  npm install --prefix "$VENDOR" --no-audit --no-fund --loglevel=error \
    pptxgenjs sharp simple-icons ffmpeg-static \
    @iconify-json/lucide @iconify-json/mdi @iconify-json/tabler \
    @iconify-json/ph @iconify-json/carbon
else
  echo "    ya instaladas"
fi

echo "==> Dependencias Python"
python3 -c "import pptx, docx, pdfplumber, fitz, lxml, PIL, defusedxml" 2>/dev/null \
  || pip install --quiet python-pptx python-docx pdfplumber pymupdf lxml Pillow defusedxml

# Algunas imágenes traen un `cryptography` de Debian roto que revienta pdfminer
# con PanicException al importar pdfplumber. Reinstalarlo desde PyPI lo arregla.
python3 -c "import pdfplumber" 2>/dev/null \
  || pip install --quiet --upgrade --ignore-installed cryptography

echo "==> Verificación"
node -e "require('$VENDOR/node_modules/pptxgenjs'); console.log('    pptxgenjs OK')"
node -e "console.log('    ffmpeg:', require('$VENDOR/node_modules/ffmpeg-static'))"
python3 -c "import pptx,docx,pdfplumber,fitz,lxml,defusedxml;print('    python OK')"
echo "==> Listo. VENDOR=$VENDOR"
