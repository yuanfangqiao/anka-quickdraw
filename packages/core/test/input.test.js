// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Editor } from '../src/editor.js'
import { createInputDebug } from '../../../apps/app/src/input-debug.js'

let editor, root, debug
const event = (id, type, x = 20, y = 20, extra = {}) => ({
  pointerId: id, pointerType: type, clientX: x, clientY: y,
  button: 0, pressure: 0.5, target: editor.canvas,
  preventDefault() {}, ...extra,
})
const down = (...args) => editor._pointerDown(event(...args))
const move = (...args) => editor._pointerMove(event(...args))
const up = (...args) => editor._pointerUp(event(...args))
const stroke = (id) => { down(id, 'pen'); move(id, 'pen', 80, 60); up(id, 'pen', 80, 60) }

beforeEach(() => {
  root = document.createElement('div')
  document.body.appendChild(root)
  editor = new Editor({ container: root })
})
afterEach(() => {
  debug?.stop()
  debug = null
  editor.destroy()
  root.remove()
})

describe('Pencil and palm input', () => {
  it('lets the first Pencil contact replace an accidental single-finger stroke', () => {
    down(2, 'touch')
    move(2, 'touch', 200, 200)
    stroke(1)
    expect(editor.store.shapes()).toHaveLength(1)
    expect(editor.store.shapes()[0].props.isPen).toBe(true)
  })
  it('starts a Pencil stroke over an existing two-finger pinch, even with extra palm contacts', () => {
    stroke(1)
    down(2, 'touch', 10, 10)
    down(3, 'touch', 100, 10)
    down(4, 'touch', 50, 10)
    stroke(5)
    expect(editor.store.shapes()).toHaveLength(2)
    expect(editor.store.shapes().every((s) => s.props.done && s.props.pts.length > 3)).toBe(true)
    editor.store.undo()
    expect(editor.store.shapes()).toHaveLength(1)
  })

  it('keeps accepting consecutive strokes while the same palm contacts remain down', () => {
    down(2, 'touch', 10, 10)
    down(3, 'touch', 100, 10)
    for (let id = 10; id < 30; id++) stroke(id)
    expect(editor.store.shapes()).toHaveLength(20)
    expect(editor.store.shapes().every((s) => s.props.done && s.props.isPen)).toBe(true)
  })

  it('does not let palm movement or release extend or finish an active stroke', () => {
    down(1, 'pen')
    move(1, 'pen', 40, 40)
    down(2, 'touch', 200, 200)
    down(3, 'touch', 300, 300)
    move(2, 'touch', 400, 400)
    up(2, 'touch')
    up(3, 'touch')
    up(99, 'mouse')
    move(1, 'pen', 80, 60)
    up(1, 'pen', 80, 60)
    const [shape] = editor.store.shapes()
    expect(shape.props.pts).toEqual([0, 0, 0.5, 20, 20, 0.5, 60, 40, 0.5])
    expect(shape.props.done).toBe(true)
    expect(editor.camera).toEqual({ x: 0, y: 0, z: 1 })
  })

  it('requires fresh finger contact to resume pinch after using the Pencil', () => {
    down(2, 'touch', 10, 10)
    down(3, 'touch', 100, 10)
    stroke(1)
    move(3, 'touch', 200, 10)
    expect(editor.camera.z).toBe(1)
    up(2, 'touch'); up(3, 'touch')
    down(4, 'touch', 10, 10)
    down(5, 'touch', 100, 10)
    move(5, 'touch', 190, 10)
    expect(editor.camera.z).toBeCloseTo(2)
    expect(editor.store.shapes()).toHaveLength(1)
  })

  it('still allows finger drawing when pen mode is explicitly disabled', () => {
    stroke(1)
    editor.setPenMode(false)
    down(2, 'touch'); move(2, 'touch', 80, 60); up(2, 'touch', 80, 60)
    expect(editor.store.shapes()).toHaveLength(2)
  })
})

describe('drawing surface hit testing and browser defaults', () => {
  it('accepts a plain layout child while excluding nested interactive elements', () => {
    const layout = document.createElement('div')
    root.appendChild(layout)
    down(1, 'pen', 20, 20, { target: layout })
    move(1, 'pen', 80, 60); up(1, 'pen', 80, 60)
    for (const markup of [
      '<button><span>tool</span></button>', '<a><span>link</span></a>',
      '<div class="qd-ui"><span>chrome</span></div>',
      '<div class="qd-root"><span>nested board</span></div>',
      '<div data-qd-interactive><span>host control</span></div>',
    ]) {
      layout.innerHTML = markup
      down(2, 'pen', 20, 20, { target: layout.querySelector('span') })
      up(2, 'pen')
    }
    expect(editor.store.shapes()).toHaveLength(1)
  })

  it('blocks touch defaults and selection on the surface, and keeps text editing selectable', () => {
    const canvasTouch = new Event('touchstart', { bubbles: true, cancelable: true })
    editor.canvas.dispatchEvent(canvasTouch)
    expect(canvasTouch.defaultPrevented).toBe(true)
    const selection = new Event('selectstart', { bubbles: true, cancelable: true })
    editor.canvas.dispatchEvent(selection)
    expect(selection.defaultPrevented).toBe(true)
    const input = document.createElement('textarea')
    root.appendChild(input)
    for (const type of ['touchstart', 'selectstart']) {
      const e = new Event(type, { bubbles: true, cancelable: true })
      input.dispatchEvent(e)
      expect(e.defaultPrevented).toBe(false)
    }
  })
})

describe('input interruption recovery', () => {
  it('accepts a new Pencil contact even when the previous up event was omitted', () => {
    down(1, 'pen'); move(1, 'pen', 80, 60)
    stroke(2)
    expect(editor.store.shapes()).toHaveLength(2)
    expect(editor.store.shapes().every((s) => s.props.done)).toBe(true)
    editor.store.undo()
    expect(editor.store.shapes()).toHaveLength(1)
  })
  it('preserves ink and closes its undo batch after unexpected pointer capture loss', () => {
    down(1, 'pen'); move(1, 'pen', 80, 60)
    const lost = new Event('lostpointercapture', { bubbles: true })
    Object.assign(lost, { pointerId: 1, pointerType: 'pen' })
    root.dispatchEvent(lost)
    expect(editor.store.shapes()[0].props.done).toBe(true)
    stroke(2)
    editor.store.undo()
    expect(editor.store.shapes()).toHaveLength(1)
    editor.store.undo()
    expect(editor.store.shapes()).toHaveLength(0)
  })

  it('recovers on iframe blur without carrying old palm points or undo batches', () => {
    down(1, 'pen'); move(1, 'pen', 80, 60)
    down(2, 'touch'); down(3, 'touch', 100, 10)
    window.dispatchEvent(new Event('blur'))
    expect(editor.store.shapes()[0].props.done).toBe(true)
    stroke(4)
    editor.store.undo()
    expect(editor.store.shapes()).toHaveLength(1)
    down(5, 'touch', 10, 10); down(6, 'touch', 100, 10)
    move(6, 'touch', 190, 10)
    expect(editor.camera.z).toBeCloseTo(2)
  })

  it('recovers when the page becomes hidden and accepts the next stroke', () => {
    down(1, 'pen'); move(1, 'pen', 80, 60)
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    try { document.dispatchEvent(new Event('visibilitychange')) }
    finally { delete document.hidden }
    stroke(2)
    expect(editor.store.shapes()).toHaveLength(2)
    expect(editor.store.shapes().every((s) => s.props.done)).toBe(true)
  })

  it('does not place text or turn a cancelled contact into a double tap', () => {
    editor.setTool('text')
    down(1, 'pen')
    window.dispatchEvent(new Event('blur'))
    expect(editor.store.shapes()).toHaveLength(0)
    expect(editor.editing).toBeNull()
    down(4, 'pen')
    up(4, 'pen', 20, 20, { type: 'pointercancel' })
    expect(editor.store.shapes()).toHaveLength(0)
    const lost = new Event('lostpointercapture', { bubbles: true })
    Object.assign(lost, { pointerId: 5, pointerType: 'pen' })
    down(5, 'pen')
    root.dispatchEvent(lost)
    expect(editor.store.shapes()).toHaveLength(0)
    editor.setTool('select')
    down(2, 'pen'); up(2, 'pen', 20, 20, { type: 'pointercancel' })
    down(3, 'pen'); up(3, 'pen')
    expect(editor.editing).toBeNull()
  })
})

describe('opt-in input diagnostics', () => {
  it('records bounded decisions without adding a layer that can receive Pencil input', () => {
    debug = createInputDebug(editor)
    expect(debug.enabled).toBe(false)
    debug.start()
    const panel = document.querySelector('[data-qd-input-debug]')
    expect(panel.style.pointerEvents).toBe('none')
    for (let i = 0; i < 210; i++) stroke(i)
    expect(debug.events).toHaveLength(200)
    expect(debug.events.at(-1)).toMatchObject({ source: 'editor', result: 'accepted', pointerType: 'pen' })
    debug.stop()
    expect(document.querySelector('[data-qd-input-debug]')).toBeNull()
  })
})
