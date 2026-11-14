export type Ok<T> = { readonly ok: true; readonly valor: T }
export type Err<E> = { readonly ok: false; readonly erro: E }
export type Result<T, E> = Ok<T> | Err<E>

export const ok = <T>(valor: T): Ok<T> => ({ ok: true, valor })

export const err = <E>(erro: E): Err<E> => ({ ok: false, erro })
