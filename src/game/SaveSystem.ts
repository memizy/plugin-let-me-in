/**
 * SaveSystem - Handles game state persistence
 * Saves entire game state including entities, towers, enemies, health, positions
 */

import type { useGameStore } from '../stores/game'
import type { useQuestionStore } from '../stores/question'

export interface SavedGameState {
  version: string
  timestamp: number
  
  // Game Store State
  gameStore: {
    money: number
    score: number
    highScore: number
    playerHealth: number
    playerMaxHealth: number
    enemiesKilled: number
    currentWave: number
    waveInProgress: boolean
    waveCountdown: number
    enemiesSpawnedThisWave: number
    enemiesAlive: number  // Zjednodušený systém - jeden počet živých nepřátel
    totalWaves: number
    difficulty?: string
  }
  
  // Question Progress (mastery levels are already persisted in questionStore)
  questionProgress: {
    averageMastery: number
  }
  
  // Towers (positions, types, HP)
  towers: Array<{
    type: string
    gridX: number
    gridZ: number
    health: number
    maxHealth: number
  }>
  
  // Enemies (positions, HP, wave number)
  enemies: Array<{
    posX: number
    posY: number
    posZ: number
    health: number
    maxHealth: number
    waveNumber: number
  }>
  
  // Player position
  player: {
    posX: number
    posY: number
    posZ: number
  }
  
  // Library health
  library: {
    health: number
    maxHealth: number
  }
}

const SAVE_KEY = 'td-quiz-game-save'
const SAVE_VERSION = '1.0.0'

export class SaveSystem {
  /**
   * Check if a saved game exists
   */
  static hasSavedGame(): boolean {
    try {
      const saved = localStorage.getItem(SAVE_KEY)
      return saved !== null
    } catch (e) {
      console.error('Error checking saved game:', e)
      return false
    }
  }
  
  /**
   * Save current game state
   * This is complex because we need to serialize the entire ECS state
   */
  static saveGame(
    game: any, // Game instance
    gameStore: ReturnType<typeof useGameStore>,
    questionStore: ReturnType<typeof useQuestionStore>
  ): boolean {
    try {
      const saveData: SavedGameState = {
        version: SAVE_VERSION,
        timestamp: Date.now(),
        
        gameStore: {
          money: gameStore.money,
          score: gameStore.score,
          highScore: gameStore.highScore,
          playerHealth: gameStore.playerHealth,
          playerMaxHealth: gameStore.playerMaxHealth,
          enemiesKilled: gameStore.enemiesKilled,
          currentWave: gameStore.currentWave,
          waveInProgress: gameStore.waveInProgress,
          waveCountdown: gameStore.waveCountdown,
          enemiesSpawnedThisWave: gameStore.enemiesSpawnedThisWave,
          enemiesAlive: gameStore.enemiesAlive,
          totalWaves: gameStore.totalWaves
        },
        
        questionProgress: {
          averageMastery: questionStore.averageMastery
        },
        
        towers: [],
        enemies: [],
        player: { posX: 0, posY: 0, posZ: 0 },
        library: { health: 100, maxHealth: 100 }
      }
      
      // Save towers
      if (game.towerSystem?.towers) {
        for (const tower of game.towerSystem.towers) {
          const healthComp = game.getComponent(tower.entityId, 'health')
          if (healthComp) {
            saveData.towers.push({
              type: tower.config.type,
              gridX: tower.gridX,
              gridZ: tower.gridZ,
              health: healthComp.current,
              maxHealth: healthComp.max
            })
          }
        }
      }
      
      // Save enemies
      if (game.enemies) {
        for (const enemyId of game.enemies) {
          const rbComp = game.getComponent(enemyId, 'rigidbody')
          const healthComp = game.getComponent(enemyId, 'health')
          const meshComp = game.getComponent(enemyId, 'mesh')
          
          if (rbComp && healthComp && meshComp) {
            const pos = rbComp.body.translation()
            const waveNumber = meshComp.mesh?.userData?.waveNumber || gameStore.currentWave
            
            saveData.enemies.push({
              posX: pos.x,
              posY: pos.y,
              posZ: pos.z,
              health: healthComp.current,
              maxHealth: healthComp.max,
              waveNumber
            })
          }
        }
      }
      
      // Save player position
      if (game.camera) {
        saveData.player = {
          posX: game.camera.position.x,
          posY: game.camera.position.y,
          posZ: game.camera.position.z
        }
      }
      
      // Save library health
      if (game.libraryEntity) {
        const libraryHealth = game.getComponent(game.libraryEntity, 'health')
        if (libraryHealth) {
          saveData.library = {
            health: libraryHealth.current,
            maxHealth: libraryHealth.max
          }
        }
      }
      
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveData))
      console.log('💾 Game saved successfully!', saveData)
      return true
      
    } catch (e) {
      console.error('Error saving game:', e)
      return false
    }
  }
  
  /**
   * Load saved game state
   */
  static loadGame(): SavedGameState | null {
    try {
      const saved = localStorage.getItem(SAVE_KEY)
      if (!saved) return null
      
      const data = JSON.parse(saved) as SavedGameState
      
      // Version check
      if (data.version !== SAVE_VERSION) {
        console.warn('Save version mismatch, clearing save')
        this.clearSave()
        return null
      }
      
      console.log('📂 Game loaded successfully!', data)
      return data
      
    } catch (e) {
      console.error('Error loading game:', e)
      return null
    }
  }
  
  /**
   * Clear saved game
   */
  static clearSave(): void {
    try {
      localStorage.removeItem(SAVE_KEY)
      console.log('🗑️ Save cleared')
    } catch (e) {
      console.error('Error clearing save:', e)
    }
  }
  
  /**
   * Get save info without loading
   */
  static getSaveInfo(): { timestamp: number; wave: number; score: number } | null {
    try {
      const saved = localStorage.getItem(SAVE_KEY)
      if (!saved) return null
      
      const data = JSON.parse(saved) as SavedGameState
      return {
        timestamp: data.timestamp,
        wave: data.gameStore.currentWave,
        score: data.gameStore.score
      }
    } catch (e) {
      return null
    }
  }
}
