import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useQuery } from 'react-query'
import api from '../services/api'
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Divider,
  Box,
  Collapse,
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  DirectionsBoat as YachtIcon,
  DirectionsCar as VehicleIcon,
  Inventory as InventoryIcon,
  Description as QuoteIcon,
  Receipt as InvoiceIcon,
  Payment as PaymentIcon,
  CalendarToday as CalendarIcon,
  Settings as SettingsIcon,
  CloudUpload as ImportIcon,
  CloudDownload as ExportIcon,
  Email as EmailIcon,
  Assessment as ReportsIcon,
  AdminPanelSettings as AdminIcon,
  ExpandLess,
  ExpandMore,
  Palette as PaletteIcon,
  Security as SecurityIcon,
  Description as TemplateIcon,
  Apps as ModuleIcon,
  AccessTime as TimeclockIcon,
  AccountBalance as AccountingIcon,
  Build as BuildIcon,
} from '@mui/icons-material'

const drawerWidth = 240

const Navigation = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [systemSettingsOpen, setSystemSettingsOpen] = useState(location.pathname.startsWith('/system-settings'))

  // Fetch enabled modules
  const { data: modules } = useQuery('modules', async () => {
    const response = await api.get('/modules')
    return response.data
  })

  // Fetch custom navigation order
  const { data: navOrder } = useQuery('navigation-order', async () => {
    const response = await api.get('/navigation/order')
    return response.data
  })

  // Check if a module is enabled
  const isModuleEnabled = (moduleKey) => {
    if (!modules) return true // Show all by default until modules load
    const module = modules.find(m => m.key === moduleKey)
    return module ? module.enabled : false
  }

  const pathMap = {
    'dashboard': '/dashboard',
    'accounting': '/accounting',
    'timeclock': '/timeclock',
    'users': '/users',
    'customers': '/customers',
    'yachts': '/yachts',
    'vehicles': '/vehicles',
    'work-orders': '/work-orders',
    'parts': '/parts',
    'services': '/services',
    'quotes': '/quotes',
    'invoices': '/invoices',
    'payments': '/payments',
    'appointments': '/appointments',
    'calendar': '/appointments/calendar',
    'maintenance': '/maintenance',
    'reports': '/reports',
  'email-log': '/email-log',
    'settings': '/settings',
  }

  const reversePathMap = Object.entries(pathMap).reduce((acc, [key, value]) => {
    acc[value] = key
    return acc
  }, {})

  const getPathFromKey = (key) => pathMap[key] || `/${key}`

  const getKeyFromPath = (path) => reversePathMap[path] || path.replace(/^\//, '')

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', roles: ['admin', 'office_staff', 'employee', 'customer'] },
    { text: 'Accounting', icon: <AccountingIcon />, path: '/accounting', roles: ['admin', 'office_staff', 'accountant'], module: 'accounting' },
    { text: 'Timeclock', icon: <TimeclockIcon />, path: '/timeclock', roles: ['admin', 'office_staff', 'employee'], module: 'timeclock' },
    { text: 'Users', icon: <PeopleIcon />, path: '/users', roles: ['admin', 'office_staff'] },
    { text: 'Customers', icon: <PeopleIcon />, path: '/customers', roles: ['admin', 'office_staff', 'accountant', 'employee'] },
    { text: 'Yachts', icon: <YachtIcon />, path: '/yachts', roles: ['admin', 'office_staff', 'employee', 'customer'], module: 'yacht' },
    { text: 'Vehicles', icon: <VehicleIcon />, path: '/vehicles', roles: ['admin', 'office_staff', 'employee'], module: 'dms' },
    { text: 'Work Orders', icon: <BuildIcon />, path: '/work-orders', roles: ['admin', 'office_staff', 'employee'], module: 'dms' },
    { text: 'Parts', icon: <InventoryIcon />, path: '/parts', roles: ['admin', 'office_staff', 'employee'] },
    { text: 'Services', icon: <InventoryIcon />, path: '/services', roles: ['admin', 'office_staff', 'employee'] },
    { text: 'Quotes', icon: <QuoteIcon />, path: '/quotes', roles: ['admin', 'office_staff', 'employee', 'customer'] },
    { text: 'Invoices', icon: <InvoiceIcon />, path: '/invoices', roles: ['admin', 'office_staff', 'accountant', 'employee', 'customer'] },
    { text: 'Payments', icon: <PaymentIcon />, path: '/payments', roles: ['admin', 'office_staff', 'employee'] },
    { text: 'Appointments', icon: <CalendarIcon />, path: '/appointments', roles: ['admin', 'office_staff', 'employee', 'customer'] },
    { text: 'Calendar View', icon: <CalendarIcon />, path: '/appointments/calendar', roles: ['admin', 'office_staff', 'employee'] },
    { text: 'Maintenance', icon: <CalendarIcon />, path: '/maintenance', roles: ['admin', 'office_staff', 'employee'], module: 'yacht' },
    { text: 'Reports', icon: <ReportsIcon />, path: '/reports', roles: ['admin', 'office_staff', 'employee'] },
    { text: 'Email Log', icon: <EmailIcon />, path: '/email-log', roles: ['admin', 'office_staff'] },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings', roles: ['admin', 'office_staff', 'employee', 'customer'] },
  ]

  const systemSettingsSubItems = [
    { text: 'Branding', icon: <PaletteIcon />, path: '/system-settings?tab=0' },
    { text: 'Payment Providers', icon: <PaymentIcon />, path: '/system-settings?tab=1' },
    { text: 'Module Control', icon: <ModuleIcon />, path: '/system-settings?tab=2' },
    { text: 'Navigation', icon: <SettingsIcon />, path: '/system-settings?tab=3' },
    { text: 'Roles & Permissions', icon: <SecurityIcon />, path: '/system-settings?tab=4' },
    { text: 'PDF Templates', icon: <TemplateIcon />, path: '/system-settings?tab=5' },
    { text: 'Email Templates', icon: <EmailIcon />, path: '/email-templates' },
    { text: 'Import Data', icon: <ImportIcon />, path: '/import' },
    { text: 'Export Data', icon: <ExportIcon />, path: '/export' },
  ]

  // Apply custom navigation order if available
  let orderedItems = menuItems.filter(item => {
    // Filter by role
    if (!item.roles.includes(user?.role)) {
      return false
    }
    // Filter by module status (if item has a module requirement)
    if (item.module && !isModuleEnabled(item.module)) {
      return false
    }
    return true
  })

  // Apply custom order and visibility if available
  if (navOrder && navOrder.length > 0) {
    const visibilityMap = new Map(
      navOrder.map(orderItem => [orderItem.item_key, orderItem.is_visible !== false])
    )

    const customOrderedItems = []
    navOrder.forEach(orderItem => {
      if (visibilityMap.get(orderItem.item_key) === false) {
        return
      }
      const item = orderedItems.find(i => getPathFromKey(orderItem.item_key) === i.path)
      if (item) {
        customOrderedItems.push(item)
      }
    })
    // Add any items not in custom order at the end
    orderedItems.forEach(item => {
      const key = getKeyFromPath(item.path)
      const isVisible = visibilityMap.has(key) ? visibilityMap.get(key) : true
      if (isVisible === false) {
        return
      }
      if (!customOrderedItems.find(i => i.path === item.path)) {
        customOrderedItems.push(item)
      }
    })
    orderedItems = customOrderedItems
  } else {
    orderedItems = orderedItems.filter(item => {
      const key = getKeyFromPath(item.path)
      const orderItem = navOrder?.find(entry => entry.item_key === key)
      return orderItem ? orderItem.is_visible !== false : true
    })
  }

  const filteredItems = orderedItems
  const isSystemSettingsPage = location.pathname.startsWith('/system-settings')

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
        },
      }}
    >
      <Toolbar />
      <Box sx={{ overflow: 'auto' }}>
        <List>
          {filteredItems.map((item) => (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => navigate(item.path)}
              >
                <ListItemIcon>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
          
          {/* System Settings expandable menu (Admin only) */}
          {user?.role === 'admin' && (
            <>
              <ListItem disablePadding>
                <ListItemButton
                  selected={isSystemSettingsPage}
                  onClick={() => setSystemSettingsOpen(!systemSettingsOpen)}
                >
                  <ListItemIcon>
                    <AdminIcon />
                  </ListItemIcon>
                  <ListItemText primary="System Settings" />
                  {systemSettingsOpen ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
              </ListItem>
              <Collapse in={systemSettingsOpen} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {systemSettingsSubItems.map((subItem, index) => (
                    <ListItemButton
                      key={index}
                      sx={{ pl: 4 }}
                      selected={location.pathname === subItem.path || (subItem.path.includes('?') && location.pathname + location.search === subItem.path)}
                      onClick={() => navigate(subItem.path)}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        {subItem.icon}
                      </ListItemIcon>
                      <ListItemText 
                        primary={subItem.text}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItemButton>
                  ))}
                </List>
              </Collapse>
            </>
          )}
        </List>
      </Box>
    </Drawer>
  )
}

export default Navigation

