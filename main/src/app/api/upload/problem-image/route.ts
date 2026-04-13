import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/adminAuth';
import { getManagerSupabase } from '@/lib/managerAuth';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

export async function POST(request: NextRequest) {
    // Auth: must be admin or manager
    let supabase, user;
    const adminResult = await getAdminSupabase(request);
    if ('error' in adminResult) {
        const managerResult = await getManagerSupabase(request);
        if ('error' in managerResult) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        supabase = managerResult.supabase;
        user = managerResult.user;
    } else {
        supabase = adminResult.supabase;
        user = adminResult.user;
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json({ error: 'Invalid file type. Allowed: PNG, JPEG, GIF, WebP' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: 'File too large. Maximum size is 5MB.' }, { status: 400 });
    }

    const ext = file.name?.split('.').pop() || file.type.split('/')[1] || 'png';
    const timestamp = Date.now();
    const uniqueId = crypto.randomUUID().slice(0, 8);
    const path = `${user.id}/${timestamp}-${uniqueId}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
        .from('problem_images')
        .upload(path, buffer, {
            contentType: file.type,
            upsert: false,
        });

    if (uploadError) {
        return NextResponse.json({ error: 'Upload failed: ' + uploadError.message }, { status: 500 });
    }

    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/problem_images/${path}`;

    return NextResponse.json({ url });
}
