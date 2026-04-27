/**
 * useLegalChannel Hook
 *
 * Orchestrating hook that combines contract drafts and risk items subscriptions
 * for the legal channel right panel. Also provides upload and CRUD actions.
 *
 * Usage:
 * const { drafts, riskItems, uploadDraft, addRisk, toggleRiskStatus, loading } =
 *   useLegalChannel(engagementId, currentUser);
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { serverTimestamp } from 'firebase/firestore';
import { container } from '@/core/di/container';
import { RISK_STATUS } from '@/core/constants/legalConstants';
import toast from 'react-hot-toast';

/**
 * Orchestrating hook for legal channel: contract drafts + risk items subscriptions
 * and write actions (upload draft, add risk, toggle risk status).
 *
 * @param {string|null} engagementId - Firestore engagement document ID
 * @param {Object|null} currentUser - Firebase auth user object { uid, displayName }
 * @returns {{
 *   drafts: Object[],
 *   riskItems: Object[],
 *   uploadDraft: (file: File) => Promise<void>,
 *   addRisk: (riskData: Object) => Promise<void>,
 *   toggleRiskStatus: (riskId: string, currentStatus: string) => Promise<void>,
 *   loading: boolean
 * }}
 */
export function useLegalChannel(engagementId, currentUser) {
  const [drafts, setDrafts] = useState([]);
  const [riskItems, setRiskItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Subscribe to contract drafts
  useEffect(() => {
    if (!engagementId) {
      setLoading(false);
      return;
    }

    const legalRepo = container.getLegalEngagementRepository();
    let draftsLoaded = false;
    let risksLoaded = false;

    const checkLoaded = () => {
      if (draftsLoaded && risksLoaded) setLoading(false);
    };

    const unsubDrafts = legalRepo.subscribeToContractDrafts(engagementId, (draftsList) => {
      setDrafts(draftsList);
      draftsLoaded = true;
      checkLoaded();
    });

    const unsubRisks = legalRepo.subscribeToRiskItems(engagementId, (risksList) => {
      setRiskItems(risksList);
      risksLoaded = true;
      checkLoaded();
    });

    return () => {
      unsubDrafts();
      unsubRisks();
    };
  }, [engagementId]);

  /**
   * Upload a file as a new contract draft version.
   * Auto-increments version number based on existing drafts.
   *
   * @param {File} file - Contract draft file (PDF, DOCX)
   */
  const uploadDraft = useCallback(
    async (file) => {
      if (!engagementId || !currentUser?.uid || !file) return;

      try {
        const legalRepo = container.getLegalEngagementRepository();
        const messageRepo = container.getLegalMessageRepository();

        // Upload file to Storage
        const uploadResult = await messageRepo.uploadDraftFile(engagementId, file);

        // Get current max version and increment
        const maxVersion = await legalRepo.getMaxDraftVersion(engagementId);
        const newVersion = maxVersion + 1;

        // Add contract draft document
        await legalRepo.addContractDraft(engagementId, {
          version: newVersion,
          fileName: file.name,
          fileUrl: uploadResult.url,
          storagePath: uploadResult.storagePath,
          fileSize: file.size,
          uploaderUid: currentUser.uid,
          uploaderName: currentUser.displayName || 'Lawyer',
        });

        toast.success(`Draft v${newVersion} uploaded successfully`);
      } catch (err) {
        console.error('useLegalChannel.uploadDraft error:', err);
        toast.error('Failed to upload draft');
      }
    },
    [engagementId, currentUser]
  );

  /**
   * Add a new risk item to the engagement.
   *
   * @param {Object} riskData - Risk item data { title, description, severity, status }
   */
  const addRisk = useCallback(
    async (riskData) => {
      if (!engagementId || !currentUser?.uid) return;

      try {
        const legalRepo = container.getLegalEngagementRepository();
        await legalRepo.addRiskItem(engagementId, {
          ...riskData,
          createdByUid: currentUser.uid,
          updatedAt: serverTimestamp(),
        });
        toast.success('Risk item added');
      } catch (err) {
        console.error('useLegalChannel.addRisk error:', err);
        toast.error('Failed to add risk item');
      }
    },
    [engagementId, currentUser]
  );

  /**
   * Toggle a risk item between open and resolved status.
   *
   * @param {string} riskId - Risk item document ID
   * @param {string} currentStatus - Current status ('open' or 'resolved')
   */
  const toggleRiskStatus = useCallback(
    async (riskId, currentStatus) => {
      if (!engagementId || !riskId) return;

      const newStatus =
        currentStatus === RISK_STATUS.OPEN ? RISK_STATUS.RESOLVED : RISK_STATUS.OPEN;

      try {
        const legalRepo = container.getLegalEngagementRepository();
        await legalRepo.updateRiskItem(engagementId, riskId, {
          status: newStatus,
          updatedAt: serverTimestamp(),
          ...(newStatus === RISK_STATUS.RESOLVED
            ? { resolvedAt: serverTimestamp() }
            : { resolvedAt: null }),
        });
      } catch (err) {
        console.error('useLegalChannel.toggleRiskStatus error:', err);
        toast.error('Failed to update risk status');
      }
    },
    [engagementId]
  );

  return {
    drafts,
    riskItems,
    uploadDraft,
    addRisk,
    toggleRiskStatus,
    loading,
  };
}

export default useLegalChannel;
