'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'

const SHIFTS = ['Morning', 'Afternoon', 'Evening', 'Sunrise/Saturday']
const TRAINING_TYPES = ['Class A', 'Refresher', 'Gooseneck', 'Other']

export default function Dashboard() {
  const [instructors, setInstructors] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddInstructor, setShowAddInstructor] = useState(false)
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [assigningStudent, setAssigningStudent] = useState(null)
  const [editingAssignment, setEditingAssignment] = useState(null)
  const [editingInstructor, setEditingInstructor] = useState(null)
  const [toast, setToast] = useState(null)
  const [unassignedSearch, setUnassignedSearch] = useState('')

  function showToast(message, type = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const [dbError, setDbError] = useState(false)

  const loadData = useCallback(async () => {
    const [instrRes, studRes] = await Promise.all([
      fetch('/api/instructors'),
      fetch('/api/students'),
    ])
    const instrData = await instrRes.json()
    const studData = await studRes.json()
    if (!Array.isArray(instrData) || !Array.isArray(studData)) {
      setDbError(true)
      setLoading(false)
      return
    }
    setDbError(false)
    setInstructors(instrData)
    setStudents(studData)
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const today = new Date().toISOString().split('T')[0]
  const [viewDate, setViewDate] = useState(today)

  function shiftDate(n) {
    const d = new Date(viewDate + 'T00:00:00')
    d.setDate(d.getDate() + n)
    setViewDate(d.toISOString().split('T')[0])
  }

  useEffect(() => {
    function handleKey(e) {
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
      if (e.key === 'ArrowLeft') shiftDate(e.shiftKey ? -7 : -1)
      if (e.key === 'ArrowRight') shiftDate(e.shiftKey ? 7 : 1)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [viewDate])

  function formatViewDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  const isToday = viewDate === today
  const [studentFilter, setStudentFilter] = useState('All')

  const toAssignmentArray = (s) => s.assignments ? [s.assignments] : []
  const unassigned = students.filter(s => !s.assignments)

  const activeCount = students.filter(s => s.assignments && s.assignments.end_date >= today).length
  const completedCount = students.filter(s => s.assignments && s.assignments.end_date < today).length
  const unassignedCount = unassigned.length

  const byShift = SHIFTS.reduce((acc, shift) => {
    acc[shift] = students
      .flatMap(s => toAssignmentArray(s).map(a => ({ ...a, student: s })))
      .filter(a => {
        if (a.shift !== shift) return false
        if (studentFilter === 'Active') return a.start_date <= viewDate && a.end_date >= today
        if (studentFilter === 'Completed') return a.end_date < today
        // All: show whatever is active on the viewDate
        return a.start_date <= viewDate && a.end_date >= viewDate
      })
    return acc
  }, {})

  const showSchedule = studentFilter !== 'Unassigned'
  const showUnassigned = studentFilter === 'All' || studentFilter === 'Unassigned'

  const instructorActiveShifts = {}
  students.forEach(s => {
    const a = s.assignments
    if (!a || !a.start_date || !a.end_date) return
    if (a.start_date <= viewDate && a.end_date >= viewDate) {
      if (!instructorActiveShifts[a.instructor_id]) {
        instructorActiveShifts[a.instructor_id] = new Set()
      }
      instructorActiveShifts[a.instructor_id].add(a.shift)
    }
  })

  const instructorViewCounts = {}
  instructors.forEach(instructor => {
    instructorViewCounts[instructor.id] = instructor.assignments.filter(
      a => a.start_date <= viewDate && a.end_date >= viewDate
    ).length
  })

  async function updateInstructor(instructorId, values) {
    const res = await fetch(`/api/instructors/${instructorId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: values.name,
        capacity: parseInt(values.capacity),
        default_shift: values.default_shifts?.length ? values.default_shifts.join(',') : null,
      }),
    })
    if (!res.ok) {
      const { error } = await res.json()
      return { error }
    }
    setEditingInstructor(null)
    loadData()
    showToast('Instructor updated')
    return {}
  }

  async function updateAssignment(assignmentId, instructorId, shift, startDate, endDate) {
    const res = await fetch(`/api/assignments/${assignmentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instructor_id: instructorId, shift, start_date: startDate, end_date: endDate }),
    })
    if (!res.ok) {
      const { error } = await res.json()
      return { error }
    }
    setEditingAssignment(null)
    loadData()
    showToast('Assignment updated')
    return {}
  }

  async function unassignStudent(assignmentId) {
    await fetch(`/api/assignments/${assignmentId}`, { method: 'DELETE' })
    setEditingAssignment(null)
    loadData()
    showToast('Student unassigned')
  }

  async function patchEndDate(assignmentId, instructorId, shift, startDate, newEndDate) {
    const res = await fetch(`/api/assignments/${assignmentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instructor_id: instructorId, shift, start_date: startDate, end_date: newEndDate }),
    })
    if (res.ok) {
      loadData()
      showToast('End date updated')
    }
  }

  async function completeAssignment(assignment) {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    await fetch(`/api/assignments/${assignment.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instructor_id: assignment.instructor_id,
        shift: assignment.shift,
        start_date: assignment.start_date,
        end_date: yesterdayStr,
      }),
    })
    loadData()
    showToast(`${assignment.student.first_name} ${assignment.student.last_name} marked as complete`)
  }

  async function assignStudent(studentId, instructorId, shift, startDate, endDate) {
    const res = await fetch('/api/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: studentId, instructor_id: instructorId, shift, start_date: startDate, end_date: endDate }),
    })
    if (!res.ok) {
      const { error } = await res.json()
      return { error }
    }
    setAssigningStudent(null)
    loadData()
    showToast('Student assigned successfully')
    return {}
  }

  async function addInstructor(values) {
    await fetch('/api/instructors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: values.name, capacity: parseInt(values.capacity), default_shift: values.default_shifts?.length ? values.default_shifts.join(',') : null }),
    })
    setShowAddInstructor(false)
    loadData()
    showToast('Instructor added')
  }

  async function addStudent(values) {
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name: values.first_name, last_name: values.last_name, phone: values.phone, email: values.email, training_type: values.training_type }),
    })
    if (!res.ok) { const { error } = await res.json(); return { error } }
    setShowAddStudent(false)
    loadData()
    showToast('Student added successfully')
    return {}
  }

  function exportSchedule() {
    const assigned = students
      .filter(s => s.assignments)
      .map(s => {
        const a = s.assignments
        const status = a.end_date >= today ? 'Active' : 'Completed'
        return {
          shift: a.shift,
          name: `${s.first_name} ${s.last_name}`,
          phone: s.phone || '',
          email: s.email || '',
          training_type: s.training_type || '',
          instructor: a.instructors?.name || '',
          start_date: a.start_date,
          end_date: a.end_date,
          status,
        }
      })
      .sort((a, b) => {
        const shiftDiff = SHIFTS.indexOf(a.shift) - SHIFTS.indexOf(b.shift)
        if (shiftDiff !== 0) return shiftDiff
        return a.status === 'Active' ? -1 : 1
      })

    const rows = [
      ['Shift', 'Student Name', 'Phone', 'Email', 'Training Type', 'Instructor', 'Start Date', 'End Date', 'Status'],
      ...assigned.map(a => [a.shift, a.name, a.phone, a.email, a.training_type, a.instructor, a.start_date, a.end_date, a.status]),
    ]
    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const el = document.createElement('a')
    el.href = url
    el.download = `schedule-${today}.csv`
    el.click()
    URL.revokeObjectURL(url)
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

      {/* Header */}
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
            <span className="text-sm font-medium text-white bg-red-600 px-3 py-1.5 rounded-md">Dashboard</span>
            <Link href="/students" className="text-sm font-medium text-gray-400 hover:text-white px-3 py-1.5 rounded-md transition-colors">All Students</Link>
            <Link href="/instructors" className="text-sm font-medium text-gray-400 hover:text-white px-3 py-1.5 rounded-md transition-colors">Instructors</Link>
          </nav>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAddInstructor(true)}
            className="px-4 py-2 text-sm bg-transparent border border-gray-600 text-gray-300 rounded-lg hover:border-gray-400 hover:text-white font-medium transition-colors"
          >
            + Instructor
          </button>
          <button
            onClick={() => setShowAddStudent(true)}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
          >
            + Student
          </button>
        </div>
      </header>

      {/* Date Navigator */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => shiftDate(-7)} className="px-3 py-1.5 text-sm font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">← Prev Week</button>
            <button onClick={() => shiftDate(-1)} className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">‹ Day</button>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={viewDate}
              onChange={e => e.target.value && setViewDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <span className="text-sm font-semibold text-gray-900">{formatViewDate(viewDate)}</span>
            {!isToday && (
              <button onClick={() => setViewDate(today)} className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors">Today</button>
            )}
            {isToday && <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">Today</span>}
            <span className="text-xs text-gray-300 hidden sm:inline">← → day &nbsp;·&nbsp; ⇧← ⇧→ week</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => shiftDate(1)} className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">Day ›</button>
            <button onClick={() => shiftDate(7)} className="px-3 py-1.5 text-sm font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">Next Week →</button>
            <button onClick={exportSchedule} className="px-3 py-1.5 text-sm font-bold border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors" title="Export schedule to CSV">↓ CSV</button>
          </div>
        </div>
      </div>

      {/* Student Filter Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center gap-2">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wide mr-1">Students</span>
          {[
            { label: 'All', count: students.length },
            { label: 'Active', count: activeCount },
            { label: 'Completed', count: completedCount },
            { label: 'Unassigned', count: unassignedCount },
          ].map(({ label, count }) => (
            <button
              key={label}
              onClick={() => setStudentFilter(label)}
              className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
                studentFilter === label
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {label} <span className={`ml-1 ${studentFilter === label ? 'text-gray-300' : 'text-gray-400'}`}>{count}</span>
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Instructor capacity */}
        {instructors.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Instructor Capacity</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {instructors.map(instructor => {
                const viewCount = instructorViewCounts[instructor.id] ?? instructor.current_count
                const isFull = viewCount >= instructor.capacity
                const pct = Math.min((viewCount / instructor.capacity) * 100, 100)
                const activeShifts = instructorActiveShifts[instructor.id]
                  ? [...instructorActiveShifts[instructor.id]]
                  : []

                return (
                  <div key={instructor.id} className={`rounded-xl border-l-4 p-5 shadow-sm transition-colors ${isFull ? 'bg-red-50 border-l-red-600' : 'bg-white border-l-gray-900'}`}>
                    <div className="flex items-start justify-between mb-3">
                      <span className={`font-bold ${isFull ? 'text-red-900' : 'text-gray-900'}`}>{instructor.name}</span>
                      <div className="flex items-center gap-2">
                        {isFull && (
                          <span className="text-xs font-black bg-red-600 text-white px-2 py-0.5 rounded-full tracking-wide">FULL</span>
                        )}
                        <button
                          onClick={() => setEditingInstructor(instructor)}
                          className="text-xs text-gray-400 hover:text-red-600 transition-colors"
                        >
                          Edit
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-3">
                      {activeShifts.length > 0
                        ? activeShifts.map(shift => (
                            <span key={shift} className="text-xs font-semibold bg-red-600 text-white px-2 py-0.5 rounded-full">
                              {shift}
                            </span>
                          ))
                        : instructor.default_shift
                        ? instructor.default_shift.split(',').map(s => (
                            <span key={s} className={`text-xs px-2 py-0.5 rounded-full ${isFull ? 'text-red-400 bg-red-100' : 'text-gray-400 bg-gray-100'}`}>{s}</span>
                          ))
                        : <span className="text-xs text-gray-300">No active students</span>
                      }
                    </div>

                    <div className="flex items-end justify-between mb-2">
                      <div>
                        <span className={`text-3xl font-black ${isFull ? 'text-red-700' : 'text-gray-900'}`}>{viewCount}</span>
                        <span className={`text-sm ml-1 ${isFull ? 'text-red-400' : 'text-gray-400'}`}>/ {instructor.capacity}</span>
                      </div>
                    </div>

                    <div className={`h-2 rounded-full overflow-hidden ${isFull ? 'bg-red-200' : 'bg-gray-100'}`}>
                      <div
                        className={`h-full rounded-full transition-all ${isFull ? 'bg-red-600' : 'bg-gray-900'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Weekly schedule */}
        {showSchedule && <section>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
            {isToday ? "Today's Schedule" : `Schedule — ${formatViewDate(viewDate)}`}
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {SHIFTS.map((shift, idx) => {
              const assignments = byShift[shift]
              const instructorMap = {}
              assignments.forEach(a => {
                const id = a.instructor_id
                if (!instructorMap[id]) instructorMap[id] = { name: a.instructors?.name, count: 0 }
                instructorMap[id].count++
              })
              const shiftInstructors = Object.values(instructorMap)
              const shiftColors = ['border-t-red-600', 'border-t-gray-800', 'border-t-red-400', 'border-t-gray-600']

              return (
                <div key={shift} className={`bg-white rounded-xl border-t-4 ${shiftColors[idx]} shadow-sm overflow-hidden`}>
                  <div className="px-4 py-3 border-b border-gray-100">
                    <h3 className="font-black text-gray-900 uppercase tracking-wide text-sm">{shift}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {assignments.length} student{assignments.length !== 1 ? 's' : ''} active
                    </p>
                  </div>

                  {shiftInstructors.length > 0 && (
                    <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 space-y-1">
                      {shiftInstructors.map(inst => (
                        <div key={inst.name} className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-700">{inst.name}</span>
                          <span className="text-xs text-gray-400">{inst.count} student{inst.count !== 1 ? 's' : ''}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="divide-y divide-gray-100">
                    {assignments.length === 0 ? (
                      <div className="px-4 py-8 text-center text-xs text-gray-300 font-medium">
                        No students this week
                      </div>
                    ) : (
                      assignments.map(assignment => (
                        <AssignmentCard
                          key={assignment.id}
                          assignment={assignment}
                          onEdit={() => setEditingAssignment(assignment)}
                          onPatchEndDate={patchEndDate}
                          onComplete={completeAssignment}
                        />
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>}

        {/* Unassigned students */}
        {showUnassigned && unassigned.length > 0 && (
          <section>
            {instructors.length > 0 && instructors.every(i => instructorViewCounts[i.id] >= i.capacity) && (
              <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
                <span className="text-red-600 font-black text-lg leading-none">!</span>
                <p className="text-sm text-red-700 font-medium">All instructors are at full capacity. Increase an instructor's limit before assigning new students.</p>
              </div>
            )}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                Unassigned Students ({unassigned.length})
              </h2>
              {unassigned.length > 4 && (
                <input
                  type="text"
                  placeholder="Search..."
                  value={unassignedSearch}
                  onChange={e => setUnassignedSearch(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 w-44"
                />
              )}
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100">
              {unassigned
                .filter(s => `${s.first_name} ${s.last_name}`.toLowerCase().includes(unassignedSearch.toLowerCase()))
                .map(student => (
                  <div key={student.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                        {student.first_name[0]}{student.last_name[0]}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{student.first_name} {student.last_name}</div>
                        <div className="text-xs text-gray-400">
                          {student.training_type && <span>{student.training_type}</span>}
                          {student.training_type && (student.phone || student.email) && <span className="mx-1">·</span>}
                          {student.phone && <span>{student.phone}</span>}
                          {student.phone && student.email && <span className="mx-1">·</span>}
                          {student.email && <span>{student.email}</span>}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setAssigningStudent(student)}
                      className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Assign →
                    </button>
                  </div>
                ))}
            </div>
          </section>
        )}
      </main>

      {/* Modals */}
      {showAddInstructor && (
        <Modal title="Add Instructor" onClose={() => setShowAddInstructor(false)}>
          <AddInstructorForm onSubmit={addInstructor} />
        </Modal>
      )}
      {showAddStudent && (
        <Modal title="Add Student" onClose={() => setShowAddStudent(false)}>
          <AddStudentForm onSubmit={addStudent} />
        </Modal>
      )}
      {editingInstructor && (
        <EditInstructorModal
          instructor={editingInstructor}
          onSave={updateInstructor}
          onClose={() => setEditingInstructor(null)}
        />
      )}
      {assigningStudent && (
        <AssignModal
          student={assigningStudent}
          instructors={instructors}
          onAssign={assignStudent}
          onClose={() => setAssigningStudent(null)}
        />
      )}
      {editingAssignment && (
        <EditAssignmentModal
          assignment={editingAssignment}
          instructors={instructors}
          onSave={updateAssignment}
          onUnassign={unassignStudent}
          onClose={() => setEditingAssignment(null)}
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

// ─── Assignment Card ──────────────────────────────────────────────────────────

function AssignmentCard({ assignment, onEdit, onPatchEndDate, onComplete }) {
  const [editingEnd, setEditingEnd] = useState(false)
  const [endDate, setEndDate] = useState(assignment.end_date)
  const [confirmComplete, setConfirmComplete] = useState(false)

  function handleEndDateChange(e) {
    const val = e.target.value
    if (!val) return
    setEndDate(val)
    setEditingEnd(false)
    if (val !== assignment.end_date) {
      onPatchEndDate(assignment.id, assignment.instructor_id, assignment.shift, assignment.start_date, val)
    }
  }

  return (
    <div className="px-4 py-3 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="font-semibold text-gray-900 text-sm">
          {assignment.student.first_name} {assignment.student.last_name}
        </div>
        <div className="flex items-center gap-2 ml-2 shrink-0">
          {confirmComplete ? (
            <>
              <span className="text-xs text-gray-500">Done?</span>
              <button
                onClick={() => { setConfirmComplete(false); onComplete(assignment) }}
                className="text-xs font-bold text-green-600 hover:text-green-700 transition-colors"
              >
                Yes
              </button>
              <button
                onClick={() => setConfirmComplete(false)}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setConfirmComplete(true)}
                className="text-xs text-gray-400 hover:text-green-600 transition-colors"
                title="Mark training as complete"
              >
                ✓
              </button>
              <button
                onClick={onEdit}
                className="text-xs text-gray-400 hover:text-red-600 transition-colors"
              >
                Edit
              </button>
            </>
          )}
        </div>
      </div>
      <div className="text-xs text-gray-500 mt-0.5">{assignment.instructors?.name}</div>
      {(assignment.student.phone || assignment.student.email) && (
        <div className="text-xs text-gray-400 mt-0.5">
          {assignment.student.phone && <span>{assignment.student.phone}</span>}
          {assignment.student.phone && assignment.student.email && <span className="mx-1">·</span>}
          {assignment.student.email && <span>{assignment.student.email}</span>}
        </div>
      )}
      <div className="flex items-center gap-1 mt-0.5">
        <span className="text-xs text-gray-400">{assignment.start_date} →</span>
        {editingEnd ? (
          <input
            type="date"
            defaultValue={endDate}
            min={assignment.start_date}
            autoFocus
            onBlur={handleEndDateChange}
            onChange={handleEndDateChange}
            className="text-xs border border-red-400 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        ) : (
          <button
            onClick={() => setEditingEnd(true)}
            className="text-xs text-gray-400 hover:text-red-600 hover:underline transition-colors"
            title="Click to edit end date"
          >
            {endDate}
          </button>
        )}
      </div>
      {assignment.student.training_type && (
        <span className="inline-block mt-1.5 text-xs font-semibold bg-black text-white px-2 py-0.5 rounded-full">
          {assignment.student.training_type}
        </span>
      )}
    </div>
  )
}

// ─── Shared Modal Shell ───────────────────────────────────────────────────────

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <h3 className="font-black text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

// ─── Add Instructor Form ──────────────────────────────────────────────────────

function AddInstructorForm({ onSubmit }) {
  const [values, setValues] = useState({ name: '', capacity: '', default_shifts: [] })
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    await onSubmit(values)
    setSubmitting(false)
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Name">
        <input type="text" placeholder="e.g. Dustin" value={values.name} onChange={e => setValues(v => ({ ...v, name: e.target.value }))} required className={inputClass} />
      </Field>
      <Field label="Max Students">
        <input type="number" placeholder="e.g. 4" value={values.capacity} onChange={e => setValues(v => ({ ...v, capacity: e.target.value }))} required className={inputClass} />
      </Field>
      <Field label="Shifts">
        <div className="flex flex-wrap gap-2">
          {SHIFTS.map(s => {
            const selected = values.default_shifts.includes(s)
            return (
              <button key={s} type="button" onClick={() => toggleShift(s)}
                className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${selected ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-200 hover:border-red-400'}`}>
                {s}
              </button>
            )
          })}
        </div>
      </Field>
      <SubmitButton submitting={submitting} label="Add Instructor" />
    </form>
  )
}

// ─── Add Student Form ─────────────────────────────────────────────────────────

function AddStudentForm({ onSubmit }) {
  const [values, setValues] = useState({ first_name: '', last_name: '', phone: '', email: '', training_type: '' })
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    await onSubmit(values)
    setSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="First Name" placeholder="">
          <input type="text" placeholder="Bob" value={values.first_name} onChange={e => setValues(v => ({ ...v, first_name: e.target.value }))} required className={inputClass} />
        </Field>
        <Field label="Last Name" placeholder="">
          <input type="text" placeholder="Johnson" value={values.last_name} onChange={e => setValues(v => ({ ...v, last_name: e.target.value }))} required className={inputClass} />
        </Field>
      </div>
      <Field label="Phone" placeholder="">
        <input type="text" placeholder="801-555-1234" value={values.phone} onChange={e => setValues(v => ({ ...v, phone: e.target.value }))} required className={inputClass} />
      </Field>
      <Field label="Email" placeholder="">
        <input type="email" placeholder="bob@email.com" value={values.email} onChange={e => setValues(v => ({ ...v, email: e.target.value }))} required className={inputClass} />
      </Field>
      <Field label="Training Type" placeholder="">
        <select value={values.training_type} onChange={e => setValues(v => ({ ...v, training_type: e.target.value }))} className={inputClass}>
          <option value="">Select type</option>
          {TRAINING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </Field>
      <SubmitButton submitting={submitting} label="Add Student" />
    </form>
  )
}

// ─── Edit Instructor Modal ────────────────────────────────────────────────────

function EditInstructorModal({ instructor, onSave, onClose }) {
  const [values, setValues] = useState({
    name: instructor.name,
    capacity: instructor.capacity,
    default_shifts: instructor.default_shift ? instructor.default_shift.split(',') : [],
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    const result = await onSave(instructor.id, values)
    if (result.error) { setError(result.error); setSubmitting(false) }
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
          <h3 className="font-black text-gray-900">Edit Instructor</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="px-6 py-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Name"><input type="text" value={values.name} onChange={e => setValues(v => ({ ...v, name: e.target.value }))} required className={inputClass} /></Field>
            <Field label="Max Students"><input type="number" value={values.capacity} onChange={e => setValues(v => ({ ...v, capacity: e.target.value }))} required className={inputClass} /></Field>
            <Field label="Shifts">
              <div className="flex flex-wrap gap-2">
                {SHIFTS.map(s => {
                  const selected = values.default_shifts.includes(s)
                  return (
                    <button key={s} type="button" onClick={() => toggleShift(s)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${selected ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-200 hover:border-red-400'}`}>
                      {s}
                    </button>
                  )
                })}
              </div>
            </Field>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <SubmitButton submitting={submitting} label="Save Changes" />
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── Assign Modal ─────────────────────────────────────────────────────────────

function AssignModal({ student, instructors, onAssign, onClose }) {
  const [selectedInstructor, setSelectedInstructor] = useState('')
  const [shift, setShift] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!selectedInstructor || !shift || !startDate || !endDate) return
    setSubmitting(true)
    setError('')
    const result = await onAssign(student.id, selectedInstructor, shift, startDate, endDate)
    if (result.error) { setError(result.error); setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h3 className="font-black text-gray-900">Assign Student</h3>
            <p className="text-sm text-gray-500">{student.first_name} {student.last_name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="px-6 py-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Shift" placeholder="">
              <select value={shift} onChange={e => setShift(e.target.value)} required className={inputClass}>
                <option value="">Select shift</option>
                {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <InstructorPicker instructors={instructors} selected={selectedInstructor} currentId={null} onChange={setSelectedInstructor} />
            <DateRangePicker startDate={startDate} endDate={endDate} onStart={setStartDate} onEnd={setEndDate} />
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <SubmitButton submitting={submitting} label="Confirm Assignment" disabled={!selectedInstructor || !shift || !startDate || !endDate} />
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── Edit Assignment Modal ────────────────────────────────────────────────────

function EditAssignmentModal({ assignment, instructors, onSave, onUnassign, onClose }) {
  const [selectedInstructor, setSelectedInstructor] = useState(assignment.instructor_id)
  const [shift, setShift] = useState(assignment.shift)
  const [startDate, setStartDate] = useState(assignment.start_date)
  const [endDate, setEndDate] = useState(assignment.end_date)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [confirmUnassign, setConfirmUnassign] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    const result = await onSave(assignment.id, selectedInstructor, shift, startDate, endDate)
    if (result.error) { setError(result.error); setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h3 className="font-black text-gray-900">Edit Assignment</h3>
            <p className="text-sm text-gray-500">{assignment.student?.first_name} {assignment.student?.last_name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="px-6 py-5">
          {confirmUnassign ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Remove <span className="font-semibold text-gray-900">{assignment.student?.first_name} {assignment.student?.last_name}</span> from their assignment? They will appear in the unassigned list.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmUnassign(false)}
                  className="flex-1 border border-gray-200 text-gray-700 rounded-lg py-2.5 text-sm font-bold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => onUnassign(assignment.id)}
                  className="flex-1 bg-red-600 text-white rounded-lg py-2.5 text-sm font-bold hover:bg-red-700 transition-colors"
                >
                  Unassign
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Shift" placeholder="">
                <select value={shift} onChange={e => setShift(e.target.value)} required className={inputClass}>
                  {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <InstructorPicker instructors={instructors} selected={selectedInstructor} currentId={assignment.instructor_id} onChange={setSelectedInstructor} />
              <DateRangePicker startDate={startDate} endDate={endDate} onStart={setStartDate} onEnd={setEndDate} />
              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              <SubmitButton submitting={submitting} label="Save Changes" />
              <button
                type="button"
                onClick={() => setConfirmUnassign(true)}
                className="w-full text-sm font-bold text-gray-400 hover:text-red-600 py-2 transition-colors"
              >
                Unassign student
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Shared Sub-components ────────────────────────────────────────────────────

const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function SubmitButton({ submitting, label, disabled }) {
  return (
    <button
      type="submit"
      disabled={submitting || disabled}
      className="w-full bg-red-600 text-white rounded-lg py-2.5 text-sm font-bold hover:bg-red-700 disabled:opacity-50 transition-colors mt-2"
    >
      {submitting ? 'Saving...' : label}
    </button>
  )
}

function InstructorPicker({ instructors, selected, currentId, onChange }) {
  return (
    <Field label="Instructor" placeholder="">
      <div className="space-y-2">
        {instructors.map(instructor => {
          const isFull = instructor.current_count >= instructor.capacity && instructor.id !== currentId
          return (
            <label
              key={instructor.id}
              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                isFull
                  ? 'border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed'
                  : selected === instructor.id
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 hover:border-red-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <input type="radio" name="instructor" value={instructor.id} disabled={isFull} checked={selected === instructor.id} onChange={() => onChange(instructor.id)} className="accent-red-600" />
                <div>
                  <span className="text-sm font-semibold text-gray-900">{instructor.name}</span>
                  {instructor.default_shift && <span className="ml-2 text-xs text-gray-400">{instructor.default_shift}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{instructor.current_count}/{instructor.capacity}</span>
                {isFull && <span className="text-xs font-bold bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full">Full</span>}
              </div>
            </label>
          )
        })}
      </div>
    </Field>
  )
}

function DateRangePicker({ startDate, endDate, onStart, onEnd }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Start Date" placeholder="">
        <input type="date" value={startDate} onChange={e => onStart(e.target.value)} required className={inputClass} />
      </Field>
      <Field label="End Date" placeholder="">
        <input type="date" value={endDate} onChange={e => onEnd(e.target.value)} required className={inputClass} />
      </Field>
    </div>
  )
}
