import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('instructors')
    .select('*, assignments(id, start_date, end_date)')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const instructors = data.map((i) => ({
    ...i,
    current_count: i.assignments.filter(a => a.end_date >= today).length,
  }))

  return NextResponse.json(instructors)
}

export async function POST(request) {
  const { name, capacity, default_shift } = await request.json()

  if (!name || !capacity) {
    return NextResponse.json({ error: 'Name and capacity are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('instructors')
    .insert({ name, capacity, default_shift: default_shift || null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}
