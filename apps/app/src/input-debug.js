// Opt-in, bounded, local-only input traces for iPad PWA diagnosis. Listening in
// both documents distinguishes host overlays from editor rejection. No ink or
// document data is recorded and the display never receives pointer input.
export function createInputDebug(editor) {
  const events = []
  let teardown = null
  const api = {
    get events() { return events.map((e) => ({ ...e })) },
    get enabled() { return teardown !== null },
    clear() { events.length = 0 },
    start() {
      if (teardown) return
      const panel = document.createElement('pre')
      panel.dataset.qdInputDebug = ''
      Object.assign(panel.style, {
        position: 'fixed', right: '8px', top: '64px', zIndex: '100',
        maxWidth: 'min(460px, 90vw)', whiteSpace: 'pre-wrap', margin: '0',
        padding: '8px', font: '11px/1.4 monospace', color: '#fff',
        background: '#000b', pointerEvents: 'none', userSelect: 'none',
      })
      panel.setAttribute('aria-hidden', 'true')
      document.body.appendChild(panel)
      const record = (data) => {
        events.push({ time: Date.now(), ...data })
        if (events.length > 200) events.shift()
        panel.textContent = 'Quickdraw input debug\n' + events.slice(-5).map((e) =>
          `${e.source} ${e.result || e.type} ${e.pointerType || ''} ${e.target || ''}` +
          `${e.targetId ? '#' + e.targetId : ''}` +
          `${e.pointers !== undefined ? ` points=${e.pointers} state=${e.session || 'idle'}` : ''}`
        ).join('\n')
      }
      const off = editor.on('input', (data) => record({ source: 'editor', ...data }))
      const removers = []
      const watch = (doc, source) => {
        const onPointer = (e) => record({
          source, type: e.type, pointerType: e.pointerType, pointerId: e.pointerId,
          target: e.target?.tagName || '', targetId: e.target?.id || '',
          targetClass: e.target?.getAttribute?.('class') || '',
          x: e.clientX, y: e.clientY,
        })
        for (const type of ['pointerdown', 'pointercancel', 'lostpointercapture']) {
          doc.addEventListener(type, onPointer, true)
          removers.push(() => doc.removeEventListener(type, onPointer, true))
        }
      }
      watch(document, 'frame')
      try { if (window.parent !== window) watch(window.parent.document, 'host') } catch {}
      const onBlur = () => record({ source: 'frame', type: 'blur' })
      const onVisibility = () => record({ source: 'frame', type: document.visibilityState })
      window.addEventListener('blur', onBlur)
      document.addEventListener('visibilitychange', onVisibility)
      teardown = () => {
        off()
        for (const remove of removers) remove()
        window.removeEventListener('blur', onBlur)
        document.removeEventListener('visibilitychange', onVisibility)
        panel.remove()
      }
    },
    stop() { teardown?.(); teardown = null },
  }
  const enabled = (search) => new URLSearchParams(search).get('inputDebug') === '1'
  let autoStart = enabled(location.search)
  try { autoStart ||= enabled(window.parent.location.search) } catch {}
  if (autoStart) api.start()
  return api
}
