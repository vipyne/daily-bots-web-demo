"use client";

import { useEffect, useState } from "react";
import { Ear, Loader2 } from "lucide-react";
import {
  ConnectionTimeoutError,
  TransportAuthBundleError,
  VoiceError,
} from "realtime-ai";
import {
  useVoiceClient,
  useVoiceClientTransportState,
} from "realtime-ai-react";

import { Alert } from "./ui/alert";
import { Button } from "./ui/button";
import * as Card from "./ui/card";
import Session from "./Session";
import { Configure } from "./Setup";

const status_text = {
  idle: "Initializing...",
  initializing: "Initializing...",
  initialized: "Start",
  authenticating: "Requesting bot...",
  connecting: "Connecting...",
};

export default function App() {
  const voiceClient = useVoiceClient()!;
  const transportState = useVoiceClientTransportState();
  const [appState, setAppState] = useState<
    "idle" | "connecting" | "connected" | "ready"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [startAudioOff, setStartAudioOff] = useState<boolean>(false);

  useEffect(() => {
    // Initialize local audio devices
    if (!voiceClient || appState !== "idle") return;
    voiceClient.initDevices();
  }, [appState, voiceClient]);

  useEffect(() => {
    // Update the app state based on the transport state
    // We only need a subset of states for the different views
    // so this effect helps avoid excess inline conditionals.
    switch (transportState) {
      case "initialized":
        setAppState("ready");
        break;
      case "authenticating":
      case "connecting":
        setAppState("connecting");
        break;
      case "connected":
      case "ready":
        setAppState("connected");
        break;
      default:
        setAppState("idle");
    }
  }, [transportState]);

  async function start() {
    if (!voiceClient) return;

    // Join the session
    try {
      // Disable the mic until the bot has joined
      voiceClient.enableMic(false);

      await voiceClient.start();
    } catch (e) {
      if (e instanceof TransportAuthBundleError) {
        setError(e.message);
      } else if (e instanceof ConnectionTimeoutError) {
        setError(e.message);
      } else {
        setError((e as VoiceError).message || "Unknown error occured");
      }
    }
  }

  async function leave() {
    await voiceClient.disconnect();
  }

  if (error) {
    return (
      <Alert intent="danger" title="An error occurred">
        {error}
      </Alert>
    );
  }

  if (appState === "connected") {
    return (
      <Session
        state={transportState}
        onLeave={() => leave()}
        startAudioOff={startAudioOff}
      />
    );
  }

  const isReady = appState === "ready";

  return (
    <Card.Card shadow className="animate-appear max-w-lg mb-14">
      <Card.CardHeader>
        <Card.CardTitle>Configuration</Card.CardTitle>
        <Card.CardDescription>
          Please configure your devices and pipeline settings below
        </Card.CardDescription>
      </Card.CardHeader>
      <Card.CardContent stack>
        <div className="flex flex-row gap-2 bg-primary-50 px-4 py-2 md:p-2 text-sm items-center justify-center rounded-md font-medium text-pretty">
          <Ear className="size-7 md:size-5 text-primary-400" />
          Works best in a quiet environment with a good internet.
        </div>
        <Configure
          startAudioOff={startAudioOff}
          handleStartAudioOff={() => setStartAudioOff(!startAudioOff)}
        />
      </Card.CardContent>
      <Card.CardFooter>
        <Button
          key="start"
          fullWidthMobile
          onClick={() => start()}
          disabled={!isReady}
        >
          {!isReady && <Loader2 className="animate-spin" />}
          {status_text[transportState as keyof typeof status_text]}
        </Button>
      </Card.CardFooter>
    </Card.Card>
  );
}
