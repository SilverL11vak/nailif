// Mock data for services - would come from API in production
import type { Service, TimeSlot } from './booking-types';

export const mockServices: Service[] = [
  {
    id: 'gel-manicure',
    name: 'Gel Manicure',
    duration: 45,
    price: 35,
    description: 'Long-lasting glossy finish',
    isPopular: true,
    category: 'manicure',
  },
  {
    id: 'acrylic-extensions',
    name: 'Acrylic Extensions',
    duration: 90,
    price: 65,
    description: 'Durable length & strength',
    isPopular: true,
    category: 'extensions',
  },
  {
    id: 'luxury-spa-manicure',
    name: 'Luxury Spa Manicure',
    duration: 60,
    price: 55,
    description: 'Ultimate pampering experience',
    isPopular: false,
    category: 'manicure',
  },
  {
    id: 'gel-pedicure',
    name: 'Gel Pedicure',
    duration: 50,
    price: 40,
    description: 'Perfect for feet',
    isPopular: true,
    category: 'pedicure',
  },
  {
    id: 'nail-art',
    name: 'Nail Art',
    duration: 30,
    price: 25,
    description: 'Custom designs',
    isPopular: false,
    category: 'nail-art',
  },
];

export const mockSlots: TimeSlot[] = [
  // Today
  {
    id: 'today-1430',
    time: '14:30',
    date: '2026-03-15',
    available: true,
    count: 3,
    isPopular: true,
    isFastest: false,
  },
  {
    id: 'today-1630',
    time: '16:30',
    date: '2026-03-15',
    available: true,
    count: 1,
    isPopular: false,
    isFastest: true,
  },
  // Tomorrow
  {
    id: 'tomorrow-1030',
    time: '10:30',
    date: '2026-03-16',
    available: true,
    count: 5,
    isPopular: false,
    isFastest: false,
  },
  {
    id: 'tomorrow-1430',
    time: '14:30',
    date: '2026-03-16',
    available: true,
    count: 4,
    isPopular: true,
    isFastest: false,
  },
  {
    id: 'tomorrow-1630',
    time: '16:30',
    date: '2026-03-16',
    available: false,
    count: 0,
    isPopular: false,
    isFastest: false,
  },
];

// Generate slots for a given date
export function generateSlotsForDate(date: Date): TimeSlot[] {
  const dateStr = date.toISOString().split('T')[0];
  const times = ['09:00', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'];
  
  return times.map((time) => ({
    id: `${dateStr}-${time.replace(':', '')}`,
    time,
    date: dateStr,
    available: Math.random() > 0.3, // 70% availability
    count: Math.floor(Math.random() * 5) + 1,
    isPopular: time === '10:30' || time === '14:30',
    isFastest: time === '14:30' || time === '16:00',
  }));
}

// Get next available slot
export function getNextAvailableSlot(slots: TimeSlot[]): TimeSlot | null {
  const available = slots.filter((s) => s.available);
  if (available.length === 0) return null;
  
  // Sort by time
  available.sort((a, b) => a.time.localeCompare(b.time));
  
  // Return the earliest one
  return available[0];
}

// Get popular slots
export function getPopularSlots(slots: TimeSlot[]): TimeSlot[] {
  return slots.filter((s) => s.available && s.isPopular);
}

// Get limited slots (few left)
export function getLimitedSlots(slots: TimeSlot[]): TimeSlot[] {
  return slots.filter((s) => s.available && s.count && s.count <= 2);
}
