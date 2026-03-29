import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import ReactECharts from 'echarts-for-react'
import { getTicketStats, getTicketTrend, useThemeContext } from '@hospital/shared'

const GROUP_OPTIONS = [
  { value: 'type', label: '按类型' },
  { value: 'status', label: '按状态' },
  { value: 'assignee', label: '按处理人' },
]

const INTERVAL_OPTIONS = [
  { value: 'day', label: '按天' },
  { value: 'week', label: '按周' },
  { value: 'month', label: '按月' },
]

const PALETTE = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#4f46e5', '#4338ca', '#3730a3']

const selectClass =
  'border border-border bg-background rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent appearance-none'

export function TicketStatsPage() {
  const { resolvedTheme } = useThemeContext()
  const isDark = resolvedTheme === 'dark'

  const [groupBy, setGroupBy] = useState('type')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [interval, setInterval] = useState('day')

  const statsParams: Record<string, any> = { group_by: groupBy }
  if (dateFrom) statsParams.date_from = dateFrom
  if (dateTo) statsParams.date_to = dateTo

  const trendParams: Record<string, any> = { interval }
  if (dateFrom) trendParams.date_from = dateFrom
  if (dateTo) trendParams.date_to = dateTo

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['ticket-stats-report', groupBy, dateFrom, dateTo],
    queryFn: () => getTicketStats(statsParams),
  })

  const { data: trendData, isLoading: trendLoading } = useQuery({
    queryKey: ['ticket-trend-report', interval, dateFrom, dateTo],
    queryFn: () => getTicketTrend(trendParams),
  })

  const axisColor = isDark ? 'rgba(148,163,184,0.4)' : 'rgba(100,116,139,0.4)'
  const labelColor = isDark ? 'rgba(148,163,184,0.7)' : 'rgba(71,85,105,0.8)'
  const splitLineColor = isDark ? 'rgba(148,163,184,0.08)' : '#e2e8f0'
  const tooltipBg = isDark ? '#1e2433' : '#ffffff'
  const tooltipBorder = isDark ? 'rgba(148,163,184,0.15)' : '#e2e8f0'

  const items = statsData ?? []
  const trend = trendData ?? []

  // Bar chart option
  const barOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: tooltipBg,
      borderColor: tooltipBorder,
      borderWidth: 1,
      textStyle: { color: isDark ? '#e2e8f0' : '#334155', fontSize: 12 },
    },
    grid: { left: 0, right: 8, top: 8, bottom: 0, containLabel: true },
    xAxis: {
      type: 'category',
      data: items.map((d) => d.label),
      axisLine: { lineStyle: { color: axisColor } },
      axisTick: { show: false },
      axisLabel: { color: labelColor, fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: splitLineColor } },
      axisLabel: { color: labelColor, fontSize: 11 },
      axisLine: { show: false },
      axisTick: { show: false },
      minInterval: 1,
    },
    series: [
      {
        type: 'bar',
        data: items.map((d) => d.value),
        barWidth: '55%',
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: isDark ? '#818cf8' : '#a5b4fc' },
              { offset: 1, color: '#6366f1' },
            ],
          },
        },
      },
    ],
  }

  // Pie chart option
  const total = items.reduce((sum, d) => sum + d.value, 0)
  const pieOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: tooltipBg,
      borderColor: tooltipBorder,
      borderWidth: 1,
      textStyle: { color: isDark ? '#e2e8f0' : '#334155', fontSize: 12 },
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      bottom: 0,
      left: 'center',
      textStyle: { color: labelColor, fontSize: 11 },
      itemWidth: 10,
      itemHeight: 10,
    },
    series: [
      {
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['50%', '42%'],
        avoidLabelOverlap: false,
        label: {
          show: true,
          position: 'center',
          formatter: () => `{total|${total}}\n{sub|工单总数}`,
          rich: {
            total: {
              fontSize: 20,
              fontWeight: 'bold',
              color: isDark ? '#e2e8f0' : '#1e293b',
              lineHeight: 26,
            },
            sub: { fontSize: 11, color: labelColor, lineHeight: 18 },
          },
        },
        emphasis: {
          label: {
            show: true,
            formatter: () => `{total|${total}}\n{sub|工单总数}`,
            rich: {
              total: { fontSize: 20, fontWeight: 'bold', color: isDark ? '#e2e8f0' : '#1e293b', lineHeight: 26 },
              sub: { fontSize: 11, color: labelColor, lineHeight: 18 },
            },
          },
          itemStyle: { shadowBlur: 0 },
        },
        labelLine: { show: false },
        data: items.map((d, i) => ({
          name: d.label,
          value: d.value,
          itemStyle: { color: PALETTE[i % PALETTE.length] },
        })),
      },
    ],
  }

  // Trend line option
  const trendOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: tooltipBg,
      borderColor: tooltipBorder,
      borderWidth: 1,
      textStyle: { color: isDark ? '#e2e8f0' : '#334155', fontSize: 12 },
    },
    grid: { left: 0, right: 8, top: 8, bottom: 0, containLabel: true },
    xAxis: {
      type: 'category',
      data: trend.map((d) => d.date),
      axisLine: { lineStyle: { color: axisColor } },
      axisTick: { show: false },
      axisLabel: { color: labelColor, fontSize: 11 },
      boundaryGap: false,
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: splitLineColor } },
      axisLabel: { color: labelColor, fontSize: 11 },
      axisLine: { show: false },
      axisTick: { show: false },
      minInterval: 1,
    },
    series: [
      {
        type: 'line',
        data: trend.map((d) => d.count),
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { color: '#6366f1', width: 2 },
        itemStyle: { color: '#6366f1' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: isDark ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.15)' },
              { offset: 1, color: 'rgba(99,102,241,0)' },
            ],
          },
        },
      },
    ],
  }

  const Spinner = () => (
    <div className="h-52 flex items-center justify-center">
      <div className="h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const Empty = () => (
    <div className="h-52 flex items-center justify-center">
      <p className="text-sm text-muted-foreground">暂无数据</p>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">分组维度</label>
          <select
            className={selectClass}
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
          >
            {GROUP_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">开始日期</label>
          <input
            type="date"
            className={selectClass}
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">结束日期</label>
          <input
            type="date"
            className={selectClass}
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
      </div>

      {/* Bar + Pie side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-medium text-foreground mb-4">工单分布</h3>
          {statsLoading ? <Spinner /> : items.length === 0 ? <Empty /> : (
            <ReactECharts option={barOption} style={{ height: 220 }} notMerge />
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-medium text-foreground mb-4">占比分布</h3>
          {statsLoading ? <Spinner /> : items.length === 0 ? <Empty /> : (
            <ReactECharts option={pieOption} style={{ height: 220 }} notMerge />
          )}
        </div>
      </div>

      {/* Trend chart */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-foreground">工单趋势</h3>
          <select
            className={selectClass}
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
          >
            {INTERVAL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        {trendLoading ? <Spinner /> : trend.length === 0 ? <Empty /> : (
          <ReactECharts option={trendOption} style={{ height: 240 }} notMerge />
        )}
      </div>
    </div>
  )
}
