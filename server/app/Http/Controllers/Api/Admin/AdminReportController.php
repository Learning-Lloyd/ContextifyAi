<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\User;
use App\Services\ReportExportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Carbon;
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
            'type' => 'required|in:users,tasks,decisions,priority,weather,analytics',
            'format' => 'required|in:csv,xlsx,pdf',
            'period' => ['nullable', Rule::in(['weekly', 'monthly', 'custom'])],
            'start_date' => ['required_if:type,analytics', 'date_format:Y-m-d'],
            'end_date' => ['required_if:type,analytics', 'date_format:Y-m-d', 'after_or_equal:start_date'],
            'status' => ['sometimes', Rule::in(['all', 'pending', 'completed'])],
        ]);

        $type = $validated['type'];
        $format = $validated['format'];
        $date = now()->format('Y-m-d');
        $basename = "{$type}_report_{$date}";

        if ($type === 'analytics') {
            if ($format !== 'pdf') {
                throw ValidationException::withMessages(['format' => 'Administrator analytics reports are available as PDF.']);
            }

            $filters = $this->normalizedFilters($request, $validated);
            $report = $this->analyticsData($filters);
            $pdf = new \Dompdf\Dompdf();
            $pdf->loadHtml($this->exportService->buildAdminAnalyticsHtml($report, $filters), 'UTF-8');
            $pdf->setPaper('A4', 'landscape');
            $pdf->render();
            $pdf->getCanvas()->page_text(750, 570, 'Page {PAGE_NUM} of {PAGE_COUNT}', null, 8, [0.39, 0.45, 0.55]);

            return response($pdf->output(), 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="platform_analytics_'.$date.'.pdf"',
            ]);
        }

        return match ($format) {
            'csv' => $this->exportCsv($type, "{$basename}.csv"),
            'xlsx' => response($this->exportService->buildSpreadsheetXml($type), 200, [
                'Content-Type' => 'application/vnd.ms-excel',
                'Content-Disposition' => "attachment; filename=\"{$basename}.xls\"",
            ]),
            'pdf' => $this->exportPdf($type, "{$basename}.pdf"),
        };
    }

    public function summary(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'period' => ['sometimes', Rule::in(['weekly', 'monthly', 'custom'])],
            'start_date' => ['required', 'date_format:Y-m-d'],
            'end_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:start_date'],
            'status' => ['sometimes', Rule::in(['all', 'pending', 'completed'])],
        ]);
        $filters = $this->normalizedFilters($request, $validated);

        return response()->json([
            'filters' => $filters,
            ...$this->analyticsData($filters),
        ]);
    }

    private function normalizedFilters(Request $request, array $validated): array
    {
        $timezone = $request->header('X-Client-Timezone', config('app.timezone'));
        if (! in_array($timezone, timezone_identifiers_list(), true)) {
            $timezone = config('app.timezone');
        }

        return [
            'period' => $validated['period'] ?? 'custom',
            'start_date' => $validated['start_date'],
            'end_date' => $validated['end_date'],
            'status' => $validated['status'] ?? 'all',
            'timezone' => $timezone,
        ];
    }

    private function analyticsData(array $filters): array
    {
        $timezone = $filters['timezone'];
        $start = Carbon::createFromFormat('!Y-m-d', $filters['start_date'], $timezone)->startOfDay()->timezone(config('app.timezone'));
        $end = Carbon::createFromFormat('!Y-m-d', $filters['end_date'], $timezone)->endOfDay()->timezone(config('app.timezone'));
        $query = Task::query()->whereBetween('created_at', [$start, $end]);
        if ($filters['status'] !== 'all') {
            $query->where('status', $filters['status']);
        }

        $total = (clone $query)->count();
        $completed = (clone $query)->where('status', 'completed')->count();
        $pending = (clone $query)->where('status', 'pending')->count();
        $statuses = (clone $query)->select('status', \Illuminate\Support\Facades\DB::raw('COUNT(*) as count'))->groupBy('status')->pluck('count', 'status');
        $statusDistribution = collect(['completed', 'pending'])->map(fn ($status) => [
            'status' => $status,
            'count' => (int) ($statuses[$status] ?? 0),
            'percentage' => $total ? round(((int) ($statuses[$status] ?? 0)) / $total * 100, 1) : 0,
        ])->all();
        $categories = (clone $query)->selectRaw("COALESCE(NULLIF(category, ''), 'Uncategorized') as category, COUNT(*) as count")
            ->groupBy('category')->orderByDesc('count')->get()->map(fn ($row) => [
                'category' => $row->category,
                'count' => (int) $row->count,
            ])->all();

        return [
            'summary' => [
                'users_total' => User::count(),
                'users_active' => User::where('is_active', true)->count(),
                'total' => $total,
                'completed' => $completed,
                'pending' => $pending,
                'completion_rate' => $total ? round($completed / $total * 100, 1) : 0,
            ],
            'status_distribution' => $statusDistribution,
            'by_category' => $categories,
        ];
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
