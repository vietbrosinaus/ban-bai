# Table prototype (throwaway)

Two artifacts, both throwaway:

## 1. The map: `state-machines.html`

Open it straight from disk, nothing to build:

```
open app/prototype/table/state-machines.html
```

Six tabs: the object scopes, the state machines (click a box to isolate its transitions), every action with how you reach it, the menu diet (9 right-click items down to 4), a clickable model driver, and the open questions.

## 2. The feel: `/prototype/table?variant=A|B|C`

`npm run dev`, then http://localhost:3000/prototype/table. Arrow keys or the bottom pill switch variants. State is in memory and survives switching.

- **A. Bird's eye + tray.** Top-down table, chồng tướng and chồng bài on the left edge, hand fanned in a tray below. Right click opens the shadcn `ContextMenu`.
- **B. Seated view, held hand.** You sit at the table, opponents across from you hold face-down fans, your hand is drawn as a hand holding cards. Same context menu.
- **C. One canvas, radial menu.** No chrome. Hand is a strip on the same canvas. Right click opens a radial menu at the pointer, and plain drag peels the top card instead of moving the whole stack.

Built from the repo's own stack: shadcn (`ContextMenu`, `Button`, `Badge`, `Separator`) and `lucide-react` icons. The felt, cards and hand cursors are custom CSS because shadcn has no primitive for them.

Gestures, all three variants:

| Input | On a card or stack | On a card in your hand |
| --- | --- | --- |
| Left drag | move it; drop on another piece to stack; drop on the hand tray to take it | play it where you drop it; drop on a stack to put it on top; Shift to play face down |
| Shift + left drag | A, B: peel the top card. C: drag the whole stack | |
| Double click | flip the top card | |
| Middle click | take the top card into your hand | |
| Wheel | rotate 15° per notch | |
| Right click | the menu, which also shows the gesture for anything that has one | |

Four fake peers move their hands, pick pieces up and draw from chồng bài, so the realtime feel can be judged without a network. Touch gestures are not built.

## Known finding

Variant C's radial menu holds 10 items badly: the ring is wider than the pile it belongs to and covers the table. It only works once the menu is cut to about 4 items, which is the argument the menu diet tab makes.

## Decisions taken, 2026-09-18

After the plan review these are settled. Do not re-open them without a reason written here.

**Phones are not supported in v1.** Two of the four core gestures have no touch equivalent: the wheel picks a card count, and right click opens the menu. The plan's own fallback of long press for the menu collides with long press for peek, and nothing decided which wins. Desktop with a three button mouse and a wheel is the target. This is a known regression, because production today drags cards with plain pointer events and only excludes touch from cursor sharing, so phone players can currently drag, flip and use the menu. Tell the group before they sit down.

**No undo, plus confirmations on the few actions that are expensive to reverse.** A misplaced card is trivially put back by hand, so a general undo stack is not worth its cost across a shared, concurrently edited table. But three actions are not cheap to reverse and get a confirmation: merging two stacks with different tags (mixing chồng tướng into chồng bài makes a 168 card pile with no split by type action to undo it), clear table, and reset. Dealing is already gated behind a dialog that states it clears the table first.

**The transport is a separate project, not part of this pivot.** Raise the poll rates first and measure. Push transport, if it happens, is PartyKit rather than a hand rolled Durable Object.
