export type VehicleStatus = 'available' | 'assigned' | 'maintenance' | 'cleaning' | 'offline';
export type DriverStatus = 'available' | 'on_mission' | 'off_duty' | 'sick_leave';
export type MissionStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type FuelType = 'diesel' | 'petrol' | 'electric' | 'hybrid';
export type ContractType = 'cdi' | 'cdd' | 'interim';

export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  licensePlate: string;
  chassisNumber: string;
  fuelType: FuelType;
  capacity: number;
  status: VehicleStatus;
  currentMileage: number;
  acquisitionDate: string;
  purchaseValue: number;
  insuranceExpiry: string;
  technicalControlExpiry: string;
  lastMaintenanceDate?: string;
  nextMaintenanceKm?: number;
}

export interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  status: DriverStatus;
  contractType: ContractType;
  licenseType: string;
  licenseExpiry: string;
  hireDate: string;
  totalMissions: number;
  totalKm: number;
  avatar?: string;
}

export interface Mission {
  id: string;
  client?: string;
  serviceType: string;
  departure: string;
  destination: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string;
  actualEnd?: string;
  status: MissionStatus;
  vehicleId?: string;
  driverId?: string;
  startKm?: number;
  endKm?: number;
  notes?: string;
}

export interface MaintenanceOrder {
  id: string;
  vehicleId: string;
  type: 'preventive' | 'corrective';
  description: string;
  scheduledDate: string;
  completedDate?: string;
  cost?: number;
  parts?: string[];
  status: 'pending' | 'in_progress' | 'completed';
}

export interface DashboardStats {
  totalVehicles: number;
  availableVehicles: number;
  inMaintenance: number;
  totalDrivers: number;
  availableDrivers: number;
  activeMissions: number;
  completedMissionsToday: number;
  fleetUtilization: number;
  maintenanceAlerts: number;
  documentAlerts: number;
}
