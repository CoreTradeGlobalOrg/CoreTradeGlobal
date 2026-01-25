'use client';

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#0F1B2B] text-white font-sans selection:bg-[#D4AF37] selection:text-black">
      {children}
    </div>
  );
}
