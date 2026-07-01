'use client'

import { useState, useEffect } from 'react'
import { Video, Award, Info, ChevronRight } from 'lucide-react'

export interface MatchProfile {
  match_status: "canonical" | "suggested" | "custom";
  canonical_id: string | null;
  suggestions?: Array<{ id: string; name: string; similarity: number }>;
}

export interface DetectedMovement {
  exercise_name_raw: string
  timestamp_range: [number, number]
  equipment: string[]
  primary_muscles: string[]
  coaching_cues?: string[]
  safety_precautions?: string[]
  match_profile?: MatchProfile
}

interface ReviewWorkspaceProps {
  result: { detected_movements: DetectedMovement[] }
  videoUrl: string | null
  selectedFile: File | null
  onCancel: () => void
  onCommit: (validatedMovements: DetectedMovement[]) => Promise<void>
  isSubmitting: boolean
}

const getYouTubeEmbedUrl = (url: string): string | null => {
  if (!url) return null
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
  const match = url.match(regExp)
  return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : null
}

const getMatchBadge = (movement: DetectedMovement) => {
  const status = movement.match_profile?.match_status || "custom";
  if (status === "canonical") {
    return { 
      text: "✓ Canonical Match", 
      style: { background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)' } 
    }
  } else if (status === "suggested") {
    return { 
      text: "⚠ Suggested Match", 
      style: { background: 'rgba(234, 179, 8, 0.15)', color: '#eab308', border: '1px solid rgba(234, 179, 8, 0.3)' } 
    }
  } else {
    return { 
      text: "Custom Exercise", 
      style: { background: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', border: '1px solid rgba(148, 163, 184, 0.3)' } 
    }
  }
}

export default function ReviewWorkspace({
  result,
  videoUrl,
  selectedFile,
  onCancel,
  onCommit,
  isSubmitting
}: ReviewWorkspaceProps) {
  // Local state copy of movements so they can be modified by the user in-place
  const [movements, setMovements] = useState<DetectedMovement[]>(() => {
    return result?.detected_movements ? JSON.parse(JSON.stringify(result.detected_movements)) : []
  })
  const [videoObjectUrl, setVideoObjectUrl] = useState<string | null>(null)

  // Setup local file URL on mount/change
  useEffect(() => {
    let active = true
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile)
      
      const timer = setTimeout(() => {
        if (active) {
          setVideoObjectUrl(url)
        }
      }, 0)

      return () => {
        active = false
        clearTimeout(timer)
        URL.revokeObjectURL(url)
      }
    } else {
      const timer = setTimeout(() => {
        if (active) {
          setVideoObjectUrl(null)
        }
      }, 0)
      return () => {
        active = false
        clearTimeout(timer)
      }
    }
  }, [selectedFile])

  const handleFieldChange = (
    index: number,
    field: keyof DetectedMovement,
    value: string | string[] | [number, number]
  ) => {
    setMovements(prev => {
      const updated = [...prev]
      if (field === 'exercise_name_raw') {
        updated[index] = {
          ...updated[index],
          exercise_name_raw: value as string,
          match_profile: {
            match_status: 'custom' as const,
            canonical_id: null
          }
        }
      } else {
        updated[index] = {
          ...updated[index],
          [field]: value
        }
      }
      return updated
    })
  }

  const selectSuggestion = (index: number, name: string, id: string) => {
    setMovements(prev => {
      const updated = [...prev]
      updated[index] = {
        ...updated[index],
        exercise_name_raw: name,
        match_profile: {
          match_status: 'canonical' as const,
          canonical_id: id
        }
      }
      return updated
    })
  }

  // Helper to parse comma separated lists to arrays
  const handleCSVChange = (index: number, field: 'equipment' | 'primary_muscles', csvString: string) => {
    const list = csvString.split(',').map(item => item.trim()).filter(Boolean)
    handleFieldChange(index, field, list)
  }

  // Helper to parse lines to instruction lists
  const handleLinesChange = (index: number, field: 'coaching_cues' | 'safety_precautions', text: string) => {
    const list = text.split('\n').map(line => line.trim()).filter(Boolean)
    handleFieldChange(index, field, list)
  }

  const formatTimestamp = (sec: number) => {
    const mins = Math.floor(sec / 60)
    const secs = Math.floor(sec % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const embedUrl = videoUrl ? getYouTubeEmbedUrl(videoUrl) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
      <div className="dashboard-header-left">
        <h2>Review & Verify Ingested Workout</h2>
        <p>Review the identified movements, adjust the names or exercises, and commit them directly to your catalog.</p>
      </div>

      {/* Two-Column Layout */}
      <div className="ingest-grid" style={{ alignItems: 'start' }}>
        
        {/* Left Side: Video Media Container */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'sticky', top: '2rem' }}>
          <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Video size={18} style={{ color: '#8b5cf6' }} />
              Media Source Playback
            </h3>
            
            <div style={{ width: '100%', borderRadius: '14px', overflow: 'hidden', background: '#000000', aspectRatio: '16/9', position: 'relative' }}>
              {videoObjectUrl ? (
                /* Native HTML5 Video */
                <video src={videoObjectUrl} controls style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : embedUrl ? (
                /* YouTube Embed */
                <iframe 
                  src={embedUrl} 
                  frameBorder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              ) : (
                /* Non-embeddable links fallback card */
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center', gap: '0.75rem', background: 'radial-gradient(circle, #1e1b4b 0%, #0f172a 100%)' }}>
                  <Award size={36} style={{ color: '#ec4899', opacity: 0.6 }} />
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc' }}>Instagram / TikTok Video Ingested</span>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', maxWidth: '300px' }}>
                    Direct inline embedding is restricted by Instagram & TikTok platform policies. You can view the original video link directly:
                  </p>
                  <a 
                    href={videoUrl || '#'} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="quick-action-btn"
                    style={{ margin: 0, padding: '0.4rem 1rem', display: 'inline-flex', background: 'rgba(255,255,255,0.05)', fontSize: '0.8rem' }}
                  >
                    Open Source Video Link
                    <ChevronRight size={14} />
                  </a>
                </div>
              )}
            </div>

            <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: '1.4', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontWeight: 700, color: '#ffffff', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Info size={12} style={{ color: '#38bdf8' }} />
                Temporal Alignment
              </div>
              Select a card on the right to edit details. Timestamps denote the specific segment boundaries in the video file.
            </div>
          </div>
        </div>

        {/* Right Side: Movements Cards (Scrollable) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '80vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
          
          {movements.map((movement, idx) => {
            const matchInfo = getMatchBadge(movement)
            return (
              <div key={idx} className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* Header info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ec4899', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Movement #{idx + 1} ({formatTimestamp(movement.timestamp_range[0])} - {formatTimestamp(movement.timestamp_range[1])})
                  </span>
                  
                  <span style={{ ...matchInfo.style, fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.6rem', borderRadius: '8px' }}>
                    {matchInfo.text}
                  </span>
                </div>

                {/* Edit Exercise Name */}
                <div className="input-group">
                  <label htmlFor={`name-${idx}`}>Exercise Name</label>
                  <input
                    type="text"
                    id={`name-${idx}`}
                    value={movement.exercise_name_raw}
                    onChange={(e) => handleFieldChange(idx, 'exercise_name_raw', e.target.value)}
                    required
                  />
                  {movement.match_profile?.match_status === "suggested" && movement.match_profile.suggestions && movement.match_profile.suggestions.length > 0 && (
                    <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <label htmlFor={`suggestion-select-${idx}`} style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Award size={12} style={{ color: '#c084fc' }} />
                        Resolve Suggested Match
                      </label>
                      <select
                        id={`suggestion-select-${idx}`}
                        value=""
                        onChange={(e) => {
                          const selectedVal = e.target.value;
                          if (selectedVal) {
                            const suggestion = movement.match_profile?.suggestions?.find(s => s.id === selectedVal);
                            if (suggestion) {
                              selectSuggestion(idx, suggestion.name, suggestion.id);
                            }
                          }
                        }}
                        style={{
                          width: '100%',
                          background: 'rgba(0, 0, 0, 0.45)',
                          color: '#ffffff',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '12px',
                          padding: '0.85rem 1rem',
                          fontSize: '0.95rem',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="" disabled style={{ background: '#0f172a' }}>-- Select a canonical match to update --</option>
                        {movement.match_profile.suggestions.map((suggestion) => (
                          <option key={suggestion.id} value={suggestion.id} style={{ background: '#0f172a', color: '#f8fafc' }}>
                            {suggestion.name} ({Math.round(suggestion.similarity * 100)}% match)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Edit Muscle Groups & Equipment */}
                <div className="form-row">
                  <div className="input-group">
                    <label htmlFor={`muscles-${idx}`}>Target Muscles (comma separated)</label>
                    <input
                      type="text"
                      id={`muscles-${idx}`}
                      value={movement.primary_muscles.join(', ')}
                      onChange={(e) => handleCSVChange(idx, 'primary_muscles', e.target.value)}
                      required
                    />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.4rem' }}>
                      {movement.primary_muscles.map((muscle, i) => (
                        <span key={i} style={{ fontSize: '0.7rem', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '0.15rem 0.45rem', borderRadius: '6px', fontWeight: 600 }}>
                          {muscle}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="input-group">
                    <label htmlFor={`equipment-${idx}`}>Equipment (comma separated)</label>
                    <input
                      type="text"
                      id={`equipment-${idx}`}
                      value={movement.equipment.join(', ')}
                      onChange={(e) => handleCSVChange(idx, 'equipment', e.target.value)}
                      required
                    />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.4rem' }}>
                      {movement.equipment.map((equip, i) => (
                        <span key={i} style={{ fontSize: '0.7rem', background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', padding: '0.15rem 0.45rem', borderRadius: '6px', fontWeight: 600 }}>
                          {equip}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Edit Coaching Cues */}
                <div className="input-group">
                  <label htmlFor={`cues-${idx}`}>Coaching Cues (one instruction per line)</label>
                  <textarea
                    id={`cues-${idx}`}
                    rows={3}
                    placeholder="Enter instructions..."
                    value={movement.coaching_cues?.join('\n') || ''}
                    onChange={(e) => handleLinesChange(idx, 'coaching_cues', e.target.value)}
                  />
                </div>

                {/* Edit Safety Precautions */}
                <div className="input-group">
                  <label htmlFor={`safety-${idx}`}>Safety Notes (one warning per line)</label>
                  <textarea
                    id={`safety-${idx}`}
                    rows={2}
                    placeholder="Enter safety notes..."
                    value={movement.safety_precautions?.join('\n') || ''}
                    onChange={(e) => handleLinesChange(idx, 'safety_precautions', e.target.value)}
                  />
                </div>

              </div>
            )
          })}

        </div>

      </div>

      {/* Confirmation Actions Bar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem', marginTop: '1rem' }}>
        <button 
          type="button" 
          onClick={onCancel} 
          className="cancel-btn"
          style={{ maxWidth: '200px' }}
          disabled={isSubmitting}
        >
          Discard Ingestion
        </button>
        <button 
          type="button" 
          onClick={() => onCommit(movements)} 
          className="submit-btn"
          style={{ maxWidth: '280px', margin: 0 }}
          disabled={isSubmitting || movements.length === 0}
        >
          {isSubmitting && (
            <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid #ffffff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s infinite linear', marginRight: '8px', verticalAlign: 'middle' }} />
          )}
          Confirm & Commit to Catalog
        </button>
      </div>
    </div>
  )
}
