import { useState, useEffect, useMemo } from 'react';
import { ClipboardList, Search, ChevronLeft, ChevronRight, Printer, Package } from 'lucide-react';
import {
  fetchOrderSummary,
  calculateOrderingWindow,
  type OrderSummaryRow,
  type OrderingWindow,
} from '../../lib/orderSummaryApi';
import { printOrderSummary } from '../utils/printOrderSummary';

interface OrderSummaryPanelProps {
  storeSettings: {
    autoOpenDay: number;
    autoOpenTime: string;
    autoCloseDay: number;
    autoCloseTime: string;
  };
  onOrderCountChange: (count: number) => void;
}

const PAYMENT_LABELS: Record<string, string> = {
  cashOrSwish: 'Cash / Swish',
  points: 'Points',
  payAtStore: 'Pay at Store',
};

export function OrderSummaryPanel({ storeSettings, onOrderCountChange }: OrderSummaryPanelProps) {
  const [rows, setRows] = useState<OrderSummaryRow[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const window: OrderingWindow = useMemo(
    () =>
      calculateOrderingWindow(
        storeSettings.autoOpenDay,
        storeSettings.autoOpenTime,
        storeSettings.autoCloseDay,
        storeSettings.autoCloseTime,
        weekOffset
      ),
    [storeSettings, weekOffset]
  );

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchOrderSummary(window.start, window.end).then(result => {
      if (cancelled) return;
      setRows(result.rows);
      setTotalOrders(result.totalOrders);
      onOrderCountChange(result.rows.length);
      setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [window]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(row =>
      row.nickname.toLowerCase().includes(q) ||
      row.address.streetAddress.toLowerCase().includes(q) ||
      row.address.fullName.toLowerCase().includes(q) ||
      row.contactPhone.includes(q)
    );
  }, [rows, searchQuery]);

  const userGroups = useMemo(() => {
    const groups: { userId: string; startIdx: number; count: number }[] = [];
    let lastUserId = '';
    for (let i = 0; i < filteredRows.length; i++) {
      if (filteredRows[i].userId !== lastUserId) {
        groups.push({ userId: filteredRows[i].userId, startIdx: i, count: 1 });
        lastUserId = filteredRows[i].userId;
      } else {
        groups[groups.length - 1].count++;
      }
    }
    return groups;
  }, [filteredRows]);

  const grandTotal = useMemo(
    () => filteredRows.reduce((sum, r) => sum + r.total, 0),
    [filteredRows]
  );

  const uniqueCustomers = useMemo(
    () => new Set(filteredRows.map(r => r.userId)).size,
    [filteredRows]
  );

  const isGroupedRow = (index: number): { isFirst: boolean; groupSize: number } => {
    for (const g of userGroups) {
      if (index >= g.startIdx && index < g.startIdx + g.count) {
        return { isFirst: index === g.startIdx, groupSize: g.count };
      }
    }
    return { isFirst: true, groupSize: 1 };
  };

  const handlePrint = () => {
    printOrderSummary(filteredRows, window.label, grandTotal, uniqueCustomers);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 text-sm">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-50 rounded-lg">
              <ClipboardList size={20} className="text-teal-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Order Summary</h2>
              <p className="text-sm text-slate-500">
                {totalOrders} order{totalOrders !== 1 ? 's' : ''} &middot; {window.label}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekOffset(prev => prev - 1)}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              title="Previous week"
            >
              <ChevronLeft size={16} className="text-slate-600" />
            </button>
            {weekOffset !== 0 && (
              <button
                onClick={() => setWeekOffset(0)}
                className="px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 rounded-lg border border-teal-200 hover:bg-teal-100 transition-colors"
              >
                This Week
              </button>
            )}
            <button
              onClick={() => setWeekOffset(prev => prev + 1)}
              disabled={weekOffset >= 0}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Next week"
            >
              <ChevronRight size={16} className="text-slate-600" />
            </button>
            <div className="w-px h-6 bg-slate-200 mx-1" />
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Printer size={14} />
              Print
            </button>
          </div>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by nickname, address, or phone..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {filteredRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-slate-200 rounded-2xl flex items-center justify-center mb-4">
              <Package size={32} className="text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium mb-1">No orders this week</p>
            <p className="text-slate-400 text-sm">
              Orders placed during the ordering window will appear here
            </p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 w-10">#</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 min-w-[120px]">Nickname</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 min-w-[200px]">Product List</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 min-w-[180px]">Address</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 min-w-[140px]">Contact</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 min-w-[100px]">Payment</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600 min-w-[90px]">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, index) => {
                    const { isFirst, groupSize } = isGroupedRow(index);
                    const hasMultipleRows = groupSize > 1;
                    const isEvenGroup = userGroups.findIndex(g => g.userId === row.userId) % 2 === 0;

                    return (
                      <tr
                        key={`${row.userId}-${index}`}
                        className={`border-b border-slate-100 last:border-b-0 ${
                          hasMultipleRows
                            ? isEvenGroup
                              ? 'bg-teal-50/30'
                              : 'bg-amber-50/30'
                            : index % 2 === 0
                            ? 'bg-white'
                            : 'bg-slate-50/50'
                        }`}
                      >
                        <td className="px-4 py-3 text-slate-500 font-medium align-top">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex items-center gap-1.5">
                            {hasMultipleRows && (
                              <span className={`w-1 self-stretch rounded-full flex-shrink-0 ${
                                isEvenGroup ? 'bg-teal-400' : 'bg-amber-400'
                              }`} />
                            )}
                            <div>
                              <span className="font-semibold text-slate-800">{row.nickname}</span>
                              {row.orderIds.length > 1 && (
                                <span className="ml-1.5 px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded-full font-medium">
                                  {row.orderIds.length} merged
                                </span>
                              )}
                              {hasMultipleRows && isFirst && (
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  {groupSize} separate deliveries
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="space-y-0.5">
                            {row.items.map((item, i) => (
                              <div key={`${item.productId}-${i}`} className="flex items-start gap-1">
                                <span className="text-slate-700">{item.name}</span>
                                <span className="text-slate-400 flex-shrink-0">x{item.quantity}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <p className="text-slate-800 font-medium">{row.address.fullName}</p>
                          <p className="text-slate-600">{row.address.streetAddress}</p>
                          <p className="text-slate-500">
                            {row.address.postalCode} {row.address.city}
                          </p>
                          {row.deliveryInstructions && (
                            <p className="text-xs text-amber-600 mt-1 italic">
                              {row.deliveryInstructions}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <p className="text-slate-800 font-medium">{row.contactPhone}</p>
                          {row.contactEmail && (
                            <p className="text-slate-500 text-xs truncate max-w-[160px]">{row.contactEmail}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            row.paymentMethod === 'points'
                              ? 'bg-amber-100 text-amber-700'
                              : row.paymentMethod === 'payAtStore'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {PAYMENT_LABELS[row.paymentMethod] || row.paymentMethod}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top text-right">
                          <span className="font-semibold text-slate-800">
                            {row.total.toFixed(2)} kr
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 border-t-2 border-slate-300">
                    <td colSpan={2} className="px-4 py-3 font-semibold text-slate-700">
                      {filteredRows.length} deliver{filteredRows.length !== 1 ? 'ies' : 'y'} &middot; {uniqueCustomers} customer{uniqueCustomers !== 1 ? 's' : ''}
                    </td>
                    <td colSpan={4} className="px-4 py-3 text-right font-semibold text-slate-600">
                      Grand Total
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800 text-base">
                      {grandTotal.toFixed(2)} kr
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
