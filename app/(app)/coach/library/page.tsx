'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function CoachLibraryManager() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoCategory, setVideoCategory] = useState('');
  const [videoTags, setVideoTags] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState('');
  const [docTags, setDocTags] = useState('');
  const [saving, setSaving] = useState(false);

  const uploadToBucket = async (file: File): Promise<string> => {
    const path = `${Date.now()}_${file.name}`.replace(/\s+/g, '_');
    const { data, error } = await supabase.storage.from('videos').upload(path, file, { cacheControl: '3600', upsert: false });
    if (error) throw error;
    return data.path;
  };

  const saveVideo = async () => {
    if (!videoFile || !videoTitle) return;
    setSaving(true);
    try {
      const storage_path = await uploadToBucket(videoFile);
      await supabase.from('videos').insert({
        title: videoTitle,
        description: '',
        category: videoCategory || null,
        tags: videoTags ? videoTags.split(',').map((t) => t.trim()) : null,
        storage_path,
        is_public: true,
      });
      setVideoFile(null); setVideoTitle(''); setVideoCategory(''); setVideoTags('');
      alert('Video uploaded');
    } finally {
      setSaving(false);
    }
  };

  const saveDocument = async () => {
    if (!docFile || !docTitle) return;
    setSaving(true);
    try {
      const storage_path = await uploadToBucket(docFile);
      await supabase.from('documents').insert({
        title: docTitle,
        description: '',
        category: docCategory || null,
        tags: docTags ? docTags.split(',').map((t) => t.trim()) : null,
        storage_path,
        is_public: true,
        file_type: docFile.type,
        file_size: docFile.size,
      });
      setDocFile(null); setDocTitle(''); setDocCategory(''); setDocTags('');
      alert('Document uploaded');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mobile-padding mobile-spacing bg-black min-h-screen">
      <h1 className="text-xl sm:text-2xl md:text-3xl font-heading text-white mb-3">Content Manager</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
        <Card className="mobile-card">
          <CardHeader>
            <CardTitle className="text-white text-base">Add Video</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input type="file" accept="video/*" onChange={(e)=>setVideoFile(e.target.files?.[0] || null)} className="mobile-input" />
            <Input placeholder="Title" value={videoTitle} onChange={(e)=>setVideoTitle(e.target.value)} className="mobile-input" />
            <Input placeholder="Category" value={videoCategory} onChange={(e)=>setVideoCategory(e.target.value)} className="mobile-input" />
            <Input placeholder="Tags (comma separated)" value={videoTags} onChange={(e)=>setVideoTags(e.target.value)} className="mobile-input" />
            <Button onClick={saveVideo} disabled={!videoFile || !videoTitle || saving} className="bg-gold hover:bg-gold/90 text-black">{saving ? 'Saving…' : 'Upload Video'}</Button>
          </CardContent>
        </Card>

        <Card className="mobile-card">
          <CardHeader>
            <CardTitle className="text-white text-base">Add Document</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input type="file" accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation" onChange={(e)=>setDocFile(e.target.files?.[0] || null)} className="mobile-input" />
            <Input placeholder="Title" value={docTitle} onChange={(e)=>setDocTitle(e.target.value)} className="mobile-input" />
            <Input placeholder="Category" value={docCategory} onChange={(e)=>setDocCategory(e.target.value)} className="mobile-input" />
            <Input placeholder="Tags (comma separated)" value={docTags} onChange={(e)=>setDocTags(e.target.value)} className="mobile-input" />
            <Button onClick={saveDocument} disabled={!docFile || !docTitle || saving} className="bg-gold hover:bg-gold/90 text-black">{saving ? 'Saving…' : 'Upload Document'}</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


