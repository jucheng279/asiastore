import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.97.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CategoryDef {
  id: string;
  name: string;
  bgColor: string;
  accentColor: string;
  svgContent: string;
}

function buildSvg(bg: string, accent: string, paths: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <defs>
      <radialGradient id="bg" cx="30%" cy="30%" r="70%">
        <stop offset="0%" stop-color="${accent}" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="${bg}"/>
      </radialGradient>
    </defs>
    <rect width="200" height="200" fill="url(#bg)"/>
    <circle cx="160" cy="40" r="50" fill="${accent}" opacity="0.15"/>
    <circle cx="30" cy="170" r="35" fill="${accent}" opacity="0.1"/>
    ${paths}
  </svg>`;
}

function getCategories(): CategoryDef[] {
  return [
    {
      id: "a0000000-0000-0000-0000-000000000001",
      name: "Vegetables",
      bgColor: "#2d8a4e",
      accentColor: "#7dd3a0",
      svgContent: buildSvg("#2d8a4e", "#7dd3a0", `
        <g transform="translate(55, 35)">
          <!-- Bok choy / leafy green -->
          <ellipse cx="45" cy="110" rx="38" ry="18" fill="#c8e6c9" opacity="0.5"/>
          <path d="M45 25 C25 50, 10 80, 25 110 Q35 125, 45 120 Q55 125, 65 110 C80 80, 65 50, 45 25Z" fill="#4caf50"/>
          <path d="M45 25 C35 50, 30 80, 35 105" stroke="#2e7d32" stroke-width="2.5" fill="none"/>
          <path d="M45 25 C55 50, 60 80, 55 105" stroke="#2e7d32" stroke-width="2.5" fill="none"/>
          <path d="M45 40 C30 55, 20 75, 28 100" stroke="#388e3c" stroke-width="1.5" fill="none" opacity="0.6"/>
          <path d="M45 40 C60 55, 70 75, 62 100" stroke="#388e3c" stroke-width="1.5" fill="none" opacity="0.6"/>
          <!-- Second smaller leaf -->
          <path d="M75 50 C65 65, 62 85, 68 105 Q73 112, 78 108 Q83 112, 85 105 C90 85, 85 65, 75 50Z" fill="#66bb6a" opacity="0.8"/>
          <path d="M75 55 C72 70, 70 85, 72 100" stroke="#2e7d32" stroke-width="1.5" fill="none"/>
          <!-- Small chili accent -->
          <path d="M15 70 Q10 55, 18 45 Q22 55, 17 70Z" fill="#e53935" opacity="0.7"/>
        </g>
      `),
    },
    {
      id: "a0000000-0000-0000-0000-000000000005",
      name: "Frozen",
      bgColor: "#1565c0",
      accentColor: "#90caf9",
      svgContent: buildSvg("#1565c0", "#90caf9", `
        <g transform="translate(40, 30)">
          <!-- Dumpling / bao bun -->
          <ellipse cx="60" cy="115" rx="50" ry="12" fill="#0d47a1" opacity="0.3"/>
          <path d="M20 85 Q60 20, 100 85" fill="#fff9c4" stroke="#f9a825" stroke-width="1.5"/>
          <path d="M20 85 Q60 105, 100 85" fill="#fff9c4" stroke="#f9a825" stroke-width="1.5"/>
          <!-- Pleats on dumpling -->
          <path d="M35 82 Q40 70, 45 82" stroke="#f9a825" stroke-width="1.2" fill="none"/>
          <path d="M50 80 Q55 65, 60 80" stroke="#f9a825" stroke-width="1.2" fill="none"/>
          <path d="M65 80 Q70 65, 75 80" stroke="#f9a825" stroke-width="1.2" fill="none"/>
          <path d="M80 82 Q85 72, 88 83" stroke="#f9a825" stroke-width="1.2" fill="none"/>
          <!-- Snowflake accents -->
          <g transform="translate(15, 25)" opacity="0.7">
            <line x1="0" y1="-12" x2="0" y2="12" stroke="white" stroke-width="2"/>
            <line x1="-10" y1="-6" x2="10" y2="6" stroke="white" stroke-width="2"/>
            <line x1="-10" y1="6" x2="10" y2="-6" stroke="white" stroke-width="2"/>
            <circle cx="0" cy="-12" r="2" fill="white"/>
            <circle cx="0" cy="12" r="2" fill="white"/>
          </g>
          <g transform="translate(105, 50)" opacity="0.5">
            <line x1="0" y1="-8" x2="0" y2="8" stroke="white" stroke-width="1.5"/>
            <line x1="-7" y1="-4" x2="7" y2="4" stroke="white" stroke-width="1.5"/>
            <line x1="-7" y1="4" x2="7" y2="-4" stroke="white" stroke-width="1.5"/>
          </g>
          <!-- Ice crystals -->
          <circle cx="95" cy="25" r="3" fill="white" opacity="0.5"/>
          <circle cx="25" cy="60" r="2" fill="white" opacity="0.4"/>
          <circle cx="110" cy="75" r="2.5" fill="white" opacity="0.45"/>
        </g>
      `),
    },
    {
      id: "a0000000-0000-0000-0000-000000000002",
      name: "Seasoning",
      bgColor: "#bf360c",
      accentColor: "#ff8a65",
      svgContent: buildSvg("#bf360c", "#ff8a65", `
        <g transform="translate(35, 25)">
          <!-- Star anise -->
          <g transform="translate(65, 55)">
            ${[0, 45, 90, 135, 180, 225, 270, 315].map(
              (a) =>
                `<ellipse cx="0" cy="-22" rx="8" ry="16" fill="#8d6e63" transform="rotate(${a})" opacity="0.85"/>`
            ).join("")}
            <circle cx="0" cy="0" r="7" fill="#6d4c41"/>
          </g>
          <!-- Spice jar -->
          <rect x="5" y="70" width="35" height="55" rx="4" fill="#ffccbc" stroke="#e64a19" stroke-width="1.5"/>
          <rect x="10" y="65" width="25" height="10" rx="2" fill="#e64a19"/>
          <rect x="12" y="85" width="21" height="15" rx="2" fill="#e64a19" opacity="0.3"/>
          <text x="22" y="96" font-size="8" fill="#bf360c" text-anchor="middle" font-family="sans-serif" font-weight="bold">S</text>
          <!-- Chili flakes scattered -->
          <circle cx="90" cy="95" r="3" fill="#f44336" opacity="0.8"/>
          <circle cx="100" cy="105" r="2.5" fill="#e53935" opacity="0.7"/>
          <circle cx="85" cy="108" r="2" fill="#ff5722" opacity="0.6"/>
          <circle cx="95" cy="115" r="2.8" fill="#f44336" opacity="0.65"/>
          <circle cx="108" cy="98" r="2" fill="#ff5722" opacity="0.5"/>
          <!-- Small leaf accent -->
          <path d="M100 80 Q95 70, 105 68 Q100 75, 100 80Z" fill="#66bb6a" opacity="0.6"/>
        </g>
      `),
    },
    {
      id: "a0000000-0000-0000-0000-000000000003",
      name: "Sauce",
      bgColor: "#4e342e",
      accentColor: "#a1887f",
      svgContent: buildSvg("#4e342e", "#a1887f", `
        <g transform="translate(30, 20)">
          <!-- Main soy sauce bottle -->
          <rect x="45" y="45" width="40" height="90" rx="5" fill="#5d4037" stroke="#3e2723" stroke-width="1.5"/>
          <rect x="52" y="30" width="26" height="20" rx="3" fill="#4e342e" stroke="#3e2723" stroke-width="1"/>
          <rect x="60" y="22" width="10" height="12" rx="2" fill="#6d4c41"/>
          <rect x="52" y="65" width="26" height="30" rx="2" fill="#ff8f00" opacity="0.9"/>
          <text x="65" y="85" font-size="12" fill="#4e342e" text-anchor="middle" font-family="sans-serif" font-weight="bold">醤</text>
          <!-- Smaller oyster sauce bottle -->
          <rect x="95" y="60" width="30" height="70" rx="4" fill="#e65100" stroke="#bf360c" stroke-width="1.2"/>
          <rect x="100" y="50" width="20" height="15" rx="2" fill="#bf360c"/>
          <rect x="103" y="75" width="14" height="20" rx="1.5" fill="#fff8e1" opacity="0.8"/>
          <!-- Sauce drip -->
          <path d="M55 135 Q58 145, 55 150 Q52 145, 55 135Z" fill="#3e2723" opacity="0.5"/>
          <!-- Small dish with sauce -->
          <ellipse cx="20" cy="125" rx="18" ry="8" fill="#8d6e63"/>
          <ellipse cx="20" cy="122" rx="15" ry="6" fill="#3e2723"/>
          <ellipse cx="20" cy="121" rx="12" ry="4" fill="#4e342e" opacity="0.8"/>
        </g>
      `),
    },
    {
      id: "a0000000-0000-0000-0000-000000000004",
      name: "Convenient",
      bgColor: "#e65100",
      accentColor: "#ffcc80",
      svgContent: buildSvg("#e65100", "#ffcc80", `
        <g transform="translate(30, 25)">
          <!-- Instant noodle cup -->
          <path d="M35 45 L25 130 Q65 145, 105 130 L95 45Z" fill="#fff8e1" stroke="#f57c00" stroke-width="1.5"/>
          <ellipse cx="65" cy="45" rx="32" ry="10" fill="#ffcc80" stroke="#f57c00" stroke-width="1"/>
          <!-- Noodle waves inside -->
          <path d="M40 60 Q52 55, 58 62 Q65 55, 75 62 Q82 55, 90 60" stroke="#ff9800" stroke-width="2" fill="none" opacity="0.5"/>
          <!-- Label band -->
          <path d="M30 75 L28 105 Q65 115, 102 105 L100 75 Q65 85, 30 75Z" fill="#f44336" opacity="0.85"/>
          <text x="65" y="95" font-size="11" fill="white" text-anchor="middle" font-family="sans-serif" font-weight="bold">NOODLE</text>
          <!-- Steam -->
          <path d="M50 30 Q48 20, 52 12" stroke="white" stroke-width="1.5" fill="none" opacity="0.5"/>
          <path d="M65 28 Q63 16, 67 8" stroke="white" stroke-width="1.5" fill="none" opacity="0.6"/>
          <path d="M80 30 Q78 20, 82 12" stroke="white" stroke-width="1.5" fill="none" opacity="0.4"/>
          <!-- Chopsticks -->
          <line x1="75" y1="25" x2="115" y2="-5" stroke="#8d6e63" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="80" y1="28" x2="120" y2="-2" stroke="#a1887f" stroke-width="2.5" stroke-linecap="round"/>
        </g>
      `),
    },
    {
      id: "a0000000-0000-0000-0000-000000000006",
      name: "Snacks",
      bgColor: "#ad1457",
      accentColor: "#f48fb1",
      svgContent: buildSvg("#ad1457", "#f48fb1", `
        <g transform="translate(25, 20)">
          <!-- Snack packet 1 -->
          <rect x="10" y="40" width="50" height="70" rx="6" fill="#ffd54f" stroke="#f9a825" stroke-width="1.5"/>
          <rect x="17" y="55" width="36" height="25" rx="3" fill="#ff7043" opacity="0.8"/>
          <text x="35" y="72" font-size="9" fill="white" text-anchor="middle" font-family="sans-serif" font-weight="bold">CRISPY</text>
          <path d="M10 40 Q35 30, 60 40" fill="#f9a825"/>
          <!-- Snack packet 2 -->
          <rect x="70" y="50" width="45" height="65" rx="6" fill="#81d4fa" stroke="#0288d1" stroke-width="1.5"/>
          <rect x="76" y="62" width="33" height="22" rx="3" fill="#e91e63" opacity="0.7"/>
          <text x="92" y="77" font-size="8" fill="white" text-anchor="middle" font-family="sans-serif" font-weight="bold">SHRIMP</text>
          <path d="M70 50 Q92 42, 115 50" fill="#0288d1"/>
          <!-- Scattered snack pieces -->
          <circle cx="40" cy="125" r="5" fill="#ffab40" opacity="0.7"/>
          <circle cx="55" cy="130" r="4" fill="#ff7043" opacity="0.6"/>
          <circle cx="30" cy="132" r="3.5" fill="#ffd54f" opacity="0.7"/>
          <circle cx="100" cy="128" r="4.5" fill="#80deea" opacity="0.6"/>
          <circle cx="85" cy="132" r="3" fill="#f48fb1" opacity="0.5"/>
          <!-- Star burst -->
          <g transform="translate(125, 35)" opacity="0.7">
            <polygon points="0,-10 3,-3 10,-3 4,2 6,10 0,5 -6,10 -4,2 -10,-3 -3,-3" fill="#ffd54f"/>
          </g>
        </g>
      `),
    },
    {
      id: "a0000000-0000-0000-0000-000000000007",
      name: "Beverage",
      bgColor: "#00695c",
      accentColor: "#80cbc4",
      svgContent: buildSvg("#00695c", "#80cbc4", `
        <g transform="translate(25, 15)">
          <!-- Bubble tea cup -->
          <path d="M45 50 L38 140 Q65 150, 92 140 L85 50Z" fill="#fff9c4" stroke="#f9a825" stroke-width="1.5" opacity="0.9"/>
          <ellipse cx="65" cy="50" rx="22" ry="7" fill="#ffcc80" stroke="#f9a825" stroke-width="1"/>
          <!-- Tea liquid -->
          <path d="M42 70 L38 140 Q65 148, 92 140 L88 70 Q65 78, 42 70Z" fill="#a1887f" opacity="0.6"/>
          <!-- Boba pearls -->
          <circle cx="52" cy="120" r="5" fill="#3e2723" opacity="0.8"/>
          <circle cx="65" cy="125" r="5" fill="#3e2723" opacity="0.8"/>
          <circle cx="78" cy="118" r="5" fill="#3e2723" opacity="0.8"/>
          <circle cx="58" cy="132" r="4.5" fill="#4e342e" opacity="0.7"/>
          <circle cx="72" cy="133" r="4.5" fill="#4e342e" opacity="0.7"/>
          <circle cx="48" cy="110" r="4" fill="#5d4037" opacity="0.6"/>
          <circle cx="80" cy="108" r="4" fill="#5d4037" opacity="0.6"/>
          <!-- Straw -->
          <rect x="62" y="15" width="6" height="45" rx="3" fill="#e91e63"/>
          <rect x="60" y="12" width="10" height="8" rx="2" fill="#c2185b"/>
          <!-- Canned drink -->
          <rect x="105" y="60" width="30" height="50" rx="4" fill="#26a69a"/>
          <rect x="105" y="60" width="30" height="12" rx="4" fill="#00897b"/>
          <ellipse cx="120" cy="60" rx="15" ry="4" fill="#4db6ac"/>
          <rect x="110" y="78" width="20" height="18" rx="2" fill="white" opacity="0.3"/>
          <text x="120" y="91" font-size="7" fill="white" text-anchor="middle" font-family="sans-serif" font-weight="bold">TEA</text>
        </g>
      `),
    },
  ];
}

async function svgToJpeg(svgString: string): Promise<Uint8Array> {
  const svgBase64 = btoa(svgString);
  const dataUrl = `data:image/svg+xml;base64,${svgBase64}`;

  const response = await fetch(
    `https://svg-to-image.netlify.app/.netlify/functions/svg-to-image?url=${encodeURIComponent(dataUrl)}&width=200&height=200&format=jpeg`
  );

  if (!response.ok) {
    throw new Error(`SVG conversion failed: ${response.status}`);
  }

  return new Uint8Array(await response.arrayBuffer());
}

async function svgToPngViaResvg(svgString: string): Promise<Uint8Array> {
  const { Resvg } = await import("npm:@aspect-build/resvg-wasm@0.1.0");
  const resvg = new Resvg(svgString, {
    fitTo: { mode: "width", value: 200 },
  });
  const rendered = resvg.render();
  return rendered.asPng();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (!profile?.is_admin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const categories = getCategories();
    const results: { id: string; name: string; status: string; url?: string }[] = [];

    const existingFiles = await supabase.storage
      .from("category-images")
      .list();

    if (existingFiles.data && existingFiles.data.length > 0) {
      const filesToDelete = existingFiles.data.map((f) => f.name);
      await supabase.storage.from("category-images").remove(filesToDelete);
    }

    for (const cat of categories) {
      try {
        const svgString = cat.svgContent;
        const encoder = new TextEncoder();
        const svgBytes = encoder.encode(svgString);

        const filePath = `${cat.id}.svg`;
        const { error: uploadErr } = await supabase.storage
          .from("category-images")
          .upload(filePath, svgBytes, {
            contentType: "image/svg+xml",
            upsert: true,
          });

        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage
          .from("category-images")
          .getPublicUrl(filePath);

        const publicUrl = urlData.publicUrl;

        const { error: catErr } = await supabase
          .from("categories")
          .update({ image_url: publicUrl })
          .eq("id", cat.id);
        if (catErr) throw catErr;

        const { error: draftErr } = await supabase
          .from("draft_categories")
          .update({ image_url: publicUrl })
          .eq("id", cat.id);
        if (draftErr) throw draftErr;

        results.push({
          id: cat.id,
          name: cat.name,
          status: "success",
          url: publicUrl,
        });
      } catch (err) {
        results.push({
          id: cat.id,
          name: cat.name,
          status: `error: ${(err as Error).message}`,
        });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
