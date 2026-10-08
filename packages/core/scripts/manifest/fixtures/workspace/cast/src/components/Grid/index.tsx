function GridRoot(props: { columns: number }) {
  return props.columns
}

function GridCell(props: { span: number }) {
  return props.span
}

const Grid = GridRoot as typeof GridRoot & { Cell: typeof GridCell }
Grid.Cell = GridCell

export { Grid }
