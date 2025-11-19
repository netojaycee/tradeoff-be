export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification',
}

export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

export enum SellerStatus {
  NOT_SELLER = 'not_seller',
  PENDING_VERIFICATION = 'pending_verification',
  VERIFIED_SELLER = 'verified_seller',
  SUSPENDED_SELLER = 'suspended_seller',
}
