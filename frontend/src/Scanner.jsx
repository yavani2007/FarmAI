import { useEffect, useRef, useState } from "react";
import "./Scanner.css";

const REGION_STORAGE_KEY = "agrivision_selected_region";
const WEATHER_STORAGE_KEY = "agrivision_current_weather";

const cropOptions = [
  "Tomato",
  "Potato",
  "Grape",
  "Orange",
  "Peach",
  "Pepper",
  "Corn",
  "Cherry",
  "Blueberry",
  "Raspberry",
  "Soybean",
  "Squash",
  "Strawberry",
];

function Scanner() {
  const [image, setImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const [crop, setCrop] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const [regionSearch, setRegionSearch] = useState("");
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [regionResults, setRegionResults] = useState([]);
  const [searchingRegion, setSearchingRegion] = useState(false);

  const [weather, setWeather] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(false);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    const savedRegion = localStorage.getItem(REGION_STORAGE_KEY);

    if (savedRegion) {
      try {
        const parsedRegion = JSON.parse(savedRegion);
        setSelectedRegion(parsedRegion);
        loadWeather(parsedRegion);
      } catch {
        localStorage.removeItem(REGION_STORAGE_KEY);
      }
    }

    return () => {
      stopCamera();
    };
  }, []);

  const weatherDescription = (code) => {
    const weatherCodes = {
      0: "Clear sky",
      1: "Mainly clear",
      2: "Partly cloudy",
      3: "Overcast",
      45: "Fog",
      48: "Depositing rime fog",
      51: "Light drizzle",
      53: "Moderate drizzle",
      55: "Dense drizzle",
      61: "Light rain",
      63: "Moderate rain",
      65: "Heavy rain",
      71: "Light snow",
      73: "Moderate snow",
      75: "Heavy snow",
      80: "Rain showers",
      81: "Moderate rain showers",
      82: "Heavy rain showers",
      95: "Thunderstorm",
      96: "Thunderstorm with hail",
      99: "Thunderstorm with heavy hail",
    };

    return weatherCodes[code] || "Current conditions";
  };

  const loadWeather = async (region) => {
    if (!region?.latitude || !region?.longitude) return;

    setLoadingWeather(true);

    try {
      const url =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${region.latitude}` +
        `&longitude=${region.longitude}` +
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m` +
        `&timezone=auto`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Weather request failed");
      }

      const data = await response.json();

      const currentWeather = {
        temperature: data.current?.temperature_2m,
        humidity: data.current?.relative_humidity_2m,
        rain: data.current?.rain ?? data.current?.precipitation ?? 0,
        wind: data.current?.wind_speed_10m,
        condition: weatherDescription(data.current?.weather_code),
        updatedAt: new Date().toISOString(),
      };

      setWeather(currentWeather);

      localStorage.setItem(
        WEATHER_STORAGE_KEY,
        JSON.stringify(currentWeather)
      );
    } catch {
      setWeather(null);
    } finally {
      setLoadingWeather(false);
    }
  };

  const searchRegion = async () => {
    const query = regionSearch.trim();

    if (!query) {
      setError("Enter an Indian city or district.");
      return;
    }

    setSearchingRegion(true);
    setError("");
    setRegionResults([]);

    try {
      const url =
        `https://geocoding-api.open-meteo.com/v1/search` +
        `?name=${encodeURIComponent(query)}` +
        `&count=8` +
        `&language=en` +
        `&format=json` +
        `&countryCode=IN`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Region search failed");
      }

      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        setError("No Indian location found. Try another city or district.");
        return;
      }

      setRegionResults(data.results);
    } catch {
      setError("Could not search the region. Check your internet connection.");
    } finally {
      setSearchingRegion(false);
    }
  };

  const selectRegion = async (region) => {
    const regionData = {
      name: region.name,
      admin1: region.admin1 || "",
      country: region.country || "India",
      latitude: region.latitude,
      longitude: region.longitude,
    };

    setSelectedRegion(regionData);
    setRegionResults([]);
    setRegionSearch("");
    setError("");

    localStorage.setItem(
      REGION_STORAGE_KEY,
      JSON.stringify(regionData)
    );

    await loadWeather(regionData);
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image.");
      return;
    }

    setSelectedFile(file);
    setImage(URL.createObjectURL(file));
    setResult(null);
    setError("");
  };

  const startCamera = async () => {
    setCameraError("");
    setError("");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Camera access is not supported by this browser.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setCameraOpen(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch {
      setCameraError(
        "Camera permission was denied or the camera is already in use."
      );
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });

      streamRef.current = null;
    }

    setCameraOpen(false);
    setScanning(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    if (scanning) return;

    setScanning(true);
    setCameraError("");
    setError("");

    await new Promise((resolve) => {
      setTimeout(resolve, 1800);
    });

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video.videoWidth || !video.videoHeight) {
      setScanning(false);
      setCameraError("Camera image is not ready. Please try again.");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setScanning(false);
          setCameraError("Could not capture the image.");
          return;
        }

        const file = new File(
          [blob],
          `farm-scan-${Date.now()}.jpg`,
          {
            type: "image/jpeg",
          }
        );

        setSelectedFile(file);
        setImage(URL.createObjectURL(blob));
        setResult(null);
        setError("");
        setScanning(false);

        stopCamera();
      },
      "image/jpeg",
      0.92
    );
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError("Please upload or capture an image first.");
      return;
    }

    setAnalyzing(true);
    setResult(null);
    setError("");

    const formData = new FormData();

    formData.append("file", selectedFile);

    if (crop) {
      formData.append("crop", crop);
    }

    if (selectedRegion) {
      formData.append(
        "location",
        `${selectedRegion.name}, ${selectedRegion.admin1 || ""}, India`
      );
    }

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/analyze",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Backend request failed");
      }

      const data = await response.json();

      const topDisease =
        data.disease_analysis?.predictions?.[0];

      const advisoryData = {
        crop:
          data.disease_analysis?.crop ||
          crop ||
          "Unknown crop",

        disease: topDisease
          ? topDisease.label
              .replaceAll("___", " — ")
              .replaceAll("_", " ")
          : "No disease prediction available",

        confidence: topDisease
          ? topDisease.confidence
          : 0,

        recommendation: topDisease
          ? `The AI model identified ${topDisease.label
              .replaceAll("___", " — ")
              .replaceAll("_", " ")} with ${
              topDisease.confidence
            }% confidence. Review the affected area and continue monitoring nearby plants.`
          : "No supported disease prediction was found. Continue regular crop monitoring.",

        region: selectedRegion
          ? `${selectedRegion.name}, ${
              selectedRegion.admin1 || ""
            }`
          : "Not selected",

        weather: weather || null,

        id: Date.now(),

        date: new Date().toISOString(),
      };

      localStorage.setItem(
        "agrivision_last_result",
        JSON.stringify(advisoryData)
      );

      const previousHistory = JSON.parse(
        localStorage.getItem("agrivision_scan_history") ||
          "[]"
      );

      localStorage.setItem(
        "agrivision_scan_history",
        JSON.stringify(
          [...previousHistory, advisoryData].slice(-100)
        )
      );

      setResult({
        type:
          data.detection_count > 0
            ? data.detections[0].class
            : "No Objects Detected",

        confidence:
          data.detection_count > 0
            ? data.detections[0].confidence
            : null,

        severity:
          data.detection_count > 0
            ? "Detected"
            : "No Detection",

        recommendation:
          data.detection_count > 0
            ? `${data.detection_count} object(s) detected by YOLO.`
            : "YOLO completed the image analysis but did not detect a supported object.",

        model: data.model,

        detectionCount: data.detection_count,

        detections: data.detections,

        diseaseAnalysis: data.disease_analysis,
      });
    } catch {
      setError(
        "Could not connect to the AI backend. Make sure FastAPI is running."
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const clearImage = () => {
    setImage(null);
    setSelectedFile(null);
    setResult(null);
    setError("");
  };

  return (
    <div className="scanner-page">

      <div className="scanner-header">
        <div>
          <p className="eyebrow">
            AI-POWERED FARM MONITORING
          </p>

          <h1>AI Farm Scanner</h1>

          <p className="scanner-subtitle">
            Select your region, check local weather and analyze your crop image.
          </p>
        </div>

        <div className="scanner-status">
          <span className="status-dot"></span>
          AI System Online
        </div>
      </div>

      {/* REGION AND WEATHER */}

      <div className="region-weather-card">

        <div className="region-section">

          <p className="eyebrow">STEP 1</p>

          <h2>Select Your Region</h2>

          <p>
            Weather will be automatically loaded for your selected location.
          </p>

          <div className="region-search-row">

            <input
              type="text"
              value={regionSearch}
              onChange={(event) =>
                setRegionSearch(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  searchRegion();
                }
              }}
              placeholder="Search Indian city or district"
            />

            <button
              type="button"
              onClick={searchRegion}
              disabled={searchingRegion}
            >
              {searchingRegion
                ? "Searching..."
                : "Search Region"}
            </button>

          </div>

          {regionResults.length > 0 && (
            <div className="region-results">

              {regionResults.map((region, index) => (
                <button
                  type="button"
                  className="region-result-item"
                  key={`${region.id}-${index}`}
                  onClick={() => selectRegion(region)}
                >
                  <strong>
                    {region.name}
                  </strong>

                  <span>
                    {region.admin1
                      ? `${region.admin1}, `
                      : ""}
                    {region.country || "India"}
                  </span>
                </button>
              ))}

            </div>
          )}

        </div>

        {selectedRegion && (
          <div className="weather-section">

            <div className="selected-region-title">
              <span>Selected Region</span>

              <h2>
                📍 {selectedRegion.name}
                {selectedRegion.admin1
                  ? `, ${selectedRegion.admin1}`
                  : ""}
              </h2>
            </div>

            {loadingWeather ? (
              <div className="weather-loading">
                Loading local weather...
              </div>
            ) : weather ? (
              <div className="weather-grid">

                <div className="weather-box">
                  <span>Temperature</span>
                  <strong>
                    {weather.temperature}°C
                  </strong>
                </div>

                <div className="weather-box">
                  <span>Humidity</span>
                  <strong>
                    {weather.humidity}%
                  </strong>
                </div>

                <div className="weather-box">
                  <span>Rain</span>
                  <strong>
                    {weather.rain} mm
                  </strong>
                </div>

                <div className="weather-box">
                  <span>Wind</span>
                  <strong>
                    {weather.wind} km/h
                  </strong>
                </div>

                <div className="weather-box">
                  <span>Conditions</span>
                  <strong>
                    {weather.condition}
                  </strong>
                </div>

              </div>
            ) : (
              <div className="weather-loading">
                Weather data unavailable.
              </div>
            )}

          </div>
        )}

      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* MAIN SCANNER */}

      <div className="scanner-grid">

        {/* CAMERA / UPLOAD */}

        <div className="upload-card">

          <div className="card-title">

            <span className="card-icon">
              📷
            </span>

            <div>
              <h2>Analyze Crop Image</h2>

              <p>
                Crop selection is optional. Upload an image or scan with your camera.
              </p>
            </div>

          </div>

          {/* CROP */}

          <div className="crop-selection">

            <label>
              Select Crop <span>(Optional)</span>
            </label>

            <select
              value={crop}
              onChange={(event) =>
                setCrop(event.target.value)
              }
            >

              <option value="">
                Let AI identify crop
              </option>

              {cropOptions.map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ))}

            </select>

          </div>

          {/* CAMERA SCANNER */}

          {cameraOpen ? (

            <div className="camera-scanner">

              <div className="camera-header">

                <div>
                  <strong>
                    AI Camera Scanner
                  </strong>

                  <span>
                    Position the plant inside the frame
                  </span>
                </div>

                <div className="camera-live">
                  <span></span>
                  LIVE
                </div>

              </div>

              <div className="camera-view">

                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                />

                <div className="scanner-frame">

                  <span className="corner top-left"></span>
                  <span className="corner top-right"></span>
                  <span className="corner bottom-left"></span>
                  <span className="corner bottom-right"></span>

                  {scanning && (
                    <div className="scanner-line"></div>
                  )}

                  <div className="scanner-center-text">
                    {scanning
                      ? "Scanning plant..."
                      : "Place plant inside frame"}
                  </div>

                </div>

                {scanning && (
                  <div className="scan-overlay">
                    <div className="scan-circle">
                      AI
                    </div>
                  </div>
                )}

              </div>

              <div className="camera-controls">

                <button
                  type="button"
                  className="scan-button"
                  onClick={capturePhoto}
                  disabled={scanning}
                >
                  {scanning
                    ? "Scanning..."
                    : "🔍 Scan Plant"}
                </button>

                <button
                  type="button"
                  className="close-camera-button"
                  onClick={stopCamera}
                  disabled={scanning}
                >
                  Close Camera
                </button>

              </div>

              {cameraError && (
                <div className="camera-error">
                  {cameraError}
                </div>
              )}

              <canvas
                ref={canvasRef}
                style={{ display: "none" }}
              />

            </div>

          ) : (

            <>

              {/* IMAGE PREVIEW */}

              {image ? (

                <div className="captured-image-card">

                  <div className="captured-image-header">
                    <strong>
                      Captured Image
                    </strong>

                    <span>
                      Ready for AI analysis
                    </span>
                  </div>

                  <img
                    src={image}
                    alt="Captured farm"
                    className="image-preview"
                  />

                  <button
                    type="button"
                    className="remove-image-button"
                    onClick={clearImage}
                  >
                    Remove Image
                  </button>

                </div>

              ) : (

                <label className="upload-area">

                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={handleImageChange}
                  />

                  <div className="upload-icon">
                    ⬆
                  </div>

                  <h3>
                    Choose an image
                  </h3>

                  <p>
                    Upload a crop or farm image
                  </p>

                </label>

              )}

              {/* CAMERA BUTTON */}

              {!image && (
                <div className="camera-start-section">

                  <div className="camera-divider">
                    <span>OR</span>
                  </div>

                  <button
                    type="button"
                    className="open-camera-button"
                    onClick={startCamera}
                  >
                    📷 Open AI Camera Scanner
                  </button>

                  <p>
                    Scan a plant directly using your camera
                  </p>

                </div>
              )}

              {/* ANALYZE */}

              {selectedFile && (
                <button
                  type="button"
                  className="analyze-button"
                  onClick={handleAnalyze}
                  disabled={analyzing}
                >
                  {analyzing
                    ? "Analyzing with AI..."
                    : "Analyze Image with AI"}
                </button>
              )}

            </>

          )}

        </div>

        {/* RESULTS */}

        <div className="result-card">

          <div className="card-title">

            <span className="card-icon">
              🧠
            </span>

            <div>
              <h2>Detection Results</h2>

              <p>
                Results from the AI analysis engine
              </p>
            </div>

          </div>

          {!result && !analyzing && (
            <div className="empty-result">

              <div className="empty-icon">
                🔍
              </div>

              <h3>
                Ready for Analysis
              </h3>

              <p>
                Select your region, upload an image or use the camera,
                then start detection.
              </p>

            </div>
          )}

          {analyzing && (
            <div className="empty-result">

              <div className="empty-icon">
                ⚙️
              </div>

              <h3>
                AI Analysis in Progress
              </h3>

              <p>
                YOLO and the disease model are processing your image.
              </p>

            </div>
          )}

          {result && (
            <div className="analysis-result">

              <div className="result-main">

                <div>

                  <span className="result-label">
                    YOLO Detection
                  </span>

                  <h3>
                    {result.type}
                  </h3>

                </div>

                <div className="result-badge">

                  {result.confidence !== null
                    ? `${result.confidence}%`
                    : "0 detections"}

                </div>

              </div>

              <div className="result-details">

                <div className="detail-box">
                  <span>Severity</span>
                  <strong>
                    {result.severity}
                  </strong>
                </div>

                <div className="detail-box">
                  <span>AI Model</span>
                  <strong>
                    {result.model}
                  </strong>
                </div>

                <div className="detail-box">
                  <span>Objects</span>
                  <strong>
                    {result.detectionCount}
                  </strong>
                </div>

              </div>

              <div className="observation-box">

                <span>
                  AI Observation
                </span>

                <p>
                  {result.recommendation}
                </p>

              </div>

              {result.detections &&
                result.detections.length > 0 && (
                  <div className="detection-list">

                    <h3>
                      Detected Objects
                    </h3>

                    {result.detections.map(
                      (item, index) => (
                        <div
                          className="detection-row"
                          key={`${item.class}-${index}`}
                        >

                          <span>
                            {item.class}
                          </span>

                          <strong>
                            {item.confidence}%
                          </strong>

                        </div>
                      )
                    )}

                  </div>
                )}

              {result.diseaseAnalysis && (
                <div className="disease-analysis">

                  <h3>
                    🌿 Crop Disease Analysis
                  </h3>

                  <p>
                    <strong>Crop:</strong>{" "}
                    {result.diseaseAnalysis.crop}
                  </p>

                  <p>
                    <strong>Status:</strong>{" "}
                    {result.diseaseAnalysis.status}
                  </p>

                  <p>
                    {result.diseaseAnalysis.message}
                  </p>

                  {result.diseaseAnalysis.predictions &&
                    result.diseaseAnalysis.predictions.length > 0 && (
                      <>

                        <h4>
                          Disease Predictions
                        </h4>

                        {result.diseaseAnalysis.predictions.map(
                          (prediction, index) => (
                            <div
                              className="detection-row"
                              key={`${prediction.label}-${index}`}
                            >

                              <span>
                                {prediction.label
                                  .replaceAll("___", " — ")
                                  .replaceAll("_", " ")}
                              </span>

                              <strong>
                                {prediction.confidence}%
                              </strong>

                            </div>
                          )
                        )}

                      </>
                    )}

                  <a
                    href="#advisory"
                    className="advisory-link"
                  >
                    🌿 View AI Advisory →
                  </a>

                  <small>
                    {result.diseaseAnalysis.warning}
                  </small>

                </div>
              )}

            </div>
          )}

        </div>

      </div>

      {/* CAPABILITIES */}

      <div className="detection-info">

        <div className="section-heading">

          <p className="eyebrow">
            AI CAPABILITIES
          </p>

          <h2>
            What can AI detect?
          </h2>

          <p>
            AgriVision AI combines computer vision and
            agricultural disease analysis.
          </p>

        </div>

        <div className="capability-grid">

          <div className="capability-card">
            <div className="capability-icon">
              🌿
            </div>

            <h3>
              Crop Diseases
            </h3>

            <p>
              Analyze supported crop leaf images for
              agricultural disease patterns.
            </p>
          </div>

          <div className="capability-card">
            <div className="capability-icon">
              🐛
            </div>

            <h3>
              Pests
            </h3>

            <p>
              Detect supported objects using the YOLO
              computer vision model.
            </p>
          </div>

          <div className="capability-card">
            <div className="capability-icon">
              🌱
            </div>

            <h3>
              Weeds
            </h3>

            <p>
              Support intelligent field monitoring when
              supported by the detection model.
            </p>
          </div>

          <div className="capability-card">
            <div className="capability-icon">
              ✅
            </div>

            <h3>
              Crop Health
            </h3>

            <p>
              Combine image analysis with available
              agricultural AI insights.
            </p>
          </div>

        </div>

      </div>

      {/* AI FLOW */}

      <div className="ai-flow">

        <div className="flow-step">
          <span>1</span>
          <strong>Region</strong>
          <small>Weather</small>
        </div>

        <div className="flow-arrow">
          →
        </div>

        <div className="flow-step">
          <span>2</span>
          <strong>AI Camera</strong>
          <small>Scan</small>
        </div>

        <div className="flow-arrow">
          →
        </div>

        <div className="flow-step">
          <span>3</span>
          <strong>AI Models</strong>
          <small>Analyze</small>
        </div>

        <div className="flow-arrow">
          →
        </div>

        <div className="flow-step">
          <span>4</span>
          <strong>AI Advisory</strong>
          <small>Guidance</small>
        </div>

      </div>

    </div>
  );
}

export default Scanner;