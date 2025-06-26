'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getKpiData } from '@/app/actions';
import type { KpiData } from '@/ai/flows/get-kpi-data';

export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

interface DataContextType {
  kpiData: KpiData | null;
  productList: string[];
  isLoading: boolean;
  refreshData: () => void;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [kpiData, setKpiData] = useState<KpiData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);

  const fetchData = async () => {
    if (!isLoading) setIsLoading(true);
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
    // This check prevents re-fetching on every page navigation.
    if (!kpiData) {
      fetchData();
    }
  }, []); // Empty dependency array ensures this runs only once on initial mount

  const productList = kpiData?.productList.filter((p) => !!p) || [];

  const value = {
    kpiData,
    productList,
    isLoading,
    refreshData: fetchData,
    messages,
    setMessages,
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
