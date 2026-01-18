'use client'

import { useState, useEffect, useCallback } from 'react'

interface PodcastData {
  title: string
  date: string
  description: string
  image: string
  link: string
}

interface SubjectLine {
  subject: string
  preview: string
}

interface FormData {
  toolboxHook: string
  toolboxBlurb: string
  toolboxLink: string
  toolboxCTA: string
  toolboxTitle: string
  prevWebinarTitle: string
  prevWebinarImage: string
  prevWebinarMemberLink: string
  prevWebinarNonMemberLink: string
  upcomingTitle: string
  upcomingSynopsis: string
  upcomingImage: string
  upcomingMemberLink: string
  upcomingNonMemberLink: string
  isArchive: boolean
  podcastTitle: string
  podcastImage: string
  podcastDate: string
  campaignDate: string
  scheduledDate: string
}

// Step tracking for progress indicator
type StepStatus = 'pending' | 'in-progress' | 'complete'

interface WorkflowStep {
  id: string
  label: string
  shortLabel: string
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  { id: 'toolbox', label: "Trainer's Toolbox", shortLabel: 'Toolbox' },
  { id: 'title', label: 'Select Title', shortLabel: 'Title' },
  { id: 'webinar', label: 'Previous Webinar', shortLabel: 'Webinar' },
  { id: 'podcast', label: 'Fetch Podcast', shortLabel: 'Podcast' },
  { id: 'upcoming', label: 'Upcoming/Archives', shortLabel: 'Upcoming' },
  { id: 'subject', label: 'Subject Line', shortLabel: 'Subject' },
  { id: 'create', label: 'Create Broadcasts', shortLabel: 'Create' },
]

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const [formData, setFormData] = useState<FormData>({
    toolboxHook: '',
    toolboxBlurb: '',
    toolboxLink: '',
    toolboxCTA: '',
    toolboxTitle: '',
    prevWebinarTitle: '',
    prevWebinarImage: '',
    prevWebinarMemberLink: 'https://atamember.com/web-class-replays/',
    prevWebinarNonMemberLink: '',
    upcomingTitle: '',
    upcomingSynopsis: '',
    upcomingImage: '',
    upcomingMemberLink: 'https://atamember.com/web-class-replays/',
    upcomingNonMemberLink: '',
    isArchive: false,
    podcastTitle: '',
    podcastImage: '',
    podcastDate: '',
    campaignDate: new Date().toISOString().split('T')[0],
    scheduledDate: getNextTuesday()
  })

  const [podcast, setPodcast] = useState<PodcastData | null>(null)
  const [loadingPodcast, setLoadingPodcast] = useState(false)
  const [subjectLines, setSubjectLines] = useState<SubjectLine[]>([])
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null)
  const [loadingSubjects, setLoadingSubjects] = useState(false)
  const [toolboxTitles, setToolboxTitles] = useState<string[]>([])
  const [selectedToolboxTitle, setSelectedToolboxTitle] = useState<number | null>(null)
  const [loadingToolboxTitles, setLoadingToolboxTitles] = useState(false)
  const [shortenedSynopsis, setShortenedSynopsis] = useState('')
  const [loadingSynopsis, setLoadingSynopsis] = useState(false)
  const [creatingBroadcast, setCreatingBroadcast] = useState(false)
  const [broadcastResult, setBroadcastResult] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  function getNextTuesday(): string {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const daysUntilTuesday = (2 - dayOfWeek + 7) % 7 || 7
    const nextTuesday = new Date(today)
    nextTuesday.setDate(today.getDate() + daysUntilTuesday)
    return nextTuesday.toISOString().split('T')[0]
  }

  // Calculate step statuses for progress indicator
  const getStepStatus = useCallback((stepId: string): StepStatus => {
    switch (stepId) {
      case 'toolbox':
        if (formData.toolboxHook && formData.toolboxBlurb && formData.toolboxLink) return 'complete'
        if (formData.toolboxHook || formData.toolboxBlurb) return 'in-progress'
        return 'pending'
      case 'title':
        if (selectedToolboxTitle !== null) return 'complete'
        if (toolboxTitles.length > 0) return 'in-progress'
        return 'pending'
      case 'webinar':
        if (formData.prevWebinarTitle && formData.prevWebinarImage) return 'complete'
        if (formData.prevWebinarTitle || formData.prevWebinarImage) return 'in-progress'
        return 'pending'
      case 'podcast':
        if (podcast) return 'complete'
        return 'pending'
      case 'upcoming':
        if (formData.upcomingTitle && (shortenedSynopsis || formData.upcomingSynopsis)) return 'complete'
        if (formData.upcomingTitle || formData.upcomingSynopsis) return 'in-progress'
        return 'pending'
      case 'subject':
        if (selectedSubject !== null) return 'complete'
        if (subjectLines.length > 0) return 'in-progress'
        return 'pending'
      case 'create':
        if (broadcastResult?.includes('successfully')) return 'complete'
        return 'pending'
      default:
        return 'pending'
    }
  }, [formData, selectedToolboxTitle, toolboxTitles, podcast, shortenedSynopsis, selectedSubject, subjectLines, broadcastResult])

  const completedSteps = WORKFLOW_STEPS.filter(s => getStepStatus(s.id) === 'complete').length
  const progressPercent = Math.round((completedSteps / WORKFLOW_STEPS.length) * 100)

  // Check authentication on mount
  useEffect(() => {
    checkAuth()
  }, [])

  // Auto-fetch podcast on load if not already fetched
  useEffect(() => {
    if (isAuthenticated && !podcast && !loadingPodcast) {
      const savedDraft = localStorage.getItem('behaviourBulletinDraft')
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft)
        if (!parsed.podcast) {
          fetchPodcast()
        }
      } else {
        fetchPodcast()
      }
    }
  }, [isAuthenticated])

  // Load saved draft from localStorage on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem('behaviourBulletinDraft')
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft)
        setFormData(prev => ({ ...prev, ...parsed.formData }))
        if (parsed.toolboxTitles) setToolboxTitles(parsed.toolboxTitles)
        if (parsed.selectedToolboxTitle !== undefined) setSelectedToolboxTitle(parsed.selectedToolboxTitle)
        if (parsed.subjectLines) setSubjectLines(parsed.subjectLines)
        if (parsed.selectedSubject !== undefined) setSelectedSubject(parsed.selectedSubject)
        if (parsed.shortenedSynopsis) setShortenedSynopsis(parsed.shortenedSynopsis)
        if (parsed.podcast) setPodcast(parsed.podcast)
      } catch (e) {
        console.error('Failed to load draft:', e)
      }
    }
  }, [])

  // Auto-save draft to localStorage whenever form changes
  useEffect(() => {
    const draft = {
      formData,
      toolboxTitles,
      selectedToolboxTitle,
      subjectLines,
      selectedSubject,
      shortenedSynopsis,
      podcast
    }
    localStorage.setItem('behaviourBulletinDraft', JSON.stringify(draft))
  }, [formData, toolboxTitles, selectedToolboxTitle, subjectLines, selectedSubject, shortenedSynopsis, podcast])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd/Ctrl + Enter to create broadcasts
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && selectedSubject !== null) {
        e.preventDefault()
        createBroadcasts()
      }
      // Cmd/Ctrl + G to generate (titles or subjects based on context)
      if ((e.metaKey || e.ctrlKey) && e.key === 'g') {
        e.preventDefault()
        if (selectedToolboxTitle !== null && subjectLines.length === 0) {
          generateSubjectLines()
        } else if (formData.toolboxHook && formData.toolboxBlurb && toolboxTitles.length === 0) {
          generateToolboxTitles()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedSubject, selectedToolboxTitle, formData.toolboxHook, formData.toolboxBlurb, toolboxTitles.length, subjectLines.length])

  function clearDraft() {
    if (confirm('Are you sure you want to clear all form data? This cannot be undone.')) {
      localStorage.removeItem('behaviourBulletinDraft')
      window.location.reload()
    }
  }

  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/check')
      setIsAuthenticated(res.ok)
    } catch {
      setIsAuthenticated(false)
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setIsLoggingIn(true)
    setLoginError('')

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })

      if (res.ok) {
        setIsAuthenticated(true)
      } else {
        setLoginError('Incorrect password')
      }
    } catch {
      setLoginError('Login failed')
    } finally {
      setIsLoggingIn(false)
    }
  }

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE' })
    setIsAuthenticated(false)
  }

  async function fetchPodcast() {
    setLoadingPodcast(true)
    try {
      const res = await fetch('/api/podcast')
      const data = await res.json()
      setPodcast(data)
      setFormData(prev => ({
        ...prev,
        podcastTitle: data.title,
        podcastImage: data.image,
        podcastDate: data.date
      }))
    } catch (error) {
      console.error('Failed to fetch podcast:', error)
    } finally {
      setLoadingPodcast(false)
    }
  }

  async function generateToolboxTitles() {
    setLoadingToolboxTitles(true)
    try {
      const res = await fetch('/api/generate-toolbox-titles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hook: formData.toolboxHook,
          blurb: formData.toolboxBlurb,
          cta: formData.toolboxCTA
        })
      })
      const data = await res.json()
      setToolboxTitles(data.titles || [])
      setSelectedToolboxTitle(null)
    } catch (error) {
      console.error('Failed to generate titles:', error)
    } finally {
      setLoadingToolboxTitles(false)
    }
  }

  async function generateSubjectLines() {
    if (selectedToolboxTitle === null) {
      alert('Please select a Toolbox title first')
      return
    }
    setLoadingSubjects(true)
    try {
      const selectedTitle = toolboxTitles[selectedToolboxTitle]
      const res = await fetch('/api/generate-subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainerToolboxTitle: selectedTitle,
          podcastTitle: formData.podcastTitle,
          upcomingTitle: formData.isArchive ? undefined : formData.upcomingTitle,
          archiveTitle: formData.isArchive ? formData.upcomingTitle : undefined
        })
      })
      const data = await res.json()
      setSubjectLines(data.subjectLines || [])
      setSelectedSubject(null)
    } catch (error) {
      console.error('Failed to generate subjects:', error)
    } finally {
      setLoadingSubjects(false)
    }
  }

  async function shortenSynopsis() {
    if (!formData.upcomingSynopsis) return
    setLoadingSynopsis(true)
    try {
      const res = await fetch('/api/shorten-synopsis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          synopsis: formData.upcomingSynopsis,
          title: formData.upcomingTitle
        })
      })
      const data = await res.json()
      setShortenedSynopsis(data.shortenedSynopsis || '')
    } catch (error) {
      console.error('Failed to shorten synopsis:', error)
    } finally {
      setLoadingSynopsis(false)
    }
  }

  function generateUTM(baseUrl: string): string {
    const date = new Date(formData.campaignDate)
    const day = date.getDate()
    const month = date.toLocaleString('en-US', { month: 'short' }).toLowerCase()
    const campaign = `behavior-bulletin-${day}-${month}`
    const separator = baseUrl.includes('?') ? '&' : '?'
    return `${baseUrl}${separator}utm_campaign=${campaign}&utm_medium=email&utm_source=kit`
  }

  function handleImageUpload(field: 'prevWebinarImage' | 'upcomingImage') {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        processImageFile(file, field)
      }
    }
  }

  function processImageFile(file: File, field: 'prevWebinarImage' | 'upcomingImage') {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, [field]: reader.result as string }))
    }
    reader.readAsDataURL(file)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
  }

  function handleDrop(field: 'prevWebinarImage' | 'upcomingImage') {
    return (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const file = e.dataTransfer.files?.[0]
      if (file) {
        processImageFile(file, field)
      }
    }
  }

  function copyToClipboard(text: string, fieldName: string) {
    navigator.clipboard.writeText(text)
    setCopiedField(fieldName)
    setTimeout(() => setCopiedField(null), 2000)
  }

  function toggleSection(sectionId: string) {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }

  function generateEmailHTML(isMember: boolean): string {
    const synopsis = shortenedSynopsis || formData.upcomingSynopsis
    const upcomingLink = isMember ? formData.upcomingMemberLink : formData.upcomingNonMemberLink
    const prevWebinarLink = isMember ? formData.prevWebinarMemberLink : formData.prevWebinarNonMemberLink

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

  <div style="text-align: center; margin-bottom: 20px;">
    <h1 style="color: #589B36;">Behaviour Bulletin</h1>
  </div>

  <!-- Trainer's Toolbox -->
  <div style="margin-bottom: 30px;">
    <h2 style="color: #589B36; border-bottom: 2px solid #589B36; padding-bottom: 8px;">Trainer's Toolbox: ${formData.toolboxTitle}</h2>
    <p><em>${formData.toolboxHook}</em></p>
    <p>${formData.toolboxBlurb}</p>
    ${formData.toolboxCTA ? `<p><strong>${formData.toolboxCTA}</strong></p>` : ''}
    <a href="${generateUTM(formData.toolboxLink)}" style="display: inline-block; background: #589B36; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Read More</a>
  </div>

  <!-- In case you missed it -->
  <div style="margin-bottom: 30px;">
    <h2 style="color: #589B36;">In case you missed it:</h2>

    <div style="display: flex; gap: 20px;">
      <!-- Previous Webinar -->
      <div style="flex: 1;">
        ${formData.prevWebinarImage ? `<img src="${formData.prevWebinarImage}" alt="Webinar" style="max-width: 100%; border-radius: 8px;">` : ''}
        <h3>Member Webinar Replay</h3>
        <p>${formData.prevWebinarTitle}</p>
        <a href="${generateUTM(prevWebinarLink)}" style="display: inline-block; background: #666; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Watch Now</a>
      </div>

      <!-- Podcast -->
      <div style="flex: 1;">
        ${formData.podcastImage ? `<img src="${formData.podcastImage}" alt="Podcast" style="max-width: 100%; border-radius: 8px;">` : ''}
        <h3>Podcast Episode</h3>
        <p>${formData.podcastTitle}</p>
        <a href="${generateUTM('https://animaltrainingacademy.com/podcast/')}" style="display: inline-block; background: #666; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Listen Now</a>
      </div>
    </div>
  </div>

  <!-- Upcoming / Archives -->
  <div style="margin-bottom: 30px;">
    <h2 style="color: #589B36;">${formData.isArchive ? 'From the archives' : 'Upcoming'}: ${formData.upcomingTitle}</h2>
    ${formData.upcomingImage ? `<img src="${formData.upcomingImage}" alt="Webinar" style="max-width: 100%; border-radius: 8px; margin-bottom: 15px;">` : ''}
    <p>${synopsis}</p>
    <a href="${generateUTM(upcomingLink)}" style="display: inline-block; background: #589B36; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Watch Now</a>
  </div>

  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

  <p>That's all for this week!</p>
  <p>Got a question about training, membership, or upcoming events? Just reply - I'd love to hear from you.</p>
  <p>Thanks,<br><strong>Ryan Cartlidge</strong></p>

</body>
</html>
`
  }

  async function createBroadcasts() {
    if (selectedSubject === null) {
      alert('Please select a subject line first')
      return
    }

    setCreatingBroadcast(true)
    setBroadcastResult(null)

    try {
      const selected = subjectLines[selectedSubject]
      const res = await fetch('/api/create-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberEmail: generateEmailHTML(true),
          nonMemberEmail: generateEmailHTML(false),
          subject: selected.subject,
          previewText: selected.preview,
          scheduledDate: formData.scheduledDate
        })
      })

      const data = await res.json()
      if (data.success) {
        setBroadcastResult('Broadcasts created successfully! Check Kit for the drafts.')
      } else {
        setBroadcastResult(`Error: ${data.error}`)
      }
    } catch (error) {
      setBroadcastResult(`Failed to create broadcasts: ${error}`)
    } finally {
      setCreatingBroadcast(false)
    }
  }

  // Loading state
  if (isAuthenticated === null) {
    return (
      <div className="login-container">
        <div className="loading-spinner" style={{ borderColor: '#589B36', borderTopColor: 'transparent' }}></div>
      </div>
    )
  }

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="login-container">
        <form className="login-card" onSubmit={handleLogin}>
          <h1>Behaviour Bulletin</h1>
          <p>Enter password to continue</p>
          {loginError && <div className="error-message">{loginError}</div>}
          <div className="form-group">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={isLoggingIn}>
            {isLoggingIn ? <span className="loading-spinner"></span> : 'Login'}
          </button>
        </form>
      </div>
    )
  }

  // Main app
  return (
    <div className="container">
      {/* Header with progress */}
      <div className="header">
        <div style={{ flex: 1 }}>
          <h1>Behaviour Bulletin Tool</h1>
          <p style={{ opacity: 0.9, fontSize: 14 }}>Animal Training Academy</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={clearDraft} className="btn btn-secondary" style={{ background: '#ff6b6b', color: 'white' }}>Clear Draft</button>
          <button onClick={handleLogout} className="btn btn-secondary">Logout</button>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="progress-bar-container">
        <div className="progress-header">
          <span className="progress-label">Progress: {completedSteps}/{WORKFLOW_STEPS.length} steps</span>
          <span className="progress-percent">{progressPercent}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
        </div>
        <div className="progress-steps">
          {WORKFLOW_STEPS.map((step) => {
            const status = getStepStatus(step.id)
            return (
              <div key={step.id} className={`progress-step ${status}`} title={step.label}>
                <div className="step-dot">
                  {status === 'complete' && <span>✓</span>}
                </div>
                <span className="step-label">{step.shortLabel}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="quick-actions">
        <span className="quick-actions-label">Quick Actions:</span>
        <button
          onClick={generateToolboxTitles}
          className="btn btn-sm"
          disabled={loadingToolboxTitles || !formData.toolboxHook || !formData.toolboxBlurb || toolboxTitles.length > 0}
        >
          Generate Titles
        </button>
        <button
          onClick={generateSubjectLines}
          className="btn btn-sm"
          disabled={loadingSubjects || selectedToolboxTitle === null}
        >
          Generate Subjects
        </button>
        <button
          onClick={createBroadcasts}
          className="btn btn-sm btn-primary"
          disabled={creatingBroadcast || selectedSubject === null}
        >
          Create Broadcasts
        </button>
        <span className="keyboard-hint">Tip: ⌘+G to generate, ⌘+Enter to create</span>
      </div>

      {/* Step 1: Trainer's Toolbox */}
      <div className={`card ${collapsedSections.has('toolbox') ? 'collapsed' : ''}`}>
        <h2 onClick={() => toggleSection('toolbox')} style={{ cursor: 'pointer' }}>
          <span className={`step-indicator ${getStepStatus('toolbox')}`}>1</span>
          Trainer&apos;s Toolbox
          {getStepStatus('toolbox') === 'complete' && <span className="complete-badge">✓ Complete</span>}
          <span className="collapse-icon">{collapsedSections.has('toolbox') ? '▼' : '▲'}</span>
        </h2>
        {!collapsedSections.has('toolbox') && (
          <>
            <div className="form-group">
              <label>Hook (question/teaser next to logo)</label>
              <textarea
                value={formData.toolboxHook}
                onChange={(e) => setFormData(prev => ({ ...prev, toolboxHook: e.target.value }))}
                placeholder="e.g., How do you train a medical behavior with an animal who never wants to be touched?"
                style={{ minHeight: 60 }}
              />
            </div>
            <div className="form-group">
              <label>Blurb (main text)</label>
              <textarea
                value={formData.toolboxBlurb}
                onChange={(e) => setFormData(prev => ({ ...prev, toolboxBlurb: e.target.value }))}
                placeholder="The main description text..."
                style={{ minHeight: 100 }}
              />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label>CTA Text (call to action)</label>
                <input
                  type="text"
                  value={formData.toolboxCTA}
                  onChange={(e) => setFormData(prev => ({ ...prev, toolboxCTA: e.target.value }))}
                  placeholder="e.g., See the case studies and Lisa's 5 objectives."
                />
              </div>
              <div className="form-group">
                <label>Link (without UTM)</label>
                <input
                  type="url"
                  value={formData.toolboxLink}
                  onChange={(e) => setFormData(prev => ({ ...prev, toolboxLink: e.target.value }))}
                  placeholder="https://atamember.com/..."
                />
              </div>
            </div>

            {/* Title Generation */}
            <div className="title-generation-section">
              <div className="section-header">
                <h3>
                  <span className={`step-indicator ${getStepStatus('title')}`}>2</span>
                  Select Title
                </h3>
                <button
                  onClick={generateToolboxTitles}
                  className="btn btn-primary"
                  disabled={loadingToolboxTitles || !formData.toolboxHook || !formData.toolboxBlurb}
                >
                  {loadingToolboxTitles ? 'Generating...' : toolboxTitles.length > 0 ? 'Regenerate Titles' : 'Generate 10 Titles'}
                </button>
              </div>

              {toolboxTitles.length > 0 && (
                <div className="subject-lines compact">
                  {toolboxTitles.map((title, index) => (
                    <div
                      key={index}
                      className={`subject-line-option ${selectedToolboxTitle === index ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedToolboxTitle(index)
                        setFormData(prev => ({ ...prev, toolboxTitle: title }))
                      }}
                    >
                      <input
                        type="radio"
                        checked={selectedToolboxTitle === index}
                        onChange={() => {
                          setSelectedToolboxTitle(index)
                          setFormData(prev => ({ ...prev, toolboxTitle: title }))
                        }}
                      />
                      <div className="text">
                        <div className="subject">{title}</div>
                      </div>
                      <button
                        className="copy-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          copyToClipboard(title, `title-${index}`)
                        }}
                        title="Copy to clipboard"
                      >
                        {copiedField === `title-${index}` ? '✓' : '📋'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Step 3 & 4: Previous Webinar & Podcast */}
      <div className="grid-2">
        <div className={`card ${collapsedSections.has('webinar') ? 'collapsed' : ''}`}>
          <h2 onClick={() => toggleSection('webinar')} style={{ cursor: 'pointer' }}>
            <span className={`step-indicator ${getStepStatus('webinar')}`}>3</span>
            Previous Webinar
            {getStepStatus('webinar') === 'complete' && <span className="complete-badge">✓</span>}
            <span className="collapse-icon">{collapsedSections.has('webinar') ? '▼' : '▲'}</span>
          </h2>
          {!collapsedSections.has('webinar') && (
            <>
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={formData.prevWebinarTitle}
                  onChange={(e) => setFormData(prev => ({ ...prev, prevWebinarTitle: e.target.value }))}
                  placeholder="The Secret to a Truly Confident Dog"
                />
              </div>
              <div className="form-group">
                <label>Image</label>
                <label
                  className={`image-upload ${formData.prevWebinarImage ? 'has-image' : ''}`}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop('prevWebinarImage')}
                >
                  {formData.prevWebinarImage ? (
                    <img src={formData.prevWebinarImage} alt="Preview" />
                  ) : (
                    <p>Click or drag image here</p>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload('prevWebinarImage')}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
              <div className="form-group">
                <label>Member Link</label>
                <input
                  type="url"
                  value={formData.prevWebinarMemberLink}
                  onChange={(e) => setFormData(prev => ({ ...prev, prevWebinarMemberLink: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Non-Member Link</label>
                <input
                  type="url"
                  value={formData.prevWebinarNonMemberLink}
                  onChange={(e) => setFormData(prev => ({ ...prev, prevWebinarNonMemberLink: e.target.value }))}
                  placeholder="https://animaltrainingacademy.com/webinar-name/"
                />
              </div>
            </>
          )}
        </div>

        <div className={`card ${collapsedSections.has('podcast') ? 'collapsed' : ''}`}>
          <h2 onClick={() => toggleSection('podcast')} style={{ cursor: 'pointer' }}>
            <span className={`step-indicator ${getStepStatus('podcast')}`}>4</span>
            Latest Podcast
            {getStepStatus('podcast') === 'complete' && <span className="complete-badge">✓</span>}
            <span className="collapse-icon">{collapsedSections.has('podcast') ? '▼' : '▲'}</span>
          </h2>
          {!collapsedSections.has('podcast') && (
            <>
              {loadingPodcast ? (
                <div style={{ textAlign: 'center', padding: 20 }}>
                  <div className="loading-spinner"></div>
                  <p style={{ marginTop: 10, color: '#666' }}>Fetching latest podcast...</p>
                </div>
              ) : podcast ? (
                <div className="podcast-preview">
                  {podcast.image && <img src={podcast.image} alt="Podcast" />}
                  <div className="info">
                    <div className="title">{podcast.title}</div>
                    <div className="date">{podcast.date}</div>
                  </div>
                </div>
              ) : (
                <p style={{ color: '#666', marginBottom: 16 }}>Click below to fetch the latest podcast</p>
              )}
              <button
                onClick={fetchPodcast}
                className="btn btn-outline"
                disabled={loadingPodcast}
                style={{ marginTop: podcast ? 16 : 0 }}
              >
                {loadingPodcast ? 'Fetching...' : podcast ? 'Refresh Podcast' : 'Fetch Latest Podcast'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Step 5: Upcoming / Archives */}
      <div className={`card ${collapsedSections.has('upcoming') ? 'collapsed' : ''}`}>
        <h2 onClick={() => toggleSection('upcoming')} style={{ cursor: 'pointer' }}>
          <span className={`step-indicator ${getStepStatus('upcoming')}`}>5</span>
          <span>{formData.isArchive ? 'From the Archives' : 'Upcoming Webinar'}</span>
          {getStepStatus('upcoming') === 'complete' && <span className="complete-badge">✓</span>}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setFormData(prev => ({ ...prev, isArchive: !prev.isArchive }))
            }}
            className="btn btn-secondary btn-sm"
            style={{ marginLeft: 'auto' }}
          >
            Switch to {formData.isArchive ? 'Upcoming' : 'Archives'}
          </button>
          <span className="collapse-icon">{collapsedSections.has('upcoming') ? '▼' : '▲'}</span>
        </h2>
        {!collapsedSections.has('upcoming') && (
          <div className="grid-2">
            <div>
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={formData.upcomingTitle}
                  onChange={(e) => setFormData(prev => ({ ...prev, upcomingTitle: e.target.value }))}
                  placeholder="Beyond Resilience: The Secret to a Truly Confident Dog"
                />
              </div>
              <div className="form-group">
                <label>Synopsis (full version)</label>
                <textarea
                  value={formData.upcomingSynopsis}
                  onChange={(e) => setFormData(prev => ({ ...prev, upcomingSynopsis: e.target.value }))}
                  placeholder="Paste the full synopsis here..."
                  style={{ minHeight: 100 }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  onClick={shortenSynopsis}
                  className="btn btn-outline"
                  disabled={loadingSynopsis || !formData.upcomingSynopsis}
                >
                  {loadingSynopsis ? 'Shortening...' : 'Shorten with AI'}
                </button>
                {shortenedSynopsis && (
                  <button
                    className="btn btn-sm"
                    onClick={() => copyToClipboard(shortenedSynopsis, 'synopsis')}
                  >
                    {copiedField === 'synopsis' ? '✓ Copied' : 'Copy Short Version'}
                  </button>
                )}
              </div>
              {shortenedSynopsis && (
                <div className="preview-section">
                  <h4>Shortened Synopsis</h4>
                  <p>{shortenedSynopsis}</p>
                </div>
              )}
            </div>
            <div>
              <div className="form-group">
                <label>Image</label>
                <label
                  className={`image-upload ${formData.upcomingImage ? 'has-image' : ''}`}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop('upcomingImage')}
                >
                  {formData.upcomingImage ? (
                    <img src={formData.upcomingImage} alt="Preview" />
                  ) : (
                    <p>Click or drag image here</p>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload('upcomingImage')}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
              <div className="form-group">
                <label>Member Link</label>
                <input
                  type="url"
                  value={formData.upcomingMemberLink}
                  onChange={(e) => setFormData(prev => ({ ...prev, upcomingMemberLink: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Non-Member Link</label>
                <input
                  type="url"
                  value={formData.upcomingNonMemberLink}
                  onChange={(e) => setFormData(prev => ({ ...prev, upcomingNonMemberLink: e.target.value }))}
                  placeholder="https://animaltrainingacademy.com/webinar-name/"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Step 6: Subject Lines */}
      <div className={`card ${collapsedSections.has('subject') ? 'collapsed' : ''}`}>
        <h2 onClick={() => toggleSection('subject')} style={{ cursor: 'pointer' }}>
          <span className={`step-indicator ${getStepStatus('subject')}`}>6</span>
          Subject Lines & Preview Text
          {getStepStatus('subject') === 'complete' && <span className="complete-badge">✓</span>}
          <span className="collapse-icon">{collapsedSections.has('subject') ? '▼' : '▲'}</span>
        </h2>
        {!collapsedSections.has('subject') && (
          <>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
              <button
                onClick={generateSubjectLines}
                className="btn btn-primary"
                disabled={loadingSubjects || selectedToolboxTitle === null}
              >
                {loadingSubjects ? 'Generating...' : subjectLines.length > 0 ? 'Regenerate Subjects' : 'Generate 10 Subject Lines'}
              </button>
              {selectedToolboxTitle === null && (
                <span style={{ color: '#f57c00', fontSize: 13 }}>
                  Select a title in Step 2 first
                </span>
              )}
            </div>

            {subjectLines.length > 0 && (
              <div className="subject-lines">
                {subjectLines.map((line, index) => (
                  <div
                    key={index}
                    className={`subject-line-option ${selectedSubject === index ? 'selected' : ''}`}
                    onClick={() => setSelectedSubject(index)}
                  >
                    <input
                      type="radio"
                      checked={selectedSubject === index}
                      onChange={() => setSelectedSubject(index)}
                    />
                    <div className="text">
                      <div className="subject">{line.subject}</div>
                      <div className="preview">{line.preview}</div>
                    </div>
                    <button
                      className="copy-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        copyToClipboard(`${line.subject}\n${line.preview}`, `subject-${index}`)
                      }}
                      title="Copy to clipboard"
                    >
                      {copiedField === `subject-${index}` ? '✓' : '📋'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Step 7: UTM, Schedule & Create */}
      <div className="card final-step">
        <h2>
          <span className={`step-indicator ${getStepStatus('create')}`}>7</span>
          Finalize & Create Broadcasts
          {getStepStatus('create') === 'complete' && <span className="complete-badge">✓ Created!</span>}
        </h2>

        <div className="grid-2" style={{ marginBottom: 20 }}>
          <div className="form-group">
            <label>Campaign Date (for UTM)</label>
            <input
              type="date"
              value={formData.campaignDate}
              onChange={(e) => setFormData(prev => ({ ...prev, campaignDate: e.target.value }))}
            />
            <div className="utm-preview">
              utm_campaign=behavior-bulletin-{new Date(formData.campaignDate).getDate()}-{new Date(formData.campaignDate).toLocaleString('en-US', { month: 'short' }).toLowerCase()}
            </div>
          </div>
          <div className="form-group">
            <label>Scheduled Send Date (8am)</label>
            <input
              type="date"
              value={formData.scheduledDate}
              onChange={(e) => setFormData(prev => ({ ...prev, scheduledDate: e.target.value }))}
            />
          </div>
        </div>

        {broadcastResult && (
          <div className={`status-badge ${broadcastResult.includes('Error') || broadcastResult.includes('Failed') ? 'error' : 'success'}`} style={{ display: 'block', marginBottom: 16, padding: 12 }}>
            {broadcastResult}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            onClick={createBroadcasts}
            className="btn btn-primary btn-lg"
            disabled={creatingBroadcast || selectedSubject === null}
          >
            {creatingBroadcast ? 'Creating...' : 'Create Draft Broadcasts in Kit'}
          </button>

          {selectedSubject === null && subjectLines.length > 0 && (
            <span style={{ color: '#f57c00', fontSize: 13 }}>
              Please select a subject line in Step 6
            </span>
          )}

          {selectedSubject === null && subjectLines.length === 0 && (
            <span style={{ color: '#f57c00', fontSize: 13 }}>
              Complete Steps 1-6 first
            </span>
          )}
        </div>

        {selectedSubject !== null && (
          <div className="selected-summary">
            <h4>Ready to create with:</h4>
            <p><strong>Title:</strong> {formData.toolboxTitle}</p>
            <p><strong>Subject:</strong> {subjectLines[selectedSubject]?.subject}</p>
            <p><strong>Preview:</strong> {subjectLines[selectedSubject]?.preview}</p>
          </div>
        )}
      </div>
    </div>
  )
}
