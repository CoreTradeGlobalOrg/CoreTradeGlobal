import { redirect } from 'next/navigation'
import { ErrorBoundary } from '@/presentation/components/common/ErrorBoundary/ErrorBoundary'
import { LEGAL_SUPPORT_ENABLED } from '@/core/constants/featureFlags'

export default function LawyerLayout({ children }) {
  // Legal Support paused — every /lawyer/* route (dashboard, deals,
  // channels, ...) 302s to home. Server-side redirect runs before any
  // client bundle, so nobody, lawyer role included, sees the UI.
  if (!LEGAL_SUPPORT_ENABLED) {
    redirect('/')
  }
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  )
}
