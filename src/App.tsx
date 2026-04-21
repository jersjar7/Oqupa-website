import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import Layout from '@/components/layout/Layout'
import LandingPage from '@/pages/LandingPage'
import PrivacyPage from '@/pages/PrivacyPage'
import TermsPage from '@/pages/TermsPage'
import PropertyPage from '@/pages/PropertyPage'
import NotFoundPage from '@/pages/NotFoundPage'
import ExplorePage from '@/pages/ExplorePage'
import ErrorBoundary from '@/app/components/ErrorBoundary'
import AppLayout from '@/app/layouts/AppLayout'
import DashboardShell from '@/app/components/shell/DashboardShell'
import PasswordLoginPage from '@/app/features/auth/pages/PasswordLoginPage'
import CompleteSignInPage from '@/app/features/auth/pages/CompleteSignInPage'
import ForgotPasswordPage from '@/app/features/auth/pages/ForgotPasswordPage'
import SetPasswordPage from '@/app/features/auth/pages/SetPasswordPage'
import AuthPipelinePage from '@/app/features/auth/pages/AuthPipelinePage'
import AuthGuard from '@/app/components/guards/AuthGuard'
import GuestGuard from '@/app/components/guards/GuestGuard'
import VerifiedGuard from '@/app/components/guards/VerifiedGuard'
import DashboardPage from '@/app/features/dashboard/pages/DashboardPage'
import CreateListingPage from '@/app/features/listings/pages/CreateListingPage'
import EditListingPage from '@/app/features/listings/pages/EditListingPage'
import AgentEditListingPage from '@/app/features/listings/pages/AgentEditListingPage'
import ProfilePage from '@/app/features/profile/pages/ProfilePage'
import RealtorRegistrationPage from '@/app/features/realtor/pages/RealtorRegistrationPage'
import AdminGuard from '@/app/components/guards/AdminGuard'
import RealtorGuard from '@/app/components/guards/RealtorGuard'
import AdminApplicationsPage from '@/app/features/admin/pages/AdminApplicationsPage'
import LeadsPage from '@/app/features/leads/pages/LeadsPage'
import LeadDetailPage from '@/app/features/leads/pages/LeadDetailPage'
import InterestedAgentsPage from '@/app/features/leads/pages/InterestedAgentsPage'
import PaymentHistoryPage from '@/app/features/boost/pages/PaymentHistoryPage'

export default function App() {
  const initialize = useAuthStore((s) => s.initialize)
  useEffect(() => { initialize() }, [initialize])

  return (
    <BrowserRouter>
      {import.meta.env.DEV && (
        <div style={{
          position: 'fixed', bottom: 8, right: 8, zIndex: 9999,
          background: '#f59e0b', color: '#fff', padding: '2px 8px',
          borderRadius: 4, fontSize: 11, fontWeight: 700, opacity: 0.85,
          pointerEvents: 'none',
        }}>
          STAGING
        </div>
      )}
      <Routes>
        {/* Landing page routes (with Header + Footer) */}
        <Route element={<ErrorBoundary><Layout /></ErrorBoundary>}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/property/:id" element={<PropertyPage />} />
          <Route path="/explorar" element={<ExplorePage />} />
        </Route>

        {/* Publisher app routes */}
        <Route path="/app">
          {/* Public auth pages + verification pipeline — minimal AppLayout chrome. */}
          {/* Magic-link UI was retired as part of the auth migration campaign; */}
          {/* see docs/AUTH-MIGRATION-PLAN.md. /auth/complete is kept alive */}
          {/* until Firebase email-link sign-in is disabled at T+35 so aged */}
          {/* magic-link emails already in inboxes can still complete. */}
          <Route element={<ErrorBoundary><AppLayout /></ErrorBoundary>}>
            <Route path="login" element={<GuestGuard><PasswordLoginPage /></GuestGuard>} />
            <Route path="login/password" element={<Navigate to="/app/login" replace />} />
            <Route path="auth/complete" element={<CompleteSignInPage />} />
            <Route path="auth/set-password" element={<SetPasswordPage />} />
            <Route path="register" element={<Navigate to="/app/login" replace />} />
            <Route path="forgot-password" element={<GuestGuard><ForgotPasswordPage /></GuestGuard>} />
            <Route path="verify" element={<AuthGuard><AuthPipelinePage /></AuthGuard>} />
          </Route>

          {/* Authenticated app — sidebar + topbar dashboard shell. */}
          {/* AuthGuard wraps once; per-page guards (VerifiedGuard, AdminGuard, etc.) */}
          {/* still apply inside. */}
          <Route element={
            <ErrorBoundary>
              <AuthGuard>
                <DashboardShell />
              </AuthGuard>
            </ErrorBoundary>
          }>
            <Route index element={<VerifiedGuard><DashboardPage /></VerifiedGuard>} />
            <Route path="listings/new" element={<VerifiedGuard><CreateListingPage /></VerifiedGuard>} />
            <Route path="listings/:id/edit" element={<VerifiedGuard><EditListingPage /></VerifiedGuard>} />
            <Route path="listings/:id/agent-edit" element={<VerifiedGuard><AgentEditListingPage /></VerifiedGuard>} />
            <Route path="listings/:id/agents" element={<VerifiedGuard><InterestedAgentsPage /></VerifiedGuard>} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="payments" element={<PaymentHistoryPage />} />
            <Route path="realtor-registration" element={<VerifiedGuard><RealtorRegistrationPage /></VerifiedGuard>} />
            <Route path="leads" element={<VerifiedGuard><RealtorGuard><LeadsPage /></RealtorGuard></VerifiedGuard>} />
            <Route path="leads/:id" element={<VerifiedGuard><RealtorGuard><LeadDetailPage /></RealtorGuard></VerifiedGuard>} />
            <Route path="admin/applications" element={<AdminGuard><AdminApplicationsPage /></AdminGuard>} />
          </Route>
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Layout />}>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
