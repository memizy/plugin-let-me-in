<template>
  <div class="audio-controls">
    <button 
      class="audio-btn" 
      @click="toggleMusic"
      :title="musicMuted ? 'Zapnout hudbu' : 'Vypnout hudbu'"
    >
      <span v-if="!musicMuted">🎵</span>
      <span v-else>🔇</span>
    </button>
    
    <button 
      class="audio-btn" 
      @click="toggleSFX"
      :title="sfxMuted ? 'Zapnout zvuky' : 'Vypnout zvuky'"
    >
      <span v-if="!sfxMuted">🔊</span>
      <span v-else>🔇</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { audioService } from '../services/AudioService'

// Načíst uložený stav z localStorage
const musicMuted = ref(localStorage.getItem('musicMuted') === 'true')
const sfxMuted = ref(localStorage.getItem('sfxMuted') === 'true')

// Aplikovat uložený stav při načtení komponenty
onMounted(() => {
  if (musicMuted.value) {
    audioService.setMusicVolume(0)
  }
  if (sfxMuted.value) {
    audioService.setSFXVolume(0)
  }
})

const toggleMusic = () => {
  musicMuted.value = !musicMuted.value
  localStorage.setItem('musicMuted', musicMuted.value.toString())
  
  if (musicMuted.value) {
    audioService.setMusicVolume(0)
  } else {
    audioService.setMusicVolume(0.5)
  }
}

const toggleSFX = () => {
  sfxMuted.value = !sfxMuted.value
  localStorage.setItem('sfxMuted', sfxMuted.value.toString())
  
  if (sfxMuted.value) {
    audioService.setSFXVolume(0)
  } else {
    audioService.setSFXVolume(0.7)
  }
}
</script>

<style scoped>
.audio-controls {
  position: fixed;
  top: 1rem;
  right: 1rem;
  display: flex;
  gap: 0.5rem;
  z-index: 200;
}

.audio-btn {
  width: 50px;
  height: 50px;
  background: rgba(30, 41, 59, 0.9);
  border: 2px solid rgba(59, 130, 246, 0.3);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  transition: all 0.3s;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
}

.audio-btn:hover {
  background: rgba(59, 130, 246, 0.2);
  border-color: rgba(59, 130, 246, 0.6);
  transform: scale(1.1);
}

.audio-btn:active {
  transform: scale(0.95);
}

/* Mobile responsive */
@media (max-width: 768px) {
  .audio-controls {
    top: 0.5rem;
    right: 0.5rem;
  }
  
  .audio-btn {
    width: 40px;
    height: 40px;
    font-size: 1.2rem;
  }
}
</style>
