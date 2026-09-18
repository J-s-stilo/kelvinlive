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

/*
 * Built-in default AI look preview.
 * This is an SVG image, so the default preview is always available
 * without depending on another website.
 */
const DEFAULT_LOOK_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 500 500'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%237c3aed'/%3E%3Cstop offset='0.5' stop-color='%2306b6d4'/%3E%3Cstop offset='1' stop-color='%23111827'/%3E%3C/linearGradient%3E%3Cfilter id='b'%3E%3CfeGaussianBlur stdDeviation='35'/%3E%3C/filter%3E%3C/defs%3E%3Crect width='500' height='500' fill='%230b1020'/%3E%3Ccircle cx='110' cy='100' r='130' fill='%237c3aed' opacity='.55' filter='url(%23b)'/%3E%3Ccircle cx='410' cy='380' r='160' fill='%2306b6d4' opacity='.45' filter='url(%23b)'/%3E%3Cellipse cx='250' cy='235' rx='105' ry='125' fill='url(%23g)'/%3E%3Cellipse cx='210' cy='220' rx='15' ry='20' fill='white' opacity='.9'/%3E%3Cellipse cx='290' cy='220' rx='15' ry='20' fill='white' opacity='.9'/%3E%3Cpath d='M190 285 Q250 330 310 285' fill='none' stroke='white' stroke-width='12' stroke-linecap='round' opacity='.9'/%3E%3Cpath d='M150 160 Q250 90 350 160' fill='none' stroke='%23e2e8f0' stroke-width='22' stroke-linecap='round' opacity='.8'/%3E%3C/svg%3E";

export default function Studio() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(true);

  const [aiLook, setAiLook] = useState(false);
  const [showLookPicker, setShowLookPicker] = useState(false);

  const [selectedReference, setSelectedReference] =
    useState<File | null>(null);

  const [referencePreview, setReferencePreview] =
    useState("");

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
      const devices =
        await navigator.mediaDevices.enumerateDevices();

      const videoDevices = devices
        .filter(
          (device) => device.kind === "videoinput",
        )
        .map((device, index) => ({
          deviceId: device.deviceId,
          label:
            device.label || `Camera ${index + 1}`,
        }));

      setCameras(videoDevices);

      if (
        !selectedCamera &&
        videoDevices.length > 0
      ) {
        setSelectedCamera(
          videoDevices[0].deviceId,
        );
      }
    } catch {
      // Device enumeration can fail before permission.
    }
  }

  async function startCamera(
    deviceId?: string,
  ): Promise<void> {
    setCameraPermission("requesting");
    setCameraError("");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Camera access is not supported by this browser.",
        );
      }

      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) => track.stop());

        streamRef.current = null;
      }

      const videoWidth =
        resolution === "1080p" ? 1920 : 1280;

      const videoHeight =
        resolution === "1080p" ? 1080 : 720;

      const stream =
        await navigator.mediaDevices.getUserMedia({
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

      const audioTrack =
        stream.getAudioTracks()[0];

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
      streamRef.current
        .getTracks()
        .forEach((track) => track.stop());

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

    void startCamera(
      selectedCamera || undefined,
    );
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

  /*
   * OPEN AI LOOK PICKER
   */
  function openLookPicker(): void {
    setShowLookPicker(true);
  }

  /*
   * CLOSE AI LOOK PICKER
   */
  function closeLookPicker(): void {
    setShowLookPicker(false);
  }

  /*
   * UPLOAD IMAGE / VIDEO / AVATAR
   */
  function handleReferenceUpload(
    event: React.ChangeEvent<HTMLInputElement>,
  ): void {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (
      !file.type.startsWith("image/") &&
      !file.type.startsWith("video/")
    ) {
      setCameraError(
        "Please choose an image or video file.",
      );
      return;
    }

    if (referencePreview) {
      URL.revokeObjectURL(referencePreview);
    }

    const previewUrl =
      URL.createObjectURL(file);

    setSelectedReference(file);
    setReferencePreview(previewUrl);
    setCameraError("");
  }

  /*
   * REMOVE SELECTED REFERENCE
   */
  function removeReference(): void {
    if (referencePreview) {
      URL.revokeObjectURL(referencePreview);
    }

    setSelectedReference(null);
    setReferencePreview("");
  }

  /*
   * APPLY AI LOOK
   */
  function applyAiLook(): void {
    setAiLook(true);
    setShowLookPicker(false);
  }

  /*
   * TURN OFF AI LOOK
   */
  function disableAiLook(): void {
    setAiLook(false);
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

    // Only request camera on initial page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
   * CLEAN UP UPLOADED IMAGE / VIDEO PREVIEW
   */
  useEffect(() => {
    return () => {
      if (referencePreview) {
        URL.revokeObjectURL(referencePreview);
      }
    };
  }, [referencePreview]);

  useEffect(() => {
    if (!live) {
      return;
    }

    const timer = window.setInterval(() => {
      setSeconds(
        (value) => value + 1,
      );
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [live]);

  const time = `${String(
    Math.floor(seconds / 60),
  ).padStart(2, "0")}:${String(
    seconds % 60,
  ).padStart(2, "0")}`;

  return (
    <>
      <div
        className="space-y-7"
        data-testid="page-studio"
      >
        <div className="panel hero-radial rounded-[1.5rem] p-5 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="eyebrow">
                Creator studio
              </p>

              <h1 className="mt-3 text-3xl font-extrabold tracking-[-.05em] sm:text-4xl">
                Go live. Stay present.
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                Broadcast with your camera for free.
                Other creators find you in Feed, open
                your watch page, and interact live.
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
                      Turn your camera on to see your
                      live preview.
                    </p>
                  </div>
                </div>
              )}

              {cameraPermission ===
                "requesting" && (
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
                      Your browser will ask for camera
                      and microphone permission.
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
                <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full border border-violet-300/30 bg-violet-300/10 px-3 py-1.5 text-xs font-semibold text-violet-100 backdrop-blur">
                  <WandSparkles size={13} />

                  {selectedReference
                    ? "AI reference active"
                    : "Aurora look"}
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

                {live
                  ? "End stream"
                  : "Go Live"}
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

                {cameraOn
                  ? "Camera"
                  : "Camera off"}
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

                {micOn
                  ? "Mic"
                  : "Mic muted"}
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
                    cameras.map(
                      (camera, index) => (
                        <option
                          key={
                            camera.deviceId ||
                            `camera-${index}`
                          }
                          value={
                            camera.deviceId
                          }
                        >
                          {camera.label}
                        </option>
                      ),
                    )
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
                    setResolution(
                      event.target.value,
                    )
                  }
                  className="w-full appearance-none rounded-xl border border-white/10 bg-[#111a2a] px-4 py-3 text-sm text-slate-300 outline-none focus:border-cyan-300/50"
                  data-testid="select-resolution"
                >
                  <option>
                    1080p
                  </option>

                  <option>
                    720p
                  </option>
                </select>

                <ChevronDown
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                  size={15}
                />
              </label>
            </div>

            {/* AI LOOK BUTTON */}
            <button
              type="button"
              onClick={openLookPicker}
              className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold ${
                aiLook
                  ? "border-violet-300/40 bg-violet-300/[.1] text-violet-100"
                  : "border-white/10 bg-white/[.03] text-slate-300"
              }`}
              data-testid="button-toggle-ai-look"
            >
              <WandSparkles size={17} />

              {aiLook
                ? "AI look active"
                : "Switch look →"}

              <span className="font-mono text-[.65rem] text-slate-500">
                {aiLook
                  ? "ready"
                  : "uses credits"}
              </span>
            </button>

            {aiLook && (
              <button
                type="button"
                onClick={disableAiLook}
                className="mt-2 w-full text-xs font-semibold text-slate-500 hover:text-slate-300"
              >
                Turn off AI look
              </button>
            )}
          </section>

          {/* RIGHT SIDE */}
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
                When you go live, your stream appears
                in Feed. People can watch, chat, and
                react in real time.
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
                  value={
                    live
                      ? "Live"
                      : "Offline"
                  }
                  testId="status-stream"
                />

                <Metric
                  label="Elapsed"
                  value={
                    live
                      ? time
                      : "0:00"
                  }
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

                Camera and audio are ready to
                configure
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
                    Send your scene into OBS, Zoom,
                    or Meet with a private source.
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

      {/* =====================================================
          AI LOOK PICKER MODAL
          ===================================================== */}

      {showLookPicker && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 p-3 backdrop-blur-md sm:items-center sm:p-6"
          onClick={closeLookPicker}
          data-testid="ai-look-picker-overlay"
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-[1.5rem] border border-white/15 bg-[#0b1020] shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
            data-testid="ai-look-picker"
          >
            {/* MODAL HEADER */}
            <div className="flex items-start justify-between gap-4 p-6 sm:p-8">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight text-slate-100">
                  Choose your look
                </h2>

                <p className="mt-2 max-w-lg text-sm leading-6 text-slate-400">
                  Choose a look now — AI
                  transformation starts when
                  you pick one while live.
                </p>
              </div>

              <button
                type="button"
                onClick={closeLookPicker}
                className="grid size-12 shrink-0 place-items-center rounded-2xl border border-white/15 bg-white/[.05] text-slate-200 hover:bg-white/[.1]"
                aria-label="Close look picker"
                data-testid="button-close-look-picker"
              >
                <span className="text-3xl font-light leading-none">
                  ×
                </span>
              </button>
            </div>

            {/* LOOK CARDS */}
            <div className="px-6 sm:px-8">
              <div className="flex flex-wrap gap-4">
                {/* DEFAULT LOOK */}
                <div
                  className={`w-[180px] overflow-hidden rounded-[1.5rem] border transition ${
                    !selectedReference
                      ? "border-violet-300/40 bg-violet-300/[.06] shadow-lg shadow-violet-900/10"
                      : "border-white/15 bg-[#172033]"
                  }`}
                >
                  <div className="aspect-square overflow-hidden bg-[#111827]">
                    {selectedReference &&
                    referencePreview ? (
                      selectedReference.type.startsWith(
                        "video/",
                      ) ? (
                        <video
                          src={
                            referencePreview
                          }
                          muted
                          autoPlay
                          loop
                          playsInline
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <img
                          src={
                            referencePreview
                          }
                          alt="Selected AI reference"
                          className="h-full w-full object-cover"
                        />
                      )
                    ) : (
                      <img
                        src={DEFAULT_LOOK_IMAGE}
                        alt="Default AI look"
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>

                  <div className="p-4 text-center">
                    <p className="truncate text-sm font-semibold text-slate-200">
                      {selectedReference
                        ? selectedReference.name
                        : "Default"}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {selectedReference
                        ? selectedReference.type.startsWith(
                            "video/",
                          )
                          ? "Video reference"
                          : "Image / avatar"
                        : "AI look"}
                    </p>
                  </div>
                </div>
              </div>

              {/* DIVIDER */}
              <div className="my-6 h-px bg-white/10" />

              {/* UPLOAD BUTTON */}
              <label
                className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-white/15 bg-white/[.05] px-6 py-3.5 text-sm font-semibold text-slate-200 transition hover:bg-white/[.09]"
                data-testid="button-upload-reference"
              >
                <input
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={
                    handleReferenceUpload
                  }
                />

                {selectedReference
                  ? "Change reference"
                  : "Upload reference image"}
              </label>

              <p className="mt-3 text-xs leading-5 text-slate-500">
                Add an image, video, or avatar
                that you want the AI engine to use
                for your live transformation.
              </p>

              {/* SELECTED FILE */}
              {selectedReference && (
                <div className="mt-4 flex items-center justify-between rounded-xl border border-violet-300/20 bg-violet-300/[.05] p-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-violet-100">
                      {selectedReference.name}
                    </p>

                    <p className="mt-1 text-[11px] text-slate-500">
                      Ready as AI reference
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      removeReference
                    }
                    className="ml-3 rounded-lg px-3 py-2 text-xs font-semibold text-slate-400 hover:bg-white/[.06] hover:text-white"
                  >
                    Remove
                  </button>
                </div>
              )}

              {/* MODAL ACTIONS */}
              <div className="flex justify-end gap-2 py-6 sm:py-8">
                <button
                  type="button"
                  onClick={
                    closeLookPicker
                  }
                  className="rounded-xl border border-white/10 bg-white/[.04] px-5 py-3 text-sm font-semibold text-slate-300 hover:bg-white/[.08]"
                  data-testid="button-cancel-look"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={applyAiLook}
                  className="rounded-xl bg-violet-300 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-violet-200"
                  data-testid="button-apply-ai-look"
                >
                  Use this look
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
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

      {live
        ? "Live"
        : "Preview mode"}
    </span>
  );
}
