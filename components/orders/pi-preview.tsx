import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Edit3, Search, ChevronDown, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from '@/components/ui/combobox';

interface PIPreviewProps {
  data: {
    code?: string;
    date?: string;
    vendorCode?: string;
    customerPO?: string;
    customer?: {
      name?: string;
      address?: string;
      taxId?: string;
    };
    items: Array<{
      partNumber?: string;
      name?: string;
      hsCode?: string;
      quantity: number;
      unit: string;
      unitPrice: number;
      amount: number;
    }>;
    totalAmount: number;
    currency: string;
    terms?: {
      payment?: string;
      incoterm?: string;
      origin?: string;
      destination?: string;
      pol?: string;
      pod?: string;
      shipmentMode?: string;
      deliveryTime?: string;
    };
    bankInfo?: string[];
  };
  onUpdateItem?: (index: number, field: string, value: any) => void;
  onUpdateBankLine?: (index: number, value: string) => void;
  onAddBankLine?: () => void;
  onRemoveBankLine?: (index: number) => void;
  onSetBankLines?: (lines: string[]) => void;
  onUpdateField?: (field: string, value: any) => void;
  onAddProduct?: () => void;
  onSelectProduct?: () => void;
  onRemoveItem?: (index: number) => void;
  selectOptions?: {
    [key: string]: Array<{ label: string; value: string; items?: string[] }>;
  };
  className?: string;
}

export const PIPreview: React.FC<PIPreviewProps> = ({
  data,
  onUpdateItem,
  onUpdateBankLine,
  onAddBankLine,
  onRemoveBankLine,
  onSetBankLines,
  onUpdateField,
  onAddProduct,
  onSelectProduct,
  onRemoveItem,
  selectOptions = {},
  className
}) => {
  const currencySymbol = data.currency === 'EUR' ? '€' : data.currency === 'CNY' ? '¥' : '$';

  const EditableText = ({
    value,
    onChange,
    className,
    type = "text"
  }: {
    value: any,
    onChange: (val: any) => void,
    className?: string,
    type?: string
  }) => {
    // Normalize undefined/null to empty string to avoid uncontrolled→controlled warning
    const safeValue = value ?? '';
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState<string>(String(safeValue));

    if (isEditing) {
      return (
        <input
          type={type}
          autoFocus
          className={cn("w-full border-b border-blue-500 outline-none bg-blue-50/50 px-1 py-0.5 text-inherit rounded-t", className)}
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onBlur={() => {
            setIsEditing(false);
            onChange(type === "number" ? parseFloat(tempValue) || 0 : tempValue);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setIsEditing(false);
              onChange(type === "number" ? parseFloat(tempValue) || 0 : tempValue);
            }
          }}
        />
      );
    }

    return (
      <div
        className={cn("cursor-pointer hover:bg-blue-50 hover:text-blue-700 transition-colors rounded px-1 -mx-1 border border-transparent hover:border-blue-200", className)}
        onClick={() => {
          setTempValue(String(safeValue));
          setIsEditing(true);
        }}
      >
        {safeValue || <span className="text-slate-300 italic">—</span>}
      </div>
    );
  };

  return (
    <div className={cn(
      "w-[210mm] min-h-[297mm] bg-white shadow-2xl p-[15mm] mx-auto text-[11px] font-sans text-slate-800 flex flex-col relative",
      className
    )} style={{ height: 'auto' }}>
      {/* Header (Fixed) */}
      <div className="flex justify-between items-start border-b border-slate-200 pb-4 mb-6">
        <div>
          <div className="text-2xl font-bold text-orange-600 tracking-tighter mb-1 italic">ALUSTARS</div>
          <div className="text-[12px] font-medium">Chongqing Alustars International Co.,Ltd.</div>
          <div className="text-slate-500">VAT 91500109MADTT20C92</div>
          <div className="text-orange-500 font-medium">www.alustars.com</div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-slate-900 mb-4 uppercase tracking-tight">Proforma Invoice</div>
          <div className="grid grid-cols-[100px_1fr] gap-x-2 text-[10px]">
            <span className="text-slate-500">Supplier ID:</span>
            <EditableText value={data.vendorCode} onChange={(val) => onUpdateField?.('vendorCode', val)} className="font-medium" />

            <span className="text-slate-500">PO No.:</span>
            <EditableText value={data.customerPO} onChange={(val) => onUpdateField?.('customerPO', val)} className="font-medium" />

            <span className="text-slate-500">Invoice No.:</span>
            <EditableText value={data.code} onChange={(val) => onUpdateField?.('code', val)} className="font-medium text-blue-600" />

            <span className="text-slate-500">Date:</span>
            <span className="font-medium">{data.date ? format(new Date(data.date), 'MMM dd, yyyy') : format(new Date(), 'MMM dd, yyyy')}</span>

            <span className="text-slate-500">Currency:</span>
            <Select value={data.currency || 'USD'} onValueChange={(val) => onUpdateField?.('currency', val)}>
              <SelectTrigger className="h-5 text-[10px] border-dashed border-slate-200 bg-slate-50 w-28 px-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(selectOptions?.currencies || [
                  { label: 'USD - $', value: 'USD' },
                  { label: 'EUR - €', value: 'EUR' },
                  { label: 'CNY - ¥', value: 'CNY' },
                ]).map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* TO Section */}
      <div className="mb-6 grid grid-cols-[40px_1fr] gap-y-1">
        <span className="font-bold">TO:</span>
        <span className="font-bold">{data.customer?.name || 'Please select a customer'}</span>
        <span className="text-slate-500">Add.</span>
        <span>{data.customer?.address || '-'}</span>
        <span className="text-slate-500">NIF:</span>
        <span>{data.customer?.taxId || '-'}</span>
      </div>

      {/* Items Table */}
      <div className="flex-grow">
        <div className="flex justify-between items-end mb-4">
          <h3 className="text-blue-600 font-black uppercase tracking-[0.2em] text-[10px] flex items-center gap-2">
            <Package className="h-3 w-3" />
            Product Details
          </h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-[10px] font-bold uppercase tracking-widest border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
              onClick={onSelectProduct}
            >
              <Search className="h-3.5 w-3.5 mr-2" /> Select Catalog
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-[10px] font-bold uppercase tracking-widest border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
              onClick={onAddProduct}
            >
              <Plus className="h-3.5 w-3.5 mr-2" /> New Entry
            </Button>
          </div>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase text-[9px] tracking-wider border-y border-slate-200">
              <th className="py-2 px-1 text-left w-8">No.</th>
              <th className="py-2 px-1 text-left w-32">Part Number</th>
              <th className="py-2 px-1 text-left">Description</th>
              <th className="py-2 px-1 text-center w-16">Quantity</th>
              <th className="py-2 px-1 text-center w-12">Unit</th>
              <th className="py-2 px-1 text-right w-24">Unit Price</th>
              <th className="py-2 px-1 text-right w-24 flex items-center justify-end gap-2 pr-2">
                <span>Amount</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.items.length > 0 ? data.items.map((item, index) => (
              <tr key={index} className="group hover:bg-slate-50/50">
                <td className="py-3 px-1 align-top relative">
                  {index + 1}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 text-red-400 absolute -left-6 top-3 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onRemoveItem?.(index)}
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </Button>
                </td>
                <td className="py-3 px-1 align-top font-medium">
                  <EditableText value={item.partNumber} onChange={(val) => onUpdateItem?.(index, 'productCode', val)} />
                </td>
                <td className="py-3 px-1 align-top">
                  <EditableText value={item.name} onChange={(val) => onUpdateItem?.(index, 'productName', val)} className="font-medium" />
                  {item.hsCode && (
                    <div className="flex items-center gap-1 text-[9px] text-slate-400">
                      <span>HS code:</span>
                      <EditableText value={item.hsCode} onChange={(val) => onUpdateItem?.(index, 'hsCode', val)} />
                    </div>
                  )}
                </td>
                <td className="py-3 px-1 align-top text-center">
                  <EditableText
                    value={item.quantity}
                    type="number"
                    onChange={(val) => onUpdateItem?.(index, 'quantity', val)}
                    className="text-center"
                  />
                </td>
                <td className="py-3 px-1 align-top text-center">
                  <EditableText value={item.unit} onChange={(val) => onUpdateItem?.(index, 'unit', val)} className="text-center" />
                </td>
                <td className="py-3 px-1 align-top text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span>{currencySymbol}</span>
                    <EditableText
                      value={item.unitPrice.toFixed(2)}
                      type="number"
                      onChange={(val) => onUpdateItem?.(index, 'unitPrice', val)}
                      className="text-right"
                    />
                  </div>
                </td>
                <td className="py-3 px-1 align-top text-right font-medium">
                  {currencySymbol} {item.amount.toFixed(2)}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-300 italic font-medium">
                  No items added yet.
                  <div className="mt-2 flex justify-center gap-4">
                    <Button variant="outline" size="sm" className="h-7 text-[9px] uppercase tracking-widest border-dashed" onClick={onSelectProduct}>
                      <Search className="h-3 w-3 mr-2" /> Select Catalog
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-[9px] uppercase tracking-widest border-dashed" onClick={onAddProduct}>
                      <Plus className="h-3 w-3 mr-2" /> New Entry
                    </Button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-900">
              <td colSpan={6} className="py-4 text-right font-bold uppercase tracking-tight text-slate-500">Total</td>
              <td className="py-4 text-right font-bold text-lg text-slate-900">{data.currency} {data.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Terms and Conditions (Partially Editable) */}
      <div className="mt-8 border-t border-slate-100 pt-6">
        <h3 className="text-blue-600 font-bold mb-3 uppercase tracking-wide text-[10px] flex items-center gap-2">
          Terms and Conditions
          <span className="text-[8px] font-normal text-slate-400 uppercase tracking-normal">(Click to edit or use dropdown)</span>
        </h3>
        <div className="grid grid-cols-[140px_1fr_120px] gap-y-2 gap-x-4">
          <span className="text-slate-500">Payment Term:</span>
          <EditableText value={data.terms?.payment} onChange={(val) => onUpdateField?.('paymentTerms', val)} className="font-medium" />
          <Select value={data.terms?.payment || ''} onValueChange={(val) => onUpdateField?.('paymentTerms', val)}>
            <SelectTrigger className="h-6 text-[10px] border-dashed border-slate-200 bg-slate-50">
              <SelectValue placeholder="选择" />
            </SelectTrigger>
            <SelectContent>
              {selectOptions.paymentTerms?.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-slate-500">Price Term:</span>
          <EditableText value={data.terms?.incoterm} onChange={(val) => onUpdateField?.('incoterm', val)} className="font-medium" />
          <Select value={data.terms?.incoterm || ''} onValueChange={(val) => onUpdateField?.('incoterm', val)}>
            <SelectTrigger className="h-6 text-[10px] border-dashed border-slate-200 bg-slate-50">
              <SelectValue placeholder="选择" />
            </SelectTrigger>
            <SelectContent>
              {selectOptions.incoterms?.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-slate-500">Country of Origin:</span>
          <EditableText value={data.terms?.origin} onChange={(val) => onUpdateField?.('countryOfOrigin', val)} />
          <Select value={data.terms?.origin || ''} onValueChange={(val) => onUpdateField?.('countryOfOrigin', val)}>
            <SelectTrigger className="h-6 text-[10px] border-dashed border-slate-200 bg-slate-50">
              <SelectValue placeholder="选择" />
            </SelectTrigger>
            <SelectContent>
              {selectOptions.countries?.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-slate-500">Country of Destination:</span>
          <EditableText value={data.terms?.destination} onChange={(val) => onUpdateField?.('countryOfDestination', val)} />
          <Select value={data.terms?.destination || ''} onValueChange={(val) => onUpdateField?.('countryOfDestination', val)}>
            <SelectTrigger className="h-6 text-[10px] border-dashed border-slate-200 bg-slate-50">
              <SelectValue placeholder="选择" />
            </SelectTrigger>
            <SelectContent>
              {selectOptions.countries?.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-slate-500">Port of Loading:</span>
          <EditableText value={data.terms?.pol} onChange={(val) => onUpdateField?.('portOfLoading', val)} />
          <Select value={data.terms?.pol || ''} onValueChange={(val) => onUpdateField?.('portOfLoading', val)}>
            <SelectTrigger className="h-6 text-[10px] border-dashed border-slate-200 bg-slate-50">
              <SelectValue placeholder="选择" />
            </SelectTrigger>
            <SelectContent>
              {selectOptions.ports?.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-slate-500">Port of Discharge:</span>
          <EditableText value={data.terms?.pod} onChange={(val) => onUpdateField?.('portOfDestination', val)} />
          <Select value={data.terms?.pod || ''} onValueChange={(val) => onUpdateField?.('portOfDestination', val)}>
            <SelectTrigger className="h-6 text-[10px] border-dashed border-slate-200 bg-slate-50">
              <SelectValue placeholder="选择" />
            </SelectTrigger>
            <SelectContent>
              {selectOptions.ports?.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-slate-500">Mode of Shipment:</span>
          <EditableText value={data.terms?.shipmentMode} onChange={(val) => onUpdateField?.('modeOfShipment', val)} />
          <Select value={data.terms?.shipmentMode || ''} onValueChange={(val) => onUpdateField?.('modeOfShipment', val)}>
            <SelectTrigger className="h-6 text-[10px] border-dashed border-slate-200 bg-slate-50">
              <SelectValue placeholder="选择" />
            </SelectTrigger>
            <SelectContent>
              {selectOptions.shipmentModes?.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-slate-500">Time of Delivery:</span>
          <EditableText value={data.terms?.deliveryTime} onChange={(val) => onUpdateField?.('estimatedShippingDate', val)} />
          <Select value={data.terms?.deliveryTime || ''} onValueChange={(val) => onUpdateField?.('estimatedShippingDate', val)}>
            <SelectTrigger className="h-6 text-[10px] border-dashed border-slate-200 bg-slate-50">
              <SelectValue placeholder="选择" />
            </SelectTrigger>
            <SelectContent>
              {selectOptions.deliveryTimes?.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Remittance Instructions (List Item Editing) */}
      <div className="mt-8 relative group/bank">
        <div className="mb-2">
          <Select onValueChange={(val) => {
            const template = selectOptions.bankAccounts?.find(t => t.value === val);
            if (template?.items && template.items.length > 0) {
              if (onSetBankLines) {
                // 如果有直接设置的方法，直接设置所有行
                onSetBankLines(template.items);
              } else {
                // 否则逐个添加和更新（兼容旧代码）
                onUpdateBankLine?.(0, template.items[0]);
                for (let i = 1; i < template.items.length; i++) {
                  onAddBankLine?.();
                  onUpdateBankLine?.(i, template.items[i]);
                }
              }
            }
          }}>
            <SelectTrigger className="w-fit h-7 px-3 border-dashed border-slate-200 bg-slate-50 hover:bg-blue-50 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
              <SelectValue placeholder="IMPORT BANK DETAILS" />
            </SelectTrigger>
            <SelectContent>
              {selectOptions.bankAccounts?.map((opt, idx) => (
                <SelectItem key={`${opt.value}-${idx}`} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <h3 className="text-blue-600 font-bold mb-3 uppercase tracking-wide text-[10px] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>Remittance Instructions</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-blue-600 hover:bg-blue-50 opacity-0 group-hover/bank:opacity-100 transition-opacity"
            onClick={onAddBankLine}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </h3>
        <table className="w-full border-collapse">

          <tbody className="divide-y divide-slate-100">
            {data.bankInfo && data.bankInfo.length > 0 ? data.bankInfo.map((line, i) => (
              <tr key={i} className="group hover:bg-slate-50/50">
                <td className="py-2 px-1 align-top relative">
                  {i + 1}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 text-red-400 absolute -left-6 top-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onRemoveBankLine?.(i)}
                  >
                    <Trash2 className="h-2 w-2" />
                  </Button>
                </td>
                <td className="py-2 px-1 align-top">
                  <EditableText
                    value={line}
                    onChange={(val) => onUpdateBankLine?.(i, val)}
                    className="text-[10px] bg-transparent hover:bg-white border-dashed"
                  />
                </td>
                <td></td>
              </tr>
            )) : (
              <tr>
                <td colSpan={3} className="py-4 text-center text-slate-300 italic text-[10px]">
                  No remittance instructions provided. Click + to add.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Signature (Fixed) */}
      <div className="mt-12 grid grid-cols-2 gap-8">
        <div>
          <h3 className="font-bold mb-8 italic text-slate-400">Signed by</h3>
          <div className="border-t border-slate-400 pt-3 w-56">
            <div className="font-bold text-slate-900">Carlos Feliu</div>
            <div className="text-[9px] text-slate-500 uppercase tracking-wider">VP of Business Development</div>
          </div>
        </div>
        <div className="flex justify-end items-end pb-2">
          <div className="w-24 h-24 border-2 border-dashed border-slate-200 rounded-full flex items-center justify-center text-[8px] text-slate-300 uppercase font-black text-center p-3 leading-tight">
            (Company Seal)
          </div>
        </div>
      </div>

      {/* Footer (Fixed) */}
      <div className="mt-auto pt-8 grid grid-cols-2 gap-12 text-[9px] text-slate-400 border-t border-slate-100">
        <div>
          <div className="font-bold text-orange-600 mb-2 uppercase tracking-widest">China Office</div>
          <div className="leading-relaxed">No.194, Jiarui Avenue, Beibei District, 400707 Chongqing, China</div>
          <div className="mt-1 font-medium text-slate-500">Tel: +86 15923354664 | Email: z.zela@alustars.com</div>
        </div>
        <div className="text-right">
          <div className="font-bold text-orange-600 mb-2 uppercase tracking-widest">Spain Office</div>
          <div className="leading-relaxed">Valencia 264 Principal, 08007 Barcelona, Spain</div>
          <div className="mt-1 font-medium text-slate-500">Tel: (+34) 607630594 | Email: c.feliu@alustars.com</div>
        </div>
      </div>
    </div>
  );
};
