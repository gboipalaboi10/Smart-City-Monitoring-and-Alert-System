export default async function handler(req: Request): Promise<Response> {
  try {
    const lat = 14.32;
    const lon = 120.93;

    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}` +
      `&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,pressure_msl,wind_speed_10m` +
      `&hourly=precipitation_probability` +
      `&timezone=Asia%2FSingapore` +
      `&forecast_days=1`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      return Response.json({ error: "Weather service error" }, { status: 500 });
    }

    const current = data.current;
    const hourly = data.hourly;

    const isThunderstorm = [95, 96, 99].includes(current.weather_code);
    const maxRainProb = Math.max(...hourly.precipitation_probability);

    const getCondition = (code: number) => {
      if (code === 0) return "Clear Sky";
      if (code <= 3) return "Partly Cloudy";
      if (code <= 48) return "Foggy";
      if (code <= 57) return "Drizzle";
      if (code <= 67) return "Rainy";
      if (code <= 77) return "Snowy";
      if (code <= 82) return "Rain Showers";
      if (code <= 99) return "Thunderstorm";
      return "Overcast";
    };

    const getIcon = (code: number) => {
      if (code === 0) return "01d";
      if (code <= 3) return "02d";
      if (code <= 48) return "50d";
      if (code <= 57) return "09d";
      if (code <= 67) return "10d";
      if (code <= 82) return "09d";
      if (code <= 99) return "11d";
      return "03d";
    };

    return Response.json({
      current: {
        temp: current.temperature_2m,
        feels_like: current.apparent_temperature,
        humidity: current.relative_humidity_2m,
        pressure: current.pressure_msl,
        wind_speed: current.wind_speed_10m,
        description: getCondition(current.weather_code),
        main: getCondition(current.weather_code).split(" ")[0],
        icon: getIcon(current.weather_code),
      },
      alerts: {
        thunderstorm: isThunderstorm,
        rainProbability: maxRainProb,
        summary: isThunderstorm
          ? "Thunderstorm detected in the area!"
          : maxRainProb > 50
          ? "High probability of rain in the next 24h."
          : "No immediate weather threats.",
      },
    });
  } catch (error) {
    return Response.json(
      { error: "Failed to fetch weather data" },
      { status: 500 }
    );
  }
}