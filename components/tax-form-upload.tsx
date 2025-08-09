
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface TaxFormUploadProps {
  taxReturnId: string;
  onUploadComplete?: (documentId: string) => void;
}

export function TaxFormUpload({ taxReturnId, onUploadComplete }: TaxFormUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string>('');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('taxReturnId', taxReturnId);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const response = await fetch('/api/tax-forms/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }

      const result = await response.json();
      toast.success('File uploaded successfully');

      // Start processing immediately after upload
      setProcessing(true);
      await processDocument(result.documentId);

      if (onUploadComplete) {
        onUploadComplete(result.documentId);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setUploading(false);
      setProcessing(false);
      setFile(null);
      setUploadProgress(0);
    }
  };

  const processDocument = async (documentId: string) => {
    try {
      const response = await fetch(`/api/tax-forms/process/${documentId}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Processing failed');
      }

      const result = await response.json();
      toast.success('Document processed successfully');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Processing failed';
      toast.error(errorMessage);
    }
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Tax Form
        </CardTitle>
        <CardDescription>
          Upload your 1099 forms (NEC, INT, DIV, MISC, R) and other tax documents
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tax-form">Select Tax Document</Label>
          <Input
            id="tax-form"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileSelect}
            disabled={uploading || processing}
          />
          <p className="text-sm text-muted-foreground">
            Supported formats: PDF, JPG, JPEG, PNG (max 10MB)
          </p>
        </div>

        {file && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <FileText className="h-4 w-4" />
            <span className="text-sm font-medium">{file.name}</span>
            <span className="text-xs text-muted-foreground">
              ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </span>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {(uploading || processing) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>
                {uploading ? 'Uploading...' : processing ? 'Processing...' : 'Complete'}
              </span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="w-full" />
            {processing && (
              <p className="text-sm text-muted-foreground">
                Extracting data using OCR and parsing form fields...
              </p>
            )}
          </div>
        )}

        <Button
          onClick={handleUpload}
          disabled={!file || uploading || processing}
          className="w-full"
        >
          {uploading ? (
            'Uploading...'
          ) : processing ? (
            'Processing...'
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload & Process
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
