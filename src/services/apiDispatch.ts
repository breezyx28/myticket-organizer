import { store } from '@/store/store';

/** RTK Query `initiate()` return values are not typed as `UnknownAction`; unwrap via this helper. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DispatchArg = any;

export async function apiUnwrap<T>(result: { unwrap: () => Promise<unknown> }): Promise<T> {
  return (await result.unwrap()) as T;
}

export function apiDispatch(arg: DispatchArg) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (store.dispatch as any)(arg) as { unwrap: () => Promise<unknown> };
}
