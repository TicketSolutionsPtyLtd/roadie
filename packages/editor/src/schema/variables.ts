/** A value the sending system can fill, which a `variable` node names by key. */
export type EditorVariable = {
  key: string
  /** What an author sees, such as "First name". */
  label: string
  /**
   * How each sending system writes it, such as `#FirstName#` or
   * `{{ customer.first_name }}`. A filter, such as a date format, goes here,
   * never in the template.
   */
  tokens: { ae?: string; liquid?: string }
}
