'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { generateDefectDojoQueries } from '@/app/actions';
import { Wand2, Copy, Check } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from "@/hooks/use-toast"


const formSchema = z.object({
  queryDescription: z.string().min(10, {
    message: 'Description must be at least 10 characters.',
  }),
  pastQueries: z.string().optional(),
  userParameters: z.string().optional().refine(
    (val) => {
      if (!val || val.trim() === '') return true;
      try {
        JSON.parse(val);
        return true;
      } catch (e) {
        return false;
      }
    },
    { message: 'Parameters must be a valid JSON object.' }
  ),
});

export default function QueryGeneratorPage() {
  const [generatedQuery, setGeneratedQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      queryDescription: '',
      pastQueries: 'severity=Critical&active=true\nproduct__name=WebApp&found_by=2',
      userParameters: '{\n  "product__name": "DojoGPT",\n  "severity": "High"\n}',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setGeneratedQuery('');
    try {
      const result = await generateDefectDojoQueries({
        queryDescription: values.queryDescription,
        pastQueries: values.pastQueries?.split('\n').filter(Boolean) || [],
        userParameters: values.userParameters && values.userParameters.trim() !== '' ? JSON.parse(values.userParameters) : {},
      });
      setGeneratedQuery(result.query);
    } catch (error) {
      console.error('Failed to generate query:', error);
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: "Could not generate the query. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  const handleCopy = () => {
    if (!generatedQuery) return;
    navigator.clipboard.writeText(generatedQuery);
    setCopied(true);
    toast({
      title: "Copied to clipboard!",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>AI Query Generator</CardTitle>
          <CardDescription>
            Describe the data you need, provide context, and let AI generate the precise DefectDojo API query.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="queryDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Query Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., 'Find all high severity vulnerabilities in the DojoGPT product that are still active.'" {...field} />
                    </FormControl>
                    <FormDescription>
                      Clearly describe what you want the query to find.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pastQueries"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Past Successful Queries (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="One query per line..." {...field} rows={4}/>
                    </FormControl>
                     <FormDescription>
                      Provide examples of queries that have worked well before.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="userParameters"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User Parameters (Optional, JSON format)</FormLabel>
                    <FormControl>
                      <Textarea placeholder='{ "key": "value" }' {...field} rows={4}/>
                    </FormControl>
                    <FormDescription>
                      Provide specific key-value pairs to include in the query.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isLoading}>
                <Wand2 className="mr-2 h-4 w-4" />
                {isLoading ? 'Generating...' : 'Generate Query'}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
      
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>Generated Query</CardTitle>
          <CardDescription>
            The generated query will appear here. You can copy it for use in your API calls.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1">
            <div className="relative rounded-md bg-muted font-mono text-sm p-4 h-full">
                {isLoading && <Skeleton className="absolute inset-0" />}
                {!isLoading && generatedQuery && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7"
                        onClick={handleCopy}
                    >
                        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                )}
                <pre className="whitespace-pre-wrap break-all h-full">
                    <code>
                        {generatedQuery || (isLoading ? '' : 'Your generated query will be displayed here.')}
                    </code>
                </pre>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
