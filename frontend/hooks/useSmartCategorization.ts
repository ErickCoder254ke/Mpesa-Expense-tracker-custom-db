import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '@/config/api';

const LAST_CATEGORIZATION_CHECK_KEY = 'lastCategorizationCheck';
const CATEGORIZATION_DISMISSED_KEY = 'categorizationDismissed';

interface FrequentTransaction {
  pattern: string;
  description_samples: string[];
  count: number;
  total_amount: number;
  avg_amount: number;
  category_id?: string;
  category_name?: string;
  transaction_ids: string[];
  confidence_score: number;
  suggested_category?: string;
  needs_attention: boolean;
}

interface CategorizationSuggestion {
  pattern: string;
  description_sample: string;
  count: number;
  total_amount: number;
  suggested_category?: string;
  confidence_score: number;
  transaction_ids: string[];
  priority: 'high' | 'medium' | 'low';
  potential_savings: string;
}

export const useSmartCategorization = () => {
  const [hasUncategorizedTransactions, setHasUncategorizedTransactions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestionCount, setSuggestionCount] = useState(0);

  const checkForUncategorizedTransactions = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Check if we should skip the check (user dismissed recently)
      const dismissedData = await AsyncStorage.getItem(CATEGORIZATION_DISMISSED_KEY);
      if (dismissedData) {
        const { dismissedAt, skipUntil } = JSON.parse(dismissedData);
        if (new Date().getTime() < skipUntil) {
          setHasUncategorizedTransactions(false);
          setSuggestionCount(0);
          return false;
        }
      }

      // Check last check time (don't check too frequently)
      const lastCheckData = await AsyncStorage.getItem(LAST_CATEGORIZATION_CHECK_KEY);
      if (lastCheckData) {
        const { timestamp } = JSON.parse(lastCheckData);
        const hoursSinceLastCheck = (new Date().getTime() - timestamp) / (1000 * 60 * 60);
        
        // Only check once per day
        if (hoursSinceLastCheck < 24) {
          return false;
        }
      }

      const response = await fetch(
        `${BACKEND_URL}/api/transactions/frequency-analysis?uncategorized_only=true&min_frequency=3`
      );

      if (response.ok) {
        const data = await response.json();
        const needsAttention = data.frequent_transactions.filter(
          (ft: FrequentTransaction) => ft.needs_attention
        );
        
        setHasUncategorizedTransactions(needsAttention.length > 0);
        setSuggestionCount(needsAttention.length);

        // Update last check time
        await AsyncStorage.setItem(
          LAST_CATEGORIZATION_CHECK_KEY,
          JSON.stringify({ timestamp: new Date().getTime() })
        );

        return needsAttention.length > 0;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking for uncategorized transactions:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getCategorizationSuggestions = useCallback(async (): Promise<CategorizationSuggestion[]> => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/transactions/categorization-suggestions?limit=10`);
      
      if (response.ok) {
        const data = await response.json();
        return data.suggestions || [];
      }
      
      return [];
    } catch (error) {
      console.error('Error getting categorization suggestions:', error);
      return [];
    }
  }, []);

  const markAsCompleted = useCallback(async () => {
    setHasUncategorizedTransactions(false);
    setSuggestionCount(0);
    
    // Update last check time to avoid immediate re-checking
    await AsyncStorage.setItem(
      LAST_CATEGORIZATION_CHECK_KEY,
      JSON.stringify({ timestamp: new Date().getTime() })
    );
  }, []);

  const dismissForPeriod = useCallback(async (hours: number = 24) => {
    setHasUncategorizedTransactions(false);
    setSuggestionCount(0);
    
    const skipUntil = new Date().getTime() + (hours * 60 * 60 * 1000);
    await AsyncStorage.setItem(
      CATEGORIZATION_DISMISSED_KEY,
      JSON.stringify({
        dismissedAt: new Date().getTime(),
        skipUntil
      })
    );
  }, []);

  const shouldShowSmartCategorization = useCallback(async (): Promise<boolean> => {
    // Check various conditions to determine if we should show the categorization prompt
    
    // Don't show if user is new (less than 10 transactions)
    try {
      const transactionsResponse = await fetch(`${BACKEND_URL}/api/transactions/?limit=10`);
      if (transactionsResponse.ok) {
        const transactions = await transactionsResponse.json();
        if (transactions.length < 10) {
          return false;
        }
      }
    } catch (error) {
      console.error('Error checking transaction count:', error);
    }

    // Check for uncategorized frequent transactions
    return await checkForUncategorizedTransactions();
  }, [checkForUncategorizedTransactions]);

  const getSmartInsights = useCallback(async () => {
    try {
      const [suggestionsResponse, frequentResponse] = await Promise.all([
        fetch(`${BACKEND_URL}/api/transactions/categorization-suggestions?limit=5`),
        fetch(`${BACKEND_URL}/api/transactions/frequency-analysis?uncategorized_only=false&min_frequency=2`)
      ]);

      const insights = {
        total_suggestions: 0,
        potential_time_saved: 0,
        most_common_uncategorized: null as string | null,
        categorization_accuracy: 0,
        recommendations: [] as string[]
      };

      if (suggestionsResponse.ok) {
        const suggestionsData = await suggestionsResponse.json();
        insights.total_suggestions = suggestionsData.summary?.total_suggestions || 0;
        insights.potential_time_saved = suggestionsData.suggestions?.reduce(
          (sum: number, s: any) => sum + s.count, 0
        ) || 0;
      }

      if (frequentResponse.ok) {
        const frequentData = await frequentResponse.json();
        const allPatterns = frequentData.frequent_transactions || [];
        
        // Calculate accuracy based on consistently categorized patterns
        const categorized = allPatterns.filter((p: any) => p.category_id && p.category_name !== 'Other');
        insights.categorization_accuracy = allPatterns.length > 0 
          ? Math.round((categorized.length / allPatterns.length) * 100) 
          : 0;

        // Find most common uncategorized pattern
        const uncategorized = allPatterns.filter((p: any) => !p.category_id || p.category_name === 'Other');
        if (uncategorized.length > 0) {
          const mostCommon = uncategorized.reduce((prev: any, current: any) => 
            (prev.count > current.count) ? prev : current
          );
          insights.most_common_uncategorized = mostCommon.description_samples?.[0] || mostCommon.pattern;
        }

        // Generate recommendations
        if (insights.categorization_accuracy < 70) {
          insights.recommendations.push('Improve budget accuracy by categorizing frequent transactions');
        }
        if (insights.total_suggestions > 5) {
          insights.recommendations.push('You have several transactions that could benefit from categorization');
        }
        if (insights.potential_time_saved > 20) {
          insights.recommendations.push(`Categorizing now could save time on ${insights.potential_time_saved} future transactions`);
        }
      }

      return insights;
    } catch (error) {
      console.error('Error getting smart insights:', error);
      return {
        total_suggestions: 0,
        potential_time_saved: 0,
        most_common_uncategorized: null,
        categorization_accuracy: 0,
        recommendations: []
      };
    }
  }, []);

  return {
    hasUncategorizedTransactions,
    isLoading,
    suggestionCount,
    checkForUncategorizedTransactions,
    getCategorizationSuggestions,
    markAsCompleted,
    dismissForPeriod,
    shouldShowSmartCategorization,
    getSmartInsights,
  };
};
