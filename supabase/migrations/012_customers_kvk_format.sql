-- 012_customers_kvk_format.sql
-- Architecture review (post-Sprint-3): customers.kvk_number had no format
-- check, unlike objects.postal_code which already validates its format
-- (005_objects.sql) — inconsistent rigor for a similarly "must be
-- well-formed" field. A KVK-nummer is always exactly 8 digits. Nullable-safe:
-- only enforced when a value is present (business customers already require
-- one via customers_business_requires_kvk).

alter table public.customers
  add constraint customers_kvk_number_format check (
    kvk_number is null or kvk_number ~ '^[0-9]{8}$'
  );
