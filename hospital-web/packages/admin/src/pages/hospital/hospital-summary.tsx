import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getHospitalSummary, Loading, Empty } from '@hospital/shared'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import { BarChart, PieChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  BarChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  CanvasRenderer,
])

type GroupBy = 'province' | 'region' | 'category' | 'specialty'

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: 'province', label: '按省份' },
  { value: 'region', label: '按大区' },
  { value: 'category', label: '按分类' },
  { value: 'specialty', label: '按专科' },
]

export function HospitalSummaryPage() {
  const [groupBy, setGroupBy] = useState<GroupBy>('province')

  const { data, isLoading } = useQuery({
    queryKey: ['hospital-summary', groupBy],
    queryFn: () => getHospitalSummary({ group_by: groupBy }),
  })

  const chartData = useMemo(() => {
    if (!data) return []
    // Expect data to be an array of { name, count } or an object with items
    if (Array.isArray(data)) return data
    if (data.items && Array.isArray(data.items)) return data.items
    // Try to transform object { key: count }
    return Object.entries(data).map(([name, count]) => ({ name, count }))
  }, [data])

  const barOption = useMemo(() => {
    const names = chartData.map((d: any) => d.name || d.label || '')
    const values = chartData.map((d: any) => d.count ?? d.value ?? 0)

    return {
      tooltip: { trigger: 'axis' as const },
      grid: {
        left: 120,
        right: 40,
        top: 20,
        bottom: 20,
        containLabel: false,
      },
      xAxis: {
        type: 'value' as const,
        splitLine: { lineStyle: { color: 'rgba(128,128,128,0.15)' } },
      },
      yAxis: {
        type: 'category' as const,
        data: names,
        axisLabel: { fontSize: 12 },
        axisTick: { show: false },
        axisLine: { show: false },
      },
      series: [
        {
          type: 'bar' as const,
          data: values,
          barMaxWidth: 24,
          itemStyle: {
            borderRadius: [0, 4, 4, 0],
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: 'hsl(var(--accent))' },
              { offset: 1, color: 'hsl(var(--accent) / 0.6)' },
            ]),
          },
        },
      ],
    }
  }, [chartData])

  const pieOption = useMemo(() => {
    const items = chartData.map((d: any) => ({
      name: d.name || d.label || '',
      value: d.count ?? d.value ?? 0,
    }))

    return {
      tooltip: { trigger: 'item' as const },
      series: [
        {
          type: 'pie' as const,
          radius: ['40%', '70%'],
          avoidLabelOverlap: true,
          itemStyle: { borderRadius: 6, borderColor: 'transparent', borderWidth: 2 },
          label: { show: true, fontSize: 12 },
          data: items,
        },
      ],
    }
  }, [chartData])

  const selectClass =
    'border border-border bg-background rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent appearance-none'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-foreground">医院分布统计</h1>
        <select
          className={selectClass}
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value as GroupBy)}
        >
          {GROUP_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <Loading />
      ) : chartData.length === 0 ? (
        <Empty message="暂无统计数据" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Bar chart */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-medium text-muted-foreground mb-3">分布柱状图</h2>
            <ReactEChartsCore
              echarts={echarts}
              option={barOption}
              style={{ height: Math.max(300, chartData.length * 32) }}
              notMerge
            />
          </div>

          {/* Pie chart */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-medium text-muted-foreground mb-3">占比饼图</h2>
            <ReactEChartsCore
              echarts={echarts}
              option={pieOption}
              style={{ height: 400 }}
              notMerge
            />
          </div>
        </div>
      )}
    </div>
  )
}
