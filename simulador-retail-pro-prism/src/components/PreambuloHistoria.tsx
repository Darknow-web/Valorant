import React from 'react';
import { motion } from 'motion/react';
import { Button, Isotipo } from './ui/Kit';
import { cascada, elemento } from '../lib/motion';
import { iconoDeModulo, ilustracionHistoria } from '../assets/iconos';

/**
 * La entrada del relato.
 *
 * Los catorce módulos ya ocurren en un mismo turno y en orden, pero hasta ahora
 * el colaborador entraba directo a una lista y los leía como catorce ejercicios
 * sueltos. Esto los presenta como lo que son: su primer día en la caja, con su
 * nombre y su tienda.
 *
 * Se muestra UNA vez (queda marcado en el servidor) y se puede saltar. Cuatro
 * líneas y una imagen: si se alarga, deja de ser una entrada y se vuelve un
 * texto que nadie lee.
 */
export const PreambuloHistoria = ({
  nombre,
  tienda,
  totalModulos,
  onEmpezar,
}: {
  nombre: string;
  tienda: string;
  totalModulos: number;
  onEmpezar: () => void;
}) => {
  // Mientras no exista la ilustración del relato se usa la portada del primer
  // módulo, que ya es del mismo estilo. Así esto nunca sale sin imagen.
  const ilustracion = ilustracionHistoria('apertura') || iconoDeModulo('m1');
  const primerNombre = nombre.trim().split(/\s+/)[0] || 'colaborador';

  return (
    <div className="frame min-h-[100dvh] bg-navy text-white">
      <div className="mx-auto flex min-h-[100dvh] max-w-4xl flex-col justify-center px-5 py-12">
        <motion.div variants={cascada(0.12, 0.15)} initial="inicial" animate="visible">
          <motion.div variants={elemento} className="mb-8 flex items-center gap-3">
            <Isotipo className="h-9 w-9" />
            <span className="etiqueta text-sand">SuperPet · Capacitación de caja</span>
          </motion.div>

          {ilustracion && (
            <motion.img
              variants={elemento}
              src={ilustracion}
              alt=""
              aria-hidden
              // Redondeada: la ilustración es un rectángulo de fondo claro
              // sobre el azul marino de la pantalla, y a canto vivo se ve como
              // un recorte pegado encima.
              className="mx-auto mb-8 max-h-[38vh] w-auto max-w-full rounded-2xl object-contain drop-shadow-[0_18px_40px_rgba(0,0,0,0.35)]"
            />
          )}

          <motion.p variants={elemento} className="etiqueta text-sand">
            6:40 a. m. · {tienda}
          </motion.p>

          <motion.h1
            variants={elemento}
            className="mt-3 text-balance text-[2.25rem] font-extrabold leading-[1.05] tracking-tight sm:text-5xl"
          >
            Hoy la caja es tuya, {primerNombre}.
          </motion.h1>

          <motion.p variants={elemento} className="prosa mt-5 text-[17px] leading-relaxed text-white/75 sm:text-lg">
            El turno tiene {totalModulos} momentos: abrirla, atender lo que entre por la puerta y por el aplicativo,
            resolver lo que te devuelvan y dejarla cuadrada antes de irte.
          </motion.p>

          <motion.p variants={elemento} className="prosa mt-3 text-[17px] leading-relaxed text-white/75 sm:text-lg">
            Nadie te va a dictar los pasos. Solo vas a saber lo que pasa en el mostrador.
          </motion.p>

          <motion.div variants={elemento} className="mt-9">
            <Button onClick={onEmpezar} className="w-full sm:w-auto">
              Empezar el turno
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};
