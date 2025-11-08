import { useMemo } from 'react'
import { AppBar, Toolbar, Box, Button, Typography } from '@mui/material'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import useCachedBranding from '../hooks/useCachedBranding'
import { getBackendBaseUrl } from '../utils/url'

const Header = () => {
  const { isAuthenticated, logout, user } = useAuth()
  const navigate = useNavigate()
  const { branding } = useCachedBranding()

  const baseApiUrl = useMemo(() => getBackendBaseUrl(), [])

  const resolvedLogo = useMemo(() => {
    if (!branding) return null
    if (branding.logo_header) {
      return `${baseApiUrl}/storage/${branding.logo_header}`
    }
    if (branding.logo_login) {
      return `${baseApiUrl}/storage/${branding.logo_login}`
    }
    return null
  }, [branding, baseApiUrl])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const getRoleDisplay = (role) => {
    if (role === 'office_staff') return 'Office Staff'
    if (role === 'employee') return 'Employee'
    return role?.charAt(0).toUpperCase() + role?.slice(1) || ''
  }

  return (
    <AppBar 
      position="fixed" 
      sx={{ 
        backgroundColor: '#fff', 
        boxShadow: 1,
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', py: 1, px: { xs: 2, sm: 3 } }}>
        <Box sx={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'center',
          maxWidth: { xs: '60%', sm: '400px', md: '500px' }
        }}>
          {resolvedLogo ? (
            <img 
              src={resolvedLogo}
              alt={`${branding?.crm_name || 'CRM'} Logo`} 
              style={{ 
                height: 'auto', 
                width: '100%', 
                maxHeight: '60px',
                objectFit: 'contain'
              }}
            />
          ) : (
            <Box
              sx={{
                height: 60,
                width: '100%',
                maxWidth: 240,
                display: 'flex',
                alignItems: 'center'
              }}
            />
          )}
        </Box>
        {isAuthenticated && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ display: { xs: 'none', sm: 'block' } }}
            >
              {user?.name} ({getRoleDisplay(user?.role)})
            </Typography>
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ display: { xs: 'block', sm: 'none' } }}
            >
              {getRoleDisplay(user?.role)}
            </Typography>
            <Button 
              variant="outlined" 
              onClick={handleLogout}
              size="small"
              sx={{ color: '#1976d2', borderColor: '#1976d2' }}
            >
              Logout
            </Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  )
}

export default Header

