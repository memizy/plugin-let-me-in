import * as THREE from 'three'
import type { EntityId } from './Game'

export interface HPBarConfig {
  width: number
  height: number
  fontSize: number
  showText: boolean
}

export class SpriteHPBarSystem {
  private scene: THREE.Scene
  private hpBars = new Map<EntityId, { sprite: THREE.Sprite, config: HPBarConfig, offsetY: number }>()
  
  constructor(scene: THREE.Scene) {
    this.scene = scene
  }
  
  /**
   * Vytvoří HP bar jako THREE.Sprite s CanvasTexture
   * @param entityId ID entity
   * @param current Aktuální HP
   * @param max Maximální HP
   * @param config Konfigurace HP baru (velikost, font)
   * @param offsetY Offset nad entitou
   */
  createHPBar(
    entityId: EntityId, 
    current: number, 
    max: number, 
    config: HPBarConfig = { width: 64, height: 16, fontSize: 10, showText: true },
    offsetY: number = 2.0
  ): void {
    // Vytvoř canvas v paměti
    const canvas = document.createElement('canvas')
    canvas.width = config.width
    canvas.height = config.height
    
    // Nakresli HP bar na canvas
    this.drawHPBar(canvas, current, max, config)
    
    // Vytvoř texturu z canvasu
    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    
    // Vytvoř sprite material
    const material = new THREE.SpriteMaterial({ 
      map: texture,
      transparent: true,
      depthTest: true,
      depthWrite: false
    })
    
    // Vytvoř sprite
    const sprite = new THREE.Sprite(material)
    
    // Nastav velikost sprite (v jednotkách světa)
    // Větší scale = větší HP bary (lépe viditelné)
    const scale = 0.02 // Zvětšeno z 0.01 pro lepší viditelnost
    sprite.scale.set(config.width * scale, config.height * scale, 1)
    
    // Pozice bude nastavena v updateHPBar
    sprite.position.set(0, 0, 0)
    
    // Přidej do scény
    this.scene.add(sprite)
    
    // Ulož do mapy s offsetY
    this.hpBars.set(entityId, { sprite, config, offsetY })
    
    console.log(`✅ Created HP bar sprite for entity ${entityId} (${config.width}x${config.height}, scale: ${scale})`)
  }
  
  /**
   * Nakreslí HP bar na canvas
   */
  private drawHPBar(canvas: HTMLCanvasElement, current: number, max: number, config: HPBarConfig): void {
    const ctx = canvas.getContext('2d')!
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Vypočítej procento HP
    const percentage = Math.max(0, Math.min(1, current / max))
    
    // Barva podle HP
    let fillColor: string
    if (percentage > 0.6) {
      fillColor = '#10b981' // Zelená
    } else if (percentage > 0.3) {
      fillColor = '#f59e0b' // Žlutá
    } else {
      fillColor = '#ef4444' // Červená
    }
    
    // Pozadí (tmavé)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // Border (světlý)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.lineWidth = 2
    ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2)
    
    // HP fill
    const fillWidth = (canvas.width - 4) * percentage
    ctx.fillStyle = fillColor
    ctx.fillRect(2, 2, fillWidth, canvas.height - 4)
    
    // Text (pokud je povolený)
    if (config.showText) {
      const text = `${Math.floor(current)}/${max}`
      ctx.fillStyle = '#ffffff'
      ctx.font = `bold ${config.fontSize}px Arial`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      
      // Text shadow pro lepší čitelnost
      ctx.shadowColor = 'rgba(0, 0, 0, 1)'
      ctx.shadowBlur = 4
      ctx.shadowOffsetX = 1
      ctx.shadowOffsetY = 1
      
      ctx.fillText(text, canvas.width / 2, canvas.height / 2)
      
      // Reset shadow
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0
    }
  }
  
  /**
   * Aktualizuje HP bar entity
   */
  updateHPBar(entityId: EntityId, current: number, max: number, position: THREE.Vector3): void {
    const hpBarData = this.hpBars.get(entityId)
    if (!hpBarData) {
      console.warn(`HP bar for entity ${entityId} not found`)
      return
    }
    
    const { sprite, config, offsetY } = hpBarData
    
    // Aktualizuj pozici sprite s offsetY
    sprite.position.copy(position)
    sprite.position.y += offsetY
    
    // Překresli canvas s novými hodnotami HP
    const material = sprite.material as THREE.SpriteMaterial
    const texture = material.map as THREE.CanvasTexture
    const canvas = texture.image as HTMLCanvasElement
    
    this.drawHPBar(canvas, current, max, config)
    texture.needsUpdate = true
  }
  
  /**
   * Odstraní HP bar entity
   */
  removeHPBar(entityId: EntityId): void {
    const hpBarData = this.hpBars.get(entityId)
    if (hpBarData) {
      // Odstraň sprite ze scény
      this.scene.remove(hpBarData.sprite)
      
      // Dispose material a texture
      const material = hpBarData.sprite.material as THREE.SpriteMaterial
      if (material.map) {
        material.map.dispose()
      }
      material.dispose()
      
      // Odstraň z mapy
      this.hpBars.delete(entityId)
    }
  }
  
  /**
   * Vyčistí všechny HP bary
   */
  dispose(): void {
    for (const entityId of this.hpBars.keys()) {
      this.removeHPBar(entityId)
    }
    this.hpBars.clear()
  }
}
