/**
 * API Route to seed sample categories
 * Call this endpoint once to populate categories in Firestore
 *
 * Usage: POST /api/seed-categories
 *
 * SECURITY: This endpoint requires admin authentication
 */

import { container } from '@/core/di/container';
import { Category } from '@/domain/entities/Category';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Verify admin access from session cookie
 * Returns { valid: true, uid } or { valid: false, error }
 */
async function verifyAdminAccess() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');

  if (!sessionCookie?.value) {
    return { valid: false, error: 'Not authenticated' };
  }

  try {
    const session = JSON.parse(sessionCookie.value);

    if (!session.uid || !session.verified) {
      return { valid: false, error: 'Invalid session' };
    }

    // Verify user role from Firestore (don't trust client-sent role)
    const firestoreDataSource = container.getFirestoreDataSource();
    const userDoc = await firestoreDataSource.getById('users', session.uid);

    if (!userDoc || userDoc.role !== 'admin') {
      return { valid: false, error: 'Admin access required' };
    }

    return { valid: true, uid: session.uid };
  } catch (error) {
    console.error('Admin verification error:', error);
    return { valid: false, error: 'Invalid session format' };
  }
}

const sampleCategories = [
  { name: 'Electronics', iconUrl: '🔌', parentId: null },
  { name: 'Industrial Equipment', iconUrl: '⚙️', parentId: null },
  { name: 'Building Materials', iconUrl: '🏗️', parentId: null },
  { name: 'Textiles & Fabrics', iconUrl: '🧵', parentId: null },
  { name: 'Chemicals', iconUrl: '🧪', parentId: null },
  { name: 'Food & Beverages', iconUrl: '🍔', parentId: null },
  { name: 'Automotive Parts', iconUrl: '🚗', parentId: null },
  { name: 'Medical Supplies', iconUrl: '⚕️', parentId: null },
  { name: 'Agriculture', iconUrl: '🌾', parentId: null },
  { name: 'Machinery', iconUrl: '🏭', parentId: null },
  { name: 'Furniture', iconUrl: '🪑', parentId: null },
  { name: 'Packaging Materials', iconUrl: '📦', parentId: null },
  { name: 'Tools & Hardware', iconUrl: '🔧', parentId: null },
  { name: 'Plastics & Rubber', iconUrl: '♻️', parentId: null },
  { name: 'Metals & Alloys', iconUrl: '⚒️', parentId: null },
];

export async function POST() {
  // SECURITY: Verify admin access before allowing seed operation
  const adminCheck = await verifyAdminAccess();
  if (!adminCheck.valid) {
    return NextResponse.json(
      { success: false, error: adminCheck.error },
      { status: adminCheck.error === 'Not authenticated' ? 401 : 403 }
    );
  }

  try {
    const firestoreDataSource = container.getFirestoreDataSource();
    const categoryRepository = container.getCategoryRepository();

    // Check if categories already exist
    const existingCategories = await categoryRepository.getAll();

    if (existingCategories.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'Categories already exist',
        count: existingCategories.length
      }, { status: 400 });
    }

    // Add categories
    const addedCategories = [];

    for (const categoryData of sampleCategories) {
      const category = new Category(
        null, // id will be auto-generated
        categoryData.name,
        categoryData.iconUrl,
        categoryData.parentId,
        new Date()
      );

      const categoryDoc = category.toFirestore();
      const result = await firestoreDataSource.create('categories', categoryDoc);

      addedCategories.push({
        id: result.id,
        ...categoryData
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully added ${addedCategories.length} categories`,
      categories: addedCategories
    });

  } catch (error) {
    console.error('Error seeding categories:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// Also allow GET to check status
export async function GET() {
  try {
    const categoryRepository = container.getCategoryRepository();
    const categories = await categoryRepository.getAll();

    return NextResponse.json({
      success: true,
      count: categories.length,
      categories: categories.map(c => ({ id: c.value, name: c.label }))
    });
  } catch (error) {
    console.error('Error getting categories:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
