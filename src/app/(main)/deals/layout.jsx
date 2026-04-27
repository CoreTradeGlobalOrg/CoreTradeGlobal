import { ErrorBoundary } from '@/presentation/components/common/ErrorBoundary/ErrorBoundary'

export default function DealsLayout({ children }) {
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  )
}
