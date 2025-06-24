'use client';

import React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell, Legend, Tooltip as RechartsTooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

const vulnerabilitiesBySeverityData = [
  { severity: 'Critical', count: 15 },
  { severity: 'High', count: 45 },
  { severity: 'Medium', count: 120 },
  { severity: 'Low', count: 250 },
  { severity: 'Info', count: 300 },
];

const openVsClosedData = [
    { name: 'Open', value: 180, fill: 'hsl(var(--destructive))' },
    { name: 'Closed', value: 550, fill: 'hsl(var(--chart-2))' },
];

const topVulnerableProductsData = [
    { product: 'Legacy API', vulnerabilities: 78 },
    { product: 'Mobile App v2', vulnerabilities: 55 },
    { product: 'Data Processor', vulnerabilities: 42 },
    { product: 'WebApp Gateway', vulnerabilities: 31 },
    { product: 'Internal Dashboard', vulnerabilities: 25 },
];

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

export default function KpiPage() {
  return (
    <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Vulnerabilities by Severity</CardTitle>
          <CardDescription>A breakdown of all findings by severity level.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfigBySeverity} className="h-[300px] w-full">
            <BarChart data={vulnerabilitiesBySeverityData} accessibilityLayer>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="severity" tickLine={false} tickMargin={10} axisLine={false} />
              <YAxis />
              <RechartsTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
              <Bar dataKey="count" radius={4}>
                {vulnerabilitiesBySeverityData.map((entry) => (
                    <Cell key={`cell-${entry.severity}`} fill={chartConfigBySeverity[entry.severity as keyof typeof chartConfigBySeverity]?.color} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Open vs. Closed Findings</CardTitle>
          <CardDescription>The ratio of open to closed vulnerabilities.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfigOpenClosed} className="h-[300px] w-full">
            <PieChart accessibilityLayer>
              <RechartsTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={openVsClosedData}
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

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Top 5 Vulnerable Products</CardTitle>
          <CardDescription>Products with the highest number of open vulnerabilities.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfigTopProducts} className="h-[300px] w-full">
            <BarChart data={topVulnerableProductsData} layout="vertical" accessibilityLayer>
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
