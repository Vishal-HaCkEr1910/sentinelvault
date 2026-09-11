import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, SearchIcon } from 'lucide-react';
import { useSearchDocuments } from '@/hooks/useDocuments';
import { DocumentCard } from '@/components/shared/DocumentCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SearchPage() {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState('');
  const [query, setQuery] = useState('');

  const { data: results = [], isLoading } = useSearchDocuments(query);

  const handleSearch = () => {
    setQuery(inputValue.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Search documents by keyword..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <Button onClick={handleSearch} className="gap-2">
          <Search className="h-4 w-4" />
          Search
        </Button>
      </div>

      {!query && (
        <div className="text-center py-16 text-gray-400 space-y-2">
          <SearchIcon className="h-10 w-10 mx-auto text-gray-200" />
          <p className="text-base font-medium text-gray-500">🔍 Search across encrypted documents</p>
          <p className="text-sm">Enter keywords above to find documents you have access to.</p>
          <p className="text-xs text-gray-400">Note: Search is performed server-side with encrypted index.</p>
        </div>
      )}

      {query && isLoading && (
        <p className="text-sm text-gray-500">Searching...</p>
      )}

      {query && !isLoading && results.length === 0 && (
        <div className="text-center py-12 text-gray-400 space-y-2">
          <p className="text-base font-medium">No documents matched '{query}'</p>
          <p className="text-sm">Try different keywords or check your case assignments.</p>
        </div>
      )}

      {query && !isLoading && results.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Found <strong>{results.length}</strong> document(s) for '{query}'
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
