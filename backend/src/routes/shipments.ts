import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import {
  CreateShipmentSchema,
  UpdateStatusSchema,
  ListShipmentsQuerySchema,
  isValidTransition,
  ShipmentStatus,
  ALLOWED_TRANSITIONS,
} from '../validators/shipment';
import { Prisma } from '@prisma/client';

const router = Router();

// ─── POST /api/shipments ─────────────────────────────────────────────────────
// Create a new shipment and its initial status history record.
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = CreateShipmentSchema.parse(req.body);

    const shipment = await prisma.$transaction(async (tx) => {
      const newShipment = await tx.shipment.create({
        data: {
          referenceNumber: body.referenceNumber,
          origin: body.origin,
          destination: body.destination,
          currentStatus: body.currentStatus,
          expectedDeliveryDate: new Date(body.expectedDeliveryDate),
        },
      });

      await tx.shipmentStatusHistory.create({
        data: {
          shipmentId: newShipment.id,
          status: body.currentStatus,
          note: body.note ?? 'Shipment created',
        },
      });

      return newShipment;
    });

    const full = await prisma.shipment.findUnique({
      where: { id: shipment.id },
      include: { statusHistory: { orderBy: { changedAt: 'asc' } } },
    });

    res.status(201).json(full);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/shipments ──────────────────────────────────────────────────────
// List shipments with optional ?status=, ?q=, ?page=, ?limit=
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = ListShipmentsQuerySchema.parse(req.query);
    const { status, q, page, limit } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ShipmentWhereInput = {};

    if (status) {
      where.currentStatus = status;
    }

    if (q) {
      where.OR = [
        { referenceNumber: { contains: q, mode: 'insensitive' } },
        { origin: { contains: q, mode: 'insensitive' } },
        { destination: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, shipments] = await prisma.$transaction([
      prisma.shipment.count({ where }),
      prisma.shipment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          statusHistory: {
            orderBy: { changedAt: 'desc' },
            take: 1,
          },
        },
      }),
    ]);

    res.json({
      data: shipments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/shipments/:id ──────────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shipment = await prisma.shipment.findUnique({
      where: { id: req.params.id },
      include: {
        statusHistory: { orderBy: { changedAt: 'asc' } },
      },
    });

    if (!shipment) {
      throw new AppError(404, 'Shipment not found');
    }

    res.json(shipment);
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/shipments/:id/status ─────────────────────────────────────────
// Update status within a transaction. Validates the transition.
router.patch(
  '/:id/status',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = UpdateStatusSchema.parse(req.body);
      const { id } = req.params;

      const shipment = await prisma.shipment.findUnique({ where: { id } });
      if (!shipment) {
        throw new AppError(404, 'Shipment not found');
      }

      const currentStatus = shipment.currentStatus as ShipmentStatus;
      const newStatus = body.status as ShipmentStatus;

      if (currentStatus === newStatus) {
        throw new AppError(400, `Shipment is already in ${currentStatus} status`);
      }

      if (!isValidTransition(currentStatus, newStatus)) {
        const allowed = ALLOWED_TRANSITIONS[currentStatus];
        const allowedStr = allowed?.join(', ') ?? 'none (terminal state)';
        throw new AppError(
          422,
          `Cannot transition from ${currentStatus} to ${newStatus}. Allowed next statuses: ${allowedStr}`
        );
      }

      const updated = await prisma.$transaction(async (tx) => {
        const updatedShipment = await tx.shipment.update({
          where: { id },
          data: { currentStatus: newStatus },
        });

        await tx.shipmentStatusHistory.create({
          data: {
            shipmentId: id,
            status: newStatus,
            note: body.note,
          },
        });

        return updatedShipment;
      });

      const full = await prisma.shipment.findUnique({
        where: { id: updated.id },
        include: { statusHistory: { orderBy: { changedAt: 'asc' } } },
      });

      res.json(full);
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/shipments/:id/history ──────────────────────────────────────────
router.get(
  '/:id/history',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const shipment = await prisma.shipment.findUnique({
        where: { id: req.params.id },
      });

      if (!shipment) {
        throw new AppError(404, 'Shipment not found');
      }

      const history = await prisma.shipmentStatusHistory.findMany({
        where: { shipmentId: req.params.id },
        orderBy: { changedAt: 'asc' },
      });

      res.json(history);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
