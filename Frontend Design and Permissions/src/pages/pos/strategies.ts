export interface CartItem {
  id: string;
  medicineId: string;
  name: string;
  price: number;
  quantity: number;
  selectedUnit?: string;
  baseUnit?: string;
  conversionFactor?: number;
  baseQuantity?: number;
  baseUnitPrice?: number;
  discount: number;
  total: number;
  isPrescriptionRequired: boolean;
  prescriptionId?: string;
  lotNumber?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
}

export interface Order {
  subtotal: number;
  items: CartItem[];
  customerTier: 'normal' | 'silver' | 'gold' | 'platinum';
}

export interface PromotionStrategy {
  calculateDiscount(order: Order): number;
  calculatePoints(order: Order): number;
  getName(): string;
  getDescription(): string;
}

// 1. Chiến lược giảm giá theo Phần trăm
export class PercentDiscountStrategy implements PromotionStrategy {
  constructor(private percent: number) {}

  calculateDiscount(order: Order): number {
    return order.subtotal * (this.percent / 100);
  }

  calculatePoints(order: Order): number {
    const finalTotal = order.subtotal - this.calculateDiscount(order);
    return Math.floor(finalTotal / 10); // 1 điểm cho mỗi $10 chi tiêu
  }

  getName(): string {
    return `Chiết khấu ${this.percent}%`;
  }

  getDescription(): string {
    return `Giảm giá trực tiếp ${this.percent}% tổng trị giá hóa đơn`;
  }
}

// 2. Chiến lược giảm giá cố định
export class FixedAmountStrategy implements PromotionStrategy {
  constructor(private amount: number) {}

  calculateDiscount(order: Order): number {
    return Math.min(this.amount, order.subtotal);
  }

  calculatePoints(order: Order): number {
    const finalTotal = order.subtotal - this.calculateDiscount(order);
    return Math.floor(finalTotal / 10);
  }

  getName(): string {
    return `Giảm thẳng $${this.amount}`;
  }

  getDescription(): string {
    return `Giảm ngay $${this.amount} cho toàn bộ hóa đơn`;
  }
}

// 3. Chiến lược giảm theo Combo (Mua Paracetamol 500mg sẽ giảm thêm $5)
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

  getName(): string {
    return `Combo Paracetamol`;
  }

  getDescription(): string {
    return `Giảm thêm $${this.discountAmount} khi hóa đơn có Paracetamol 500mg`;
  }
}

// 4. Chiến lược nhân đôi/nhân hệ số điểm thưởng cho khách hàng thân thiết
export class PointRewardStrategy implements PromotionStrategy {
  calculateDiscount(order: Order): number {
    return 0; // Không giảm giá, chỉ tặng điểm
  }

  calculatePoints(order: Order): number {
    let multiplier = 1.0;
    if (order.customerTier === 'silver') multiplier = 1.2;
    if (order.customerTier === 'gold') multiplier = 1.5;
    if (order.customerTier === 'platinum') multiplier = 2.0;

    const basePoints = Math.floor(order.subtotal / 10);
    return Math.floor(basePoints * multiplier);
  }

  getName(): string {
    return `Nhân hệ số điểm VIP`;
  }

  getDescription(): string {
    return `Nhân hệ số điểm thưởng (Silver x1.2, Gold x1.5, Platinum x2.0)`;
  }
}

// 5. Chiến lược mặc định (Không khuyến mãi)
export class DefaultStrategy implements PromotionStrategy {
  calculateDiscount(order: Order): number {
    return 0;
  }

  calculatePoints(order: Order): number {
    return Math.floor(order.subtotal / 10);
  }

  getName(): string {
    return `Mặc định`;
  }

  getDescription(): string {
    return `Tích lũy điểm thưởng mặc định (1 điểm cho mỗi $10 chi tiêu)`;
  }
}

// 6. Lớp điều phối (Context)
export class PromotionCalculator {
  private strategy: PromotionStrategy = new DefaultStrategy();

  setStrategy(strategy: PromotionStrategy) {
    this.strategy = strategy;
  }

  getStrategy(): PromotionStrategy {
    return this.strategy;
  }

  calculateDiscount(order: Order): number {
    return this.strategy.calculateDiscount(order);
  }

  calculatePoints(order: Order): number {
    return this.strategy.calculatePoints(order);
  }
}
