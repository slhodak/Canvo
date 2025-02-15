export enum TransactionType {
  Purchase = 'purchase',
  Spend = 'spend',
  Bonus = 'bonus',
}

export interface TokenTransaction {
  id: string;
  userId: string;
  amount: number;
  type: TransactionType;
  description: string;
  createdAt: Date;
}

export interface TokenBalance {
  userId: string;
  balance: number;
}
