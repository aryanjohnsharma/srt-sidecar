import type { Settings, Word } from './srt'

export type SavedProject = {
  id: string
  name: string
  sourceName: string
  duration: number
  updatedAt: number
  words: Word[]
  settings: Settings
}

const DB_NAME = 'srt-sidecar-local'
const STORE_NAME = 'projects'
let database: Promise<IDBDatabase> | undefined

function openDatabase() {
  if (!('indexedDB' in window)) return Promise.reject(new Error('Local project storage is unavailable in this browser.'))
  if (!database) database = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, { keyPath: 'id' })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not open local project storage.'))
  })
  return database
}

function requestValue<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Local project storage failed.'))
  })
}

export async function listProjects(): Promise<SavedProject[]> {
  const db = await openDatabase()
  const rows = await requestValue(db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll()) as SavedProject[]
  return rows.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function saveProject(project: SavedProject) {
  const db = await openDatabase()
  await requestValue(db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(project))
}

export async function deleteProject(id: string) {
  const db = await openDatabase()
  await requestValue(db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(id))
}

export async function clearProjects() {
  const db = await openDatabase()
  await requestValue(db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).clear())
}
