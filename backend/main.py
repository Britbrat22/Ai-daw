from fastapi import FastAPI, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
import numpy as np
import soundfile as sf
from scipy.signal import lfilter
import pyloudnorm as pyln
from pydub import AudioSegment
import io

app = FastAPI(title="AI DAW Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # lock down in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"ok": True}

def _to_float32_audio(data: np.ndarray) -> np.ndarray:
    """Ensure audio is float32 in range [-1, 1]. Handles mono/stereo."""
    if data.dtype.kind in ("i", "u"):
        # int audio -> float
        max_val = np.iinfo(data.dtype).max
        data = data.astype(np.float32) / max_val
    else:
        data = data.astype(np.float32)

    # shape: (samples,) or (samples, channels)
    return data

def _highpass(audio: np.ndarray, sr: int, cutoff_hz: float = 80.0) -> np.ndarray:
    """Simple 1st-order high-pass filter."""
    # y[n] = a*(y[n-1] + x[n] - x[n-1])
    # a = rc/(rc+dt), rc = 1/(2*pi*f)
    dt = 1.0 / sr
    rc = 1.0 / (2.0 * np.pi * cutoff_hz)
    a = rc / (rc + dt)

    if audio.ndim == 1:
        y = np.zeros_like(audio)
        x_prev = 0.0
        y_prev = 0.0
        for i in range(audio.shape[0]):
            x = float(audio[i])
            y_i = a * (y_prev + x - x_prev)
            y[i] = y_i
            x_prev = x
            y_prev = y_i
        return y

    # stereo or multi-channel
    out = np.zeros_like(audio)
    for ch in range(audio.shape[1]):
        out[:, ch] = _highpass(audio[:, ch], sr, cutoff_hz)
    return out

def _soft_limiter(audio: np.ndarray, threshold: float = 0.95) -> np.ndarray:
    """
    Soft limiter using tanh curve. Keeps peaks under control.
    threshold near 1.0. Lower = stronger limiting.
    """
    # scale into curve then back
    # tanh is soft and musical enough for a starter
    if threshold <= 0 or threshold > 1:
        threshold = 0.95
    x = audio / threshold
    y = np.tanh(x) * threshold
    return y.astype(np.float32)

def _true_peak_guard(audio: np.ndarray, target_peak_db: float = -1.0) -> np.ndarray:
    """Ensure sample peak below target."""
    peak = float(np.max(np.abs(audio))) if audio.size else 0.0
    if peak <= 0:
        return audio
    target = 10.0 ** (target_peak_db / 20.0)
    if peak > target:
        audio = audio * (target / peak)
    return audio.astype(np.float32)

def master_chain(audio: np.ndarray, sr: int, target_lufs: float = -14.0) -> np.ndarray:
    """
    Starter “radio-ready” chain:
    - High-pass (80Hz) to remove rumble
    - Loudness normalize to target LUFS (integrated)
    - Soft limiting
    - True peak guard
    """
    audio = _to_float32_audio(audio)
    audio = _highpass(audio, sr, 80.0)

    meter = pyln.Meter(sr)
    # pyloudnorm expects mono or stereo; for multichannel, keep first 2
    audio_for_lufs = audio
    if audio.ndim == 2 and audio.shape[1] > 2:
        audio_for_lufs = audio[:, :2]

    loudness = meter.integrated_loudness(audio_for_lufs)
    gain_db = (target_lufs - loudness)
    gain = 10.0 ** (gain_db / 20.0)
    audio = (audio * gain).astype(np.float32)

    audio = _soft_limiter(audio, threshold=0.95)
    audio = _true_peak_guard(audio, target_peak_db=-1.0)
    return audio

@app.post("/master")
async def master(
    audio_file: UploadFile = File(...),
    format: str = Query("wav", description="wav or mp3"),
    target_lufs: float = Query(-14.0, description="Integrated loudness target")
):
    """
    Upload a WAV mixdown, get back mastered WAV (or MP3 if ffmpeg available).
    """
    raw = await audio_file.read()

    # Read WAV from bytes
    try:
        data, sr = sf.read(io.BytesIO(raw), always_2d=False)
    except Exception as e:
        return JSONResponse({"error": f"Could not read audio. Upload WAV. Details: {e}"}, status_code=400)

    mastered = master_chain(data, sr, target_lufs=target_lufs)

    # Write WAV to bytes
    wav_buf = io.BytesIO()
    sf.write(wav_buf, mastered, sr, format="WAV", subtype="PCM_16")
    wav_bytes = wav_buf.getvalue()

    if format.lower() == "mp3":
        # Optional: mp3 using pydub (requires ffmpeg installed)
        try:
            seg = AudioSegment.from_file(io.BytesIO(wav_bytes), format="wav")
            mp3_buf = io.BytesIO()
            seg.export(mp3_buf, format="mp3", bitrate="320k")
            mp3_bytes = mp3_buf.getvalue()
            return Response(
                content=mp3_bytes,
                media_type="audio/mpeg",
                headers={"Content-Disposition": "attachment; filename=mastered.mp3"}
            )
        except Exception as e:
            return JSONResponse(
                {"error": "MP3 export failed (likely ffmpeg missing). Use format=wav or install ffmpeg.",
                 "details": str(e)},
                status_code=400
            )

    return Response(
        content=wav_bytes,
        media_type="audio/wav",
        headers={"Content-Disposition": "attachment; filename=mastered.wav"}
    )
