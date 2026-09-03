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
   referenciado aquí. Ninguna localidad tiene fondo propio para
   DialogueScene por ahora (solo se usa como respaldo si Street View
   real no cargó — ver STREETVIEW_POINTS más abajo).
   ============================================================ */

// Avatares seleccionables al personalizar el personaje. `avatarEntry` sigue
// generando las 4 vistas (frente/espalda/izquierda/derecha, ver
// scripts/art-jobs.js) aunque solo `front` se usa hoy — el resto quedó del
// sistema de caminata con sprites direccionales (WASD), reemplazado por
// Street View real (ver STREETVIEW_POINTS/StreetViewScene). `id` identifica
// al avatar; cada dirección tiene su propio texture key para precargar.
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
// adelante detrás del panel de texto. DialogueScene solo se usa como
// respaldo si Street View real (StreetViewScene) no pudo cargar — sin key
// de Google Maps configurada, o si falló el script — así que de momento
// ninguna localidad tiene arte propio acá, quedan con el fondo liso.
export const BACKGROUND_MANIFEST = {};

/* ============================================================
   STREET VIEW REAL — reemplaza el escenario pixel-art caminado con
   WASD por Google Street View de verdad: el jugador explora las calles
   reales de la localidad (arrastra/usa las flechas del propio visor de
   Google), y se dispara diálogo/parada de bus al acercarse a un punto
   real específico (`talk`/`bus`), no por proximidad a un sprite dibujado.
   Cubre las 8 localidades por igual — ya no depende de tener arte
   generado, así que resuelve el problema de localidades "sin configurar".

   `entry`: coordenada semilla para buscar el panorama más cercano
   (StreetViewService busca cobertura real en un radio alrededor).
   `talk`/`bus`: coordenada real (plaza, esquina, estación) donde se
   activa el disparador correspondiente al acercarse navegando.

   Coordenadas de mejor esfuerzo (plazas/estaciones reales conocidas,
   verificadas por búsqueda donde fue posible) — si alguna cae en un
   punto raro o sin cobertura de Street View, es cuestión de ajustar el
   par lat/lng, no de tocar código.
   ============================================================ */
export const STREETVIEW_POINTS = {
  "La Candelaria": {
    entry: { lat: 4.598056, lng: -74.075833 }, // Plaza de Bolívar
    talk: { lat: 4.598056, lng: -74.075833, label: 'Plaza de Bolívar' },
    bus: { lat: 4.601400, lng: -74.065700, label: 'Estación Las Aguas' },
  },
  "Suba": {
    entry: { lat: 4.741017, lng: -74.083842 }, // Plaza Fundacional de Suba
    talk: { lat: 4.741017, lng: -74.083842, label: 'Plaza Fundacional de Suba' },
    bus: { lat: 4.741800, lng: -74.079600, label: 'Portal Suba' },
  },
  "San Cristóbal": {
    entry: { lat: 4.564500, lng: -74.096900 }, // Portal 20 de Julio / iglesia 20 de Julio
    talk: { lat: 4.564500, lng: -74.096900, label: '20 de Julio' },
    bus: { lat: 4.565000, lng: -74.096940, label: 'Portal 20 de Julio' },
  },
  "Ciudad Bolívar": {
    entry: { lat: 4.573000, lng: -74.156000 }, // Candelaria La Nueva
    talk: { lat: 4.573000, lng: -74.156000, label: 'Candelaria La Nueva' },
    bus: { lat: 4.569980, lng: -74.140040, label: 'Portal Tunal' },
  },
  "Puente Aranda": {
    entry: { lat: 4.618300, lng: -74.107500 }, // Parque Puente Aranda
    talk: { lat: 4.618300, lng: -74.107500, label: 'Parque Puente Aranda' },
    bus: { lat: 4.624700, lng: -74.101300, label: 'Estación Puente Aranda' },
  },
  "Usme": {
    entry: { lat: 4.477600, lng: -74.126500 }, // Plaza Fundacional de Usme
    talk: { lat: 4.477600, lng: -74.126500, label: 'Plaza Fundacional de Usme' },
    bus: { lat: 4.473056, lng: -74.116111, label: 'Portal Usme' },
  },
  "Chapinero": {
    entry: { lat: 4.645428, lng: -74.061954 }, // Parque de los Hippies (Cl 60 #7-49) — coordenada verificada
    talk: { lat: 4.645428, lng: -74.061954, label: 'Parque de los Hippies' },
    bus: { lat: 4.657200, lng: -74.062800, label: 'Estación Chapinero' },
  },
  "Kennedy": {
    entry: { lat: 4.611067, lng: -74.175698 }, // Parque Metropolitano Timiza — coordenada verificada
    talk: { lat: 4.611067, lng: -74.175698, label: 'Parque Timiza' },
    bus: { lat: 4.625500, lng: -74.153200, label: 'Estación Banderas' },
  },
};
