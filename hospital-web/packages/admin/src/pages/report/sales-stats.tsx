import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import ReactECharts from 'echarts-for-react'
import { getSalesStats, useThemeContext, Input, DatePicker } from '@hospital/shared'

export function SalesStatsPage() {
  const { resolvedTheme } = useThemeContext()
  const isDark = resolvedTheme === 'dark'

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [regionId, setRegionId] = useState('')
  const [provinceId, setProvinceId] = useState('')

  const params: Record<string, any> = {}
  if (dateFrom) params.date_from = dateFrom
  if (dateTo) params.date_to = dateTo
  if (regionId) params.region_id = regionId
  if (provinceId) params.province_id = provinceId

  const { data, isLoading } = useQuery({
    queryKey: ['sales-stats', dateFrom, dateTo, regionId, provinceId],
    queryFn: () => getSalesStats(params),
  })

  const axisColor = isDark ? 'rgba(148,163,184,0.4)' : 'rgba(100,116,139,0.4)'
  const labelColor = isDark ? 'rgba(148,163,184,0.7)' : 'rgba(71,85,105,0.8)'
  const splitLineColor = isDark ? 'rgba(148,163,184,0.08)' : '#e2e8f0'
  const tooltipBg = isDark ? '#1e2433' : '#ffffff'
  const tooltipBorder = isDark ? 'rgba(148,163,184,0.15)' : '#e2e8f0'

  const items = data ?? []

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
    legend: {
      bottom: 0,
      left: 'center',
      textStyle: { color: labelColor, fontSize: 11 },
      itemWidth: 10,
      itemHeight: 10,
    },
    grid: { left: 0, right: 8, top: 8, bottom: 40, containLabel: true },
    xAxis: {
      type: 'category',
      data: items.map((d) => d.user_name),
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
        name: '工单总数',
        type: 'bar',
        data: items.map((d) => d.ticket_count),
        barWidth: '35%',
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
      {
        name: '已解决',
        type: 'bar',
        data: items.map((d) => d.resolved_count),
        barWidth: '35%',
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: isDark ? '#6ee7b7' : '#a7f3d0' },
              { offset: 1, color: '#10b981' },
            ],
          },
        },
      },
    ],
  }

  const thClass = 'px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide'
  const tdClass = 'px-4 py-3 text-sm text-foreground'

  const Spinner = () => (
    <div className="h-52 flex items-center justify-center">
      <div className="h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">开始日期</label>
          <DatePicker
            className="w-40"
            value={dateFrom}
            onChange={setDateFrom}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">结束日期</label>
          <DatePicker
            className="w-40"
            value={dateTo}
            onChange={setDateTo}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">大区 ID</label>
          <Input
            type="text"
            placeholder="留空不筛选"
            className="w-36"
            value={regionId}
            onChange={(e) => setRegionId(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">省份 ID</label>
          <Input
            type="text"
            placeholder="留空不筛选"
            className="w-36"
            value={provinceId}
            onChange={(e) => setProvinceId(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-5 border-b border-border">
          <h3 className="text-sm font-medium text-foreground">销售人员明细</h3>
        </div>
        {isLoading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <div className="h-32 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">暂无数据</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/30">
                <tr>
                  <th className={thClass}>姓名</th>
                  <th className={thClass + ' text-right'}>工单总数</th>
                  <th className={thClass + ' text-right'}>已解决</th>
                  <th className={thClass + ' text-right'}>解决率</th>
                  <th className={thClass + ' text-right'}>平均处理时长(h)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((row) => {
                  const resolveRate =
                    row.ticket_count > 0
                      ? Math.round((row.resolved_count / row.ticket_count) * 100)
                      : 0
                  const avgHours =
                    typeof row.avg_hours === 'number' ? row.avg_hours.toFixed(1) : '—'
                  return (
                    <tr key={row.user_id} className="hover:bg-muted/20 transition-colors">
                      <td className={tdClass + ' font-medium'}>{row.user_name}</td>
                      <td className={tdClass + ' text-right'}>{row.ticket_count}</td>
                      <td className={tdClass + ' text-right'}>{row.resolved_count}</td>
                      <td className={tdClass + ' text-right'}>
                        <span
                          className={
                            resolveRate >= 80
                              ? 'text-emerald-500'
                              : resolveRate >= 50
                              ? 'text-amber-500'
                              : 'text-rose-500'
                          }
                        >
                          {resolveRate}%
                        </span>
                      </td>
                      <td className={tdClass + ' text-right'}>{avgHours}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bar chart */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-foreground mb-4">人员工单量对比</h3>
        {isLoading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <div className="h-52 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">暂无数据</p>
          </div>
        ) : (
          <ReactECharts option={barOption} style={{ height: 280 }} notMerge />
        )}
      </div>
    </div>
  )
}
