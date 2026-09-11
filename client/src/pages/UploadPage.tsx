import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { can } from '@/lib/permissions';
import { DEMO_CASES, DEMO_USERS, DOC_TYPES } from '@/lib/constants';
import { useUploadDocument } from '@/hooks/useDocuments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Navigate } from 'react-router-dom';

const uploadSchema = z.object({
  case_id: z.number({ required_error: 'Select a case' }),
  title: z.string().min(1, 'Title is required'),
  doc_type: z.enum(['FIR','ChargeSheet','WitnessStatement','ForensicReport','CourtFiling','Evidence']),
  tags: z.string().default(''),
  sealed: z.boolean().default(false),
  custody_k: z.number().optional(),
  custodian_usernames: z.array(z.string()).default([]),
  authorized_usernames: z.array(z.string()).default([]),
});

type FormValues = z.infer<typeof uploadSchema>;

export default function UploadPage() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role ?? '');
  const { mutateAsync, isPending } = useUploadDocument();
  const [fileBase64, setFileBase64] = useState<string>('');
  const [fileError, setFileError] = useState<string>('');
  const [submitError, setSubmitError] = useState<string>('');

  if (!can(role, 'upload')) return <Navigate to="/documents" replace />;

  const { register, handleSubmit, watch, control, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      tags: '',
      sealed: false,
      custodian_usernames: [],
      authorized_usernames: [],
    },
  });

  const isSealed = watch('sealed');
  const custodyK = watch('custody_k');
  const selectedCustodians = watch('custodian_usernames');
  const selectedAuthorized = watch('authorized_usernames');

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError('');
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setFileBase64(base64);
    };
    reader.readAsDataURL(file);
  }

  function toggleInArray(arr: string[], value: string): string[] {
    return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
  }

  const onSubmit = async (data: FormValues) => {
    if (!fileBase64) {
      setFileError('Please select a file');
      return;
    }
    if (data.sealed && data.custody_k !== undefined && data.custody_k > data.custodian_usernames.length) {
      setSubmitError(`Custody K (${data.custody_k}) cannot exceed number of selected custodians (${data.custodian_usernames.length})`);
      return;
    }
    setSubmitError('');
    try {
      await mutateAsync({
        ...data,
        content_base64: fileBase64,
        custody_k: data.sealed ? (data.custody_k ?? null) : null,
        custodian_usernames: data.sealed ? data.custodian_usernames : [],
        authorized_usernames: data.sealed ? [] : data.authorized_usernames,
      });
      toast.success('Document uploaded successfully');
      navigate('/documents');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setSubmitError(msg);
    }
  };

  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Upload Document</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Case */}
            <div className="space-y-1">
              <Label>Case</Label>
              <Controller
                control={control}
                name="case_id"
                render={({ field }) => (
                  <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString()}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a case" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEMO_CASES.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.case_id && <p className="text-sm text-red-500">{errors.case_id.message}</p>}
            </div>

            {/* Title */}
            <div className="space-y-1">
              <Label>Title</Label>
              <Input placeholder="Document title" {...register('title')} />
              {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
            </div>

            {/* Document Type */}
            <div className="space-y-1">
              <Label>Document Type</Label>
              <Controller
                control={control}
                name="doc_type"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOC_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.doc_type && <p className="text-sm text-red-500">{errors.doc_type.message}</p>}
            </div>

            {/* File */}
            <div className="space-y-1">
              <Label>File</Label>
              <input
                type="file"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {fileError && <p className="text-sm text-red-500">{fileError}</p>}
            </div>

            {/* Tags */}
            <div className="space-y-1">
              <Label>Tags</Label>
              <Input placeholder="Space-separated keywords" {...register('tags')} />
              <p className="text-xs text-gray-400">Used for encrypted search</p>
            </div>

            {/* Sealed toggle */}
            <div className="flex items-center gap-3">
              <Controller
                control={control}
                name="sealed"
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
              <Label>Seal this document (requires k-of-n custodian approval to access)</Label>
            </div>

            {/* Authorized users (not sealed) */}
            {!isSealed && (
              <div className="space-y-2">
                <Label>Authorized Users</Label>
                <div className="rounded-md border p-3 space-y-2 max-h-48 overflow-y-auto">
                  {DEMO_USERS.map((u) => (
                    <label key={u.username} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={selectedAuthorized.includes(u.username)}
                        onCheckedChange={() => {
                          setValue('authorized_usernames', toggleInArray(selectedAuthorized, u.username));
                        }}
                      />
                      <span className="text-sm font-mono">{u.username}</span>
                      <span className="text-xs text-gray-400">({u.role})</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Custody fields (sealed) */}
            {isSealed && (
              <>
                <div className="space-y-1">
                  <Label>Minimum Approvers Needed (K)</Label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="e.g. 2"
                    {...register('custody_k', { valueAsNumber: true })}
                  />
                  {custodyK !== undefined && selectedCustodians.length > 0 && custodyK > selectedCustodians.length && (
                    <p className="text-sm text-amber-600">K cannot exceed number of custodians selected ({selectedCustodians.length})</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Custodian Usernames</Label>
                  <div className="rounded-md border p-3 space-y-2 max-h-48 overflow-y-auto">
                    {DEMO_USERS.map((u) => (
                      <label key={u.username} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={selectedCustodians.includes(u.username)}
                          onCheckedChange={() => {
                            setValue('custodian_usernames', toggleInArray(selectedCustodians, u.username));
                          }}
                        />
                        <span className="text-sm font-mono">{u.username}</span>
                        <span className="text-xs text-gray-400">({u.role})</span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            {submitError && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {submitError}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Uploading...' : 'Upload Document'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/documents')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
