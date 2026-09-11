import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import {
  Truck, MapPin, Phone, Clock, Navigation, CheckCircle2, Circle,
  AlertTriangle, ChevronDown, ChevronUp, Route,
} from 'lucide-react';

interface DeliveryStop {
  id: string;
  stopNumber: number;
  customerName: string;
  address: string;
  phone: string;
  notes?: string;
  lat: number;
  lon: number;
}

interface RouteData {
  id: string;
  window_label: string;
  total_time_seconds: number;
  total_distance_meters: number;
  store_address: { lat: number; lon: number; label: string };
  stops: DeliveryStop[];
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

function getRouteId(): string | null {
  const path = window.location.pathname;
  const match = path.match(/\/delivery\/([^/]+)/);
  if (match) return match[1];
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

function getDeliveredKey(routeId: string): string {
  return `delivered_${routeId}`;
}

function loadDelivered(routeId: string): Set<string> {
  try {
    const raw = localStorage.getItem(getDeliveredKey(routeId));
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function saveDelivered(routeId: string, delivered: Set<string>) {
  localStorage.setItem(getDeliveredKey(routeId), JSON.stringify([...delivered]));
}

function StopCard({
  stop,
  isDelivered,
  onToggle,
  storeAddress,
}: {
  stop: DeliveryStop;
  isDelivered: boolean;
  onToggle: () => void;
  storeAddress: { lat: number; lon: number };
}) {
  const [expanded, setExpanded] = useState(false);

  const navigateUrl = `https://www.google.com/maps/dir/?api=1&destination=${stop.lat},${stop.lon}&travelmode=driving`;

  return (
    <div className={`rounded-xl border-2 transition-all duration-300 ${
      isDelivered
        ? 'bg-slate-50 border-slate-200 opacity-60'
        : 'bg-white border-slate-200 shadow-sm'
    }`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Stop badge + check */}
          <button
            onClick={onToggle}
            className="flex-shrink-0 mt-0.5"
          >
            {isDelivered ? (
              <CheckCircle2 size={28} className="text-emerald-500" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center text-sm font-bold">
                {stop.stopNumber}
              </div>
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className={`font-semibold text-base ${isDelivered ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                {stop.customerName}
              </h3>
              <button
                onClick={() => setExpanded(!expanded)}
                className="p-1 text-slate-400"
              >
                {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            </div>

            <div className="flex items-start gap-1.5 mt-1">
              <MapPin size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
              <p className={`text-sm ${isDelivered ? 'text-slate-400' : 'text-slate-600'}`}>
                {stop.address}
              </p>
            </div>

            {stop.notes && (
              <p className="text-xs text-amber-600 mt-1 italic ml-5">
                {stop.notes}
              </p>
            )}
          </div>
        </div>

        {expanded && (
          <div className="mt-3 ml-10 space-y-2">
            <a
              href={`tel:${stop.phone}`}
              className="flex items-center gap-2 text-sm text-teal-700 font-medium"
            >
              <Phone size={14} />
              {stop.phone}
            </a>
          </div>
        )}

        {/* Navigate button */}
        {!isDelivered && (
          <div className="mt-3 ml-10">
            <a
              href={navigateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-lg active:bg-teal-700 transition-colors"
            >
              <Navigation size={16} />
              Navigate
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export function DeliveryApp() {
  const [route, setRoute] = useState<RouteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [delivered, setDelivered] = useState<Set<string>>(new Set());

  const routeId = getRouteId();

  useEffect(() => {
    if (!routeId) {
      setError('No route ID found in the URL.');
      setLoading(false);
      return;
    }

    (async () => {
      const { data, error: err } = await supabase
        .from('delivery_routes')
        .select('*')
        .eq('id', routeId)
        .maybeSingle();

      if (err || !data) {
        setError('Route not found or has expired.');
        setLoading(false);
        return;
      }

      setRoute(data as RouteData);
      setDelivered(loadDelivered(routeId));
      setLoading(false);
    })();
  }, [routeId]);

  const toggleDelivered = (stopId: string) => {
    if (!routeId) return;
    setDelivered(prev => {
      const next = new Set(prev);
      if (next.has(stopId)) next.delete(stopId);
      else next.add(stopId);
      saveDelivered(routeId, next);
      return next;
    });
  };

  const sortedStops = useMemo(() => {
    if (!route) return [];
    const pending = route.stops.filter(s => !delivered.has(s.id));
    const done = route.stops.filter(s => delivered.has(s.id));
    return [...pending, ...done];
  }, [route, delivered]);

  const deliveredCount = delivered.size;
  const totalCount = route?.stops.length ?? 0;
  const progress = totalCount > 0 ? (deliveredCount / totalCount) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Loading route...</p>
        </div>
      </div>
    );
  }

  if (error || !route) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <AlertTriangle size={48} className="text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-800 mb-2">Route Not Found</h1>
          <p className="text-slate-500">{error || 'This delivery route could not be loaded.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-teal-700 text-white px-4 py-3 shadow-md">
        <div className="flex items-center gap-3">
          <Truck size={22} />
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-base truncate">Delivery Route</h1>
            <p className="text-teal-200 text-xs truncate">{route.window_label}</p>
          </div>
        </div>

        {/* Summary bar */}
        <div className="flex items-center gap-4 mt-2 text-xs text-teal-200">
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {formatDuration(route.total_time_seconds)}
          </span>
          <span className="flex items-center gap-1">
            <Route size={12} />
            {formatDistance(route.total_distance_meters)}
          </span>
          <span className="flex items-center gap-1">
            <MapPin size={12} />
            {deliveredCount}/{totalCount} done
          </span>
        </div>

        {/* Progress bar */}
        <div className="mt-2 h-1.5 bg-teal-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-400 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Stop list */}
      <div className="p-4 space-y-3 pb-24">
        {deliveredCount === totalCount && totalCount > 0 && (
          <div className="text-center py-8">
            <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-slate-800">All deliveries complete!</h2>
            <p className="text-slate-500 mt-1">Great work!</p>
          </div>
        )}

        {sortedStops.map(stop => (
          <StopCard
            key={stop.id}
            stop={stop}
            isDelivered={delivered.has(stop.id)}
            onToggle={() => toggleDelivered(stop.id)}
            storeAddress={route.store_address}
          />
        ))}
      </div>
    </div>
  );
}
