/**
 * API Route to seed sample categories
 * Call this endpoint once to populate categories in Firestore
 *
 * Usage: POST /api/seed-categories
 */

import { container } from '@/core/di/container';
import { Category } from '@/domain/entities/Category';
import { NextResponse } from 'next/server';

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
