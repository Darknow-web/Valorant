import React, { useState } from 'react';
import { useSimulator } from '../store/SimulatorContext';
import { motion } from 'motion/react';
import { Button, Card, Field, Input, Isotipo, Select } from './ui/Kit';
import { modal } from '../lib/motion';

/**
 * Identificación del colaborador. No hay clave: el acceso lo da el enlace del
 * entrenador. Estos datos son los que viajan a la hoja de cálculo, así que sin
 * ellos no se registra ningún intento.
 *
 * El documento se valida de verdad porque es la LLAVE del colaborador: con él se
 * guarda su avance, se le reconoce al volver de otro equipo y se le identifica
 * en el ranking. Un DNI mal tecleado le crea sin querer un colaborador nuevo y
 * pierde lo que llevaba hecho.
 */

type TipoDocumento = 'DNI' | 'CE';

/**
 * Las reglas de cada documento, en un solo sitio.
 *
 * El DNI peruano tiene ocho dígitos exactos. El carnet de extranjería es más
 * largo y no siempre igual, así que se exige un mínimo y se deja crecer.
 */
const DOCUMENTOS: Record<TipoDocumento, { etiqueta: string; ejemplo: string; maximo: number; valido: (v: string) => boolean; ayuda: string }> = {
  DNI: {
    etiqueta: 'DNI',
    ejemplo: 'Ej: 71234567',
    maximo: 8,
    valido: (v) => v.length === 8,
    ayuda: 'El DNI tiene 8 dígitos, ni uno más ni uno menos.',
  },
  CE: {
    etiqueta: 'Carnet de extranjería',
    ejemplo: 'Ej: 001234567',
    maximo: 20,
    valido: (v) => v.length >= 8,
    ayuda: 'El carnet de extranjería tiene 8 dígitos o más.',
  },
};

export const StudentInfoModal = ({ teacherUsername }: { teacherUsername: string }) => {
  const { operatorName, operatorDni, setOperator } = useSimulator();
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [tipo, setTipo] = useState<TipoDocumento>('DNI');
  const [documento, setDocumento] = useState('');
  const [store, setStore] = useState('');

  if (operatorName && operatorDni) return null;

  const regla = DOCUMENTOS[tipo];
  const documentoOk = regla.valido(documento);
  // El aviso solo aparece cuando ya empezó a escribir: decirle que le faltan
  // dígitos con el campo en blanco es regañarle antes de tiempo.
  const avisoDocumento = documento.length > 0 && !documentoOk ? regla.ayuda : '';

  const puedeSeguir =
    nombre.trim().length >= 2 && apellido.trim().length >= 2 && documentoOk && store.trim().length > 0;

  return (
    <div className="frame fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-surface p-4 py-8 sm:items-center">
      <motion.div variants={modal} initial="inicial" animate="visible" className="w-full max-w-md">
      <Card className="p-6 sm:p-8">
        <Isotipo className="mb-5 h-12 w-12" />
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
          {/* En celular se apilan; en pantalla ancha caben los dos en una fila. */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre">
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Ana" autoFocus />
            </Field>
            <Field label="Apellido">
              <Input value={apellido} onChange={(e) => setApellido(e.target.value)} placeholder="Ej: Torres" />
            </Field>
          </div>

          <Field label="Tipo de documento">
            <Select
              value={tipo}
              onChange={(e) => {
                // El número se limpia al cambiar de tipo: si no, un DNI de 8
                // dígitos se quedaba dentro de un carnet, o al revés un carnet
                // largo se recortaba a 8 y pasaba por DNI válido siendo falso.
                setTipo(e.target.value as TipoDocumento);
                setDocumento('');
              }}
            >
              <option value="DNI">DNI</option>
              <option value="CE">Carnet de extranjería</option>
            </Select>
          </Field>

          <Field label={regla.etiqueta} hint={avisoDocumento || undefined}>
            <Input
              value={documento}
              onChange={(e) => setDocumento(e.target.value.replace(/\D/g, '').slice(0, regla.maximo))}
              placeholder={regla.ejemplo}
              inputMode="numeric"
              aria-invalid={!!avisoDocumento}
            />
          </Field>

          <Field label="Tienda" hint="El código o nombre de tu tienda, tal como aparece en el plan de banca.">
            <Input value={store} onChange={(e) => setStore(e.target.value)} placeholder="Ej: SP15 Mayolo" />
          </Field>
        </div>

        <Button
          disabled={!puedeSeguir}
          onClick={() =>
            // El nombre viaja junto en un solo campo: es lo que ve el entrenador
            // en su hoja y lo que sale en el ranking. Las dos partes se guardan
            // aparte solo para poder volver a editarlas.
            setOperator(`${nombre.trim()} ${apellido.trim()}`, documento.trim(), store.trim(), {
              nombre: nombre.trim(),
              apellido: apellido.trim(),
              tipoDocumento: tipo,
            })
          }
          className="mt-6 w-full"
        >
          Continuar
        </Button>
      </Card>
      </motion.div>
    </div>
  );
};
