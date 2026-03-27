import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function PATCH(request, { params }) {
  const { id } = await params
  const { first_name, last_name, phone, email, training_type } = await request.json()

  if (!first_name || !last_name) {
    return NextResponse.json({ error: 'First name and last name are required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('students')
    .update({ first_name, last_name, phone: phone || null, email: email || null, training_type: training_type || null })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
