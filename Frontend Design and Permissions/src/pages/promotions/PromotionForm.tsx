import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Header } from '../../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { ArrowLeft, Save, Sparkles, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getTransactionUnitOptions } from '../../utils/medicineUnits';

interface MedicineOption {
  id: string;
  code: string;
  name: string;
  unit: string;
  unitConversions?: any[];
}

interface CategoryOption {
  id: string;
  code: string;
  name: string;
}

interface BranchOption {
  id: string;
  code: string;
  name: string;
}

export function PromotionForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  
  // Lists loaded from backend API
  const [medicines, setMedicines] = useState<MedicineOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);

  // Main Form fields
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('percent');
  const [value, setValue] = useState('0');
  const [status, setStatus] = useState('active');
  const [description, setDescription] = useState('');
  const [targetBranch, setTargetBranch] = useState('all');
  const [targetGroup, setTargetGroup] = useState('all');
  const [selectedTiers, setSelectedTiers] = useState<string[]>(['normal', 'silver', 'gold', 'platinum']);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Conditional Configurations config states
  const [minOrderValue, setMinOrderValue] = useState('0');
  
  // Buy X Get Y (combo) config states
  const [buyMedicineId, setBuyMedicineId] = useState('');
  const [buyQuantity, setBuyQuantity] = useState('1');
  const [buyUnit, setBuyUnit] = useState('');
  const [giftMedicineId, setGiftMedicineId] = useState('');
  const [giftQuantity, setGiftQuantity] = useState('1');
  const [giftUnit, setGiftUnit] = useState('');

  // Loyalty point multipliers config states
  const [silverMultiplier, setSilverMultiplier] = useState('1.2');
  const [goldMultiplier, setGoldMultiplier] = useState('1.5');
  const [platinumMultiplier, setPlatinumMultiplier] = useState('2.0');

  // Category voucher config states
  const [configCategoryId, setConfigCategoryId] = useState('');
  const [configDiscountType, setConfigDiscountType] = useState('percent');
  const [configDiscountValue, setConfigDiscountValue] = useState('0');

  // Auto-fill Code helper
  const handleGenerateCode = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const prefix = type.toUpperCase().slice(0, 3);
    setCode(`${prefix}${randomSuffix}`);
    toast.success('Đã sinh mã khuyến mãi ngẫu nhiên!');
  };

  // Fetch Master Data
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const token = localStorage.getItem('pharmacy_token');
        const headers = { Authorization: `Bearer ${token}` };

        // Fetch medicines
        const medRes = await fetch('http://localhost:3000/api/medicines', { headers });
        if (medRes.ok) {
          const data = await medRes.json();
          setMedicines(data);
        }

        // Fetch categories
        const catRes = await fetch('http://localhost:3000/api/categories', { headers });
        if (catRes.ok) {
          const data = await catRes.json();
          setCategories(data);
        }

        // Fetch branches
        const brRes = await fetch('http://localhost:3000/api/branches', { headers });
        if (brRes.ok) {
          const data = await brRes.json();
          setBranches(data);
        }
      } catch (err) {
        console.error('Error fetching master data:', err);
      }
    };

    void fetchMasterData();
  }, []);

  // Fetch Promotion details if Edit Mode
  useEffect(() => {
    if (!isEdit) return;

    const fetchPromoDetails = async () => {
      setFetching(true);
      try {
        const token = localStorage.getItem('pharmacy_token');
        const response = await fetch(`http://localhost:3000/api/promotions/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
          throw new Error('Không thể tải chi tiết chương trình khuyến mãi');
        }

        const promo = await response.json();
        setCode(promo.code);
        setName(promo.name);
        setType(promo.type);
        setValue(String(promo.value));
        setStatus(promo.status);
        setDescription(promo.description || '');
        setTargetBranch(promo.targetBranch || 'all');
        const groupValue = promo.targetGroup || 'all';
        setTargetGroup(groupValue);
        if (groupValue === 'all') {
          setSelectedTiers(['normal', 'silver', 'gold', 'platinum']);
        } else {
          setSelectedTiers(groupValue.split(',').map((t: string) => t.trim().toLowerCase()));
        }
        setStartDate(promo.startDate || '');
        setEndDate(promo.endDate || '');

        // Load configs
        if (promo.config) {
          const config = typeof promo.config === 'string' ? JSON.parse(promo.config) : promo.config;
          
          if (promo.type === 'percent' || promo.type === 'percent_discount' || promo.type === 'fixed' || promo.type === 'fixed_discount') {
            setMinOrderValue(String(config.minOrderValue || 0));
          } else if (promo.type === 'combo' || promo.type === 'buy_gift') {
            setBuyMedicineId(config.buyMedicineId || '');
            setBuyQuantity(String(config.buyQuantity || 1));
            setBuyUnit(config.buyUnit || '');
            setGiftMedicineId(config.giftMedicineId || '');
            setGiftQuantity(String(config.giftQuantity || 1));
            setGiftUnit(config.giftUnit || '');
          } else if (promo.type === 'loyalty' || promo.type === 'loyalty_points') {
            setSilverMultiplier(String(config.silverMultiplier || 1.2));
            setGoldMultiplier(String(config.goldMultiplier || 1.5));
            setPlatinumMultiplier(String(config.platinumMultiplier || 2.0));
          } else if (promo.type === 'category_voucher') {
            setConfigCategoryId(config.categoryId || '');
            setConfigDiscountType(config.discountType || 'percent');
            setConfigDiscountValue(String(config.discountValue || 0));
          }
        }
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Lỗi khi tải thông tin khuyến mãi.');
        navigate('/promotions');
      } finally {
        setFetching(false);
      }
    };

    void fetchPromoDetails();
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code.trim()) {
      toast.error('Vui lòng nhập hoặc tạo mã khuyến mãi.');
      return;
    }
    if (!name.trim()) {
      toast.error('Vui lòng điền tên chương trình khuyến mãi.');
      return;
    }

    setLoading(true);

    // Build configuration object depending on type
    let configObj: any = {};
    if (type === 'percent' || type === 'percent_discount' || type === 'fixed' || type === 'fixed_discount') {
      configObj.minOrderValue = parseFloat(minOrderValue) || 0;
      configObj.percent = type.startsWith('percent') ? parseFloat(value) : undefined;
      configObj.amount = type.startsWith('fixed') ? parseFloat(value) : undefined;
    } else if (type === 'combo' || type === 'buy_gift') {
      if (!buyMedicineId || !giftMedicineId) {
        toast.error('Vui lòng chọn thuốc mua và thuốc tặng cho chương trình combo.');
        setLoading(false);
        return;
      }
      configObj.buyMedicineId = buyMedicineId;
      configObj.buyQuantity = parseInt(buyQuantity, 10) || 1;
      configObj.buyUnit = buyUnit || undefined;
      configObj.giftMedicineId = giftMedicineId;
      configObj.giftQuantity = parseInt(giftQuantity, 10) || 1;
      configObj.giftUnit = giftUnit || undefined;
    } else if (type === 'loyalty' || type === 'loyalty_points') {
      configObj.silverMultiplier = parseFloat(silverMultiplier) || 1.2;
      configObj.goldMultiplier = parseFloat(goldMultiplier) || 1.5;
      configObj.platinumMultiplier = parseFloat(platinumMultiplier) || 2.0;
    } else if (type === 'category_voucher') {
      if (!configCategoryId) {
        toast.error('Vui lòng chọn nhóm hàng áp dụng voucher.');
        setLoading(false);
        return;
      }
      configObj.categoryId = configCategoryId;
      configObj.discountType = configDiscountType;
      configObj.discountValue = parseFloat(configDiscountValue) || 0;
    }

    const payload = {
      code: code.trim(),
      name: name.trim(),
      type,
      value: type === 'category_voucher' ? (parseFloat(configDiscountValue) || 0) : (parseFloat(value) || 0),
      status,
      description: description.trim(),
      targetBranch,
      targetGroup,
      startDate: startDate || null,
      endDate: endDate || null,
      config: JSON.stringify(configObj),
    };

    try {
      const token = localStorage.getItem('pharmacy_token');
      const url = isEdit ? `http://localhost:3000/api/promotions/${id}` : 'http://localhost:3000/api/promotions';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Lưu chương trình khuyến mãi thất bại.');
      }

      toast.success(isEdit ? 'Cập nhật chương trình khuyến mãi thành công!' : 'Tạo mới chương trình khuyến mãi thành công!');
      navigate('/promotions');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Lỗi kết nối máy chủ API!');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div>
        <Header title="Khuyến mãi" subtitle="Tải dữ liệu..." />
        <div className="p-6 flex items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
          <span className="text-muted-foreground ml-3 font-medium">Đang tải thông tin khuyến mãi...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title={isEdit ? 'Cập nhật chương trình khuyến mãi' : 'Tạo chương trình khuyến mãi mới'}
        subtitle="Thiết lập các điều kiện chiết khấu hóa đơn, tặng quà combo hoặc khuyến khích thành viên"
        actions={
          <Button variant="outline" onClick={() => navigate('/promotions')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại
          </Button>
        }
      />

      <div className="p-6 max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="bg-card border border-border shadow-sm">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Thông tin chung chương trình
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Input
                      label="Mã khuyến mãi"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="VD: KM_GIAM_GIA_10"
                      required
                      disabled={isEdit}
                    />
                  </div>
                  {!isEdit && (
                    <Button type="button" variant="outline" onClick={handleGenerateCode} className="h-10 shrink-0">
                      Tự sinh mã
                    </Button>
                  )}
                </div>

                <Input
                  label="Tên chương trình khuyến mãi"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Giảm giá ngày cuối tuần thứ bảy chủ nhật"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Loại hình khuyến mãi"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  options={[
                    { value: 'percent', label: 'Chiết khấu phần trăm (%) hóa đơn' },
                    { value: 'fixed', label: 'Khấu trừ tiền mặt cố định ($)' },
                    { value: 'combo', label: 'Combo Mua X Tặng Y (Quà tặng)' },
                    { value: 'loyalty', label: 'Nhân hệ số tích lũy điểm VIP' },
                    { value: 'category_voucher', label: 'Voucher áp dụng riêng cho Nhóm hàng' },
                  ]}
                  required
                />

                <Select
                  label="Trạng thái kích hoạt"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  options={[
                    { value: 'active', label: 'Đang hoạt động' },
                    { value: 'inactive', label: 'Tạm ngưng / Không hoạt động' },
                  ]}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Ngày bắt đầu hiệu lực"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="Chọn ngày bắt đầu (Bỏ trống = Không giới hạn)"
                />

                <Input
                  label="Ngày kết thúc hiệu lực"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="Chọn ngày kết thúc (Bỏ trống = Không giới hạn)"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Chi nhánh áp dụng"
                  value={targetBranch}
                  onChange={(e) => setTargetBranch(e.target.value)}
                  required
                >
                  <option value="all">Tất cả chi nhánh toàn chuỗi</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.code}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">
                  Nhóm đối tượng khách hàng áp dụng
                </label>
                <div className="flex flex-wrap gap-x-6 gap-y-2.5 p-3.5 rounded-lg border border-border bg-input-background">
                  <label className="flex items-center gap-2 text-sm font-medium cursor-pointer text-foreground">
                    <input
                      type="checkbox"
                      checked={targetGroup === 'all'}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setTargetGroup('all');
                          setSelectedTiers(['normal', 'silver', 'gold', 'platinum']);
                        } else {
                          setTargetGroup('normal,silver,gold,platinum');
                          setSelectedTiers(['normal', 'silver', 'gold', 'platinum']);
                        }
                      }}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
                    />
                    Tất cả đối tượng
                  </label>
                  
                  {[
                    { id: 'normal', name: 'Khách lẻ / Phổ thông' },
                    { id: 'silver', name: 'Thành viên Bạc' },
                    { id: 'gold', name: 'Thành viên Vàng' },
                    { id: 'platinum', name: 'Thành viên Bạch Kim' },
                  ].map((tier) => (
                    <label
                      key={tier.id}
                      className={`flex items-center gap-2 text-sm cursor-pointer text-foreground ${
                        targetGroup === 'all' ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={targetGroup === 'all' || selectedTiers.includes(tier.id)}
                        disabled={targetGroup === 'all'}
                        onChange={(e) => {
                          let nextTiers = [...selectedTiers];
                          if (e.target.checked) {
                            if (!nextTiers.includes(tier.id)) nextTiers.push(tier.id);
                          } else {
                            nextTiers = nextTiers.filter(t => t !== tier.id);
                          }
                          setSelectedTiers(nextTiers);
                          
                          if (nextTiers.length === 4) {
                            setTargetGroup('all');
                          } else {
                            setTargetGroup(nextTiers.join(','));
                          }
                        }}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
                      />
                      {tier.name}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-foreground">
                  Mô tả chi tiết nội dung ưu đãi
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Nhập nội dung hiển thị cho nhân viên bán hàng POS hiểu về điều kiện áp dụng chương trình..."
                  className="w-full min-h-[80px] p-3 rounded-lg border border-border bg-input-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </CardContent>
          </Card>

          {/* DYNAMIC CONFIGURATION BOX */}
          <Card className="bg-card border border-border shadow-sm">
            <CardHeader className="border-b border-border pb-4 bg-muted/40">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-indigo-500" />
                Cấu hình điều kiện & Giá trị ưu đãi riêng biệt
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              
              {/* Type: Percent Discount */}
              {(type === 'percent' || type === 'percent_discount') && (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 p-3 rounded-md">
                    Chiết khấu hóa đơn theo tỷ lệ %: Giảm giá tự động trên tổng giỏ hàng POS của đơn thuốc hoặc hóa đơn bán lẻ khi thỏa mãn giá trị giỏ hàng tối thiểu.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Tỷ lệ giảm giá (%)"
                      type="number"
                      min="1"
                      max="100"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder="Nhập phần trăm giảm, ví dụ: 10"
                      required
                    />
                    <Input
                      label="Giá trị đơn hàng tối thiểu để áp dụng ($)"
                      type="number"
                      min="0"
                      value={minOrderValue}
                      onChange={(e) => setMinOrderValue(e.target.value)}
                      placeholder="Ví dụ: 50 ($50 trở lên mới được giảm)"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Type: Fixed Discount */}
              {(type === 'fixed' || type === 'fixed_discount') && (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 p-3 rounded-md">
                    Khấu trừ số tiền mặt cố định: Trừ trực tiếp một khoản tiền cố định ra khỏi tổng hóa đơn thanh toán của khách hàng khi đơn hàng đạt mức chi tối thiểu.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Số tiền chiết khấu ($)"
                      type="number"
                      min="1"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder="Nhập số tiền giảm, ví dụ: 20"
                      required
                    />
                    <Input
                      label="Giá trị đơn hàng tối thiểu để áp dụng ($)"
                      type="number"
                      min="0"
                      value={minOrderValue}
                      onChange={(e) => setMinOrderValue(e.target.value)}
                      placeholder="Ví dụ: 100 (Hóa đơn trên $100 mới được giảm $20)"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Type: Combo / Buy X Get Y */}
              {(type === 'combo' || type === 'buy_gift') && (
                <div className="space-y-6">
                  <p className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 p-3 rounded-md">
                    Combo sản phẩm quà tặng: Khi khách hàng mua đủ số lượng X của mặt hàng A, hệ thống POS sẽ tự động áp dụng giảm trừ 100% (miễn phí) số lượng Y của mặt hàng B trong giỏ hàng.
                  </p>
                  
                  <div className="p-4 border border-border rounded-lg space-y-4">
                    <h4 className="text-sm font-semibold text-foreground border-b border-border pb-1.5">Mặt hàng mua chính (Mặt hàng A)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-1.5">
                        <Select
                          label="Chọn thuốc mua"
                          value={buyMedicineId}
                          onChange={(e) => {
                            const medId = e.target.value;
                            setBuyMedicineId(medId);
                            const med = medicines.find(m => m.id === medId);
                            if (med) {
                              const opts = getTransactionUnitOptions(med as any);
                              setBuyUnit(opts[0]?.value || med.unit);
                            } else {
                              setBuyUnit('');
                            }
                          }}
                          required
                        >
                          <option value="">-- Chọn thuốc --</option>
                          {medicines.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.code})
                            </option>
                          ))}
                        </Select>
                      </div>

                      <Input
                        label="Số lượng mua tối thiểu"
                        type="number"
                        min="1"
                        value={buyQuantity}
                        onChange={(e) => setBuyQuantity(e.target.value)}
                        required
                      />

                      {buyMedicineId ? (
                        <Select
                          label="Đơn vị tính quy đổi"
                          value={buyUnit}
                          onChange={(e) => setBuyUnit(e.target.value)}
                          required
                        >
                          <option value="">-- Chọn đơn vị --</option>
                          {(() => {
                            const med = medicines.find((m) => m.id === buyMedicineId);
                            if (!med) return null;
                            const options = getTransactionUnitOptions(med as any);
                            return options.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ));
                          })()}
                        </Select>
                      ) : (
                        <Input
                          label="Đơn vị tính quy đổi"
                          value=""
                          placeholder="Chọn thuốc trước"
                          disabled
                        />
                      )}
                    </div>
                  </div>

                  <div className="p-4 border border-border rounded-lg space-y-4">
                    <h4 className="text-sm font-semibold text-foreground border-b border-border pb-1.5">Mặt hàng quà tặng (Mặt hàng B - Miễn phí)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-1.5">
                        <Select
                          label="Chọn thuốc tặng"
                          value={giftMedicineId}
                          onChange={(e) => {
                            const medId = e.target.value;
                            setGiftMedicineId(medId);
                            const med = medicines.find(m => m.id === medId);
                            if (med) {
                              const opts = getTransactionUnitOptions(med as any);
                              setGiftUnit(opts[0]?.value || med.unit);
                            } else {
                              setGiftUnit('');
                            }
                          }}
                          required
                        >
                          <option value="">-- Chọn thuốc --</option>
                          {medicines.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.code})
                            </option>
                          ))}
                        </Select>
                      </div>

                      <Input
                        label="Số lượng tặng"
                        type="number"
                        min="1"
                        value={giftQuantity}
                        onChange={(e) => setGiftQuantity(e.target.value)}
                        required
                      />

                      {giftMedicineId ? (
                        <Select
                          label="Đơn vị tính quà tặng"
                          value={giftUnit}
                          onChange={(e) => setGiftUnit(e.target.value)}
                          required
                        >
                          <option value="">-- Chọn đơn vị --</option>
                          {(() => {
                            const med = medicines.find((m) => m.id === giftMedicineId);
                            if (!med) return null;
                            const options = getTransactionUnitOptions(med as any);
                            return options.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ));
                          })()}
                        </Select>
                      ) : (
                        <Input
                          label="Đơn vị tính quà tặng"
                          value=""
                          placeholder="Chọn thuốc trước"
                          disabled
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Type: Loyalty Multipliers */}
              {(type === 'loyalty' || type === 'loyalty_points') && (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300 p-3 rounded-md">
                    Nhân hệ số điểm thưởng tích lũy: Áp dụng các tỷ lệ tích điểm cao hơn cho từng thứ hạng thẻ thành viên VIP khi thanh toán hóa đơn.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Input
                      label="Điểm mặc định (Hệ số chung)"
                      type="number"
                      step="0.1"
                      min="1"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      required
                    />
                    <Input
                      label="Thành viên Bạc (x)"
                      type="number"
                      step="0.1"
                      min="1"
                      value={silverMultiplier}
                      onChange={(e) => setSilverMultiplier(e.target.value)}
                      required
                    />
                    <Input
                      label="Thành viên Vàng (x)"
                      type="number"
                      step="0.1"
                      min="1"
                      value={goldMultiplier}
                      onChange={(e) => setGoldMultiplier(e.target.value)}
                      required
                    />
                    <Input
                      label="Thành viên Bạch Kim (x)"
                      type="number"
                      step="0.1"
                      min="1"
                      value={platinumMultiplier}
                      onChange={(e) => setPlatinumMultiplier(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              {/* Type: Category Voucher */}
              {type === 'category_voucher' && (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300 p-3 rounded-md">
                    Voucher nhóm hàng: Chỉ giảm trừ giá trị cho các mặt hàng thuộc nhóm danh mục thuốc/sản phẩm được chỉ định trong giỏ hàng.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Select
                      label="Nhóm hàng (Danh mục thuốc)"
                      value={configCategoryId}
                      onChange={(e) => setConfigCategoryId(e.target.value)}
                      required
                    >
                      <option value="">-- Chọn danh mục --</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </Select>

                    <Select
                      label="Hình thức chiết khấu"
                      value={configDiscountType}
                      onChange={(e) => setConfigDiscountType(e.target.value)}
                      options={[
                        { value: 'percent', label: 'Theo phần trăm (%)' },
                        { value: 'fixed', label: 'Giảm số tiền cố định ($)' },
                      ]}
                      required
                    />

                    <Input
                      label="Giá trị chiết khấu"
                      type="number"
                      min="1"
                      value={configDiscountValue}
                      onChange={(e) => setConfigDiscountValue(e.target.value)}
                      placeholder="Nhập giá trị chiết khấu áp dụng"
                      required
                    />
                  </div>
                </div>
              )}

            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/promotions')}
              disabled={loading}
            >
              Hủy bỏ
            </Button>
            <Button type="submit" disabled={loading} className="flex items-center gap-2">
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isEdit ? 'Lưu cập nhật' : 'Khởi tạo chương trình'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
