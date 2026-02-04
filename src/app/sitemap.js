import { db } from '@/core/config/firebase.config';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { COLLECTIONS } from '@/core/constants/collections';

const BASE_URL = 'https://coretradeglobal.com';

async function getActiveProducts() {
  try {
    const q = query(
      collection(db, COLLECTIONS.PRODUCTS),
      where('status', '==', 'active'),
      limit(1000)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
    }));
  } catch (error) {
    console.error('Sitemap: Error fetching products:', error);
    return [];
  }
}

async function getActiveRequests() {
  try {
    const q = query(
      collection(db, COLLECTIONS.REQUESTS),
      where('status', '==', 'active'),
      limit(1000)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
    }));
  } catch (error) {
    console.error('Sitemap: Error fetching requests:', error);
    return [];
  }
}

async function getPublishedNews() {
  try {
    const q = query(
      collection(db, COLLECTIONS.NEWS),
      where('status', '==', 'published'),
      limit(500)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().publishedAt?.toDate?.() || new Date(),
    }));
  } catch (error) {
    console.error('Sitemap: Error fetching news:', error);
    return [];
  }
}

async function getActiveFairs() {
  try {
    const q = query(
      collection(db, COLLECTIONS.FAIRS),
      where('status', 'in', ['upcoming', 'ongoing']),
      limit(200)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
    }));
  } catch (error) {
    console.error('Sitemap: Error fetching fairs:', error);
    return [];
  }
}

async function getVerifiedCompanies() {
  try {
    const q = query(
      collection(db, COLLECTIONS.USERS),
      where('verificationStatus', '==', 'verified'),
      limit(1000)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
    }));
  } catch (error) {
    console.error('Sitemap: Error fetching companies:', error);
    return [];
  }
}

export default async function sitemap() {
  // Static pages
  const staticPages = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/products`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/requests`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/fairs`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/news`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE_URL}/categories`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/companies`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/about-us`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/faq`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE_URL}/privacy-policy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/terms-of-service`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ];

  // Fetch dynamic content in parallel
  const [products, requests, news, fairs, companies] = await Promise.all([
    getActiveProducts(),
    getActiveRequests(),
    getPublishedNews(),
    getActiveFairs(),
    getVerifiedCompanies(),
  ]);

  // Product pages
  const productPages = products.map((product) => ({
    url: `${BASE_URL}/product/${product.id}`,
    lastModified: product.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  // Request (RFQ) pages
  const requestPages = requests.map((request) => ({
    url: `${BASE_URL}/request/${request.id}`,
    lastModified: request.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  // News pages
  const newsPages = news.map((article) => ({
    url: `${BASE_URL}/news/${article.id}`,
    lastModified: article.updatedAt,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  // Fair pages
  const fairPages = fairs.map((fair) => ({
    url: `${BASE_URL}/fair/${fair.id}`,
    lastModified: fair.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  // Company profile pages
  const companyPages = companies.map((company) => ({
    url: `${BASE_URL}/profile/${company.id}`,
    lastModified: company.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  return [
    ...staticPages,
    ...productPages,
    ...requestPages,
    ...newsPages,
    ...fairPages,
    ...companyPages,
  ];
}
