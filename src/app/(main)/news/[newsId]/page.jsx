/**
 * News Detail Page
 *
 * URL: /news/[newsId]
 * Public page showing news article details
 */

import NewsDetailClient from './NewsDetailClient';

export async function generateMetadata({ params }) {
    const { newsId } = await params;

    return {
        title: 'Trade News | Core Trade Global',
        description: 'Stay informed with the latest updates from the global trade industry.',
        openGraph: {
            title: 'Trade News | Core Trade Global',
            description: 'Stay informed with the latest updates from the global trade industry.',
            url: `https://coretradeglobal.com/news/${newsId}`,
            siteName: 'Core Trade Global',
            images: [
                {
                    url: 'https://coretradeglobal.com/Core-png.png',
                    width: 1200,
                    height: 630,
                    alt: 'Core Trade Global',
                },
            ],
            locale: 'en_US',
            type: 'article',
        },
        twitter: {
            card: 'summary_large_image',
            title: 'Trade News | Core Trade Global',
            description: 'Stay informed with the latest updates from the global trade industry.',
            images: ['https://coretradeglobal.com/Core-png.png'],
        },
    };
}

export default function NewsDetailPage() {
    return <NewsDetailClient />;
}
