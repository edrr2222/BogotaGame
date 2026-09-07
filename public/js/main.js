import { BootScene, MapScene, DialogueScene, StreetViewScene, EndingScene } from './scenes.js';
import { GameState } from './gameState.js';
import { initSetupOverlay } from './setupOverlay.js';

initSetupOverlay();

// La Maps JavaScript API (Street View real) se carga antes de arrancar
// Phaser, para que `google.maps` ya exista cuando StreetViewScene lo use.
// Si no hay key configurada (.env.local sin GOOGLE_MAPS_API_KEY), el juego
// arranca igual — StreetViewScene se lo hace saber al jugador en vez de
// fallar en silencio.
async function loadGoogleMaps() {
  const res = await fetch('/api/config');
  const { googleMapsApiKey } = await res.json();
  if (!googleMapsApiKey) return false;
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(googleMapsApiKey)}&v=weekly`;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return true;
}

loadGoogleMaps().catch(() => false).then((mapsReady) => {
  const config = {
    type: Phaser.AUTO,
    width: 720,
    height: 720,
    parent: 'stage',
    backgroundColor: '#0e1024',
    // Transparente a nivel de canvas: todas las escenas pintan su propio
    // fondo opaco con setBackgroundColor (se ven exactamente igual), MENOS
    // StreetViewScene, que deja el canvas sin pintar donde no hay UI propia
    // para que el <div> de Street View real se vea a través de él.
    transparent: true,
    scene: [BootScene, MapScene, DialogueScene, StreetViewScene, EndingScene],
  };

  const game = new Phaser.Game(config);
  game.gState = new GameState();
  game.mapsReady = mapsReady;
});
