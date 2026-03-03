export function twoSum(nums: number[], target: number): [number, number] {
  const seen = new Map<number, number>()
  for (let i = 0; i < nums.length; i++) {
    const x = nums[i]
    const j = seen.get(target - x)
    if (j !== undefined) return [j, i]
    seen.set(x, i)
  }
  throw new Error("No solution")
}
