export const APP_NAME = 'AutoWorkshop MMS';

export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/',
  POS: '/pos',
  INVENTORY: '/inventory',
  CUSTOMERS: '/customers',
  REPORTS: '/reports',
  SETTINGS: '/settings',
} as const;

export const TRANSACTION_STATUS = {
  PENDING: { label: 'Pending', color: 'yellow' },
  UNPAID: { label: 'Belum Lunas', color: 'red' },
  PARTIAL: { label: 'Bayar Sebagian', color: 'orange' },
  PAID: { label: 'Lunas', color: 'green' },
  CANCELLED: { label: 'Batal', color: 'gray' },
} as const;