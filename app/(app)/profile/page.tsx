'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';
import EnableNotificationsButton from '@/components/system/enable-notifications';

export default function ProfilePage() {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState({ phone: profile?.phone || '', age: profile?.age || '', current_weight_kg: profile?.current_weight_kg || '', goal_weight_kg: profile?.goal_weight_kg || '' } as any);
  const [deviceCount, setDeviceCount] = useState<number | null>(null);

  const uploadAvatar = async (file: File) => {
    if (!profile?.id) return;
    setUploading(true);
    try {
      console.log('[Avatar] starting upload', { userId: profile.id, file: file.name, size: file.size, type: file.type });
      const sanitized = file.name.replace(/\s+/g, '_');
      const path = `${profile.id}/${Date.now()}_${sanitized}`;
      const { data, error } = await supabase.storage.from('avatars').upload(path, file);
      if (error) throw error;
      console.log('[Avatar] uploaded', data);
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(data.path);
      const url = pub.publicUrl;
      console.log('[Avatar] public URL', url);
      // Immediately update UI state and button before awaiting DB writes
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
      // Fire-and-forget profile updates
      supabase.from('profiles').update({ avatar_url: url }).eq('id', profile.id)
        .then(()=>console.log('[Avatar] profile updated'))
        .catch((e)=>console.warn('[Avatar] profile update failed', e));
      // also update auth metadata best-effort
      try { supabase.auth.updateUser({ data: { avatar_url: url } }).catch((e)=>console.warn('[Avatar] auth metadata update failed', e)); } catch (e) { console.warn('[Avatar] auth metadata sync error', e); }
    } catch (e: any) {
      console.error('[Avatar] upload error', e);
      alert(e?.message || 'Failed to upload image');
    } finally {
      // safety: ensure button resets even if above fire-and-forget path is taken
      setUploading(false);
    }
  };

  const saveProfile = async () => {
    if (!profile?.id) return;
    const payload: any = {
      phone: form.phone || null,
      age: form.age === '' ? null : Number(form.age),
      current_weight_kg: form.current_weight_kg === '' ? null : Number(form.current_weight_kg),
      goal_weight_kg: form.goal_weight_kg === '' ? null : Number(form.goal_weight_kg),
      onboarding_complete: true,
    };
    try {
      await supabase.from('profiles').update(payload).eq('id', profile.id);
      // Redirect to appropriate home after onboarding
      const target = (profile?.role === 'coach') ? '/coach' : '/dashboard';
      router.replace(`${target}?v=${Date.now()}`);
    } catch (e: any) {
      // fallback minimal notice inline without console
      window.alert(e?.message || 'Failed to save profile');
    }
  };

  // Load device subscription count
  useEffect(() => {
    (async () => {
      if (!profile?.id) return;
      try {
        const { count } = await supabase
          .from('push_subscriptions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', profile.id);
        setDeviceCount(count || 0);
      } catch {
        setDeviceCount(null);
      }
    })();
  }, [profile?.id]);

  // Keep form in sync with latest profile values when they load/update
  useEffect(() => {
    setForm({
      phone: (profile as any)?.phone ?? '',
      age: (profile as any)?.age ?? '',
      current_weight_kg: (profile as any)?.current_weight_kg ?? '',
      goal_weight_kg: (profile as any)?.goal_weight_kg ?? '',
    });
  }, [profile?.phone, profile?.age, profile?.current_weight_kg, profile?.goal_weight_kg]);

  // If user already completed onboarding, don't show this page; redirect home
  useEffect(() => {
    if (profile && (profile as any).onboarding_complete) {
      const target = (profile?.role === 'coach') ? '/coach' : '/dashboard';
      router.replace(target);
    }
  }, [profile?.role, (profile as any)?.onboarding_complete, router]);

  return (
    <div className="mobile-padding mobile-spacing bg-black min-h-screen">
      <h1 className="text-xl sm:text-2xl md:text-3xl font-heading text-white mb-3">Settings</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <Card className="mobile-card">
          <CardHeader>
            <CardTitle className="text-white text-base">Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-white/80 text-sm">Signed in as</div>
            <div className="text-white text-sm">{profile?.full_name || profile?.email}</div>
            <div className="flex items-center gap-3">
              <Avatar className="w-14 h-14">
                {profile?.avatar_url ? (
                  <AvatarImage src={profile.avatar_url} alt="Avatar" />
                ) : null}
                <AvatarFallback className="bg-gold text-black">
                  {(profile?.full_name || profile?.email || 'U').slice(0,1)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e)=>{ const f=e.target.files?.[0]; if (f) uploadAvatar(f); }} />
                <Button type="button" variant="outline" className="border-white/30 text-white hover:bg-white/10" onClick={()=>fileRef.current?.click()} disabled={uploading}>
                  {uploading ? 'Uploading…' : 'Change photo'}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-white/80 text-sm">Phone</label>
                <Input value={form.phone} onChange={(e)=>setForm({ ...form, phone: e.target.value })} className="mobile-input mt-1" placeholder="+1 555 123 4567" />
              </div>
              <div>
                <label className="text-white/80 text-sm">Age</label>
                <Input type="number" inputMode="numeric" value={form.age} onChange={(e)=>setForm({ ...form, age: e.target.value })} className="mobile-input mt-1" placeholder="24" />
              </div>
              <div>
                <label className="text-white/80 text-sm">Current weight (kg)</label>
                <Input type="number" inputMode="decimal" value={form.current_weight_kg} onChange={(e)=>setForm({ ...form, current_weight_kg: e.target.value })} className="mobile-input mt-1" placeholder="80" />
              </div>
              <div>
                <label className="text-white/80 text-sm">Goal weight (kg)</label>
                <Input type="number" inputMode="decimal" value={form.goal_weight_kg} onChange={(e)=>setForm({ ...form, goal_weight_kg: e.target.value })} className="mobile-input mt-1" placeholder="72" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <Button type="button" onClick={saveProfile} className="bg-gold hover:bg-gold/90 text-black">Save</Button>
              <EnableNotificationsButton className="border-white/30 text-white hover:bg-white/10 px-4 py-2 rounded-md border" />
              {deviceCount !== null && (
                <span className="text-white/70 text-sm">Registered devices: {deviceCount}</span>
              )}
              <Button onClick={() => signOut()} variant="outline" className="ml-auto border-white/30 text-white hover:bg-white/10">Sign out</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


