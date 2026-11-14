declare const marca: unique symbol

export type Marcado<T> = T & { readonly [marca]: true }
