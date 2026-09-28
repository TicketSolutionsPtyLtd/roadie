# Roadie docs

The documentation site for the Roadie Design System, published at
[ticketsolutionsptyltd.github.io/roadie](https://ticketsolutionsptyltd.github.io/roadie/).
Next.js 16 with MDX, exported as a static site.

## Run it

From the repo root:

```bash
pnpm --filter docs dev
```

It opens on [localhost:9614](http://localhost:9614). The docs import the
packages from their `dist`, so after changing a package, rebuild it and
restart the dev server.

## Where things live

| Path                      | What it holds                                             |
| ------------------------- | --------------------------------------------------------- |
| `src/app/overview/`       | Installation, philosophy and the Vue guide                |
| `src/app/foundations/`    | Layout, typography, colour, shape and other foundations   |
| `src/app/tokens/`         | Token reference pages                                     |
| `src/app/components/`     | One page per component                                    |
| `src/app/charts/`         | Chart guidelines, chart types, data pieces and dashboards |
| `src/app/roadie-widgets/` | Widget pages, such as the cart drawer                     |
| `contributing/`           | Guides for building and documenting components            |
| `solutions/`              | Recorded learnings from past bugs and fixes               |

## Writing a page

Component pages follow
[`contributing/COMPONENT_DOC_TEMPLATE.md`](contributing/COMPONENT_DOC_TEMPLATE.md).
Live examples use the `tsx-live` code fence, and every Roadie component is in
scope. Edit `.mdx` files by hand: the format scripts skip them.
