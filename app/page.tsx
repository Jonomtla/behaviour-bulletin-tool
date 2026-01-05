'use client'

import { useState, useEffect } from 'react'

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
  // Trainer's Toolbox
  toolboxTitle: string
  toolboxBlurb: string
  toolboxLink: string

  // Previous Webinar
  prevWebinarTitle: string
  prevWebinarImage: string
  prevWebinarMemberLink: string

  // Upcoming / Archives
  upcomingTitle: string
  upcomingSynopsis: string
  upcomingImage: string
  upcomingMemberLink: string
  upcomingNonMemberLink: string
  isArchive: boolean

  // Podcast (auto-fetched)
  podcastTitle: string
  podcastImage: string
  podcastDate: string

  // UTM
  campaignDate: string

  // Schedule
  scheduledDate: string
}

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const [formData, setFormData] = useState<FormData>({
    toolboxTitle: '',
    toolboxBlurb: '',
    toolboxLink: '',
    prevWebinarTitle: '',
    prevWebinarImage: '',
    prevWebinarMemberLink: 'https://atamember.com/web-class-replays/',
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
  const [shortenedSynopsis, setShortenedSynopsis] = useState('')
  const [loadingSynopsis, setLoadingSynopsis] = useState(false)
  const [creatingBroadcast, setCreatingBroadcast] = useState(false)
  const [broadcastResult, setBroadcastResult] = useState<string | null>(null)

  function getNextTuesday(): string {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const daysUntilTuesday = (2 - dayOfWeek + 7) % 7 || 7
    const nextTuesday = new Date(today)
    nextTuesday.setDate(today.getDate() + daysUntilTuesday)
    return nextTuesday.toISOString().split('T')[0]
  }

  // Check authentication on mount
  useEffect(() => {
    checkAuth()
  }, [])

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

  async function generateSubjectLines() {
    setLoadingSubjects(true)
    try {
      const res = await fetch('/api/generate-subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainerToolboxTitle: formData.toolboxTitle,
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
        const reader = new FileReader()
        reader.onloadend = () => {
          setFormData(prev => ({ ...prev, [field]: reader.result as string }))
        }
        reader.readAsDataURL(file)
      }
    }
  }

  function generateEmailHTML(isMember: boolean): string {
    const synopsis = shortenedSynopsis || formData.upcomingSynopsis
    const upcomingLink = isMember ? formData.upcomingMemberLink : formData.upcomingNonMemberLink

    // This is a simplified HTML template - in production you'd use the actual Kit template
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
    <p>${formData.toolboxBlurb}</p>
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
        <a href="${generateUTM(formData.prevWebinarMemberLink)}" style="display: inline-block; background: #666; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Watch Now</a>
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
      <div className="header">
        <div style={{ flex: 1 }}>
          <h1>Behaviour Bulletin Tool</h1>
          <p style={{ opacity: 0.9, fontSize: 14 }}>Animal Training Academy</p>
        </div>
        <button onClick={handleLogout} className="btn btn-secondary">Logout</button>
      </div>

      {/* Trainer's Toolbox */}
      <div className="card">
        <h2>Trainer&apos;s Toolbox</h2>
        <div className="form-group">
          <label>Title</label>
          <input
            type="text"
            value={formData.toolboxTitle}
            onChange={(e) => setFormData(prev => ({ ...prev, toolboxTitle: e.target.value }))}
            placeholder="e.g., Chirag Patel's 4 Ideas for Ear Flushing"
          />
        </div>
        <div className="form-group">
          <label>Blurb</label>
          <textarea
            value={formData.toolboxBlurb}
            onChange={(e) => setFormData(prev => ({ ...prev, toolboxBlurb: e.target.value }))}
            placeholder="The description/blurb for this toolbox item..."
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
          {formData.toolboxLink && (
            <div className="utm-preview" style={{ marginTop: 8 }}>
              {generateUTM(formData.toolboxLink)}
            </div>
          )}
        </div>
      </div>

      <div className="grid-2">
        {/* Previous Webinar */}
        <div className="card">
          <h2>Previous Webinar</h2>
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
            <label className={`image-upload ${formData.prevWebinarImage ? 'has-image' : ''}`}>
              {formData.prevWebinarImage ? (
                <img src={formData.prevWebinarImage} alt="Preview" />
              ) : (
                <p>Click to upload image</p>
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
        </div>

        {/* Podcast */}
        <div className="card">
          <h2>Latest Podcast</h2>
          {podcast ? (
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
            {loadingPodcast ? 'Fetching...' : podcast ? 'Refresh' : 'Fetch Latest Podcast'}
          </button>
        </div>
      </div>

      {/* Upcoming / Archives */}
      <div className="card">
        <h2>
          <span>{formData.isArchive ? 'From the Archives' : 'Upcoming Webinar'}</span>
          <button
            onClick={() => setFormData(prev => ({ ...prev, isArchive: !prev.isArchive }))}
            className="btn btn-secondary"
            style={{ marginLeft: 'auto', fontSize: 12, padding: '6px 12px' }}
          >
            Switch to {formData.isArchive ? 'Upcoming' : 'Archives'}
          </button>
        </h2>
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
                style={{ minHeight: 120 }}
              />
            </div>
            <button
              onClick={shortenSynopsis}
              className="btn btn-outline"
              disabled={loadingSynopsis || !formData.upcomingSynopsis}
            >
              {loadingSynopsis ? 'Shortening...' : 'Shorten with AI'}
            </button>
            {shortenedSynopsis && (
              <div className="preview-section">
                <h3>Shortened Synopsis</h3>
                <p>{shortenedSynopsis}</p>
              </div>
            )}
          </div>
          <div>
            <div className="form-group">
              <label>Image</label>
              <label className={`image-upload ${formData.upcomingImage ? 'has-image' : ''}`}>
                {formData.upcomingImage ? (
                  <img src={formData.upcomingImage} alt="Preview" />
                ) : (
                  <p>Click to upload image</p>
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
              <label>Non-Member Landing Page</label>
              <input
                type="url"
                value={formData.upcomingNonMemberLink}
                onChange={(e) => setFormData(prev => ({ ...prev, upcomingNonMemberLink: e.target.value }))}
                placeholder="https://animaltrainingacademy.com/webinar-name/"
              />
            </div>
          </div>
        </div>
      </div>

      {/* UTM & Schedule */}
      <div className="card">
        <h2>UTM & Schedule</h2>
        <div className="grid-2">
          <div className="form-group">
            <label>Campaign Date (for UTM)</label>
            <input
              type="date"
              value={formData.campaignDate}
              onChange={(e) => setFormData(prev => ({ ...prev, campaignDate: e.target.value }))}
            />
            <div className="utm-preview" style={{ marginTop: 8 }}>
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
      </div>

      {/* Subject Lines */}
      <div className="card">
        <h2>Subject Lines & Preview Text</h2>
        <button
          onClick={generateSubjectLines}
          className="btn btn-primary"
          disabled={loadingSubjects}
          style={{ marginBottom: 20 }}
        >
          {loadingSubjects ? 'Generating...' : 'Generate 10 Subject Lines'}
        </button>

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
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="card">
        <h2>Create Broadcasts</h2>
        <p style={{ marginBottom: 16, color: '#666' }}>
          This will create two draft broadcasts in Kit - one for members and one for non-members.
          You can review and edit them in Kit before sending.
        </p>

        {broadcastResult && (
          <div className={`status-badge ${broadcastResult.includes('Error') ? 'error' : 'success'}`} style={{ display: 'block', marginBottom: 16, padding: 12 }}>
            {broadcastResult}
          </div>
        )}

        <button
          onClick={createBroadcasts}
          className="btn btn-primary"
          disabled={creatingBroadcast || selectedSubject === null}
        >
          {creatingBroadcast ? 'Creating...' : 'Create Draft Broadcasts in Kit'}
        </button>

        {selectedSubject === null && subjectLines.length > 0 && (
          <p style={{ marginTop: 8, color: '#f57c00', fontSize: 13 }}>
            Please select a subject line above first
          </p>
        )}
      </div>
    </div>
  )
}
