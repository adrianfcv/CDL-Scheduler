'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

const SHIFTS = ['Morning', 'Afternoon', 'Evening', 'Saturday', 'Sunrise']
const TRAINING_TYPES = ['Class A', 'Class B', 'Refresher', 'Hazmat']

export default function StudentsPage() {
  const [students, setStudents] = useState([])
  const [instructors, setInstructors] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [editingStudent, setEditingStudent] = useState(null)
  const [editingInfo, setEditingInfo] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [toast, setToast] = useState(null)
  const [dbError, setDbError] = useState(false)
  const [expandedStudent, setExpandedStudent] = useState(null)

  function showToast(message, type = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const today = new Date().toISOString().split('T')[0]

  function loadData() {
    Promise.all([fetch('/api/students'), fetch('/api/instructors')])
      .then(([sRes, iRes]) => Promise.all([sRes.json(), iRes.json()]))
      .then(([studentsData, instructorsData]) => {
        if (!Array.isArray(studentsData) || !Array.isArray(instructorsData)) {
          setDbError(true)
          setLoading(false)
          return
        }
        setDbError(false)
        setStudents(studentsData)
        setInstructors(instructorsData)
        setLoading(false)
      })
  }

  useEffect(() => { loadData() }, [])

  async function addStudent(values) {
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name: values.first_name, last_name: values.last_name, phone: values.phone || null, email: values.email || null, training_type: values.training_type || null }),
    })
    if (!res.ok) { const { error } = await res.json(); return { error } }
    setShowAdd(false)
    loadData()
    showToast('Student added successfully')
    return {}
  }

  function getStatus(student) {
    const a = student.assignments
    if (!a) return 'Unassigned'
    if (a.end_date >= today) return 'Active'
    return 'Completed'
  }

  async function saveStudentInfo(student, values) {
    const res = await fetch(`/api/students/${student.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name: values.first_name, last_name: values.last_name, phone: values.phone || null, email: values.email || null, training_type: values.training_type || null }),
    })
    if (!res.ok) { const { error } = await res.json(); return { error } }

    // If they have an assignment and shift changed, update it too
    const a = student.assignments
    if (a && values.shift && values.shift !== a.shift) {
      const aRes = await fetch(`/api/assignments/${a.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instructor_id: a.instructor_id, shift: values.shift, start_date: a.start_date, end_date: a.end_date }),
      })
      if (!aRes.ok) { const { error } = await aRes.json(); return { error } }
    }

    setEditingInfo(null)
    loadData()
    showToast('Student updated successfully')
    return {}
  }

  async function saveAssignment(student, values) {
    const a = student.assignments
    if (a) {
      const res = await fetch(`/api/assignments/${a.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instructor_id: values.instructor_id, shift: values.shift, start_date: values.start_date, end_date: values.end_date }),
      })
      if (!res.ok) { const { error } = await res.json(); return { error } }
    } else {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: student.id, instructor_id: values.instructor_id, shift: values.shift, start_date: values.start_date, end_date: values.end_date }),
      })
      if (!res.ok) { const { error } = await res.json(); return { error } }
    }
    setEditingStudent(null)
    loadData()
    showToast(a ? 'Assignment updated' : 'Student assigned successfully')
    return {}
  }

  const filtered = students.filter(s => {
    const nameMatch = `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase())
    if (!nameMatch) return false
    if (statusFilter === 'All') return true
    return getStatus(s) === statusFilter
  })

  const sorted = [...filtered].sort((a, b) => {
    const aDate = a.assignments?.start_date || ''
    const bDate = b.assignments?.start_date || ''
    return bDate.localeCompare(aDate)
  })

  const activeCount = students.filter(s => s.assignments && s.assignments.end_date >= today).length
  const completedCount = students.filter(s => s.assignments && s.assignments.end_date < today).length
  const unassignedCount = students.filter(s => !s.assignments).length

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (dbError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center max-w-sm px-6">
          <div className="w-12 h-12 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-500 text-xl font-black">!</span>
          </div>
          <p className="text-white font-bold mb-1">Unable to load data</p>
          <p className="text-gray-400 text-sm mb-5">The database could not be reached. Check that Supabase is active and your connection is working.</p>
          <button
            onClick={() => { setDbError(false); setLoading(true); loadData() }}
            className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-black px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <Image src="/logo.jpg" alt="The Trucking School" width={44} height={44} className="rounded-lg" />
            <div>
              <div className="text-white font-bold text-lg leading-tight">The Trucking School</div>
              <div className="text-red-500 text-xs font-semibold tracking-widest uppercase">Scheduler</div>
            </div>
          </div>
          <nav className="flex gap-1 ml-4">
            <Link href="/" className="text-sm font-medium text-gray-400 hover:text-white px-3 py-1.5 rounded-md transition-colors">Dashboard</Link>
            <span className="text-sm font-medium text-white bg-red-600 px-3 py-1.5 rounded-md">All Students</span>
            <Link href="/instructors" className="text-sm font-medium text-gray-400 hover:text-white px-3 py-1.5 rounded-md transition-colors">Instructors</Link>
          </nav>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
        >
          + Student
        </button>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border-l-4 border-l-gray-900 p-4 shadow-sm">
            <div className="text-3xl font-black text-gray-900">{students.length}</div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mt-1">Total Students</div>
          </div>
          <div className="bg-white rounded-xl border-l-4 border-l-red-600 p-4 shadow-sm">
            <div className="text-3xl font-black text-gray-900">{activeCount}</div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mt-1">Active Now</div>
          </div>
          <div className="bg-white rounded-xl border-l-4 border-l-gray-300 p-4 shadow-sm">
            <div className="text-3xl font-black text-gray-900">{completedCount}</div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mt-1">Completed</div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Student Roster</h2>
            <div className="flex gap-1">
              {[
                { label: 'All', count: students.length },
                { label: 'Active', count: activeCount },
                { label: 'Completed', count: completedCount },
                { label: 'Unassigned', count: unassignedCount },
              ].map(({ label, count }) => (
                <button key={label} onClick={() => setStatusFilter(label)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${statusFilter === label ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'}`}>
                  {label} <span className={`ml-1 ${statusFilter === label ? 'text-gray-300' : 'text-gray-400'}`}>{count}</span>
                </button>
              ))}
            </div>
          </div>
          <input
            type="text"
            placeholder="Search by name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 w-56 bg-white"
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-black text-white">
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide">Name</th>
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide">Training</th>
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide">Instructor</th>
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide">Shift</th>
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide">Start</th>
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide">End</th>
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-gray-400">No students found</td>
                </tr>
              ) : (
                sorted.map(student => {
                  const a = student.assignments
                  const status = getStatus(student)
                  const isCompleted = status === 'Completed'
                  const isExpanded = expandedStudent === student.id
                  return (
                    <React.Fragment key={student.id}>
                      <tr className={`transition-colors ${isExpanded ? 'bg-gray-50' : 'hover:bg-gray-50'}`}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                              {student.first_name[0]}{student.last_name[0]}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">{student.first_name} {student.last_name}</div>
                              <div className="text-xs text-gray-400 mt-0.5">
                                {student.phone && <span>{student.phone}</span>}
                                {student.phone && student.email && <span className="mx-1">·</span>}
                                {student.email && <span>{student.email}</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-gray-500">{student.training_type || '—'}</td>
                        <td className="px-5 py-3 text-gray-500">{a?.instructors?.name || '—'}</td>
                        <td className="px-5 py-3 text-gray-500">{a?.shift || '—'}</td>
                        <td className="px-5 py-3 text-gray-500">{a?.start_date || '—'}</td>
                        <td className="px-5 py-3 text-gray-500">{a?.end_date || '—'}</td>
                        <td className="px-5 py-3"><StatusBadge status={status} /></td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isCompleted && (
                              <button
                                onClick={() => setExpandedStudent(isExpanded ? null : student.id)}
                                className="text-xs font-bold text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-2 py-1.5 rounded-lg transition-colors"
                                title="View assignment history"
                              >
                                {isExpanded ? '▲' : '▼'}
                              </button>
                            )}
                            <button
                              onClick={() => setEditingInfo(student)}
                              className="text-xs font-bold text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setEditingStudent(student)}
                              className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              {a ? 'Reassign' : 'Assign'}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && isCompleted && a && (
                        <tr key={`${student.id}-history`} className="bg-gray-50 border-t border-gray-100">
                          <td colSpan={8} className="px-5 py-4">
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Assignment History</div>
                            <div className="inline-flex items-center gap-6 bg-white border border-gray-200 rounded-xl px-5 py-3 text-sm">
                              <div>
                                <div className="text-xs text-gray-400 mb-0.5">Instructor</div>
                                <div className="font-semibold text-gray-900">{a.instructors?.name || '—'}</div>
                              </div>
                              <div className="w-px h-8 bg-gray-200" />
                              <div>
                                <div className="text-xs text-gray-400 mb-0.5">Shift</div>
                                <div className="font-semibold text-gray-900">{a.shift}</div>
                              </div>
                              <div className="w-px h-8 bg-gray-200" />
                              <div>
                                <div className="text-xs text-gray-400 mb-0.5">Start Date</div>
                                <div className="font-semibold text-gray-900">{a.start_date}</div>
                              </div>
                              <div className="w-px h-8 bg-gray-200" />
                              <div>
                                <div className="text-xs text-gray-400 mb-0.5">End Date</div>
                                <div className="font-semibold text-gray-900">{a.end_date}</div>
                              </div>
                              <div className="w-px h-8 bg-gray-200" />
                              <div>
                                <div className="text-xs text-gray-400 mb-0.5">Duration</div>
                                <div className="font-semibold text-gray-900">
                                  {Math.round((new Date(a.end_date) - new Date(a.start_date)) / (1000 * 60 * 60 * 24))} days
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </main>

      {showAdd && (
        <AddStudentModal
          onSave={addStudent}
          onClose={() => setShowAdd(false)}
        />
      )}

      {editingInfo && (
        <EditStudentModal
          student={editingInfo}
          onSave={saveStudentInfo}
          onClose={() => setEditingInfo(null)}
        />
      )}

      {editingStudent && (
        <ReassignModal
          student={editingStudent}
          instructors={instructors}
          onSave={saveAssignment}
          onClose={() => setEditingStudent(null)}
        />
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white transition-all ${toast.type === 'error' ? 'bg-red-600' : 'bg-gray-900'}`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}

function AddStudentModal({ onSave, onClose }) {
  const [values, setValues] = useState({ first_name: '', last_name: '', phone: '', email: '', training_type: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    const result = await onSave(values)
    if (result?.error) { setError(result.error); setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <h3 className="font-black text-gray-900">Add Student</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="px-6 py-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">First Name</label>
                <input type="text" value={values.first_name} onChange={e => setValues(v => ({ ...v, first_name: e.target.value }))} required placeholder="e.g. John" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Last Name</label>
                <input type="text" value={values.last_name} onChange={e => setValues(v => ({ ...v, last_name: e.target.value }))} required placeholder="e.g. Smith" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Training Type</label>
              <select value={values.training_type} onChange={e => setValues(v => ({ ...v, training_type: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                <option value="">Select type</option>
                {TRAINING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Phone</label>
              <input type="tel" value={values.phone} onChange={e => setValues(v => ({ ...v, phone: e.target.value }))} required placeholder="e.g. 801-555-1234" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Email</label>
              <input type="email" value={values.email} onChange={e => setValues(v => ({ ...v, email: e.target.value }))} required placeholder="e.g. john@email.com" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={submitting} className="w-full bg-red-600 text-white rounded-lg py-2.5 text-sm font-bold hover:bg-red-700 disabled:opacity-50 transition-colors mt-2">
              {submitting ? 'Saving...' : 'Add Student'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function ReassignModal({ student, instructors, onSave, onClose }) {
  const a = student.assignments
  const [values, setValues] = useState({
    instructor_id: a?.instructor_id || '',
    shift: a?.shift || '',
    start_date: a?.start_date || '',
    end_date: a?.end_date || '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    const result = await onSave(student, values)
    if (result.error) { setError(result.error); setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h3 className="font-black text-gray-900">{a ? 'Reassign Student' : 'Assign Student'}</h3>
            <p className="text-sm text-gray-500">{student.first_name} {student.last_name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="px-6 py-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Shift</label>
              <select value={values.shift} onChange={e => setValues(v => ({ ...v, shift: e.target.value }))} required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                <option value="">Select shift</option>
                {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Instructor</label>
              <div className="space-y-2">
                {instructors.map(instructor => {
                  const effectiveCount = values.start_date
                    ? instructor.assignments.filter(a2 =>
                        a2.end_date >= values.start_date &&
                        a2.id !== a?.id
                      ).length
                    : instructor.assignments.filter(a2 => a2.id !== a?.id).length
                  const isFull = effectiveCount >= instructor.capacity
                  return (
                    <label key={instructor.id} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${isFull ? 'border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed' : values.instructor_id === instructor.id ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-red-300'}`}>
                      <div className="flex items-center gap-3">
                        <input type="radio" name="instructor" value={instructor.id} disabled={isFull} checked={values.instructor_id === instructor.id} onChange={() => setValues(v => ({ ...v, instructor_id: instructor.id }))} className="accent-red-600" />
                        <div>
                          <span className="text-sm font-semibold text-gray-900">{instructor.name}</span>
                          {instructor.default_shift && <span className="ml-2 text-xs text-gray-400">{instructor.default_shift}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{effectiveCount}/{instructor.capacity}</span>
                        {isFull && <span className="text-xs font-bold bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full">Full</span>}
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Start Date</label>
                <input type="date" value={values.start_date} onChange={e => setValues(v => ({ ...v, start_date: e.target.value }))} required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">End Date</label>
                <input type="date" value={values.end_date} onChange={e => setValues(v => ({ ...v, end_date: e.target.value }))} required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={!values.instructor_id || !values.shift || !values.start_date || !values.end_date || submitting} className="w-full bg-red-600 text-white rounded-lg py-2.5 text-sm font-bold hover:bg-red-700 disabled:opacity-50 transition-colors mt-2">
              {submitting ? 'Saving...' : a ? 'Save Reassignment' : 'Confirm Assignment'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function EditStudentModal({ student, onSave, onClose }) {
  const a = student.assignments
  const [values, setValues] = useState({
    first_name: student.first_name,
    last_name: student.last_name,
    phone: student.phone || '',
    email: student.email || '',
    training_type: student.training_type || '',
    shift: a?.shift || '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    const result = await onSave(student, values)
    if (result?.error) { setError(result.error); setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h3 className="font-black text-gray-900">Edit Student</h3>
            <p className="text-sm text-gray-500">{student.first_name} {student.last_name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="px-6 py-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">First Name</label>
                <input type="text" value={values.first_name} onChange={e => setValues(v => ({ ...v, first_name: e.target.value }))} required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Last Name</label>
                <input type="text" value={values.last_name} onChange={e => setValues(v => ({ ...v, last_name: e.target.value }))} required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Training Type</label>
              <select value={values.training_type} onChange={e => setValues(v => ({ ...v, training_type: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                <option value="">Select type</option>
                {TRAINING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Phone</label>
              <input type="tel" value={values.phone} onChange={e => setValues(v => ({ ...v, phone: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Email</label>
              <input type="email" value={values.email} onChange={e => setValues(v => ({ ...v, email: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
            {a && (
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Shift</label>
                <select value={values.shift} onChange={e => setValues(v => ({ ...v, shift: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                  <option value="">Select shift</option>
                  {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={submitting} className="w-full bg-red-600 text-white rounded-lg py-2.5 text-sm font-bold hover:bg-red-700 disabled:opacity-50 transition-colors mt-2">
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const styles = {
    Active: 'bg-red-600 text-white',
    Completed: 'bg-gray-100 text-gray-500',
    Unassigned: 'bg-yellow-100 text-yellow-700',
  }
  return (
    <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${styles[status]}`}>
      {status}
    </span>
  )
}
