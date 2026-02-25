<template>
  <div class="game-won-modal">
    <div class="won-content">
      <div class="won-header">
        <h1>🎉 Gratulujeme! 🎉</h1>
        <p class="won-subtitle">Zvládli jste všechny otázky na 100%!</p>
      </div>
      
      <div class="won-stats">
        <div class="stat-item">
          <div class="stat-icon">📚</div>
          <div class="stat-label">Znalosti</div>
          <div class="stat-value">100%</div>
        </div>
        <div class="stat-item">
          <div class="stat-icon">🏆</div>
          <div class="stat-label">Vlna</div>
          <div class="stat-value">{{ stats.wave }}</div>
        </div>
        <div class="stat-item">
          <div class="stat-icon">💰</div>
          <div class="stat-label">Peníze</div>
          <div class="stat-value">{{ stats.money }}</div>
        </div>
        <div class="stat-item">
          <div class="stat-icon">⭐</div>
          <div class="stat-label">Skóre</div>
          <div class="stat-value">{{ stats.score }}</div>
        </div>
      </div>
      
      <div class="won-message">
        <p>🎓 Nyní můžete:</p>
        <ul>
          <li>Pokračovat ve hře s resetovaným progressem otázek</li>
          <li>Uložit hru a nahrát nové otázky v menu</li>
        </ul>
      </div>
      
      <div class="won-actions">
        <button @click="onContinue" class="continue-btn">
          🔄 Pokračovat ve hře
          <span class="btn-subtitle">Reset progress otázek</span>
        </button>
        <button @click="onSaveAndExit" class="save-exit-btn">
          💾 Uložit a Odejít
          <span class="btn-subtitle">Nahrát nové otázky</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  stats: {
    wave: number
    score: number
    money: number
  }
  onContinue: () => void
  onSaveAndExit: () => void
}

defineProps<Props>()
</script>

<style scoped>
.game-won-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(8px);
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

.won-content {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  padding: 3rem;
  border-radius: 1.5rem;
  max-width: 600px;
  width: 90%;
  border: 3px solid #2ecc71;
  box-shadow: 0 20px 80px rgba(46, 204, 113, 0.5), 0 0 40px rgba(46, 204, 113, 0.3);
  animation: slideUp 0.6s;
}

@keyframes slideUp {
  from { 
    opacity: 0;
    transform: translateY(100px) scale(0.9);
  }
  to { 
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.won-header {
  text-align: center;
  margin-bottom: 2rem;
}

.won-header h1 {
  font-size: 3rem;
  color: #2ecc71;
  margin-bottom: 0.5rem;
  text-shadow: 0 0 20px rgba(46, 204, 113, 0.6);
  animation: glow 2s infinite;
}

@keyframes glow {
  0%, 100% { text-shadow: 0 0 20px rgba(46, 204, 113, 0.6); }
  50% { text-shadow: 0 0 30px rgba(46, 204, 113, 0.9), 0 0 40px rgba(46, 204, 113, 0.6); }
}

.won-subtitle {
  font-size: 1.25rem;
  color: #ffffff;
  font-weight: 600;
}

.won-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin: 2rem 0;
}

.stat-item {
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(46, 204, 113, 0.3);
  border-radius: 0.75rem;
  padding: 1rem;
  text-align: center;
  transition: all 0.3s;
}

.stat-item:hover {
  transform: translateY(-5px);
  border-color: #2ecc71;
  box-shadow: 0 5px 20px rgba(46, 204, 113, 0.3);
}

.stat-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #2ecc71;
}

.won-message {
  background: rgba(46, 204, 113, 0.1);
  border: 2px solid rgba(46, 204, 113, 0.3);
  border-radius: 0.75rem;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.won-message p {
  font-size: 1.1rem;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 1rem;
}

.won-message ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.won-message li {
  color: rgba(255, 255, 255, 0.9);
  padding: 0.5rem 0;
  padding-left: 1.5rem;
  position: relative;
}

.won-message li:before {
  content: '✓';
  position: absolute;
  left: 0;
  color: #2ecc71;
  font-weight: 700;
}

.won-actions {
  display: flex;
  gap: 1rem;
  flex-direction: column;
}

.continue-btn, .save-exit-btn {
  padding: 1.25rem 2rem;
  border: none;
  border-radius: 0.75rem;
  font-size: 1.25rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.btn-subtitle {
  font-size: 0.85rem;
  font-weight: 400;
  opacity: 0.9;
}

.continue-btn {
  background: linear-gradient(135deg, #2ecc71, #27ae60);
  color: #ffffff;
  border: 2px solid #27ae60;
}

.continue-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 30px rgba(46, 204, 113, 0.4);
  background: linear-gradient(135deg, #27ae60, #229954);
}

.save-exit-btn {
  background: linear-gradient(135deg, #3498db, #2980b9);
  color: #ffffff;
  border: 2px solid #2980b9;
}

.save-exit-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 30px rgba(52, 152, 219, 0.4);
  background: linear-gradient(135deg, #2980b9, #21618c);
}

@media (max-width: 600px) {
  .won-stats {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .won-header h1 {
    font-size: 2rem;
  }
}
</style>
