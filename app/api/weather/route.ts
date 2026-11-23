import { NextRequest, NextResponse } from "next/server";
import { getWeather, moonPhaseAt, solarElevationAt, atmosphereAt } from "@/lib/weather";

export const revalidate = 600;

const fallback = {
  latitude: 12.9716,
  longitude: 77.5946,
  location: "Bengaluru",
  country: "India",
};

export async function GET(request: NextRequest) {
  const latParam = request.nextUrl.searchParams.get("lat");
  const lonParam = request.nextUrl.searchParams.get("lon");
  let latitude = latParam !== null ? Number(latParam) : NaN;
  let longitude = lonParam !== null ? Number(lonParam) : NaN;
  let location = request.nextUrl.searchParams.get("label")?.slice(0, 60) || "Your location";
  let country: string | undefined;
  let source: "open-meteo" | "fallback" = "open-meteo";

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    const forwarded = request.headers.get("x-forwarded-for");
    const clientIp = forwarded ? forwarded.split(",")[0].trim() : request.headers.get("x-real-ip");
    const isPublicIp = Boolean(clientIp && !clientIp.startsWith("127.") && !clientIp.startsWith("192.168.") && !clientIp.startsWith("10.") && clientIp !== "::1");
    const ipwhoisUrl = isPublicIp ? `https://ipwho.is/${clientIp}` : "https://ipwho.is/";

    try {
      const ipResponse = await fetch(ipwhoisUrl, { next: { revalidate: 1800 }, signal: AbortSignal.timeout(3000) });
      if (!ipResponse.ok) throw new Error("IP geolocation unavailable");
      const ip = await ipResponse.json();
      if (!ip.success) throw new Error(ip.message || "IP geolocation lookup failed");
      latitude = Number(ip.latitude);
      longitude = Number(ip.longitude);
      location = [ip.city, ip.region_code || ip.region].filter(Boolean).join(", ") || ip.city || "Your location";
      country = ip.country;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new Error("IP geolocation returned no coordinates");
    } catch {
      try {
        const altUrl = isPublicIp ? `http://ip-api.com/json/${clientIp}` : "http://ip-api.com/json/";
        const altResponse = await fetch(altUrl, { next: { revalidate: 1800 }, signal: AbortSignal.timeout(2500) });
        if (!altResponse.ok) throw new Error("Secondary IP lookup failed");
        const altData = await altResponse.json();
        if (altData.status !== "success") throw new Error("Secondary IP lookup failed");
        latitude = Number(altData.lat);
        longitude = Number(altData.lon);
        location = [altData.city, altData.regionName || altData.region].filter(Boolean).join(", ") || altData.city || "Your location";
        country = altData.country;
      } catch {
        latitude = fallback.latitude;
        longitude = fallback.longitude;
        location = fallback.location;
        country = fallback.country;
        source = "fallback";
      }
    }
  } else if (location === "Your location") {
    // Reverse geocode coordinates to display the visitor's actual city name
    try {
      const revUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
      const revResponse = await fetch(revUrl, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(2500) });
      if (revResponse.ok) {
        const revData = await revResponse.json();
        const city = revData.city || revData.locality || revData.principalSubdivision;
        const sub = revData.principalSubdivisionCode?.replace(/^[A-Z]{2}-/, "") || revData.principalSubdivision;
        if (city) {
          location = [city, sub].filter(Boolean).join(", ");
          country = revData.countryName || country;
        }
      }
    } catch {
      // Retain "Your location"
    }
  }

  try {
    const weather = await getWeather(latitude, longitude);
    return NextResponse.json({ ...weather, location, country, source }, { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800" } });
  } catch {
    const now = new Date();
    const solarElevation = solarElevationAt(now, latitude, longitude);
    return NextResponse.json({
      latitude, longitude, location, country, timezone: "Asia/Kolkata", temperature: 22, feelsLike: 22,
      humidity: 48, cloudCover: 12, precipitation: 0, windSpeed: 4, windDirection: 90, visibility: 10000,
      weatherCode: 0, condition: "clear", isDay: solarElevation > 0, sunrise: null, sunset: null,
      moonPhase: moonPhaseAt(now), solarElevation, atmosphere: atmosphereAt(solarElevation),
      observedAt: now.toISOString(), source: "fallback",
    }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } });
  }
}
