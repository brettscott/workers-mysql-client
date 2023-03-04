/* eslint-disable no-undef */
// build/mysql-tmp.js
var define_Deno_default = {}
var DenoStdInternalError = class extends Error {
  constructor(message) {
    super(message)
    this.name = 'DenoStdInternalError'
  }
}
function assert(expr, msg = '') {
  if (!expr) {
    throw new DenoStdInternalError(msg)
  }
}
function copy(src, dst, off = 0) {
  off = Math.max(0, Math.min(off, dst.byteLength))
  const dstBytesAvailable = dst.byteLength - off
  if (src.byteLength > dstBytesAvailable) {
    src = src.subarray(0, dstBytesAvailable)
  }
  dst.set(src, off)
  return src.byteLength
}
var MIN_READ = 32 * 1024
var MAX_SIZE = 2 ** 32 - 2
var Buffer = class {
  #buf
  #off = 0
  constructor(ab) {
    this.#buf = ab === void 0 ? new Uint8Array(0) : new Uint8Array(ab)
  }
  bytes(
    options = {
      copy: true,
    },
  ) {
    if (options.copy === false) return this.#buf.subarray(this.#off)
    return this.#buf.slice(this.#off)
  }
  empty() {
    return this.#buf.byteLength <= this.#off
  }
  get length() {
    return this.#buf.byteLength - this.#off
  }
  get capacity() {
    return this.#buf.buffer.byteLength
  }
  truncate(n) {
    if (n === 0) {
      this.reset()
      return
    }
    if (n < 0 || n > this.length) {
      throw Error('bytes.Buffer: truncation out of range')
    }
    this.#reslice(this.#off + n)
  }
  reset() {
    this.#reslice(0)
    this.#off = 0
  }
  #tryGrowByReslice(n) {
    const l = this.#buf.byteLength
    if (n <= this.capacity - l) {
      this.#reslice(l + n)
      return l
    }
    return -1
  }
  #reslice(len) {
    assert(len <= this.#buf.buffer.byteLength)
    this.#buf = new Uint8Array(this.#buf.buffer, 0, len)
  }
  readSync(p) {
    if (this.empty()) {
      this.reset()
      if (p.byteLength === 0) {
        return 0
      }
      return null
    }
    const nread = copy(this.#buf.subarray(this.#off), p)
    this.#off += nread
    return nread
  }
  read(p) {
    const rr = this.readSync(p)
    return Promise.resolve(rr)
  }
  writeSync(p) {
    const m = this.#grow(p.byteLength)
    return copy(p, this.#buf, m)
  }
  write(p) {
    const n = this.writeSync(p)
    return Promise.resolve(n)
  }
  #grow(n1) {
    const m = this.length
    if (m === 0 && this.#off !== 0) {
      this.reset()
    }
    const i = this.#tryGrowByReslice(n1)
    if (i >= 0) {
      return i
    }
    const c = this.capacity
    if (n1 <= Math.floor(c / 2) - m) {
      copy(this.#buf.subarray(this.#off), this.#buf)
    } else if (c + n1 > MAX_SIZE) {
      throw new Error('The buffer cannot be grown beyond the maximum size.')
    } else {
      const buf = new Uint8Array(Math.min(2 * c + n1, MAX_SIZE))
      copy(this.#buf.subarray(this.#off), buf)
      this.#buf = buf
    }
    this.#off = 0
    this.#reslice(Math.min(m + n1, MAX_SIZE))
    return m
  }
  grow(n) {
    if (n < 0) {
      throw Error('Buffer.grow: negative count')
    }
    const m = this.#grow(n)
    this.#reslice(m)
  }
  async readFrom(r) {
    let n = 0
    const tmp = new Uint8Array(MIN_READ)
    while (true) {
      const shouldGrow = this.capacity - this.length < MIN_READ
      const buf = shouldGrow
        ? tmp
        : new Uint8Array(this.#buf.buffer, this.length)
      const nread = await r.read(buf)
      if (nread === null) {
        return n
      }
      if (shouldGrow) this.writeSync(buf.subarray(0, nread))
      else this.#reslice(this.length + nread)
      n += nread
    }
  }
  readFromSync(r) {
    let n = 0
    const tmp = new Uint8Array(MIN_READ)
    while (true) {
      const shouldGrow = this.capacity - this.length < MIN_READ
      const buf = shouldGrow
        ? tmp
        : new Uint8Array(this.#buf.buffer, this.length)
      const nread = r.readSync(buf)
      if (nread === null) {
        return n
      }
      if (shouldGrow) this.writeSync(buf.subarray(0, nread))
      else this.#reslice(this.length + nread)
      n += nread
    }
  }
}
function deferred() {
  let methods
  let state2 = 'pending'
  const promise = new Promise((resolve, reject) => {
    methods = {
      async resolve(value) {
        await value
        state2 = 'fulfilled'
        resolve(value)
      },
      reject(reason) {
        state2 = 'rejected'
        reject(reason)
      },
    }
  })
  Object.defineProperty(promise, 'state', {
    get: () => state2,
  })
  return Object.assign(promise, methods)
}
var Deno2
;(Deno3 => {
  let SeekMode
  ;(SeekMode2 => {
    SeekMode2[(SeekMode2['Start'] = 0)] = 'Start'
    SeekMode2[(SeekMode2['Current'] = 1)] = 'Current'
    SeekMode2[(SeekMode2['End'] = 2)] = 'End'
  })((SeekMode = Deno3.SeekMode || (Deno3.SeekMode = {})))
  class TcpOverWebsocketConn {
    localAddr = { transport: 'tcp', hostname: 'localhost', port: 5432 }
    remoteAddr = { transport: 'tcp', hostname: 'localhost', port: 5432 }
    rid = 1
    ws
    buffer
    empty_notifier
    constructor(ws) {
      this.ws = ws
      this.buffer = new Buffer()
      this.empty_notifier = deferred()
      this.ws.addEventListener('message', msg => {
        const data = new Uint8Array(msg.data)
        this.buffer.write(data).then(() => {
          this.empty_notifier.resolve()
        })
      })
      this.ws.addEventListener('error', err => {
        console.log('ws error')
      })
      this.ws.addEventListener('close', () => {
        this.empty_notifier.resolve()
        console.log('ws close')
      })
      this.ws.addEventListener('open', () => {
        console.log('ws open')
      })
    }
    closeWrite() {
      throw new Error('Method not implemented.')
    }
    // Reads up to p.length bytes from our buffer
    read(p) {
      if (this.buffer.length === 0) {
        return new Promise(async (resolve, reject) => {
          this.empty_notifier = deferred()
          await this.empty_notifier
          if (this.buffer.length === 0) {
            reject(0)
          } else {
            const bytes = await this.buffer.read(p)
            resolve(bytes)
          }
        })
      } else {
        return this.buffer.read(p)
      }
    }
    write(p) {
      this.ws.send(p)
      return Promise.resolve(p.byteLength)
    }
    close() {
      this.ws.close()
    }
  }
  Deno3.TcpOverWebsocketConn = TcpOverWebsocketConn
  function startTls(connection) {
    return Promise.resolve(connection)
  }
  Deno3.startTls = startTls
  function connect2(options) {
    return new Promise((resolve, reject) => {
      let cfAccess = {}
      if (globalThis.CF_CLIENT_ID && globalThis.CF_CLIENT_SECRET) {
        cfAccess = {
          // @ts-ignore
          'CF-Access-Client-ID': globalThis.CF_CLIENT_ID,
          // @ts-ignore
          'CF-Access-Client-Secret': globalThis.CF_CLIENT_SECRET,
        }
      }
      if (options.hostname === void 0) {
        throw new Error('Tunnel hostname undefined')
      }
      const resp = fetch(options.hostname, {
        headers: {
          ...cfAccess,
          Upgrade: 'websocket',
        },
      })
        .then(resp2 => {
          if (resp2.webSocket) {
            resp2.webSocket.accept()
            let c = new TcpOverWebsocketConn(resp2.webSocket)
            resolve(c)
          } else {
            throw new Error(
              `Failed to create WebSocket connection: ${resp2.status} ${resp2.statusText}`,
            )
          }
        })
        .catch(e => {
          console.log(e.message)
          reject(e)
        })
      return resp
    })
  }
  Deno3.connect = connect2
  let env
  ;(env2 => {
    function get(s) {
      return void 0
    }
    env2.get = get
  })((env = Deno3.env || (Deno3.env = {})))
  let errors
  ;(errors2 => {
    class NotFound2 extends Error {}
    errors2.NotFound = NotFound2
    class PermissionDenied2 extends Error {}
    errors2.PermissionDenied = PermissionDenied2
    class ConnectionRefused2 extends Error {}
    errors2.ConnectionRefused = ConnectionRefused2
    class ConnectionReset2 extends Error {}
    errors2.ConnectionReset = ConnectionReset2
    class ConnectionAborted2 extends Error {}
    errors2.ConnectionAborted = ConnectionAborted2
    class NotConnected2 extends Error {}
    errors2.NotConnected = NotConnected2
    class AddrInUse2 extends Error {}
    errors2.AddrInUse = AddrInUse2
    class AddrNotAvailable2 extends Error {}
    errors2.AddrNotAvailable = AddrNotAvailable2
    class BrokenPipe2 extends Error {}
    errors2.BrokenPipe = BrokenPipe2
    class AlreadyExists2 extends Error {}
    errors2.AlreadyExists = AlreadyExists2
    class InvalidData2 extends Error {}
    errors2.InvalidData = InvalidData2
    class TimedOut2 extends Error {}
    errors2.TimedOut = TimedOut2
    class Interrupted2 extends Error {}
    errors2.Interrupted = Interrupted2
    class WriteZero2 extends Error {}
    errors2.WriteZero = WriteZero2
    class UnexpectedEof2 extends Error {}
    errors2.UnexpectedEof = UnexpectedEof2
    class BadResource2 extends Error {}
    errors2.BadResource = BadResource2
    class Http2 extends Error {}
    errors2.Http = Http2
    class Busy2 extends Error {}
    errors2.Busy = Busy2
  })((errors = Deno3.errors || (Deno3.errors = {})))
})(Deno2 || (Deno2 = {}))
globalThis.Deno = Deno2
var FinalizationRegistry = class {
  constructor() {}
  register() {}
  unregister() {}
}
globalThis.FinalizationRegistry = FinalizationRegistry
var warnOrThrowIncompatible = (id, args = [], extraInfo) => {
  if (false) {
    let printedArgs = []
    if (typeof args[0] === 'string' && args[0].length < 100) {
      printedArgs.push(`"${args[0]}"`)
    } else {
      printedArgs.push('...')
    }
    if (args.length > 1) {
      printedArgs.push('...')
    }
    const printedArgsStr = printedArgs.join(', ')
    const warningOrError = `Called \`${id}(${printedArgsStr})\`, ${
      extraInfo ? `${extraInfo}, ` : ''
    }but this is not available in Workers`
    if (false) {
      console.warn(warningOrError)
    } else {
      throw new Error(warningOrError)
    }
  }
}
var workerDeno_errors = {
  NotFound: class NotFound extends Error {},
  PermissionDenied: class PermissionDenied extends Error {},
  ConnectionAborted: class ConnectionRefused extends Error {},
  ConnectionReset: class ConnectionReset extends Error {},
  ConnectionRefused: class ConnectionAborted extends Error {},
  NotConnected: class NotConnected extends Error {},
  AddrInUse: class AddrInUse extends Error {},
  AddrNotAvailable: class AddrNotAvailable extends Error {},
  BrokenPipe: class BrokenPipe extends Error {},
  AlreadyExists: class AlreadyExists extends Error {},
  InvalidData: class InvalidData extends Error {},
  TimedOut: class TimedOut extends Error {},
  Interrupted: class Interrupted extends Error {},
  UnexpectedEof: class WriteZero extends Error {},
  WriteZero: class UnexpectedEof extends Error {},
  BadResource: class BadResource extends Error {},
  Http: class Http extends Error {},
  Busy: class Busy extends Error {},
}
var workerDeno_stat = (...args) => {
  warnOrThrowIncompatible('Deno.stat', args)
  return Promise.resolve({ isFile: false })
}
var ConnnectionError = class extends Error {
  constructor(msg) {
    super(msg)
  }
}
var WriteError = class extends ConnnectionError {
  constructor(msg) {
    super(msg)
  }
}
var ReadError = class extends ConnnectionError {
  constructor(msg) {
    super(msg)
  }
}
var ResponseTimeoutError = class extends ConnnectionError {
  constructor(msg) {
    super(msg)
  }
}
var ProtocolError = class extends ConnnectionError {
  constructor(msg) {
    super(msg)
  }
}
function deferred2() {
  let methods
  let state2 = 'pending'
  const promise = new Promise((resolve, reject) => {
    methods = {
      async resolve(value) {
        await value
        state2 = 'fulfilled'
        resolve(value)
      },
      reject(reason) {
        state2 = 'rejected'
        reject(reason)
      },
    }
  })
  Object.defineProperty(promise, 'state', {
    get: () => state2,
  })
  return Object.assign(promise, methods)
}
var MuxAsyncIterator = class {
  iteratorCount = 0
  yields = []
  throws = []
  signal = deferred2()
  add(iterable) {
    ++this.iteratorCount
    this.callIteratorNext(iterable[Symbol.asyncIterator]())
  }
  async callIteratorNext(iterator) {
    try {
      const { value, done } = await iterator.next()
      if (done) {
        --this.iteratorCount
      } else {
        this.yields.push({
          iterator,
          value,
        })
      }
    } catch (e) {
      this.throws.push(e)
    }
    this.signal.resolve()
  }
  async *iterate() {
    while (this.iteratorCount > 0) {
      await this.signal
      for (let i = 0; i < this.yields.length; i++) {
        const { iterator, value } = this.yields[i]
        yield value
        this.callIteratorNext(iterator)
      }
      if (this.throws.length) {
        for (const e of this.throws) {
          throw e
        }
        this.throws.length = 0
      }
      this.yields.length = 0
      this.signal = deferred2()
    }
  }
  [Symbol.asyncIterator]() {
    return this.iterate()
  }
}
var noop = () => {}
var AsyncIterableClone = class {
  currentPromise
  resolveCurrent = noop
  consumed
  consume = noop
  constructor() {
    this.currentPromise = new Promise(resolve => {
      this.resolveCurrent = resolve
    })
    this.consumed = new Promise(resolve => {
      this.consume = resolve
    })
  }
  reset() {
    this.currentPromise = new Promise(resolve => {
      this.resolveCurrent = resolve
    })
    this.consumed = new Promise(resolve => {
      this.consume = resolve
    })
  }
  async next() {
    const res = await this.currentPromise
    this.consume()
    this.reset()
    return res
  }
  async push(res) {
    this.resolveCurrent(res)
    await this.consumed
  }
  [Symbol.asyncIterator]() {
    return this
  }
}
var noColor = globalThis.Deno?.noColor ?? true
var enabled = !noColor
function code(open, close) {
  return {
    open: `\x1B[${open.join(';')}m`,
    close: `\x1B[${close}m`,
    regexp: new RegExp(`\\x1b\\[${close}m`, 'g'),
  }
}
function run(str, code2) {
  return enabled
    ? `${code2.open}${str.replace(code2.regexp, code2.open)}${code2.close}`
    : str
}
function green(str) {
  return run(str, code([32], 39))
}
new RegExp(
  [
    '[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)',
    '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))',
  ].join('|'),
  'g',
)
function format(data) {
  const bytes = new Uint8Array(data.buffer)
  let out = '         +-------------------------------------------------+\n'
  out += `         |${green(
    '  0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f ',
  )}|
`
  out +=
    '+--------+-------------------------------------------------+----------------+\n'
  const lineCount = Math.ceil(bytes.length / 16)
  for (let line = 0; line < lineCount; line++) {
    const start2 = line * 16
    const addr = start2.toString(16).padStart(8, '0')
    const lineBytes = bytes.slice(start2, start2 + 16)
    out += `|${green(addr)}| `
    lineBytes.forEach(
      __byte => (out += __byte.toString(16).padStart(2, '0') + ' '),
    )
    if (lineBytes.length < 16) {
      out += '   '.repeat(16 - lineBytes.length)
    }
    out += '|'
    lineBytes.forEach(function (__byte) {
      return (out +=
        __byte > 31 && __byte < 127 ? green(String.fromCharCode(__byte)) : '.')
    })
    if (lineBytes.length < 16) {
      out += ' '.repeat(16 - lineBytes.length)
    }
    out += '|\n'
  }
  out +=
    '+--------+-------------------------------------------------+----------------+'
  return out
}
var base64abc = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
  'Z',
  'a',
  'b',
  'c',
  'd',
  'e',
  'f',
  'g',
  'h',
  'i',
  'j',
  'k',
  'l',
  'm',
  'n',
  'o',
  'p',
  'q',
  'r',
  's',
  't',
  'u',
  'v',
  'w',
  'x',
  'y',
  'z',
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '+',
  '/',
]
function encode(data) {
  const uint8 =
    typeof data === 'string'
      ? new TextEncoder().encode(data)
      : data instanceof Uint8Array
      ? data
      : new Uint8Array(data)
  let result = '',
    i
  const l = uint8.length
  for (i = 2; i < l; i += 3) {
    result += base64abc[uint8[i - 2] >> 2]
    result += base64abc[((uint8[i - 2] & 3) << 4) | (uint8[i - 1] >> 4)]
    result += base64abc[((uint8[i - 1] & 15) << 2) | (uint8[i] >> 6)]
    result += base64abc[uint8[i] & 63]
  }
  if (i === l + 1) {
    result += base64abc[uint8[i - 2] >> 2]
    result += base64abc[(uint8[i - 2] & 3) << 4]
    result += '=='
  }
  if (i === l) {
    result += base64abc[uint8[i - 2] >> 2]
    result += base64abc[((uint8[i - 2] & 3) << 4) | (uint8[i - 1] >> 4)]
    result += base64abc[(uint8[i - 1] & 15) << 2]
    result += '='
  }
  return result
}
function decode(b64) {
  const binString = atob(b64)
  const size = binString.length
  const bytes = new Uint8Array(size)
  for (let i = 0; i < size; i++) {
    bytes[i] = binString.charCodeAt(i)
  }
  return bytes
}
var cachedTextDecoder = new TextDecoder('utf-8', {
  ignoreBOM: true,
  fatal: true,
})
cachedTextDecoder.decode()
var cachegetUint8Memory0 = null
function getUint8Memory0() {
  if (
    cachegetUint8Memory0 === null ||
    cachegetUint8Memory0.buffer !== wasm.memory.buffer
  ) {
    cachegetUint8Memory0 = new Uint8Array(wasm.memory.buffer)
  }
  return cachegetUint8Memory0
}
var heap = new Array(32).fill(void 0)
heap.push(void 0, null, true, false)
var heap_next = heap.length
var WASM_VECTOR_LEN = 0
var cachedTextEncoder = new TextEncoder('utf-8')
var encodeString = function (arg, view) {
  return cachedTextEncoder.encodeInto(arg, view)
}
function passStringToWasm0(arg, malloc, realloc) {
  if (realloc === void 0) {
    const buf = cachedTextEncoder.encode(arg)
    const ptr2 = malloc(buf.length)
    getUint8Memory0()
      .subarray(ptr2, ptr2 + buf.length)
      .set(buf)
    WASM_VECTOR_LEN = buf.length
    return ptr2
  }
  let len = arg.length
  let ptr = malloc(len)
  const mem = getUint8Memory0()
  let offset = 0
  for (; offset < len; offset++) {
    const code2 = arg.charCodeAt(offset)
    if (code2 > 127) break
    mem[ptr + offset] = code2
  }
  if (offset !== len) {
    if (offset !== 0) {
      arg = arg.slice(offset)
    }
    ptr = realloc(ptr, len, (len = offset + arg.length * 3))
    const view = getUint8Memory0().subarray(ptr + offset, ptr + len)
    const ret = encodeString(arg, view)
    offset += ret.written
  }
  WASM_VECTOR_LEN = offset
  return ptr
}
function create_hash(algorithm) {
  var ptr0 = passStringToWasm0(
    algorithm,
    wasm.__wbindgen_malloc,
    wasm.__wbindgen_realloc,
  )
  var len0 = WASM_VECTOR_LEN
  var ret = wasm.create_hash(ptr0, len0)
  return DenoHash.__wrap(ret)
}
function _assertClass(instance, klass) {
  if (!(instance instanceof klass)) {
    throw new Error(`expected instance of ${klass.name}`)
  }
  return instance.ptr
}
function passArray8ToWasm0(arg, malloc) {
  const ptr = malloc(arg.length * 1)
  getUint8Memory0().set(arg, ptr / 1)
  WASM_VECTOR_LEN = arg.length
  return ptr
}
function update_hash(hash2, data) {
  _assertClass(hash2, DenoHash)
  var ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc)
  var len0 = WASM_VECTOR_LEN
  wasm.update_hash(hash2.ptr, ptr0, len0)
}
var cachegetInt32Memory0 = null
function getInt32Memory0() {
  if (
    cachegetInt32Memory0 === null ||
    cachegetInt32Memory0.buffer !== wasm.memory.buffer
  ) {
    cachegetInt32Memory0 = new Int32Array(wasm.memory.buffer)
  }
  return cachegetInt32Memory0
}
function getArrayU8FromWasm0(ptr, len) {
  return getUint8Memory0().subarray(ptr / 1, ptr / 1 + len)
}
function digest_hash(hash2) {
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16)
    _assertClass(hash2, DenoHash)
    wasm.digest_hash(retptr, hash2.ptr)
    var r0 = getInt32Memory0()[retptr / 4 + 0]
    var r1 = getInt32Memory0()[retptr / 4 + 1]
    var v0 = getArrayU8FromWasm0(r0, r1).slice()
    wasm.__wbindgen_free(r0, r1 * 1)
    return v0
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16)
  }
}
var DenoHashFinalization = new FinalizationRegistry(ptr =>
  wasm.__wbg_denohash_free(ptr),
)
var DenoHash = class {
  static __wrap(ptr) {
    const obj = Object.create(DenoHash.prototype)
    obj.ptr = ptr
    DenoHashFinalization.register(obj, obj.ptr, obj)
    return obj
  }
  __destroy_into_raw() {
    const ptr = this.ptr
    this.ptr = 0
    DenoHashFinalization.unregister(this)
    return ptr
  }
  free() {
    const ptr = this.__destroy_into_raw()
    wasm.__wbg_denohash_free(ptr)
  }
}
var wasm = null
var hexTable = new TextEncoder().encode('0123456789abcdef')
function encode1(src) {
  const dst = new Uint8Array(src.length * 2)
  for (let i = 0; i < dst.length; i++) {
    const v = src[i]
    dst[i * 2] = hexTable[v >> 4]
    dst[i * 2 + 1] = hexTable[v & 15]
  }
  return dst
}
var Hash = class {
  #hash
  #digested
  constructor(algorithm) {
    this.#hash = create_hash(algorithm)
    this.#digested = false
  }
  update(message) {
    let view
    if (message instanceof Uint8Array) {
      view = message
    } else if (typeof message === 'string') {
      view = new TextEncoder().encode(message)
    } else if (ArrayBuffer.isView(message)) {
      view = new Uint8Array(
        message.buffer,
        message.byteOffset,
        message.byteLength,
      )
    } else if (message instanceof ArrayBuffer) {
      view = new Uint8Array(message)
    } else {
      throw new Error('hash: `data` is invalid type')
    }
    const chunkSize = 65536
    for (let offset = 0; offset < view.byteLength; offset += chunkSize) {
      update_hash(
        this.#hash,
        new Uint8Array(
          view.buffer,
          view.byteOffset + offset,
          Math.min(65536, view.byteLength - offset),
        ),
      )
    }
    return this
  }
  digest() {
    if (this.#digested) throw new Error('hash: already digested')
    this.#digested = true
    return digest_hash(this.#hash)
  }
  toString(format2 = 'hex') {
    const finalized = new Uint8Array(this.digest())
    switch (format2) {
      case 'hex':
        return new TextDecoder().decode(encode1(finalized))
      case 'base64':
        return encode(finalized)
      default:
        throw new Error('hash: invalid format')
    }
  }
}
function createHash(algorithm) {
  return new Hash(algorithm)
}
function replaceParams(sql, params) {
  if (!params) return sql
  let paramIndex = 0
  sql = sql.replace(
    /('[^'\\]*(?:\\.[^'\\]*)*')|("[^"\\]*(?:\\.[^"\\]*)*")|(\?\?)|(\?)/g,
    str => {
      if (paramIndex >= params.length) return str
      if (/".*"/g.test(str) || /'.*'/g.test(str)) {
        return str
      }
      if (str === '??') {
        const val2 = params[paramIndex++]
        if (val2 instanceof Array) {
          return `(${val2.map(item => replaceParams('??', [item])).join(',')})`
        } else if (val2 === '*') {
          return val2
        } else if (typeof val2 === 'string' && val2.includes('.')) {
          const _arr = val2.split('.')
          return replaceParams(_arr.map(() => '??').join('.'), _arr)
        } else if (
          typeof val2 === 'string' &&
          (val2.includes(' as ') || val2.includes(' AS '))
        ) {
          const newVal = val2.replace(' as ', ' AS ')
          const _arr = newVal.split(' AS ')
          return replaceParams(_arr.map(() => '??').join(' AS '), _arr)
        } else {
          return ['`', val2, '`'].join('')
        }
      }
      const val = params[paramIndex++]
      if (val === null) return 'NULL'
      switch (typeof val) {
        case 'object':
          if (val instanceof Date) return `"${formatDate(val)}"`
          if (val instanceof Array) {
            return `(${val.map(item => replaceParams('?', [item])).join(',')})`
          }
        case 'string':
          return `"${escapeString(val)}"`
        case 'undefined':
          return 'NULL'
        case 'number':
        case 'boolean':
        default:
          return val
      }
    },
  )
  return sql
}
function formatDate(date) {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const days = date.getDate().toString().padStart(2, '0')
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const seconds = date.getSeconds().toString().padStart(2, '0')
  const milliseconds = date.getMilliseconds().toString().padStart(3, '0')
  return `${year}-${month}-${days} ${hours}:${minutes}:${seconds}.${milliseconds}`
}
function escapeString(str) {
  return str.replaceAll('\\', '\\\\').replaceAll('"', '\\"')
}
var LogLevels
;(function (LogLevels2) {
  LogLevels2[(LogLevels2['NOTSET'] = 0)] = 'NOTSET'
  LogLevels2[(LogLevels2['DEBUG'] = 10)] = 'DEBUG'
  LogLevels2[(LogLevels2['INFO'] = 20)] = 'INFO'
  LogLevels2[(LogLevels2['WARNING'] = 30)] = 'WARNING'
  LogLevels2[(LogLevels2['ERROR'] = 40)] = 'ERROR'
  LogLevels2[(LogLevels2['CRITICAL'] = 50)] = 'CRITICAL'
})(LogLevels || (LogLevels = {}))
Object.keys(LogLevels).filter(key => isNaN(Number(key)))
var byLevel = {
  [String(LogLevels.NOTSET)]: 'NOTSET',
  [String(LogLevels.DEBUG)]: 'DEBUG',
  [String(LogLevels.INFO)]: 'INFO',
  [String(LogLevels.WARNING)]: 'WARNING',
  [String(LogLevels.ERROR)]: 'ERROR',
  [String(LogLevels.CRITICAL)]: 'CRITICAL',
}
function getLevelByName(name) {
  switch (name) {
    case 'NOTSET':
      return LogLevels.NOTSET
    case 'DEBUG':
      return LogLevels.DEBUG
    case 'INFO':
      return LogLevels.INFO
    case 'WARNING':
      return LogLevels.WARNING
    case 'ERROR':
      return LogLevels.ERROR
    case 'CRITICAL':
      return LogLevels.CRITICAL
    default:
      throw new Error(`no log level found for "${name}"`)
  }
}
function getLevelName(level) {
  const levelName = byLevel[level]
  if (levelName) {
    return levelName
  }
  throw new Error(`no level name found for level: ${level}`)
}
var LogRecord = class {
  msg
  #args
  #datetime
  level
  levelName
  loggerName
  constructor(options) {
    this.msg = options.msg
    this.#args = [...options.args]
    this.level = options.level
    this.loggerName = options.loggerName
    this.#datetime = /* @__PURE__ */ new Date()
    this.levelName = getLevelName(options.level)
  }
  get args() {
    return [...this.#args]
  }
  get datetime() {
    return new Date(this.#datetime.getTime())
  }
}
var Logger = class {
  #level
  #handlers
  #loggerName
  constructor(loggerName, levelName, options = {}) {
    this.#loggerName = loggerName
    this.#level = getLevelByName(levelName)
    this.#handlers = options.handlers || []
  }
  get level() {
    return this.#level
  }
  set level(level) {
    this.#level = level
  }
  get levelName() {
    return getLevelName(this.#level)
  }
  set levelName(levelName) {
    this.#level = getLevelByName(levelName)
  }
  get loggerName() {
    return this.#loggerName
  }
  set handlers(hndls) {
    this.#handlers = hndls
  }
  get handlers() {
    return this.#handlers
  }
  _log(level, msg, ...args) {
    if (this.level > level) {
      return msg instanceof Function ? void 0 : msg
    }
    let fnResult
    let logMessage
    if (msg instanceof Function) {
      fnResult = msg()
      logMessage = this.asString(fnResult)
    } else {
      logMessage = this.asString(msg)
    }
    const record = new LogRecord({
      msg: logMessage,
      args,
      level,
      loggerName: this.loggerName,
    })
    this.#handlers.forEach(handler => {
      handler.handle(record)
    })
    return msg instanceof Function ? fnResult : msg
  }
  asString(data) {
    if (typeof data === 'string') {
      return data
    } else if (
      data === null ||
      typeof data === 'number' ||
      typeof data === 'bigint' ||
      typeof data === 'boolean' ||
      typeof data === 'undefined' ||
      typeof data === 'symbol'
    ) {
      return String(data)
    } else if (data instanceof Error) {
      return data.stack
    } else if (typeof data === 'object') {
      return JSON.stringify(data)
    }
    return 'undefined'
  }
  debug(msg, ...args) {
    return this._log(LogLevels.DEBUG, msg, ...args)
  }
  info(msg, ...args) {
    return this._log(LogLevels.INFO, msg, ...args)
  }
  warning(msg, ...args) {
    return this._log(LogLevels.WARNING, msg, ...args)
  }
  error(msg, ...args) {
    return this._log(LogLevels.ERROR, msg, ...args)
  }
  critical(msg, ...args) {
    return this._log(LogLevels.CRITICAL, msg, ...args)
  }
}
var { Deno: Deno1 } = globalThis
var noColor1 = typeof Deno1?.noColor === 'boolean' ? Deno1.noColor : true
var enabled1 = !noColor1
function code1(open, close) {
  return {
    open: `\x1B[${open.join(';')}m`,
    close: `\x1B[${close}m`,
    regexp: new RegExp(`\\x1b\\[${close}m`, 'g'),
  }
}
function run1(str, code2) {
  return enabled1
    ? `${code2.open}${str.replace(code2.regexp, code2.open)}${code2.close}`
    : str
}
function bold(str) {
  return run1(str, code1([1], 22))
}
function red(str) {
  return run1(str, code1([31], 39))
}
function yellow(str) {
  return run1(str, code1([33], 39))
}
function blue(str) {
  return run1(str, code1([34], 39))
}
new RegExp(
  [
    '[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)',
    '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))',
  ].join('|'),
  'g',
)
async function exists(filePath) {
  try {
    await define_Deno_default.lstat(filePath)
    return true
  } catch (err) {
    if (err instanceof workerDeno_errors.NotFound) {
      return false
    }
    throw err
  }
}
function existsSync(filePath) {
  try {
    define_Deno_default.lstatSync(filePath)
    return true
  } catch (err) {
    if (err instanceof workerDeno_errors.NotFound) {
      return false
    }
    throw err
  }
}
function copy2(src, dst, off = 0) {
  off = Math.max(0, Math.min(off, dst.byteLength))
  const dstBytesAvailable = dst.byteLength - off
  if (src.byteLength > dstBytesAvailable) {
    src = src.subarray(0, dstBytesAvailable)
  }
  dst.set(src, off)
  return src.byteLength
}
var DenoStdInternalError2 = class extends Error {
  constructor(message) {
    super(message)
    this.name = 'DenoStdInternalError'
  }
}
function assert2(expr, msg = '') {
  if (!expr) {
    throw new DenoStdInternalError2(msg)
  }
}
var DiffType
;(function (DiffType2) {
  DiffType2['removed'] = 'removed'
  DiffType2['common'] = 'common'
  DiffType2['added'] = 'added'
})(DiffType || (DiffType = {}))
function writeAllSync(w, arr) {
  let nwritten = 0
  while (nwritten < arr.length) {
    nwritten += w.writeSync(arr.subarray(nwritten))
  }
}
var DEFAULT_BUF_SIZE = 4096
var AbstractBufBase = class {
  buf
  usedBufferBytes = 0
  err = null
  size() {
    return this.buf.byteLength
  }
  available() {
    return this.buf.byteLength - this.usedBufferBytes
  }
  buffered() {
    return this.usedBufferBytes
  }
}
var BufWriterSync = class extends AbstractBufBase {
  static create(writer, size = 4096) {
    return writer instanceof BufWriterSync
      ? writer
      : new BufWriterSync(writer, size)
  }
  constructor(writer, size = 4096) {
    super()
    this.writer = writer
    if (size <= 0) {
      size = DEFAULT_BUF_SIZE
    }
    this.buf = new Uint8Array(size)
  }
  reset(w) {
    this.err = null
    this.usedBufferBytes = 0
    this.writer = w
  }
  flush() {
    if (this.err !== null) throw this.err
    if (this.usedBufferBytes === 0) return
    try {
      writeAllSync(this.writer, this.buf.subarray(0, this.usedBufferBytes))
    } catch (e) {
      this.err = e
      throw e
    }
    this.buf = new Uint8Array(this.buf.length)
    this.usedBufferBytes = 0
  }
  writeSync(data) {
    if (this.err !== null) throw this.err
    if (data.length === 0) return 0
    let totalBytesWritten = 0
    let numBytesWritten = 0
    while (data.byteLength > this.available()) {
      if (this.buffered() === 0) {
        try {
          numBytesWritten = this.writer.writeSync(data)
        } catch (e) {
          this.err = e
          throw e
        }
      } else {
        numBytesWritten = copy2(data, this.buf, this.usedBufferBytes)
        this.usedBufferBytes += numBytesWritten
        this.flush()
      }
      totalBytesWritten += numBytesWritten
      data = data.subarray(numBytesWritten)
    }
    numBytesWritten = copy2(data, this.buf, this.usedBufferBytes)
    this.usedBufferBytes += numBytesWritten
    totalBytesWritten += numBytesWritten
    return totalBytesWritten
  }
  writer
}
var DEFAULT_FORMATTER = '{levelName} {msg}'
var BaseHandler = class {
  level
  levelName
  formatter
  constructor(levelName, options = {}) {
    this.level = getLevelByName(levelName)
    this.levelName = levelName
    this.formatter = options.formatter || DEFAULT_FORMATTER
  }
  handle(logRecord) {
    if (this.level > logRecord.level) return
    const msg = this.format(logRecord)
    return this.log(msg)
  }
  format(logRecord) {
    if (this.formatter instanceof Function) {
      return this.formatter(logRecord)
    }
    return this.formatter.replace(/{(\S+)}/g, (match, p1) => {
      const value = logRecord[p1]
      if (value == null) {
        return match
      }
      return String(value)
    })
  }
  log(_msg) {}
  async setup() {}
  async destroy() {}
}
var ConsoleHandler = class extends BaseHandler {
  format(logRecord) {
    let msg = super.format(logRecord)
    switch (logRecord.level) {
      case LogLevels.INFO:
        msg = blue(msg)
        break
      case LogLevels.WARNING:
        msg = yellow(msg)
        break
      case LogLevels.ERROR:
        msg = red(msg)
        break
      case LogLevels.CRITICAL:
        msg = bold(red(msg))
        break
      default:
        break
    }
    return msg
  }
  log(msg) {
    console.log(msg)
  }
}
var WriterHandler = class extends BaseHandler {
  _writer
  #encoder = new TextEncoder()
}
var FileHandler = class extends WriterHandler {
  _file
  _buf
  _filename
  _mode
  _openOptions
  _encoder = new TextEncoder()
  #unloadCallback() {
    this.destroy()
  }
  constructor(levelName, options) {
    super(levelName, options)
    this._filename = options.filename
    this._mode = options.mode ? options.mode : 'a'
    this._openOptions = {
      createNew: this._mode === 'x',
      create: this._mode !== 'x',
      append: this._mode === 'a',
      truncate: this._mode !== 'a',
      write: true,
    }
  }
  async setup() {
    this._file = await define_Deno_default.open(
      this._filename,
      this._openOptions,
    )
    this._writer = this._file
    this._buf = new BufWriterSync(this._file)
    addEventListener('unload', this.#unloadCallback.bind(this))
  }
  handle(logRecord) {
    super.handle(logRecord)
    if (logRecord.level > LogLevels.ERROR) {
      this.flush()
    }
  }
  log(msg) {
    this._buf.writeSync(this._encoder.encode(msg + '\n'))
  }
  flush() {
    if (this._buf?.buffered() > 0) {
      this._buf.flush()
    }
  }
  destroy() {
    this.flush()
    this._file?.close()
    this._file = void 0
    removeEventListener('unload', this.#unloadCallback)
    return Promise.resolve()
  }
}
var RotatingFileHandler = class extends FileHandler {
  #maxBytes
  #maxBackupCount
  #currentFileSize = 0
  constructor(levelName, options) {
    super(levelName, options)
    this.#maxBytes = options.maxBytes
    this.#maxBackupCount = options.maxBackupCount
  }
  async setup() {
    if (this.#maxBytes < 1) {
      this.destroy()
      throw new Error('maxBytes cannot be less than 1')
    }
    if (this.#maxBackupCount < 1) {
      this.destroy()
      throw new Error('maxBackupCount cannot be less than 1')
    }
    await super.setup()
    if (this._mode === 'w') {
      for (let i = 1; i <= this.#maxBackupCount; i++) {
        if (await exists(this._filename + '.' + i)) {
          await define_Deno_default.remove(this._filename + '.' + i)
        }
      }
    } else if (this._mode === 'x') {
      for (let i = 1; i <= this.#maxBackupCount; i++) {
        if (await exists(this._filename + '.' + i)) {
          this.destroy()
          throw new workerDeno_errors.AlreadyExists(
            'Backup log file ' + this._filename + '.' + i + ' already exists',
          )
        }
      }
    } else {
      this.#currentFileSize = (await workerDeno_stat(this._filename)).size
    }
  }
  log(msg) {
    const msgByteLength = this._encoder.encode(msg).byteLength + 1
    if (this.#currentFileSize + msgByteLength > this.#maxBytes) {
      this.rotateLogFiles()
      this.#currentFileSize = 0
    }
    this._buf.writeSync(this._encoder.encode(msg + '\n'))
    this.#currentFileSize += msgByteLength
  }
  rotateLogFiles() {
    this._buf.flush()
    define_Deno_default.close(this._file.rid)
    for (let i = this.#maxBackupCount - 1; i >= 0; i--) {
      const source = this._filename + (i === 0 ? '' : '.' + i)
      const dest = this._filename + '.' + (i + 1)
      if (existsSync(source)) {
        define_Deno_default.renameSync(source, dest)
      }
    }
    this._file = define_Deno_default.openSync(this._filename, this._openOptions)
    this._writer = this._file
    this._buf = new BufWriterSync(this._file)
  }
}
var LoggerConfig = class {
  level
  handlers
}
var DEFAULT_LEVEL = 'INFO'
var DEFAULT_CONFIG = {
  handlers: {
    default: new ConsoleHandler(DEFAULT_LEVEL),
  },
  loggers: {
    default: {
      level: DEFAULT_LEVEL,
      handlers: ['default'],
    },
  },
}
var state = {
  handlers: /* @__PURE__ */ new Map(),
  loggers: /* @__PURE__ */ new Map(),
  config: DEFAULT_CONFIG,
}
var handlers = {
  BaseHandler,
  ConsoleHandler,
  WriterHandler,
  FileHandler,
  RotatingFileHandler,
}
function getLogger(name) {
  if (!name) {
    const d = state.loggers.get('default')
    assert2(
      d != null,
      `"default" logger must be set for getting logger without name`,
    )
    return d
  }
  const result = state.loggers.get(name)
  if (!result) {
    const logger2 = new Logger(name, 'NOTSET', {
      handlers: [],
    })
    state.loggers.set(name, logger2)
    return logger2
  }
  return result
}
function debug(msg, ...args) {
  if (msg instanceof Function) {
    return getLogger('default').debug(msg, ...args)
  }
  return getLogger('default').debug(msg, ...args)
}
function info(msg, ...args) {
  if (msg instanceof Function) {
    return getLogger('default').info(msg, ...args)
  }
  return getLogger('default').info(msg, ...args)
}
function warning(msg, ...args) {
  if (msg instanceof Function) {
    return getLogger('default').warning(msg, ...args)
  }
  return getLogger('default').warning(msg, ...args)
}
function error(msg, ...args) {
  if (msg instanceof Function) {
    return getLogger('default').error(msg, ...args)
  }
  return getLogger('default').error(msg, ...args)
}
function critical(msg, ...args) {
  if (msg instanceof Function) {
    return getLogger('default').critical(msg, ...args)
  }
  return getLogger('default').critical(msg, ...args)
}
async function setup(config) {
  state.config = {
    handlers: {
      ...DEFAULT_CONFIG.handlers,
      ...config.handlers,
    },
    loggers: {
      ...DEFAULT_CONFIG.loggers,
      ...config.loggers,
    },
  }
  state.handlers.forEach(handler => {
    handler.destroy()
  })
  state.handlers.clear()
  const handlers2 = state.config.handlers || {}
  for (const handlerName in handlers2) {
    const handler = handlers2[handlerName]
    await handler.setup()
    state.handlers.set(handlerName, handler)
  }
  state.loggers.clear()
  const loggers = state.config.loggers || {}
  for (const loggerName in loggers) {
    const loggerConfig = loggers[loggerName]
    const handlerNames = loggerConfig.handlers || []
    const handlers3 = []
    handlerNames.forEach(handlerName => {
      const handler = state.handlers.get(handlerName)
      if (handler) {
        handlers3.push(handler)
      }
    })
    const levelName = loggerConfig.level || DEFAULT_LEVEL
    const logger2 = new Logger(loggerName, levelName, {
      handlers: handlers3,
    })
    state.loggers.set(loggerName, logger2)
  }
}

/** Top-level await. Manually altered this to wrap top-level async */
let mod
let logger
;(async () => {
  try {
    await setup(DEFAULT_CONFIG)
  } catch (err) {
    console.error(err)
  }
  mod = await (async function () {
    return {
      LogLevels,
      Logger,
      LoggerConfig,
      handlers,
      getLogger,
      debug,
      info,
      warning,
      error,
      critical,
      setup,
    }
  })()
  logger = mod.getLogger()
})()
/** ^^^ Top-level await. manually altered this to wrap top-level async */

var isDebug = false
function debug1(func) {
  if (isDebug) {
    func()
  }
}
async function configLogger(config) {
  let { enable = true, level = 'INFO' } = config
  if (config.logger) level = config.logger.levelName
  isDebug = level == 'DEBUG'
  if (!enable) {
    logger = new mod.Logger('fakeLogger', 'NOTSET', {})
    logger.level = 100
  } else {
    if (!config.logger) {
      await mod.setup({
        handlers: {
          console: new mod.handlers.ConsoleHandler(level),
        },
        loggers: {
          default: {
            level: 'DEBUG',
            handlers: ['console'],
          },
        },
      })
      logger = mod.getLogger()
    } else {
      logger = config.logger
    }
  }
}
function xor(a, b) {
  return a.map((__byte, index) => {
    return __byte ^ b[index]
  })
}
var encoder = new TextEncoder()
var decoder = new TextDecoder()
function encode2(input) {
  return encoder.encode(input)
}
function decode1(input) {
  return decoder.decode(input)
}
var BufferReader = class {
  pos
  constructor(buffer) {
    this.buffer = buffer
    this.pos = 0
  }
  get finished() {
    return this.pos >= this.buffer.length
  }
  skip(len) {
    this.pos += len
    return this
  }
  readBuffer(len) {
    const buffer = this.buffer.slice(this.pos, this.pos + len)
    this.pos += len
    return buffer
  }
  readUints(len) {
    let num = 0
    for (let n = 0; n < len; n++) {
      num += this.buffer[this.pos++] << (8 * n)
    }
    return num
  }
  readUint8() {
    return this.buffer[this.pos++]
  }
  readUint16() {
    return this.readUints(2)
  }
  readUint32() {
    return this.readUints(4)
  }
  readUint64() {
    return this.readUints(8)
  }
  readNullTerminatedString() {
    let end = this.buffer.indexOf(0, this.pos)
    if (end === -1) end = this.buffer.length
    const buf = this.buffer.slice(this.pos, end)
    this.pos += buf.length + 1
    return decode1(buf)
  }
  readRestOfPacketString() {
    return this.buffer.slice(this.pos)
  }
  readString(len) {
    const str = decode1(this.buffer.slice(this.pos, this.pos + len))
    this.pos += len
    return str
  }
  readEncodedLen() {
    const first = this.readUint8()
    if (first < 251) {
      return first
    } else {
      if (first == 252) {
        return this.readUint16()
      } else if (first == 253) {
        return this.readUints(3)
      } else if (first == 254) {
        return this.readUints(8)
      }
    }
    return -1
  }
  readLenCodeString() {
    const len = this.readEncodedLen()
    if (len == -1) return null
    return this.readString(len)
  }
  buffer
}
var BufferWriter = class {
  pos
  constructor(buffer) {
    this.buffer = buffer
    this.pos = 0
  }
  get wroteData() {
    return this.buffer.slice(0, this.pos)
  }
  get length() {
    return this.pos
  }
  get capacity() {
    return this.buffer.length - this.pos
  }
  skip(len) {
    this.pos += len
    return this
  }
  writeBuffer(buffer) {
    if (buffer.length > this.capacity) {
      buffer = buffer.slice(0, this.capacity)
    }
    this.buffer.set(buffer, this.pos)
    this.pos += buffer.length
    return this
  }
  write(__byte) {
    this.buffer[this.pos++] = __byte
    return this
  }
  writeInt16LE(num) {}
  writeIntLE(num, len) {
    const __int = new Int32Array(1)
    __int[0] = 40
    console.log(__int)
  }
  writeUint16(num) {
    return this.writeUints(2, num)
  }
  writeUint32(num) {
    return this.writeUints(4, num)
  }
  writeUint64(num) {
    return this.writeUints(8, num)
  }
  writeUints(len, num) {
    for (let n = 0; n < len; n++) {
      this.buffer[this.pos++] = (num >> (n * 8)) & 255
    }
    return this
  }
  writeNullTerminatedString(str) {
    return this.writeString(str).write(0)
  }
  writeString(str) {
    const buf = encode2(str)
    this.buffer.set(buf, this.pos)
    this.pos += buf.length
    return this
  }
  buffer
}
function hash(algorithm, data) {
  return new Uint8Array(createHash(algorithm).update(data).digest())
}
function mysqlNativePassword(password2, seed) {
  const pwd1 = hash('sha1', encode2(password2))
  const pwd2 = hash('sha1', pwd1)
  let seedAndPwd2 = new Uint8Array(seed.length + pwd2.length)
  seedAndPwd2.set(seed)
  seedAndPwd2.set(pwd2, seed.length)
  seedAndPwd2 = hash('sha1', seedAndPwd2)
  return xor(seedAndPwd2, pwd1)
}
function cachingSha2Password(password2, seed) {
  const stage1 = hash('sha256', encode2(password2))
  const stage2 = hash('sha256', stage1)
  const stage3 = hash('sha256', Uint8Array.from([...stage2, ...seed]))
  return xor(stage1, stage3)
}
function auth(authPluginName, password2, seed) {
  switch (authPluginName) {
    case 'mysql_native_password':
      return mysqlNativePassword(password2, seed.slice(0, 20))
    case 'caching_sha2_password':
      return cachingSha2Password(password2, seed)
    default:
      throw new Error('Not supported')
  }
}
var ServerCapabilities
;(function (ServerCapabilities2) {
  ServerCapabilities2[(ServerCapabilities2['CLIENT_PROTOCOL_41'] = 512)] =
    'CLIENT_PROTOCOL_41'
  ServerCapabilities2[(ServerCapabilities2['CLIENT_CONNECT_WITH_DB'] = 8)] =
    'CLIENT_CONNECT_WITH_DB'
  ServerCapabilities2[(ServerCapabilities2['CLIENT_LONG_FLAG'] = 4)] =
    'CLIENT_LONG_FLAG'
  ServerCapabilities2[
    (ServerCapabilities2['CLIENT_DEPRECATE_EOF'] = 16777216)
  ] = 'CLIENT_DEPRECATE_EOF'
  ServerCapabilities2[(ServerCapabilities2['CLIENT_LONG_PASSWORD'] = 1)] =
    'CLIENT_LONG_PASSWORD'
  ServerCapabilities2[(ServerCapabilities2['CLIENT_TRANSACTIONS'] = 8192)] =
    'CLIENT_TRANSACTIONS'
  ServerCapabilities2[(ServerCapabilities2['CLIENT_MULTI_RESULTS'] = 131072)] =
    'CLIENT_MULTI_RESULTS'
  ServerCapabilities2[
    (ServerCapabilities2['CLIENT_PLUGIN_AUTH_LENENC_CLIENT_DATA'] = 2097152)
  ] = 'CLIENT_PLUGIN_AUTH_LENENC_CLIENT_DATA'
  ServerCapabilities2[(ServerCapabilities2['CLIENT_PLUGIN_AUTH'] = 524288)] =
    'CLIENT_PLUGIN_AUTH'
  ServerCapabilities2[
    (ServerCapabilities2['CLIENT_SECURE_CONNECTION'] = 32768)
  ] = 'CLIENT_SECURE_CONNECTION'
  ServerCapabilities2[(ServerCapabilities2['CLIENT_FOUND_ROWS'] = 2)] =
    'CLIENT_FOUND_ROWS'
  ServerCapabilities2[(ServerCapabilities2['CLIENT_CONNECT_ATTRS'] = 1048576)] =
    'CLIENT_CONNECT_ATTRS'
  ServerCapabilities2[(ServerCapabilities2['CLIENT_IGNORE_SPACE'] = 256)] =
    'CLIENT_IGNORE_SPACE'
  ServerCapabilities2[(ServerCapabilities2['CLIENT_IGNORE_SIGPIPE'] = 4096)] =
    'CLIENT_IGNORE_SIGPIPE'
  ServerCapabilities2[(ServerCapabilities2['CLIENT_RESERVED'] = 16384)] =
    'CLIENT_RESERVED'
  ServerCapabilities2[
    (ServerCapabilities2['CLIENT_PS_MULTI_RESULTS'] = 262144)
  ] = 'CLIENT_PS_MULTI_RESULTS'
})(ServerCapabilities || (ServerCapabilities = {}))
var Charset
;(function (Charset2) {
  Charset2[(Charset2['BIG5_CHINESE_CI'] = 1)] = 'BIG5_CHINESE_CI'
  Charset2[(Charset2['LATIN2_CZECH_CS'] = 2)] = 'LATIN2_CZECH_CS'
  Charset2[(Charset2['DEC8_SWEDISH_CI'] = 3)] = 'DEC8_SWEDISH_CI'
  Charset2[(Charset2['CP850_GENERAL_CI'] = 4)] = 'CP850_GENERAL_CI'
  Charset2[(Charset2['LATIN1_GERMAN1_CI'] = 5)] = 'LATIN1_GERMAN1_CI'
  Charset2[(Charset2['HP8_ENGLISH_CI'] = 6)] = 'HP8_ENGLISH_CI'
  Charset2[(Charset2['KOI8R_GENERAL_CI'] = 7)] = 'KOI8R_GENERAL_CI'
  Charset2[(Charset2['LATIN1_SWEDISH_CI'] = 8)] = 'LATIN1_SWEDISH_CI'
  Charset2[(Charset2['LATIN2_GENERAL_CI'] = 9)] = 'LATIN2_GENERAL_CI'
  Charset2[(Charset2['SWE7_SWEDISH_CI'] = 10)] = 'SWE7_SWEDISH_CI'
  Charset2[(Charset2['ASCII_GENERAL_CI'] = 11)] = 'ASCII_GENERAL_CI'
  Charset2[(Charset2['UJIS_JAPANESE_CI'] = 12)] = 'UJIS_JAPANESE_CI'
  Charset2[(Charset2['SJIS_JAPANESE_CI'] = 13)] = 'SJIS_JAPANESE_CI'
  Charset2[(Charset2['CP1251_BULGARIAN_CI'] = 14)] = 'CP1251_BULGARIAN_CI'
  Charset2[(Charset2['LATIN1_DANISH_CI'] = 15)] = 'LATIN1_DANISH_CI'
  Charset2[(Charset2['HEBREW_GENERAL_CI'] = 16)] = 'HEBREW_GENERAL_CI'
  Charset2[(Charset2['TIS620_THAI_CI'] = 18)] = 'TIS620_THAI_CI'
  Charset2[(Charset2['EUCKR_KOREAN_CI'] = 19)] = 'EUCKR_KOREAN_CI'
  Charset2[(Charset2['LATIN7_ESTONIAN_CS'] = 20)] = 'LATIN7_ESTONIAN_CS'
  Charset2[(Charset2['LATIN2_HUNGARIAN_CI'] = 21)] = 'LATIN2_HUNGARIAN_CI'
  Charset2[(Charset2['KOI8U_GENERAL_CI'] = 22)] = 'KOI8U_GENERAL_CI'
  Charset2[(Charset2['CP1251_UKRAINIAN_CI'] = 23)] = 'CP1251_UKRAINIAN_CI'
  Charset2[(Charset2['GB2312_CHINESE_CI'] = 24)] = 'GB2312_CHINESE_CI'
  Charset2[(Charset2['GREEK_GENERAL_CI'] = 25)] = 'GREEK_GENERAL_CI'
  Charset2[(Charset2['CP1250_GENERAL_CI'] = 26)] = 'CP1250_GENERAL_CI'
  Charset2[(Charset2['LATIN2_CROATIAN_CI'] = 27)] = 'LATIN2_CROATIAN_CI'
  Charset2[(Charset2['GBK_CHINESE_CI'] = 28)] = 'GBK_CHINESE_CI'
  Charset2[(Charset2['CP1257_LITHUANIAN_CI'] = 29)] = 'CP1257_LITHUANIAN_CI'
  Charset2[(Charset2['LATIN5_TURKISH_CI'] = 30)] = 'LATIN5_TURKISH_CI'
  Charset2[(Charset2['LATIN1_GERMAN2_CI'] = 31)] = 'LATIN1_GERMAN2_CI'
  Charset2[(Charset2['ARMSCII8_GENERAL_CI'] = 32)] = 'ARMSCII8_GENERAL_CI'
  Charset2[(Charset2['UTF8_GENERAL_CI'] = 33)] = 'UTF8_GENERAL_CI'
  Charset2[(Charset2['CP1250_CZECH_CS'] = 34)] = 'CP1250_CZECH_CS'
  Charset2[(Charset2['UCS2_GENERAL_CI'] = 35)] = 'UCS2_GENERAL_CI'
  Charset2[(Charset2['CP866_GENERAL_CI'] = 36)] = 'CP866_GENERAL_CI'
  Charset2[(Charset2['KEYBCS2_GENERAL_CI'] = 37)] = 'KEYBCS2_GENERAL_CI'
  Charset2[(Charset2['MACCE_GENERAL_CI'] = 38)] = 'MACCE_GENERAL_CI'
  Charset2[(Charset2['MACROMAN_GENERAL_CI'] = 39)] = 'MACROMAN_GENERAL_CI'
  Charset2[(Charset2['CP852_GENERAL_CI'] = 40)] = 'CP852_GENERAL_CI'
  Charset2[(Charset2['LATIN7_GENERAL_CI'] = 41)] = 'LATIN7_GENERAL_CI'
  Charset2[(Charset2['LATIN7_GENERAL_CS'] = 42)] = 'LATIN7_GENERAL_CS'
  Charset2[(Charset2['MACCE_BIN'] = 43)] = 'MACCE_BIN'
  Charset2[(Charset2['CP1250_CROATIAN_CI'] = 44)] = 'CP1250_CROATIAN_CI'
  Charset2[(Charset2['UTF8MB4_GENERAL_CI'] = 45)] = 'UTF8MB4_GENERAL_CI'
  Charset2[(Charset2['UTF8MB4_BIN'] = 46)] = 'UTF8MB4_BIN'
  Charset2[(Charset2['LATIN1_BIN'] = 47)] = 'LATIN1_BIN'
  Charset2[(Charset2['LATIN1_GENERAL_CI'] = 48)] = 'LATIN1_GENERAL_CI'
  Charset2[(Charset2['LATIN1_GENERAL_CS'] = 49)] = 'LATIN1_GENERAL_CS'
  Charset2[(Charset2['CP1251_BIN'] = 50)] = 'CP1251_BIN'
  Charset2[(Charset2['CP1251_GENERAL_CI'] = 51)] = 'CP1251_GENERAL_CI'
  Charset2[(Charset2['CP1251_GENERAL_CS'] = 52)] = 'CP1251_GENERAL_CS'
  Charset2[(Charset2['MACROMAN_BIN'] = 53)] = 'MACROMAN_BIN'
  Charset2[(Charset2['UTF16_GENERAL_CI'] = 54)] = 'UTF16_GENERAL_CI'
  Charset2[(Charset2['UTF16_BIN'] = 55)] = 'UTF16_BIN'
  Charset2[(Charset2['UTF16LE_GENERAL_CI'] = 56)] = 'UTF16LE_GENERAL_CI'
  Charset2[(Charset2['CP1256_GENERAL_CI'] = 57)] = 'CP1256_GENERAL_CI'
  Charset2[(Charset2['CP1257_BIN'] = 58)] = 'CP1257_BIN'
  Charset2[(Charset2['CP1257_GENERAL_CI'] = 59)] = 'CP1257_GENERAL_CI'
  Charset2[(Charset2['UTF32_GENERAL_CI'] = 60)] = 'UTF32_GENERAL_CI'
  Charset2[(Charset2['UTF32_BIN'] = 61)] = 'UTF32_BIN'
  Charset2[(Charset2['UTF16LE_BIN'] = 62)] = 'UTF16LE_BIN'
  Charset2[(Charset2['BINARY'] = 63)] = 'BINARY'
  Charset2[(Charset2['ARMSCII8_BIN'] = 64)] = 'ARMSCII8_BIN'
  Charset2[(Charset2['ASCII_BIN'] = 65)] = 'ASCII_BIN'
  Charset2[(Charset2['CP1250_BIN'] = 66)] = 'CP1250_BIN'
  Charset2[(Charset2['CP1256_BIN'] = 67)] = 'CP1256_BIN'
  Charset2[(Charset2['CP866_BIN'] = 68)] = 'CP866_BIN'
  Charset2[(Charset2['DEC8_BIN'] = 69)] = 'DEC8_BIN'
  Charset2[(Charset2['GREEK_BIN'] = 70)] = 'GREEK_BIN'
  Charset2[(Charset2['HEBREW_BIN'] = 71)] = 'HEBREW_BIN'
  Charset2[(Charset2['HP8_BIN'] = 72)] = 'HP8_BIN'
  Charset2[(Charset2['KEYBCS2_BIN'] = 73)] = 'KEYBCS2_BIN'
  Charset2[(Charset2['KOI8R_BIN'] = 74)] = 'KOI8R_BIN'
  Charset2[(Charset2['KOI8U_BIN'] = 75)] = 'KOI8U_BIN'
  Charset2[(Charset2['LATIN2_BIN'] = 77)] = 'LATIN2_BIN'
  Charset2[(Charset2['LATIN5_BIN'] = 78)] = 'LATIN5_BIN'
  Charset2[(Charset2['LATIN7_BIN'] = 79)] = 'LATIN7_BIN'
  Charset2[(Charset2['CP850_BIN'] = 80)] = 'CP850_BIN'
  Charset2[(Charset2['CP852_BIN'] = 81)] = 'CP852_BIN'
  Charset2[(Charset2['SWE7_BIN'] = 82)] = 'SWE7_BIN'
  Charset2[(Charset2['UTF8_BIN'] = 83)] = 'UTF8_BIN'
  Charset2[(Charset2['BIG5_BIN'] = 84)] = 'BIG5_BIN'
  Charset2[(Charset2['EUCKR_BIN'] = 85)] = 'EUCKR_BIN'
  Charset2[(Charset2['GB2312_BIN'] = 86)] = 'GB2312_BIN'
  Charset2[(Charset2['GBK_BIN'] = 87)] = 'GBK_BIN'
  Charset2[(Charset2['SJIS_BIN'] = 88)] = 'SJIS_BIN'
  Charset2[(Charset2['TIS620_BIN'] = 89)] = 'TIS620_BIN'
  Charset2[(Charset2['UCS2_BIN'] = 90)] = 'UCS2_BIN'
  Charset2[(Charset2['UJIS_BIN'] = 91)] = 'UJIS_BIN'
  Charset2[(Charset2['GEOSTD8_GENERAL_CI'] = 92)] = 'GEOSTD8_GENERAL_CI'
  Charset2[(Charset2['GEOSTD8_BIN'] = 93)] = 'GEOSTD8_BIN'
  Charset2[(Charset2['LATIN1_SPANISH_CI'] = 94)] = 'LATIN1_SPANISH_CI'
  Charset2[(Charset2['CP932_JAPANESE_CI'] = 95)] = 'CP932_JAPANESE_CI'
  Charset2[(Charset2['CP932_BIN'] = 96)] = 'CP932_BIN'
  Charset2[(Charset2['EUCJPMS_JAPANESE_CI'] = 97)] = 'EUCJPMS_JAPANESE_CI'
  Charset2[(Charset2['EUCJPMS_BIN'] = 98)] = 'EUCJPMS_BIN'
  Charset2[(Charset2['CP1250_POLISH_CI'] = 99)] = 'CP1250_POLISH_CI'
  Charset2[(Charset2['UTF16_UNICODE_CI'] = 101)] = 'UTF16_UNICODE_CI'
  Charset2[(Charset2['UTF16_ICELANDIC_CI'] = 102)] = 'UTF16_ICELANDIC_CI'
  Charset2[(Charset2['UTF16_LATVIAN_CI'] = 103)] = 'UTF16_LATVIAN_CI'
  Charset2[(Charset2['UTF16_ROMANIAN_CI'] = 104)] = 'UTF16_ROMANIAN_CI'
  Charset2[(Charset2['UTF16_SLOVENIAN_CI'] = 105)] = 'UTF16_SLOVENIAN_CI'
  Charset2[(Charset2['UTF16_POLISH_CI'] = 106)] = 'UTF16_POLISH_CI'
  Charset2[(Charset2['UTF16_ESTONIAN_CI'] = 107)] = 'UTF16_ESTONIAN_CI'
  Charset2[(Charset2['UTF16_SPANISH_CI'] = 108)] = 'UTF16_SPANISH_CI'
  Charset2[(Charset2['UTF16_SWEDISH_CI'] = 109)] = 'UTF16_SWEDISH_CI'
  Charset2[(Charset2['UTF16_TURKISH_CI'] = 110)] = 'UTF16_TURKISH_CI'
  Charset2[(Charset2['UTF16_CZECH_CI'] = 111)] = 'UTF16_CZECH_CI'
  Charset2[(Charset2['UTF16_DANISH_CI'] = 112)] = 'UTF16_DANISH_CI'
  Charset2[(Charset2['UTF16_LITHUANIAN_CI'] = 113)] = 'UTF16_LITHUANIAN_CI'
  Charset2[(Charset2['UTF16_SLOVAK_CI'] = 114)] = 'UTF16_SLOVAK_CI'
  Charset2[(Charset2['UTF16_SPANISH2_CI'] = 115)] = 'UTF16_SPANISH2_CI'
  Charset2[(Charset2['UTF16_ROMAN_CI'] = 116)] = 'UTF16_ROMAN_CI'
  Charset2[(Charset2['UTF16_PERSIAN_CI'] = 117)] = 'UTF16_PERSIAN_CI'
  Charset2[(Charset2['UTF16_ESPERANTO_CI'] = 118)] = 'UTF16_ESPERANTO_CI'
  Charset2[(Charset2['UTF16_HUNGARIAN_CI'] = 119)] = 'UTF16_HUNGARIAN_CI'
  Charset2[(Charset2['UTF16_SINHALA_CI'] = 120)] = 'UTF16_SINHALA_CI'
  Charset2[(Charset2['UTF16_GERMAN2_CI'] = 121)] = 'UTF16_GERMAN2_CI'
  Charset2[(Charset2['UTF16_CROATIAN_MYSQL561_CI'] = 122)] =
    'UTF16_CROATIAN_MYSQL561_CI'
  Charset2[(Charset2['UTF16_UNICODE_520_CI'] = 123)] = 'UTF16_UNICODE_520_CI'
  Charset2[(Charset2['UTF16_VIETNAMESE_CI'] = 124)] = 'UTF16_VIETNAMESE_CI'
  Charset2[(Charset2['UCS2_UNICODE_CI'] = 128)] = 'UCS2_UNICODE_CI'
  Charset2[(Charset2['UCS2_ICELANDIC_CI'] = 129)] = 'UCS2_ICELANDIC_CI'
  Charset2[(Charset2['UCS2_LATVIAN_CI'] = 130)] = 'UCS2_LATVIAN_CI'
  Charset2[(Charset2['UCS2_ROMANIAN_CI'] = 131)] = 'UCS2_ROMANIAN_CI'
  Charset2[(Charset2['UCS2_SLOVENIAN_CI'] = 132)] = 'UCS2_SLOVENIAN_CI'
  Charset2[(Charset2['UCS2_POLISH_CI'] = 133)] = 'UCS2_POLISH_CI'
  Charset2[(Charset2['UCS2_ESTONIAN_CI'] = 134)] = 'UCS2_ESTONIAN_CI'
  Charset2[(Charset2['UCS2_SPANISH_CI'] = 135)] = 'UCS2_SPANISH_CI'
  Charset2[(Charset2['UCS2_SWEDISH_CI'] = 136)] = 'UCS2_SWEDISH_CI'
  Charset2[(Charset2['UCS2_TURKISH_CI'] = 137)] = 'UCS2_TURKISH_CI'
  Charset2[(Charset2['UCS2_CZECH_CI'] = 138)] = 'UCS2_CZECH_CI'
  Charset2[(Charset2['UCS2_DANISH_CI'] = 139)] = 'UCS2_DANISH_CI'
  Charset2[(Charset2['UCS2_LITHUANIAN_CI'] = 140)] = 'UCS2_LITHUANIAN_CI'
  Charset2[(Charset2['UCS2_SLOVAK_CI'] = 141)] = 'UCS2_SLOVAK_CI'
  Charset2[(Charset2['UCS2_SPANISH2_CI'] = 142)] = 'UCS2_SPANISH2_CI'
  Charset2[(Charset2['UCS2_ROMAN_CI'] = 143)] = 'UCS2_ROMAN_CI'
  Charset2[(Charset2['UCS2_PERSIAN_CI'] = 144)] = 'UCS2_PERSIAN_CI'
  Charset2[(Charset2['UCS2_ESPERANTO_CI'] = 145)] = 'UCS2_ESPERANTO_CI'
  Charset2[(Charset2['UCS2_HUNGARIAN_CI'] = 146)] = 'UCS2_HUNGARIAN_CI'
  Charset2[(Charset2['UCS2_SINHALA_CI'] = 147)] = 'UCS2_SINHALA_CI'
  Charset2[(Charset2['UCS2_GERMAN2_CI'] = 148)] = 'UCS2_GERMAN2_CI'
  Charset2[(Charset2['UCS2_CROATIAN_MYSQL561_CI'] = 149)] =
    'UCS2_CROATIAN_MYSQL561_CI'
  Charset2[(Charset2['UCS2_UNICODE_520_CI'] = 150)] = 'UCS2_UNICODE_520_CI'
  Charset2[(Charset2['UCS2_VIETNAMESE_CI'] = 151)] = 'UCS2_VIETNAMESE_CI'
  Charset2[(Charset2['UCS2_GENERAL_MYSQL500_CI'] = 159)] =
    'UCS2_GENERAL_MYSQL500_CI'
  Charset2[(Charset2['UTF32_UNICODE_CI'] = 160)] = 'UTF32_UNICODE_CI'
  Charset2[(Charset2['UTF32_ICELANDIC_CI'] = 161)] = 'UTF32_ICELANDIC_CI'
  Charset2[(Charset2['UTF32_LATVIAN_CI'] = 162)] = 'UTF32_LATVIAN_CI'
  Charset2[(Charset2['UTF32_ROMANIAN_CI'] = 163)] = 'UTF32_ROMANIAN_CI'
  Charset2[(Charset2['UTF32_SLOVENIAN_CI'] = 164)] = 'UTF32_SLOVENIAN_CI'
  Charset2[(Charset2['UTF32_POLISH_CI'] = 165)] = 'UTF32_POLISH_CI'
  Charset2[(Charset2['UTF32_ESTONIAN_CI'] = 166)] = 'UTF32_ESTONIAN_CI'
  Charset2[(Charset2['UTF32_SPANISH_CI'] = 167)] = 'UTF32_SPANISH_CI'
  Charset2[(Charset2['UTF32_SWEDISH_CI'] = 168)] = 'UTF32_SWEDISH_CI'
  Charset2[(Charset2['UTF32_TURKISH_CI'] = 169)] = 'UTF32_TURKISH_CI'
  Charset2[(Charset2['UTF32_CZECH_CI'] = 170)] = 'UTF32_CZECH_CI'
  Charset2[(Charset2['UTF32_DANISH_CI'] = 171)] = 'UTF32_DANISH_CI'
  Charset2[(Charset2['UTF32_LITHUANIAN_CI'] = 172)] = 'UTF32_LITHUANIAN_CI'
  Charset2[(Charset2['UTF32_SLOVAK_CI'] = 173)] = 'UTF32_SLOVAK_CI'
  Charset2[(Charset2['UTF32_SPANISH2_CI'] = 174)] = 'UTF32_SPANISH2_CI'
  Charset2[(Charset2['UTF32_ROMAN_CI'] = 175)] = 'UTF32_ROMAN_CI'
  Charset2[(Charset2['UTF32_PERSIAN_CI'] = 176)] = 'UTF32_PERSIAN_CI'
  Charset2[(Charset2['UTF32_ESPERANTO_CI'] = 177)] = 'UTF32_ESPERANTO_CI'
  Charset2[(Charset2['UTF32_HUNGARIAN_CI'] = 178)] = 'UTF32_HUNGARIAN_CI'
  Charset2[(Charset2['UTF32_SINHALA_CI'] = 179)] = 'UTF32_SINHALA_CI'
  Charset2[(Charset2['UTF32_GERMAN2_CI'] = 180)] = 'UTF32_GERMAN2_CI'
  Charset2[(Charset2['UTF32_CROATIAN_MYSQL561_CI'] = 181)] =
    'UTF32_CROATIAN_MYSQL561_CI'
  Charset2[(Charset2['UTF32_UNICODE_520_CI'] = 182)] = 'UTF32_UNICODE_520_CI'
  Charset2[(Charset2['UTF32_VIETNAMESE_CI'] = 183)] = 'UTF32_VIETNAMESE_CI'
  Charset2[(Charset2['UTF8_UNICODE_CI'] = 192)] = 'UTF8_UNICODE_CI'
  Charset2[(Charset2['UTF8_ICELANDIC_CI'] = 193)] = 'UTF8_ICELANDIC_CI'
  Charset2[(Charset2['UTF8_LATVIAN_CI'] = 194)] = 'UTF8_LATVIAN_CI'
  Charset2[(Charset2['UTF8_ROMANIAN_CI'] = 195)] = 'UTF8_ROMANIAN_CI'
  Charset2[(Charset2['UTF8_SLOVENIAN_CI'] = 196)] = 'UTF8_SLOVENIAN_CI'
  Charset2[(Charset2['UTF8_POLISH_CI'] = 197)] = 'UTF8_POLISH_CI'
  Charset2[(Charset2['UTF8_ESTONIAN_CI'] = 198)] = 'UTF8_ESTONIAN_CI'
  Charset2[(Charset2['UTF8_SPANISH_CI'] = 199)] = 'UTF8_SPANISH_CI'
  Charset2[(Charset2['UTF8_SWEDISH_CI'] = 200)] = 'UTF8_SWEDISH_CI'
  Charset2[(Charset2['UTF8_TURKISH_CI'] = 201)] = 'UTF8_TURKISH_CI'
  Charset2[(Charset2['UTF8_CZECH_CI'] = 202)] = 'UTF8_CZECH_CI'
  Charset2[(Charset2['UTF8_DANISH_CI'] = 203)] = 'UTF8_DANISH_CI'
  Charset2[(Charset2['UTF8_LITHUANIAN_CI'] = 204)] = 'UTF8_LITHUANIAN_CI'
  Charset2[(Charset2['UTF8_SLOVAK_CI'] = 205)] = 'UTF8_SLOVAK_CI'
  Charset2[(Charset2['UTF8_SPANISH2_CI'] = 206)] = 'UTF8_SPANISH2_CI'
  Charset2[(Charset2['UTF8_ROMAN_CI'] = 207)] = 'UTF8_ROMAN_CI'
  Charset2[(Charset2['UTF8_PERSIAN_CI'] = 208)] = 'UTF8_PERSIAN_CI'
  Charset2[(Charset2['UTF8_ESPERANTO_CI'] = 209)] = 'UTF8_ESPERANTO_CI'
  Charset2[(Charset2['UTF8_HUNGARIAN_CI'] = 210)] = 'UTF8_HUNGARIAN_CI'
  Charset2[(Charset2['UTF8_SINHALA_CI'] = 211)] = 'UTF8_SINHALA_CI'
  Charset2[(Charset2['UTF8_GERMAN2_CI'] = 212)] = 'UTF8_GERMAN2_CI'
  Charset2[(Charset2['UTF8_CROATIAN_MYSQL561_CI'] = 213)] =
    'UTF8_CROATIAN_MYSQL561_CI'
  Charset2[(Charset2['UTF8_UNICODE_520_CI'] = 214)] = 'UTF8_UNICODE_520_CI'
  Charset2[(Charset2['UTF8_VIETNAMESE_CI'] = 215)] = 'UTF8_VIETNAMESE_CI'
  Charset2[(Charset2['UTF8_GENERAL_MYSQL500_CI'] = 223)] =
    'UTF8_GENERAL_MYSQL500_CI'
  Charset2[(Charset2['UTF8MB4_UNICODE_CI'] = 224)] = 'UTF8MB4_UNICODE_CI'
  Charset2[(Charset2['UTF8MB4_ICELANDIC_CI'] = 225)] = 'UTF8MB4_ICELANDIC_CI'
  Charset2[(Charset2['UTF8MB4_LATVIAN_CI'] = 226)] = 'UTF8MB4_LATVIAN_CI'
  Charset2[(Charset2['UTF8MB4_ROMANIAN_CI'] = 227)] = 'UTF8MB4_ROMANIAN_CI'
  Charset2[(Charset2['UTF8MB4_SLOVENIAN_CI'] = 228)] = 'UTF8MB4_SLOVENIAN_CI'
  Charset2[(Charset2['UTF8MB4_POLISH_CI'] = 229)] = 'UTF8MB4_POLISH_CI'
  Charset2[(Charset2['UTF8MB4_ESTONIAN_CI'] = 230)] = 'UTF8MB4_ESTONIAN_CI'
  Charset2[(Charset2['UTF8MB4_SPANISH_CI'] = 231)] = 'UTF8MB4_SPANISH_CI'
  Charset2[(Charset2['UTF8MB4_SWEDISH_CI'] = 232)] = 'UTF8MB4_SWEDISH_CI'
  Charset2[(Charset2['UTF8MB4_TURKISH_CI'] = 233)] = 'UTF8MB4_TURKISH_CI'
  Charset2[(Charset2['UTF8MB4_CZECH_CI'] = 234)] = 'UTF8MB4_CZECH_CI'
  Charset2[(Charset2['UTF8MB4_DANISH_CI'] = 235)] = 'UTF8MB4_DANISH_CI'
  Charset2[(Charset2['UTF8MB4_LITHUANIAN_CI'] = 236)] = 'UTF8MB4_LITHUANIAN_CI'
  Charset2[(Charset2['UTF8MB4_SLOVAK_CI'] = 237)] = 'UTF8MB4_SLOVAK_CI'
  Charset2[(Charset2['UTF8MB4_SPANISH2_CI'] = 238)] = 'UTF8MB4_SPANISH2_CI'
  Charset2[(Charset2['UTF8MB4_ROMAN_CI'] = 239)] = 'UTF8MB4_ROMAN_CI'
  Charset2[(Charset2['UTF8MB4_PERSIAN_CI'] = 240)] = 'UTF8MB4_PERSIAN_CI'
  Charset2[(Charset2['UTF8MB4_ESPERANTO_CI'] = 241)] = 'UTF8MB4_ESPERANTO_CI'
  Charset2[(Charset2['UTF8MB4_HUNGARIAN_CI'] = 242)] = 'UTF8MB4_HUNGARIAN_CI'
  Charset2[(Charset2['UTF8MB4_SINHALA_CI'] = 243)] = 'UTF8MB4_SINHALA_CI'
  Charset2[(Charset2['UTF8MB4_GERMAN2_CI'] = 244)] = 'UTF8MB4_GERMAN2_CI'
  Charset2[(Charset2['UTF8MB4_CROATIAN_MYSQL561_CI'] = 245)] =
    'UTF8MB4_CROATIAN_MYSQL561_CI'
  Charset2[(Charset2['UTF8MB4_UNICODE_520_CI'] = 246)] =
    'UTF8MB4_UNICODE_520_CI'
  Charset2[(Charset2['UTF8MB4_VIETNAMESE_CI'] = 247)] = 'UTF8MB4_VIETNAMESE_CI'
  Charset2[(Charset2['UTF8_GENERAL50_CI'] = 253)] = 'UTF8_GENERAL50_CI'
  Charset2[(Charset2['ARMSCII8'] = 32)] = 'ARMSCII8'
  Charset2[(Charset2['ASCII'] = 11)] = 'ASCII'
  Charset2[(Charset2['BIG5'] = 1)] = 'BIG5'
  Charset2[(Charset2['CP1250'] = 26)] = 'CP1250'
  Charset2[(Charset2['CP1251'] = 51)] = 'CP1251'
  Charset2[(Charset2['CP1256'] = 57)] = 'CP1256'
  Charset2[(Charset2['CP1257'] = 59)] = 'CP1257'
  Charset2[(Charset2['CP866'] = 36)] = 'CP866'
  Charset2[(Charset2['CP850'] = 4)] = 'CP850'
  Charset2[(Charset2['CP852'] = 40)] = 'CP852'
  Charset2[(Charset2['CP932'] = 95)] = 'CP932'
  Charset2[(Charset2['DEC8'] = 3)] = 'DEC8'
  Charset2[(Charset2['EUCJPMS'] = 97)] = 'EUCJPMS'
  Charset2[(Charset2['EUCKR'] = 19)] = 'EUCKR'
  Charset2[(Charset2['GB2312'] = 24)] = 'GB2312'
  Charset2[(Charset2['GBK'] = 28)] = 'GBK'
  Charset2[(Charset2['GEOSTD8'] = 92)] = 'GEOSTD8'
  Charset2[(Charset2['GREEK'] = 25)] = 'GREEK'
  Charset2[(Charset2['HEBREW'] = 16)] = 'HEBREW'
  Charset2[(Charset2['HP8'] = 6)] = 'HP8'
  Charset2[(Charset2['KEYBCS2'] = 37)] = 'KEYBCS2'
  Charset2[(Charset2['KOI8R'] = 7)] = 'KOI8R'
  Charset2[(Charset2['KOI8U'] = 22)] = 'KOI8U'
  Charset2[(Charset2['LATIN1'] = 8)] = 'LATIN1'
  Charset2[(Charset2['LATIN2'] = 9)] = 'LATIN2'
  Charset2[(Charset2['LATIN5'] = 30)] = 'LATIN5'
  Charset2[(Charset2['LATIN7'] = 41)] = 'LATIN7'
  Charset2[(Charset2['MACCE'] = 38)] = 'MACCE'
  Charset2[(Charset2['MACROMAN'] = 39)] = 'MACROMAN'
  Charset2[(Charset2['SJIS'] = 13)] = 'SJIS'
  Charset2[(Charset2['SWE7'] = 10)] = 'SWE7'
  Charset2[(Charset2['TIS620'] = 18)] = 'TIS620'
  Charset2[(Charset2['UCS2'] = 35)] = 'UCS2'
  Charset2[(Charset2['UJIS'] = 12)] = 'UJIS'
  Charset2[(Charset2['UTF16'] = 54)] = 'UTF16'
  Charset2[(Charset2['UTF16LE'] = 56)] = 'UTF16LE'
  Charset2[(Charset2['UTF8'] = 33)] = 'UTF8'
  Charset2[(Charset2['UTF8MB4'] = 45)] = 'UTF8MB4'
  Charset2[(Charset2['UTF32'] = 60)] = 'UTF32'
})(Charset || (Charset = {}))
function buildAuth(packet, params) {
  const clientParam =
    (params.db ? ServerCapabilities.CLIENT_CONNECT_WITH_DB : 0) |
    ServerCapabilities.CLIENT_PLUGIN_AUTH |
    ServerCapabilities.CLIENT_LONG_PASSWORD |
    ServerCapabilities.CLIENT_PROTOCOL_41 |
    ServerCapabilities.CLIENT_TRANSACTIONS |
    ServerCapabilities.CLIENT_MULTI_RESULTS |
    ServerCapabilities.CLIENT_SECURE_CONNECTION |
    (ServerCapabilities.CLIENT_LONG_FLAG & packet.serverCapabilities) |
    (ServerCapabilities.CLIENT_PLUGIN_AUTH_LENENC_CLIENT_DATA &
      packet.serverCapabilities) |
    (ServerCapabilities.CLIENT_DEPRECATE_EOF & packet.serverCapabilities)
  if (packet.serverCapabilities & ServerCapabilities.CLIENT_PLUGIN_AUTH) {
    const writer = new BufferWriter(new Uint8Array(1e3))
    writer
      .writeUint32(clientParam)
      .writeUint32(2 ** 24 - 1)
      .write(Charset.UTF8_GENERAL_CI)
      .skip(23)
      .writeNullTerminatedString(params.username)
    if (params.password) {
      const authData = auth(packet.authPluginName, params.password, packet.seed)
      if (
        clientParam &
          ServerCapabilities.CLIENT_PLUGIN_AUTH_LENENC_CLIENT_DATA ||
        clientParam & ServerCapabilities.CLIENT_SECURE_CONNECTION
      ) {
        writer.write(authData.length)
        writer.writeBuffer(authData)
      } else {
        writer.writeBuffer(authData)
        writer.write(0)
      }
    } else {
      writer.write(0)
    }
    if (clientParam & ServerCapabilities.CLIENT_CONNECT_WITH_DB && params.db) {
      writer.writeNullTerminatedString(params.db)
    }
    if (clientParam & ServerCapabilities.CLIENT_PLUGIN_AUTH) {
      writer.writeNullTerminatedString(packet.authPluginName)
    }
    return writer.wroteData
  }
  return Uint8Array.from([])
}
function buildQuery(sql, params = []) {
  const data = encode2(replaceParams(sql, params))
  const writer = new BufferWriter(new Uint8Array(data.length + 1))
  writer.write(3)
  writer.writeBuffer(data)
  return writer.buffer
}
var PacketType
;(function (PacketType2) {
  PacketType2[(PacketType2['OK_Packet'] = 0)] = 'OK_Packet'
  PacketType2[(PacketType2['EOF_Packet'] = 254)] = 'EOF_Packet'
  PacketType2[(PacketType2['ERR_Packet'] = 255)] = 'ERR_Packet'
  PacketType2[(PacketType2['Result'] = 256)] = 'Result'
})(PacketType || (PacketType = {}))
var SendPacket = class {
  header
  constructor(body, no) {
    this.body = body
    this.header = {
      size: body.length,
      no,
    }
  }
  async send(conn) {
    const body = this.body
    const data = new BufferWriter(new Uint8Array(4 + body.length))
    data.writeUints(3, this.header.size)
    data.write(this.header.no)
    data.writeBuffer(body)
    logger.debug(`send: ${data.length}B 
${format(data.buffer)}
`)
    try {
      let wrote = 0
      do {
        wrote += await conn.write(data.buffer.subarray(wrote))
      } while (wrote < data.length)
    } catch (error2) {
      throw new WriteError(error2.message)
    }
  }
  body
}
var ReceivePacket = class {
  header
  body
  type
  async parse(reader) {
    const header = new BufferReader(new Uint8Array(4))
    let readCount = 0
    let nread = await this.read(reader, header.buffer)
    if (nread === null) return null
    readCount = nread
    const bodySize = header.readUints(3)
    this.header = {
      size: bodySize,
      no: header.readUint8(),
    }
    this.body = new BufferReader(new Uint8Array(bodySize))
    nread = await this.read(reader, this.body.buffer)
    if (nread === null) return null
    readCount += nread
    const { OK_Packet, ERR_Packet, EOF_Packet, Result } = PacketType
    switch (this.body.buffer[0]) {
      case OK_Packet:
        this.type = OK_Packet
        break
      case 255:
        this.type = ERR_Packet
        break
      case 254:
        this.type = EOF_Packet
        break
      default:
        this.type = Result
        break
    }
    debug1(() => {
      const data = new Uint8Array(readCount)
      data.set(header.buffer)
      data.set(this.body.buffer, 4)
      logger.debug(`receive: ${readCount}B, size = ${this.header.size}, no = ${
        this.header.no
      } 
${format(data)}
`)
    })
    return this
  }
  async read(reader, buffer) {
    const size = buffer.length
    let haveRead = 0
    while (haveRead < size) {
      const nread = await reader.read(buffer.subarray(haveRead))
      if (nread === null) return null
      haveRead += nread
    }
    return haveRead
  }
}
function parseError(reader, conn) {
  const code2 = reader.readUint16()
  const packet = {
    code: code2,
    message: '',
  }
  if (conn.capabilities & ServerCapabilities.CLIENT_PROTOCOL_41) {
    packet.sqlStateMarker = reader.readUint8()
    packet.sqlState = reader.readUints(5)
  }
  packet.message = reader.readNullTerminatedString()
  return packet
}
function parseHandshake(reader) {
  const protocolVersion = reader.readUint8()
  const serverVersion = reader.readNullTerminatedString()
  const threadId = reader.readUint32()
  const seedWriter = new BufferWriter(new Uint8Array(20))
  seedWriter.writeBuffer(reader.readBuffer(8))
  reader.skip(1)
  let serverCapabilities = reader.readUint16()
  let characterSet = 0,
    statusFlags = 0,
    authPluginDataLength = 0,
    authPluginName = ''
  if (!reader.finished) {
    characterSet = reader.readUint8()
    statusFlags = reader.readUint16()
    serverCapabilities |= reader.readUint16() << 16
    if ((serverCapabilities & ServerCapabilities.CLIENT_PLUGIN_AUTH) != 0) {
      authPluginDataLength = reader.readUint8()
    } else {
      reader.skip(1)
    }
    reader.skip(10)
    if (
      (serverCapabilities & ServerCapabilities.CLIENT_SECURE_CONNECTION) !=
      0
    ) {
      seedWriter.writeBuffer(
        reader.readBuffer(Math.max(13, authPluginDataLength - 8)),
      )
    }
    if ((serverCapabilities & ServerCapabilities.CLIENT_PLUGIN_AUTH) != 0) {
      authPluginName = reader.readNullTerminatedString()
    }
  }
  return {
    protocolVersion,
    serverVersion,
    threadId,
    seed: seedWriter.buffer,
    serverCapabilities,
    characterSet,
    statusFlags,
    authPluginName,
  }
}
var AuthResult
;(function (AuthResult2) {
  AuthResult2[(AuthResult2['AuthPassed'] = 0)] = 'AuthPassed'
  AuthResult2[(AuthResult2['MethodMismatch'] = 1)] = 'MethodMismatch'
  AuthResult2[(AuthResult2['AuthMoreRequired'] = 2)] = 'AuthMoreRequired'
})(AuthResult || (AuthResult = {}))
function parseAuth(packet) {
  switch (packet.type) {
    case PacketType.EOF_Packet:
      return AuthResult.MethodMismatch
    case PacketType.Result:
      return AuthResult.AuthMoreRequired
    case PacketType.OK_Packet:
      return AuthResult.AuthPassed
    default:
      return AuthResult.AuthPassed
  }
}
function parseField(reader) {
  const catalog = reader.readLenCodeString()
  const schema = reader.readLenCodeString()
  const table = reader.readLenCodeString()
  const originTable = reader.readLenCodeString()
  const name = reader.readLenCodeString()
  const originName = reader.readLenCodeString()
  reader.skip(1)
  const encoding = reader.readUint16()
  const fieldLen = reader.readUint32()
  const fieldType = reader.readUint8()
  const fieldFlag = reader.readUint16()
  const decimals = reader.readUint8()
  reader.skip(1)
  const defaultVal = reader.readLenCodeString()
  return {
    catalog,
    schema,
    table,
    originName,
    fieldFlag,
    originTable,
    fieldLen,
    name,
    fieldType,
    encoding,
    decimals,
    defaultVal,
  }
}
function parseRow(reader, fields) {
  const row = {}
  for (const field of fields) {
    const name = field.name
    const val = reader.readLenCodeString()
    row[name] = val === null ? null : convertType(field, val)
  }
  return row
}
function convertType(field, val) {
  const { fieldType, fieldLen } = field
  switch (fieldType) {
    case 0:
    case 5:
    case 4:
    case 18:
      return parseFloat(val)
    case 246:
      return val
    case 1:
    case 2:
    case 3:
    case 9:
      return parseInt(val)
    case 8:
      if (
        Number(val) < Number.MIN_SAFE_INTEGER ||
        Number(val) > Number.MAX_SAFE_INTEGER
      ) {
        return BigInt(val)
      } else {
        return parseInt(val)
      }
    case 15:
    case 253:
    case 254:
    case 11:
    case 19:
      return val
    case 10:
    case 7:
    case 12:
    case 14:
    case 17:
    // case 18:
    //   return new Date(val)
    default:
      return val
  }
}
async function encryptWithPublicKey(key, data) {
  const pemHeader = '-----BEGIN PUBLIC KEY-----\n'
  const pemFooter = '\n-----END PUBLIC KEY-----'
  key = key.trim()
  key = key.substring(pemHeader.length, key.length - pemFooter.length)
  const importedKey = await crypto.subtle.importKey(
    'spki',
    decode(key),
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    false,
    ['encrypt'],
  )
  return await crypto.subtle.encrypt(
    {
      name: 'RSA-OAEP',
    },
    importedKey,
    data,
  )
}
var scramble
var password
async function start(scramble_, password_) {
  scramble = scramble_
  password = password_
  return {
    done: false,
    next: authMoreResponse,
  }
}
async function authMoreResponse(packet) {
  let AuthStatusFlags
  ;(function (AuthStatusFlags2) {
    AuthStatusFlags2[(AuthStatusFlags2['FullAuth'] = 4)] = 'FullAuth'
    AuthStatusFlags2[(AuthStatusFlags2['FastPath'] = 3)] = 'FastPath'
  })(AuthStatusFlags || (AuthStatusFlags = {}))
  const REQUEST_PUBLIC_KEY = 2
  const statusFlag = packet.body.skip(1).readUint8()
  let authMoreData,
    done = true,
    next,
    quickRead = false
  if (statusFlag === 4) {
    authMoreData = new Uint8Array([REQUEST_PUBLIC_KEY])
    done = false
    next = encryptWithKey
  }
  if (statusFlag === 3) {
    done = false
    quickRead = true
    next = terminate
  }
  return {
    done,
    next,
    quickRead,
    data: authMoreData,
  }
}
async function encryptWithKey(packet) {
  const publicKey = parsePublicKey(packet)
  const len = password.length
  const passwordBuffer = new Uint8Array(len + 1)
  for (let n = 0; n < len; n++) {
    passwordBuffer[n] = password.charCodeAt(n)
  }
  passwordBuffer[len] = 0
  const encryptedPassword = await encrypt(passwordBuffer, scramble, publicKey)
  return {
    done: false,
    next: terminate,
    data: new Uint8Array(encryptedPassword),
  }
}
function parsePublicKey(packet) {
  return packet.body.skip(1).readNullTerminatedString()
}
async function encrypt(password2, scramble2, key) {
  const stage1 = xor(password2, scramble2)
  return await encryptWithPublicKey(key, stage1)
}
function terminate() {
  return {
    done: true,
  }
}
var mod1 = {
  start,
}
var __default = {
  caching_sha2_password: mod1,
}
function parseAuthSwitch(reader) {
  const status = reader.readUint8()
  const authPluginName = reader.readNullTerminatedString()
  const authPluginData = reader.readRestOfPacketString()
  return {
    status,
    authPluginName,
    authPluginData,
  }
}
var ConnectionState
;(function (ConnectionState2) {
  ConnectionState2[(ConnectionState2['CONNECTING'] = 0)] = 'CONNECTING'
  ConnectionState2[(ConnectionState2['CONNECTED'] = 1)] = 'CONNECTED'
  ConnectionState2[(ConnectionState2['CLOSING'] = 2)] = 'CLOSING'
  ConnectionState2[(ConnectionState2['CLOSED'] = 3)] = 'CLOSED'
})(ConnectionState || (ConnectionState = {}))
var Connection = class {
  state
  capabilities
  serverVersion
  conn
  _timedOut
  get remoteAddr() {
    return this.config.socketPath
      ? `unix:${this.config.socketPath}`
      : `${this.config.hostname}:${this.config.port}`
  }
  constructor(config) {
    this.config = config
    this.state = ConnectionState.CONNECTING
    this.capabilities = 0
    this.serverVersion = ''
    this.conn = void 0
    this._timedOut = false
    this._timeoutCallback = () => {
      logger.info('connection read timed out')
      this._timedOut = true
      this.close()
    }
  }
  async _connect() {
    const {
      hostname,
      port = 3306,
      socketPath,
      username = '',
      password: password2,
    } = this.config
    logger.info(`connecting ${this.remoteAddr}`)
    this.conn = !socketPath
      ? await connect({
          transport: 'tcp',
          hostname,
          port,
        })
      : await connect({
          transport: 'unix',
          path: socketPath,
        })
    try {
      let receive = await this.nextPacket()
      const handshakePacket = parseHandshake(receive.body)
      const data = buildAuth(handshakePacket, {
        username,
        password: password2,
        db: this.config.db,
      })
      await new SendPacket(data, 1).send(this.conn)
      this.state = ConnectionState.CONNECTING
      this.serverVersion = handshakePacket.serverVersion
      this.capabilities = handshakePacket.serverCapabilities
      receive = await this.nextPacket()
      const authResult = parseAuth(receive)
      let handler
      switch (authResult) {
        case AuthResult.AuthMoreRequired:
          const adaptedPlugin = __default[handshakePacket.authPluginName]
          handler = adaptedPlugin
          break
        case AuthResult.MethodMismatch:
          const authSwitch = parseAuthSwitch(receive.body)
          if (
            authSwitch.authPluginData === void 0 ||
            authSwitch.authPluginData.length === 0
          ) {
            authSwitch.authPluginData = handshakePacket.seed
          }
          let authData
          if (password2) {
            authData = auth(
              authSwitch.authPluginName,
              password2,
              authSwitch.authPluginData,
            )
          } else {
            authData = Uint8Array.from([])
          }
          await new SendPacket(authData, receive.header.no + 1).send(this.conn)
          receive = await this.nextPacket()
          const authSwitch2 = parseAuthSwitch(receive.body)
          if (authSwitch2.authPluginName !== '') {
            throw new Error(
              'Do not allow to change the auth plugin more than once!',
            )
          }
      }
      let result
      if (handler) {
        result = await handler.start(handshakePacket.seed, password2)
        while (!result.done) {
          if (result.data) {
            const sequenceNumber = receive.header.no + 1
            await new SendPacket(result.data, sequenceNumber).send(this.conn)
            receive = await this.nextPacket()
          }
          if (result.quickRead) {
            await this.nextPacket()
          }
          if (result.next) {
            result = await result.next(receive)
          }
        }
      }
      const header = receive.body.readUint8()
      if (header === 255) {
        const error2 = parseError(receive.body, this)
        logger.error(`connect error(${error2.code}): ${error2.message}`)
        this.close()
        throw new Error(error2.message)
      } else {
        logger.info(`connected to ${this.remoteAddr}`)
        this.state = ConnectionState.CONNECTED
      }
      if (this.config.charset) {
        await this.execute(`SET NAMES ${this.config.charset}`)
      }
    } catch (error2) {
      this.close()
      throw error2
    }
  }
  async connect() {
    await this._connect()
  }
  async nextPacket() {
    if (!this.conn) {
      throw new ConnnectionError('Not connected')
    }
    const timeoutTimer = this.config.timeout
      ? setTimeout(this._timeoutCallback, this.config.timeout)
      : null
    let packet
    try {
      packet = await new ReceivePacket().parse(this.conn)
    } catch (error2) {
      if (this._timedOut) {
        throw new ResponseTimeoutError('Connection read timed out')
      }
      timeoutTimer && clearTimeout(timeoutTimer)
      this.close()
      throw error2
    }
    timeoutTimer && clearTimeout(timeoutTimer)
    if (!packet) {
      this.close()
      throw new ReadError('Connection closed unexpectedly')
    }
    if (packet.type === PacketType.ERR_Packet) {
      packet.body.skip(1)
      const error2 = parseError(packet.body, this)
      throw new Error(error2.message)
    }
    return packet
  }
  _timeoutCallback
  close() {
    if (this.state != ConnectionState.CLOSED) {
      logger.info('close connection')
      this.conn?.close()
      this.state = ConnectionState.CLOSED
    }
  }
  async query(sql, params) {
    const result = await this.execute(sql, params)
    if (result && result.rows) {
      return result.rows
    } else {
      return result
    }
  }
  async execute(sql, params, iterator = false) {
    if (this.state != ConnectionState.CONNECTED) {
      if (this.state == ConnectionState.CLOSED) {
        throw new ConnnectionError('Connection is closed')
      } else {
        throw new ConnnectionError('Must be connected first')
      }
    }
    const data = buildQuery(sql, params)
    try {
      await new SendPacket(data, 0).send(this.conn)
      let receive = await this.nextPacket()
      if (receive.type === PacketType.OK_Packet) {
        receive.body.skip(1)
        return {
          affectedRows: receive.body.readEncodedLen(),
          lastInsertId: receive.body.readEncodedLen(),
        }
      } else if (receive.type !== PacketType.Result) {
        throw new ProtocolError()
      }
      let fieldCount = receive.body.readEncodedLen()
      const fields = []
      while (fieldCount--) {
        const packet = await this.nextPacket()
        if (packet) {
          const field = parseField(packet.body)
          fields.push(field)
        }
      }
      const rows = []
      if (!(this.capabilities & ServerCapabilities.CLIENT_DEPRECATE_EOF)) {
        receive = await this.nextPacket()
        if (receive.type !== PacketType.EOF_Packet) {
          throw new ProtocolError()
        }
      }
      if (!iterator) {
        while (true) {
          receive = await this.nextPacket()
          if (
            receive.type === PacketType.EOF_Packet ||
            receive.type === PacketType.OK_Packet
          ) {
            break
          } else {
            const row = parseRow(receive.body, fields)
            rows.push(row)
          }
        }
        return {
          rows,
          fields,
        }
      }
      return {
        fields,
        iterator: this.buildIterator(fields),
      }
    } catch (error2) {
      this.close()
      throw error2
    }
  }
  buildIterator(fields) {
    const next = async () => {
      const receive = await this.nextPacket()
      if (receive.type === PacketType.EOF_Packet) {
        return {
          done: true,
        }
      }
      const value = parseRow(receive.body, fields)
      return {
        done: false,
        value,
      }
    }
    return {
      [Symbol.asyncIterator]: () => {
        return {
          next,
        }
      },
    }
  }
  config
}
var DeferredStack = class {
  _queue
  _size
  constructor(_maxSize, _array = [], creator) {
    this._maxSize = _maxSize
    this._array = _array
    this.creator = creator
    this._queue = []
    this._size = 0
    this._size = _array.length
  }
  get size() {
    return this._size
  }
  get maxSize() {
    return this._maxSize
  }
  get available() {
    return this._array.length
  }
  async pop() {
    if (this._array.length) {
      return this._array.pop()
    } else if (this._size < this._maxSize) {
      this._size++
      let item
      try {
        item = await this.creator()
      } catch (err) {
        this._size--
        throw err
      }
      return item
    }
    const defer = deferred2()
    this._queue.push(defer)
    return await defer
  }
  push(item) {
    if (this._queue.length) {
      this._queue.shift().resolve(item)
      return false
    } else {
      this._array.push(item)
      return true
    }
  }
  tryPopAvailable() {
    return this._array.pop()
  }
  remove(item) {
    const index = this._array.indexOf(item)
    if (index < 0) return false
    this._array.splice(index, 1)
    this._size--
    return true
  }
  reduceSize() {
    this._size--
  }
  _maxSize
  _array
  creator
}
var PoolConnection = class extends Connection {
  _pool = void 0
  _idleTimer = void 0
  _idle = false
  enterIdle() {
    this._idle = true
    if (this.config.idleTimeout) {
      this._idleTimer = setTimeout(() => {
        logger.info('connection idle timeout')
        this._pool.remove(this)
        try {
          this.close()
        } catch (error2) {
          logger.warning(`error closing idle connection`, error2)
        }
      }, this.config.idleTimeout)
      try {
        define_Deno_default.unrefTimer(this._idleTimer)
      } catch (_error) {}
    }
  }
  exitIdle() {
    this._idle = false
    if (this._idleTimer !== void 0) {
      clearTimeout(this._idleTimer)
    }
  }
  removeFromPool() {
    this._pool.reduceSize()
    this._pool = void 0
  }
  returnToPool() {
    this._pool?.push(this)
  }
}
var ConnectionPool = class {
  _deferred
  _connections = []
  _closed = false
  constructor(maxSize, creator) {
    this._deferred = new DeferredStack(maxSize, this._connections, async () => {
      const conn = await creator()
      conn._pool = this
      return conn
    })
  }
  get info() {
    return {
      size: this._deferred.size,
      maxSize: this._deferred.maxSize,
      available: this._deferred.available,
    }
  }
  push(conn) {
    if (this._closed) {
      conn.close()
      this.reduceSize()
    }
    if (this._deferred.push(conn)) {
      conn.enterIdle()
    }
  }
  async pop() {
    if (this._closed) {
      throw new Error('Connection pool is closed')
    }
    let conn = this._deferred.tryPopAvailable()
    if (conn) {
      conn.exitIdle()
    } else {
      conn = await this._deferred.pop()
    }
    return conn
  }
  remove(conn) {
    return this._deferred.remove(conn)
  }
  close() {
    this._closed = true
    let conn
    while ((conn = this._deferred.tryPopAvailable())) {
      conn.exitIdle()
      conn.close()
      this.reduceSize()
    }
  }
  reduceSize() {
    this._deferred.reduceSize()
  }
}
var Client = class {
  config = {}
  _pool
  async createConnection() {
    let connection = new PoolConnection(this.config)
    await connection.connect()
    return connection
  }
  get pool() {
    return this._pool?.info
  }
  async connect(config) {
    this.config = {
      hostname: '127.0.0.1',
      username: 'root',
      port: 3306,
      poolSize: 1,
      timeout: 30 * 1e3,
      idleTimeout: 4 * 3600 * 1e3,
      ...config,
    }
    Object.freeze(this.config)
    this._pool = new ConnectionPool(
      this.config.poolSize || 10,
      this.createConnection.bind(this),
    )
    return this
  }
  async query(sql, params) {
    return await this.useConnection(async connection => {
      return await connection.query(sql, params)
    })
  }
  async execute(sql, params) {
    return await this.useConnection(async connection => {
      return await connection.execute(sql, params)
    })
  }
  async useConnection(fn) {
    if (!this._pool) {
      throw new Error('Unconnected')
    }
    const connection = await this._pool.pop()
    try {
      return await fn(connection)
    } finally {
      if (connection.state == ConnectionState.CLOSED) {
        connection.removeFromPool()
      } else {
        connection.returnToPool()
      }
    }
  }
  async transaction(processor) {
    return await this.useConnection(async connection => {
      try {
        await connection.execute('BEGIN')
        const result = await processor(connection)
        await connection.execute('COMMIT')
        return result
      } catch (error2) {
        if (connection.state == ConnectionState.CONNECTED) {
          logger.info(`ROLLBACK: ${error2.message}`)
          await connection.execute('ROLLBACK')
        }
        throw error2
      }
    })
  }
  async close() {
    if (this._pool) {
      this._pool.close()
      this._pool = void 0
    }
  }
}
export { Client, Connection, configLogger, mod as log }
