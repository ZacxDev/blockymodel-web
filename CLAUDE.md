# BlockyModel Web Editor

Web-based 3D editor for BlockyModel format (.blockymodel) using Three.js.

## Commands

```bash
npm run dev          # Start dev server on port 3000
npm run build        # Build app for production
npm run build:lib    # Build library for npm publishing
npm run test:run     # Run tests once
npm run test:coverage # Run tests with coverage
npm run typecheck    # Type check without emitting
```

## Architecture

- **Editor pattern**: Central `Editor` class coordinates all components via events
- **Command pattern**: All state changes go through `History` for undo/redo
- **Event-driven**: Components communicate via `EventEmitter` pattern, not direct calls

## Code Style

- Use ES modules, not CommonJS
- Three.js imported as namespace: `import * as THREE from "three"`
- No `.ts` extensions in imports (breaks library build)
- Prefer `readonly` for class properties that shouldn't change after construction

## Testing

- Tests in `tests/` mirror `src/` structure
- Use `vitest` with `jsdom` environment
- History class has 500ms command merge window - use different objects in tests to prevent merging
- UI components lack unit tests (need DOM/Three.js mocking) - test manually via dev server

## Key Files

- `src/editor/Editor.ts` - Central state, emits: selectionChanged, objectChanged, historyChanged
- `src/editor/History.ts` - Undo/redo with command merging for rapid updates
- `src/editor/commands/Command.ts` - Base interface, all commands must implement execute/undo
- `src/types/blockymodel.ts` - BlockyModel JSON format types

## Gotchas

- TransformControls visibility: use `controls.getHelper().visible`, not `controls.visible`
- Three.js event callbacks need type casting: `(...args: unknown[]) => void`
- Library build externalizes `three` - consumers must install it as peer dependency
