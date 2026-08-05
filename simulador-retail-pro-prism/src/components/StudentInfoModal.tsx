import React, { useState } from 'react';
import { useSimulator } from '../store/SimulatorContext';
import { Button, Card, Field, Input } from './ui/Kit';

/**
 * Identificación del colaborador. No hay clave: el acceso lo da el enlace del
 * entrenador. Estos datos son los que viajan a la hoja de cálculo, así que sin
 * ellos no se registra ningún intento.
 */
export const StudentInfoModal = ({ teacherUsername }: { teacherUsername: string }) => {
  const { operatorName, operatorDni, setOperator } = useSimulator();
  const [name, setName] = useState('');
  const [dni, setDni] = useState('');
  const [store, setStore] = useState('');

  if (operatorName && operatorDni) return null;

  const canSubmit = name.trim().length > 2 && dni.trim().length >= 6 && store.trim().length > 0;

  return (
    <div className="frame fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <Card className="w-full max-w-md p-8">
        <h2 className="text-xl font-bold text-ink">Identifícate para empezar</h2>
        <p className="mb-6 mt-1 text-sm text-ink-muted">
          Tus datos se usan para registrar tu progreso y tu nota en cada módulo
          {teacherUsername && (
            <>
              , y se envían a tu entrenador <span className="font-semibold text-ink">{teacherUsername}</span>
            </>
          )}
          .
        </p>

        <div className="space-y-4">
          <Field label="Nombre completo">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Ana Torres" autoFocus />
          </Field>
          <Field label="DNI">
            <Input
              value={dni}
              onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
              placeholder="Ej: 71234567"
              maxLength={8}
              inputMode="numeric"
            />
          </Field>
          <Field label="Tienda" hint="El código o nombre de tu tienda, tal como aparece en el plan de banca.">
            <Input value={store} onChange={(e) => setStore(e.target.value)} placeholder="Ej: SP15 Mayolo" />
          </Field>
        </div>

        <Button
          disabled={!canSubmit}
          onClick={() => setOperator(name.trim(), dni.trim(), store.trim())}
          className="mt-6 w-full"
        >
          Continuar
        </Button>
      </Card>
    </div>
  );
};
