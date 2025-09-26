'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Bell, Dumbbell, ListFilter } from 'lucide-react';

export default function CoachHome() {
  return (
    <div className="mobile-padding mobile-spacing bg-black min-h-screen">
      <div className="space-y-1 sm:space-y-2">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-heading text-white">Coach</h1>
        <p className="text-white/70 text-xs sm:text-sm">Manage clients, nutrition targets, and plans</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
        <Card className="mobile-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><Users className="w-5 h-5 text-gold" /> Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white/60 text-sm mb-3">View all clients, search, and open details</p>
            <Link href="/coach/clients"><Button variant="outline" className="w-full border-white/30 text-white hover:bg-white/10">Open Clients</Button></Link>
          </CardContent>
        </Card>

        <Card className="mobile-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><Bell className="w-5 h-5 text-gold" /> Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white/60 text-sm mb-3">Send in-app notifications to clients</p>
            <Link href="/coach/notifications"><Button variant="outline" className="w-full border-white/30 text-white hover:bg-white/10">Open Notifications</Button></Link>
          </CardContent>
        </Card>

        <Card className="mobile-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><Dumbbell className="w-5 h-5 text-gold" /> Assign Workouts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white/60 text-sm mb-3">Create and assign daily exercise plans</p>
            <Link href="/coach/workouts"><Button variant="outline" className="w-full border-white/30 text-white hover:bg-white/10">Assign Workouts</Button></Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
