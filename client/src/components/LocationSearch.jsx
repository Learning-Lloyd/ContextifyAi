import { useEffect, useState } from 'react';
import { FiMapPin, FiSearch } from 'react-icons/fi';
import { weatherService } from '../services/weatherService';

export default function LocationSearch({ value, onChange, error }) {
  const [query, setQuery] = useState(value?.location || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setQuery(value?.location || '');
  }, [value?.location]);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return undefined;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await weatherService.searchCities(query);
        setResults(data.cities || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (city) => {
    onChange({
      location: city.label,
      latitude: city.latitude,
      longitude: city.longitude,
    });
    setQuery(city.label);
    setResults([]);
  };

  return (
    <div className="relative">
      <label className="label">Location</label>
      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)]" size={16} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search city..."
          className="input pl-9"
        />
      </div>
      {loading && <p className="text-xs text-[var(--app-text-muted)] mt-1">Searching cities...</p>}
      {results.length > 0 && (
        <div className="absolute z-20 w-full mt-1 card overflow-hidden shadow-lg">
          {results.map((city) => (
            <button
              key={`${city.latitude}-${city.longitude}`}
              type="button"
              onClick={() => handleSelect(city)}
              className="w-full text-left px-4 py-2.5 hover:bg-[var(--app-hover)] flex items-center gap-2 text-sm transition-colors"
            >
              <FiMapPin className="text-[#2563EB]" size={14} />
              <span>{city.label}</span>
            </button>
          ))}
        </div>
      )}
      {value?.location && (
        <p className="text-xs text-[#2563EB] mt-2 flex items-center gap-1">
          <FiMapPin size={12} /> Selected: {value.location}
        </p>
      )}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
