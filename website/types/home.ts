export type PersonaType = 'rider' | 'restaurant' | 'customer';

export type ServiceStatus = 'LIVE NOW' | 'COMING NEXT' | 'FUTURE PHASE';

export interface ServiceItem {
  id: string;
  code: string;
  name: string;
  description: string;
  status: ServiceStatus;
  statusType: 'live' | 'planned';
  metric: string;
  metricLabel: string;
  accent: 'blue' | 'red' | 'tan' | 'line';
}

export interface RegistrationFormData {
  persona: PersonaType;
  fullName: string;
  businessName?: string;
  email: string;
  phone: string;
  countryCode: string;
  city: string;
  vehicleType?: string;
  cuisineType?: string;
  outletCount?: string;
  agreedToTerms: boolean;
}
