export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  keywords?: string[];
  is_default?: boolean;
}

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: "food_dining",
    name: "Food & Dining",
    icon: "restaurant",
    color: "#FF6B6B",
    keywords: ["restaurant", "food", "dining", "lunch", "dinner", "breakfast", "cafe", "hotel"],
    is_default: true
  },
  {
    id: "transport",
    name: "Transport",
    icon: "car",
    color: "#4ECDC4",
    keywords: ["uber", "taxi", "matatu", "fuel", "parking", "transport", "travel", "bus"],
    is_default: true
  },
  {
    id: "utilities",
    name: "Utilities",
    icon: "flash",
    color: "#45B7D1",
    keywords: ["kplc", "electricity", "water", "internet", "safaricom", "airtel", "telkom"],
    is_default: true
  },
  {
    id: "shopping",
    name: "Shopping",
    icon: "shopping-bag",
    color: "#96CEB4",
    keywords: ["shop", "store", "market", "buy", "purchase", "retail"],
    is_default: true
  },
  {
    id: "entertainment",
    name: "Entertainment",
    icon: "music-note",
    color: "#FFEAA7",
    keywords: ["movie", "cinema", "game", "entertainment", "fun", "sport"],
    is_default: true
  },
  {
    id: "health",
    name: "Health",
    icon: "medical",
    color: "#FD79A8",
    keywords: ["hospital", "clinic", "pharmacy", "doctor", "medical", "health"],
    is_default: true
  },
  {
    id: "education",
    name: "Education",
    icon: "school",
    color: "#6C5CE7",
    keywords: ["school", "education", "course", "training", "tuition", "books"],
    is_default: true
  },
  {
    id: "bills_fees",
    name: "Bills & Fees",
    icon: "receipt",
    color: "#A29BFE",
    keywords: ["bill", "fee", "charge", "service", "maintenance", "subscription"],
    is_default: true
  },
  {
    id: "other",
    name: "Other",
    icon: "ellipsis-horizontal",
    color: "#636E72",
    keywords: [],
    is_default: true
  }
];
