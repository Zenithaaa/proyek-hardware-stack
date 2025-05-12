"use client";

import * as React from "react";
import { toast } from "sonner";
import { FileUp, FileDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { importFromExcel, exportToExcel, exportToPDF } from "@/lib/utils/excel";

interface ImportExportDialogProps {
  type: "import" | "export";
  onSuccess?: () => void;
}

export function ImportExportDialog({
  type,
  onSuccess,
}: ImportExportDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [exportFormat, setExportFormat] = React.useState<"excel" | "pdf">(
    "excel"
  );
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const result = await importFromExcel(file);
      if (result.success) {
        toast.success(result.message);
        setOpen(false);
        onSuccess?.();
      } else {
        toast.error(
          <div className="space-y-2">
            <p>{result.message}</p>
            {result.errors && result.errors.length > 0 && (
              <ul className="list-disc pl-4 text-sm">
                {result.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            )}
          </div>
        );
      }
    } catch (error) {
      toast.error("Terjadi kesalahan saat mengimport data");
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleExport = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/export?format=${exportFormat}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Terjadi kesalahan saat mengexport data"
        );
      }

      const blob = await response.blob();
      const filename = `inventaris_${new Date().toISOString().split("T")[0]}.${
        exportFormat === "excel" ? "xlsx" : "pdf"
      }`;

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("File berhasil diexport");
      setOpen(false);
    } catch (error) {
      console.error("Export error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat mengexport data"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          {type === "import" ? (
            <>
              <FileUp className="mr-2 h-4 w-4" />
              Import
            </>
          ) : (
            <>
              <FileDown className="mr-2 h-4 w-4" />
              Export
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md mx-auto p-4 sm:p-6 md:p-8">
        <DialogHeader>
          <DialogTitle>
            {type === "import"
              ? "Import Data Inventaris"
              : "Export Data Inventaris"}
          </DialogTitle>
          <DialogDescription>
            {type === "import"
              ? "Upload file Excel (.xlsx) yang berisi data inventaris untuk diimport."
              : "Download data inventaris dalam format yang diinginkan."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {type === "import" ? (
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="file">File Excel</Label>
              <Input
                ref={fileInputRef}
                id="file"
                type="file"
                accept=".xlsx"
                onChange={handleImport}
                disabled={isProcessing}
              />
            </div>
          ) : (
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="format">Format File</Label>
              <Select
                value={exportFormat}
                onValueChange={(value) =>
                  setExportFormat(value as "excel" | "pdf")
                }
              >
                <SelectTrigger id="format">
                  <SelectValue placeholder="Pilih format file" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                  <SelectItem value="pdf">PDF (.pdf)</SelectItem>
                </SelectContent>
              </Select>

              <Button
                className="mt-4"
                onClick={handleExport}
                disabled={isProcessing}
              >
                {isProcessing ? "Memproses..." : "Download"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
