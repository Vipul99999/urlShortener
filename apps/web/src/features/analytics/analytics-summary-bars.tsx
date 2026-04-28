'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

type Props = {
  totalLinks: number
  totalClicks: number
  uniqueClicks: number
}

export function AnalyticsSummaryBars({ totalLinks, totalClicks, uniqueClicks }: Props) {
  const data = [
    { name: 'Links', value: totalLinks },
    { name: 'Clicks', value: totalClicks },
    { name: 'Unique', value: uniqueClicks }
  ]

  return (
    <div className="h-[320px] w-full rounded-[28px] border border-white/10 bg-white/5 p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">Workspace summary</h3>
        <p className="text-sm text-white/55">Quick comparison of key metrics</p>
      </div>

      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis dataKey="name" stroke="rgba(255,255,255,0.45)" />
          <YAxis stroke="rgba(255,255,255,0.45)" />
          <Tooltip
            contentStyle={{
              background: '#0f172a',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              color: 'white'
            }}
          />
          <Bar dataKey="value" fill="#22d3ee" radius={[10, 10, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}