begin;

drop policy if exists "evidence_insert_admin_only" on public.evidence;
drop policy if exists "evidence_update_admin_only" on public.evidence;

create policy "evidence_insert_admin_only"
on public.evidence
for insert
to authenticated
with check (
  public.current_app_role() = 'admin'::public.app_role
  and uploaded_by = auth.uid()
);

create policy "evidence_update_admin_only"
on public.evidence
for update
to authenticated
using (public.current_app_role() = 'admin'::public.app_role)
with check (public.current_app_role() = 'admin'::public.app_role);

commit;
