import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { getGameState } from '@/lib/gameLogic';

// Simple CSV parser
function parseCSV(csvText: string): Array<{ round_type: string; image_descr: string }> {
  // Normalize line endings and split
  const normalizedText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalizedText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  if (lines.length < 2) {
    throw new Error('CSV file must contain at least a header row and one data row');
  }

  // Parse header to find column indices
  const headerLine = lines[0];
  const headerFields = parseCSVLine(headerLine);
  const headerLower = headerFields.map(f => f.toLowerCase().trim());
  
  const categoryIndex = headerLower.findIndex(col => col === 'category');
  const descrIndex = headerLower.findIndex(col => col === 'image_descr');

  if (categoryIndex === -1 || descrIndex === -1) {
    throw new Error(`CSV must contain "category" and "image_descr" columns. Found columns: ${headerFields.join(', ')}`);
  }

  // Parse data rows
  const rows: Array<{ round_type: string; image_descr: string }> = [];
  
  for (let i = 1; i < lines.length; i++) {
    try {
      // Handle quoted fields that may contain commas
      const fields = parseCSVLine(lines[i]);
      
      if (fields.length <= Math.max(categoryIndex, descrIndex)) {
        console.warn(`Row ${i + 1} has insufficient columns. Expected at least ${Math.max(categoryIndex, descrIndex) + 1}, got ${fields.length}`);
        continue;
      }
      
      const roundType = fields[categoryIndex]?.trim().toLowerCase() || '';
      const image_descr = fields[descrIndex]?.trim() || '';
      
      // Validate round_type is one of: easy, medium, hard
      if (roundType && !['easy', 'medium', 'hard'].includes(roundType)) {
        console.warn(`Row ${i + 1} has invalid round_type: "${roundType}". Must be easy, medium, or hard.`);
        continue;
      }
      
      if (roundType && image_descr) {
        rows.push({ round_type: roundType, image_descr });
      } else {
        console.warn(`Row ${i + 1} has empty category or image_descr. Category: "${roundType}", Description: "${image_descr}"`);
      }
    } catch (rowError) {
      console.error(`Error parsing row ${i + 1}:`, rowError);
      // Continue with next row instead of failing completely
    }
  }

  if (rows.length === 0) {
    throw new Error('No valid data rows found in CSV file');
  }

  return rows;
}

// Parse a CSV line handling quoted fields
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        // Escaped quote
        currentField += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      // Field separator
      fields.push(currentField);
      currentField = '';
    } else {
      currentField += char;
    }
  }
  
  // Add last field
  fields.push(currentField);
  
  return fields;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    // Note: roundType from form is ignored - we use the category column from CSV instead

    if (!file) {
      return NextResponse.json(
        { error: 'Missing file' },
        { status: 400 }
      );
    }

    // Check if file is CSV
    if (!file.name.toLowerCase().endsWith('.csv') && !file.type.includes('csv') && file.type !== 'text/csv') {
      return NextResponse.json(
        { error: 'File must be a CSV file' },
        { status: 400 }
      );
    }

    // Verify the requester is the admin/captain
    const gameState = await getGameState();
    const adminId = gameState?.adminId;
    
    if (!adminId) {
      return NextResponse.json(
        { error: 'No admin found' },
        { status: 403 }
      );
    }

    // Read and parse CSV file
    const csvText = await file.text();
    console.log('CSV file size:', csvText.length, 'characters');
    console.log('First 500 chars:', csvText.substring(0, 500));
    
    let categories: Array<{ round_type: string; image_descr: string }>;
    
    try {
      categories = parseCSV(csvText);
      console.log('Parsed categories count:', categories.length);
      if (categories.length > 0) {
        console.log('First category sample:', categories[0]);
      }
    } catch (parseError) {
      console.error('CSV parse error:', parseError);
      return NextResponse.json(
        { error: parseError instanceof Error ? parseError.message : 'Failed to parse CSV file' },
        { status: 400 }
      );
    }

    if (categories.length === 0) {
      return NextResponse.json(
        { error: 'CSV file is empty or contains no valid rows' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    const uploadedAt = Date.now();

    // Insert all categories into database
    // Insert in batches to avoid potential size limits
    const batchSize = 50;
    const allInsertedData: any[] = [];
    
    for (let i = 0; i < categories.length; i += batchSize) {
      const batch = categories.slice(i, i + batchSize);
      const categoryData = batch.map(cat => ({
        category: cat.round_type, // Store round_type in category field for backwards compatibility
        image_descr: cat.image_descr,
        round_type: cat.round_type, // Use the round_type from CSV
        uploaded_at: uploadedAt,
      }));

      console.log(`Inserting batch ${Math.floor(i / batchSize) + 1}, rows ${i + 1} to ${Math.min(i + batchSize, categories.length)}`);
      
      const { data: insertedData, error: dbError } = await supabase
        .from('categories')
        .insert(categoryData)
        .select();

      if (dbError) {
        console.error('Database error on batch:', dbError);
        return NextResponse.json(
          { error: `Database error: ${dbError.message || 'Failed to insert categories'}. Batch ${Math.floor(i / batchSize) + 1} failed.` },
          { status: 500 }
        );
      }

      if (insertedData) {
        allInsertedData.push(...insertedData);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${categories.length} category descriptions`,
      count: categories.length,
      categories: allInsertedData,
    });
  } catch (error) {
    console.error('Category upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to upload category CSV file';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch all categories
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const roundType = searchParams.get('roundType');

    let query = supabase.from('categories').select('*').order('uploaded_at', { ascending: false });

    if (roundType) {
      query = query.or(`round_type.eq.${roundType},round_type.is.null`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      categories: data || [],
    });
  } catch (error) {
    console.error('Fetch categories error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}
