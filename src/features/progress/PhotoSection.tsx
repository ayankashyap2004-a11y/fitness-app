import { useRef, useState } from 'react'
import { BottomSheet } from '../../components/BottomSheet'
import { Button } from '../../components/Button'
import { usePhotos, useToday } from '../../db/hooks'
import { deletePhoto, savePhoto } from '../../db/photos'
import { db } from '../../db/schema'
import type { ProgressPhoto } from '../../db/types'
import { PHOTO_ANGLES, groupByDate, type PhotoAngle } from '../../engine/photos'
import { compressPhoto } from './compressPhoto'
import { PhotoImage } from './PhotoImage'

const ANGLE_LABELS: Record<PhotoAngle, string> = { front: 'Front', side: 'Side', back: 'Back' }

const fmt = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

export function PhotoSection() {
  const today = useToday()
  const photos = usePhotos()
  const [angle, setAngle] = useState<PhotoAngle>('front')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewing, setViewing] = useState<ProgressPhoto | null>(null)
  const [comparing, setComparing] = useState(false)
  const camera = useRef<HTMLInputElement>(null)
  const gallery = useRef<HTMLInputElement>(null)

  if (!photos) return null
  const groups = groupByDate(photos)

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      await savePhoto(db, today, angle, await compressPhoto(file))
    } catch {
      setError("Couldn't read that image. Try another photo.")
    } finally {
      setBusy(false)
      if (camera.current) camera.current.value = ''
      if (gallery.current) gallery.current.value = ''
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Progress photos</h2>
        {groups.length >= 2 && (
          <Button variant="secondary" onClick={() => setComparing(true)}>
            Compare
          </Button>
        )}
      </div>

      <div className="space-y-3 rounded-2xl border border-line bg-card p-3">
        <div className="grid grid-cols-3 gap-1" role="radiogroup" aria-label="Angle">
          {PHOTO_ANGLES.map((a) => (
            <button
              key={a}
              type="button"
              role="radio"
              aria-checked={angle === a}
              onClick={() => setAngle(a)}
              className={`min-h-11 rounded-lg text-sm ${angle === a ? 'bg-accent/15 text-accent' : 'bg-surface text-muted'}`}
            >
              {ANGLE_LABELS[a]}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => camera.current?.click()} disabled={busy}>
            Take photo
          </Button>
          <Button variant="secondary" onClick={() => gallery.current?.click()} disabled={busy}>
            From gallery
          </Button>
        </div>
        <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        <input ref={gallery} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        <p className="text-xs text-muted" role="status">
          {busy
            ? 'Saving…'
            : `Saved as today's ${ANGLE_LABELS[angle].toLowerCase()} photo, about 1080 px. Photos stay inside this app, not your gallery.`}
        </p>
        {error && <p className="text-sm text-red-300">{error}</p>}
      </div>

      {groups.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-4 py-3 text-sm text-muted">No photos yet. Weekly front, side and back shots in the same light work best.</p>
      ) : (
        <ul className="space-y-3">
          {groups.map((g) => (
            <li key={g.date}>
              <p className="mb-1 text-sm text-muted">{fmt(g.date)}</p>
              <div className="grid grid-cols-3 gap-2">
                {PHOTO_ANGLES.map((a) => {
                  const p = g.byAngle[a]
                  return p ? (
                    <button key={a} type="button" onClick={() => setViewing(p)} className="overflow-hidden rounded-xl" aria-label={`${ANGLE_LABELS[a]} photo, ${fmt(g.date)}`}>
                      <PhotoImage blob={p.blob} alt={`${ANGLE_LABELS[a]}, ${fmt(g.date)}`} className="aspect-[3/4] w-full" />
                    </button>
                  ) : (
                    <div key={a} className="flex aspect-[3/4] items-center justify-center rounded-xl border border-dashed border-line text-xs text-muted">
                      {ANGLE_LABELS[a]}
                    </div>
                  )
                })}
              </div>
            </li>
          ))}
        </ul>
      )}

      {viewing && (
        <BottomSheet
          title={`${ANGLE_LABELS[viewing.angle]} · ${fmt(viewing.date)}`}
          onClose={() => setViewing(null)}
          footer={
            <Button
              variant="secondary"
              className="w-full text-red-300"
              onClick={async () => {
                await deletePhoto(db, viewing.id!)
                setViewing(null)
              }}
            >
              Delete photo
            </Button>
          }
        >
          <PhotoImage blob={viewing.blob} alt={`${viewing.angle} photo`} fit="contain" className="mt-2 max-h-[70dvh] w-full rounded-xl" />
        </BottomSheet>
      )}

      {comparing && <CompareSheet photos={photos} dates={groups.map((g) => g.date)} onClose={() => setComparing(false)} />}
    </section>
  )
}

function CompareSheet({ photos, dates, onClose }: { photos: ProgressPhoto[]; dates: string[]; onClose: () => void }) {
  const [angle, setAngle] = useState<PhotoAngle>('front')
  const [before, setBefore] = useState(dates[dates.length - 1]!)
  const [after, setAfter] = useState(dates[0]!)
  const find = (date: string) => photos.find((p) => p.date === date && p.angle === angle)

  const picker = (label: string, value: string, set: (v: string) => void) => (
    <label className="block">
      <span className="mb-1 block text-xs text-muted">{label}</span>
      <select value={value} onChange={(e) => set(e.target.value)} className="min-h-11 w-full rounded-lg border border-line bg-surface px-2 text-base">
        {dates.map((d) => (
          <option key={d} value={d}>
            {fmt(d)}
          </option>
        ))}
      </select>
    </label>
  )

  return (
    <BottomSheet title="Compare" onClose={onClose}>
      <div className="space-y-3 pt-2">
        <div className="grid grid-cols-3 gap-1" role="radiogroup" aria-label="Angle">
          {PHOTO_ANGLES.map((a) => (
            <button key={a} type="button" role="radio" aria-checked={angle === a} onClick={() => setAngle(a)} className={`min-h-11 rounded-lg text-sm ${angle === a ? 'bg-accent/15 text-accent' : 'bg-surface text-muted'}`}>
              {ANGLE_LABELS[a]}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {picker('Before', before, setBefore)}
          {picker('After', after, setAfter)}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[before, after].map((d, i) => {
            const p = find(d)
            return p ? (
              <PhotoImage key={`${i}-${p.id}`} blob={p.blob} alt={`${angle}, ${fmt(d)}`} fit="contain" className="aspect-[3/4] w-full rounded-xl" />
            ) : (
              <div key={`${i}-none`} className="flex aspect-[3/4] items-center justify-center rounded-xl border border-dashed border-line p-2 text-center text-xs text-muted">
                No {ANGLE_LABELS[angle].toLowerCase()} photo on {fmt(d)}
              </div>
            )
          })}
        </div>
      </div>
    </BottomSheet>
  )
}
