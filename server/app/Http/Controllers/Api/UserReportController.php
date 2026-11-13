<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class UserReportController extends Controller
{
    public function download(Request $request): Response
    {
        $period = $request->validate(['period' => 'required|in:weekly,monthly'])['period'];
        $user = $request->user();
        $start = $period === 'weekly' ? now()->startOfWeek() : now()->startOfMonth();
        $end = $period === 'weekly' ? now()->endOfWeek() : now()->endOfMonth();
        $tasks = $user->tasks()->whereBetween('created_at', [$start, $end])->orderByDesc('updated_at')->get();
        $total = $tasks->count();
        $completed = $tasks->where('status', 'completed')->count();
        $pending = $tasks->where('status', 'pending')->count();
        $overdue = $tasks->where('status', 'pending')->filter(fn ($task) => $task->due_date && $task->due_date->lt(now()->startOfDay()))->count();
        $categories = $tasks->groupBy(fn ($task) => $task->category ?: 'Uncategorized')->map->count();
        $activities = $user->auditLogs()->whereBetween('created_at', [$start, $end])->whereIn('action', ['task_create', 'task_update', 'task_delete', 'task_toggle_complete'])->latest()->take(12)->get();
        $analyses = $user->decisionAnalyses()->whereBetween('created_at', [$start, $end])->latest()->take(8)->get();
        $e = fn ($value) => htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
        $categoryRows = $categories->map(fn ($count, $name) => '<tr><td>'.$e($name).'</td><td>'.$count.'</td></tr>')->implode('');
        $activityRows = $activities->map(function ($item) use ($e) {
            return '<tr><td>'.$e($item->created_at->format('M j, Y H:i')).'</td><td>'.$e(str_replace('_', ' ', $item->action)).'</td><td>'.$e(data_get($item->metadata, 'title', '—')).'</td></tr>';
        })->implode('');
        $analysisRows = $analyses->map(fn ($item) => '<tr><td>'.$e($item->created_at->format('M j, Y H:i')).'</td><td>'.$e($item->total_selected).' tasks analyzed</td><td>'.$e(data_get($item->recommendation, 'task_title', data_get($item->recommendation, 'title', 'See Decision Lab history'))).'</td></tr>')->implode('');
        $html = '<html><head><style>body{font-family:DejaVu Sans,sans-serif;color:#202a32;font-size:11px}h1{color:#147d70;margin-bottom:4px}h2{margin-top:24px;border-bottom:1px solid #ccd5d8;padding-bottom:5px}table{width:100%;border-collapse:collapse}td,th{padding:7px;border-bottom:1px solid #e3e8e9;text-align:left}.grid td{width:25%;background:#eff7f5;font-size:14px;font-weight:bold}.muted{color:#64737a}</style></head><body>'
            .'<h1>Contextify Activity Report</h1><div class="muted">'.$e($user->name).' · '.$e($user->email).'<br>Period: '.$e(ucfirst($period)).' ('.$e($start->format('M j, Y')).' – '.$e($end->format('M j, Y')).')<br>Generated: '.$e(now()->format('M j, Y H:i')).'</div>'
            .'<h2>Task overview</h2><table class="grid"><tr><td>Total<br>'.$total.'</td><td>Completed<br>'.$completed.'</td><td>Pending<br>'.$pending.'</td><td>Overdue<br>'.$overdue.'</td></tr></table><p>Completion rate: '.($total ? round($completed / $total * 100, 1) : 0).'%</p>'
            .'<h2>Tasks by category</h2><table><tr><th>Category</th><th>Tasks</th></tr>'.$categoryRows.'</table>'
            .'<h2>Recent task activity</h2><table><tr><th>Date</th><th>Activity</th><th>Task</th></tr>'.$activityRows.'</table>'
            .'<h2>Prioritization history</h2><table><tr><th>Date</th><th>Analysis</th><th>Recommendation</th></tr>'.$analysisRows.'</table></body></html>';
        abort_unless(class_exists(\Dompdf\Dompdf::class), 503, 'PDF generation is unavailable. Install backend dependencies first.');
        $pdf = new \Dompdf\Dompdf();
        $pdf->loadHtml($html, 'UTF-8');
        $pdf->setPaper('A4');
        $pdf->render();
        return response($pdf->output(), 200, ['Content-Type' => 'application/pdf', 'Content-Disposition' => 'attachment; filename="contextify-'.$period.'-report.pdf"']);
    }
}
