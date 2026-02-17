# Development Guide

## Code Style

### React Components

- Functional components with hooks throughout
- Keep components small and composable
- Shared `<Chip>` component used across notes, popover, map footer, tree views
- Test interactions with the seed data (Kyoto trip)

### TypeScript

- Strict mode enabled
- `noUnusedLocals: false` for development flexibility
- Prefer explicit types over inference for clarity
- Use discriminated unions for entity types

### Styling Approach

**Dynamic state-driven styles:** Use inline styles
```typescript
// Selection/highlight states computed at render
style={{
  backgroundColor: isSelected ? '#a33d22' : 'transparent',
  color: isSelected ? 'white' : '#1a1917',
}}
```

**Static layout:** Use CSS
```css
.tree-view {
  padding: 8px;
  overflow: auto;
}
```

**Why:** Inline styles for state avoid CSS class explosion and make state dependencies explicit.

### Component Structure

```typescript
export function MyComponent({ entity, isSelected, isHighlighted }: Props) {
  // 1. Hooks (state, context, stores)
  const { updateEntity } = useEntityStore();
  const [isEditing, setIsEditing] = useState(false);

  // 2. Derived state and computations
  const descendants = getDescendants(entities, entity.id);

  // 3. Event handlers
  const handleClick = (e: React.MouseEvent) => {
    // ...
  };

  // 4. Render
  return (
    <div onClick={handleClick}>
      {/* ... */}
    </div>
  );
}
```

## Testing Approach

### Data Attributes

Always add data attributes for E2E tests:
```typescript
<div
  data-entity-chip
  data-entity-id={entity.id}
  data-selected={isSelected ? "true" : undefined}
>
```

See `e2e/DATA_ATTRIBUTES.md` for complete reference.

### Manual Testing

Use the seed data for comprehensive coverage:
- 9 places (including unlocated)
- 22 experiences (scheduled/unscheduled, with/without amounts)
- Hierarchical relationships
- Multi-currency expenses

Every interaction should work with the Kyoto trip graph.

## Dependencies

### Core Stack

- **React 18** - UI framework
- **Vite 6** - Build tool and dev server
- **TypeScript 5** - Type safety
- **Zustand 5** - State management
- **TipTap** - Rich text editor (ProseMirror wrapper)
- **Leaflet** - Maps
- **PartyKit** - Real-time collaboration (WebSocket server on Cloudflare Workers)
- **Yjs** - CRDT for collaborative editing
- **Playwright** - E2E testing

### Adding Dependencies

Consider carefully before adding new dependencies:
- Prefer native browser APIs when available
- Avoid large component libraries
- Keep bundle size reasonable
- Check for TypeScript support

## Backend

PartyKit provides the real-time sync backend (Cloudflare Workers + Durable Objects).

**Implications:**
- No server-side validation
- Authentication can be handled in the PartyKit server's `onConnect`
- Data persists via Yjs snapshots in Cloudflare Durable Objects
- Data resets on reload when PartyKit disabled

## File Organization

```
src/
├── entities/           # Core domain logic (pure functions)
├── editor/            # TipTap extensions and editor components
├── partykit/          # Collaboration infrastructure
├── components/        # Reusable UI components
│   └── tree/         # Tree view components
├── App.tsx           # Root component and routing
├── styles.css        # Global styles and design tokens
└── main.tsx          # Entry point
```

**Principles:**
- Domain logic in `entities/` (no React dependencies)
- Pure functions for all derived data
- Components are thin wrappers around store operations
- Shared components in `components/`
- Feature-specific components colocated with features

## Common Patterns

### Reading from Stores

```typescript
// Entity store
const { entities, addPlace, updatePlace } = useEntityStore();

// Selection store
const { selectedIds, click, toggle } = useSelectionStore();

// Derive highlighting
const highlighted = computeHighlighted(entities, selectedIds);
```

### Mutations

```typescript
// Always use store methods
store.addPlace({ name: "Tokyo", coords: null, parentId: null });
store.updateExperience(id, { amount: 850, currency: "JPY" });
store.reparent(childId, newParentId);

// Never mutate directly
entities.get(id).name = "New Name"; // ❌ Don't do this
```

### Traversal

```typescript
// Use helper functions from entities/helpers.ts
const roots = getRoots(entities, "place");
const children = getChildren(entities, parentId);
const descendants = getDescendants(entities, parentId);
const cost = getSubtreeCost(entities, experienceId);
```

### Selection Handling

```typescript
// Plain click - replace selection
const handleClick = (e: React.MouseEvent, entityId: string) => {
  if (e.ctrlKey || e.metaKey) {
    toggle(entityId); // Multi-select
  } else {
    click(entityId); // Replace
  }
};
```

## Performance Considerations

### Zustand Selectors

Use selectors to prevent unnecessary re-renders:

```typescript
// ✓ Good - only re-renders when this entity changes
const entity = useEntityStore(state => state.entities.get(id));

// ✗ Bad - re-renders on any entity change
const { entities } = useEntityStore();
const entity = entities.get(id);
```

### Memoization

Use `useMemo` for expensive computations:

```typescript
const highlighted = useMemo(
  () => computeHighlighted(entities, selectedIds),
  [entities, selectedIds]
);
```

### React Keys

Always use stable IDs for keys:

```typescript
// ✓ Good
{entities.map(entity => (
  <TreeNode key={entity.id} entity={entity} />
))}

// ✗ Bad
{entities.map((entity, index) => (
  <TreeNode key={index} entity={entity} />
))}
```

## Debugging Tips

### Zustand DevTools

Enable Redux DevTools for Zustand:

```typescript
// In store.ts
const useEntityStore = create<EntityStore>()(
  devtools(
    (set, get) => ({
      // ... store implementation
    }),
    { name: 'EntityStore' }
  )
);
```

### React DevTools

Install React DevTools browser extension for component inspection.

### PartyKit Dashboard

Use `partykit dev` logs and browser DevTools to inspect:
- WebSocket connections
- Yjs document state
- Awareness/presence data

### Playwright Debug Mode

```bash
npx playwright test --debug
```

Opens inspector for step-by-step test debugging.

## Common Pitfalls

### 1. Mutating Store Directly

```typescript
// ❌ Don't mutate
const entity = entities.get(id);
entity.name = "New Name";

// ✓ Use store methods
updatePlace(id, { name: "New Name" });
```

### 2. Forgetting Data Attributes

Components without data attributes break E2E tests. Always add them.

### 3. Circular Dependencies

Don't import from parent directories. Keep dependencies flowing downward:
- `entities/` → no dependencies
- `components/` → can use `entities/`
- `App.tsx` → can use everything

### 4. Storing Derived State

```typescript
// ❌ Don't store computed values
const [descendants, setDescendants] = useState([]);

// ✓ Compute on demand
const descendants = getDescendants(entities, parentId);
```

### 5. Missing Selection State

Every entity display should respect selection/highlighting:
```typescript
const isSelected = selectedIds.includes(entity.id);
const isHighlighted = highlighted.has(entity.id);
```

## Getting Help

- **Data model questions** → `docs/DATA_MODEL.md`
- **Editor questions** → `docs/EDITOR.md`
- **View implementation** → `docs/VIEWS.md`
- **Testing help** → `docs/TESTING.md`
- **Collaboration setup** → `docs/COLLABORATION.md`
