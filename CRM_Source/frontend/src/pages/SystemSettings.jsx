import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import {
  Container,
  Typography,
  Box,
  Paper,
  Switch,
  FormControlLabel,
  Button,
  Alert,
  CircularProgress,
  Divider,
  TextField,
  Grid,
  IconButton,
  Card,
  CardMedia,
  CardActions,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material'
import {
  Save as SaveIcon,
  Upload as UploadIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  Palette as PaletteIcon,
  Payment as PaymentIcon,
  Security as SecurityIcon,
  Description as TemplateIcon,
  Apps as ModuleIcon,
  VpnKey as KeyIcon,
  Refresh as ResetIcon,
  Visibility as PreviewIcon,
  Edit as EditIcon,
  DragIndicator as DragIcon,
} from '@mui/icons-material'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getBackendBaseUrl } from '../utils/url'

// Tab Panel Component
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  )
}

const SystemSettings = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [currentTab, setCurrentTab] = useState(parseInt(searchParams.get('tab')) || 0)
  const [settings, setSettings] = useState({})
  const [hasChanges, setHasChanges] = useState(false)
  const defaultBrandingState = {
    crm_name: '',
    business_name: '',
    business_legal_name: '',
    business_phone: '',
    business_email: '',
    business_website: '',
    business_tax_id: '',
    business_address_line1: '',
    business_address_line2: '',
    business_city: '',
    business_state: '',
    business_postal_code: '',
    business_country: '',
    logo_login: null,
    logo_header: null,
    logo_invoice: null,
  }
  const [branding, setBranding] = useState(defaultBrandingState)
  const [logoFiles, setLogoFiles] = useState({
    logo_login: null,
    logo_header: null,
    logo_invoice: null,
  })

  // Redirect non-admin users
  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/')
    }
  }, [user, navigate])

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue)
    setSearchParams({ tab: newValue })
  }

  const { data, isLoading, error } = useQuery('system-settings', async () => {
    const response = await api.get('/settings')
    return response.data
  })

  const { data: brandingData } = useQuery('branding-settings', async () => {
    const response = await api.get('/branding')
    return response.data
  })

  useEffect(() => {
    if (data?.data) {
      const settingsObj = {}
      Object.keys(data.data).forEach(key => {
        settingsObj[key] = data.data[key].value
      })
      setSettings(settingsObj)
    }
  }, [data])

  useEffect(() => {
    if (brandingData) {
      setBranding((prev) => ({
        ...defaultBrandingState,
        ...prev,
        ...brandingData,
      }))
    }
  }, [brandingData])

  const saveMutation = useMutation(
    (settings) => api.post('/settings', { settings }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('system-settings')
        setHasChanges(false)
        alert('Settings saved successfully')
      },
    }
  )

  const brandingMutation = useMutation(
    (formData) => api.post('/branding', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('branding-settings')
        setLogoFiles({ logo_login: null, logo_header: null, logo_invoice: null })
        alert('Branding updated successfully')
      },
      onError: (error) => {
        alert('Failed to update branding: ' + (error.response?.data?.message || error.message))
      }
    }
  )

  const deleteLogoMutation = useMutation(
    (logoType) => api.delete('/branding/logo', { data: { logo_type: logoType } }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('branding-settings')
        alert('Logo deleted successfully')
      },
    }
  )

  const handleToggle = (key, value) => {
    setSettings({ ...settings, [key]: value })
    setHasChanges(true)
  }

  const handleSave = () => {
    saveMutation.mutate(settings)
  }

  const handleBrandingChange = (field, value) => {
    setBranding({ ...branding, [field]: value })
  }

  const handleLogoUpload = (logoType, file) => {
    if (file) {
      setLogoFiles({ ...logoFiles, [logoType]: file })
    }
  }

  const handleSaveBranding = () => {
    const formData = new FormData()

    const textFields = [
      'crm_name',
      'business_name',
      'business_legal_name',
      'business_phone',
      'business_email',
      'business_website',
      'business_tax_id',
      'business_address_line1',
      'business_address_line2',
      'business_city',
      'business_state',
      'business_postal_code',
      'business_country',
    ]

    textFields.forEach((field) => {
      if (branding[field] !== undefined) {
        formData.append(field, branding[field] ?? '')
      }
    })
    
    if (logoFiles.logo_login) {
      formData.append('logo_login', logoFiles.logo_login)
    }
    if (logoFiles.logo_header) {
      formData.append('logo_header', logoFiles.logo_header)
    }
    if (logoFiles.logo_invoice) {
      formData.append('logo_invoice', logoFiles.logo_invoice)
    }
    
    brandingMutation.mutate(formData)
  }

  const handleDeleteLogo = (logoType) => {
    if (window.confirm('Are you sure you want to delete this logo?')) {
      deleteLogoMutation.mutate(logoType)
    }
  }

  const getLogoUrl = (logoPath) => {
    if (!logoPath) return null
    const apiBaseUrl = getBackendBaseUrl()
    return `${apiBaseUrl}/storage/${logoPath}`
  }

  if (isLoading) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    )
  }

  if (error) {
    return (
      <Container>
        <Alert severity="error">Error loading settings</Alert>
      </Container>
    )
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
          <SettingsIcon sx={{ verticalAlign: 'middle', mr: 1, fontSize: 32 }} />
          System Settings
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Configure system-wide settings. Admin access only.
        </Typography>

        <Paper sx={{ mb: 3 }}>
          <Tabs value={currentTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
            <Tab icon={<PaletteIcon />} iconPosition="start" label="Branding" />
            <Tab icon={<PaymentIcon />} iconPosition="start" label="Payment Providers" />
            <Tab icon={<ModuleIcon />} iconPosition="start" label="Module Control" />
            <Tab icon={<SettingsIcon />} iconPosition="start" label="Navigation" />
            <Tab icon={<SecurityIcon />} iconPosition="start" label="Roles & Permissions" />
            <Tab icon={<TemplateIcon />} iconPosition="start" label="PDF Templates" />
          </Tabs>
        </Paper>

        {/* Tab 0: Branding & Appearance */}
        <TabPanel value={currentTab} index={0}>
          <BrandingSettings
            branding={branding}
            logoFiles={logoFiles}
            onBrandingChange={handleBrandingChange}
            onLogoUpload={handleLogoUpload}
            onSave={handleSaveBranding}
            onDeleteLogo={handleDeleteLogo}
            getLogoUrl={getLogoUrl}
            isSaving={brandingMutation.isLoading}
          />
        </TabPanel>

        {/* Tab 1: Payment Providers */}
        <TabPanel value={currentTab} index={1}>
          <PaymentProvidersSettings
            settings={settings}
            onToggle={handleToggle}
            onSave={handleSave}
            hasChanges={hasChanges}
            onCancel={() => {
              queryClient.invalidateQueries('system-settings')
              setHasChanges(false)
            }}
          />
        </TabPanel>

        {/* Tab 2: Module Control */}
        <TabPanel value={currentTab} index={2}>
          <ModuleControlSettings />
        </TabPanel>

        {/* Tab 3: Navigation Customization */}
        <TabPanel value={currentTab} index={3}>
          <NavigationCustomizationSettings />
        </TabPanel>

        {/* Tab 4: Roles & Permissions */}
        <TabPanel value={currentTab} index={4}>
          <RoleManagementSettings />
        </TabPanel>

        {/* Tab 5: PDF Templates */}
        <TabPanel value={currentTab} index={5}>
          <TemplateManagementSettings />
        </TabPanel>
      </Box>
    </Container>
  )
}

// Branding Settings Component
const BrandingSettings = ({ branding, logoFiles, onBrandingChange, onLogoUpload, onSave, onDeleteLogo, getLogoUrl, isSaving }) => {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        <PaletteIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
        Branding & Appearance
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Customize the CRM name and logos displayed throughout the system
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="CRM Display Name"
            value={branding.crm_name || ''}
            onChange={(e) => onBrandingChange('crm_name', e.target.value)}
            helperText="Shown on login page and application chrome"
            placeholder="Daves RV Center CRM & DMS"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Customer-Facing Business Name"
            value={branding.business_name || ''}
            onChange={(e) => onBrandingChange('business_name', e.target.value)}
            helperText="Displayed on quotes, invoices, reports, and work orders"
            placeholder="Daves RV Center"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Legal Business Name"
            value={branding.business_legal_name || ''}
            onChange={(e) => onBrandingChange('business_legal_name', e.target.value)}
            placeholder="Example Company LLC"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Tax ID / EIN"
            value={branding.business_tax_id || ''}
            onChange={(e) => onBrandingChange('business_tax_id', e.target.value)}
            placeholder="XX-XXXXXXX"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Phone"
            value={branding.business_phone || ''}
            onChange={(e) => onBrandingChange('business_phone', e.target.value)}
            placeholder="(800) 555-0123"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Email"
            value={branding.business_email || ''}
            onChange={(e) => onBrandingChange('business_email', e.target.value)}
            placeholder="info@example.com"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Website"
            value={branding.business_website || ''}
            onChange={(e) => onBrandingChange('business_website', e.target.value)}
            placeholder="https://example.com"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Address Line 1"
            value={branding.business_address_line1 || ''}
            onChange={(e) => onBrandingChange('business_address_line1', e.target.value)}
            placeholder="123 Main Street"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Address Line 2"
            value={branding.business_address_line2 || ''}
            onChange={(e) => onBrandingChange('business_address_line2', e.target.value)}
            placeholder="Suite 100"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="City"
            value={branding.business_city || ''}
            onChange={(e) => onBrandingChange('business_city', e.target.value)}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="State / Province"
            value={branding.business_state || ''}
            onChange={(e) => onBrandingChange('business_state', e.target.value)}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Postal Code"
            value={branding.business_postal_code || ''}
            onChange={(e) => onBrandingChange('business_postal_code', e.target.value)}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Country"
            value={branding.business_country || ''}
            onChange={(e) => onBrandingChange('business_country', e.target.value)}
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      <Typography variant="subtitle1" gutterBottom sx={{ mt: 3, mb: 2 }}>
        Logo Management
      </Typography>

      <Grid container spacing={3}>
        {/* Login Page Logo */}
        <Grid item xs={12} md={4}>
          <Typography variant="body2" fontWeight="bold" gutterBottom>
            Login Page Logo
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
            Recommended: 640×160px or 1280×320px @2x
          </Typography>
          {(branding.logo_login || logoFiles.logo_login) && (
            <Card sx={{ mb: 2 }}>
              <CardMedia
                component="img"
                height="120"
                image={logoFiles.logo_login ? URL.createObjectURL(logoFiles.logo_login) : getLogoUrl(branding.logo_login)}
                alt="Login Logo"
                sx={{ objectFit: 'contain', bgcolor: 'grey.100', p: 2 }}
              />
              <CardActions>
                <Button
                  size="small"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => onDeleteLogo('logo_login')}
                >
                  Delete
                </Button>
              </CardActions>
            </Card>
          )}
          <Button
            variant="outlined"
            component="label"
            startIcon={<UploadIcon />}
            fullWidth
          >
            Upload Logo
            <input
              type="file"
              hidden
              accept="image/*"
              onChange={(e) => onLogoUpload('logo_login', e.target.files[0])}
            />
          </Button>
        </Grid>

        {/* Header Logo */}
        <Grid item xs={12} md={4}>
          <Typography variant="body2" fontWeight="bold" gutterBottom>
            Header Logo
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
            Recommended: 500×60px or 1000×120px @2x
          </Typography>
          {(branding.logo_header || logoFiles.logo_header) && (
            <Card sx={{ mb: 2 }}>
              <CardMedia
                component="img"
                height="120"
                image={logoFiles.logo_header ? URL.createObjectURL(logoFiles.logo_header) : getLogoUrl(branding.logo_header)}
                alt="Header Logo"
                sx={{ objectFit: 'contain', bgcolor: 'grey.100', p: 2 }}
              />
              <CardActions>
                <Button
                  size="small"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => onDeleteLogo('logo_header')}
                >
                  Delete
                </Button>
              </CardActions>
            </Card>
          )}
          <Button
            variant="outlined"
            component="label"
            startIcon={<UploadIcon />}
            fullWidth
          >
            Upload Logo
            <input
              type="file"
              hidden
              accept="image/*"
              onChange={(e) => onLogoUpload('logo_header', e.target.files[0])}
            />
          </Button>
        </Grid>

        {/* Invoice/Quote Logo */}
        <Grid item xs={12} md={4}>
          <Typography variant="body2" fontWeight="bold" gutterBottom>
            Invoice/Quote Logo
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
            Used in PDF invoices and quotes
          </Typography>
          {(branding.logo_invoice || logoFiles.logo_invoice) && (
            <Card sx={{ mb: 2 }}>
              <CardMedia
                component="img"
                height="120"
                image={logoFiles.logo_invoice ? URL.createObjectURL(logoFiles.logo_invoice) : getLogoUrl(branding.logo_invoice)}
                alt="Invoice Logo"
                sx={{ objectFit: 'contain', bgcolor: 'grey.100', p: 2 }}
              />
              <CardActions>
                <Button
                  size="small"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => onDeleteLogo('logo_invoice')}
                >
                  Delete
                </Button>
              </CardActions>
            </Card>
          )}
          <Button
            variant="outlined"
            component="label"
            startIcon={<UploadIcon />}
            fullWidth
          >
            Upload Logo
            <input
              type="file"
              hidden
              accept="image/*"
              onChange={(e) => onLogoUpload('logo_invoice', e.target.files[0])}
            />
          </Button>
        </Grid>
      </Grid>

      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={onSave}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Branding'}
        </Button>
      </Box>
    </Paper>
  )
}

// Payment Providers Settings Component
const PaymentProvidersSettings = ({ settings, onToggle, onSave, hasChanges, onCancel }) => {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        <PaymentIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
        Payment Providers
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Enable or disable payment processing providers
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={settings.stripe_enabled || false}
              onChange={(e) => onToggle('stripe_enabled', e.target.checked)}
            />
          }
          label={
            <Box>
              <Typography variant="body1">Stripe Payment Processing</Typography>
              <Typography variant="caption" color="text.secondary">
                Allow customers to pay invoices via Stripe (credit card, etc.)
              </Typography>
            </Box>
          }
        />

        <Divider />

        <FormControlLabel
          control={
            <Switch
              checked={settings.square_enabled || false}
              onChange={(e) => onToggle('square_enabled', e.target.checked)}
            />
          }
          label={
            <Box>
              <Typography variant="body1">Square Payment Processing</Typography>
              <Typography variant="caption" color="text.secondary">
                Allow customers to pay invoices via Square
              </Typography>
            </Box>
          }
        />
      </Box>

      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button
          variant="outlined"
          onClick={onCancel}
          disabled={!hasChanges}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={onSave}
          disabled={!hasChanges}
        >
          Save Changes
        </Button>
      </Box>

      {hasChanges && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          You have unsaved changes
        </Alert>
      )}
    </Paper>
  )
}

// Module Control Settings Component
const ModuleControlSettings = () => {
  const queryClient = useQueryClient()
  const [modules, setModules] = useState([])
  const [hasChanges, setHasChanges] = useState(false)

  const { data: modulesData, isLoading } = useQuery('modules', async () => {
    const response = await api.get('/modules')
    return response.data
  }, {
    onSuccess: (data) => {
      setModules(data)
      setHasChanges(false)
    }
  })

  const saveModulesMutation = useMutation(
    (modulesData) => api.post('/modules', { modules: modulesData }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('modules')
        setHasChanges(false)
        alert('Modules updated successfully! The navigation will reflect changes on next page load.')
      },
      onError: (error) => {
        alert(error.response?.data?.message || 'Failed to update modules')
      },
    }
  )

  const handleToggleModule = (key, enabled) => {
    const updatedModules = modules.map(module =>
      module.key === key ? { ...module, enabled } : module
    )
    setModules(updatedModules)
    setHasChanges(true)
  }

  const handleSave = () => {
    const modulesUpdate = modules.map(module => ({
      key: module.key,
      enabled: module.enabled
    }))
    saveModulesMutation.mutate(modulesUpdate)
  }

  const getModuleIcon = (key) => {
    switch (key) {
      case 'yacht':
        return '🚤'
      case 'dms':
        return '🚗'
      case 'timeclock':
        return '⏰'
      case 'accounting':
        return '💰'
      default:
        return '📦'
    }
  }

  if (isLoading) {
    return <Typography>Loading modules...</Typography>
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        <ModuleIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
        Module Control
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Enable or disable system modules. Disabled modules will be hidden from navigation and unavailable to all users.
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Changes to module status will take effect after saving and refreshing the page.
      </Alert>

      <Grid container spacing={3}>
        {modules.map((module) => (
          <Grid item xs={12} md={6} key={module.key}>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                bgcolor: module.enabled ? 'background.paper' : 'grey.50',
                border: module.enabled ? '2px solid' : '1px solid',
                borderColor: module.enabled ? 'primary.main' : 'grey.300',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="h5" sx={{ mr: 1 }}>
                      {getModuleIcon(module.key)}
                    </Typography>
                    <Typography variant="h6">{module.name}</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {module.description}
                  </Typography>
                  <Chip
                    label={module.enabled ? 'Enabled' : 'Disabled'}
                    color={module.enabled ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
                <Switch
                  checked={module.enabled}
                  onChange={(e) => handleToggleModule(module.key, e.target.checked)}
                  color="primary"
                />
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button
          variant="outlined"
          onClick={() => {
            queryClient.invalidateQueries('modules')
            setHasChanges(false)
          }}
          disabled={!hasChanges}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={!hasChanges || saveModulesMutation.isLoading}
        >
          {saveModulesMutation.isLoading ? 'Saving...' : 'Save Changes'}
        </Button>
      </Box>

      {hasChanges && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          You have unsaved changes
        </Alert>
      )}
    </Paper>
  )
}

// Role Management Settings Component (imported from RoleManagement.jsx)
const RoleManagementSettings = () => {
  const queryClient = useQueryClient()
  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState(null)

  const { data: users, isLoading: usersLoading } = useQuery('all-users-roles', async () => {
    const response = await api.get('/users?per_page=1000')
    return response.data
  })

  const { data: roles, isLoading: rolesLoading } = useQuery('roles', async () => {
    const response = await api.get('/roles')
    return response.data
  })

  const disableMfaMutation = useMutation(
    (userId) => api.post(`/users/${userId}/disable-mfa`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('all-users-roles')
        alert('MFA disabled for user')
      },
      onError: (error) => {
        alert(error.response?.data?.message || 'Failed to disable MFA')
      },
    }
  )

  const updateUserRoleMutation = useMutation(
    ({ userId, role }) => api.put(`/users/${userId}`, { role }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('all-users-roles')
        alert('User role updated successfully')
      },
      onError: (error) => {
        alert(error.response?.data?.message || 'Failed to update role')
      },
    }
  )

  const handleDisableMfa = (userId) => {
    if (window.confirm('Are you sure you want to disable MFA for this user? They will need to set it up again.')) {
      disableMfaMutation.mutate(userId)
    }
  }

  const handleRoleChange = (userId, newRole) => {
    const roleLabel = getRoleDisplay(newRole)
    if (window.confirm(`Change user role to ${roleLabel}?`)) {
      updateUserRoleMutation.mutate({ userId, role: newRole })
    }
  }

  const getRoleDisplay = (role) => {
    if (role === 'office_staff') return 'Office Staff'
    if (role === 'accountant') return 'Accountant'
    if (role === 'employee') return 'Employee'
    return role?.charAt(0).toUpperCase() + role?.slice(1) || ''
  }

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return 'error'
      case 'office_staff':
        return 'primary'
      case 'accountant':
        return 'secondary'
      case 'employee':
        return 'info'
      case 'customer':
        return 'success'
      default:
        return 'default'
    }
  }

  if (usersLoading || rolesLoading) {
    return <Typography>Loading...</Typography>
  }

  return (
    <>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h6">
              <SecurityIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              Role & Permissions Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage user roles, permissions, and security settings
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<KeyIcon />}
            onClick={() => setPermissionsDialogOpen(true)}
          >
            Manage Permissions Matrix
          </Button>
        </Box>

        <TableContainer sx={{ mt: 3 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Current Role</TableCell>
                <TableCell>MFA Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users?.data?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Chip
                      label={getRoleDisplay(user.role)}
                      color={getRoleColor(user.role)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {user.mfa_enabled ? (
                      <Chip label="Enabled" color="success" size="small" />
                    ) : (
                      <Chip label="Disabled" color="default" size="small" />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setEditingRole(user)
                        setRoleDialogOpen(true)
                      }}
                      title="Change Role"
                    >
                      <EditIcon />
                    </IconButton>
                    {user.mfa_enabled && (
                      <IconButton
                        size="small"
                        color="warning"
                        onClick={() => handleDisableMfa(user.id)}
                        title="Disable MFA"
                      >
                        <KeyIcon />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Role Information */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Role Descriptions
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={2.4}>
            <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Chip label="Admin" color="error" size="small" sx={{ mb: 1 }} />
              <Typography variant="body2" gutterBottom>
                <strong>Full system access</strong>
              </Typography>
              <Typography variant="caption" display="block">
                • Manage all users and roles
              </Typography>
              <Typography variant="caption" display="block">
                • Access system settings
              </Typography>
              <Typography variant="caption" display="block">
                • Manage templates
              </Typography>
              <Typography variant="caption" display="block">
                • Edit/Delete all records
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} md={2.4}>
            <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Chip label="Office Staff" color="primary" size="small" sx={{ mb: 1 }} />
              <Typography variant="body2" gutterBottom>
                <strong>Operational access</strong>
              </Typography>
              <Typography variant="caption" display="block">
                • Manage customers/yachts
              </Typography>
              <Typography variant="caption" display="block">
                • Create/edit invoices
              </Typography>
              <Typography variant="caption" display="block">
                • Record payments
              </Typography>
              <Typography variant="caption" display="block">
                • Manage appointments
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} md={2.4}>
            <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Chip label="Accountant" color="secondary" size="small" sx={{ mb: 1 }} />
              <Typography variant="body2" gutterBottom>
                <strong>Full accounting access</strong>
              </Typography>
              <Typography variant="caption" display="block">
                • Chart of Accounts
              </Typography>
              <Typography variant="caption" display="block">
                • Journal Entries
              </Typography>
              <Typography variant="caption" display="block">
                • Bills & Vendors
              </Typography>
              <Typography variant="caption" display="block">
                • Bank Reconciliation
              </Typography>
              <Typography variant="caption" display="block">
                • Financial Reports
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} md={2.4}>
            <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Chip label="Employee" color="info" size="small" sx={{ mb: 1 }} />
              <Typography variant="body2" gutterBottom>
                <strong>Limited access</strong>
              </Typography>
              <Typography variant="caption" display="block">
                • View customers/yachts
              </Typography>
              <Typography variant="caption" display="block">
                • View invoices/quotes
              </Typography>
              <Typography variant="caption" display="block">
                • Create appointments
              </Typography>
              <Typography variant="caption" display="block">
                • View reports
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} md={2.4}>
            <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Chip label="Customer" color="success" size="small" sx={{ mb: 1 }} />
              <Typography variant="body2" gutterBottom>
                <strong>Self-service</strong>
              </Typography>
              <Typography variant="caption" display="block">
                • View own yachts
              </Typography>
              <Typography variant="caption" display="block">
                • View own invoices
              </Typography>
              <Typography variant="caption" display="block">
                • View own appointments
              </Typography>
              <Typography variant="caption" display="block">
                • Update own profile
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Change Role Dialog */}
      <Dialog open={roleDialogOpen} onClose={() => setRoleDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Change User Role</DialogTitle>
        <DialogContent>
          {editingRole && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="info" sx={{ mb: 3 }}>
                Changing role for: <strong>{editingRole.name}</strong> ({editingRole.email})
              </Alert>

              <Typography variant="body2" gutterBottom>
                Select new role:
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                <Button
                  variant={editingRole.role === 'admin' ? 'contained' : 'outlined'}
                  color="error"
                  onClick={() => handleRoleChange(editingRole.id, 'admin')}
                  disabled={editingRole.role === 'admin'}
                  fullWidth
                >
                  Admin - Full System Access
                </Button>

                <Button
                  variant={editingRole.role === 'office_staff' ? 'contained' : 'outlined'}
                  color="primary"
                  onClick={() => handleRoleChange(editingRole.id, 'office_staff')}
                  disabled={editingRole.role === 'office_staff'}
                  fullWidth
                >
                  Office Staff - Operational Access
                </Button>

                <Button
                  variant={editingRole.role === 'accountant' ? 'contained' : 'outlined'}
                  color="secondary"
                  onClick={() => handleRoleChange(editingRole.id, 'accountant')}
                  disabled={editingRole.role === 'accountant'}
                  fullWidth
                >
                  Accountant - Full Accounting Access
                </Button>

                <Button
                  variant={editingRole.role === 'employee' ? 'contained' : 'outlined'}
                  color="info"
                  onClick={() => handleRoleChange(editingRole.id, 'employee')}
                  disabled={editingRole.role === 'employee'}
                  fullWidth
                >
                  Employee - Limited Access
                </Button>

                <Button
                  variant={editingRole.role === 'customer' ? 'contained' : 'outlined'}
                  color="success"
                  onClick={() => handleRoleChange(editingRole.id, 'customer')}
                  disabled={editingRole.role === 'customer'}
                  fullWidth
                >
                  Customer - Self-Service Access
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Permissions Matrix Dialog */}
      <PermissionsMatrixDialog
        open={permissionsDialogOpen}
        onClose={() => setPermissionsDialogOpen(false)}
      />
    </>
  )
}

// Permissions Matrix Dialog Component
const PermissionsMatrixDialog = ({ open, onClose }) => {
  const queryClient = useQueryClient()
  const [permissions, setPermissions] = useState([])
  const [hasChanges, setHasChanges] = useState(false)

  const { data: matrixData, isLoading } = useQuery(
    'permissions-matrix',
    async () => {
      const response = await api.get('/roles/permissions-matrix')
      return response.data
    },
    {
      enabled: open,
      onSuccess: (data) => {
        setPermissions(data.permissions || [])
        setHasChanges(false)
      },
    }
  )

  const savePermissionsMutation = useMutation(
    (permissionsData) => api.post('/roles/permissions/bulk', { permissions: permissionsData }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('permissions-matrix')
        queryClient.invalidateQueries('roles')
        setHasChanges(false)
        alert('Permissions saved successfully!')
      },
      onError: (error) => {
        alert(error.response?.data?.message || 'Failed to save permissions')
      },
    }
  )

  const handlePermissionChange = (index, role, value) => {
    const newPermissions = [...permissions]
    newPermissions[index][role] = value
    setPermissions(newPermissions)
    setHasChanges(true)
  }

  const handleSave = () => {
    const updates = []
    permissions.forEach(perm => {
      ['admin', 'office_staff', 'accountant', 'employee', 'customer'].forEach(role => {
        if (perm[role] !== undefined) {
          updates.push({
            role,
            resource: perm.resource,
            action: perm.action,
            granted: perm[role],
          })
        }
      })
    })

    savePermissionsMutation.mutate(updates)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Interactive Permissions Matrix</Typography>
          {hasChanges && (
            <Chip label="Unsaved Changes" color="warning" size="small" />
          )}
        </Box>
      </DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          Click checkboxes to grant or revoke permissions for each role. Changes are saved when you click "Save Changes".
        </Alert>

        {isLoading ? (
          <Typography>Loading permissions...</Typography>
        ) : (
          <TableContainer sx={{ mt: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Permission</strong></TableCell>
                  <TableCell align="center"><strong>Admin</strong></TableCell>
                  <TableCell align="center"><strong>Office Staff</strong></TableCell>
                  <TableCell align="center"><strong>Accountant</strong></TableCell>
                  <TableCell align="center"><strong>Employee</strong></TableCell>
                  <TableCell align="center"><strong>Customer</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {permissions.map((perm, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell>{perm.label}</TableCell>
                    <TableCell align="center">
                      <Checkbox
                        checked={perm.admin || false}
                        onChange={(e) => handlePermissionChange(idx, 'admin', e.target.checked)}
                        color="error"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Checkbox
                        checked={perm.office_staff || false}
                        onChange={(e) => handlePermissionChange(idx, 'office_staff', e.target.checked)}
                        color="primary"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Checkbox
                        checked={perm.accountant || false}
                        onChange={(e) => handlePermissionChange(idx, 'accountant', e.target.checked)}
                        color="secondary"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Checkbox
                        checked={perm.employee || false}
                        onChange={(e) => handlePermissionChange(idx, 'employee', e.target.checked)}
                        color="info"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Checkbox
                        checked={perm.customer || false}
                        onChange={(e) => handlePermissionChange(idx, 'customer', e.target.checked)}
                        color="success"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={!hasChanges || savePermissionsMutation.isLoading}
        >
          {savePermissionsMutation.isLoading ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// Template Management Settings Component (imported from TemplateManagement.jsx)
const TemplateManagementSettings = () => {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState(0)
  const [invoiceTemplate, setInvoiceTemplate] = useState('')
  const [quoteTemplate, setQuoteTemplate] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  const { data: templates, isLoading } = useQuery('pdf-templates', async () => {
    const response = await api.get('/templates')
    return response.data
  }, {
    onSuccess: (data) => {
      setInvoiceTemplate(data.invoice || '')
      setQuoteTemplate(data.quote || '')
    }
  })

  const saveTemplateMutation = useMutation(
    (templateData) => api.post('/templates', templateData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('pdf-templates')
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      },
      onError: (error) => {
        alert(error.response?.data?.message || 'Failed to save template')
      },
    }
  )

  const resetTemplateMutation = useMutation(
    (type) => api.post(`/templates/${type}/reset`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('pdf-templates')
        alert('Template reset to default')
      },
      onError: (error) => {
        alert(error.response?.data?.message || 'Failed to reset template')
      },
    }
  )

  const handleSave = () => {
    const templateType = activeTab === 0 ? 'invoice' : 'quote'
    const templateContent = activeTab === 0 ? invoiceTemplate : quoteTemplate

    saveTemplateMutation.mutate({
      type: templateType,
      content: templateContent,
    })
  }

  const handleReset = () => {
    const templateType = activeTab === 0 ? 'invoice' : 'quote'
    
    if (window.confirm(`Are you sure you want to reset the ${templateType} template to default? This cannot be undone.`)) {
      resetTemplateMutation.mutate(templateType)
    }
  }

  const handlePreview = () => {
    alert('Preview functionality coming soon! Generate a test PDF from an actual invoice/quote to see the template in action.')
  }

  if (isLoading) {
    return <Typography>Loading templates...</Typography>
  }

  return (
    <>
      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Template saved successfully!
        </Alert>
      )}

      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Invoice Template" />
          <Tab label="Quote Template" />
        </Tabs>
      </Paper>

      <Grid container spacing={3}>
        {/* Editor */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="h6">
                  <TemplateIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                  {activeTab === 0 ? 'Invoice Template' : 'Quote Template'} Editor
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Customize the HTML template used for generating PDF documents
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<PreviewIcon />}
                  onClick={handlePreview}
                  size="small"
                >
                  Preview
                </Button>
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<ResetIcon />}
                  onClick={handleReset}
                  size="small"
                >
                  Reset
                </Button>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSave}
                  disabled={saveTemplateMutation.isLoading}
                  size="small"
                >
                  {saveTemplateMutation.isLoading ? 'Saving...' : 'Save'}
                </Button>
              </Box>
            </Box>

            <Divider sx={{ mb: 2 }} />

            <TextField
              fullWidth
              multiline
              rows={25}
              value={activeTab === 0 ? invoiceTemplate : quoteTemplate}
              onChange={(e) => {
                if (activeTab === 0) {
                  setInvoiceTemplate(e.target.value)
                } else {
                  setQuoteTemplate(e.target.value)
                }
              }}
              placeholder="Enter your HTML template here..."
              variant="outlined"
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.9rem',
                '& textarea': {
                  fontFamily: 'monospace',
                },
              }}
            />
          </Paper>
        </Grid>

        {/* Help Panel */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3, position: 'sticky', top: 20 }}>
            <Typography variant="h6" gutterBottom>
              Template Variables
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Use these Blade/Laravel template variables in your HTML:
            </Typography>

            <Box sx={{ mt: 2, maxHeight: '500px', overflow: 'auto' }}>
              <Typography variant="subtitle2" gutterBottom>
                {activeTab === 0 ? 'Invoice' : 'Quote'} Variables:
              </Typography>
              <Box component="pre" sx={{ 
                fontSize: '0.75rem', 
                backgroundColor: '#f5f5f5', 
                p: 1, 
                borderRadius: 1,
                overflow: 'auto',
              }}>
                {activeTab === 0 ? `{{ $invoice->invoice_number }}
{{ $invoice->issue_date }}
{{ $invoice->due_date }}
{{ $invoice->status }}
{{ $invoice->subtotal }}
{{ $invoice->tax_rate }}
{{ $invoice->tax_amount }}
{{ $invoice->total }}
{{ $invoice->paid_amount }}
{{ $invoice->balance }}` : `{{ $quote->quote_number }}
{{ $quote->created_at }}
{{ $quote->expiration_date }}
{{ $quote->status }}
{{ $quote->subtotal }}
{{ $quote->tax_rate }}
{{ $quote->tax_amount }}
{{ $quote->total }}`}
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                Tips:
              </Typography>
              <Typography variant="caption" display="block" gutterBottom>
                • Use standard HTML and inline CSS
              </Typography>
              <Typography variant="caption" display="block" gutterBottom>
                • External CSS files are not supported
              </Typography>
              <Typography variant="caption" display="block" gutterBottom>
                • Test frequently by generating a real PDF
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </>
  )
}

// Sortable Item Component for Navigation
const SortableNavigationItem = ({ id, item, onToggleVisibility }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : item.isVisible !== false ? 1 : 0.45,
  }

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      sx={{
        p: 2,
        mb: 1,
        display: 'flex',
        alignItems: 'center',
        cursor: 'grab',
        '&:active': {
          cursor: 'grabbing',
        },
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
      }}
      {...attributes}
      {...listeners}
    >
      <DragIcon sx={{ mr: 2, color: 'action.active' }} />
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="body1">{item.text}</Typography>
        {item.isVisible === false && (
          <Typography variant="caption" color="text.secondary">
            Hidden for this role
          </Typography>
        )}
      </Box>
      <Box
        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <Typography variant="caption" color="text.secondary">
          Visible
        </Typography>
        <Switch
          size="small"
          checked={item.isVisible !== false}
          onChange={(event) => onToggleVisibility(item.key, event.target.checked)}
          onPointerDownCapture={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        />
      </Box>
    </Paper>
  )
}

// Navigation Customization Settings Component
const NavigationCustomizationSettings = () => {
  const queryClient = useQueryClient()
  const [selectedRole, setSelectedRole] = useState('admin')
  const [navigationItems, setNavigationItems] = useState([])
  const [hasChanges, setHasChanges] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Default navigation items (same as in Navigation component)
  const defaultItems = useMemo(() => ([
    { key: 'dashboard', text: 'Dashboard', isVisible: true },
    { key: 'accounting', text: 'Accounting', isVisible: true },
    { key: 'timeclock', text: 'Timeclock', isVisible: true },
    { key: 'users', text: 'Users', isVisible: true },
    { key: 'customers', text: 'Customers', isVisible: true },
    { key: 'yachts', text: 'Yachts', isVisible: true },
    { key: 'vehicles', text: 'Vehicles', isVisible: true },
    { key: 'work-orders', text: 'Work Orders', isVisible: true },
    { key: 'parts', text: 'Parts', isVisible: true },
    { key: 'services', text: 'Services', isVisible: true },
    { key: 'quotes', text: 'Quotes', isVisible: true },
    { key: 'invoices', text: 'Invoices', isVisible: true },
    { key: 'payments', text: 'Payments', isVisible: true },
    { key: 'appointments', text: 'Appointments', isVisible: true },
    { key: 'calendar', text: 'Calendar View', isVisible: true },
    { key: 'maintenance', text: 'Maintenance', isVisible: true },
    { key: 'reports', text: 'Reports', isVisible: true },
    { key: 'settings', text: 'Settings', isVisible: true },
  ]), [])

  const { data: navOrder } = useQuery(
    ['navigation-order', selectedRole],
    async () => {
      const response = await api.get(`/navigation/order/${selectedRole}`)
      return response.data
    },
    {
      onSuccess: (data) => {
        if (data && data.length > 0) {
          const orderedItems = data.map(orderItem => {
            const baseItem = defaultItems.find(i => i.key === orderItem.item_key)
            if (baseItem) {
              return {
                ...baseItem,
                isVisible: orderItem.is_visible !== false,
              }
            }

            const fallbackText = orderItem.item_key
              .replace(/[-_]/g, ' ')
              .replace(/\b\w/g, chr => chr.toUpperCase())

            return {
              key: orderItem.item_key,
              text: fallbackText,
              isVisible: orderItem.is_visible !== false,
            }
          })

          const savedKeys = new Set(orderedItems.map(item => item.key))
          const missingDefaults = defaultItems
            .filter(item => !savedKeys.has(item.key))
            .map(item => ({ ...item }))

          setNavigationItems([...orderedItems, ...missingDefaults])
        } else {
          // Use default order
          setNavigationItems(defaultItems.map(item => ({ ...item })))
        }
        setHasChanges(false)
      },
    }
  )

  const saveOrderMutation = useMutation(
    (orderData) => api.post('/navigation/order', orderData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['navigation-order', selectedRole])
        setHasChanges(false)
        alert('Navigation order updated successfully!')
      },
      onError: (error) => {
        alert(error.response?.data?.message || 'Failed to update navigation order')
      },
    }
  )

  const handleDragEnd = (event) => {
    const { active, over } = event

    if (active.id !== over.id) {
      setNavigationItems((items) => {
        const oldIndex = items.findIndex(item => item.key === active.id)
        const newIndex = items.findIndex(item => item.key === over.id)
        const newItems = arrayMove(items, oldIndex, newIndex)
        setHasChanges(true)
        return newItems
      })
    }
  }

  const handleSave = () => {
    const items = navigationItems.map((item) => ({
      key: item.key,
      parent: null,
      is_visible: item.isVisible !== false,
    }))

    saveOrderMutation.mutate({
      role: selectedRole,
      items,
    })
  }

  const handleReset = () => {
    if (window.confirm('Reset navigation order to default for this role?')) {
      setNavigationItems(defaultItems.map(item => ({ ...item })))
      setHasChanges(true)
    }
  }

  const handleToggleVisibility = (itemKey, isVisible) => {
    setNavigationItems(items =>
      items.map(item =>
        item.key === itemKey ? { ...item, isVisible } : item
      )
    )
    setHasChanges(true)
  }

  return (
    <>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          <SettingsIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
          Navigation Customization
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Customize the navigation menu order for different user roles (drag items to reorder)
        </Typography>

        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth>
            <InputLabel>Select Role</InputLabel>
              <Select
                value={selectedRole}
                label="Select Role"
                onChange={(e) => setSelectedRole(e.target.value)}
              >
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="office_staff">Office Staff</MenuItem>
                <MenuItem value="accountant">Accountant</MenuItem>
                <MenuItem value="employee">Employee</MenuItem>
                <MenuItem value="customer">Customer</MenuItem>
              </Select>
          </FormControl>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          Drag and drop menu items to change their order, and toggle visibility to control which links appear for users with the "{selectedRole === 'office_staff' ? 'Office Staff' : selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}" role.
        </Alert>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Navigation Menu Order
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
              Drag items up or down to reorder
            </Typography>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={navigationItems.map(item => item.key)}
                strategy={verticalListSortingStrategy}
              >
                {navigationItems.map((item) => (
                  <SortableNavigationItem
                    key={item.key}
                    id={item.key}
                    item={item}
                    onToggleVisibility={handleToggleVisibility}
                  />
                ))}
              </SortableContext>
            </DndContext>

            <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                color="warning"
                startIcon={<ResetIcon />}
                onClick={handleReset}
              >
                Reset to Default
              </Button>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={!hasChanges || saveOrderMutation.isLoading}
              >
                {saveOrderMutation.isLoading ? 'Saving...' : 'Save Order'}
              </Button>
            </Box>

            {hasChanges && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                You have unsaved changes
              </Alert>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, position: 'sticky', top: 20 }}>
            <Typography variant="subtitle1" gutterBottom>
              Instructions
            </Typography>
            <Typography variant="body2" paragraph>
              1. Select a role from the dropdown
            </Typography>
            <Typography variant="body2" paragraph>
              2. Drag menu items up or down to reorder them
            </Typography>
            <Typography variant="body2" paragraph>
              3. Toggle the visibility switch to show or hide individual links
            </Typography>
            <Typography variant="body2" paragraph>
              4. Click "Save Order" to apply changes
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Alert severity="info" sx={{ fontSize: '0.875rem' }}>
              <Typography variant="caption">
                <strong>Note:</strong> The order you set here will only apply to users with the selected role. Each role can have its own custom navigation order.
              </Typography>
            </Alert>
          </Paper>
        </Grid>
      </Grid>
    </>
  )
}

export default SystemSettings
