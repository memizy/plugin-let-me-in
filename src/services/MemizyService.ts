/**
 * MemizyService — singleton wrapper around @memizy/plugin-sdk v0.3.x
 *
 * Initialises the SDK once (async via `connect()`), converts incoming OQSE
 * items into the internal Question format, exposes helper methods so the rest
 * of the codebase never touches `window.postMessage` directly, and provides a
 * cloud-backed save/load mechanism via the first item's `appSpecific` field.
 *
 * v0.3.x key changes vs v0.2.x:
 * - Class renamed `MemizyPlugin` → `MemizySDK`.
 * - `onInit()` removed. Use `const session = await sdk.connect()` instead.
 * - Methods are now namespaced:
 *     `sdk.sys.exit(...)`
 *     `sdk.store.answer(...)` / `skip(...)` / `startItemTimer(...)` /
 *     `stopItemTimer(...)` / `syncProgress(...)` / `getItems()` / `getProgress()`
 * - `sessionStorage`/`localStorage` MUST NOT be touched from plugin code — the
 *   iframe sandbox runs with an opaque origin and any direct access throws.
 */

import { MemizySDK } from '@memizy/plugin-sdk'
import type {
  InitSessionPayload,
  OQSEItem,
  ProgressRecord,
  SessionSettings,
} from '@memizy/plugin-sdk'

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
 *
 * We index the item through a loose record view because the discriminated
 * union exposes different field names per type, and this plugin accepts
 * any item that resembles an MCQ-like shape.
 */
function oqseItemToQuestion(item: OQSEItem): Question | null {
  const raw = item as unknown as Record<string, unknown>

  const text: string =
    (typeof raw.question === 'string' ? raw.question : '') ||
    (typeof raw.text === 'string' ? raw.text : '') ||
    (typeof raw.prompt === 'string' ? raw.prompt : '')

  if (!text.trim()) return null

  const rawChoices: unknown[] = Array.isArray(raw.choices)
    ? (raw.choices as unknown[])
    : Array.isArray(raw.options)
      ? (raw.options as unknown[])
      : []

  const choices: string[] = rawChoices.map(c => String(c))
  if (choices.length < 2) return null

  let correctIndex = -1
  if (typeof raw.correctIndex === 'number') {
    correctIndex = raw.correctIndex
  } else if (typeof raw.answer === 'string') {
    correctIndex = choices.findIndex(c => c === raw.answer)
  } else if (typeof raw.correct === 'number') {
    correctIndex = raw.correct
  }
  if (correctIndex < 0 || correctIndex >= choices.length) return null

  const category = typeof raw.category === 'string' ? raw.category : undefined
  const rawDifficulty = typeof raw.difficulty === 'string' ? raw.difficulty : undefined
  const difficulty =
    rawDifficulty === 'easy' || rawDifficulty === 'medium' || rawDifficulty === 'hard'
      ? rawDifficulty
      : undefined

  return { id: item.id, text, choices, correctIndex, category, difficulty, masteryLevel: 0 }
}

// ── Singleton SDK instance ───────────────────────────────────────────

let sdk: MemizySDK | null = null
let sessionSettings: SessionSettings | null = null
let connectPromise: Promise<MemizySDK> | null = null

/** Registered external callback – the question store subscribes here. */
let onQuestionsLoaded: ((questions: Question[]) => void) | null = null

/**
 * Initialise the Memizy SDK. Safe to call multiple times — concurrent calls
 * share the same connection promise and subsequent awaits return the already-
 * connected instance.
 */
export async function initMemizySDK(): Promise<MemizySDK> {
  if (sdk) return sdk
  if (connectPromise) return connectPromise

  const instance = new MemizySDK({
    id: 'https://memizy.com/plugins/let-me-in',
    version: '0.1.0',
    debug: import.meta.env.DEV,
  })

  connectPromise = (async () => {
    const session: InitSessionPayload = await instance.connect()
    sessionSettings = session.settings
    sdk = instance

    console.log(
      `[MemizyService] connect() resolved — ${session.items.length} items, locale=${session.settings.locale}`,
      session.progress
        ? `(${Object.keys(session.progress).length} progress records)`
        : '(no prior progress)',
    )

    const questions: Question[] = []
    for (const item of session.items) {
      const q = oqseItemToQuestion(item)
      if (q) {
        questions.push(q)
      } else {
        console.warn('[MemizyService] Skipping unsupported item', item.id)
        instance.store.skip(item.id)
      }
    }

    if (questions.length > 0) {
      onQuestionsLoaded?.(questions)
    }

    return instance
  })()

  return connectPromise
}

// ── Public helpers used by stores / components ───────────────────────

/** Get the SDK instance. Throws if `initMemizySDK()` has not completed yet. */
function requireSDK(): MemizySDK {
  if (!sdk) {
    throw new Error(
      '[MemizyService] SDK is not connected yet. Await initMemizySDK() first.',
    )
  }
  return sdk
}

/** Get the SDK instance or `null` if it hasn't connected yet. */
export function getMemizySDK(): MemizySDK | null {
  return sdk
}

/** Register a callback that fires when OQSE items are received and converted. */
export function onMemizyQuestionsLoaded(cb: (questions: Question[]) => void) {
  onQuestionsLoaded = cb
}

/**
 * Report an answered item to the host.
 * The SDK runs the Leitner reducer internally and sends SYNC_PROGRESS
 * automatically — no manual progress call is required.
 */
export function reportAnswer(
  itemId: string,
  isCorrect: boolean,
  answer?: string,
  timeSpent?: number,
) {
  requireSDK().store.answer(itemId, isCorrect, { answer, timeSpent })
}

/** Report a skipped item to the host. */
export function reportSkip(itemId: string) {
  requireSDK().store.skip(itemId)
}

/** Signal session exit to the host. */
export function reportExit(score?: number | null) {
  void requireSDK().sys.exit({ score })
}

/** Start an item timer (auto time-tracking for answers). */
export function startItemTimer(itemId: string) {
  requireSDK().store.startItemTimer(itemId)
}

/** Stop an item timer and return elapsed ms. */
export function stopItemTimer(itemId: string): number {
  return requireSDK().store.stopItemTimer(itemId)
}

/** Get current session settings (available after connect resolves). */
export function getSessionSettings(): SessionSettings | null {
  return sessionSettings
}

// ── Cloud save via first item's appSpecific field ────────────────────

const SAVE_NAMESPACE = 'zombie_defense_save'

function emptyProgressRecord(): ProgressRecord {
  return {
    bucket: 0,
    stats: { attempts: 0, incorrect: 0, streak: 0 },
  }
}

/**
 * Persist the plugin's own game state by piggy-backing on the first OQSE
 * item's progress record via `appSpecific`. This is the sanctioned cloud
 * path — there is no `localStorage`/`sessionStorage` available inside the
 * sandboxed iframe.
 */
export async function saveGameState(data: unknown): Promise<boolean> {
  const instance = getMemizySDK()
  if (!instance) {
    console.warn('[MemizyService] saveGameState called before SDK connect')
    return false
  }

  const items = instance.store.getItems()
  const firstItemId = items[0]?.id
  if (!firstItemId) {
    console.warn('[MemizyService] saveGameState: no items to anchor save on')
    return false
  }

  const existing: ProgressRecord =
    instance.store.getProgress()[firstItemId] ?? emptyProgressRecord()

  try {
    await instance.store.syncProgress({
      [firstItemId]: {
        ...existing,
        appSpecific: {
          ...(existing.appSpecific ?? {}),
          [SAVE_NAMESPACE]: data,
        },
      },
    })
    return true
  } catch (err) {
    console.error('[MemizyService] saveGameState failed', err)
    return false
  }
}

/**
 * Retrieve the plugin's persisted game state from the first OQSE item's
 * `appSpecific` bag. Returns `null` when no save is present.
 */
export function loadGameState<T = unknown>(): T | null {
  const instance = getMemizySDK()
  if (!instance) return null

  const items = instance.store.getItems()
  const firstItemId = items[0]?.id
  if (!firstItemId) return null

  const record = instance.store.getProgress()[firstItemId]
  const appSpecific = record?.appSpecific
  if (!appSpecific) return null

  const saved = (appSpecific as Record<string, unknown>)[SAVE_NAMESPACE]
  return (saved as T) ?? null
}

/** Destroy the SDK instance (cleanup on app unmount). */
export function destroyMemizySDK() {
  sdk?.destroy()
  sdk = null
  sessionSettings = null
  connectPromise = null
}
