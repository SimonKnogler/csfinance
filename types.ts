
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum Category {
  FOOD = 'Food & Dining',
  TRANSPORT = 'Transportation',
  HOUSING = 'Housing',
  ENTERTAINMENT = 'Entertainment',
  SHOPPING = 'Shopping',
  UTILITIES = 'Utilities',
  HEALTH = 'Health & Fitness',
  INCOME = 'Salary & Income',
  INVESTMENT = 'Investments',
  MISC = 'Miscellaneous',
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: TransactionType;
  category: Category | string;
  description: string;
  merchant?: string;
}

export interface FinancialInsight {
  summary: string;
  actionableTips: string[];
  predictedNextMonthSpending: number;
  anomalyDetected: boolean;
}

export interface ChartDataPoint {
  name: string;
  value: number;
}

export interface User {
  username: string;
  password: string; // In a real app, this would be hashed
  name: string;
}

export interface CloudConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

// --- PORTFOLIO TYPES ---

export enum PortfolioOwner {
  ME = 'Me',
  CAROLINA = 'Carolina',
  JOINT = 'Joint',
}

export enum AssetType {
  STOCK = 'Stock',
  ETF = 'ETF',
  CRYPTO = 'Crypto',
  CASH = 'Cash',
}

export interface CashHolding {
  id: string;
  name: string;
  amount: number;
  currency: string;
  owner: PortfolioOwner;
}

export interface StockHolding {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  avgCost: number; // Cost basis per share
  currentPrice: number;
  owner: PortfolioOwner;
  dayChangePercent: number;
  type: AssetType;
}

export enum TimeRange {
  DAY = '1D',
  WEEK = '1W',
  MONTH = '1M',
  SIX_MONTHS = '6M',
  YEAR = '1Y',
  ALL = 'ALL',
}

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  time: string;
  relatedTickers: string[];
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  imageUrl?: string;
  url: string;
}

export interface PortfolioDocument {
  id: string;
  name: string;
  type: string; // e.g., 'PDF', 'IMG'
  date: string;
  size: string;
  category: 'Tax' | 'Contract' | 'Statement' | 'Other';
  data?: string; // Base64 data string for in-memory storage
}