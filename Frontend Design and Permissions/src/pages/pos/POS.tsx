import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Select';
import { Trash2, ShoppingCart, Barcode, Camera, Upload, Check, AlertTriangle, ShieldCheck, FileText, RefreshCw, Search, UserPlus, X, Users, Store, Gift, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { InventoryLine, Customer } from '../../types';
import {
  buildConversionSummary,
  getTransactionUnitOptions,
  getUnitLabel,
} from '../../utils/medicineUnits';
import {
  PromotionCalculator,
  PercentDiscountStrategy,
  FixedAmountStrategy,
  ComboStrategy,
  PointRewardStrategy,
  DefaultStrategy,
  CartItem,
  Order,
} from './strategies';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../app/components/ui/dialog';
import { CustomerForm } from '../customers/CustomerForm';

interface InventoryLotResponse {
  id: string;
  medicineId: string;
  medicineCode: string;
  medicineName: string;
  locationName: string;
  lotNumber: string;
  expiryDate: string;
  quantity: number;
  availableStock: number;
  sellPrice: number;
  isPrescriptionRequired: boolean;
  isColdChain: boolean;
  isSpecialControl: boolean;
  unit: string;
  unitConversions?: InventoryLine['unitConversions'];
  stockStatus: string;
  stockStatusLabel: string;
  barcode?: string | null;
}

interface SellUnitOption {
  value: string;
  label: string;
  factorToBase: number;
  price: number;
  maxWholeUnits: number;
}

interface AvailableMedicine {
  id: string;
  code: string;
  name: string;
  baseUnitPrice: number;
  stock: number;
  baseUnit: string;
  lotNumber: string;
  isPrescriptionRequired: boolean;
  isColdChain: boolean;
  isSpecialControl: boolean;
  barcode: string;
  laserEquivalent?: string;
  sellUnits: SellUnitOption[];
  defaultSellUnit: string;
  lots: InventoryLotResponse[];
}

function getLasaEquivalent(medicineName: string) {
  const lowerName = medicineName.toLowerCase();

  if (lowerName.includes('amoxicillin')) {
    return 'Amoxicillin 250mg (Hàm lượng khác - Cần kiểm tra kỹ)';
  }
  if (lowerName.includes('ibuprofen')) {
    return 'Aspirin 100mg (Nhóm kháng viêm - Dễ nhầm tên)';
  }
  if (lowerName.includes('paracetamol')) {
    return 'Paracetamol 325mg (Hàm lượng khác - Nguy cơ quá liều)';
  }

  return undefined;
}

function mapInventoryToAvailableMedicines(inventoryLots: InventoryLotResponse[]) {
  const groupedLots: Record<string, InventoryLotResponse[]> = {};

  inventoryLots.forEach((lot) => {
    if (!lot?.medicineId || lot.stockStatus !== 'AVAILABLE' || Number(lot.quantity || 0) <= 0) {
      return;
    }

    if (!groupedLots[lot.medicineId]) {
      groupedLots[lot.medicineId] = [];
    }

    groupedLots[lot.medicineId].push(lot);
  });

  return Object.values(groupedLots)
    .map((lots): AvailableMedicine => {
      const sortedLots = [...lots].sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
      const primaryLot = sortedLots[0];
      const totalStock = lots.reduce((sum, lot) => sum + Number(lot.quantity || 0), 0);

      return {
        id: primaryLot.medicineId,
        code: primaryLot.medicineCode,
        name: primaryLot.medicineName,
        baseUnitPrice: Number(primaryLot.sellPrice || 0),
        stock: totalStock,
        baseUnit: primaryLot.unit,
        lotNumber: primaryLot.lotNumber || 'LOT001',
        isPrescriptionRequired: Boolean(primaryLot.isPrescriptionRequired),
        isColdChain: Boolean(primaryLot.isColdChain),
        isSpecialControl: Boolean(primaryLot.isSpecialControl),
        barcode: primaryLot.barcode || '',
        laserEquivalent: getLasaEquivalent(primaryLot.medicineName),
        sellUnits: getTransactionUnitOptions({
          unit: primaryLot.unit,
          unitConversions: primaryLot.unitConversions,
        }).map((option) => ({
          ...option,
          price: Number((Number(primaryLot.sellPrice || 0) * option.factorToBase).toFixed(2)),
          maxWholeUnits: Math.floor(totalStock / option.factorToBase),
        })),
        defaultSellUnit:
          getTransactionUnitOptions({
            unit: primaryLot.unit,
            unitConversions: primaryLot.unitConversions,
          }).find((option) => Math.floor(totalStock / option.factorToBase) > 0)?.value || primaryLot.unit,
        lots: sortedLots,
      };
    })
    .filter((medicine) => medicine.stock > 0)
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
}

export function POS() {
  const { user } = useAuth();
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(user?.branchId || '');
  const [isCustomerPopupOpen, setIsCustomerPopupOpen] = useState(false);
  const isFirstMount = useRef(true);

  const [barcode, setBarcode] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [isCustomerSearching, setIsCustomerSearching] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const customerTier = (selectedCustomer?.membershipTier as 'normal' | 'silver' | 'gold' | 'platinum') || 'normal';
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [prescriptionId, setPrescriptionId] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Dynamic medicines list loaded from branch inventory
  const [medicines, setMedicines] = useState<AvailableMedicine[]>([]);
  const [isMedicinesLoading, setIsMedicinesLoading] = useState(true);
  const [medicinesError, setMedicinesError] = useState<string | null>(null);
  const [selectedSellUnits, setSelectedSellUnits] = useState<Record<string, string>>({});
  
  // File input ref for uploading real prescription files
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            // Limit maximum dimension to 1024px to keep payloads compact
            const maxDimension = 1024;
            if (width > maxDimension || height > maxDimension) {
              if (width > height) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
              } else {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              // Export as compressed JPEG with 0.6 quality (highly legible, small file footprint)
              const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
              setCapturedImage(compressedBase64);
              toast.success('Đã nén và tải lên ảnh toa thuốc thực tế!');
            } else {
              setCapturedImage(event.target.result as string);
              toast.success('Đã tải lên ảnh toa thuốc thực tế!');
            }
          };
          img.src = event.target.result as string;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Modal & Camera capture state for Rx selection
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // streamRef holds the live MediaStream so we can stop it immediately after capture
  // without depending on React state timing which causes race conditions
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [showRxModal, setShowRxModal] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState(false);

  // Selected Rx medicine pending verification
  const [pendingMedicine, setPendingMedicine] = useState<any | null>(null);
  const [showLasaAlert, setShowLasaAlert] = useState(false);

  const getSelectedSellUnit = (medicine: AvailableMedicine) => {
    const selectedUnitValue = selectedSellUnits[medicine.id] || medicine.defaultSellUnit;
    return (
      medicine.sellUnits.find((option) => option.value === selectedUnitValue) ||
      medicine.sellUnits[medicine.sellUnits.length - 1]
    );
  };

  const getTotalBaseQuantityInCart = (medicineId: string, excludingCartItemId?: string) => {
    return cart
      .filter((item) => item.medicineId === medicineId)
      .filter((item) => item.id !== excludingCartItemId)
      .reduce((sum, item) => sum + Number(item.baseQuantity ?? item.quantity), 0);
  };

  const loadAvailableMedicines = async (signal?: AbortSignal, showLoader = true) => {
    const isAdminOrChainManager = user?.role === 'ROLE_ADMIN' || user?.role === 'ROLE_CHAIN_MANAGER';
    if (isAdminOrChainManager && !selectedBranchId) {
      setMedicines([]);
      setIsMedicinesLoading(false);
      return;
    }

    if (showLoader) {
      setIsMedicinesLoading(true);
    }
    setMedicinesError(null);

    try {
      const token = localStorage.getItem('pharmacy_token');
      if (!token) {
        throw new Error('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.');
      }

      const url = selectedBranchId
        ? `http://localhost:3000/api/inventory?branchId=${selectedBranchId}`
        : 'http://localhost:3000/api/inventory';

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });

      if (!response.ok) {
        let errorMessage = `Không thể tải tồn kho (${response.status})`;

        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Ignore JSON parsing errors and fall back to the status-based message.
        }

        throw new Error(errorMessage);
      }

      const inventoryData = await response.json();
      if (!Array.isArray(inventoryData)) {
        throw new Error('Dữ liệu tồn kho không hợp lệ.');
      }

      const availableMedicines = mapInventoryToAvailableMedicines(inventoryData as InventoryLine[]);
      setMedicines(availableMedicines);
      setSelectedSellUnits((prev) => {
        const next = { ...prev };
        availableMedicines.forEach((medicine) => {
          if (!next[medicine.id]) {
            next[medicine.id] = medicine.defaultSellUnit;
          }
        });
        return next;
      });

    } catch (err: any) {
      if (err.name === 'AbortError') {
        return;
      }

      const friendlyMessage =
        err instanceof TypeError
          ? 'Không thể kết nối máy chủ tồn kho. Vui lòng kiểm tra Backend tại cổng 3000 và thử lại.'
          : err.message || 'Không thể tải danh sách thuốc trong tồn kho.';

      setMedicines([]);
      setMedicinesError(friendlyMessage);
      console.error('Error fetching inventory for POS:', err);
    } finally {
      if (showLoader) {
        setIsMedicinesLoading(false);
      }
    }
  };

  // Fetch medicines directly from branch inventory when selectedBranchId changes
  useEffect(() => {
    const controller = new AbortController();
    void loadAvailableMedicines(controller.signal);

    return () => controller.abort();
  }, [selectedBranchId]);

  // Load branches if user is Admin/Chain Manager
  const isAdminOrChainManager = user?.role === 'ROLE_ADMIN' || user?.role === 'ROLE_CHAIN_MANAGER';
  useEffect(() => {
    if (!isAdminOrChainManager) return;

    const fetchBranches = async () => {
      try {
        const token = localStorage.getItem('pharmacy_token');
        const response = await fetch('http://localhost:3000/api/branches', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setBranches(data);
        }
      } catch (err) {
        console.error('Error fetching branches:', err);
      }
    };
    void fetchBranches();
  }, [isAdminOrChainManager]);

  // Clear cart when branch changes to prevent inventory lot mismatch
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    setCart([]);
    setCapturedImage(null);
  }, [selectedBranchId]);

  // Customer search with debounce
  useEffect(() => {
    if (!customerSearch || customerSearch.length < 2) {
      setCustomerResults([]);
      setShowCustomerDropdown(false);
      return;
    }

    const timeout = setTimeout(async () => {
      setIsCustomerSearching(true);
      try {
        const token = localStorage.getItem('pharmacy_token');
        const response = await fetch(`http://localhost:3000/api/customers?search=${encodeURIComponent(customerSearch)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setCustomerResults(data);
          setShowCustomerDropdown(data.length > 0);
        }
      } catch {
        // silently fail — customer search is optional
      } finally {
        setIsCustomerSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [customerSearch]);

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch('');
    setShowCustomerDropdown(false);
    toast.success(`Đã liên kết khách hàng: ${customer.name} (${customer.membershipTier.toUpperCase()})`);
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerSearch('');
    setCustomerResults([]);
  };

  // Strategy Pattern States
  const [promoType, setPromoType] = useState<string>('default');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [rewardPoints, setRewardPoints] = useState(0);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [giftWarning, setGiftWarning] = useState<{
    giftMedId: string;
    giftName: string;
    eligibleQty: number;
    currentQty: number;
    missingQty: number;
  } | null>(null);

  // Load promotions on mount from database API or localStorage fallback
  useEffect(() => {
    const fetchPromotions = async () => {
      try {
        const token = localStorage.getItem('pharmacy_token');
        const response = await fetch('http://localhost:3000/api/promotions', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            setPromotions(data);
            localStorage.setItem('pharmachain_promotions', JSON.stringify(data));
            return;
          }
        }
      } catch (err) {
        console.error('Error fetching database promotions in POS:', err);
      }

      // Fallback
      const stored = localStorage.getItem('pharmachain_promotions');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPromotions(parsed);
            return;
          }
        } catch (err) {
          console.error('Error parsing stored promotions in POS:', err);
        }
      }

      // Default Seed Promotions
      const defaultPromos = [
        { id: 'default', code: 'default', name: 'VIP tích điểm thưởng mặc định', value: 0, status: 'active', type: 'default', targetBranch: 'all' },
        { id: 'percent_10', code: 'percent_10', name: 'Chiết khấu 10% tổng hóa đơn', value: 10, status: 'active', type: 'percent', targetBranch: 'all' },
        { id: 'fixed_20', code: 'fixed_20', name: 'Giảm thẳng $20 trực tiếp', value: 20, status: 'active', type: 'fixed', targetBranch: 'all' },
        { id: 'combo_para', code: 'combo_para', name: 'Combo Paracetamol (Giảm thêm $5)', value: 5, status: 'active', type: 'combo', targetBranch: 'all' },
        { id: 'vip_points', code: 'vip_points', name: 'Nhân hệ số điểm VIP (Bạc/Vàng/Bạch Kim)', value: 2, status: 'active', type: 'loyalty', targetBranch: 'all' }
      ];
      setPromotions(defaultPromos);
      localStorage.setItem('pharmachain_promotions', JSON.stringify(defaultPromos));
    };

    void fetchPromotions();
  }, []);

  // Calculate prices using Strategy Pattern
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Webcam stream lifecycle hook
  // Only starts/stops when the modal visibility changes — NOT when capturedImage changes,
  // to avoid a race condition where stopping the stream races with drawImage on the GPU.
  useEffect(() => {
    if (showRxModal && pendingMedicine) {
      // Start camera only if no image has been captured yet
      if (!capturedImage) {
        setCameraError(false);
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } })
          .then((mediaStream) => {
            streamRef.current = mediaStream;
            setStream(mediaStream);
            if (videoRef.current) {
              videoRef.current.srcObject = mediaStream;
            }
          })
          .catch((err) => {
            console.error("Lỗi truy cập camera:", err);
            setCameraError(true);
          });
      }
    } else {
      // Modal closed — stop any active stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setStream(null);
      }
    }

    return () => {
      // Cleanup on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRxModal, pendingMedicine]);

  useEffect(() => {
    const orderData: Order = {
      subtotal,
      items: cart,
      customerTier,
    };

    let discount = 0;
    let points = Math.floor(subtotal / 10); // default points

    let dbPromoApplied = false;
    if (promoType && promoType !== 'default') {
      const promotion = promotions.find(p => p.id === promoType);
      if (promotion && promotion.status === 'active') {
        try {
          const config = promotion.config ? (typeof promotion.config === 'string' ? JSON.parse(promotion.config) : promotion.config) : {};
          dbPromoApplied = true;

          switch (promotion.type) {
            case 'percent_discount':
            case 'percent': {
              const minOrder = Number(config.minOrderValue || 0);
              const pct = Number(promotion.value || config.percent || 0);
              if (subtotal >= minOrder) {
                discount = subtotal * (pct / 100);
              }
              break;
            }
            case 'fixed_discount':
            case 'fixed': {
              const minOrder = Number(config.minOrderValue || 0);
              const amt = Number(promotion.value || config.amount || 0);
              if (subtotal >= minOrder) {
                discount = Math.min(amt, subtotal);
              }
              break;
            }
            case 'buy_gift':
            case 'combo': {
              const buyMedId = config.buyMedicineId;
              const giftMedId = config.giftMedicineId;
              const buyQty = Number(config.buyQuantity || 1);
              const giftQty = Number(config.giftQuantity || 1);
              const buyUnit = config.buyUnit;
              const giftUnit = config.giftUnit;

              if (buyMedId && giftMedId) {
                const buyMed = medicines.find(m => m.id === buyMedId);
                const buyUnitOpt = buyMed?.sellUnits?.find(u => u.value === buyUnit);
                const buyFactor = buyUnitOpt ? buyUnitOpt.factorToBase : 1;

                const buyItems = cart.filter(i => i.medicineId === buyMedId);
                const totalBuyBaseQty = buyItems.reduce((sum, i) => sum + i.quantity * (i.conversionFactor || 1), 0);
                const purchasedBuyQty = totalBuyBaseQty / buyFactor;

                if (purchasedBuyQty >= buyQty) {
                  const timesQualified = Math.floor(purchasedBuyQty / buyQty);
                  const giftMed = medicines.find(m => m.id === giftMedId);
                  const giftUnitOpt = giftMed?.sellUnits?.find(u => u.value === giftUnit);
                  const giftFactor = giftUnitOpt ? giftUnitOpt.factorToBase : 1;
                  const totalQualifiedGiftBaseQty = timesQualified * giftQty * giftFactor;

                  let remainingGiftBaseQtyToDiscount = totalQualifiedGiftBaseQty;
                  let comboDiscount = 0;
                  const giftItemsInCart = cart.filter(i => i.medicineId === giftMedId);
                  
                  for (const item of giftItemsInCart) {
                    if (remainingGiftBaseQtyToDiscount <= 0) break;
                    const itemBaseQty = item.quantity * (item.conversionFactor || 1);
                    const discountBaseQty = Math.min(itemBaseQty, remainingGiftBaseQtyToDiscount);
                    const itemBasePrice = item.price / (item.conversionFactor || 1);
                    comboDiscount += discountBaseQty * itemBasePrice;
                    remainingGiftBaseQtyToDiscount -= discountBaseQty;
                  }
                  discount = comboDiscount;
                }
              }
              break;
            }
            case 'loyalty_points':
            case 'loyalty': {
              let multiplier = 1.0;
              const silverMult = Number(config.silverMultiplier ?? 1.2);
              const goldMult = Number(config.goldMultiplier ?? 1.5);
              const platMult = Number(config.platinumMultiplier ?? 2.0);

              if (customerTier === 'silver') multiplier = silverMult;
              if (customerTier === 'gold') multiplier = goldMult;
              if (customerTier === 'platinum') multiplier = platMult;

              const finalTotal = Math.max(0, subtotal - discount);
              const basePoints = Math.floor(finalTotal / 10);
              points = Math.floor(basePoints * multiplier);
              break;
            }
            case 'category_voucher': {
              const catId = config.categoryId;
              const discType = config.discountType || 'percent';
              const discVal = Number(config.discountValue || promotion.value || 0);

              if (catId) {
                const catSubtotal = cart
                  .filter(item => {
                    const matchMed = medicines.find(m => m.id === item.medicineId);
                    return matchMed && matchMed.categoryId === catId;
                  })
                  .reduce((sum, item) => sum + item.price * item.quantity, 0);

                if (catSubtotal > 0) {
                  if (discType === 'percent') {
                    discount = catSubtotal * (discVal / 100);
                  } else {
                    discount = Math.min(discVal, catSubtotal);
                  }
                }
              }
              break;
            }
            default:
              dbPromoApplied = false;
              break;
          }
        } catch (e) {
          console.error(e);
        }
      }
    }

    if (!dbPromoApplied) {
      // Fallback Strategy pattern
      const getPromoValue = (promoId: string, defaultVal: number) => {
        const match = promotions.find(p => p.id === promoId);
        return (match && match.value !== undefined) ? match.value : defaultVal;
      };

      const calculator = new PromotionCalculator();
      switch (promoType) {
        case 'percent_10':
          calculator.setStrategy(new PercentDiscountStrategy(getPromoValue('percent_10', 10)));
          break;
        case 'fixed_20':
          calculator.setStrategy(new FixedAmountStrategy(getPromoValue('fixed_20', 20)));
          break;
        case 'combo_para':
          calculator.setStrategy(new ComboStrategy('med-1', getPromoValue('combo_para', 5)));
          break;
        case 'vip_points':
          calculator.setStrategy(new PointRewardStrategy());
          break;
        default:
          calculator.setStrategy(new DefaultStrategy());
          break;
      }
      discount = calculator.calculateDiscount(orderData);
      points = calculator.calculatePoints(orderData);
    }

    setDiscountAmount(discount);
    setRewardPoints(points);

    // Calculate eligible gift warnings for buy_gift / combo rules
    let giftWarn: any = null;
    if (promoType && promoType !== 'default') {
      const promotion = promotions.find(p => p.id === promoType);
      if (promotion && promotion.status === 'active') {
        const config = promotion.config ? (typeof promotion.config === 'string' ? JSON.parse(promotion.config) : promotion.config) : {};
        if (promotion.type === 'buy_gift' || promotion.type === 'combo') {
          const buyMedId = config.buyMedicineId;
          const giftMedId = config.giftMedicineId;
          const buyQty = Number(config.buyQuantity || 1);
          const giftQty = Number(config.giftQuantity || 1);
          const buyUnit = config.buyUnit;
          const giftUnit = config.giftUnit;

          if (buyMedId && giftMedId) {
            const buyMed = medicines.find(m => m.id === buyMedId);
            const buyUnitOpt = buyMed?.sellUnits?.find(u => u.value === buyUnit);
            const buyFactor = buyUnitOpt ? buyUnitOpt.factorToBase : 1;

            const buyItems = cart.filter(i => i.medicineId === buyMedId);
            const totalBuyBaseQty = buyItems.reduce((sum, i) => sum + i.quantity * (i.conversionFactor || 1), 0);
            const purchasedBuyQty = totalBuyBaseQty / buyFactor;

            if (purchasedBuyQty >= buyQty) {
              const timesQualified = Math.floor(purchasedBuyQty / buyQty);
              const giftMed = medicines.find(m => m.id === giftMedId);
              const giftUnitOpt = giftMed?.sellUnits?.find(u => u.value === giftUnit);
              const giftFactor = giftUnitOpt ? giftUnitOpt.factorToBase : 1;
              const eligibleGiftQty = timesQualified * giftQty;
              const eligibleGiftBaseQty = eligibleGiftQty * giftFactor;

              const giftItems = cart.filter(i => i.medicineId === giftMedId);
              const currentGiftBaseQty = giftItems.reduce((sum, i) => sum + i.quantity * (i.conversionFactor || 1), 0);
              
              if (currentGiftBaseQty < eligibleGiftBaseQty) {
                const giftName = giftMed ? giftMed.name : 'Sản phẩm quà tặng';
                giftWarn = {
                  giftMedId,
                  giftName,
                  giftUnit,
                  eligibleQty: eligibleGiftQty,
                  currentQty: currentGiftBaseQty / giftFactor,
                  missingQty: (eligibleGiftBaseQty - currentGiftBaseQty) / giftFactor,
                };
              }
            }
          }
        }
      }
    }
    setGiftWarning(giftWarn);
  }, [subtotal, cart, promoType, customerTier, promotions, medicines]);

  const addToCart = (medicine: AvailableMedicine, explicitUnit?: string) => {
    const sellUnit = medicine.sellUnits.find(
      (option) => option.value === (explicitUnit || selectedSellUnits[medicine.id] || medicine.defaultSellUnit)
    );

    if (!sellUnit) {
      toast.error('Không tìm thấy đơn vị bán phù hợp.');
      return;
    }

    if (sellUnit.maxWholeUnits < 1) {
      toast.error(`Tồn kho không đủ để bán theo ${sellUnit.label}.`);
      return;
    }

    const nextBaseQuantity = getTotalBaseQuantityInCart(medicine.id) + sellUnit.factorToBase;
    if (nextBaseQuantity > medicine.stock) {
      toast.error(`Tồn kho ${medicine.name} không đủ cho đơn vị ${sellUnit.label}.`);
      return;
    }

    // 1. Nếu là thuốc Rx và chưa có đơn thuốc, mở modal yêu cầu quét ảnh toa
    if (medicine.isPrescriptionRequired && !capturedImage) {
      setPendingMedicine(medicine);
      setShowRxModal(true);
      return;
    }

    // 2. Cảnh báo LASA (Look-alike, Sound-alike) cho các thuốc nguy cơ cao
    if (medicine.laserEquivalent && !pendingMedicine) {
      setPendingMedicine(medicine);
      setShowLasaAlert(true);
      return;
    }

    // 3. Thêm vào giỏ hàng
    const existingItem = cart.find(
      (item) => item.medicineId === medicine.id && item.selectedUnit === sellUnit.value
    );
    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === existingItem.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                baseQuantity: (item.quantity + 1) * sellUnit.factorToBase,
                total: (item.quantity + 1) * item.price,
              }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          id: `cart-${Date.now()}`,
          medicineId: medicine.id,
          name: medicine.name,
          price: sellUnit.price,
          quantity: 1,
          selectedUnit: sellUnit.value,
          baseUnit: medicine.baseUnit,
          conversionFactor: sellUnit.factorToBase,
          baseQuantity: sellUnit.factorToBase,
          baseUnitPrice: medicine.baseUnitPrice,
          discount: 0,
          total: sellUnit.price,
          isPrescriptionRequired: medicine.isPrescriptionRequired,
          prescriptionId: medicine.isPrescriptionRequired ? prescriptionId || 'TOA-POS-REALTIME' : undefined,
          lotNumber: medicine.lotNumber || 'LOT001',
        },
      ]);
    }
    setPendingMedicine(null);
    toast.success(`Đã thêm ${medicine.name} theo ${sellUnit.label} vào giỏ hàng`);
  };

  const addGiftToCart = (giftMedId: string, quantityToAdd: number, explicitUnit?: string) => {
    const medicine = medicines.find(m => m.id === giftMedId);
    if (!medicine) {
      toast.error('Không tìm thấy thông tin sản phẩm quà tặng!');
      return;
    }
    
    // Choose default or selected sell unit
    const sellUnit = medicine.sellUnits.find(
      (option) => option.value === (explicitUnit || selectedSellUnits[medicine.id] || medicine.defaultSellUnit)
    );
    if (!sellUnit) {
      toast.error('Không tìm thấy đơn vị bán cho sản phẩm quà tặng.');
      return;
    }

    const baseQtyToAdd = quantityToAdd * sellUnit.factorToBase;
    const nextBaseQuantity = getTotalBaseQuantityInCart(medicine.id) + baseQtyToAdd;
    if (nextBaseQuantity > medicine.stock) {
      toast.error(`Tồn kho ${medicine.name} không đủ để thêm ${quantityToAdd} quà tặng.`);
      return;
    }

    const existingItem = cart.find(
      (item) => item.medicineId === medicine.id && item.selectedUnit === sellUnit.value
    );

    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === existingItem.id
            ? {
                ...item,
                quantity: item.quantity + quantityToAdd,
                baseQuantity: (item.quantity + quantityToAdd) * sellUnit.factorToBase,
                total: (item.quantity + quantityToAdd) * item.price,
              }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          id: `cart-${Date.now()}`,
          medicineId: medicine.id,
          name: medicine.name,
          price: sellUnit.price,
          quantity: quantityToAdd,
          selectedUnit: sellUnit.value,
          baseUnit: medicine.baseUnit,
          conversionFactor: sellUnit.factorToBase,
          baseQuantity: baseQtyToAdd,
          baseUnitPrice: medicine.baseUnitPrice,
          discount: 0,
          total: sellUnit.price * quantityToAdd,
          isPrescriptionRequired: medicine.isPrescriptionRequired,
          prescriptionId: medicine.isPrescriptionRequired ? prescriptionId || 'TOA-POS-REALTIME' : undefined,
          lotNumber: medicine.lotNumber || 'LOT001',
        },
      ]);
    }

    toast.success(`Đã tự động thêm ${quantityToAdd} ${medicine.name} (quà tặng) vào giỏ hàng!`);
  };

  const addToCartWithImage = (medicine: AvailableMedicine, imgData: string) => {
    const sellUnit = getSelectedSellUnit(medicine);
    if (!sellUnit) {
      toast.error('Không tìm thấy đơn vị bán phù hợp.');
      return;
    }

    const nextBaseQuantity = getTotalBaseQuantityInCart(medicine.id) + sellUnit.factorToBase;
    if (nextBaseQuantity > medicine.stock) {
      toast.error(`Tồn kho ${medicine.name} không đủ cho đơn vị ${sellUnit.label}.`);
      return;
    }

    const existingItem = cart.find(
      (item) => item.medicineId === medicine.id && item.selectedUnit === sellUnit.value
    );
    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === existingItem.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                baseQuantity: (item.quantity + 1) * sellUnit.factorToBase,
                total: (item.quantity + 1) * item.price,
              }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          id: `cart-${Date.now()}`,
          medicineId: medicine.id,
          name: medicine.name,
          price: sellUnit.price,
          quantity: 1,
          selectedUnit: sellUnit.value,
          baseUnit: medicine.baseUnit,
          conversionFactor: sellUnit.factorToBase,
          baseQuantity: sellUnit.factorToBase,
          baseUnitPrice: medicine.baseUnitPrice,
          discount: 0,
          total: sellUnit.price,
          isPrescriptionRequired: medicine.isPrescriptionRequired,
          prescriptionId: prescriptionId || 'TOA-POS-REALTIME',
          lotNumber: medicine.lotNumber || 'LOT001',
        },
      ]);
    }
    setPendingMedicine(null);
    toast.success(`Đã đính kèm ảnh toa và thêm ${medicine.name} theo ${sellUnit.label} vào đơn hàng`);
  };

  const removeFromCart = (cartItemId: string) => {
    const item = cart.find(i => i.id === cartItemId);
    setCart(cart.filter((item) => item.id !== cartItemId));
    // Nếu không còn thuốc Rx nào trong giỏ, có thể xóa ảnh toa
    const remainingRx = cart.filter(i => i.id !== cartItemId && i.isPrescriptionRequired);
    if (remainingRx.length === 0) {
      setCapturedImage(null);
    }
  };

  const updateQuantity = (cartItemId: string, quantity: number) => {
    if (quantity < 1) return;

    const cartItem = cart.find((item) => item.id === cartItemId);
    if (!cartItem) return;

    const medicine = medicines.find((item) => item.id === cartItem.medicineId);
    if (!medicine) return;

    const nextBaseQuantity = quantity * Number(cartItem.conversionFactor ?? 1);
    const totalForMedicine = getTotalBaseQuantityInCart(cartItem.medicineId, cartItemId) + nextBaseQuantity;
    if (totalForMedicine > medicine.stock) {
      toast.error(`Không đủ tồn kho ${medicine.name} cho số lượng đã chọn.`);
      return;
    }

    setCart(
      cart.map((item) =>
        item.id === cartItemId
          ? {
              ...item,
              quantity,
              baseQuantity: nextBaseQuantity,
              total: quantity * item.price,
            }
          : item
      )
    );
  };

  const updateCartItemUnit = (cartItemId: string, nextUnit: string) => {
    const cartItem = cart.find((item) => item.id === cartItemId);
    if (!cartItem) return;

    const medicine = medicines.find((item) => item.id === cartItem.medicineId);
    if (!medicine) return;

    const sellUnit = medicine.sellUnits.find((option) => option.value === nextUnit);
    if (!sellUnit) {
      toast.error('Đơn vị bán không hợp lệ.');
      return;
    }

    const nextBaseQuantity = cartItem.quantity * sellUnit.factorToBase;
    const totalForMedicine = getTotalBaseQuantityInCart(cartItem.medicineId, cartItemId) + nextBaseQuantity;
    if (totalForMedicine > medicine.stock) {
      toast.error(`Tồn kho ${medicine.name} không đủ nếu đổi sang ${sellUnit.label}.`);
      return;
    }

    setCart((prev) =>
      prev.map((item) =>
        item.id === cartItemId
          ? {
              ...item,
              selectedUnit: sellUnit.value,
              conversionFactor: sellUnit.factorToBase,
              baseQuantity: nextBaseQuantity,
              price: sellUnit.price,
              total: item.quantity * sellUnit.price,
              baseUnit: medicine.baseUnit,
              baseUnitPrice: medicine.baseUnitPrice,
            }
          : item
      )
    );
  };

  const updateCartItemDosage = (itemId: string, field: 'dosage' | 'frequency' | 'duration', value: string) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  };

  // Chụp ảnh thực tế bằng camera thiết bị
  // PRIMARY: ImageCapture API — grabs a frame directly from the camera hardware driver.
  // This completely bypasses the GPU compositing pipeline, which is the root cause of
  // black frames when reading from a <video> element via drawImage on macOS/Chrome.
  // FALLBACK: requestAnimationFrame + drawImage for browsers without ImageCapture support.
  const handleRealCapture = async () => {
    const video = videoRef.current;
    const activeStream = streamRef.current;

    if (!video || !activeStream) {
      handleSimulatedCapture();
      return;
    }

    const videoTrack = activeStream.getVideoTracks()[0];
    if (!videoTrack) {
      toast.error('Không tìm thấy video track!');
      return;
    }

    try {
      let dataUrl: string;

      // --- PRIMARY PATH: ImageCapture API (Chrome 59+, Edge, Opera) ---
      // grabFrame() reads a raw VideoFrame from the camera driver directly.
      // It does NOT go through the HTML video element's render pipeline at all,
      // so hardware-accelerated compositing issues are completely avoided.
      if (typeof (window as any).ImageCapture !== 'undefined') {
        const imageCapture = new (window as any).ImageCapture(videoTrack);
        const bitmap: ImageBitmap = await imageCapture.grabFrame();

        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Cannot get 2D context');

        ctx.drawImage(bitmap, 0, 0);
        bitmap.close(); // free GPU memory

        dataUrl = canvas.toDataURL('image/jpeg', 0.75);
      } else {
        // --- FALLBACK PATH: requestAnimationFrame + drawImage (Firefox/Safari) ---
        // Ensure video has decoded at least one frame
        if (video.readyState < 2 || video.videoWidth === 0) {
          toast.error('Camera chưa sẵn sàng, vui lòng thử lại sau 1 giây!');
          return;
        }

        // Wait for next paint cycle so GPU has flushed the latest frame
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

        const canvas = document.createElement('canvas');
        let width = video.videoWidth || 640;
        let height = video.videoHeight || 480;

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Cannot get 2D context');

        ctx.drawImage(video, 0, 0, width, height);
        dataUrl = canvas.toDataURL('image/jpeg', 0.75);
      }

      // Stop stream AFTER capture is fully complete — pixel data is now in canvas memory
      activeStream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStream(null);

      setCapturedImage(dataUrl);
      toast.success('Đã chụp ảnh toa thuốc thành công!');
    } catch (e) {
      console.error('Lỗi chụp ảnh:', e);
      toast.error('Lỗi khi ghi nhận ảnh chụp từ camera. Vui lòng thử tải ảnh từ file!');
    }
  };

  // Giả lập ảnh chụp toa
  const handleSimulatedCapture = () => {
    setIsCapturing(true);
    setTimeout(() => {
      setCapturedImage('data:image/jpeg;base64,mockedprescriptionimage');
      setIsCapturing(false);
      toast.success('Đã tải lên ảnh toa thuốc giả lập!');
    }, 1000);
  };

  const handleCheckout = async () => {
    const isAdminOrChainManager = user?.role === 'ROLE_ADMIN' || user?.role === 'ROLE_CHAIN_MANAGER';
    if (isAdminOrChainManager && !selectedBranchId) {
      toast.error('Vui lòng chọn chi nhánh đang đứng bán trước khi thanh toán!');
      return;
    }

    if (cart.length === 0) {
      toast.error('Giỏ hàng trống');
      return;
    }

    const hasPrescriptionMedicine = cart.some((item) => item.isPrescriptionRequired);
    if (hasPrescriptionMedicine && !capturedImage) {
      toast.error('Đơn hàng có thuốc kê đơn Rx, vui lòng đính kèm ảnh chụp toa thuốc!');
      return;
    }

    // Show immediate loading feedback — disable button, show spinner
    setIsCheckingOut(true);
    const checkoutToast = toast.loading('Đang xử lý đơn hàng, vui lòng chờ...');

    try {
      const token = localStorage.getItem('pharmacy_token');
      const response = await fetch('http://localhost:3000/api/pos/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          cart,
          customerId: selectedCustomer?.id || 'Khách vãng lai',
          customerTier,
          promoType,
          promoValue: promotions.find((p) => p.id === promoType)?.value,
          paymentMethod,
          prescriptionId: prescriptionId || `TOA-${Date.now().toString().slice(-6)}`,
          capturedImage,
          branchId: selectedBranchId || undefined,
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Thao tác thanh toán thất bại');
      }

      const result = await response.json();
      toast.dismiss(checkoutToast);
      toast.success(`✅ Hóa đơn ${result.invoiceNumber} đã lưu! (+${result.rewardPoints} Điểm VIP)`);

      // Reset state
      setCart([]);
      setBarcode('');
      setSelectedCustomer(null);
      setCustomerSearch('');
      setPrescriptionId('');
      setCapturedImage(null);
      setPromoType('default');
      await loadAvailableMedicines(undefined, false);
    } catch (e: any) {
      console.error(e);
      toast.dismiss(checkoutToast);
      toast.error(e.message || 'Lỗi kết nối máy chủ API!');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleBarcodeSearch = () => {
    const medicine = medicines.find(
      (m) =>
        m.barcode === barcode ||
        m.id === barcode ||
        m.code === barcode ||
        m.name.toLowerCase().includes(barcode.toLowerCase())
    );
    if (medicine) {
      addToCart(medicine);
      setBarcode('');
    } else {
      toast.error('Không tìm thấy thuốc');
    }
  };

  return (
    <div>
      <Header title="Bán lẻ tại quầy (POS)" subtitle="Giao diện bán thuốc nhanh tích hợp an toàn dược lâm sàng" />

      {/* Sleek Branch Selection Toolbar */}
      <div className="px-6 pt-6">
        <div className="p-4 bg-card/65 backdrop-blur-md border border-border/80 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Điểm bán hàng lẻ (POS Endpoint)</h3>
              <p className="text-xs text-muted-foreground">
                Tài khoản: <strong className="text-foreground">{user?.name}</strong> ({user?.role === 'ROLE_ADMIN' ? 'Quản trị viên' : user?.role === 'ROLE_CHAIN_MANAGER' ? 'Quản lý chuỗi' : 'Nhân viên chi nhánh'})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            {isAdminOrChainManager ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Đang đứng bán tại:</span>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="px-3 py-1.5 bg-background border border-input rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer min-w-[200px] shadow-sm"
                >
                  <option value="">-- Chọn Chi Nhánh --</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-primary/5 border border-primary/25 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary">
                <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse"></span>
                <span>Chi nhánh hoạt động: {user?.branchName || 'Đang tải...'}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Product Selection */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Interactive Prescription Photo capture overlay for Rx items */}
            {showRxModal && pendingMedicine && (
              <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-lg border-primary border-2 shadow-2xl animate-in zoom-in-95 duration-200">
                  <CardHeader className="bg-primary/5 pb-4 border-b flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">Xác thực toa thuốc kê đơn (Rx)</CardTitle>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => { setShowRxModal(false); setPendingMedicine(null); }}>Đóng</Button>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    <p className="text-sm">
                      Bạn đang thêm thuốc kê đơn: <strong className="text-primary">{pendingMedicine.name}</strong>. Vui lòng thực hiện chụp ảnh toa thuốc đối chiếu.
                    </p>

                    <div className="relative w-full h-56 bg-slate-900 rounded-lg flex flex-col items-center justify-center text-white overflow-hidden border border-border">
                      {capturedImage ? (
                        <div className="w-full h-full relative">
                          <img src={capturedImage} alt="Captured prescription" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <span className="bg-success text-white px-3 py-1 rounded text-xs font-semibold flex items-center gap-1">
                              ✓ Đã ghi nhận ảnh đơn thuốc
                            </span>
                          </div>
                        </div>
                      ) : cameraError ? (
                        <div className="flex flex-col items-center gap-2 text-center p-4">
                          <AlertTriangle className="h-8 w-8 text-amber-500" />
                          <p className="text-xs font-semibold">Không thể khởi chạy Máy ảnh vật lý</p>
                          <Button size="sm" onClick={handleSimulatedCapture} className="text-xs">Sử dụng giả lập ảnh toa</Button>
                        </div>
                      ) : isCapturing ? (
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                          <p className="text-xs font-medium animate-pulse">Đang nén dữ liệu ảnh...</p>
                        </div>
                      ) : (
                        <>
                          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                          <div className="absolute inset-4 border border-dashed border-white/20 rounded pointer-events-none"></div>
                        </>
                      )}
                    </div>

                    {/* Show LASA Alert immediately inside verification window */}
                    {pendingMedicine.laserEquivalent && (
                      <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-lg flex gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-red-800 dark:text-red-300">CẢNH BÁO TRÙNG LÊN / HÀM LƯỢNG (LASA):</p>
                          <p className="text-[11px] text-red-700 dark:text-red-400 mt-0.5">{pendingMedicine.laserEquivalent}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t">
                      {!capturedImage ? (
                        <>
                          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                            <Upload className="h-4 w-4 mr-1" /> Tải ảnh thực tế
                          </Button>
                          {!cameraError && (
                            <Button size="sm" onClick={handleRealCapture}>
                              <Camera className="h-4 w-4 mr-1" /> Chụp ảnh thực tế
                            </Button>
                          )}
                        </>
                      ) : (
                        <>
                          <Button variant="outline" size="sm" onClick={() => setCapturedImage(null)}>
                            Chụp lại
                          </Button>
                          <Button size="sm" onClick={() => {
                            const med = pendingMedicine;
                            const img = capturedImage;
                            setShowRxModal(false);
                            addToCartWithImage(med, img);
                          }}>
                            <Check className="h-4 w-4 mr-1" /> Xác nhận & Thêm vào đơn
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* LASA Warning Modal (For OTC medicines that have similar names but don't need camera) */}
            {showLasaAlert && pendingMedicine && (
              <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-lg border-red-500 border-2 shadow-2xl animate-in zoom-in-95 duration-200">
                  <CardHeader className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 flex flex-row items-center gap-3 border-b border-red-100 dark:border-red-900/30">
                    <AlertTriangle className="h-7 w-7" />
                    <div>
                      <CardTitle className="text-lg">CẢNH BÁO AN TOÀN DƯỢC PHẨM (LASA ALERT)</CardTitle>
                      <p className="text-xs text-red-500/80">Tránh nhầm lẫn hoạt chất & hàm lượng thuốc</p>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    <div className="space-y-2">
                      <p className="text-sm">
                        Bạn vừa thêm thuốc: <strong className="text-base text-primary font-semibold">{pendingMedicine.name}</strong>
                      </p>
                      <div className="p-4 bg-amber-50 dark:bg-amber-950/15 border border-amber-200 dark:border-amber-900/30 rounded-lg space-y-2">
                        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                          ⚠️ Đối chứng thuốc tương tự (LASA):
                        </p>
                        <p className="text-sm text-amber-700 dark:text-amber-400 font-mono">
                          {pendingMedicine.laserEquivalent}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t">
                      <Button variant="outline" onClick={() => { setShowLasaAlert(false); setPendingMedicine(null); }}>
                        Hủy thêm
                      </Button>
                      <Button variant="danger" onClick={() => {
                        setShowLasaAlert(false);
                        const med = pendingMedicine;
                        setPendingMedicine(null);
                        addToCart(med);
                      }}>
                        <ShieldCheck className="h-4 w-4 mr-2" />
                        Tôi đã đối soát - Đồng ý thêm
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {isAdminOrChainManager && !selectedBranchId ? (
              <Card className="border-dashed border-2 border-primary/30 flex flex-col items-center justify-center p-12 text-center bg-card/40 backdrop-blur-md min-h-[400px]">
                <Store className="h-16 w-16 text-primary/40 mb-4 animate-bounce" />
                <h3 className="text-lg font-semibold text-primary">Vui lòng chọn Chi nhánh bán hàng</h3>
                <p className="text-sm text-muted-foreground max-w-sm mt-2 leading-relaxed">
                  Vì bạn đang đăng nhập dưới quyền quản trị viên cấp cao (**{user?.role === 'ROLE_ADMIN' ? 'Quản trị viên' : 'Quản lý chuỗi'}**), hệ thống yêu cầu xác định chi nhánh đứng quầy để đối soát chính xác tồn kho thực tế.
                </p>
                <div className="mt-6 flex items-center gap-2">
                  <span className="text-sm font-semibold text-muted-foreground">Đang đứng bán tại:</span>
                  <select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="px-3 py-2 bg-background border border-input rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer min-w-[220px] shadow-sm"
                  >
                    <option value="">-- Chọn Chi Nhánh --</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Tìm kiếm sản phẩm nhanh</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Quét mã vạch thuốc hoặc gõ tìm kiếm..."
                          value={barcode}
                          onChange={(e) => setBarcode(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleBarcodeSearch()}
                          className="pl-10"
                        />
                      </div>
                      <Button onClick={handleBarcodeSearch}>Tìm kiếm</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-3">
                      <span>Thuốc bán chạy phổ biến</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void loadAvailableMedicines()}
                        disabled={isMedicinesLoading}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${isMedicinesLoading ? 'animate-spin' : ''}`} />
                        Tải lại tồn kho
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isMedicinesLoading ? (
                      <div className="h-36 border border-dashed border-border rounded-lg flex flex-col items-center justify-center text-center p-4">
                        <RefreshCw className="h-6 w-6 animate-spin text-primary mb-3" />
                        <p className="font-medium">Đang tải tồn kho bán hàng...</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Hệ thống đang lấy thuốc còn hàng của chi nhánh hiện tại.
                        </p>
                      </div>
                    ) : medicinesError ? (
                      <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 text-amber-900 space-y-3">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold">Không tải được danh sách thuốc để bán</p>
                            <p className="text-sm mt-1">{medicinesError}</p>
                          </div>
                        </div>
                        <Button size="sm" onClick={() => void loadAvailableMedicines()}>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Thử tải lại
                        </Button>
                      </div>
                    ) : medicines.length === 0 ? (
                      <div className="h-36 border border-dashed border-border rounded-lg flex items-center justify-center text-muted-foreground text-center p-4">
                        Không có thuốc nào còn tồn kho để bán tại chi nhánh này.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        {medicines.map((medicine) => {
                          const selectedUnit = getSelectedSellUnit(medicine);

                          return (
                            <div
                              key={medicine.id}
                              className="p-4 border border-border rounded-lg bg-card text-left flex flex-col justify-between min-h-48"
                            >
                              <div className="space-y-2">
                                <div className="text-[11px] font-mono text-muted-foreground">{medicine.code}</div>
                                <div className="flex items-start justify-between gap-2 w-full">
                                  <p className="font-semibold text-sm line-clamp-2">{medicine.name}</p>
                                  {medicine.isPrescriptionRequired && (
                                    <Badge variant="warning" className="ml-2 shrink-0">Rx</Badge>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {medicine.isColdChain && <Badge variant="info">Lạnh</Badge>}
                                  {medicine.isSpecialControl && <Badge variant="danger">KSDB</Badge>}
                                </div>
                                <Select
                                  value={selectedUnit?.value || medicine.defaultSellUnit}
                                  onChange={(e) =>
                                    setSelectedSellUnits((prev) => ({
                                      ...prev,
                                      [medicine.id]: e.target.value,
                                    }))
                                  }
                                  options={medicine.sellUnits.map((option) => ({
                                    value: option.value,
                                    label: option.label,
                                  }))}
                                />
                              </div>
                              <div className="mt-4 space-y-2">
                                <p className="text-xl font-bold">${selectedUnit?.price.toFixed(2)}</p>
                                <p className="text-xs text-muted-foreground">
                                  Tồn nguyên gói: {selectedUnit?.maxWholeUnits || 0} {selectedUnit?.label || ''}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Tồn cơ sở: {medicine.stock} {getUnitLabel(medicine.baseUnit)}
                                </p>
                                <Button
                                  type="button"
                                  className="w-full"
                                  onClick={() => addToCart(medicine, selectedUnit?.value)}
                                  disabled={!selectedUnit || selectedUnit.maxWholeUnits < 1}
                                >
                                  Thêm 1 {selectedUnit?.label || ''}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Right: Cart and Checkout with Strategy selection */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 justify-between">
                  <span className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Giỏ hàng ({cart.length})
                  </span>
                  {capturedImage && (
                    <Badge variant="success" className="flex items-center gap-1">
                      <Check className="h-3 w-3" /> Đã đính kèm ảnh toa
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {cart.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Chưa có sản phẩm nào</p>
                  ) : (
                    cart.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 bg-muted/40 rounded-lg space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-semibold text-sm">{item.name}</p>
                            {item.isPrescriptionRequired && (
                              <Badge variant="warning" className="text-[10px] mt-1">Thuốc kê đơn (Rx)</Badge>
                            )}
                            {item.selectedUnit && item.baseUnit && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {buildConversionSummary(
                                  item.quantity,
                                  item.selectedUnit,
                                  Number(item.baseQuantity ?? item.quantity),
                                  item.baseUnit
                                )}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-destructive hover:text-destructive/80"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 justify-between">
                          <div className="flex flex-col gap-2">
                            <Select
                              value={item.selectedUnit || item.baseUnit || ''}
                              onChange={(e) => updateCartItemUnit(item.id, e.target.value)}
                              options={(
                                medicines.find((medicine) => medicine.id === item.medicineId)?.sellUnits || []
                              ).map((option) => ({
                                value: option.value,
                                label: option.label,
                              }))}
                              className="h-8 text-xs"
                            />
                            <div className="flex items-center gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="h-7 w-7 p-0"
                              >
                                -
                              </Button>
                              <span className="w-12 text-center text-sm font-semibold">{item.quantity}</span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="h-7 w-7 p-0"
                              >
                                +
                              </Button>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-sm block">
                              ${(item.price * item.quantity).toFixed(2)}
                            </span>
                            {item.selectedUnit && (
                              <span className="text-xs text-muted-foreground">
                                {item.quantity} {getUnitLabel(item.selectedUnit)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Liều dùng, Tần suất, Thời gian */}
                        <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-dashed border-border/60">
                          <div>
                            <label className="text-[10px] text-muted-foreground block mb-0.5 font-medium">Liều dùng</label>
                            <input
                              type="text"
                              value={item.dosage || ''}
                              onChange={(e) => updateCartItemDosage(item.id, 'dosage', e.target.value)}
                              placeholder="1 viên"
                              className="w-full text-[11px] px-1.5 py-0.5 bg-background border border-input rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground block mb-0.5 font-medium">Tần suất</label>
                            <input
                              type="text"
                              value={item.frequency || ''}
                              onChange={(e) => updateCartItemDosage(item.id, 'frequency', e.target.value)}
                              placeholder="2 lần/ngày"
                              className="w-full text-[11px] px-1.5 py-0.5 bg-background border border-input rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground block mb-0.5 font-medium">Thời gian</label>
                            <input
                              type="text"
                              value={item.duration || ''}
                              onChange={(e) => updateCartItemDosage(item.id, 'duration', e.target.value)}
                              placeholder="7 ngày"
                              className="w-full text-[11px] px-1.5 py-0.5 bg-background border border-input rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cấu hình hóa đơn & Khuyến mãi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Customer Search & Select */}
                <div>
                  <label className="text-sm font-medium block mb-1.5">
                    <Users className="inline h-4 w-4 mr-1.5 text-muted-foreground" />
                    Khách hàng
                  </label>
                  {selectedCustomer ? (
                    <div className="flex items-center gap-2 p-2.5 bg-primary/5 border border-primary/20 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{selectedCustomer.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground font-mono">{selectedCustomer.code}</span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">{selectedCustomer.phone}</span>
                          <Badge variant={
                            selectedCustomer.membershipTier === 'platinum' ? 'success' :
                            selectedCustomer.membershipTier === 'gold' ? 'warning' :
                            selectedCustomer.membershipTier === 'silver' ? 'info' : 'default'
                          } className="text-[10px]">
                            {selectedCustomer.membershipTier.toUpperCase()}
                          </Badge>
                          <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
                            {selectedCustomer.points.toLocaleString()} điểm
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearCustomer}
                        className="shrink-0 h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        onFocus={() => customerResults.length > 0 && setShowCustomerDropdown(true)}
                        placeholder="Tìm SĐT, tên hoặc mã KH..."
                        className="w-full text-sm pl-8 pr-9 py-2 bg-background border border-input rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                      {isCustomerSearching && (
                        <RefreshCw className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      )}

                      {showCustomerDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {customerResults.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => handleSelectCustomer(c)}
                              className="w-full text-left px-3 py-2 hover:bg-accent/50 flex items-center justify-between gap-2 border-b border-border/40 last:border-b-0"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{c.name}</p>
                                <p className="text-xs text-muted-foreground">{c.phone} • {c.code}</p>
                              </div>
                              <Badge variant={
                                c.membershipTier === 'platinum' ? 'success' :
                                c.membershipTier === 'gold' ? 'warning' :
                                c.membershipTier === 'silver' ? 'info' : 'default'
                              } className="text-[10px] shrink-0">
                                {c.membershipTier.toUpperCase()}
                              </Badge>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {!selectedCustomer && (
                    <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                      <span>Bỏ trống = Khách vãng lai</span>
                      <span className="text-border">|</span>
                      <button
                        type="button"
                        onClick={() => setIsCustomerPopupOpen(true)}
                        className="text-primary hover:underline inline-flex items-center gap-0.5"
                      >
                        <UserPlus className="h-3 w-3" /> Đăng ký mới
                      </button>
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="Mã toa (Tùy chọn)"
                    placeholder="Số đơn thuốc"
                    value={prescriptionId}
                    onChange={(e) => setPrescriptionId(e.target.value)}
                  />
                  <Select
                    label="Thanh toán"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    options={[
                      { value: 'cash', label: 'Tiền mặt' },
                      { value: 'card', label: 'Thẻ ATM' },
                      { value: 'transfer', label: 'Chuyển khoản' },
                    ]}
                  />
                </div>

                {/* Strategy Pattern Selection */}
                <Select
                  label="Chương trình Khuyến mãi (Strategy Pattern)"
                  value={promoType}
                  onChange={(e) => setPromoType(e.target.value)}
                  options={promotions.length > 0
                    ? promotions
                        .filter((p) => {
                          if (p.status !== 'active') return false;
                          if (p.targetBranch && p.targetBranch !== 'all' && p.targetBranch !== selectedBranchId) return false;
                          
                          // Date range validations
                          const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
                          if (p.startDate && todayStr < p.startDate) return false;
                          if (p.endDate && todayStr > p.endDate) return false;
                          
                          // Target group tier validations
                          if (p.targetGroup && p.targetGroup !== 'all') {
                            const allowedTiers = p.targetGroup.split(',').map((t: string) => t.trim().toLowerCase());
                            if (!allowedTiers.includes(customerTier.toLowerCase())) return false;
                          }
                          
                          return true;
                        })
                        .map((p) => ({
                          value: p.id,
                          label: p.id === 'default'
                            ? p.name
                            : p.type === 'percent' || p.type === 'percent_discount'
                            ? `${p.name} (${p.value}%)`
                            : p.type === 'fixed' || p.type === 'fixed_discount' || p.type === 'combo' || p.type === 'buy_gift' || p.type === 'category_voucher'
                            ? `${p.name} ($${p.value})`
                            : p.name
                        }))
                    : [
                        { value: 'default', label: 'VIP tích điểm thưởng mặc định' },
                        { value: 'percent_10', label: 'Chiết khấu 10% tổng hóa đơn' },
                        { value: 'fixed_20', label: 'Giảm thẳng $20 trực tiếp' },
                        { value: 'combo_para', label: 'Combo Paracetamol (Giảm thêm $5)' },
                        { value: 'vip_points', label: 'Nhân hệ số điểm VIP (Bạc/Vàng/Bạch Kim)' },
                      ]
                  }
                />

                {/* Hộp thông báo quà tặng khuyến mãi nếu đủ điều kiện */}
                {giftWarning && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/35 rounded-lg text-amber-700 dark:text-amber-300 text-xs font-semibold space-y-1.5 animate-pulse">
                    <p className="flex items-center gap-1.5">
                      <Gift className="h-4 w-4 text-amber-500 flex-shrink-0" />
                      <span>
                        Đơn hàng đủ điều kiện nhận quà: <strong>{giftWarning.eligibleQty} {giftWarning.giftUnit ? getUnitLabel(giftWarning.giftUnit) : ''} {giftWarning.giftName}</strong>!
                      </span>
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      (Hiện có {giftWarning.currentQty} trong giỏ, thiếu {giftWarning.missingQty})
                    </p>
                    <button
                      type="button"
                      onClick={() => addGiftToCart(giftWarning.giftMedId, giftWarning.missingQty, giftWarning.giftUnit)}
                      className="w-full text-center py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-[10px] font-bold transition-all shadow-sm flex items-center justify-center gap-1 mt-1 cursor-pointer"
                    >
                      <Plus className="h-3 w-3" /> Nhận tự động {giftWarning.missingQty} {giftWarning.giftUnit ? getUnitLabel(giftWarning.giftUnit) : 'sản phẩm'} quà tặng
                    </button>
                  </div>
                )}

                {/* Prescription photo capturing actions */}
                {cart.some((item) => item.isPrescriptionRequired) && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-lg space-y-2">
                    <p className="text-xs text-amber-800 dark:text-amber-300 font-semibold flex items-center gap-1">
                      ⚠️ TOA THUỐC RX (ĐANG YÊU CẦU MÁY ẢNH VẬT LÝ)
                    </p>
                    {capturedImage && (
                      <div className="w-full h-20 bg-slate-900 rounded overflow-hidden flex items-center justify-center border border-border relative">
                        <img src={capturedImage} alt="Captured Prescription" className="w-full h-full object-cover opacity-60" />
                        <span className="absolute text-white font-mono text-[10px] font-bold tracking-wider bg-black/45 px-2 py-0.5 rounded">
                          TOA_THUOC_DA_LUU.JPG
                        </span>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => {
                        const hasRx = cart.find(i => i.isPrescriptionRequired);
                        if (hasRx) {
                          setPendingMedicine(medicines.find(m => m.id === hasRx.medicineId) || null);
                          setShowRxModal(true);
                        }
                      }}>
                        <Camera className="h-3 w-3 mr-1.5" />
                        {capturedImage ? 'Chụp lại ảnh toa' : 'Chụp ảnh toa'}
                      </Button>
                      <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="h-3 w-3 mr-1.5" />
                        Tải ảnh thực tế
                      </Button>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-border space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tạm tính:</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Chiết khấu (Khuyến mãi):</span>
                    <span className="text-destructive font-semibold">-${discountAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-b pb-2">
                    <span className="text-muted-foreground">Tích lũy điểm thưởng:</span>
                    <span className="text-primary font-semibold">+{rewardPoints} Điểm</span>
                  </div>
                  <div className="flex justify-between text-xl font-extrabold pt-2">
                    <span>Tổng cộng:</span>
                    <span className="text-primary">${Math.max(0, subtotal - discountAmount).toFixed(2)}</span>
                  </div>
                </div>

                <Button
                  className="w-full relative"
                  size="lg"
                  onClick={handleCheckout}
                  disabled={cart.length === 0 || isCheckingOut}
                >
                  {isCheckingOut ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Đang xử lý thanh toán...
                    </span>
                  ) : (
                    'Hoàn tất đơn hàng & xuất thuốc'
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />

      <Dialog open={isCustomerPopupOpen} onOpenChange={setIsCustomerPopupOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Thêm khách hàng mới</DialogTitle>
          </DialogHeader>
          <CustomerForm 
            onClose={() => setIsCustomerPopupOpen(false)} 
            onSuccess={() => {
              setIsCustomerPopupOpen(false);
              // Option 1: Trigger a customer search with the newly created customer if possible
              // For now, closing the popup is sufficient. The user can search the customer.
            }} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
