import { runRuleCases } from '../test/ruleCases.js'

const IMPORT = "import { Card } from '@oztix/roadie-components/card';"

runRuleCases({
  'card-content': {
    valid: [
      `${IMPORT} <Card><Card.Content>Doors at 7pm</Card.Content></Card>`,
      `${IMPORT} <Card><Card.Header><Card.Title>Midnight Frequency</Card.Title></Card.Header><Card.Content>Doors at 7pm</Card.Content><Card.Footer /></Card>`,
      `${IMPORT} <Card.Root><Card.Content>Doors at 7pm</Card.Content></Card.Root>`,
      `${IMPORT} <Card><EventBody /></Card>`,
      `${IMPORT} <Card><Card.Header />{body}</Card>`,
      `${IMPORT} <Card><><Card.Content /></></Card>`,
      `${IMPORT} <Card {...props} />`,
      `${IMPORT} <Card children={body} />`,
      "import { Card as RoadieCard } from '@oztix/roadie-components'; <RoadieCard><RoadieCard.Content /></RoadieCard>",
      '<Card><Card.Header /></Card>',
      "import { Card } from './Card'; <Card><Card.Header /></Card>"
    ],
    invalid: [
      `${IMPORT} <Card><Card.Header><Card.Title>Midnight Frequency</Card.Title></Card.Header></Card>`,
      `${IMPORT} <Card href='/events/1'><Card.Image src='poster.jpg' alt='' /></Card>`,
      `${IMPORT} <Card.Root><Card.Header /><Card.Footer /></Card.Root>`,
      `${IMPORT} <Card>Midnight Frequency</Card>`,
      `${IMPORT} <Card />`,
      "import { Card as RoadieCard } from '@oztix/roadie-components'; <RoadieCard><RoadieCard.Header /></RoadieCard>",
      {
        code: `${IMPORT} <Card><Card.Header /><Card><Card.Content /></Card></Card>`,
        errors: 1
      }
    ]
  }
})
