import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('departure_points')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) throw error

    return NextResponse.json({ departure_points: data || [] })
  } catch (err) {
    console.error('[departure_points/GET]', err)
    return NextResponse.json(
      { error: 'Gagal mengambil data lokasi keberangkatan.' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { code, name, description, quota, sort_order, is_active } = body

    if (!code || !name) {
      return NextResponse.json(
        { error: 'Kode dan nama lokasi wajib diisi.' },
        { status: 400 }
      )
    }

    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('departure_points')
      .insert({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description || null,
        is_active: is_active ?? true,
        sort_order: sort_order ?? 0,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: `Kode lokasi "${code}" sudah terdaftar.` },
          { status: 400 }
        )
      }
      throw error
    }

    // Log to audit log
    await supabase.from('audit_logs').insert({
      actor_type: 'panitia',
      action: 'departure_point.created',
      entity_type: 'departure_point',
      entity_id: data.id,
      new_data: data,
    })

    return NextResponse.json({ departure_point: data }, { status: 201 })
  } catch (err) {
    console.error('[departure_points/POST]', err)
    return NextResponse.json(
      { error: 'Gagal menambahkan lokasi keberangkatan.' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'ID lokasi wajib diisi.' }, { status: 400 })
    }

    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('departure_points')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    await supabase.from('audit_logs').insert({
      actor_type: 'panitia',
      action: 'departure_point.updated',
      entity_type: 'departure_point',
      entity_id: id,
      new_data: updates,
    })

    return NextResponse.json({ departure_point: data })
  } catch (err) {
    console.error('[departure_points/PATCH]', err)
    return NextResponse.json(
      { error: 'Gagal memperbarui lokasi keberangkatan.' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID lokasi wajib diisi.' }, { status: 400 })
    }

    const supabase = await createServiceClient()
    const { error } = await supabase
      .from('departure_points')
      .delete()
      .eq('id', id)

    if (error) {
      // If FK constraint prevents hard delete, soft delete by setting is_active = false
      if (error.code === '23503') {
        await supabase
          .from('departure_points')
          .update({ is_active: false })
          .eq('id', id)

        return NextResponse.json({
          message: 'Lokasi telah dinonaktifkan karena telah memiliki riwayat pendaftaran.',
          softDeleted: true,
        })
      }
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[departure_points/DELETE]', err)
    return NextResponse.json(
      { error: 'Gagal menghapus lokasi keberangkatan.' },
      { status: 500 }
    )
  }
}
