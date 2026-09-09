export type MerchantStatus = "ACTIVE" | "INACTIVE";

export interface IMerchant {
  _id: string;
  name: string;
  upiId: string;
  category: string;
  avatar?: string;
  status: MerchantStatus;
  createdAt: Date;
  updatedAt: Date;
}
