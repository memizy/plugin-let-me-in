<template>
  <div class="mobile-controls" v-if="isMobile">
    <!-- Crosshair -->
    <div class="mobile-crosshair">
      <div class="crosshair-dot"></div>
    </div>
    
    <!-- Movement Joystick (Left) -->
    <div class="joystick-container left-joystick" ref="moveJoystickContainer">
      <div class="joystick-base">
        <div 
          class="joystick-stick" 
          ref="moveJoystickStick"
          :style="{ transform: `translate(-50%, -50%) translate(${moveStick.x}px, ${moveStick.y}px)` }"
        ></div>
      </div>
      <div class="joystick-label">🚶 Pohyb</div>
    </div>

    <!-- Look Joystick (Right) - OMEZENÉ VERTIKÁLNÍ -->
    <div class="joystick-container right-joystick" ref="lookJoystickContainer">
      <div class="joystick-base">
        <div 
          class="joystick-stick" 
          ref="lookJoystickStick"
          :style="{ transform: `translate(-50%, -50%) translate(${lookStick.x}px, ${lookStick.y}px)` }"
        ></div>
      </div>
      <div class="joystick-label">👁️ Otáčení</div>
    </div>

    <!-- Action Buttons (Left side, above move joystick) -->
    <div class="action-buttons">
      <button 
        v-if="!store.buildMode"
        class="action-btn shoot-btn" 
        @touchstart.prevent="handleShootStart($event)"
        @touchend.prevent="handleShootEnd"
        @mousedown.prevent="handleShootStart($event)"
        @mouseup.prevent="handleShootEnd"
      >
        🔫 Střelba
      </button>
      <button 
        v-else
        class="action-btn place-btn" 
        @touchstart.prevent="placeTower($event)"
      >
        🏰 Postav
      </button>
    </div>
    
    <!-- Quiz button (Right side) -->
    <button 
      class="quiz-btn-mobile"
      @touchstart.prevent="openQuiz($event)"
      @click="openQuiz($event)"
    >
      📚 Otázky
    </button>

    <!-- Build Mode Toggle (separate container) -->
    <div class="build-container">
      <button 
        class="build-toggle-btn" 
        :class="{ active: store.buildMode }"
        @touchstart.prevent="toggleBuildMode($event)"
        @click="toggleBuildMode($event)"
      >
        {{ store.buildMode ? '❌ Zrušit' : '🏗️ Build' }}
      </button>

      <!-- Two-column tower grid shown under build button when active -->
      <div class="tower-selector grid" v-if="store.buildMode">
        <button 
          v-for="(config, type) in towerConfigs" 
          :key="type"
          class="tower-select-btn"
          :class="{ 
            selected: store.selectedTowerType === type,
            disabled: store.money < config.cost 
          }"
          @click="selectTowerType(type)"
        >
          <div class="tower-icon">{{ getTowerEmoji(type) }}</div>
          <div class="tower-cost">💰{{ config.cost }}</div>
        </button>
      </div>
    </div>

    <!-- Menu button (separate container, smaller) -->
    <div class="menu-container">
      <button 
        class="menu-btn-mobile small"
        @touchstart.prevent="openMenu($event)"
        @click="openMenu($event)"
        aria-label="Open menu"
      >
        ⏸
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useGameStore } from '../stores/game'

const store = useGameStore()

// Detect mobile
const isMobile = ref(false)

// Joystick refs
const moveJoystickContainer = ref<HTMLElement | null>(null)
const moveJoystickStick = ref<HTMLElement | null>(null)
const lookJoystickContainer = ref<HTMLElement | null>(null)
const lookJoystickStick = ref<HTMLElement | null>(null)

// Joystick state
const moveStick = ref({ x: 0, y: 0 })
const lookStick = ref({ x: 0, y: 0 })
const moveTouchId = ref<number | null>(null)
const lookTouchId = ref<number | null>(null)

// Shooting state
const isShooting = ref(false)

// Tower configs for mobile UI
const towerConfigs = {
  basic: { cost: 50, damage: 10, fireRate: 1, range: 15 },
  rapid: { cost: 100, damage: 5, fireRate: 5, range: 12 },
  heavy: { cost: 150, damage: 50, fireRate: 0.5, range: 20 },
  sniper: { cost: 200, damage: 100, fireRate: 0.3, range: 30 },
  splash: { cost: 250, damage: 30, fireRate: 0.8, range: 18 }
}

// Mobile input values (exposed to Game.ts via custom events)
const mobileInput = ref({
  moveX: 0,
  moveY: 0,
  lookX: 0,
  lookY: 0, // BUDE SE POUŽÍVAT - ale omezené rozsahem
  jump: false,
  shoot: false
})

// Sensitivity multiplier for look joystick (higher = more sensitive)
const lookSensitivity = 1.8 // Optimalizováno pro dobrou kontrolu

// Active touch tracking (pro prevenci konfliktů mezi joysticky)
const activeTouches = new Map<number, 'move' | 'look'>()

const getTowerEmoji = (type: string) => {
  const emojis: Record<string, string> = {
    basic: '🏹',
    rapid: '⚡',
    heavy: '💥',
    sniper: '🎯',
    splash: '💣'
  }
  return emojis[type] || '🏰'
}

const toggleBuildMode = (e?: Event) => {
  if (e) e.stopPropagation()
  // Dispatch event to Game.ts to toggle build mode in TowerSystem
  // This ensures ghost tower is created/destroyed properly
  dispatchMobileEvent('toggleBuildMode')
}

const selectTowerType = (type: string) => {
  const config = towerConfigs[type as keyof typeof towerConfigs]
  if (store.money >= config.cost) {
    // Dispatch to Game.ts so TowerSystem can update ghost tower
    dispatchMobileEvent('selectTowerType', { type })
  }
}

const placeTower = (e?: Event) => {
  if (e) e.stopPropagation() // 👈 OPRAVA: Zastaví propagaci na joystick
  dispatchMobileEvent('placeTower')
}

const openQuiz = (e?: Event) => {
  if (e) e.stopPropagation() // 👈 OPRAVA: Zastaví propagaci
  // Dispatch event to GameView to open quiz modal
  dispatchMobileEvent('openQuiz')
}

const openMenu = (e?: Event) => {
  if (e) e.stopPropagation() // 👈 OPRAVA: Zastaví propagaci
  // Dispatch event to GameView to open pause menu
  dispatchMobileEvent('openMenu')
}

const handleShootStart = (e?: Event) => {
  if (e) e.stopPropagation() // 👈 OPRAVA: Zastaví propagaci na joystick
  isShooting.value = true
  mobileInput.value.shoot = true
  dispatchMobileEvent('shoot', { start: true })
}

const handleShootEnd = () => {
  isShooting.value = false
  mobileInput.value.shoot = false
  dispatchMobileEvent('shoot', { start: false })
}

const dispatchMobileEvent = (type: string, data?: any) => {
  window.dispatchEvent(new CustomEvent('mobileControl', {
    detail: { type, data, input: mobileInput.value }
  }))
}

// Universal pointer event handler - works with both touch and mouse
const setupPointerEvents = (
  container: HTMLElement,
  stick: { x: number; y: number },
  touchId: { value: number | null },
  type: 'move' | 'look'
) => {
  console.log(`📱 Setting up ${type} pointer events (touch + mouse)`)
  let isPointerDown = false

  const getPointerPosition = (clientX: number, clientY: number) => {
    const rect = container.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    const deltaX = clientX - centerX
    const deltaY = clientY - centerY
    
    // Limit to joystick radius (50px)
    const maxRadius = 50
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const angle = Math.atan2(deltaY, deltaX)
    
    const limitedDistance = Math.min(distance, maxRadius)
    const limitedX = Math.cos(angle) * limitedDistance
    const limitedY = Math.sin(angle) * limitedDistance
    
    stick.x = limitedX
    stick.y = limitedY
    
    // Normalize to -1 to 1
    let normalizedX = limitedX / maxRadius
    let normalizedY = limitedY / maxRadius
    
    if (type === 'look') {
      // Look joystick: 70% vertikální citlivost
      normalizedY = normalizedY * 0.7
      
      mobileInput.value.lookX = normalizedX * lookSensitivity
      mobileInput.value.lookY = normalizedY * lookSensitivity
    } else {
      // Move joystick: normální
      mobileInput.value.moveX = normalizedX
      mobileInput.value.moveY = normalizedY
    }
    
    dispatchMobileEvent('joystick', { type, x: normalizedX, y: normalizedY })
  }
  
  // Check if touch started near this joystick (activation radius)
  const isTouchNearJoystick = (clientX: number, clientY: number): boolean => {
    const rect = container.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    const deltaX = clientX - centerX
    const deltaY = clientY - centerY
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    
    // Activation radius: 120px (větší než joystick, ale ne celá obrazovka)
    // Toto zajistí že touchy daleko od joysticku (např. tlačítko střelby) se ignorují
    const activationRadius = 120
    return distance <= activationRadius
  }

  const handleTouchStart = (e: TouchEvent) => {
    e.preventDefault()
    e.stopPropagation() // ⚠️ CRITICAL: Zastaví propagaci pro tento joystick
    
    // Tento joystick už je ovládán jedním prstem, ignoruj další dotyky na něm
    if (isPointerDown) return
    
    // 🏆 OPRAVA MULTI-TOUCH: Projdi VŠECHNY *nové* dotyky (ne jen e.touches[0])
    // e.changedTouches obsahuje prsty, které se *právě teď* dotkly obrazovky
    for (const touch of Array.from(e.changedTouches)) {
      
      // Zkontroluj, jestli je tento nový dotyk blízko našeho joysticku
      if (!isTouchNearJoystick(touch.clientX, touch.clientY)) {
        continue // Tento dotyk je moc daleko, zkusíme další, jestli nějaký je
      }
      
      // Zkontroluj, jestli si tento dotyk už "nevlastní" jiný joystick
      // (To by se nemělo stát díky stopPropagation, ale je to pojistka)
      if (activeTouches.has(touch.identifier)) {
        continue
      }

      // 🏆 Našli jsme náš prst!
      // Je to nový dotyk, je blízko a není obsazený.
      
      touchId.value = touch.identifier
      activeTouches.set(touch.identifier, type)
      isPointerDown = true
      
      console.log(`📱 ${type} touch started:`, touch.identifier)
      getPointerPosition(touch.clientX, touch.clientY)
      
      // Našli jsme dotyk pro tento joystick, končíme smyčku
      // (Nepotřebujeme hledat další prsty v tomto jednom eventu)
      break
    }
  }

  const handleTouchMove = (e: TouchEvent) => {
    e.preventDefault()
    e.stopPropagation() // ⚠️ CRITICAL: Zastaví propagaci
    
    if (!isPointerDown || touchId.value === null) return
    
    // Najdi náš touch
    const touch = Array.from(e.touches).find(t => t.identifier === touchId.value)
    if (!touch) return
    
    getPointerPosition(touch.clientX, touch.clientY)
  }

  const handleTouchEnd = (e: TouchEvent) => {
    e.preventDefault()
    e.stopPropagation() // ⚠️ CRITICAL: Zastaví propagaci
    
    if (!isPointerDown) return
    
    // Check if our touch ended
    const touchEnded = Array.from(e.changedTouches).some(t => t.identifier === touchId.value)
    if (!touchEnded) return
    
    // Cleanup
    if (touchId.value !== null) {
      activeTouches.delete(touchId.value)
    }
    touchId.value = null
    isPointerDown = false
    
    stick.x = 0
    stick.y = 0
    
    if (type === 'move') {
      mobileInput.value.moveX = 0
      mobileInput.value.moveY = 0
    } else {
      mobileInput.value.lookX = 0
      mobileInput.value.lookY = 0
    }
    
    dispatchMobileEvent('joystick', { type, x: 0, y: 0 })
    console.log(`📱 ${type} touch ended`)
  }

  const handleMouseDown = (e: MouseEvent) => {
    e.preventDefault()
    if (isPointerDown) return
    
    isPointerDown = true
    console.log(`📱 ${type} mouse down`)
    getPointerPosition(e.clientX, e.clientY)
  }

  const handleMouseMove = (e: MouseEvent) => {
    e.preventDefault()
    if (!isPointerDown) return
    getPointerPosition(e.clientX, e.clientY)
  }

  const handleMouseUp = () => {
    if (!isPointerDown) return
    
    isPointerDown = false
    stick.x = 0
    stick.y = 0
    
    if (type === 'move') {
      mobileInput.value.moveX = 0
      mobileInput.value.moveY = 0
    } else {
      mobileInput.value.lookX = 0
      mobileInput.value.lookY = 0
    }
    
    dispatchMobileEvent('joystick', { type, x: 0, y: 0 })
    console.log(`📱 ${type} mouse ended`)
  }

  // Register events - VŠECHNY na container (ne na document!)
  // Touch events
  container.addEventListener('touchstart', handleTouchStart, { passive: false })
  container.addEventListener('touchmove', handleTouchMove, { passive: false })
  container.addEventListener('touchend', handleTouchEnd, { passive: false })
  container.addEventListener('touchcancel', handleTouchEnd, { passive: false })
  
  // Mouse events for PC emulation
  container.addEventListener('mousedown', handleMouseDown, { passive: false })
  container.addEventListener('mousemove', handleMouseMove, { passive: false })
  container.addEventListener('mouseup', handleMouseUp, { passive: false })
  container.addEventListener('mouseleave', handleMouseUp, { passive: false })
}

onMounted(() => {
  // Detect if mobile device
  isMobile.value = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || window.innerWidth < 768
  
  console.log('📱 MobileControls mounted. isMobile:', isMobile.value)
  
  if (isMobile.value) {
    // ⚠️ CRITICAL FIX: Use nextTick to wait for Vue to render v-if="isMobile" elements
    nextTick(() => {
      console.log('📱 nextTick: DOM should be ready now')
      
      // Prevent page scrolling and zooming on mobile (game mode)
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
      document.body.style.height = '100%'
      document.body.style.touchAction = 'none'
      
      console.log('📱 Mobile game mode styles applied')
      
      // Prevent default touch behaviors
      document.addEventListener('touchmove', (e) => {
        e.preventDefault()
      }, { passive: false })
      
      // Prevent pinch zoom
      document.addEventListener('gesturestart', (e) => {
        e.preventDefault()
      })
      
      document.addEventListener('gesturechange', (e) => {
        e.preventDefault()
      })
      
      document.addEventListener('gestureend', (e) => {
        e.preventDefault()
      })
      
      console.log('📱 Touch event listeners added')
      
      // NOW the joystick containers should exist in DOM
      if (moveJoystickContainer.value && lookJoystickContainer.value) {
        console.log('📱 ✅ Joystick containers found, setting up...')
        console.log('📱 Move container:', moveJoystickContainer.value)
        console.log('📱 Look container:', lookJoystickContainer.value)
        
        setupPointerEvents(moveJoystickContainer.value, moveStick.value, moveTouchId, 'move')
        setupPointerEvents(lookJoystickContainer.value, lookStick.value, lookTouchId, 'look')
        console.log('📱 🎮 Joysticks set up successfully!')
      } else {
        console.error('❌ Joystick containers not found even after nextTick!')
        console.error('moveJoystickContainer:', moveJoystickContainer.value)
        console.error('lookJoystickContainer:', lookJoystickContainer.value)
      }
      
      // Notify game that mobile controls are ready
      dispatchMobileEvent('ready')
      console.log('📱 Mobile controls ready event dispatched')
    })
  }
})

onUnmounted(() => {
  // Cleanup mobile game mode styles
  if (isMobile.value) {
    document.body.style.overflow = ''
    document.body.style.position = ''
    document.body.style.width = ''
    document.body.style.height = ''
    document.body.style.touchAction = ''
  }
})
</script>

<style scoped>
.mobile-controls {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 150;
}

.mobile-crosshair {
  position: absolute;
  top: 54%; /* To kam se opravdu míří na mobilu je to potřeba nechat takto trochu níž
   než je prostředek jinak je křížek moc vysoko a střílí se pod něj 54% je ideální */
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 160;
}

.mobile-crosshair .crosshair-dot {
  width: 6px;
  height: 6px;
  background: rgba(255, 255, 255, 0.9);
  border: 2px solid rgba(0, 0, 0, 0.8);
  border-radius: 50%;
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.9), 0 0 12px rgba(255, 255, 255, 0.5);
}

.mobile-crosshair::before,
.mobile-crosshair::after {
  content: '';
  position: absolute;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.9);
}

.mobile-crosshair::before {
  width: 24px;
  height: 2px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.mobile-crosshair::after {
  width: 2px;
  height: 24px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.joystick-container {
  position: absolute;
  pointer-events: auto;
}

.left-joystick {
  /* Raised so it doesn't overlap the bottom HP bar */
  bottom: 3.5rem;
  left: 2rem;
}

.right-joystick {
  /* Raised so it doesn't overlap the bottom HP bar */
  bottom: 3.5rem;
  right: 2rem;
}

.joystick-base {
  width: 120px;
  height: 120px;
  background: rgba(255, 255, 255, 0.1);
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  position: relative;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

.joystick-stick {
  width: 50px;
  height: 50px;
  background: rgba(59, 130, 246, 0.7);
  border: 3px solid rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  position: absolute;
  top: 50%;
  left: 50%;
  /* Transform je nyní v inline style - obsahuje translate(-50%, -50%) + offset */
  transition: background 0.1s;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
}

.joystick-label {
  text-align: center;
  color: white;
  font-size: 0.8rem;
  margin-top: 0.5rem;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
  font-weight: 600;
}

.action-buttons {
  position: absolute;
  /* Move action buttons further above the joysticks to avoid overlap */
  bottom: 13rem;
  left: 1.5rem; /* Vlevo nad levým joystickem */
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  pointer-events: auto;
}

.quiz-btn-mobile {
  position: absolute;
  /* Move quiz button above joysticks like action buttons */
  bottom: 13rem; /* Stejná výška jako action buttons */
  right: 1.5rem; /* Vpravo nad pravým joystickem */
  padding: 1rem 1.5rem;
  background: rgba(168, 85, 247, 0.8);
  border: 3px solid rgba(255, 255, 255, 0.4);
  border-radius: 12px;
  color: white;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
  transition: all 0.2s;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
  min-width: 120px;
  pointer-events: auto;
}

.quiz-btn-mobile:active {
  background: rgba(126, 34, 206, 0.9);
  transform: scale(0.95);
}

.help-btn-mobile {
  position: absolute;
  top: 6rem; /* Více dolů - pod nápovědu */
  right: 1rem;
  width: 50px;
  height: 50px;
  background: rgba(59, 130, 246, 0.8);
  border: 3px solid rgba(255, 255, 255, 0.4);
  border-radius: 50%;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
}

.help-btn-mobile:active {
  background: rgba(29, 78, 216, 0.9);
  transform: scale(0.95);
}

.action-btn {
  padding: 1rem 1.5rem;
  background: rgba(59, 130, 246, 0.8);
  border: 3px solid rgba(255, 255, 255, 0.4);
  border-radius: 12px;
  color: white;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
  transition: all 0.2s;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
  min-width: 120px;
}

.action-btn:active {
  background: rgba(29, 78, 216, 0.9);
  transform: scale(0.95);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
}

.shoot-btn {
  background: rgba(239, 68, 68, 0.8);
}

.shoot-btn:active {
  background: rgba(185, 28, 28, 0.9);
}

.place-btn {
  background: rgba(34, 197, 94, 0.8);
}

.place-btn:active {
  background: rgba(21, 128, 61, 0.9);
}

.build-controls {
  position: absolute;
  top: 1rem;
  left: 4rem; /* Nastaví levý okraj na střed stránky */
  display: flex;
  flex-direction: column;
  align-items: flex-end; /* Zarovnat doprava */
  gap: 0.75rem;
  pointer-events: auto;
}

.build-toggle-btn,
.menu-btn-mobile {
  padding: 0.75rem 1.5rem;
  background: rgba(147, 51, 234, 0.8);
  border: 3px solid rgba(255, 255, 255, 0.4);
  border-radius: 12px;
  color: white;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
  transition: all 0.2s;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
}

.menu-btn-mobile {
  background: rgba(59, 130, 246, 0.8);
}

.build-toggle-btn.active {
  background: rgba(220, 38, 38, 0.8);
}

.build-toggle-btn:active,
.menu-btn-mobile:active {
  transform: scale(0.95);
}

.tower-selector {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
  max-width: 90vw;
}

.tower-selector.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
  width: min(160px, 90vw);
  justify-items: center;
}

.build-container {
  position: absolute;
  top: 1rem;
  
  /* 🟢 Tady je oprava (stejná jako minule): */
  left: 50%;
  transform: translateX(-40%);
  
  display: flex;
  flex-direction: column;
  /* Doporučuji změnit 'flex-end' (doprava) na 'center', 
    aby se tlačítko i mřížka věží zarovnaly na střed.
  */
  align-items: center; 
  gap: 0.5rem;
  pointer-events: auto;
}

.menu-container {
  position: absolute;
  top: 1rem;
  /* Move menu slightly left from the build button */
  right: 1rem;
  pointer-events: auto;
}

.menu-btn-mobile.small {
  padding: 0.45rem 0.6rem;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  font-size: 1.05rem;
  min-width: unset;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tower-select-btn {
  width: 70px;
  height: 70px;
  background: rgba(255, 255, 255, 0.1);
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  backdrop-filter: blur(10px);
  transition: all 0.2s;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
}

.tower-select-btn.selected {
  border-color: rgba(59, 130, 246, 1);
  background: rgba(59, 130, 246, 0.3);
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
}

.tower-select-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tower-select-btn:not(.disabled):active {
  transform: scale(0.95);
}

.tower-icon {
  font-size: 1.5rem;
  margin-bottom: 0.25rem;
}

.tower-cost {
  font-size: 0.7rem;
  color: white;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
}

/* Hide on desktop */
@media (min-width: 768px) {
  .mobile-controls {
    display: none;
  }
}
</style>
