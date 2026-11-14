declare const marca: unique symbol

export type Marcado<T, M extends string> = T & { readonly [marca]: M }
