'use client';

import React, { useState, useEffect } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell, Legend, Tooltip as RechartsTooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { getKpiData, getProductKpiData, type KpiData, type ProductKpiData } from '@/app/actions';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';


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

    const [selectedProduct, setSelectedProduct] = useState<string>('');
    const [productData, setProductData] = useState<ProductKpiData | null>(null);
    const [isProductDataLoading, setIsProductDataLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const data = await getKpiData();
                setKpiData(data);
            } catch (error) {
                console.error("Failed to fetch KPI data", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleProductSelect = async (productName: string) => {
        if (!productName) {
            setSelectedProduct('');
            setProductData(null);
            return;
        }
        setSelectedProduct(productName);
        setIsProductDataLoading(true);
        setProductData(null); // Clear previous data
        try {
            const data = await getProductKpiData({ productName });
            setProductData(data);
        } catch (error) {
            console.error(`Failed to fetch data for ${productName}`, error);
        } finally {
            setIsProductDataLoading(false);
        }
    };

    if (isLoading || !kpiData) {
        return <KpiSkeleton />;
    }
  
    const productSeverityData = productData ? 
        Object.entries(productData.severityDistribution).map(([severity, count]) => ({ severity, count })) 
        : [];

  return (
    <div className="grid grid-cols-1 gap-6">
        <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
            <Card className="lg:col-span-2 animate-in fade-in slide-in-from-bottom-4" style={{animationDelay: '100ms', animationFillMode: 'backwards'}}>
                <CardHeader>
                <CardTitle>Vulnerabilities by Severity</CardTitle>
                <CardDescription>A breakdown of all findings by severity level across all products.</CardDescription>
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

        <Card className="lg:col-span-3 animate-in fade-in slide-in-from-bottom-4" style={{animationDelay: '400ms', animationFillMode: 'backwards'}}>
            <CardHeader>
                <CardTitle>Product Deep Dive</CardTitle>
                <CardDescription>Select a product to see its severity distribution and top critical vulnerabilities.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <Select onValueChange={handleProductSelect} defaultValue="">
                    <SelectTrigger className="w-full md:w-1/3">
                        <SelectValue placeholder="Select a product..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="">-- Select a Product --</SelectItem>
                        {kpiData.productList.map(product => (
                            <SelectItem key={product} value={product}>{product}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {isProductDataLoading && (
                    <div className="grid gap-6 md:grid-cols-2">
                        <Skeleton className="h-[350px] w-full" />
                        <Skeleton className="h-[350px] w-full" />
                    </div>
                )}

                {!isProductDataLoading && productData && selectedProduct && (
                    <div className="grid gap-6 md:grid-cols-2">
                        <div>
                            <h3 className="font-semibold mb-4 text-center">Severity Distribution for {selectedProduct}</h3>
                             <ChartContainer config={chartConfigBySeverity} className="h-[300px] w-full">
                                <BarChart data={productSeverityData} accessibilityLayer>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="severity" tickLine={false} tickMargin={10} axisLine={false} />
                                    <YAxis />
                                    <RechartsTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                                    <Bar dataKey="count" radius={4}>
                                        {productSeverityData.map((entry) => (
                                            <Cell key={`cell-${entry.severity}`} fill={chartConfigBySeverity[entry.severity as keyof typeof chartConfigBySeverity]?.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ChartContainer>
                        </div>
                        <div>
                            <h3 className="font-semibold mb-4 text-center">Top 5 Critical Vulnerabilities</h3>
                            <div className="border rounded-lg">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Title</TableHead>
                                            <TableHead>Severity</TableHead>
                                            <TableHead className="text-right">CVSS</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {productData.topCriticalVulnerabilities.map(vuln => (
                                            <TableRow key={vuln.id}>
                                                <TableCell className="font-medium max-w-xs truncate">{vuln.title}</TableCell>
                                                <TableCell>
                                                    <Badge variant={vuln.severity === 'Critical' ? 'destructive' : 'secondary'}>
                                                        {vuln.severity}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">{vuln.cvssv3_score || 'N/A'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {productData.topCriticalVulnerabilities.length === 0 && (
                                    <p className="p-6 text-center text-muted-foreground">No critical vulnerabilities found for {selectedProduct}.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
  );
}
