import { useEffect, useRef } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { Spinner } from '@/app/components/ui'
import { consumeReturnUrl } from '@/lib/utils'
import { rememberBouncedFrom } from '@/lib/returnPath'

interface GuestGuardProps {
  children: React.ReactNode
}

export default function GuestGuard({ children }: GuestGuardProps) {
  const { firebaseUser, user, isLoading, isInitialized } = useAuthStore()
  const location = useLocation()
  const destinationRef = useRef<{ uid: string; to: string } | null>(null)

  // Bounced here by a guard (the session ended): once signed in, go back
  // where they were — a same-site /app page only (hostile review #3).
  const bouncedFrom = (location.state as { from?: unknown } | null)?.from
  const signedOut = isInitialized && !isLoading && !firebaseUser
  useEffect(() => {
    if (signedOut && bouncedFrom) rememberBouncedFrom(bouncedFrom)
  }, [signedOut, bouncedFrom])

  if (!isInitialized || isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (firebaseUser) {
    const fullyVerified =
      firebaseUser.emailVerified && user?.name && user?.isPhoneVerified
    // Read the stored way back ONCE per sign-in: reading it consumes it, and a
    // second render before the redirect (React renders twice in development)
    // found it gone and sent the person to the dashboard instead.
    if (fullyVerified && destinationRef.current?.uid !== firebaseUser.uid) {
      destinationRef.current = { uid: firebaseUser.uid, to: consumeReturnUrl() ?? '/app' }
    }
    const destination = fullyVerified ? destinationRef.current!.to : '/app/verify'
    return <Navigate to={destination} state={{ from: location }} replace />
  }

  return <>{children}</>
}
