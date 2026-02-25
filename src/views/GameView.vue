<template>
  <div class="game-view">
    <canvas ref="gameCanvas"></canvas>
    <div 
      v-if="showTimedLockPrompt" 
      class="lock-prompt"
    >
      Kliknutím zamkni myš
    </div>
    <!-- Audio controls jsou teď jen v pause menu -->
    <HerniHUD />
    <MobileControls />
    <QuizModal 
      v-if="showQuiz && currentQuestion"
      :question="currentQuestion"
      :onAnswer="handleQuizAnswer"
      :onClose="closeQuiz"
      :onNextQuestion="loadNextQuestion"
    />
    <GameOverModal
      v-if="showGameOver"
      :reason="gameOverReason"
      :stats="gameOverStats"
      :onRestart="restartGame"
      :onMenu="goToMenu"
    />
    <GameWonModal
      v-if="showGameWon"
      :stats="gameWonStats"
      :onContinue="continueAfterWin"
      :onSaveAndExit="saveAndExitAfterWin"
    />
    <PauseModal
      v-if="showPause"
      :stats="pauseStats"
      :onResume="resumeGame"
      :onSaveAndExit="saveAndExit"
      :onRestart="restartGame"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Game from '../game/Game'
import HerniHUD from '../components/HerniHUD.vue'
import MobileControls from '../components/MobileControls.vue'
import QuizModal from '../components/QuizModal.vue'
import GameOverModal from '../components/GameOverModal.vue'
import GameWonModal from '../components/GameWonModal.vue'
import PauseModal from '../components/PauseModal.vue'
import { useGameStore } from '../stores/game'
import { useQuestionStore } from '../stores/question'
import { audioService } from '../services/AudioService'
import { SaveSystem } from '../game/SaveSystem'
import type { Question } from '../stores/question'

const router = useRouter()
const route = useRoute()
const gameCanvas = ref<HTMLCanvasElement | null>(null)
const gameStore = useGameStore()
const questionStore = useQuestionStore()

let game: Game | null = null
const showQuiz = ref(false)
const currentQuestion = ref<Question | null>(null)
const showGameOver = ref(false)
const gameOverReason = ref('')
const gameOverStats = ref({
  wave: 0,
  score: 0,
  kills: 0,
  money: 0
})
const showGameWon = ref(false)
const gameWonStats = ref({
  wave: 0,
  score: 0,
  money: 0
})
const showPause = ref(false)
const pauseStats = ref({
  wave: 0,
  score: 0,
  money: 0,
  health: 100,
  maxHealth: 100
})
const isRestarting = ref(false)
const showTimedLockPrompt = ref(false)

// Computed: Je otevřený nějaký modál?
const isAnyModalOpen = computed(() => {
  return showQuiz.value || showGameOver.value || showGameWon.value || showPause.value
})

// Watcher: Automaticky spravuje pointer lock podle stavu modálů
watch(isAnyModalOpen, (modalOpen) => {
  if (!game) return
  
  if (modalOpen) {
    // Nějaký modál je otevřený -> unlock
    if (game.controls.isLocked) {
      game.controls.unlock()
      console.log('🔓 Pointer unlocked (modal opened)')
    }
  } else {
    // Žádný modál není otevřený -> lock
    if (!game.controls.isLocked) {
        if (!isAnyModalOpen.value && game && !game.controls.isLocked) {
          game.controls.lock()
          console.log('🔒 Pointer locked (no modals)')
        }
    }
  }
})

const showRandomQuestion = () => {
  if (questionStore.questions.length === 0) return
  
  // Use weighted random selection (prefers lower mastery questions)
  const question = questionStore.getWeightedRandomQuestion(currentQuestion.value?.id)
  if (question) {
    currentQuestion.value = question
    showQuiz.value = true
    // Pointer lock se automaticky odemkne díky watcheru
  }
}

const loadNextQuestion = () => {
  // Load a new random question (used by QuizModal after answer)
  if (questionStore.questions.length === 0) return
  
  // Use weighted random selection, avoid repeating current question
  const question = questionStore.getWeightedRandomQuestion(currentQuestion.value?.id)
  if (question) {
    currentQuestion.value = question
  }
}

const handleQuizAnswer = (correct: boolean, reward: number) => {
  // Update mastery level for current question
  if (currentQuestion.value) {
    questionStore.updateMasteryLevel(currentQuestion.value.id, correct)
  }
  
  if (correct) {
    gameStore.addMoney(reward)
    gameStore.incrementScore(reward) // Score = same as money reward
  }
  
  // Check if player achieved 100% mastery
  if (questionStore.averageMastery >= 100) {
    // Show Game Won modal
    showQuiz.value = false
    showGameWon.value = true
    gameWonStats.value = {
      wave: gameStore.currentWave,
      score: gameStore.score,
      money: gameStore.money
    }
    // Pointer lock se automaticky odemkne díky watcheru
  }
  // QuizModal will handle loading next question via onNextQuestion callback
}

const continueAfterWin = () => {
  // Reset all mastery levels and continue playing
  questionStore.resetAllMastery()
  showGameWon.value = false
  // Pointer lock se automaticky zamkne díky watcheru (po kliknutí)
}

const saveAndExitAfterWin = () => {
  // Save game before exiting
  if (game) {
    const saved = SaveSystem.saveGame(game, gameStore, questionStore)
    if (saved) {
      console.log('✅ Game saved successfully')
    }
    game.stop()
    game = null
  }
  audioService.stopGameMusic()
  router.push('/')
}

const closeQuiz = () => {
  showQuiz.value = false
  currentQuestion.value = null
  // Pointer lock se automaticky zamkne díky watcheru (po kliknutí)
}

const handleGameOver = (event: Event) => {
  const customEvent = event as CustomEvent
  gameOverReason.value = customEvent.detail.reason
  gameOverStats.value = {
    wave: gameStore.currentWave,
    score: gameStore.score,
    kills: gameStore.enemiesKilled,
    money: gameStore.money
  }
  showGameOver.value = true
  // Pointer lock se automaticky odemkne díky watcheru
}

const restartGame = async () => {
  isRestarting.value = true 
  
  // ✨ UPRAVENO: Zavři jakýkoliv modál je zrovna otevřený
  showGameOver.value = false
  showPause.value = false
  showGameWon.value = false
  showQuiz.value = false
  
  // Stop and cleanup old game
  if (game) {
    game.controls.removeEventListener('unlock', handlePointerUnlock)
    game.stop()
    game = null
  }
  
  // Reset game store
  gameStore.resetGame()
  
  // Create new game
  if (gameCanvas.value) {
    game = new Game(gameCanvas.value, showRandomQuestion, triggerPause)
    
    await game.init()
    
    if (game) {
      game.controls.addEventListener('unlock', handlePointerUnlock)
      console.log('✅ Pointer unlock listener re-attached after restart')
    }
    
    // Auto-lock pointer při restartu
    if (game && !game.controls.isLocked) {
      try {
        game.controls.lock()
        console.log('🔒 Auto-locked pointer on restart')
      } catch (e) {
        console.log('⚠️ Could not auto-lock (user needs to click)')
      }
    }
    
    game.start()
  }
  
  // Malé zpoždění, aby se stihl zpracovat 'unlock' event po selhaném locku
  setTimeout(() => {
    isRestarting.value = false
  }, 100)
}

const goToMenu = () => {
  // Send completion event to Memizy host
  if (window.parent !== window) {
    window.parent.postMessage({
      type: 'SESSION_COMPLETED',
      payload: {
        score: gameStore.score
      }
    }, '*')
  }

  if (game) {
    game.stop()
    game = null
  }
  gameStore.resetGame()
  audioService.stopGameMusic() // Zastavit game hudbu
  router.push('/')
}

const resumeGame = () => {
  showPause.value = false
  
  // 🟢 OBNOV HRU - resetuj gameOver flag aby update loop pokračoval
  if (game) {
    game.gameOver = false
  }
  
  // Resume audio
  // audioService.startGameMusic()
  
  // Pointer lock se automaticky zamkne díky watcheru (po kliknutí)
}

const saveAndExit = () => {
  // Save game before exiting
  if (game) {
    const saved = SaveSystem.saveGame(game, gameStore, questionStore)
    if (saved) {
      console.log('✅ Game saved from pause menu')
    }
    game.stop()
    game = null
  }
  audioService.stopGameMusic()
  router.push('/')
}

/**
 * ✨ UPRAVENÁ FUNKCE ✨
 * Spustí se VŽDY, když se pointer odemkne (ať už přes ESC nebo Alt+Tab).
 */
const handlePointerUnlock = () => {
  // Pokud je pointer odemčený a žádný modál není otevřený (nebo restart),
  // zavoláme triggerPause, který hru zapauzuje.
  
  // Kontroly (isAnyModalOpen, isRestarting) jsou už uvnitř triggerPause()
  
  console.log('🔓 Pointer unlocked -> Calling triggerPause()')
  triggerPause()
}

/**
 * ✨ NOVÁ FUNKCE ✨
 * Společná logika pro spuštění pauzy (z ESC nebo z mobilního tlačítka)
 */
const triggerPause = () => {
  // Pokud je hra pauznutá, zavoláme 'resumeGame' (pro mobilní tlačítko)
  if (showPause.value) {
    console.log('▶️ Triggering Resume from triggerPause()')
    resumeGame()
    return
  }

  // Pokud je otevřený jiný modál nebo restartujeme, nic nedělej
  if (showGameOver.value || showGameWon.value || showQuiz.value || isRestarting.value) {
    console.log('Pause trigger ignored (modal open or restarting)')
    return
  }
  
  console.log('⏸️ Triggering Pause')
  
  // Otevři pause menu
  showPause.value = true
  
  // Update pause stats
  pauseStats.value = {
    wave: gameStore.currentWave,
    score: gameStore.score,
    money: gameStore.money,
    health: Math.round(gameStore.playerHealth),
    maxHealth: gameStore.playerMaxHealth
  }
  
  // 🔴 ZASTAV HRU
  if (game) {
    game.gameOver = true
  }
  
  // Zastav audio
  // audioService.stopMusic()
}

/**
 * ✨ UPRAVENÁ FUNKCE ✨
 * ESC key handler - nyní se stará POUZE o zavření pause menu
 */
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.code === 'Escape') {
    // Pokud je pause menu OTEVŘENÉ, tento ESC ho má zavřít (obnovit hru).
    if (showPause.value) {
      // Zabráníme default chování
      e.preventDefault()
      e.stopPropagation()
      
      resumeGame()
      return
    }
    
    // Pokud pause menu NENÍ otevřené, tato funkce nedělá nic.
    // Prohlížeč si zpracuje ESC, odemkne pointer,
    // a tím se spustí náš nový listener 'handlePointerUnlock'.
  }
}

onMounted(async () => {
  if (!gameCanvas.value) return
  
  // Prevent page scrolling in game (mobile game mode)
  document.body.style.overflow = 'hidden'
  document.body.style.touchAction = 'none'
  
  // Prevent context menu (pravé tlačítko myši)
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault()
  })
  
  // Add ESC key handler
  document.addEventListener('keydown', handleKeyDown)
  
  // Listen for game over event
  window.addEventListener('gameOver', handleGameOver)
  
  // Check if we should continue from save
  const shouldContinue = route.query.continue === 'true'
  let savedState = null
  
  if (shouldContinue) {
    savedState = SaveSystem.loadGame()
    if (savedState) {
      console.log('📂 Loading saved game...')
      
      // Restore game store state
      gameStore.money = savedState.gameStore.money
      gameStore.score = savedState.gameStore.score
      gameStore.highScore = savedState.gameStore.highScore
      gameStore.playerHealth = savedState.gameStore.playerHealth
      gameStore.playerMaxHealth = savedState.gameStore.playerMaxHealth
      gameStore.enemiesKilled = savedState.gameStore.enemiesKilled
      gameStore.currentWave = savedState.gameStore.currentWave
      gameStore.waveInProgress = savedState.gameStore.waveInProgress
      gameStore.waveCountdown = savedState.gameStore.waveCountdown
      gameStore.enemiesSpawnedThisWave = savedState.gameStore.enemiesSpawnedThisWave
      gameStore.enemiesAlive = savedState.gameStore.enemiesAlive
      gameStore.totalWaves = savedState.gameStore.totalWaves
    } else {
      console.warn('⚠️ No save found, starting new game')
    }
  }
  
  game = new Game(gameCanvas.value, showRandomQuestion, triggerPause)
  audioService.stopMusic(2000)
  await game.init()
  
  // ✨ PŘIDEJ: Připoj listener PŘÍMO na 'controls' objekt ve hře
  // Toto nám umožní reagovat na unlock (ESC) bez boje s browserem
  if (game) {
    game.controls.addEventListener('unlock', handlePointerUnlock)
    console.log('✅ Pointer unlock listener attached')
  }
  
  // 🔄 Restore saved game state (enemies, towers, library)
  if (savedState && game) {
    game.restoreFromSave(savedState)
  }
  
  game.start()

  if (game && !game.isMobile) {
    showTimedLockPrompt.value = true
    setTimeout(() => {
      showTimedLockPrompt.value = false
    }, 5000) // 5 sekund
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('gameOver', handleGameOver)
  document.removeEventListener('keydown', handleKeyDown)
  
  // ✨ PŘIDEJ: Nezapomeň listener odebrat
  if (game) {
    game.controls.removeEventListener('unlock', handlePointerUnlock)
    console.log('✅ Pointer unlock listener removed')
  }
  
  audioService.stopGameMusic() // Zastavit game hudbu při unmount
  game?.stop()
  
  // Restore page scrolling
  document.body.style.overflow = ''
  document.body.style.touchAction = ''
})
</script>

<style scoped>
.game-view {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
  position: relative;
  z-index: 1;
  touch-action: none;
}

/* Prevent context menu on canvas */
canvas {
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

/* ✨ KROK 4: PŘIDEJ TYTO NOVÉ STYLY ✨ */
.lock-prompt {
  position: absolute;
  top: 40px; /* Odsazení od vršku */
  left: 50%;
  transform: translateX(-70%);
  z-index: 10; /* Musí být nad canvasem (z-index: 1) */
  
  background-color: rgba(0, 0, 0, 0.75);
  color: white;
  padding: 12px 24px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  
  font-size: 1.1rem;
  font-weight: 500;
  text-align: center;
  
  cursor: pointer;
  user-select: none; /* Aby se nedal označit text */
  -webkit-user-select: none;
  
  /* Jemná animace při zobrazení */
  animation: fadeIn 0.3s ease-out;
}

.lock-prompt:hover {
  background-color: rgba(0, 0, 0, 0.9);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    top: 20px;
  }
  to {
    opacity: 1;
    top: 40px;
  }
}
</style>
