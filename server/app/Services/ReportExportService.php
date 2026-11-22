<?php

namespace App\Services;

use App\Models\DecisionAnalysis;
use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ReportExportService
{
    public function headers(string $type): array
    {
        return match ($type) {
            'users' => ['ID', 'Name', 'Email', 'Role', 'Active', 'Tasks', 'Created'],
            'tasks' => ['ID', 'User', 'Title', 'Score', 'Status', 'Due Date', 'Weather'],
            'decisions' => ['ID', 'User', 'Tasks Analyzed', 'Date'],
            'priority' => ['Level', 'Count'],
            'weather' => ['Condition', 'Count'],
            default => [],
        };
    }

    public function rows(string $type): \Generator
    {
        match ($type) {
            'users' => yield from $this->userRows(),
            'tasks' => yield from $this->taskRows(),
            'decisions' => yield from $this->decisionRows(),
            'priority' => yield from $this->priorityRows(),
            'weather' => yield from $this->weatherRows(),
            default => null,
        };
    }

    public function reportTitle(string $type): string
    {
        return match ($type) {
            'users' => 'User Report',
            'tasks' => 'Task Report',
            'decisions' => 'Decision History Report',
            'priority' => 'Priority Distribution Report',
            'weather' => 'Weather Statistics Report',
            default => 'Report',
        };
    }

    public function statusPieSvg(array $items): string
    {
        $total = array_sum(array_map(fn ($item) => max(0, (int) ($item['count'] ?? 0)), $items));
        $colors = ['completed' => '#15966b', 'pending' => '#e6a11a'];
        $cx = 92;
        $cy = 94;
        $radius = 68;
        $angle = -90.0;
        $parts = [];
        $legend = [];

        foreach ($items as $item) {
            $name = (string) ($item['status'] ?? '');
            $count = max(0, (int) ($item['count'] ?? 0));
            $color = $colors[$name] ?? '#64748b';
            $percent = $total ? round($count / $total * 100, 1) : 0;
            $legend[] = '<g><circle cx="202" cy="'.(43 + count($legend) * 42).'" r="5" fill="'.$color.'"/><text x="216" y="'.(47 + (count($legend)) * 42).'" class="label">'.htmlspecialchars(ucfirst($name), ENT_QUOTES, 'UTF-8').'</text><text x="216" y="'.(62 + count($legend) * 42).'" class="value">'.$count.' · '.$percent.'%</text></g>';

            if ($count === 0 || $total === 0) {
                continue;
            }

            $sweep = $count / $total * 360;
            if ($sweep >= 359.999) {
                $parts[] = '<circle cx="'.$cx.'" cy="'.$cy.'" r="'.$radius.'" fill="'.$color.'"/>';
            } else {
                $startX = $cx + $radius * cos(deg2rad($angle));
                $startY = $cy + $radius * sin(deg2rad($angle));
                $endAngle = $angle + $sweep;
                $endX = $cx + $radius * cos(deg2rad($endAngle));
                $endY = $cy + $radius * sin(deg2rad($endAngle));
                $largeArc = $sweep > 180 ? 1 : 0;
                $parts[] = '<path d="M '.$cx.' '.$cy.' L '.round($startX, 3).' '.round($startY, 3).' A '.$radius.' '.$radius.' 0 '.$largeArc.' 1 '.round($endX, 3).' '.round($endY, 3).' Z" fill="'.$color.'"/>';
            }
            $angle += $sweep;
        }

        if ($total === 0) {
            $parts[] = '<circle cx="'.$cx.'" cy="'.$cy.'" r="'.$radius.'" fill="#e2e8f0"/>';
        }

        return '<svg xmlns="http://www.w3.org/2000/svg" width="380" height="205" viewBox="0 0 380 205" role="img" aria-label="Task status distribution pie chart"><style>.label{font:14px DejaVu Sans,sans-serif;fill:#263449}.value{font:12px DejaVu Sans,sans-serif;fill:#64748b}</style>'.implode('', $parts).implode('', $legend).'</svg>';
    }

    public function categoryBarSvg(array $items): string
    {
        $items = array_values(array_filter($items, fn ($item) => (int) ($item['count'] ?? 0) > 0));
        $height = max(90, 38 + count($items) * 34);
        $maximum = max(1, ...array_map(fn ($item) => (int) ($item['count'] ?? 0), $items ?: [['count' => 0]]));
        $rows = [];

        foreach ($items as $index => $item) {
            $y = 24 + $index * 34;
            $label = htmlspecialchars(mb_strimwidth((string) ($item['category'] ?? 'Uncategorized'), 0, 27, '…'), ENT_QUOTES, 'UTF-8');
            $count = (int) $item['count'];
            $barWidth = round(300 * $count / $maximum, 2);
            $color = ['#4263eb', '#8b5cf6', '#0f9f90', '#e6a11a', '#d65779'][$index % 5];
            $rows[] = '<text x="0" y="'.($y + 11).'" class="label">'.$label.'</text><rect x="205" y="'.$y.'" width="'.$barWidth.'" height="16" rx="5" fill="'.$color.'"/><text x="'.(215 + $barWidth).'" y="'.($y + 12).'" class="value">'.$count.'</text>';
        }

        if ($rows === []) {
            $rows[] = '<text x="0" y="28" class="value">No tasks in this reporting period.</text>';
        }

        return '<svg xmlns="http://www.w3.org/2000/svg" width="560" height="'.$height.'" viewBox="0 0 560 '.$height.'" role="img" aria-label="Task counts by category"><style>.label{font:12px DejaVu Sans,sans-serif;fill:#263449}.value{font:11px DejaVu Sans,sans-serif;fill:#64748b}</style>'.implode('', $rows).'</svg>';
    }

    public function svgDataUri(string $svg): string
    {
        return 'data:image/svg+xml;base64,'.base64_encode($svg);
    }

    public function logoDataUri(): ?string
    {
        $candidates = [
            [base_path('deployment/frontend/logo-report.jpg'), 'image/jpeg'],
            [public_path('logo-report.jpg'), 'image/jpeg'],
            [base_path('deployment/frontend/logo.png'), 'image/png'],
            [public_path('logo.png'), 'image/png'],
        ];
        foreach ($candidates as [$candidate, $mimeType]) {
            $path = realpath($candidate);
            if ($path && is_file($path) && strtolower(pathinfo($path, PATHINFO_EXTENSION)) === ($mimeType === 'image/jpeg' ? 'jpg' : 'png')) {
                $contents = file_get_contents($path);
                if ($contents !== false) {
                    return 'data:'.$mimeType.';base64,'.base64_encode($contents);
                }
            }
        }

        return null;
    }

    public function buildAdminAnalyticsHtml(array $report, array $filters): string
    {
        $e = fn ($value) => htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
        $logo = $this->logoDataUri();
        $logoMarkup = $logo ? '<img class="logo" src="'.$logo.'" alt="Contextify">' : '<strong class="brand">Contextify</strong>';
        $statusRows = collect($report['status_distribution'])->map(fn ($item) => ['status' => $item['status'], 'count' => $item['count']])->all();
        $categories = collect($report['by_category'])->all();
        $statusChart = '<img class="chart-image" src="'.$this->svgDataUri($this->statusPieSvg($statusRows)).'" alt="Task status distribution chart">';
        $categoryChart = '<img class="chart-image" src="'.$this->svgDataUri($this->categoryBarSvg($categories)).'" alt="Tasks by category chart">';
        $summary = $report['summary'];
        $legendRows = collect($report['status_distribution'])->map(fn ($item) => '<tr><td>'.$e(ucfirst($item['status'])).'</td><td>'.$item['count'].'</td><td>'.$item['percentage'].'%</td></tr>')->implode('');
        $categoryRows = collect($categories)->map(fn ($item) => '<tr><td>'.$e($item['category']).'</td><td>'.$item['count'].'</td></tr>')->implode('');
        $period = $e($filters['start_date']).' – '.$e($filters['end_date']);

        return '<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:DejaVu Sans,sans-serif;color:#1e293b;font-size:10px;margin:28px}h1{font-size:19px;margin:0 0 4px;color:#172554}h2{font-size:13px;margin:21px 0 9px;border-bottom:1px solid #dbe4f0;padding-bottom:5px}.header{width:100%;border-collapse:collapse;border-bottom:2px solid #dbeafe;margin-bottom:12px}.header td{vertical-align:middle;padding-bottom:12px}.logo-cell{width:170px}.logo{width:150px;height:56px}.brand{font-size:20px;color:#0e7490}.meta{color:#64748b;line-height:1.6}.cards{width:100%;border-collapse:separate;border-spacing:7px}.cards td{background:#eff6ff;border:1px solid #dbeafe;padding:10px;width:16.6%}.cards strong{display:block;font-size:17px;color:#1d4ed8;margin-top:4px}.charts{width:100%;border-collapse:collapse}.charts td{width:50%;vertical-align:top;padding-right:14px}.chart{width:100%;border:1px solid #e2e8f0;padding:10px}.chart-image{width:100%;height:auto}table.data{width:100%;border-collapse:collapse;margin-top:8px}table.data th,table.data td{border-bottom:1px solid #e2e8f0;text-align:left;padding:6px}table.data th{background:#f1f5f9}.foot{position:fixed;bottom:-12px;color:#64748b;font-size:9px}</style></head><body><table class="header"><tr><td class="logo-cell">'.$logoMarkup.'</td><td><h1>Administrator Report</h1><div class="meta">Platform task analytics · Period: '.$period.' · Status: '.$e(ucfirst($filters['status'])).'<br>Generated: '.$e(now()->format('M j, Y H:i')).'</div></td></tr></table><h2>Platform summary</h2><table class="cards"><tr><td>Registered users<strong>'.$summary['users_total'].'</strong></td><td>Active users<strong>'.$summary['users_active'].'</strong></td><td>Tasks<strong>'.$summary['total'].'</strong></td><td>Completed<strong>'.$summary['completed'].'</strong></td><td>Pending<strong>'.$summary['pending'].'</strong></td><td>Completion<strong>'.$summary['completion_rate'].'%</strong></td></tr></table><table class="charts"><tr><td><div class="chart"><h2>Status distribution</h2>'.$statusChart.'<table class="data"><tr><th>Status</th><th>Count</th><th>Share</th></tr>'.$legendRows.'</table></div></td><td><div class="chart"><h2>Tasks by category</h2>'.$categoryChart.'<table class="data"><tr><th>Category</th><th>Count</th></tr>'.$categoryRows.'</table></div></td></tr></table><p class="meta">This report includes aggregate platform counts only; task titles, user names, and email addresses are excluded. Stored task statuses are pending and completed.</p><div class="foot">Contextify · Generated '.$e(now()->format('Y-m-d H:i')).'</div></body></html>';
    }

    private function userRows(): \Generator
    {
        $users = User::withCount('tasks')->get();
        foreach ($users as $user) {
            yield [
                $user->id,
                $user->name,
                $user->email,
                $user->role,
                $user->is_active ? 'Yes' : 'No',
                $user->tasks_count,
                $user->created_at?->format('Y-m-d H:i'),
            ];
        }
    }

    private function taskRows(): \Generator
    {
        $tasks = Task::with('user:id,name')->get();
        foreach ($tasks as $task) {
            yield [
                $task->id,
                $task->user?->name,
                $task->title,
                $task->priority_score,
                $task->status,
                $task->due_date,
                $task->weather_condition,
            ];
        }
    }

    private function decisionRows(): \Generator
    {
        $items = DecisionAnalysis::with('user:id,name')->get();
        foreach ($items as $item) {
            yield [
                $item->id,
                $item->user?->name,
                $item->total_selected,
                $item->created_at?->format('Y-m-d H:i'),
            ];
        }
    }

    private function priorityRows(): \Generator
    {
        yield ['High (8+)', Task::where('priority_score', '>=', 8)->count()];
        yield ['Medium (5-7.9)', Task::whereBetween('priority_score', [5, 7.99])->count()];
        yield ['Low (<5)', Task::where('priority_score', '<', 5)->count()];
    }

    private function weatherRows(): \Generator
    {
        $rows = Task::select('weather_condition', DB::raw('COUNT(*) as count'))
            ->whereNotNull('weather_condition')
            ->groupBy('weather_condition')
            ->get();

        foreach ($rows as $row) {
            yield [$row->weather_condition, $row->count];
        }
    }

    public function buildSpreadsheetXml(string $type): string
    {
        $headers = $this->headers($type);
        $rows = iterator_to_array($this->rows($type));

        $xml = '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>';
        $xml .= '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">';
        $xml .= '<Worksheet ss:Name="Report"><Table>';

        $xml .= '<Row>';
        foreach ($headers as $header) {
            $xml .= '<Cell><Data ss:Type="String">' . htmlspecialchars($header) . '</Data></Cell>';
        }
        $xml .= '</Row>';

        foreach ($rows as $row) {
            $xml .= '<Row>';
            foreach ($row as $cell) {
                $type = is_numeric($cell) ? 'Number' : 'String';
                $xml .= '<Cell><Data ss:Type="' . $type . '">' . htmlspecialchars((string) $cell) . '</Data></Cell>';
            }
            $xml .= '</Row>';
        }

        $xml .= '</Table></Worksheet></Workbook>';

        return $xml;
    }

    public function buildHtml(string $type): string
    {
        $title = $this->reportTitle($type);
        $headers = $this->headers($type);
        $rows = iterator_to_array($this->rows($type));

        $html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' . htmlspecialchars($title) . '</title>';
        $html .= '<style>body{font-family:DejaVu Sans,sans-serif;padding:24px;color:#111}h1{font-size:20px;margin-bottom:8px}';
        $html .= 'table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #ccc;padding:8px;text-align:left;font-size:12px}';
        $html .= 'th{background:#f3f4f6}.meta{color:#666;font-size:11px;margin-bottom:16px}</style></head><body>';
        $logo = $this->logoDataUri();
        $logoMarkup = $logo ? '<img src="'.$logo.'" style="width:150px;height:auto;margin-right:18px" alt="Contextify">' : '<strong style="font-size:20px;margin-right:18px">Contextify</strong>';
        $html .= '<table style="width:100%;border-collapse:collapse;border-bottom:2px solid #dbeafe;margin-bottom:12px"><tr><td style="width:170px;vertical-align:middle;padding-bottom:12px">'.$logoMarkup.'</td><td style="vertical-align:middle;padding-bottom:12px"><h1>' . htmlspecialchars($title) . '</h1>';
        $html .= '<p class="meta">Generated ' . now()->format('Y-m-d H:i') . ' · Contextify AI</p></td></tr></table><table><thead><tr>';

        foreach ($headers as $header) {
            $html .= '<th>' . htmlspecialchars($header) . '</th>';
        }
        $html .= '</tr></thead><tbody>';

        foreach ($rows as $row) {
            $html .= '<tr>';
            foreach ($row as $cell) {
                $html .= '<td>' . htmlspecialchars((string) $cell) . '</td>';
            }
            $html .= '</tr>';
        }

        $html .= '</tbody></table></body></html>';

        return $html;
    }
}
