
export enum Department {
  OPD = 'OPD',
  EMERGENCY = 'EMERGENCY'
}

export enum Gender {
  MALE = 'Male',
  FEMALE = 'Female',
  OTHER = 'Other'
}

export enum MaritalStatus {
  SINGLE = 'Single',
  MARRIED = 'Married',
  DIVORCED = 'Divorced',
  WIDOWED = 'Widowed'
}

export type PaymentStatus = 'Paid' | 'Not Paid';

export interface PatientRecord {
  id: string;
  tokenNumber: string;
  name: string;
  contactNumber: string;
  age: string;
  gender: Gender;
  maritalStatus: MaritalStatus;
  department: Department;
  reasonForVisit: string;
  timestamp: string;
  paymentStatus: PaymentStatus;
  triageNote?: string;
  triagePriority?: 'Low' | 'Medium' | 'High';
  needsUltrasound?: boolean;
}

export interface TriageResult {
  department: Department;
  priority: 'Low' | 'Medium' | 'High';
  note: string;
}
