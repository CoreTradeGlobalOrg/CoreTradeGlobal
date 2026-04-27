import { ErrorBoundary } from '@/presentation/components/common/ErrorBoundary/ErrorBoundary'

export default function LawyerLayout({ children }) {
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  )
}
