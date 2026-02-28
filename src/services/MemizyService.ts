/**
 * MemizyService — singleton wrapper around @memizy/plugin-sdk
 *
 * Initialises the SDK once, converts incoming OQSE items into the internal
 * Question format, and exposes helper methods so the rest of the codebase
 * never touches `window.postMessage` directly.
 */

import { MemizyPlugin } from '@memizy/plugin-sdk'
import type { InitSessionPayload, OQSEItem, SessionSettings } from '@memizy/plugin-sdk'

// ── Internal Question type (mirrors stores/question.ts) ──────────────
export interface Question {
  id: string
  text: string
  choices: string[]
  correctIndex: number
  category?: string
  difficulty?: 'easy' | 'medium' | 'hard'
  masteryLevel: number
}

// ── OQSE → Question converter ────────────────────────────────────────

/**
 * Convert a raw OQSE item into the internal Question format.
 * Returns `null` if the item cannot be meaningfully converted.
 */
function oqseItemToQuestion(item: OQSEItem): Question | null {
  // The OQSE item may carry data under various keys depending on the
  // content author.  We support the most common shapes.
  const text: string =
    (item.question as string) ??
    (item.text as string) ??
    (item.prompt as string) ??
    ''

  if (!text.trim()) return null

  // Choices / options array
  const rawChoices: unknown[] =
    (item.choices as unknown[]) ??
    (item.options as unknown[]) ??
    []

  const choices: string[] = rawChoices.map(c => String(c))
  if (choices.length < 2) return null

  // Correct index
  let correctIndex = -1
  if (typeof item.correctIndex === 'number') {
    correctIndex = item.correctIndex
  } else if (typeof item.answer === 'string' && choices.length) {
    correctIndex = choices.findIndex(c => c === item.answer)
  } else if (typeof item.correct === 'number') {
    correctIndex = item.correct as number
  }
  if (correctIndex < 0 || correctIndex >= choices.length) return null

  // Optional metadata
  const category = (item.category as string) ?? undefined
  const rawDifficulty = (item.difficulty as string) ?? undefined
  const difficulty =
    rawDifficulty === 'easy' || rawDifficulty === 'medium' || rawDifficulty === 'hard'
      ? rawDifficulty
      : undefined

  return {
    id: item.id,
    text,
    choices,
    correctIndex,
    category,
    difficulty,
    masteryLevel: 0,
  }
}

// ── Singleton SDK instance ───────────────────────────────────────────

let plugin: MemizyPlugin | null = null
let sessionSettings: SessionSettings | null = null

/** Registered external callback – the question store will subscribe here. */
let onQuestionsLoaded: ((questions: Question[]) => void) | null = null

/** Registered external callback – fired on session abort. */
let onSessionAborted: (() => void) | null = null

/**
 * Initialise the Memizy SDK.  Safe to call multiple times — the second
 * call onwards is a no-op.
 */
export function initMemizySDK(): MemizyPlugin {
  if (plugin) return plugin

  plugin = new MemizyPlugin({
    id: 'https://memizy.com/plugins/let-me-in',
    version: '0.1.0',
    standaloneTimeout: 2500,
    debug: import.meta.env.DEV,
  })

  plugin
    .onInit((payload: InitSessionPayload) => {
      sessionSettings = payload.settings
      console.log(
        `[MemizyService] INIT_SESSION received — ${payload.items.length} items, locale=${payload.settings.locale}`,
      )

      const questions: Question[] = []
      for (const item of payload.items) {
        const q = oqseItemToQuestion(item)
        if (q) {
          questions.push(q)
        } else {
          console.warn('[MemizyService] Skipping unsupported item', item.id)
          plugin!.skip(item.id, 'not_supported')
        }
      }

      if (questions.length > 0 && onQuestionsLoaded) {
        onQuestionsLoaded(questions)
      }
    })
    .onResumed(() => {
      console.log('[MemizyService] SESSION_RESUMED')
    })
    .onAborted((reason) => {
      console.log('[MemizyService] SESSION_ABORTED —', reason)
      onSessionAborted?.()
    })

  return plugin
}

// ── Public helpers used by stores / components ───────────────────────

/** Get the SDK instance (init first if needed). */
export function getMemizyPlugin(): MemizyPlugin {
  return plugin ?? initMemizySDK()
}

/** Register a callback that fires when OQSE items are received. */
export function onMemizyQuestionsLoaded(cb: (questions: Question[]) => void) {
  onQuestionsLoaded = cb
}

/** Register a callback that fires on session abort. */
export function onMemizySessionAborted(cb: () => void) {
  onSessionAborted = cb
}

/** Report an answered item to the host. */
export function reportAnswer(
  itemId: string,
  isCorrect: boolean,
  answer?: string,
  timeSpent?: number,
) {
  getMemizyPlugin().answer(itemId, isCorrect, { answer, timeSpent })
}

/** Report a skipped item to the host. */
export function reportSkip(itemId: string) {
  getMemizyPlugin().skip(itemId)
}

/** Signal session complete to the host. */
export function reportComplete(score?: number | null) {
  getMemizyPlugin().complete({ score })
}

/** Push progress to the host HUD. */
export function reportProgress(done: number, total: number) {
  getMemizyPlugin().updateProgress(done, total)
}

/** Signal internal pause. */
export function reportPause() {
  getMemizyPlugin().pause()
}

/** Start an item timer (auto time-tracking for answers). */
export function startItemTimer(itemId: string) {
  getMemizyPlugin().startItemTimer(itemId)
}

/** Stop an item timer (returned ms). */
export function stopItemTimer(itemId: string): number {
  return getMemizyPlugin().stopItemTimer(itemId)
}

/** Get current session settings (if available). */
export function getSessionSettings(): SessionSettings | null {
  return sessionSettings
}

/** Destroy the SDK instance (cleanup). */
export function destroyMemizySDK() {
  plugin?.destroy()
  plugin = null
  sessionSettings = null
}
