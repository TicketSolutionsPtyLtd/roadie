/** Where a records request runs, for the cards on the records page and its markdown twin. */
export type RecordsAdapter = {
  name: 'Browser' | 'Meilisearch' | 'Elasticsearch' | 'Your API'
  call: string
  use: string
}

export const RECORDS_ADAPTERS: RecordsAdapter[] = [
  {
    name: 'Browser',
    call: 'matchesRecordQuery(row, resolved, fields)',
    use: 'Every row is already loaded, up to a few thousand.'
  },
  {
    name: 'Meilisearch',
    call: 'toMeilisearch(request, fields)',
    use: 'A Meilisearch index, with typo-tolerant search.'
  },
  {
    name: 'Elasticsearch',
    call: 'toElasticsearch(request, fields)',
    use: 'An Elasticsearch or OpenSearch index that already serves a list.'
  },
  {
    name: 'Your API',
    call: 'POST /api/…/search',
    use: 'Any other store. The server reads the request and maps it itself.'
  }
]
