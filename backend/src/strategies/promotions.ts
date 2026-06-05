export interface SalesOrderItemInput {
  medicineId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  subtotal: number;
  items: SalesOrderItemInput[];
  customerTier: 'normal' | 'silver' | 'gold' | 'platinum';
}

export interface PromotionStrategy {
  calculateDiscount(order: Order): number;
  calculatePoints(order: Order): number;
}

export class PercentDiscountStrategy implements PromotionStrategy {
  constructor(private percent: number) {}

  calculateDiscount(order: Order): number {
    return order.subtotal * (this.percent / 100);
  }

  calculatePoints(order: Order): number {
    const finalTotal = order.subtotal - this.calculateDiscount(order);
    return Math.floor(finalTotal / 10);
  }
}

export class FixedAmountStrategy implements PromotionStrategy {
  constructor(private amount: number) {}

  calculateDiscount(order: Order): number {
    return Math.min(this.amount, order.subtotal);
  }

  calculatePoints(order: Order): number {
    const finalTotal = order.subtotal - this.calculateDiscount(order);
    return Math.floor(finalTotal / 10);
  }
}

export class ComboStrategy implements PromotionStrategy {
  constructor(private requiredMedicineId: string, private discountAmount: number) {}

  calculateDiscount(order: Order): number {
    const item = order.items.find(i => i.medicineId === this.requiredMedicineId);
    if (item && item.quantity >= 1) {
      return this.discountAmount;
    }
    return 0;
  }

  calculatePoints(order: Order): number {
    const finalTotal = order.subtotal - this.calculateDiscount(order);
    return Math.floor(finalTotal / 10);
  }
}

export class BuyGiftStrategy implements PromotionStrategy {
  constructor(
    private buyMedicineId: string,
    private buyQty: number,
    private giftMedicineId: string,
    private giftQty: number
  ) {}

  calculateDiscount(order: Order): number {
    const buyItem = order.items.find(i => i.medicineId === this.buyMedicineId);
    if (buyItem && buyItem.quantity >= this.buyQty) {
      const times = Math.floor(buyItem.quantity / this.buyQty);
      const giftItem = order.items.find(i => i.medicineId === this.giftMedicineId);
      if (giftItem) {
        const eligibleGiftQty = times * this.giftQty;
        const discountQty = Math.min(giftItem.quantity, eligibleGiftQty);
        const unitPrice = giftItem.price / giftItem.quantity;
        return discountQty * unitPrice;
      }
    }
    return 0;
  }

  calculatePoints(order: Order): number {
    const finalTotal = order.subtotal - this.calculateDiscount(order);
    return Math.floor(finalTotal / 10);
  }
}

export class ConditionFixedDiscountStrategy implements PromotionStrategy {
  constructor(private minOrder: number, private discountAmount: number) {}

  calculateDiscount(order: Order): number {
    if (order.subtotal >= this.minOrder) {
      return Math.min(this.discountAmount, order.subtotal);
    }
    return 0;
  }

  calculatePoints(order: Order): number {
    const finalTotal = order.subtotal - this.calculateDiscount(order);
    return Math.floor(finalTotal / 10);
  }
}

export class TierPercentDiscountStrategy implements PromotionStrategy {
  constructor(private requiredTier: string, private percent: number) {}

  calculateDiscount(order: Order): number {
    if (order.customerTier === this.requiredTier || (this.requiredTier === 'gold' && order.customerTier === 'platinum')) {
      return order.subtotal * (this.percent / 100);
    }
    return 0;
  }

  calculatePoints(order: Order): number {
    const finalTotal = order.subtotal - this.calculateDiscount(order);
    return Math.floor(finalTotal / 10);
  }
}

export class PointRewardStrategy implements PromotionStrategy {
  calculateDiscount(order: Order): number {
    return 0;
  }

  calculatePoints(order: Order): number {
    let multiplier = 1.0;
    if (order.customerTier === 'silver') multiplier = 1.2;
    if (order.customerTier === 'gold') multiplier = 1.5;
    if (order.customerTier === 'platinum') multiplier = 2.0;

    const basePoints = Math.floor(order.subtotal / 10);
    return Math.floor(basePoints * multiplier);
  }
}

export class DefaultStrategy implements PromotionStrategy {
  calculateDiscount(order: Order): number {
    return 0;
  }

  calculatePoints(order: Order): number {
    return Math.floor(order.subtotal / 10);
  }
}

export class PromotionCalculator {
  private strategy: PromotionStrategy = new DefaultStrategy();

  setStrategy(strategy: PromotionStrategy) {
    this.strategy = strategy;
  }

  calculateDiscount(order: Order): number {
    return this.strategy.calculateDiscount(order);
  }

  calculatePoints(order: Order): number {
    return this.strategy.calculatePoints(order);
  }
}
