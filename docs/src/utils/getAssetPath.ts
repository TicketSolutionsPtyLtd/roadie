/**
 * Utility function to get the full path for an asset including the base path
 */
export function getAssetPath(path: string) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
  return `${basePath}${path}`
}
