import { useEffect, useRef } from 'react'
import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'

export interface WeightChartData {
  /** Local-noon unix seconds, one per day in view. */
  x: number[]
  weighIns: (number | null)[]
  avg7: (number | null)[]
  bandLo: (number | null)[]
  bandHi: (number | null)[]
}

const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

/** Weigh-ins as dots, the 7-day average as a line, and the goal band shaded (uPlot). */
export function WeightChart({ data }: { data: WeightChartData }) {
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const accent = css('--color-accent') || '#34d399'
    const protein = css('--color-protein') || '#60a5fa'
    const muted = css('--color-muted') || '#8b98a8'
    const line = css('--color-line') || '#232b36'

    const opts: uPlot.Options = {
      width: el.clientWidth,
      height: 220,
      padding: [8, 8, 0, 0],
      legend: { show: false },
      cursor: { drag: { x: false, y: false } },
      scales: { x: { time: true } },
      axes: [
        { stroke: muted, grid: { stroke: line }, ticks: { stroke: line }, size: 30, font: '11px system-ui' },
        { stroke: muted, grid: { stroke: line }, ticks: { stroke: line }, size: 40, font: '11px system-ui' },
      ],
      series: [
        {},
        { label: 'Weigh-in', stroke: protein, width: 0, points: { show: true, size: 6, fill: protein, stroke: protein } },
        { label: '7-day average', stroke: accent, width: 2.5, spanGaps: true, points: { show: false } },
        { label: 'Band low', stroke: 'transparent', width: 0, points: { show: false } },
        { label: 'Band high', stroke: 'transparent', width: 0, points: { show: false } },
      ],
      bands: [{ series: [4, 3], fill: 'rgba(52, 211, 153, 0.12)' }],
    }
    const plot = new uPlot(opts, [data.x, data.weighIns, data.avg7, data.bandLo, data.bandHi], el)
    const ro = new ResizeObserver(() => plot.setSize({ width: el.clientWidth, height: 220 }))
    ro.observe(el)
    return () => {
      ro.disconnect()
      plot.destroy()
    }
  }, [data])

  return <div ref={box} className="w-full" role="img" aria-label="Weight chart: weigh-ins, 7-day average and goal band" />
}
