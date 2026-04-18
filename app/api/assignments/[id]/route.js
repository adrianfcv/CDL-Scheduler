import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function PATCH(request, { params }) {
  const { id } = await params
  const { shift, instructor_id, start_date, end_date } = await request.json()

  if (!shift || !instructor_id || !start_date || !end_date) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
  }

  // Check capacity only if instructor changed
  const { data: current } = await supabase
    .from('assignments')
    .select('instructor_id')
    .eq('id', id)
    .single()

  if (current && current.instructor_id !== instructor_id) {
    const { data: instructor } = await supabase
      .from('instructors')
      .select('capacity')
      .eq('id', instructor_id)
      .single()

    const today = new Date().toISOString().split('T')[0]
    const { count } = await supabase
      .from('assignments')
      .select('*', { count: 'exact', head: true })
      .eq('instructor_id', instructor_id)
      .gte('end_date', today)

    if (count >= instructor.capacity) {
      return NextResponse.json({ error: 'Instructor is at full capacity' }, { status: 409 })
    }
  }

  const { data, error } = await supabase
    .from('assignments')
    .update({ shift, instructor_id, start_date, end_date })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function DELETE(request, { params }) {
  const { id } = await params

  const { error } = await supabase
    .from('assignments')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return new NextResponse(null, { status: 204 })
}
