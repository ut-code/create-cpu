export interface IObserver<T> {
  (value: T): void;
}

export interface IObservable<T> {
  readonly value: T;

  observe(listener: IObserver<T>): void;
}

export class Observable<T> implements IObservable<T> {
  #value: T;

  #listeners: IObserver<T>[];

  get value() {
    return this.#value;
  }

  set value(value) {
    this.#value = value;
    this.#listeners.forEach((listener) => {
      listener(value);
    });
  }

  observe(listener: IObserver<T>): void {
    this.#listeners.push(listener);
  }

  unobserve(listener: IObserver<T>): void {
    const index = this.#listeners.indexOf(listener);
    if (index >= 0) this.#listeners.splice(index, 1);
  }

  constructor(initialValue: T) {
    this.#value = initialValue;
    this.#listeners = [];
  }
}
