<template>
  <div class="game-over-modal">
    <div class="game-over-content">
      <h1 class="game-over-title">💀 GAME OVER</h1>
      
      <div class="game-over-reason">
        {{ reason }}
      </div>
      
      <div class="game-over-stats">
        <div class="final-stat">
          <span class="stat-label">🌊 Vlna:</span>
          <span class="stat-value">{{ stats.wave }}</span>
        </div>
        <div class="final-stat">
          <span class="stat-label">⭐ Skóre:</span>
          <span class="stat-value">{{ stats.score }}</span>
        </div>
        <div class="final-stat">
          <span class="stat-label">💀 Zabito:</span>
          <span class="stat-value">{{ stats.kills }}</span>
        </div>
        <div class="final-stat">
          <span class="stat-label">💰 Peníze:</span>
          <span class="stat-value">${{ stats.money }}</span>
        </div>
      </div>
      
      <div class="game-over-buttons">
        <button @click="onRestart" class="restart-btn">
          🔄 Restart
        </button>
        <button @click="onMenu" class="menu-btn">
          🏠 Hlavní Menu
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  reason: string
  stats: {
    wave: number
    score: number
    kills: number
    money: number
  }
  onRestart: () => void
  onMenu: () => void
}

defineProps<Props>()
</script>

<style scoped>
.game-over-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.5s;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.game-over-content {
  background: var(--bg-card);
  padding: 3rem;
  border-radius: 1.5rem;
  max-width: 500px;
  width: 90%;
  border: 3px solid #ff0000;
  box-shadow: 0 0 40px rgba(255, 0, 0, 0.5);
  animation: slideDown 0.5s;
  text-align: center;
}

@keyframes slideDown {
  from { 
    opacity: 0;
    transform: translateY(-100px);
  }
  to { 
    opacity: 1;
    transform: translateY(0);
  }
}

.game-over-title {
  font-size: 3rem;
  margin-bottom: 1rem;
  color: #ff0000;
  text-shadow: 0 0 20px rgba(255, 0, 0, 0.8);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.game-over-reason {
  font-size: 1.25rem;
  margin-bottom: 2rem;
  color: #b0b0b0;
  font-weight: 500;
}

.game-over-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: rgba(40, 40, 50, 0.8);
  border-radius: 0.75rem;
}

.final-stat {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stat-label {
  font-size: 0.9rem;
  color: #a0a0a0;
  font-weight: 500;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: bold;
  color: #00bfff;
}

.game-over-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.restart-btn,
.menu-btn {
  padding: 1rem 2rem;
  font-size: 1.1rem;
  font-weight: bold;
  border: none;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  color: white;
}

.restart-btn {
  background: linear-gradient(135deg, var(--accent) 0%, #00d4ff 100%);
  flex: 1;
}

.restart-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 5px 20px rgba(0, 191, 255, 0.5);
}

.menu-btn {
  background: var(--bg-dark);
  border: 2px solid var(--accent);
}

.menu-btn:hover {
  background: var(--accent);
  color: white;
  transform: scale(1.05);
}
</style>
