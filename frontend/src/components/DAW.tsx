import React, { useState, useRef, useCallback } from 'react'
import { Play, Pause, Square, Upload, Download } from 'lucide-react'
import Timeline from './Timeline'
import TrackControls from './TrackControls'
import EffectsPanel from './EffectsPanel'

interface Track {
  id: string
  name: string
  volume: number
  muted: boolean
  solo: boolean
  audioUrl?: string
}

const DAW: React.FC = () => {
  const [tracks, setTracks] = useState<Track[]>([
    { id: '1', name: 'Track 1', volume: 75, muted: false, solo: false },
    { id: '2', name: 'Track 2', volume: 75, muted: false, solo: false },
  ])
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handlePlay = () => setIsPlaying(!isPlaying)
  const handleStop = () => {
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const audioUrl = URL.createObjectURL(file)
      setTracks(prev => [...prev, {
        id: Date.now().toString(),
        name: file.name,
        volume: 75,
        muted: false,
        solo: false,
        audioUrl
      }])
    }
  }, [])

  const updateTrack = useCallback((trackId: string, updates: Partial<Track>) => {
    setTracks(prev => prev.map(track => 
      track.id === trackId ? { ...track, ...updates } : track
    ))
  }, [])

  return (
    <div className="daw-container">
      <header className="daw-header">
        <h1>AI DAW</h1>
        <div className="transport-controls">
          <button onClick={handlePlay} className="btn btn-primary">
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <button onClick={handleStop} className="btn btn-secondary">
            <Square size={20} />
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()} 
            className="btn btn-upload"
          >
            <Upload size={20} />
          </button>
          <button className="btn btn-download">
            <Download size={20} />
          </button>
        </div>
      </header>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />

      <div className="daw-workspace">
        <div className="tracks-section">
          <Timeline currentTime={currentTime} isPlaying={isPlaying} />
          {tracks.map(track => (
            <TrackControls
              key={track.id}
              track={track}
              onUpdate={updateTrack}
            />
          ))}
        </div>
        
        <EffectsPanel />
      </div>
    </div>
  )
}

export default DAW
