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
    console.log('📸 [FirebaseStorageDataSource] uploadFile called');
    console.log('📸 [FirebaseStorageDataSource] Path:', path);
    console.log('📸 [FirebaseStorageDataSource] File:', {
      name: file?.name,
      type: file?.type,
      size: file?.size,
    });
    console.log('📸 [FirebaseStorageDataSource] Storage instance:', storage);

    try {
      const storageRef = ref(storage, path);
      console.log('📸 [FirebaseStorageDataSource] Storage ref created:', storageRef);

      // Set default metadata
      const fileMetadata = {
        contentType: file.type,
        customMetadata: {
          uploadedAt: new Date().toISOString(),
          ...metadata,
        },
      };

      console.log('📸 [FirebaseStorageDataSource] Metadata:', fileMetadata);
      console.log('📸 [FirebaseStorageDataSource] Starting upload...');

      // Upload file
      const snapshot = await uploadBytes(storageRef, file, fileMetadata);

      console.log('📸 [FirebaseStorageDataSource] Upload complete, snapshot:', {
        fullPath: snapshot.ref.fullPath,
        bucket: snapshot.ref.bucket,
      });

      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);

      console.log('📸 [FirebaseStorageDataSource] Download URL obtained:', downloadURL);

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
