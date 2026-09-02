// Encargos de generación de arte con IA — reemplazo completo de assets/
// original por piezas generadas con Gemini, todas en un mismo estilo plano
// consistente (sin mezclar isométrico/3D con 2D plano como pasaba antes).
//
// Dos tipos de encargo:
//  - 'icon'  -> sprite suelto (personaje/prop): fondo magenta sólido de
//               referencia que generate-art.js recorta por chroma-key.
//  - 'scene' -> fondo panorámico de una localidad (usado detrás del panel
//               de diálogo, ya con su propio tinte/alpha aplicado por
//               código): se guarda tal cual, sin recortar nada.

const ICON_STYLE = `Flat 2D pixel-art game asset, front-facing elevation view
(NOT isometric, NOT 3D-rendered, no perspective/depth shading, no gradients) —
same simple flat cel-shaded pixel-art style as a 16-bit RPG tileset icon.
Centered, single subject, no ground shadow. Background must be a single flat
solid magenta color (#FF00FF), completely uniform, no texture on it.
No text, no logos, no watermark, no signature, no border.`;

const SCENE_STYLE = `Flat 2D pixel-art game background illustration, wide
landscape composition, front/side elevation view (NOT isometric, NOT
photorealistic, no 3D perspective rendering) — same simple flat cel-shaded
pixel-art style as a 16-bit RPG background. No text, no logos, no watermark,
no signature, no UI, no border, no captions baked into the image.`;

function icon(locality, key, outFile, subject) {
  return { type: 'icon', locality, key, outFile, prompt: `${ICON_STYLE}\n\nSubject: ${subject}` };
}
function scene(locality, key, outFile, subject) {
  return { type: 'scene', locality, key, outFile, prompt: `${SCENE_STYLE}\n\nSubject: ${subject}` };
}

const JOBS = [
  // ---------- Edificios ya generados (tanda anterior) ----------
  icon('La Candelaria', 'ai_candelaria_fachada', 'Candelaria/generado/fachada_colonial_flat.png',
    `a single-story colonial building facade segment from La Candelaria, Bogotá —
whitewashed adobe wall, one centered dark-wood arched doorway with simple
stone-look pilasters flanking it, a small wrought-iron balcony window above
the door, a strip of terracotta roof tile visible along the top edge.`),
  icon('Suba', 'ai_suba_apartamentos', 'Suba/generado/apartamentos_flat.png',
    `a modern 4-story apartment building from Suba, Bogotá — beige and terracotta
brick facade, evenly spaced small rectangular windows in rows, simple flat
balconies with thin railings, flat rooftop line.`),
  icon('Suba', 'ai_suba_torre', 'Suba/generado/torre_flat.png',
    `a taller residential tower block from Suba, Bogotá, meant to sit further
back in a street scene — plain rectangular silhouette, muted red-brick color,
small repeating windows in a grid, flat rooftop with a water-tank box on top.`),

  // ---------- Avatares seleccionables (14) ----------
  icon('La Candelaria', 'ai_av_candelaria_frente', 'Candelaria/generado/avatar_joven.png',
    'a young adult pedestrian, dark casual jacket and jeans, standing, facing forward, neutral pose.'),
  icon('Ciudad Bolívar', 'ai_av_ciudadbolivar_nina', 'Ciudad_Bolivar/generado/avatar_nina.png',
    'a young girl, colorful casual outfit (pink top, dark pants), standing, facing forward.'),
  icon('Ciudad Bolívar', 'ai_av_ciudadbolivar_senora', 'Ciudad_Bolivar/generado/avatar_senora.png',
    'an older woman, cardigan over a simple dress, standing, facing forward, warm expression.'),
  icon('Puente Aranda', 'ai_av_puentearanda_1', 'Puente_Aranda/generado/avatar_1.png',
    'an adult man, grey work jacket and dark pants, standing, facing forward, plain pose.'),
  icon('Puente Aranda', 'ai_av_puentearanda_2', 'Puente_Aranda/generado/avatar_2.png',
    'an adult woman, blue utility jacket and jeans, standing, facing forward, plain pose.'),
  icon('Puente Aranda', 'ai_av_puentearanda_3', 'Puente_Aranda/generado/avatar_3.png',
    'a young adult, hoodie and cap, standing, facing forward, casual pose.'),
  icon('San Cristóbal', 'ai_av_sancristobal_1', 'SanCristobal/generado/avatar_1.png',
    'an adult man, plain collared shirt and dark trousers, standing, facing forward.'),
  icon('San Cristóbal', 'ai_av_sancristobal_3', 'SanCristobal/generado/avatar_3.png',
    'a teenage girl, backpack, casual streetwear, standing, facing forward.'),
  icon('San Cristóbal', 'ai_av_sancristobal_6', 'SanCristobal/generado/avatar_6.png',
    'an older man, poncho-style shawl, wool cap, standing, facing forward.'),
  icon('San Cristóbal', 'ai_av_sancristobal_9', 'SanCristobal/generado/avatar_9.png',
    'an adult woman, patterned sweater, carrying a small bag, standing, facing forward.'),
  icon('Suba', 'ai_av_suba_frente', 'Suba/generado/avatar_frente.png',
    'a young adult, modern streetwear with a graphic hoodie, standing, facing forward, casual confident pose.'),
  icon('Usme', 'ai_av_usme_1', 'Usme/generado/avatar_1.png',
    'an adult man, simple plaid shirt, rubber work boots, standing, facing forward, rural look.'),
  icon('Usme', 'ai_av_usme_3', 'Usme/generado/avatar_3.png',
    'an adult woman, simple long skirt and blouse, straw hat, standing, facing forward, rural look.'),
  icon('Usme', 'ai_av_usme_5', 'Usme/generado/avatar_5.png',
    'a young boy, simple humble clothing, rubber boots, standing, facing forward, rural look.'),

  // ---------- NPCs de espaldas (2) ----------
  icon('La Candelaria', 'ai_npc_candelaria', 'Candelaria/generado/npc_espalda.png',
    'a young adult pedestrian seen from behind (back view), dark casual jacket and jeans, standing still.'),
  icon('Suba', 'ai_npc_suba', 'Suba/generado/npc_espalda.png',
    'an adult pedestrian seen from behind (back view), red jacket and dark pants, standing still.'),

  // ---------- Props de Candelaria (8 + piso) ----------
  icon('La Candelaria', 'ai_candelaria_senal', 'Candelaria/generado/senal_alto.png',
    'a red octagonal Latin American "ALTO" (stop) traffic sign on a thin grey metal post.'),
  icon('La Candelaria', 'ai_candelaria_farola', 'Candelaria/generado/farola_pared.png',
    'a black wrought-iron wall-mounted street lamp with a small lantern-style light fixture.'),
  icon('La Candelaria', 'ai_candelaria_poste', 'Candelaria/generado/poste_luz.png',
    'a tall grey street lamp post with a small light fixture on top and a yellow-and-black hazard stripe near the base.'),
  icon('La Candelaria', 'ai_candelaria_maceta', 'Candelaria/generado/maceta.png',
    'a dark rectangular planter box with a green leafy shrub growing out of it.'),
  icon('La Candelaria', 'ai_candelaria_banco', 'Candelaria/generado/banco.png',
    'a wooden slat park bench with dark metal legs, side view.'),
  icon('La Candelaria', 'ai_candelaria_rejilla', 'Candelaria/generado/rejilla.png',
    'a small square grey metal drain grate, viewed from directly above, flat on the ground.'),
  icon('La Candelaria', 'ai_candelaria_moto', 'Candelaria/generado/moto.png',
    'a dark maroon classic-style motorcycle, side view, parked.'),
  icon('La Candelaria', 'ai_candelaria_carro', 'Candelaria/generado/carro.png',
    'a maroon red compact hatchback car, side view, parked.'),
  icon('La Candelaria', 'ai_candelaria_piso', 'Candelaria/generado/piso_acera.png',
    'a small square tile of grey stone sidewalk paving, seamless/tileable texture, viewed from directly above, flat, no shadow.'),

  // ---------- Props de Suba (9) ----------
  icon('Suba', 'ai_suba_arbol1', 'Suba/generado/arbol_1.png',
    'a rounded leafy green tree with a brown trunk, simple pixel-art style.'),
  icon('Suba', 'ai_suba_arbol2', 'Suba/generado/arbol_2.png',
    'a slightly taller narrower leafy green tree with a brown trunk, a different silhouette than a typical round tree.'),
  icon('Suba', 'ai_suba_arbusto1', 'Suba/generado/arbusto_1.png',
    'a small rounded green bush.'),
  icon('Suba', 'ai_suba_arbusto2', 'Suba/generado/arbusto_2.png',
    'a slightly wider, flatter green bush, a bit different from a simple round bush.'),
  icon('Suba', 'ai_suba_reja', 'Suba/generado/reja_negra.png',
    'a black metal fence railing segment, vertical bars, low height.'),
  icon('Suba', 'ai_suba_poste', 'Suba/generado/poste_luz.png',
    'a simple grey street lamp post with a small light fixture on top, flat front-facing style (not isometric).'),
  icon('Suba', 'ai_suba_seto', 'Suba/generado/seto.png',
    'a trimmed rectangular green hedge wall segment.'),
  icon('Suba', 'ai_suba_arbustoesferico', 'Suba/generado/arbusto_esferico.png',
    'a single dense round spherical green bush.'),
  icon('Suba', 'ai_suba_canecas', 'Suba/generado/canecas.png',
    'a grey plastic dumpster/trash container with a recycling symbol on the lid, front-facing.'),

  // ---------- Fondos de escena — localidades sin escenario caminable (8) ----------
  scene('San Cristóbal', 'ai_bg_sancristobal_calle', 'SanCristobal/generado/calle.png',
    `a steep hillside street in San Cristóbal, Bogotá, lined with modest
self-built brick houses stacked up the slope, narrow street, overcast light,
a sense of a working-class hillside neighborhood.`),
  scene('San Cristóbal', 'ai_bg_sancristobal_casa', 'SanCristobal/generado/casa.png',
    `a single modest self-built brick house facade on a hillside in San
Cristóbal, Bogotá — unpainted or partially painted brick, a simple door and
window, corrugated metal roof edge.`),
  scene('Ciudad Bolívar', 'ai_bg_ciudadbolivar_esquina', 'Ciudad_Bolivar/generado/esquina.png',
    `a street corner in Ciudad Bolívar, Bogotá, with a building wall covered
in a colorful mural / urban art painting, hillside self-built housing in the
background.`),
  scene('Ciudad Bolívar', 'ai_bg_ciudadbolivar_edificio', 'Ciudad_Bolivar/generado/edificio.png',
    `a hillside apartment/self-built building block in Ciudad Bolívar, Bogotá,
with a large mural painted across its facade, steep street in front.`),
  scene('Puente Aranda', 'ai_bg_puentearanda_carretera', 'Puente_Aranda/generado/carretera.png',
    `an industrial road in Puente Aranda, Bogotá, lined with warehouses and
factory buildings, some smokestacks, overcast industrial atmosphere, no
people close-up.`),
  scene('Puente Aranda', 'ai_bg_puentearanda_bodega', 'Puente_Aranda/generado/bodega.png',
    `a single industrial warehouse/factory building facade in Puente Aranda,
Bogotá — corrugated metal walls, a large loading door, pipes on the side.`),
  scene('Usme', 'ai_bg_usme_montanas', 'Usme/generado/montanas.png',
    `rolling green rural hills and mountains at the rural edge of Bogotá near
Usme, open fields, a dirt path, a small stream, transitioning from city to
countryside.`),
  scene('Usme', 'ai_bg_usme_casa', 'Usme/generado/casa.png',
    `a simple rural house facade near Usme, Bogotá — humble brick or adobe
walls, a corrugated metal roof, mountains and open fields in the background.`),
];

module.exports = { JOBS };
