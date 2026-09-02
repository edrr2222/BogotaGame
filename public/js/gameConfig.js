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
// adelante detrás del panel de texto. Localidades ausentes aquí (Chapinero,
// Kennedy, y las que ya tienen escenario caminable en WALKABLE_SCENES) usan
// el fondo de color liso existente.
export const BACKGROUND_MANIFEST = {
  "San Cristóbal": [
    { key: 'bg_sancristobal_calle1', path: 'SanCristobal/generado/calle.png' },
    { key: 'bg_sancristobal_casa1', path: 'SanCristobal/generado/casa.png' },
  ],
  "Ciudad Bolívar": [
    { key: 'bg_ciudadbolivar_esquina', path: 'Ciudad_Bolivar/generado/esquina.png' },
    { key: 'bg_ciudadbolivar_iso1', path: 'Ciudad_Bolivar/generado/edificio.png' },
  ],
  "Puente Aranda": [
    { key: 'bg_puentearanda_carretera', path: 'Puente_Aranda/generado/carretera.png' },
    { key: 'bg_puentearanda_centro1', path: 'Puente_Aranda/generado/bodega.png' },
  ],
  "Usme": [
    { key: 'bg_usme_montanas', path: 'Usme/generado/montanas.png' },
    { key: 'bg_usme_fachada', path: 'Usme/generado/casa.png' },
  ],
};

/* ============================================================
   ESCENARIOS CAMINABLES — WASD dentro de una localidad. Todos los
   props/NPCs de aquí son PNG de 1024x1024 generados con Gemini
   (fondo magenta recortado por chroma-key en generate-art.js), por
   eso los `scale` son chicos.
   Solo 2 localidades por ahora: La Candelaria y Suba.
   ============================================================ */
const WALK_BOUNDS = { x: 30, y: 90, w: 660, h: 400 };

export const WALKABLE_SCENES = {
  "La Candelaria": {
    groundColorDay: PALETTE.day2,
    groundColorNight: PALETTE.night2,
    bounds: WALK_BOUNDS,
    playerSpawn: { x: 150, y: 430 },
    floorTile: { key: 'floor_candelaria', path: 'Candelaria/generado/piso_acera.png', tileScale: 0.05 },
    npc: { key: 'npc_candelaria', path: 'Candelaria/generado/npc_espalda.png', x: 540, y: 360 },
    props: [
      { key: 'prop_candelaria_senal', path: 'Candelaria/generado/senal_alto.png', x: 90, y: 250, scale: 0.07, depth: 1 },
      { key: 'prop_candelaria_farola', path: 'Candelaria/generado/farola_pared.png', x: 180, y: 210, scale: 0.09, depth: 1 },
      { key: 'prop_candelaria_tienda', path: 'Candelaria/generado/tienda.png', x: 280, y: 245, scale: 0.13, depth: 1 },
      { key: 'prop_candelaria_fachada', path: 'Candelaria/generado/fachada_colonial_flat.png', x: 460, y: 250, scale: 0.22, depth: 1 },
      { key: 'prop_candelaria_casa2', path: 'Candelaria/generado/casa2.png', x: 610, y: 250, scale: 0.14, depth: 1 },
      { key: 'prop_candelaria_poste', path: 'Candelaria/generado/poste_luz.png', x: 665, y: 220, scale: 0.1, depth: 1 },
      // mobiliario urbano y calle, para que no se sienta vacío
      { key: 'prop_candelaria_maceta', path: 'Candelaria/generado/maceta.png', x: 470, y: 335, scale: 0.07, depth: 2 },
      { key: 'prop_candelaria_banco', path: 'Candelaria/generado/banco.png', x: 250, y: 405, scale: 0.07, depth: 2 },
      { key: 'prop_candelaria_rejilla', path: 'Candelaria/generado/rejilla.png', x: 350, y: 460, scale: 0.04, depth: 2 },
      { key: 'prop_candelaria_calle', path: 'Candelaria/generado/calle.png', x: 540, y: 458, scale: 0.16, depth: 2 },
      { key: 'prop_candelaria_moto', path: 'Candelaria/generado/moto.png', x: 130, y: 415, scale: 0.09, depth: 2 },
      { key: 'prop_candelaria_carro', path: 'Candelaria/generado/carro.png', x: 610, y: 410, scale: 0.11, depth: 2 },
    ],
  },
  "Suba": {
    groundColorDay: PALETTE.day2,
    groundColorNight: PALETTE.night2,
    bounds: WALK_BOUNDS,
    playerSpawn: { x: 150, y: 430 },
    floorTile: null, // sin textura propia de piso: WalkScene cae a una franja de color liso.
    npc: { key: 'npc_suba', path: 'Suba/generado/npc_espalda.png', x: 540, y: 360 },
    props: [
      { key: 'prop_suba_torre', path: 'Suba/generado/torre_flat.png', x: 630, y: 210, scale: 0.16, depth: 1 },
      { key: 'prop_suba_apartamentos', path: 'Suba/generado/apartamentos_flat.png', x: 300, y: 220, scale: 0.2, depth: 1 },
      { key: 'prop_suba_tienda', path: 'Suba/generado/tienda.png', x: 470, y: 235, scale: 0.12, depth: 1 },
      { key: 'prop_suba_arbol1', path: 'Suba/generado/arbol_1.png', x: 110, y: 330, scale: 0.13, depth: 2 },
      { key: 'prop_suba_arbol2', path: 'Suba/generado/arbol_2.png', x: 660, y: 420, scale: 0.13, depth: 2 },
      { key: 'prop_suba_arbusto1', path: 'Suba/generado/arbusto_1.png', x: 200, y: 460, scale: 0.08, depth: 2 },
      { key: 'prop_suba_arbusto2', path: 'Suba/generado/arbusto_2.png', x: 430, y: 460, scale: 0.08, depth: 2 },
      { key: 'prop_suba_reja', path: 'Suba/generado/reja_negra.png', x: 420, y: 300, scale: 0.1, depth: 1 },
      { key: 'prop_suba_poste', path: 'Suba/generado/poste_luz.png', x: 545, y: 280, scale: 0.13, depth: 1 },
      { key: 'prop_suba_cancha', path: 'Suba/generado/cancha.png', x: 570, y: 385, scale: 0.16, depth: 2 },
      { key: 'prop_suba_calle', path: 'Suba/generado/calle.png', x: 320, y: 458, scale: 0.18, depth: 2 },
      { key: 'prop_suba_seto', path: 'Suba/generado/seto.png', x: 230, y: 430, scale: 0.09, depth: 2 },
      { key: 'prop_suba_arbustoesferico', path: 'Suba/generado/arbusto_esferico.png', x: 480, y: 440, scale: 0.07, depth: 2 },
      { key: 'prop_suba_canecas', path: 'Suba/generado/canecas.png', x: 175, y: 400, scale: 0.07, depth: 2 },
    ],
  },
};
