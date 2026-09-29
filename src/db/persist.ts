import type { FitnessDB } from './schema'

/**
 * On first launch: create the AppMeta row and ask the browser for persistent storage,
 * so Android doesn't evict the data under storage pressure. Later launches only
 * re-request if permission wasn't granted before (Chrome may grant it later, e.g. once installed).
 */
export async function ensureAppMeta(db: FitnessDB, storage: StorageManager | undefined = globalThis.navigator?.storage) {
  let meta = await db.appMeta.get(1)
  if (!meta) {
    meta = {
      id: 1,
      splitPointer: 0,
      weeksSinceDeload: 0,
      deloadSkips: 0,
      persistRequested: false,
      firstLaunchAt: new Date().toISOString(),
    }
    await db.appMeta.add(meta)
  }

  if (meta.persistGranted || !storage?.persist) return meta

  const alreadyPersisted = (await storage.persisted?.()) ?? false
  const granted = alreadyPersisted || (await storage.persist())
  await db.appMeta.update(1, { persistRequested: true, persistGranted: granted })
  return { ...meta, persistRequested: true, persistGranted: granted }
}
