'use client';

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { getProductAnalysis } from '@/app/actions';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FilePieChart, CircleDashed } from 'lucide-react';
import { useData } from '@/context/DataContext';

const AnalysisSkeleton = () => (
    <div className="space-y-4 mt-6">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="pt-4">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-full mt-2" />
            <Skeleton className="h-4 w-full mt-2" />
            <Skeleton className="h-4 w-5/6 mt-2" />
        </div>
    </div>
)

export default function AnalysisPage() {
  const { productList, isLoading: isProductListLoading } = useData();
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [analysis, setAnalysis] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleProductSelect = async (productName: string) => {
    if (!productName) {
      setSelectedProduct('');
      setAnalysis('');
      return;
    }
    setSelectedProduct(productName);
    setIsLoading(true);
    setAnalysis('');

    try {
      const result = await getProductAnalysis({ productName });
      setAnalysis(result.analysis);
    } catch (error) {
      console.error(`Failed to get analysis for ${productName}`, error);
      setAnalysis(
        'Sorry, an error occurred while generating the analysis. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Vulnerability Analysis</CardTitle>
        <CardDescription>
          Select a product to get a detailed, AI-generated analysis of its
          critical and high-severity vulnerabilities.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Select
          onValueChange={handleProductSelect}
          value={selectedProduct}
          disabled={isProductListLoading}
        >
          <SelectTrigger className="w-full md:w-1/2">
            <SelectValue placeholder={isProductListLoading ? "Loading products..." : "Select a product to analyze..."} />
          </SelectTrigger>
          <SelectContent>
            {productList.map((product) => (
              <SelectItem key={product} value={product}>
                {product}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="mt-6 prose prose-sm prose-invert max-w-none">
            {isLoading && <AnalysisSkeleton />}
            {!isLoading && !analysis && selectedProduct && (
                 <div className="flex flex-col items-center justify-center text-center p-8 border rounded-lg">
                    <CircleDashed className="h-12 w-12 text-muted-foreground animate-spin" />
                    <p className="mt-4 text-muted-foreground">Generating analysis for {selectedProduct}...</p>
                 </div>
            )}
             {!isLoading && !analysis && !selectedProduct && (
                 <div className="flex flex-col items-center justify-center text-center p-8 border rounded-lg bg-secondary/20">
                    <FilePieChart className="h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 text-muted-foreground">Your product analysis will appear here.</p>
                 </div>
            )}
            {!isLoading && analysis && (
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({node, ...props}) => <p className="leading-relaxed last:mb-0" {...props} />,
                      ul: ({node, ...props}) => <ul className="space-y-2 list-disc list-outside ml-4" {...props} />,
                      ol: ({node, ...props}) => <ol className="space-y-4 list-decimal list-outside ml-4" {...props} />,
                      li: ({node, ...props}) => <li className="pl-2" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
                    }}
                >
                    {analysis}
                </ReactMarkdown>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
