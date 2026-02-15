/**
 * MapView — Shows entity pins on a map with Leaflet.
 *
 * Features:
 * - Render pins for all places that have coordinates
 * - Pin labels show place name
 * - Pin visual states: default (white bg), selected (filled accent, white text, glow), highlighted (tinted bg, border)
 * - Clicking a pin selects the place
 * - Unlocated places footer: semi-transparent bar at bottom with clickable chips
 * - Map pan/zoom to show all pins with reasonable padding
 * - Pan-to-fit on load and when selection changes
 */

import React, { useEffect, useRef, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useEntityStore } from "../entities/store";
import { useSelectionStore } from "../entities/selection";
import { computeHighlighted } from "../entities/helpers";
import { isPlace } from "../entities/types";
import type { Place } from "../entities/types";
import { Chip } from "./Chip";

// ─── Colors (must match design tokens) ───

const ACCENT = "#a33d22";

// ─── Custom Pin Icon Factory ───

function createPinIcon(selected: boolean, highlighted: boolean) {
  const color = selected ? ACCENT : highlighted ? "#e8d4cc" : "#ffffff";
  const textColor = selected ? "#fff" : "#1a1917";
  const borderColor = selected
    ? ACCENT
    : highlighted
      ? `${ACCENT}99`
      : "rgba(0,0,0,0.16)";
  const shadow = selected
    ? `0 2px 10px ${ACCENT}80`
    : "0 1px 4px rgba(0,0,0,0.12)";

  // Create a custom divIcon with HTML/CSS
  const html = `
    <div style="
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      transform: translate(-50%, -100%);
      cursor: pointer;
      z-index: ${selected || highlighted ? 10 : 1};
    ">
      <div style="
        background: ${color};
        color: ${textColor};
        font-size: 9px;
        font-weight: 600;
        padding: 3px 8px;
        border-radius: 4px;
        white-space: nowrap;
        margin-bottom: 3px;
        border: ${highlighted && !selected ? `1.5px solid ${borderColor}` : "none"};
        box-shadow: ${shadow};
        transition: all 0.15s;
        font-family: 'DM Sans', sans-serif;
      " data-pin-label></div>
      <div style="
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: ${selected ? ACCENT : highlighted ? ACCENT : "#ffffff"};
        border: 2px solid ${selected ? "#ffffff" : ACCENT};
        opacity: ${highlighted && !selected ? 0.6 : 1};
        box-shadow: 0 1px 3px rgba(0,0,0,0.15);
      "></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "custom-pin-icon",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

// ─── Fit Bounds Component ───

interface FitBoundsProps {
  places: Array<{ id: string; lat: number; lng: number }>;
}

function FitBounds({ places }: FitBoundsProps) {
  const map = useMap();

  useEffect(() => {
    if (places.length === 0) return;

    const bounds = new L.LatLngBounds(
      places.map((p) => [p.lat, p.lng] as [number, number])
    );

    map.fitBounds(bounds, {
      padding: [50, 50],
      maxZoom: 13,
    });
  }, [map, places]);

  return null;
}

// ─── Update Markers Component ───

interface UpdateMarkersProps {
  selected: Set<string>;
}

function UpdateMarkers({ selected }: UpdateMarkersProps) {
  const map = useMap();

  useEffect(() => {
    // Trigger a map update to re-render markers when selection changes
    map.invalidateSize();
  }, [map, selected]);

  return null;
}

// ─── Map View Component ───

export function MapView() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const entities = useEntityStore((s) => s.entities);
  const selected = useSelectionStore((s) => s.selected);
  const handleClick = useSelectionStore((s) => s.handleClick);

  // Compute highlighted set using the helper function
  const highlighted = useMemo(
    () => computeHighlighted(entities, selected),
    [entities, selected]
  );

  // Get all located places
  const locatedPlaces = Array.from(entities.values())
    .filter((e): e is Place => isPlace(e) && e.coords !== null)
    .map((place) => ({
      id: place.id,
      name: place.name,
      lat: place.coords!.lat,
      lng: place.coords!.lng,
    }));

  // Get unlocated places
  const unlocatedPlaces = Array.from(entities.values())
    .filter((e) => isPlace(e) && e.coords === null && e.parentId !== null);

  const defaultCenter: [number, number] =
    locatedPlaces.length > 0
      ? [locatedPlaces[0].lat, locatedPlaces[0].lng]
      : [35.0116, 135.7681]; // Kyoto default

  // Custom marker refs
  const markerRefs = useRef<Map<string, L.Marker>>(new Map());

  // Don't render on server
  if (!isMounted) {
    return (
      <div
        data-map-view
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          background: "#eae8e2",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ color: "#8a8680", fontSize: 13 }}>Loading map...</div>
      </div>
    );
  }

  return (
    <div
      data-map-view
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: "#eae8e2",
      }}
    >
      <MapContainer
        center={defaultCenter}
        zoom={11}
        style={{ width: "100%", height: "100%", zIndex: 0 }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {locatedPlaces.map((place) => {
          const isSel = selected.has(place.id);
          const isHl = highlighted.has(place.id);

          return (
            <Marker
              key={place.id}
              position={[place.lat, place.lng]}
              icon={createPinIcon(isSel, isHl)}
              eventHandlers={{
                click: (e) => {
                  handleClick(place.id, {
                    ctrlKey: e.originalEvent.ctrlKey,
                    metaKey: e.originalEvent.metaKey,
                  });
                },
              }}
              ref={(ref) => {
                if (ref) {
                  markerRefs.current.set(place.id, ref);
                  // Update marker label text
                  const marker = ref;
                  const iconElement = marker.getElement();
                  if (iconElement) {
                    const label = iconElement.querySelector(
                      "[data-pin-label]"
                    ) as HTMLElement;
                    if (label) {
                      label.textContent = place.name;
                    }
                  }
                }
              }}
            >
              <Popup>{place.name}</Popup>
            </Marker>
          );
        })}

        <FitBounds places={locatedPlaces} />
        <UpdateMarkers selected={selected} />
      </MapContainer>

      {/* Unlocated places footer */}
      {unlocatedPlaces.length > 0 && (
        <div
          data-unlocated-footer
          style={{
            position: "absolute",
            bottom: 10,
            left: 10,
            right: 10,
            background: "rgba(255,255,255,0.88)",
            backdropFilter: "blur(10px)",
            borderRadius: 8,
            padding: "8px 10px",
            border: "1px solid rgba(0,0,0,0.09)",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "#8a8680",
              marginBottom: 4,
            }}
          >
            Unlocated
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {unlocatedPlaces.map((place) => (
              <Chip
                key={place.id}
                entityId={place.id}
                type="place"
                small
                selected={selected.has(place.id)}
                highlighted={highlighted.has(place.id)}
                onClick={(e) => {
                  e.stopPropagation();
                  handleClick(place.id, {
                    ctrlKey: e.ctrlKey,
                    metaKey: e.metaKey,
                  });
                }}
                onPlaceIconClick={(e) => {
                  e.stopPropagation();
                  handleClick(place.id, {
                    ctrlKey: e.ctrlKey,
                    metaKey: e.metaKey,
                  });
                }}
              >
                {place.name}
              </Chip>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
