import { BotMessageSquare } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function Home() {
  return (
    <div className="flex h-svh w-full items-center justify-center bg-background p-4">
      <Card className="max-w-md animate-fade-in shadow-lg">
        <CardContent className="p-8 text-center">
            <BotMessageSquare className="h-16 w-16 text-primary mb-4 mx-auto" />
            <h1 className="text-3xl font-bold">Welcome to DojoGPT</h1>
            <p className="text-muted-foreground mt-2">
              Your AI-powered assistant for vulnerability management with DefectDojo.
            </p>
            <Button asChild className="mt-6">
              <Link href="/chat">Start Chatting</Link>
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
