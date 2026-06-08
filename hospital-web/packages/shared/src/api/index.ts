export { apiClient } from './client'
export { loginApi, logoutApi, refreshTokenApi, getWechatLoginUrl, wechatCallbackApi } from './auth'
export type { ApiResponse, PageResult, PageQuery, LoginResponse, UserInfo } from './types'

// Hospitals
export type { Hospital, HospitalCategory, FieldDefinition, HospitalField } from './hospitals'
export {
  listHospitals, getHospital, createHospital, updateHospital, deleteHospital,
  getHospitalSummary, exportHospitals,
  listCategories, createCategory, updateCategory, deleteCategory,
  listFieldDefinitions, createFieldDefinition, updateFieldDefinition, deleteFieldDefinition,
} from './hospitals'

// Tickets
export type { Ticket, TicketType, TicketStatus, TicketTransition, TicketComment, TicketAttachment, TicketLog } from './tickets'
export {
  listTickets, getTicket, createTicket, transitionTicket, assignTicket, addComment, addAttachment,
  listTicketTypes, createTicketType, updateTicketType, deleteTicketType,
  listTicketStatuses, createTicketStatus, updateTicketStatus, deleteTicketStatus,
  listTransitions, createTransition, updateTransition, deleteTransition,
} from './tickets'

// Organizations
export type { Region, Province } from './organizations'
export {
  listRegions, createRegion, updateRegion, deleteRegion,
  listProvinces, createProvince, updateProvince, deleteProvince,
} from './organizations'

// Users & Roles
export type { Role } from './users'
export {
  listUsers, getUser, createUser, updateUser, deleteUser, setUserRoles, changePassword,
  listRoles, createRole, updateRole, deleteRole,
} from './users'

// Bulletins
export type { Bulletin } from './bulletins'
export {
  listBulletins, getBulletin, createBulletin, updateBulletin, deleteBulletin, publishBulletin,
} from './bulletins'

// Notifications
export type { Notification } from './notifications'
export {
  listNotifications, markNotificationRead, markAllRead, getUnreadCount,
} from './notifications'

// Reports
export type { OverviewStats, ChartDataItem, TrendItem, SalesStatsItem } from './reports'
export {
  getOverview, getHospitalStats, getTicketStats, getTicketTrend, getSalesStats,
} from './reports'

// Upload
export type { UploadResult } from './upload'
export { uploadFile } from './upload'

// Portal
export type { PortalTicket, PortalComment, PortalAttachment } from './portal'
export {
  portalLoginApi,
  listPortalTickets, getPortalTicket, createPortalTicket,
  addPortalComment, addPortalAttachment,
  getPortalProfile, updatePortalProfile,
} from './portal'
