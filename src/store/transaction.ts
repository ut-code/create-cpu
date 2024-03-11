export default class TransactionManager {
  #runningTaskCount = 0;

  #onTransactionEnd: (() => void)[] = [];

  async runInTransaction(fn: () => void | Promise<void>): Promise<void> {
    return new Promise((resolve) => {
      (async () => {
        this.#runningTaskCount += 1;
        this.#onTransactionEnd.push(resolve);
        await fn();
        this.#runningTaskCount -= 1;
        if (this.#runningTaskCount === 0) {
          this.#onTransactionEnd.forEach((callback) => callback());
          this.#onTransactionEnd = [];
        }
      })();
    });
  }
}
