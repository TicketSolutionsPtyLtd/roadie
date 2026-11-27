import { Combobox } from '.'

const bands = ['Powderfinger', 'Custard', 'Regurgitator']

export const Closed = () => (
  <Combobox items={bands}>
    <Combobox.InputGroup>
      <Combobox.Input placeholder='Search bands' />
      <Combobox.Trigger />
    </Combobox.InputGroup>
    <Combobox.Portal>
      <Combobox.Positioner>
        <Combobox.Popup>
          <Combobox.List>
            {(band: string) => (
              <Combobox.Item key={band} value={band}>
                {band}
              </Combobox.Item>
            )}
          </Combobox.List>
        </Combobox.Popup>
      </Combobox.Positioner>
    </Combobox.Portal>
  </Combobox>
)
