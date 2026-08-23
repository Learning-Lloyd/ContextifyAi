<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WeatherService
{
    private const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';

    private const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

    private const CACHE_TTL_MINUTES = 30;

    /**
     * Search cities using Open-Meteo geocoding (free, no API key).
     */
    public function searchCities(string $query, int $limit = 8): array
    {
        $query = trim($query);
        if (strlen($query) < 2) {
            return [];
        }

        $cacheKey = 'weather_search_' . md5(strtolower($query));

        return Cache::remember($cacheKey, now()->addHours(6), function () use ($query, $limit) {
            try {
                $response = Http::timeout(10)->get(self::GEOCODING_URL, [
                    'name' => $query,
                    'count' => $limit,
                    'language' => 'en',
                    'format' => 'json',
                ]);

                if (! $response->successful()) {
                    return [];
                }

                return collect($response->json('results', []))
                    ->map(fn (array $city) => [
                        'name' => $city['name'],
                        'country' => $city['country'] ?? '',
                        'admin1' => $city['admin1'] ?? '',
                        'latitude' => $city['latitude'],
                        'longitude' => $city['longitude'],
                        'label' => $this->formatCityLabel($city),
                    ])
                    ->values()
                    ->all();
            } catch (\Throwable $exception) {
                Log::warning('Weather city search failed', ['message' => $exception->getMessage()]);

                return [];
            }
        });
    }

    /**
     * Fetch current weather and rain probability for coordinates.
     */
    public function getWeather(float $latitude, float $longitude): ?array
    {
        $cacheKey = sprintf('weather_%s_%s', round($latitude, 3), round($longitude, 3));

        return Cache::remember($cacheKey, now()->addMinutes(self::CACHE_TTL_MINUTES), function () use ($latitude, $longitude) {
            try {
                $response = Http::timeout(10)->get(self::FORECAST_URL, [
                    'latitude' => $latitude,
                    'longitude' => $longitude,
                    'current' => 'temperature_2m,weather_code,precipitation',
                    'hourly' => 'precipitation_probability',
                    'forecast_days' => 1,
                    'timezone' => 'auto',
                ]);

                if (! $response->successful()) {
                    return null;
                }

                $current = $response->json('current', []);
                $hourly = $response->json('hourly', []);
                $rainProbability = $this->extractRainProbability($hourly);

                return [
                    'temperature' => isset($current['temperature_2m']) ? round((float) $current['temperature_2m'], 1) : null,
                    'weather_condition' => $this->mapWeatherCode($current['weather_code'] ?? null),
                    'rain_probability' => $rainProbability,
                    'weather_last_updated' => now()->toIso8601String(),
                ];
            } catch (\Throwable $exception) {
                Log::warning('Weather fetch failed', ['message' => $exception->getMessage()]);

                return null;
            }
        });
    }

    /**
     * Attach weather snapshot to task payload fields.
     */
    public function applyWeatherToTaskData(array $data): array
    {
        if (! isset($data['latitude'], $data['longitude'])) {
            return $data;
        }

        $weather = $this->getWeather((float) $data['latitude'], (float) $data['longitude']);
        if (! $weather) {
            return $data;
        }

        return array_merge($data, [
            'weather_condition' => $weather['weather_condition'],
            'temperature' => $weather['temperature'],
            'rain_probability' => $weather['rain_probability'],
            'weather_last_updated' => now(),
        ]);
    }

    public function getForecast(float $latitude, float $longitude): array
    {
        $cacheKey = sprintf('weather_forecast_%s_%s', round($latitude, 3), round($longitude, 3));

        return Cache::remember($cacheKey, now()->addMinutes(self::CACHE_TTL_MINUTES), function () use ($latitude, $longitude) {
            try {
                $response = Http::timeout(10)->get(self::FORECAST_URL, [
                    'latitude' => $latitude,
                    'longitude' => $longitude,
                    'daily' => 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
                    'forecast_days' => 5,
                    'timezone' => 'auto',
                ]);

                if (! $response->successful()) {
                    return [];
                }

                $daily = $response->json('daily', []);
                $dates = $daily['time'] ?? [];

                return collect($dates)->map(function ($date, $index) use ($daily) {
                    return [
                        'date' => $date,
                        'temperature_max' => $daily['temperature_2m_max'][$index] ?? null,
                        'temperature_min' => $daily['temperature_2m_min'][$index] ?? null,
                        'weather_condition' => $this->mapWeatherCode($daily['weather_code'][$index] ?? null),
                        'rain_probability' => $daily['precipitation_probability_max'][$index] ?? null,
                    ];
                })->values()->all();
            } catch (\Throwable $exception) {
                Log::warning('Weather forecast failed', ['message' => $exception->getMessage()]);

                return [];
            }
        });
    }

    private function extractRainProbability(array $hourly): ?int
    {
        $probabilities = $hourly['precipitation_probability'] ?? [];
        if (count($probabilities) === 0) {
            return null;
        }

        $nextHours = array_slice($probabilities, 0, 6);

        return (int) round(max($nextHours));
    }

    private function formatCityLabel(array $city): string
    {
        $parts = array_filter([
            $city['name'] ?? null,
            $city['admin1'] ?? null,
            $city['country'] ?? null,
        ]);

        return implode(', ', $parts);
    }

    private function mapWeatherCode(?int $code): string
    {
        return match (true) {
            $code === 0 => 'Clear',
            in_array($code, [1, 2, 3], true) => 'Partly Cloudy',
            in_array($code, [45, 48], true) => 'Foggy',
            in_array($code, [51, 53, 55, 56, 57], true) => 'Drizzle',
            in_array($code, [61, 63, 65, 66, 67, 80, 81, 82], true) => 'Rain',
            in_array($code, [71, 73, 75, 77, 85, 86], true) => 'Snow',
            in_array($code, [95, 96, 99], true) => 'Thunderstorm',
            default => 'Cloudy',
        };
    }
}
