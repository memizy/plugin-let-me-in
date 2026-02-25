<div align="center">

# 🏰 Let Me In
**3D Tower Defense Minigame for Memizy**  
**🏰 Tower Defense × 📚 Quiz × 🎯 FPS**

![Version](https://img.shields.io/badge/Plugin-v0.1.0-blue?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/Three.js-Rapier3D-black?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-success?style=for-the-badge)

<br>

Defend the library from the zombie horde! An interactive, gamified study plugin for the [Memizy Ecosystem](https://github.com/memizy/memizy).

</div>

---

## 🎮 About the Game

**Let Me In** transforms boring study sessions into an action-packed 3D Tower Defense game. 

Instead of just flipping flashcards, you earn in-game currency by correctly answering questions from your OQSE study set. Use the money to build barricades and defense towers to protect the library from incoming waves of zombies.

### Features:
* 🧊 **Full 3D Environment:** Powered by `three.js`.
* 💥 **Physics Engine:** Realistic collisions using `@dimforge/rapier3d`.
* 🔊 **Spatial Audio:** Immersive sound effects via `howler.js`.
* 🧠 **OQSE Integration:** Seamlessly loads `mcq-single` and `flashcard` item types from the Memizy host application.

---

## 🧩 OQSE Plugin Architecture

This project is built as an independent micro-frontend plugin for the Memizy platform. It uses the **Base URL + Manifest** architecture.

### Deployment Structure
When built, this plugin generates a standard web distribution folder (`dist/`) containing:
1. `index.html` - The main entry point loaded into the Memizy iframe.
2. `oqse-manifest.json` - The capability manifest telling Memizy what this plugin can do.
3. `/models` & `/audio` - Raw assets loaded dynamically (no Base64 embedding).

This allows the game to be hosted cheaply and efficiently on **GitHub Pages**.

---

## 🛠️ Development Setup

If you want to contribute, tweak the game, or run it locally:

```bash
# 1. Install dependencies
npm install

# 2. Run the development server
npm run dev
