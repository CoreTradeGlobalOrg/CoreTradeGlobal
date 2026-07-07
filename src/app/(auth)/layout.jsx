import { Navbar } from '@/presentation/components/homepage/Navbar/Navbar';
import { Footer } from '@/presentation/components/homepage/Footer/Footer';

export default function AuthLayout({ children }) {
  // translate="no" opts the entire auth subtree (login, register,
  // complete-profile, forgot/reset password, verify-email, onboarding,
  // social-callback) out of Chrome / Google Translate.
  //
  // Under auto-translate the browser wraps text nodes in <font> tags,
  // and React 19's reconciler then throws "Failed to execute
  // 'removeChild' on 'Node'" the first time it tries to update a
  // translated node. On /register that fired mid-hydration and the
  // whole page bombed — reported by a Spanish visitor whose Chrome
  // auto-translated the marketing homepage, then translated /register
  // on navigation and crashed the RegisterForm reconciler. See
  // https://github.com/facebook/react/issues/11538 for the class of
  // bug. Marketing content in (main)/* stays translatable; only the
  // form-heavy auth flows are quarantined here. Form labels and error
  // strings stay in English, which is acceptable for a global B2B
  // signup flow where inputs are language-agnostic anyway.
  return (
    <div className="min-h-screen bg-radial-auth flex flex-col" translate="no">
      <Navbar />
      <main className="flex-1 pt-[132px] pb-8 px-4 flex items-start justify-center">
        {children}
      </main>
      <Footer />
    </div>
  );
}
