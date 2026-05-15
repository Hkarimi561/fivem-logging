/** Load categories + event types from MySQL; sync from Elasticsearch when empty. */
export async function fetchMetaTerms() {
  let res = await fetch('/api/meta/list', { credentials: 'include' })
  let data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || 'Failed to load meta terms')
  }

  const needsSync =
    (!data.categories || data.categories.length === 0) ||
    (!data.eventTypes || data.eventTypes.length === 0)

  if (needsSync) {
    await fetch('/api/meta/sync', { credentials: 'include' })
    res = await fetch('/api/meta/list', { credentials: 'include' })
    data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || 'Failed to load meta terms after sync')
    }
  }

  return {
    categories: data.categories || [],
    eventTypes: data.eventTypes || []
  }
}
