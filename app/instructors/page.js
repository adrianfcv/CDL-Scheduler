'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

const SHIFTS = ['Morning', 'Afternoon', 'Evening', 'Saturday', 'Sunrise']

export default function InstructorsPage() {
  const [instructors, setInstructors] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [dbError, setDbError] = useState(false)
  const [search, setSearch] = useState('')

  function loadData() {
    fetch('/api/instructors')
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) {
          setDbError(true)
          setLoading(false)
          return
        }
        setDbError(false)
        setInstructors(data)
        setLoading(false)
      })
  }

  useEffect(() => { loadData() }, [])

  async function addInstructor(values) {
    await fetch('/api/instructors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: values.name, capacity: parseInt(values.capacity), default_shift: values.default_shifts.length ? values.default_shifts.join(',') : null }),
    })
    setShowAdd(false)
    loadData()
  }

  async function saveInstructor(instructorId, values) {
    const res = await fetch(`/api/instructors/${instructorId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: values.name, capacity: parseInt(values.capacity), default_shift: values.default_shifts.length ? values.default_shifts.join(',') : null }),
    })
    if (!res.ok) {
      const { error } = await res.json()
      return { error }
    }
    setEditing(null)
    loadData()
    return {}
  }

  async function deleteInstructor(id) {
    await fetch(`/api/instructors/${id}`, { method: 'DELETE' })
    setConfirmDelete(null)
    loadData()
  }

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
            <Link href="/students" className="text-sm font-medium text-gray-400 hover:text-white px-3 py-1.5 rounded-md transition-colors">All Students</Link>
            <span className="text-sm font-medium text-white bg-red-600 px-3 py-1.5 rounded-md">Instructors</span>
          </nav>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
        >
          + Instructor
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border-l-4 border-l-gray-900 p-4 shadow-sm">
            <div className="text-3xl font-black text-gray-900">{instructors.length}</div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mt-1">Total Instructors</div>
          </div>
          <div className="bg-white rounded-xl border-l-4 border-l-red-600 p-4 shadow-sm">
            <div className="text-3xl font-black text-gray-900">
              {instructors.reduce((sum, i) => sum + i.current_count, 0)}
            </div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mt-1">Students Assigned</div>
          </div>
          <div className="bg-white rounded-xl border-l-4 border-l-gray-300 p-4 shadow-sm">
            <div className="text-3xl font-black text-gray-900">
              {instructors.reduce((sum, i) => sum + (i.capacity - i.current_count), 0)}
            </div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mt-1">Open Spots</div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Instructor Roster</h2>
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
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide">Default Shift</th>
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide">Students</th>
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide">Capacity</th>
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {instructors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-gray-400">No instructors yet</td>
                </tr>
              ) : (
                instructors
                  .filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
                  .map(instructor => {
                  const isFull = instructor.current_count >= instructor.capacity
                  const pct = Math.min((instructor.current_count / instructor.capacity) * 100, 100)
                  return (
                    <tr key={instructor.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-black text-white rounded-full flex items-center justify-center text-xs font-black shrink-0">
                            {instructor.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-semibold text-gray-900">{instructor.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {instructor.default_shift
                          ? <div className="flex flex-wrap gap-1">
                              {instructor.default_shift.split(',').map(s => (
                                <span key={s} className="text-xs font-semibold bg-red-600 text-white px-2 py-0.5 rounded-full">{s}</span>
                              ))}
                            </div>
                          : <span className="text-gray-400">—</span>
                        }
                      </td>
                      <td className="px-5 py-4 font-bold text-gray-900">{instructor.current_count}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${isFull ? 'bg-red-600' : 'bg-gray-900'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{instructor.current_count}/{instructor.capacity}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {isFull
                          ? <span className="text-xs font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Full</span>
                          : <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Available</span>
                        }
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => setEditing(instructor)}
                            className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setConfirmDelete(instructor)}
                            className="text-xs font-bold text-gray-400 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Add Modal */}
      {showAdd && (
        <InstructorFormModal
          title="Add Instructor"
          initial={{ name: '', capacity: '', default_shifts: [] }}
          onSave={(_, values) => addInstructor(values)}
          onClose={() => setShowAdd(false)}
        />
      )}

      {/* Edit Modal */}
      {editing && (
        <InstructorFormModal
          title="Edit Instructor"
          initial={{ name: editing.name, capacity: editing.capacity, default_shifts: editing.default_shift ? editing.default_shift.split(',') : [] }}
          onSave={(values) => saveInstructor(editing.id, values)}
          onClose={() => setEditing(null)}
        />
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-black text-gray-900 mb-2">Delete Instructor?</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete <span className="font-semibold text-gray-900">{confirmDelete.name}</span>?
              {confirmDelete.current_count > 0 && (
                <span className="block mt-1 text-red-600 font-medium">
                  This will also remove their {confirmDelete.current_count} student assignment{confirmDelete.current_count !== 1 ? 's' : ''}.
                </span>
              )}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 border border-gray-200 text-gray-700 rounded-lg py-2.5 text-sm font-bold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteInstructor(confirmDelete.id)}
                className="flex-1 bg-red-600 text-white rounded-lg py-2.5 text-sm font-bold hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InstructorFormModal({ title, initial, onSave, onClose }) {
  const [values, setValues] = useState(initial)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    const result = await onSave(values)
    if (result?.error) {
      setError(result.error)
      setSubmitting(false)
    }
  }

  function toggleShift(shift) {
    setValues(v => ({
      ...v,
      default_shifts: v.default_shifts.includes(shift)
        ? v.default_shifts.filter(s => s !== shift)
        : [...v.default_shifts, shift],
    }))
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <h3 className="font-black text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="px-6 py-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Name</label>
              <input type="text" value={values.name} onChange={e => setValues(v => ({ ...v, name: e.target.value }))} required placeholder="e.g. Dustin" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Max Students</label>
              <input type="number" value={values.capacity} onChange={e => setValues(v => ({ ...v, capacity: e.target.value }))} required placeholder="e.g. 4" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Shifts</label>
              <div className="flex flex-wrap gap-2">
                {SHIFTS.map(s => {
                  const selected = values.default_shifts.includes(s)
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleShift(s)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${selected ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-200 hover:border-red-400'}`}
                    >
                      {s}
                    </button>
                  )
                })}
              </div>
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={submitting} className="w-full bg-red-600 text-white rounded-lg py-2.5 text-sm font-bold hover:bg-red-700 disabled:opacity-50 transition-colors mt-2">
              {submitting ? 'Saving...' : title}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
