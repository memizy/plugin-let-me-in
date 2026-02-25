import * as THREE from 'three'
import type Game from './Game'
import { useGameStore } from '../stores/game'
import { audioService } from '../services/AudioService'

export class WaveSystem {
  private game: Game
  private spawnTimer: number = 0
  private spawnInterval: number = 2 // seconds between spawns (bylo 5)
  private enemiesPerWave: number = 0
  private enemyHealth: number = 50
  
  constructor(game: Game) {
    this.game = game
  }
  
  update(dt: number): void {
    const gameStore = useGameStore()
    
    // Update countdown when not in wave
    if (!gameStore.waveInProgress) {
      gameStore.updateWaveCountdown(dt)
      
      // Auto-start wave when countdown reaches 0
      if (gameStore.waveCountdown <= 0) {
        this.startWave()
      }
      return
    }
    
    // Spawn enemies during wave
    this.spawnTimer += dt
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0
      
      if (gameStore.enemiesSpawnedThisWave < this.enemiesPerWave) {
        this.spawnEnemy()
      }
    }
    
    // Check if wave is complete (všichni spawnutí)
    if (gameStore.enemiesSpawnedThisWave >= this.enemiesPerWave) {
      // Vlna je dokončena, ale nepřátelé z ní mohou být stále naživu
      this.completeWave()
    }
  }
  
  private startWave(): void {
    const gameStore = useGameStore()
    gameStore.startWave()
    
    // Calculate wave difficulty
    const wave = gameStore.currentWave
    this.enemiesPerWave = 5 + (wave * 2) // 7, 9, 11, 13...
    this.enemyHealth = 50 + (wave * 10) // 60, 70, 80, 90...
    this.spawnInterval = Math.max(0.1, this.spawnInterval - (wave * 0.2)) // Faster spawns each wave
    
    // Play wave start sound
    audioService.play('wave_start')
    
    // Hudba se střídá automaticky, nemusíme volat playMusic
    
    console.log(`🌊 WAVE ${wave} STARTED! Enemies: ${this.enemiesPerWave}, HP: ${this.enemyHealth}`)
  }
  
  private spawnEnemy(): void {
    const gameStore = useGameStore()
    const wave = gameStore.currentWave
    
    // Every 5th wave is a boss
    const isBoss = wave % 5 === 0 && gameStore.enemiesSpawnedThisWave === 0
    
    if (isBoss) {
      this.spawnBoss(wave)
    } else {
      this.spawnNormalEnemy(wave)
    }
    
    gameStore.enemySpawned()
  }
  
  private spawnNormalEnemy(_waveNumber: number): void {
    // Use existing enemy spawn logic from Game.ts
    const angle = Math.random() * Math.PI * 2
    const distance = 40 + Math.random() * 20
    const x = Math.cos(angle) * distance
    const z = Math.sin(angle) * distance
    
    const enemyId = this.game.spawnEnemy(x, z)
    
    // Set wave-scaled HP
    const health = this.game.getComponent(enemyId, 'health')
    if (health && 'current' in health && 'max' in health) {
      health.current = this.enemyHealth
      health.max = this.enemyHealth
      
      // Update HP bar
      this.game.hpBarSystem.updateHPBar(
        enemyId,
        this.enemyHealth,
        this.enemyHealth,
        new THREE.Vector3(x, 1, z)
      )
    }
  }
  
  private spawnBoss(waveNumber: number): void {
    console.log('💀 BOSS WAVE!')
    
    // Boss spawns in front of player
    const x = 0
    const z = 50
    
    const bossId = this.game.spawnEnemy(x, z)
    
    // Mark as current wave enemy
    const mesh = this.game.getComponent(bossId, 'mesh')
    if (mesh && 'mesh' in mesh) {
      (mesh.mesh as any).userData.waveNumber = waveNumber
    }
    
    // Boss has 3x HP
    const bossHealth = this.enemyHealth * 3
    const health = this.game.getComponent(bossId, 'health')
    if (health && 'current' in health && 'max' in health) {
      health.current = bossHealth
      health.max = bossHealth
      
      // Update HP bar
      this.game.hpBarSystem.updateHPBar(
        bossId,
        bossHealth,
        bossHealth,
        new THREE.Vector3(x, 1, z)
      )
    }
    
    // Boss is bigger and red
    if (mesh && 'mesh' in mesh) {
      const threeMesh = mesh.mesh as any
      threeMesh.scale.set(1.5, 1.5, 1.5)
      
      const material = threeMesh.material as any
      material.color.setHex(0x8b0000) // Dark red
      material.emissive.setHex(0xff0000)
      material.emissiveIntensity = 0.3
    }
    
    // Boss deals 2x damage (handled in CombatSystem via component)
    const combat = this.game.getComponent(bossId, 'combat')
    if (combat && 'damage' in combat) {
      combat.damage = 20 // 2x normal
    }
  }
  
  private completeWave(): void {
    const gameStore = useGameStore()
    gameStore.completeWave()
    
    const wave = gameStore.currentWave
    const bonus = wave * 10
    
    // Play wave complete sound
    audioService.play('wave_complete')
    
    // Hudba se střídá automaticky
    
    console.log(`✅ WAVE ${wave} COMPLETE! Bonus: +$${bonus}`)
  }
  
  // Manual wave start removed - waves start automatically on countdown
}
