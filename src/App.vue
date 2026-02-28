<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import { useQuestionStore } from './stores/question'
import { initMemizySDK, destroyMemizySDK } from './services/MemizyService'

const questionStore = useQuestionStore()

onMounted(() => {
  // Initialise the Memizy SDK (handles PLUGIN_READY, INIT_SESSION,
  // standalone mode, and ?set=<url> loading automatically).
  initMemizySDK()

  // Register the question store to receive items from the SDK.
  questionStore.initMemizyListener()
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
