<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\ReportExportService;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminReportController extends Controller
{
    public function __construct(private readonly ReportExportService $exportService)
    {
    }

    public function export(Request $request): Response|StreamedResponse
    {
        $validated = $request->validate([
            'type' => 'required|in:users,tasks,decisions,priority,weather',
            'format' => 'required|in:csv,xlsx,pdf',
        ]);

        $type = $validated['type'];
        $format = $validated['format'];
        $date = now()->format('Y-m-d');
        $basename = "{$type}_report_{$date}";

        return match ($format) {
            'csv' => $this->exportCsv($type, "{$basename}.csv"),
            'xlsx' => response($this->exportService->buildSpreadsheetXml($type), 200, [
                'Content-Type' => 'application/vnd.ms-excel',
                'Content-Disposition' => "attachment; filename=\"{$basename}.xls\"",
            ]),
            'pdf' => $this->exportPdf($type, "{$basename}.pdf"),
        };
    }

    private function exportCsv(string $type, string $filename): StreamedResponse
    {
        return response()->streamDownload(function () use ($type) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, $this->exportService->headers($type));
            foreach ($this->exportService->rows($type) as $row) {
                fputcsv($handle, $row);
            }
            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    private function exportPdf(string $type, string $filename): Response
    {
        $html = $this->exportService->buildHtml($type);

        if (class_exists(\Dompdf\Dompdf::class)) {
            $dompdf = new \Dompdf\Dompdf();
            $dompdf->loadHtml($html);
            $dompdf->setPaper('A4', 'landscape');
            $dompdf->render();

            return response($dompdf->output(), 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            ]);
        }

        return response($html, 200, [
            'Content-Type' => 'text/html',
            'Content-Disposition' => "inline; filename=\"{$filename}.html\"",
        ]);
    }
}
