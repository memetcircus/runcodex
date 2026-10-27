import {createServer} from 'node:http'
import {connect as connectSocket} from 'node:net'
import {createHash, randomBytes, timingSafeEqual} from 'node:crypto'
import os from 'node:os'

// Development-only LAN relay. Codex stays on its Unix socket; only allowlisted
// app-server RPC calls and approval requests are forwarded to one paired client.
const projectRoot = process.env.RUNCODEX_PROJECT_ROOT ?? process.cwd()
const socketPath = process.env.CODEX_APP_SERVER_SOCKET ?? `${os.homedir()}/.codex/app-server-control/app-server-control.sock`
const host = process.env.RUNCODEX_BRIDGE_HOST ?? '0.0.0.0'
const port = Number(process.env.RUNCODEX_BRIDGE_PORT ?? 8765)
const token = process.env.RUNCODEX_BRIDGE_TOKEN ?? randomBytes(24).toString('base64url')
const allowedMethods = new Set(['initialize', 'initialized', 'thread/list', 'thread/turns/list', 'thread/resume', 'turn/start', 'turn/steer'])
// Codex app-server can include large recent-turn payloads. Keep a firm cap,
// but allow those frames through so the local relay does not drop its client.
const MAX_WEBSOCKET_FRAME_BYTES = 32 * 1024 * 1024
const allowedThreadIds = new Set()
const pendingApprovals = new Set()
const pendingApprovalMessages = new Map()
const activeTurnIds = new Map()
let pairedClient = null
let nextRpcId = 700000
let codexReady = false
let codexBuffer = Buffer.alloc(0)
const allowedNotifications = new Set([
  'thread/started', 'thread/name/updated', 'turn/started', 'turn/completed',
  'item/started', 'item/agentMessage/delta', 'item/completed', 'serverRequest/resolved',
])

function safeEqual(a, b) {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

function isLocalClient(address = '') {
  const normalized = address.toLowerCase().replace(/^::ffff:/, '')
  if (normalized === '::1' || normalized === 'localhost') return true
  const octets = normalized.split('.').map(Number)
  if (octets.length === 4 && octets.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)) {
    const [a, b] = octets
    return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 169 && b === 254)
  }
  return normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe8') ||
    normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')
}

function replyError(message, code, text) {
  if (message.id !== undefined) sendClient({id: message.id, error: {code, message: text}})
}

function frame(opcode, payload, masked = false) {
  const body = Buffer.isBuffer(payload) ? Buffer.from(payload) : Buffer.from(payload)
  const mask = masked ? randomBytes(4) : null
  let header
  if (body.length < 126) header = Buffer.from([0x80 | opcode, (masked ? 0x80 : 0) | body.length])
  else if (body.length < 65536) {
    header = Buffer.alloc(4)
    header[0] = 0x80 | opcode
    header[1] = (masked ? 0x80 : 0) | 126
    header.writeUInt16BE(body.length, 2)
  } else {
    header = Buffer.alloc(10)
    header[0] = 0x80 | opcode
    header[1] = (masked ? 0x80 : 0) | 127
    header.writeBigUInt64BE(BigInt(body.length), 2)
  }
  if (!mask) return Buffer.concat([header, body])
  for (let i = 0; i < body.length; i++) body[i] ^= mask[i % 4]
  return Buffer.concat([header, mask, body])
}

function sendClient(message) {
  if (pairedClient && !pairedClient.destroyed) pairedClient.write(frame(1, JSON.stringify(message)))
}

function dropClient(code = 1000, reason = 'Disconnected') {
  if (!pairedClient) return
  try {
    const body = Buffer.alloc(2 + Buffer.byteLength(reason))
    body.writeUInt16BE(code)
    body.write(reason, 2)
    pairedClient.write(frame(8, body))
  } catch {}
  pairedClient.destroy()
  pairedClient = null
}

function forwardRpc(message) {
  if (!codexReady) {
    if (message.id !== undefined) sendClient({id: message.id, error: {code: -32000, message: 'Codex app-server is not ready'}})
    return
  }
  if (message.id !== undefined && !message.method) {
    const id = String(message.id)
    if (!pendingApprovals.has(id) || !message.result || !['accept', 'decline', 'cancel'].includes(message.result.decision)) {
      dropClient(1008, 'Unsupported response')
      return
    }
    pendingApprovals.delete(id)
    pendingApprovalMessages.delete(id)
    codexSocket.write(frame(1, JSON.stringify(message), true))
    return
  }
  if (!allowedMethods.has(message.method)) {
    if (message.id !== undefined) sendClient({id: message.id, error: {code: -32601, message: 'Method is not available in RunCodex'}})
    return
  }
  const params = message.params ?? {}
  if (message.method === 'thread/list') {
    message.params = {cwd: projectRoot, archived: false, limit: 50, sortKey: 'updated_at', sortDirection: 'desc'}
  }
  if (['thread/turns/list', 'thread/resume', 'turn/start', 'turn/steer'].includes(message.method)) {
    const threadId = params.threadId
    if (!threadId || !allowedThreadIds.has(threadId)) {
      sendClient({id: message.id, error: {code: -32602, message: 'Select a task from this project first'}})
      return
    }
  }
  if (message.method === 'turn/start' || message.method === 'turn/steer') {
    const threadId = params.threadId
    const input = params.input
    if (!Array.isArray(input) || input.length !== 1 || input[0]?.type !== 'text' || typeof input[0]?.text !== 'string') {
      replyError(message, -32602, 'RunCodex accepts one plain-text message at a time')
      return
    }
    const text = input[0].text.trim()
    if (!text || text.length > 4000) {
      replyError(message, -32602, 'Message must contain 1–4000 characters')
      return
    }
    const activeTurnId = activeTurnIds.get(threadId)
    if (message.method === 'turn/start' && activeTurnId) {
      replyError(message, -32602, 'This Codex task is already working; send as a turn steer')
      return
    }
    if (message.method === 'turn/steer' && (!activeTurnId || params.expectedTurnId !== activeTurnId)) {
      replyError(message, -32602, 'The active Codex turn changed; refresh status and try again')
      return
    }
    message.params = message.method === 'turn/start'
      ? {threadId, input: [{type: 'text', text}]}
      : {threadId, input: [{type: 'text', text}], expectedTurnId: activeTurnId}
  }
  if (message.method === 'thread/resume') message.params = {threadId: params.threadId, excludeTurns: true}
  if (message.method === 'thread/turns/list') {
    // Keep a small recent window so Refresh Codex status restores the latest
    // user prompt and Codex response instead of only the latest turn.
    message.params = {threadId: params.threadId, limit: 5, sortDirection: 'desc', itemsView: 'full'}
  }
  const clientId = message.id
  if (clientId !== undefined) {
    const rpcId = nextRpcId++
    pairedState.rpcIds.set(String(rpcId), clientId)
    pairedState.rpcMethods.set(String(rpcId), message.method)
    if (params.threadId) pairedState.rpcThreads.set(String(rpcId), params.threadId)
    message.id = rpcId
  }
  codexSocket.write(frame(1, JSON.stringify(message), true))
  // App-server approval requests are notifications and can arrive before the
  // Lens has selected their thread. Replay a still-pending request on resume.
  if (message.method === 'thread/resume') {
    for (const approval of pendingApprovalMessages.values()) {
      if (approval.params?.threadId === params.threadId) sendClient(approval)
    }
  }
}

function handleCodexMessage(message) {
  if (['item/commandExecution/requestApproval', 'item/fileChange/requestApproval'].includes(message.method)) {
    if (message.id !== undefined) {
      const id = String(message.id)
      pendingApprovals.add(id)
      pendingApprovalMessages.set(id, message)
    }
    sendClient(message)
    return
  }
  if (message.method === 'serverRequest/resolved') {
    const requestId = message.params?.requestId
    if (requestId !== undefined && requestId !== null) {
      const id = String(requestId)
      pendingApprovals.delete(id)
      pendingApprovalMessages.delete(id)
    }
  }
  if (message.id !== undefined && pairedClient && pairedState.rpcIds.has(String(message.id))) {
    const clientId = pairedState.rpcIds.get(String(message.id))
    pairedState.rpcIds.delete(String(message.id))
    const method = pairedState.rpcMethods.get(String(message.id))
    pairedState.rpcMethods.delete(String(message.id))
    const requestedThreadId = pairedState.rpcThreads.get(String(message.id))
    pairedState.rpcThreads.delete(String(message.id))
    if (method === 'thread/list' && message.result?.data && Array.isArray(message.result.data)) {
      // thread/list was already filtered by app-server's exact cwd filter.
      allowedThreadIds.clear()
      for (const thread of message.result.data) if (thread.id) allowedThreadIds.add(thread.id)
      message.result.data = message.result.data.map((thread) => ({
        id: thread.id,
        name: thread.name ?? 'Codex task',
        updatedAt: thread.updatedAt,
        status: thread.status,
      }))
      message.result.nextCursor = null
    } else if (method === 'thread/turns/list' && Array.isArray(message.result?.data)) {
      // Keep tool outputs and raw metadata on the host. The Lens only receives
      // concise plain text from the selected project thread.
      message.result.data = message.result.data.map((entry) => ({
        turn: {id: entry.turn?.id, status: entry.turn?.status},
        items: (entry.items ?? []).filter((item) => ['userMessage', 'agentMessage'].includes(item.type)).map((item) => ({
          type: item.type,
          text: String(item.text ?? item.content?.map?.((part) => part.text ?? '').join('\n') ?? '').slice(0, 4000),
        })),
      }))
      const latestTurn = message.result.data[0]?.turn
      if (requestedThreadId && latestTurn?.id && ['inProgress', 'in_progress'].includes(latestTurn.status)) {
        activeTurnIds.set(requestedThreadId, latestTurn.id)
      } else if (requestedThreadId) {
        activeTurnIds.delete(requestedThreadId)
      }
    } else if (method === 'turn/start' && requestedThreadId && message.result?.turn?.id) {
      activeTurnIds.set(requestedThreadId, message.result.turn.id)
    }
    sendClient({...message, id: clientId})
    return
  }
  if (message.method) {
    const threadId = message.params?.threadId
    if (message.method === 'turn/started' && threadId && message.params?.turn?.id) {
      activeTurnIds.set(threadId, message.params.turn.id)
    } else if (message.method === 'turn/completed' && threadId) {
      const completedTurnId = message.params?.turn?.id
      if (!completedTurnId || activeTurnIds.get(threadId) === completedTurnId) activeTurnIds.delete(threadId)
    }
    if (threadId && !allowedThreadIds.has(threadId)) return
    if (!allowedNotifications.has(message.method)) return
    if (message.method === 'item/started') {
      if (message.params?.item?.type !== 'userMessage') return
      const item = message.params.item
      message.params = {...message.params, item: {
        type: item.type,
        text: String(item.text ?? item.content?.map?.((part) => part.text ?? '').join('\n') ?? '').slice(0, 4000),
      }}
    } else if (message.method === 'item/completed') {
      if (!['agentMessage', 'userMessage'].includes(message.params?.item?.type)) return
      const item = message.params.item
      message.params = {...message.params, item: {
        type: item.type,
        text: String(item.text ?? item.content?.map?.((part) => part.text ?? '').join('\n') ?? '').slice(0, 4000),
      }}
    }
    sendClient(message)
  }
}

let pairedState = {rpcIds: new Map(), rpcMethods: new Map(), rpcThreads: new Map()}

function parseFrames(buffer, isMasked, onMessage, onPong) {
  let offset = 0
  const messages = []
  while (buffer.length - offset >= 2) {
    const first = buffer[offset]
    const second = buffer[offset + 1]
    const opcode = first & 0x0f
    const masked = (second & 0x80) !== 0
    let length = second & 0x7f
    let headerLength = 2
    if (length === 126) {
      if (buffer.length - offset < 4) break
      length = buffer.readUInt16BE(offset + 2)
      headerLength = 4
    } else if (length === 127) {
      if (buffer.length - offset < 10) break
      const longLength = buffer.readBigUInt64BE(offset + 2)
      if (longLength > BigInt(MAX_WEBSOCKET_FRAME_BYTES)) {
        throw new Error(`WebSocket frame exceeds the ${MAX_WEBSOCKET_FRAME_BYTES / (1024 * 1024)} MB limit`)
      }
      length = Number(longLength)
      headerLength = 10
    }
    const maskLength = masked ? 4 : 0
    if (buffer.length - offset < headerLength + maskLength + length) break
    const mask = masked ? buffer.subarray(offset + headerLength, offset + headerLength + 4) : null
    const start = offset + headerLength + maskLength
    const payload = Buffer.from(buffer.subarray(start, start + length))
    if (mask) for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4]
    offset = start + length
    if (opcode === 8) { onMessage({close: true}); continue }
    if (opcode === 9) { onPong(payload); continue }
    if (opcode === 1) messages.push(payload.toString('utf8'))
    else if (opcode !== 10) throw new Error('Text WebSocket messages are required')
  }
  return {messages, remaining: buffer.subarray(offset)}
}

function consumeClientData(data) {
  if (!pairedClient) return
  try {
    const parsed = parseFrames(Buffer.concat([pairedState.clientBuffer, data]), true,
      (message) => { if (message.close) dropClient() },
      (payload) => pairedClient?.write(frame(10, payload)),
    )
    pairedState.clientBuffer = Buffer.from(parsed.remaining)
    for (const text of parsed.messages) forwardRpc(JSON.parse(text))
  } catch (error) {
    console.error('[RunCodexBridge] Client protocol error:', error.message)
    dropClient(1007, 'Invalid client message')
  }
}

function consumeCodexData(data) {
  try {
    const parsed = parseFrames(Buffer.concat([codexBuffer, data]), false,
      (message) => { if (message.close) throw new Error('Codex app-server closed its socket') },
      (payload) => codexSocket.write(frame(10, payload, true)),
    )
    codexBuffer = Buffer.from(parsed.remaining)
    for (const text of parsed.messages) handleCodexMessage(JSON.parse(text))
  } catch (error) {
    console.error('[RunCodexBridge] Codex protocol error:', error.message)
    codexReady = false
    dropClient(1011, 'Codex connection ended')
  }
}

const codexSocket = connectSocket(socketPath)
codexSocket.on('connect', () => {
  const key = randomBytes(16).toString('base64')
  const accept = createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64')
  let response = Buffer.alloc(0)
  const onHandshake = (chunk) => {
    response = Buffer.concat([response, chunk])
    const end = response.indexOf('\r\n\r\n')
    if (end < 0) return
    codexSocket.off('data', onHandshake)
    const header = response.subarray(0, end).toString('utf8')
    if (!header.startsWith('HTTP/1.1 101') || !header.toLowerCase().includes(`sec-websocket-accept: ${accept.toLowerCase()}`)) {
      console.error('[RunCodexBridge] Codex app-server rejected its Unix-socket handshake:', header.split('\r\n')[0])
      codexSocket.destroy()
      return
    }
    codexReady = true
    codexSocket.on('data', consumeCodexData)
    const remainder = response.subarray(end + 4)
    if (remainder.length) consumeCodexData(remainder)
    console.log('[RunCodexBridge] Connected to local Codex app-server')
  }
  codexSocket.on('data', onHandshake)
  codexSocket.write(['GET / HTTP/1.1', 'Host: localhost', 'Upgrade: websocket', 'Connection: Upgrade', `Sec-WebSocket-Key: ${key}`, 'Sec-WebSocket-Version: 13', '', ''].join('\r\n'))
})
codexSocket.on('error', (error) => {
  console.error('[RunCodexBridge] Codex socket error:', error.message)
  process.exitCode = 1
  server.close()
})
codexSocket.on('close', () => { codexReady = false; dropClient(1011, 'Codex connection ended'); server.close() })

function localAddresses() {
  return Object.values(os.networkInterfaces()).flatMap((items) => (items ?? []).filter((item) => item.family === 'IPv4' && !item.internal).map((item) => item.address))
}

const server = createServer((request, response) => {
  if (!isLocalClient(request.socket.remoteAddress)) {
    response.writeHead(403)
    response.end()
    return
  }
  if (request.url === '/healthz') {
    response.writeHead(200, {'content-type': 'application/json'})
    response.end(JSON.stringify({ok: codexReady, product: 'RunCodex local bridge'}))
    return
  }
  response.writeHead(404)
  response.end()
})

server.on('upgrade', (request, socket) => {
  if (!isLocalClient(request.socket.remoteAddress)) {
    socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n')
    socket.destroy()
    return
  }
  const url = new URL(request.url ?? '/', 'http://localhost')
  if (url.pathname !== '/runcodex' || !safeEqual(url.searchParams.get('token') ?? '', token)) {
    socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n')
    socket.destroy()
    return
  }
  if (pairedClient) {
    socket.write('HTTP/1.1 409 Conflict\r\nConnection: close\r\n\r\n')
    socket.destroy()
    return
  }
  const key = request.headers['sec-websocket-key']
  if (!key || request.headers.upgrade?.toLowerCase() !== 'websocket') return socket.destroy()
  const accept = createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64')
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n')
  pairedClient = socket
  pairedState = {rpcIds: new Map(), rpcMethods: new Map(), rpcThreads: new Map(), clientBuffer: Buffer.alloc(0)}
  socket.on('data', consumeClientData)
  socket.on('close', () => { if (pairedClient === socket) pairedClient = null })
  socket.on('error', () => { if (pairedClient === socket) pairedClient = null })
  console.log('[RunCodexBridge] Paired SPECS client connected')
})

server.listen(port, host, () => {
  console.log('[RunCodexBridge] Development-only unencrypted WebSocket on the local Wi-Fi network.')
  console.log('[RunCodexBridge] Project filter:', projectRoot)
  console.log('[RunCodexBridge] Endpoints:', localAddresses().map((ip) => `ws://${ip}:${port}/runcodex`).join('  '))
  console.log('[RunCodexBridge] Pairing token loaded from the local environment; keep it private.')
  console.log('[RunCodexBridge] Stop the bridge with Ctrl+C.')
})

process.on('SIGINT', () => { dropClient(1001, 'Bridge stopping'); codexSocket.destroy(); server.close() })
process.on('SIGTERM', () => { dropClient(1001, 'Bridge stopping'); codexSocket.destroy(); server.close() })
