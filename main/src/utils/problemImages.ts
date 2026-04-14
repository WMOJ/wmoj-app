import { SupabaseClient } from '@supabase/supabase-js';

const BUCKET = 'problem_images';
const STORAGE_PREFIX = `/storage/v1/object/public/${BUCKET}/`;

/**
 * Extract storage paths for images in the problem_images bucket from markdown content.
 * Matches <img ... src="...problem_images/PATH" ... /> tags.
 */
export function extractImagePaths(content: string): string[] {
    const paths: string[] = [];
    const regex = /<img\s[^>]*src=["']([^"']*?)["'][^>]*\/?>/gi;
    let match;
    while ((match = regex.exec(content)) !== null) {
        const src = match[1];
        const idx = src.indexOf(STORAGE_PREFIX);
        if (idx !== -1) {
            paths.push(src.substring(idx + STORAGE_PREFIX.length));
        }
    }
    return paths;
}

/**
 * Delete all problem_images bucket files referenced in the given content.
 * Best-effort: logs errors but does not throw.
 */
export async function deleteProblemImages(supabase: SupabaseClient, content: string): Promise<void> {
    const paths = extractImagePaths(content);
    if (paths.length === 0) return;

    const { error } = await supabase.storage.from(BUCKET).remove(paths);
    if (error) {
        console.error('Failed to clean up problem images:', error.message, paths);
    }
}
