<template>
  <div class="quiz-modal">
    <div class="quiz-content">
      <!-- Money display NAHOŘE -->
      <div class="money-display">
        💰 {{ gameStore.money }} peněz
      </div>

            <!-- Mastery Progress Bar -->
      <div class="mastery-progress">
        <div class="mastery-label">
          📚 Znalosti: {{ questionStore.averageMastery }}%
        </div>
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            :style="{ width: questionStore.averageMastery + '%' }"
            :class="masteryClass"
          ></div>
        </div>
      </div>
      
      <!-- Otázka s větším marginem -->
      <div class="quiz-header">
        <h2>{{ question.text }}</h2>
      </div>
      

      
      <div class="quiz-choices">
        <button 
          v-for="(choice, index) in question.choices" 
          :key="index"
          @click="submitAnswer(index)"
          class="choice-btn"
          :class="{ 
            correct: answered && index === question.correctIndex,
            incorrect: answered && index === selectedIndex && index !== question.correctIndex
          }"
          :disabled="answered || cooldownActive"
        >
          <span class="choice-letter">{{ String.fromCharCode(65 + index) }}</span>
          <span class="choice-text">{{ choice }}</span>
        </button>
      </div>
      
      <div v-if="answered || cooldownActive" class="result-message">
        <p v-if="isCorrect" class="correct-message">
          ✅ Správně! +{{ reward }} peněz
        </p>
        <p v-else-if="cooldownActive" class="incorrect-message">
          ❌ Špatně! Správná odpověď: {{ question.choices[question.correctIndex] }}
          <br><br>
          <span class="cooldown-text">Další otázka za {{ cooldownRemaining }}s...</span>
        </p>
        <p v-else class="incorrect-message">
          ❌ Špatně! Správná odpověď: {{ question.choices[question.correctIndex] }}
        </p>
      </div>
      
      <div class="quiz-actions">
        <button @click="close" class="close-btn">
          Zavřít
        </button>
      </div>
      
      <div class="quiz-footer">
        <span class="difficulty-badge" :class="question.difficulty">
          {{ question.difficulty || 'medium' }}
        </span>
        <span class="category-badge" v-if="question.category">
          {{ question.category }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { Question } from '../stores/question'
import { audioService } from '../services/AudioService'
import { useGameStore } from '../stores/game'
import { useQuestionStore } from '../stores/question'

const gameStore = useGameStore()
const questionStore = useQuestionStore()

const masteryClass = computed(() => {
  const mastery = questionStore.averageMastery
  if (mastery >= 100) return 'mastery-complete'
  if (mastery >= 75) return 'mastery-high'
  if (mastery >= 50) return 'mastery-medium'
  if (mastery >= 25) return 'mastery-low'
  return 'mastery-minimal'
})

interface Props {
  question: Question
  onAnswer: (correct: boolean, reward: number) => void
  onClose: () => void
  onNextQuestion: () => void // Callback to load next question
}

const props = defineProps<Props>()

const answered = ref(false)
const selectedIndex = ref(-1)
const isCorrect = ref(false)
const cooldownActive = ref(false)
const cooldownRemaining = ref(3)
const reward = ref(0)
let cooldownInterval: number | null = null
const startTime = ref(Date.now())

const submitAnswer = (index: number) => {
  if (answered.value || cooldownActive.value) return
  
  selectedIndex.value = index
  answered.value = true
  isCorrect.value = index === props.question.correctIndex

  // Report to Memizy
  if (window.parent !== window) {
    const timeSpent = Date.now() - startTime.value
    window.parent.postMessage({
      type: 'ITEM_ANSWERED',
      payload: {
        itemId: props.question.id,
        answer: props.question.choices[index],
        timeSpent: timeSpent,
        isCorrect: isCorrect.value
      }
    }, '*')
  }
  
  // Play sound based on result
  if (isCorrect.value) {
    audioService.play('quiz_correct')
  } else {
    audioService.play('quiz_wrong')
  }
  
  // Calculate reward
  if (isCorrect.value) {
    reward.value = gameStore.getQuizReward(props.question.difficulty || 'medium')
    props.onAnswer(true, reward.value)
    
    // Reset for next question immediately after correct answer
    setTimeout(() => {
      resetQuestion()
    }, 1000)
  } else {
    props.onAnswer(false, 0)
    
    // Start 3s cooldown after wrong answer
    startCooldown()
  }
}

const startCooldown = () => {
  cooldownActive.value = true
  cooldownRemaining.value = 3
  cooldownInterval = window.setInterval(() => {
    cooldownRemaining.value--
    if (cooldownRemaining.value <= 0) {
      if (cooldownInterval) clearInterval(cooldownInterval)
      cooldownActive.value = false
      resetQuestion()
    }
  }, 1000)
}

const resetQuestion = () => {
  answered.value = false
  selectedIndex.value = -1
  isCorrect.value = false
  reward.value = 0
  startTime.value = Date.now()
  
  // Request next question from parent
  props.onNextQuestion()
}

const close = () => {
  if (cooldownInterval) clearInterval(cooldownInterval)
  props.onClose()
}

// ESC key handler
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.code === 'Escape') {
    // Zabráníme default chování a propagaci
    e.preventDefault()
    e.stopPropagation()
    close()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  if (cooldownInterval) clearInterval(cooldownInterval)
})
</script>

<style scoped>
.quiz-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { 
    opacity: 0;
    transform: translateY(50px);
  }
  to { 
    opacity: 1;
    transform: translateY(0);
  }
}

.quiz-content {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  padding: 2rem;
  border-radius: 1rem;
  max-width: 700px;
  width: 90%;
  border: 2px solid var(--accent);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
  animation: slideUp 0.4s;
}

/* Money display - teď nahoře */
.money-display {
  background: rgba(255, 215, 0, 0.2);
  border: 2px solid #ffd700;
  border-radius: 0.5rem;
  padding: 0.75rem 1.5rem;
  font-size: 1.25rem;
  font-weight: 700;
  color: #ffd700;
  box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
  text-align: center;
  margin-bottom: 1.5rem;
}

.quiz-header {
  margin-bottom: 2rem;
}

.quiz-header h2 {
  font-size: 1.5rem;
  margin-bottom: 0;
  line-height: 1.5;
  color: #ffffff;
  font-weight: 600;
}

.mastery-progress {
  margin-bottom: 1.5rem;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.mastery-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 0.5rem;
  text-align: center;
}

.progress-bar {
  width: 100%;
  height: 20px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.progress-fill {
  height: 100%;
  transition: width 0.5s ease, background 0.3s ease;
  border-radius: 10px;
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
}

.mastery-minimal {
  background: linear-gradient(90deg, #e74c3c, #c0392b);
}

.mastery-low {
  background: linear-gradient(90deg, #f39c12, #e67e22);
}

.mastery-medium {
  background: linear-gradient(90deg, #f1c40f, #f39c12);
}

.mastery-high {
  background: linear-gradient(90deg, #2ecc71, #27ae60);
}

.mastery-complete {
  background: linear-gradient(90deg, #3498db, #2ecc71);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}

.quiz-choices {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.choice-btn {
  padding: 1rem 1.5rem;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(0, 191, 255, 0.3);
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  color: #ffffff;
  font-weight: 500;
}

.choice-btn:hover:not(:disabled) {
  border-color: #00bfff;
  background: rgba(0, 191, 255, 0.2);
  transform: translateX(5px);
}

.choice-btn:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.choice-btn.correct {
  background: rgba(46, 204, 113, 0.3);
  border-color: #2ecc71;
  color: #ffffff;
}

.choice-btn.incorrect {
  background: rgba(231, 76, 60, 0.3);
  border-color: #e74c3c;
  color: #ffffff;
}

.choice-letter {
  width: 2rem;
  height: 2rem;
  background: #00bfff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  flex-shrink: 0;
  color: #ffffff;
}

.choice-text {
  flex: 1;
  font-size: 1rem;
  color: #ffffff;
}

.result-message {
  margin: 1.5rem 0;
  padding: 1rem;
  border-radius: 0.5rem;
  text-align: center;
}

.correct-message {
  color: #2ecc71;
  font-size: 1.2rem;
  font-weight: 600;
}

.incorrect-message {
  color: #e74c3c;
  font-size: 1rem;
  font-weight: 500;
}

.cooldown-text {
  color: #f39c12;
  font-size: 1.1rem;
  font-weight: 700;
}

.quiz-actions {
  margin-top: 1rem;
  display: flex;
  justify-content: center;
}

.close-btn {
  padding: 0.75rem 2rem;
  background: rgba(231, 76, 60, 0.8);
  color: #ffffff;
  border: 2px solid #e74c3c;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #e74c3c;
  transform: scale(1.05);
}

.quiz-footer {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.difficulty-badge, .category-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #ffffff;
}

.difficulty-badge.easy { 
  background: #2ecc71;
}

.difficulty-badge.medium { 
  background: #f39c12;
}

.difficulty-badge.hard { 
  background: #e74c3c;
}

.category-badge {
  background: rgba(0, 191, 255, 0.3);
  border: 1px solid #00bfff;
  color: #ffffff;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .quiz-content {
    padding: 1rem;
    max-width: 95%;
    max-height: 90vh;
    overflow-y: auto;
  }
  
  .money-display {
    padding: 0.5rem 1rem;
    font-size: 1rem;
    margin-bottom: 1rem;
  }
  
  .quiz-header h2 {
    font-size: 1.1rem;
    line-height: 1.4;
  }
  
  .mastery-progress {
    padding: 0.5rem;
    margin-bottom: 1rem;
  }
  
  .mastery-label {
    font-size: 0.8rem;
  }
  
  .progress-bar {
    height: 16px;
  }
  
  .quiz-choices {
    gap: 0.75rem;
    margin-bottom: 1rem;
  }
  
  .choice-btn {
    padding: 0.75rem 1rem;
    gap: 0.75rem;
  }
  
  .choice-letter {
    width: 1.75rem;
    height: 1.75rem;
    font-size: 0.9rem;
  }
  
  .choice-text {
    font-size: 0.9rem;
  }
  
  .result-message {
    padding: 0.75rem;
    margin: 1rem 0;
  }
  
  .correct-message,
  .incorrect-message {
    font-size: 1rem;
  }
  
  .close-btn {
    padding: 0.6rem 1.5rem;
    font-size: 0.9rem;
  }
  
  .quiz-footer {
    padding-top: 0.75rem;
    gap: 0.4rem;
    flex-wrap: wrap;
  }
  
  .difficulty-badge,
  .category-badge {
    font-size: 0.75rem;
    padding: 0.2rem 0.6rem;
  }
}
</style>
