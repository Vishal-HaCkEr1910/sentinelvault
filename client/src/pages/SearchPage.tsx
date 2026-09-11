import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, SearchIcon, Shield, Key, FileText, CheckCircle2, Zap, Lock } from 'lucide-react';
import { useSearchDocuments } from '@/hooks/useDocuments';
import { DocumentCard } from '@/components/shared/DocumentCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SearchPage() {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState('');
  const [query, setQuery] = useState('');

  const { data: results = [], isLoading } = useSearchDocuments(query);

  const handleSearch = (term?: string) => {
    const textToSearch = (term ?? inputValue).trim();
    setQuery(textToSearch);
    if (term) setInputValue(term);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch();
  };

  const sampleTags = ['FIR', 'ballistics', 'forensics', 'seizure', 'witness', 'cyber', 'fraud'];

  return (
    <div className="w-full space-y-6 pb-8">
      {/* Full-width Cover Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-r from-card via-card to-muted/40 p-6 sm:p-8 shadow-sm">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-primary/5 blur-2xl" />
          <div className="absolute bottom-0 left-1/4 h-24 w-24 rounded-full bg-primary/5 blur-xl" />
        </div>

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Left: Title + description */}
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow">
                <SearchIcon className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  Encrypted Case Search
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Query sealed evidence using zero-knowledge HMAC-trapdoor searchable encryption
                </p>
              </div>
            </div>
          </div>

          {/* Right: Feature pills */}
          <div className="flex flex-wrap gap-2.5">
            {[
              { icon: Key, label: 'HMAC Trapdoor' },
              { icon: Lock, label: 'Zero-Knowledge' },
              { icon: Shield, label: 'Case-Scoped' },
            ].map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm"
              >
                <Icon className="h-3.5 w-3.5 text-primary" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Search Bar & Suggestion Pills */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-10 h-11 text-sm bg-background"
              placeholder="Search by keywords, tags, FIR section, or document title..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <Button onClick={() => handleSearch()} size="lg" className="gap-2 shrink-0 shadow-sm">
            <Search className="h-4 w-4" />
            Search Records
          </Button>
        </div>

        {/* Quick Tag Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
          <span className="font-medium">Quick Tags:</span>
          {sampleTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => handleSearch(tag)}
              className="px-2.5 py-1 rounded-full border border-border bg-muted/40 hover:bg-muted text-foreground transition-colors font-mono"
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      {/* Default State — How It Works */}
      {!query && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: Key,
              title: 'HMAC Trapdoor Index',
              desc: 'Your keywords are transformed into cryptographic HMAC tokens before being sent to the server — the server never sees plaintext.',
              color: 'text-primary',
              bg: 'bg-primary/5',
            },
            {
              icon: Shield,
              title: 'Role-Scoped Results',
              desc: 'Results are automatically filtered to only documents within your assigned case files and role-based access permissions.',
              color: 'text-emerald-600',
              bg: 'bg-emerald-50',
            },
            {
              icon: FileText,
              title: 'Full Evidence Coverage',
              desc: 'Search across FIRs, forensic reports, witness statements, charge sheets, and all other case records in your jurisdiction.',
              color: 'text-amber-600',
              bg: 'bg-amber-50',
            },
          ].map(({ icon: Icon, title, desc, color, bg }) => (
            <div
              key={title}
              className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3"
            >
              <div className={`h-9 w-9 rounded-lg ${bg} ${color} flex items-center justify-center`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Loading State */}
      {query && isLoading && (
        <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          <p className="text-sm font-mono">Evaluating cryptographic trapdoor index for '{query}'…</p>
        </div>
      )}

      {/* No Results */}
      {query && !isLoading && results.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-12 text-center space-y-3 shadow-sm">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto">
            <SearchIcon className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-base font-semibold text-foreground">No records matched query '{query}'</p>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
            No matching documents found in your assigned case scope. Try searching for other tags or broader case identifiers.
          </p>
        </div>
      )}

      {/* Results Grid */}
      {query && !isLoading && results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Found <strong className="text-foreground">{results.length}</strong> matching document(s) for query{' '}
              <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-xs text-foreground">"{query}"</code>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {results.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                onView={() => navigate(`/documents/${doc.id}`)}
                onVerify={() => navigate(`/documents/${doc.id}/verify`)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
