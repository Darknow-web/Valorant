import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { studentLinkFor } from '../../lib/session';
import { Button, Card, CardHeader, Notice } from '../ui/Kit';

/**
 * Enlace y código QR para los colaboradores.
 *
 * El enlace lleva directo a la lista de módulos: quien lo abre nunca ve el
 * panel del entrenador.
 */
export const ShareLinkPanel = ({ username, name }: { username: string; name: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [qrError, setQrError] = useState('');
  const link = studentLinkFor(username);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, link, { width: 240, margin: 1, color: { dark: '#172033', light: '#ffffff' } })
      .catch(() => setQrError('No se pudo generar el código QR.'));
  }, [link]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // Sin permiso de portapapeles: se deja el enlace seleccionable a mano.
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `qr-simulador-${username}.png`;
    a.click();
  };

  return (
    <Card>
      <CardHeader
        title="Compartir con tus colaboradores"
        subtitle="Comparte el enlace o el QR. Solo tienen que escribir su nombre, DNI y tienda."
      />
      <div className="grid gap-6 px-5 py-5 md:grid-cols-[240px_1fr]">
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-xl border border-line bg-white p-3">
            <canvas ref={canvasRef} aria-label={`Código QR del simulador de ${name}`} />
          </div>
          <Button variant="secondary" onClick={download} className="w-full">
            Descargar QR
          </Button>
          <Button variant="ghost" onClick={() => window.print()} className="w-full">
            Imprimir
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">Enlace del colaborador</p>
            <div className="flex gap-2">
              <input
                readOnly
                value={link}
                onFocus={(e) => e.currentTarget.select()}
                className="w-full rounded-lg border border-line-strong bg-sunken px-3 py-2.5 font-mono text-xs text-ink"
              />
              <Button onClick={copy} className="shrink-0">
                {copied ? 'Copiado ✓' : 'Copiar'}
              </Button>
            </div>
          </div>

          {qrError && <Notice tone="warn">{qrError}</Notice>}

          <Notice tone="brand">
            Los resultados de quien entre por este enlace llegan a <strong>tu</strong> panel y a tu hoja de cálculo,
            porque el enlace lleva tu usuario (<code className="font-mono">{username}</code>).
          </Notice>
        </div>
      </div>
    </Card>
  );
};
