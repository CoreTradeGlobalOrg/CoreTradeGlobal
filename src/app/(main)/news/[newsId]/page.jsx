/**
 * News Detail Page
 *
 * URL: /news/[newsId]
 * Public page showing news article details
 */

import NewsDetailClient from './NewsDetailClient';
import { getAdminFirestore } from '@/lib/firebase-admin';

export async function generateMetadata({ params }) {
    const { newsId } = await params;

    let title = 'Trade News | Core Trade Global';
    let description = 'Stay informed with the latest updates from the global trade industry.';
    let imageUrl = 'https://coretradeglobal.com/Core-png.png';

    try {
        const db = getAdminFirestore();
        const doc = await db.collection('news').doc(newsId).get();
        if (doc.exists) {
            const news = doc.data();
            title = `${news.title} | Core Trade Global`;
            const content = news.excerpt || news.content || '';
            description = content.length > 200 ? content.slice(0, 200) + '...' : content;
            if (news.imageUrl) imageUrl = news.imageUrl;
        }
    } catch (err) {
        // Fall back to generic metadata
    }

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            url: `https://coretradeglobal.com/news/${newsId}`,
            siteName: 'Core Trade Global',
            images: [
                {
                    url: imageUrl,
                    width: 1200,
                    height: 630,
                    alt: title,
                },
            ],
            locale: 'en_US',
            type: 'article',
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [imageUrl],
        },
    };
}

export default function NewsDetailPage() {
    return <NewsDetailClient />;
}
