import * as THREE from 'three'
import type Game from './Game'
import { audioService } from '../services/AudioService'
import type { EntityId, HealthComponent, MeshComponent } from './Game'

export class ShootingSystem {
  private game: Game
  private raycaster = new THREE.Raycaster()
  private shootCooldown = 0.2 // 5 shots per second
  private lastShotTime = 0
  private damage = 25 // Damage per shot
  
  // Muzzle flash effect
  private muzzleFlash: THREE.PointLight | null = null
  private muzzleFlashTime = 0
  
  constructor(game: Game) {
    this.game = game
    this.setupMuzzleFlash()
  }
  
  private setupMuzzleFlash(): void {
    // Create muzzle flash light
    this.muzzleFlash = new THREE.PointLight(0xffaa00, 2, 10)
    this.muzzleFlash.visible = false
    this.game.scene.add(this.muzzleFlash)
  }
  
  /**
   * Attempt to shoot
   */
  shoot(): void {
    const currentTime = performance.now() / 1000
    
    // Check cooldown
    if (currentTime - this.lastShotTime < this.shootCooldown) {
      return
    }
    
    this.lastShotTime = currentTime
    
    // Raycast from camera center
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.game.camera)
    
    // Check for enemy hits
    let hitEnemy: EntityId | null = null
    let closestDistance = Infinity
    
    for (const enemyId of this.game.enemies) {
      const meshComp = this.game.getComponent(enemyId, 'mesh') as MeshComponent
      if (!meshComp) continue
      
      const intersects = this.raycaster.intersectObject(meshComp.mesh, false)
      
      if (intersects.length > 0) {
        const firstHit = intersects[0]
        if (firstHit && firstHit.distance < closestDistance) {
          closestDistance = firstHit.distance
          hitEnemy = enemyId
        }
      }
    }
    
    // Deal damage to hit enemy
    if (hitEnemy !== null) {
      this.damageEnemy(hitEnemy, this.damage)
      console.log(`🎯 Hit enemy! Distance: ${closestDistance.toFixed(1)}m`)
    }
    
    // Muzzle flash effect
    this.triggerMuzzleFlash()
    
    // Play shoot sound
    audioService.play('player_shoot')
    
    // Sound effect (placeholder)
    console.log('🔫 BANG!')
  }
  
  /**
   * Damage enemy
   */
  private damageEnemy(enemyId: EntityId, damage: number): void {
    const health = this.game.getComponent(enemyId, 'health') as HealthComponent
    if (!health) return
    
    health.current -= damage
    
    // Play hit sound
    audioService.play('enemy_hit')
    
    // Visual feedback
    this.flashEnemy(enemyId)
    
    // Check death
    if (health.current <= 0) {
      this.game.combatSystem.killEnemy(enemyId)
    }
  }
  
  /**
   * Flash enemy red when hit
   */
  private flashEnemy(enemyId: EntityId): void {
    const meshComp = this.game.getComponent(enemyId, 'mesh') as MeshComponent
    if (!meshComp) return
    
    const material = meshComp.mesh.material as THREE.MeshStandardMaterial
    const originalColor = material.color.clone()
    
    // Flash white
    material.color.setHex(0xffffff)
    
    // Reset after 100ms
    setTimeout(() => {
      material.color.copy(originalColor)
    }, 100)
  }
  
  /**
   * Trigger muzzle flash effect
   */
  private triggerMuzzleFlash(): void {
    if (!this.muzzleFlash) return
    
    // Position at camera
    this.muzzleFlash.position.copy(this.game.camera.position)
    const forward = new THREE.Vector3()
    this.game.camera.getWorldDirection(forward)
    this.muzzleFlash.position.add(forward.multiplyScalar(0.5))
    
    // Show flash
    this.muzzleFlash.visible = true
    this.muzzleFlashTime = 0.05 // 50ms flash
  }
  
  /**
   * Update shooting system
   */
  update(dt: number): void {
    // Update muzzle flash
    if (this.muzzleFlash && this.muzzleFlash.visible) {
      this.muzzleFlashTime -= dt
      if (this.muzzleFlashTime <= 0) {
        this.muzzleFlash.visible = false
      }
    }
  }
}
