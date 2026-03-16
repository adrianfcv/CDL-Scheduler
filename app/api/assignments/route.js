import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const { student_id, instructor_id, shift, start_date, end_date } = await request.json()

  if (!student_id || !instructor_id || !shift || !start_date || !end_date) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
  }

  // Get instructor capacity
  const { data: instructor, error: instructorError } = await supabase
    .from('instructors')
    .select('capacity')
    .eq('id', instructor_id)
    .single()

  if (instructorError) return NextResponse.json({ error: 'Instructor not found' }, { status: 404 })

  // Count current assignments for this instructor
  const { count, error: countError } = await supabase
    .from('assignments')
    .select('*', { count: 'exact', head: true })
    .eq('instructor_id', instructor_id)

  if (countError) return NextResponse.json({ error: countError.message }, { status: 500 })

  // Block if at capacity
  if (count >= instructor.capacity) {
    return NextResponse.json({ error: 'Instructor is at full capacity' }, { status: 409 })
  }

  // Create the assignment
  const { data, error } = await supabase
    .from('assignments')
    .insert({ student_id, instructor_id, shift, start_date, end_date })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}
