# Row-level security (RLS) and database roles — the second lock

**What it is:** a Postgres feature that filters rows *inside the database*. A **policy** on a table says which rows a role may see or write, e.g. `lab_id = app_current_lab_id()`. Postgres adds that condition to every query on its own.

**Why we use it:** the API already filters by lab (lock 1). RLS is lock 2: if a developer forgets a `WHERE lab_id = …`, or a bug passes the wrong ID, Postgres still returns only the current lab's rows. One lab seeing another lab's patients would end the product.

**Without it:** isolation depends on every query in every future feature being written perfectly.

## The pieces in our database (decision 012)
| Piece | What it does |
| --- | --- |
| `ENABLE ROW LEVEL SECURITY` | Turns policies on for the table |
| `FORCE ROW LEVEL SECURITY` | Applies them to the table's owner too (otherwise owners skip them) |
| `aliquot_app` role | What the API logs in as. `NOBYPASSRLS`: it can never switch RLS off |
| `app.current_lab_id` | A per-transaction setting. The API sets it from the token: `set_config('app.current_lab_id', lab, true)` (`true` = `SET LOCAL`, ends with the transaction) |
| `app_current_lab_id()` | Reads the setting; empty → NULL → the policy matches **nothing** |
| `USING` / `WITH CHECK` | `USING` filters what you read; `WITH CHECK` refuses writing a row for another lab |
| Grants | What a role may do at all. No `DELETE` on staff, no `UPDATE`/`DELETE` on the audit log |
| Composite FKs `(lab_id, user_id)` | Even the owner can't point lab A's row at lab B's user |
| `public_lab_by_slug()` | `SECURITY DEFINER`: runs as its owner to return a lab's public branding before anyone signs in |

## Proof
`app/modules/tenants/tests/test_isolation.py` connects **as `aliquot_app`** and shows:
- no lab set → zero rows
- lab A → only lab A
- writing a row for lab B → refused
- the audit log can't be changed
- the platform role can't read staff or sessions

## Supabase (when we get there)
The migration creates the roles without passwords. Once, in the Supabase SQL editor:
`ALTER ROLE aliquot_app PASSWORD '<long random>';` then put that in Render's `DATABASE_URL`.

## Where it's used in Aliquot
`migrations/versions/20261124_0001_foundation.py` (`_tenant_table`) · `app/core/db.py` (`set_current_lab`, `lab_transaction`)
