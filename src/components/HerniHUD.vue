<template>
  <div class="hud">
    <!-- Crosshair -->
    <div class="crosshair">
      <div class="crosshair-dot"></div>
    </div>
    
    <!-- Top Left Stats -->
    <div class="stats-panel">
      <div class="stat-item">
        <span class="stat-icon">💰</span>
        <span class="stat-value">{{ store.money }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-icon">⭐</span>
        <span class="stat-value">{{ store.score }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-icon">💀</span>
        <span class="stat-value">{{ store.enemiesKilled }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-icon">🌊</span>
        <span class="stat-value">Vlna {{ store.currentWave }}</span>
      </div>
      <div class="stat-item wave-enemies">
        <span class="stat-icon">👾</span>
        <span class="stat-value">{{ store.enemiesAlive }}</span>
      </div>
      <div class="stat-item" v-if="!store.waveInProgress">
        <span class="stat-icon">⏱️</span>
        <span class="stat-value">{{ Math.ceil(store.waveCountdown) }}s</span>
      </div>
    </div>
    
    <!-- Tower Info Panel (when in build mode) -->
    <div class="tower-info-panel" v-if="store.buildMode">
      <div class="tower-info-header">
        <span class="tower-icon">🏰</span>
        <span class="tower-name">Režim stavby</span>
      </div>
      
      <!-- Current selected tower -->
      <div class="selected-tower">
        <div class="tower-preview">
          <span class="preview-icon">{{ getTowerIcon(store.selectedTowerType) }}</span>
          <span class="preview-name">{{ towerConfig.name }}</span>
        </div>
        <div class="tower-stats">
          <div class="tower-stat">
            <span class="stat-label">Cena:</span>
            <span class="stat-value" :class="{ 'can-afford': store.money >= towerConfig.cost, 'cant-afford': store.money < towerConfig.cost }">
              💰 ${{ towerConfig.cost }}
            </span>
          </div>
          <div class="tower-stat">
            <span class="stat-label">Útok:</span>
            <span class="stat-value">⚔️ {{ towerConfig.damage }}</span>
          </div>
          <div class="tower-stat">
            <span class="stat-label">Rychlost:</span>
            <span class="stat-value">⚡ {{ towerConfig.fireRate }}/s</span>
          </div>
          <div class="tower-stat">
            <span class="stat-label">Dosah:</span>
            <span class="stat-value">🎯 {{ towerConfig.range }}m</span>
          </div>
          <div class="tower-stat" v-if="towerConfig.splashRadius">
            <span class="stat-label">Splash:</span>
            <span class="stat-value">💥 {{ towerConfig.splashRadius }}m</span>
          </div>
        </div>
      </div>
      
      <!-- Tower selection buttons -->
      <div class="tower-selection">
        <div class="selection-hint">Vyber typ věže:</div>
        <div class="tower-buttons">
          <button 
            v-for="(_config, key) in TOWER_CONFIGS" 
            :key="key"
            class="tower-btn"
            :class="{ active: store.selectedTowerType === key }"
            @click="selectTower(key as any)"
          >
            <span class="btn-icon">{{ getTowerIcon(key as any) }}</span>
            <span class="btn-key">{{ getTowerKey(key as any) }}</span>
          </button>
        </div>
      </div>
    </div>
    
    <!-- Bottom Center - Health Bar -->
    <div class="health-panel">
      <div class="health-label">HP</div>
      <div class="health-bar">
        <div 
          class="health-fill" 
          :style="{ width: store.healthPercentage + '%' }"
          :class="{ 
            low: store.healthPercentage < 30,
            medium: store.healthPercentage >= 30 && store.healthPercentage < 60
          }"
        ></div>
      </div>
      <div class="health-text">{{ store.playerHealth }} / {{ store.playerMaxHealth }}</div>
    </div>
    
    <!-- Instructions -->
    <div class="instructions" v-if="showInstructions">
      <!-- Desktop Instructions -->
      <div v-if="!isMobile">
        <p><strong>🎮 Jak hrát:</strong></p>
        <p>📚 Jdi do <strong>knihovny</strong> (velká budova uprostřed)</p>
        <p>❓ Odpověz správně na otázky = 💰 peníze</p>
        <p>🏰 Za peníze stavěj <strong>věže</strong> kolem knihovny</p>
        <p>⚔️ Věže automaticky útočí na nepřátele</p>
        <p>🎯 Střílej sám pro extra zabití!</p>

        <p><strong>Ovládání:</strong></p>
        <p>WASD - Pohyb | Myš - Rozhlédnutí | Esc - pauzové menu</p>
        <p>🖱️ Levé tlačítko - Střelba | Pravé tlačítko - Kvíz (u knihovny)</p>
        <p>B - Build mode | čísla nad WASD - Typ věže | Click - Postav</p>
        <p><small>Stiskni TAB pro skrytí</small></p>
      </div>
      
      <!-- Mobile Instructions -->
      <div v-else>
        <p><strong>🎮 Jak hrát:</strong></p>
        <p>📚 Jdi do <strong>knihovny</strong> (velká budova uprostřed)</p>
        <p>❓ Odpověz správně na otázky = 💰 peníze</p>
        <p>🏰 Za peníze stavěj <strong>věže</strong> kolem knihovny</p>
        <p>⚔️ Věže automaticky útočí na nepřátele</p>
        <p>🎯 Střílej sám pro extra zabití!</p>
        <p><small>Klikni pro zavření</small></p>
      </div>
    </div>
    
    <!-- Mobile Instructions Toggle Button -->
    <button 
      v-if="isMobile" 
      class="instructions-toggle-mobile"
      @click="showInstructions = !showInstructions"
    >
      {{ showInstructions ? '❌' : '❓' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useGameStore } from '../stores/game'

const store = useGameStore()
const showInstructions = ref(true)
const isMobile = ref(false)

// Tower configs matching TowerSystem
const TOWER_CONFIGS: Record<string, {
  name: string
  cost: number
  damage: number
  fireRate: number
  range: number
  color: number
  splashRadius?: number
}> = {
  basic: {
    name: '🏹 Basic',
    cost: 50,
    damage: 10,
    fireRate: 1,
    range: 15,
    color: 0x4a90e2
  },
  rapid: {
    name: '⚡ Rapid',
    cost: 100,
    damage: 5,
    fireRate: 5,
    range: 12,
    color: 0x27ae60
  },
  heavy: {
    name: '💥 Heavy',
    cost: 150,
    damage: 50,
    fireRate: 0.5,
    range: 20,
    color: 0xe74c3c
  },
  sniper: {
    name: '🎯 Sniper',
    cost: 200,
    damage: 100,
    fireRate: 0.3,
    range: 30,
    color: 0x2ecc71
  },
  splash: {
    name: '💣 Splash',
    cost: 250,
    damage: 30,
    fireRate: 0.8,
    range: 18,
    color: 0xf39c12,
    splashRadius: 5
  }
}

type TowerConfigType = {
  name: string
  cost: number
  damage: number
  fireRate: number
  range: number
  color: number
  splashRadius?: number
}

const towerConfig = computed<TowerConfigType>(() => {
  return TOWER_CONFIGS[store.selectedTowerType] as TowerConfigType
})

const getTowerIcon = (type: string): string => {
  const icons: Record<string, string> = {
    basic: '🏹',
    rapid: '⚡',
    heavy: '💥',
    sniper: '🎯',
    splash: '💣'
  }
  return icons[type] || '🏰'
}

const getTowerKey = (type: string): string => {
  const keys: Record<string, string> = {
    basic: '1',
    rapid: '2',
    heavy: '3',
    sniper: '4',
    splash: '5'
  }
  return keys[type] || '?'
}

const selectTower = (type: 'basic' | 'rapid' | 'heavy' | 'sniper' | 'splash') => {
  // Dispatch keyboard event to trigger tower selection in TowerSystem
  const event = new KeyboardEvent('keydown', {
    code: `Digit${getTowerKey(type)}`,
    key: getTowerKey(type)
  })
  document.dispatchEvent(event)
}

onMounted(() => {
  // Detect mobile
  isMobile.value = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || window.innerWidth < 768
  
  // Keyboard controls only for desktop
  if (!isMobile.value) {
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Tab') {
        e.preventDefault()
        showInstructions.value = !showInstructions.value
      }
    })
  }
})
</script>

<style scoped>
.hud {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 100;
}

.hud > * {
  pointer-events: auto;
}

.crosshair {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.crosshair-dot {
  width: 4px;
  height: 4px;
  background: white;
  border: 2px solid black;
  border-radius: 50%;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.8);
}

.crosshair::before,
.crosshair::after {
  content: '';
  position: absolute;
  background: white;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.8);
}

.crosshair::before {
  width: 20px;
  height: 2px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.crosshair::after {
  width: 2px;
  height: 20px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.stats-panel {
  position: absolute;
  top: 1rem;
  left: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  background: rgba(15, 23, 42, 0.8);
  padding: 1rem;
  border-radius: 0.5rem;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.tower-info-panel {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  left: 1rem;
  background: rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(10px);
  padding: 1rem;
  border-radius: 0.5rem;
  border: 2px solid rgba(74, 144, 226, 0.5);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  min-width: 220px;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-50%) translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(-50%) translateX(0);
  }
}

.tower-info-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.tower-icon {
  font-size: 24px;
}

.tower-name {
  color: white;
  font-weight: bold;
  font-size: 16px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
}

.tower-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tower-stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
  font-size: 14px;
}

.tower-stat .stat-label {
  color: rgba(255, 255, 255, 0.7);
}

.tower-stat .stat-value {
  font-weight: 600;
}

.can-afford {
  color: #2ecc71 !important;
  font-weight: bold;
}

.cant-afford {
  color: #e74c3c !important;
  font-weight: bold;
}

.tower-hint {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
}

.selected-tower {
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.tower-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
}

.preview-icon {
  font-size: 28px;
}

.preview-name {
  color: white;
  font-weight: bold;
  font-size: 14px;
}

.tower-selection {
  margin-top: 1rem;
}

.selection-hint {
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  margin-bottom: 8px;
  text-align: center;
}

.tower-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.tower-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 4px;
  background: rgba(30, 41, 59, 0.6);
  border: 2px solid rgba(148, 163, 184, 0.3);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.tower-btn:hover {
  background: rgba(51, 65, 85, 0.8);
  border-color: rgba(74, 144, 226, 0.6);
  transform: translateY(-2px);
}

.tower-btn.active {
  background: rgba(74, 144, 226, 0.4);
  border-color: rgba(74, 144, 226, 1);
  box-shadow: 0 0 10px rgba(74, 144, 226, 0.5);
}

.btn-icon {
  font-size: 24px;
  margin-bottom: 2px;
}

.btn-key {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 600;
}


.stat-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: Arial, sans-serif;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
}

.stat-icon {
  font-size: 1.2rem;
}

.stat-value {
  font-weight: 600;
  font-size: 1rem;
}

.health-panel {
  position: absolute;
  bottom: 0.3rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(15, 23, 42, 0.9);
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  backdrop-filter: blur(10px);
  border: 2px solid rgba(59, 130, 246, 0.4);
}

.health-label {
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
}

.health-bar {
  width: 200px;
  height: 20px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.health-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #34d399);
  transition: width 0.3s, background 0.3s;
}

.health-fill.medium {
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
}

.health-fill.low {
  background: linear-gradient(90deg, #ef4444, #f87171);
  animation: pulse-health 1s infinite;
}

@keyframes pulse-health {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.health-text {
  color: white;
  font-weight: 600;
  font-size: 0.9rem;
  min-width: 80px;
  text-align: right;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
}

.wave-panel {
  position: absolute;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(10px);
  padding: 1rem 1.5rem;
  border-radius: 0.5rem;
  border: 2px solid rgba(59, 130, 246, 0.4);
  min-width: 300px;
  text-align: center;
}

.wave-title {
  font-size: 1.2rem;
  font-weight: bold;
  color: white;
  margin-bottom: 0.5rem;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
}

.wave-info {
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.95rem;
}

.wave-countdown {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: center;
}

.start-wave-btn {
  margin-top: 0.5rem;
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 0.375rem;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  pointer-events: auto;
}

.start-wave-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.4);
}

.start-wave-btn:active {
  transform: translateY(0);
}

.wave-progress {
  font-weight: 600;
}


.instructions {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(15, 23, 42, 0.9);
  padding: 1rem;
  border-radius: 0.5rem;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(59, 130, 246, 0.3);
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
}

.instructions p {
  margin: 0.25rem 0;
  font-size: 0.9rem;
}

.instructions strong {
  color: var(--accent);
}

.instructions small {
  color: var(--text-secondary);
}

.instructions-toggle-mobile {
  position: absolute;
  top: 5rem; /* Posunuto níž z 1rem, aby nepřekrývalo audio controls */
  right: 1.1rem;
  width: 30px;
  height: 30px;
  background: rgba(15, 23, 42, 0.9);
  border: 2px solid rgba(59, 130, 246, 0.5);
  border-radius: 50%;
  color: white;
  font-size: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  z-index: 200;
}

.instructions-toggle-mobile:active {
  transform: scale(0.95);
}

@media (max-width: 768px) {
  .crosshair {
    display: none;
  }
  
  .stats-panel {
    font-size: 0.85rem;
    padding: 0.75rem;
    top: 0.75rem;
    left: 0.75rem;
  }
  
  .stat-icon {
    font-size: 1rem;
  }
  
  .health-panel {
    bottom: 0.5rem; /* Úplně dole pod joysticky */
    padding: 0.5rem 1rem;
    left: 50%;
    transform: translateX(-50%);
    right: auto;
  }
  
  .health-bar {
    width: 150px;
  }
  
  .instructions {
    top: 100px; /* Víc dolů - pod build controls */
    right: 0.75rem;
    max-width: 280px;
    font-size: 0.85rem;
  }
  
  .tower-info-panel {
    display: none;
  }
}
</style>
