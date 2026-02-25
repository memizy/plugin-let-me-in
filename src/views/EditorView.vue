<template>
  <div class="editor-view">
    <div class="editor-header">
      <div class="header-left">
        <h1>📝 Editor Otázek</h1>
        <button @click="goBack" class="btn-back">← Zpět do menu</button>
      </div>
      <div class="header-right">
        <AudioControls />
      </div>
    </div>
    
    <!-- Mobile Main View -->
    <div class="mobile-editor-main">
      <div class="mobile-stats">
        <div class="stat">
          <span class="stat-label">Počet otázek:</span>
          <span class="stat-value">{{ questionStore.questions.length }}</span>
        </div>
      </div>
      
      <div class="mobile-actions">
        <button @click="showMobileQuestionsList = true" class="mobile-btn primary">
          <span class="btn-icon">📚</span>
          <span>Projít Otázky</span>
        </button>
        <button @click="showMobileNewQuestion = true" class="mobile-btn success">
          <span class="btn-icon">➕</span>
          <span>Nová Otázka</span>
        </button>
        <button @click="showMobileAIPrompt = true" class="mobile-btn ai">
          <span class="btn-icon">🤖</span>
          <span>AI Generátor</span>
        </button>
        <button @click="showImportModal = true" class="mobile-btn secondary">
          <span class="btn-icon">📥</span>
          <span>Import JSON</span>
        </button>
        <button @click="exportQuestions" class="mobile-btn secondary">
          <span class="btn-icon">📤</span>
          <span>Export JSON</span>
        </button>
        <button @click="clearAllQuestions" class="mobile-btn danger">
          <span class="btn-icon">🗑️</span>
          <span>Vyčistit Vše</span>
        </button>
      </div>
    </div>
    
    <!-- Desktop Container (original) -->
    <div class="editor-container desktop-only">
      <!-- Left Panel - Question List -->
      <div class="questions-panel">
        <div class="panel-header">
          <h2>Otázky ({{ questionStore.questions.length }})</h2>
          <button @click="showNewQuestionForm" class="success">+ Nová</button>
        </div>
        
        <div class="questions-list">
          <div 
            v-for="q in questionStore.questions" 
            :key="q.id"
            class="question-item"
            :class="{ active: selectedQuestion?.id === q.id }"
            @click="selectQuestion(q)"
          >
            <div class="question-preview">
              <span class="difficulty-badge" :class="q.difficulty">
                {{ q.difficulty || 'medium' }}
              </span>
              <span class="question-text">{{ q.text }}</span>
            </div>
            <button @click.stop="deleteQuestion(q.id)" class="btn-delete danger">🗑️</button>
          </div>
          
          <div v-if="questionStore.questions.length === 0" class="empty-state">
            <p>Zatím žádné otázky</p>
            <p class="hint">Vytvoř novou nebo importuj JSON</p>
          </div>
        </div>
        
        <div class="panel-footer">
          <button @click="showImportModal = true" class="secondary">📥 Import</button>
          <button @click="exportQuestions" class="secondary">📤 Export</button>
          <button @click="clearAllQuestions" class="danger-btn">🗑️ Vyčistit</button>
        </div>
      </div>
      
      <!-- Right Panel - Question Form / AI Prompt -->
      <div class="form-panel">
        <div v-if="showAIPrompt" class="ai-prompt-section">
          <h2>🤖 Generátor Promptu pro AI</h2>
          <div class="hint-box">
            <p><strong>📖 Jak to funguje:</strong></p>
            <ol>
              <li>Vyplň téma, počet otázek a obtížnost</li>
              <li>Zkopíruj vygenerovaný prompt pomocí tlačítka níže</li>
              <li>Vlož prompt do ChatGPT, Claude, Gemini nebo jiného LLM</li>
              <li>💡 <strong>Tip:</strong> Můžeš přidat své vlastní materiály (texty, poznámky, dokumenty) do LLM a požádat ho, aby vytvořil otázky z nich</li>
              <li>Zkopíruj JSON výstup z LLM (ten dlouhý divný text pomocí tlačítka kopírovat co v LLM bývá)</li>
              <li>Vrať se sem a použij tlačítko <strong>"📥 Import"</strong> dole vlevo</li>
            </ol>
          </div>
          
          <div class="form-group">
            <label>Téma/Kategorie</label>
            <input v-model="aiTopic" type="text" placeholder="např. Historie ČR, Matematika, Biologie...">
          </div>
          
          <div class="form-group">
            <label>Počet otázek</label>
            <input v-model.number="aiCount" type="number" min="1" max="50">
          </div>
          
          <div class="form-group">
            <label>Obtížnost</label>
            <select v-model="aiDifficulty">
              <option value="easy">Snadná</option>
              <option value="medium">Střední</option>
              <option value="hard">Těžká</option>
            </select>
          </div>
          
          <div class="ai-prompt-output">
            <label>Vygenerovaný prompt:</label>
            <textarea :value="generatedPrompt" readonly rows="12" class="prompt-textarea"></textarea>
          </div>
          
          <div class="button-group">
            <button @click="copyPromptToClipboard" class="btn-primary success">
              <span class="btn-icon">📋</span>
              <span>Zkopírovat Prompt</span>
            </button>
            <button @click="showAIPrompt = false" class="btn-secondary">
              <span class="btn-icon">←</span>
              <span>Zpět k editaci</span>
            </button>
          </div>
        </div>
        
        <div v-else-if="selectedQuestion || isCreatingNew" class="question-form">
          <h2>{{ isCreatingNew ? 'Nová otázka' : 'Upravit otázku' }}</h2>
          
          <div class="form-group">
            <label>Text otázky *</label>
            <textarea v-model="formData.text" rows="3" placeholder="Zadej text otázky..."></textarea>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>Kategorie</label>
              <input v-model="formData.category" type="text" placeholder="např. Historie">
            </div>
            
            <div class="form-group">
              <label>Obtížnost</label>
              <select v-model="formData.difficulty">
                <option value="easy">Snadná</option>
                <option value="medium">Střední</option>
                <option value="hard">Těžká</option>
              </select>
            </div>
          </div>
          
          <div class="form-group">
            <label>Odpovědi (min. 2) *</label>
            <div v-for="(_choice, index) in formData.choices" :key="index" class="choice-row">
              <input 
                v-model="formData.choices[index]" 
                type="text" 
                :placeholder="`Odpověď ${index + 1}`"
              >
              <input 
                type="radio" 
                :value="index" 
                v-model="formData.correctIndex"
                :id="`correct-${index}`"
              >
              <label :for="`correct-${index}`" class="radio-label">Správná</label>
              <button 
                v-if="formData.choices.length > 2"
                @click="removeChoice(index)" 
                class="btn-remove danger"
              >×</button>
            </div>
            <button @click="addChoice" class="btn-add secondary">+ Přidat odpověď</button>
          </div>
          
          <div class="button-group">
            <button @click="saveQuestion" class="btn-primary success">
              <span class="btn-icon">💾</span>
              <span>Uložit</span>
            </button>
            <button @click="cancelEdit" class="btn-secondary">
              <span class="btn-icon">✖</span>
              <span>Zrušit</span>
            </button>
          </div>
        </div>
        
        <div v-else class="welcome-panel">
          <div class="welcome-icon">📚</div>
          <h2>Vítej v editoru otázek! 👋</h2>
          <p class="welcome-text">Vyber otázku ze seznamu pro úpravu, nebo:</p>
          <div class="welcome-actions">
            <button @click="showNewQuestionForm" class="btn-primary success">
              <span class="btn-icon">📝</span>
              <span>Vytvořit novou otázku</span>
            </button>
            <button @click="showAIPrompt = true" class="btn-primary ai-btn">
              <span class="btn-icon">🤖</span>
              <span>Vygenerovat AI Prompt</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Import Modal -->
    <div v-if="showImportModal" class="modal-overlay" @click="showImportModal = false">
      <div class="modal-content" @click.stop>
        <h2>📥 Import otázek z JSON</h2>
        <p class="modal-hint">Vlož JSON data z LLM (ChatGPT, Claude, Gemini...)</p>
        <textarea v-model="importJson" rows="15" placeholder="Vlož JSON data..." class="import-textarea"></textarea>
        <div class="button-group">
          <button @click="importQuestions" class="btn-primary success">
            <span class="btn-icon">✓</span>
            <span>Importovat</span>
          </button>
          <button @click="showImportModal = false" class="btn-secondary">
            <span class="btn-icon">✖</span>
            <span>Zrušit</span>
          </button>
        </div>
      </div>
    </div>
    
    <!-- Mobile: Questions List Modal -->
    <div v-if="showMobileQuestionsList" class="modal-overlay" @click="showMobileQuestionsList = false">
      <div class="modal-content mobile-modal" @click.stop>
        <h2>📚 Seznam Otázek ({{ questionStore.questions.length }})</h2>
        <div class="mobile-questions-list">
          <div 
            v-for="q in questionStore.questions" 
            :key="q.id"
            class="mobile-question-item"
            @click="openMobileQuestionDetail(q)"
          >
            <div class="mobile-question-preview">
              <span class="difficulty-badge" :class="q.difficulty">
                {{ q.difficulty || 'medium' }}
              </span>
              <span class="question-text">{{ q.text }}</span>
            </div>
            <button @click.stop="deleteQuestion(q.id)" class="btn-delete-small">🗑️</button>
          </div>
          
          <div v-if="questionStore.questions.length === 0" class="empty-state">
            <p>Zatím žádné otázky</p>
            <p class="hint">Vytvoř novou nebo importuj JSON</p>
          </div>
        </div>
        <button @click="showMobileQuestionsList = false" class="btn-close">Zavřít</button>
      </div>
    </div>
    
    <!-- Mobile: Question Detail/Edit Modal -->
    <div v-if="showMobileQuestionDetail" class="modal-overlay" @click="showMobileQuestionDetail = false">
      <div class="modal-content mobile-modal" @click.stop>
        <h2>{{ mobileDetailIsNew ? '➕ Nová Otázka' : '✏️ Upravit Otázku' }}</h2>
        
        <div class="mobile-question-form">
          <div class="form-group">
            <label>Text otázky *</label>
            <textarea v-model="formData.text" rows="3" placeholder="Zadej text otázky..."></textarea>
          </div>
          
          <div class="form-row-mobile">
            <div class="form-group">
              <label>Kategorie</label>
              <input v-model="formData.category" type="text" placeholder="např. Historie">
            </div>
            
            <div class="form-group">
              <label>Obtížnost</label>
              <select v-model="formData.difficulty">
                <option value="easy">Snadná</option>
                <option value="medium">Střední</option>
                <option value="hard">Těžká</option>
              </select>
            </div>
          </div>
          
          <div class="form-group">
            <label>Odpovědi (min. 2) *</label>
            <div v-for="(_choice, index) in formData.choices" :key="index" class="choice-row-mobile">
              <input 
                v-model="formData.choices[index]" 
                type="text" 
                :placeholder="`Odpověď ${index + 1}`"
              >
              <div class="choice-controls">
                <input 
                  type="radio" 
                  :value="index" 
                  v-model="formData.correctIndex"
                  :id="`mobile-correct-${index}`"
                >
                <label :for="`mobile-correct-${index}`" class="radio-label-mobile">✓</label>
                <button 
                  v-if="formData.choices.length > 2"
                  @click="removeChoice(index)" 
                  class="btn-remove-mobile"
                >×</button>
              </div>
            </div>
            <button @click="addChoice" class="btn-add-mobile">+ Přidat odpověď</button>
          </div>
          
          <div class="mobile-button-group">
            <button @click="saveMobileQuestion" class="mobile-save-btn">
              💾 Uložit
            </button>
            <button @click="closeMobileQuestionDetail" class="mobile-cancel-btn">
              ✖ Zrušit
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Mobile: AI Prompt Modal -->
    <div v-if="showMobileAIPrompt" class="modal-overlay" @click="showMobileAIPrompt = false">
      <div class="modal-content mobile-modal" @click.stop>
        <h2>🤖 AI Generátor</h2>
        
        <div class="hint-box-mobile">
          <p><strong>📖 Jak to funguje:</strong></p>
          <ol>
            <li>Vyplň téma, počet a obtížnost</li>
            <li>Zkopíruj prompt do ChatGPT/Claude</li>
            <li>💡 Můžeš přidat svoje materiály do LLM</li>
            <li>Zkopíruj JSON výstup z LLM</li>
            <li>Použij tlačítko "📥 Import JSON"</li>
          </ol>
        </div>
        
        <div class="form-group">
          <label>Téma/Kategorie</label>
          <input v-model="aiTopic" type="text" placeholder="např. Historie ČR">
        </div>
        
        <div class="form-group">
          <label>Počet otázek</label>
          <input v-model.number="aiCount" type="number" min="1" max="50">
        </div>
        
        <div class="form-group">
          <label>Obtížnost</label>
          <select v-model="aiDifficulty">
            <option value="easy">Snadná</option>
            <option value="medium">Střední</option>
            <option value="hard">Těžká</option>
          </select>
        </div>
        
        <div class="ai-prompt-output-mobile">
          <label>Vygenerovaný prompt:</label>
          <textarea :value="generatedPrompt" readonly rows="10" class="prompt-textarea-mobile"></textarea>
        </div>
        
        <div class="mobile-button-group">
          <button @click="copyPromptToClipboard" class="mobile-copy-btn">
            📋 Zkopírovat
          </button>
          <button @click="showMobileAIPrompt = false" class="mobile-cancel-btn">
            ✖ Zavřít
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useQuestionStore, type Question } from '../stores/question'
import AudioControls from '../components/AudioControls.vue'

const router = useRouter()
const questionStore = useQuestionStore()

const selectedQuestion = ref<Question | null>(null)
const isCreatingNew = ref(false)
const showAIPrompt = ref(false)
const showImportModal = ref(false)
const importJson = ref('')

// Mobile state
const showMobileQuestionsList = ref(false)
const showMobileQuestionDetail = ref(false)
const showMobileNewQuestion = ref(false)
const showMobileAIPrompt = ref(false)
const mobileDetailIsNew = ref(false)

// AI Prompt fields
const aiTopic = ref('Česká historie')
const aiCount = ref(10)
const aiDifficulty = ref('medium')

// Form data
const formData = ref({
  text: '',
  choices: ['', '', '', ''],
  correctIndex: 0,
  category: '',
  difficulty: 'medium' as 'easy' | 'medium' | 'hard'
})

const generatedPrompt = computed(() => {
  return questionStore.generateAIPrompt(aiTopic.value, aiCount.value, aiDifficulty.value)
})

const goBack = () => {
  router.push('/')
}

const selectQuestion = (q: Question) => {
  selectedQuestion.value = q
  isCreatingNew.value = false
  formData.value = {
    text: q.text,
    choices: [...q.choices],
    correctIndex: q.correctIndex,
    category: q.category || '',
    difficulty: q.difficulty || 'medium'
  }
}

const showNewQuestionForm = () => {
  selectedQuestion.value = null
  isCreatingNew.value = true
  formData.value = {
    text: '',
    choices: ['', '', '', ''],
    correctIndex: 0,
    category: '',
    difficulty: 'medium'
  }
}

const addChoice = () => {
  formData.value.choices.push('')
}

const removeChoice = (index: number) => {
  formData.value.choices.splice(index, 1)
  if (formData.value.correctIndex >= formData.value.choices.length) {
    formData.value.correctIndex = formData.value.choices.length - 1
  }
}

const saveQuestion = () => {
  try {
    const data = {
      text: formData.value.text,
      choices: formData.value.choices.filter(c => c.trim().length > 0),
      correctIndex: formData.value.correctIndex,
      category: formData.value.category || undefined,
      difficulty: formData.value.difficulty,
      masteryLevel: 0
    }
    
    if (isCreatingNew.value) {
      questionStore.addQuestion(data)
      alert('✅ Otázka úspěšně vytvořena!')
    } else if (selectedQuestion.value) {
      questionStore.updateQuestion(selectedQuestion.value.id, data)
      alert('✅ Otázka úspěšně aktualizována!')
    }
    
    cancelEdit()
  } catch (error) {
    alert('❌ ' + (error as Error).message)
  }
}

const cancelEdit = () => {
  selectedQuestion.value = null
  isCreatingNew.value = false
}

// Mobile functions
const openMobileQuestionDetail = (q: Question) => {
  selectedQuestion.value = q
  mobileDetailIsNew.value = false
  formData.value = {
    text: q.text,
    choices: [...q.choices],
    correctIndex: q.correctIndex,
    category: q.category || '',
    difficulty: q.difficulty || 'medium'
  }
  showMobileQuestionsList.value = false
  showMobileQuestionDetail.value = true
}

// Watch for showMobileNewQuestion to open detail modal
watch(showMobileNewQuestion, (newVal) => {
  if (newVal) {
    selectedQuestion.value = null
    mobileDetailIsNew.value = true
    formData.value = {
      text: '',
      choices: ['', '', '', ''],
      correctIndex: 0,
      category: '',
      difficulty: 'medium'
    }
    showMobileNewQuestion.value = false
    showMobileQuestionDetail.value = true
  }
})

const saveMobileQuestion = () => {
  try {
    const data = {
      text: formData.value.text,
      choices: formData.value.choices.filter(c => c.trim().length > 0),
      correctIndex: formData.value.correctIndex,
      category: formData.value.category || undefined,
      difficulty: formData.value.difficulty,
      masteryLevel: 0
    }
    
    if (mobileDetailIsNew.value) {
      questionStore.addQuestion(data)
      alert('✅ Otázka úspěšně vytvořena!')
    } else if (selectedQuestion.value) {
      questionStore.updateQuestion(selectedQuestion.value.id, data)
      alert('✅ Otázka úspěšně aktualizována!')
    }
    
    closeMobileQuestionDetail()
  } catch (error) {
    alert('❌ ' + (error as Error).message)
  }
}

const closeMobileQuestionDetail = () => {
  showMobileQuestionDetail.value = false
  selectedQuestion.value = null
  mobileDetailIsNew.value = false
}

const deleteQuestion = (id: string) => {
  if (confirm('Opravdu smazat tuto otázku?')) {
    questionStore.deleteQuestion(id)
    if (selectedQuestion.value?.id === id) {
      cancelEdit()
    }
  }
}

const exportQuestions = () => {
  const json = questionStore.exportQuestions()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `questions-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

const importQuestions = () => {
  try {
    const count = questionStore.importQuestions(importJson.value)
    alert(`✅ Importováno ${count} otázek!`)
    showImportModal.value = false
    importJson.value = ''
  } catch (error) {
    alert('❌ ' + (error as Error).message)
  }
}

const copyPromptToClipboard = () => {
  navigator.clipboard.writeText(generatedPrompt.value)
  alert('✅ Prompt zkopírován do schránky!')
}

const clearAllQuestions = () => {
  if (questionStore.questions.length === 0) {
    alert('⚠️ Žádné otázky k vyčištění!')
    return
  }
  
  const count = questionStore.questions.length
  if (confirm(`⚠️ Opravdu smazat všech ${count} otázek? Tato akce je nevratná!`)) {
    questionStore.questions = []
    selectedQuestion.value = null
    isCreatingNew.value = false
    alert(`✅ Vyčištěno ${count} otázek!`)
  }
}
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.editor-view {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f1729 100%);
  overflow: hidden;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: rgba(15, 23, 42, 0.95);
  border-bottom: 2px solid rgba(59, 130, 246, 0.3);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  flex-shrink: 0;
  gap: 1rem;
}

.header-left {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
}

.editor-header h1 {
  font-size: 1.5rem;
  margin: 0;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  white-space: nowrap;
}

.btn-back {
  padding: 0.6rem 1.2rem;
  background: rgba(30, 41, 59, 0.8);
  border: 2px solid rgba(148, 163, 184, 0.3);
  border-radius: 0.5rem;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  white-space: nowrap;
  flex-shrink: 0;
}

.btn-back:hover {
  background: rgba(51, 65, 85, 0.9);
  border-color: rgba(59, 130, 246, 0.5);
  transform: translateX(-3px);
}

.editor-container {
  display: grid;
  grid-template-columns: 320px 1fr;
  height: calc(100vh - 80px);
  overflow: hidden;
  gap: 0;
}

.questions-panel {
  background: rgba(15, 23, 42, 0.9);
  border-right: 2px solid rgba(59, 130, 246, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  padding: 1.25rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
  background: rgba(30, 41, 59, 0.5);
}

.panel-header h2 {
  font-size: 1.1rem;
  margin: 0;
  color: white;
}

.panel-header .success {
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #10b981, #059669);
  border: none;
  border-radius: 0.5rem;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 0.9rem;
}

.panel-header .success:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

.questions-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.75rem;
  min-height: 0;
}

.questions-list::-webkit-scrollbar {
  width: 8px;
}

.questions-list::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.questions-list::-webkit-scrollbar-thumb {
  background: rgba(59, 130, 246, 0.5);
  border-radius: 4px;
}

.questions-list::-webkit-scrollbar-thumb:hover {
  background: rgba(59, 130, 246, 0.7);
}

.question-item {
  padding: 0.9rem;
  margin-bottom: 0.6rem;
  background: rgba(30, 41, 59, 0.6);
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 2px solid transparent;
}

.question-item:hover {
  background: rgba(51, 65, 85, 0.8);
  border-color: rgba(59, 130, 246, 0.3);
  transform: translateX(3px);
}

.question-item.active {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(139, 92, 246, 0.3));
  border-color: rgba(59, 130, 246, 0.6);
  color: white;
}

.question-preview {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  min-width: 0;
}

.question-text {
  font-size: 0.9rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-wrap: break-word;
  line-height: 1.3;
  color: rgba(226, 232, 240, 0.95);
}

.question-item.active .question-text {
  color: white;
}

.difficulty-badge {
  display: inline-block;
  padding: 0.25rem 0.6rem;
  border-radius: 0.3rem;
  font-size: 0.7rem;
  font-weight: 700;
  width: fit-content;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.difficulty-badge.easy { 
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);
}

.difficulty-badge.medium { 
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
  box-shadow: 0 2px 4px rgba(245, 158, 11, 0.3);
}

.difficulty-badge.hard { 
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);
}

.btn-delete {
  padding: 0.4rem 0.6rem;
  font-size: 1.3rem;
  background: rgba(239, 68, 68, 0.2);
  border: 2px solid transparent;
  border-radius: 0.4rem;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.btn-delete:hover {
  background: rgba(239, 68, 68, 0.4);
  border-color: rgba(239, 68, 68, 0.6);
  transform: scale(1.1);
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: rgba(148, 163, 184, 0.8);
}

.empty-state p {
  margin: 0.5rem 0;
}

.hint {
  font-size: 0.85rem;
  color: rgba(148, 163, 184, 0.7);
  margin-top: 0.5rem;
}

.panel-footer {
  padding: 1rem;
  border-top: 1px solid rgba(148, 163, 184, 0.2);
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0.5rem;
  flex-shrink: 0;
  background: rgba(30, 41, 59, 0.5);
}

.panel-footer button {
  padding: 0.75rem 0.5rem;
  font-size: 0.8rem;
  background: rgba(30, 41, 59, 0.8);
  border: 2px solid rgba(148, 163, 184, 0.3);
  border-radius: 0.5rem;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.panel-footer button:hover {
  background: rgba(51, 65, 85, 0.9);
  border-color: rgba(59, 130, 246, 0.5);
  transform: translateY(-2px);
}

.panel-footer .danger-btn {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.4);
}

.panel-footer .danger-btn:hover {
  background: rgba(239, 68, 68, 0.4);
  border-color: rgba(239, 68, 68, 0.6);
}

.form-panel {
  padding: 2rem;
  overflow-y: auto;
  overflow-x: hidden;
  background: rgba(10, 14, 39, 0.3);
}

.form-panel::-webkit-scrollbar {
  width: 10px;
}

.form-panel::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
}

.form-panel::-webkit-scrollbar-thumb {
  background: rgba(59, 130, 246, 0.5);
  border-radius: 5px;
}

.question-form, .ai-prompt-section, .welcome-panel {
  max-width: 900px;
  margin: 0 auto;
  background: rgba(15, 23, 42, 0.6);
  padding: 2rem;
  border-radius: 1rem;
  border: 2px solid rgba(59, 130, 246, 0.2);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.ai-prompt-section h2,
.question-form h2 {
  margin-bottom: 1.5rem;
  color: white;
  font-size: 1.6rem;
}

.hint-box {
  background: rgba(59, 130, 246, 0.1);
  border: 2px solid rgba(59, 130, 246, 0.3);
  border-radius: 0.75rem;
  padding: 1.5rem;
  margin-bottom: 2rem;
  color: rgba(226, 232, 240, 0.9);
}

.hint-box p {
  margin: 0 0 1rem 0;
  font-weight: 600;
  color: white;
}

.hint-box ol {
  margin: 0;
  padding-left: 1.5rem;
  line-height: 1.8;
}

.hint-box li {
  margin-bottom: 0.5rem;
}

.hint-box strong {
  color: #3b82f6;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.6rem;
  color: rgba(226, 232, 240, 0.9);
  font-weight: 600;
  font-size: 0.95rem;
}

.form-group input[type="text"],
.form-group input[type="number"],
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 0.75rem;
  background: rgba(30, 41, 59, 0.6);
  border: 2px solid rgba(148, 163, 184, 0.3);
  border-radius: 0.5rem;
  color: white;
  font-size: 0.95rem;
  transition: all 0.3s;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: rgba(59, 130, 246, 0.6);
  background: rgba(30, 41, 59, 0.8);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.choice-row {
  display: flex;
  gap: 0.6rem;
  margin-bottom: 0.6rem;
  align-items: center;
}

.choice-row input[type="text"] {
  flex: 1;
}

.choice-row input[type="radio"] {
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.radio-label {
  font-size: 0.9rem;
  cursor: pointer;
  user-select: none;
  color: rgba(226, 232, 240, 0.9);
  font-weight: 500;
  white-space: nowrap;
}

.btn-remove {
  padding: 0.4rem 0.8rem;
  background: rgba(239, 68, 68, 0.2);
  border: 2px solid rgba(239, 68, 68, 0.4);
  border-radius: 0.4rem;
  color: white;
  font-weight: 700;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-remove:hover {
  background: rgba(239, 68, 68, 0.4);
  border-color: rgba(239, 68, 68, 0.6);
  transform: scale(1.1);
}

.btn-add {
  padding: 0.6rem 1rem;
  background: rgba(59, 130, 246, 0.2);
  border: 2px solid rgba(59, 130, 246, 0.4);
  border-radius: 0.5rem;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 0.9rem;
}

.btn-add:hover {
  background: rgba(59, 130, 246, 0.3);
  border-color: rgba(59, 130, 246, 0.6);
  transform: translateY(-2px);
}

.button-group {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

.button-group button {
  flex: 1;
}

.btn-primary {
  padding: 1rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 1rem;
}

.btn-primary.success {
  background: linear-gradient(135deg, #10b981, #059669);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.btn-primary.success:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
}

.btn-primary.ai-btn {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
}

.btn-primary.ai-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4);
}

.btn-secondary {
  padding: 1rem 1.5rem;
  background: rgba(30, 41, 59, 0.8);
  border: 2px solid rgba(148, 163, 184, 0.3);
  border-radius: 0.5rem;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 1rem;
}

.btn-secondary:hover {
  background: rgba(51, 65, 85, 0.9);
  border-color: rgba(148, 163, 184, 0.5);
  transform: translateY(-2px);
}

.btn-icon {
  font-size: 1.2rem;
}

.ai-prompt-output {
  margin-bottom: 1.5rem;
}

.ai-prompt-output label {
  display: block;
  margin-bottom: 0.6rem;
  color: rgba(226, 232, 240, 0.9);
  font-weight: 600;
}

.prompt-textarea,
.import-textarea {
  width: 100%;
  min-height: 250px;
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
  padding: 1rem;
  background: rgba(10, 14, 27, 0.8);
  border: 2px solid rgba(59, 130, 246, 0.3);
  border-radius: 0.5rem;
  color: #10b981;
  resize: vertical;
}

.prompt-textarea:focus,
.import-textarea:focus {
  outline: none;
  border-color: rgba(59, 130, 246, 0.6);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.welcome-panel {
  text-align: center;
  padding: 4rem 2rem;
}

.welcome-icon {
  font-size: 5rem;
  margin-bottom: 1rem;
  animation: bounce 2s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.welcome-panel h2 {
  margin-bottom: 1rem;
  color: white;
  font-size: 2rem;
}

.welcome-text {
  color: rgba(226, 232, 240, 0.8);
  font-size: 1.1rem;
  margin-bottom: 2rem;
}

.welcome-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
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
  padding: 2rem;
  border-radius: 1rem;
  max-width: 700px;
  width: 90%;
  max-height: 85vh;
  overflow-y: auto;
  border: 2px solid rgba(59, 130, 246, 0.3);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: modalSlide 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes modalSlide {
  from {
    transform: translateY(-30px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-content h2 {
  margin-bottom: 1rem;
  color: white;
  font-size: 1.6rem;
}

.modal-hint {
  color: rgba(226, 232, 240, 0.8);
  margin-bottom: 1rem;
  font-size: 0.95rem;
}

/* Mobile Editor Main View - Hidden on Desktop */
.mobile-editor-main {
  display: none;
}

/* Mobile Styles */
.mobile-stats {
  background: rgba(15, 23, 42, 0.8);
  padding: 1rem;
  margin: 1rem;
  border-radius: 0.75rem;
  border: 2px solid rgba(59, 130, 246, 0.3);
  text-align: center;
}

.mobile-stats .stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mobile-stats .stat-label {
  font-size: 1rem;
  color: rgba(226, 232, 240, 0.8);
}

.mobile-stats .stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #3b82f6;
}

.mobile-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  padding: 0 1rem 1rem 1rem;
}

.mobile-btn {
  padding: 1rem;
  border: none;
  border-radius: 0.75rem;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.mobile-btn .btn-icon {
  font-size: 1.8rem;
}

.mobile-btn.primary {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
}

.mobile-btn.success {
  background: linear-gradient(135deg, #10b981, #059669);
}

.mobile-btn.ai {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
}

.mobile-btn.secondary {
  background: linear-gradient(135deg, #475569, #334155);
}

.mobile-btn.danger {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  grid-column: 1 / -1;
}

.mobile-btn:active {
  transform: scale(0.95);
}

/* Mobile Modal Styles */
.mobile-modal {
  max-height: 85vh;
  width: 95%;
  padding: 1.5rem;
}

.mobile-modal h2 {
  font-size: 1.3rem;
  margin-bottom: 1rem;
}

.mobile-questions-list {
  max-height: 60vh;
  overflow-y: auto;
  margin-bottom: 1rem;
}

.mobile-question-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  margin-bottom: 0.75rem;
  background: rgba(30, 41, 59, 0.6);
  border-radius: 0.75rem;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.mobile-question-item:active {
  background: rgba(59, 130, 246, 0.3);
  border-color: rgba(59, 130, 246, 0.6);
}

.mobile-question-preview {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
}

.btn-delete-small {
  padding: 0.5rem;
  font-size: 1.3rem;
  background: rgba(239, 68, 68, 0.2);
  border: 2px solid rgba(239, 68, 68, 0.4);
  border-radius: 0.5rem;
  color: white;
  flex-shrink: 0;
}

.btn-delete-small:active {
  background: rgba(239, 68, 68, 0.5);
  transform: scale(1.1);
}

.btn-close {
  width: 100%;
  padding: 0.75rem;
  background: rgba(30, 41, 59, 0.8);
  border: 2px solid rgba(148, 163, 184, 0.3);
  border-radius: 0.5rem;
  color: white;
  font-weight: 600;
  font-size: 1rem;
}

.mobile-question-form {
  max-height: 65vh;
  overflow-y: auto;
}

.form-row-mobile {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.choice-row-mobile {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  align-items: center;
}

.choice-row-mobile input[type="text"] {
  flex: 1;
  padding: 0.75rem;
  background: rgba(30, 41, 59, 0.6);
  border: 2px solid rgba(148, 163, 184, 0.3);
  border-radius: 0.5rem;
  color: white;
  font-size: 0.9rem;
}

.choice-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.choice-controls input[type="radio"] {
  width: 20px;
  height: 20px;
}

.radio-label-mobile {
  font-size: 1.2rem;
  color: #10b981;
  cursor: pointer;
  user-select: none;
}

.btn-remove-mobile {
  padding: 0.3rem 0.7rem;
  background: rgba(239, 68, 68, 0.2);
  border: 2px solid rgba(239, 68, 68, 0.4);
  border-radius: 0.4rem;
  color: white;
  font-weight: 700;
  font-size: 1.2rem;
}

.btn-add-mobile {
  width: 100%;
  padding: 0.75rem;
  background: rgba(59, 130, 246, 0.2);
  border: 2px solid rgba(59, 130, 246, 0.4);
  border-radius: 0.5rem;
  color: white;
  font-weight: 600;
  font-size: 0.9rem;
}

.mobile-button-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
}

.mobile-save-btn {
  padding: 0.85rem;
  background: linear-gradient(135deg, #10b981, #059669);
  border: none;
  border-radius: 0.5rem;
  color: white;
  font-weight: 600;
  font-size: 1rem;
}

.mobile-cancel-btn {
  padding: 0.85rem;
  background: rgba(30, 41, 59, 0.8);
  border: 2px solid rgba(148, 163, 184, 0.3);
  border-radius: 0.5rem;
  color: white;
  font-weight: 600;
  font-size: 1rem;
}

.mobile-copy-btn {
  padding: 0.85rem;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  border: none;
  border-radius: 0.5rem;
  color: white;
  font-weight: 600;
  font-size: 1rem;
}

.hint-box-mobile {
  background: rgba(59, 130, 246, 0.1);
  border: 2px solid rgba(59, 130, 246, 0.3);
  border-radius: 0.75rem;
  padding: 1rem;
  margin-bottom: 1rem;
  color: rgba(226, 232, 240, 0.9);
  font-size: 0.85rem;
}

.hint-box-mobile p {
  margin: 0 0 0.5rem 0;
  font-weight: 600;
  color: white;
}

.hint-box-mobile ol {
  margin: 0;
  padding-left: 1.2rem;
  line-height: 1.6;
}

.hint-box-mobile li {
  margin-bottom: 0.3rem;
}

.ai-prompt-output-mobile {
  margin-bottom: 1rem;
}

.ai-prompt-output-mobile label {
  display: block;
  margin-bottom: 0.5rem;
  color: rgba(226, 232, 240, 0.9);
  font-weight: 600;
  font-size: 0.9rem;
}

.prompt-textarea-mobile {
  width: 100%;
  min-height: 200px;
  font-family: 'Courier New', monospace;
  font-size: 0.75rem;
  padding: 0.75rem;
  background: rgba(10, 14, 27, 0.8);
  border: 2px solid rgba(59, 130, 246, 0.3);
  border-radius: 0.5rem;
  color: #10b981;
  resize: vertical;
}

/* Mobile Responsive */
@media (max-width: 768px) {
  /* Hide desktop layout */
  .editor-container.desktop-only {
    display: none !important;
  }
  
  /* Show mobile main view */
  .mobile-editor-main {
    display: block;
    flex: 1;
    overflow-y: auto;
    padding-top: 0.5rem;
  }
  
  .editor-view {
    padding: 0;
  }
  
  .editor-header {
    flex-direction: column;
    align-items: stretch;
    padding: 0.75rem;
    gap: 0.5rem;
  }
  
  .header-left {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }
  
  .header-left,
  .header-right {
    width: 100%;
  }
  
  .header-right {
    justify-content: center;
  }
  
  .editor-header h1 {
    font-size: 1.1rem;
    text-align: center;
    margin-top: 0.5rem;
  }
  
  .btn-back {
    width: 100%;
    justify-content: center;
    padding: 0.6rem;
    font-size: 0.9rem;
  }
  
  /* Import modal adjustments */
  .modal-content {
    width: 95%;
    padding: 1.5rem;
  }
  
  .import-textarea {
    font-size: 0.8rem;
  }
}

@media (max-width: 480px) {
  .editor-header h1 {
    font-size: 1rem;
  }
  
  .mobile-actions {
    grid-template-columns: 1fr;
  }
  
  .mobile-btn {
    padding: 1.25rem;
  }
}
</style>
