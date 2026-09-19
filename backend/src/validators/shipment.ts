import { z } from 'zod';

export const ShipmentStatusEnum = z.enum([
  'BOOKED',
  'IN_TRANSIT',
  'CUSTOMS_HOLD',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
]);

export type ShipmentStatus = z.infer<typeof ShipmentStatusEnum>;

// ─── Allowed status transitions ──────────────────────────────────────────────
// Terminal states: DELIVERED and CANCELLED — no further transitions allowed.
export const ALLOWED_TRANSITIONS: Partial<Record<ShipmentStatus, ShipmentStatus[]>> = {
  BOOKED: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['CUSTOMS_HOLD', 'OUT_FOR_DELIVERY', 'CANCELLED'],
  CUSTOMS_HOLD: ['IN_TRANSIT', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  // DELIVERED and CANCELLED are terminal — no outgoing transitions
};

export function isValidTransition(from: ShipmentStatus, to: ShipmentStatus): boolean {
  const allowed = ALLOWED_TRANSITIONS[from];
  return Array.isArray(allowed) && allowed.includes(to);
}

// ─── Zod Schemas ─────────────────────────────────────────────────────────────
export const CreateShipmentSchema = z.object({
  referenceNumber: z
    .string()
    .min(1, 'Reference number is required')
    .max(50, 'Reference number must be 50 characters or fewer')
    .regex(/^[A-Za-z0-9_-]+$/, 'Reference number may only contain letters, digits, hyphens and underscores'),
  origin: z.string().min(1, 'Origin is required').max(100),
  destination: z.string().min(1, 'Destination is required').max(100),
  currentStatus: ShipmentStatusEnum.default('BOOKED'),
  expectedDeliveryDate: z
    .string()
    .refine((v) => !isNaN(Date.parse(v)), { message: 'expectedDeliveryDate must be a valid ISO date string' }),
  note: z.string().max(500).optional(),
});

export const UpdateStatusSchema = z.object({
  status: ShipmentStatusEnum,
  note: z.string().max(500).optional(),
});

export const ListShipmentsQuerySchema = z.object({
  status: ShipmentStatusEnum.optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
