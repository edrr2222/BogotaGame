export function assetUrl(relPath) {
  return '/assets/' + relPath.split('/').map(encodeURIComponent).join('/');
}

export const PALETTE = {
  night:      0x14162b,
  night2:     0x1f2244,
  day:        0xe9e2d0,
  day2:       0xd8cdb2,
  ink:        0xece7dd,
  inkDim:     0xb9b3a6,
  accentWarm: 0xf2a03d,
  accentCool: 0x4fd1c5,
  accentRust: 0xc1440e,
  panelNight: 0x1a1c38,
  panelDay:   0xf4efe2,
};
export const FONT_DISPLAY = "'Barlow Condensed', sans-serif";
export const FONT_BODY    = "'Source Serif 4', serif";
export const FONT_MONO    = "'IBM Plex Mono', monospace";

export const STAT_ORDER = ["tolerancia","memoria","empatia","solidaridad","confianza","autenticidad","conciencia","legalidad"];

export const LOCATIONS = ["Chapinero","La Candelaria","San Cristóbal","Kennedy","Ciudad Bolívar","Suba","Puente Aranda","Usme"];
export const STAT_BY_LOCATION = {
  "Chapinero":"tolerancia","La Candelaria":"memoria","San Cristóbal":"empatia","Kennedy":"solidaridad",
  "Ciudad Bolívar":"confianza","Suba":"autenticidad","Puente Aranda":"conciencia","Usme":"legalidad"
};

export const TRAITS = {
  solidaridad:  { pos:"solidaria",                         neg:"fría con los desconocidos" },
  tolerancia:   { pos:"abierta a lo distinto",              neg:"incómoda con lo que no le es familiar" },
  memoria:      { pos:"memoriosa",                          neg:"olvidadiza" },
  empatia:      { pos:"empática",                           neg:"distante frente al dolor ajeno" },
  confianza:    { pos:"confiada",                           neg:"recelosa" },
  autenticidad: { pos:"auténtica",                          neg:"acomodada a lo que otros quieren ver" },
  conciencia:   { pos:"consciente de lo invisible",         neg:"indiferente a lo que no la toca directamente" },
  legalidad:    { pos:"institucional",                      neg:"rebuscada" },
};

/* ============================================================
   MANIFIESTO DE ASSETS — todo generado con Gemini (ver
   scripts/generate-art.js y scripts/art-jobs.js), en un mismo
   estilo plano consistente. Nada de assets/ original queda
   referenciado aquí. Chapinero y Kennedy siguen sin fondo propio
   (DialogueScene cae al color liso/vectorial para esas dos).
   ============================================================ */

// Avatares seleccionables al personalizar el personaje. Cada uno tiene 4
// vistas (frente/espalda/izquierda/derecha) generadas con Gemini a partir
// de la misma imagen de referencia (ver scripts/art-jobs.js), para que al
// caminar con WASD el personaje cambie de cara según hacia dónde se mueve
// en vez de solo espejearse. `id` identifica al avatar; cada dirección
// tiene su propio texture key para precargar.
function avatarEntry(id, label, base) {
  return {
    id, label,
    dirs: {
      front: { key: `av_${id}_front`, path: `${base}.png` },
      back:  { key: `av_${id}_back`,  path: `${base}_back.png` },
      left:  { key: `av_${id}_left`,  path: `${base}_left.png` },
      right: { key: `av_${id}_right`, path: `${base}_right.png` },
    },
  };
}

export const AVATAR_MANIFEST = [
  avatarEntry('candelaria_frente', 'La Candelaria', 'Candelaria/generado/avatar_joven'),
  avatarEntry('ciudadbolivar_nina', 'Ciudad Bolívar', 'Ciudad_Bolivar/generado/avatar_nina'),
  avatarEntry('ciudadbolivar_senora', 'Ciudad Bolívar', 'Ciudad_Bolivar/generado/avatar_senora'),
  avatarEntry('puentearanda_1', 'Puente Aranda', 'Puente_Aranda/generado/avatar_1'),
  avatarEntry('puentearanda_2', 'Puente Aranda', 'Puente_Aranda/generado/avatar_2'),
  avatarEntry('puentearanda_3', 'Puente Aranda', 'Puente_Aranda/generado/avatar_3'),
  avatarEntry('sancristobal_1', 'San Cristóbal', 'SanCristobal/generado/avatar_1'),
  avatarEntry('sancristobal_3', 'San Cristóbal', 'SanCristobal/generado/avatar_3'),
  avatarEntry('sancristobal_6', 'San Cristóbal', 'SanCristobal/generado/avatar_6'),
  avatarEntry('sancristobal_9', 'San Cristóbal', 'SanCristobal/generado/avatar_9'),
  avatarEntry('suba_frente', 'Suba', 'Suba/generado/avatar_frente'),
  avatarEntry('usme_1', 'Usme', 'Usme/generado/avatar_1'),
  avatarEntry('usme_3', 'Usme', 'Usme/generado/avatar_3'),
  avatarEntry('usme_5', 'Usme', 'Usme/generado/avatar_5'),
];

export function avatarById(id) {
  return AVATAR_MANIFEST.find(a => a.id === id) || null;
}

// Fondos por localidad para DialogueScene: capas dibujadas de atrás hacia
// adelante detrás del panel de texto. Ahora solo lo usan Chapinero y
// Kennedy (las únicas 2 sin escenario caminable en WALKABLE_SCENES) — y
// ninguna de las dos tiene arte propio, así que quedan con el fondo de
// color liso existente. Las 6 localidades caminables ya no pasan por acá.
export const BACKGROUND_MANIFEST = {};

/* ============================================================
   ESCENARIOS CAMINABLES — WASD dentro de una localidad. Todos los
   props/NPCs de aquí son PNG de 1024x1024 generados con Gemini
   (fondo magenta recortado por chroma-key en generate-art.js), por
   eso los `scale` son chicos. `streetscape` es un fondo panorámico
   (16:9) con una fila CONTINUA de fachadas — reemplaza los edificios
   sueltos con huecos entre ellos que había antes.
   `walkY` define el carril caminable real (una franja angosta sobre
   la acera, no todo el alto de la escena) para que el jugador no
   camine por encima de los techos ni flotando en el cielo.
   `pathTiles` son las variantes de baldosa que se van alternando a
   lo largo de ese carril.
   Solo 2 localidades por ahora: La Candelaria y Suba.
   ============================================================ */
const WALK_BOUNDS = { x: 30, y: 90, w: 660, h: 400 };
const WALK_Y = { min: 410, max: 468 };
const DEFAULT_WALK = { groundColorDay: PALETTE.day2, groundColorNight: PALETTE.night2, bounds: WALK_BOUNDS, walkY: WALK_Y };

// Parada de bus/Transmilenio compartida por las 6 localidades caminables —
// infraestructura genérica, no hace falta una versión distinta por zona.
const BUS_STOP = { key: 'busstop_shared', path: 'Compartido/generado/parada_bus.png' };

// Props genéricos (árboles, bancas, postes...) reusados entre localidades
// para llenar las pantallas de tránsito sin tener que generar una versión
// distinta de cada uno por zona — lo que sí cambia por localidad es el
// streetscape de fondo, el NPC y 1-2 props "de firma" propios.
const GENERIC = {
  arbol1: 'Suba/generado/arbol_1.png', arbol2: 'Suba/generado/arbol_2.png',
  arbusto1: 'Suba/generado/arbusto_1.png', arbusto2: 'Suba/generado/arbusto_2.png',
  arbustoEsferico: 'Suba/generado/arbusto_esferico.png',
  banco: 'Candelaria/generado/banco.png',
  postePared: 'Candelaria/generado/poste_luz.png', posteIso: 'Suba/generado/poste_luz.png',
  caneca: 'Suba/generado/canecas.png', maceta: 'Candelaria/generado/maceta.png',
  senalAlto: 'Candelaria/generado/senal_alto.png', reja: 'Suba/generado/reja_negra.png',
  carro: 'Candelaria/generado/carro.png', moto: 'Candelaria/generado/moto.png',
};

export const WALKABLE_SCENES = {
  "La Candelaria": {
    ...DEFAULT_WALK,
    pathTiles: [
      { key: 'floor_candelaria_1', path: 'Candelaria/generado/piso_acera.png' },
      { key: 'floor_candelaria_2', path: 'Candelaria/generado/piso_acera_2.png' },
      { key: 'floor_candelaria_3', path: 'Candelaria/generado/piso_acera_3.png' },
    ],
    screens: [
      {
        streetscape: { key: 'streetscape_candelaria_1', path: 'Candelaria/generado/streetscape.png' },
        npc: { key: 'npc_candelaria', path: 'Candelaria/generado/npc_espalda.png', x: 540, y: 440 },
        props: [
          { key: 'prop_candelaria_senal', path: GENERIC.senalAlto, x: 90, y: 400, scale: 0.07, depth: 1 },
          { key: 'prop_candelaria_farola', path: 'Candelaria/generado/farola_pared.png', x: 180, y: 370, scale: 0.09, depth: 1 },
          { key: 'prop_candelaria_maceta', path: GENERIC.maceta, x: 470, y: 400, scale: 0.07, depth: 2 },
          { key: 'prop_candelaria_banco', path: GENERIC.banco, x: 250, y: 400, scale: 0.07, depth: 2 },
          { key: 'prop_candelaria_moto', path: GENERIC.moto, x: 130, y: 400, scale: 0.09, depth: 2 },
        ],
      },
      {
        streetscape: { key: 'streetscape_candelaria_2', path: 'Candelaria/generado/streetscape_2.png' },
        props: [
          { key: 'prop_candelaria_poste', path: 'Candelaria/generado/poste_luz.png', x: 380, y: 370, scale: 0.1, depth: 1 },
          { key: 'prop_candelaria_carro', path: GENERIC.carro, x: 610, y: 400, scale: 0.11, depth: 2 },
          { key: 'prop_candelaria_rejilla', path: 'Candelaria/generado/rejilla.png', x: 250, y: 400, scale: 0.04, depth: 2 },
          { key: 'prop_candelaria_arbusto', path: GENERIC.arbusto1, x: 150, y: 400, scale: 0.08, depth: 2 },
        ],
      },
      {
        streetscape: { key: 'streetscape_candelaria_3', path: 'Candelaria/generado/streetscape_3.png' },
        busStop: { ...BUS_STOP, x: 500, y: 440 },
        props: [
          { key: 'prop_candelaria_maceta2', path: GENERIC.maceta, x: 200, y: 400, scale: 0.07, depth: 2 },
        ],
      },
    ],
  },
  "Suba": {
    ...DEFAULT_WALK,
    pathTiles: [
      { key: 'floor_suba_1', path: 'Suba/generado/piso_1.png' },
      { key: 'floor_suba_2', path: 'Suba/generado/piso_2.png' },
      { key: 'floor_suba_3', path: 'Suba/generado/piso_3.png' },
    ],
    screens: [
      {
        streetscape: { key: 'streetscape_suba_1', path: 'Suba/generado/streetscape.png' },
        npc: { key: 'npc_suba', path: 'Suba/generado/npc_espalda.png', x: 540, y: 440 },
        props: [
          { key: 'prop_suba_arbol1', path: GENERIC.arbol1, x: 110, y: 390, scale: 0.13, depth: 2 },
          { key: 'prop_suba_arbusto1', path: GENERIC.arbusto1, x: 200, y: 400, scale: 0.08, depth: 2 },
          { key: 'prop_suba_reja', path: GENERIC.reja, x: 420, y: 380, scale: 0.1, depth: 1 },
          { key: 'prop_suba_cancha', path: 'Suba/generado/cancha.png', x: 570, y: 400, scale: 0.16, depth: 2 },
        ],
      },
      {
        streetscape: { key: 'streetscape_suba_2', path: 'Suba/generado/streetscape_2.png' },
        props: [
          { key: 'prop_suba_poste', path: GENERIC.posteIso, x: 300, y: 370, scale: 0.13, depth: 1 },
          { key: 'prop_suba_seto', path: 'Suba/generado/seto.png', x: 460, y: 400, scale: 0.09, depth: 2 },
          { key: 'prop_suba_arbustoesferico', path: GENERIC.arbustoEsferico, x: 560, y: 400, scale: 0.07, depth: 2 },
          { key: 'prop_suba_canecas', path: GENERIC.caneca, x: 175, y: 400, scale: 0.07, depth: 2 },
        ],
      },
      {
        streetscape: { key: 'streetscape_suba_3', path: 'Suba/generado/streetscape_3.png' },
        busStop: { ...BUS_STOP, x: 500, y: 440 },
        props: [
          { key: 'prop_suba_arbol2', path: GENERIC.arbol2, x: 660, y: 400, scale: 0.13, depth: 2 },
          { key: 'prop_suba_arbusto2', path: GENERIC.arbusto2, x: 200, y: 400, scale: 0.08, depth: 2 },
        ],
      },
    ],
  },
  "San Cristóbal": {
    ...DEFAULT_WALK,
    pathTiles: [
      { key: 'floor_candelaria_1', path: 'Candelaria/generado/piso_acera.png' },
      { key: 'floor_candelaria_2', path: 'Candelaria/generado/piso_acera_2.png' },
      { key: 'floor_candelaria_3', path: 'Candelaria/generado/piso_acera_3.png' },
    ],
    screens: [
      {
        streetscape: { key: 'streetscape_sancristobal_1', path: 'SanCristobal/generado/streetscape_1.png' },
        npc: { key: 'npc_sancristobal', path: 'SanCristobal/generado/npc_espalda.png', x: 540, y: 440 },
        props: [
          { key: 'prop_sancristobal_escalera', path: 'SanCristobal/generado/escalera.png', x: 250, y: 380, scale: 0.14, depth: 1 },
          { key: 'prop_sancristobal_arbusto', path: GENERIC.arbusto1, x: 130, y: 400, scale: 0.08, depth: 2 },
          { key: 'prop_sancristobal_caneca', path: GENERIC.caneca, x: 620, y: 400, scale: 0.07, depth: 2 },
        ],
      },
      {
        streetscape: { key: 'streetscape_sancristobal_2', path: 'SanCristobal/generado/streetscape_2.png' },
        props: [
          { key: 'prop_sancristobal_poste', path: GENERIC.postePared, x: 350, y: 370, scale: 0.1, depth: 1 },
          { key: 'prop_sancristobal_arbol', path: GENERIC.arbol1, x: 550, y: 390, scale: 0.13, depth: 2 },
        ],
      },
      {
        streetscape: { key: 'streetscape_sancristobal_3', path: 'SanCristobal/generado/streetscape_3.png' },
        busStop: { ...BUS_STOP, x: 500, y: 440 },
        props: [
          { key: 'prop_sancristobal_banco', path: GENERIC.banco, x: 200, y: 400, scale: 0.07, depth: 2 },
        ],
      },
    ],
  },
  "Ciudad Bolívar": {
    ...DEFAULT_WALK,
    pathTiles: [
      { key: 'floor_candelaria_1', path: 'Candelaria/generado/piso_acera.png' },
      { key: 'floor_candelaria_2', path: 'Candelaria/generado/piso_acera_2.png' },
      { key: 'floor_candelaria_3', path: 'Candelaria/generado/piso_acera_3.png' },
    ],
    screens: [
      {
        streetscape: { key: 'streetscape_ciudadbolivar_1', path: 'Ciudad_Bolivar/generado/streetscape_1.png' },
        npc: { key: 'npc_ciudadbolivar', path: 'Ciudad_Bolivar/generado/npc_espalda.png', x: 540, y: 440 },
        props: [
          { key: 'prop_ciudadbolivar_mural', path: 'Ciudad_Bolivar/generado/mural.png', x: 250, y: 370, scale: 0.14, depth: 1 },
          { key: 'prop_ciudadbolivar_arbusto', path: GENERIC.arbusto2, x: 130, y: 400, scale: 0.08, depth: 2 },
        ],
      },
      {
        streetscape: { key: 'streetscape_ciudadbolivar_2', path: 'Ciudad_Bolivar/generado/streetscape_2.png' },
        props: [
          { key: 'prop_ciudadbolivar_poste', path: GENERIC.posteIso, x: 400, y: 370, scale: 0.13, depth: 1 },
          { key: 'prop_ciudadbolivar_caneca', path: GENERIC.caneca, x: 600, y: 400, scale: 0.07, depth: 2 },
        ],
      },
      {
        streetscape: { key: 'streetscape_ciudadbolivar_3', path: 'Ciudad_Bolivar/generado/streetscape_3.png' },
        busStop: { ...BUS_STOP, x: 500, y: 440 },
        props: [
          { key: 'prop_ciudadbolivar_arbol', path: GENERIC.arbol1, x: 180, y: 390, scale: 0.13, depth: 2 },
        ],
      },
    ],
  },
  "Puente Aranda": {
    ...DEFAULT_WALK,
    pathTiles: [
      { key: 'floor_suba_1', path: 'Suba/generado/piso_1.png' },
      { key: 'floor_suba_2', path: 'Suba/generado/piso_2.png' },
      { key: 'floor_suba_3', path: 'Suba/generado/piso_3.png' },
    ],
    screens: [
      {
        streetscape: { key: 'streetscape_puentearanda_1', path: 'Puente_Aranda/generado/streetscape_1.png' },
        npc: { key: 'npc_puentearanda', path: 'Puente_Aranda/generado/npc_espalda.png', x: 540, y: 440 },
        props: [
          { key: 'prop_puentearanda_tambores', path: 'Puente_Aranda/generado/tambores.png', x: 250, y: 400, scale: 0.11, depth: 2 },
          { key: 'prop_puentearanda_senal', path: GENERIC.senalAlto, x: 120, y: 400, scale: 0.07, depth: 1 },
        ],
      },
      {
        streetscape: { key: 'streetscape_puentearanda_2', path: 'Puente_Aranda/generado/streetscape_2.png' },
        props: [
          { key: 'prop_puentearanda_poste', path: GENERIC.posteIso, x: 400, y: 370, scale: 0.13, depth: 1 },
          { key: 'prop_puentearanda_carro', path: GENERIC.carro, x: 600, y: 400, scale: 0.11, depth: 2 },
        ],
      },
      {
        streetscape: { key: 'streetscape_puentearanda_3', path: 'Puente_Aranda/generado/streetscape_3.png' },
        busStop: { ...BUS_STOP, x: 500, y: 440 },
        props: [
          { key: 'prop_puentearanda_caneca', path: GENERIC.caneca, x: 200, y: 400, scale: 0.07, depth: 2 },
        ],
      },
    ],
  },
  "Usme": {
    ...DEFAULT_WALK,
    pathTiles: [
      { key: 'floor_usme_1', path: 'Usme/generado/piso_1.png' },
      { key: 'floor_usme_2', path: 'Usme/generado/piso_2.png' },
      { key: 'floor_usme_3', path: 'Usme/generado/piso_3.png' },
    ],
    screens: [
      {
        streetscape: { key: 'streetscape_usme_1', path: 'Usme/generado/streetscape_1.png' },
        npc: { key: 'npc_usme', path: 'Usme/generado/npc_espalda.png', x: 540, y: 440 },
        props: [
          { key: 'prop_usme_cerca', path: 'Usme/generado/cerca.png', x: 250, y: 390, scale: 0.13, depth: 1 },
          { key: 'prop_usme_arbusto', path: GENERIC.arbusto1, x: 130, y: 400, scale: 0.08, depth: 2 },
        ],
      },
      {
        streetscape: { key: 'streetscape_usme_2', path: 'Usme/generado/streetscape_2.png' },
        props: [
          { key: 'prop_usme_arbol', path: GENERIC.arbol2, x: 400, y: 390, scale: 0.13, depth: 2 },
        ],
      },
      {
        streetscape: { key: 'streetscape_usme_3', path: 'Usme/generado/streetscape_3.png' },
        busStop: { ...BUS_STOP, x: 500, y: 440 },
        props: [
          { key: 'prop_usme_arbusto2', path: GENERIC.arbusto2, x: 200, y: 400, scale: 0.08, depth: 2 },
        ],
      },
    ],
  },
};
