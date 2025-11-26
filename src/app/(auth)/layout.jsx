/**
 * Auth Layout
 *
 * Layout for authentication pages (login, register)
 * Provides consistent styling for auth pages
 *
 * The (auth) folder with parentheses creates a route group
 * It doesn't add to the URL path
 * So (auth)/login becomes just /login in the URL
 */

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-12 px-4">
      <div className="w-full max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          {/* Logo/Brand */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-slate-900">
              CoreTradeGlobal
            </h1>
            <p className="text-slate-600 mt-2 text-lg">B2B Trading Platform</p>
          </div>

          {/* Auth Form Content */}
          {children}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-slate-600">
          <p>&copy; 2024 CoreTradeGlobal. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
