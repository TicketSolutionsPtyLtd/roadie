/** A value the sending system can fill, which a `variable` node names by key. */
export type EditorVariable = {
  key: string
  /** What an author sees, such as "First name". */
  label: string
  /**
   * How each sending system writes it, such as `#FirstName#` or
   * `{{ customer.first_name }}`. A filter, such as a date format, goes here,
   * never in the template. Liquid writes a value unescaped, so a text
   * variable's Liquid token takes `| escape`, as in
   * `{{ customer.first_name | escape }}`, or a value with `<` or `&` reaches
   * the HTML as markup.
   */
  tokens: { ae?: string; liquid?: string }
  /**
   * `'url'` for a link the sending system makes for each customer, such as
   * the unsubscribe page or the email in a browser. A link or a button links
   * to it, and its token is written as the href. Text by default.
   */
  kind?: 'text' | 'url'
  /**
   * What a merge tag shows a customer without a value, such as "there" for
   * a first name. A tag takes it as it's inserted, and an author can change
   * it there.
   */
  fallback?: string
}

/** The variables shown as text, as merge tags. */
export const textVariables = (variables: readonly EditorVariable[] = []) =>
  variables.filter((variable) => variable.kind !== 'url')

/** The variables a link or a button can link to. */
export const linkVariables = (variables: readonly EditorVariable[] = []) =>
  variables.filter((variable) => variable.kind === 'url')
