import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DeliveryStop {
  id: string;
  address: string;
  lat?: number | null;
  lon?: number | null;
}

interface RouteRequest {
  startAddress: {
    address: string;
    lat: number;
    lon: number;
  };
  endMode: "return_to_start" | "last_stop" | "custom";
  customEndAddress?: {
    address: string;
    lat?: number | null;
    lon?: number | null;
  };
  stops: DeliveryStop[];
}

async function geocodeAddress(
  address: string,
  apiKey: string,
): Promise<{ lat: number; lon: number } | null> {
  const params = new URLSearchParams({
    text: address,
    apiKey,
    filter: "countrycode:se",
    bias: "proximity:15.6255,58.4108",
    format: "json",
    limit: "1",
  });

  const res = await fetch(
    `https://api.geoapify.com/v1/geocode/search?${params}`,
  );
  if (!res.ok) return null;

  const data = await res.json();
  const result = data.results?.[0];
  if (!result?.lat || !result?.lon) return null;
  return { lat: result.lat, lon: result.lon };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GEOAPIFY_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Geoapify API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body: RouteRequest = await req.json();
    const { startAddress, endMode, customEndAddress, stops } = body;

    if (!startAddress?.lat || !startAddress?.lon) {
      return new Response(
        JSON.stringify({
          error:
            "Store address coordinates are required. Please set a store address in Store Settings.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!stops || stops.length === 0) {
      return new Response(
        JSON.stringify({ error: "No delivery stops provided" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const geocodedStops = await Promise.all(
      stops.map(async (stop) => {
        if (stop.lat && stop.lon) {
          return { ...stop, lat: stop.lat, lon: stop.lon };
        }
        const coords = await geocodeAddress(stop.address, apiKey);
        if (!coords) {
          return { ...stop, lat: null, lon: null };
        }
        return { ...stop, ...coords };
      }),
    );

    const validStops = geocodedStops.filter(
      (s) => s.lat != null && s.lon != null,
    );
    const failedStops = geocodedStops
      .filter((s) => s.lat == null || s.lon == null)
      .map((s) => s.id);

    if (validStops.length === 0) {
      return new Response(
        JSON.stringify({
          error: "Could not geocode any delivery addresses",
          failedStops,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let endLat = startAddress.lat;
    let endLon = startAddress.lon;

    if (endMode === "custom" && customEndAddress) {
      if (customEndAddress.lat && customEndAddress.lon) {
        endLat = customEndAddress.lat;
        endLon = customEndAddress.lon;
      } else {
        const coords = await geocodeAddress(
          customEndAddress.address,
          apiKey,
        );
        if (coords) {
          endLat = coords.lat;
          endLon = coords.lon;
        }
      }
    }

    const agent: Record<string, unknown> = {
      start_location: [startAddress.lon, startAddress.lat],
    };

    if (endMode !== "last_stop") {
      agent.end_location = [endLon, endLat];
    }

    const jobs = validStops.map((stop) => ({
      id: stop.id,
      location: [stop.lon!, stop.lat!],
    }));

    const routeRequest = {
      mode: "drive",
      agents: [agent],
      jobs,
    };

    const routeRes = await fetch(
      `https://api.geoapify.com/v1/routeplanner?apiKey=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(routeRequest),
      },
    );

    if (!routeRes.ok) {
      const errText = await routeRes.text();
      return new Response(
        JSON.stringify({
          error: `Route planning failed: ${routeRes.status}`,
          detail: errText,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const routeData = await routeRes.json();

    const features = routeData.features || [];
    const routeFeature = features.find(
      (f: Record<string, unknown>) =>
        (f as any).properties?.mode === "drive",
    );

    const actions = (routeFeature as any)?.properties?.actions || [];

    const orderedStopIds: string[] = [];
    let totalTime = 0;
    let totalDistance = 0;

    for (const action of actions) {
      if (action.type === "job" && action.job_id) {
        orderedStopIds.push(action.job_id);
      }
      if (action.duration != null) totalTime += action.duration;
      if (action.distance != null) totalDistance += action.distance;
    }

    const routeProps = (routeFeature as any)?.properties || {};
    const routeTime = routeProps.time ?? totalTime;
    const routeDist = routeProps.distance ?? totalDistance;

    // Extract route geometry (the driving path line)
    let routeGeometry: number[][] = [];
    const geom = (routeFeature as any)?.geometry;
    if (geom) {
      if (geom.type === "MultiLineString" && Array.isArray(geom.coordinates)) {
        // Flatten multi-line into a single coordinate array [lon, lat] -> [lat, lon]
        for (const line of geom.coordinates) {
          for (const coord of line) {
            routeGeometry.push([coord[1], coord[0]]);
          }
        }
      } else if (
        geom.type === "LineString" &&
        Array.isArray(geom.coordinates)
      ) {
        routeGeometry = geom.coordinates.map((c: number[]) => [c[1], c[0]]);
      }
    }

    // Build stop coordinates map for the client
    const stopCoords: Record<string, { lat: number; lon: number }> = {};
    for (const stop of validStops) {
      stopCoords[stop.id] = { lat: stop.lat!, lon: stop.lon! };
    }

    return new Response(
      JSON.stringify({
        orderedStopIds,
        totalTimeSeconds: routeTime,
        totalDistanceMeters: routeDist,
        failedStops,
        routeGeometry,
        stopCoords,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
