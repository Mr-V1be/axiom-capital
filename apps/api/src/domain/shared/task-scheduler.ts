export interface TaskScheduler {
  map<T, R>(
    items: readonly T[],
    task: (item: T) => Promise<R>,
  ): Promise<R[]>;
}
