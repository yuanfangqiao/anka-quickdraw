# Anka Quickdraw upstream and input changes

The application and SDK sources are based on Quickdraw **v0.3.0**, commit
`af93ce24b42e38588ed8705a0a12188edce60788`. The previous fork base was v0.1.3.
The upgrade uses that exact tag, rather than the upstream default branch.
Upstream application, package, example, documentation and supporting script
changes were merged; upstream GitHub automation and Claude launch configuration
were excluded from the import.

Anka retains its relative asset paths, plugin `dist/` output, local core aliases,
existing application integration and context-menu/selection guards. The upgrade
includes the upstream iOS touch/selection event guards, bundled fonts, themed
chrome, grid improvements and the other v0.3.0 SDK changes.

## Pencil input fixes beyond v0.3.0

- In pen mode, Pencil contact takes over a pinch or accidental finger gesture.
  Palm contact count never rejects the Pencil. Contacts present at pen-down,
  or added while the pen is down, remain ignored until lifted. Pinch requires
  fresh finger contact after drawing.
- Only the pointer that started a non-pinch gesture can move or finish it.
- Unexpected capture loss, window blur and page hiding finish existing ink
  and close its undo batch. A new pen-down also recovers a stale pen gesture.
  Interrupted text placement and selection presses do not become clicks.
- Plain layout children of the drawing surface accept drawing. Floating UI,
  links, inputs and controls retain their interaction. Host controls inside
  the board can opt out with `data-qd-interactive`.
- Decorative file-bar gaps and connection status text allow pointer input
  through to the canvas. File buttons, renaming, links and toolbar controls
  remain interactive.

## Opt-in diagnostics on iPad

Add `?inputDebug=1` to the plugin page URL, or to the Anka host URL (before any
`#` route). A small display shows recent frame/host input events and editor
decisions. Its `pointer-events: none` prevents it from intercepting drawing.
Reload without the parameter to disable it.

From the plugin iframe's console, diagnostics are also accessible through:

```js
__qd.inputDebug.start()
__qd.inputDebug.events // at most 200 entries, in memory; no document contents
__qd.inputDebug.clear()
__qd.inputDebug.stop()
```

`accepted` means the editor admitted contact; `palm` and `finger-in-pen-mode`
describe ignored finger input. A frame `pointerdown` without an editor decision
can identify a control that stopped propagation. A host event without a frame
event can identify an overlay outside the iframe. Input traces are local and
are never uploaded. The core emits optional `input` diagnostic events only
while a listener is attached.

## iPad PWA acceptance checks

1. Draw at least 30 short strokes with the palm lifted, then with it resting
   naturally on the screen. Every Pencil contact should leave a mark.
2. Place two fingers first, then draw with Pencil without lifting those fingers.
   Continue several strokes. Finger motion should not move the canvas.
3. Lift the fingers and start a new two-finger gesture. Pinch should work again.
4. Draw near the status text, around toolbar edges and while a popover closes.
   Decorative areas should allow drawing; controls should perform their action.
5. Switch away from the PWA and return. The next stroke should start normally;
   undo should remove one stroke at a time.
6. Rename a file and edit text/notes. Text selection should work there; the board
   should not acquire a native text selection highlight.

Automated input sequences and builds cannot establish the behavior of real
Apple Pencil Pro events in iPadOS PWA. Complete these checks on the device.
