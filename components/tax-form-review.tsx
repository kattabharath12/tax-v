
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  Edit3, 
  Save, 
  X, 
  FileText,
  DollarSign,
  Building,
  Hash
} from 'lucide-react';
import { toast } from 'sonner';

interface ExtractedEntry {
  id: string;
  entryType: string;
  extractedData: any;
  isAccepted: boolean;
  isEdited: boolean;
}

interface TaxFormReviewProps {
  documentId: string;
  onReviewComplete?: () => void;
}

export function TaxFormReview({ documentId, onReviewComplete }: TaxFormReviewProps) {
  const [entries, setEntries] = useState<ExtractedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, any>>({});
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchExtractedEntries();
  }, [documentId]);

  const fetchExtractedEntries = async () => {
    try {
      const response = await fetch(`/api/tax-forms/process/${documentId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch extracted entries');
      }

      const result = await response.json();
      if (result.extractedEntries) {
        setEntries(result.extractedEntries);
        // Auto-select all entries by default
        setSelectedEntries(new Set(result.extractedEntries.map((e: ExtractedEntry) => e.id)));
      }
    } catch (error) {
      console.error('Error fetching entries:', error);
      toast.error('Failed to fetch extracted data');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (entryId: string, field: string, value: any) => {
    setEdits(prev => ({
      ...prev,
      [entryId]: {
        ...prev[entryId],
        [field]: value
      }
    }));
  };

  const handleToggleSelection = (entryId: string) => {
    setSelectedEntries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
  };

  const handleSubmit = async () => {
    if (selectedEntries.size === 0) {
      toast.error('Please select at least one entry to accept');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/tax-forms/accept-entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          extractedEntryIds: Array.from(selectedEntries),
          edits: edits
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to accept entries');
      }

      const result = await response.json();
      toast.success('Entries accepted and added to your tax return');

      if (onReviewComplete) {
        onReviewComplete();
      }

    } catch (error) {
      console.error('Error accepting entries:', error);
      toast.error('Failed to accept entries');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Loading extracted data...</span>
        </CardContent>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No data was extracted from this document.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Review Extracted Data</CardTitle>
          <CardDescription>
            Review and edit the data extracted from your tax form before adding it to your return.
          </CardDescription>
        </CardHeader>
      </Card>

      {entries.map((entry) => (
        <Card key={entry.id} className={`transition-all ${selectedEntries.has(entry.id) ? 'ring-2 ring-primary' : ''}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedEntries.has(entry.id)}
                  onChange={() => handleToggleSelection(entry.id)}
                  className="h-4 w-4"
                />
                <CardTitle className="text-base">
                  {entry.entryType} Entry
                </CardTitle>
                <Badge variant={entry.entryType === 'INCOME' ? 'default' : 'secondary'}>
                  {entry.entryType}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingEntry(editingEntry === entry.id ? null : entry.id)}
              >
                {editingEntry === entry.id ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {editingEntry === entry.id ? (
              // Edit mode
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`description-${entry.id}`}>Description</Label>
                    <Input
                      id={`description-${entry.id}`}
                      value={edits[entry.id]?.description || entry.extractedData.description || ''}
                      onChange={(e) => handleEdit(entry.id, 'description', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`amount-${entry.id}`}>Amount</Label>
                    <Input
                      id={`amount-${entry.id}`}
                      type="number"
                      step="0.01"
                      value={edits[entry.id]?.amount || entry.extractedData.amount || 0}
                      onChange={(e) => handleEdit(entry.id, 'amount', parseFloat(e.target.value))}
                    />
                  </div>
                </div>
                {entry.extractedData.payerName && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`payer-${entry.id}`}>Payer Name</Label>
                      <Input
                        id={`payer-${entry.id}`}
                        value={edits[entry.id]?.payerName || entry.extractedData.payerName || ''}
                        onChange={(e) => handleEdit(entry.id, 'payerName', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`tin-${entry.id}`}>Payer TIN</Label>
                      <Input
                        id={`tin-${entry.id}`}
                        value={edits[entry.id]?.payerTIN || entry.extractedData.payerTIN || ''}
                        onChange={(e) => handleEdit(entry.id, 'payerTIN', e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // View mode
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="font-semibold">
                    ${(edits[entry.id]?.amount || entry.extractedData.amount || 0).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {edits[entry.id]?.description || entry.extractedData.description}
                </p>
                {(entry.extractedData.payerName || edits[entry.id]?.payerName) && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building className="h-3 w-3" />
                    <span>{edits[entry.id]?.payerName || entry.extractedData.payerName}</span>
                    {(entry.extractedData.payerTIN || edits[entry.id]?.payerTIN) && (
                      <>
                        <Hash className="h-3 w-3 ml-2" />
                        <span>{edits[entry.id]?.payerTIN || entry.extractedData.payerTIN}</span>
                      </>
                    )}
                  </div>
                )}
                {edits[entry.id] && (
                  <Badge variant="outline" className="text-xs">
                    Edited
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-between items-center pt-4">
        <div className="text-sm text-muted-foreground">
          {selectedEntries.size} of {entries.length} entries selected
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setSelectedEntries(new Set())}
          >
            Deselect All
          </Button>
          <Button
            variant="outline"
            onClick={() => setSelectedEntries(new Set(entries.map(e => e.id)))}
          >
            Select All
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || selectedEntries.size === 0}
          >
            {submitting ? 'Accepting...' : `Accept ${selectedEntries.size} Entries`}
          </Button>
        </div>
      </div>
    </div>
  );
}
