'use client'

import { useState, useEffect } from 'react'

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const [rawContent, setRawContent] = useState('')
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<{
    subjectLines: { subject: string; preview: string }[]
    emailHtml: string
  } | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  // Load saved content from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('behaviourBulletinContent')
    if (saved) setRawContent(saved)
  }, [])

  // Auto-save content
  useEffect(() => {
    localStorage.setItem('behaviourBulletinContent', rawContent)
  }, [rawContent])

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

  async function generateEmail() {
    if (!rawContent.trim()) {
      alert('Please paste your content first')
      return
    }

    setGenerating(true)
    setResult(null)
    setSelectedSubject(null)

    try {
      const res = await fetch('/api/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: rawContent })
      })

      const data = await res.json()
      if (data.error) {
        alert(`Error: ${data.error}`)
      } else {
        setResult(data)
      }
    } catch (error) {
      alert(`Failed to generate: ${error}`)
    } finally {
      setGenerating(false)
    }
  }

  function copyToClipboard(text: string, type: string) {
    navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  function clearAll() {
    if (confirm('Clear everything and start fresh?')) {
      setRawContent('')
      setResult(null)
      setSelectedSubject(null)
      localStorage.removeItem('behaviourBulletinContent')
    }
  }

  // Loading state
  if (isAuthenticated === null) {
    return (
      <div className="login-container">
        <div className="loading-spinner"></div>
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
            {isLoggingIn ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="header">
        <div>
          <h1>Behaviour Bulletin Generator</h1>
          <p style={{ opacity: 0.9, fontSize: 14 }}>Paste content → Generate email → Copy to Kit</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={clearAll} className="btn btn-secondary" style={{ background: '#ff6b6b', color: 'white' }}>
            Clear All
          </button>
          <button onClick={handleLogout} className="btn btn-secondary">Logout</button>
        </div>
      </div>

      {/* Step 1: Paste Content */}
      <div className="card">
        <h2>1. Paste Your Content</h2>
        <p style={{ color: '#666', marginBottom: 16 }}>
          Paste everything: Trainer&apos;s Toolbox post, webinar details, podcast info, upcoming/archive webinar.
          The AI will figure out the structure.
        </p>
        <textarea
          value={rawContent}
          onChange={(e) => setRawContent(e.target.value)}
          placeholder={`Example:

TRAINER'S TOOLBOX:
How do you train a medical behavior with an animal who never wants to be touched?
This was the challenge ATA member Lisa Longo faced with a client's macaw...
Link: https://atamember.com/2020/12/11/certified-parrot-trainer/
CTA: See the case studies and Lisa's 5 objectives.

PREVIOUS WEBINAR:
Wolf Training with Ryan Talbot
Member link: https://atamember.com/web-class-replays/
Non-member link: https://animaltrainingacademy.com/wolf-training/

PODCAST:
Engineering Better Husbandry with Ryan Talbot [Episode 271]

UPCOMING WEBINAR (or ARCHIVE):
A Deeper Look at Separation Anxiety with Malena DeMartini
Synopsis: Join separation anxiety expert Malena DeMartini for an advanced deep dive...
Member link: https://atamember.com/web-class-replays/
Non-member link: https://animaltrainingacademy.com/separation-anxiety/`}
          style={{ minHeight: 300, fontFamily: 'monospace', fontSize: 13 }}
        />
        <div style={{ marginTop: 16 }}>
          <button
            onClick={generateEmail}
            className="btn btn-primary btn-lg"
            disabled={generating || !rawContent.trim()}
          >
            {generating ? 'Generating...' : 'Generate Email & Subject Lines'}
          </button>
        </div>
      </div>

      {/* Step 2: Results */}
      {result && (
        <>
          {/* Subject Lines */}
          <div className="card">
            <h2>2. Choose Subject Line</h2>
            <div className="subject-lines">
              {result.subjectLines.map((line, index) => (
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
                  >
                    {copied === `subject-${index}` ? '✓' : 'Copy'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Email HTML */}
          <div className="card">
            <h2>3. Copy Email HTML</h2>
            <p style={{ color: '#666', marginBottom: 16 }}>
              Copy this HTML and paste it into Kit&apos;s email editor (use the HTML/code view).
            </p>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => copyToClipboard(result.emailHtml, 'html')}
                className="btn btn-primary"
                style={{ marginBottom: 12 }}
              >
                {copied === 'html' ? '✓ Copied!' : 'Copy Email HTML'}
              </button>
              <pre style={{
                background: '#f5f5f5',
                padding: 16,
                borderRadius: 8,
                overflow: 'auto',
                maxHeight: 400,
                fontSize: 12,
                lineHeight: 1.4
              }}>
                {result.emailHtml}
              </pre>
            </div>
          </div>

          {/* Preview */}
          <div className="card">
            <h2>4. Preview</h2>
            <div style={{
              background: 'white',
              border: '1px solid #ddd',
              borderRadius: 8,
              padding: 20,
              maxWidth: 600,
              margin: '0 auto'
            }}>
              <div dangerouslySetInnerHTML={{ __html: result.emailHtml }} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
