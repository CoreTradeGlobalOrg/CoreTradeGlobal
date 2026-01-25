export default function AuthLayout({ children }) {
  return (
    <main className="min-h-screen pt-[100px] pb-20 px-4 flex items-center justify-center">
      {children}
    </main>
  );
}
