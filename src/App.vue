<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import { useQuestionStore } from './stores/question'
import { initMemizySDK, destroyMemizySDK } from './services/MemizyService'

const questionStore = useQuestionStore()

onMounted(async () => {
  // Register the question store BEFORE awaiting connect, so the
  // callback is in place by the time the SDK pushes converted items.
  questionStore.initMemizyListener()

  try {
    // v0.3.x: connect() is async and performs the Penpal handshake
    // (or spins up the standalone mock host). The namespaced managers
    // are only available after it resolves.
    await initMemizySDK()
  } catch (err) {
    console.error('[App] Failed to connect Memizy SDK', err)
  }
})

onBeforeUnmount(() => {
  destroyMemizySDK()
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  width: 100%;
  height: 100%;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}
</style>
