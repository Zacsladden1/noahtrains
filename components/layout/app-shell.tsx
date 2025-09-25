'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { 
  Home, 
  Dumbbell, 
  Apple, 
  MessageCircle, 
  BookOpen, 
  Settings,
  Menu,
  X,
  LogOut,
  Users,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AppShellProps {
  children: React.ReactNode;
}

const clientNavItems = [
  { href: '/dashboard', icon: Home, label: 'Dashboard' },
  { href: '/workouts', icon: Dumbbell, label: 'Workouts' },
  { href: '/nutrition', icon: Apple, label: 'Nutrition' },
  { href: '/messages', icon: MessageCircle, label: 'Messages' },
  { href: '/library', icon: BookOpen, label: 'Library' },
];

const adminNavItems = [
  { href: '/admin', icon: BarChart3, label: 'Admin' },
  { href: '/admin/clients', icon: Users, label: 'Clients' },
  { href: '/workouts', icon: Dumbbell, label: 'Workouts' },
  { href: '/messages', icon: MessageCircle, label: 'Messages' },
  { href: '/library', icon: BookOpen, label: 'Library' },
];

export function AppShell({ children }: AppShellProps) {
  const { profile, signOut, isAdmin } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = isAdmin ? adminNavItems : clientNavItems;

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-60 xl:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-black border-r border-white/20">
        <div className="flex items-center justify-center h-16 px-4 border-b border-border">
          <h1 className="text-lg xl:text-xl font-heading text-white">Noahhtrains</h1>
        </div>
        
        <nav className="flex-1 px-3 xl:px-4 py-4 xl:py-6 space-y-2 xl:space-y-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    'flex items-center px-3 xl:px-4 py-2 xl:py-3 text-sm font-medium rounded-lg xl:rounded-xl transition-colors',
                    isActive
                      ? 'bg-gold text-black'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  )}
                >
                  <Icon className="w-4 h-4 xl:w-5 xl:h-5 mr-2 xl:mr-3" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 xl:p-4 border-t border-white/20">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start text-white hover:bg-white/10 p-2 xl:p-3">
                <Avatar className="w-7 h-7 xl:w-8 xl:h-8 mr-2 xl:mr-3">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback>
                    {profile?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start">
                  <span className="text-xs xl:text-sm font-medium truncate max-w-24 xl:max-w-none">{profile?.full_name}</span>
                  <span className="text-xs text-white/50 capitalize">{profile?.role}</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 sm:w-80 bg-black border-r border-white/20">
              <div className="flex items-center justify-between h-16 px-4 border-b border-white/20">
              <h1 className="text-lg sm:text-xl font-heading text-white">Noahhtrains</h1>
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                <X className="w-5 h-5 text-white" />
              </Button>
            </div>
            
            <nav className="flex-1 px-4 py-6 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                return (
                  <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}>
                    <div
                      className={cn(
                        'flex items-center px-4 py-3 text-base font-medium rounded-xl transition-colors',
                        isActive
                          ? 'bg-gold text-black'
                          : 'text-white/70 hover:text-white hover:bg-white/10'
                      )}
                    >
                      <Icon className="w-5 h-5 mr-4" />
                      {item.label}
                    </div>
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-col flex-1 lg:pl-60 xl:pl-64">
        {/* Mobile Header */}
        <header className="flex items-center justify-between h-16 px-4 bg-black border-b border-white/20 lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5 text-white" />
          </Button>
          <h1 className="text-base sm:text-lg font-heading text-white">Noahhtrains</h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Avatar className="w-7 h-7 sm:w-8 sm:h-8">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback>
                    {profile?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto pb-16 sm:pb-20 lg:pb-6 bg-black">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-black border-t border-white/20 lg:hidden safe-area-pb">
          <div className="flex">
            {navItems.slice(0, 5).map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link key={item.href} href={item.href} className="flex-1">
                  <div
                    className={cn(
                      'flex flex-col items-center py-2 sm:py-3 px-1 transition-colors min-h-[60px] sm:min-h-[64px] justify-center',
                      isActive ? 'text-gold' : 'text-white/60'
                    )}
                  >
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 mb-1" />
                    <span className="text-xs font-medium leading-tight text-center">{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );