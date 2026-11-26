let counter = 0
/** Client-side id generator (no external dep). */
export function v4(): string {
  counter += 1
  return `el-${Date.now().toString(36)}-${counter.toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}
