// Permanent RSC canary. This file MUST remain a React Server Component.
// Its entire purpose is to prove that every migrated compound renders from a
// server component via both the subpath import and the barrel, using the
// canonical bare root form (`<Fieldset>`) AND the Base UI-style explicit
// `<Fieldset.Root>` alias. Both forms reference the same client component.
//
// A regression surfaces here as "Element type is invalid" at prerender time
// and fails the docs build. See:
//   docs/contributing/COMPOUND_PATTERNS.md
//   docs/solutions/rsc-patterns/compound-export-namespace.md
import { StarIcon } from '@phosphor-icons/react/ssr'

import { DashboardView } from '@oztix/roadie-charts/dashboard-view'
import { createShowDashboard } from '@oztix/roadie-charts/examples'
import {
  Avatar as AvatarViaBarrel,
  Callout as CalloutViaBarrel,
  CheckboxGroup as CheckboxGroupViaBarrel,
  Collapsible as CollapsibleViaBarrel,
  Dialog as DialogViaBarrel,
  Drawer as DrawerViaBarrel,
  Fieldset as FieldsetViaBarrel,
  List as ListViaBarrel,
  Menu as MenuViaBarrel,
  Navigator as NavigatorViaBarrel,
  NumberField as NumberFieldViaBarrel,
  OTPField as OTPFieldViaBarrel,
  Pane as PaneViaBarrel,
  Popover as PopoverViaBarrel,
  Progress as ProgressViaBarrel,
  RoadieProvider,
  ScrollArea as ScrollAreaViaBarrel,
  Slider as SliderViaBarrel,
  Switch as SwitchViaBarrel,
  Tabs as TabsViaBarrel,
  Toast as ToastViaBarrel,
  ToggleGroup as ToggleGroupViaBarrel,
  Tooltip as TooltipViaBarrel
} from '@oztix/roadie-components'
import { Accordion } from '@oztix/roadie-components/accordion'
import { Autocomplete } from '@oztix/roadie-components/autocomplete'
import { Avatar } from '@oztix/roadie-components/avatar'
import { Breadcrumb } from '@oztix/roadie-components/breadcrumb'
import { Button } from '@oztix/roadie-components/button'
import { Callout } from '@oztix/roadie-components/callout'
import { Card } from '@oztix/roadie-components/card'
import { Carousel } from '@oztix/roadie-components/carousel'
import { Checkbox } from '@oztix/roadie-components/checkbox'
import { CheckboxGroup } from '@oztix/roadie-components/checkbox-group'
import { Collapsible } from '@oztix/roadie-components/collapsible'
import { Combobox } from '@oztix/roadie-components/combobox'
import { Dialog } from '@oztix/roadie-components/dialog'
import { Drawer } from '@oztix/roadie-components/drawer'
import { Field } from '@oztix/roadie-components/field'
import { Fieldset } from '@oztix/roadie-components/fieldset'
import { IconTile } from '@oztix/roadie-components/icon-tile'
import { List } from '@oztix/roadie-components/list'
import { Logo } from '@oztix/roadie-components/logo'
import { Menu } from '@oztix/roadie-components/menu'
import { Navigator } from '@oztix/roadie-components/navigator'
import { NumberField } from '@oztix/roadie-components/number-field'
import { OTPField } from '@oztix/roadie-components/otp-field'
import { Pane } from '@oztix/roadie-components/pane'
import { Popover } from '@oztix/roadie-components/popover'
import { Progress } from '@oztix/roadie-components/progress'
import { QRCode } from '@oztix/roadie-components/qr-code'
import { RadioGroup } from '@oztix/roadie-components/radio-group'
import { ScrollArea } from '@oztix/roadie-components/scroll-area'
import { Select } from '@oztix/roadie-components/select'
import { Slider } from '@oztix/roadie-components/slider'
import { Steps } from '@oztix/roadie-components/steps'
import { Switch } from '@oztix/roadie-components/switch'
import { Tabs } from '@oztix/roadie-components/tabs'
import { Toast } from '@oztix/roadie-components/toast'
import { Toggle } from '@oztix/roadie-components/toggle'
import { ToggleGroup } from '@oztix/roadie-components/toggle-group'
import { Tooltip } from '@oztix/roadie-components/tooltip'

import { NavigatorCanary } from './NavigatorCanary'

export default function RscSmokePage() {
  return (
    <main className='mx-auto grid max-w-3xl gap-8 p-8'>
      <header className='grid gap-2'>
        <h1 className='text-display-prose-1 text-strong'>RSC smoke test</h1>
        <p className='text-subtle'>
          Every migrated compound renders below from a server component. Each
          compound is tested via the bare root form (canonical), the explicit{' '}
          <code>.Root</code> alias, and the root barrel import. If the docs
          build succeeds, every compound on this page is RSC-safe.
        </p>
      </header>

      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>
          Fieldset as bare root (canonical)
        </h2>
        <p className='text-sm text-subtle'>
          <code>
            import &#123; Fieldset &#125; from
            &apos;@oztix/roadie-components/fieldset&apos;
          </code>
        </p>
        <Fieldset>
          <Fieldset.Legend>Contact information</Fieldset.Legend>
          <Fieldset.HelperText>
            Renders from a server component via the bare root form.
          </Fieldset.HelperText>
        </Fieldset>
        <Fieldset invalid>
          <Fieldset.Legend>Invalid fieldset</Fieldset.Legend>
          <Fieldset.ErrorText>
            ErrorText only renders when the root is marked <code>invalid</code>.
          </Fieldset.ErrorText>
        </Fieldset>
      </section>

      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>
          Fieldset with <code>.Root</code> alias
        </h2>
        <p className='text-sm text-subtle'>
          Explicit <code>&lt;Fieldset.Root&gt;</code> form. Same component
          reference as bare <code>&lt;Fieldset&gt;</code>, supported for
          consumers who prefer Base UI&apos;s explicit root syntax.
        </p>
        <Fieldset.Root>
          <Fieldset.Legend>Explicit root</Fieldset.Legend>
          <Fieldset.HelperText>
            <code>&lt;Fieldset.Root&gt;</code> and bare{' '}
            <code>&lt;Fieldset&gt;</code> are the same function. Proves the
            alias works from a server component.
          </Fieldset.HelperText>
        </Fieldset.Root>
      </section>

      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Fieldset via barrel</h2>
        <p className='text-sm text-subtle'>
          <code>
            import &#123; Fieldset &#125; from
            &apos;@oztix/roadie-components&apos;
          </code>
        </p>
        <FieldsetViaBarrel>
          <FieldsetViaBarrel.Legend>
            Imported from the root barrel
          </FieldsetViaBarrel.Legend>
          <FieldsetViaBarrel.HelperText>
            Confirms the barrel re-exports the compound without breaking the
            server-safe re-export chain down to each leaf.
          </FieldsetViaBarrel.HelperText>
        </FieldsetViaBarrel>
      </section>

      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Accordion</h2>
        <p className='text-sm text-subtle'>
          <code>
            import &#123; Accordion &#125; from
            &apos;@oztix/roadie-components/accordion&apos;
          </code>
        </p>
        <Accordion>
          <Accordion.Item>
            <Accordion.Trigger>What is an Accordion?</Accordion.Trigger>
            <Accordion.Content>
              A native <code>&lt;details&gt;</code> /{' '}
              <code>&lt;summary&gt;</code> wrapper with Roadie styling. Renders
              from a server component via the subpath import.
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item>
            <Accordion.Trigger>Why per-file?</Accordion.Trigger>
            <Accordion.Content>
              Each leaf is its own on-disk module so Next.js can follow the
              server-safe re-export chain at build time.
            </Accordion.Content>
          </Accordion.Item>
        </Accordion>
      </section>

      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>RadioGroup</h2>
        <p className='text-sm text-subtle'>
          <code>
            import &#123; RadioGroup &#125; from
            &apos;@oztix/roadie-components/radio-group&apos;
          </code>
        </p>
        <RadioGroup>
          <RadioGroup.Label>Contact method</RadioGroup.Label>
          <RadioGroup.Item value='email' label='Email' />
          <RadioGroup.Item value='phone' label='Phone' />
          <RadioGroup.HelperText>
            Choose how we reach you.
          </RadioGroup.HelperText>
        </RadioGroup>
      </section>

      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Checkbox</h2>
        <Checkbox label='I agree to the terms and conditions' />
      </section>

      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>
          CheckboxGroup, bare root (canonical)
        </h2>
        <CheckboxGroup defaultValue={['rock']}>
          <CheckboxGroup.Label>Genres</CheckboxGroup.Label>
          <CheckboxGroup.Item value='rock' label='Rock' />
          <CheckboxGroup.Item value='jazz' label='Jazz' />
          <CheckboxGroup.HelperText>Pick any.</CheckboxGroup.HelperText>
        </CheckboxGroup>
      </section>

      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>CheckboxGroup, barrel</h2>
        <CheckboxGroupViaBarrel>
          <CheckboxGroupViaBarrel.Item value='rock' label='Rock' />
          <CheckboxGroupViaBarrel.Item value='jazz' label='Jazz' />
        </CheckboxGroupViaBarrel>
      </section>

      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Breadcrumb</h2>
        <p className='text-sm text-subtle'>
          <code>
            import &#123; Breadcrumb &#125; from
            &apos;@oztix/roadie-components/breadcrumb&apos;
          </code>
        </p>
        <Breadcrumb>
          <Breadcrumb.List>
            <Breadcrumb.Item>
              <Breadcrumb.Link href='#'>Home</Breadcrumb.Link>
              <Breadcrumb.Separator />
            </Breadcrumb.Item>
            <Breadcrumb.Item>
              <Breadcrumb.Link href='#'>Components</Breadcrumb.Link>
              <Breadcrumb.Separator />
            </Breadcrumb.Item>
            <Breadcrumb.Item>
              <Breadcrumb.Current>Breadcrumb</Breadcrumb.Current>
            </Breadcrumb.Item>
          </Breadcrumb.List>
        </Breadcrumb>
      </section>

      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Card</h2>
        <p className='text-sm text-subtle'>
          <code>
            import &#123; Card &#125; from
            &apos;@oztix/roadie-components/card&apos;
          </code>
        </p>
        <Card>
          <Card.Header>
            <Card.Title>Server card</Card.Title>
            <Card.Description>
              Rendered from a server component via the subpath import.
            </Card.Description>
          </Card.Header>
          <Card.Content>
            <p>
              Sub-components reached via dot-notation from an RSC:
              <code>Card.Header</code>, <code>Card.Content</code>, etc.
            </p>
          </Card.Content>
          <Card.Footer>
            <p className='text-sm text-subtle'>Footer</p>
          </Card.Footer>
        </Card>
      </section>

      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Steps</h2>
        <p className='text-sm text-subtle'>
          <code>
            import &#123; Steps &#125; from
            &apos;@oztix/roadie-components/steps&apos;
          </code>
        </p>
        <Steps count={3}>
          <Steps.List>
            <Steps.Item index={0}>
              <Steps.Trigger>
                <Steps.Indicator>1</Steps.Indicator>
                <Steps.TriggerText>Details</Steps.TriggerText>
              </Steps.Trigger>
              <Steps.Separator />
            </Steps.Item>
            <Steps.Item index={1}>
              <Steps.Trigger>
                <Steps.Indicator>2</Steps.Indicator>
                <Steps.TriggerText>Review</Steps.TriggerText>
              </Steps.Trigger>
              <Steps.Separator />
            </Steps.Item>
            <Steps.Item index={2}>
              <Steps.Trigger>
                <Steps.Indicator>3</Steps.Indicator>
                <Steps.TriggerText>Confirm</Steps.TriggerText>
              </Steps.Trigger>
            </Steps.Item>
          </Steps.List>
        </Steps>
      </section>

      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Field</h2>
        <p className='text-sm text-subtle'>
          <code>
            import &#123; Field &#125; from
            &apos;@oztix/roadie-components/field&apos;
          </code>
        </p>
        <Field>
          <Field.Label>Email</Field.Label>
          <Field.Input type='email' placeholder='you@example.com' />
          <Field.HelperText>We&apos;ll never share it.</Field.HelperText>
        </Field>
        <Field invalid>
          <Field.Label>Invalid email</Field.Label>
          <Field.Input type='email' defaultValue='not-an-email' />
          <Field.ErrorText>Enter a valid email address.</Field.ErrorText>
        </Field>
      </section>

      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Select</h2>
        <p className='text-sm text-subtle'>
          <code>
            import &#123; Select &#125; from
            &apos;@oztix/roadie-components/select&apos;
          </code>
        </p>
        <Select>
          <Select.Trigger>
            <Select.Value placeholder='Pick an industry' />
            <Select.Icon />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value='music'>Music</Select.Item>
            <Select.Item value='sport'>Sport</Select.Item>
            <Select.Item value='theatre'>Theatre</Select.Item>
          </Select.Content>
        </Select>
      </section>

      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Autocomplete</h2>
        <p className='text-sm text-subtle'>
          <code>
            import &#123; Autocomplete &#125; from
            &apos;@oztix/roadie-components/autocomplete&apos;
          </code>
        </p>
        <Autocomplete items={['Music', 'Sport', 'Theatre']}>
          <Autocomplete.InputGroup>
            <Autocomplete.Input placeholder='Search industries…' />
            <Autocomplete.Trigger />
          </Autocomplete.InputGroup>
        </Autocomplete>
      </section>

      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Combobox</h2>
        <p className='text-sm text-subtle'>
          <code>
            import &#123; Combobox &#125; from
            &apos;@oztix/roadie-components/combobox&apos;
          </code>
        </p>
        <Combobox items={['Music', 'Sport', 'Theatre']}>
          <Combobox.InputGroup>
            <Combobox.Input placeholder='Search industries…' />
            <Combobox.Trigger />
          </Combobox.InputGroup>
        </Combobox>
      </section>

      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Carousel</h2>
        <p className='text-sm text-subtle'>
          <code>
            import &#123; Carousel &#125; from
            &apos;@oztix/roadie-components/carousel&apos;
          </code>
        </p>
        <Carousel aria-label='RSC carousel canary'>
          <Carousel.Header>
            <Carousel.Title>Upcoming events</Carousel.Title>
          </Carousel.Header>
          <Carousel.Content>
            <Carousel.Item>
              <div className='rounded-xl emphasis-subtle p-6'>Slide 1</div>
            </Carousel.Item>
            <Carousel.Item>
              <div className='rounded-xl emphasis-subtle p-6'>Slide 2</div>
            </Carousel.Item>
            <Carousel.Item>
              <div className='rounded-xl emphasis-subtle p-6'>Slide 3</div>
            </Carousel.Item>
          </Carousel.Content>
        </Carousel>
      </section>

      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Tabs</h2>
        <p className='text-sm text-subtle'>
          <code>
            import &#123; Tabs &#125; from
            &apos;@oztix/roadie-components/tabs&apos;
          </code>
        </p>
        <Tabs defaultValue='overview'>
          <Tabs.List>
            <Tabs.Tab value='overview'>Overview</Tabs.Tab>
            <Tabs.Tab value='details'>Details</Tabs.Tab>
            <Tabs.Tab value='history'>History</Tabs.Tab>
            <Tabs.Indicator />
          </Tabs.List>
          <Tabs.Panel value='overview'>
            <p className='py-4 text-subtle'>
              Bare <code>&lt;Tabs&gt;</code> root rendered from a server
              component.
            </p>
          </Tabs.Panel>
          <Tabs.Panel value='details'>
            <p className='py-4 text-subtle'>Details panel.</p>
          </Tabs.Panel>
          <Tabs.Panel value='history'>
            <p className='py-4 text-subtle'>History panel.</p>
          </Tabs.Panel>
        </Tabs>
      </section>

      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Tabs via barrel</h2>
        <p className='text-sm text-subtle'>
          <code>
            import &#123; Tabs &#125; from &apos;@oztix/roadie-components&apos;
          </code>
        </p>
        <TabsViaBarrel defaultValue='one'>
          <TabsViaBarrel.List>
            <TabsViaBarrel.Tab value='one'>One</TabsViaBarrel.Tab>
            <TabsViaBarrel.Tab value='two'>Two</TabsViaBarrel.Tab>
            <TabsViaBarrel.Indicator />
          </TabsViaBarrel.List>
          <TabsViaBarrel.Panel value='one'>
            <p className='py-4 text-subtle'>
              Imported from the root barrel. Proves dot-notation children
              survive the barrel re-export chain in a server component.
            </p>
          </TabsViaBarrel.Panel>
          <TabsViaBarrel.Panel value='two'>
            <p className='py-4 text-subtle'>Two.</p>
          </TabsViaBarrel.Panel>
        </TabsViaBarrel>
      </section>

      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>
          Tabs with <code>.Root</code> alias
        </h2>
        <p className='text-sm text-subtle'>
          Explicit <code>&lt;Tabs.Root&gt;</code> form. Same component reference
          as bare <code>&lt;Tabs&gt;</code>. Also exercises the underline
          emphasis variant.
        </p>
        <Tabs.Root defaultValue='one' emphasis='subtle'>
          <Tabs.List>
            <Tabs.Tab value='one'>One</Tabs.Tab>
            <Tabs.Tab value='two'>Two</Tabs.Tab>
            <Tabs.Indicator />
          </Tabs.List>
          <Tabs.Panel value='one'>
            <p className='py-4 text-subtle'>Panel one.</p>
          </Tabs.Panel>
          <Tabs.Panel value='two'>
            <p className='py-4 text-subtle'>Panel two.</p>
          </Tabs.Panel>
        </Tabs.Root>
      </section>

      <section className='grid gap-2'>
        <h2 className='text-display-ui-3 text-strong'>Popover via subpath</h2>
        <Popover>
          <Popover.Trigger>Open popover</Popover.Trigger>
          <Popover.Content>
            <Popover.Title>Popover title</Popover.Title>
            <Popover.Description>
              Rendered from a server component.
            </Popover.Description>
          </Popover.Content>
        </Popover>
      </section>

      <section className='grid gap-2'>
        <h2 className='text-display-ui-3 text-strong'>Popover via barrel</h2>
        <PopoverViaBarrel>
          <PopoverViaBarrel.Trigger>Open popover</PopoverViaBarrel.Trigger>
          <PopoverViaBarrel.Content>
            <PopoverViaBarrel.Title>Popover title</PopoverViaBarrel.Title>
            <PopoverViaBarrel.Description>
              Imported from the root barrel.
            </PopoverViaBarrel.Description>
          </PopoverViaBarrel.Content>
        </PopoverViaBarrel>
      </section>

      <section className='grid gap-2'>
        <h2 className='text-display-ui-3 text-strong'>
          Popover with <code>.Root</code> alias
        </h2>
        <Popover.Root>
          <Popover.Trigger>Open popover</Popover.Trigger>
          <Popover.Content>
            <Popover.Title>Popover title</Popover.Title>
            <Popover.Description>
              Explicit <code>&lt;Popover.Root&gt;</code>. Same reference as bare{' '}
              <code>&lt;Popover&gt;</code>.
            </Popover.Description>
          </Popover.Content>
        </Popover.Root>
      </section>

      <section className='grid gap-2'>
        <h2 className='text-display-ui-3 text-strong'>
          Tooltip as bare root (canonical)
        </h2>
        <Tooltip>
          <Tooltip.Trigger>Hover for a label</Tooltip.Trigger>
          <Tooltip.Content>
            <Tooltip.Arrow />A label
          </Tooltip.Content>
        </Tooltip>
      </section>

      <section className='grid gap-2'>
        <h2 className='text-display-ui-3 text-strong'>Tooltip via barrel</h2>
        <TooltipViaBarrel>
          <TooltipViaBarrel.Trigger>Hover for a label</TooltipViaBarrel.Trigger>
          <TooltipViaBarrel.Content>A label</TooltipViaBarrel.Content>
        </TooltipViaBarrel>
      </section>

      <section className='grid gap-2'>
        <h2 className='text-display-ui-3 text-strong'>
          OTPField as bare root (canonical)
        </h2>
        <OTPField length={6} groupSize={3} aria-label='Login code' />
        <OTPField.Root length={4} aria-label='Door code'>
          <OTPField.Input />
          <OTPField.Input />
          <OTPField.Separator />
          <OTPField.Input />
          <OTPField.Input />
        </OTPField.Root>
      </section>

      <section className='grid gap-2'>
        <h2 className='text-display-ui-3 text-strong'>OTPField via barrel</h2>
        <OTPFieldViaBarrel length={6} aria-label='Login code' />
      </section>

      <section className='grid gap-2'>
        <h2 className='text-display-ui-3 text-strong'>
          Slider as bare root (canonical)
        </h2>
        <Slider label='Price' defaultValue={[40, 150]} max={250} />
      </section>

      <section className='grid gap-2'>
        <h2 className='text-display-ui-3 text-strong'>
          Avatar as bare root (canonical)
        </h2>
        <Avatar.Group aria-label='Attendees'>
          <Avatar name='Mia Tran' />
          <Avatar.Root>
            <Avatar.Fallback>LP</Avatar.Fallback>
          </Avatar.Root>
          <Avatar.GroupCount count={12} />
        </Avatar.Group>
      </section>

      <section className='grid gap-2'>
        <h2 className='text-display-ui-3 text-strong'>Avatar via barrel</h2>
        <AvatarViaBarrel name='Mia Tran' />
      </section>

      <section className='grid gap-2'>
        <h2 className='text-display-ui-3 text-strong'>
          Menu as bare root (canonical)
        </h2>
        <Menu>
          <Menu.Trigger>Open menu</Menu.Trigger>
          <Menu.Content>
            <Menu.Item icon={<StarIcon weight='bold' />}>Edit</Menu.Item>
            <Menu.Item href='/components/menu'>View</Menu.Item>
            <Menu.Separator />
            <Menu.Group>
              <Menu.GroupLabel>Show</Menu.GroupLabel>
              <Menu.CheckboxItem defaultChecked>Venue</Menu.CheckboxItem>
            </Menu.Group>
            <Menu.RadioGroup defaultValue='date'>
              <Menu.RadioItem value='date'>Date</Menu.RadioItem>
            </Menu.RadioGroup>
            <Menu.SubmenuRoot>
              <Menu.SubmenuTrigger>Share</Menu.SubmenuTrigger>
              <Menu.Content>
                <Menu.Item>Copy link</Menu.Item>
              </Menu.Content>
            </Menu.SubmenuRoot>
            <Menu.Item intent='danger'>Cancel event</Menu.Item>
          </Menu.Content>
        </Menu>
      </section>

      <section className='grid gap-2'>
        <h2 className='text-display-ui-3 text-strong'>Menu via barrel</h2>
        <MenuViaBarrel>
          <MenuViaBarrel.Trigger>Open menu</MenuViaBarrel.Trigger>
          <MenuViaBarrel.Content>
            <MenuViaBarrel.Item>Edit</MenuViaBarrel.Item>
          </MenuViaBarrel.Content>
        </MenuViaBarrel>
      </section>

      <section className='grid gap-2'>
        <h2 className='text-display-ui-3 text-strong'>
          NumberField as bare root (canonical)
        </h2>
        <NumberField aria-label='Tickets' defaultValue={1} min={0} max={10} />
        <NumberField.Root defaultValue={2}>
          <NumberField.Group>
            <NumberField.Decrement />
            <NumberField.Input aria-label='Add-ons' />
            <NumberField.Increment />
          </NumberField.Group>
        </NumberField.Root>
      </section>

      <section className='grid gap-2'>
        <h2 className='text-display-ui-3 text-strong'>
          Collapsible as bare root (canonical)
        </h2>
        <Collapsible>
          <Collapsible.Trigger>Show all ticket types</Collapsible.Trigger>
          <Collapsible.Panel>
            Rendered from a server component.
          </Collapsible.Panel>
        </Collapsible>
      </section>

      <section className='grid gap-2'>
        <h2 className='text-display-ui-3 text-strong'>
          NumberField via barrel
        </h2>
        <NumberFieldViaBarrel aria-label='Tickets' defaultValue={1} />
      </section>

      <section className='grid gap-2'>
        <h2 className='text-display-ui-3 text-strong'>
          Collapsible via barrel
        </h2>
        <CollapsibleViaBarrel defaultOpen>
          <CollapsibleViaBarrel.Trigger>
            Show set times
          </CollapsibleViaBarrel.Trigger>
          <CollapsibleViaBarrel.Panel>
            Imported from the root barrel.
          </CollapsibleViaBarrel.Panel>
        </CollapsibleViaBarrel>
      </section>

      <section className='grid max-w-sm gap-2'>
        <h2 className='text-display-ui-3 text-strong'>Collapsible.Text</h2>
        <Collapsible>
          <Collapsible.Text lines={2}>
            General admission, standing only. Rendered from a server component
            and clamped to two lines, with an inline trigger once the text runs
            past them.
          </Collapsible.Text>
        </Collapsible>
      </section>

      <section className='grid gap-2'>
        <h2 className='text-display-ui-3 text-strong'>
          Progress as bare root (canonical)
        </h2>
        <Progress value={120} max={400} valueText='120 of 400'>
          <Progress.Label>Importing attendees</Progress.Label>
          <Progress.Value />
          <Progress.Track>
            <Progress.Indicator />
          </Progress.Track>
        </Progress>
      </section>

      <section className='grid gap-2'>
        <h2 className='text-display-ui-3 text-strong'>Progress via barrel</h2>
        <ProgressViaBarrel value={null} label='Preparing export' />
      </section>

      <section className='grid gap-2'>
        <h2 className='text-display-ui-3 text-strong'>
          Switch as bare root (canonical)
        </h2>
        <Switch label='Email me when tickets go on sale' defaultChecked />
      </section>

      <section className='grid gap-2'>
        <h2 className='text-display-ui-3 text-strong'>
          Switch with <code>.Root</code> alias and <code>.Thumb</code>
        </h2>
        <Switch.Root aria-label='Presale alerts'>
          <Switch.Thumb />
        </Switch.Root>
      </section>

      <section className='grid gap-2'>
        <h2 className='text-display-ui-3 text-strong'>Switch via barrel</h2>
        <SwitchViaBarrel label='Presale alerts' />
      </section>

      <section className='grid gap-2'>
        <h2 className='text-display-ui-3 text-strong'>Toggle via subpath</h2>
        <Toggle defaultPressed>Notify me</Toggle>
      </section>

      <section className='grid gap-2'>
        <h2 className='text-display-ui-3 text-strong'>
          ToggleGroup as bare root (canonical)
        </h2>
        <ToggleGroup aria-label='Date range' defaultValue={['30d']}>
          <ToggleGroup.Item value='7d'>7 days</ToggleGroup.Item>
          <ToggleGroup.Item value='30d'>30 days</ToggleGroup.Item>
        </ToggleGroup>
      </section>

      <section className='grid gap-2'>
        <h2 className='text-display-ui-3 text-strong'>
          ToggleGroup via barrel
        </h2>
        <ToggleGroupViaBarrel aria-label='View' defaultValue={['list']}>
          <ToggleGroupViaBarrel.Item value='list'>
            List
          </ToggleGroupViaBarrel.Item>
          <ToggleGroupViaBarrel.Item value='grid'>
            Grid
          </ToggleGroupViaBarrel.Item>
        </ToggleGroupViaBarrel>
      </section>

      <section className='grid gap-2'>
        <h2 className='text-display-ui-3 text-strong'>
          Slider with <code>.Root</code> alias and parts
        </h2>
        <Slider.Root defaultValue={25}>
          <Slider.Label>Search radius</Slider.Label>
          <Slider.Value />
          <Slider.Control>
            <Slider.Track>
              <Slider.Indicator />
              <Slider.Thumb />
            </Slider.Track>
          </Slider.Control>
        </Slider.Root>
      </section>

      <section className='grid gap-2'>
        <h2 className='text-display-ui-3 text-strong'>Slider via barrel</h2>
        <SliderViaBarrel aria-label='Volume' defaultValue={60} />
      </section>

      <section className='grid gap-2'>
        <h2 className='text-display-ui-3 text-strong'>
          RoadieProvider from a server component
        </h2>
        <p className='text-sm text-subtle'>
          Server children inside it, rendered from a server page. The link needs
          a client file, which the site&apos;s own <code>Providers.tsx</code>{' '}
          covers; theme and toasts stay with it too.
        </p>
        <RoadieProvider theme={false} toast={false} direction='ltr'>
          <Button href='/components/toast'>Toast docs</Button>
        </RoadieProvider>
      </section>

      <section className='grid gap-2'>
        <h2 className='text-display-ui-3 text-strong'>
          Toast.Provider and Toast.Viewport via subpath
        </h2>
        <Toast.Provider>
          <Toast.Viewport />
        </Toast.Provider>
      </section>

      <section className='grid gap-2'>
        <h2 className='text-display-ui-3 text-strong'>Toast via barrel</h2>
        <ToastViaBarrel.Provider timeout={0}>
          <ToastViaBarrel.Viewport />
        </ToastViaBarrel.Provider>
      </section>

      <section className='grid gap-2'>
        <h2 className='text-display-ui-3 text-strong'>Dialog via subpath</h2>
        <Dialog>
          <Dialog.Trigger>Open dialog</Dialog.Trigger>
          <Dialog.Content>
            <Dialog.Title>Dialog title</Dialog.Title>
            <Dialog.Description>
              Rendered from a server component.
            </Dialog.Description>
          </Dialog.Content>
        </Dialog>
      </section>

      <section className='grid gap-2'>
        <h2 className='text-display-ui-3 text-strong'>Drawer via subpath</h2>
        <Drawer>
          <Drawer.Trigger>Open drawer</Drawer.Trigger>
          <Drawer.Content>
            <Drawer.Header>
              <Drawer.Title>Drawer title</Drawer.Title>
              <Drawer.Description>
                Rendered from a server component.
              </Drawer.Description>
            </Drawer.Header>
            <Drawer.Body>Body</Drawer.Body>
          </Drawer.Content>
        </Drawer>
      </section>

      <section className='grid gap-2'>
        <h2 className='text-display-ui-3 text-strong'>Drawer via barrel</h2>
        <DrawerViaBarrel side='right'>
          <DrawerViaBarrel.Trigger>Open drawer</DrawerViaBarrel.Trigger>
          <DrawerViaBarrel.Content>
            <DrawerViaBarrel.Header>
              <DrawerViaBarrel.Title>Drawer title</DrawerViaBarrel.Title>
            </DrawerViaBarrel.Header>
            <DrawerViaBarrel.Body>
              Imported from the root barrel.
            </DrawerViaBarrel.Body>
          </DrawerViaBarrel.Content>
        </DrawerViaBarrel>
      </section>

      <section className='grid gap-2'>
        <h2 className='text-display-ui-3 text-strong'>Dialog via barrel</h2>
        <DialogViaBarrel>
          <DialogViaBarrel.Trigger>Open dialog</DialogViaBarrel.Trigger>
          <DialogViaBarrel.Content>
            <DialogViaBarrel.Title>Dialog title</DialogViaBarrel.Title>
            <DialogViaBarrel.Description>
              Imported from the root barrel.
            </DialogViaBarrel.Description>
          </DialogViaBarrel.Content>
        </DialogViaBarrel>
      </section>

      <section className='grid gap-2'>
        <h2 className='text-display-ui-3 text-strong'>
          Dialog with <code>.Root</code> alias
        </h2>
        <Dialog.Root>
          <Dialog.Trigger>Open dialog</Dialog.Trigger>
          <Dialog.Content>
            <Dialog.Title>Dialog title</Dialog.Title>
            <Dialog.Description>
              Explicit <code>&lt;Dialog.Root&gt;</code>. Same reference as bare{' '}
              <code>&lt;Dialog&gt;</code>.
            </Dialog.Description>
          </Dialog.Content>
        </Dialog.Root>
      </section>

      <section className='grid gap-2'>
        <h2 className='text-display-ui-3 text-strong'>IconTile</h2>
        {/* Flat server-safe component (no 'use client'); this just confirms
            it renders from a server component via its subpath import. */}
        <IconTile intent='accent'>
          <StarIcon weight='bold' />
        </IconTile>
      </section>

      <section className='grid gap-2'>
        <h2 className='text-display-ui-3 text-strong'>Logo</h2>
        <div className='flex flex-wrap items-center gap-6'>
          <Logo />
          <Logo variant='mark' />
          <Logo product='Studio' />
        </div>
      </section>

      <section className='grid gap-2'>
        <h2 className='text-display-ui-3 text-strong'>QRCode</h2>
        <div className='flex flex-wrap items-center gap-6'>
          <QRCode value='A7K2MKWX' className='w-32' />
          <QRCode value='A7K2MKWX' branded={false} className='w-32' />
        </div>
      </section>

      <section className='grid gap-2'>
        <h2 className='text-display-ui-3 text-strong'>Callout</h2>
        <Callout intent='info' title='Doors open at 7pm'>
          Short form, rendered from a server component.
        </Callout>
        <Callout.Root intent='warning'>
          <Callout.Icon />
          <Callout.Title render={<h3 />}>
            Only 20 tickets left at this price
          </Callout.Title>
          <Callout.Description>
            Explicit <code>&lt;Callout.Root&gt;</code> with every part.
          </Callout.Description>
        </Callout.Root>
        <CalloutViaBarrel intent='success'>Via the barrel</CalloutViaBarrel>
      </section>

      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>List via subpath</h2>
        <p className='text-sm text-subtle'>
          <code>
            import &#123; List &#125; from
            &apos;@oztix/roadie-components/list&apos;
          </code>
        </p>
        <List>
          <List.Item title='Upcoming events' />
          <List.Item
            title='Reports'
            description='Rendered from a server component via the subpath import.'
          />
        </List>
      </section>

      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>List via barrel</h2>
        <p className='text-sm text-subtle'>
          <code>
            import &#123; List &#125; from &apos;@oztix/roadie-components&apos;
          </code>
        </p>
        <ListViaBarrel>
          <ListViaBarrel.Item title='Imported from the root barrel' />
          <ListViaBarrel.Item title='Second item' />
        </ListViaBarrel>
      </section>

      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>
          Navigator server-safe leaves
        </h2>
        <p className='text-sm text-subtle'>
          The bare root and <code>Pane</code>, rendered from the server via the
          subpath and the barrel. This proves one thing only: those modules
          carry no stray <code>&apos;use client&apos;</code> and import
          server-side.
        </p>
        <p className='text-sm text-subtle'>
          It also proves the tree works. <code>Navigator</code> wraps a
          server-authored pane in its own content, and the pane registers with
          the nearest stack through context wherever it sits. Flight replacing
          the pane&apos;s type with a lazy wrapper doesn&apos;t stop either pane
          below from registering and carrying <code>data-stack-position</code>.
          Contrast this with <code>NavigatorCanary</code> further down:{' '}
          <code>Navigator.Primary</code>, <code>Secondary</code>,{' '}
          <code>Group</code>, <code>Menu</code> and <code>ExpandToggle</code>{' '}
          are still found by element reference, so that tree still has to be
          authored in a client component. See COMPOUND_PATTERNS.md §1.2.
        </p>
        <div className='h-64 overflow-hidden rounded-2xl border border-subtle'>
          <Navigator value='overview'>
            <Pane>
              <p className='p-3 text-subtle'>
                The bare root and Pane render from a server component through
                the subpath.
              </p>
            </Pane>
          </Navigator>
        </div>
        <div className='h-64 overflow-hidden rounded-2xl border border-subtle'>
          <NavigatorViaBarrel value='overview'>
            <PaneViaBarrel>
              <p className='p-3 text-subtle'>
                The same leaves render through the root barrel.
              </p>
            </PaneViaBarrel>
          </NavigatorViaBarrel>
        </div>
      </section>

      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Navigator full tree</h2>
        <p className='text-sm text-subtle'>
          Rendered from a client component on purpose. Navigator finds its own
          children by element reference, which Flight breaks for server-authored
          trees. See <code>NavigatorCanary.tsx</code>.
        </p>
        <NavigatorCanary />
      </section>

      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>
          ScrollArea as bare root, <code>.Root</code> alias, and barrel
        </h2>
        <ScrollArea className='h-32 rounded-xl border border-subtle'>
          <ScrollArea.Viewport className='p-3'>
            <p>Subpath, bare root.</p>
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar>
            <ScrollArea.Thumb />
          </ScrollArea.Scrollbar>
        </ScrollArea>
        <ScrollArea.Root className='h-32 rounded-xl border border-subtle'>
          <ScrollArea.Viewport className='p-3'>
            <p>Subpath, explicit .Root alias.</p>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
        <ScrollAreaViaBarrel className='h-32 rounded-xl border border-subtle'>
          <ScrollAreaViaBarrel.Viewport className='p-3'>
            <p>Root barrel import.</p>
          </ScrollAreaViaBarrel.Viewport>
        </ScrollAreaViaBarrel>
      </section>

      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>
          DashboardView (roadie-charts)
        </h2>
        <p className='text-sm text-subtle'>
          <code>
            import &#123; DashboardView &#125; from
            &apos;@oztix/roadie-charts/dashboard-view&apos;
          </code>
        </p>
        <DashboardView spec={createShowDashboard()} />
      </section>

      {/*
        Phase 3 follow-up: as each compound migrates, add a section here
        rendering its bare <Compound /> via the subpath + barrel imports.
      */}
    </main>
  )
}
