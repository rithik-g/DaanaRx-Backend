// User and Clinic types
export interface User {
  userId: string;
  username: string;
  password?: string;
  email: string;
  clinicId: string;
  activeClinicId?: string;
  userRole: 'superadmin' | 'admin' | 'employee';
  createdAt: Date;
  updatedAt: Date;
}

export interface Clinic {
  clinicId: string;
  name: string;
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  userRole?: string;
  joinedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResponse {
  token: string;
  user: User;
  clinic: Clinic;
}

// GraphQL Context
export interface GraphQLContext {
  user?: User;
  clinic?: Clinic;
  token?: string;
}

export interface JWTPayload {
  userId: string;
  clinicId: string;
  userRole: string;
}

// Location and Lot types
export interface Location {
  locationId: string;
  name: string;
  temp: 'fridge' | 'room_temp';
  clinicId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Lot {
  lotId: string;
  source: string;
  note?: string;
  dateCreated: Date;
  locationId: string;
  clinicId: string;
  maxCapacity?: number;
  currentCapacity?: number;
  availableCapacity?: number;
  location?: Location;
}

// Drug types
export interface Drug {
  drugId: string;
  medicationName: string;
  genericName: string;
  strength: number;
  strengthUnit: string;
  ndcId: string;
  form: string;
}

export interface DrugSearchResult extends Drug {
  inInventory?: boolean;
}

// Unit types
export interface Unit {
  unitId: string;
  totalQuantity: number;
  availableQuantity: number;
  patientReferenceId?: string;
  lotId: string;
  expiryDate: Date;
  dateCreated: Date;
  userId: string;
  drugId: string;
  qrCode?: string;
  optionalNotes?: string;
  manufacturerLotNumber?: string;
  clinicId: string;
  drug?: Drug;
  lot?: Lot;
  user?: User;
}

// Transaction types
export interface Transaction {
  transactionId: string;
  timestamp: Date;
  type: 'adjust' | 'check_out' | 'check_in';
  quantity: number;
  unitId: string;
  patientName?: string;
  patientReferenceId?: string;
  userId: string;
  notes?: string;
  clinicId: string;
  unit?: Unit;
  user?: User;
}

// Invitation types
export interface Invitation {
  invitationId: string;
  email: string;
  clinicId: string;
  invitedBy: string;
  userRole: string;
  status: 'invited' | 'accepted' | 'expired';
  invitationToken: string;
  createdAt: Date;
  expiresAt: Date;
  acceptedAt?: Date;
  clinic?: Clinic;
  invitedByUser?: Pick<User, 'userId' | 'username' | 'email'>;
}

// Feedback types
export interface Feedback {
  feedbackId: string;
  clinicId: string;
  userId: string;
  feedbackType: 'Feature_Request' | 'Bug' | 'Other';
  feedbackMessage: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFeedbackRequest {
  feedbackType: 'Feature_Request' | 'Bug' | 'Other';
  feedbackMessage: string;
}

// Unit Request types
export interface CreateUnitRequest {
  totalQuantity: number;
  availableQuantity: number;
  lotId: string;
  expiryDate: Date | string;
  drugId?: string;
  drugData?: {
    medicationName: string;
    genericName: string;
    strength: number;
    strengthUnit: string;
    ndcId: string;
    form: string;
  };
  patientReferenceId?: string;
  optionalNotes?: string;
  manufacturerLotNumber?: string;
}

// Transaction Request types
export interface CheckOutRequest {
  unitId: string;
  quantity: number;
  patientName?: string;
  patientReferenceId?: string;
  notes?: string;
}

