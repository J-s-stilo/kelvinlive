import {
  ArrowRight,
  BarChart3,
  Copy,
  Download,
  FileText,
  ImagePlus,
  KeyRound,
  Mic,
  MicOff,
  PlayCircle,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Square,
  TrendingUp,
  Upload,
  User,
  Video,
  VideoOff,
} from "lucide-react";
import {
  type ChangeEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  activity,
  analyticsBars,
} from "@/lib/content";

import {
  createLucyConnection,
  createLucyMediaSession,
  type LucyMediaSession,
} from "@/lib/lucy";

/* -------------------------------------------------------------------------- */
/* FEED                                                                       */
/* -------------------------------------------------------------------------- */

export function FeedPage() {
  const [following, setFollowing] = useState<number[]>([]);

  const creators = [
    {
      name: "Mara Chen",
      note: "Late night field notes",
      viewers: 84,
      color: "from-violet-400 to-cyan-300",
    },
    {
      name: "Jon Bell",
      note: "Building a tiny synth",
      viewers: 32,
      color: "from-amber-300 to-rose-300",
    },
    {
      name: "Nia Rivers",
      note: "Sunday sketchbook",
      viewers: 19,
      color: "from-emerald-300 to-cyan-300",
    },
  ];

  function toggleFollowing(index: number): void {
    setFollowing((items) =>
      items.includes(index)
        ? items.filter((item) => item !== index)
        : [...items, index],
    );
  }

  return (
    <PageIntro
      eyebrow="Live network"
      title="Find your people."
      description="A small, focused feed of creators who are live right now."
      action={
        <button
          type="button"
          className="btn-primary flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold"
          data-testid="button-refresh-feed"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {creators.map((creator, index) => (
          <article
            className="panel overflow-hidden rounded-2xl"
            key={creator.name}
            data-testid={`card-live-creator-${index}`}
          >
            <div
              className={`relative grid h-44 place-items-center bg-gradient-to-br ${creator.color}`}
            >
              <div className="absolute inset-0 bg-[#0b1020]/30" />

              <div className="relative grid size-16 place-items-center rounded-full border-2 border-white/60 bg-white/15 text-xl font-extrabold text-white backdrop-blur">
                {creator.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")}
              </div>

              <span className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-[#080c15]/75 px-2.5 py-1 text-[.68rem] font-bold text-rose-200">
                <span className="live-pulse size-1.5 rounded-full bg-rose-300" />
                LIVE
              </span>

              <span className="absolute bottom-4 right-4 rounded-full bg-[#080c15]/75 px-2.5 py-1 font-mono text-[.68rem] text-white">
                {creator.viewers} watching
              </span>
            </div>

            <div className="p-5">
              <h2 className="font-bold">{creator.name}</h2>

              <p className="mt-1 text-sm text-slate-400">
                {creator.note}
              </p>

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  className="btn-primary flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold"
                  data-testid={`button-watch-creator-${index}`}
                >
                  <PlayCircle size={16} />
                  Watch
                </button>

                <button
                  type="button"
                  onClick={() => toggleFollowing(index)}
                  className="rounded-lg border border-white/10 px-3 text-xs font-semibold text-slate-300 hover:bg-white/10"
                  data-testid={`button-follow-creator-${index}`}
                >
                  {following.includes(index)
                    ? "Following"
                    : "Follow"}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </PageIntro>
  );
}

/* -------------------------------------------------------------------------- */
/* AI OBS / FULL BODY TRANSFORMATION                                          */
/* -------------------------------------------------------------------------- */

export function AiObsPage() {
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const outputVideoRef = useRef<HTMLVideoElement | null>(null);

  const streamRef = useRef<MediaStream | null>(null);

  const lucyConnectionRef = useRef<
    ReturnType<typeof createLucyConnection> | null
  >(null);

  const lucyMediaSessionRef =
    useRef<LucyMediaSession | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [recording, setRecording] = useState(false);

  const [selectedLook, setSelectedLook] = useState<
    "natural" | "aurora"
  >("natural");

  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarUploading, setAvatarUploading] =
    useState(false);

  const [recordedUrl, setRecordedUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const [cameraError, setCameraError] = useState("");
  const [recordingError, setRecordingError] =
    useState("");
  const [lucyError, setLucyError] = useState("");

  const [lucyConnected, setLucyConnected] =
    useState(false);

  const [lucyBusy, setLucyBusy] = useState(false);
  const [lucyConnecting, setLucyConnecting] =
    useState(false);

  const [prompt, setPrompt] = useState(
    "Replace the live person with the person or character shown in the reference image. Make the reference character the visible person while following the live person's movement, gestures, head movement, facial performance and speech. Preserve the camera framing and background. Keep the transformation stable and natural throughout the live video.",
  );

  const [recordingSeconds, setRecordingSeconds] =
    useState(0);

  useEffect(() => {
    return () => {
      if (recorderRef.current) {
        try {
          recorderRef.current.stop();
        } catch {
          // Recorder may already be inactive.
        }
      }

      lucyMediaSessionRef.current?.close();
      lucyMediaSessionRef.current = null;

      streamRef.current?.getTracks().forEach(
        (track) => track.stop(),
      );

      streamRef.current = null;
      lucyConnectionRef.current = null;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl);
      }
    };
  }, [recordedUrl]);

  useEffect(() => {
    if (!recording) {
      return;
    }

    const timer = window.setInterval(() => {
      setRecordingSeconds((seconds) => seconds + 1);
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [recording]);

  function formatRecordingTime(
    seconds: number,
  ): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(
      2,
      "0",
    )}:${String(remainingSeconds).padStart(
      2,
      "0",
    )}`;
  }

  async function startCamera(): Promise<void> {
    setCameraError("");
    setLucyError("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        "Camera access is not available in this browser.",
      );
      return;
    }

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: {
              ideal: 1280,
            },
            height: {
              ideal: 720,
            },
          },
          audio: true,
        });

      streamRef.current = stream;

      const audioTrack =
        stream.getAudioTracks()[0];

      if (audioTrack) {
        audioTrack.enabled = micEnabled;
      }

      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject =
          stream;

        await cameraVideoRef.current.play();
      }

      if (outputVideoRef.current) {
        outputVideoRef.current.srcObject =
          stream;

        await outputVideoRef.current
          .play()
          .catch(() => {});
      }

      setCameraActive(true);

      if (avatarUrl) {
        window.setTimeout(() => {
          startLucy();
        }, 100);
      }
    } catch (error) {
      console.error(error);

      setCameraError(
        "Camera or microphone access was blocked. Check your browser permissions and try again.",
      );
    }
  }

  function stopCamera(): void {
    if (recording) {
      stopRecording();
    }

    lucyMediaSessionRef.current?.close();
    lucyMediaSessionRef.current = null;

    streamRef.current?.getTracks().forEach(
      (track) => track.stop(),
    );

    streamRef.current = null;

    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }

    if (outputVideoRef.current) {
      outputVideoRef.current.srcObject = null;
    }

    lucyConnectionRef.current = null;

    setLucyConnected(false);
    setLucyBusy(false);
    setLucyConnecting(false);
    setCameraActive(false);
  }

  function toggleMicrophone(): void {
    const audioTrack =
      streamRef.current?.getAudioTracks()[0];

    if (!audioTrack) {
      return;
    }

    const nextEnabled = !audioTrack.enabled;

    audioTrack.enabled = nextEnabled;
    setMicEnabled(nextEnabled);
  }

  function handleLucyResult(
    result: unknown,
  ): void {
    const mediaSession =
      lucyMediaSessionRef.current;

    if (
      mediaSession &&
      "handleSignal" in mediaSession &&
      typeof (
        mediaSession as LucyMediaSession & {
          handleSignal?: (
            result: unknown,
          ) => void;
        }
      ).handleSignal === "function"
    ) {
      (
        mediaSession as LucyMediaSession & {
          handleSignal: (
            result: unknown,
          ) => void;
        }
      ).handleSignal(result);
    }
  }

  function sendLucyInstruction(): void {
    const connection =
      lucyConnectionRef.current;

    if (!connection) {
      return;
    }

    try {
      connection.send({
        enable_prompt_expansion: true,
        prompt:
          prompt.trim() ||
          "Transform the live person using the reference image while preserving live movement and speech.",
        reference_image_url:
          avatarUrl || undefined,
      });
    } catch (error) {
      console.error(
        "Lucy instruction error:",
        error,
      );

      setLucyBusy(false);
      setLucyError(
        "Lucy could not apply the transformation.",
      );
    }
  }

  function startLucy(): void {
    setLucyError("");

    const inputStream =
      streamRef.current;

    const outputVideo =
      outputVideoRef.current;

    if (!inputStream || !cameraActive) {
      setLucyError(
        "Start the camera before connecting Lucy 2.5.",
      );
      return;
    }

    if (!outputVideo) {
      setLucyError(
        "The AI output preview is not ready yet.",
      );
      return;
    }

    if (lucyConnectionRef.current) {
      if (avatarUrl) {
        setLucyBusy(true);
        sendLucyInstruction();
      }

      return;
    }

    try {
      setLucyBusy(true);
      setLucyConnecting(true);

      const connection =
        createLucyConnection(
          (result) => {
            handleLucyResult(result);
          },
          (error) => {
            console.error(
              "Lucy 2.5 error:",
              error,
            );

            setLucyBusy(false);
            setLucyConnecting(false);
            setLucyConnected(false);

            setLucyError(
              error instanceof Error
                ? error.message
                : "Lucy 2.5 could not establish the realtime connection.",
            );
          },
        );

      lucyConnectionRef.current =
        connection;

      const mediaSession =
        createLucyMediaSession(
          connection,
          inputStream,
          outputVideo,
          () => {
            setLucyBusy(false);
            setLucyConnecting(false);
            setLucyConnected(true);
          },
          (error) => {
            console.error(
              "Lucy WebRTC media error:",
              error,
            );

            setLucyBusy(false);
            setLucyConnecting(false);
            setLucyConnected(false);

            setLucyError(
              error instanceof Error
                ? error.message
                : "Lucy 2.5 could not establish the video connection.",
            );
          },
        );

      lucyMediaSessionRef.current =
        mediaSession;

      connection.send({
        enable_prompt_expansion: true,
        prompt:
          prompt.trim() ||
          "Transform the live person using the reference image while preserving live movement and speech.",
        reference_image_url:
          avatarUrl || undefined,
      });
    } catch (error) {
      console.error(error);

      lucyMediaSessionRef.current?.close();
      lucyMediaSessionRef.current = null;
      lucyConnectionRef.current = null;

      setLucyConnected(false);
      setLucyBusy(false);
      setLucyConnecting(false);

      setLucyError(
        error instanceof Error
          ? error.message
          : "Lucy 2.5 could not start. Check your FAL configuration and try again.",
      );
    }
  }

  function applyLucyPrompt(): void {
    setLucyError("");

    if (!cameraActive) {
      setLucyError(
        "Start the camera first.",
      );
      return;
    }

    if (!lucyConnectionRef.current) {
      startLucy();
      return;
    }

    setLucyBusy(true);
    sendLucyInstruction();
  }

  function startRecording(): void {
    setRecordingError("");

    const outputVideo =
      outputVideoRef.current;

    const cameraStream =
      streamRef.current;

    if (!cameraStream) {
      setRecordingError(
        "Start the camera before starting a recording.",
      );
      return;
    }

    if (!window.MediaRecorder) {
      setRecordingError(
        "Recording is not supported by this browser.",
      );
      return;
    }

    try {
      recordedChunksRef.current = [];

      let recordingStream: MediaStream;

      if (
        lucyConnected &&
        outputVideo &&
        typeof outputVideo.captureStream ===
          "function"
      ) {
        recordingStream =
          outputVideo.captureStream();

        const audioTrack =
          cameraStream.getAudioTracks()[0];

        if (
          audioTrack &&
          !recordingStream
            .getAudioTracks()
            .length
        ) {
          recordingStream.addTrack(
            audioTrack,
          );
        }
      } else {
        recordingStream =
          cameraStream;
      }

      let mimeType = "";

      if (
        MediaRecorder.isTypeSupported(
          "video/webm;codecs=vp9,opus",
        )
      ) {
        mimeType =
          "video/webm;codecs=vp9,opus";
      } else if (
        MediaRecorder.isTypeSupported(
          "video/webm;codecs=vp8,opus",
        )
      ) {
        mimeType =
          "video/webm;codecs=vp8,opus";
      } else if (
        MediaRecorder.isTypeSupported(
          "video/webm",
        )
      ) {
        mimeType = "video/webm";
      }

      const recorder = mimeType
        ? new MediaRecorder(
            recordingStream,
            {
              mimeType,
            },
          )
        : new MediaRecorder(
            recordingStream,
          );

      recorder.ondataavailable = (
        event,
      ) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(
            event.data,
          );
        }
      };

      recorder.onerror = (event) => {
        console.error(event);

        setRecordingError(
          "The recording could not be completed.",
        );

        setRecording(false);
      };

      recorder.onstop = () => {
        const blob = new Blob(
          recordedChunksRef.current,
          {
            type:
              recorder.mimeType ||
              "video/webm",
          },
        );

        if (blob.size === 0) {
          setRecordingError(
            "No recording data was captured.",
          );
          return;
        }

        if (recordedUrl) {
          URL.revokeObjectURL(
            recordedUrl,
          );
        }

        const url =
          URL.createObjectURL(blob);

        setRecordedUrl(url);
      };

      recorderRef.current = recorder;

      recorder.start(250);

      setRecordingSeconds(0);
      setRecording(true);
    } catch (error) {
      console.error(error);

      setRecordingError(
        "The browser could not start recording.",
      );
    }
  }

  function stopRecording(): void {
    const recorder =
      recorderRef.current;

    if (!recorder) {
      return;
    }

    if (recorder.state !== "inactive") {
      recorder.stop();
    }

    recorderRef.current = null;
    setRecording(false);
  }

  async function handleAvatarChange(
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    setRecordingError("");
    setLucyError("");

    if (!file.type.startsWith("image/")) {
      setRecordingError(
        "Please choose a PNG, JPG or WEBP image.",
      );
      return;
    }

    setAvatarUploading(true);

    try {
      const dataUrl =
        await new Promise<string>(
          (resolve, reject) => {
            const reader =
              new FileReader();

            reader.onload = () => {
              if (
                typeof reader.result !==
                "string"
              ) {
                reject(
                  new Error(
                    "Unable to read the reference image.",
                  ),
                );
                return;
              }

              resolve(reader.result);
            };

            reader.onerror = () => {
              reject(
                new Error(
                  "Unable to read the reference image.",
                ),
              );
            };

            reader.readAsDataURL(file);
          },
        );

      const dimensions =
        await new Promise<{
          width: number;
          height: number;
        }>((resolve, reject) => {
          const image = new Image();

          image.onload = () => {
            resolve({
              width:
                image.naturalWidth,
              height:
                image.naturalHeight,
            });
          };

          image.onerror = () => {
            reject(
              new Error(
                "The selected image could not be loaded.",
              ),
            );
          };

          image.src = dataUrl;
        });

      if (
        dimensions.width < 512 ||
        dimensions.height < 512
      ) {
        setRecordingError(
          `Reference image must be at least 512×512. Selected image is ${dimensions.width}×${dimensions.height}.`,
        );
        return;
      }

      setAvatarUrl(dataUrl);

      if (cameraActive) {
        window.setTimeout(() => {
          if (lucyConnectionRef.current) {
            setLucyBusy(true);

            try {
              lucyConnectionRef.current.send({
                enable_prompt_expansion: true,
                prompt:
                  prompt.trim() ||
                  "Replace the live person with the person or character in the reference image while preserving live movement, facial performance and speech.",
                reference_image_url:
                  dataUrl,
              });
            } catch (error) {
              console.error(error);

              setLucyBusy(false);
              setLucyError(
                "Lucy could not apply the selected reference image.",
              );
            }
          } else {
            startLucy();
          }
        }, 50);
      }
    } catch (error) {
      console.error(
        "Reference image error:",
        error,
      );

      setRecordingError(
        "The reference image could not be loaded.",
      );
    } finally {
      setAvatarUploading(false);
    }
  }

  function removeAvatar(): void {
    setAvatarUrl("");

    if (avatarInputRef.current) {
      avatarInputRef.current.value = "";
    }

    if (lucyConnectionRef.current) {
      setLucyBusy(true);

      try {
        lucyConnectionRef.current.send({
          enable_prompt_expansion: true,
          prompt:
            "Return to the live person's natural appearance while preserving the live camera movement, face, body movement and speech.",
        });
      } catch (error) {
        console.error(error);
        setLucyBusy(false);
      }
    }
  }

  async function copySource(): Promise<void> {
    const sourceUrl =
      `${window.location.origin}/source`;

    try {
      await navigator.clipboard.writeText(
        sourceUrl,
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1600);
    } catch (error) {
      console.error(error);
    }
  }

  function saveRecording(): void {
    if (!recordedUrl) {
      return;
    }

    const anchor =
      document.createElement("a");

    anchor.href = recordedUrl;
    anchor.download =
      `kelvinlive-recording-${Date.now()}.webm`;

    anchor.click();
  }

  return (
    <PageIntro
      eyebrow="Production workflow"
      title="AI, then anywhere."
      description="Prepare your camera, avatar and visual treatment before sending the finished scene to OBS."
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(520px,1fr)_360px]">
        <div className="panel rounded-2xl p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold">
                Production preview
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Real camera → Lucy 2.5 → AI output.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[.68rem] font-bold ${
                  cameraActive
                    ? "border-emerald-300/20 bg-emerald-300/[.06] text-emerald-200"
                    : "border-white/10 bg-white/[.03] text-slate-500"
                }`}
              >
                {cameraActive ? (
                  <Video size={13} />
                ) : (
                  <VideoOff size={13} />
                )}
                {cameraActive
                  ? "Camera on"
                  : "Camera off"}
              </span>

              <span
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[.68rem] font-bold ${
                  cameraActive && micEnabled
                    ? "border-cyan-300/20 bg-cyan-300/[.06] text-cyan-200"
                    : "border-white/10 bg-white/[.03] text-slate-500"
                }`}
              >
                {micEnabled ? (
                  <Mic size={13} />
                ) : (
                  <MicOff size={13} />
                )}
                {micEnabled
                  ? "Mic on"
                  : "Mic off"}
              </span>

              <span
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[.68rem] font-bold ${
                  lucyConnected
                    ? "border-violet-300/20 bg-violet-300/[.06] text-violet-200"
                    : lucyConnecting
                      ? "border-amber-300/20 bg-amber-300/[.06] text-amber-200"
                      : "border-white/10 bg-white/[.03] text-slate-500"
                }`}
              >
                <Sparkles size={13} />

                {lucyConnected
                  ? "Lucy connected"
                  : lucyConnecting
                    ? "Lucy connecting"
                    : "Lucy offline"}
              </span>
            </div>
          </div>

          <div className="mx-auto mt-6 w-full max-w-[1100px]">
            <div className="grid gap-4 lg:grid-cols-[minmax(320px,1fr)_minmax(320px,1fr)]">
              <div>
                <p className="mb-2 text-[.68rem] font-bold uppercase tracking-[.12em] text-slate-500">
                  Camera
                </p>

                <div className="relative min-h-[320px] overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
                  <video
                    ref={cameraVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="aspect-video min-h-[320px] w-full object-cover"
                  />

                  {!cameraActive ? (
                    <div className="absolute inset-0 grid place-items-center bg-[#05070b]">
                      <div className="text-center">
                        <VideoOff
                          size={30}
                          className="mx-auto text-slate-600"
                        />

                        <p className="mt-3 text-sm font-semibold text-slate-400">
                          Camera is off
                        </p>

                        <p className="mt-1 text-xs text-slate-600">
                          Start the camera to begin.
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div>
                <p className="mb-2 flex items-center gap-2 text-[.68rem] font-bold uppercase tracking-[.12em] text-violet-300">
                  <Sparkles size={13} />
                  Lucy 2.5 AI output
                </p>

                <div className="relative min-h-[320px] overflow-hidden rounded-2xl border border-violet-300/20 bg-black shadow-2xl">
                  <video
                    ref={outputVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="aspect-video min-h-[320px] w-full object-cover"
                  />

                  {!lucyConnected ? (
                    <div className="absolute inset-0 grid place-items-center bg-[#05070b]/95">
                      <div className="px-5 text-center">
                        <Sparkles
                          size={30}
                          className="mx-auto text-violet-300/50"
                        />

                        <p className="mt-3 text-sm font-semibold text-slate-400">
                          {lucyConnecting
                            ? "Connecting Lucy 2.5..."
                            : "AI output waiting"}
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-600">
                          {lucyConnecting
                            ? "Establishing the live AI video connection."
                            : "Start the camera and choose a reference image to begin."}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {recording ? (
                    <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/75 px-3 py-2 text-xs font-bold text-rose-200">
                      <span className="live-pulse size-2 rounded-full bg-rose-300" />
                      REC{" "}
                      {formatRecordingTime(
                        recordingSeconds,
                      )}
                    </div>
                  ) : null}

                  {lucyBusy ? (
                    <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-black/75 px-3 py-2 text-xs font-bold text-violet-200">
                      <Sparkles size={13} />
                      Processing AI
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {cameraError ? (
            <p className="mt-3 rounded-xl border border-rose-300/20 bg-rose-300/[.05] p-3 text-xs text-rose-200">
              {cameraError}
            </p>
          ) : null}

          {lucyError ? (
            <p className="mt-3 rounded-xl border border-violet-300/20 bg-violet-300/[.05] p-3 text-xs text-violet-200">
              {lucyError}
            </p>
          ) : null}

          {recordingError ? (
            <p className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/[.05] p-3 text-xs text-amber-200">
              {recordingError}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-3">
            {!cameraActive ? (
              <button
                type="button"
                onClick={startCamera}
                className="btn-primary flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold"
                data-testid="button-start-camera"
              >
                <Video size={16} />
                Start camera
              </button>
            ) : (
              <button
                type="button"
                onClick={stopCamera}
                className="flex items-center gap-2 rounded-xl border border-rose-300/20 bg-rose-300/[.05] px-4 py-3 text-sm font-semibold text-rose-200"
                data-testid="button-stop-camera"
              >
                <VideoOff size={16} />
                Stop camera
              </button>
            )}

            <button
              type="button"
              onClick={toggleMicrophone}
              disabled={!cameraActive}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-sm font-semibold hover:bg-white/[.08] disabled:cursor-not-allowed disabled:opacity-40"
              data-testid="button-toggle-microphone"
            >
              {micEnabled ? (
                <Mic size={16} />
              ) : (
                <MicOff size={16} />
              )}

              {micEnabled
                ? "Mute mic"
                : "Unmute mic"}
            </button>

            {!lucyConnectionRef.current &&
            !lucyConnected ? (
              <button
                type="button"
                onClick={startLucy}
                disabled={
                  !cameraActive ||
                  lucyBusy ||
                  lucyConnecting
                }
                className="flex items-center gap-2 rounded-xl border border-violet-300/20 bg-violet-300/[.06] px-4 py-3 text-sm font-bold text-violet-200 hover:bg-violet-300/[.12] disabled:cursor-not-allowed disabled:opacity-40"
                data-testid="button-connect-lucy"
              >
                <Sparkles size={16} />

                {lucyConnecting
                  ? "Connecting..."
                  : "Connect Lucy 2.5"}
              </button>
            ) : null}

            {!recording ? (
              <button
                type="button"
                onClick={startRecording}
                disabled={!cameraActive}
                className="flex items-center gap-2 rounded-xl border border-rose-300/20 bg-rose-300/[.06] px-4 py-3 text-sm font-bold text-rose-200 hover:bg-rose-300/[.12] disabled:cursor-not-allowed disabled:opacity-40"
                data-testid="button-start-recording"
              >
                <span className="size-2.5 rounded-full bg-rose-300" />
                {lucyConnected
                  ? "Record AI output"
                  : "Record"}
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="flex items-center gap-2 rounded-xl border border-rose-300/30 bg-rose-300/[.12] px-4 py-3 text-sm font-bold text-rose-200"
                data-testid="button-stop-recording"
              >
                <Square size={15} />
                Stop recording
              </button>
            )}
          </div>

          {recordedUrl ? (
            <div className="mt-6 rounded-2xl border border-cyan-300/20 bg-cyan-300/[.04] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold">
                    Recording ready
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Preview it or save the WebM file.
                  </p>
                </div>

                <div className="flex gap-2">
                  <a
                    href={recordedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[.04] px-3 py-2 text-xs font-semibold hover:bg-white/[.08]"
                    data-testid="button-preview-recording"
                  >
                    <PlayCircle size={14} />
                    Preview
                  </a>

                  <button
                    type="button"
                    onClick={saveRecording}
                    className="btn-primary flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold"
                    data-testid="button-save-recording"
                  >
                    <Download size={14} />
                    Save
                  </button>
                </div>
              </div>

              <video
                src={recordedUrl}
                controls
                className="mt-4 aspect-video w-full rounded-xl bg-black"
              />
            </div>
          ) : null}

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <WorkflowStep
              number="01"
              title="Camera"
              text="Capture your real camera and microphone."
            />

            <WorkflowStep
              number="02"
              title="Lucy 2.5"
              text="Transform the live camera using the selected reference and prompt."
            />

            <WorkflowStep
              number="03"
              title="OBS"
              text="Use the transformed production output for your broadcast."
            />
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-violet-300/20 bg-violet-300/[.05] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold">
                  AI transformation
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Control the live Lucy 2.5 instruction.
                </p>
              </div>

              <Sparkles
                size={20}
                className="text-violet-300"
              />
            </div>

            <label className="mt-5 block">
              <span className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">
                Transformation prompt
              </span>

              <textarea
                value={prompt}
                onChange={(event) =>
                  setPrompt(
                    event.target.value,
                  )
                }
                rows={6}
                className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-slate-200 outline-none placeholder:text-slate-600 focus:border-violet-300/40"
                placeholder="Tell Lucy exactly what should change..."
                data-testid="textarea-lucy-prompt"
              />
            </label>

            <button
              type="button"
              onClick={applyLucyPrompt}
              disabled={
                !cameraActive ||
                lucyBusy
              }
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-300/10 px-4 py-3 text-sm font-bold text-violet-200 hover:bg-violet-300/20 disabled:cursor-not-allowed disabled:opacity-40"
              data-testid="button-apply-lucy-prompt"
            >
              <Sparkles size={16} />

              {lucyBusy
                ? "Applying..."
                : lucyConnected
                  ? "Update AI transformation"
                  : "Start AI transformation"}
            </button>

            <div className="mt-5 grid gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedLook("natural");

                  const nextPrompt =
                    "Replace the live person with the person or character in the reference image. Make the reference character the visible person while following the live person's body movement, gestures, head movement, facial performance and speech. Preserve the camera framing and background.";

                  setPrompt(nextPrompt);

                  if (
                    lucyConnectionRef.current &&
                    avatarUrl
                  ) {
                    setLucyBusy(true);

                    try {
                      lucyConnectionRef.current.send({
                        enable_prompt_expansion:
                          true,
                        prompt: nextPrompt,
                        reference_image_url:
                          avatarUrl,
                      });
                    } catch (error) {
                      console.error(error);
                      setLucyBusy(false);
                      setLucyError(
                        "Lucy could not update the character transformation.",
                      );
                    }
                  }
                }}
                className={`rounded-xl border p-4 text-left transition ${
                  selectedLook === "natural"
                    ? "border-cyan-300/50 bg-cyan-300/[.10]"
                    : "border-white/10 bg-white/[.02]"
                }`}
                data-testid="button-ai-look-natural"
              >
                <p className="font-bold">
                  Natural character swap
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Use the reference character while following your live movement.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedLook("aurora");

                  const nextPrompt =
                    "Replace the live person with the person or character in the reference image. Make the reference character the visible person while following the live person's full-body movement, gestures, head movement, facial performance and speech. Preserve the character appearance and camera framing with a cinematic aurora-inspired atmosphere.";

                  setPrompt(nextPrompt);

                  if (
                    lucyConnectionRef.current &&
                    avatarUrl
                  ) {
                    setLucyBusy(true);

                    try {
                      lucyConnectionRef.current.send({
                        enable_prompt_expansion:
                          true,
                        prompt: nextPrompt,
                        reference_image_url:
                          avatarUrl,
                      });
                    } catch (error) {
                      console.error(error);
                      setLucyBusy(false);
                      setLucyError(
                        "Lucy could not update the character transformation.",
                      );
                    }
                  }
                }}
                className={`rounded-xl border p-4 text-left transition ${
                  selectedLook === "aurora"
                    ? "border-violet-300/50 bg-violet-300/[.10]"
                    : "border-white/10 bg-white/[.02]"
                }`}
                data-testid="button-ai-look-aurora"
              >
                <p className="font-bold">
                  Cinematic character
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Character swap with a cinematic visual treatment.
                </p>
              </button>
            </div>

            <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">
                Current look
              </p>

              <p className="mt-2 text-sm font-bold text-cyan-200">
                {selectedLook === "natural"
                  ? "Natural character swap"
                  : "Cinematic character"}
              </p>
            </div>
          </div>

          <div className="panel rounded-2xl p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold">
                  Avatar / reference image
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Choose the character Lucy should put into the live video.
                </p>
              </div>

              <ImagePlus
                size={19}
                className="text-cyan-300"
              />
            </div>

            {avatarUrl ? (
              <div className="mt-5">
                <div className="overflow-hidden rounded-xl border border-violet-300/20 bg-black">
                  <img
                    src={avatarUrl}
                    alt="Selected reference"
                    className="aspect-square w-full object-cover"
                  />
                </div>

                <div className="mt-3 rounded-xl border border-violet-300/20 bg-violet-300/[.05] p-3 text-xs text-violet-200">
                  {lucyConnected
                    ? "Reference active — Lucy is transforming the live video."
                    : "Reference selected — Lucy will start automatically when the camera is running."}
                </div>

                <button
                  type="button"
                  onClick={removeAvatar}
                  className="mt-3 w-full rounded-xl border border-white/10 bg-white/[.03] px-4 py-3 text-sm font-semibold hover:bg-white/[.07]"
                  data-testid="button-remove-avatar"
                >
                  Remove image
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={avatarUploading}
                onClick={() =>
                  avatarInputRef.current?.click()
                }
                className="mt-5 flex min-h-36 w-full flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[.02] px-5 text-center hover:bg-white/[.05] disabled:cursor-not-allowed disabled:opacity-50"
                data-testid="button-upload-avatar"
              >
                <Upload
                  size={22}
                  className="text-slate-500"
                />

                <span className="mt-3 text-sm font-semibold">
                  {avatarUploading
                    ? "Preparing reference image..."
                    : "Choose a reference image"}
                </span>

                <span className="mt-1 text-xs text-slate-600">
                  PNG, JPG or WEBP • 512×512 minimum
                </span>
              </button>
            )}

            <input
              ref={avatarInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
              data-testid="input-avatar-upload"
            />
          </div>

          <div className="panel rounded-2xl p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <KeyRound
                size={18}
                className="text-cyan-300"
              />

              <div>
                <p className="text-sm font-bold">
                  OBS Browser Source
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Copy the source address for your broadcast setup.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={copySource}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-sm font-semibold hover:bg-white/[.08]"
              data-testid="button-copy-browser-source"
            >
              <Copy size={16} />
              Copy Browser Source
            </button>

            {copied ? (
              <p
                className="mt-3 text-center text-xs text-cyan-200"
                data-testid="status-source-copied"
              >
                Browser Source URL copied.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </PageIntro>
  );
}

/* -------------------------------------------------------------------------- */
/* ANALYTICS                                                                  */
/* -------------------------------------------------------------------------- */

export function AnalyticsPage() {
  return (
    <PageIntro
      eyebrow="Your signal"
      title="Know what lands."
      description="Your real session analytics will appear here as the API and stream-session system are connected."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          "Total live time",
          "Peak audience",
          "Sessions",
        ].map((label, index) => (
          <div
            className="panel rounded-2xl p-5"
            key={label}
            data-testid={`metric-analytics-${index}`}
          >
            <p className="text-sm text-slate-500">
              {label}
            </p>

            <p className="mt-3 text-2xl font-bold text-slate-300">
              Awaiting data
            </p>

            <p className="mt-2 text-xs text-slate-600">
              Real account analytics will appear here.
            </p>
          </div>
        ))}
      </div>

      <div className="panel mt-5 rounded-2xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-bold">
              Audience minutes
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Real stream-session analytics
            </p>
          </div>

          <BarChart3
            size={19}
            className="text-cyan-300"
          />
        </div>

        <div className="mt-10 flex h-44 items-end gap-2">
          {analyticsBars.map(
            (height, index) => (
              <div
                className="group flex flex-1 flex-col items-center gap-2"
                key={index}
              >
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-violet-400/30 to-cyan-300/30"
                  style={{
                    height: `${height}%`,
                  }}
                  data-testid={`bar-analytics-${index}`}
                />

                <span className="font-mono text-[.58rem] text-slate-600">
                  {index + 1}
                </span>
              </div>
            ),
          )}
        </div>

        <p className="mt-5 text-xs text-slate-600">
          Chart values are currently visual placeholders and will be replaced by real stream-session data.
        </p>
      </div>

      <div className="panel mt-5 rounded-2xl p-6">
        <h2 className="font-bold">
          Recent sessions
        </h2>

        <div className="mt-4 rounded-xl border border-white/10 bg-white/[.02] p-5 text-sm text-slate-500">
          Real sessions will appear here after the stream-session API is connected.
        </div>
      </div>
    </PageIntro>
  );
}

/* -------------------------------------------------------------------------- */
/* CREDITS                                                                    */
/* -------------------------------------------------------------------------- */

export function CreditsPage() {
  const creditRows = [
    [
      "AI looks",
      "Pending",
      "AI usage billing will use the real creator credit balance.",
    ],
    [
      "Natural camera",
      "Free",
      "Your camera preview does not use credits.",
    ],
    [
      "Preview & rehearsal",
      "Free",
      "Prepare before starting a live session.",
    ],
  ];

  return (
    <PageIntro
      eyebrow="Resource center"
      title="Credits, clearly."
      description="Your real KelvinLive credit balance will appear here once credit accounting is connected."
    >
      <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
        <div className="panel hero-radial rounded-2xl p-7">
          <p className="text-sm text-slate-400">
            Credit balance
          </p>

          <p className="mt-4 text-3xl font-bold text-cyan-200">
            Not connected
          </p>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            The interface will use the real creator profile credit balance instead of showing a fake number.
          </p>

          <button
            type="button"
            disabled
            className="mt-8 flex cursor-not-allowed items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-sm font-bold text-slate-500"
            data-testid="button-top-up-credits"
          >
            <Plus size={16} />
            Credit system coming soon
          </button>
        </div>

        <div className="panel rounded-2xl p-7">
          <h2 className="font-bold">
            Credit usage
          </h2>

          <div className="mt-5 space-y-4">
            {creditRows.map(
              ([name, cost, detail], index) => (
                <div
                  className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/[.02] p-4"
                  key={name}
                  data-testid={`row-credit-${index}`}
                >
                  <Sparkles
                    size={17}
                    className="mt-0.5 text-violet-300"
                  />

                  <div className="flex-1">
                    <p className="text-sm font-bold">
                      {name}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {detail}
                    </p>
                  </div>

                  <span className="font-mono text-xs text-cyan-200">
                    {cost}
                  </span>
                </div>
              ),
            )}
          </div>
        </div>
      </div>
    </PageIntro>
  );
}

/* -------------------------------------------------------------------------- */
/* TRANSACTIONS                                                               */
/* -------------------------------------------------------------------------- */

export function TransactionsPage() {
  return (
    <PageIntro
      eyebrow="Account history"
      title="Every credit accounted for."
      description="Real transactions will appear here after payment and credit accounting are connected."
      action={
        <button
          type="button"
          disabled
          className="flex cursor-not-allowed items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-sm font-semibold text-slate-500"
          data-testid="button-export-transactions"
        >
          <FileText size={16} />
          Export CSV
        </button>
      }
    >
      <div className="panel rounded-2xl p-8 text-center">
        <p className="text-sm font-semibold text-slate-300">
          Transactions are not connected yet.
        </p>

        <p className="mt-2 text-xs leading-5 text-slate-500">
          Real purchases and credit usage will populate this page.
        </p>
      </div>
    </PageIntro>
  );
}

/* -------------------------------------------------------------------------- */
/* TUTORIAL                                                                   */
/* -------------------------------------------------------------------------- */

export function TutorialPage() {
  const lessons = [
    [
      "01",
      "Your first private preview",
      "Learn the studio controls before the room opens.",
      "4 min",
    ],
    [
      "02",
      "A thoughtful AI workflow",
      "Use a look as a creative choice, not a disguise.",
      "7 min",
    ],
    [
      "03",
      "Bring KelvinLive into OBS",
      "Add your private Browser Source in three steps.",
      "5 min",
    ],
  ];

  return (
    <PageIntro
      eyebrow="Learn the room"
      title="A better first stream."
      description="Short guides for making the technical part feel unremarkable."
    >
      <div className="space-y-3">
        {lessons.map(
          ([number, title, text, duration]) => (
            <button
              type="button"
              className="panel group flex w-full items-center gap-5 rounded-2xl p-5 text-left hover:border-cyan-300/30"
              key={number}
              data-testid={`button-tutorial-${number}`}
            >
              <span className="font-mono text-sm text-cyan-300">
                {number}
              </span>

              <span className="grid size-11 place-items-center rounded-xl border border-white/10 bg-white/[.04] text-slate-300">
                <PlayCircle size={20} />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block font-bold">
                  {title}
                </span>

                <span className="mt-1 block truncate text-sm text-slate-500">
                  {text}
                </span>
              </span>

              <span className="hidden text-xs text-slate-500 sm:block">
                {duration}
              </span>

              <ArrowRight
                size={17}
                className="text-slate-500 transition-transform group-hover:translate-x-1 group-hover:text-cyan-300"
              />
            </button>
          ),
        )}
      </div>
    </PageIntro>
  );
}

/* -------------------------------------------------------------------------- */
/* SETTINGS                                                                   */
/* -------------------------------------------------------------------------- */

export function SettingsPage() {
  const [saved, setSaved] = useState(false);

  function saveSettings(): void {
    setSaved(true);

    window.setTimeout(() => {
      setSaved(false);
    }, 1800);
  }

  return (
    <PageIntro
      eyebrow="Your account"
      title="Settings that stay out of the way."
      description="Control your profile, privacy, and default studio behavior."
    >
      <div className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
        <div className="panel rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="grid size-14 place-items-center rounded-full border border-white/10 bg-white/[.05] text-cyan-200">
              <User size={22} />
            </div>

            <div>
              <p className="font-bold">
                Your account
              </p>

              <p className="text-sm text-slate-500">
                Your authenticated KelvinLive account
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-2 text-sm">
            <div className="flex items-center justify-between rounded-xl bg-white/[.03] p-3">
              <span className="text-slate-400">
                Plan
              </span>

              <span className="font-semibold text-cyan-200">
                Creator
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-white/[.03] p-3">
              <span className="text-slate-400">
                Account
              </span>

              <span className="text-slate-300">
                Active
              </span>
            </div>
          </div>
        </div>

        <div className="panel rounded-2xl p-6">
          <h2 className="font-bold">
            Studio defaults
          </h2>

          <div className="mt-6 space-y-5">
            <label className="flex items-center justify-between gap-4">
              <span>
                <span className="block text-sm font-semibold">
                  Start in private preview
                </span>

                <span className="mt-1 block text-xs text-slate-500">
                  Never open the room by accident.
                </span>
              </span>

              <input
                type="checkbox"
                defaultChecked
                className="size-5 accent-cyan-300"
                data-testid="input-default-preview"
              />
            </label>

            <label className="flex items-center justify-between gap-4">
              <span>
                <span className="block text-sm font-semibold">
                  Show audience guidance
                </span>

                <span className="mt-1 block text-xs text-slate-500">
                  Keep the promise to your viewers visible.
                </span>
              </span>

              <input
                type="checkbox"
                defaultChecked
                className="size-5 accent-cyan-300"
                data-testid="input-audience-guidance"
              />
            </label>

            <label className="block">
              <span className="block text-sm font-semibold">
                Default resolution
              </span>

              <select
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#111a2a] px-4 py-3 text-sm text-slate-300"
                data-testid="select-default-resolution"
              >
                <option>1080p</option>
                <option>720p</option>
              </select>
            </label>
          </div>

          <button
            type="button"
            onClick={saveSettings}
            className="btn-primary mt-7 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold"
            data-testid="button-save-settings"
          >
            <Save size={16} />
            {saved ? "Saved" : "Save changes"}
          </button>
        </div>
      </div>
    </PageIntro>
  );
}

/* -------------------------------------------------------------------------- */
/* SHARED COMPONENTS                                                          */
/* -------------------------------------------------------------------------- */

interface PageIntroProps {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}

function PageIntro({
  eyebrow,
  title,
  description,
  action,
  children,
}: PageIntroProps) {
  return (
    <div
      className="space-y-8"
      data-testid={`page-${title
        .toLowerCase()
        .replaceAll(" ", "-")}`}
    >
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">
            {eyebrow}
          </p>

          <h1 className="mt-3 text-3xl font-extrabold tracking-[-.05em] sm:text-4xl">
            {title}
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            {description}
          </p>
        </div>

        {action}
      </div>

      {children}
    </div>
  );
}

interface WorkflowStepProps {
  number: string;
  title: string;
  text: string;
}

function WorkflowStep({
  number,
  title,
  text,
}: WorkflowStepProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[.02] p-4">
      <span className="font-mono text-xs text-cyan-300">
        {number}
      </span>

      <p className="mt-5 text-sm font-bold">
        {title}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {text}
      </p>
    </div>
  );
}
