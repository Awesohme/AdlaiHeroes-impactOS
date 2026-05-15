export type ProgrammeStatus = "draft" | "planned" | "active" | "monitoring" | "completed" | "at_risk";

export type ProgrammeModuleKey =
  | "beneficiaries"
  | "activities"
  | "evidence"
  | "reporting"
  | "education_support";

export type ProgrammeFieldType =
  | "text"
  | "number"
  | "select"
  | "multi_select"
  | "yes_no"
  | "location"
  | "image"
  | "signature";

export type ProgrammeFieldDefinition = {
  field_key: string;
  label: string;
  field_type: ProgrammeFieldType;
  description: string;
};

export const reservedBeneficiaryProfileFieldKeys = new Set([
  "beneficiary_code",
  "full_name",
  "beneficiary_name",
  "gender",
  "date_of_birth",
  "guardian_name",
  "guardian_phone",
  "community",
  "state",
  "location",
  "profile_image",
  "consent_status",
  "photo_video_consent",
  "safeguarding_flag",
  "school_name",
]);

export function isReservedBeneficiaryProfileField(fieldKey: string) {
  return reservedBeneficiaryProfileFieldKeys.has(fieldKey);
}

export const programmeStatusOptions: Array<{ value: ProgrammeStatus; label: string }> = [
  { value: "draft", label: "Draft" },
  { value: "planned", label: "Planned" },
  { value: "active", label: "Active" },
  { value: "monitoring", label: "Monitoring" },
  { value: "completed", label: "Completed" },
  { value: "at_risk", label: "At Risk" },
];

export const programmeTypeOptions = [
  "Education Support",
  "Health & WASH",
  "Youth Development",
  "Livelihoods",
  "Protection",
  "Food Support",
];

export const moduleOptions: Array<{ key: ProgrammeModuleKey; label: string; description: string }> = [
  {
    key: "beneficiaries",
    label: "Beneficiaries",
    description: "Track participant profiles, consent, enrolment, and safeguarding notes.",
  },
  {
    key: "activities",
    label: "Activities",
    description: "Plan and monitor field visits, outreach sessions, and schedules.",
  },
  {
    key: "evidence",
    label: "Evidence",
    description: "Upload and verify files in Google Drive while keeping metadata in Supabase.",
  },
  {
    key: "reporting",
    label: "Reporting",
    description: "Prepare donor-ready outputs once programme records and evidence are complete.",
  },
  {
    key: "education_support",
    label: "Education Support",
    description: "Enable programme-specific school and sponsorship tracking fields.",
  },
];

export const programmeFieldCatalog: ProgrammeFieldDefinition[] = [
  {
    field_key: "beneficiary_age",
    label: "Beneficiary Age",
    field_type: "number",
    description: "Useful when the target group is age-bound and safeguarding thresholds matter.",
  },
  {
    field_key: "consent_status",
    label: "Consent Status",
    field_type: "select",
    description: "Surface the consent state required before photos or case records are reused.",
  },
  {
    field_key: "cbt_readiness_score",
    label: "CBT Readiness Score",
    field_type: "number",
    description: "Track readiness or assessment outputs for education-focused programmes.",
  },
  {
    field_key: "health_check_completed",
    label: "Health Check Completed",
    field_type: "yes_no",
    description: "Mark whether the required health screening or check-in has been completed.",
  },
  {
    field_key: "pad_distribution_quantity",
    label: "Pad Distribution Quantity",
    field_type: "number",
    description: "Track hygiene-kit or consumable distribution counts at beneficiary level.",
  },
  {
    field_key: "guardian_name",
    label: "Guardian Name",
    field_type: "text",
    description: "Store the primary caregiver or guardian name when needed for follow-up.",
  },
  {
    field_key: "school_grade_class",
    label: "School Grade/Class",
    field_type: "text",
    description: "Useful for school support, tutoring, and progression tracking.",
  },
  {
    field_key: "disability_status",
    label: "Disability Status",
    field_type: "select",
    description: "Keep inclusion-sensitive records when accessibility or tailored follow-up matters.",
  },
  {
    field_key: "gps_location",
    label: "GPS Location",
    field_type: "location",
    description: "Capture precise field location for remote or distributed delivery models.",
  },
  {
    field_key: "household_size",
    label: "Household Size",
    field_type: "number",
    description: "Helpful for food, livelihood, or poverty-vulnerability assessments.",
  },
];

export const defaultProgrammeFieldKeys = [
  "beneficiary_age",
  "consent_status",
  "cbt_readiness_score",
  "health_check_completed",
  "pad_distribution_quantity",
];

export const nigeriaLocationOptions = [
  "Abia",
  "Abuja, FCT",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
];

export function getProgrammeStatusLabel(status: string) {
  return programmeStatusOptions.find((option) => option.value === status)?.label ?? "Draft";
}

export function getFieldDefinition(fieldKey: string) {
  return programmeFieldCatalog.find((field) => field.field_key === fieldKey);
}
