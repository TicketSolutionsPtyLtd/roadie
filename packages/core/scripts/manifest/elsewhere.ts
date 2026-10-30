import type { DocumentedElsewhere, DocumentedSubpaths } from './manifest.ts'

export const DOCUMENTED_ELSEWHERE: DocumentedElsewhere = {
  '@oztix/roadie-components': {
    RoadieProvider: '/overview/getting-started/#4-mount-roadieprovider',
    RoadieLinkProvider: '/foundations/linking/',
    RequiredIndicator: '/components/field/#with-indicators',
    OptionalIndicator: '/components/field/#with-indicators'
  },
  '@oztix/roadie-components/spot-illustrations':
    '/components/spot-illustration/#available-illustrations',
  '@oztix/roadie-charts/dashboard-view': {
    DashboardView: '/charts/dashboards/'
  },
  '@oztix/roadie-editor/email-html-field': {
    EmailHtmlField: '/components/editor/#html-emails'
  }
}

/** Subpaths with no component, linked to the page that documents them. */
export const DOCUMENTED_SUBPATHS: DocumentedSubpaths = {
  '@oztix/roadie-core/number': '/content/language-and-grammar/#prices',
  '@oztix/roadie-core/records': '/foundations/records/',
  '@oztix/roadie-core/records/meilisearch': '/foundations/records/',
  '@oztix/roadie-core/records/elasticsearch': '/foundations/records/',
  '@oztix/roadie-core/records/json-schema': '/foundations/records/',
  '@oztix/roadie-editor/email': '/components/editor/#sending-email'
}
