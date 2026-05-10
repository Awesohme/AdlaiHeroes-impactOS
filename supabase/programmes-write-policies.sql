begin;

drop policy if exists "programmes_insert_admin_only" on public.programmes;
drop policy if exists "programmes_update_admin_only" on public.programmes;
drop policy if exists "programme_data_fields_select_authenticated_active" on public.programme_data_fields;
drop policy if exists "programme_data_fields_insert_admin_only" on public.programme_data_fields;
drop policy if exists "programme_data_fields_update_admin_only" on public.programme_data_fields;
drop policy if exists "programme_data_fields_delete_admin_only" on public.programme_data_fields;

create policy "programmes_insert_admin_only"
on public.programmes
for insert
to authenticated
with check (
  public.current_app_role() = 'admin'::public.app_role
  and owner_id = auth.uid()
);

create policy "programmes_update_admin_only"
on public.programmes
for update
to authenticated
using (public.current_app_role() = 'admin'::public.app_role)
with check (public.current_app_role() = 'admin'::public.app_role);

create policy "programme_data_fields_select_authenticated_active"
on public.programme_data_fields
for select
to authenticated
using (public.current_app_role() is not null);

create policy "programme_data_fields_insert_admin_only"
on public.programme_data_fields
for insert
to authenticated
with check (public.current_app_role() = 'admin'::public.app_role);

create policy "programme_data_fields_update_admin_only"
on public.programme_data_fields
for update
to authenticated
using (public.current_app_role() = 'admin'::public.app_role)
with check (public.current_app_role() = 'admin'::public.app_role);

create policy "programme_data_fields_delete_admin_only"
on public.programme_data_fields
for delete
to authenticated
using (public.current_app_role() = 'admin'::public.app_role);

commit;
