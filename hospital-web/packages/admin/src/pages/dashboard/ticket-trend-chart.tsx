import { useQuery } from '@tanstack/react-query'
import ReactECharts from 'echarts-for-react'
import { getTicketTrend, useThemeContext } from '@hospital/shared'

export function TicketTrendChart() {
  const { resolvedTheme } = useThemeContext()
  const isDark = resolvedTheme === 'dark'

  const { data, isLoading } = useQuery({
    queryKey: ['ticket-trend'],
    queryFn: () => getTicketTrend({ interval: 'day' }),
  })

  const axisColor = isDark ? 'rgba(148,163,184,0.4)' : 'rgba(100,116,139,0.4)'
  const labelColor = isDark ? 'rgba(148,163,184,0.7)' : 'rgba(71,85,105,0.8)'
  const splitLineColor = isDark ? 'rgba(148,163,184,0.08)' : '#e2e8f0'

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: isDark ? '#1e2433' : '#ffffff',
      borderColor: isDark ? 'rgba(148,163,184,0.15)' : '#e2e8f0',
      borderWidth: 1,
      textStyle: { color: isDark ? '#e2e8f0' : '#334155', fontSize: 12 },
    },
    grid: { left: 0, right: 8, top: 8, bottom: 0, containLabel: true },
    xAxis: {
      type: 'category',
      data: data?.map((d) => d.date) ?? [],
      axisLine: { lineStyle: { color: axisColor } },
      axisTick: { show: false },
      axisLabel: {
        color: labelColor,
        fontSize: 11,
        formatter: (val: string) => val.slice(5), // MM-DD
      },
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
        type: 'bar',
        data: data?.map((d) => d.count) ?? [],
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
        barWidth: '60%',
      },
    ],
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 h-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium text-foreground">工单趋势</h3>
        <span className="text-xs text-muted">近 30 天</span>
      </div>
      {isLoading ? (
        <div className="h-60 flex items-center justify-center">
          <div className="h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <ReactECharts option={option} style={{ height: 240 }} />
      )}
    </div>
  )
}
