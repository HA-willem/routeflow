'use client';

import { Camera } from 'lucide-react';
import { useRef, useState } from 'react';

import { Button } from '@/components/primitives/button';
import { createClient } from '@/lib/supabase/client';

interface PhotoCaptureProps {
  jobId: string;
  companyId: string;
  type: 'before' | 'after';
  label: string;
  onUploaded: (storagePath: string) => Promise<void>;
}

/**
 * PhotoCapture (FR-044, 29_MobieleApp.md § 2.3) — voor/na, meerdere foto's,
 * upload + preview. `capture="environment"` opent direct de camera op mobiel
 * i.p.v. de fotogalerij (duimzone-first, 29 § 1).
 */
export function PhotoCapture({ jobId, companyId, type, label, onUploaded }: PhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    const supabase = createClient();

    for (const file of Array.from(files)) {
      const extension = file.name.split('.').pop() ?? 'jpg';
      const storagePath = `${companyId}/${jobId}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from('job_photos')
        .upload(storagePath, file, {
          contentType: file.type || 'image/jpeg',
        });

      if (uploadError) {
        setError('Foto kon niet worden geüpload. Blijft geregistreerd voor een nieuwe poging.');
        continue;
      }

      setPreviews((prev) => [...prev, URL.createObjectURL(file)]);
      await onUploaded(storagePath);
    }

    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="sr-only"
        id={`photo-${type}`}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full justify-center"
      >
        <Camera className="mr-2 size-4" aria-hidden />
        {uploading ? 'Uploaden…' : label}
      </Button>
      {error && <p className="text-danger mt-1 text-xs">{error}</p>}
      {previews.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {previews.map((src, index) => (
            // eslint-disable-next-line @next/next/no-img-element -- lokale blob-preview, geen Next.js image-optimalisatie nodig
            <img
              key={src}
              src={src}
              alt={`${label} ${index + 1}`}
              className="size-16 rounded-sm object-cover"
            />
          ))}
        </div>
      )}
    </div>
  );
}
