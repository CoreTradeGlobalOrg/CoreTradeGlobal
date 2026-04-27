/**
 * useFavoriteProduct Hook
 *
 * Manages a user's favorited products using Firestore arrayUnion/arrayRemove.
 * Subscribes to users/{uid}.favoriteProductIds for real-time updates.
 * Optimistically updates local state before Firestore confirms the write.
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/presentation/contexts/AuthContext';
import toast from 'react-hot-toast';

export function useFavoriteProduct() {
  const { user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState([]);
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    if (!user?.uid) {
      setFavoriteIds([]);
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    const unsub = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        setFavoriteIds(snap.data().favoriteProductIds || []);
      } else {
        setFavoriteIds([]);
      }
    });

    unsubscribeRef.current = unsub;
    return () => unsub();
  }, [user?.uid]);

  const isFavorited = (productId) => favoriteIds.includes(productId);

  const toggleFavorite = async (productId) => {
    if (!user?.uid) {
      toast.error('Sign in to save favorites');
      return;
    }

    const alreadyFavorited = isFavorited(productId);

    // Optimistic update
    setFavoriteIds((prev) =>
      alreadyFavorited ? prev.filter((id) => id !== productId) : [...prev, productId]
    );

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        favoriteProductIds: alreadyFavorited
          ? arrayRemove(productId)
          : arrayUnion(productId),
      });
    } catch (err) {
      // Revert optimistic update on failure
      setFavoriteIds((prev) =>
        alreadyFavorited ? [...prev, productId] : prev.filter((id) => id !== productId)
      );
      console.error('useFavoriteProduct error:', err);
      toast.error('Failed to update favorites');
    }
  };

  return { favoriteIds, toggleFavorite, isFavorited };
}

export default useFavoriteProduct;
