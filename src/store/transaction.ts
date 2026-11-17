/**
 * Class that manages the transaction of the store
 */
export default class TransactionManager {
	#runningTaskCount = 0;

	#onTransactionEnd: (() => void)[] = [];

	/**
	 * Run a function in a transaction
	 * @param fn function to be run in a transaction
	 * @returns promise that resolves when the transaction ends, or, once it ends, rejects
	 *   with the error `fn` threw. Being `async` delays settling by a step, so that a
	 *   removal is announced after the ones it cascades to.
	 */
	async runInTransaction(fn: () => void | Promise<void>): Promise<void> {
		return new Promise((resolve, reject) => {
			let failure: { error: unknown } | null = null;
			this.#runningTaskCount += 1;
			this.#onTransactionEnd.push(() =>
				failure ? reject(failure.error) : resolve(),
			);
			(async () => {
				try {
					await fn();
				} catch (error) {
					failure = { error };
				} finally {
					this.#runningTaskCount -= 1;
					if (this.#runningTaskCount === 0) {
						const callbacks = this.#onTransactionEnd;
						this.#onTransactionEnd = [];
						for (const callback of callbacks) callback();
					}
				}
			})();
		});
	}
}
