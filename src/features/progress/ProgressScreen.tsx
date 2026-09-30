import { HistorySection } from './HistorySection'
import { PhotoSection } from './PhotoSection'
import { WeightSection } from './WeightSection'

export function ProgressScreen() {
  return (
    <div className="space-y-8 px-4 pt-6 pb-6">
      <h1 className="text-2xl font-semibold">Progress</h1>
      <WeightSection />
      <PhotoSection />
      <HistorySection />
    </div>
  )
}
