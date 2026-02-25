# Copilot Instructions

This is a 3D web game combining **First-Person Shooter**, **Tower Defense**, and **Quiz** genres.

## 1. Tech Stack

- **UI & State:** Vue 3 (Composition API, `<script setup>`), TypeScript, Pinia (`pinia-plugin-persistedstate`), Vue Router
- **3D Engine:** Three.js — used imperatively, no declarative wrappers
- **Physics:** `@dimforge/rapier3d-compat` — collisions, triggers, movement
- **Controls:** Three.js `PointerLockControls` for FPS view
- **Audio:** Howler.js via a custom `AudioService`
- **Build:** Vite

## 2. Architecture (Separation of Concerns)

The application strictly separates 3D logic from UI.

### Vue (UI layer)
- Renders only 2D DOM elements
- Components: `HerniHUD` (health, money, score, wave), `QuizModal`, `PauseModal`, `GameOverModal`, `GameWonModal`, `AudioControls`, `MobileControls`
- Views: `MenuView`, `EditorView`, `GameView` — lazy-loaded via Vue Router
- `GameView.vue` provides a single `<canvas>` element taken over by Three.js

### Three.js / Game layer (`src/game/`)
- `Game.ts` — main class: initialises `scene`, `renderer`, `camera`, and the `requestAnimationFrame` game loop
- Handles all 3D logic: player movement, shooting, Rapier physics, enemy AI, spawning, hit detection
- Has no knowledge of Vue components; communicates only through Pinia stores
- Uses **ECS (Entity Component System)**: components `TransformComponent`, `MeshComponent`, `RigidBodyComponent`, `HealthComponent`, `CombatComponent`
- Systems: `WaveSystem`, `TowerSystem`, `CombatSystem`, `ShootingSystem`, `SpriteHPBarSystem`

### Pinia (State / Bridge layer)
Acts as the **single source of truth (SSOT)** and communication bridge between the game and UI.

**Stores:**
- `useGameStore` — `money`, `score`, `highScore`, `playerHealth`, `enemiesKilled`, `currentWave`, `waveInProgress`, `waveCountdown`, `enemiesAlive`, `buildMode`, `selectedTowerType`, `difficulty`; persists `highScore` and `difficulty`
- `useQuestionStore` — array of `Question` objects with `id`, `text`, `choices`, `correctIndex`, `category`, `difficulty`, `masteryLevel`; fully persisted to `localStorage`

**Flow examples:**
- *UI → Game:* Player clicks "Buy tower" → Vue calls a store action → `Game.ts` reads store state and places the 3D tower in the scene
- *Game → UI:* `CombatSystem` kills an enemy → calls `gameStore.incrementScore()` → `HerniHUD` reactively reflects the new value

## 3. Game Mechanics

### Question Editor (`EditorView.vue`)
- Full CRUD for quiz questions stored in `useQuestionStore`, persisted to `localStorage`
- JSON import / export
- "Copy Prompt" button generates an LLM prompt for bulk question creation
- Question validation: non-empty text, at least 2 choices, all choices non-empty, exactly one valid `correctIndex`
- Questions support optional `category`, `difficulty` (`easy` / `medium` / `hard`), and a `masteryLevel` (0–100) tracker

### Quiz (Library interaction)
- A "Library" mesh sits at the centre of the map
- When the player enters its Rapier trigger zone, `Game.ts` calls `gameStore.showQuizModal = true` — **the game does NOT pause**
- Vue renders `QuizModal` over the running game; enemies keep attacking
- Pointer lock is released so the player can click answers; ESC closes the modal at any time
- Correct answers award money; an answer combo multiplier gives bonus money
- No time limit — tension comes from the ongoing game, not a countdown

### Tower Defense
- Players spend quiz-earned money to place towers on a grid around the library
- Five tower types: `basic`, `rapid`, `heavy`, `sniper`, `splash` (AoE) — each with distinct `cost`, `damage`, `fireRate`, `range`, and `color`
- Towers have HP bars (Sprite-based, see below) and can be destroyed by enemies
- Build mode shows a range-preview ring before placement

### Enemies & Waves (`WaveSystem`)
- Waves start automatically after a countdown (no manual trigger)
- A wave ends once all enemies for it have **spawned** (survivors carry over to the next wave)
- Spawn interval: 2 seconds, decreasing each wave
- Enemy HP and count scale with wave number
- Every 5th wave spawns a boss enemy
- Enemy AI always targets the **nearest entity** (player, tower, or library); targets are recalculated periodically

### FPS Combat (`ShootingSystem`)
- Player shoots with a single raycast-based weapon (muzzle flash via `PointLight`)
- Fire rate: 5 shots/second, 25 damage/shot
- Player has HP tracked in `gameStore.playerHealth`; reaching 0 triggers game over

### Library (Primary objective)
- The library has its own HP; if it reaches 0 the game is lost
- `GameOverModal` displays final stats (wave, score, kills, money) with **Restart** (full cleanup + reinitialisation, no page refresh) and **Main Menu** buttons
- `GameWonModal` is shown when a win condition is met

### HP Bars
Use **`THREE.Sprite` with `CanvasTexture`** — never `CSS3DRenderer`.
- Draw the bar onto an in-memory `<canvas>` using the Canvas 2D API
- Wrap it in a `THREE.SpriteMaterial` and attach it to a `THREE.Sprite`
- Sprites automatically face the camera and maintain a consistent screen size
- Managed by `SpriteHPBarSystem`; applied to enemies, towers, and the library

### Save System (`SaveSystem.ts`)
- Saves the full game state to `localStorage`: game store values, tower positions and HP, enemy positions and HP, player position
- Supports load on game start to resume a previous session

## 4. Mobile Support
- `MobileControls.vue` provides touch joystick and action buttons
- `Game.ts` reads `mobileInput` (`moveX`, `moveY`, `lookX`, `shoot`, `jump`) for platform-agnostic input handling

## 5. Audio (`AudioService`)
- Wraps Howler.js; plays SFX (`shoot`, `enemy_hit`, `player_hit`, `wave_start`, etc.) and background music
- Audio assets live in `public/audio/sfx/` and `public/audio/music/`
- `AudioControls.vue` exposes volume and mute controls to the player

## 6. Coding Standards
- Write clean, well-documented, type-safe TypeScript throughout
- Follow SOLID principles and keep the ECS / store / UI layers strictly separated
- All game logic stays in `src/game/`; all reactive state stays in `src/stores/`; all UI stays in `src/components/` and `src/views/`