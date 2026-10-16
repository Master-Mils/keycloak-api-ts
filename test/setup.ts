// nock 15 (through @mswjs/interceptors) calls Promise.withResolvers, which Node only ships from 22.
// The library itself supports Node 20, so the unit tests polyfill it there.
const promise = Promise as unknown as { withResolvers?: () => unknown };
if (typeof promise.withResolvers !== 'function') {
  promise.withResolvers = function withResolvers<T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const result = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise: result, resolve, reject };
  };
}
