---
'@oztix/roadie-components': minor
'@oztix/roadie-charts': minor
'@oztix/roadie-editor': minor
'@oztix/roadie-blocks': minor
'@oztix/roadie-widgets': minor
---

Add `types` to `roadie.manifest.json`: each exported object type a component's props name, such as an item in a list prop, with its import path and every field's type, whether it's required, and its description. It follows each field's type to the next type the same package exports, so a CMS or an agent can check every nested field a component needs, such as a Testimonial quote's `person` and that person's `name`, which a prop's type name alone (`readonly TestimonialQuote[]`) didn't say. Fields keep the same rules as props: literal unions are listed in the order they're declared, and fields from the DOM or React are left out. A type re-exported under another name gives that name as `export`, a generic type lists its `typeParameters`, and a type that also takes keys it doesn't name gives their type as `additionalFields`.
