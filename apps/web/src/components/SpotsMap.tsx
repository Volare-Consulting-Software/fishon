"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { FishingSpot, GeoLocation } from "@volare-consulting/fishon";
import { SPOT_CATEGORIES } from "@/lib/spotCategories";

function numberedIcon(index: number, color: string, active: boolean): L.DivIcon {
  const size = active ? 30 : 24;
  return L.divIcon({
    className: "",
    html: `<div style="background:${color};width:${size}px;height:${size}px;border-radius:9999px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:12px;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)">${index + 1}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export default function SpotsMap({
  center,
  spots,
  selectedIndex,
  onSelect,
  fitKey,
}: {
  center: GeoLocation;
  spots: FishingSpot[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  fitKey: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  // Create the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView(
      [center.lat, center.lng],
      11
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // (Re)build markers when spots change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = spots.map((spot, index) => {
      const { color } = SPOT_CATEGORIES[spot.kind];
      const marker = L.marker([spot.lat, spot.lng], {
        icon: numberedIcon(index, color, index === selectedIndex),
      })
        .addTo(map)
        .on("click", () => onSelect(index));
      return marker;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spots]);

  // Refresh icons on selection + pan to the selected spot.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((marker, index) => {
      const spot = spots[index];
      if (!spot) return;
      marker.setIcon(numberedIcon(index, SPOT_CATEGORIES[spot.kind].color, index === selectedIndex));
    });
    if (selectedIndex !== null && spots[selectedIndex]) {
      const s = spots[selectedIndex]!;
      map.setView([s.lat, s.lng], 13, { animate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex]);

  // Fit to all spots initially and whenever fitKey changes (drawer close).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const pts: L.LatLngExpression[] = [
      [center.lat, center.lng],
      ...spots.map((s) => [s.lat, s.lng] as L.LatLngExpression),
    ];
    if (pts.length > 1) {
      map.fitBounds(L.latLngBounds(pts).pad(0.15));
    } else {
      map.setView([center.lat, center.lng], 11);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, spots]);

  return <div ref={containerRef} className="h-[420px] w-full rounded-lg" />;
}
