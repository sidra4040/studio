'use client';

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getKpiData } from '@/app/actions';
import type { KpiData } from '@/ai/flows/get-kpi-data';
import { TrendingUp, ShieldCheck, ShieldAlert, ShieldHalf, ShieldQuestion, Shield } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <p className="font-bold">{label}</p>
        <p className="text-sm text-muted-foreground">{`${payload[0].name}: ${payload[0].value.toLocaleString()}`}</p>
      </div>
    );
  }
  return null;
};

const SEVERITY_COLORS: { [key: string]: string } = {
  Critical: 'hsl(var(--destructive))',
  High: 'hsl(var(--chart-5))',
  Medium: 'hsl(var(--chart-4))',
  Low: 'hsl(var(--chart-2))',
  Info: 'hsl(var(--chart-1))',
};

const SEVERITY_ICONS: { [key: string]: React.ElementType } = {
  Critical: ShieldAlert,
  High: ShieldCheck,
  Medium: ShieldHalf,
  Low: Shield,
  Info: ShieldQuestion,
};

export default function KpiPage() {
  const [data, setData] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const kpiData = await getKpiData();
        setData(kpiData);
      } catch (error) {
        console.error("Failed to fetch KPI data", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const totalVulnerabilities = data?.vulnerabilitiesBySeverity.reduce((acc, curr) => acc + curr.count, 0) ?? 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
                <Card key={index}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-6 w-6 rounded-full" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-8 w-16" />
                    </CardContent>
                </Card>
            ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Vulnerabilities by Severity</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <Skeleton className="h-[350px] w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Open vs. Closed</CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[350px] w-full" />
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Vulnerable Products</CardTitle>
          </CardHeader>
          <CardContent>
             <Skeleton className="h-[350px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed shadow-sm">
        <div className="flex flex-col items-center gap-2 text-center">
            <h3 className="text-2xl font-bold tracking-tight">An error occurred</h3>
            <p className="text-sm text-muted-foreground">
            Could not fetch dashboard data. Please check your DefectDojo connection and try again.
            </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                    <TrendingUp className="h-5 w-5" />
                    Vulnerability Overview
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
                    {data.vulnerabilitiesBySeverity.map((item) => {
                         const Icon = SEVERITY_ICONS[item.severity] || Shield;
                         return (
                            <Card key={item.severity} className="transition-all hover:border-primary">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">{item.severity}</CardTitle>
                                    <Icon className="h-4 w-4 text-muted-foreground" style={{color: SEVERITY_COLORS[item.severity]}} />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{item.count.toLocaleString()}</div>
                                    <p className="text-xs text-muted-foreground">
                                        {totalVulnerabilities > 0 ? `${((item.count / totalVulnerabilities) * 100).toFixed(1)}% of total` : `0% of total`}
                                    </p>
                                </CardContent>
                            </Card>
                         )
                    })}
                </div>
            </CardContent>
        </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Vulnerabilities by Severity</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={data.vulnerabilitiesBySeverity} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="severity" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--accent))', radius: 4 }} />
                <Bar dataKey="count" name="Count" radius={[4, 4, 0, 0]}>
                    {data.vulnerabilitiesBySeverity.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[entry.severity]} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Open vs. Closed Findings</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={data.openVsClosed}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={120}
                  dataKey="value"
                  label={({ cx, cy, midAngle, innerRadius, outerRadius, value, index }) => {
                    const RADIAN = Math.PI / 180;
                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                    return (
                      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-sm font-bold">
                        {`${data.openVsClosed[index].name} (${value.toLocaleString()})`}
                      </text>
                    );
                  }}
                >
                  {data.openVsClosed.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} stroke={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top 5 Vulnerable Products</CardTitle>
        </CardHeader>
        <CardContent className="pl-2">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data.topVulnerableProducts} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis dataKey="product" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={120} tick={{ textAnchor: 'end' }} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--accent))', radius: 4 }} />
              <Bar dataKey="vulnerabilities" name="Vulnerabilities" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
    </div>
  );
}
