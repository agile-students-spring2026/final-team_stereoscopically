const normalizeMediaId = (value) => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

/**
 * Resolve draft media ids from Option B payload shape with backward compatibility.
 * Supports legacy payloads that only store backendMediaId.
 */
export const resolveDraftMediaIds = (payload = {}) => {
  const legacyBackendMediaId = normalizeMediaId(payload?.backendMediaId)
  const workingMediaId = normalizeMediaId(payload?.workingMediaId) || legacyBackendMediaId
  const sourceMediaId = normalizeMediaId(payload?.sourceMediaId) || legacyBackendMediaId || workingMediaId

  return {
    sourceMediaId,
    workingMediaId,
    resumeMediaId: workingMediaId || sourceMediaId || null,
  }
}

export const buildDraftMediaIds = ({ sourceMediaId, workingMediaId } = {}) => {
  const normalizedWorking = normalizeMediaId(workingMediaId)
  const normalizedSource = normalizeMediaId(sourceMediaId) || normalizedWorking

  return {
    sourceMediaId: normalizedSource,
    workingMediaId: normalizedWorking || normalizedSource,
  }
}
