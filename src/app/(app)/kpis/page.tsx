'use client';

import React, { useState, useEffect } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell, Legend, Tooltip as RechartsTooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { getKpiData, type KpiData } from '@/app/actions';
import { Skeleton } from '@/components/ui/skeleton';

const chartConfigBySeverity = {
    count: { label: 'Vulnerabilities' },
    Critical: { label: 'Critical', color: 'hsl(var(--destructive))' },
    High: { label: 'High', color: 'hsl(var(--chart-1))' },
    Medium: { label: 'Medium', color: 'hsl(var(--chart-2))' },
    Low: { label: 'Low', color: 'hsl(var(--chart-3))' },
    Info: { label: 'Info', color: 'hsl(var(--chart-4))' },
};

const chartConfigOpenClosed = {
    value: { label: 'Count' },
    Open: { label: 'Open' },
    Closed: { label: 'Closed' },
}

const chartConfigTopProducts = {
    vulnerabilities: { label: 'Vulnerabilities', color: 'hsl(var(--primary))' }
}

const KpiSkeleton = () => (
    <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="lg:col-span-2">
            <CardHeader>
                <Skeleton className="h-7 w-3/5" />
                <Skeleton className="h-4 w-4/5" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-[300px] w-full" />
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <Skeleton className="h-7 w-3/5" />
                <Skeleton className="h-4 w-4/5" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-[300px] w-full" />
            </CardContent>
        </Card>
        <Card className="lg:col-span-3">
            <CardHeader>
                <Skeleton className="h-7 w-2/5" />
                <Skeleton className="h-4 w-3/5" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-[300px] w-full" />
            </CardContent>
        </Card>
    </div>
);


export default function KpiPage() {
    const [kpiData, setKpiData] = useState<KpiData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const data = await getKpiData();
                setKpiData(data);
            } catch (error) {
                console.error("Failed to fetch KPI data", error);
                // Optionally, set an error state here to show a message
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    if (isLoading || !kpiData) {
        return <KpiSkeleton />;
    }

  return (
    <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
      <Card className="lg:col-span-2 animate-in fade-in slide-in-from-bottom-4" style={{animationDelay: '100ms', animationFillMode: 'backwards'}}>
        <CardHeader>
          <CardTitle>Vulnerabilities by Severity</CardTitle>
          <CardDescription>A breakdown of all findings by severity level.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfigBySeverity} className="h-[300px] w-full">
            <BarChart data={kpiData.vulnerabilitiesBySeverity} accessibilityLayer>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="severity" tickLine={false} tickMargin={10} axisLine={false} />
              <YAxis />
              <RechartsTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
              <Bar dataKey="count" radius={4}>
                {kpiData.vulnerabilitiesBySeverity.map((entry) => (
                    <Cell key={`cell-${entry.severity}`} fill={chartConfigBySeverity[entry.severity as keyof typeof chartConfigBySeverity]?.color} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
      
      <Card className="animate-in fade-in slide-in-from-bottom-4" style={{animationDelay: '200ms', animationFillMode: 'backwards'}}>
        <CardHeader>
          <CardTitle>Open vs. Closed Findings</CardTitle>
          <CardDescription>The ratio of open to closed vulnerabilities.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfigOpenClosed} className="h-[300px] w-full">
            <PieChart accessibilityLayer>
              <RechartsTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={kpiData.openVsClosed}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                strokeWidth={5}
              >
              </Pie>
              <Legend content={({ payload }) => {
                return (
                  <ul className="flex flex-wrap gap-x-4 justify-center">
                    {payload?.map((entry, index) => (
                      <li key={`item-${index}`} className="flex items-center gap-2 text-sm">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                        {entry.value}
                      </li>
                    ))}
                  </ul>
                )
              }}/>
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="lg:col-span-3 animate-in fade-in slide-in-from-bottom-4" style={{animationDelay: '300ms', animationFillMode: 'backwards'}}>
        <CardHeader>
          <CardTitle>Top 5 Vulnerable Products</CardTitle>
          <CardDescription>Products with the highest number of open vulnerabilities.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfigTopProducts} className="h-[300px] w-full">
            <BarChart data={kpiData.topVulnerableProducts} layout="vertical" accessibilityLayer>
                <CartesianGrid horizontal={false} />
                <YAxis dataKey="product" type="category" tickLine={false} axisLine={false} tickMargin={10} width={120} />
                <XAxis type="number" dataKey="vulnerabilities" hide />
                <RechartsTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                <Bar dataKey="vulnerabilities" layout="vertical" radius={4} fill="var(--color-vulnerabilities)" />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
