'use client';

/**
 * TODO: Bu sayfa şimdilik gizli. Daha sonra açılacaktır.
 * Şu an kullanıcılar bu sayfaya erişmeye çalıştığında anasayfaya yönlendiriliyorlar.
 *
 * Orijinal kod git history'den alınabilir:
 * git show HEAD~1:src/app/(main)/companies/page.js
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CompaniesPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/');
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-radial-navy">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FFD700] mx-auto"></div>
                <p className="mt-4 text-[#A0A0A0]">Redirecting...</p>
            </div>
        </div>
    );
}
