<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\WeatherService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WeatherController extends Controller
{
    public function __construct(private readonly WeatherService $weatherService)
    {
    }

    public function search(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => 'required|string|min:2|max:100',
        ]);

        return response()->json([
            'cities' => $this->weatherService->searchCities($validated['q']),
        ]);
    }

    public function current(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'location' => 'nullable|string|max:255',
        ]);

        $weather = $this->weatherService->getWeather(
            (float) $validated['latitude'],
            (float) $validated['longitude']
        );

        if (! $weather) {
            return response()->json(['message' => 'Unable to fetch weather data.'], 503);
        }

        return response()->json([
            'location' => $validated['location'] ?? null,
            'current' => $weather,
            'forecast' => $this->weatherService->getForecast(
                (float) $validated['latitude'],
                (float) $validated['longitude']
            ),
        ]);
    }
}
