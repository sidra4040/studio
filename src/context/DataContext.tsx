'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getKpiData } from '@/app/actions';
import type { KpiData } from '@/ai/flows/get-kpi-data';

interface DataContextType {
  kpiData: KpiData | null;
  productList: string[];
  isLoading: boolean;
  refreshData: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [kpiData, setKpiData] = useState<KpiData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await getKpiData();
      setKpiData(data);
    } catch (error) {
      console.error("Failed to fetch initial KPI data", error);
      // Set to a default error state so consumers know something went wrong
      setKpiData({
        vulnerabilitiesBySeverity: [],
        openVsClosed: [],
        topVulnerableProducts: [],
        productList: [],
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch if data is not already loaded.
    if (!kpiData) {
      fetchData();
    }
  }, [kpiData]);

  const productList = kpiData?.productList.filter((p) => !!p) || [];

  const value = {
    kpiData,
    productList,
    isLoading,
    refreshData: fetchData,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
