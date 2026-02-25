import { defineStore } from 'pinia'

export const useGameStore = defineStore('game', {
  state: () => ({
    money: 100,
    score: 0,
    highScore: 0, // Nejvyšší dosažené skóre (persistuje mezi hrami)
    playerHealth: 100,
    playerMaxHealth: 100,
    enemiesKilled: 0,
    currentWave: 0,
    towers: [] as any[],
    isPaused: false,
    showQuizModal: false,
    currentQuestion: null as any,
    // Build mode state
    buildMode: false,
    selectedTowerType: 'basic' as 'basic' | 'rapid' | 'heavy' | 'sniper' | 'splash',
    // Wave system state
    waveInProgress: false,
    waveCountdown: 10, // Čas do další vlny (10s na začátku)
    enemiesSpawnedThisWave: 0,
    enemiesAlive: 0, // Aktuální počet živých nepřátel na mapě (zvyšuje se při spawnu, snižuje při zabití)
    totalWaves: 0,
    // Difficulty setting
    difficulty: 'easy' as 'easy' | 'medium' | 'hard'
  }),
  
  persist: {
    paths: ['highScore', 'difficulty'] // Perzistuje highScore a difficulty
  },
  
  getters: {
    isPlayerAlive: (state) => state.playerHealth > 0,
    healthPercentage: (state) => (state.playerHealth / state.playerMaxHealth) * 100
  },
  
  actions: {
    incrementScore(amount = 1) {
      this.score += amount
      // Update high score if current score exceeds it
      if (this.score > this.highScore) {
        this.highScore = this.score
      }
    },
    
    addMoney(amount: number) {
      this.money += amount
    },
    
    spendMoney(amount: number): boolean {
      if (this.money >= amount) {
        this.money -= amount
        return true
      }
      return false
    },
    
    damagePlayer(amount: number) {
      this.playerHealth = Math.max(0, this.playerHealth - amount)
    },
    
    healPlayer(amount: number) {
      this.playerHealth = Math.min(this.playerMaxHealth, this.playerHealth + amount)
    },
    
    resetGame() {
      this.money = 100
      this.score = 0
      this.playerHealth = this.playerMaxHealth
      this.enemiesKilled = 0
      this.currentWave = 0
      this.towers = []
      this.isPaused = false
      this.showQuizModal = false
      this.currentQuestion = null
      this.buildMode = false
      this.selectedTowerType = 'basic'
      this.waveInProgress = false
      this.waveCountdown = 10
      this.enemiesSpawnedThisWave = 0
      this.enemiesAlive = 0
      this.totalWaves = 0
      // Don't reset difficulty - it persists
    },
    
    setDifficulty(difficulty: 'easy' | 'medium' | 'hard') {
      this.difficulty = difficulty
    },
    
    // Get rewards based on difficulty
    getKillReward(): number {
      switch (this.difficulty) {
        case 'easy': return 3
        case 'medium': return 2
        case 'hard': return 1
        default: return 1
      }
    },
    
    getQuizReward(questionDifficulty: 'easy' | 'medium' | 'hard'): number {
      const multipliers = {
        easy: { easy: 30, medium: 60, hard: 90 },
        medium: { easy: 20, medium: 40, hard: 60 },
        hard: { easy: 10, medium: 20, hard: 30 }
      }
      return multipliers[this.difficulty][questionDifficulty]
    },
    
    setBuildMode(enabled: boolean) {
      this.buildMode = enabled
    },
    
    setSelectedTowerType(type: 'basic' | 'rapid' | 'heavy' | 'sniper' | 'splash') {
      this.selectedTowerType = type
    },
    
    // Wave system actions
    startWave() {
      this.currentWave++
      this.waveInProgress = true
      this.enemiesSpawnedThisWave = 0
      this.waveCountdown = 20 // 20s do další vlny po dokončení
    },
    
    completeWave() {
      this.waveInProgress = false
      const bonus = this.currentWave * 10
      this.addMoney(bonus)
      this.incrementScore(bonus)
      this.waveCountdown = 20 // Reset na 20s
    },
    
    enemySpawned() {
      this.enemiesSpawnedThisWave++
      this.enemiesAlive++
    },
    
    enemyKilled() {
      // Snížit počet živých nepřátel
      if (this.enemiesAlive > 0) {
        this.enemiesAlive--
      }
      this.enemiesKilled++
    },
    
    updateWaveCountdown(dt: number) {
      if (!this.waveInProgress && this.waveCountdown > 0) {
        this.waveCountdown = Math.max(0, this.waveCountdown - dt)
      }
    }
  }
})
