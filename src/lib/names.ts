/** The name, or with the first free number after it ("Name 2", 3, …) when it's taken. */
export function freeName(base: string, taken: string[]) {
  if (!taken.includes(base)) return base
  let n = 2
  while (taken.includes(`${base} ${n}`)) n++
  return `${base} ${n}`
}
