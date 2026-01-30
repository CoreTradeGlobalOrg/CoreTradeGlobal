#!/usr/bin/env node

/**
 * Migration Script: Fix Category IDs
 *
 * This script converts category names (labels) to category IDs (values) for all users.
 *
 * USAGE:
 *   1. First, download your Firebase service account key:
 *      - Go to Firebase Console > Project Settings > Service Accounts
 *      - Click "Generate new private key"
 *      - Save as: scripts/serviceAccountKey.json
 *
 *   2. Run the script:
 *      cd /Users/wenubey/Desktop/CTG/core-trade-global
 *      node scripts/migrate-category-ids.js
 *
 *   OR with environment variable:
 *      GOOGLE_APPLICATION_CREDENTIALS=./scripts/serviceAccountKey.json node scripts/migrate-category-ids.js
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Category mapping: label -> value (ID)
const CATEGORY_LABEL_TO_ID = {
  // Manufacturing & Production
  'Automotive & Auto Parts': 'automotive',
  'Electronics & Electrical': 'electronics',
  'Machinery & Equipment': 'machinery',
  'Textile & Apparel': 'textile',
  'Food & Beverage': 'food-beverage',
  'Chemicals & Plastics': 'chemicals',
  'Metals & Minerals': 'metals',
  'Wood & Furniture': 'wood-furniture',
  'Paper & Printing': 'paper-printing',
  'Pharmaceutical & Medical': 'pharmaceutical',

  // Construction & Materials
  'Construction & Real Estate': 'construction',
  'Building Materials': 'building-materials',
  'Tools & Hardware': 'tools-hardware',

  // Agriculture & Food
  'Agriculture & Farming': 'agriculture',
  'Food Processing': 'food-processing',
  'Packaging & Containers': 'packaging',

  // Energy & Environment
  'Energy & Power': 'energy',
  'Renewable Energy': 'renewable-energy',
  'Environment & Recycling': 'environment',

  // Technology & Services
  'IT & Software': 'it-software',
  'Telecommunications': 'telecommunications',
  'Logistics & Transportation': 'logistics',
  'Consulting & Professional Services': 'consulting',
  'Insurance': 'insurance',

  // Consumer Goods
  'Consumer Electronics': 'consumer-electronics',
  'Home & Garden': 'home-garden',
  'Sports & Leisure': 'sports-leisure',
  'Toys & Games': 'toys',
  'Beauty & Cosmetics': 'beauty-cosmetics',

  // Healthcare
  'Medical Devices': 'medical-devices',
  'Healthcare Services': 'healthcare',

  // Other
  'Wholesale & Retail': 'wholesale-retail',
  'Import & Export': 'import-export',
  'Other': 'other',
};

// Valid category IDs (values)
const VALID_CATEGORY_IDS = Object.values(CATEGORY_LABEL_TO_ID);

// Initialize Firebase Admin
function initializeFirebase() {
  if (admin.apps.length) {
    return admin.app();
  }

  // Try to find service account key
  const possiblePaths = [
    path.join(__dirname, 'serviceAccountKey.json'),
    path.join(__dirname, '../serviceAccountKey.json'),
    path.join(process.cwd(), 'serviceAccountKey.json'),
  ];

  let serviceAccountPath = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      serviceAccountPath = p;
      break;
    }
  }

  if (serviceAccountPath) {
    console.log(`Using service account from: ${serviceAccountPath}\n`);
    const serviceAccount = require(serviceAccountPath);
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  // Try application default credentials
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log(`Using GOOGLE_APPLICATION_CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}\n`);
    return admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  }

  console.error('❌ No Firebase credentials found!');
  console.error('\nPlease do one of the following:');
  console.error('  1. Place serviceAccountKey.json in the scripts/ folder');
  console.error('  2. Set GOOGLE_APPLICATION_CREDENTIALS environment variable');
  console.error('\nTo get your service account key:');
  console.error('  - Go to Firebase Console > Project Settings > Service Accounts');
  console.error('  - Click "Generate new private key"');
  process.exit(1);
}

async function migrateCategories() {
  console.log('🔄 Starting category migration...\n');

  initializeFirebase();
  const db = admin.firestore();

  try {
    // Get all users
    const usersSnapshot = await db.collection('users').get();

    let totalUsers = 0;
    let usersWithCategory = 0;
    let usersNeedingMigration = 0;
    let usersUpdated = 0;
    let usersSkipped = 0;
    const errors = [];
    const migrations = [];

    console.log(`Found ${usersSnapshot.size} users in database.\n`);

    for (const doc of usersSnapshot.docs) {
      totalUsers++;
      const userData = doc.data();
      const userId = doc.id;
      const currentCategory = userData.companyCategory;

      // Skip users without category
      if (!currentCategory) {
        continue;
      }

      usersWithCategory++;

      // Check if category is already a valid ID
      if (VALID_CATEGORY_IDS.includes(currentCategory)) {
        usersSkipped++;
        continue;
      }

      // Check if category is a label that needs conversion
      if (CATEGORY_LABEL_TO_ID[currentCategory]) {
        const newCategoryId = CATEGORY_LABEL_TO_ID[currentCategory];
        usersNeedingMigration++;

        try {
          await db.collection('users').doc(userId).update({
            companyCategory: newCategoryId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          console.log(`✅ ${userId}: "${currentCategory}" → "${newCategoryId}"`);
          migrations.push({ userId, from: currentCategory, to: newCategoryId });
          usersUpdated++;
        } catch (updateError) {
          console.error(`❌ ${userId}: Failed - ${updateError.message}`);
          errors.push({ userId, error: updateError.message });
        }
      } else {
        // Unknown category - log for manual review
        console.log(`⚠️  ${userId}: Unknown category "${currentCategory}"`);
        errors.push({ userId, error: `Unknown category: ${currentCategory}` });
      }
    }

    // Summary
    console.log('\n========================================');
    console.log('         MIGRATION SUMMARY');
    console.log('========================================');
    console.log(`Total users:            ${totalUsers}`);
    console.log(`Users with category:    ${usersWithCategory}`);
    console.log(`Already correct:        ${usersSkipped}`);
    console.log(`Needed migration:       ${usersNeedingMigration}`);
    console.log(`Successfully updated:   ${usersUpdated}`);
    console.log(`Errors:                 ${errors.length}`);
    console.log('========================================\n');

    if (errors.length > 0) {
      console.log('⚠️  Errors encountered:');
      errors.forEach(({ userId, error }) => {
        console.log(`   - ${userId}: ${error}`);
      });
      console.log('');
    }

    if (usersUpdated > 0) {
      console.log('✅ Migration completed successfully!');
    } else if (usersWithCategory === usersSkipped) {
      console.log('✅ All categories are already correct. No migration needed.');
    } else {
      console.log('⚠️  Migration completed with some issues.');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateCategories()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
