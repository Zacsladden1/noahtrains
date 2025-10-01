'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Play, Trash2, Pencil, Save, X } from 'lucide-react';

export default function CoachLibraryManager() {
  const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50MB typical hosted limit
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoCategory, setVideoCategory] = useState('');
  const [videoTags, setVideoTags] = useState('');
  const [videoSection, setVideoSection] = useState<'form' | 'cooking'>('form');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState('');
  const [docTags, setDocTags] = useState('');
  const [saving, setSaving] = useState(false);
  const [videos, setVideos] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);

  useEffect(() => {
    refreshLists();
  }, []);

  const refreshLists = async () => {
    const [v, d] = await Promise.all([
      supabase.from('videos').select('*').order('created_at', { ascending: false }),
      supabase.from('documents').select('*').order('created_at', { ascending: false }),
    ]);
    setVideos(v.data || []);
    setDocuments(d.data || []);
  };

  const uploadToBucket = async (file: File): Promise<string> => {
    const path = `${Date.now()}_${file.name}`.replace(/\s+/g, '_');
    const { data, error } = await supabase.storage.from('videos').upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type || 'video/mp4' });
    if (error) throw error;
    return data.path;
  };

  const uploadThumbToBucket = async (file: File): Promise<string> => {
    const path = `thumbs/${Date.now()}_${file.name}`.replace(/\s+/g, '_');
    const { data, error } = await supabase.storage.from('videos').upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type || 'image/jpeg' });
    if (error) throw error;
    return data.path;
  };

  const saveVideo = async () => {
    if (!videoFile || !videoTitle) return;
    if (videoFile.size > MAX_VIDEO_BYTES) {
      alert(`This file is ${(videoFile.size / (1024*1024)).toFixed(1)}MB. Max allowed is ${(MAX_VIDEO_BYTES / (1024*1024)).toFixed(0)}MB. Please compress or upload a smaller file.`);
      return;
    }
    setSaving(true);
    try {
      const storage_path = await uploadToBucket(videoFile);
      const thumbnail_path = thumbFile ? await uploadThumbToBucket(thumbFile) : null;
      const { error: insErr } = await supabase.from('videos').insert({
        title: videoTitle,
        description: '',
        category: videoCategory || null,
        tags: videoTags ? videoTags.split(',').map((t) => t.trim()) : null,
        storage_path,
        is_public: true,
        section: videoSection,
        thumbnail_path,
      });
      if (insErr) throw insErr;
      setVideoFile(null); setThumbFile(null); setVideoTitle(''); setVideoCategory(''); setVideoTags('');
      setVideoSection('form');
      alert('Video uploaded');
      await refreshLists();
    } catch (e: any) {
      const msg = e?.message || 'Upload failed. Ensure you are a coach/admin and signed in.';
      alert(msg);
      console.error('Upload video failed:', e);
    } finally {
      setSaving(false);
    }
  };

  const saveDocument = async () => {
    if (!docFile || !docTitle) return;
    setSaving(true);
    try {
      const storage_path = await uploadToBucket(docFile);
      const { error: insErr } = await supabase.from('documents').insert({
        title: docTitle,
        description: '',
        category: docCategory || null,
        tags: docTags ? docTags.split(',').map((t) => t.trim()) : null,
        storage_path,
        is_public: true,
        file_type: docFile.type,
        file_size: docFile.size,
        section: 'documents',
      });
      if (insErr) throw insErr;
      setDocFile(null); setDocTitle(''); setDocCategory(''); setDocTags('');
      alert('Document uploaded');
      await refreshLists();
    } catch (e: any) {
      const msg = e?.message || 'Upload failed. Ensure you are a coach/admin and signed in.';
      alert(msg);
      console.error('Upload document failed:', e);
    } finally {
      setSaving(false);
    }
  };

  const updateVideoMeta = async (v: any) => {
    await supabase.from('videos').update({ title: v.title, description: v.description || null, category: v.category || null, tags: v.tags || null }).eq('id', v.id);
    setEditingVideoId(null);
    await refreshLists();
  };

  const deleteVideo = async (v: any) => {
    if (!confirm('Delete this video?')) return;
    try {
      if (v.storage_path) { try { await supabase.storage.from('videos').remove([v.storage_path]); } catch {} }
      await supabase.from('videos').delete().eq('id', v.id);
    } finally { await refreshLists(); }
  };

  const updateDocMeta = async (d: any) => {
    await supabase.from('documents').update({ title: d.title, description: d.description || null, category: d.category || null, tags: d.tags || null }).eq('id', d.id);
    setEditingDocId(null);
    await refreshLists();
  };

  const deleteDoc = async (d: any) => {
    if (!confirm('Delete this document?')) return;
    try {
      if (d.storage_path) { try { await supabase.storage.from('videos').remove([d.storage_path]); } catch {} }
      await supabase.from('documents').delete().eq('id', d.id);
    } finally { await refreshLists(); }
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
            <div>
              <Label className="text-white/80 text-sm">Video file</Label>
              <Input type="file" accept="video/*" onChange={(e)=>setVideoFile(e.target.files?.[0] || null)} className="mobile-input mt-1" />
              <div className="text-white/50 text-xs mt-1">Max {(MAX_VIDEO_BYTES/(1024*1024)).toFixed(0)}MB • mp4/mov/webm</div>
              {videoFile && (
                <div className="text-white/60 text-xs mt-1">
                  Selected: {videoFile.name} — {(videoFile.size/(1024*1024)).toFixed(1)}MB
                </div>
              )}
            </div>
            <div>
              <Label className="text-white/80 text-sm">Thumbnail (optional)</Label>
              <Input type="file" accept="image/*" onChange={(e)=>setThumbFile(e.target.files?.[0] || null)} className="mobile-input mt-1" />
            </div>
            <Input placeholder="Title" value={videoTitle} onChange={(e)=>setVideoTitle(e.target.value)} className="mobile-input" />
            <Input placeholder="Category" value={videoCategory} onChange={(e)=>setVideoCategory(e.target.value)} className="mobile-input" />
            <Input placeholder="Tags (comma separated)" value={videoTags} onChange={(e)=>setVideoTags(e.target.value)} className="mobile-input" />
            <div>
              <label className="text-white/80 text-sm">Section</label>
              <select className="w-full mt-1 bg-black border border-white/30 rounded-md text-white p-2" value={videoSection}
                onChange={(e)=>setVideoSection(e.target.value as 'form' | 'cooking')}>
                <option value="form">Form</option>
                <option value="cooking">Cooking</option>
              </select>
            </div>
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

      {/* Manage Existing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6 mt-4">
        <Card className="mobile-card">
          <CardHeader><CardTitle className="text-white text-base">Videos</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {videos.map((v) => (
              <div key={v.id} className="p-3 border border-white/20 rounded text-white">
                {editingVideoId === v.id ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input value={v.title || ''} onChange={(e)=>setVideos(prev=>prev.map(x=>x.id===v.id?{...x,title:e.target.value}:x))} className="mobile-input" />
                    <Input placeholder="Category" value={v.category || ''} onChange={(e)=>setVideos(prev=>prev.map(x=>x.id===v.id?{...x,category:e.target.value}:x))} className="mobile-input" />
                    <Input placeholder="Tags (comma)" value={(v.tags||[]).join(', ')} onChange={(e)=>setVideos(prev=>prev.map(x=>x.id===v.id?{...x,tags:e.target.value.split(',').map((t)=>t.trim())}:x))} className="mobile-input" />
                    <div className="flex gap-2 justify-end col-span-1 sm:col-span-2">
                      <Button size="sm" className="bg-gold text-black" onClick={()=>updateVideoMeta(v)}><Save className="w-4 h-4 mr-1" />Save</Button>
                      <Button size="sm" variant="outline" className="border-white/30 text-white" onClick={()=>setEditingVideoId(null)}><X className="w-4 h-4 mr-1" />Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{v.title}</div>
                      <div className="text-xs text-white/60 truncate">{v.storage_path}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="border-white/30 text-white" onClick={()=>setEditingVideoId(v.id)}><Pencil className="w-4 h-4" /></Button>
                      <Button size="sm" variant="outline" className="border-white/30 text-destructive" onClick={()=>deleteVideo(v)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="mobile-card">
          <CardHeader><CardTitle className="text-white text-base">Documents</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {documents.map((d) => (
              <div key={d.id} className="p-3 border border-white/20 rounded text-white">
                {editingDocId === d.id ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input value={d.title || ''} onChange={(e)=>setDocuments(prev=>prev.map(x=>x.id===d.id?{...x,title:e.target.value}:x))} className="mobile-input" />
                    <Input placeholder="Category" value={d.category || ''} onChange={(e)=>setDocuments(prev=>prev.map(x=>x.id===d.id?{...x,category:e.target.value}:x))} className="mobile-input" />
                    <Input placeholder="Tags (comma)" value={(d.tags||[]).join(', ')} onChange={(e)=>setDocuments(prev=>prev.map(x=>x.id===d.id?{...x,tags:e.target.value.split(',').map((t)=>t.trim())}:x))} className="mobile-input" />
                    <div className="flex gap-2 justify-end col-span-1 sm:col-span-2">
                      <Button size="sm" className="bg-gold text-black" onClick={()=>updateDocMeta(d)}><Save className="w-4 h-4 mr-1" />Save</Button>
                      <Button size="sm" variant="outline" className="border-white/30 text-white" onClick={()=>setEditingDocId(null)}><X className="w-4 h-4 mr-1" />Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{d.title}</div>
                      <div className="text-xs text-white/60 truncate">{d.storage_path}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="border-white/30 text-white" onClick={()=>setEditingDocId(d.id)}><Pencil className="w-4 h-4" /></Button>
                      <Button size="sm" variant="outline" className="border-white/30 text-destructive" onClick={()=>deleteDoc(d)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


