/**
 * Script to add sample categories to Firestore
 * Run with: node scripts/addSampleCategories.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const sampleCategories = [
  {
    name: 'Electronics',
    iconUrl: '🔌',
    parentId: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    name: 'Industrial Equipment',
    iconUrl: '⚙️',
    parentId: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    name: 'Building Materials',
    iconUrl: '🏗️',
    parentId: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    name: 'Textiles & Fabrics',
    iconUrl: '🧵',
    parentId: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    name: 'Chemicals',
    iconUrl: '🧪',
    parentId: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    name: 'Food & Beverages',
    iconUrl: '🍔',
    parentId: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    name: 'Automotive Parts',
    iconUrl: '🚗',
    parentId: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    name: 'Medical Supplies',
    iconUrl: '⚕️',
    parentId: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    name: 'Agriculture',
    iconUrl: '🌾',
    parentId: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    name: 'Machinery',
    iconUrl: '🏭',
    parentId: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    name: 'Furniture',
    iconUrl: '🪑',
    parentId: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    name: 'Packaging Materials',
    iconUrl: '📦',
    parentId: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    name: 'Tools & Hardware',
    iconUrl: '🔧',
    parentId: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    name: 'Plastics & Rubber',
    iconUrl: '♻️',
    parentId: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    name: 'Metals & Alloys',
    iconUrl: '⚒️',
    parentId: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  },
];

async function addCategories() {
  console.log('Starting to add sample categories...');

  try {
    const batch = db.batch();
    const categoriesRef = db.collection('categories');

    for (const category of sampleCategories) {
      const docRef = categoriesRef.doc();
      batch.set(docRef, category);
    }

    await batch.commit();
    console.log(`✅ Successfully added ${sampleCategories.length} categories!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding categories:', error);
    process.exit(1);
  }
}

addCategories();
