const defaultVolume = 100

export function readInitialVolume(savedVolume: string | null) {
  if (!savedVolume) return defaultVolume
  if (savedVolume === '80') return defaultVolume

  const volume = Number(savedVolume)
  if (!Number.isFinite(volume)) return defaultVolume
  return Math.max(0, Math.min(100, volume))
}
