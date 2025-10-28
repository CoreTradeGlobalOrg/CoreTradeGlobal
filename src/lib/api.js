import { validators } from '@/utils/validation';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export const subscribeToNewsletter = async (email, metadata ) => {
    const collectionName = process.env.NEXT_PUBLIC_NEWSLETTER_COLLECTION || 'newsletter';
    try {
        const validation = validators.email(email);
        if (!validation.isValid) {
          const res = { success: false, message: validation.error };
          return res;
        }

        const sanitizedEmail = validators.sanitizeEmail(email);

        const docData = {
          email: sanitizedEmail,
          subscribedAt: serverTimestamp(),
          timestamp: Date.now(),
          source: metadata.source || 'landing_page',
          userAgent:
            typeof window !== 'undefined' && typeof navigator !== 'undefined'
              ? navigator.userAgent
              : 'unknown',
          ...metadata,
        };

        const docRef = await addDoc(collection(db, collectionName), docData);

        return {
          success: true,
          message: 'Thank you for subscribing! 🎉',
          docId: docRef.id,
        };
    } catch (error) {
        console.error('Newsletter subscription error:', error);

        if (error?.code === 'permission-denied') {
            const error = new Error("Unable to subscribe at this time. Please try again later.");
            error.code = 500;
            throw error;
        } else if (error?.code === 'unavailable') {
            const error = new Error("Service temporarily unavailable. Please try again.");
            error.code = 500;
            throw error;
        }
            const unexpectedError = new Error("Something went wrong. Please try again.");
            unexpectedError.code = 500;
            throw unexpectedError;
    }
}