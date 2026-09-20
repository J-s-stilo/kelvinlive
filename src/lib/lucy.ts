import { fal } from "@fal-ai/client";

const LUCY_MODEL = "decart/lucy-2-5/realtime";

export type LucyConnection = ReturnType<
  typeof fal.realtime.connect
>;

export type LucyMediaSession = {
  close: () => void;
};

type LucySignalResult = {
  iceServers?: RTCIceServer[];
  iceservers?: RTCIceServer[];
  candidate?: RTCIceCandidateInit | null;
  sdp?: string;
  type?: RTCSdpType;
};

type LucyConnectionWithHandler = LucyConnection & {
  __lucySignalHandler?: (
    result: unknown,
  ) => Promise<void>;
};

export function createLucyConnection(
  onResult: (result: unknown) => void,
  onError: (error: unknown) => void,
): LucyConnection {
  return fal.realtime.connect(LUCY_MODEL, {
    onResult,
    onError,

    tokenProvider: async (app) => {
      const response = await fetch(
        "/api/fal/realtime-token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            app,
          }),
        },
      );

      if (!response.ok) {
        const message = await response.text();

        throw new Error(
          message ||
            "Unable to create the Lucy realtime token.",
        );
      }

      return response.text();
    },

    tokenExpirationSeconds: 10,
  });
}

export function createLucyMediaSession(
  connection: LucyConnection,
  inputStream: MediaStream,
  outputVideo: HTMLVideoElement,
  onConnected: () => void,
  onError: (error: unknown) => void,
): LucyMediaSession {
  let peerConnection: RTCPeerConnection | null = null;
  let closed = false;
  let offerStarted = false;

  const pendingCandidates: RTCIceCandidateInit[] = [];

  const connectionWithHandler =
    connection as LucyConnectionWithHandler;

  async function startWebRtc(
    iceServers: RTCIceServer[],
  ): Promise<void> {
    if (closed) {
      return;
    }

    if (peerConnection) {
      peerConnection.close();
      peerConnection = null;
    }

    peerConnection = new RTCPeerConnection({
      iceServers,
    });

    peerConnection.ontrack = (event) => {
      if (closed) {
        return;
      }

      const [remoteStream] = event.streams;

      if (!remoteStream) {
        return;
      }

      outputVideo.srcObject = remoteStream;

      void outputVideo
        .play()
        .then(() => {
          onConnected();
        })
        .catch((error) => {
          console.error(
            "Lucy output video play error:",
            error,
          );

          onConnected();
        });
    };

    peerConnection.onicecandidate = (event) => {
      if (closed || !event.candidate) {
        return;
      }

      try {
        connection.send({
          candidate:
            event.candidate.toJSON(),
        });
      } catch (error) {
        onError(error);
      }
    };

    peerConnection.onconnectionstatechange = () => {
      if (!peerConnection || closed) {
        return;
      }

      const state =
        peerConnection.connectionState;

      console.log(
        "Lucy WebRTC connection state:",
        state,
      );

      if (state === "connected") {
        onConnected();
      }

      if (
        state === "failed" ||
        state === "closed"
      ) {
        onError(
          new Error(
            `Lucy WebRTC connection ${state}.`,
          ),
        );
      }
    };

    for (const track of inputStream.getTracks()) {
      peerConnection.addTrack(
        track,
        inputStream,
      );
    }

    const offer =
      await peerConnection.createOffer();

    await peerConnection.setLocalDescription(
      offer,
    );

    const localDescription =
      peerConnection.localDescription;

    if (!localDescription) {
      throw new Error(
        "Lucy WebRTC local description was not created.",
      );
    }

    connection.send({
      sdp: localDescription.sdp,
      type: localDescription.type,
    });

    offerStarted = true;

    if (pendingCandidates.length > 0) {
      const candidates =
        pendingCandidates.splice(
          0,
          pendingCandidates.length,
        );

      for (const candidate of candidates) {
        await peerConnection.addIceCandidate(
          candidate,
        );
      }
    }
  }

  async function handleSignal(
    rawResult: unknown,
  ): Promise<void> {
    if (closed) {
      return;
    }

    const result =
      rawResult as LucySignalResult;

    try {
      const iceServers =
        result.iceServers ??
        result.iceservers;

      if (iceServers) {
        if (!offerStarted) {
          await startWebRtc(iceServers);
        }

        return;
      }

      if (result.candidate) {
        if (!peerConnection) {
          pendingCandidates.push(
            result.candidate,
          );
          return;
        }

        await peerConnection.addIceCandidate(
          result.candidate,
        );

        return;
      }

      if (
        result.sdp &&
        peerConnection
      ) {
        const type =
          result.type ?? "answer";

        if (
          !peerConnection.currentRemoteDescription
        ) {
          await peerConnection.setRemoteDescription(
            {
              type,
              sdp: result.sdp,
            },
          );

          return;
        }
      }
    } catch (error) {
      console.error(
        "Lucy WebRTC signaling error:",
        error,
      );

      onError(error);
    }
  }

  connectionWithHandler.__lucySignalHandler =
    handleSignal;

  return {
    close: () => {
      closed = true;
      offerStarted = false;
      pendingCandidates.length = 0;

      delete connectionWithHandler.__lucySignalHandler;

      if (peerConnection) {
        peerConnection.ontrack = null;
        peerConnection.onicecandidate = null;
        peerConnection.onconnectionstatechange =
          null;

        peerConnection.close();
        peerConnection = null;
      }

      outputVideo.srcObject = null;
    },
  };
}
