---
'@oztix/roadie-components': patch
---

`RecordTable` and `RecordList` no longer re-render the rows a search keeps when the records span more than one page. A row's place (`aria-rowindex` in a table, `aria-posinset` and `aria-setsize` in a list) was a prop of the memoised row, so a search that moved rows up the page re-rendered every one of them, cells and checkbox included. Typing one character into a selectable table showing 100 of 200 rows now re-renders none of the 58 rows it keeps and only updates each one's place. The markup is unchanged.
