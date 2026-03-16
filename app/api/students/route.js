import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  const { data, error } = await supabase
    .from('students')
    .select('*, assignments(id, instructor_id, shift, start_date, end_date, instructors(id, name))')
    .order('last_name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(request) {
  const { first_name, last_name, phone, email, training_type } = await request.json()

  if (!first_name || !last_name) {
    return NextResponse.json({ error: 'First name and last name are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('students')
    .insert({ first_name, last_name, phone: phone || null, email: email || null, training_type: training_type || null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}
