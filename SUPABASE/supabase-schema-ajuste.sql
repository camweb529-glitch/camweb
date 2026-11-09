-- Ajusta las tablas vacias de Supabase a los identificadores que Camweb ya usa.
-- Ejecutar una sola vez en Supabase > SQL Editor, con las tablas actuales.
alter table public.produccion_leche
    drop constraint if exists produccion_leche_cliente_id_fkey;
alter table public.clientes
    drop constraint if exists clientes_vehiculo_id_fkey;

alter table public.vehiculos alter column id drop identity if exists;
alter table public.vehiculos alter column id drop default;
alter table public.vehiculos alter column id type text using id::text;

alter table public.clientes alter column id drop identity if exists;
alter table public.clientes alter column id drop default;
alter table public.clientes alter column id type text using id::text;
alter table public.clientes alter column vehiculo_id type text using vehiculo_id::text;
alter table public.clientes add column if not exists precio numeric(10,2) not null default 0;

alter table public.produccion_leche alter column cliente_id type text using cliente_id::text;

alter table public.clientes
    add constraint clientes_vehiculo_id_fkey
    foreign key (vehiculo_id) references public.vehiculos(id) on delete cascade;
alter table public.produccion_leche
    add constraint produccion_leche_cliente_id_fkey
    foreign key (cliente_id) references public.clientes(id) on delete cascade;

-- Datos adicionales de CAMWEB que siguen siendo objetos en el navegador:
-- finanzas, proveedores, descargas, reportes y configuracion visual.
create table if not exists public.camweb_datos (
    propietario_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
    clave text not null,
    valor jsonb not null,
    actualizado_en timestamptz not null default now(),
    primary key (propietario_id, clave)
);

alter table public.camweb_datos enable row level security;
drop policy if exists "Cada usuario administra sus datos Camweb" on public.camweb_datos;
create policy "Cada usuario administra sus datos Camweb"
on public.camweb_datos for all to authenticated
using (propietario_id = auth.uid())
with check (propietario_id = auth.uid());
