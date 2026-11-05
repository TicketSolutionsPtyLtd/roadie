---
'@oztix/roadie-editor': minor
---

An email can link to the unsubscribe page, the email in a browser, or any link the sending system makes for each customer. List each as a variable with `kind: 'url'`. In the email preset, the link popover offers each under Or link to, and Button settings offers each under Links to. The link or button saves `{ variable }` with no href, and `renderEmail` writes the variable's token as the href, or with `values`, its value. Like a merge tag, a link to a variable `variables` doesn't list throws. `{{` and the merge tag form list only text variables. `@oztix/roadie-editor/schema` exports `linkVariables` and `textVariables`, which split a list of variables by kind.
