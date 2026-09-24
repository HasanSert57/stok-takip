import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp, PrintQueueItem } from '../context/AppContext';
import { Product } from '../../shared/types';
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels';
import { formatTL } from '../utils/formatters';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { SearchableSelect, SearchableOption } from '../components/ui/SearchableSelect';
import {
  Printer,
  Grid,
  Sliders,
  Tag,
  Plus,
  Trash2,
  Building2,
  RotateCw,
  Layers,
  Sparkles,
  Check,
  AlertCircle,
  Scissors,
  ArrowDownToLine,
} from 'lucide-react';
import JsBarcode from 'jsbarcode';

// --- Preset Definitions ---
export interface LabelSheetPreset {
  id: string;
  name: string;
  cols: number;
  rows: number;
  widthMm: number;
  heightMm: number;
  marginTopMm: number;
  marginLeftMm: number;
  gapXMm: number;
  gapYMm: number;
  description: string;
}

export const PRESETS: LabelSheetPreset[] = [
  {
    id: 'EKSTRAFIX_5280_160',
    name: 'Ekstrafix 5280 - 160 Etiket (8 Sütun x 20 Satır - 22x12 mm)',
    cols: 8,
    rows: 20,
    widthMm: 22,
    heightMm: 12,
    marginTopMm: 10,
    marginLeftMm: 5,
    gapXMm: 2.5,
    gapYMm: 1.5,
    description: 'Standart A4 etiket tabakası (22x12 mm, 160 etiket/sayfa)',
  },
  {
    id: 'EKSTRAFIX_5280_80',
    name: 'Ekstrafix 5280 - 80 Etiket (8 Sütun x 10 Satır - 22x12 mm)',
    cols: 8,
    rows: 10,
    widthMm: 22,
    heightMm: 12,
    marginTopMm: 13,
    marginLeftMm: 9,
    gapXMm: 3,
    gapYMm: 3,
    description: 'Standart A4 etiket tabakası (22x12 mm, 80 etiket/sayfa)',
  },
  {
    id: 'A4_40_LABEL',
    name: 'Standart A4 4x10 (40 Etiket / Sayfa)',
    cols: 4,
    rows: 10,
    widthMm: 48.5,
    heightMm: 25.4,
    marginTopMm: 13,
    marginLeftMm: 7,
    gapXMm: 2.5,
    gapYMm: 2,
    description: 'Orta boy etiket tabakası (48.5 x 25.4 mm)',
  },
  {
    id: 'A4_24_LABEL',
    name: 'Standart A4 3x8 (24 Etiket / Sayfa)',
    cols: 3,
    rows: 8,
    widthMm: 70,
    heightMm: 36,
    marginTopMm: 10,
    marginLeftMm: 0,
    gapXMm: 0,
    gapYMm: 0,
    description: 'Büyük boy etiket tabakası (70 x 36 mm)',
  },
  {
    id: 'CUSTOM',
    name: 'Özel Şablon (Gelişmiş İnce Ayarlar)',
    cols: 8,
    rows: 20,
    widthMm: 22,
    heightMm: 12,
    marginTopMm: 10,
    marginLeftMm: 5,
    gapXMm: 2.5,
    gapYMm: 1.5,
    description: 'Kullanıcı tanımlı milimetre ölçüleri',
  },
];

// --- Barcode Tile Component ---
interface BarcodeTileProps {
  barcode: string;
  name: string;
  price: number;
  companyName?: string;
  companyPosition?: 'OFF' | 'TOP' | 'RIGHT_ROTATED';
  showPrice?: boolean;
  showName?: boolean;
  showBarcodeText?: boolean;
  widthMm: number;
  heightMm: number;
  paddingLeftRightMm?: number;
  paddingTopBottomMm?: number;
  barcodeScale?: number;
  isEmptySlot?: boolean;
}

const BarcodeTile: React.FC<BarcodeTileProps> = ({
  barcode,
  name,
  price,
  companyName = '',
  companyPosition = 'OFF',
  showPrice = true,
  showName = true,
  showBarcodeText = true,
  widthMm,
  heightMm,
  paddingLeftRightMm = 1,
  paddingTopBottomMm = 1,
  barcodeScale = 1.0,
  isEmptySlot = false,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (isEmptySlot || !svgRef.current || !barcode) return;

    const isSmall = widthMm < 30 || heightMm < 18;
    const baseWidth = isSmall ? 0.8 : 1.3;
    const barcodeWidth = baseWidth * barcodeScale;
    const barcodeHeight = isSmall ? (showPrice || showName ? 11 : 16) : 28;

    try {
      const isEan13 = barcode.length === 13;
      JsBarcode(svgRef.current, barcode, {
        format: isEan13 ? 'EAN13' : 'CODE128',
        width: barcodeWidth,
        height: barcodeHeight,
        displayValue: !isSmall && showBarcodeText,
        fontSize: isSmall ? 7 : 10,
        margin: 0,
      });
    } catch {
      JsBarcode(svgRef.current, barcode, {
        format: 'CODE128',
        width: barcodeWidth,
        height: barcodeHeight,
        displayValue: !isSmall && showBarcodeText,
        fontSize: isSmall ? 7 : 10,
        margin: 0,
      });
    }
  }, [barcode, widthMm, heightMm, showPrice, showName, showBarcodeText, barcodeScale, isEmptySlot]);

  if (isEmptySlot) {
    return (
      <div
        className="border border-dashed border-slate-300 bg-slate-100/60 rounded flex items-center justify-center text-[9px] font-mono text-slate-400 select-none print:border-none print:bg-transparent"
        style={{
          width: `${widthMm}mm`,
          height: `${heightMm}mm`,
          paddingLeft: `${paddingLeftRightMm}mm`,
          paddingRight: `${paddingLeftRightMm}mm`,
          paddingTop: `${paddingTopBottomMm}mm`,
          paddingBottom: `${paddingTopBottomMm}mm`,
          boxSizing: 'border-box',
        }}
      >
        <span className="print:hidden">BOŞ</span>
      </div>
    );
  }

  const isSmall = widthMm < 30 || heightMm < 18;

  return (
    <div
      className="border border-slate-900 bg-white rounded text-slate-900 flex flex-row items-center justify-between overflow-hidden relative break-inside-avoid print:border-slate-800"
      style={{
        width: `${widthMm}mm`,
        height: `${heightMm}mm`,
        paddingLeft: `${paddingLeftRightMm}mm`,
        paddingRight: `${paddingLeftRightMm}mm`,
        paddingTop: `${paddingTopBottomMm}mm`,
        paddingBottom: `${paddingTopBottomMm}mm`,
        boxSizing: 'border-box',
      }}
    >
      {/* Main Content (Name, Barcode, Price) */}
      <div className="flex-1 flex flex-col items-center justify-center overflow-hidden h-full text-center leading-tight">
        {companyPosition === 'TOP' && companyName && (
          <div className="font-extrabold text-[6.5px] tracking-tighter uppercase text-slate-700 truncate w-full">
            {companyName}
          </div>
        )}

        {showName && (
          <div className={`font-bold uppercase truncate w-full ${isSmall ? 'text-[6.5px]' : 'text-[9px]'}`}>
            {name}
          </div>
        )}

        <div className="flex items-center justify-center my-0.5 max-w-full overflow-hidden">
          <svg ref={svgRef} className="max-w-full"></svg>
        </div>

        {isSmall && showBarcodeText && (
          <div className="font-mono text-[6.5px] font-extrabold tracking-tighter text-slate-900 leading-none -mt-0.5">
            {barcode}
          </div>
        )}

        {showPrice && (
          <div className={`font-black text-slate-900 ${isSmall ? 'text-[7.5px]' : 'text-[11px]'}`}>
            {formatTL(price)}
          </div>
        )}
      </div>

      {/* Right Rotated Company Name Option */}
      {companyPosition === 'RIGHT_ROTATED' && companyName && (
        <div className="h-full flex items-center justify-center border-l border-slate-300 pl-0.5 ml-0.5 print:border-slate-800">
          <span
            className="font-extrabold text-[6.5px] uppercase tracking-tighter text-slate-900 whitespace-nowrap select-none"
            style={{
              writingMode: 'vertical-rl',
              textTransform: 'uppercase',
              letterSpacing: '-0.5px',
            }}
          >
            {companyName}
          </span>
        </div>
      )}
    </div>
  );
};

// --- Main Page Component ---
export const BarcodePage: React.FC = () => {
  const {
    refreshSignal,
    printQueue,
    addToPrintQueue,
    removeFromPrintQueue,
    updatePrintQueueQuantity,
    clearPrintQueue,
    showToast,
  } = useApp();

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [addQuantity, setAddQuantity] = useState<number>(1);

  // Layout & Presets
  const [selectedPresetId, setSelectedPresetId] = useState<string>('EKSTRAFIX_5280_160');
  const [activePreset, setActivePreset] = useState<LabelSheetPreset>(PRESETS[0]);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState<boolean>(false);

  // Custom Editable Measurements (mm)
  const [cols, setCols] = useState<number>(PRESETS[0].cols);
  const [rows, setRows] = useState<number>(PRESETS[0].rows);
  const [widthMm, setWidthMm] = useState<number>(PRESETS[0].widthMm);
  const [heightMm, setHeightMm] = useState<number>(PRESETS[0].heightMm);
  const [marginTopMm, setMarginTopMm] = useState<number>(PRESETS[0].marginTopMm);
  const [marginLeftMm, setMarginLeftMm] = useState<number>(PRESETS[0].marginLeftMm);
  const [gapXMm, setGapXMm] = useState<number>(PRESETS[0].gapXMm);
  const [gapYMm, setGapYMm] = useState<number>(PRESETS[0].gapYMm);

  // Internal Padding / Trimming (mm) & Scale
  const [paddingLeftRightMm, setPaddingLeftRightMm] = useState<number>(1);
  const [paddingTopBottomMm, setPaddingTopBottomMm] = useState<number>(1);
  const [barcodeScale, setBarcodeScale] = useState<number>(1.0);

  // Skip / Offset empty slots & rows
  const [skipOffset, setSkipOffset] = useState<number>(0);

  // Label Content Togglers
  const [companyName, setCompanyName] = useState<string>('KODHANEM');
  const [companyPosition, setCompanyPosition] = useState<'OFF' | 'TOP' | 'RIGHT_ROTATED'>('RIGHT_ROTATED');
  const [showPrice, setShowPrice] = useState<boolean>(true);
  const [showName, setShowName] = useState<boolean>(true);
  const [showBarcodeText, setShowBarcodeText] = useState<boolean>(true);

  // Fetch product list
  const fetchProducts = async () => {
    const res = await window.electronAPI.invoke(IPC_CHANNELS.PRODUCT_SEARCH, { query: '' });
    if (res.success && res.data) {
      setProducts(res.data);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [refreshSignal]);

  // Handle Preset Change
  const handlePresetSelect = (presetId: string) => {
    setSelectedPresetId(presetId);
    const found = PRESETS.find((p) => p.id === presetId) || PRESETS[0];
    setActivePreset(found);
    setCols(found.cols);
    setRows(found.rows);
    setWidthMm(found.widthMm);
    setHeightMm(found.heightMm);
    setMarginTopMm(found.marginTopMm);
    setMarginLeftMm(found.marginLeftMm);
    setGapXMm(found.gapXMm);
    setGapYMm(found.gapYMm);
  };

  // Add Product from Select Dropdown into Queue
  const handleAddSelectedToQueue = () => {
    if (!selectedProductId) {
      showToast('Lütfen sepet için bir ürün seçin', 'warning');
      return;
    }
    const prod = products.find((p) => p.id === selectedProductId);
    if (prod) {
      addToPrintQueue(prod, addQuantity);
    }
  };

  // Options for SearchableSelect
  const productOptions: SearchableOption[] = useMemo(() => {
    return products.map((p) => ({
      value: p.id,
      label: p.name,
      sublabel: p.category_name ? `${p.category_name} - ${formatTL(p.sale_price)}` : formatTL(p.sale_price),
      badge: p.barcode,
    }));
  }, [products]);

  // Flattened print queue list for label rendering
  const flattenedLabels = useMemo(() => {
    const list: Product[] = [];
    for (const item of printQueue) {
      for (let i = 0; i < item.quantity; i++) {
        list.push(item.product);
      }
    }
    return list;
  }, [printQueue]);

  // Page Calculations
  const labelsPerPage = cols * rows;
  const totalLabels = flattenedLabels.length;

  // Skip Rows helper
  const skippedRowsCount = Math.floor(skipOffset / cols);

  const handleSetSkipRows = (numRows: number) => {
    setSkipOffset(numRows * cols);
  };

  // Render pages data
  const pagesData = useMemo(() => {
    if (totalLabels === 0 && skipOffset === 0) return [];

    const pages: Array<Array<{ product: Product | null; isEmpty: boolean }>> = [];
    let currentLabelIdx = 0;

    // Page 1: Apply skipOffset
    const page1: Array<{ product: Product | null; isEmpty: boolean }> = [];
    for (let i = 0; i < labelsPerPage; i++) {
      if (i < skipOffset) {
        page1.push({ product: null, isEmpty: true });
      } else if (currentLabelIdx < totalLabels) {
        page1.push({ product: flattenedLabels[currentLabelIdx], isEmpty: false });
        currentLabelIdx++;
      } else {
        break;
      }
    }
    pages.push(page1);

    // Subsequent pages
    while (currentLabelIdx < totalLabels) {
      const page: Array<{ product: Product | null; isEmpty: boolean }> = [];
      for (let i = 0; i < labelsPerPage && currentLabelIdx < totalLabels; i++) {
        page.push({ product: flattenedLabels[currentLabelIdx], isEmpty: false });
        currentLabelIdx++;
      }
      pages.push(page);
    }

    return pages;
  }, [flattenedLabels, totalLabels, skipOffset, labelsPerPage]);

  const handlePrint = () => {
    if (totalLabels === 0) {
      showToast('Yazdırılacak ürün sepeti boş!', 'danger');
      return;
    }
    window.print();
  };

  return (
    <div className="space-y-6 max-w-6xl pb-12">
      {/* Print Specific CSS Overrides */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body * {
            visibility: hidden;
          }
          #printable-a4-area, #printable-a4-area * {
            visibility: visible;
          }
          #printable-a4-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm;
            margin: 0;
            padding: 0;
          }
          .a4-page {
            width: 210mm;
            height: 297mm;
            page-break-after: always;
            break-after: page;
            box-sizing: border-box;
            overflow: hidden;
            background: white !important;
          }
        }
      `}</style>

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Printer className="text-blue-600" size={22} />
            Gelişmiş A4 Barkod & Etiket Yazdırma Merkezi
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            A4 etiket tabakalarını israf etmeden, toplu veya tekli ürün barkodu tasarlayın ve yazdırın.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handlePrint}
            disabled={totalLabels === 0}
            size="lg"
            className="shadow-lg shadow-blue-600/20 font-bold"
          >
            <Printer size={18} /> Toplam ({totalLabels}) Etiketi Yazdır
          </Button>
        </div>
      </div>

      {/* Top Controls Grid: 1. Sepet Paneli, 2. Şablon & İnce Ayarlar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Queue / Print Cart (5 Cols) */}
        <Card className="lg:col-span-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <Layers size={18} className="text-blue-600" />
                <span>Yazdırılacak Ürün Sepeti</span>
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-extrabold">
                  {totalLabels} Etiket
                </span>
              </div>

              {printQueue.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearPrintQueue} className="text-rose-600 h-7 text-xs">
                  <Trash2 size={13} /> Sepeti Temizle
                </Button>
              )}
            </div>

            {/* Product Selector to Add to Queue (Stacked Vertical Layout) */}
            <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <label className="text-xs font-bold text-slate-700 block">Sepete Ürün Ekle</label>

              <div className="w-full">
                <SearchableSelect
                  placeholder="Ürün adı, barkod veya model ara..."
                  options={productOptions}
                  value={selectedProductId}
                  onChange={(val) => setSelectedProductId(Number(val) || null)}
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">Basılacak Adet:</span>
                  <Input
                    type="number"
                    min={1}
                    max={500}
                    value={addQuantity}
                    onChange={(e) => setAddQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 text-center font-bold"
                  />
                </div>

                <Button onClick={handleAddSelectedToQueue} variant="primary" className="gap-1.5 shadow-sm font-bold">
                  <Plus size={16} /> Sepete Ekle
                </Button>
              </div>
            </div>

            {/* Print Queue Items List */}
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {printQueue.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 space-y-2">
                  <AlertCircle size={28} className="mx-auto text-slate-300" />
                  <p>Sepette henüz ürün yok.</p>
                  <p className="text-[11px] text-slate-400">
                    Yukarıdaki kutudan seçip ekleyebilir veya <b>Ürünler</b> sayfasından tek tıkla gönderebilirsiniz.
                  </p>
                </div>
              ) : (
                printQueue.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200 shadow-sm text-xs"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="font-bold text-slate-800 truncate">{item.product.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                        <span>{item.product.barcode}</span>
                        <span>•</span>
                        <span className="text-emerald-600 font-bold">{formatTL(item.product.sale_price)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={500}
                        className="w-16 h-7 text-center font-bold"
                        value={item.quantity}
                        onChange={(e) =>
                          updatePrintQueueQuantity(item.product.id, parseInt(e.target.value) || 1)
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-rose-500 hover:text-rose-700"
                        onClick={() => removeFromPrintQueue(item.product.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between items-center">
            <span>Sayfa Başına Kapasite: <b>{labelsPerPage} Etiket</b></span>
            <span>Gereken Sayfa: <b>{pagesData.length || 1} A4 Tabakası</b></span>
          </div>
        </Card>

        {/* RIGHT COLUMN: Preset, Offset & Content Design (7 Cols) */}
        <Card className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <Sliders size={18} className="text-blue-600" />
              <span>A4 Kağıt Şablonu & Etiket Tasarımı</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            >
              {isAdvancedOpen ? 'İnce Ayarları Gizle' : 'Gelişmiş MM Ayarları'}
            </Button>
          </div>

          {/* Preset Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Select
                label="A4 Yapışkanlı Etiket Şablonu"
                value={selectedPresetId}
                onChange={(e) => handlePresetSelect(e.target.value)}
              >
                {PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
              <p className="text-[11px] text-blue-600 font-medium mt-1">
                {PRESETS.find((p) => p.id === selectedPresetId)?.description}
              </p>
            </div>
          </div>

          {/* Row Skipping & Offset Controls (A4 İsraf Önleme) */}
          <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <ArrowDownToLine size={15} className="text-amber-600" />
                <span>Kullanılmış A4 Kağıdı Satır/Etiket Atlama (İsraf Önleme)</span>
              </label>

              {skipOffset > 0 && (
                <button
                  type="button"
                  onClick={() => setSkipOffset(0)}
                  className="text-[11px] font-bold text-amber-700 hover:text-amber-900 underline"
                >
                  Sıfırla
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
              <div>
                <Input
                  label="Atlanacak Satır Sayısı"
                  type="number"
                  min={0}
                  max={rows - 1}
                  value={skippedRowsCount}
                  onChange={(e) => handleSetSkipRows(Math.max(0, parseInt(e.target.value) || 0))}
                />
              </div>

              <div>
                <Input
                  label="Veya Atlanacak Etiket Sayısı"
                  type="number"
                  min={0}
                  max={labelsPerPage - 1}
                  value={skipOffset}
                  onChange={(e) => setSkipOffset(Math.max(0, parseInt(e.target.value) || 0))}
                />
              </div>
            </div>
          </div>

          {/* Advanced MM Calibration & Padding Panel (Accordion) */}
          {isAdvancedOpen && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                <Sparkles size={14} className="text-amber-500" />
                <span>Milimetre (mm) İnce Kalibrasyon ve Kırma Ayarları</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <Input
                  label="Sütun Sayısı"
                  type="number"
                  value={cols}
                  onChange={(e) => setCols(Math.max(1, parseInt(e.target.value) || 1))}
                />
                <Input
                  label="Satır Sayısı (Max 30)"
                  type="number"
                  value={rows}
                  onChange={(e) => setRows(Math.max(1, parseInt(e.target.value) || 1))}
                />
                <Input
                  label="Etiket Genişlik (mm)"
                  type="number"
                  step="0.5"
                  value={widthMm}
                  onChange={(e) => setWidthMm(parseFloat(e.target.value) || 10)}
                />
                <Input
                  label="Etiket Yükseklik (mm)"
                  type="number"
                  step="0.5"
                  value={heightMm}
                  onChange={(e) => setHeightMm(parseFloat(e.target.value) || 10)}
                />

                <Input
                  label="Üst Boşluk (mm)"
                  type="number"
                  step="0.5"
                  value={marginTopMm}
                  onChange={(e) => setMarginTopMm(parseFloat(e.target.value) || 0)}
                />
                <Input
                  label="Sol Boşluk (mm)"
                  type="number"
                  step="0.5"
                  value={marginLeftMm}
                  onChange={(e) => setMarginLeftMm(parseFloat(e.target.value) || 0)}
                />
                <Input
                  label="Yatay Aralık (mm)"
                  type="number"
                  step="0.5"
                  value={gapXMm}
                  onChange={(e) => setGapXMm(parseFloat(e.target.value) || 0)}
                />
                <Input
                  label="Dikey Aralık (mm)"
                  type="number"
                  step="0.5"
                  value={gapYMm}
                  onChange={(e) => setGapYMm(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="pt-2 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <Input
                  label="Etiket İçi Sağ/Sol Kırma (Padding mm)"
                  type="number"
                  step="0.5"
                  value={paddingLeftRightMm}
                  onChange={(e) => setPaddingLeftRightMm(parseFloat(e.target.value) || 0)}
                />
                <Input
                  label="Etiket İçi Üst/Alt Kırma (Padding mm)"
                  type="number"
                  step="0.5"
                  value={paddingTopBottomMm}
                  onChange={(e) => setPaddingTopBottomMm(parseFloat(e.target.value) || 0)}
                />
                <Input
                  label="Barkod Çizgi Genişlik Ölçeği"
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="2.0"
                  value={barcodeScale}
                  onChange={(e) => setBarcodeScale(parseFloat(e.target.value) || 1.0)}
                />
              </div>
            </div>
          )}

          {/* Label Content Toggles & Company Name Settings */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="text-xs font-bold text-slate-800">Etiket İçerik ve Görünüm Seçenekleri</div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <Input
                  label="Firma / Şirket Adı"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Örn: KODHANEM"
                />
              </div>

              <div>
                <Select
                  label="Şirket Adı Konumu"
                  value={companyPosition}
                  onChange={(e) => setCompanyPosition(e.target.value as any)}
                >
                  <option value="OFF">Gösterme (Kapalı)</option>
                  <option value="RIGHT_ROTATED">Sağ Kenarda Dik (90° Dikey)</option>
                  <option value="TOP">Üstte Yatay</option>
                </Select>
              </div>

              <div className="flex gap-4 items-center pb-2 flex-wrap">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showBarcodeText}
                    onChange={(e) => setShowBarcodeText(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <span>Barkod Numarası Göster</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showPrice}
                    onChange={(e) => setShowPrice(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <span>Fiyat Göster</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showName}
                    onChange={(e) => setShowName(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <span>Ürün Adı Göster</span>
                </label>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Printable Workspace & Live Screen Preview */}
      <Card className="flex flex-col items-center gap-6 p-6 bg-slate-100 border-2 border-dashed border-slate-300">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full border-b border-slate-200 pb-3 gap-2">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
            <Grid size={18} className="text-blue-600" />
            <span>
              A4 Sayfası Baskı Önizlemesi ({pagesData.length} Sayfa / Sayfa Başına {labelsPerPage} Etiket)
            </span>
          </div>

          <Button
            onClick={handlePrint}
            disabled={totalLabels === 0}
            size="lg"
            className="shadow-lg shadow-blue-600/20 font-bold"
          >
            <Printer size={18} /> Toplam ({totalLabels}) Etiketi Yazdır
          </Button>
        </div>

        {/* Printable Area Wrapper */}
        <div id="printable-a4-area" className="w-full flex flex-col items-center gap-8">
          {pagesData.length === 0 ? (
            <div className="bg-white p-12 rounded-lg border border-slate-300 shadow-md text-center text-slate-400 space-y-2">
              <Grid size={40} className="mx-auto text-slate-300" />
              <p className="font-bold text-slate-600 text-sm">Baskı Önizlemesi Boş</p>
              <p className="text-xs">Yazdırılacak ürün sepetine ürün eklediğinizde A4 sayfa düzeni burada canlı görünecektir.</p>
            </div>
          ) : (
            pagesData.map((pageItems, pageIdx) => (
              <div key={pageIdx} className="space-y-1 flex flex-col items-center">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest print:hidden">
                  A4 SAYFA #{pageIdx + 1} ({cols} x {rows} = {labelsPerPage} etiket)
                </div>

                {/* Physical A4 Sheet Container (210mm x 297mm) */}
                <div
                  className="a4-page bg-white border border-slate-300 rounded shadow-2xl print:border-none print:shadow-none print:rounded-none relative overflow-hidden"
                  style={{
                    width: '210mm',
                    height: '297mm',
                    boxSizing: 'border-box',
                  }}
                >
                  {/* CSS Grid Layer matching exact mm settings */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${cols}, ${widthMm}mm)`,
                      gridAutoRows: `${heightMm}mm`,
                      columnGap: `${gapXMm}mm`,
                      rowGap: `${gapYMm}mm`,
                      paddingTop: `${marginTopMm}mm`,
                      paddingLeft: `${marginLeftMm}mm`,
                      boxSizing: 'border-box',
                    }}
                  >
                    {pageItems.map((slot, slotIdx) => (
                      <BarcodeTile
                        key={slotIdx}
                        barcode={slot.product?.barcode || ''}
                        name={slot.product?.name || ''}
                        price={slot.product?.sale_price || 0}
                        companyName={companyName}
                        companyPosition={companyPosition}
                        showPrice={showPrice}
                        showName={showName}
                        showBarcodeText={showBarcodeText}
                        widthMm={widthMm}
                        heightMm={heightMm}
                        paddingLeftRightMm={paddingLeftRightMm}
                        paddingTopBottomMm={paddingTopBottomMm}
                        barcodeScale={barcodeScale}
                        isEmptySlot={slot.isEmpty || !slot.product}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};
