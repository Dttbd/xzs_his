export { ThemeProvider, useThemeContext } from './components/theme-provider'
export { ThemeToggle } from './components/theme-toggle'
export { useTheme } from './hooks/use-theme'

// API
export { apiClient, loginApi, logoutApi, refreshTokenApi } from './api'
export type { ApiResponse, PageResult, PageQuery, LoginResponse, UserInfo } from './api'

// API — Hospitals
export type { Hospital, HospitalCategory, FieldDefinition, HospitalField } from './api'
export {
  listHospitals, getHospital, createHospital, updateHospital, deleteHospital,
  getHospitalSummary, exportHospitals,
  listCategories, createCategory, updateCategory, deleteCategory,
  listFieldDefinitions, createFieldDefinition, updateFieldDefinition, deleteFieldDefinition,
} from './api'

// API — Tickets
export type { Ticket, TicketType, TicketStatus, TicketTransition, TicketComment, TicketAttachment, TicketLog } from './api'
export {
  listTickets, getTicket, createTicket, transitionTicket, assignTicket, addComment, addAttachment,
  listTicketTypes, createTicketType, updateTicketType, deleteTicketType,
  listTicketStatuses, createTicketStatus, updateTicketStatus, deleteTicketStatus,
  listTransitions, createTransition, updateTransition, deleteTransition,
} from './api'

// API — Organizations
export type { Region, Province } from './api'
export {
  listRegions, createRegion, updateRegion, deleteRegion,
  listProvinces, createProvince, updateProvince, deleteProvince,
} from './api'

// API — Users & Roles
export type { Role } from './api'
export {
  listUsers, getUser, createUser, updateUser, deleteUser, setUserRoles,
  listRoles, createRole, updateRole, deleteRole,
} from './api'

// API — Bulletins
export type { Bulletin } from './api'
export {
  listBulletins, getBulletin, createBulletin, updateBulletin, deleteBulletin, publishBulletin,
} from './api'

// API — Notifications
export type { Notification } from './api'
export {
  listNotifications, markNotificationRead, markAllRead, getUnreadCount,
} from './api'

// API — Reports
export type { OverviewStats, ChartDataItem, TrendItem, SalesStatsItem } from './api'
export {
  getOverview, getHospitalStats, getTicketStats, getTicketTrend, getSalesStats,
} from './api'

// API — Upload
export type { UploadResult } from './api'
export { uploadFile } from './api'

// API — Portal
export type { PortalTicket, PortalComment, PortalAttachment } from './api'
export {
  portalLoginApi,
  listPortalTickets, getPortalTicket, createPortalTicket,
  addPortalComment, addPortalAttachment,
  getPortalProfile, updatePortalProfile,
} from './api'

// Stores
export { useAuthStore } from './stores/auth-store'

// Components
export { DataTable } from './components/data-table'
export type { Column, DataTableProps } from './components/data-table'
export { Pagination } from './components/pagination'
export type { PaginationProps } from './components/pagination'
export { StatusBadge } from './components/status-badge'
export type { StatusBadgeProps } from './components/status-badge'
export { Loading } from './components/loading'
export type { LoadingProps } from './components/loading'
export { Empty } from './components/empty'
export type { EmptyProps } from './components/empty'
export { ConfirmDialog } from './components/confirm-dialog'
export type { ConfirmDialogProps } from './components/confirm-dialog'
