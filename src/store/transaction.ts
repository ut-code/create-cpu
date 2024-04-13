/**
 * Class that manages the transaction of the store
 */
export default class TransactionManager {
  #runningTaskCount = 0;

  #onTransactionEnd: (() => void)[] = [];

  /**
   * Run a function in a transaction
   * @param fn function to be run in a transaction
   * @returns promise that resolves when the transaction ends
   */
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
