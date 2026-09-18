import {
  Camera,
  CheckCircle2,
  ChevronDown,
  Mic,
  MicOff,
  Radio,
  Settings2,
  Sparkles,
  Users,
  Video,
  VideoOff,
  WandSparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";

interface CameraDevice {
  deviceId: string;
  label: string;
}

export default function Studio() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [aiLook, setAiLook] = useState(false);
  const [resolution, setResolution] = useState("1080p");
  const [live, setLive] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const [cameraPermission, setCameraPermission] = useState<
    "idle" | "requesting" | "granted" | "denied"
  >("idle");

  const [cameraError, setCameraError] = useState("");
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCamera, setSelectedCamera] = useState("");

  async function loadCameras(): Promise<void> {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();

      const videoDevices = devices
        .filter((device) => device.kind === "videoinput")
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${index + 1}`,
        }));

      setCameras(videoDevices);

      if (!selectedCamera && videoDevices.length > 0) {
        setSelectedCamera(videoDevices[0].deviceId);
      }
    } catch {
      // Device enumeration can fail on some browsers before permission.
    }
  }

  async function startCamera(deviceId?: string): Promise<void> {
    setCameraPermission("requesting");
    setCameraError("");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Camera access is not supported by this browser.",
        );
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      const videoWidth =
        resolution === "1080p" ? 1920 : 1280;

      const videoHeight =
        resolution === "1080p" ? 1080 : 720;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: {
            ideal: videoWidth,
          },
          height: {
            ideal: videoHeight,
          },
          ...(deviceId
            ? {
                deviceId: {
                  exact: deviceId,
                },
              }
            : {
                facingMode: {
                  ideal: "user",
                },
              }),
        },
        audio: true,
      });

      streamRef.current = stream;

      const audioTrack = stream.getAudioTracks()[0];

      if (audioTrack) {
        audioTrack.enabled = micOn;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraOn(true);
      setCameraPermission("granted");

      await loadCameras();
    } catch (error) {
      console.error(error);

      setCameraOn(false);
      setCameraPermission("denied");

      setCameraError(
        "Camera access was not allowed. Please allow camera and microphone access in your browser settings, then try again.",
      );
    }
  }

  function stopCamera(): void {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraOn(false);
  }

  function toggleCamera(): void {
    if (cameraOn) {
      stopCamera();
      return;
    }

    void startCamera(selectedCamera || undefined);
  }

  function toggleMic(): void {
    const nextMicState = !micOn;

    setMicOn(nextMicState);

    const audioTracks =
      streamRef.current?.getAudioTracks() ?? [];

    audioTracks.forEach((track) => {
      track.enabled = nextMicState;
    });
  }

  async function handleCameraChange(
    deviceId: string,
  ): Promise<void> {
    setSelectedCamera(deviceId);

    if (cameraOn) {
      await startCamera(deviceId);
    }
  }

  function toggleLive(): void {
    if (!cameraOn) {
      setCameraError(
        "Turn on your camera before starting a live stream.",
      );
      return;
    }

    setLive((value) => {
      const nextValue = !value;

      if (!nextValue) {
        setSeconds(0);
      }

      return nextValue;
    });
  }

  useEffect(() => {
    void startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) => track.stop());
      }
    };
    // We only want the initial camera permission request here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!live) {
      return;
    }

    const timer = window.setInterval(() => {
      setSeconds((value) => value + 1);
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [live]);

  const time = `${String(
    Math.floor(seconds / 60),
  ).padStart(2, "0")}:${String(seconds % 60).padStart(
    2,
    "0",
  )}`;

  return (
    <div
      className="space-y-7"
      data-testid="page-studio"
    >
      <div className="panel hero-radial rounded-[1.5rem] p-5 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="eyebrow">Creator studio</p>

            <h1 className="mt-3 text-3xl font-extrabold tracking-[-.05em] sm:text-4xl">
              Go live. Stay present.
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Broadcast with your camera for free. Other creators find you in
              Feed, open your watch page, and interact live.
            </p>
          </div>

          <StatusPill live={live} />
        </div>
      </div>

      <div className="grid gap-7 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)]">
        <section className="panel rounded-[1.5rem] p-3 sm:p-6">
          <div className="mb-4 flex items-center justify-between px-1 sm:mb-5">
            <div>
              <p className="text-sm font-bold">
                Camera preview
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Private until you choose Go Live
              </p>
            </div>

            <span
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[.04] px-3 py-1.5 text-xs text-slate-400"
              data-testid="status-preview"
            >
              <span
                className={`size-1.5 rounded-full ${
                  live
                    ? "live-pulse bg-rose-400"
                    : cameraOn
                      ? "bg-emerald-400"
                      : "bg-slate-500"
                }`}
              />

              {live
                ? "Live"
                : cameraOn
                  ? "Camera ready"
                  : "Preview"}
            </span>
          </div>

          {/* REAL CAMERA AREA */}
          <div
            className="relative h-[68vh] min-h-[500px] max-h-[760px] overflow-hidden rounded-[1.5rem] border border-white/10 bg-black sm:h-[560px]"
            data-testid="display-camera-preview"
          >
            {cameraOn ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="absolute inset-0 h-full w-full object-cover"
                data-testid="video-camera-preview"
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center bg-[#080b11]">
                <div className="px-6 text-center">
                  <VideoOff
                    className="mx-auto text-slate-500"
                    size={36}
                  />

                  <p className="mt-4 text-sm font-bold text-slate-300">
                    Camera is off
                  </p>

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Turn your camera on to see your live preview.
                  </p>
                </div>
              </div>
            )}

            {cameraPermission === "requesting" && (
              <div className="absolute inset-0 grid place-items-center bg-black/50 backdrop-blur-sm">
                <div className="rounded-2xl border border-white/10 bg-black/60 px-6 py-5 text-center">
                  <Camera
                    className="mx-auto text-cyan-300"
                    size={32}
                  />

                  <p className="mt-3 text-sm font-bold">
                    Allow camera access
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Your browser will ask for camera and microphone permission.
                  </p>
                </div>
              </div>
            )}

            {cameraError && !cameraOn && (
              <div className="absolute inset-x-4 bottom-20 rounded-2xl border border-rose-300/20 bg-black/75 p-4 backdrop-blur">
                <p className="text-sm font-semibold text-rose-200">
                  Camera access needed
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  {cameraError}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    void startCamera(
                      selectedCamera || undefined,
                    )
                  }
                  className="mt-3 rounded-lg bg-white/[.08] px-4 py-2 text-xs font-bold text-slate-200"
                >
                  Allow camera again
                </button>
              </div>
            )}

            <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full border border-white/10 bg-black/45 px-3 py-1.5 text-xs text-slate-200 backdrop-blur">
              <span
                className={`size-1.5 rounded-full ${
                  live
                    ? "live-pulse bg-rose-400"
                    : cameraOn
                      ? "bg-emerald-400"
                      : "bg-slate-500"
                }`}
              />

              {live
                ? "Live now"
                : cameraOn
                  ? "Your camera"
                  : "Camera off"}
            </div>

            {aiLook && cameraOn && (
              <div className="absolute right-4 top-4 rounded-full border border-violet-300/30 bg-violet-300/10 px-3 py-1.5 text-xs font-semibold text-violet-100 backdrop-blur">
                Aurora look
              </div>
            )}
          </div>

          {/* MAIN CONTROLS */}
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={toggleLive}
              className="btn-primary flex items-center justify-center gap-2 rounded-xl py-3.5 font-bold"
              data-testid="button-go-live"
            >
              <Radio size={17} />

              {live ? "End stream" : "Go Live"}
            </button>

            <button
              type="button"
              onClick={toggleCamera}
              className={`flex items-center justify-center gap-2 rounded-xl border py-3.5 font-semibold ${
                cameraOn
                  ? "border-cyan-300/30 bg-cyan-300/[.06] text-cyan-100"
                  : "border-white/10 bg-white/[.03] text-slate-400"
              }`}
              data-testid="button-toggle-camera"
            >
              {cameraOn ? (
                <Video size={17} />
              ) : (
                <VideoOff size={17} />
              )}

              {cameraOn ? "Camera" : "Camera off"}
            </button>

            <button
              type="button"
              onClick={toggleMic}
              className={`flex items-center justify-center gap-2 rounded-xl border py-3.5 font-semibold sm:col-span-2 ${
                micOn
                  ? "border-white/10 bg-white/[.03] text-slate-200"
                  : "border-rose-300/25 bg-rose-300/[.05] text-rose-200"
              }`}
              data-testid="button-toggle-mic"
            >
              {micOn ? (
                <Mic size={17} />
              ) : (
                <MicOff size={17} />
              )}

              {micOn ? "Mic" : "Mic muted"}
            </button>
          </div>

          {/* CAMERA + RESOLUTION */}
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_140px]">
            <label className="relative">
              <span className="sr-only">
                Choose camera
              </span>

              <select
                value={selectedCamera}
                onChange={(event) =>
                  void handleCameraChange(
                    event.target.value,
                  )
                }
                className="w-full appearance-none rounded-xl border border-white/10 bg-[#111a2a] px-4 py-3 text-sm text-slate-300 outline-none focus:border-cyan-300/50"
                data-testid="select-camera"
              >
                {cameras.length === 0 ? (
                  <option value="">
                    Camera
                  </option>
                ) : (
                  cameras.map((camera, index) => (
                    <option
                      key={
                        camera.deviceId ||
                        `camera-${index}`
                      }
                      value={camera.deviceId}
                    >
                      {camera.label}
                    </option>
                  ))
                )}
              </select>

              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                size={15}
              />
            </label>

            <label className="relative">
              <span className="sr-only">
                Choose resolution
              </span>

              <select
                value={resolution}
                onChange={(event) =>
                  setResolution(event.target.value)
                }
                className="w-full appearance-none rounded-xl border border-white/10 bg-[#111a2a] px-4 py-3 text-sm text-slate-300 outline-none focus:border-cyan-300/50"
                data-testid="select-resolution"
              >
                <option>1080p</option>
                <option>720p</option>
              </select>

              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                size={15}
              />
            </label>
          </div>

          {/* AI LOOK */}
          <button
            type="button"
            onClick={() =>
              setAiLook((value) => !value)
            }
            className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold ${
              aiLook
                ? "border-violet-300/40 bg-violet-300/[.1] text-violet-100"
                : "border-white/10 bg-white/[.03] text-slate-300"
            }`}
            data-testid="button-toggle-ai-look"
          >
            <WandSparkles size={17} />

            {aiLook
              ? "AI look active · Aurora"
              : "Switch look →"}

            <span className="font-mono text-[.65rem] text-slate-500">
              {aiLook ? "4 cr" : "uses credits"}
            </span>
          </button>
        </section>

        <div className="space-y-7">
          <div className="panel rounded-[1.5rem] p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">
                Audience
              </h2>

              <Users
                size={18}
                className="text-cyan-300"
              />
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              When you go live, your stream appears in Feed. People can watch,
              chat, and react in real time.
            </p>

            <ul className="mt-5 space-y-3 text-sm text-slate-300">
              <li className="flex gap-2">
                <CheckCircle2
                  size={16}
                  className="shrink-0 text-cyan-300"
                />
                Natural streams are free
              </li>

              <li className="flex gap-2">
                <CheckCircle2
                  size={16}
                  className="shrink-0 text-cyan-300"
                />
                Share your watch link from chat
              </li>

              <li className="flex gap-2">
                <CheckCircle2
                  size={16}
                  className="shrink-0 text-cyan-300"
                />
                Switch looks any time
              </li>
            </ul>

            <Link
              href="/feed"
              className="mt-6 flex items-center justify-center rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-sm font-semibold hover:bg-white/[.08]"
              data-testid="link-browse-live-creators"
            >
              Browse live creators
            </Link>
          </div>

          <div className="panel rounded-[1.5rem] p-6">
            <h2 className="font-bold">
              Stream status
            </h2>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <Metric
                label="Status"
                value={live ? "Live" : "Offline"}
                testId="status-stream"
              />

              <Metric
                label="Elapsed"
                value={live ? time : "0:00"}
                testId="text-elapsed-time"
              />

              <Metric
                label="Viewers"
                value="—"
                testId="text-viewer-count"
              />
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
              <Settings2 size={14} />
              Camera and audio are ready to configure
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-violet-300/15 bg-violet-300/[.05] p-5">
            <div className="flex items-start gap-3">
              <Sparkles
                size={18}
                className="mt-0.5 text-violet-300"
              />

              <div>
                <p className="text-sm font-bold">
                  Try AI &amp; OBS
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Send your scene into OBS, Zoom, or Meet with a private
                  source.
                </p>

                <Link
                  href="/ai-obs"
                  className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-violet-200"
                  data-testid="link-studio-ai-obs"
                >
                  Open workflow →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface MetricProps {
  label: string;
  value: string;
  testId: string;
}

function Metric({
  label,
  value,
  testId,
}: MetricProps) {
  return (
    <div
      className="rounded-xl border border-white/10 bg-white/[.03] p-3"
      data-testid={testId}
    >
      <p className="text-[.68rem] text-slate-500">
        {label}
      </p>

      <p className="mt-1 font-mono text-lg font-medium text-slate-100">
        {value}
      </p>
    </div>
  );
}

interface StatusPillProps {
  live: boolean;
}

function StatusPill({
  live,
}: StatusPillProps) {
  return (
    <span
      className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${
        live
          ? "border-rose-300/30 bg-rose-300/[.07] text-rose-200"
          : "border-white/10 bg-white/[.04] text-slate-400"
      }`}
      data-testid="status-studio-pill"
    >
      <span
        className={`size-1.5 rounded-full ${
          live
            ? "live-pulse bg-rose-300"
            : "bg-slate-500"
        }`}
      />

      {live ? "Live" : "Preview mode"}
    </span>
  );
}
