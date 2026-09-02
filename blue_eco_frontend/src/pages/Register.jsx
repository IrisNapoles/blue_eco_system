import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, Upload, ArrowLeft } from 'lucide-react'
import { register } from '../lib/authApi'
import BlueEcoMark from '../components/BlueEcoMark'
import SpirulinaScene from '../components/SpirulinaScene'

const EMPTY_STEP1 = {
  name: '', age: '', gender: '', street_no: '', barangay: '',
  city: '', state_province: '', region: '', email: '', contact_number: '',
}
const EMPTY_STEP2 = { id_type: '', username: '', password: '', password_confirmation: '' }

// Well-known email domains we check typos against.
const KNOWN_EMAIL_DOMAINS = [
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com',
]

// Damerau-Levenshtein distance: like standard edit distance, but also
// counts a single adjacent-letter swap (transposition) as one edit — this
// matters because swaps ("gmial" vs "gmail") are one of the most common
// typo patterns, and plain Levenshtein would count that as two edits.
function editDistance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost // substitution (or match)
      )
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1) // adjacent swap
      }
    }
  }
  return dp[a.length][b.length]
}

// Flags a domain only if it's a near-exact miss (distance of 1) from a known
// domain — e.g. "gmial.com" or "gmaill.com" — and never flags an exact match,
// so real (if uncommon) domains are never second-guessed.
function getEmailTypoSuggestion(email) {
  const domain = email.split('@')[1]?.toLowerCase().trim()
  if (!domain) return null
  if (KNOWN_EMAIL_DOMAINS.includes(domain)) return null

  for (const known of KNOWN_EMAIL_DOMAINS) {
    if (Math.abs(domain.length - known.length) <= 1 && editDistance(domain, known) === 1) {
      return known
    }
  }
  return null
}

const NAME_PATTERN = /^[A-Za-z\u00C0-\u017F.'\- ]+$/
const STREET_PATTERN = /^[A-Za-z0-9\u00C0-\u017F .,#/\-]+$/
const ADDRESS_TEXT_PATTERN = /^[A-Za-z0-9\u00C0-\u017F .,'()\-]+$/

function validateStep1Field(key, value) {
  const trimmed = (value ?? '').toString().trim()

  switch (key) {
    case 'name':
      if (!trimmed) return 'Full name is required.'
      if (!NAME_PATTERN.test(trimmed)) return 'Name should only contain letters.'
      return null

    case 'age': {
      if (!trimmed) return 'Age is required.'
      const n = Number(trimmed)
      if (!Number.isInteger(n) || n < 18 || n > 100) return 'Age must be between 18 and 100.'
      return null
    }

    case 'gender':
      return trimmed ? null : 'Please select a gender.'

    case 'street_no':
      if (!trimmed) return 'This field is required.'
      if (!STREET_PATTERN.test(trimmed)) return 'Street No. contains invalid characters.'
      return null

    case 'barangay':
    case 'city':
    case 'state_province':
    case 'region':
      if (!trimmed) return 'This field is required.'
      if (!ADDRESS_TEXT_PATTERN.test(trimmed)) return 'This field contains invalid characters.'
      return null

    case 'email': {
      if (!trimmed) return 'Email is required.'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'Enter a valid email address.'
      const suggestion = getEmailTypoSuggestion(trimmed)
      if (suggestion) {
        const [localPart] = trimmed.split('@')
        return `Did you mean "${localPart}@${suggestion}"? Please double-check your email address.`
      }
      return null
    }

    case 'contact_number':
      if (!trimmed) return 'Contact number is required.'
      return /^09\d{9}$/.test(trimmed) ? null : 'Enter an 11-digit PH mobile number starting with 09.'

    default:
      return null
  }
}

const STEP1_KEYS = ['name', 'age', 'gender', 'street_no', 'barangay', 'city', 'state_province', 'region', 'email', 'contact_number']

const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/

function validateStep2Field(key, value, values2) {
  switch (key) {
    case 'id_type':
      return value.trim() ? null : 'ID type is required.'

    case 'username':
      if (!value.trim()) return 'Username is required.'
      if (!USERNAME_PATTERN.test(value.trim())) {
        return 'Username must be 3-20 characters: letters, numbers, and underscores only.'
      }
      return null

    case 'password':
      if (!value) return 'Password is required.'
      if (!PASSWORD_PATTERN.test(value)) {
        return 'Must be at least 8 characters with an uppercase letter, a lowercase letter, a number, and a special character.'
      }
      return null

    case 'password_confirmation':
      if (!value) return 'Please confirm your password.'
      if (value !== values2.password) return 'Passwords do not match.'
      return null

    default:
      return null
  }
}

const STEP2_KEYS = ['id_type', 'username', 'password', 'password_confirmation']

export default function Register() {
  const [step, setStep] = useState(1)
  const [values1, setValues1] = useState(EMPTY_STEP1)
  const [values2, setValues2] = useState(EMPTY_STEP2)
  const [frontId, setFrontId] = useState(null)
  const [backId, setBackId] = useState(null)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  function update1(key, value) { setValues1((v) => ({ ...v, [key]: value })) }

  function setFieldError(key, message) {
    setErrors((prev) => ({ ...prev, [key]: message ? [message] : undefined }))
  }

  // Validates as the user types, not just on blur/submit.
  function handleStep1Change(key, value) {
    update1(key, value)
    setFieldError(key, validateStep1Field(key, value))
  }

  function handleStep2Change(key, value) {
    const nextValues2 = { ...values2, [key]: value }
    setValues2(nextValues2)
    setFieldError(key, validateStep2Field(key, value, nextValues2))

    // If password changes, re-check confirmation against the new value too.
    if (key === 'password' && nextValues2.password_confirmation) {
      setFieldError(
        'password_confirmation',
        validateStep2Field('password_confirmation', nextValues2.password_confirmation, nextValues2)
      )
    }
  }

  function handleFrontIdChange(file) {
    setFrontId(file)
    setFieldError('front_id', file ? null : 'Front of ID is required.')
  }

  function handleBackIdChange(file) {
    setBackId(file)
    setFieldError('back_id', file ? null : 'Back of ID is required.')
  }

  function handleNext(e) {
    e.preventDefault()
    const nextErrors = {}
    STEP1_KEYS.forEach((key) => {
      const message = validateStep1Field(key, values1[key])
      if (message) nextErrors[key] = [message]
    })
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    setStep(2)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const nextErrors = {}

    STEP2_KEYS.forEach((key) => {
      const message = validateStep2Field(key, values2[key], values2)
      if (message) nextErrors[key] = [message]
    })
    if (!frontId) nextErrors.front_id = ['Front of ID is required.']
    if (!backId) nextErrors.back_id = ['Back of ID is required.']

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }
    setErrors({})

    const formData = new FormData()
    Object.entries(values1).forEach(([k, v]) => formData.append(k, v))
    Object.entries(values2).forEach(([k, v]) => formData.append(k, v))
    if (frontId) formData.append('front_id', frontId)
    if (backId) formData.append('back_id', backId)

    setSubmitting(true)
    try {
      await register(formData)
      setSubmitted(true)
    } catch (err) {
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors)
      } else {
        setErrors({ general: [err.response?.data?.message || 'Could not submit registration.'] })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const fieldError = (key) => errors[key]?.[0]

  if (submitted) {
    return (
      <div className="min-h-screen bg-brand-100 flex items-center justify-center p-4 font-['Plus_Jakarta_Sans']">
        <div className="w-full max-w-sm rounded-[2rem] bg-canvas p-6 text-center shadow-xl sm:p-10">
          <div className="mx-auto mb-2 w-fit">
            <BlueEcoMark />
          </div>
          <h1 className="mt-6 text-xl font-extrabold text-ink">Registration submitted</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink/60">
            Thanks for signing up! Please wait for admin approval — you'll be notified once your
            distributor account is active. You can then log in using the Blue Eco mobile app.
          </p>
          <Link to="/login" className="mt-6 inline-block text-sm font-bold text-brand-500 hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-100 flex font-['Plus_Jakarta_Sans']">
      {/* Floating form card */}
      <div className="relative z-10 flex w-full lg:w-[500px] shrink-0 items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm overflow-hidden rounded-[2rem] bg-canvas shadow-xl">
          <div className="beco-scroll max-h-[85vh] overflow-y-auto p-6 sm:p-7">
          <div className="flex justify-center">
            <BlueEcoMark />
          </div>

          <h1 className="mt-6 text-center text-2xl font-extrabold leading-tight text-ink sm:text-3xl">
            Create account
          </h1>
          <p className="mt-2 text-center text-xs font-semibold uppercase tracking-wide text-ink/50">
            Step {step} of 2 · {step === 1 ? 'Personal details' : 'ID & credentials'}
          </p>
          <div className="mt-3 flex justify-center gap-2">
            <span className={`h-1.5 rounded-full transition-all ${step === 1 ? 'w-8 bg-brand-400' : 'w-4 bg-brand-400/30'}`} />
            <span className={`h-1.5 rounded-full transition-all ${step === 2 ? 'w-8 bg-brand-400' : 'w-4 bg-brand-400/30'}`} />
          </div>

          {errors.general && (
            <div className="mt-5 rounded-xl border border-danger-500/30 bg-danger-500/10 px-4 py-2.5 text-sm text-red-600">
              {errors.general[0]}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleNext} noValidate className="mt-6 space-y-3.5">
              <UField
                label="Full Name"
                placeholder="Juan Dela Cruz"
                value={values1.name}
                onChange={(v) => handleStep1Change('name', v)}
                error={fieldError('name')}
                required
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <UField
                  label="Age"
                  type="number"
                  placeholder="30"
                  value={values1.age}
                  onChange={(v) => handleStep1Change('age', v)}
                  error={fieldError('age')}
                  required
                />
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink/60">Gender</label>
                  <select
                    value={values1.gender}
                    onChange={(e) => handleStep1Change('gender', e.target.value)}
                    className="w-full rounded-full border border-ink/10 bg-white px-4 py-2 text-xs text-ink transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
                  >
                    <option value="">Select</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                  {fieldError('gender') && <p className="mt-1 text-xs text-red-600">{fieldError('gender')}</p>}
                </div>
              </div>

              <p className="pt-1 text-[11px] font-semibold uppercase tracking-wide text-ink/40">Address Information</p>
              <UField
                label="Street No."
                placeholder="123 Mabini St."
                value={values1.street_no}
                onChange={(v) => handleStep1Change('street_no', v)}
                error={fieldError('street_no')}
                required
              />
              <UField
                label="Barangay"
                placeholder="San Isidro"
                value={values1.barangay}
                onChange={(v) => handleStep1Change('barangay', v)}
                error={fieldError('barangay')}
                required
              />
              <UField
                label="City"
                placeholder="Calamba"
                value={values1.city}
                onChange={(v) => handleStep1Change('city', v)}
                error={fieldError('city')}
                required
              />
              <UField
                label="State / Province"
                placeholder="Laguna"
                value={values1.state_province}
                onChange={(v) => handleStep1Change('state_province', v)}
                error={fieldError('state_province')}
                required
              />
              <UField
                label="Region"
                placeholder="Region IV-A (CALABARZON)"
                value={values1.region}
                onChange={(v) => handleStep1Change('region', v)}
                error={fieldError('region')}
                required
              />

              <p className="pt-1 text-[11px] font-semibold uppercase tracking-wide text-ink/40">Contact Information</p>
              <UField
                label="Email Address"
                type="email"
                placeholder="juandelacruz23@gmail.com"
                value={values1.email}
                onChange={(v) => handleStep1Change('email', v)}
                error={fieldError('email')}
                required
              />
              <UField
                label="Contact Number"
                placeholder="09171234567"
                value={values1.contact_number}
                onChange={(v) => handleStep1Change('contact_number', v)}
                error={fieldError('contact_number')}
                required
              />

              <button
                type="submit"
                className="w-full rounded-full bg-ink py-3 text-xs font-bold text-white transition-colors hover:bg-brand-700"
              >
                Next
              </button>

              <p className="text-center text-sm text-ink/60">
                Have an account?{' '}
                <Link to="/login" className="font-semibold text-brand-500 hover:underline">
                  Log in
                </Link>
              </p>
            </form>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-3.5">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink/60">ID Type</label>
                <select
                  value={values2.id_type}
                  onChange={(e) => handleStep2Change('id_type', e.target.value)}
                  className="w-full rounded-full border border-ink/10 bg-white px-4 py-2 text-xs text-ink transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
                >
                  <option value="">Select ID type</option>
                  <option>Philippine National ID (PhilSys)</option>
                  <option>Driver's License</option>
                  <option>Passport</option>
                  <option>UMID</option>
                  <option>SSS ID</option>
                  <option>PhilHealth ID</option>
                  <option>TIN ID</option>
                  <option>PRC ID</option>
                  <option>Postal ID</option>
                  <option>Voter's ID</option>
                  <option>Senior Citizen ID</option>
                  <option>PWD ID</option>
                  <option>Barangay ID</option>
                  <option>Company ID</option>
                  <option>School ID</option>
                  <option>Other</option>
                </select>
                {fieldError('id_type') && <p className="mt-1 text-xs text-red-600">{fieldError('id_type')}</p>}
              </div>

              <IdUploadField
                label="Front of ID"
                file={frontId}
                onChange={handleFrontIdChange}
                error={fieldError('front_id')}
              />

              <IdUploadField
                label="Back of ID"
                file={backId}
                onChange={handleBackIdChange}
                error={fieldError('back_id')}
              />

              <UField
                label="Username"
                placeholder="juandelacruz23"
                value={values2.username}
                onChange={(v) => handleStep2Change('username', v)}
                error={fieldError('username')}
                required
              />
              <div>
                <UField
                  label="Password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={values2.password}
                  onChange={(v) => handleStep2Change('password', v)}
                  error={fieldError('password')}
                  showError={false}
                  required
                />
                <PasswordChecklist password={values2.password} />
              </div>
              <UField
                label="Confirm Password"
                type="password"
                placeholder="Re-enter password"
                value={values2.password_confirmation}
                onChange={(v) => handleStep2Change('password_confirmation', v)}
                error={fieldError('password_confirmation')}
                required
              />

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  aria-label="Back"
                  className="flex items-center justify-center rounded-full border border-ink/10 px-4 py-3 text-ink/60 hover:bg-brand-100"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-full bg-ink py-3 text-xs font-bold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
                >
                  {submitting ? 'Submitting…' : 'Sign Up'}
                </button>
              </div>
            </form>
          )}
          </div>
        </div>
      </div>

      {/* Illustration scene */}
      <div className="relative hidden flex-1 lg:block">
        <SpirulinaScene />
      </div>

      <style>{`
        .beco-scroll::-webkit-scrollbar { width: 6px; }
        .beco-scroll::-webkit-scrollbar-track { background: transparent; }
        .beco-scroll::-webkit-scrollbar-thumb { background-color: rgba(0,0,0,0.15); border-radius: 9999px; }
        .beco-scroll { scrollbar-width: thin; scrollbar-color: rgba(0,0,0,0.15) transparent; }
      `}</style>
    </div>
  )
}

function UField({ label, type = 'text', placeholder, value, onChange, onBlur, error, required, min, max, minLength, pattern, title, showError = true }) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'

  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink/60">{label}</label>
      <div className="relative">
        <input
          type={isPassword && showPassword ? 'text' : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => onBlur?.(e)}
          placeholder={placeholder}
          required={required}
          min={min}
          max={max}
          minLength={minLength}
          pattern={pattern}
          title={title}
          className={`w-full rounded-full border border-ink/10 bg-white px-4 py-2 text-xs text-ink placeholder:text-ink/30 transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30 ${isPassword ? 'pr-10' : ''}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-3.5 flex items-center text-ink/40 hover:text-ink/70"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
      {showError && error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

function IdUploadField({ label, file, onChange, error }) {
  const inputRef = useRef(null)
  const [preview, setPreview] = useState(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!file) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink/60">{label}</label>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={(e) => onChange(e.target.files?.[0] || null)}
        className="hidden"
      />

      {preview ? (
        <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="block w-full cursor-zoom-in"
            aria-label={`View full ${label}`}
          >
            <img src={preview} alt={`${label} preview`} className="h-32 w-full object-cover" />
          </button>
          <div className="flex items-center justify-between gap-2 px-3 py-2">
            <span className="truncate text-[11px] text-ink/60">{file.name}</span>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="shrink-0 text-[11px] font-semibold text-brand-500 hover:underline"
            >
              Change
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-ink/20 bg-white/60 py-6 text-ink/50 transition hover:border-brand-400 hover:text-brand-500"
        >
          <Upload className="h-5 w-5" />
          <span className="text-[11px] font-medium">Click to upload image</span>
        </button>
      )}

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {isOpen && preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          onClick={() => setIsOpen(false)}
        >
          <img
            src={preview}
            alt={`${label} full view`}
            className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="absolute right-6 top-6 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-ink hover:bg-white"
            aria-label="Close"
          >
            ✕ Close
          </button>
        </div>
      )}
    </div>
  )
}

function PasswordChecklist({ password }) {
  const rules = [
    { label: 'At least 8 characters', test: (p) => p.length >= 8 },
    { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
    { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
    { label: 'One number', test: (p) => /\d/.test(p) },
    { label: 'One special character', test: (p) => /[^A-Za-z0-9]/.test(p) },
  ]

  return (
    <ul className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 px-1">
      {rules.map((rule) => {
        const passed = rule.test(password)
        return (
          <li key={rule.label} className="flex items-center gap-1.5 text-[11px]">
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${
                passed ? 'bg-green-700' : 'bg-red-700'
              }`}
            />
            <span className={passed ? 'text-green-700' : 'text-red-700'}>{rule.label}</span>
          </li>
        )
      })}
    </ul>
  )
}
