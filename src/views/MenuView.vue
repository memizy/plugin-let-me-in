<template>
  <div class="menu-view">
    <AudioControls />
    
    <!-- Animated background -->
    <div class="background-animation">
      <div class="circle circle-1"></div>
      <div class="circle circle-2"></div>
      <div class="circle circle-3"></div>
    </div>
    
    <div class="menu-container">
      <div class="logo-section">
        <h1 class="title">LET ME IN!</h1>
        <p class="subtitle">🏰 Tower Defense × 📚 Quiz × 🎯 FPS</p>
      </div>
      
      <div class="menu-buttons">
        <!-- Continue Button (only if saved game exists) -->
        <button 
          v-if="hasSavedGame" 
          @click="continueGame"
          :disabled="isLoading"
          class="menu-btn primary continue-btn"
        >
          <span class="icon">▶️</span>
          <span class="btn-text">
            Pokračovat
            <span class="save-info" v-if="saveInfo">
              Vlna {{ saveInfo.wave }} • {{ saveInfo.score }} bodů
            </span>
          </span>
        </button>
        
        <button @click="startGame" :disabled="isLoading" class="menu-btn primary">
          <span class="icon">🎮</span>
          <span class="btn-text">{{ isLoading ? 'Načítam hru' : (hasSavedGame ? 'Nová Hra' : 'Spustit Hru') }}</span>
        </button>
        
        <button @click="openEditor" class="menu-btn secondary">
          <span class="icon">📝</span>
          <span class="btn-text">Editor Otázek</span>
        </button>
        
        <button @click="showSettings = true" class="menu-btn secondary">
          <span class="icon">⚙️</span>
          <span class="btn-text">Nastavení</span>
        </button>
      </div>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">📚</div>
          <div class="stat-content">
            <div class="stat-value">{{ questionStore.questions.length }}</div>
            <div class="stat-label">Otázky v databázi</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">🏆</div>
          <div class="stat-content">
            <div class="stat-value">{{ gameStore.highScore }}</div>
            <div class="stat-label">Nejvyšší skóre</div>
          </div>
        </div>
      </div>
      
      <div class="version">v1.0.0</div>
    </div>
    
    <!-- Settings Modal -->
    <div v-if="showSettings" class="modal-overlay" @click="showSettings = false">
      <div class="modal-content" @click.stop>
        <h2>⚙️ Nastavení</h2>
        
        <div class="settings-section">
          <h3>Obtížnost hry</h3>
          <p class="setting-description">Ovlivňuje odměny za zabíjení nepřátel a odpovědi na otázky</p>
          
          <div class="difficulty-options">
            <button 
              @click="selectDifficulty('easy')"
              class="difficulty-btn"
              :class="{ active: gameStore.difficulty === 'easy' }"
            >
              <div class="difficulty-header">
                <span class="difficulty-icon">😊</span>
                <span class="difficulty-name">Lehká</span>
              </div>
              <div class="difficulty-rewards">
                <div class="reward-line">Zabití: <strong>3 💰</strong></div>
                <div class="reward-line">Otázky: <strong>30/60/90 💰</strong></div>
              </div>
            </button>
            
            <button 
              @click="selectDifficulty('medium')"
              class="difficulty-btn"
              :class="{ active: gameStore.difficulty === 'medium' }"
            >
              <div class="difficulty-header">
                <span class="difficulty-icon">😋</span>
                <span class="difficulty-name">Střední</span>
              </div>
              <div class="difficulty-rewards">
                <div class="reward-line">Zabití: <strong>2 💰</strong></div>
                <div class="reward-line">Otázky: <strong>20/40/60 💰</strong></div>
              </div>
            </button>
            
            <button 
              @click="selectDifficulty('hard')"
              class="difficulty-btn"
              :class="{ active: gameStore.difficulty === 'hard' }"
            >
              <div class="difficulty-header">
                <span class="difficulty-icon">🤯</span>
                <span class="difficulty-name">Těžká</span>
              </div>
              <div class="difficulty-rewards">
                <div class="reward-line">Zabití: <strong>1 💰</strong></div>
                <div class="reward-line">Otázky: <strong>10/20/30 💰</strong></div>
              </div>
            </button>
          </div>
        </div>
        
        <button @click="showSettings = false" class="modal-btn">Zavřít</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '../stores/game'
import { useQuestionStore } from '../stores/question'
import { audioService } from '../services/AudioService'
import AudioControls from '../components/AudioControls.vue'
import { SaveSystem } from '../game/SaveSystem'

const router = useRouter()
const gameStore = useGameStore()
const questionStore = useQuestionStore()
const showSettings = ref(false)
const hasSavedGame = ref(false)
const saveInfo = ref<{ timestamp: number; wave: number; score: number } | null>(null)

const isLoading = ref(true)

// Load audio and play menu music
onMounted(async () => {
  // Check for saved game
  hasSavedGame.value = SaveSystem.hasSavedGame()
  if (hasSavedGame.value) {
    saveInfo.value = SaveSystem.getSaveInfo()
  }
  
  try {
    // Čekáme, dokud se VŠECHNO nenačte
    await audioService.loadAll()
    // Až teď, když je načteno, hrajeme
    audioService.playMusic('menu', 2000)
  } catch (error) {
    console.error("Selhalo načítání audia, ale pokračujeme.", error)
    // I když to selže, chceme odemknout UI
  } finally {
    // 2. AŤ TO DOPADNE JAKKOLI, ODEMKNEME TLAČÍTKA
    isLoading.value = false
  }
})

const continueGame = () => {
  audioService.play('button_click')
  // Navigate to game with 'continue' flag
  router.push({ path: '/game', query: { continue: 'true' } })
}

const startGame = () => {
  if (questionStore.questions.length === 0) {
    alert('Nejprve přidej alespoň jednu otázku v editoru!')
    return
  }
  router.push('/game')
}

const openEditor = () => {
  audioService.play('button_click')
  router.push('/editor')
}

const selectDifficulty = (difficulty: 'easy' | 'medium' | 'hard') => {
  audioService.play('button_click')
  gameStore.setDifficulty(difficulty)
}
</script>

<style scoped>
.menu-view {
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f1729 100%);
  position: relative;
  overflow: hidden;
}

/* Animated background */
.background-animation {
  position: absolute;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: 0;
}

.circle {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%);
  animation: float 20s ease-in-out infinite;
}

.circle-1 {
  width: 600px;
  height: 600px;
  top: -200px;
  left: -200px;
  animation-delay: 0s;
}

.circle-2 {
  width: 800px;
  height: 800px;
  bottom: -300px;
  right: -300px;
  animation-delay: -7s;
}

.circle-3 {
  width: 500px;
  height: 500px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation-delay: -14s;
}

@keyframes float {
  0%, 100% {
    transform: translate(0, 0) scale(1);
    opacity: 0.3;
  }
  33% {
    transform: translate(50px, -50px) scale(1.1);
    opacity: 0.5;
  }
  66% {
    transform: translate(-30px, 30px) scale(0.9);
    opacity: 0.4;
  }
}

.menu-container {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 3rem 2.5rem;
  background: rgba(15, 23, 42, 0.85);
  border-radius: 1.5rem;
  backdrop-filter: blur(20px);
  border: 2px solid rgba(59, 130, 246, 0.3);
  box-shadow: 
    0 20px 60px rgba(0, 0, 0, 0.5),
    0 0 100px rgba(59, 130, 246, 0.1) inset;
  min-width: 480px;
  max-width: 600px;
}

.logo-section {
  margin-bottom: 2.5rem;
}

.title {
  font-size: 4rem;
  font-weight: 900;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 2px;
  text-transform: uppercase;
  animation: titleGlow 3s ease-in-out infinite;
  filter: drop-shadow(0 0 20px rgba(59, 130, 246, 0.5));
}

@keyframes titleGlow {
  0%, 100% {
    filter: drop-shadow(0 0 20px rgba(59, 130, 246, 0.5));
  }
  50% {
    filter: drop-shadow(0 0 30px rgba(139, 92, 246, 0.7));
  }
}

.subtitle {
  font-size: 1.2rem;
  color: rgba(226, 232, 240, 0.8);
  font-weight: 500;
  letter-spacing: 1px;
}

.menu-buttons {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
}

.menu-btn {
  padding: 1.2rem 2rem;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 0.75rem;
  border: 2px solid transparent;
  font-weight: 600;
  position: relative;
  overflow: hidden;
}

.continue-btn {
  background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
  animation: pulse 2s infinite;
  border-color: #27ae60;
}

.continue-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 40px rgba(46, 204, 113, 0.4);
  border-color: #2ecc71;
}

.save-info {
  display: block;
  font-size: 0.85rem;
  font-weight: 400;
  opacity: 0.9;
  margin-top: 0.25rem;
}

.btn-text {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.menu-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.menu-btn:hover::before {
  left: 100%;
}

.menu-btn.primary {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  box-shadow: 
    0 4px 15px rgba(59, 130, 246, 0.4),
    0 0 20px rgba(59, 130, 246, 0.2);
  border-color: rgba(59, 130, 246, 0.5);
}

.menu-btn.primary:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 
    0 8px 25px rgba(59, 130, 246, 0.6),
    0 0 30px rgba(59, 130, 246, 0.3);
  border-color: rgba(59, 130, 246, 0.8);
}

.menu-btn.primary:active:not(:disabled) {
  transform: translateY(-1px);
}

.menu-btn.primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.menu-btn.secondary {
  background: rgba(30, 41, 59, 0.8);
  border-color: rgba(148, 163, 184, 0.3);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

.menu-btn.secondary:hover {
  transform: translateY(-2px);
  background: rgba(51, 65, 85, 0.9);
  border-color: rgba(148, 163, 184, 0.5);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
}

.icon {
  font-size: 1.8rem;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.btn-text {
  font-weight: 600;
  letter-spacing: 0.5px;
  color: white;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid rgba(148, 163, 184, 0.2);
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: rgba(30, 41, 59, 0.6);
  border-radius: 0.75rem;
  border: 1px solid rgba(148, 163, 184, 0.2);
  transition: all 0.3s;
}

.stat-card:hover {
  background: rgba(51, 65, 85, 0.8);
  border-color: rgba(59, 130, 246, 0.4);
  transform: translateY(-2px);
}

.stat-icon {
  font-size: 2.5rem;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3));
}

.stat-content {
  text-align: left;
  flex: 1;
}

.stat-value {
  font-size: 1.8rem;
  font-weight: 700;
  color: #3b82f6;
  line-height: 1.2;
}

.stat-label {
  font-size: 0.85rem;
  color: rgba(226, 232, 240, 0.7);
  margin-top: 0.25rem;
}

.version {
  margin-top: 1.5rem;
  font-size: 0.85rem;
  color: rgba(148, 163, 184, 0.5);
  font-weight: 500;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(8px);
  animation: fadeIn 0.2s;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%);
  padding: 2.5rem;
  border-radius: 1.25rem;
  max-width: 800px;
  width: 90%;
  border: 2px solid rgba(59, 130, 246, 0.3);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: modalSlide 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes modalSlide {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-content h2 {
  margin-bottom: 1.5rem;
  color: white;
  font-size: 1.8rem;
}

.coming-soon {
  color: rgba(226, 232, 240, 0.8);
  margin-bottom: 2rem;
  font-size: 1.1rem;
}

.settings-section {
  margin: 2rem 0;
  text-align: left;
}

.settings-section h3 {
  color: #fbbf24;
  margin-bottom: 0.5rem;
  font-size: 1.3rem;
}

.setting-description {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.difficulty-options {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}

.difficulty-btn {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  color: white;
}

.difficulty-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.4);
  transform: translateY(-2px);
}

.difficulty-btn.active {
  background: rgba(251, 191, 36, 0.2);
  border-color: #fbbf24;
  box-shadow: 0 0 20px rgba(251, 191, 36, 0.3);
}

.difficulty-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  font-size: 1.1rem;
  font-weight: bold;
}

.difficulty-icon {
  font-size: 1.5rem;
}

.difficulty-name {
  color: #fbbf24;
}

.difficulty-rewards {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.8);
}

.reward-line {
  margin: 0.25rem 0;
}

.reward-line strong {
  color: #fbbf24;
}

.modal-btn {
  width: 100%;
  padding: 1rem;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  border: none;
  border-radius: 0.5rem;
  color: white;
  font-weight: 600;
  font-size: 1.05rem;
  cursor: pointer;
  transition: all 0.3s;
}

.modal-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
}

/* Responsive */
@media (max-width: 768px) {
  .menu-container {
    min-width: unset;
    width: 95%;
    max-width: 400px;
    padding: 1.5rem 1rem;
    margin-top: 4rem; /* Posun dolů pod audio controls */
  }

  .difficulty-options {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-top: 1.5rem;
  }
    
  .title {
    font-size: 1.8rem;
    margin-bottom: 0.75rem;
  }
  
  .subtitle {
    font-size: 0.9rem;
    margin-bottom: 1.5rem;
  }
  
  .menu-buttons {
    gap: 0.75rem;
  }
  
  .menu-btn {
    padding: 0.75rem 1.25rem;
  }
  
  .btn-icon {
    font-size: 1.5rem;
  }
  
  .btn-content {
    gap: 0.5rem;
  }
  
  .btn-text {
    font-size: 1rem;
  }
  
  .btn-subtitle {
    font-size: 0.75rem;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  
  .stat-card {
    padding: 0.75rem;
  }
  
  .stat-icon {
    font-size: 1.5rem;
  }
  
  .stat-label {
    font-size: 0.75rem;
  }
  
  .stat-value {
    font-size: 1rem;
  }
}

@media (max-width: 480px) {
  .menu-container {
    padding: 1rem 0.75rem;
    margin-top: 3.5rem;
  }
  
  .title {
    font-size: 1.5rem;
  }
  
  .menu-btn {
    padding: 0.6rem 1rem;
  }
  
  .btn-text {
    font-size: 0.9rem;
  }
}
</style>
