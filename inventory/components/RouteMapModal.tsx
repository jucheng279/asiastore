import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X } from 'lucide-react';

interface StopInfo {
  id: string;
  lat: number;
  lon: number;
  stopNumber: number;
  customerName: string;
  address: string;
  phone: string;
  notes?: string;
}

interface RouteMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  routeGeometry: number[][];
  stops: StopInfo[];
  storeAddress: { lat: number; lon: number; label: string };
  totalTime: number;
  totalDistance: number;
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

function createNumberedIcon(num: number): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="
      width: 32px; height: 32px; border-radius: 50%;
      background: #0d9488; color: white; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    ">${num}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
}

const storeIcon = L.divIcon({
  className: '',
  html: `<div style="
    width: 36px; height: 36px; border-radius: 50%;
    background: #16a34a; color: white; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; border: 3px solid white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.35);
  ">S</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -20],
});

export function RouteMapModal({
  isOpen,
  onClose,
  routeGeometry,
  stops,
  storeAddress,
  totalTime,
  totalDistance,
}: RouteMapModalProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!isOpen || !mapRef.current) return;

    // Small delay to let the modal render its container
    const timer = setTimeout(() => {
      if (!mapRef.current || mapInstanceRef.current) return;

      const map = L.map(mapRef.current, {
        zoomControl: true,
        attributionControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Store marker
      L.marker([storeAddress.lat, storeAddress.lon], { icon: storeIcon })
        .addTo(map)
        .bindPopup(`<strong>Store</strong><br/>${storeAddress.label}`);

      // Stop markers
      const bounds = L.latLngBounds([[storeAddress.lat, storeAddress.lon]]);

      for (const stop of stops) {
        const marker = L.marker([stop.lat, stop.lon], {
          icon: createNumberedIcon(stop.stopNumber),
        }).addTo(map);

        const popupHtml = [
          `<div style="font-size:13px;line-height:1.4;">`,
          `<strong>Stop ${stop.stopNumber}: ${escapeHtml(stop.customerName)}</strong>`,
          `<br/>${escapeHtml(stop.address)}`,
          `<br/><a href="tel:${escapeHtml(stop.phone)}" style="color:#0d9488;font-weight:600;">${escapeHtml(stop.phone)}</a>`,
          stop.notes ? `<br/><em style="color:#d97706;font-size:11px;">${escapeHtml(stop.notes)}</em>` : '',
          `</div>`,
        ].join('');

        marker.bindPopup(popupHtml);
        bounds.extend([stop.lat, stop.lon]);
      }

      // Route line
      if (routeGeometry.length > 1) {
        L.polyline(routeGeometry as [number, number][], {
          color: '#0d9488',
          weight: 4,
          opacity: 0.8,
          smoothFactor: 1,
        }).addTo(map);
      }

      map.fitBounds(bounds, { padding: [40, 40] });
      mapInstanceRef.current = map;
    }, 50);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen, routeGeometry, stops, storeAddress]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-slate-800">Delivery Route Map</h2>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span>{formatDuration(totalTime)} drive</span>
            <span className="text-slate-300">|</span>
            <span>{formatDistance(totalDistance)}</span>
            <span className="text-slate-300">|</span>
            <span>{stops.length} stops</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X size={20} className="text-slate-600" />
        </button>
      </div>

      {/* Map */}
      <div ref={mapRef} className="flex-1" />
    </div>
  );
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
