import * as THREE from 'three'
import type Game from './Game'
import type { EntityId, HealthComponent, MeshComponent, RigidBodyComponent } from './Game'
import { useGameStore } from '../stores/game'
import { audioService } from '../services/AudioService'

export interface TowerConfig {
  type: 'basic' | 'rapid' | 'heavy' | 'sniper' | 'splash'
  name: string
  cost: number
  damage: number
  fireRate: number // shots per second
  range: number
  color: number
  splashRadius?: number // Pro AoE věže
}

export const TOWER_CONFIGS: Record<string, TowerConfig> = {
  basic: {
    type: 'basic',
    name: '🏹 Základní věž',
    cost: 50,
    damage: 10,
    fireRate: 1.0,
    range: 15,
    color: 0x4a90e2
  },
  rapid: {
    type: 'rapid',
    name: '⚡ Rychlopalná',
    cost: 100,
    damage: 5,
    fireRate: 5.0,
    range: 12,
    color: 0xe24a4a
  },
  heavy: {
    type: 'heavy',
    name: '💥 Těžká věž',
    cost: 150,
    damage: 50,
    fireRate: 0.5,
    range: 20,
    color: 0x9b4ae2
  },
  sniper: {
    type: 'sniper',
    name: '🎯 Sniper',
    cost: 200,
    damage: 100,
    fireRate: 0.3,
    range: 30,
    color: 0x2ecc71
  },
  splash: {
    type: 'splash',
    name: '💣 Splash',
    cost: 250,
    damage: 30,
    fireRate: 0.8,
    range: 18,
    color: 0xf39c12,
    splashRadius: 5
  }
}

export interface Tower {
  entityId: EntityId
  config: TowerConfig
  lastShotTime: number
  gridX: number
  gridZ: number
}

export class TowerSystem {
  private game: Game
  towers: Tower[] = [] // Public pro přístup z CombatSystem
  
  // Build mode
  buildMode = false
  selectedTowerType: keyof typeof TOWER_CONFIGS = 'basic'
  ghostTower: THREE.Mesh | null = null
  rangeIndicator: THREE.Mesh | null = null
  
  // Grid system
  readonly GRID_SIZE = 4 // 4x4 unit grid - public pro save/load
  occupiedGrids = new Set<string>() // public pro save/load
  
  constructor(game: Game) {
    this.game = game
    this.setupBuildMode()
  }
  
  private setupBuildMode(): void {
    // Toggle build mode with B key
    document.addEventListener('keydown', (e) => {
      if (e.code === 'KeyB') {
        this.toggleBuildMode()
      }
      
      // Switch tower type with 1, 2, 3, 4, 5
      if (this.buildMode) {
        if (e.code === 'Digit1') this.selectTowerType('basic')
        if (e.code === 'Digit2') this.selectTowerType('rapid')
        if (e.code === 'Digit3') this.selectTowerType('heavy')
        if (e.code === 'Digit4') this.selectTowerType('sniper')
        if (e.code === 'Digit5') this.selectTowerType('splash')
      }
    })
    
    // Place tower on click
    this.game.canvas.addEventListener('click', () => {
      if (this.buildMode && this.game.controls.isLocked) {
        this.placeTower()
      }
    })
  }
  
  toggleBuildMode(): void {
    this.buildMode = !this.buildMode
    
    // Sync with store
    const gameStore = useGameStore()
    gameStore.setBuildMode(this.buildMode)
    
    if (this.buildMode) {
      console.log('🏗️ Build mode ENABLED. Keys: 1=Basic, 2=Rapid, 3=Heavy, Click=Place')
      this.createGhostTower()
    } else {
      console.log('🏗️ Build mode DISABLED')
      this.removeGhostTower()
    }
  }
  
  selectTowerType(type: keyof typeof TOWER_CONFIGS): void {
    this.selectedTowerType = type
    const config = TOWER_CONFIGS[type]
    if (!config) return
    
    // Sync with store - všechny typy jsou podporovány
    const gameStore = useGameStore()
    gameStore.setSelectedTowerType(type as 'basic' | 'rapid' | 'heavy' | 'sniper' | 'splash')
    
    console.log(`🏰 Selected: ${config.name} ($${config.cost})`)
    
    if (this.buildMode) {
      this.removeGhostTower()
      this.createGhostTower()
    }
  }
  
  private createGhostTower(): void {
    const config = TOWER_CONFIGS[this.selectedTowerType]
    if (!config) return
    
    // Create ghost tower mesh (narrow tower: 1x4x1)
    const geometry = new THREE.BoxGeometry(1, 4, 1)
    const material = new THREE.MeshStandardMaterial({
      color: config.color,
      transparent: true,
      opacity: 0.5,
      emissive: config.color,
      emissiveIntensity: 0.3
    })
    this.ghostTower = new THREE.Mesh(geometry, material)
    this.game.scene.add(this.ghostTower)
    
    // Create range indicator
    const rangeGeometry = new THREE.CircleGeometry(config.range, 32)
    const rangeMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide
    })
    this.rangeIndicator = new THREE.Mesh(rangeGeometry, rangeMaterial)
    this.rangeIndicator.rotation.x = -Math.PI / 2
    this.game.scene.add(this.rangeIndicator)
  }
  
  private removeGhostTower(): void {
    if (this.ghostTower) {
      this.game.scene.remove(this.ghostTower)
      this.ghostTower = null
    }
    if (this.rangeIndicator) {
      this.game.scene.remove(this.rangeIndicator)
      this.rangeIndicator = null
    }
  }
  
  private placeTower(): void {
    if (!this.ghostTower) return
    
    const config = TOWER_CONFIGS[this.selectedTowerType]
    if (!config) return
    
    const pos = this.ghostTower.position
    
    // Check money
    const gameStore = useGameStore()
    if (gameStore.money < config.cost) {
      console.log('❌ Not enough money!')
      return
    }
    
    // Check if grid is occupied
    const gridX = Math.round(pos.x / this.GRID_SIZE)
    const gridZ = Math.round(pos.z / this.GRID_SIZE)
    const gridKey = `${gridX},${gridZ}`
    
    if (this.occupiedGrids.has(gridKey)) {
      console.log('❌ Grid occupied!')
      return
    }
    
    // Calculate world position
    const worldX = gridX * this.GRID_SIZE
    const worldZ = gridZ * this.GRID_SIZE
    
    // ❌ KONTROLA: Nelze stavět uvnitř knihovny (10x10 box od -5 do +5)
    const librarySize = 10
    const libraryHalfSize = librarySize / 2
    if (Math.abs(worldX) < libraryHalfSize && Math.abs(worldZ) < libraryHalfSize) {
      console.log('❌ Cannot build inside library!')
      return
    }
    
    // Spend money
    gameStore.spendMoney(config.cost)
    
    // Create tower entity
    const { entityId: towerEntity, mesh } = this.createTowerEntity(config, worldX, worldZ)
    
    // Mark grid as occupied
    this.occupiedGrids.add(gridKey)
    
    // Add to towers list
    this.towers.push({
      entityId: towerEntity,
      config,
      lastShotTime: 0,
      gridX,
      gridZ
    })
    
    console.log(`✅ Tower ${config.name} placed at (${worldX}, ${worldZ}) for $${config.cost}`)
    
    // Play build sound
    audioService.play('tower_place')
    
    // Flash feedback
    const material = mesh.material as THREE.MeshStandardMaterial
    const originalColor = material.color.getHex()
    material.color.setHex(0xffffff)
    setTimeout(() => material.color.setHex(originalColor), 200)
  }
  
  createTowerEntity(config: TowerConfig, x: number, z: number): { entityId: EntityId, mesh: THREE.Mesh } {
    // Create tower mesh (narrow tower: 1x4x1)
    const geometry = new THREE.BoxGeometry(1, 4, 1)
    const material = new THREE.MeshStandardMaterial({
      color: config.color,
      roughness: 0.6,
      metalness: 0.4
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(x, 2, z) // Height 2 = half of 4
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.userData.originalColor = config.color // Uložíme původní barvu pro flash efekt
    this.game.scene.add(mesh)
    
    // Create entity
    const entityId = this.game.createEntity()
    
    this.game.addComponent(entityId, {
      type: 'transform',
      position: new THREE.Vector3(x, 2, z),
      rotation: new THREE.Euler(),
      scale: new THREE.Vector3(1, 1, 1)
    } as any)
    
    this.game.addComponent(entityId, {
      type: 'mesh',
      mesh
    } as any)
    
    this.game.addComponent(entityId, {
      type: 'health',
      current: 100,
      max: 100
    } as any)
    
    // Create HP bar
    this.game.hpBarSystem.createHPBar(
      entityId,
      100,
      100,
      { width: 80, height: 14, fontSize: 10, showText: true },
      4.0
    )
    
    return { entityId, mesh }
  }
  
  placeTowerAtScreenCenter(): void {
    if (!this.buildMode || !this.ghostTower) return
    
    // Use the ghost tower's current position (it's already tracking screen center)
    const gridX = Math.round(this.ghostTower.position.x / this.GRID_SIZE)
    const gridZ = Math.round(this.ghostTower.position.z / this.GRID_SIZE)
    const gridKey = `${gridX},${gridZ}`
    
    const selectedConfig = TOWER_CONFIGS[this.selectedTowerType]
    if (!selectedConfig) return
    
    const gameStore = useGameStore()
    
    // Check if affordable
    if (gameStore.money < selectedConfig.cost) {
      console.log('❌ Not enough money for tower')
      return
    }
    
    // Check if spot is free
    if (this.occupiedGrids.has(gridKey)) {
      console.log('❌ Spot already occupied')
      return
    }
    
    // Place the tower
    const worldX = gridX * this.GRID_SIZE
    const worldZ = gridZ * this.GRID_SIZE
    
    // ❌ KONTROLA: Nelze stavět uvnitř knihovny (10x10 box od -5 do +5)
    const librarySize = 10
    const libraryHalfSize = librarySize / 2
    if (Math.abs(worldX) < libraryHalfSize && Math.abs(worldZ) < libraryHalfSize) {
      console.log('❌ Cannot build inside library!')
      return
    }
    
    const { entityId } = this.createTowerEntity(selectedConfig, worldX, worldZ)
    this.towers.push({
      entityId: entityId,
      config: selectedConfig,
      lastShotTime: 0,
      gridX: gridX,
      gridZ: gridZ
    })
    
    this.occupiedGrids.add(gridKey)
    gameStore.spendMoney(selectedConfig.cost)
    
    audioService.play('tower_place')
    console.log(`🏰 Tower placed at (${worldX}, ${worldZ})`)
  }
  
  update(dt: number): void {
    // Update ghost tower position
    if (this.buildMode && this.ghostTower && this.rangeIndicator) {
      this.updateGhostPosition()
    }
    
    // Update tower shooting
    for (const tower of this.towers) {
      this.updateTowerShooting(tower, dt)
      this.updateTowerHP(tower)
    }
  }
  
  private updateGhostPosition(): void {
    if (!this.ghostTower || !this.rangeIndicator) return
    
    // Raycast to ground from camera center
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(new THREE.Vector2(0, 0), this.game.camera)
    
    const intersects = raycaster.intersectObjects(this.game.scene.children, true)
    
    for (const intersect of intersects) {
      if (intersect.object.userData.isGround) {
        // Snap to grid
        const gridX = Math.round(intersect.point.x / this.GRID_SIZE)
        const gridZ = Math.round(intersect.point.z / this.GRID_SIZE)
        const worldX = gridX * this.GRID_SIZE
        const worldZ = gridZ * this.GRID_SIZE
        
        this.ghostTower.position.set(worldX, 2, worldZ)
        this.rangeIndicator.position.set(worldX, 0.1, worldZ)
        
        // Check if valid placement
        const gridKey = `${gridX},${gridZ}`
        const isOccupied = this.occupiedGrids.has(gridKey)
        
        // ❌ KONTROLA: Červená i když je pozice uvnitř knihovny
        const librarySize = 10
        const libraryHalfSize = librarySize / 2
        const isInsideLibrary = Math.abs(worldX) < libraryHalfSize && Math.abs(worldZ) < libraryHalfSize
        
        // Color feedback
        const material = this.ghostTower.material as THREE.MeshStandardMaterial
        const selectedConfig = TOWER_CONFIGS[this.selectedTowerType]
        material.color.setHex((isOccupied || isInsideLibrary) ? 0xff0000 : (selectedConfig?.color || 0x4a90e2))
        
        break
      }
    }
  }
  
  private updateTowerShooting(tower: Tower, _dt: number): void {
    const currentTime = performance.now() / 1000
    const shootInterval = 1.0 / tower.config.fireRate
    
    if (currentTime - tower.lastShotTime < shootInterval) return
    
    // Find nearest enemy in range
    const towerTransform = this.game.getComponent(tower.entityId, 'transform')
    if (!towerTransform || !('position' in towerTransform)) return
    
    const towerPos = (towerTransform as any).position as THREE.Vector3
    
    let nearestEnemy: EntityId | null = null
    let nearestDistance = Infinity
    
    for (const enemyId of this.game.enemies) {
      const enemyRB = this.game.getComponent(enemyId, 'rigidbody') as RigidBodyComponent
      if (!enemyRB) continue
      
      const enemyPos = enemyRB.body.translation()
      const distance = Math.sqrt(
        Math.pow(enemyPos.x - towerPos.x, 2) +
        Math.pow(enemyPos.z - towerPos.z, 2)
      )
      
      if (distance < tower.config.range && distance < nearestDistance) {
        nearestDistance = distance
        nearestEnemy = enemyId
      }
    }
    
    // Shoot at nearest enemy
    if (nearestEnemy !== null) {
      this.shootAtEnemy(tower, nearestEnemy)
      tower.lastShotTime = currentTime
    }
  }
  
  private shootAtEnemy(tower: Tower, enemyId: EntityId): void {
    // Get tower and enemy positions
    const towerTransform = this.game.getComponent(tower.entityId, 'transform')
    const enemyRB = this.game.getComponent(enemyId, 'rigidbody') as RigidBodyComponent
    if (!towerTransform || !enemyRB || !('position' in towerTransform)) return
    
    const towerPos = towerTransform.position as THREE.Vector3
    const enemyPos = enemyRB.body.translation()
    const enemyVec3 = new THREE.Vector3(enemyPos.x, enemyPos.y, enemyPos.z)
    
    // Create projectile visual
    this.createProjectile(towerPos, enemyVec3, tower.config.color)
    
    // Damage primary target
    const health = this.game.getComponent(enemyId, 'health') as HealthComponent
    if (!health) return
    
    health.current -= tower.config.damage
    
    // Visual feedback
    this.flashEnemy(enemyId)
    
    // Check death of primary target
    if (health.current <= 0) {
      this.game.combatSystem.killEnemy(enemyId)
    }
    
    // Splash damage for splash towers
    if (tower.config.splashRadius && tower.config.splashRadius > 0) {
      this.applySplashDamage(enemyVec3, tower.config.splashRadius, tower.config.damage * 0.5, enemyId)
    }
    
    console.log(`🏰 Tower shot enemy! Damage: ${tower.config.damage}${tower.config.splashRadius ? ' + splash' : ''}`)
  }
  
  private applySplashDamage(center: THREE.Vector3, radius: number, damage: number, excludeEnemy: EntityId): void {
    let splashHits = 0
    
    for (const enemyId of this.game.enemies) {
      // Don't damage the primary target twice
      if (enemyId === excludeEnemy) continue
      
      const enemyRB = this.game.getComponent(enemyId, 'rigidbody') as RigidBodyComponent
      if (!enemyRB) continue
      
      const enemyPos = enemyRB.body.translation()
      const distance = Math.sqrt(
        Math.pow(enemyPos.x - center.x, 2) +
        Math.pow(enemyPos.z - center.z, 2)
      )
      
      // Apply splash damage if in range
      if (distance <= radius) {
        const health = this.game.getComponent(enemyId, 'health') as HealthComponent
        if (health) {
          health.current -= damage
          this.flashEnemy(enemyId)
          
          // Check death
          if (health.current <= 0) {
            this.game.combatSystem.killEnemy(enemyId)
          }
          
          splashHits++
        }
      }
    }
    
    if (splashHits > 0) {
      console.log(`💥 Splash damage hit ${splashHits} additional enemies!`)
    }
  }
  
  private createProjectile(from: THREE.Vector3, to: THREE.Vector3, color: number): void {
    // Create bullet mesh
    const geometry = new THREE.SphereGeometry(0.15, 8, 8)
    const material = new THREE.MeshBasicMaterial({ 
      color: color
    })
    const projectile = new THREE.Mesh(geometry, material)
    projectile.position.copy(from)
    this.game.scene.add(projectile)
    
    // Animate to target
    const duration = 200 // milliseconds
    const startTime = Date.now()
    
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      projectile.position.lerpVectors(from, to, progress)
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        this.game.scene.remove(projectile)
        geometry.dispose()
        material.dispose()
      }
    }
    
    animate()
  }
  
  private flashEnemy(enemyId: EntityId): void {
    const meshComp = this.game.getComponent(enemyId, 'mesh') as MeshComponent
    if (!meshComp) return
    
    const material = meshComp.mesh.material as THREE.MeshStandardMaterial
    const originalColor = material.color.clone()
    
    material.color.setHex(0xffffff)
    setTimeout(() => material.color.copy(originalColor), 100)
  }
  
  private updateTowerHP(tower: Tower): void {
    const health = this.game.getComponent(tower.entityId, 'health') as HealthComponent
    const transform = this.game.getComponent(tower.entityId, 'transform')
    
    if (health && transform && 'position' in transform) {
      this.game.hpBarSystem.updateHPBar(
        tower.entityId,
        Math.floor(health.current),
        health.max,
        (transform as any).position
      )
    }
  }
  
  /**
   * Destroy tower (called when tower HP reaches 0)
   */
  destroyTower(tower: Tower): void {
    console.log('💥 Destroying tower at grid:', tower.gridX, tower.gridZ)
    
    // Remove mesh from scene
    const meshComp = this.game.getComponent(tower.entityId, 'mesh') as MeshComponent
    if (meshComp) {
      this.game.scene.remove(meshComp.mesh)
    }
    
    // Remove HP bar
    this.game.hpBarSystem.removeHPBar(tower.entityId)
    
    // Free grid position
    const gridKey = `${tower.gridX},${tower.gridZ}`
    this.occupiedGrids.delete(gridKey)
    
    // Remove from towers array
    const index = this.towers.indexOf(tower)
    if (index > -1) {
      this.towers.splice(index, 1)
    }
    
    // Destroy entity
    this.game.destroyEntity(tower.entityId)
    
    console.log('✅ Tower destroyed, remaining towers:', this.towers.length)
  }
  
  /**
   * Update tower color based on damage state
   */
}
