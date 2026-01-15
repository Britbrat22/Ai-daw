import React from "react";
import type { Track } from "../types";

type Props = {
  tracks: Track[];
  onAddFiles: (files: FileList) => void;
  onRecord: () => void;
  isRecording: boolean;
  onUpdate: (id: string, patch: Partial<Track>) => void;
  onRemove: (id: string) => void;
};

export default function TrackPanel({
  tracks,
  onAddFiles,
  onRecord,
  isRecording,
  onUpdate,
  onRemove
}: Props) {
  return (
    <div className="panel">
      <div className="h2">Tracks</div>

      <div className="row" style={{ marginBottom: 10 }}>
        <label>
          <input
            type="file"
            accept="audio/*"
            multiple
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files) onAddFiles(e.target.files);
              e.currentTarget.value = "";
            }}
          />
          <span>
            <button className="secondary">Import Audio</button>
          </span>
        </label>

        <button onClick={onRecord} className={isRecording ? "danger" : ""}>
          {isRecording ? "Stop Rec" : "Record"}
        </button>
      </div>

      {tracks.length === 0 && (
        <div className="small">Import vocals / beats. Add multiple tracks, then mixdown + master.</div>
      )}

      {tracks.map((t) => (
        <div className="trackCard" key={t.id}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div className="col" style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>{t.name}</div>
              <div className="small mono">{t.fileName ?? "—"}</div>
            </div>
            <button className="danger" onClick={() => onRemove(t.id)}>X</button>
          </div>

          <div className="row" style={{ marginTop: 8, gap: 8 }}>
            <button
              className={t.muted ? "danger" : "secondary"}
              onClick={() => onUpdate(t.id, { muted: !t.muted })}
            >
              Mute
            </button>
            <button
              className={t.solo ? "" : "secondary"}
              onClick={() => onUpdate(t.id, { solo: !t.solo })}
            >
              Solo
            </button>
          </div>

          <div style={{ marginTop: 10 }}>
            <div className="small">Start Offset (sec): {t.startSec.toFixed(2)}</div>
            <input
              type="range"
              min={0}
              max={30}
              step={0.01}
              value={t.startSec}
              onChange={(e) => onUpdate(t.id, { startSec: Number(e.target.value) })}
            />
          </div>

          <div style={{ marginTop: 10 }}>
            <div className="small">Volume: {t.gain.toFixed(2)}</div>
            <input
              type="range"
              min={0}
              max={2}
              step={0.01}
              value={t.gain}
              onChange={(e) => onUpdate(t.id, { gain: Number(e.target.value) })}
            />
          </div>

          <div style={{ marginTop: 10 }}>
            <div className="small">Pan: {t.pan.toFixed(2)}</div>
            <input
              type="range"
              min={-1}
              max={1}
              step={0.01}
              value={t.pan}
              onChange={(e) => onUpdate(t.id, { pan: Number(e.target.value) })}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
