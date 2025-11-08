import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import {
  Container,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
  Grid,
  Checkbox,
} from '@mui/material'
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Security as SecurityIcon,
  VpnKey as KeyIcon,
  Save as SaveIcon,
} from '@mui/icons-material'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const RoleManagement = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState(null)

  // Check if user is admin
  if (user?.role !== 'admin') {
    return (
      <Container>
        <Alert severity="error">
          Access Denied: This page is only available to Admin users.
        </Alert>
      </Container>
    )
  }

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
    return (
      <Container>
        <Typography>Loading...</Typography>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          <SecurityIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
          Role & Permissions Management
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage user roles, permissions, and security settings. Admin access only.
        </Typography>
      </Box>

      {/* User Roles Table */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">User Roles</Typography>
          <Button
            variant="outlined"
            startIcon={<KeyIcon />}
            onClick={() => setPermissionsDialogOpen(true)}
          >
            Manage Permissions Matrix
          </Button>
        </Box>

        <TableContainer>
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
    </Container>
  )
}

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
    // Build array of permission updates
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

export default RoleManagement
