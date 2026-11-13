<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use SplFileObject;

class ResearchDatasetController extends Controller
{
    private const SOURCE = 'contextify_scoring_validation';
    private const SOURCES = ['contextify_scoring_validation', 'ms_latte'];

    private const METADATA = [
        'contextify_scoring_validation' => [
            'name' => 'Contextify scoring validation examples',
            'description' => 'Synthetic test cases with expected results from the fixed four-factor formula. Not participant data or model training data.',
        ],
        'ms_latte' => [
            'name' => 'MS-LaTTE task context dataset',
            'description' => '10,101 task records with human-annotated likely time and location labels. Used for supplementary context research, not Contextify priority scoring.',
        ],
    ];

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'source' => 'nullable|string|in:'.implode(',', self::SOURCES),
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:5|max:100',
        ]);

        $source = $validated['source'] ?? self::SOURCE;
        $page = (int) ($validated['page'] ?? 1);
        $perPage = (int) ($validated['per_page'] ?? 15);
        try {
            $records = $source === self::SOURCE ? $this->readScoringValidationDataset() : $this->readExternalDataset($source, $page, $perPage);
        } catch (\Throwable) {
            return response()->json(['message' => 'The requested research dataset is temporarily unavailable.', 'source' => $source, 'records' => []], 503);
        }
        $count = $source === self::SOURCE ? count($records) : $this->externalRecordCount($source);

        return response()->json([
            'datasets' => array_map(fn (string $key) => [
                'key' => $key,
                'name' => self::METADATA[$key]['name'],
                'description' => self::METADATA[$key]['description'],
                'record_count' => $key === self::SOURCE ? count($this->readScoringValidationDataset()) : $this->externalRecordCount($key),
            ], self::SOURCES),
            'source' => $source,
            'records' => $source === self::SOURCE ? array_slice($records, ($page - 1) * $perPage, $perPage) : $records,
            'experiments' => $this->readExperimentSummary(),
            'pagination' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => $count,
                'last_page' => max(1, (int) ceil($count / $perPage)),
            ],
        ]);
    }

    private function readExperimentSummary(): array
    {
        $path = dirname(base_path()).DIRECTORY_SEPARATOR.'datasets'.DIRECTORY_SEPARATOR.'documentation'.DIRECTORY_SEPARATOR.'ml_experiment_report.json';
        $report = is_file($path) ? json_decode((string) file_get_contents($path), true) : null;
        if (! is_array($report['experiments'] ?? null)) {
            return [];
        }

        $summary = [];
        foreach ($report['experiments'] as $name => $experiment) {
            $metrics = $experiment['metrics'] ?? [];
            $baseline = 'baseline_most_frequent';
            $summary[$name] = [
                'eligible_records' => (int) ($experiment['eligible_records'] ?? 0),
                'test_records' => (int) ($experiment['test_records'] ?? 0),
                'model_macro_f1' => $metrics['multinomial_naive_bayes']['macro_f1'] ?? null,
                'baseline_macro_f1' => $metrics[$baseline]['macro_f1'] ?? null,
            ];
        }

        $registryPath = dirname(base_path()).DIRECTORY_SEPARATOR.'datasets'.DIRECTORY_SEPARATOR.'models'.DIRECTORY_SEPARATOR.'model_registry.json';
        $registry = is_file($registryPath) ? json_decode((string) file_get_contents($registryPath), true) : null;
        $modelKeys = ['likely_location' => 'likely_location', 'likely_time' => 'likely_time'];
        foreach ($modelKeys as $summaryKey => $registryKey) {
            $model = $registry['models'][$registryKey] ?? null;
            if (! is_array($model) || ! isset($summary[$summaryKey])) {
                continue;
            }
            $selectedMetrics = $model['metrics']['multinomial_naive_bayes'] ?? [];
            $selectedBaseline = $model['metrics']['baseline_most_frequent'] ?? [];
            $summary[$summaryKey] = array_merge($summary[$summaryKey], [
                'test_records' => (int) ($model['test_records'] ?? $summary[$summaryKey]['test_records']),
                'training_records' => (int) ($model['training_records'] ?? 0),
                'model_macro_f1' => $selectedMetrics['macro_f1'] ?? $summary[$summaryKey]['model_macro_f1'],
                'baseline_macro_f1' => $selectedBaseline['macro_f1'] ?? $summary[$summaryKey]['baseline_macro_f1'],
                'model_version' => $model['version'] ?? null,
                'algorithm' => $model['algorithm'] ?? null,
                'input_features' => $model['input_features'] ?? [],
                'trained_at' => $model['trained_at'] ?? null,
                'deployment' => $model['deployment'] ?? null,
                'dataset_sha256' => $model['dataset_sha256'] ?? null,
                'artifact_sha256' => $model['artifact_sha256'] ?? null,
            ]);
        }

        return $summary;
    }

    private function externalRecordCount(string $source): int
    {
        $reportPath = dirname(base_path()).DIRECTORY_SEPARATOR.'datasets'.DIRECTORY_SEPARATOR.'documentation'.DIRECTORY_SEPARATOR.'dataset_import_report.json';
        $report = is_file($reportPath) ? json_decode((string) file_get_contents($reportPath), true) : null;
        return (int) ($source === 'ms_latte'
            ? ($report['ms_latte']['processed_records'] ?? 0)
            : 0);
    }

    private function readExternalDataset(string $source, int $page, int $perPage): array
    {
        $path = rtrim((string) (config('research_datasets.root') ?: dirname(base_path()).DIRECTORY_SEPARATOR.'datasets'), DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR.'processed'.DIRECTORY_SEPARATOR.'ms_latte.jsonl';
        if (! is_file($path)) {
            abort(503, 'The requested research dataset is temporarily unavailable.');
        }

        $start = ($page - 1) * $perPage;
        $end = $start + $perPage;
        $records = [];
        $index = 0;
        $file = new SplFileObject($path, 'r');
        while (! $file->eof() && $index < $end) {
            $line = trim((string) $file->fgets());
            if ($line === '') {
                continue;
            }
            if ($index >= $start) {
                $record = json_decode($line, true);
                if (is_array($record)) {
                    $records[] = $this->formatMsLatteRecord($record);
                }
            }
            $index++;
        }

        return $records;
    }

    private function formatMsLatteRecord(array $record): array
    {
        $extract = static function (array $judgements, string $key): array {
            $labels = [];
            $known = 0;
            foreach ($judgements as $judgement) {
                if (! in_array(strtolower((string) ($judgement['Known'] ?? '')), ['yes', 'true', '1'], true)) {
                    continue;
                }
                $known++;
                $values = $judgement[$key] ?? '';
                $values = is_array($values) ? $values : explode(',', (string) $values);
                foreach ($values as $value) {
                    $value = strtolower(trim((string) $value));
                    if ($value !== '') {
                        $labels[$value] = true;
                    }
                }
            }
            return ['labels' => array_keys($labels), 'known_judgements' => $known];
        };
        $locations = $extract($record['location_judgements'] ?? [], 'Locations');
        $times = $extract($record['time_judgements'] ?? [], 'Times');

        return [
            'record_id' => $record['source_id'] ?? null,
            'source_id' => $record['source_id'] ?? null,
            'title' => $record['title'] ?? '',
            'list_title' => $record['list_title'] ?? '',
            'location_labels' => $locations['labels'],
            'known_location_judgements' => $locations['known_judgements'],
            'time_labels' => $times['labels'],
            'known_time_judgements' => $times['known_judgements'],
        ];
    }

    private function readScoringValidationDataset(): array
    {
        $path = resource_path('research-data/contextify_scoring_validation.csv');
        if (! is_file($path)) {
            throw new RuntimeException('The Contextify scoring validation dataset is not available.');
        }

        $file = new SplFileObject($path, 'r');
        $header = $file->fgetcsv(',', '"', '\\');
        if (! is_array($header) || count($header) < 2) {
            throw new RuntimeException('The Contextify scoring validation dataset has an invalid header.');
        }
        $header[0] = preg_replace('/^\xEF\xBB\xBF/', '', (string) $header[0]);
        $records = [];
        while (! $file->eof()) {
            $values = $file->fgetcsv(',', '"', '\\');
            if (! is_array($values) || count($values) < 2 || $values === [null]) {
                continue;
            }
            $values = array_pad(array_slice($values, 0, count($header)), count($header), '');
            $record = array_combine($header, $values);
            if ($record === false) {
                continue;
            }
            $record['record_id'] = count($records) + 1;
            $records[] = $record;
        }

        return $records;
    }

}
