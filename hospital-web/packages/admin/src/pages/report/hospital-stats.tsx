import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import ReactECharts from 'echarts-for-react'
import { Download } from 'lucide-react'
import {
  getHospitalStats,
  exportHospitals,
  useThemeContext,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hospital/shared'

const GROUP_OPTIONS = [
  { value: 'province', label: '按省份' },
  { value: 'region', label: '按大区' },
  { value: 'category', label: '按分类' },
  { value: 'specialty_type', label: '按专科类型' },
]

export function HospitalStatsPage() {
  const { resolvedTheme } = useThemeContext()
  const isDark = resolvedTheme === 'dark'

  const [groupBy, setGroupBy] = useState('province')
  const [regionId, setRegionId] = useState('')
  const [provinceId, setProvinceId] = useState('')

  const params: Record<string, any> = { group_by: groupBy }
  if (regionId) params.region_id = regionId
  if (provinceId) params.province_id = provinceId

  const { data, isLoading } = useQuery({
    queryKey: ['hospital-stats', groupBy, regionId, provinceId],
    queryFn: () => getHospitalStats(params),
  })

  async function handleExport() {
    try {
      const blob = await exportHospitals(params)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `医院数据_${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // silent
    }
  }

  const axisColor = isDark ? 'rgba(148,163,184,0.4)' : 'rgba(100,116,139,0.4)'
  const labelColor = isDark ? 'rgba(148,163,184,0.7)' : 'rgba(71,85,105,0.8)'
  const splitLineColor = isDark ? 'rgba(148,163,184,0.08)' : '#e2e8f0'
  const tooltipBg = isDark ? '#1e2433' : '#ffffff'
  const tooltipBorder = isDark ? 'rgba(148,163,184,0.15)' : '#e2e8f0'

  const items = data ?? []

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: tooltipBg,
      borderColor: tooltipBorder,
      borderWidth: 1,
      textStyle: { color: isDark ? '#e2e8f0' : '#334155', fontSize: 12 },
    },
    grid: { left: 16, right: 24, top: 12, bottom: 12, containLabel: true },
    xAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: splitLineColor } },
      axisLabel: { color: labelColor, fontSize: 11 },
      axisLine: { show: false },
      axisTick: { show: false },
      minInterval: 1,
    },
    yAxis: {
      type: 'category',
      data: items.map((d) => d.label),
      axisLine: { lineStyle: { color: axisColor } },
      axisTick: { show: false },
      axisLabel: { color: labelColor, fontSize: 12 },
    },
    series: [
      {
        type: 'bar',
        data: items.map((d) => d.value),
        barMaxWidth: 28,
        itemStyle: {
          borderRadius: [0, 4, 4, 0],
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [
              { offset: 0, color: isDark ? '#6366f1' : '#818cf8' },
              { offset: 1, color: isDark ? '#a5b4fc' : '#6366f1' },
            ],
          },
        },
      },
    ],
  }

  const chartHeight = Math.max(320, items.length * 36)

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">分组维度</label>
          <Select value={groupBy} onValueChange={setGroupBy}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GROUP_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        <div className="ml-auto">
          <Button variant="outline" onClick={handleExport}>
            <Download size={14} strokeWidth={1.5} />
            导出 Excel
          </Button>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-foreground mb-4">医院分布</h3>
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="h-64 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">暂无数据</p>
          </div>
        ) : (
          <ReactECharts option={option} style={{ height: chartHeight }} notMerge />
        )}
      </div>
    </div>
  )
}
