import type ModbusRTU from 'modbus-serial';

export class PLCQueueError extends Error {
  constructor(message: string, public readonly status: 503 | 504 = 503) {
    super(message);
    this.name = 'PLCQueueError';
  }
}

interface PendingOperation {
  run: () => Promise<void>;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

/** 每条连接只执行一项操作。等待超时只取消未执行项，不提前释放正在通信的锁。 */
export class PLCQueue {
  private pending: PendingOperation[] = [];
  private running = false;
  private active: PendingOperation | undefined;
  private closed = false;
  private reads = new Map<string, Promise<unknown>>();

  constructor(private readonly maxPending = 8, private readonly waitTimeoutMs = 2000) {}

  enqueue<T>(operation: () => Promise<T>, readKey?: string): Promise<T> {
    if (this.closed) return Promise.reject(new PLCQueueError('PLC连接已关闭，请重新连接'));
    if (readKey) {
      const existing = this.reads.get(readKey);
      if (existing) return existing as Promise<T>;
    }
    if (this.running && this.pending.length >= this.maxPending) {
      return Promise.reject(new PLCQueueError('PLC请求过多，请稍后重试'));
    }
    // 写入是屏障：写入之后的读取不能复用写入之前的结果；写入本身从不合并。
    if (!readKey) this.reads.clear();

    const promise = new Promise<T>((resolve, reject) => {
      const entry: PendingOperation = {
        reject,
        timer: setTimeout(() => {
          const index = this.pending.indexOf(entry);
          if (index < 0) return;
          this.pending.splice(index, 1);
          reject(new PLCQueueError('PLC请求排队超时，请稍后重试', 504));
        }, this.waitTimeoutMs),
        run: async () => {
          try {
            resolve(await operation());
          } catch (error) {
            reject(error);
          }
        }
      };
      this.pending.push(entry);
      void this.drain();
    });

    if (readKey) {
      this.reads.set(readKey, promise);
      const cleanup = () => {
        if (this.reads.get(readKey) === promise) this.reads.delete(readKey);
      };
      void promise.then(cleanup, cleanup);
    }
    return promise;
  }

  close(): void {
    this.closed = true;
    this.reads.clear();
    // modbus-serial 关闭 socket 时可能清除通信计时器，主动结束 HTTP 等待。
    this.active?.reject(new PLCQueueError('PLC连接已关闭，正在执行的操作结果未知'));
    for (const entry of this.pending.splice(0)) {
      clearTimeout(entry.timer);
      entry.reject(new PLCQueueError('PLC连接已关闭，已取消排队操作'));
    }
  }

  private async drain(): Promise<void> {
    if (this.running || this.closed) return;
    this.running = true;
    try {
      let entry: PendingOperation | undefined;
      while (!this.closed && (entry = this.pending.shift())) {
        clearTimeout(entry.timer);
        this.active = entry;
        await entry.run();
        this.active = undefined;
      }
    } finally {
      this.running = false;
    }
  }
}

// Next.js 不同路由及热更新共享同一连接的队列。
const queueGlobal = globalThis as typeof globalThis & { senyuanPLCQueues?: WeakMap<object, PLCQueue> };
const queues = queueGlobal.senyuanPLCQueues ??= new WeakMap<object, PLCQueue>();

function getQueue(client: ModbusRTU): PLCQueue {
  let queue = queues.get(client);
  if (!queue) {
    queue = new PLCQueue();
    queues.set(client, queue);
  }
  return queue;
}

export function runPLCOperation<T>(client: ModbusRTU, operation: (client: ModbusRTU) => Promise<T>, readKey?: string): Promise<T> {
  return getQueue(client).enqueue(() => {
    if (!client.isOpen) throw new PLCQueueError('PLC连接已断开');
    return operation(client);
  }, readKey);
}

export function closePLCQueue(client: ModbusRTU): void {
  getQueue(client).close();
}

export function plcErrorStatus(error: unknown): number {
  // modbus-serial 的通信超时会拒绝普通对象，而不是 Error 实例。
  if (typeof error === 'object' && error !== null) {
    if ('status' in error && (error.status === 503 || error.status === 504)) return error.status;
    if (('errno' in error && error.errno === 'ETIMEDOUT') || ('code' in error && error.code === 'ETIMEDOUT')) return 504;
  }
  return 500;
}

export function plcErrorMessage(error: unknown, fallback: string): string {
  return typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
    ? error.message
    : fallback;
}
