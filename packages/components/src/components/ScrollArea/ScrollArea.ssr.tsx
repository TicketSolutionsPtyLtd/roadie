import { ScrollArea } from '.'

export const Overflowing = () => (
  <ScrollArea className='h-48 rounded-xl border border-subtle'>
    <ScrollArea.Viewport className='grid gap-3 p-4'>
      {Array.from({ length: 12 }, (_, index) => (
        <p key={index}>Ticket type {index + 1}</p>
      ))}
    </ScrollArea.Viewport>
    <ScrollArea.Scrollbar>
      <ScrollArea.Thumb />
    </ScrollArea.Scrollbar>
  </ScrollArea>
)
