'use client'

import { useState, useEffect } from 'react'

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  // Inputs
  const [toolboxContent, setToolboxContent] = useState('')
  const [webinarSynopsis, setWebinarSynopsis] = useState('')

  // Outputs
  const [subjectLines, setSubjectLines] = useState<string[]>([])
  const [previewTexts, setPreviewTexts] = useState<string[]>([])
  const [shortenedSynopsis, setShortenedSynopsis] = useState('')

  // Loading states
  const [loadingSubjects, setLoadingSubjects] = useState(false)
  const [loadingSynopsis, setLoadingSynopsis] = useState(false)

  const [copied, setCopied] = useState<string | null>(null)

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

  async function generateSubjectsAndPreviews() {
    if (!toolboxContent.trim()) {
      alert('Paste your Toolbox content first')
      return
    }

    setLoadingSubjects(true)
    try {
      const res = await fetch('/api/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'subjects',
          content: toolboxContent
        })
      })
      const data = await res.json()
      if (data.error) {
        alert(data.error)
      } else {
        setSubjectLines(data.subjectLines || [])
        setPreviewTexts(data.previewTexts || [])
      }
    } catch (error) {
      alert(`Failed: ${error}`)
    } finally {
      setLoadingSubjects(false)
    }
  }

  async function shortenSynopsis() {
    if (!webinarSynopsis.trim()) {
      alert('Paste the webinar synopsis first')
      return
    }

    setLoadingSynopsis(true)
    try {
      const res = await fetch('/api/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'synopsis',
          content: webinarSynopsis
        })
      })
      const data = await res.json()
      if (data.error) {
        alert(data.error)
      } else {
        setShortenedSynopsis(data.shortenedSynopsis || '')
      }
    } catch (error) {
      alert(`Failed: ${error}`)
    } finally {
      setLoadingSynopsis(false)
    }
  }

  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 1500)
  }

  if (isAuthenticated === null) {
    return <div className="login-container"><div className="loading-spinner"></div></div>
  }

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
            {isLoggingIn ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="header">
        <h1>Behaviour Bulletin Helper</h1>
        <button onClick={handleLogout} className="btn btn-secondary">Logout</button>
      </div>

      {/* Subject Lines & Preview Text */}
      <div className="card">
        <h2>Subject Lines & Preview Text</h2>
        <p style={{ color: '#666', marginBottom: 12 }}>
          Paste this week&apos;s Trainer&apos;s Toolbox content (or key details about this week&apos;s email)
        </p>
        <textarea
          value={toolboxContent}
          onChange={(e) => setToolboxContent(e.target.value)}
          placeholder="Paste the Toolbox content, webinar topic, or a summary of what's in this week's email..."
          style={{ minHeight: 120 }}
        />
        <button
          onClick={generateSubjectsAndPreviews}
          className="btn btn-primary"
          disabled={loadingSubjects || !toolboxContent.trim()}
          style={{ marginTop: 12 }}
        >
          {loadingSubjects ? 'Generating...' : 'Generate Subject Lines & Preview Text'}
        </button>

        {subjectLines.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <h3 style={{ marginBottom: 12 }}>Subject Lines</h3>
            {subjectLines.map((line, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 12px',
                background: '#f9f9f9',
                borderRadius: 6,
                marginBottom: 8
              }}>
                <span>{line}</span>
                <button
                  onClick={() => copy(line, `subject-${i}`)}
                  className="btn btn-sm"
                >
                  {copied === `subject-${i}` ? '✓' : 'Copy'}
                </button>
              </div>
            ))}

            <h3 style={{ marginTop: 20, marginBottom: 12 }}>Preview Texts</h3>
            {previewTexts.map((text, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 12px',
                background: '#f9f9f9',
                borderRadius: 6,
                marginBottom: 8
              }}>
                <span style={{ fontSize: 14 }}>{text}</span>
                <button
                  onClick={() => copy(text, `preview-${i}`)}
                  className="btn btn-sm"
                >
                  {copied === `preview-${i}` ? '✓' : 'Copy'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Webinar Synopsis */}
      <div className="card">
        <h2>Shorten Webinar Synopsis</h2>
        <p style={{ color: '#666', marginBottom: 12 }}>
          Paste the full webinar description to get a shorter version for the email
        </p>
        <textarea
          value={webinarSynopsis}
          onChange={(e) => setWebinarSynopsis(e.target.value)}
          placeholder="Paste the full webinar synopsis here..."
          style={{ minHeight: 120 }}
        />
        <button
          onClick={shortenSynopsis}
          className="btn btn-primary"
          disabled={loadingSynopsis || !webinarSynopsis.trim()}
          style={{ marginTop: 12 }}
        >
          {loadingSynopsis ? 'Shortening...' : 'Shorten Synopsis'}
        </button>

        {shortenedSynopsis && (
          <div style={{ marginTop: 20 }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              padding: 16,
              background: '#e8f5e0',
              borderRadius: 8,
              border: '1px solid #c8e6c0'
            }}>
              <p style={{ margin: 0, lineHeight: 1.6 }}>{shortenedSynopsis}</p>
              <button
                onClick={() => copy(shortenedSynopsis, 'synopsis')}
                className="btn btn-sm"
                style={{ marginLeft: 12, flexShrink: 0 }}
              >
                {copied === 'synopsis' ? '✓' : 'Copy'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
