export class BaseRunner implements AsyncDisposable, Disposable {
  protected __abort = new AbortController();
  protected __signal = this.__abort.signal;

  protected __connect(r: BaseRunner | Function) {
    this.__signal.addEventListener("abort", () =>
      typeof r === "function" ? r() : r.__abort.abort()
    );
  }
  protected __do_abort() {
    this.__abort.abort();
  }
  protected __is_aborted() {
    return this.__signal.aborted;
  }
  protected __throw_if_aborted() {
    if (this.__is_aborted()) throw new Error("Aborted");
  }

  [Symbol.dispose](): void {
    this.__abort.abort();
  }
  [Symbol.asyncDispose](): PromiseLike<void> {
    this.__abort.abort();
    return Promise.resolve();
  }
}
