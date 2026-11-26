/**
 * Minimal IndexedDB wrapper used by Pixelcraft (no extra deps).
 */

const DB_NAME = 'pixelcraft'
const DB_VERSION = 2

type StoreName = 'projects' | 'media' | 'settings' | 'users'

class IDBStore {
  private dbPromise: Promise<IDBDatabase> | null = null

  open(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
        req.onupgradeneeded = () => {
          const db = req.result
          const names: StoreName[] = ['projects', 'media', 'settings', 'users']
          for (const name of names) {
            if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' })
          }
        }
      })
    }
    return this.dbPromise
  }

  private request<T>(store: StoreName, mode: IDBTransactionMode, run: (os: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    return this.open().then(
      (db) =>
        new Promise<T>((resolve, reject) => {
          const tx = db.transaction(store, mode)
          const req = run(tx.objectStore(store))
          req.onsuccess = () => resolve(req.result as T)
          req.onerror = () => reject(req.error)
        }),
    )
  }

  get<T>(store: StoreName, id: string): Promise<T | undefined> {
    return this.request<T | undefined>(store, 'readonly', (os) => os.get(id))
  }

  getAll<T>(store: StoreName): Promise<T[]> {
    return this.request<T[]>(store, 'readonly', (os) => os.getAll())
  }

  put<T>(store: StoreName, value: T & { id: string }): Promise<void> {
    return this.request<void>(store, 'readwrite', (os) => os.put(value) as unknown as IDBRequest<void>)
  }

  update<T>(store: StoreName, id: string, patch: Partial<T>): Promise<void> {
    return this.request<void>(store, 'readwrite', (os) => {
      const existing = os.get(id)
      if (!existing) throw new Error('not found')
      const base = existing.result as T & { id: string }
      return os.put({ ...base, ...patch } as T & { id: string }) as unknown as IDBRequest<void>
    })
  }

  delete(store: StoreName, id: string): Promise<void> {
    return this.request<void>(store, 'readwrite', (os) => os.delete(id) as unknown as IDBRequest<void>)
  }
}

export const db = new IDBStore()
