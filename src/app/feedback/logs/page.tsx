"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

export default function FeedbackLogs() {
  // Mock data for display
  const logs = [
    { id: 1, type: "Suggestion", msg: "Add more sci-fi books", date: "2024-02-01", status: "Review" },
    { id: 2, type: "Complaint", msg: "AC too cold in reading hall", date: "2024-01-28", status: "Resolved" },
    { id: 3, type: "Request", msg: "Need more plug points", date: "2024-01-25", status: "Pending" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground p-8 font-mono">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" className="p-2 hover:bg-muted rounded-full transition">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Feedback Logs</h1>
        </div>

        {/* Table */}
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-muted text-muted-foreground border-b border-border">
              <tr>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Message</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-border hover:bg-muted/50 transition">
                  <td className="px-6 py-4 font-medium">{log.type}</td>
                  <td className="px-6 py-4">{log.msg}</td>
                  <td className="px-6 py-4 text-muted-foreground">{log.date}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium 
                      ${log.status === 'Resolved' ? 'bg-green-500/10 text-green-500' : 
                        log.status === 'Pending' ? 'bg-yellow-500/10 text-yellow-500' : 
                        'bg-blue-500/10 text-blue-500'}`}>
                      {log.status === 'Resolved' && <CheckCircle2 className="h-3 w-3" />}
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}