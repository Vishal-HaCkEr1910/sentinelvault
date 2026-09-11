import { useState, useRef, useId } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Upload,
  FileUp,
  Shield,
  Lock,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Scale,
  Plus,
  Trash2,
  X,
  Search,
  User,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { can } from '@/lib/permissions';
import { DEMO_CASES, DEMO_USERS, DOC_TYPES } from '@/lib/constants';
import { useUploadDocument } from '@/hooks/useDocuments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RoleBadge } from '@/components/shared/RoleBadge';
import { Navigate } from 'react-router-dom';

// ─── Types ───────────────────────────────────────────────────────────────────

type DocType = 'FIR' | 'ChargeSheet' | 'WitnessStatement' | 'ForensicReport' | 'CourtFiling' | 'Evidence';

interface DocEntry {
  id: string;
  title: string;
  doc_type: DocType | '';
  tags: string;
  fileName: string;
  fileSize: string;
  fileBase64: string;
  fileError: string;
  titleError: string;
  typeError: string;
}

// ─── Schema (shared options per batch) ───────────────────────────────────────

const sharedSchema = z.object({
  case_id: z.number({ required_error: 'Select a case' }),
  sealed: z.boolean().default(false),
  custody_k: z.number().optional(),
  custodian_usernames: z.array(z.string()).default([]),
  authorized_usernames: z.array(z.string()).default([]),
});

type SharedValues = z.infer<typeof sharedSchema>;

// ─── User Search component ────────────────────────────────────────────────────

function UserSearchPicker({
  label,
  hint,
  selected,
  onAdd,
  onRemove,
}: {
  label: string;
  hint: string;
  selected: string[];
  onAdd: (username: string) => void;
  onRemove: (username: string) => void;
}) {
  const [searchText, setSearchText] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = DEMO_USERS.filter(
    (u) =>
      !selected.includes(u.username) &&
      (u.username.toLowerCase().includes(searchText.toLowerCase()) ||
        u.role.toLowerCase().includes(searchText.toLowerCase()))
  );

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold">{label}</Label>
        <span className="text-[11px] text-muted-foreground font-mono">{hint}</span>
      </div>

      {/* Selected tags */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((username) => {
            const u = DEMO_USERS.find((x) => x.username === username);
            return (
              <span
                key={username}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-primary/5 px-2.5 py-1 text-xs font-medium text-foreground"
              >
                <User className="h-3 w-3 text-primary" />
                <span className="font-mono">{username}</span>
                {u && <RoleBadge role={u.role} />}
                <button
                  type="button"
                  onClick={() => onRemove(username)}
                  className="ml-0.5 rounded-full text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={searchText}
          onChange={(e) => {
            setSearchText(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search by username or role…"
          className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />

        {/* Dropdown */}
        {open && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-lg border border-border bg-card shadow-lg overflow-hidden">
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-xs text-muted-foreground text-center">
                {searchText ? `No users matching "${searchText}"` : 'All users already added'}
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto">
                {filtered.map((u) => (
                  <button
                    key={u.username}
                    type="button"
                    onMouseDown={() => {
                      onAdd(u.username);
                      setSearchText('');
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/60 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-xs font-mono font-medium text-foreground">{u.username}</span>
                    </div>
                    <RoleBadge role={u.role} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {selected.length === 0 && (
        <p className="text-[11px] text-muted-foreground">
          Search and select officers to grant access to this document batch.
        </p>
      )}
    </div>
  );
}

// ─── Document Entry Row ───────────────────────────────────────────────────────

function DocEntryRow({
  entry,
  index,
  total,
  onChange,
  onRemove,
}: {
  entry: DocEntry;
  index: number;
  total: number;
  onChange: (id: string, updates: Partial<DocEntry>) => void;
  onRemove: (id: string) => void;
}) {
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileName = file.name;
    const fileSize = (file.size / 1024).toFixed(1) + ' KB';
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      onChange(entry.id, { fileName, fileSize, fileBase64: base64, fileError: '' });
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="rounded-xl border border-border bg-background p-4 space-y-4">
      {/* Row Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
            {index + 1}
          </div>
          <span className="text-sm font-semibold text-foreground">
            Document {index + 1}
          </span>
          {entry.fileName && (
            <span className="text-xs text-muted-foreground font-mono truncate max-w-[180px]">
              · {entry.fileName}
            </span>
          )}
        </div>
        {total > 1 && (
          <button
            type="button"
            onClick={() => onRemove(entry.id)}
            className="h-7 w-7 rounded-lg border border-border text-muted-foreground hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-all flex items-center justify-center"
            title="Remove document"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Title + Type grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Title */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">
            Document Title <span className="text-red-500">*</span>
          </Label>
          <Input
            placeholder="e.g. Crime Scene Seizure Memo"
            value={entry.title}
            onChange={(e) => onChange(entry.id, { title: e.target.value, titleError: '' })}
            className={entry.titleError ? 'border-red-400' : ''}
          />
          {entry.titleError && <p className="text-xs text-red-500">{entry.titleError}</p>}
        </div>

        {/* Doc Type */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">
            Document Classification <span className="text-red-500">*</span>
          </Label>
          <Select
            value={entry.doc_type}
            onValueChange={(v) => onChange(entry.id, { doc_type: v as DocType, typeError: '' })}
          >
            <SelectTrigger className={entry.typeError ? 'border-red-400' : ''}>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {DOC_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {entry.typeError && <p className="text-xs text-red-500">{entry.typeError}</p>}
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold">Search Tags</Label>
          <span className="text-[11px] text-muted-foreground font-mono">HMAC-Trapdoor Encrypted</span>
        </div>
        <Input
          placeholder="e.g. ballistics weapon forensics section302"
          value={entry.tags}
          onChange={(e) => onChange(entry.id, { tags: e.target.value })}
        />
      </div>

      {/* File dropzone */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">
          File Payload <span className="text-red-500">*</span>
        </Label>
        <div
          className={`relative rounded-xl border-2 border-dashed transition-colors p-4 text-center cursor-pointer ${
            entry.fileName
              ? 'border-emerald-300 bg-emerald-50/40 hover:bg-emerald-50'
              : 'border-border hover:border-primary/50 bg-muted/20 hover:bg-muted/30'
          }`}
        >
          <input
            type="file"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex items-center justify-center gap-3">
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center ${
                entry.fileName ? 'bg-emerald-100 text-emerald-600' : 'bg-primary/10 text-primary'
              }`}
            >
              {entry.fileName ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
            </div>
            <div className="text-left">
              {entry.fileName ? (
                <>
                  <p className="text-xs font-semibold text-foreground">{entry.fileName}</p>
                  <p className="text-[11px] text-muted-foreground">{entry.fileSize} · Click to replace</p>
                </>
              ) : (
                <>
                  <p className="text-xs font-medium text-foreground">Click to select file</p>
                  <p className="text-[11px] text-muted-foreground">PDF, DOCX, PNG, JPG up to 25MB</p>
                </>
              )}
            </div>
          </div>
        </div>
        {entry.fileError && <p className="text-xs text-red-500">{entry.fileError}</p>}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function makeEntry(): DocEntry {
  return {
    id: crypto.randomUUID(),
    title: '',
    doc_type: '',
    tags: '',
    fileName: '',
    fileSize: '',
    fileBase64: '',
    fileError: '',
    titleError: '',
    typeError: '',
  };
}

export default function UploadPage() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role ?? '');
  const { mutateAsync, isPending } = useUploadDocument();

  const [entries, setEntries] = useState<DocEntry[]>([makeEntry()]);
  const [submitError, setSubmitError] = useState('');
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  if (!can(role, 'upload')) return <Navigate to="/documents" replace />;

  const {
    handleSubmit,
    watch,
    control,
    setValue,
    formState: { errors },
  } = useForm<SharedValues>({
    resolver: zodResolver(sharedSchema),
    defaultValues: {
      sealed: false,
      custodian_usernames: [],
      authorized_usernames: [],
    },
  });

  const selectedCaseId = watch('case_id');
  const isSealed = watch('sealed');
  const custodyK = watch('custody_k');
  const selectedCustodians = watch('custodian_usernames');
  const selectedAuthorized = watch('authorized_usernames');

  const selectedCaseObj = DEMO_CASES.find((c) => c.id === selectedCaseId);

  // Entry helpers
  function updateEntry(id: string, updates: Partial<DocEntry>) {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
  }

  function removeEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function addEntry() {
    setEntries((prev) => [...prev, makeEntry()]);
  }

  // Validate all entries client-side
  function validateEntries(): boolean {
    let ok = true;
    const updated = entries.map((e) => {
      const errs: Partial<DocEntry> = {};
      if (!e.title.trim()) { errs.titleError = 'Title is required'; ok = false; }
      if (!e.doc_type) { errs.typeError = 'Select a document type'; ok = false; }
      if (!e.fileBase64) { errs.fileError = 'Select a file to upload'; ok = false; }
      return { ...e, ...errs };
    });
    setEntries(updated);
    return ok;
  }

  const onSubmit = async (shared: SharedValues) => {
    if (!validateEntries()) return;
    if (
      shared.sealed &&
      shared.custody_k !== undefined &&
      shared.custody_k > shared.custodian_usernames.length
    ) {
      setSubmitError(
        `Threshold K (${shared.custody_k}) cannot exceed custodians (${shared.custodian_usernames.length})`
      );
      return;
    }
    setSubmitError('');
    setProgress({ done: 0, total: entries.length });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      try {
        await mutateAsync({
          case_id: shared.case_id,
          title: entry.title,
          doc_type: entry.doc_type as DocType,
          tags: entry.tags,
          content_base64: entry.fileBase64,
          sealed: shared.sealed,
          custody_k: shared.sealed ? shared.custody_k ?? null : null,
          custodian_usernames: shared.sealed ? shared.custodian_usernames : [],
          authorized_usernames: shared.sealed ? [] : shared.authorized_usernames,
        });
        successCount++;
        setProgress({ done: i + 1, total: entries.length });
      } catch (err) {
        failCount++;
        const msg = err instanceof Error ? err.message : 'Upload failed';
        setSubmitError(`Doc "${entry.title}" failed: ${msg}`);
        setProgress({ done: i + 1, total: entries.length });
      }
    }

    setProgress(null);
    if (failCount === 0) {
      toast.success(
        `${successCount} document${successCount > 1 ? 's' : ''} uploaded and sealed successfully`
      );
      navigate('/documents');
    } else {
      toast.warning(`${successCount} succeeded, ${failCount} failed`);
    }
  };

  return (
    <div className="w-full space-y-6 pb-8">
      {/* Cover Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-r from-card via-card to-muted/40 p-6 sm:p-8 shadow-sm">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-primary/5 blur-2xl" />
          <div className="absolute bottom-0 left-1/4 h-24 w-24 rounded-full bg-primary/5 blur-xl" />
        </div>
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
              <Link to="/documents" className="hover:text-foreground transition-colors flex items-center gap-1">
                <ArrowLeft className="h-3.5 w-3.5" />
                Documents
              </Link>
              <span>/</span>
              <span className="text-foreground">Batch Upload</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Ingest &amp; Seal Legal Documents
            </h1>
            <p className="text-sm text-muted-foreground">
              Upload multiple documents to a case at once with AES-256-GCM encryption, SHA-256 integrity hashing, and immutable audit chaining.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild className="shrink-0">
            <Link to="/documents">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to Documents
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left: Case selector + Document entries */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-5">

          {/* Step 1: Case Selection */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-primary">
                <FileText className="h-4 w-4" />
                <CardTitle className="text-base">Step 1 — Select Target Case</CardTitle>
              </div>
              <CardDescription>All documents in this batch will be filed under the selected case.</CardDescription>
            </CardHeader>
            <CardContent>
              <Controller
                control={control}
                name="case_id"
                render={({ field }) => (
                  <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString()}>
                    <SelectTrigger className={errors.case_id ? 'border-red-400' : ''}>
                      <SelectValue placeholder="Select case assignment…" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEMO_CASES.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.case_id && <p className="text-xs text-red-500 mt-1">{errors.case_id.message}</p>}
            </CardContent>
          </Card>

          {/* Step 2: Documents */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-primary">
                    <FileUp className="h-4 w-4" />
                    <CardTitle className="text-base">Step 2 — Documents to Upload</CardTitle>
                  </div>
                  <CardDescription className="mt-1">
                    Add one or more documents. Each gets its own title, classification, and file.
                  </CardDescription>
                </div>
                <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-semibold">
                  {entries.length} doc{entries.length !== 1 ? 's' : ''}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {entries.map((entry, idx) => (
                <DocEntryRow
                  key={entry.id}
                  entry={entry}
                  index={idx}
                  total={entries.length}
                  onChange={updateEntry}
                  onRemove={removeEntry}
                />
              ))}

              {/* Add document button */}
              <button
                type="button"
                onClick={addEntry}
                className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/10 py-3 text-sm font-medium text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all"
              >
                <Plus className="h-4 w-4" />
                Add Another Document
              </button>
            </CardContent>
          </Card>

          {/* Step 3: Access Control */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-primary">
                <Lock className="h-4 w-4" />
                <CardTitle className="text-base">Step 3 — Access Control &amp; Custody</CardTitle>
              </div>
              <CardDescription>Configure encryption access for all documents in this batch.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Seal toggle */}
              <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border bg-muted/20">
                <div className="space-y-1">
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <Lock className="h-4 w-4 text-primary" />
                    Seal under Multi-Party Custody (Shamir's SSS)
                  </Label>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Splits the encryption key using Shamir's Secret Sharing over GF(2⁸). Requires minimum K custodians to unlock. For confidential evidence &amp; informant statements.
                  </p>
                </div>
                <Controller
                  control={control}
                  name="sealed"
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
              </div>

              {/* Standard access — user search */}
              {!isSealed && (
                <UserSearchPicker
                  label="Grant Access to Officers"
                  hint="RSA-OAEP Key Wrapping"
                  selected={selectedAuthorized}
                  onAdd={(u) => setValue('authorized_usernames', [...selectedAuthorized, u])}
                  onRemove={(u) =>
                    setValue('authorized_usernames', selectedAuthorized.filter((x) => x !== u))
                  }
                />
              )}

              {/* Sealed custody */}
              {isSealed && (
                <div className="space-y-4 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Threshold Approvers Needed (K)</Label>
                      <Controller
                        control={control}
                        name="custody_k"
                        render={({ field }) => (
                          <Input
                            type="number"
                            min={1}
                            placeholder="e.g. 2"
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          />
                        )}
                      />
                    </div>
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                      <p className="font-semibold">Threshold Rule</p>
                      <p className="mt-0.5">
                        {custodyK || 0} of {selectedCustodians.length} custodians required to unseal.
                      </p>
                    </div>
                  </div>

                  {custodyK !== undefined &&
                    selectedCustodians.length > 0 &&
                    custodyK > selectedCustodians.length && (
                      <p className="text-xs text-red-600">
                        K ({custodyK}) cannot exceed custodian count ({selectedCustodians.length})
                      </p>
                    )}

                  <UserSearchPicker
                    label="Designate Custodians"
                    hint="Shamir Key Shares"
                    selected={selectedCustodians}
                    onAdd={(u) => setValue('custodian_usernames', [...selectedCustodians, u])}
                    onRemove={(u) =>
                      setValue('custodian_usernames', selectedCustodians.filter((x) => x !== u))
                    }
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Sidebar */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-5">

          {/* Live Summary */}
          <Card className="shadow-sm sticky top-6">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-primary">
                <Shield className="h-4 w-4" />
                <CardTitle className="text-base">Batch Summary</CardTitle>
              </div>
              <CardDescription>Live preview before committing to vault</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-lg border border-border bg-muted/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Target Case:</span>
                  <span className="font-bold text-foreground">{selectedCaseObj?.label ?? '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Documents:</span>
                  <span className="font-bold text-primary">{entries.length} queued</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Security Mode:</span>
                  <span className={isSealed ? 'text-amber-700 font-bold' : 'text-emerald-700 font-bold'}>
                    {isSealed
                      ? `Sealed (${custodyK ?? 1}-of-${selectedCustodians.length})`
                      : 'Standard Scoped'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Access Granted:</span>
                  <span className="text-foreground">
                    {isSealed
                      ? `${selectedCustodians.length} custodian${selectedCustodians.length !== 1 ? 's' : ''}`
                      : selectedAuthorized.length > 0
                      ? `${selectedAuthorized.length} officer${selectedAuthorized.length !== 1 ? 's' : ''}`
                      : 'None selected'}
                  </span>
                </div>
              </div>

              {/* Document list preview */}
              {entries.length > 0 && (
                <div className="space-y-1.5">
                  {entries.map((e, i) => (
                    <div
                      key={e.id}
                      className={`flex items-center gap-2 p-2 rounded-lg border ${
                        e.title && e.doc_type && e.fileBase64
                          ? 'border-emerald-200 bg-emerald-50/50'
                          : 'border-border bg-background'
                      }`}
                    >
                      {e.title && e.doc_type && e.fileBase64 ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <div className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                      )}
                      <span className="text-[11px] text-muted-foreground font-sans truncate">
                        {e.title || `Document ${i + 1}`}
                      </span>
                      {e.doc_type && (
                        <span className="ml-auto shrink-0 text-[10px] bg-muted rounded px-1.5 py-0.5 text-muted-foreground">
                          {e.doc_type}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Progress bar during upload */}
              {progress && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Uploading…</span>
                    <span className="font-semibold text-primary">
                      {progress.done}/{progress.total}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${(progress.done / progress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Crypto specs */}
              <div className="space-y-1.5 pt-1">
                {[
                  { label: 'Cipher', value: 'AES-256-GCM (Fresh Key)' },
                  { label: 'Integrity', value: 'SHA-256 Hash Digest' },
                  { label: 'Audit Log', value: 'Chained & ECDSA Signed' },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between p-2 rounded-lg bg-background border border-border"
                  >
                    <span className="text-muted-foreground">{label}:</span>
                    <span className="text-foreground font-semibold">{value}</span>
                  </div>
                ))}
              </div>

              {submitError && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700 font-sans">
                  {submitError}
                </div>
              )}

              {/* Submit */}
              <Button
                onClick={handleSubmit(onSubmit)}
                disabled={isPending || !!progress}
                className="w-full shadow-sm mt-1"
                size="lg"
              >
                {progress ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading {progress.done + 1} of {progress.total}…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Upload &amp; Seal {entries.length} Document{entries.length !== 1 ? 's' : ''}
                  </span>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => navigate('/documents')}
                disabled={!!progress}
              >
                Cancel
              </Button>
            </CardContent>
          </Card>

          {/* Legal compliance */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-primary">
                <Scale className="h-4 w-4" />
                <CardTitle className="text-base">Court Admissibility Standard</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-muted-foreground leading-relaxed">
              <p>
                <strong>Section 63(4) BSA 2023:</strong> Electronic records ingested into SentinelVault
                automatically receive mathematical proof of non-tampering.
              </p>
              <p>
                Each document hash is batched into a signed Merkle root block, making it directly verifiable
                during court cross-examination without exposing unrelated case documents.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
