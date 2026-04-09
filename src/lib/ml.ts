import { Apriori } from 'node-apriori';

/**
 * Runs the Apriori algorithm on a list of transactions to find frequent itemsets and association rules.
 * @param transactions Array of transactions, where each transaction is an array of item strings.
 * @param support Minimum support threshold (e.g., 0.1 for 10% occurrence).
 * @returns Array of frequent itemsets and inferred suggestions.
 */
export async function getFrequentItemsets(transactions: string[][], support: number = 0.1) {
  // node-apriori takes an array of primitive types, e.g. numbers or strings.
  const apriori = new Apriori<string>(support);

  return new Promise((resolve, reject) => {
    apriori.exec(transactions)
      .then(result => resolve(result))
      .catch(err => reject(err));
  });
}

/**
 * Basic recommendation logic based on frequent itemsets.
 * Finds itemsets that contain all given items in 'currentCart',
 * and returns the remaining items from those itemsets.
 */
export function getRecommendations(frequentItemsets: any, currentCart: string[]): { item: string, confidence: number }[] {
  const recommendations: Record<string, number> = {};

  for (const itemsetObj of frequentItemsets.itemsets) {
    const itemset = itemsetObj.items;
    // Check if the currentCart is a subset of this itemset
    const isSubset = currentCart.every(cartItem => itemset.includes(cartItem));
    
    if (isSubset && itemset.length > currentCart.length) {
      // Suggest items that are in the itemset but not in the cart
      const suggestions = itemset.filter((item: string) => !currentCart.includes(item));
      for (const item of suggestions) {
        if (!recommendations[item] || recommendations[item] < itemsetObj.support) {
          recommendations[item] = itemsetObj.support;
        }
      }
    }
  }

  // Convert to array and sort by confidence
  return Object.entries(recommendations)
    .map(([item, confidence]) => ({ item, confidence }))
    .sort((a, b) => b.confidence - a.confidence);
}
