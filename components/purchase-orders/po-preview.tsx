import React, { useState } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface POPreviewProps {
  data: {
    code?: string;
    date?: string;
    supplier?: {
      name?: string;
      address?: string;
      contact?: string;
    };
    items: Array<{
      partNumber?: string;
      name?: string;
      quantity: number;
      unit: string;
      unitPrice: number;
      amount: number;
    }>;
    totalAmount: number;
    currency: string;
    terms?: {
      payment?: string;
      delivery?: string;
    };
  };
  onUpdateItem?: (index: number, field: string, value: any) => void;
  onUpdateField?: (field: string, value: any) => void;
  className?: string;
}

export const POPreview: React.FC<POPreviewProps> = ({ 
  data, 
  onUpdateItem, 
  onUpdateField,
  className 
}) => {
  const currencySymbol = data.currency === 'CNY' ? '¥' : '$';

  // Inline edit component (Reused from PIPreview logic)
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
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value);

    if (isEditing) {
      return (
        <input
          type={type}
          autoFocus
          className={cn("border border-emerald-400 px-1 py-0.5 rounded outline-none w-full", className)}
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
        className={cn("cursor-pointer hover:bg-emerald-50 hover:text-emerald-700 transition-colors rounded px-1 -mx-1 border border-transparent hover:border-emerald-200", className)}
        onClick={() => {
          setTempValue(value);
          setIsEditing(true);
        }}
      >
        {value}
      </div>
    );
  };

  return (
    <div className={cn(
      "w-[210mm] min-h-[297mm] bg-white shadow-2xl p-[20mm] mx-auto text-[11px] font-sans text-slate-800 flex flex-col relative border border-slate-100",
      className
    )}>
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-emerald-600 pb-6 mb-8">
        <div>
          <div className="text-2xl font-black text-emerald-700 tracking-tighter mb-1 uppercase">Purchase Order</div>
          <div className="text-[12px] font-bold text-slate-900">Chongqing Alustars International Co.,Ltd.</div>
          <div className="text-slate-500">Address: No.194, Jiarui Avenue, Beibei District, Chongqing</div>
        </div>
        <div className="text-right">
          <div className="grid grid-cols-[100px_1fr] gap-x-2 text-[10px]">
            <span className="text-slate-500 uppercase font-bold">PO No.:</span>
            <span className="font-black text-emerald-600">{data.code || 'DRAFT'}</span>
            <span className="text-slate-500 uppercase font-bold">Date:</span>
            <span className="font-medium">{data.date ? format(new Date(data.date), 'MMM dd, yyyy') : format(new Date(), 'MMM dd, yyyy')}</span>
          </div>
        </div>
      </div>

      {/* Supplier Section */}
      <div className="mb-8 grid grid-cols-[80px_1fr] gap-y-2 bg-slate-50 p-4 rounded-lg border border-slate-100">
        <span className="font-bold text-emerald-700 uppercase tracking-widest text-[9px]">To:</span>
        <div className="font-bold text-sm text-slate-900">{data.supplier?.name || 'Please select a supplier'}</div>
        <span className="text-slate-500 uppercase font-bold text-[9px]">Address:</span>
        <span className="text-slate-600">{data.supplier?.address || '-'}</span>
        <span className="text-slate-500 uppercase font-bold text-[9px]">Contact:</span>
        <span className="text-slate-600">{data.supplier?.contact || '-'}</span>
      </div>

      {/* Items Table */}
      <div className="flex-grow">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-emerald-600 text-white uppercase text-[9px] tracking-widest">
              <th className="py-3 px-2 text-left w-10">No.</th>
              <th className="py-3 px-2 text-left w-32">Part Number</th>
              <th className="py-3 px-2 text-left">Description</th>
              <th className="py-3 px-2 text-center w-20">Quantity</th>
              <th className="py-3 px-2 text-center w-12">Unit</th>
              <th className="py-3 px-2 text-right w-24">Unit Price</th>
              <th className="py-3 px-2 text-right w-24">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 border-b border-slate-200">
            {data.items.length > 0 ? data.items.map((item, index) => (
              <tr key={index} className="group hover:bg-slate-50/50">
                <td className="py-4 px-2 align-top text-slate-400">{index + 1}</td>
                <td className="py-4 px-2 align-top font-bold text-slate-900">{item.partNumber || '-'}</td>
                <td className="py-4 px-2 align-top font-medium text-slate-700">{item.name || '-'}</td>
                <td className="py-4 px-2 align-top text-center font-bold">
                  <EditableText 
                    value={item.quantity} 
                    type="number"
                    onChange={(val) => onUpdateItem?.(index, 'quantity', val)} 
                    className="text-center"
                  />
                </td>
                <td className="py-4 px-2 align-top text-center text-slate-500">{item.unit}</td>
                <td className="py-4 px-2 align-top text-right font-bold">
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
                <td className="py-4 px-2 align-top text-right font-black text-slate-900">
                  {currencySymbol} {item.amount.toFixed(2)}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7} className="py-20 text-center text-slate-300 italic font-medium">No items added yet. Search products in the sidebar.</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50">
              <td colSpan={6} className="py-5 text-right font-black uppercase tracking-widest text-slate-500 pr-4">Total Amount</td>
              <td className="py-5 text-right font-black text-xl text-emerald-700">{data.currency} {data.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Conditions */}
      <div className="mt-12 border-t-2 border-slate-100 pt-8 grid grid-cols-2 gap-12">
        <div className="space-y-4">
            <h3 className="text-emerald-700 font-black uppercase tracking-widest text-[9px]">Terms & Conditions</h3>
            <div className="space-y-2">
                <div className="flex justify-between border-b border-slate-50 pb-1">
                    <span className="text-slate-400 font-bold uppercase text-[8px]">Payment:</span>
                    <EditableText value={data.terms?.payment || '30% Deposit, 70% Before Shipment'} onChange={(val) => onUpdateField?.('paymentTerms', val)} className="text-right font-medium" />
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-1">
                    <span className="text-slate-400 font-bold uppercase text-[8px]">Delivery:</span>
                    <EditableText value={data.terms?.delivery || '30 Days after order confirmed'} onChange={(val) => onUpdateField?.('deliveryTerms', val)} className="text-right font-medium" />
                </div>
            </div>
        </div>
        <div className="flex flex-col justify-end">
            <div className="text-right space-y-8">
                <div className="italic text-slate-400 font-bold text-[9px] uppercase tracking-widest">Authorized Signature</div>
                <div className="inline-block border-b-2 border-slate-900 w-48 pb-1">
                    <span className="font-black text-lg text-slate-900 tracking-tighter italic">Carlos Feliu</span>
                </div>
                <div className="text-[8px] text-slate-400 font-bold uppercase tracking-widest leading-none">VP of Procurement | Alustars Group</div>
            </div>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="mt-auto pt-12 text-center">
        <div className="h-1 w-full bg-emerald-600/10 rounded-full mb-4"></div>
        <div className="text-[8px] font-black text-slate-300 uppercase tracking-[0.5em]">Alustars International Supply Chain Management</div>
      </div>
    </div>
  );
};
