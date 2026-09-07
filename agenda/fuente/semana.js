/* ============================================================
   LA SEMANA BASE — el esqueleto estable de Carlos.

   Cada bloque es un OBJETO con campos con nombre. La versión
   anterior usaba arreglos (`b[6]`, `b.dm`, `b.clave`) y la mitad de
   los bugs vivieron ahí.

     k      clave estable dentro del día. El id del bloque se arma
            como "base:<dia>:<k>", así que insertar un bloque nuevo
            NO desplaza la identidad de los demás.
     tipo   "ancla" (hora impuesta por otro, nunca se mueve)
            "ventana" (dentro de un rango) · "libre" (por defecto)
     hora   solo las anclas
     piso   duración mínima al apretar. Sin piso, no se comprime.
     prio   orden de sacrificio, 1 primero. Sin prio, NUNCA se suelta:
            así quedan protegidos tesis, pareja, sueño y descompresión.

   Lo específico de una semana —el cine del miércoles, el partido de
   Breña— NO vive aquí: entra como compromiso desde el check-in. Esta
   plantilla es lo que se repite.
   ============================================================ */

const b = (k, nom, cat, min, extra) => Object.assign({k, nom, cat, min}, extra || {});

/* Rutina de mañana, que se repite casi igual todos los días. */
function manana(desde, opts){
  const o = opts || {};
  return [
    b("areneros",  "Areneros de los gatos", "vinculo", 15, {piso:12}),
    b("aseo",      "Aseo y vestirse",       "cuerpo",  20, {piso:14}),
    b("desayuno",  o.rapido ? "Desayuno rápido" : "Desayuno", "cuerpo",
                   o.rapido ? 10 : 30, {piso:o.rapido ? 8 : 18}),
    b("salida",    o.salida || "Táper y salida", "cuerpo", 10, {piso:8,
      nota:"Deja listo lo de la noche antes de salir: al volver no vas a tener cabeza."})
  ].map((x,i) => (i===0 ? Object.assign({}, x, {desde}) : x));
}

/* Cierre de la noche. */
function noche(opts){
  const o = opts || {};
  return [
    b("descompresion", "Descompresión sin celular", "mente", 20, {piso:10,
      nota:"No es tiempo muerto: es lo que impide que el día laboral se filtre a la noche. Es el bloque que más rápido querrás saltarte y el que menos deberías."}),
    b("captura", "Captura de pendientes", "mente", 10, {piso:5,
      nota:"Todo lo suelto va a la lista. Nada se queda en tu cabeza mientras intentas dormir."}),
    o.lectura !== false
      ? b("lectura", "Lectura", "mente", 30, {piso:20, prio:1, tag:"lectura",
          nota:"En la cama, sin pantalla."})
      : null,
    b("dormir", "Dormir", "sueno", 0, {hasta:o.hasta})
  ].filter(Boolean);
}

/* Bloque de trabajo genérico: la programación real lo reemplaza. */
function trabajo(min){
  return [
    b("ir-trabajo", "Traslado a la primera parada", "traslado", 45,
      {nota:"En scooter esto es silencio, y está bien. En metro es tiempo de lectura."}),
    b("trabajo",    "Trabajo · jornada",  "trabajo", min, {prio:2}),
    b("almuerzo",   "Almuerzo",           "cuerpo",  35, {piso:25,
      nota:"No vuelves a casa a almorzar: son horas que no tienes."}),
    b("volver-trabajo", "Traslado a casa",  "traslado", 45)
  ];
}

export const SEMANA = [
  {
    id:"lun", nom:"Lunes", corto:"Lun", res:"Trabajo + clase de noche",
    arranque:"07:00",
    aviso:{txt:"Terminas la clase 22:40 y llegas 23:45. Mañana entras a la U a las 7:30. Esta noche es corta por diseño de tus horarios, no por mala planificación — no le agregues nada.", grave:true},
    base:[
      ...manana("07:00", {salida:"Táper, mochila y salida"}),
      ...trabajo(240),
      b("tesis",   "Tesis", "u", 45, {tag:"tesis",
        nota:"Aprovechas que la cabeza ya está en modo trabajo, antes de moverte."}),
      b("ir-u",    "Traslado a la universidad", "traslado", 70),
      b("cena-u",  "Cena ligera y lectura", "mente", 35, {piso:20, prio:1, tag:"lectura",
        nota:"La espera antes de clase es tu bloque de lectura más fácil de sostener."}),
      b("clase",   "Clase presencial", "u", 190, {tipo:"ancla", hora:"19:30"}),
      b("volver-u","Traslado a casa", "traslado", 65),
      ...noche({hasta:"05:30", lectura:false})
    ]
  },
  {
    id:"mar", nom:"Martes", corto:"Mar", res:"Clase de mañana + fútbol",
    arranque:"05:30",
    aviso:{txt:"El día más pesado. Sales de clase 12:40 y la capacitación es a las 14:00 al otro lado de Lima: llegas justo. Avisa que entras sobre la hora.", grave:true},
    base:[
      ...manana("05:30", {rapido:true}),
      b("ir-u",   "Traslado a la universidad", "traslado", 65,
        {tipo:"ancla", hora:"06:15", nota:"55 min reales más 10 de margen. Sales 6:15, no 6:30."}),
      b("clase",  "Clase presencial", "u", 310, {tipo:"ancla", hora:"07:30"}),
      b("almuerzo-u","Almuerzo cerca de la U","cuerpo", 25, {piso:20,
        nota:"25 min y sales. La capacitación no la alcanzas de otra forma."}),
      ...trabajo(240).slice(0,2),
      b("volver", "Traslado a casa", "traslado", 45),
      b("cena",   "Cena y cambio", "cuerpo", 40, {piso:28}),
      ...noche({hasta:"07:00", lectura:false})
    ],
    futbol:true
  },
  {
    id:"mie", nom:"Miércoles", corto:"Mié", res:"Trabajo + reunión de grupo",
    arranque:"07:00",
    aviso:{txt:"Arranque tardío a propósito: es tu primera noche completa de la semana.", grave:false},
    base:[
      ...manana("07:00"),
      ...trabajo(300),
      ...noche({hasta:"06:00"}).slice(0,1),
      b("tesis", "Tesis", "u", 55, {tag:"tesis"}),
      b("cena",  "Cena", "cuerpo", 40, {piso:28}),
      ...noche({hasta:"06:00"}).slice(1)
    ]
  },
  {
    id:"jue", nom:"Jueves", corto:"Jue", res:"Jornada completa + fútbol",
    arranque:"06:00",
    aviso:{txt:"Tu día de trabajo más largo y el único con margen real por la tarde. Aquí es donde entra la tesis entre semana.", grave:false},
    base:[
      ...manana("06:00"),
      ...trabajo(270),
      b("descompresion","Descompresión sin celular","mente",20,{piso:10}),
      b("tesis",  "Tesis", "u", 60, {tag:"tesis"}),
      b("lectura-t","Lectura","mente",35,{piso:20,prio:1,tag:"lectura"}),
      b("cena",   "Cena y cambio", "cuerpo", 40, {piso:28}),
      ...noche({hasta:"07:00", lectura:false}).slice(1)
    ],
    futbol:true
  },
  {
    id:"vie", nom:"Viernes", corto:"Vie", res:"Gym + tu noche libre",
    arranque:"07:00",
    aviso:{txt:"Tu única noche libre de la semana. Decide el lunes si es pareja o tesis profunda, no el viernes a las ocho.", grave:false},
    base:[
      ...manana("07:00", {salida:"Ropa de gym en la mochila y salida"}),
      ...trabajo(300).slice(0,3),
      b("ir-gym", "Traslado al gym", "traslado", 40,
        {nota:"Directo desde el trabajo, sin pasar por casa. Si pasas por casa, no vas."}),
      b("gym",    "Gym", "cuerpo", 90, {piso:60, prio:4, tag:"gym"}),
      b("volver", "Traslado a casa", "traslado", 40),
      b("lectura-v","Lectura","mente",35,{piso:20,prio:1,tag:"lectura"}),
      b("cena",   "Ducha y cena", "cuerpo", 45, {piso:30}),
      b("libre",  "Noche libre · pareja o tesis profunda", "vinculo", 130,
        {nota:"El único bloque flexible grande que tienes. Alterna semana a semana."}),
      ...noche({hasta:"06:30", lectura:false}).slice(0,2),
      b("dormir", "Dormir", "sueno", 0, {hasta:"06:30"})
    ]
  },
  {
    id:"sab", nom:"Sábado", corto:"Sáb", res:"Gym + media jornada + pareja",
    arranque:"06:30",
    aviso:{txt:"El bloque grande con tu enamorada va aquí, protegido: casi seis horas seguidas. No lo piques con pendientes de trabajo.", grave:false},
    base:[
      b("areneros","Areneros de los gatos","vinculo",15,{piso:12,desde:"06:30"}),
      b("aseo",    "Aseo y pre-entreno","cuerpo",20,{piso:14}),
      b("ir-gym",  "Traslado al gym","traslado",40),
      b("gym",     "Gym","cuerpo",90,{piso:60,prio:4,tag:"gym"}),
      b("volver-gym","Traslado a casa","traslado",40),
      b("desayuno","Ducha y desayuno","cuerpo",40,{piso:25}),
      ...trabajo(180).slice(0,4),
      b("lectura-s","Lectura","mente",35,{piso:20,prio:1,tag:"lectura"}),
      b("descompresion","Descompresión sin celular","mente",20,{piso:10}),
      b("arreglarse","Arreglarse","cuerpo",30,{piso:18}),
      b("pareja",  "Salida con tu enamorada","vinculo",350,
        {tipo:"ancla", hora:"17:10", tag:"pareja",
         nota:"Sin revisar el correo del trabajo. Ese es el punto del bloque."}),
      b("captura", "Areneros y captura","vinculo",15,{piso:10}),
      b("lectura", "Lectura","mente",30,{piso:20,prio:1,tag:"lectura"}),
      b("dormir",  "Dormir","sueno",0,{hasta:"06:45"})
    ]
  },
  {
    id:"dom", nom:"Domingo", corto:"Dom", res:"Correos, tesis, cocina y planificación",
    arranque:"06:45",
    aviso:{txt:"El día que sostiene la semana. Si el domingo se cae, el lunes arranca a ciegas.", grave:false},
    base:[
      b("areneros","Areneros de los gatos","vinculo",15,{piso:12,desde:"06:45"}),
      b("aseo",    "Aseo y pre-entreno","cuerpo",20,{piso:14}),
      b("ir-gym",  "Traslado al gym","traslado",40),
      b("gym",     "Gym","cuerpo",90,{piso:60,prio:4,tag:"gym"}),
      b("volver-gym","Traslado a casa","traslado",40),
      b("desayuno","Ducha y desayuno","cuerpo",40,{piso:25}),
      b("correos", "Correos de las visitas de la semana","trabajo",120,{prio:2,
        nota:"Todas las visitas de la semana de una sentada, con el Takary ya lleno."}),
      b("compras", "Compras del mercado","cuerpo",70,{piso:45}),
      b("almuerzo","Almuerzo","cuerpo",40,{piso:25}),
      b("cocina",  "Cocina batch · tápers de la semana","cuerpo",90,{piso:60,
        nota:"Resuelve los tápers y le quita a la semana la decisión diaria de qué comer, que es fatiga mental disfrazada de logística."}),
      b("tesis",   "Tesis · bloque profundo","u",140,{tag:"tesis"}),
      b("descompresion","Descompresión sin celular","mente",20,{piso:10}),
      b("pareja",  "Tiempo con tu enamorada","vinculo",130,{tag:"pareja"}),
      b("cena",    "Cena","cuerpo",40,{piso:28}),
      b("ritual",  "Ritual del domingo","mente",25,{piso:15,
        nota:"Cierras la semana con los datos reales y abres la siguiente. El lunes arranca en cero."}),
      b("lectura", "Lectura","mente",45,{piso:20,prio:1,tag:"lectura"}),
      b("listo",   "Dejar listo el lunes","cuerpo",15,{piso:5,prio:3}),
      b("dormir",  "Dormir","sueno",0,{hasta:"07:00"})
    ]
  }
];

/* ---------------- fútbol de hora variable ----------------
   Carlos juega UN partido de 40 min: llega 20 antes y se va 15
   después. Con traslado son 2 h 35 fuera de casa, fijas, sin importar
   la hora. La versión anterior bloqueaba la ventana completa
   20:40-23:00 y le costaba más de una hora por noche.
   Él avisa la hora el día antes; sin confirmar se usa el escenario
   tardío, nunca el optimista. */
export const F = {antes:20, partido:40, despues:15, traslado:40, defecto:"22:00"};

export function bloquesFutbol(hora){
  const h = hora || F.defecto;
  const salida = ((x) => {
    const p = x.split(":"); return (+p[0])*60 + (+p[1]) - F.antes - F.traslado;
  })(h);
  const hh = (m) => String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0");
  return [
    b("ir-cancha", "Traslado a la cancha", "traslado", F.traslado,
      {tipo:"ancla", hora:hh(salida)}),
    b("calentar",  "Llegada y calentamiento", "cuerpo", F.antes, {piso:12}),
    b("partido",   "Partido", "cuerpo", F.partido, {
      nota: hora ? "Tu partido de la semana en este día."
                 : "Hora sin confirmar: el día está armado con el escenario tardío. Dime a qué hora juegas y se recalcula."}),
    b("salir",     "Salida de la cancha", "cuerpo", F.despues, {piso:8,
      nota:"Si juegan temprano y te quieres quedar a ver, el rato que sigue es tuyo: es opcional, no es un compromiso."}),
    b("volver-cancha","Traslado a casa","traslado", F.traslado)
  ];
}

/* Metas semanales. `sesiones` cuenta veces, no minutos. */
export const METAS = [
  {tag:"tesis",   nom:"Tesis",   meta:300},
  {tag:"lectura", nom:"Lectura", meta:210},
  {tag:"pareja",  nom:"Pareja",  meta:480},
  {tag:"gym",     nom:"Gym",     meta:270, sesiones:3}
];

export const CATS = ["trabajo","u","cuerpo","vinculo","mente","traslado","sueno"];
export const DIA_IDS = SEMANA.map(d => d.id);
