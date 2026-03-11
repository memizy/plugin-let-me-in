/**
 * MemizyService — singleton wrapper around @memizy/plugin-sdk v0.2.0
 *
 * Initialises the SDK once, converts incoming OQSE items into the internal
 * Question format, and exposes helper methods so the rest of the codebase
 * never touches `window.postMessage` directly.
 *
 * v0.2.0 key changes vs v0.1.x:
 * - `answer()` runs the Leitner reducer internally and sends SYNC_PROGRESS
 *   automatically — no manual progress reporting needed.
 * - `complete()` / `SESSION_COMPLETED` replaced by `exit()` / `EXIT_REQUEST`.
 * - `pause()` / `SESSION_PAUSED` removed from the protocol entirely.
 * - `updateProgress()` / `PROGRESS_UPDATE` removed (SYNC_PROGRESS takes over).
 * - `skip()` no longer accepts a reason string.
 * - `onResumed()` / `onAborted()` callbacks removed from the SDK.
 * - `InitSessionPayload.progress` carries existing ProgressRecords from the host.
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
  const text: string =
    (item.question as string) ??
    (item.text as string) ??
    (item.prompt as string) ??
    ''

  if (!text.trim()) return null

  const rawChoices: unknown[] =
    (item.choices as unknown[]) ??
    (item.options as unknown[]) ??
    []

  const choices: string[] = rawChoices.map(c => String(c))
  if (choices.length < 2) return null

  let correctIndex = -1
  if (typeof item.correctIndex === 'number') {
    correctIndex = item.correctIndex
  } else if (typeof item.answer === 'string' && choices.length) {
    correctIndex = choices.findIndex(c => c === item.answer)
  } else if (typeof item.correct === 'number') {
    correctIndex = item.correct as number
  }
  if (correctIndex < 0 || correctIndex >= choices.length) return null

  const category = (item.category as string) ?? undefined
  const rawDifficulty = (item.difficulty as string) ?? undefined
  const difficulty =
    rawDifficulty === 'easy' || rawDifficulty === 'medium' || rawDifficulty === 'hard'
      ? rawDifficulty
      : undefined

  return { id: item.id, text, choices, correctIndex, category, difficulty, masteryLevel: 0 }
}

// ── Singleton SDK instance ───────────────────────────────────────────

let plugin: MemizyPlugin | null = null
let sessionSettings: SessionSettings | null = null

/** Registered external callback – the question store subscribes here. */
let onQuestionsLoaded: ((questions: Question[]) => void) | null = null

/**
 * Initialise the Memizy SDK. Safe to call multiple times — subsequent calls
 * are no-ops and return the existing instance.
 */
export function initMemizySDK(): MemizyPlugin {
  if (plugin) return plugin

  plugin = new MemizyPlugin({
    id: 'https://memizy.com/plugins/let-me-in',
    version: '0.1.0',
    standaloneTimeout: 2500,
    debug: import.meta.env.DEV,
    // Show the floating ⚙ gear icon / settings panel in standalone/dev mode.
    showStandaloneControls: true,
  })

  plugin.onInit((payload: InitSessionPayload) => {
    sessionSettings = payload.settings
    console.log(
      `[MemizyService] INIT_SESSION — ${payload.items.length} items, locale=${payload.settings.locale}`,
      payload.progress ? `(${Object.keys(payload.progress).length} progress records)` : '(no prior progress)',
    )

    const questions: Question[] = []
    for (const item of payload.items) {
      const q = oqseItemToQuestion(item)
      if (q) {
        questions.push(q)
      } else {
        console.warn('[MemizyService] Skipping unsupported item', item.id)
        // v0.2.0: skip() no longer takes a reason parameter
        plugin!.skip(item.id)
      }
    }

    if (questions.length > 0) {
      onQuestionsLoaded?.(questions)
    }
  })

  return plugin
}

// ── Public helpers used by stores / components ───────────────────────

/** Get the SDK instance (initialises first if needed). */
export function getMemizyPlugin(): MemizyPlugin {
  return plugin ?? initMemizySDK()
}

/** Register a callback that fires when OQSE items are received and converted. */
export function onMemizyQuestionsLoaded(cb: (questions: Question[]) => void) {
  onQuestionsLoaded = cb
}

/**
 * Report an answered item to the host.
 * The SDK v0.2.0 runs the Leitner reducer internally and sends SYNC_PROGRESS
 * automatically — no manual progress call is required.
 */
export function reportAnswer(
  itemId: string,
  isCorrect: boolean,
  answer?: string,
  timeSpent?: number,
) {
  getMemizyPlugin().answer(itemId, isCorrect, { answer, timeSpent })
}

/**
 * Report a skipped item to the host.
 * Note: v0.2.0 removed the reason parameter from skip().
 */
export function reportSkip(itemId: string) {
  getMemizyPlugin().skip(itemId)
}

/**
 * Signal session exit to the host (replaces reportComplete from v0.1.x).
 * Sends EXIT_REQUEST instead of the old SESSION_COMPLETED.
 */
export function reportExit(score?: number | null) {
  getMemizyPlugin().exit({ score })
}

/** Start an item timer (auto time-tracking for answers). */
export function startItemTimer(itemId: string) {
  getMemizyPlugin().startItemTimer(itemId)
}

/** Stop an item timer and return elapsed ms. */
export function stopItemTimer(itemId: string): number {
  return getMemizyPlugin().stopItemTimer(itemId)
}

/** Get current session settings (available after INIT_SESSION). */
export function getSessionSettings(): SessionSettings | null {
  return sessionSettings
}

/** Destroy the SDK instance (cleanup on app unmount). */
export function destroyMemizySDK() {
  plugin?.destroy()
  plugin = null
  sessionSettings = null
}
