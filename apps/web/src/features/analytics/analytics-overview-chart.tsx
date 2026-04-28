'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

type Point = {
  date: string
  clicks: number
  uniqueClicks: number
}

type Props = {
  data: Point[]
}

export function AnalyticsOverviewChart({ data }: Props) {
  const chartData = data.map((item) => ({
    ...item,
    label: new Date(item.date).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    })
  }))

  return (
    <div className="h-[320px] w-full rounded-[28px] border border-white/10 bg-white/5 p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">Performance trend</h3>
        <p className="text-sm text-white/55">Clicks and unique clicks over time</p>
      </div>

      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis dataKey="label" stroke="rgba(255,255,255,0.45)" />
          <YAxis stroke="rgba(255,255,255,0.45)" />
          <Tooltip
            contentStyle={{
              background: '#0f172a',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              color: 'white'
            }}
          />
          <Line
            type="monotone"
            dataKey="clicks"
            strokeWidth={3}
            stroke="#22d3ee"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="uniqueClicks"
            strokeWidth={3}
            stroke="#818cf8"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}