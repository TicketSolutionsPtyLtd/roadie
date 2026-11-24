import { Toolbar } from '.'

export const Overflowing = () => (
  <Toolbar aria-label='History'>
    <Toolbar.Button>Undo</Toolbar.Button>
    <Toolbar.Button>Redo</Toolbar.Button>
    <Toolbar.Separator />
    <Toolbar.Button>Save draft</Toolbar.Button>
    <Toolbar.Button>Publish now</Toolbar.Button>
    <Toolbar.Button>Duplicate event</Toolbar.Button>
    <Toolbar.Button>Archive event</Toolbar.Button>
  </Toolbar>
)
