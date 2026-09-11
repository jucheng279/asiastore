import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  ClipboardList, Search, ChevronLeft, ChevronRight, Printer, Package,
  Route, MapPin, Loader2, X, RotateCcw, Navigation, Map, Share2, Copy, Check,
} from 'lucide-react';
import {
  fetchOrderSummary,
  calculateOrderingWindow,
  type OrderSummaryRow,
  type OrderingWindow,
} from '../../lib/orderSummaryApi';
import { supabase } from '../../lib/supabase';
import { printOrderSummary } from '../utils/printOrderSummary';
import { generateQrDataUrl } from '../utils/qrcode';
import { RouteMapModal } from './RouteMapModal';
import type { AdminStoreSettings } from '../types';

interface OrderSummaryPanelProps {
  storeSettings: AdminStoreSettings;
  onOrderCountChange: (count: number) => void;
}

const PAYMENT_LABELS: Record<string, string> = {
  cashOrSwish: 'Cash / Swish',
  points: 'Points',
  payAtStore: 'Pay at Store',
};

type EndMode = 'return_to_start' | 'last_stop' | 'custom';

interface RouteResult {
  orderedStopIds: string[];
  totalTimeSeconds: number;
  totalDistanceMeters: number;
  failedStops: string[];
  routeGeometry: number[][];
  stopCoords: Record<string, { lat: number; lon: number }>;
}

interface AddressSuggestion {
  street: string;
  housenumber: string;
  postcode: string;
  city: string;
  formatted: string;
  lat?: number;
  lon?: number;
}

function EndAddressInput({
  onSelect,
}: {
  onSelect: (addr: { address: string; lat: number; lon: number }) => void;
}) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController>();
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  const fetchSuggestions = useCallback(async (text: string) => {
    if (text.length < 2) { setSuggestions([]); setIsOpen(false); return; }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ text, lang: 'en' });
      const res = await fetch(`${supabaseUrl}/functions/v1/address-autocomplete?${params}`, { signal: controller.signal });
      if (!res.ok) throw new Error('fail');
      const data = await res.json();
      setSuggestions(data.results || []);
      setIsOpen((data.results || []).length > 0);
    } catch { /* aborted */ } finally { setIsLoading(false); }
  }, [supabaseUrl]);

  const handleChange = (text: string) => {
    setQuery(text);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(text), 300);
  };

  const handleSelect = (s: AddressSuggestion) => {
    const street = s.housenumber ? `${s.street} ${s.housenumber}` : s.street;
    const display = `${street}, ${s.postcode} ${s.city}`;
    setQuery(display);
    setIsOpen(false);
    onSelect({ address: display, lat: s.lat ?? 0, lon: s.lon ?? 0 });
  };

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Search end address..."
          className="w-full pl-8 pr-8 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
        />
        {isLoading && <Loader2 size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
      </div>
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-36 overflow-y-auto">
          {suggestions.map((s, i) => (
            <button key={i} type="button" onClick={() => handleSelect(s)}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-teal-50 transition-colors border-b border-slate-100 last:border-b-0">
              {s.formatted}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function formatDistance(meters: number): string {
  const km = meters / 1000;
  return km < 1 ? `${Math.round(meters)} m` : `${km.toFixed(1)} km`;
}

function generateRouteId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

export function OrderSummaryPanel({ storeSettings, onOrderCountChange }: OrderSummaryPanelProps) {
  const [rows, setRows] = useState<OrderSummaryRow[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Route planning state
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [endMode, setEndMode] = useState<EndMode>('return_to_start');
  const [customEndAddress, setCustomEndAddress] = useState<{ address: string; lat: number; lon: number } | null>(null);
  const [showRouteOptions, setShowRouteOptions] = useState(false);

  // Map + share state
  const [showMap, setShowMap] = useState(false);
  const [savedRouteId, setSavedRouteId] = useState<string | null>(null);
  const [showSharePopover, setShowSharePopover] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const orderingWindow: OrderingWindow = useMemo(
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
    setRouteResult(null);
    setRouteError(null);
    setSavedRouteId(null);
    fetchOrderSummary(orderingWindow.start, orderingWindow.end).then(result => {
      if (cancelled) return;
      setRows(result.rows);
      setTotalOrders(result.totalOrders);
      onOrderCountChange(result.rows.length);
      setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [orderingWindow]);

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

  const displayRows = useMemo(() => {
    if (!routeResult) return filteredRows;
    const orderMap = new Map(routeResult.orderedStopIds.map((id, idx) => [id, idx]));
    const sorted = [...filteredRows].sort((a, b) => {
      const ai = orderMap.get(a.orderId) ?? 9999;
      const bi = orderMap.get(b.orderId) ?? 9999;
      return ai - bi;
    });
    return sorted;
  }, [filteredRows, routeResult]);

  const grandTotal = useMemo(
    () => filteredRows.reduce((sum, r) => sum + r.total, 0),
    [filteredRows]
  );

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  const saveRouteToDb = async (result: RouteResult) => {
    const addr = storeSettings.storeAddress;
    const id = generateRouteId();

    const stopsData = result.orderedStopIds.map((orderId, idx) => {
      const row = filteredRows.find(r => r.orderId === orderId);
      const coords = result.stopCoords[orderId];
      return {
        id: orderId,
        stopNumber: idx + 1,
        customerName: row?.nickname ?? 'Unknown',
        address: row ? `${row.address.streetAddress}, ${row.address.postalCode} ${row.address.city}` : '',
        phone: row?.contactPhone ?? '',
        notes: row?.deliveryInstructions ?? '',
        lat: coords?.lat ?? 0,
        lon: coords?.lon ?? 0,
      };
    });

    const { error } = await supabase.from('delivery_routes').insert({
      id,
      window_label: orderingWindow.label,
      total_time_seconds: result.totalTimeSeconds,
      total_distance_meters: result.totalDistanceMeters,
      route_geometry: result.routeGeometry,
      store_address: { lat: addr.lat, lon: addr.lon, label: `${addr.street}, ${addr.postalCode} ${addr.city}` },
      end_mode: endMode,
      stops: stopsData,
    });

    if (!error) {
      setSavedRouteId(id);
    }
  };

  const calculateRoute = async () => {
    const addr = storeSettings.storeAddress;
    if (!addr.lat || !addr.lon) {
      setRouteError('Please set a store address in Store Settings first.');
      return;
    }

    setIsRouteLoading(true);
    setRouteError(null);
    setRouteResult(null);
    setSavedRouteId(null);

    try {
      const stops = filteredRows.map((row) => ({
        id: row.orderId,
        address: `${row.address.streetAddress}, ${row.address.postalCode} ${row.address.city}`,
        lat: null as number | null,
        lon: null as number | null,
      }));

      const body: Record<string, unknown> = {
        startAddress: { address: `${addr.street}, ${addr.postalCode} ${addr.city}`, lat: addr.lat, lon: addr.lon },
        endMode,
        stops,
      };

      if (endMode === 'custom' && customEndAddress) {
        body.customEndAddress = customEndAddress;
      }

      const res = await fetch(`${supabaseUrl}/functions/v1/route-optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Route planning failed' }));
        throw new Error(errData.error || `Request failed (${res.status})`);
      }

      const data: RouteResult = await res.json();
      setRouteResult(data);
      setShowRouteOptions(false);

      // Save to DB in the background for sharing
      saveRouteToDb(data);
    } catch (err) {
      setRouteError((err as Error).message);
    } finally {
      setIsRouteLoading(false);
    }
  };

  const clearRoute = () => {
    setRouteResult(null);
    setRouteError(null);
    setSavedRouteId(null);
    setShowSharePopover(false);
  };

  const deliveryLink = savedRouteId
    ? `${window.location.origin}/delivery/${savedRouteId}`
    : null;

  const copyLink = async () => {
    if (!deliveryLink) return;
    try {
      await navigator.clipboard.writeText(deliveryLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handlePrint = async () => {
    let qrDataUrl: string | undefined;
    if (deliveryLink) {
      try {
        qrDataUrl = await generateQrDataUrl(deliveryLink);
      } catch { /* skip QR if generation fails */ }
    }
    printOrderSummary(displayRows, orderingWindow.label, grandTotal, filteredRows.length, routeResult ?? undefined, qrDataUrl, deliveryLink ?? undefined);
  };

  // Build map stop data
  const mapStops = useMemo(() => {
    if (!routeResult) return [];
    return routeResult.orderedStopIds
      .map((orderId, idx) => {
        const row = filteredRows.find(r => r.orderId === orderId);
        const coords = routeResult.stopCoords[orderId];
        if (!row || !coords) return null;
        return {
          id: orderId,
          lat: coords.lat,
          lon: coords.lon,
          stopNumber: idx + 1,
          customerName: row.nickname,
          address: `${row.address.streetAddress}, ${row.address.postalCode} ${row.address.city}`,
          phone: row.contactPhone,
          notes: row.deliveryInstructions,
        };
      })
      .filter(Boolean) as { id: string; lat: number; lon: number; stopNumber: number; customerName: string; address: string; phone: string; notes?: string }[];
  }, [routeResult, filteredRows]);

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

  const storeAddr = storeSettings.storeAddress;

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
                {totalOrders} customer{totalOrders !== 1 ? 's' : ''} &middot; {orderingWindow.label}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekOffset(prev => prev - 1)}
              disabled={weekOffset <= -1}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
            >
              <ChevronRight size={16} className="text-slate-600" />
            </button>
            <div className="w-px h-6 bg-slate-200 mx-1" />

            {/* Route planning buttons */}
            {filteredRows.length > 0 && !routeResult && (
              <div className="relative">
                <button
                  onClick={() => setShowRouteOptions(!showRouteOptions)}
                  disabled={isRouteLoading}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-60"
                >
                  {isRouteLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Route size={14} />
                  )}
                  Plan Route
                </button>

                {showRouteOptions && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-slate-800">Route Options</h4>
                      <button onClick={() => setShowRouteOptions(false)} className="text-slate-400 hover:text-slate-600">
                        <X size={14} />
                      </button>
                    </div>

                    <div className="space-y-2 mb-4">
                      <p className="text-xs font-medium text-slate-600">Where should the route end?</p>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="endMode" checked={endMode === 'return_to_start'}
                          onChange={() => setEndMode('return_to_start')}
                          className="text-teal-600 focus:ring-teal-500" />
                        <span className="text-xs text-slate-700">Return to store (round trip)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="endMode" checked={endMode === 'last_stop'}
                          onChange={() => setEndMode('last_stop')}
                          className="text-teal-600 focus:ring-teal-500" />
                        <span className="text-xs text-slate-700">End at last delivery</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="endMode" checked={endMode === 'custom'}
                          onChange={() => setEndMode('custom')}
                          className="text-teal-600 focus:ring-teal-500" />
                        <span className="text-xs text-slate-700">Custom end address</span>
                      </label>

                      {endMode === 'custom' && (
                        <div className="mt-2">
                          <EndAddressInput onSelect={setCustomEndAddress} />
                        </div>
                      )}
                    </div>

                    <button
                      onClick={calculateRoute}
                      disabled={isRouteLoading || (endMode === 'custom' && !customEndAddress)}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-60"
                    >
                      {isRouteLoading ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
                      Calculate Route
                    </button>
                  </div>
                )}
              </div>
            )}

            {routeResult && (
              <>
                <button
                  onClick={() => setShowMap(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
                >
                  <Map size={14} />
                  View Map
                </button>

                <div className="relative">
                  <button
                    onClick={() => setShowSharePopover(!showSharePopover)}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
                  >
                    <Share2 size={14} />
                    Share Route
                  </button>

                  {showSharePopover && (
                    <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-slate-800">Share with driver</h4>
                        <button onClick={() => setShowSharePopover(false)} className="text-slate-400 hover:text-slate-600">
                          <X size={14} />
                        </button>
                      </div>
                      {savedRouteId ? (
                        <>
                          <p className="text-xs text-slate-500 mb-2">
                            Send this link to the delivery driver. They can open it on their phone for a step-by-step stop list with navigation.
                          </p>
                          <div className="flex items-center gap-2">
                            <input
                              readOnly
                              value={deliveryLink ?? ''}
                              className="flex-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg select-all"
                              onFocus={(e) => e.target.select()}
                            />
                            <button
                              onClick={copyLink}
                              className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
                            >
                              {linkCopied ? <Check size={12} /> : <Copy size={12} />}
                              {linkCopied ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Loader2 size={12} className="animate-spin" />
                          Saving route...
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={clearRoute}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <RotateCcw size={14} />
                  Clear
                </button>
              </>
            )}

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Printer size={14} />
              Print
            </button>
          </div>
        </div>

        {/* Route summary bar */}
        {routeResult && (
          <div className="flex items-center gap-4 px-4 py-2.5 bg-teal-50 border border-teal-200 rounded-lg mb-4">
            <Route size={16} className="text-teal-600 flex-shrink-0" />
            <div className="flex items-center gap-4 text-sm">
              <span className="font-semibold text-teal-800">
                Optimized Route
              </span>
              <span className="text-teal-700">
                {formatDuration(routeResult.totalTimeSeconds)} drive
              </span>
              <span className="text-teal-700">
                {formatDistance(routeResult.totalDistanceMeters)} total
              </span>
              <span className="text-teal-700">
                {routeResult.orderedStopIds.length} stop{routeResult.orderedStopIds.length !== 1 ? 's' : ''}
              </span>
            </div>
            {routeResult.failedStops.length > 0 && (
              <span className="text-xs text-amber-600 ml-auto">
                {routeResult.failedStops.length} address{routeResult.failedStops.length !== 1 ? 'es' : ''} could not be located
              </span>
            )}
          </div>
        )}

        {routeError && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg mb-4">
            <X size={14} className="text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{routeError}</p>
          </div>
        )}

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
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 w-10">#</th>
                  {routeResult && (
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 w-16">Stop</th>
                  )}
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 min-w-[120px]">Customer</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 min-w-[200px]">Items</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 min-w-[180px]">Address</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 min-w-[140px]">Contact</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 min-w-[100px]">Payment</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 min-w-[90px]">Total</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row, idx) => {
                  const stopNumber = routeResult
                    ? routeResult.orderedStopIds.indexOf(row.orderId) + 1
                    : 0;
                  const isFailed = routeResult?.failedStops.includes(row.orderId);

                  return (
                    <tr
                      key={row.orderId}
                      className={`border-b border-slate-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                    >
                      <td className="px-4 py-3 text-slate-500 font-medium align-top">{idx + 1}</td>
                      {routeResult && (
                        <td className="px-4 py-3 align-top">
                          {stopNumber > 0 ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-teal-600 text-white text-xs font-bold">
                              {stopNumber}
                            </span>
                          ) : isFailed ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-600 text-xs font-bold" title="Address could not be located">
                              ?
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">--</span>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3 align-top">
                        <span className="font-semibold text-slate-800">{row.nickname}</span>
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
                        <p className="text-slate-500">{row.address.postalCode} {row.address.city}</p>
                        {row.deliveryInstructions && (
                          <p className="text-xs text-amber-600 mt-1 italic">{row.deliveryInstructions}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <p className="text-slate-800 font-medium">{row.contactPhone}</p>
                        {row.contactEmail && (
                          <p className="text-slate-500 text-xs truncate max-w-[160px]">{row.contactEmail}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {row.paymentMethod ? (
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            row.paymentMethod === 'points'
                              ? 'bg-amber-100 text-amber-700'
                              : row.paymentMethod === 'payAtStore'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {PAYMENT_LABELS[row.paymentMethod] || row.paymentMethod}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Pending</span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-right">
                        <span className="font-semibold text-slate-800">{row.subtotal.toFixed(2)} kr</span>
                        {row.deliveryFee > 0 && (
                          <p className="text-xs text-amber-600">+{row.deliveryFee.toFixed(0)} kr delivery</p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-300">
                  <td colSpan={routeResult ? 3 : 2} className="px-4 py-3 font-semibold text-slate-700">
                    {filteredRows.length} customer{filteredRows.length !== 1 ? 's' : ''}
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
        )}
      </div>

      {/* Full-screen route map modal */}
      {routeResult && storeAddr.lat && storeAddr.lon && (
        <RouteMapModal
          isOpen={showMap}
          onClose={() => setShowMap(false)}
          routeGeometry={routeResult.routeGeometry}
          stops={mapStops}
          storeAddress={{ lat: storeAddr.lat, lon: storeAddr.lon, label: `${storeAddr.street}, ${storeAddr.postalCode} ${storeAddr.city}` }}
          totalTime={routeResult.totalTimeSeconds}
          totalDistance={routeResult.totalDistanceMeters}
        />
      )}
    </div>
  );
}
