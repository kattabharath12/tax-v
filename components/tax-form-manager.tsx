
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  Download, 
  Eye, 
  Trash2, 
  Upload,
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw
} from 'lucide-react';
import { TaxFormUpload } from './tax-form-upload';
import { TaxFormReview } from './tax-form-review';
import { toast } from 'sonner';

interface Document {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  documentType: string;
  processingStatus: string;
  createdAt: string;
  extractedEntries?: any[];
}

interface TaxFormManagerProps {
  taxReturnId: string;
}

export function TaxFormManager({ taxReturnId }: TaxFormManagerProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [reviewingDocument, setReviewingDocument] = useState<string | null>(null);
  const [generatingForm1040, setGeneratingForm1040] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [taxReturnId]);

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`/api/tax-returns/${taxReturnId}/documents`);
      if (response.ok) {
        const result = await response.json();
        setDocuments(result.documents || []);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = (documentId: string) => {
    setShowUpload(false);
    fetchDocuments();
    setReviewingDocument(documentId);
  };

  const handleReviewComplete = () => {
    setReviewingDocument(null);
    fetchDocuments();
    toast.success('Tax form data has been added to your return');
  };

  const handleGenerateForm1040 = async () => {
    setGeneratingForm1040(true);
    try {
      const response = await fetch('/api/tax-forms/generate-1040', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taxReturnId }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate Form 1040');
      }

      const result = await response.json();
      toast.success('Form 1040 generated successfully');
      
      // Download the file
      window.open(result.downloadUrl, '_blank');
      
    } catch (error) {
      console.error('Error generating Form 1040:', error);
      toast.error('Failed to generate Form 1040');
    } finally {
      setGeneratingForm1040(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'FAILED':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'PROCESSING':
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      COMPLETED: 'default',
      FAILED: 'destructive',
      PROCESSING: 'secondary',
      PENDING: 'outline'
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status.toLowerCase()}
      </Badge>
    );
  };

  if (reviewingDocument) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Review Extracted Data</h3>
          <Button
            variant="outline"
            onClick={() => setReviewingDocument(null)}
          >
            Back to Documents
          </Button>
        </div>
        <TaxFormReview
          documentId={reviewingDocument}
          onReviewComplete={handleReviewComplete}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Tax Forms & Documents</h2>
          <p className="text-muted-foreground">
            Upload and manage your 1099 forms and other tax documents
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleGenerateForm1040}
            disabled={generatingForm1040}
            variant="default"
          >
            {generatingForm1040 ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Generate Form 1040
              </>
            )}
          </Button>
          <Button onClick={() => setShowUpload(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Tax Form
          </Button>
        </div>
      </div>

      {showUpload && (
        <div className="flex justify-center">
          <div className="w-full max-w-lg">
            <TaxFormUpload
              taxReturnId={taxReturnId}
              onUploadComplete={handleUploadComplete}
            />
            <div className="mt-4 text-center">
              <Button
                variant="outline"
                onClick={() => setShowUpload(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading documents...</span>
          </CardContent>
        </Card>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Documents Uploaded</h3>
            <p className="text-muted-foreground mb-4">
              Upload your 1099 forms and other tax documents to get started
            </p>
            <Button onClick={() => setShowUpload(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Your First Document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {documents.map((document) => (
            <Card key={document.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5" />
                    <div>
                      <CardTitle className="text-base">{document.fileName}</CardTitle>
                      <CardDescription>
                        {document.documentType.replace(/_/g, ' ')} • 
                        {(document.fileSize / 1024 / 1024).toFixed(2)} MB
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(document.processingStatus)}
                    {getStatusBadge(document.processingStatus)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Uploaded: {new Date(document.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex gap-2">
                    {document.processingStatus === 'COMPLETED' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setReviewingDocument(document.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Review Data
                      </Button>
                    )}
                    {document.processingStatus === 'FAILED' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // Retry processing
                          fetch(`/api/tax-forms/process/${document.id}`, { method: 'POST' })
                            .then(() => {
                              toast.success('Processing restarted');
                              fetchDocuments();
                            })
                            .catch(() => toast.error('Failed to restart processing'));
                        }}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Retry
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
