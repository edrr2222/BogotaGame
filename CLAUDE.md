# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-file, static Phaser 3 narrative game (`GameTest.html`) called "Ciudades Expandidas — Bogotá". The player walks through 8 Bogotá localities in random order, day/night is randomized per visit, and each locality's choices shift one of 8 personality stats. The stats deform a polygon that represents an unnamed "entity" — the game never shows numbers to the player, only the shape.

## Running it

There is no build system, package manager, or server code — the whole game is `GameTest.html`, which loads Phaser 3 from `cdnjs` via a `<script>` tag. To run it, open the file directly in a browser or serve the directory with any static file server. There is no test suite or linter in this repo.

## Architecture

Everything lives in one `<script>` block in `GameTest.html`, in this order:

1. **`STORY_NODES`** — a big embedded JSON array that *is* the entire story graph (comment at the top says it was generated from a `.twee` file via `parse_twee.py`, but that source file/script is not present in this repo — treat `STORY_NODES` as the source of truth, not the twee). Each node has an `id`, optional `location`, `choices[]` (each with `text` + `target` id), and a `text` field that is either a plain string or `{day, night}` variants. Optional fields drive extra behavior:
   - `effects` — stat deltas to apply when leaving the node, either a flat `{stat: n}` map or `{day: {...}, night: {...}}`.
   - `mood_reaction` — a condition string like `"$tolerancia > 0"` plus `text_true`/`text_false`, evaluated against current stats and appended to the body text.
   - `reveal` — thresholds (`high_threshold`/`low_threshold`) on a named stat that pick which closing text to append at a locality's `: Cierre` node.
   - `memory_echo` — same condition-string pattern, references a stat from a *different* locality to create the illusion of cross-locality memory.
   - `type: "system"` / `"hub"` / `"ending"` — controls scene-transition behavior (see `DialogueScene.advanceSystem`); `"system"` nodes have no choices and auto-advance.
   - `logic` — only used by the `"Siguiente Localidad"` system node; not interpreted generically, it's descriptive/dead metadata mirrored from the twee source (the actual "pick next locality" logic lives in `MapScene.visitLocation`, not here).

2. **Design tokens** — `PALETTE`, `FONT_DISPLAY`/`FONT_BODY`/`FONT_MONO`, `STAT_ORDER` (the canonical order of the 8 stats), `LOCATIONS`, `STAT_BY_LOCATION` (each locality maps to exactly one stat), and `TRAITS` (pos/neg adjective shown per stat in the final reveal).

3. **`GameState`** (plain class, not a Phaser system) — mirrors the `$`-variables from the original twee: `stats` (8 stats, start at 0), `visitadas` (visited locality names, in visit order), `pool` (shuffled remaining localities), `momento` (`'Día'`/`'Noche'` for the current visit), `currentNodeId`. `applyEffects` sums deltas into `stats`. One instance lives at `game.gState` for the whole game session (created in `BootScene`, reset from `EndingScene`'s replay button).

4. **`entityPolygonPoints(stats, baseRadius, cx, cy)`** — the signature visual mechanic: one vertex per stat in `STAT_ORDER`, radius perturbed by that stat's value. Used identically by `MapScene` (small, live) and `EndingScene` (large, final).

5. **Scenes**, in the order Phaser boots them:
   - `BootScene` — title screen, creates `game.gState`.
   - `MapScene` — hub. Draws the entity polygon at center and one node per locality in a ring around it (`STAT_BY_LOCATION` color-codes visited nodes by whether that stat is currently positive/negative/neutral). Only localities still in `state.pool` are clickable; clicking rolls `momento` randomly, marks the locality visited, and jumps to `DialogueScene` at `"<Locality>: Entrada"`.
   - `DialogueScene` — renders one story node at a time (`renderNode`), resolves day/night text via `resolveText`, evaluates `mood_reaction`/`reveal`/`memory_echo` condition strings via small regexes (`evalMood`, `evalEcho` — these only understand the `$stat OP number` twee-condition shape, nothing more general), and on choice click applies `effects` before navigating to `choice.target`. If the target node is `type: "hub"`, it switches back to `MapScene`; otherwise it re-renders in place. Nodes with zero choices (`type: "system"`) auto-advance via `advanceSystem` after a short delay.
   - `EndingScene` — final reveal: bigger entity polygon, derives the trait list from `TRAITS` + final stat signs, and a total-based verdict (`total() >= 4` amable / `<= -4` áspero / else mixto). Its "Volver a empezar" button calls `gState.reset()` and returns to `MapScene`.

## Content editing

To change story text/choices/effects, edit the `STORY_NODES` array directly — it's hand-formatted JSON embedded in the JS, not loaded from a separate file. Node ids follow the pattern `"<Locality>: <Beat>"` (e.g. `"Chapinero: Colaborar"`), except for the global nodes `Inicio`, `Selector`, `Siguiente Localidad`, and `Revelación final`. Keep `STAT_BY_LOCATION`, `LOCATIONS`, and the `location` field on each node's entrance/cierre nodes consistent if adding/renaming a locality.

## Assets

`assets/` holds ~213 isometric PNGs organized by locality (`Candelaria`, `Ciudad_Bolivar`, `Kennedy`, `Puente_Aranda`, `SanCristobal`, `Suba`, `Usme` — note there is no `Chapinero` folder, and folder names don't all match the locality names used in `STORY_NODES`/`LOCATIONS` exactly, e.g. `Candelaria` vs `"La Candelaria"`, `SanCristobal` vs `"San Cristóbal"`). **None of these images are currently referenced or loaded anywhere in `GameTest.html`** — the game today is entirely procedural/vector (Phaser graphics + text), so don't assume the art is wired in; integrating it would require adding a Phaser preload step and texture keys per locality.
