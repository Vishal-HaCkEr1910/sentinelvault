import { Eye, ShieldCheck, FileText } from 'lucide-react';
import { Document } from '@/api/types';
import { StatusBadge } from './StatusBadge';
import { PermissionGate } from './PermissionGate';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface DocumentCardProps {
  doc: Document;
  onView?: () => void;
  onVerify?: () => void;
  onCertificate?: () => void;
}

export function DocumentCard({ doc, onView, onVerify, onCertificate }: DocumentCardProps) {
  const uploadDate = new Date(doc.created_at * 1000).toLocaleDateString('en-IN');

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-4">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm leading-tight line-clamp-2">{doc.title}</h3>
            <Badge variant="secondary" className="shrink-0 text-xs">{doc.doc_type}</Badge>
          </div>
          <p className="text-xs text-gray-500">Case #{doc.case_id}</p>
          <p className="text-xs text-gray-500">
            {doc.uploader_username} · {uploadDate}
          </p>
          <div className="flex gap-2 flex-wrap pt-1">
            <StatusBadge status={doc.is_sealed ? 'sealed' : 'pending'} />
            <StatusBadge status={doc.anchored ? 'anchored' : 'pending'} />
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0 gap-2">
        {onView && (
          <Button size="sm" variant="outline" onClick={onView} className="gap-1">
            <Eye className="h-3 w-3" />
            View
          </Button>
        )}
        <PermissionGate action="verify">
          {onVerify && (
            <Button size="sm" variant="outline" onClick={onVerify} className="gap-1">
              <ShieldCheck className="h-3 w-3" />
              Verify
            </Button>
          )}
        </PermissionGate>
        <PermissionGate action="generate_certificate">
          {onCertificate && (
            <Button size="sm" variant="outline" onClick={onCertificate} className="gap-1">
              <FileText className="h-3 w-3" />
              Certificate
            </Button>
          )}
        </PermissionGate>
      </CardFooter>
    </Card>
  );
}
