/**
 * quickdraw 多端同步客户端（M16）。
 *
 * 与 server/app/api/sync_api.py 的实际协议对齐：
 *   - 房间由 URL 决定：/api/sync/ws/{room}?app=quickdraw&file={fileId}
 *     （服务端在连接建立时即入房并发 hello，不存在客户端 hello 消息）
 *   - C→S：doc{file,diff,client_id} / snapshot{file,snapshot} / ping
 *   - S→C：hello{snapshot,rev,peers} / ack{file,seq} / doc{file,seq,client_id,diff}
 *          / snapshot-ok / error
 *
 * 引擎接合点只有两个：
 *   store.listen(fn, { source: 'user' })  —— 订阅本地操作（引擎已按来源过滤）
 *   store.applyDiff(diff, 'remote')       —— 应用远端变更，不进本地 undo 栈
 */
import { composeDiff } from '@quickdrawjs/core'

const MAX_RETRY_MS = 10000

export function createSync({ store, room = 'main', file = 'default' }) {
  const clientId = Math.random().toString(36).slice(2, 10)
  const handlers = {}

  let curRoom = room
  let curFile = file
  let socket = null
  let stopped = false
  let retry = 0
  let rafId = 0
  let timer = 0
  let flushTimer = 0
  let pending = null
  let lastSeq = 0
  let gotSnapshot = false   // 服务端 hello 快照是否已处理（避免覆盖本地未上行的内容）

  function emit(kind, payload) {
    const fn = handlers[kind]
    if (!fn) return
    try {
      fn(payload)
    } catch (e) {
      console.error('[sync] handler error', e)
    }
  }

  function send(obj) {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(obj))
    }
  }

  // 本地 diff 攒到下一帧合并发送（一笔一帧，避免逐 pointer 打爆连接）。
  // rAF 在后台标签页不跑，必须加定时器兜底，否则后台画的笔画永远发不出去。
  function flush() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0 }
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = 0 }
    if (!pending) return
    const diff = pending
    pending = null
    send({ type: 'doc', file: curFile, diff, client_id: clientId })
  }

  function publish(diff) {
    if (!diff) return
    pending = pending ? composeDiff(pending, diff) : diff
    if (!rafId && !flushTimer) {
      rafId = requestAnimationFrame(flush)
      flushTimer = setTimeout(flush, 150)
    }
  }

  function applyRemote(diff) {
    if (diff) store.applyDiff(diff, 'remote')
  }

  function handleMessage(e) {
    let msg
    try {
      msg = JSON.parse(e.data)
    } catch (err) {
      return
    }
    switch (msg.type) {
      case 'hello': {
        // 首连拉到服务端快照。default 房间以服务器为权威源：
        //   - 远端有内容 → 采用远端（覆盖本地离线缓存，保证任何一端都能看到共享画布）
        //   - 远端为空且本地有内容 → 把本地推上去（谁先在线谁保底）
        // 取舍：离线期间画的本地内容在远端已有内容时会被覆盖——个人单画布场景
        // 可接受；将来做多画布/离线合并时再改为 diff 合并。
        const remoteStore = (msg.snapshot?.document?.store) || {}
        const remoteCount = Object.keys(remoteStore).length
        const localCount = Object.keys(store.getSnapshot()?.document?.store || {}).length
        if (remoteCount > 0) {
          store.loadSnapshot(msg.snapshot, 'remote')
          emit('snapshot', msg)
        } else if (localCount > 0) {
          send({ type: 'snapshot', file: curFile, snapshot: store.getSnapshot() })
        }
        gotSnapshot = true
        lastSeq = msg.rev || 0
        emit('status', { kind: 'online', peers: msg.peers })
        break
      }
      case 'doc':
        if (msg.client_id && msg.client_id === clientId) return   // 回声抑制
        if (typeof msg.seq === 'number') lastSeq = msg.seq
        applyRemote(msg.diff)
        emit('doc', msg)
        break
      case 'ack':
        if (typeof msg.seq === 'number') lastSeq = msg.seq
        emit('ack', msg)
        break
      case 'error':
        console.warn('[sync] server error:', msg.message)
        emit('error', msg)
        break
      default:
        emit('raw', msg)
    }
  }

  function connect() {
    stopped = false
    gotSnapshot = false
    const url = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`
      + `/api/sync/ws/${encodeURIComponent(curRoom)}`
      + `?app=quickdraw&file=${encodeURIComponent(curFile)}&client_id=${clientId}`
    socket = new WebSocket(url)
    socket.onopen = () => {
      retry = 0
    }
    socket.onmessage = handleMessage
    socket.onerror = () => { /* onclose 会跟进来，重连在那边做 */ }
    socket.onclose = () => {
      if (stopped) return
      retry = Math.min(retry + 1, 6)
      const delay = Math.min(500 * 2 ** (retry - 1), MAX_RETRY_MS)
      emit('status', { kind: 'reconnecting', delay, retry })
      timer = setTimeout(connect, delay)
    }
  }

  function setFile(fid) {
    if (fid === curFile) return
    curFile = fid
    clearTimeout(timer)
    retry = 0
    try { socket.close() } catch (e) { /* noop */ }
    connect()   // 房间由 URL 决定，换文件即重连入新房
  }

  function close() {
    stopped = true
    clearTimeout(timer)
    cancelAnimationFrame(rafId)
    clearTimeout(flushTimer)
    try { socket.close() } catch (e) { /* noop */ }
    emit('status', { kind: 'offline' })
  }

  const api = {
    clientId,
    on(kind, fn) {
      handlers[kind] = fn
      return api
    },
    connect,
    setFile,
    close,
    publish,
    get file() { return curFile },
    get lastSeq() { return lastSeq },
  }
  return api
}
