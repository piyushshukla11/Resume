"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useWeather } from "@/components/weather-provider";
import { withMode } from "@/lib/weather-state";

export function HillCharacter() {
  const router = useRouter();
  const { weather, mode } = useWeather();
  const [isHovered, setIsHovered] = useState(false);
  const [isLookingBack, setIsLookingBack] = useState(false);

  const activeWeather = weather ? withMode(weather, mode) : null;
  const condition = activeWeather?.condition ?? "clear";
  const night = activeWeather?.atmosphere === "night" || mode === "clear-night";
  const isRain = condition === "rain" || condition === "thunderstorm" || mode === "rain";
  const isSunny = (condition === "clear" || mode === "clear-day") && !night && !isRain;

  // Select the appropriate high-resolution 3D voxel scene
  const sceneSrc = isRain
    ? "/images/voxel-cliff-scene-rain.png"
    : isSunny
    ? "/images/voxel-cliff-scene-sunny.png"
    : "/images/voxel-cliff-scene-standing.png";

  const weatherLabel = isRain
    ? "Rainy Day · Sheltering under umbrella"
    : isSunny
    ? "Sunny Day · Resting on the voxel cliff edge"
    : night
    ? "Starlit Night · Gazing at constellations"
    : "Atmospheric Day · Looking out across the sky";

  const handleClick = () => {
    if (isLookingBack) return;
    setIsLookingBack(true);
    // Give time for head-turn animation and speech bubble before navigation
    setTimeout(() => {
      router.push("/contact");
    }, 620);
  };

  return (
    <div
      className={`voxel-hill-wrap ${
        isRain ? "weather-rain" : isSunny ? "weather-sunny" : night ? "weather-night" : "weather-cloudy"
      }`}
      aria-label="Interactive 3D Voxel Scene"
    >
      {/* High-Resolution 3D Voxel Scene Base Image */}
      <div className="voxel-scene-container">
        <Image
          src={sceneSrc}
          alt={`3D Voxel Cliff Scene - ${weatherLabel}`}
          width={744}
          height={630}
          priority
          unoptimized
          className="voxel-cliff-scene-img"
        />

        {/* Floating Sakura Blossom Petals in the Breeze */}
        <div className="voxel-petals-wrap" aria-hidden="true">
          <span className="voxel-petal voxel-petal-1" />
          <span className="voxel-petal voxel-petal-2" />
          <span className="voxel-petal voxel-petal-3" />
          <span className="voxel-petal voxel-petal-4" />
        </div>

        {/* Rain Ripples / Umbrella Drips in Rain Mode */}
        {isRain && (
          <div className="voxel-rain-splashes" aria-hidden="true">
            <span className="rain-drip rain-drip-1" />
            <span className="rain-drip rain-drip-2" />
            <span className="rain-drip rain-drip-3" />
          </div>
        )}

        {/* Interactive Character Hitbox & Trigger Button */}
        <button
          type="button"
          className={`voxel-character-hotspot ${isSunny || isRain ? "pose-sitting" : "pose-standing"} ${
            isLookingBack ? "is-activated" : ""
          } ${isHovered ? "is-hovered" : ""}`}
          onClick={handleClick}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          aria-label="Meet Piyush Shukla - Click to view contacts and biography"
          title="Click to meet Piyush & view contacts"
        >
          {/* Animated Head-Turn Layer */}
          {isLookingBack && (
            <div className="voxel-head-turn-overlay">
              <Image
                src="/images/voxel-boy-head-turn.png"
                alt="Piyush looking back with a smile"
                width={130}
                height={140}
                unoptimized
                className="voxel-head-turn-img"
              />
            </div>
          )}

          {/* Interactive Pixel Speech Bubble */}
          <div className={`voxel-speech-bubble ${isLookingBack ? "is-connecting" : isHovered ? "is-visible" : ""}`}>
            {isLookingBack ? (
              <span className="speech-text">
                <span className="speech-wave">👋</span> Hey! Let’s connect!
              </span>
            ) : (
              <span className="speech-text">
                Meet Piyush <span className="speech-arrow">→</span>
              </span>
            )}
            <span className="speech-tail" />
          </div>

          {/* Radial Beacon Pulse on Click */}
          {isLookingBack && <span className="voxel-beacon-ring" />}
        </button>
      </div>
    </div>
  );
}
