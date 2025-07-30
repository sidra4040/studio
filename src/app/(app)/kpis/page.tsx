
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getKpiData, KpiData } from '@/ai/flows/get-kpi-data';
import { getProductKpiData, ProductKpiData, ProductKpiInput } from '@/ai/flows/get-product-kpi-data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const severityColors = {
  Critical: 'hsl(var(--destructive))',
  High: 'hsl(var(--chart-1))',
  Medium: 'hsl(var(--chart-2))',
  Low: 'hsl(var(--chart-3))',
  Info: 'hsl(var(--chart-4))',
};

const pieColors = ['hsl(var(--chart-1))', 'hsl(var(--secondary))'];


function KpiDashboard() {
  const [kpiData, setKpiData] = useState<KpiData | null>(null);
  const [productKpiData, setProductKpiData] = useState<ProductKpiData | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProductLoading, setIsProductLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const data = await getKpiData();
        setKpiData(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching KPI data:", err);
        setError("Failed to load dashboard data. Please check the connection to the backend and DefectDojo.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleProductChange = async (productName: string) => {
    if (!productName) {
        setSelectedProduct(null);
        setProductKpiData(null);
        return;
    }
    try {
        setSelectedProduct(productName);
        setIsProductLoading(true);
        const data = await getProductKpiData({ productName });
        setProductKpiData(data);
    } catch (err) {
        console.error(`Error fetching data for product ${productName}:`, err);
        setError(`Failed to load data for product ${productName}.`);
    } finally {
        setIsProductLoading(false);
    }
  }

  const severityChartData = useMemo(() => {
    if (!kpiData) return [];
    return [
      { name: 'Critical', count: kpiData.severityCounts.critical, fill: severityColors.Critical },
      { name: 'High', count: kpiData.severityCounts.high, fill: severityColors.High },
      { name: 'Medium', count: kpiData.severityCounts.medium, fill: severityColors.Medium },
      { name: 'Low', count: kpiData.severityCounts.low, fill: severityColors.Low },
      { name: 'Info', count: kpiData.severityCounts.info, fill: severityColors.Info },
    ];
  }, [kpiData]);

  const openClosedChartData = useMemo(() => {
    if (!kpiData) return [];
    return [
      { name: 'Open', value: kpiData.openVsClosedCounts.open },
      { name: 'Closed', value: kpiData.openVsClosedCounts.closed },
    ];
  }, [kpiData]);

  const topProductsChartData = useMemo(() => {
    if (!kpiData) return [];
    // Reverse for horizontal bar chart display order
    return kpiData.topVulnerableProducts.slice().reverse();
  }, [kpiData]);

  const productSeverityChartData = useMemo(() => {
    if (!productKpiData) return [];
    const { severityCounts } = productKpiData;
    // The data for the chart needs to be in an array with a single object.
    return [{
      name: selectedProduct, // The product name can be used if needed, but the X-axis is severity
      Critical: severityCounts.critical,
      High: severityCounts.high,
      Medium: severityCounts.medium,
      Low: severityCounts.low,
      Info: severityCounts.info,
    }];
  }, [productKpiData, selectedProduct]);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-full lg:col-span-4">
            <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
            <CardContent><Skeleton className="h-[300px] w-full" /></CardContent>
        </Card>
        <Card className="col-span-full lg:col-span-3">
            <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
            <CardContent><Skeleton className="h-[300px] w-full" /></CardContent>
        </Card>
        <Card className="col-span-full">
            <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
            <CardContent><Skeleton className="h-[250px] w-full" /></CardContent>
        </Card>
        <Card className="col-span-full">
            <CardHeader><Skeleton className="h-6 w-1/4" /></CardHeader>
            <CardContent><Skeleton className="h-[150px] w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><AlertCircle className="text-destructive" /> Error</CardTitle>
            </CardHeader>
            <CardContent>
                <Alert variant="destructive">
                    <AlertTitle>Could not load dashboard</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </CardContent>
        </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
      <Card className="col-span-full lg:col-span-4">
        <CardHeader>
          <CardTitle>Vulnerabilities by Severity</CardTitle>
          <CardDescription>A breakdown of all findings by severity level across all products.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={severityChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: 'hsla(var(--accent))' }} 
                contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    borderColor: 'hsl(var(--border))'
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card className="col-span-full lg:col-span-3">
        <CardHeader>
          <CardTitle>Open vs. Closed Findings</CardTitle>
          <CardDescription>The ratio of open to closed vulnerabilities.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={openClosedChartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={120}
                paddingAngle={5}
              >
                {openClosedChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    borderColor: 'hsl(var(--border))'
                }}
              />
              <Legend iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="col-span-full">
        <CardHeader>
            <CardTitle>Top 5 Vulnerable Products</CardTitle>
            <CardDescription>Products with the highest number of open vulnerabilities.</CardDescription>
        </CardHeader>
        <CardContent>
            <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topProductsChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={150} />
                    <Tooltip 
                        cursor={{ fill: 'hsla(var(--accent))' }} 
                        contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            borderColor: 'hsl(var(--border))'
                        }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="col-span-full">
        <CardHeader>
            <CardTitle>Product Deep Dive</CardTitle>
            <CardDescription>Select a product to see its severity distribution and top critical vulnerabilities.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <Select onValueChange={handleProductChange} disabled={isProductLoading}>
                <SelectTrigger className="w-full md:w-1/3">
                    <SelectValue placeholder="Select a product..." />
                </SelectTrigger>
                <SelectContent>
                    {kpiData?.allProducts.map(p => (
                        <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {isProductLoading && (
                <div className="grid gap-4 md:grid-cols-2">
                    <Skeleton className="h-[250px] w-full" />
                    <Skeleton className="h-[250px] w-full" />
                </div>
            )}

            {productKpiData && !isProductLoading && (
                <div className="grid gap-4 md:grid-cols-2 pt-4">
                    <div>
                        <h4 className="text-md font-semibold mb-2 text-center">Vulnerabilities by Severity</h4>
                         <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={productSeverityChartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} ticks={['Critical', 'High', 'Medium', 'Low', 'Info']} />
                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false}/>
                                <Tooltip
                                    cursor={{ fill: 'hsla(var(--accent))' }} 
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--background))',
                                        borderColor: 'hsl(var(--border))'
                                    }}
                                />
                                <Bar dataKey="Critical" fill={severityColors.Critical} radius={[4, 4, 0, 0]} />
                                <Bar dataKey="High" fill={severityColors.High} radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Medium" fill={severityColors.Medium} radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Low" fill={severityColors.Low} radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Info" fill={severityColors.Info} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div>
                        <h4 className="text-md font-semibold mb-2 text-center">Top Critical Findings</h4>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Severity</TableHead>
                                    <TableHead>CWE</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {productKpiData.topCriticalFindings.length > 0 ? productKpiData.topCriticalFindings.map(f => (
                                    <TableRow key={f.id}>
                                        <TableCell className="font-medium truncate max-w-xs">{f.title}</TableCell>
                                        <TableCell><span className="text-destructive font-bold">{f.severity}</span></TableCell>
                                        <TableCell>{f.cwe}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center">No critical vulnerabilities found for this product.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

export default KpiDashboard;
