import {
  InventoryTransactionType,
  Medicine,
  PriceChannel,
  Prisma,
  PrismaClient,
  StockStatus,
} from '@prisma/client';

type PrismaLike = PrismaClient | Prisma.TransactionClient;

type UnitConvertibleMedicine = {
  name?: string;
  unit: string;
  unitConversions?: Array<{
    fromUnit: string;
    toUnit: string;
    conversionRate: number;
  }>;
};

type InventoryLotWithRelations = Prisma.InventoryLotGetPayload<{
  include: {
    branch: true;
    medicine: {
      include: {
        unitConversions: true;
        priceHistories: true;
      };
    };
    inventoryTransactions: true;
  };
}>;

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  QUARANTINE: 'Chờ kiểm tra',
  AVAILABLE: 'Được phép bán',
  RESERVED: 'Đã giữ hàng',
  IN_TRANSIT: 'Đang chuyển',
  BLOCKED: 'Bị khóa',
  RECALLED: 'Thu hồi',
  EXPIRED: 'Hết hạn',
  DAMAGED: 'Hư hỏng',
  DESTROYED: 'Đã hủy',
  RETURNED_SUPPLIER: 'Trả nhà cung cấp',
};

const STOCK_STATUSES: StockStatus[] = [
  StockStatus.QUARANTINE,
  StockStatus.AVAILABLE,
  StockStatus.RESERVED,
  StockStatus.IN_TRANSIT,
  StockStatus.BLOCKED,
  StockStatus.RECALLED,
  StockStatus.EXPIRED,
  StockStatus.DAMAGED,
  StockStatus.DESTROYED,
  StockStatus.RETURNED_SUPPLIER,
];

const ON_HAND_STATUSES = new Set<StockStatus>([
  StockStatus.QUARANTINE,
  StockStatus.AVAILABLE,
  StockStatus.RESERVED,
  StockStatus.IN_TRANSIT,
  StockStatus.BLOCKED,
  StockStatus.RECALLED,
  StockStatus.EXPIRED,
  StockStatus.DAMAGED,
]);

function formatDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function resolveCurrentSellPrice(
  medicine: Medicine & { priceHistories?: Array<{ branchId: string | null; channel: PriceChannel; price: number; effectiveFrom: string; effectiveTo: string | null }> },
  branchId: string,
  channel: PriceChannel = PriceChannel.POS
) {
  const today = formatDateOnly(new Date());
  const activePrices = (medicine.priceHistories || [])
    .filter((price) => price.channel === channel)
    .filter((price) => price.effectiveFrom <= today)
    .filter((price) => !price.effectiveTo || price.effectiveTo >= today)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));

  const branchPrice = activePrices.find((price) => price.branchId === branchId);
  if (branchPrice) {
    return branchPrice.price;
  }

  const chainWidePrice = activePrices.find((price) => price.branchId === null);
  return chainWidePrice?.price ?? medicine.sellPrice;
}

function buildStatusTotals(transactions: Array<{ stockStatus: StockStatus; quantity: number }>) {
  const totals: Record<StockStatus, number> = STOCK_STATUSES.reduce((acc, status) => {
    acc[status] = 0;
    return acc;
  }, {} as Record<StockStatus, number>);

  transactions.forEach((transaction) => {
    totals[transaction.stockStatus] += transaction.quantity;
  });

  return totals;
}

function clampPositive(value: number) {
  return value > 0 ? value : 0;
}

function normalizeIntegerQuantity(value: number) {
  if (!Number.isFinite(value)) {
    throw new Error('So luong quy doi khong hop le.');
  }

  const rounded = Math.round(value);
  if (Math.abs(rounded - value) > 1e-9) {
    throw new Error('So luong quy doi phai ra so nguyen theo don vi co so.');
  }

  return rounded;
}

export function resolveConversionFactorToBaseUnit(
  medicine: UnitConvertibleMedicine,
  transactionUnit: string
): number | null {
  if (!transactionUnit) {
    return null;
  }

  if (transactionUnit === medicine.unit) {
    return 1;
  }

  const conversions = medicine.unitConversions || [];
  const queue: Array<{ unit: string; factor: number }> = [{ unit: transactionUnit, factor: 1 }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current.unit)) {
      continue;
    }

    visited.add(current.unit);

    const nextConversions = conversions.filter((conversion) => conversion.fromUnit === current.unit);
    for (const conversion of nextConversions) {
      const nextFactor = current.factor * conversion.conversionRate;
      if (conversion.toUnit === medicine.unit) {
        return nextFactor;
      }

      if (!visited.has(conversion.toUnit)) {
        queue.push({
          unit: conversion.toUnit,
          factor: nextFactor,
        });
      }
    }
  }

  return null;
}

export function convertToBaseQuantity(
  medicine: UnitConvertibleMedicine,
  transactionUnit: string,
  transactionQuantity: number
) {
  if (!Number.isFinite(transactionQuantity) || transactionQuantity <= 0) {
    throw new Error('So luong giao dich phai lon hon 0.');
  }

  const conversionFactor = resolveConversionFactorToBaseUnit(medicine, transactionUnit);
  if (!conversionFactor) {
    throw new Error(
      `Khong tim thay ty le quy doi tu ${transactionUnit} ve ${medicine.unit} cho thuoc ${medicine.name || ''}`.trim()
    );
  }

  const baseQuantity = normalizeIntegerQuantity(transactionQuantity * conversionFactor);

  return {
    conversionFactor,
    baseQuantity,
  };
}

function buildLotSnapshot(lot: InventoryLotWithRelations) {
  const statusTotals = buildStatusTotals(lot.inventoryTransactions);
  const onHand = STOCK_STATUSES
    .filter((status) => ON_HAND_STATUSES.has(status))
    .reduce((sum, status) => sum + statusTotals[status], 0);

  const availableStock = clampPositive(
    onHand
      - statusTotals[StockStatus.RESERVED]
      - statusTotals[StockStatus.QUARANTINE]
      - statusTotals[StockStatus.BLOCKED]
      - statusTotals[StockStatus.RECALLED]
      - statusTotals[StockStatus.EXPIRED]
      - statusTotals[StockStatus.DAMAGED]
      - statusTotals[StockStatus.IN_TRANSIT]
  );

  return {
    statusTotals,
    onHand,
    availableStock,
    sellPrice: resolveCurrentSellPrice(lot.medicine, lot.branchId),
  };
}

export async function buildInventorySnapshot(prisma: PrismaLike, branchId?: string) {
  const lots = await prisma.inventoryLot.findMany({
    where: branchId ? { branchId } : undefined,
    include: {
      branch: true,
      medicine: {
        include: {
          unitConversions: true,
          priceHistories: true,
        },
      },
      inventoryTransactions: true,
    },
    orderBy: [
      { expiryDate: 'asc' },
      { lotNumber: 'asc' },
    ],
  });

  return lots.flatMap((lot) => {
    const snapshot = buildLotSnapshot(lot);

    return STOCK_STATUSES
      .map((stockStatus) => ({
        id: `${lot.id}:${stockStatus}`,
        branchId: lot.branchId,
        branchName: lot.branch.name,
        medicineId: lot.medicineId,
        medicineCode: lot.medicine.code,
        registrationNumber: lot.medicine.registrationNumber,
        medicineName: lot.medicine.name,
        activeIngredient: lot.medicine.activeIngredient,
        strength: lot.medicine.strength,
        dosageForm: lot.medicine.dosageForm,
        packagingSpec: lot.medicine.packagingSpec,
        saleCategory: lot.medicine.saleCategory,
        isPrescriptionRequired: lot.medicine.isPrescriptionRequired,
        unit: lot.medicine.unit,
        unitConversions: lot.medicine.unitConversions,
        lotId: lot.id,
        lotNumber: lot.lotNumber,
        manufacturingDate: lot.manufacturingDate,
        expiryDate: lot.expiryDate,
        receivedDate: lot.receivedDate,
        supplierName: lot.supplierName,
        inboundDocumentNo: lot.inboundDocumentNo,
        lotStatus: lot.status,
        stockStatus,
        stockStatusLabel: STOCK_STATUS_LABELS[stockStatus],
        quantity: snapshot.statusTotals[stockStatus],
        onHand: snapshot.onHand,
        availableStock: snapshot.availableStock,
        reserved: clampPositive(snapshot.statusTotals[StockStatus.RESERVED]),
        quarantine: clampPositive(snapshot.statusTotals[StockStatus.QUARANTINE]),
        blocked: clampPositive(snapshot.statusTotals[StockStatus.BLOCKED]),
        recalled: clampPositive(snapshot.statusTotals[StockStatus.RECALLED]),
        expired: clampPositive(snapshot.statusTotals[StockStatus.EXPIRED]),
        damaged: clampPositive(snapshot.statusTotals[StockStatus.DAMAGED]),
        inTransit: clampPositive(snapshot.statusTotals[StockStatus.IN_TRANSIT]),
        destroyed: clampPositive(snapshot.statusTotals[StockStatus.DESTROYED]),
        returnedSupplier: clampPositive(snapshot.statusTotals[StockStatus.RETURNED_SUPPLIER]),
        costPrice: lot.costPrice,
        sellPrice: snapshot.sellPrice,
        barcode: lot.medicine.barcode,
        countryOfOrigin: lot.medicine.countryOfOrigin,
        manufacturer: lot.medicine.manufacturer,
      }))
      .filter((line) => line.quantity > 0);
  });
}

export async function pickBatchFefo(
  prisma: PrismaLike,
  medicineId: string,
  branchId: string,
  requestedQuantity: number
) {
  const medicine = await prisma.medicine.findUnique({
    where: { id: medicineId },
  });

  if (!medicine) {
    throw new Error('Không tìm thấy SKU thuốc để cấp phát.');
  }

  const minSellDate = formatDateOnly(addDays(new Date(), 30));
  const lots = await prisma.inventoryLot.findMany({
    where: {
      medicineId,
      branchId,
      expiryDate: { gt: minSellDate },
    },
    include: {
      branch: true,
      medicine: {
        include: {
          unitConversions: true,
          priceHistories: true,
        },
      },
      inventoryTransactions: true,
    },
    orderBy: [
      { expiryDate: 'asc' },
      { receivedDate: 'asc' },
      { lotNumber: 'asc' },
    ],
  });

  let remaining = requestedQuantity;
  const allocations: Array<{
    inventoryLotId: string;
    lotNumber: string;
    expiryDate: string;
    quantity: number;
    costPrice: number;
  }> = [];

  lots.forEach((lot) => {
    if (remaining <= 0) {
      return;
    }

    const snapshot = buildLotSnapshot(lot);
    const sellableQuantity = clampPositive(snapshot.statusTotals[StockStatus.AVAILABLE]);

    if (sellableQuantity <= 0) {
      return;
    }

    const allocatedQuantity = Math.min(sellableQuantity, remaining);
    allocations.push({
      inventoryLotId: lot.id,
      lotNumber: lot.lotNumber,
      expiryDate: lot.expiryDate,
      quantity: allocatedQuantity,
      costPrice: lot.costPrice,
    });
    remaining -= allocatedQuantity;
  });

  return {
    medicine,
    minSellDate,
    allocations,
    shortage: remaining,
  };
}

export async function buildShortageGuidance(
  prisma: PrismaLike,
  medicineId: string,
  excludeBranchId: string
) {
  const otherBranchSnapshot = await buildInventorySnapshot(prisma);
  const transferCandidates = otherBranchSnapshot
    .filter((line) => line.medicineId === medicineId)
    .filter((line) => line.branchId !== excludeBranchId)
    .filter((line) => line.stockStatus === StockStatus.AVAILABLE)
    .filter((line) => line.quantity > 0)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 3)
    .map((line) => `${line.branchName}: ${line.quantity} ${line.unit} (lo ${line.lotNumber}, HSD ${line.expiryDate})`);

  if (transferCandidates.length > 0) {
    return `Goi y dieu chuyen: ${transferCandidates.join(' | ')}`;
  }

  return 'Goi y dat mua bo sung tu nha cung cap.';
}

export async function createInventoryTransaction(
  prisma: PrismaLike,
  input: {
    medicineId: string;
    inventoryLotId: string;
    branchId: string;
    stockStatus: StockStatus;
    transactionType: InventoryTransactionType;
    quantity: number;
    referenceType: string;
    referenceId?: string;
    referenceNumber?: string;
    createdByUserId?: string;
    createdByUserName?: string;
    notes?: string;
  }
) {
  return prisma.inventoryTransaction.create({
    data: input,
  });
}
