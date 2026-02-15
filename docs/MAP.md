# Map View

## Overview

The Map view displays places on an interactive map using MapLibre GL JS with react-map-gl bindings. Places with coordinates appear as labeled pins on the map, while unlocated places are shown in a footer bar for quick access.

**Migration:** The Map view was migrated from Leaflet to MapLibre GL JS in commit `7a8adea` for better performance, modern rendering, and improved customization.

## Architecture

### Component Structure

```
MapView.tsx
├── Map (react-map-gl/maplibre)
│   ├── NavigationControl (zoom buttons)
│   └── Marker[] (one per located place)
│       └── PinMarker (custom component)
└── Unlocated footer (chips for places without coords)
```

### Dependencies

```json
{
  "maplibre-gl": "^5.0.0",
  "react-map-gl": "^8.1.0"
}
```

**CSS:** Import `maplibre-gl/dist/maplibre-gl.css` for controls and attribution.

## Map Configuration

### Base Map Style

Uses OpenStreetMap tiles via a custom MapLibre style specification:

```typescript
mapStyle={{
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors',
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
```

### Initial Viewport

- **Default center:** Kyoto `[135.7681, 35.0116]` if no places exist
- **Default zoom:** 11
- **Actual viewport:** Auto-fit to show all pins with padding (see Pan-to-Fit)

### Map Instance

Accessed via `mapRef.current.getMap()` for:
- Bounds calculations (`maplibregl.LngLatBounds`)
- Programmatic camera control (`fitBounds()`)

## Pin Markers

### PinMarker Component

Custom React component rendered at each place's coordinates.

**Structure:**
```
┌─────────────┐
│ Place Name  │ ← Label (9px, DM Sans 600)
└──────┬──────┘
       │
       ● ← Dot (8px diameter, filled/outlined)
```

### Visual States

Pins have three distinct visual states based on selection/highlighting:

**Default (unselected, unhighlighted):**
- Label: White background, dark text `#1a1917`
- Border: `rgba(0,0,0,0.16)`
- Dot: White fill, accent `#a33d22` outline
- Shadow: `0 1px 4px rgba(0,0,0,0.12)`

**Highlighted (place's experiences are selected):**
- Label: Tinted background `#e8d4cc`, dark text
- Border: `1.5px solid ${ACCENT}99` (accent with transparency)
- Dot: Accent fill `#a33d22`, accent outline, 60% opacity
- Shadow: Same as default

**Selected (place is clicked):**
- Label: Accent background `#a33d22`, white text
- Border: None
- Dot: Accent fill, white outline
- Shadow: Glow effect `0 2px 10px ${ACCENT}80`
- Z-index: Elevated to `10` (vs. `1` for default)

### Transitions

All state changes animate smoothly:
```css
transition: all 0.15s
```

## Data Flow

### Located Places

```typescript
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
```

Places without `coords` (null) are excluded from map rendering.

### Unlocated Places

```typescript
const unlocatedPlaces = useMemo(
  () =>
    Array.from(entities.values()).filter(
      (e) => isPlace(e) && e.coords === null && e.parentId !== null
    ),
  [entities]
);
```

Only non-root places without coordinates are shown in the footer.

## Interactions

### Pin Selection

**Click a pin:**
- Calls `handleClick(placeId, { ctrlKey, metaKey })`
- Toggles selection on/off
- Updates global selection store
- Pin visual state updates reactively

**Ctrl/Cmd + Click:**
- Adds place to multi-selection
- Both pins show selected state
- Selection popover shows all selected chips

### Click Handlers

Pin click handlers are memoized to prevent unnecessary re-renders:

```typescript
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
```

**Why memoize?** Prevents creating new function references on every render, which would cause unnecessary Marker re-renders.

### Highlighting

Highlighting is computed automatically via `computeHighlighted()`:
- Selecting an experience highlights its place(s)
- Selecting a place highlights its experiences
- Pins update visual state reactively

## Unlocated Places Footer

### Layout

Semi-transparent bar fixed at bottom of map:

```
┌──────────────────────────────────────┐
│ UNLOCATED                            │ ← Label
│ [Chip] [Chip] [Chip]                 │ ← Place chips
└──────────────────────────────────────┘
```

**Position:**
- `position: absolute`
- `bottom: 10px; left: 10px; right: 10px`
- `z-index: 1000` (above map)

**Style:**
- Background: `rgba(255,255,255,0.88)`
- Backdrop filter: `blur(10px)`
- Border radius: `8px`
- Border: `1px solid rgba(0,0,0,0.09)`

### Chips

Uses standard `<Chip>` component with `small` prop:
- Font size: `10px`
- Place chips with pin icon
- Selection/highlighting states preserved
- Click to select (same behavior as map pins)

### Conditional Rendering

Footer only appears when `unlocatedPlaces.length > 0`.

## Pan-to-Fit

### On Load

When the map loads, it automatically fits bounds to show all pins:

```typescript
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
```

**Parameters:**
- `padding: 50` — 50px margin around pins
- `maxZoom: 13` — Prevents over-zooming for single pins

### Reactive Updates

Currently, pan-to-fit only runs on initial load (`onLoad` event). Selection changes do not trigger automatic panning.

**Design rationale:** Automatic panning on selection would interfere with user map exploration. Users can manually zoom/pan after selecting entities.

## Map Controls

### Navigation Control

Provides zoom in/out buttons:

```tsx
<NavigationControl position="top-right" />
```

Rendered by MapLibre as:
- Zoom in button (`.maplibregl-ctrl-zoom-in`)
- Zoom out button (`.maplibregl-ctrl-zoom-out`)

### Attribution

MapLibre automatically renders attribution control with OpenStreetMap copyright.

## Integration with Selection System

### Selection Store

MapView subscribes to the global selection store:

```typescript
const selected = useSelectionStore((s) => s.selected);
const handleClick = useSelectionStore((s) => s.handleClick);
```

All selection changes (from any view) immediately update pin visual states.

### Highlighted Computation

Uses the shared `computeHighlighted()` helper:

```typescript
const highlighted = useMemo(
  () => computeHighlighted(entities, selected),
  [entities, selected]
);
```

**Bidirectional relationships:**
- Selected place → highlights its experiences
- Selected experience → highlights its place
- Selected parent → highlights descendants

See `docs/DATA_MODEL.md` for full highlighting logic.

### Cross-View Selection

**Example flows:**

1. **Map → Schedule:**
   - Click place pin on map → place selected
   - Switch to Schedule view → experiences at that place are highlighted

2. **Schedule → Map:**
   - Click experience in Schedule → experience selected
   - Switch to Map → associated place pin is highlighted

3. **Chip pin icon → Map:**
   - Click pin icon on any entity chip → navigates to Map view
   - Entity is selected, pin shows selected state

## Server-Side Rendering

MapView uses client-side only rendering:

```typescript
const [isMounted, setIsMounted] = useState(false);

useEffect(() => {
  setIsMounted(true);
}, []);

if (!isMounted) {
  return <div>Loading map...</div>;
}
```

**Why?** MapLibre GL JS requires `window` and WebGL, which aren't available during SSR.

## Testing

### E2E Coverage

Map view has comprehensive Playwright tests in `e2e/phase5.spec.ts`:

**Map Rendering:**
- Map view container (`[data-map-view]`)
- MapLibre canvas (`.maplibregl-canvas`)
- Tile loading
- Zoom controls

**Pin Rendering:**
- All located places render pins (`.custom-pin-icon`)
- Pin labels show place names (`[data-pin-label]`)
- Default visual state (white background)

**Selection:**
- Click pin → selects place
- Selected visual state (accent background, white text, glow)
- Multi-selection with Ctrl+click
- Toggle deselection on second click

**Highlighting:**
- Select experience in Schedule → place pin highlights
- Select place → experience rows highlight in Schedule

**Unlocated Footer:**
- Footer renders (`[data-unlocated-footer]`)
- Shows chips for unlocated places
- Chip selection works
- Multi-selection from footer

**Map Interaction:**
- Zoom in/out
- Attribution display
- Pan-to-fit on load
- Click background (no selection)

**Cross-View Sync:**
- Selection persists when switching views
- Pin icon navigation
- Selection popover consistency

### Key Test Patterns

**Wait for MapLibre:**
```typescript
await page.waitForSelector('.maplibregl-canvas', { timeout: 10000 });
```

**Force click on pins:**
```typescript
await firstPin.click({ force: true });
```
(Required due to `pointer-events: auto` on pin container but `pointer-events: none` on label)

**Check visual state:**
```typescript
const bg = await firstLabel.evaluate((el) =>
  window.getComputedStyle(el).backgroundColor
);
expect(bg).toContain('163'); // Accent color RGB
```

## Performance Considerations

### Memoization

All expensive computations are memoized:
- `locatedPlaces` — entity filtering
- `unlocatedPlaces` — entity filtering
- `highlighted` — relationship computation
- `pinClickHandlers` — event handler creation
- `initialViewState` — viewport calculation

### React Dependencies

Selection and highlighting use array conversions for proper React tracking:

```typescript
const selectedIds = useMemo(() => Array.from(selected), [selected]);
const highlightedIds = useMemo(() => Array.from(highlighted), [highlighted]);
```

**Why?** `Set` mutations don't trigger re-renders. Converting to arrays ensures React detects changes.

### Map Reuse

The `reuseMaps` prop prevents MapLibre from destroying and recreating map instances when the component unmounts/remounts:

```tsx
<Map reuseMaps ... />
```

## Common Issues

### Pins Not Clickable

**Symptom:** Clicking pins doesn't select places.

**Cause:** `pointer-events: none` on label prevents clicks.

**Solution:** Label has `pointer-events: none`, but parent container has `pointer-events: auto`. Click events bubble up correctly. If testing, use `{ force: true }` in Playwright.

### Pins Don't Show Selection State

**Symptom:** Pin remains white after clicking.

**Cause:** Selection store not updating, or `selectedIds` dependency not triggering re-render.

**Debug:**
1. Check `selected` Set in React DevTools
2. Verify `selectedIds` array updates
3. Confirm `selected.has(place.id)` returns true

### Map Tiles Don't Load

**Symptom:** Gray background, no tiles.

**Cause:** OSM tile server unreachable, or CORS issue.

**Solution:** Check network tab for tile requests. OSM tiles require attribution and have usage policies.

### Unlocated Footer Missing

**Symptom:** Footer doesn't appear.

**Cause:** `unlocatedPlaces.length === 0` (all places have coords, or all are root).

**Expected:** Only non-root places without coords appear in footer.

## Future Enhancements

Potential improvements not yet implemented:

- **Custom map styles:** Replace OSM with Mapbox/Maptiler styles
- **Clustering:** Group nearby pins at low zoom levels
- **Popups:** Show place details on pin hover
- **Pan-to-selection:** Auto-pan to selected pins
- **Route lines:** Connect scheduled experiences visually
- **Geocoding:** Add coordinates by searching addresses
- **Offline tiles:** Cache tiles for offline use

## Related Documentation

- **VIEWS.md** — Overview of all views and layout
- **DATA_MODEL.md** — Place entity type, coords field, highlighting logic
- **TESTING.md** — E2E testing approach and patterns
- **e2e/DATA_ATTRIBUTES.md** — Data attribute reference for map elements
