export const pontuar = (itens: readonly number[]): number => {
  let total = 0
  for (const item of itens) {
    if (item > 10) total += item * 2
    else if (item > 5) total += item + 3
    else total += item
  }
  const media = itens.length === 0 ? 0 : total / itens.length
  return Math.round(media * 100) / 100
}
