import { ErrorBoundary } from '@/presentation/components/common/ErrorBoundary/ErrorBoundary'

export default function ProviderLayout({ children }) {
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  )
}
