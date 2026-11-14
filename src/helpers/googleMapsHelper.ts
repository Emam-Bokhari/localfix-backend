import axios from "axios";
import config from "../config";

export type TLocationCoord = {
  lat: number;
  lng: number;
};

export type TDistanceResult = {
  distanceInMiles: number;
  distanceFormatted: string;
  durationText?: string;
  source: "google_maps" | "haversine";
};

/**
 * Fallback Haversine Formula for distance calculation (in miles)
 */
export const calculateHaversineDistanceInMiles = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const R = 3958.8; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

export const formatMilesDistance = (
  miles: number | null | undefined,
): string | null => {
  if (miles === undefined || miles === null || isNaN(miles)) {
    return null;
  }
  if (miles < 1) {
    return "<1 mi away";
  }
  return `${miles.toFixed(1)} mi away`;
};

/**
 * Calculates distances from one origin to multiple destinations using Google Maps Distance Matrix API.
 * Gracefully falls back to Haversine calculation if Google Maps API key is missing or fails.
 */
export const getBatchGoogleDistances = async (
  origin: TLocationCoord,
  destinations: Array<{ id: string; lat: number; lng: number }>,
): Promise<Map<string, TDistanceResult>> => {
  const resultMap = new Map<string, TDistanceResult>();

  if (!destinations || destinations.length === 0) {
    return resultMap;
  }

  const apiKey = config.googleMapsApiKey;

  // Process in chunks of 25 (Google Maps Distance Matrix limit)
  const chunkSize = 25;
  for (let i = 0; i < destinations.length; i += chunkSize) {
    const chunk = destinations.slice(i, i + chunkSize);

    if (apiKey) {
      try {
        const destString = chunk.map((d) => `${d.lat},${d.lng}`).join("|");
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin.lat},${origin.lng}&destinations=${encodeURIComponent(
          destString,
        )}&units=imperial&key=${apiKey}`;

        const response = await axios.get(url, { timeout: 4000 });
        const data = response.data;

        if (data.status === "OK" && data.rows?.[0]?.elements) {
          const elements = data.rows[0].elements;
          chunk.forEach((dest, idx) => {
            const el = elements[idx];
            if (el && el.status === "OK" && el.distance) {
              const meters = el.distance.value;
              const miles = Math.round((meters / 1609.344) * 10) / 10;
              resultMap.set(dest.id, {
                distanceInMiles: miles,
                distanceFormatted: formatMilesDistance(miles) || `${miles} mi away`,
                durationText: el.duration?.text,
                source: "google_maps",
              });
            } else {
              // Individual element failed (e.g. ZERO_RESULTS) -> Fallback
              const miles = calculateHaversineDistanceInMiles(
                origin.lat,
                origin.lng,
                dest.lat,
                dest.lng,
              );
              resultMap.set(dest.id, {
                distanceInMiles: miles,
                distanceFormatted: formatMilesDistance(miles) || `${miles} mi away`,
                source: "haversine",
              });
            }
          });
          continue;
        }
      } catch (_err) {
        // Fallback to Haversine on network or API failure
      }
    }

    // Fallback for this chunk
    chunk.forEach((dest) => {
      const miles = calculateHaversineDistanceInMiles(
        origin.lat,
        origin.lng,
        dest.lat,
        dest.lng,
      );
      resultMap.set(dest.id, {
        distanceInMiles: miles,
        distanceFormatted: formatMilesDistance(miles) || `${miles} mi away`,
        source: "haversine",
      });
    });
  }

  return resultMap;
};

