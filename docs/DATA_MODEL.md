# Data Model

## Overview

Waypoint uses a two-entity model with rigid schemas and well-defined relationships. All entity data lives in Zustand stores, with pure functions for traversal and computation.

## Entity Types

### Place

A locatable entity representing a physical location.

**Properties:**
- `id` (EntityId) - Unique identifier
- `type: "place"` - Type discriminator
- `name` (string) - Display name
- `coords` ({ lat: number, lng: number } | null) - GPS coordinates or null for unlocated
- `parentId` (EntityId | null) - Parent place ID (strict tree hierarchy)
- `sortOrder` (number) - Position among siblings

**Hierarchy:**
- Places form a strict tree: single parent, multiple children
- Places can only parent other places
- Example: Kyoto > Fushimi Inari > Main Shrine

**Location:**
- Places with coordinates appear on the map
- Unlocated places (coords = null) show "no loc" label
- Unlocated places appear in map footer

### Experience

A temporal and/or costable entity representing an activity or expense.

**Properties:**
- `id` (EntityId) - Unique identifier
- `type: "experience"` - Type discriminator
- `name` (string) - Display name
- `parentId` (EntityId | null) - Parent experience ID (strict tree hierarchy)
- `sortOrder` (number) - Position among siblings
- `placeIds` (EntityId[]) - Associated place IDs (many-to-many)
- `schedule` ({ date: string, time: string, timezone: string } | null) - When it happens
- `amount` (number | null) - Cost (makes it an "expense")
- `currency` (Currency) - Currency code (JPY, USD, EUR, etc.)

**Hierarchy:**
- Experiences form a strict tree: single parent, multiple children
- Experiences can only parent other experiences
- Example: Kyoto Trip > March 16 > Fushimi hike > Fox udon ¥850

**Relationships:**
- Many-to-many with places via `placeIds` array
- Experiences with `amount != null` are "expenses"
- No separate Expense type - just experiences with amounts

### Trip

Top-level container for a travel plan.

**Properties:**
- `id` (EntityId) - Unique identifier
- `name` (string) - Trip name
- `startDate` (string) - ISO date
- `endDate` (string) - ISO date

## Relationships

### Parent-Child (Tree Hierarchy)

Both places and experiences form strict trees:

```typescript
// Get all root entities (parentId = null)
const roots = getRoots(entities, "place");

// Get direct children
const children = getChildren(entities, parentId);

// Get all descendants recursively
const descendants = getDescendants(entities, parentId);
```

**Rules:**
- Each entity has 0 or 1 parent (tree structure, not DAG)
- Deletion cascades: removing a parent removes all descendants
- Reparenting updates the `parentId` property

### Experience-Place Association

Many-to-many via `placeIds` array:

```typescript
// An experience can happen at multiple places
experience.placeIds = ["p-kyoto", "p-fushimi"];

// Get all experiences at a place (including child places)
const exps = getExperiencesForPlace(entities, placeId);
```

## Selection and Highlighting

### Selection

Entities the user explicitly clicked. Visual: solid colored background with white text.

```typescript
// Selection store
const { selectedIds, click, toggle, clear } = useSelectionStore();

// Check if selected
const isSelected = selectedIds.includes(entity.id);
```

**Interaction:**
- Plain click: replace selection
- Ctrl/Cmd+click: toggle in/out of selection
- Clicking same entity again: deselect
- Day header click (schedule): select all experiences on that date

### Highlighting

Entities derived from selection via relationships. Visual: semi-transparent background with colored border.

```typescript
// Compute highlighted entities
const highlighted = computeHighlighted(entities, selectedIds);

// Check if highlighted
const isHighlighted = highlighted.has(entity.id);
```

**Rules:**
- Selected entity's descendants → highlighted
- Selected experience's associated places → highlighted
- Selected place's associated experiences (including at child places) → highlighted
- Selected entities themselves are never in the highlighted set

## Data Flow

### Store Architecture

```
Zustand Store (src/entities/store.ts)
├── entities: Map<EntityId, Place | Experience>
├── trip: Trip
└── CRUD operations:
    ├── addPlace / addExperience
    ├── updatePlace / updateExperience
    ├── removePlace / removeExperience
    ├── reparent
    └── hydrate (load from external source)

Selection Store (src/entities/selection.ts)
├── selectedIds: Set<EntityId>
└── operations:
    ├── click (replace selection)
    ├── toggle (add/remove from selection)
    ├── selectMany (select multiple)
    └── clear
```

### Derived Data

All traversal and aggregation is computed via pure functions in `src/entities/helpers.ts`:

- `getRoots(entities, type)` - Get top-level entities
- `getChildren(entities, parentId)` - Get direct children
- `getDescendants(entities, parentId)` - Get all descendants
- `computeHighlighted(entities, selectedIds)` - Compute highlighting
- `getSubtreeCost(entities, experienceId)` - Aggregate cost for experience tree
- `aggregateCosts(amounts)` - Multi-currency total
- `getExperiencesForDate(entities, date)` - Filter by date
- `getUnscheduledExperiences(entities)` - Unscheduled, non-parent experiences

**Why not store derived data?**
- Keeps store simple
- Avoids stale data bugs
- Makes sync easier (PartyKit/Yjs integration)
- React re-renders efficiently with memoization

## Mutations

Every store mutation is a discrete atomic operation:

```typescript
// Add a new place
store.addPlace({ name: "Tokyo", coords: null, parentId: null });

// Update place
store.updatePlace("p-tokyo", { name: "Tokyo Station", coords: { lat: 35.68, lng: 139.77 } });

// Remove place (cascades to children)
store.removePlace("p-tokyo");

// Reparent entity
store.reparent("p-shibuya", "p-tokyo"); // Move Shibuya under Tokyo
```

**Design rationale:**
- Each mutation maps to a single PartyKit/Yjs Storage operation
- Atomic operations prevent partial state updates
- Easy to sync across clients
- Simple to implement undo/redo

## IDs

Entities use UUIDs generated with `crypto.randomUUID()` (browser native).

**Seed data** uses readable IDs for debugging:
- `p-kyoto` (place: Kyoto)
- `e-fushimi-hike` (experience: Fushimi hike)

## Currency Handling

Expenses can have different currencies. Totals show multi-currency format:

```typescript
type Currency = "JPY" | "USD" | "EUR" | "GBP" | "AUD";

// Single currency
"¥3,200"

// Multi-currency
"$120 + ¥111,400"
```

Aggregation uses `aggregateCosts()` helper which groups by currency.

## Design Rationale

### Why Compute Derived Data?

All traversal and aggregation is computed via pure functions rather than stored:

**Benefits:**
- Keeps store simple and minimal
- Avoids stale derived state bugs
- Makes sync easier (PartyKit/Yjs integration)
- React re-renders efficiently with memoization

**Pattern:**
```typescript
// In components
const descendants = getDescendants(entities, parentId);
const highlighted = computeHighlighted(entities, selectedIds);
const cost = getSubtreeCost(entities, experienceId);
```

Each function is pure and deterministic - same inputs always produce same outputs.

### Why Discrete Mutations?

Every store mutation is a single atomic operation:

**Benefits:**
- Each mutation maps 1:1 to a PartyKit/Yjs Storage operation
- Atomic operations prevent partial state updates
- Easy to sync across clients
- Simple to implement undo/redo

**Example:**
```typescript
// Single atomic operation
store.reparent("p-shibuya", "p-tokyo");

// Not multiple updates that could leave inconsistent state
```

### Why Separate Selection Store?

Selection lives in `useSelectionStore`, separate from entity data:

**Benefits:**
- Keeps concerns clean and focused
- Selection changes don't trigger entity re-renders
- Easier to reason about what causes updates
- Clear separation of data vs UI state

## Type Definitions

See `src/entities/types.ts` for complete TypeScript definitions:

```typescript
type Place = {
  id: EntityId;
  type: "place";
  name: string;
  coords: { lat: number; lng: number } | null;
  parentId: EntityId | null;
  sortOrder: number;
};

type Experience = {
  id: EntityId;
  type: "experience";
  name: string;
  parentId: EntityId | null;
  sortOrder: number;
  placeIds: EntityId[];
  schedule: { date: string; time: string; timezone: string } | null;
  amount: number | null;
  currency: Currency;
};

type Trip = {
  id: EntityId;
  name: string;
  startDate: string;
  endDate: string;
};
```

Factory functions are provided for creating entities with defaults:
- `createPlace(name, options?)`
- `createExperience(name, options?)`
- `createTrip(name, startDate, endDate)`
