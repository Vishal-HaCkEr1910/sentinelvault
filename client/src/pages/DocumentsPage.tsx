import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, RefreshCw, FolderOpen, Eye, ShieldCheck, FileText } from 'lucide-react';
import { useDocuments } from '@/hooks/useDocuments';
import { Document } from '@/api/types';
import { DOC_TYPES } from '@/lib/constants';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

type SealedFilter = 'all' | 'sealed' | 'unsealed';
type SortOption = 'newest' | 'oldest' | 'az';

export default function DocumentsPage() {
  const navigate = useNavigate();
  const { data: documents = [], isLoading, isError, refetch } = useDocuments();
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sealedFilter, setSealedFilter] = useState<SealedFilter>('all');
  const [sort, setSort] = useState<SortOption>('newest');

  const filtered = useMemo(() => {
    let result: Document[] = [...documents];
    if (typeFilter !== 'all') result = result.filter((d) => d.doc_type === typeFilter);
    if (sealedFilter === 'sealed') result = result.filter((d) => d.is_sealed);
    if (sealedFilter === 'unsealed') result = result.filter((d) => !d.is_sealed);
    if (sort === 'newest') result.sort((a, b) => b.created_at - a.created_at);
    if (sort === 'oldest') result.sort((a, b) => a.created_at - b.created_at);
    if (sort === 'az') result.sort((a, b) => a.title.localeCompare(b.title));
    return result;
  }, [documents, typeFilter, sealedFilter, sort]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Documents</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <PermissionGate action="upload">
            <Button size="sm" onClick={() => navigate('/documents/upload')} className="gap-2">
              <Upload className="h-4 w-4" />
              Upload
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex gap-3 flex-wrap">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {DOC_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sealedFilter} onValueChange={(v) => setSealedFilter(v as SealedFilter)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="sealed">Sealed only</SelectItem>
            <SelectItem value="unsealed">Unsealed only</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
            <SelectItem value="az">Title A–Z</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Error state */}
      {isError && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center justify-between">
          Failed to load documents. Try refreshing.
          <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Case</TableHead>
              <TableHead>Uploader</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead>Sealed</TableHead>
              <TableHead>Anchored</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              : filtered.length === 0
              ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center text-gray-500">
                      <FolderOpen className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      No documents found for your assigned cases
                    </TableCell>
                  </TableRow>
                )
              : filtered.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <button
                        onClick={() => navigate(`/documents/${doc.id}`)}
                        className="font-medium text-blue-600 hover:underline text-left"
                      >
                        {doc.title}
                      </button>
                    </TableCell>
                    <TableCell><Badge variant="secondary">{doc.doc_type}</Badge></TableCell>
                    <TableCell>#{doc.case_id}</TableCell>
                    <TableCell className="text-sm text-gray-600">{doc.uploader_username}</TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {new Date(doc.created_at * 1000).toLocaleDateString('en-IN')}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={doc.is_sealed ? 'sealed' : 'pending'} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={doc.anchored ? 'anchored' : 'pending'} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          title="View"
                          onClick={() => navigate(`/documents/${doc.id}`)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <PermissionGate action="verify">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            title="Verify"
                            onClick={() => navigate(`/documents/${doc.id}/verify`)}
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                          </Button>
                        </PermissionGate>
                        <PermissionGate action="generate_certificate">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            title="Certificate"
                            onClick={() => navigate(`/documents/${doc.id}`)}
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </Button>
                        </PermissionGate>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
            }
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
