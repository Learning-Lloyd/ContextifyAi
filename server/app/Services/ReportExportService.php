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
        $html .= '<h1>' . htmlspecialchars($title) . '</h1>';
        $html .= '<p class="meta">Generated ' . now()->format('Y-m-d H:i') . ' · Contextify AI</p><table><thead><tr>';

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
