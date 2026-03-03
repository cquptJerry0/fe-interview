export function twoSumSafe(
  nums: ReadonlyArray<number>,
  target: number
): [number, number] | null {
  const seen = new Map<number, number>()
  for (let i = 0; i < nums.length; i++) {
    const x = nums[i]
    const j = seen.get(target - x)
    if (j !== undefined) return [j, i]
    if (!seen.has(x)) seen.set(x, i)
  }
  return null
}
