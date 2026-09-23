/** Scene units are metres, the store is millimetres. */
export const MM = 0.001

export const toScene = (mm: number) => mm * MM
