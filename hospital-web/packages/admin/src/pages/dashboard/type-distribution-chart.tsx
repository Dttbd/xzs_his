import { useQuery } from '@tanstack/react-query'
import ReactECharts from 'echarts-for-react'
import { getTicketStats, useThemeContext } from '@hospital/shared'

const PALETTE = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#4f46e5', '#4338ca', '#3730a3']

export function TypeDistributionChart() {
  const { resolvedTheme } = useThemeContext()
  const isDark = resolvedTheme === 'dark'

  const { data, isLoading } = useQuery({
    queryKey: ['ticket-stats-type'],
    queryFn: () => getTicketStats({ group_by: 'type' }),
  })

  const total = data?.reduce((sum, item) => sum + item.value, 0) ?? 0
  const labelColor = isDark ? 'rgba(148,163,184,0.7)' : 'rgba(71,85,105,0.8)'
  const tooltipBg = isDark ? '#1e2433' : '#ffffff'
  const tooltipBorder = isDark ? 'rgba(148,163,184,0.15)' : '#e2e8f0'

  const option = {
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
        radius: ['50%', '75%'],
        center: ['50%', '42%'],
        avoidLabelOverlap: false,
        label: {
          show: true,
          position: 'center',
          formatter: () => `{total|${total}}\n{sub|工单总数}`,
          rich: {
            total: {
              fontSize: 22,
              fontWeight: 'bold',
              color: isDark ? '#e2e8f0' : '#1e293b',
              lineHeight: 28,
            },
            sub: {
              fontSize: 11,
              color: labelColor,
              lineHeight: 18,
            },
          },
        },
        emphasis: {
          label: {
            show: true,
            formatter: () => `{total|${total}}\n{sub|工单总数}`,
            rich: {
              total: {
                fontSize: 22,
                fontWeight: 'bold',
                color: isDark ? '#e2e8f0' : '#1e293b',
                lineHeight: 28,
              },
              sub: {
                fontSize: 11,
                color: labelColor,
                lineHeight: 18,
              },
            },
          },
          itemStyle: { shadowBlur: 0 },
        },
        labelLine: { show: false },
        data: (data ?? []).map((item, i) => ({
          name: item.label,
          value: item.value,
          itemStyle: { color: PALETTE[i % PALETTE.length] },
        })),
      },
    ],
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 h-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium text-foreground">工单类型分布</h3>
      </div>
      {isLoading ? (
        <div className="h-60 flex items-center justify-center">
          <div className="h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data && data.length > 0 ? (
        <ReactECharts option={option} style={{ height: 260 }} />
      ) : (
        <div className="h-60 flex items-center justify-center">
          <p className="text-sm text-muted">暂无数据</p>
        </div>
      )}
    </div>
  )
}
