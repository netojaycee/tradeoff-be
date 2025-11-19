export enum ProductStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  ACTIVE = 'active',
  SOLD = 'sold',
  REMOVED = 'removed',
  SUSPENDED = 'suspended',
}

export enum ProductCondition {
  // New: Practically new — no signs of wear, damage, or wash. Looks fresh out of the box.
  NEW = 'new',
  // Almost New: Lightly worn with small, barely noticeable flaws.
  ALMOST_NEW = 'almost_new',
  // Used: Used but well-kept; may have small signs of wear that don't affect use.
  USED = 'used',
  // Worn: Clearly used with visible wear or slight repairs needed.
  WORN = 'worn',
}

export enum AuthenticationStatus {
  PENDING = 'pending',
  AUTHENTICATED = 'authenticated',
  REJECTED = 'rejected',
  NOT_REQUIRED = 'not_required',
}

export enum ProductCategory {
  CLOTHING = 'clothing',
  SHOES = 'shoes',
  BAGS = 'bags',
  ACCESSORIES = 'accessories',
  JEWELRY = 'jewelry',
  WATCHES = 'watches',
}

export enum Gender {
  WOMEN = 'women',
  MEN = 'men',
}
