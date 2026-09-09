export type DocumentType = "AADHAAR" | "VOTER_ID" | "PAN";
export type KycVerificationStatus = "VERIFIED" | "FAILED" | "PENDING";

export interface IKycRecord {
  _id: string;
  userId: string;
  documentType: DocumentType;
  documentNumberMasked: string;
  verifiedName: string;
  verificationStatus: KycVerificationStatus;
  verifiedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
