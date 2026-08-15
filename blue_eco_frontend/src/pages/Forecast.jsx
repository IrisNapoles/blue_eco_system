import { useState, useEffect, useCallback } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { getSalesForecast } from '../lib/forecastApi'

const PERIOD_OPTIONS = [7, 14, 30]

export default function Forecast() {
  const [periods, setPeriods] = useState(14)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    getSalesForecast(periods)
      .then(setData)
      .catch((err) => {
        setError(
          err.response?.data?.message ||
            'Could not generate a forecast. Make sure the Prophet service is running.'
        )
      })
      .finally(() => setLoading(false))
  }, [periods])

  useEffect(() => {
    load()
  }, [load])

  const chartData = data?.forecast?.map((f) => ({
    date: f.date,
    predicted: f.predicted,
    range: [f.lower_bound, f.upper_bound],
  }))

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold text-ink">Sales Forecast</h1>
        <div className="flex gap-1 rounded-md border border-border p-1">
          {PERIOD_OPTIONS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriods(p)}
              className={`px-3 py-1 text-sm rounded ${
                periods === p ? 'bg-brand-500 text-white' : 'text-ink-soft hover:bg-canvas'
              }`}
            >
              {p}d
            </button>
          ))}
        </div>
      </div>
      <p className="mt-1 text-sm text-ink-soft">
        Predicted daily sales revenue for the next {periods} days, powered by Facebook Prophet
        trained on historical sales.
      </p>

      {loading && <p className="mt-6 text-sm text-ink-soft">Generating forecast…</p>}

      {error && !loading && (
        <div className="mt-6 rounded-md bg-danger-50 border border-danger-500/30 px-4 py-3 text-sm text-danger-700">
          {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          {data.warning && (
            <div className="mt-4 rounded-md bg-alert-50 border border-alert-500/30 px-4 py-3 text-sm text-alert-700">
              {data.warning}
            </div>
          )}

          <div className="mt-6 rounded-xl border border-border bg-surface p-5">
            <ResponsiveContainer width="100%" height={340}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: 'var(--color-ink-soft)' }}
                  tickFormatter={(d) => d.slice(5)}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--color-ink-soft)' }}
                  tickFormatter={(v) => `₱${v / 1000}k`}
                />
                <Tooltip
                  formatter={(value, name) =>
                    name === 'range'
                      ? [`₱${value[0].toFixed(0)} – ₱${value[1].toFixed(0)}`, 'Confidence range']
                      : [`₱${Number(value).toFixed(2)}`, 'Predicted']
                  }
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="range"
                  stroke="none"
                  fill="var(--color-brand-100)"
                  name="Confidence range"
                />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="var(--color-brand-500)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Predicted sales"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 rounded-xl border border-border bg-surface p-5">
            <p className="text-xs uppercase tracking-wide text-ink-soft mb-3">
              Forecast details ({data.history_points_used} days of history used)
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-soft">
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Predicted</th>
                    <th className="px-3 py-2">Range</th>
                  </tr>
                </thead>
                <tbody>
                  {data.forecast.map((f) => (
                    <tr key={f.date} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-ink-soft">{f.date}</td>
                      <td className="px-3 py-2 font-medium text-ink">
                        ₱{f.predicted.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-ink-soft">
                        ₱{f.lower_bound.toFixed(0)} – ₱{f.upper_bound.toFixed(0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
