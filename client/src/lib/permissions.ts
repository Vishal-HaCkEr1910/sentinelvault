export const ROLE_PERMISSIONS: Record<string, string[]> = {
  Admin: [
    'upload',
    'view',
    'search',
    'seal',
    'custody_participate',
    'anchor',
    'verify',
    'manage_users',
    'generate_certificate',
  ],
  InvestigatingOfficer: [
    'upload',
    'view',
    'search',
    'seal',
    'custody_participate',
    'anchor',
    'verify',
    'generate_certificate',
  ],
  ForensicAnalyst: ['upload', 'view', 'search', 'custody_participate', 'verify'],
  Prosecutor: ['view', 'search', 'custody_participate', 'verify', 'generate_certificate'],
  Judge: ['view', 'search', 'custody_participate', 'verify', 'anchor', 'generate_certificate'],
  Clerk: ['upload', 'view', 'search', 'generate_certificate'],
}

export function can(role: string, action: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(action) ?? false
}

export const PERMISSION_LABELS: Record<string, string> = {
  upload: 'Upload Documents',
  view: 'View Documents',
  search: 'Search Documents',
  seal: 'Seal Documents',
  custody_participate: 'Custody Participation',
  anchor: 'Anchor to Blockchain',
  verify: 'Verify Integrity',
  manage_users: 'Manage Users',
  generate_certificate: 'Generate Certificates',
}
