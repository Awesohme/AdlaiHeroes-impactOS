import Link from "next/link";
import type { EvidenceRow } from "@/lib/evidence";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle2, FileText, Image as ImageIcon, Video, Sheet as SheetIcon, File, ExternalLink } from "lucide-react";

export function EvidenceOverview({
  rows,
  source,
  error,
  created,
}: {
  rows: EvidenceRow[];
  source: "supabase" | "mock";
  error?: string;
  created?: boolean;
}) {
  const metrics = {
    total: rows.length,
    verified: rows.filter((item) => item.status === "Verified").length,
    review: rows.filter((item) => item.status === "In review").length,
    consent: rows.filter((item) => item.status === "Consent check").length,
  };

  const counters = [
    { label: "Total", value: metrics.total, hint: "Records linked to Drive" },
    { label: "Verified", value: metrics.verified, hint: "Ready for use" },
    { label: "In review", value: metrics.review, hint: "Awaiting review" },
    { label: "Consent check", value: metrics.consent, hint: "Hold until confirmed" },
  ];

  return (
    <div className="space-y-6">
      {created ? (
        <div className="flex gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
          <span>Evidence uploaded — file is in Drive and metadata saved to Supabase.</span>
        </div>
      ) : null}

      {source === "mock" ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {error ?? "Showing fallback data."}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {counters.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tracking-tight">{stat.value}</div>
              <p className="mt-1 text-xs text-muted-foreground">{stat.hint}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader className="border-b flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Register</CardTitle>
          <Link
            href="/evidence/new"
            prefetch={false}
            className="text-sm font-medium text-primary hover:underline"
          >
            Upload next →
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Evidence</TableHead>
                <TableHead>Linked record</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Uploaded by</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16 text-right">Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-sm text-muted-foreground">
                    No evidence yet — upload your first record.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((record) => (
                  <TableRow key={record.code}>
                    <TableCell className="text-muted-foreground">
                      <FileTypeIcon type={record.fileType} />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{record.title}</div>
                      <div className="text-xs text-muted-foreground font-mono">{record.code}</div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {record.linkedRecord}
                    </TableCell>
                    <TableCell className="text-sm">{record.fileType}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {record.uploadedBy}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(record.status)} className="font-normal">
                        {record.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {record.driveFileId ? (
                        <a
                          href={`https://drive.google.com/file/d/${record.driveFileId}/view`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                          aria-label={`Open ${record.title} in Drive`}
                        >
                          Open <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function FileTypeIcon({ type }: { type: string }) {
  const className = "h-4 w-4";
  if (type === "Image") return <ImageIcon className={className} />;
  if (type === "Video") return <Video className={className} />;
  if (type === "PDF" || type === "Document") return <FileText className={className} />;
  if (type === "Spreadsheet") return <SheetIcon className={className} />;
  return <File className={className} />;
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "Verified") return "default";
  if (status === "Consent check") return "destructive";
  return "secondary";
}
