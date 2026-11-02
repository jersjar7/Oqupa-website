// What updateListingAsAgent receives when an assigned agent saves. Photos go
// as `photoKeys` (R2 object keys), as the app sends them: the function checks
// `propertyPhotoUrls` for https addresses, which every R2 key fails, so that
// parameter refused every photo change (audit 2026-11-02, top item 14).

export interface AgentEditInput {
  listingId: string
  description: string
  originalDescription: string
  photoRefs: string[]
  originalPhotoRefs: string[]
}

export type AgentEditParams = { listingId: string; description?: string; photoKeys?: string[] }

/** Only what changed; null when nothing did. */
export function agentEditParams(input: AgentEditInput): AgentEditParams | null {
  const params: AgentEditParams = { listingId: input.listingId }
  if (input.description !== input.originalDescription) params.description = input.description
  const photosChanged =
    input.photoRefs.length !== input.originalPhotoRefs.length ||
    input.photoRefs.some((ref, i) => ref !== input.originalPhotoRefs[i])
  if (photosChanged) params.photoKeys = input.photoRefs
  return Object.keys(params).length > 1 ? params : null
}
