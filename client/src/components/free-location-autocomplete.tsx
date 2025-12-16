import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MapPin, Loader2 } from "lucide-react";

interface LocationResult {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
  };
}

interface FreeLocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (location: {
    name: string;
    address: string;
    city: string;
    latitude: string;
    longitude: string;
    placeId: string;
  }) => void;
  placeholder?: string;
}

export default function FreeLocationAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Search location...",
}: FreeLocationAutocompleteProps) {
  const [results, setResults] = useState<LocationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const searchLocation = async () => {
      if (value.length < 3) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        // Using Nominatim - FREE geocoding service by OpenStreetMap
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?` +
            `format=json&` +
            `q=${encodeURIComponent(value)}&` +
            `limit=5&` +
            `addressdetails=1&` +
            `countrycodes=lk`, // Limit to Sri Lanka, remove this for worldwide
          {
            headers: {
              "User-Agent": "MediVault Healthcare App", // Required by Nominatim
            },
          }
        );
        const data = await response.json();
        setResults(data);
        setShowResults(true);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchLocation, 500);
    return () => clearTimeout(debounceTimer);
  }, [value]);

  const handleSelect = (result: LocationResult) => {
    const city =
      result.address.city ||
      result.address.town ||
      result.address.village ||
      result.address.state ||
      "Unknown";

    onSelect({
      name: result.display_name.split(",")[0], // First part as name
      address: result.display_name,
      city: city,
      latitude: result.lat,
      longitude: result.lon,
      placeId: result.place_id,
    });

    onChange(result.display_name.split(",")[0]);
    setShowResults(false);
    setResults([]);
  };

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder={placeholder}
          className="pl-10"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {showResults && results.length > 0 && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-50 max-h-64 overflow-y-auto">
          <div className="p-1">
            {results.map((result) => (
              <button
                key={result.place_id}
                type="button"
                onClick={() => handleSelect(result)}
                className="w-full text-left px-3 py-2 hover:bg-muted rounded-sm transition-colors"
              >
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {result.display_name.split(",")[0]}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {result.display_name}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {showResults &&
        results.length === 0 &&
        !isLoading &&
        value.length >= 3 && (
          <Card className="absolute top-full left-0 right-0 mt-1 z-50">
            <div className="p-4 text-center text-sm text-muted-foreground">
              No locations found. Try a different search.
            </div>
          </Card>
        )}
    </div>
  );
}
