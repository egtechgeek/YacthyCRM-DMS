import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useNavigate } from 'react-router-dom'
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  TextField,
  InputAdornment,
  Chip,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Business as VendorIcon,
} from '@mui/icons-material'
import api from '../../services/api'

const Vendors = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingVendor, setEditingVendor] = useState(null)
  const [formData, setFormData] = useState({
    vendor_name: '',
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: '',
    account_number: '',
    payment_terms: '',
    tax_id: '',
    notes: '',
    is_active: true,
  })

  const qbColors = {
    primary: '#2c5f2d',
    secondary: '#97ce4c',
    border: '#c8d7dc',
  }

  const { data: vendorsData, isLoading } = useQuery(
    ['vendors', page, search],
    () => api.get('/accounting/vendors', { params: { page, search, per_page: 15 } }).then(res => res.data),
    { keepPreviousData: true }
  )

  const createMutation = useMutation(
    (data) => api.post('/accounting/vendors', data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('vendors')
        setDialogOpen(false)
        resetForm()
      },
    }
  )

  const updateMutation = useMutation(
    ({ id, data }) => api.put(`/accounting/vendors/${id}`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('vendors')
        setDialogOpen(false)
        resetForm()
      },
    }
  )

  const deleteMutation = useMutation(
    (id) => api.delete(`/accounting/vendors/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('vendors')
      },
    }
  )

  const resetForm = () => {
    setFormData({
      vendor_name: '',
      company_name: '',
      contact_person: '',
      email: '',
      phone: '',
      website: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      country: '',
      account_number: '',
      payment_terms: '',
      tax_id: '',
      notes: '',
      is_active: true,
    })
    setEditingVendor(null)
  }

  const handleOpenDialog = (vendor = null) => {
    if (vendor) {
      setEditingVendor(vendor)
      setFormData(vendor)
    } else {
      resetForm()
    }
    setDialogOpen(true)
  }

  const handleSubmit = () => {
    if (editingVendor) {
      updateMutation.mutate({ id: editingVendor.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this vendor?')) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 2, mb: 3, bgcolor: qbColors.primary, color: '#fff', borderRadius: 0 }}>
          <Typography variant="h5" fontWeight="bold">
            <VendorIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Vendors
          </Typography>
          <Typography variant="body2">
            Manage your vendors and suppliers
          </Typography>
        </Paper>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <TextField
            size="small"
            placeholder="Search vendors..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ width: 300 }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ bgcolor: qbColors.primary, '&:hover': { bgcolor: '#1e4620' } }}
          >
            New Vendor
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: qbColors.border }}>
                <TableCell>Vendor Name</TableCell>
                <TableCell>Company</TableCell>
                <TableCell>Contact Person</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">Loading...</TableCell>
                </TableRow>
              ) : vendorsData?.data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">No vendors found</TableCell>
                </TableRow>
              ) : (
                vendorsData?.data?.map((vendor) => (
                  <TableRow key={vendor.id} hover>
                    <TableCell>{vendor.vendor_name}</TableCell>
                    <TableCell>{vendor.company_name || '-'}</TableCell>
                    <TableCell>{vendor.contact_person || '-'}</TableCell>
                    <TableCell>{vendor.email || '-'}</TableCell>
                    <TableCell>{vendor.phone || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={vendor.is_active ? 'Active' : 'Inactive'}
                        size="small"
                        color={vendor.is_active ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleOpenDialog(vendor)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDelete(vendor.id)} color="error">
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {vendorsData?.last_page > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={vendorsData.last_page}
              page={page}
              onChange={(e, value) => setPage(value)}
              color="primary"
            />
          </Box>
        )}
      </Box>

      {/* Vendor Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingVendor ? 'Edit Vendor' : 'New Vendor'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Vendor Name *"
                value={formData.vendor_name}
                onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Company Name"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Contact Person"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Website"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="City"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="State"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="ZIP Code"
                value={formData.zip}
                onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Payment Terms"
                value={formData.payment_terms}
                onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                placeholder="e.g., Net 30"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Tax ID"
                value={formData.tax_id}
                onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            sx={{ bgcolor: qbColors.primary, '&:hover': { bgcolor: '#1e4620' } }}
            disabled={!formData.vendor_name}
          >
            {editingVendor ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}

export default Vendors

