"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

type State = "idle" | "recording" | "processing";

export default function RecordButton() {
  const [state, setState] = useState<State>("idle");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const router = useRouter();

  async function handlePress() {
    if (state === "idle") {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setState("recording");
    } else if (state === "recording") {
      const recorder = mediaRecorderRef.current!;
      recorder.onstop = async () => {
        recorder.stream.getTracks().forEach((t) => t.stop());
        setState("processing");
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const form = new FormData();
        form.append("audio", blob, "recording.webm");

        const coordsPromise = new Promise<{ lat: number; lng: number } | null>(
          (resolve) => {
            try {
              if (!navigator.geolocation) {
                resolve(null);
                return;
              }
              // Geolocation requires HTTPS in production (works on Railway and localhost)
              navigator.geolocation.getCurrentPosition(
                (pos) =>
                  resolve({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                  }),
                () => resolve(null),
                { timeout: 8000 }
              );
            } catch {
              resolve(null);
            }
          }
        );

        try {
          // Run upload and geolocation in parallel
          const [res, coords] = await Promise.all([
            fetch("/api/log", { method: "POST", body: form }),
            coordsPromise,
          ]);
          const data = await res.json();
          sessionStorage.setItem(
            "pendingLog",
            JSON.stringify({ ...data, _coords: coords })
          );
          router.push("/review");
        } catch {
          setState("idle");
          alert("Failed to process recording. Check API keys.");
        }
      };
      recorder.stop();
    }
  }

  const label = state === "idle" ? "Record" : state === "recording" ? "Stop" : "…";
  const pulse = state === "recording" ? "animate-pulse" : "";

  return (
    <button
      onClick={handlePress}
      disabled={state === "processing"}
      aria-label={label}
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full
        bg-red-600 text-white font-bold text-sm shadow-xl
        flex items-center justify-center
        disabled:opacity-50 active:scale-95 transition-transform
        ${pulse}`}
    >
      {state === "processing" ? (
        <span className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
      ) : (
        label
      )}
    </button>
  );
}
