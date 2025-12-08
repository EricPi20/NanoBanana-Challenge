import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { checkSubmissionsAndTransition } from '@/lib/gameLogic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const playerId = formData.get('playerId') as string;

    if (!file || !playerId) {
      return NextResponse.json(
        { error: 'Missing file or playerId' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    const filename = `${playerId}_${Date.now()}_${file.name}`;
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('submissions')
      .upload(filename, file, {
        contentType: file.type,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('submissions')
      .getPublicUrl(filename);

    // Save submission to database
    const { error: dbError } = await supabase.from('submissions').upsert({
      id: playerId,
      player_id: playerId,
      image_url: publicUrl,
      uploaded_at: Date.now(),
      votes: [],
    });

    if (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }

    // Check if both players have submitted and transition to voting if so
    await checkSubmissionsAndTransition();

    return NextResponse.json({
      success: true,
      imageUrl: publicUrl,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}
