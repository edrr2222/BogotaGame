# Ciudades Expandidas — Bogotá como cuerpo rizomático

Juego narrativo 2D sobre una entidad sin forma que recorre 8 localidades de
Bogotá. Cada localidad enseña un valor social distinto (tolerancia, memoria,
empatía, solidaridad...) a través de decisiones cotidianas, que van
deformando en silencio un polígono — la "entidad" — revelado al final del
recorrido. Cada partida jugada queda guardada en un JSON compartido en el
servidor.

Hecho con Phaser 3 + Express. Todo el arte de personajes/escenarios está
generado con la API de Gemini (Google), en un mismo estilo plano
consistente — ver `scripts/`.

## Correr en local

```bash
npm install
npm start
```

Abrir `http://localhost:3000`.

## Generar arte nuevo

El arte se genera una sola vez (no en tiempo de juego) con
`scripts/generate-art.js`, a partir de los encargos definidos en
`scripts/art-jobs.js`.

1. Crear una API key en [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
   (con facturación habilitada — la generación de imágenes no está disponible
   en el nivel gratuito).
2. Crear un archivo `.env.local` en la raíz con:
   ```
   GEMINI_API_KEY=tu-key-aqui
   ```
3. Correr:
   ```bash
   node scripts/generate-art.js                    # todo lo que falte
   node scripts/generate-art.js --only=una_key      # una sola pieza
   node scripts/generate-art.js --force             # regenerar aunque ya exista
   ```

Las piezas quedan en `assets/<Localidad>/generado/`, ya recortadas por
chroma-key cuando aplica, listas para usarse desde `public/js/gameConfig.js`.

## Estructura

- `public/` — el juego (Phaser 3, cargado como módulos ES nativos, sin build step).
- `server/` — Express: sirve `public/` y `assets/`, y expone `POST/GET /api/runs`
  para guardar y leer las partidas jugadas.
- `assets/` — arte generado con IA, organizado por localidad.
- `scripts/` — generación de arte (ver arriba).
- `GameTest.html` — prototipo original de un solo archivo, sin servidor (se
  conserva como referencia, no se usa en producción).

## Desplegar en Render

Como Web Service de Node:

- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Variable de entorno**: ninguna obligatoria para jugar (el juego ya trae
  todo el arte generado). Solo hace falta `GEMINI_API_KEY` si se va a correr
  `generate-art.js` para generar piezas nuevas — eso normalmente se hace en
  local, no en Render.

Ya incluye un `render.yaml`, así que también se puede crear desde el
dashboard de Render con "New > Blueprint" apuntando a este repo.

**Importante**: en el plan gratuito/estándar de Render el disco es efímero
— `server/data/runs.json` se reinicia vacío en cada redeploy o reinicio del
servicio. Para que las partidas guardadas sobrevivan entre despliegues hace
falta un disco persistente de Render (plan pago) o migrar el guardado a una
base de datos real; hoy el guardado en archivo plano solo persiste mientras
la instancia sigue viva.
