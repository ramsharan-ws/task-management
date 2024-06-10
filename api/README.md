### HTML Templating in Pug

- Template using https://pugjs.org/language/plain-text.html
- Attributes : https://pugjs.org/language/attributes.html
- Validate here: https://pughtml.com/

### SQL commands

- Reset workflows

```SQL
TRUNCATE workflows RESTART IDENTITY;

UPDATE
  quotations
SET
  workflow_uuid = NULL,
  is_in_workflow = false,
  is_customer_visible = false;
```
