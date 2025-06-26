'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  BotMessageSquare,
  FilePieChart,
  SearchCode,
  Settings,
} from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();

  const menuItems = [
    {
      href: '/chat',
      label: 'DojoGPT Chat',
      icon: BotMessageSquare,
    },
    {
      href: '/query-generator',
      label: 'AI Query Generator',
      icon: SearchCode,
    },
    {
      href: '/kpis',
      label: 'KPI Dashboard',
      icon: BarChart3,
    },
    {
      href: '/analysis',
      label: 'Product Analysis',
      icon: FilePieChart,
    },
  ];

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r bg-card">
        <SidebarHeader className="h-16 flex items-center justify-center p-2">
           <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-10 w-10 text-primary" asChild>
                <Link href="/chat">
                    <BotMessageSquare className="h-6 w-6" />
                </Link>
            </Button>
            <h1 className="text-lg font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
                DojoGPT
            </h1>
           </div>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith(item.href)}
                  tooltip={{ children: item.label, side: 'right' }}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-2">
          <Separator className="my-2" />
          <div className="flex items-center gap-3 p-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:py-2">
            <Avatar className="h-9 w-9">
              <AvatarImage src="https://placehold.co/100x100.png" alt="@user" data-ai-hint="man" />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-medium">User</span>
              <span className="text-xs text-muted-foreground">user@example.com</span>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm md:justify-end">
          <SidebarTrigger className="md:hidden" />
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
            <span className="sr-only">Settings</span>
          </Button>
        </header>
        <main className="flex-1 p-4 md:p-6 animate-fade-in">
            {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default AppLayout;
