'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SendHorizonal, Bot, User, CircleDashed, CornerDownLeft, BotMessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { answerVulnerabilityQuestions } from '@/app/actions';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useData, type Message } from '@/context/DataContext';

export default function ChatPage() {
  const { messages, setMessages } = useData();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleSendMessage = useCallback(async (messageContent: string) => {
    if (!messageContent.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const result = await answerVulnerabilityQuestions({ question: messageContent });
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.answer,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I couldn't process your request. Please try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
      console.error('Error fetching answer:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, setMessages]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSendMessage(input);
    setInput('');
  };
  
  useEffect(() => {
    const scrollable = scrollAreaRef.current?.querySelector('div[data-radix-scroll-area-viewport]');
    if (scrollable) {
      scrollable.scrollTo({
        top: scrollable.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);
  
  const suggestions = [
    "List all critical vulnerabilities.",
    "Show me findings for product 'X'.",
    "What are the most common CVEs?",
    "Generate a summary of open issues."
  ];

  return (
    <div className="flex h-[calc(100vh_-_theme(spacing.24))] flex-col bg-card border rounded-lg shadow-sm">
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="p-4 sm:p-6 space-y-6">
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-center pt-16 animate-fade-in">
              <BotMessageSquare className="h-16 w-16 text-primary mb-4" />
              <h2 className="text-2xl font-semibold">Welcome to DojoGPT</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Ask me anything about your vulnerabilities in DefectDojo. I can help you find, analyze, and manage security findings.
              </p>
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
                {suggestions.map((s, i) => (
                    <Card 
                      key={s} 
                      className="hover:bg-accent cursor-pointer animate-slide-in-from-bottom"
                      style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'backwards' }}
                      onClick={() => handleSendMessage(s)}>
                        <CardContent className="p-4">
                            <p className="text-sm font-medium text-center">{s}</p>
                        </CardContent>
                    </Card>
                ))}
              </div>
            </div>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex items-start gap-4 animate-in fade-in slide-in-from-bottom-4',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.role === 'assistant' && (
                <Avatar className="h-8 w-8 border">
                   <AvatarFallback><Bot className="h-5 w-5 text-primary" /></AvatarFallback>
                </Avatar>
              )}
              <div
                className={cn(
                  'max-w-xl rounded-lg px-4 py-3 text-sm shadow-sm',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary'
                )}
              >
                {message.role === 'user' ? (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                ) : (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    className="prose prose-sm prose-invert max-w-none"
                    components={{
                      p: ({node, ...props}) => <p className="leading-relaxed last:mb-0" {...props} />,
                      ul: ({node, ...props}) => <ul className="space-y-1 list-disc list-outside ml-4" {...props} />,
                      ol: ({node, ...props}) => <ol className="space-y-1 list-decimal list-outside ml-4" {...props} />,
                      li: ({node, ...props}) => <li className="pl-1" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
                    }}
                  >{message.content}</ReactMarkdown>
                )}
              </div>
              {message.role === 'user' && (
                 <Avatar className="h-8 w-8 border">
                    <AvatarFallback><User className="h-5 w-5" /></AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start gap-4">
               <Avatar className="h-8 w-8 border">
                <AvatarFallback><Bot className="h-5 w-5 text-primary" /></AvatarFallback>
              </Avatar>
              <div className="max-w-lg rounded-lg bg-secondary shadow-sm px-4 py-3 text-sm flex items-center gap-2">
                <CircleDashed className="h-4 w-4 animate-spin" />
                <span>Thinking...</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      <div className="border-t bg-card rounded-b-lg p-4">
        <form onSubmit={handleSubmit} className="relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about vulnerabilities, products, or findings..."
            className="pr-20 resize-none bg-secondary/50"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as any);
              }
            }}
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            className="absolute right-3 top-1/2 -translate-y-1/2"
            disabled={isLoading || !input.trim()}
          >
            <SendHorizonal className="h-5 w-5" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
         <p className="text-xs text-muted-foreground mt-2 text-center">
            Press <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                <span className="text-xs">Shift</span>+<CornerDownLeft className="h-3 w-3" />
            </kbd> for a new line.
        </p>
      </div>
    </div>
  );
}
