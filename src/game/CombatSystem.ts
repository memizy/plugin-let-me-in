import * as THREE from 'three'
import type Game from './Game'
import type { EntityId, HealthComponent, CombatComponent, RigidBodyComponent, MeshComponent } from './Game'
import { useGameStore } from '../stores/game'
import { audioService } from '../services/AudioService'

export class CombatSystem {
  private game: Game
  private gameStore: ReturnType<typeof useGameStore>
  
  constructor(game: Game) {
    this.game = game
    this.gameStore = useGameStore()
  }
  
  /**
   * Update combat - check collisions and deal damage
   */
  update(_dt: number): void {
    // Check collisions between enemies and targets (player, library)
    for (const enemyId of this.game.enemies) {
      const enemyRB = this.game.getComponent(enemyId, 'rigidbody') as RigidBodyComponent
      const enemyCombat = this.game.getComponent(enemyId, 'combat') as CombatComponent
      
      if (!enemyRB || !enemyCombat) continue
      
      const enemyPos = enemyRB.body.translation()
      
      // Check distance to player
      const playerRB = this.game.getComponent(this.game.playerEntity, 'rigidbody') as RigidBodyComponent
      if (playerRB) {
        const playerPos = playerRB.body.translation()
        const distToPlayer = Math.sqrt(
          Math.pow(playerPos.x - enemyPos.x, 2) +
          Math.pow(playerPos.y - enemyPos.y, 2) +
          Math.pow(playerPos.z - enemyPos.z, 2)
        )
        
        // Attack range: 2 units
        if (distToPlayer < 2.0) {
          const currentTime = performance.now() / 1000
          if (currentTime - enemyCombat.lastAttackTime >= enemyCombat.attackCooldown) {
            this.damageEntity(this.game.playerEntity, enemyCombat.damage)
            enemyCombat.lastAttackTime = currentTime
            
            // Play attack sound
            audioService.play('player_hit')
            
            // Update player HP in store
            const playerHP = this.game.getComponent(this.game.playerEntity, 'health') as HealthComponent
            if (playerHP) {
              this.gameStore.damagePlayer(enemyCombat.damage)
              console.log(`💥 Player hit! HP: ${playerHP.current}/${playerHP.max}`)
              
              // Check player death
              if (playerHP.current <= 0) {
                this.handleGameOver('Player died!')
              }
            }
          }
        }
      }
      
      // Check distance to library
      // Library mesh je na pozici (0, 4, 0) podle createLibrary()
      const distToLibrary = Math.sqrt(
        Math.pow(0 - enemyPos.x, 2) +
        Math.pow(0 - enemyPos.z, 2) // Pouze X a Z, ne Y
      )
      
      // Attack range: 6 units (library is bigger)
      if (distToLibrary < 6.0) {
        const currentTime = performance.now() / 1000
        if (currentTime - enemyCombat.lastAttackTime >= enemyCombat.attackCooldown) {
          this.damageEntity(this.game.libraryEntity, enemyCombat.damage)
          enemyCombat.lastAttackTime = currentTime
          
          // Play attack sound
          audioService.play('library_hit')
          
          const libraryHP = this.game.getComponent(this.game.libraryEntity, 'health') as HealthComponent
          if (libraryHP) {
            console.log(`🏛️ Library hit! HP: ${Math.floor(libraryHP.current)}/${libraryHP.max}`)
            
            // Visual feedback - red flash
            this.flashEntity(this.game.libraryEntity)
            
            // Check library destruction
            if (libraryHP.current <= 0) {
              this.handleGameOver('Library destroyed!')
            }
          }
        }
      }
      
      // Check distance to towers
      for (const tower of this.game.towerSystem.towers) {
        const towerTransform = this.game.getComponent(tower.entityId, 'transform')
        if (!towerTransform || !('position' in towerTransform)) continue
        
        const towerPos = (towerTransform as any).position as THREE.Vector3
        const distToTower = Math.sqrt(
          Math.pow(towerPos.x - enemyPos.x, 2) +
          Math.pow(towerPos.z - enemyPos.z, 2) // Only X and Z
        )
        
        // Attack range: 3 units
        if (distToTower < 3.0) {
          const currentTime = performance.now() / 1000
          if (currentTime - enemyCombat.lastAttackTime >= enemyCombat.attackCooldown) {
            this.damageEntity(tower.entityId, enemyCombat.damage)
            enemyCombat.lastAttackTime = currentTime
            
            // Play attack sound
            audioService.play('tower_hit') // Použijeme stejný zvuk jako pro hráče
            
            const towerHP = this.game.getComponent(tower.entityId, 'health') as HealthComponent
            if (towerHP) {
              console.log(`🏰 Tower hit! HP: ${Math.floor(towerHP.current)}/${towerHP.max}`)
              
              // Visual feedback - yellow flash (0xffff00) for towers
              this.flashEntity(tower.entityId, 0xffff00)
              
              // Check tower destruction
              if (towerHP.current <= 0) {
                console.log('💥 Tower destroyed!')
                audioService.play('tower_destroyed')
                this.game.towerSystem.destroyTower(tower)
              }
            }
          }
          break // Attack only one tower at a time
        }
      }
    }
  }
  
  /**
   * Deal damage to entity
   */
  private damageEntity(entityId: EntityId, damage: number): void {
    const health = this.game.getComponent(entityId, 'health') as HealthComponent
    if (health) {
      health.current = Math.max(0, health.current - damage)
      
      // Visual feedback - red flash
      this.flashEntity(entityId)
    }
  }
  
  /**
   * Visual feedback - flash entity with color
   */
  private flashEntity(entityId: EntityId, flashColor: number = 0xff0000): void {
    const meshComp = this.game.getComponent(entityId, 'mesh')
    if (meshComp && 'mesh' in meshComp) {
      const mesh = (meshComp as any).mesh as THREE.Mesh
      const material = mesh.material as THREE.MeshStandardMaterial
      
      // Použij uloženou původní barvu nebo aktuální barvu jako fallback
      const originalColor = mesh.userData.originalColor !== undefined 
        ? mesh.userData.originalColor 
        : material.color.getHex()
      
      // Flash with specified color
      material.color.setHex(flashColor)
      
      // Reset after 200ms - obnoví původní barvu, ne poškození barvu
      setTimeout(() => {
        material.color.setHex(originalColor)
      }, 200)
    }
  }
  
  /**
   * Handle game over
   */
  private handleGameOver(reason: string): void {
    console.log('💀 GAME OVER:', reason)
    this.game.gameOver = true
    
    // Trigger game over event instead of alert
    window.dispatchEvent(new CustomEvent('gameOver', { 
      detail: { reason } 
    }))
  }
  
    /**
   * Kill enemy and remove from scene
   */
  killEnemy(enemyId: EntityId): void {
    // 1. ZÍSKEJ KOMPONENTY, NEŽ JE SMAŽEME
    const meshComp = this.game.getComponent(enemyId, 'mesh') as MeshComponent
    const rbComp = this.game.getComponent(enemyId, 'rigidbody') as RigidBodyComponent // <-- DŮLEŽITÉ

    // 2. ❗❗❗ KLÍČOVÁ OPRAVA ❗❗❗
    // Odeber fyzické tělo a collider ze světa Rapier.
    if (rbComp) {
      try {
        // Musíme odebrat collider PŘED rigid body
        this.game.world.removeCollider(rbComp.collider, false) 
        this.game.world.removeRigidBody(rbComp.body)
        console.log(`✅ [Rapier] Fyzické tělo odebráno pro ${enemyId}`)
      } catch (e) {
        console.error(`Chyba při mazání Rapier těla pro ${enemyId}:`, e)
      }
    } else {
      console.warn(`Nepřítel ${enemyId} neměl rigidbody komponentu.`)
    }

    // 3. Odeber vizuální mesh ze scény (Three.js)
    if (meshComp && meshComp.mesh) {
      this.game.scene.remove(meshComp.mesh)
      // Bonus: Uvolni paměť (dobrá praxe)
      meshComp.mesh.geometry?.dispose()
      if (meshComp.mesh.material instanceof THREE.Material) {
        meshComp.mesh.material.dispose()
      }
    }
    
    // 4. Odeber HP bar
    this.game.hpBarSystem.removeHPBar(enemyId)
    
    // 5. Odeber z pole nepřátel
    const index = this.game.enemies.indexOf(enemyId)
    if (index > -1) {
      this.game.enemies.splice(index, 1)
    }
    
    // 6. Znič entitu (z ECS mapy)
    this.game.destroyEntity(enemyId)
    
    // 7. Aktualizuj statistiky
    this.gameStore.enemyKilled()
    
    // 8. Přidej odměny
    const killReward = this.gameStore.getKillReward()
    this.gameStore.incrementScore(killReward)
    this.gameStore.addMoney(killReward)
    
    console.log('☠️ Enemy killed! Score:', this.gameStore.score, 'Alive:', this.gameStore.enemiesAlive)
  }
}
