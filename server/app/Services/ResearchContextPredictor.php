<?php

namespace App\Services;

use RuntimeException;

class ResearchContextPredictor
{
    private static array $models = [];

    public function predict(string $title): array
    {
        $tokens = $this->tokens($title);

        return [
            'likely_locations' => $this->predictLabels('ms_latte_location_model.json', $tokens),
        ];
    }

    public function modelDetails(): array
    {
        $model = $this->loadModel('ms_latte_location_model.json');

        return [
            'model_version' => $model['model_version'] ?? '1.0.0',
            'algorithm' => $model['model'] ?? 'Multinomial Naive Bayes, one-vs-rest',
            'target' => $model['target'] ?? 'likely_location',
            'dataset_sha256' => $model['dataset_sha256'] ?? null,
            'training_records' => $model['training_records'] ?? null,
            'test_records' => $model['test_records'] ?? null,
            'trained_at' => $model['trained_at'] ?? null,
        ];
    }

    private function predictLabels(string $filename, array $tokens): array
    {
        $model = $this->loadModel($filename);
        $counts = array_count_values($tokens);
        $predictions = [];
        $threshold = (float) ($model['threshold'] ?? 0.5);
        if ($threshold <= 0.0 || $threshold >= 1.0) {
            throw new RuntimeException('The supplementary research model has an invalid prediction threshold.');
        }
        $thresholdLogOdds = log($threshold / (1.0 - $threshold));

        foreach ($model['labels'] ?? [] as $label => $details) {
            $score = (float) ($details['prior_log_odds'] ?? 0);
            foreach ($counts as $token => $count) {
                $score += $count * (float) ($details['term_log_odds'][$token] ?? 0);
            }

            // The threshold is the model's fixed research decision rule; scores are not shown as calibrated confidence.
            if ($score >= $thresholdLogOdds) {
                $predictions[] = $label;
            }
        }

        return $predictions;
    }

    private function loadModel(string $filename): array
    {
        if (isset(self::$models[$filename])) {
            return self::$models[$filename];
        }

        $path = dirname(base_path()).DIRECTORY_SEPARATOR.'datasets'.DIRECTORY_SEPARATOR.'models'.DIRECTORY_SEPARATOR.$filename;
        if (! is_file($path)) {
            throw new RuntimeException('The supplementary research model has not been trained.');
        }
        $model = json_decode((string) file_get_contents($path), true);
        if (! is_array($model) || ! isset($model['labels'], $model['vocabulary'])) {
            throw new RuntimeException('The supplementary research model has an invalid format.');
        }

        self::$models[$filename] = $model;
        return $model;
    }

    private function tokens(string $text): array
    {
        preg_match_all("/[\\p{L}\\p{N}_']+/u", mb_strtolower($text), $matches);
        return $matches[0] ?? [];
    }
}
