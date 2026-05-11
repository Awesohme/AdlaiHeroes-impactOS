alter table public.beneficiaries
add column if not exists profile_image_drive_file_id text,
add column if not exists profile_image_folder_id text,
add column if not exists profile_image_mime_type text,
add column if not exists profile_image_size_bytes bigint,
add column if not exists profile_image_uploaded_at timestamptz;

insert into public.field_templates (field_key, label, field_type, description, default_required, position)
values
  ('profile_image', 'Profile Image', 'image', 'Optional beneficiary or household image captured for visual identification.', false, 100),
  ('signature_capture', 'Signature Capture', 'signature', 'Signature or mark captured during programme data collection.', false, 101)
on conflict (field_key) do update
set
  label = excluded.label,
  field_type = excluded.field_type,
  description = excluded.description,
  updated_at = now();
