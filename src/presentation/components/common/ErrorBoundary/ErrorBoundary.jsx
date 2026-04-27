'use client'

import { Component } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

function DefaultErrorFallback({ onReset }) {
  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center">
      <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
      <h2 className="text-xl font-semibold text-white mb-2">Something went wrong</h2>
      <p className="text-white/60 text-sm mb-6 max-w-sm">
        An unexpected error occurred. Please try again or return to the homepage.
      </p>
      <div className="flex gap-3">
        {onReset && (
          <button
            onClick={onReset}
            className="px-4 py-2 bg-[rgba(255,255,255,0.1)] text-white rounded-xl text-sm font-medium hover:bg-[rgba(255,255,255,0.15)]"
          >
            Try Again
          </button>
        )}
        <Link
          href="/"
          className="px-4 py-2 bg-[#FFD700] !text-black rounded-xl text-sm font-semibold"
        >
          Go Home
        </Link>
      </div>
    </div>
  )
}

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
    this.handleReset = this.handleReset.bind(this)
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleReset() {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <DefaultErrorFallback onReset={this.handleReset} />
      )
    }
    return this.props.children
  }
}
