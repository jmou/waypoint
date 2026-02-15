/**
 * MapView — Shows entity pins on a map using react-map-gl.
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

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import Map, { Marker, NavigationControl } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import { useEntityStore } from "../entities/store";
import { useSelectionStore } from "../entities/selection";
import { computeHighlighted } from "../entities/helpers";
import { isPlace } from "../entities/types";
import type { Place } from "../entities/types";
import { Chip } from "./Chip";

import "maplibre-gl/dist/maplibre-gl.css";

// ─── Colors (must match design tokens) ───

const ACCENT = "#a33d22";

// ─── Pin Marker Component ───

interface PinMarkerProps {
  place: { id: string; name: string };
  selected: boolean;
  highlighted: boolean;
  onClick: (e: React.MouseEvent) => void;
}

const PinMarker = React.memo(function PinMarker({ place, selected, highlighted, onClick }: PinMarkerProps) {
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

  return (
    <div
      className="custom-pin-icon"
      onClick={onClick}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        cursor: "pointer",
        pointerEvents: "auto",
        zIndex: selected || highlighted ? 10 : 1,
      }}
    >
      <div
        data-pin-label=""
        style={{
          background: color,
          color: textColor,
          fontSize: 9,
          fontWeight: 600,
          padding: "3px 8px",
          borderRadius: 4,
          whiteSpace: "nowrap",
          marginBottom: 3,
          border: highlighted && !selected ? `1.5px solid ${borderColor}` : "none",
          boxShadow: shadow,
          transition: "all 0.15s",
          fontFamily: "'DM Sans', sans-serif",
          pointerEvents: "none",
        }}
      >
        {place.name}
      </div>
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: selected ? ACCENT : highlighted ? ACCENT : "#ffffff",
          border: `2px solid ${selected ? "#ffffff" : ACCENT}`,
          opacity: highlighted && !selected ? 0.6 : 1,
          boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
});

// ─── Map View Component ───

export function MapView() {
  const [isMounted, setIsMounted] = useState(false);
  const mapRef = useRef<MapRef>(null);

  const entities = useEntityStore((s) => s.entities);
  const selected = useSelectionStore((s) => s.selected);
  const handleClick = useSelectionStore((s) => s.handleClick);

  // Convert selected Set to array for proper React dependency tracking
  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  // Compute highlighted set using the helper function
  const highlighted = useMemo(
    () => computeHighlighted(entities, selected),
    [entities, selected]
  );

  // Convert highlighted Set to array for proper React dependency tracking
  const highlightedIds = useMemo(() => Array.from(highlighted), [highlighted]);

  // Get all located places - memoized to avoid unnecessary re-renders
  const locatedPlaces = useMemo(
    () =>
      Array.from(entities.values())
        .filter((e): e is Place => isPlace(e) && e.coords !== null)
        .map((place) => ({
          id: place.id,
          name: place.name,
          lat: place.coords!.lat,
          lng: place.coords!.lng,
        })),
    [entities]
  );

  // Get unlocated places - memoized
  const unlocatedPlaces = useMemo(
    () =>
      Array.from(entities.values()).filter(
        (e) => isPlace(e) && e.coords === null && e.parentId !== null
      ),
    [entities]
  );

  // Calculate initial viewport
  const initialViewState = useMemo(() => {
    const defaultCenter: [number, number] =
      locatedPlaces.length > 0
        ? [locatedPlaces[0].lng, locatedPlaces[0].lat]
        : [135.7681, 35.0116]; // Kyoto default

    return {
      longitude: defaultCenter[0],
      latitude: defaultCenter[1],
      zoom: 11,
    };
  }, [locatedPlaces.length]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fit bounds to show all pins after map loads
  const handleMapLoad = useCallback(() => {
    if (!mapRef.current || locatedPlaces.length === 0) return;

    const map = mapRef.current.getMap();
    const bounds = new maplibregl.LngLatBounds();

    locatedPlaces.forEach((place) => {
      bounds.extend([place.lng, place.lat]);
    });

    map.fitBounds(bounds, {
      padding: 50,
      maxZoom: 13,
    });
  }, [locatedPlaces]);

  // Create stable click handlers for each place
  const pinClickHandlers = useMemo(() => {
    const handlers: Record<string, (e: React.MouseEvent) => void> = {};
    locatedPlaces.forEach((place) => {
      handlers[place.id] = (e: React.MouseEvent) => {
        e.stopPropagation();
        handleClick(place.id, {
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey,
        });
      };
    });
    return handlers;
  }, [locatedPlaces, handleClick]);

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
      <Map
        ref={mapRef}
        initialViewState={initialViewState}
        style={{ width: "100%", height: "100%" }}
        reuseMaps
        mapStyle={{
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            },
          },
          layers: [
            {
              id: "osm-tiles",
              type: "raster",
              source: "osm",
              minzoom: 0,
              maxzoom: 19,
            },
          ],
        }}
        onLoad={handleMapLoad}
      >
        {/* Navigation controls (zoom buttons) */}
        <NavigationControl position="top-right" />

        {/* Render markers for each located place */}
        {locatedPlaces.map((place) => {
          const isSel = selected.has(place.id);
          const isHl = highlighted.has(place.id);
          const onClick = pinClickHandlers[place.id];

          return (
            <Marker
              key={place.id}
              longitude={place.lng}
              latitude={place.lat}
              anchor="bottom"
            >
              <PinMarker
                place={place}
                selected={isSel}
                highlighted={isHl}
                onClick={onClick}
              />
            </Marker>
          );
        })}
      </Map>

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
