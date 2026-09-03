// Encargos de generación de arte con IA — reemplazo completo de assets/
// original por piezas generadas con Gemini, todas en un mismo estilo plano
// consistente (sin mezclar isométrico/3D con 2D plano como pasaba antes).
//
// Dos tipos de encargo:
//  - 'icon'  -> sprite suelto (personaje/prop): fondo magenta sólido de
//               referencia que generate-art.js recorta por chroma-key.
//  - 'scene' -> fondo panorámico de una pantalla de localidad (una fila
//               CONTINUA de fachadas, usado a pantalla casi completa por
//               WalkScene): se guarda tal cual, sin recortar nada.
//
// ---------------------------------------------------------------------
// REGLAS DE COHERENCIA VISUAL — válidas para CUALQUIER localidad nueva
// (Chapinero, Kennedy, o las que se agreguen después). No son solo para
// las 6 de hoy: WalkScene ya aplica el mismo layout a cualquier localidad
// con `screens` en WALKABLE_SCENES, así que lo único que hay que cuidar al
// agregar una nueva es seguir esto mismo:
//
// 1. El streetscape ('scene') SIEMPRE debe traer el piso/calle PINTADO
//    como parte de la misma ilustración continua (edificios + acera en
//    una sola imagen) — nunca solo la fachada cortada arriba con nada
//    abajo. WalkScene lo dibuja a 600px de alto; lo que quede por debajo
//    de la imagen es un color liso (sin textura aparte), así que la
//    "calle" real tiene que estar DENTRO de la imagen, no depender de una
//    textura de piso separada.
// 2. Los props sueltos ('icon') que se posicionan ENCIMA del streetscape
//    (ver WALKABLE_SCENES en gameConfig.js) deben poder pararse sobre
//    CUALQUIER piso liso sin necesitar su propia superficie pintada —
//    árboles, bancas, postes, señales, vallas, macetas, canecas,
//    vehículos. NO agregar cosas que solo tienen sentido con una
//    superficie propia (una cancha, una piscina, un tapete) salvo que esa
//    superficie esté pintada DENTRO del streetscape mismo, no como un
//    ícono aparte flotando sobre el piso liso.
// 3. Ubicación en pantalla (ver gameConfig.js): props "de fondo" (contra
//    la fachada, ej. un letrero o una reja de ventana) van en y≈590-600;
//    props "de piso" (banca, poste, vehículo, seña de tránsito) van en
//    y≈620-650; el NPC y la parada de bus van en y≈645. Esto no es
//    arbitrario — es donde queda la base de los edificios con el
//    streetscape dibujado a 600px de alto.
// ---------------------------------------------------------------------

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
no signature, no UI, no border, no captions baked into the image. The
illustration MUST include a properly painted street/sidewalk ground running
along the entire bottom edge, as part of the same continuous scene as the
buildings above it — not just a thin line, a real foreground street band
with visible texture (paving, cracks, a curb) that a character could
convincingly stand on. This is a complete street scene from rooftop to
ground, not a building facade cutout with nothing underneath.`;

function icon(locality, key, outFile, subject) {
  return { type: 'icon', locality, key, outFile, prompt: `${ICON_STYLE}\n\nSubject: ${subject}` };
}
function scene(locality, key, outFile, subject, aspectRatio) {
  return { type: 'scene', locality, key, outFile, aspectRatio, prompt: `${SCENE_STYLE}\n\nSubject: ${subject}` };
}

// Vistas direccionales de un avatar ya existente: manda la imagen de frente
// como referencia para que Gemini dibuje AL MISMO personaje (mismo peinado,
// ropa y colores) visto desde otro ángulo, en vez de generar a alguien
// distinto cada vez.
const DIRECTION_PROMPTS = {
  back: `Using the exact same character shown in the reference image — same
hairstyle, same clothing colors and style, same body proportions — redraw
them in the identical flat 2D pixel-art style, but seen from directly BEHIND
(back view), as if they had turned around to face away from the camera.
Standing pose, arms at sides.`,
  left: `Using the exact same character shown in the reference image — same
hairstyle, same clothing colors and style, same body proportions — redraw
them in the identical flat 2D pixel-art style, but in profile seen from the
LEFT side, facing left, as if walking to the left.`,
  right: `Using the exact same character shown in the reference image — same
hairstyle, same clothing colors and style, same body proportions — redraw
them in the identical flat 2D pixel-art style, but in profile seen from the
RIGHT side, facing right, as if walking to the right.`,
};

function avatarDir(locality, key, outFile, refImage, direction) {
  return {
    type: 'icon', locality, key, outFile, refImage,
    prompt: `${ICON_STYLE}\n\n${DIRECTION_PROMPTS[direction]}`,
  };
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

  // ---------- Más elementos de calle para llenar los escenarios ----------
  icon('La Candelaria', 'ai_candelaria_calle', 'Candelaria/generado/calle.png',
    `a short straight cobblestone street segment from La Candelaria, Bogotá,
viewed from a flat front-on angle (like a floor tile, not a road receding
into the distance) — grey cobblestones with a worn stone-paved look, a
narrow strip of curb along one edge.`),
  icon('La Candelaria', 'ai_candelaria_tienda', 'Candelaria/generado/tienda.png',
    `a small bohemian corner shop/café front typical of La Candelaria, Bogotá
— colorful painted wooden facade, a simple awning, a display window with a
few generic goods (books, crafts, coffee cups) visible but no readable text
or signage.`),
  icon('La Candelaria', 'ai_candelaria_casa2', 'Candelaria/generado/casa2.png',
    `a second, smaller colonial house facade segment from La Candelaria,
Bogotá, different from a grander building — a single wooden door, one small
window with a flower box, whitewashed or pastel-colored wall, terracotta
roof edge. Meant to sit beside another colonial building for variety.`),

  icon('Suba', 'ai_suba_calle', 'Suba/generado/calle.png',
    `a short straight paved asphalt street segment from Suba, Bogotá, viewed
from a flat front-on angle (like a floor tile, not a road receding into the
distance) — dark grey asphalt with a single dashed white lane line down the
middle, a bit of curb along one edge.`),
  icon('Suba', 'ai_suba_tienda', 'Suba/generado/tienda.png',
    `a small modern neighborhood convenience store/tienda front typical of
Suba, Bogotá — metal roll-down security shutter partly visible, a simple
awning, a fridge/cooler visible through the window, no readable text or
signage.`),
  icon('Suba', 'ai_suba_cancha', 'Suba/generado/cancha.png',
    `a fragment of an outdoor multi-sport court (cancha) common in Bogotá
residential neighborhoods like Suba — a section of painted concrete court
floor with faded court lines, a metal basketball hoop/backboard on a pole at
one edge, chain-link fence section behind it.`),

  // ---------- Variantes de acera para el carril caminable ----------
  // Candelaria ya tenía ai_candelaria_piso (piso_acera.png) — se suman 2 más
  // para que el camino no se vea como una sola baldosa repetida sin fin.
  icon('La Candelaria', 'ai_candelaria_piso2', 'Candelaria/generado/piso_acera_2.png',
    `a small square tile of grey stone sidewalk paving from La Candelaria,
Bogotá, seamless/tileable texture, viewed from directly above, flat, no
shadow — same style and scale as a plain cobblestone sidewalk tile, but with
a couple of small tufts of grass or weeds growing between the stones.`),
  icon('La Candelaria', 'ai_candelaria_piso3', 'Candelaria/generado/piso_acera_3.png',
    `a small square tile of grey stone sidewalk paving from La Candelaria,
Bogotá, seamless/tileable texture, viewed from directly above, flat, no
shadow — same style and scale as a plain cobblestone sidewalk tile, but with
a small round metal manhole/drain cover embedded in it.`),

  // Suba no tenía piso propio (usaba una franja de color liso) — 3 variantes
  // de acera de concreto moderna para el carril caminable.
  icon('Suba', 'ai_suba_piso1', 'Suba/generado/piso_1.png',
    `a small square tile of plain grey modern concrete sidewalk paving from
Suba, Bogotá, seamless/tileable texture, viewed from directly above, flat,
no shadow — smooth concrete slab with a thin expansion-joint line.`),
  icon('Suba', 'ai_suba_piso2', 'Suba/generado/piso_2.png',
    `a small square tile of plain grey modern concrete sidewalk paving from
Suba, Bogotá, seamless/tileable texture, viewed from directly above, flat,
no shadow — same style as a plain concrete slab, but with a thin visible
crack running across it.`),
  icon('Suba', 'ai_suba_piso3', 'Suba/generado/piso_3.png',
    `a small square tile of plain grey modern concrete sidewalk paving from
Suba, Bogotá, seamless/tileable texture, viewed from directly above, flat,
no shadow — same style as a plain concrete slab, but with a little moss or
grass growing in one seam.`),

  // ---------- Fondos panorámicos continuos para los escenarios caminables ----------
  // Reemplazan/complementan los edificios sueltos con huecos entre ellos: una
  // sola imagen ancha con una fila CONTINUA de fachadas pegadas unas a otras
  // (como en una calle real), montañas detrás de los techos, para que el
  // fondo se vea lleno en vez de vacío.
  scene('La Candelaria', 'ai_candelaria_streetscape', 'Candelaria/generado/streetscape.png',
    `a continuous row of colonial building facades from La Candelaria, Bogotá,
filling the frame edge to edge with NO gaps between buildings — each facade
a different color (whitewashed, ochre yellow, terracotta orange, pale blue),
dark wood doors and window shutters, wrought-iron balconies, terracotta
tile roofs at slightly different heights, a narrow cobblestone street
running along the bottom foreground. Green forested mountains visible above
and behind the rooftops, soft daytime sky. Front elevation view of the
street wall, like a game background strip — flat pixel-art style, not
photorealistic.`, '16:9'),
  scene('Suba', 'ai_suba_streetscape', 'Suba/generado/streetscape.png',
    `a continuous row of modern apartment building facades from Suba, Bogotá,
filling the frame edge to edge with NO gaps between buildings — each
building a slightly different height and color (beige, terracotta brick,
muted red, grey), rows of small windows and balconies, flat rooftops, a
paved street with a faint lane line running along the bottom foreground.
Green mountains visible above and behind the rooftops, soft daytime sky.
Front elevation view of the street wall, like a game background strip —
flat pixel-art style, not photorealistic.`, '16:9'),

  // ---------- Cada localidad caminable ahora son 3 pantallas conectadas
  // por los bordes, terminando en una parada de bus/Transmilenio que manda
  // a otra localidad al azar. Candelaria y Suba ya tenían pantalla 0
  // (streetscape.png) — se agregan las pantallas 1 y 2. San Cristóbal,
  // Ciudad Bolívar, Puente Aranda y Usme se arman completas desde cero.

  // parada compartida por las 6 localidades (infraestructura genérica, no
  // hace falta una versión distinta por zona)
  icon('La Candelaria', 'ai_busstop', 'Compartido/generado/parada_bus.png',
    `a Transmilenio-style BRT bus stop/station shelter from Bogotá — red and
white color scheme, glass panel walls, a covered waiting area, a simple bus
stop sign on top. Side/front view, standalone structure.`),

  // --- La Candelaria: pantallas 1 y 2 ---
  scene('La Candelaria', 'ai_candelaria_streetscape2', 'Candelaria/generado/streetscape_2.png',
    `a continuous row of colonial building facades from La Candelaria,
Bogotá — a DIFFERENT stretch of the same colonial street as a continuation
(not a repeat): different colors (deep red, ochre, white, green trim), one
building has a small tree or potted plants on a balcony, dark wood doors and
shutters, terracotta tile roofs, narrow cobblestone street along the bottom.
Green forested mountains visible above the rooftops, soft daytime sky. Front
elevation street-wall view, flat pixel-art style, not photorealistic.`, '16:9'),
  scene('La Candelaria', 'ai_candelaria_streetscape3', 'Candelaria/generado/streetscape_3.png',
    `a continuous row of colonial building facades from La Candelaria,
Bogotá — the end of the block, where the street opens slightly into a small
plaza-like widening near a bus stop: colorful facades (blue, yellow,
white), one corner building with a rounded corner typical of colonial
Bogotá, terracotta roofs, cobblestone street. Green mountains visible above
the rooftops, soft daytime sky. Front elevation street-wall view, flat
pixel-art style, not photorealistic.`, '16:9'),

  // --- Suba: pantallas 1 y 2 ---
  scene('Suba', 'ai_suba_streetscape2', 'Suba/generado/streetscape_2.png',
    `a continuous row of modern apartment building facades from Suba,
Bogotá — a DIFFERENT stretch of the same street as a continuation (not a
repeat): different heights and colors (grey, beige, dark red), one building
has visible rooftop water tanks, rows of small windows and balconies, flat
rooftops, paved street with a faint lane line along the bottom. Green
mountains visible above the rooftops, soft daytime sky. Front elevation
street-wall view, flat pixel-art style, not photorealistic.`, '16:9'),
  scene('Suba', 'ai_suba_streetscape3', 'Suba/generado/streetscape_3.png',
    `a continuous row of modern apartment building facades from Suba,
Bogotá — the end of the block near a bus stop, buildings slightly lower
here with a small commercial ground floor (shopfronts) under the
apartments, muted colors (beige, terracotta, grey), paved street along the
bottom. Green mountains visible above the rooftops, soft daytime sky. Front
elevation street-wall view, flat pixel-art style, not photorealistic.`, '16:9'),

  // --- San Cristóbal: NPC + 3 pantallas + prop propio ---
  icon('San Cristóbal', 'ai_npc_sancristobal', 'SanCristobal/generado/npc_espalda.png',
    'a teenage girl pedestrian seen from behind (back view), simple casual clothes, standing still, on a hillside street.'),
  icon('San Cristóbal', 'ai_sancristobal_escalera', 'SanCristobal/generado/escalera.png',
    `a steep flight of narrow concrete stairs built into a hillside street in
San Cristóbal, Bogotá, with a simple metal handrail — a common way to
connect street levels on a steep slope.`),
  scene('San Cristóbal', 'ai_sancristobal_streetscape1', 'SanCristobal/generado/streetscape_1.png',
    `a continuous row of modest self-built brick houses on a steep hillside
street in San Cristóbal, Bogotá, filling the frame edge to edge with NO
gaps — unpainted or partially painted brick facades, simple doors and
windows, corrugated metal roof edges at uneven heights (informal
self-built look), narrow paved street sloping uphill in the foreground.
Green mountains close behind the rooftops (this neighborhood IS on the
mountainside), overcast daytime sky. Front elevation street-wall view, flat
pixel-art style, not photorealistic.`, '16:9'),
  scene('San Cristóbal', 'ai_sancristobal_streetscape2', 'SanCristobal/generado/streetscape_2.png',
    `a continuous row of modest self-built brick houses on a steep hillside
street in San Cristóbal, Bogotá — a different stretch continuing uphill,
some houses with exposed unfinished brick, laundry hanging from a window,
a small retaining wall, corrugated metal roofs. Green mountains close
behind the rooftops, overcast daytime sky. Front elevation street-wall
view, flat pixel-art style, not photorealistic.`, '16:9'),
  scene('San Cristóbal', 'ai_sancristobal_streetscape3', 'SanCristobal/generado/streetscape_3.png',
    `a continuous row of modest self-built brick houses on a steep hillside
street in San Cristóbal, Bogotá, near a small landing/bus stop area where
the slope levels off briefly — brick and painted concrete facades, a small
neighborhood shop with a metal shutter, corrugated roofs. Green mountains
close behind the rooftops, overcast daytime sky. Front elevation
street-wall view, flat pixel-art style, not photorealistic.`, '16:9'),

  // --- Ciudad Bolívar: NPC + 3 pantallas + prop propio ---
  icon('Ciudad Bolívar', 'ai_npc_ciudadbolivar', 'Ciudad_Bolivar/generado/npc_espalda.png',
    'a young adult pedestrian seen from behind (back view), casual streetwear with a small backpack, standing still.'),
  icon('Ciudad Bolívar', 'ai_ciudadbolivar_mural', 'Ciudad_Bolivar/generado/mural.png',
    `a section of a colorful urban art mural painted on a plain wall in
Ciudad Bolívar, Bogotá — abstract geometric shapes and faces in bright
colors (orange, teal, purple, yellow), typical of Bogotá street-art
collectives.`),
  scene('Ciudad Bolívar', 'ai_ciudadbolivar_streetscape1', 'Ciudad_Bolivar/generado/streetscape_1.png',
    `a continuous row of self-built hillside apartment/house blocks in
Ciudad Bolívar, Bogotá, filling the frame edge to edge with NO gaps —
stacked informal construction (unfinished brick and painted concrete mixed
together), one long wall covered in a colorful urban art mural, narrow
paved street in the foreground. Green mountains close behind the rooftops,
soft daytime sky. Front elevation street-wall view, flat pixel-art style,
not photorealistic.`, '16:9'),
  scene('Ciudad Bolívar', 'ai_ciudadbolivar_streetscape2', 'Ciudad_Bolivar/generado/streetscape_2.png',
    `a continuous row of self-built hillside apartment/house blocks in
Ciudad Bolívar, Bogotá — a different stretch continuing along the slope,
mixed brick and painted concrete facades in muted colors, a small mural
fragment on one wall, rooftop water tanks. Green mountains close behind
the rooftops, soft daytime sky. Front elevation street-wall view, flat
pixel-art style, not photorealistic.`, '16:9'),
  scene('Ciudad Bolívar', 'ai_ciudadbolivar_streetscape3', 'Ciudad_Bolivar/generado/streetscape_3.png',
    `a continuous row of self-built hillside apartment/house blocks in
Ciudad Bolívar, Bogotá, near a small viewpoint/bus stop area with a wide
view over the city below — informal construction facades, a bright mural
on a corner building, narrow paved street. Green mountains close behind
the rooftops, soft daytime sky. Front elevation street-wall view, flat
pixel-art style, not photorealistic.`, '16:9'),

  // --- Puente Aranda: NPC + 3 pantallas + prop propio ---
  icon('Puente Aranda', 'ai_npc_puentearanda', 'Puente_Aranda/generado/npc_espalda.png',
    'an adult worker pedestrian seen from behind (back view), grey work jacket, standing still.'),
  icon('Puente Aranda', 'ai_puentearanda_tambores', 'Puente_Aranda/generado/tambores.png',
    'a small stack of industrial metal storage barrels/drums next to a couple of stacked wooden pallets, typical of a warehouse yard.'),
  scene('Puente Aranda', 'ai_puentearanda_streetscape1', 'Puente_Aranda/generado/streetscape_1.png',
    `a continuous row of industrial warehouse and factory facades from
Puente Aranda, Bogotá, filling the frame edge to edge with NO gaps —
corrugated metal walls in muted colors (grey, faded blue, rust), large
loading doors, a couple of thin smokestacks in the background, a straight
paved industrial road in the foreground. Overcast grey sky, no mountains
needed (flat industrial zone). Front elevation street-wall view, flat
pixel-art style, not photorealistic.`, '16:9'),
  scene('Puente Aranda', 'ai_puentearanda_streetscape2', 'Puente_Aranda/generado/streetscape_2.png',
    `a continuous row of industrial warehouse and factory facades from
Puente Aranda, Bogotá — a different stretch continuing down the road, one
warehouse with visible pipes running along the outside wall, a loading dock
with a parked truck silhouette, paved road in the foreground. Overcast grey
sky. Front elevation street-wall view, flat pixel-art style, not
photorealistic.`, '16:9'),
  scene('Puente Aranda', 'ai_puentearanda_streetscape3', 'Puente_Aranda/generado/streetscape_3.png',
    `a continuous row of industrial warehouse facades from Puente Aranda,
Bogotá, near a bus stop at a road junction — muted-color metal warehouse
walls, a small guard booth/gate structure, paved road with a faded lane
line. Overcast grey sky. Front elevation street-wall view, flat pixel-art
style, not photorealistic.`, '16:9'),

  // --- Usme: NPC + 3 pantallas + prop propio + piso rural nuevo ---
  icon('Usme', 'ai_npc_usme', 'Usme/generado/npc_espalda.png',
    'an adult pedestrian seen from behind (back view), simple rural clothing, standing still.'),
  icon('Usme', 'ai_usme_cerca', 'Usme/generado/cerca.png',
    'a simple wooden fence segment with a small wooden gate, rural style, typical of the rural edge of Bogotá.'),
  scene('Usme', 'ai_usme_streetscape1', 'Usme/generado/streetscape_1.png',
    `a row of a few simple rural houses at the edge of Bogotá near Usme,
spaced apart (not a dense city wall like downtown) with open green fields
and rolling hills visible between and behind them — humble brick/adobe
walls, corrugated metal roofs, a dirt road in the foreground. Green
mountains in the far background, soft daytime sky, a sense of the city
dissolving into countryside. Front elevation view, flat pixel-art style,
not photorealistic.`, '16:9'),
  scene('Usme', 'ai_usme_streetscape2', 'Usme/generado/streetscape_2.png',
    `open green rural fields and rolling hills at the edge of Bogotá near
Usme, a dirt path running along the foreground, a small wooden fence, one
or two distant humble houses, a small stream crossing the field. Green
mountains in the background, soft daytime sky. Front elevation view, flat
pixel-art style, not photorealistic.`, '16:9'),
  scene('Usme', 'ai_usme_streetscape3', 'Usme/generado/streetscape_3.png',
    `a small rural crossroads at the edge of Bogotá near Usme where a dirt
road meets a paved road (transition point back toward the city), a couple
of humble houses, open fields and hills around, mountains in the
background, soft daytime sky. Front elevation view, flat pixel-art style,
not photorealistic.`, '16:9'),
  icon('Usme', 'ai_usme_piso1', 'Usme/generado/piso_1.png',
    `a small square tile of a rural dirt/gravel path from Usme, Bogotá,
seamless/tileable texture, viewed from directly above, flat, no shadow —
packed brown dirt with small stones and a few sparse grass tufts.`),
  icon('Usme', 'ai_usme_piso2', 'Usme/generado/piso_2.png',
    `a small square tile of a rural dirt/gravel path from Usme, Bogotá,
seamless/tileable texture, viewed from directly above, flat, no shadow —
same style as a plain dirt path tile, but with a bit more visible grass
growing through it.`),
  icon('Usme', 'ai_usme_piso3', 'Usme/generado/piso_3.png',
    `a small square tile of a rural dirt/gravel path from Usme, Bogotá,
seamless/tileable texture, viewed from directly above, flat, no shadow —
same style as a plain dirt path tile, but with a small puddle or wet patch.`),
];

const AVATAR_DEFS = [
  { id: 'candelaria_frente', locality: 'La Candelaria', base: 'Candelaria/generado/avatar_joven' },
  { id: 'ciudadbolivar_nina', locality: 'Ciudad Bolívar', base: 'Ciudad_Bolivar/generado/avatar_nina' },
  { id: 'ciudadbolivar_senora', locality: 'Ciudad Bolívar', base: 'Ciudad_Bolivar/generado/avatar_senora' },
  { id: 'puentearanda_1', locality: 'Puente Aranda', base: 'Puente_Aranda/generado/avatar_1' },
  { id: 'puentearanda_2', locality: 'Puente Aranda', base: 'Puente_Aranda/generado/avatar_2' },
  { id: 'puentearanda_3', locality: 'Puente Aranda', base: 'Puente_Aranda/generado/avatar_3' },
  { id: 'sancristobal_1', locality: 'San Cristóbal', base: 'SanCristobal/generado/avatar_1' },
  { id: 'sancristobal_3', locality: 'San Cristóbal', base: 'SanCristobal/generado/avatar_3' },
  { id: 'sancristobal_6', locality: 'San Cristóbal', base: 'SanCristobal/generado/avatar_6' },
  { id: 'sancristobal_9', locality: 'San Cristóbal', base: 'SanCristobal/generado/avatar_9' },
  { id: 'suba_frente', locality: 'Suba', base: 'Suba/generado/avatar_frente' },
  { id: 'usme_1', locality: 'Usme', base: 'Usme/generado/avatar_1' },
  { id: 'usme_3', locality: 'Usme', base: 'Usme/generado/avatar_3' },
  { id: 'usme_5', locality: 'Usme', base: 'Usme/generado/avatar_5' },
];

AVATAR_DEFS.forEach(a => {
  const frontFile = `${a.base}.png`;
  ['back', 'left', 'right'].forEach(dir => {
    JOBS.push(avatarDir(a.locality, `ai_av_${a.id}_${dir}`, `${a.base}_${dir}.png`, frontFile, dir));
  });
});

module.exports = { JOBS, AVATAR_DEFS };
