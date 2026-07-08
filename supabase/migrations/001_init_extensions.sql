-- 001_init_extensions.sql
-- Sprint 1 — Fundament (40_Implementatieplan.md, 11_DatabaseConcept.md § 1)

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "postgis";
