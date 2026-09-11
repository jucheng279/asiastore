import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const LINKOPING_LAT = 58.4108;
const LINKOPING_LON = 15.6255;
const LINKOPING_POSTCODES = ["580", "581", "582", "583", "584", "585", "586", "587", "588", "589"];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const text = url.searchParams.get("text");

    if (!text || text.trim().length < 2) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const lang = url.searchParams.get("lang") || "en";

    const params = new URLSearchParams({
      text: text.trim(),
      apiKey,
      filter: "countrycode:se",
      bias: `proximity:${LINKOPING_LON},${LINKOPING_LAT}`,
      format: "json",
      limit: "6",
      type: "amenity",
      lang,
    });

    const geoRes = await fetch(
      `https://api.geoapify.com/v1/geocode/autocomplete?${params}`,
    );

    if (!geoRes.ok) {
      return new Response(
        JSON.stringify({ error: "Geocoding service error" }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const geoData = await geoRes.json();
    const raw = geoData.results || [];

    const filtered = raw
      .filter((r: Record<string, unknown>) => {
        const postcode = (r.postcode as string) || "";
        return LINKOPING_POSTCODES.some((prefix) =>
          postcode.replace(/\s/g, "").startsWith(prefix)
        );
      })
      .map((r: Record<string, unknown>) => ({
        street: r.street || "",
        housenumber: r.housenumber || "",
        postcode: r.postcode || "",
        city: r.city || r.town || r.municipality || "Linköping",
        formatted: r.formatted || "",
      }));

    return new Response(JSON.stringify({ results: filtered }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
