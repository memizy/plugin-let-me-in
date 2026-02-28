import { defineStore } from 'pinia'
import { onMemizyQuestionsLoaded } from '../services/MemizyService'
import type { Question as MemizyQuestion } from '../services/MemizyService'

export interface Question {
  id: string
  text: string
  choices: string[]
  correctIndex: number
  category?: string
  difficulty?: 'easy' | 'medium' | 'hard'
  masteryLevel: number // 0-100, tracks how well user knows this question
}

function validateQuestion(q: Question): string[] {
  const errors: string[] = []
  
  if (!q.text || q.text.trim().length === 0) {
    errors.push('Question text must not be empty')
  }
  
  if (!Array.isArray(q.choices) || q.choices.length < 2) {
    errors.push('At least 2 choices are required')
  }
  
  if (q.choices && q.choices.some(c => !c || c.trim().length === 0)) {
    errors.push('All choices must have text')
  }
  
  if (typeof q.correctIndex !== 'number' || 
      q.correctIndex < 0 || 
      q.correctIndex >= q.choices.length) {
    errors.push('Invalid correct answer index')
  }
  
  return errors
}

export const useQuestionStore = defineStore('question', {
  state: () => ({
    questions: [] as Question[]
  }),
  
  getters: {
    getQuestionById: (state) => (id: string) => {
      return state.questions.find(q => q.id === id)
    },
    
    getQuestionsByCategory: (state) => (category: string) => {
      return state.questions.filter(q => q.category === category)
    },
    
    categories: (state) => {
      const cats = new Set(state.questions.map(q => q.category).filter(Boolean))
      return Array.from(cats)
    },
    
    averageMastery: (state) => {
      if (state.questions.length === 0) return 0
      const total = state.questions.reduce((sum, q) => sum + (q.masteryLevel || 0), 0)
      return Math.round(total / state.questions.length)
    }
  },
  
  actions: {
    addQuestion(question: Omit<Question, 'id'>) {
      const errors = validateQuestion(question as Question)
      if (errors.length) {
        throw new Error(`Validation error: ${errors.join(', ')}`)
      }
      
      const newQuestion: Question = {
        ...question,
        id: crypto.randomUUID(),
        masteryLevel: question.masteryLevel ?? 0
      }
      
      this.questions.push(newQuestion)
      return newQuestion
    },
    
    updateQuestion(id: string, updates: Partial<Question>) {
      const index = this.questions.findIndex(q => q.id === id)
      if (index === -1) return false
      
      const updated = { ...this.questions[index], ...updates } as Question
      const errors = validateQuestion(updated)
      if (errors.length) {
        throw new Error(`Validation error: ${errors.join(', ')}`)
      }
      
      this.questions[index] = updated
      return true
    },
    
    deleteQuestion(id: string) {
      const index = this.questions.findIndex(q => q.id === id)
      if (index !== -1) {
        this.questions.splice(index, 1)
        return true
      }
      return false
    },
    
    validate(q: Question): string[] {
      return validateQuestion(q)
    },
    
    importQuestions(json: string) {
      try {
        const data = JSON.parse(json)
        if (!Array.isArray(data)) {
          throw new Error('JSON must contain an array of questions')
        }
        
        const imported: Question[] = []
        for (const q of data) {
          const errors = validateQuestion(q)
          if (errors.length === 0) {
            imported.push({
              ...q,
              id: crypto.randomUUID(),
              masteryLevel: q.masteryLevel ?? 0 // Initialize mastery level
            })
          }
        }
        
        this.questions.push(...imported)
        return imported.length
      } catch (e) {
        throw new Error('Import error: ' + (e as Error).message)
      }
    },
    
    exportQuestions(): string {
      return JSON.stringify(this.questions, null, 2)
    },
    
    generateAIPrompt(topic: string, count: number, difficulty: string): string {
      return `Vytvoř ${count} ${difficulty === 'easy' ? 'snadných' : difficulty === 'medium' ? 'středně těžkých' : 'těžkých'} kvízových otázek o tématu: ${topic}

Formát JSON:
[
  {
    "text": "Text otázky?",
    "choices": ["Odpověď A", "Odpověď B", "Odpověď C", "Odpověď D"],
    "correctIndex": 0,
    "category": "${topic}",
    "difficulty": "${difficulty}"
  }
]

Pravidla:
- Každá otázka má 4 možnosti
- Pouze jedna odpověď je správná
- Otázky musí být jasné a jednoznačné
- Žádné duplikáty`
    },
    
    /**
     * Update mastery level for a question based on answer correctness
     * +25 for correct, -25 for wrong (clamped 0-100)
     */
    updateMasteryLevel(questionId: string, correct: boolean) {
      const question = this.questions.find(q => q.id === questionId)
      if (!question) return
      
      const change = correct ? 25 : -25
      question.masteryLevel = Math.max(0, Math.min(100, (question.masteryLevel || 0) + change))
      
      console.log(`📚 Mastery updated: ${question.text.substring(0, 30)}... → ${question.masteryLevel}%`)
    },
    
    /**
     * Reset all mastery levels to 0
     */
    resetAllMastery() {
      this.questions.forEach(q => {
        q.masteryLevel = 0
      })
      console.log('🔄 All mastery levels reset to 0')
    },
    
    /**
     * Get a random question weighted by mastery level
     * Lower mastery = higher chance to be selected
     * Prevents selecting the same question twice in a row
     * 
     * Bucket weights:
     * - 0-25:   1.0 (100% chance if selected from bucket)
     * - 26-50:  0.7 (70% chance)
     * - 51-75:  0.4 (40% chance)
     * - 76-100: 0.1 (10% chance)
     */
    getWeightedRandomQuestion(lastQuestionId?: string): Question | null {
      if (this.questions.length === 0) return null
      if (this.questions.length === 1) return this.questions[0] || null
      
      // Create weighted buckets
      const buckets = [
        { range: [0, 25], weight: 1.0, questions: [] as Question[] },
        { range: [26, 50], weight: 0.7, questions: [] as Question[] },
        { range: [51, 75], weight: 0.4, questions: [] as Question[] },
        { range: [76, 100], weight: 0.1, questions: [] as Question[] }
      ]
      
      // Distribute questions into buckets
      for (const question of this.questions) {
        const mastery = question.masteryLevel || 0
        for (const bucket of buckets) {
          const min = bucket.range[0]
          const max = bucket.range[1]
          if (min !== undefined && max !== undefined && mastery >= min && mastery <= max) {
            bucket.questions.push(question)
            break
          }
        }
      }
      
      // Try up to 10 times to get a different question than last one
      let attempts = 0
      const maxAttempts = 10
      
      while (attempts < maxAttempts) {
        attempts++
        
        // Calculate total weight
        let totalWeight = 0
        for (const bucket of buckets) {
          totalWeight += bucket.questions.length * bucket.weight
        }
        
        if (totalWeight === 0) {
          // Fallback: all questions are at max mastery
          const availableQuestions = lastQuestionId 
            ? this.questions.filter(q => q.id !== lastQuestionId)
            : this.questions
          const selected = availableQuestions[Math.floor(Math.random() * availableQuestions.length)]
          return selected || null
        }
        
        // Random selection based on weights
        let random = Math.random() * totalWeight
        
        for (const bucket of buckets) {
          for (const question of bucket.questions) {
            random -= bucket.weight
            if (random <= 0) {
              // Found a question - check if it's different from last
              if (!lastQuestionId || question.id !== lastQuestionId) {
                console.log(`🎲 Selected question from bucket ${bucket.range[0]}-${bucket.range[1]} (mastery: ${question.masteryLevel}%)`)
                return question
              }
              // Same as last, try again
              break
            }
          }
          if (random <= 0) break
        }
      }
      
      // After max attempts, just return any question different from last
      console.warn('⚠️ Max attempts reached, selecting fallback question')
      const availableQuestions = lastQuestionId 
        ? this.questions.filter(q => q.id !== lastQuestionId)
        : this.questions
      if (availableQuestions.length > 0) {
        const selected = availableQuestions[Math.floor(Math.random() * availableQuestions.length)]
        return selected || null
      }
      return this.questions[0] || null
    },

    /**
     * Register with the Memizy SDK service.
     * The SDK handles PLUGIN_READY, INIT_SESSION, standalone mode,
     * and the ?set=<url> workflow automatically.
     */
    initMemizyListener() {
      onMemizyQuestionsLoaded((questions: MemizyQuestion[]) => {
        // The SDK service already validated & converted OQSE items.
        // Re-validate with our local validator just in case.
        const valid: Question[] = []
        for (const q of questions) {
          const errors = validateQuestion(q)
          if (errors.length === 0) {
            valid.push(q)
          } else {
            console.warn('[QuestionStore] Skipping invalid SDK question', q.id, errors)
          }
        }

        if (valid.length > 0) {
          this.questions = valid
          console.log(`[QuestionStore] Loaded ${valid.length} questions from Memizy SDK`)
        }
      })
    }
  },
  
  persist: true
})
