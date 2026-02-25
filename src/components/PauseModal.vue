<template>
  <div class="pause-modal">
    <div class="pause-content">
      <h1>⏸️ Pauza</h1>
      
      <!-- Audio controls v pause menu -->
      <div class="pause-audio-controls">
        <AudioControls />
      </div>
      
      <div class="pause-buttons">
        <button @click="onResume" class="pause-btn resume-btn">
          <span class="icon">▶️</span>
          <span class="btn-text">Pokračovat</span>
          <span class="btn-hint">ESC</span>
        </button>
        
        <button @click="onSaveAndExit" class="pause-btn save-btn">
          <span class="icon">💾</span>
          <span class="btn-text">Uložit a Odejít</span>
          <span class="btn-hint">Vrátit se do menu</span>
        </button>
        
        <button @click="onRestart" class="pause-btn restart-btn">
          <span class="icon">🔄</span>
          <span class="btn-text">Restartovat</span>
          <span class="btn-hint">Začít znovu</span>
        </button>
      </div>
      
      <div class="pause-stats">
        <div class="stat">
          <span class="stat-label">Vlna</span>
          <span class="stat-value">{{ stats.wave }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Skóre</span>
          <span class="stat-value">{{ stats.score }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Peníze</span>
          <span class="stat-value">💰 {{ stats.money }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">HP</span>
          <span class="stat-value">❤️ {{ stats.health }}/{{ stats.maxHealth }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AudioControls from './AudioControls.vue'

interface Props {
  stats: {
    wave: number
    score: number
    money: number
    health: number
    maxHealth: number
  }
  onResume: () => void
  onSaveAndExit: () => void
  onRestart: () => void
}

defineProps<Props>()
</script>

<style scoped>
.pause-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1500;
  animation: fadeIn 0.3s;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.pause-content {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  padding: 3rem;
  border-radius: 1.5rem;
  max-width: 500px;
  width: 90%;
  border: 2px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
  animation: slideDown 0.4s;
}

@keyframes slideDown {
  from { 
    opacity: 0;
    transform: translateY(-50px);
  }
  to { 
    opacity: 1;
    transform: translateY(0);
  }
}

.pause-content h1 {
  text-align: center;
  font-size: 2.5rem;
  margin-bottom: 1rem;
  color: #ffffff;
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
}

.pause-audio-controls {
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.pause-buttons {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
}

.pause-btn {
  padding: 1.25rem 2rem;
  border: 2px solid;
  border-radius: 0.75rem;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 1rem;
  position: relative;
}

.btn-text {
  flex: 1;
  text-align: left;
}

.btn-hint {
  font-size: 0.85rem;
  font-weight: 400;
  opacity: 0.7;
}

.icon {
  font-size: 1.5rem;
}

.resume-btn {
  background: linear-gradient(135deg, #2ecc71, #27ae60);
  color: #ffffff;
  border-color: #27ae60;
}

.resume-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 30px rgba(46, 204, 113, 0.4);
  background: linear-gradient(135deg, #27ae60, #229954);
}

.save-btn {
  background: linear-gradient(135deg, #3498db, #2980b9);
  color: #ffffff;
  border-color: #2980b9;
}

.save-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 30px rgba(52, 152, 219, 0.4);
  background: linear-gradient(135deg, #2980b9, #21618c);
}

.restart-btn {
  background: linear-gradient(135deg, #e74c3c, #c0392b);
  color: #ffffff;
  border-color: #c0392b;
}

.restart-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 30px rgba(231, 76, 60, 0.4);
  background: linear-gradient(135deg, #c0392b, #a93226);
}

.pause-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.stat-label {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #ffffff;
}

@media (max-width: 768px) {
  .pause-content {
    padding: 1.5rem 1rem;
    max-width: 95%;
    max-height: 90vh;
    overflow-y: auto;
  }
  
  .pause-content h1 {
    font-size: 1.8rem;
    margin-bottom: 0.75rem;
  }
  
  .pause-audio-controls {
    padding: 0.75rem;
    margin-bottom: 1rem;
  }
  
  .pause-buttons {
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }
  
  .pause-btn {
    padding: 1rem 1.5rem;
    font-size: 1rem;
  }
  
  .btn-text {
    font-size: 1rem;
  }
  
  .btn-hint {
    font-size: 0.75rem;
  }
  
  .icon {
    font-size: 1.25rem;
  }
  
  .pause-stats {
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
    padding: 1rem;
  }
  
  .stat-label {
    font-size: 0.75rem;
  }
  
  .stat-value {
    font-size: 1.1rem;
  }
}

@media (max-width: 480px) {
  .pause-content {
    padding: 1rem 0.75rem;
  }
  
  .pause-content h1 {
    font-size: 1.5rem;
  }
  
  .pause-btn {
    padding: 0.85rem 1.25rem;
    font-size: 0.9rem;
  }
  
  .pause-stats {
    grid-template-columns: 1fr;
  }
}
</style>
