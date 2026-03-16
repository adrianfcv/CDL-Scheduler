import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function PATCH(request, { params }) {
  const { id } = await params
  const { name, capacity, default_shift } = await request.json()

  if (!name || !capacity) {
    return NextResponse.json({ error: 'Name and capacity are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('instructors')
    .update({ name, capacity, default_shift: default_shift || null })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function DELETE(request, { params }) {
  const { id } = await params

  const { error } = await supabase
    .from('instructors')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return new NextResponse(null, { status: 204 })
}
