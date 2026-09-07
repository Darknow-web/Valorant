/* ============================================================
   CATÁLOGO — todo lo que la app SABE, en un solo sitio.
   Sin lógica, sin DOM: datos que el motor consume.
   ============================================================ */

/* Casa de Carlos. Todos los traslados salen de aquí. */
export const CASA = "Las Gladiolas 125, Independencia";

/* Saltos de reserva cuando no hay par medido: dentro del mismo
   conglomerado y cruzando de uno a otro. */
export const T_INTRA = 23, T_INTER = 57;

/* Lugares que no son tienda, con sus minutos desde casa. */
export const LUGARES = {
  CASA:    {nom:"casa",             min:0},
  OFICINA: {nom:"la oficina",       min:60},
  UNI:     {nom:"la universidad",   min:65},   // sede Los Olivos
  CANCHA:  {nom:"la cancha",        min:40},
  GYM:     {nom:"el gym",           min:40},
  ROYAL:   {nom:"Royal Plaza",      min:15}    // Independencia, a 2,5 km
};

/* Duraciones de trabajo. La visita son 120 y no 90: Carlos dijo
   "1 h 30 a 2 h" y la regla de la casa es planificar el peor
   escenario. Los 90 son el piso, solo cuando el día no da. */
export const DUR = {
  visita:           120,
  "turno-completo": 330,
  capacitacion:     150,   // 14:00-16:30, del cuadro
  "tienda-escuela": 330,
  oficina:          180
};
export const VISITA_PISO = 90;

export const GRUPOS = [
  {id:"norte", nom:"Norte", color:"var(--c-u)", min:30, tiendas:[
    ["SP33","Plaza Norte","Av Alfredo Mendiola 1400 Int. local CF-2B","PLATINO",27],
    ["SP56","Mega Plaza","Av. Alfredo Mendiola 3698, Centro comercial Mega Plaza L33","BRONCE",27],
    ["SP44","Izaguirre","Av. Carlos Izaguirre 521, Los Olivos 15301, Perú","BRONCE",28],
    ["SP15","Antúnez de Mayolo","Av. Antúnez de Mayolo 949","BRONCE",30]
  ]},
  {id:"callao", nom:"Callao", color:"var(--c-trabajo)", min:60, tiendas:[
    ["SP61","Minka","Av Argentina 3093 P09 C03-L102B/103/104 CC Minka Callao","BRONCE",60]
  ]},
  {id:"centro", nom:"Centro y oeste", color:"var(--c-mente)", min:61, tiendas:[
    ["SP52","Real Plaza Salaverry","Av. Gral. Salaverry 2370 - Sótano 1","ORO",58],
    ["SP20","Dos de Mayo","Av. Dos de Mayo 1119 - 1125","PLATINO",61]
  ]},
  {id:"sjl", nom:"San Juan de Lurigancho", color:"var(--c-cuerpo)", min:66, tiendas:[
    ["SP54","Mall Aventura SJL","Av. Lurigancho N°997-999 LS 13a CC Mall Aventura San Juan de Lurigancho (Sotano), San Juan de Lurigancho","BRONCE",55],
    ["SP25","SJL","Av. Próceres de la independencia 1608","BRONCE",66]
  ]},
  {id:"mira", nom:"Miraflores", color:"var(--c-vinculo)", min:68, tiendas:[
    ["SP47","28 de Julio","Av. 28 de Julio 1264, Miraflores","PLATINO",65],
    ["SP41","Aurora","Av. República de Panamá 5985, Miraflores, Perú","ORO",67],
    ["SP12","Bajada Balta","Malecón Balta 650, Local 113","PLATA",68],
    ["SP55","Ejército 2","Av. del Ejercito 634 - Miraflores","BRONCE",68]
  ]},
  {id:"ate", nom:"Ate y Santa Anita", color:"var(--c-traslado)", min:72, tiendas:[
    ["SP66","Mall Aventura Santa Anita","Minería 122, piso 1, Zona Industrial (C-1028 C-1030.) - Santa Anita, Lima","BRONCE",65],
    ["SP69","Paracas","Av. Paracas N° 236, Ate","BRONCE",67],
    ["SP36","Real Plaza Puruchuco","Av. Nicolas Ayllon 4770 -101 Ex fundo Vista Alegre, Ate - 1er piso (Real Plaza Puruchuco)","PLATA",72]
  ]},
  {id:"molina", nom:"La Molina", color:"var(--c-sueno)", min:90, tiendas:[
    ["SP42","Cenco La Molina","Las Retamas con Av. Raul Ferrero. Local S1084 CC Cenco La Molina portal","BRONCE",78],
    ["SP03","La Molina","Av. Los Aromos 110","PLATA",80],
    ["SP16","La Planicie","Calle Tahití 165 - 169, Urb. La Planicie","PLATA",85],
    ["SP48","Molicentro","Av. La Molina 2848","BRONCE",90]
  ]}
];

/* Minutos medidos entre tiendas: OSRM con el factor de hora punta de
   Lima (x2.2) más 10 min de margen. 190 pares = el triángulo completo
   de las 20 tiendas; la búsqueda prueba las dos direcciones. */
export const ENTRE = {"SP33|SP56":17,"SP33|SP44":22,"SP33|SP15":23,"SP33|SP61":47,"SP33|SP52":50,"SP33|SP20":53,"SP33|SP25":57,"SP33|SP54":46,"SP33|SP47":57,"SP33|SP41":59,"SP33|SP12":60,"SP33|SP55":60,"SP33|SP36":62,"SP33|SP69":57,"SP33|SP66":55,"SP33|SP03":70,"SP33|SP16":75,"SP33|SP42":68,"SP33|SP48":80,"SP56|SP44":18,"SP56|SP15":21,"SP56|SP61":51,"SP56|SP52":53,"SP56|SP20":56,"SP56|SP25":60,"SP56|SP54":49,"SP56|SP47":59,"SP56|SP41":62,"SP56|SP12":63,"SP56|SP55":63,"SP56|SP36":64,"SP56|SP69":60,"SP56|SP66":58,"SP56|SP03":73,"SP56|SP16":77,"SP56|SP42":71,"SP56|SP48":83,"SP44|SP15":14,"SP44|SP61":44,"SP44|SP52":58,"SP44|SP20":61,"SP44|SP25":65,"SP44|SP54":53,"SP44|SP47":64,"SP44|SP41":67,"SP44|SP12":68,"SP44|SP55":67,"SP44|SP36":69,"SP44|SP69":65,"SP44|SP66":63,"SP44|SP03":78,"SP44|SP16":82,"SP44|SP42":76,"SP44|SP48":88,"SP15|SP61":42,"SP15|SP52":58,"SP15|SP20":61,"SP15|SP25":65,"SP15|SP54":54,"SP15|SP47":65,"SP15|SP41":67,"SP15|SP12":68,"SP15|SP55":65,"SP15|SP36":70,"SP15|SP69":65,"SP15|SP66":63,"SP15|SP03":78,"SP15|SP16":82,"SP15|SP42":76,"SP15|SP48":88,"SP61|SP52":51,"SP61|SP20":50,"SP61|SP25":75,"SP61|SP54":63,"SP61|SP47":64,"SP61|SP41":66,"SP61|SP12":62,"SP61|SP55":51,"SP61|SP36":77,"SP61|SP69":69,"SP61|SP66":70,"SP61|SP03":85,"SP61|SP16":90,"SP61|SP42":83,"SP61|SP48":95,"SP52|SP20":15,"SP52|SP25":68,"SP52|SP54":56,"SP52|SP47":33,"SP52|SP41":36,"SP52|SP12":32,"SP52|SP55":21,"SP52|SP36":58,"SP52|SP69":38,"SP52|SP66":51,"SP52|SP03":52,"SP52|SP16":59,"SP52|SP42":49,"SP52|SP48":64,"SP20|SP25":68,"SP20|SP54":57,"SP20|SP47":30,"SP20|SP41":33,"SP20|SP12":32,"SP20|SP55":21,"SP20|SP36":55,"SP20|SP69":35,"SP20|SP66":49,"SP20|SP03":50,"SP20|SP16":56,"SP20|SP42":47,"SP20|SP48":62,"SP25|SP54":29,"SP25|SP47":68,"SP25|SP41":71,"SP25|SP12":72,"SP25|SP55":76,"SP25|SP36":60,"SP25|SP69":58,"SP25|SP66":54,"SP25|SP03":69,"SP25|SP16":73,"SP25|SP42":67,"SP25|SP48":79,"SP54|SP47":54,"SP54|SP41":57,"SP54|SP12":58,"SP54|SP55":63,"SP54|SP36":46,"SP54|SP69":44,"SP54|SP66":40,"SP54|SP03":55,"SP54|SP16":59,"SP54|SP42":53,"SP54|SP48":65,"SP47|SP41":16,"SP47|SP12":17,"SP47|SP55":25,"SP47|SP36":59,"SP47|SP69":39,"SP47|SP66":52,"SP47|SP03":51,"SP47|SP16":60,"SP47|SP42":48,"SP47|SP48":65,"SP41|SP12":20,"SP41|SP55":26,"SP41|SP36":56,"SP41|SP69":36,"SP41|SP66":49,"SP41|SP03":47,"SP41|SP16":57,"SP41|SP42":44,"SP41|SP48":62,"SP12|SP55":24,"SP12|SP36":66,"SP12|SP69":45,"SP12|SP66":59,"SP12|SP03":57,"SP12|SP16":66,"SP12|SP42":54,"SP12|SP48":72,"SP55|SP36":63,"SP55|SP69":43,"SP55|SP66":57,"SP55|SP03":57,"SP55|SP16":64,"SP55|SP42":54,"SP55|SP48":70,"SP36|SP69":39,"SP36|SP66":28,"SP36|SP03":40,"SP36|SP16":32,"SP36|SP42":37,"SP36|SP48":38,"SP69|SP66":29,"SP69|SP03":37,"SP69|SP16":44,"SP69|SP42":34,"SP69|SP48":49,"SP66|SP03":40,"SP66|SP16":45,"SP66|SP42":38,"SP66|SP48":50,"SP03|SP16":27,"SP03|SP42":15,"SP03|SP48":33,"SP16|SP42":28,"SP16|SP48":22,"SP42|SP48":29};

/* Horarios reales de cada tienda, leídos de su ficha en superpet.pe.
   [lunes-viernes, sábado, domingo], cada uno [abre, cierra] en minutos.
   El motor no programa una visita antes de que abra ni de modo que
   termine después del cierre. */
export const HORARIOS = {
  SP33:[[540,1320],[540,1320],[540,1320]],
  SP56:[[600,1320],[600,1320],[600,1320]],
  SP44:[[600,1260],[600,1260],[540,1140]],
  SP15:[[600,1260],[600,1260],[600,1200]],
  SP61:[[540,1320],[540,1320],[540,1320]],
  SP52:[[540,1320],[540,1320],[540,1320]],
  SP20:[[480,1320],[480,1320],[480,1260]],
  SP54:[[540,1320],[540,1320],[540,1320]],
  SP25:[[540,1320],[540,1320],[540,1320]],
  SP47:[[540,1320],[540,1320],[540,1260]],
  SP41:[[480,1320],[480,1320],[540,1260]],
  SP12:[[600,1320],[600,1320],[600,1320]],
  SP55:[[540,1260],[540,1260],[540,1200]],
  SP66:[[600,1320],[600,1320],[600,1320]],
  SP69:[[540,1320],[540,1320],[540,1320]],
  SP36:[[540,1320],[540,1320],[540,1320]],
  SP42:[[540,1320],[540,1320],[540,1320]],
  SP03:[[480,1260],[480,1260],[480,1260]],
  SP16:[[480,1260],[480,1260],[540,1140]],
  SP48:[[540,1260],[540,1260],[540,1260]]
};

/* Colchón antes del cierre: nadie termina una visita con la reja
   bajando. */
export const CIERRE_COLCHON = 15;
