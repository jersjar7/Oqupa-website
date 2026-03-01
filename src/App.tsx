import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import LandingPage from '@/pages/LandingPage'
import PrivacyPage from '@/pages/PrivacyPage'
import TermsPage from '@/pages/TermsPage'
import PropertyPage from '@/pages/PropertyPage'
import NotFoundPage from '@/pages/NotFoundPage'
import ErrorBoundary from '@/app/components/ErrorBoundary'
import AppLayout from '@/app/layouts/AppLayout'
import LoginPage from '@/app/features/auth/pages/LoginPage'
import RegisterPage from '@/app/features/auth/pages/RegisterPage'
import ForgotPasswordPage from '@/app/features/auth/pages/ForgotPasswordPage'
import AuthPipelinePage from '@/app/features/auth/pages/AuthPipelinePage'
import AuthGuard from '@/app/components/guards/AuthGuard'
import VerifiedGuard from '@/app/components/guards/VerifiedGuard'
import DashboardPage from '@/app/features/dashboard/pages/DashboardPage'
import CreateListingPage from '@/app/features/listings/pages/CreateListingPage'
import EditListingPage from '@/app/features/listings/pages/EditListingPage'
import ProfilePage from '@/app/features/profile/pages/ProfilePage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing page routes (with Header + Footer) */}
        <Route element={<Layout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/property/:id" element={<PropertyPage />} />
        </Route>

        {/* Publisher app routes (own layout) */}
        <Route path="/app" element={<ErrorBoundary><AppLayout /></ErrorBoundary>}>
          {/* Public auth pages */}
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />

          {/* Auth required: verification pipeline */}
          <Route
            path="verify"
            element={
              <AuthGuard>
                <AuthPipelinePage />
              </AuthGuard>
            }
          />

          {/* Auth + verification required */}
          <Route
            index
            element={
              <AuthGuard>
                <VerifiedGuard>
                  <DashboardPage />
                </VerifiedGuard>
              </AuthGuard>
            }
          />
          <Route
            path="listings/new"
            element={
              <AuthGuard>
                <VerifiedGuard>
                  <CreateListingPage />
                </VerifiedGuard>
              </AuthGuard>
            }
          />
          <Route
            path="listings/:id/edit"
            element={
              <AuthGuard>
                <VerifiedGuard>
                  <EditListingPage />
                </VerifiedGuard>
              </AuthGuard>
            }
          />
          <Route
            path="profile"
            element={
              <AuthGuard>
                <ProfilePage />
              </AuthGuard>
            }
          />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Layout />}>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
