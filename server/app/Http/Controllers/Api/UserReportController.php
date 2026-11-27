<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ReportExportService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class UserReportController extends Controller
{
    public function __construct(private readonly ReportExportService $reportExportService)
    {
    }

    public function summary(Request $request)
    {
        [$tasks, $start, $end, $status, $timezone] = $this->filteredTasks($request);
        $summary = $this->summaryFor($tasks, $timezone);
        $daily = $tasks->groupBy(fn ($task) => $task->created_at->copy()->timezone($timezone)->format('Y-m-d'))
            ->map(fn ($group, $date) => ['date' => $date, 'created' => $group->count()])->values();
        $categories = $this->categoriesFor($tasks);

        return response()->json([
            'filters' => ['start_date' => $start->toDateString(), 'end_date' => $end->toDateString(), 'status' => $status],
            'summary' => $summary,
            'status_distribution' => $this->statusDistributionFor($summary),
            'by_category' => $categories,
            'activity' => $daily,
        ]);
    }

    public function download(Request $request): Response
    {
        $filters = $request->validate([
            'period' => ['nullable', Rule::in(['weekly', 'monthly'])],
            'start_date' => ['required_without:period', 'date'],
            'end_date' => ['required_without:period', 'date', 'after_or_equal:start_date'],
            'status' => ['sometimes', Rule::in(['all', 'pending', 'completed'])],
        ]);
        $period = $filters['period'] ?? null;
        $request->merge([
            'start_date' => $filters['start_date'] ?? ($period === 'weekly' ? now()->startOfWeek()->toDateString() : now()->startOfMonth()->toDateString()),
            'end_date' => $filters['end_date'] ?? ($period === 'weekly' ? now()->endOfWeek()->toDateString() : now()->endOfMonth()->toDateString()),
            'status' => $filters['status'] ?? 'all',
        ]);
        [$tasks, $start, $end, $status, $timezone] = $this->filteredTasks($request);
        $user = $request->user();
        $summary = $this->summaryFor($tasks, $timezone);
        $statusDistribution = $this->statusDistributionFor($summary);
        $categories = $this->categoriesFor($tasks);
        $activities = $user->auditLogs()->whereBetween('created_at', [$start->copy()->timezone(config('app.timezone')), $end->copy()->timezone(config('app.timezone'))])->whereIn('action', ['task_create', 'task_update', 'task_delete', 'task_toggle_complete'])->latest()->take(12)->get();
        $analyses = $user->decisionAnalyses()->whereBetween('created_at', [$start->copy()->timezone(config('app.timezone')), $end->copy()->timezone(config('app.timezone'))])->latest()->take(8)->get();
        $e = fn ($value) => htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
        $categoryRows = $categories->map(fn ($item) => '<tr><td>'.$e($item['category']).'</td><td>'.$item['count'].'</td></tr>')->implode('');
        $statusRows = collect($statusDistribution)->map(fn ($item) => '<tr><td>'.$e(ucfirst($item['status'])).'</td><td>'.$item['count'].'</td><td>'.$item['percentage'].'%</td></tr>')->implode('');
        $activityRows = $activities->map(function ($item) use ($e, $timezone) {
            return '<tr><td>'.$e(\App\Services\ReportTimestampFormatter::format($item->created_at, $timezone)).'</td><td>'.$e(str_replace('_', ' ', $item->action)).'</td><td>'.$e(data_get($item->metadata, 'title', '—')).'</td></tr>';
        })->implode('');
        $analysisRows = $analyses->map(fn ($item) => '<tr><td>'.$e(\App\Services\ReportTimestampFormatter::format($item->created_at, $timezone)).'</td><td>'.$e($item->total_selected).' tasks analyzed</td><td>'.$e(data_get($item->recommendation, 'task_title', data_get($item->recommendation, 'title', 'See Decision Lab history'))).'</td></tr>')->implode('');
        $logo = $this->reportExportService->logoDataUri();
        $logoMarkup = $logo ? '<img class="logo" src="'.$logo.'" alt="Contextify">' : '<strong class="brand">Contextify</strong>';
        $statusChart = '<img class="chart-image" src="'.$this->reportExportService->svgDataUri($this->reportExportService->statusPieSvg($statusDistribution)).'" alt="Task status distribution chart">';
        $categoryChart = '<img class="chart-image" src="'.$this->reportExportService->svgDataUri($this->reportExportService->categoryBarSvg($categories->all())).'" alt="Tasks by category chart">';
        $html = '<html><head><meta charset="utf-8"><style>body{font-family:DejaVu Sans,sans-serif;color:#202a32;font-size:10px;margin:28px}h1{color:#172554;margin:0 0 4px;font-size:18px}h2{margin-top:20px;border-bottom:1px solid #ccd5d8;padding-bottom:5px;font-size:13px}table{width:100%;border-collapse:collapse}td,th{padding:6px;border-bottom:1px solid #e3e8e9;text-align:left}.grid td{width:25%;background:#eff7f5;font-size:13px;font-weight:bold}.muted{color:#64737a}.header{width:100%;border-collapse:collapse;border-bottom:2px solid #dbeafe;margin-bottom:12px}.header td{vertical-align:middle;padding-bottom:12px}.logo-cell{width:165px}.logo{width:145px;height:54px}.brand{font-size:20px;color:#0e7490}.chart-row{width:100%;border-collapse:collapse}.chart-row td{width:50%;vertical-align:top;padding:4px 12px 4px 0}.chart-image{width:100%;height:auto}.small{font-size:9px;color:#64737a}.foot{position:fixed;bottom:-12px;color:#64737a;font-size:9px}</style></head><body>'
            .'<table class="header"><tr><td class="logo-cell">'.$logoMarkup.'</td><td><h1>User Activity Report</h1><div class="muted">'.$e($user->name).' · '.$e($user->email).'<br>Period: '.$e($start->format('M j, Y')).' – '.$e($end->format('M j, Y')).' · Status: '.$e(ucfirst($status)).'<br>Timezone: '.$e($timezone).'<br>Generated: '.$e(now($timezone)->format('M j, Y H:i')).'</div></td></tr></table>'
            .'<h2>Task overview</h2><table class="grid"><tr><td>Total<br>'.$summary['total'].'</td><td>Completed<br>'.$summary['completed'].'</td><td>Pending<br>'.$summary['pending'].'</td><td>Overdue<br>'.$summary['overdue'].'</td></tr></table><p>Completion rate: '.$summary['completion_rate'].'%</p>'
            .'<table class="chart-row"><tr><td><h2>Task status distribution</h2>'.$statusChart.'<table><tr><th>Status</th><th>Count</th><th>Share</th></tr>'.$statusRows.'</table></td><td><h2>Tasks by category</h2>'.$categoryChart.'<table><tr><th>Category</th><th>Tasks</th></tr>'.$categoryRows.'</table></td></tr></table>'
            .'<h2>Recent task activity</h2><table><tr><th>Date</th><th>Activity</th><th>Task</th></tr>'.$activityRows.'</table>'
            .'<h2>Prioritization history</h2><table><tr><th>Date</th><th>Analysis</th><th>Recommendation</th></tr>'.$analysisRows.'</table><div class="foot">Contextify · Generated '.$e(now($timezone)->format('Y-m-d H:i')).'</div></body></html>';
        abort_unless(class_exists(\Dompdf\Dompdf::class), 503, 'PDF generation is unavailable. Install backend dependencies first.');
        $pdf = new \Dompdf\Dompdf();
        $pdf->loadHtml($html, 'UTF-8');
        $pdf->setPaper('A4');
        $pdf->render();
        $pdf->getCanvas()->page_text(510, 820, 'Page {PAGE_NUM} of {PAGE_COUNT}', null, 8, [0.39, 0.45, 0.55]);
        return response($pdf->output(), 200, ['Content-Type' => 'application/pdf', 'Content-Disposition' => 'attachment; filename="contextify-report.pdf"']);
    }

    private function filteredTasks(Request $request): array
    {
        $filters = $request->validate([
            'start_date' => ['required', 'date_format:Y-m-d'],
            'end_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:start_date'],
            'status' => ['sometimes', Rule::in(['all', 'pending', 'completed'])],
        ]);
        $timezone = $request->header('X-Client-Timezone', config('app.timezone'));
        if (! in_array($timezone, timezone_identifiers_list(), true)) {
            $timezone = config('app.timezone');
        }
        $start = Carbon::createFromFormat('!Y-m-d', $filters['start_date'], $timezone)->startOfDay();
        $end = Carbon::createFromFormat('!Y-m-d', $filters['end_date'], $timezone)->endOfDay();
        $status = $filters['status'] ?? 'all';
        $query = $request->user()->tasks()->whereBetween('created_at', [
            $start->copy()->timezone(config('app.timezone')),
            $end->copy()->timezone(config('app.timezone')),
        ]);
        if ($status !== 'all') {
            $query->where('status', $status);
        }
        return [$query->orderBy('created_at')->get(['id', 'status', 'category', 'due_date', 'created_at']), $start, $end, $status, $timezone];
    }

    private function summaryFor($tasks, string $timezone): array
    {
        $total = $tasks->count();
        $completed = $tasks->where('status', 'completed')->count();
        $today = now($timezone)->startOfDay();

        return [
            'total' => $total,
            'completed' => $completed,
            'pending' => $tasks->where('status', 'pending')->count(),
            'overdue' => $tasks->where('status', 'pending')->filter(fn ($task) => $task->due_date && $task->due_date->lt($today))->count(),
            'completion_rate' => $total ? round($completed / $total * 100, 1) : 0,
        ];
    }

    private function statusDistributionFor(array $summary): array
    {
        return collect(['completed' => $summary['completed'], 'pending' => $summary['pending']])
            ->map(fn ($count, $status) => [
                'status' => $status,
                'count' => $count,
                'percentage' => $summary['total'] ? round($count / $summary['total'] * 100, 1) : 0,
            ])->values()->all();
    }

    private function categoriesFor($tasks)
    {
        return $tasks->groupBy(fn ($task) => $task->category ?: 'Uncategorized')
            ->map(fn ($group, $category) => ['category' => $category, 'count' => $group->count()])->values();
    }
}
