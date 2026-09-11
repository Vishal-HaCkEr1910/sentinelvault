import { AuditEntry } from '../../api/types';
import { cn } from '../../lib/utils';

interface AuditEntryRowProps {
  entry: AuditEntry;
}

const actionColors: Record<string, string> = {
  UPLOAD: 'bg-blue-100 text-blue-700',
  VIEW: 'bg-gray-100 text-gray-600',
  UNSEAL: 'bg-purple-100 text-purple-700',
  ANCHOR: 'bg-green-100 text-green-700',
  CERTIFICATE_EXPORT: 'bg-orange-100 text-orange-700',
  VERIFY: 'bg-teal-100 text-teal-700',
  TAMPER_DEMO: 'bg-red-100 text-red-700',
  RESTORE_DEMO: 'bg-yellow-100 text-yellow-700',
};

export function AuditEntryRow({ entry }: AuditEntryRowProps) {
  const actionColor = actionColors[entry.action] ?? 'bg-gray-100 text-gray-600';
  const timestamp = new Date(entry.timestamp * 1000).toLocaleString('en-IN');
  const truncatedDetails =
    entry.details.length > 60 ? entry.details.slice(0, 60) + '…' : entry.details;

  return (
    <tr className="border-b border-border hover:bg-muted/40 transition-colors">
      {/* Seq */}
      <td className="px-4 py-3 text-xs font-mono text-muted-foreground whitespace-nowrap">
        #{entry.seq}
      </td>

      {/* Actor */}
      <td className="px-4 py-3 text-sm font-medium text-foreground whitespace-nowrap">
        {entry.actor_username}
      </td>

      {/* Action */}
      <td className="px-4 py-3">
        <span
          className={cn(
            'inline-block rounded-full px-2.5 py-0.5 text-xs font-medium',
            actionColor
          )}
        >
          {entry.action}
        </span>
      </td>

      {/* Document */}
      <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
        {entry.document_id != null ? (
          <span className="font-mono text-xs">Doc #{entry.document_id}</span>
        ) : (
          <span className="text-muted-foreground/50">—</span>
        )}
      </td>

      {/* Details */}
      <td className="px-4 py-3 text-sm text-muted-foreground max-w-xs">
        <span
          title={entry.details}
          className="cursor-help"
        >
          {truncatedDetails || <span className="text-muted-foreground/40 italic">—</span>}
        </span>
      </td>

      {/* Timestamp */}
      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap font-mono">
        {timestamp}
      </td>

      {/* Anchored */}
      <td className="px-4 py-3 text-center">
        {entry.anchored ? (
          <span
            title="Anchored to blockchain"
            className="inline-block h-2.5 w-2.5 rounded-full bg-green-500"
          />
        ) : (
          <span
            title="Not yet anchored"
            className="inline-block h-2.5 w-2.5 rounded-full bg-gray-300"
          />
        )}
      </td>
    </tr>
  );
}
