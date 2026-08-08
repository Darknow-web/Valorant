import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Badge, Card, CifraAnimada, Isotipo } from './ui/Kit';
import { cascada, elemento } from '../lib/motion';
import { FilaRanking, Ranking, RANKING_VACIO, comoReloj, obtenerRanking } from '../lib/ranking';
import { iconoDeCelebracion } from '../assets/iconos';
import { Huella } from './ui/Mascotas';

/**
 * Los diez mejores turnos de la empresa.
 *
 * Existe para picar la competencia entre tiendas, así que lo que manda visualmente
 * es el nombre y la tienda de cada uno, no la tabla. Los tres primeros van en un
 * podio con los iconos de felicitación que ya usamos al aprobar un módulo; del
 * cuarto al décimo, una lista sobria.
 *
 * Nunca se muestra un DNI: el servidor no lo manda.
 */

const MEDALLAS = ['🥇', '🥈', '🥉'];

/** «1 módulo» / «14 módulos». Un ranking con faltas de concordancia se lee mal. */
const modulos = (n: number) => `${n} ${n === 1 ? 'módulo' : 'módulos'}`;

/** El podio. En celular se apila; en pantalla ancha va 2-1-3, como un podio real. */
const Podio = ({ filas }: { filas: FilaRanking[] }) => {
  if (filas.length === 0) return null;
  // El orden visual pone al primero en el centro, pero solo cuando hay sitio:
  // apilado en vertical el primero tiene que ir arriba o no se entiende nada.
  const orden = [1, 0, 2].filter((i) => i < filas.length);

  return (
    <motion.div
      variants={cascada(0.1, 0.1)}
      initial="inicial"
      animate="visible"
      className="grid gap-3 sm:grid-cols-3 sm:items-end sm:gap-4"
    >
      {filas.map((fila, i) => ({ fila, i })).map(({ fila, i }) => (
        <motion.div
          key={fila.puesto}
          variants={elemento}
          style={{ order: orden.indexOf(i) }}
          className={`relative overflow-hidden rounded-2xl border p-4 text-center sm:p-5 ${
            fila.esTu ? 'border-brand bg-brand-soft' : 'border-line bg-raised'
          } ${i === 0 ? 'sm:pb-8' : ''}`}
        >
          <div className="mb-2 flex items-center justify-center gap-2">
            <span aria-hidden className="text-2xl sm:text-3xl">
              {MEDALLAS[i]}
            </span>
            <span className="etiqueta text-ink-subtle">
              {i === 0 ? 'Primero' : i === 1 ? 'Segundo' : 'Tercero'}
            </span>
          </div>

          {iconoDeCelebracion(fila.puesto) && (
            <img
              src={iconoDeCelebracion(fila.puesto)}
              alt=""
              aria-hidden
              className={`mx-auto mb-2 object-contain ${i === 0 ? 'h-24 w-24 sm:h-28 sm:w-28' : 'h-16 w-16 sm:h-20 sm:w-20'}`}
            />
          )}

          <p className="text-balance text-[15px] font-bold leading-snug text-navy sm:text-base">{fila.nombre}</p>
          {fila.tienda && <p className="mt-0.5 text-xs text-ink-muted">{fila.tienda}</p>}

          <div className="mt-3 flex items-baseline justify-center gap-1.5">
            <span className="cifra text-3xl font-extrabold leading-none tracking-tight text-navy sm:text-4xl">
              {fila.promedio}
            </span>
            <span className="text-xs font-semibold text-ink-subtle">de 20</span>
          </div>
          <p className="cifra mt-1 text-xs text-ink-subtle">
            {modulos(fila.modulos)} · {comoReloj(fila.segundos)}
          </p>

          {fila.esTu && (
            <div className="mt-3">
              <Badge tone="brand">Eres tú</Badge>
            </div>
          )}
        </motion.div>
      ))}
    </motion.div>
  );
};

/** Una fila del cuarto puesto en adelante. */
const Fila = ({ fila }: { fila: FilaRanking }) => (
  <div
    className={`flex items-center gap-3 rounded-xl border px-3 py-3 sm:px-4 ${
      fila.esTu ? 'border-brand bg-brand-soft' : 'border-line bg-raised'
    }`}
  >
    <span
      className={`cifra w-7 shrink-0 text-center text-sm font-extrabold ${
        fila.esTu ? 'text-brand' : 'text-ink-subtle'
      }`}
    >
      {fila.puesto}
    </span>

    {/* `min-w-0` es lo que permite que el nombre se recorte en vez de empujar
        la nota fuera de la pantalla en un celular estrecho. */}
    <div className="min-w-0 flex-1">
      <p className="truncate text-[15px] font-bold leading-tight text-navy">
        {fila.nombre}
        {fila.esTu && <span className="ml-2 text-xs font-bold text-brand">· Tú</span>}
      </p>
      <p className="cifra mt-0.5 truncate text-xs text-ink-muted">
        {fila.tienda ? `${fila.tienda} · ` : ''}
        {modulos(fila.modulos)} · {comoReloj(fila.segundos)}
      </p>
    </div>

    <div className="shrink-0 text-right">
      <span className="cifra text-xl font-extrabold leading-none tracking-tight text-navy">{fila.promedio}</span>
    </div>
  </div>
);

export const RankingColaboradores = ({ dni, onVolver }: { dni: string; onVolver: () => void }) => {
  const [ranking, setRanking] = useState<Ranking>(RANKING_VACIO);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;
    obtenerRanking(dni).then((r) => {
      if (cancelado) return;
      setRanking(r);
      setCargando(false);
    });
    return () => {
      cancelado = true;
    };
  }, [dni]);

  const podio = ranking.top.slice(0, 3);
  const resto = ranking.top.slice(3);

  return (
    <div className="mx-auto max-w-3xl px-4 py-7 sm:py-12">
      <button onClick={onVolver} className="mb-5 inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:underline">
        ← Volver a los módulos
      </button>

      <header className="mb-7">
        <div className="mb-3 flex items-center gap-3">
          <Isotipo className="h-9 w-9" />
          <span className="etiqueta text-brand">SuperPet · Los mejores turnos</span>
        </div>
        <h1 className="text-balance text-[1.75rem] font-extrabold leading-tight text-ink sm:text-4xl">
          Los que mejor cerraron su turno
        </h1>
        <p className="prosa mt-2 text-sm text-ink-muted sm:text-base">
          Manda quien completó más módulos. A igualdad de módulos, la nota; y si también empatan, el tiempo.
          {ranking.totalColaboradores > 0 && (
            <>
              {' '}
              {ranking.totalColaboradores === 1 ? 'Por ahora compites tú solo.' : null}
              {ranking.totalColaboradores > 1 ? (
                <>
                  Ahora mismo compiten{' '}
                  <span className="font-semibold text-ink">{ranking.totalColaboradores}</span> colaboradores.
                </>
              ) : null}
            </>
          )}
        </p>
      </header>

      {cargando ? (
        <Card className="px-5 py-10 text-center">
          <Isotipo className="mx-auto mb-3 h-10 w-10 animate-pulse" />
          <p className="text-sm text-ink-muted">Cargando el ranking…</p>
        </Card>
      ) : ranking.error ? (
        <Card className="px-5 py-8 text-center">
          <p className="text-sm text-ink-muted">
            No se pudo cargar el ranking ahora mismo. Inténtalo otra vez en un momento.
          </p>
        </Card>
      ) : ranking.top.length === 0 ? (
        <Card className="px-5 py-10 text-center">
          <Huella />
          <p className="mt-3 text-base font-bold text-ink">Todavía no hay a quién ganarle</p>
          <p className="prosa mx-auto mt-1 text-sm text-ink-muted">
            Nadie ha terminado un módulo todavía. Termina el tuyo y serás el primero de la tabla.
          </p>
        </Card>
      ) : (
        <>
          <Podio filas={podio} />

          {resto.length > 0 && (
            <motion.div variants={cascada(0.04)} initial="inicial" animate="visible" className="mt-4 space-y-2">
              {resto.map((fila) => (
                <motion.div key={fila.puesto} variants={elemento}>
                  <Fila fila={fila} />
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Fuera del top: se le enseña su puesto real. Un ranking que no te
              dice dónde estás desanima en vez de picar. */}
          {ranking.tuFila && (
            <div className="mt-6 border-t border-line pt-5">
              <p className="etiqueta mb-2 text-ink-subtle">Tu puesto</p>
              <Fila fila={ranking.tuFila} />
              <p className="prosa mt-3 text-sm text-ink-muted">
                {ranking.tuFila.puesto - 10 === 1
                  ? 'Te falta un puesto para entrar al top 10.'
                  : `Te faltan ${ranking.tuFila.puesto - 10} puestos para entrar al top 10.`}{' '}
                Repetir un módulo que te quedó corto es la vía más rápida: se queda tu mejor intento.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};
