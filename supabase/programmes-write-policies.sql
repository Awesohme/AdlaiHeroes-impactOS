begin;

drop policy if exists "programmes_insert_admin_only" on public.programmes;
drop policy if exists "programmes_update_admin_only" on public.programmes;

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

commit;
