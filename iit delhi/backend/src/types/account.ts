export type AccountStatus = "ACTIVE" | "FROZEN";

export interface IAccount {
  _id: string;
  userId: string;
  accountNumberMasked: string;
  balance: number;
  currency: string;
  status: AccountStatus;
  createdAt: Date;
  updatedAt: Date;
}
