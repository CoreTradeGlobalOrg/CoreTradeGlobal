/**
 * Firebase Storage Data Source
 *
 * Handles file upload/download operations with Firebase Storage
 */

import { storage } from '@/core/config/firebase.config';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

export class FirebaseStorageDataSource {
  /**
   * Constructor - No parameters needed as storage is imported
   */
  constructor() {
    // Storage instance is imported directly from firebase.config
  }

  /**
   * Upload file to Firebase Storage
   * @param {string} path - Storage path (e.g., 'company-logo/userId/filename.jpg')
   * @param {File} file - File object to upload
   * @param {Object} metadata - Optional metadata
   * @returns {Promise<string>} Download URL of uploaded file
   */
  async uploadFile(path, file, metadata = {}) {
    try {
      const storageRef = ref(storage, path);

      // Set default metadata
      const fileMetadata = {
        contentType: file.type,
        customMetadata: {
          uploadedAt: new Date().toISOString(),
          ...metadata,
        },
      };

      // Upload file
      const snapshot = await uploadBytes(storageRef, file, fileMetadata);

      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);

      return downloadURL;
    } catch (error) {
      console.error('❌ [FirebaseStorageDataSource] Upload error:', error);
      console.error('❌ [FirebaseStorageDataSource] Error code:', error.code);
      console.error('❌ [FirebaseStorageDataSource] Error message:', error.message);
      console.error('❌ [FirebaseStorageDataSource] Full error:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Delete file from Firebase Storage
   * @param {string} path - Storage path
   * @returns {Promise<void>}
   */
  async deleteFile(path) {
    try {
      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Delete file from Firebase Storage using its download URL
   * @param {string} url - Firebase Storage download URL
   * @returns {Promise<void>}
   */
  async deleteFileByUrl(url) {
    try {
      // Extract path from Firebase Storage URL
      // URL format: https://firebasestorage.googleapis.com/v0/b/[bucket]/o/[encoded-path]?alt=media&token=[token]
      const match = url.match(/\/o\/([^?]+)/);
      if (!match) {
        throw new Error('Invalid Firebase Storage URL');
      }
      const encodedPath = match[1];
      const path = decodeURIComponent(encodedPath);

      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
    } catch (error) {
      // Ignore "object-not-found" errors - file might already be deleted
      if (error.code === 'storage/object-not-found') {
        // File already deleted or not found — ignore silently
        return;
      }
      console.error('Error deleting file by URL:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Get download URL for a file
   * @param {string} path - Storage path
   * @returns {Promise<string>} Download URL
   */
  async getDownloadURL(path) {
    try {
      const storageRef = ref(storage, path);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error('Error getting download URL:', error);
      throw new Error(`Failed to get download URL: ${error.message}`);
    }
  }
}

export default FirebaseStorageDataSource;
