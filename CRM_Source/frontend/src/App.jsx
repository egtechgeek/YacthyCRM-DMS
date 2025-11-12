import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { Box } from '@mui/material'
import { AuthProvider } from './contexts/AuthContext'
import Login from './components/auth/Login'
import Register from './components/auth/Register'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import Yachts from './pages/Yachts'
import Users from './pages/Users'
import Parts from './pages/Parts'
import Services from './pages/Services'
import Quotes from './pages/Quotes'
import QuoteView from './pages/QuoteView'
import Invoices from './pages/Invoices'
import InvoiceView from './pages/InvoiceView'
import InvoiceForm from './pages/InvoiceForm'
import Appointments from './pages/Appointments'
import Maintenance from './pages/Maintenance'
import EmailTemplates from './pages/EmailTemplates'
import Import from './pages/Import'
import Export from './pages/Export'
import Settings from './pages/Settings'
import SystemSettings from './pages/SystemSettings'
import Payments from './pages/Payments'
import Reports from './pages/Reports'
import CustomerPortal from './pages/CustomerPortal'
import EmailLog from './pages/EmailLog'
import CustomerDetails from './pages/CustomerDetails'
import YachtDetails from './pages/YachtDetails'
import AppointmentCalendar from './pages/AppointmentCalendar'
import Timeclock from './pages/Timeclock'
import TimeclockReports from './pages/TimeclockReports'
import TimeOffRequests from './pages/TimeOffRequests'
import Vehicles from './pages/Vehicles'
import VehicleForm from './pages/VehicleForm'
import VehicleDetails from './pages/VehicleDetails'
import WorkOrders from './pages/WorkOrders'
import WorkOrderForm from './pages/WorkOrderForm'
import WorkOrderDisplay from './pages/WorkOrderDisplay'
import AccountingDashboard from './pages/accounting/AccountingDashboard'
import ChartOfAccounts from './pages/accounting/ChartOfAccounts'
import JournalEntries from './pages/accounting/JournalEntries'
import JournalEntryForm from './pages/accounting/JournalEntryForm'
import Vendors from './pages/accounting/Vendors'
import Bills from './pages/accounting/Bills'
import BillForm from './pages/accounting/BillForm'
import BankAccountsList from './pages/accounting/BankAccountsList'
import BankTransactions from './pages/accounting/BankTransactions'
import Reconciliation from './pages/accounting/Reconciliation'
import AccountingReports from './pages/accounting/Reports'
import QuickBooksImport from './pages/accounting/QuickBooksImport'
import PrivateRoute from './components/PrivateRoute'
import Header from './components/Header'
import Navigation from './components/Navigation'
import Footer from './components/Footer'
import { AssetLabelProvider } from './context/AssetLabelContext'
import useCachedBranding from './hooks/useCachedBranding'

function App() {
  const { branding } = useCachedBranding()

  useEffect(() => {
    if (typeof document === 'undefined') return

    const brandingName =
      branding?.crm_name?.trim() ||
      branding?.business_name?.trim() ||
      'YachtyCRM-DMS'

    document.title = brandingName
  }, [branding])

  return (
    <AssetLabelProvider>
      <AuthProvider>
        <Router basename="/frontend">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/*"
            element={
              <PrivateRoute>
                <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                  <Header />
                  <Box sx={{ display: 'flex', flexGrow: 1 }}>
                    <Navigation />
                    <Box
                      component="main"
                      sx={{
                        flexGrow: 1,
                        p: 3,
                        mt: 8,
                        width: { sm: `calc(100% - 240px)` },
                      }}
                    >
                    <Routes>
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/users" element={<Users />} />
                      <Route path="/customers" element={<Customers />} />
                      <Route path="/yachts" element={<Yachts />} />
                      <Route path="/parts" element={<Parts />} />
                      <Route path="/services" element={<Services />} />
                      <Route path="/quotes" element={<Quotes />} />
                      <Route path="/quotes/:id" element={<QuoteView />} />
                      <Route path="/invoices" element={<Invoices />} />
                      <Route path="/invoices/new" element={<InvoiceForm />} />
                      <Route path="/invoices/:id" element={<InvoiceView />} />
                      <Route path="/invoices/:id/edit" element={<InvoiceForm />} />
                      <Route path="/appointments" element={<Appointments />} />
                      <Route path="/maintenance" element={<Maintenance />} />
                      <Route path="/email-templates" element={<EmailTemplates />} />
                      <Route path="/import" element={<Import />} />
                      <Route path="/export" element={<Export />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/system-settings" element={<SystemSettings />} />
                      <Route path="/payments" element={<Payments />} />
                      <Route path="/reports" element={<Reports />} />
                      <Route path="/customer-portal" element={<CustomerPortal />} />
                      <Route path="/email-log" element={<EmailLog />} />
                      <Route path="/customers/:id" element={<CustomerDetails />} />
                      <Route path="/yachts/:id" element={<YachtDetails />} />
                      <Route path="/appointments/calendar" element={<AppointmentCalendar />} />
                      <Route path="/timeclock" element={<Timeclock />} />
                      <Route path="/timeclock/reports" element={<TimeclockReports />} />
                      <Route path="/timeclock/time-off" element={<TimeOffRequests />} />
                      <Route path="/vehicles" element={<Vehicles />} />
                      <Route path="/vehicles/new" element={<VehicleForm />} />
                      <Route path="/vehicles/:id" element={<VehicleDetails />} />
                      <Route path="/vehicles/:id/edit" element={<VehicleForm />} />
                      <Route path="/work-orders" element={<WorkOrders />} />
                      <Route path="/work-orders/new" element={<WorkOrderForm />} />
                      <Route path="/work-orders/display" element={<WorkOrderDisplay />} />
                      <Route path="/work-orders/:id/edit" element={<WorkOrderForm />} />
                      <Route path="/accounting" element={<AccountingDashboard />} />
                      <Route path="/accounting/chart-of-accounts" element={<ChartOfAccounts />} />
                      <Route path="/accounting/journal-entries" element={<JournalEntries />} />
                      <Route path="/accounting/journal-entries/new" element={<JournalEntryForm />} />
                      <Route path="/accounting/journal-entries/:id" element={<JournalEntryForm />} />
                      <Route path="/accounting/vendors" element={<Vendors />} />
                      <Route path="/accounting/bills" element={<Bills />} />
                      <Route path="/accounting/bills/new" element={<BillForm />} />
                      <Route path="/accounting/bills/:id" element={<BillForm />} />
                      <Route path="/accounting/bills/:id/edit" element={<BillForm />} />
                      <Route path="/accounting/bank-accounts" element={<BankAccountsList />} />
                      <Route path="/accounting/bank-transactions" element={<BankTransactions />} />
                      <Route path="/accounting/reconciliation" element={<Reconciliation />} />
                      <Route path="/accounting/reports" element={<AccountingReports />} />
                      <Route path="/accounting/import" element={<QuickBooksImport />} />
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      {/* Additional routes will be added as components are created */}
                    </Routes>
                  </Box>
                  </Box>
                  <Footer />
                </Box>
              </PrivateRoute>
            }
          />
        </Routes>
      </Router>
      </AuthProvider>
    </AssetLabelProvider>
  )
}

export default App

