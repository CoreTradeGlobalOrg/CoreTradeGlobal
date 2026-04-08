export const metadata = {
  title: 'Unsubscribe — Core Trade Global',
  robots: { index: false, follow: false },
};

export default function UnsubscribeLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#0F1B2B] text-white flex items-center justify-center px-4 py-12">
      {children}
    </div>
  );
}
