// lib/mock-data.ts
// Replace this with real API/DB calls when ready — the dashboard page
// only depends on the shapes exported below, so swapping the internals
// later won't require touching the page.

export type VehicleStatus =
  | "Pending"
  | "Shipped"
  | "In Transit"
  | "Arrived"
  | "Delayed"
  | "Customs Hold";

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  chassisNumber: string;
  containerNumber: string;
  destination: string;
  destinationCountry: string;
  originPort: string;
  status: VehicleStatus;
  createdAt: string; // ISO date
}

// --- Seed data -------------------------------------------------------

const DESTINATIONS = [
  "Mombasa",
  "Lagos",
  "Dar es Salaam",
  "Jeddah",
  "Dubai",
  "Colombo",
  "Karachi",
  "Accra",
];

const DESTINATION_COUNTRIES: Record<string, string> = {
  Mombasa: "Kenya",
  Lagos: "Nigeria",
  "Dar es Salaam": "Tanzania",
  Jeddah: "Saudi Arabia",
  Dubai: "United Arab Emirates",
  Colombo: "Sri Lanka",
  Karachi: "Pakistan",
  Accra: "Ghana",
};

const STATUSES: VehicleStatus[] = [
  "Pending",
  "Shipped",
  "In Transit",
  "Arrived",
  "Delayed",
  "Customs Hold",
];

// Exported alias — the Add Vehicle form imports this name directly.
export const SHIPMENT_STATUSES = STATUSES;

const ORIGIN_PORTS = [
  "Yokohama, Japan",
  "Nagoya, Japan",
  "Osaka, Japan",
  "Singapore",
  "Southampton, UK",
];

function seedVehicles(count: number): Vehicle[] {
  const makes = ["Toyota", "Honda", "Nissan", "Mazda", "Ford", "BMW"];
  const models = ["Corolla", "Civic", "X-Trail", "CX-5", "F-150", "3 Series"];

  return Array.from({ length: count }, (_, i) => {
    const status = STATUSES[i % STATUSES.length];
    const destination = DESTINATIONS[i % DESTINATIONS.length];
    const monthOffset = i % 6;
    const date = new Date();
    date.setMonth(date.getMonth() - monthOffset);

    return {
      id: `VH-${1000 + i}`,
      make: makes[i % makes.length],
      model: models[i % models.length],
      year: 2018 + (i % 7),
      chassisNumber: `${makes[i % makes.length].slice(0, 2).toUpperCase()}${100000 + i}X`,
      containerNumber: `MSKU${2000000 + i}`,
      destination,
      destinationCountry: DESTINATION_COUNTRIES[destination],
      originPort: ORIGIN_PORTS[i % ORIGIN_PORTS.length],
      status,
      createdAt: date.toISOString(),
    };
  });
}

const vehicles = seedVehicles(128);

// Exported for pages that need the raw list (e.g. the vehicles table).
export { vehicles };

// --- Derived data used by the dashboard -------------------------------

export function dashboardMetrics() {
  const total = vehicles.length;
  const pending = vehicles.filter((v) => v.status === "Pending").length;
  const shipped = vehicles.filter((v) => v.status === "Shipped").length;
  const inTransit = vehicles.filter((v) => v.status === "In Transit").length;
  const arrived = vehicles.filter((v) => v.status === "Arrived").length;
  const delayed = vehicles.filter(
    (v) => v.status === "Delayed" || v.status === "Customs Hold"
  ).length;

  return { total, pending, shipped, inTransit, arrived, delayed };
}

export const monthlyTrends = [
  { month: "Feb", shipped: 18, arrived: 14 },
  { month: "Mar", shipped: 22, arrived: 19 },
  { month: "Apr", shipped: 20, arrived: 21 },
  { month: "May", shipped: 27, arrived: 23 },
  { month: "Jun", shipped: 31, arrived: 26 },
  { month: "Jul", shipped: 29, arrived: 30 },
];

export function statusDistribution() {
  return STATUSES.map((name) => ({
    name,
    value: vehicles.filter((v) => v.status === name).length,
  }));
}

export function destinationBreakdown() {
  return DESTINATIONS.map((name) => ({
    name,
    value: vehicles.filter((v) => v.destination === name).length,
  })).sort((a, b) => b.value - a.value);
}

export interface ActivityItem {
  id: string;
  user: string;
  action: string;
  target: string;
  time: string;
}

export const recentActivity: ActivityItem[] = [
  { id: "a1", user: "Sarah Kim", action: "marked", target: "VH-1004 as Arrived", time: "5m ago" },
  { id: "a2", user: "James Otieno", action: "created a shipment for", target: "VH-1041", time: "22m ago" },
  { id: "a3", user: "Priya Nair", action: "uploaded a document to", target: "VH-1012", time: "1h ago" },
  { id: "a4", user: "David Chen", action: "updated the ETA for", target: "VH-1027", time: "3h ago" },
  { id: "a5", user: "Amara Obi", action: "flagged", target: "VH-1033 for customs review", time: "5h ago" },
];

export interface NotificationItem {
  id: string;
  category: "Document" | "Shipment" | "Delay";
  title: string;
  message: string;
  time: string;
}

export const notifications: NotificationItem[] = [
  {
    id: "n1",
    category: "Document",
    title: "Missing Bill of Lading",
    message: "VH-1012 is missing a Bill of Lading before departure.",
    time: "10m ago",
  },
  {
    id: "n2",
    category: "Shipment",
    title: "Shipment Departed",
    message: "VH-1041 has departed the port of Mombasa.",
    time: "45m ago",
  },
  {
    id: "n3",
    category: "Delay",
    title: "Vehicle Delayed",
    message: "VH-1033 is delayed pending customs clearance.",
    time: "2h ago",
  },
  {
    id: "n4",
    category: "Document",
    title: "Title Expiring Soon",
    message: "Title document for VH-1027 expires in 5 days.",
    time: "6h ago",
  },
];