'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, XCircle, Download } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ExcelImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: () => void;
}

export function ExcelImportDialog({
  open,
  onOpenChange,
  onImportComplete,
}: ExcelImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
      ];
      
      if (!validTypes.includes(selectedFile.type) && 
          !selectedFile.name.endsWith('.xlsx') && 
          !selectedFile.name.endsWith('.xls') &&
          !selectedFile.name.endsWith('.csv')) {
        alert('Please select a valid Excel file (.xlsx, .xls, .csv)');
        return;
      }

      setFile(selectedFile);
      setResults(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      alert('Please select a file first');
      return;
    }

    setImporting(true);
    setResults(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('update_existing', updateExisting.toString());

      const response = await fetch('/api/items/import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setResults(data.results);
        
        if (data.results.success > 0 && onImportComplete) {
          onImportComplete();
        }
      } else {
        alert(data.error || 'Import failed');
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('An error occurred during import');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResults(null);
    setUpdateExisting(true);
    onOpenChange(false);
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/items/template');
      
      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = 'items_import_template.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(a);
      } else {
        alert('Template download failed');
      }
    } catch (error) {
      console.error('Error downloading template:', error);
      alert('An error occurred during template download');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Import Items from Excel</DialogTitle>
              <DialogDescription>
                Upload an Excel file to batch import items. Supports .xlsx, .xls, .csv formats.
              </DialogDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              disabled={importing}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="excel-file">Select Excel File</Label>
            <div className="flex items-center gap-2">
              <Input
                id="excel-file"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                disabled={importing}
              />
              {file && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>{file.name}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="update-existing"
              checked={updateExisting}
              onCheckedChange={(checked) => setUpdateExisting(checked as boolean)}
              disabled={importing}
            />
            <Label
              htmlFor="update-existing"
              className="text-sm font-normal cursor-pointer"
            >
              Update existing items (matched by ID)
            </Label>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="text-sm space-y-2">
                <p className="font-medium">Excel file format requirements:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-600">
                  <li>Required columns: Name</li>
                  <li>Optional columns: ID (for updates), Description, Status</li>
                  <li>Status must be: active, inactive, or pending</li>
                  <li>First row should be column headers</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          {results && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm text-slate-600">Total</div>
                  <div className="text-2xl font-bold text-blue-600">{results.total}</div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-1 text-sm text-slate-600">
                    <CheckCircle2 className="h-3 w-3" />
                    Success
                  </div>
                  <div className="text-2xl font-bold text-green-600">{results.success}</div>
                  <div className="text-xs text-slate-500">
                    Created: {results.created} | Updated: {results.updated}
                  </div>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-1 text-sm text-slate-600">
                    <XCircle className="h-3 w-3" />
                    Failed
                  </div>
                  <div className="text-2xl font-bold text-red-600">{results.failed}</div>
                </div>
              </div>

              {results.errors && results.errors.length > 0 && (
                <div className="max-h-48 overflow-y-auto border rounded-lg p-3 bg-slate-50">
                  <div className="text-sm font-medium mb-2">Error Details:</div>
                  <div className="space-y-2">
                    {results.errors.slice(0, 10).map((error: any, index: number) => (
                      <div key={index} className="text-xs text-red-600 border-l-2 border-red-300 pl-2">
                        <div className="font-medium">Row {error.row}:</div>
                        <div>{error.error}</div>
                      </div>
                    ))}
                    {results.errors.length > 10 && (
                      <div className="text-xs text-slate-500 italic">
                        ...and {results.errors.length - 10} more errors
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={importing}
          >
            {results ? 'Close' : 'Cancel'}
          </Button>
          {!results && (
            <Button
              onClick={handleImport}
              disabled={!file || importing}
            >
              {importing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Start Import
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
