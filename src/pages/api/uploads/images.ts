/**
 * POST /api/uploads/images
 * 
 * Uploads an image file to Supabase Storage and returns a public URL.
 * Requires authentication (Bearer token).
 */

import type { APIRoute } from 'astro';
import { randomUUID } from 'node:crypto';

function json(message: unknown, status = 200): Response {
  return new Response(JSON.stringify(message), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

function extractBearerToken(header: string | null): string | null {
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.*)$/i);
  return match ? match[1].trim() : null;
}

function extensionFromFile(file: File): string {
  const name = file.name || '';
  const lastDot = name.lastIndexOf('.');
  if (lastDot > -1 && lastDot < name.length - 1) {
    return name.slice(lastDot + 1).toLowerCase();
  }

  switch (file.type) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    default:
      return 'bin';
  }
}

export const POST: APIRoute = async ({ request, locals }) => {
  const token = extractBearerToken(request.headers.get('authorization'));
  if (!token) {
    return json({ error: { message: 'Authentication required' } }, 401);
  }

  const { data, error } = await locals.supabase.auth.getUser(token);
  if (error || !data.user) {
    return json({ error: { message: 'Invalid or expired token' } }, 401);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch (err) {
    console.error('Failed to parse multipart/form-data in /api/uploads/images', err);
    return json({ error: { message: 'Expected multipart/form-data' } }, 400);
  }

  const maybeFile = form.get('file');
  if (!(maybeFile instanceof File)) {
    return json({ error: { message: 'Missing file field' } }, 400);
  }

  if (maybeFile.size <= 0) {
    return json({ error: { message: 'Empty file' } }, 400);
  }

  // Maximum file size: 10MB
  const MAX_FILE_SIZE_MB = 10;
  const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;
  if (maybeFile.size > MAX_FILE_SIZE) {
    return json({ error: { message: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE_MB}MB` } }, 400);
  }

  if (!maybeFile.type.startsWith('image/')) {
    return json({ error: { message: 'Only image uploads are supported' } }, 400);
  }

  const bucket = import.meta.env.PUBLIC_SUPABASE_STORAGE_BUCKET || 'recipe-images';
  const ext = extensionFromFile(maybeFile);
  const objectPath = `users/${data.user.id}/${randomUUID()}.${ext}`;

  const uploadResult = await locals.supabase.storage.from(bucket).upload(objectPath, maybeFile, {
    contentType: maybeFile.type,
    upsert: false,
  });

  if (uploadResult.error) {
    console.error('Storage upload failed:', uploadResult.error);

    const anyError = uploadResult.error as unknown as {
      message?: string;
      status?: number;
      statusCode?: string | number;
      error?: string;
    };

    const statusCode = typeof anyError.statusCode === 'string' ? Number(anyError.statusCode) : anyError.statusCode;
    const message = anyError.message || anyError.error || 'Failed to upload image';

    const isBucketMissing =
      statusCode === 404 ||
      anyError.status === 400 ||
      /bucket\s+not\s+found/i.test(message);

    if (isBucketMissing) {
      return json(
        {
          error: {
            message: `Storage bucket "${bucket}" not found. Create it in Supabase Storage or set PUBLIC_SUPABASE_STORAGE_BUCKET to an existing bucket.`,
          },
        },
        400,
      );
    }

    const isRlsViolation =
      statusCode === 403 ||
      /row\s+level\s+security|violates\s+row\s+level\s+security|rls/i.test(message);

    if (isRlsViolation) {
      return json(
        {
          error: {
            message:
              `Upload blocked by Supabase Storage RLS policies for bucket "${bucket}". ` +
              `Add a Storage policy that allows authenticated INSERTs to storage.objects for this bucket (e.g. for paths like users/<uid>/...).`,
          },
        },
        403,
      );
    }

    return json({ error: { message } }, 500);
  }

  const publicUrlResult = locals.supabase.storage.from(bucket).getPublicUrl(objectPath);

  return json({
    url: publicUrlResult.data.publicUrl,
    path: objectPath,
    bucket,
  });
};
