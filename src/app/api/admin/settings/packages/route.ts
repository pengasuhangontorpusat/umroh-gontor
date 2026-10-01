import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .order('price', { ascending: true })

    if (error) throw error

    return NextResponse.json({ packages: data || [] })
  } catch (err) {
    console.error('[packages/GET]', err)
    return NextResponse.json(
      { error: 'Gagal mengambil data paket umrah.' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, price, dp_amount, departure_date, return_date, is_active } = body

    if (!name || price == null || dp_amount == null) {
      return NextResponse.json(
        { error: 'Nama paket, harga paket, dan nominal DP wajib diisi.' },
        { status: 400 }
      )
    }

    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('packages')
      .insert({
        name: name.trim(),
        price: Number(price),
        dp_amount: Number(dp_amount),
        departure_date: departure_date || null,
        return_date: return_date || null,
        is_active: is_active ?? true,
      })
      .select()
      .single()

    if (error) throw error

    await supabase.from('audit_logs').insert({
      actor_type: 'panitia',
      action: 'package.created',
      entity_type: 'package',
      entity_id: data.id,
      new_data: data,
    })

    return NextResponse.json({ package: data }, { status: 201 })
  } catch (err) {
    console.error('[packages/POST]', err)
    return NextResponse.json(
      { error: 'Gagal menambahkan paket umrah.' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'ID paket wajib diisi.' }, { status: 400 })
    }

    if (updates.price != null) updates.price = Number(updates.price)
    if (updates.dp_amount != null) updates.dp_amount = Number(updates.dp_amount)

    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('packages')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    await supabase.from('audit_logs').insert({
      actor_type: 'panitia',
      action: 'package.updated',
      entity_type: 'package',
      entity_id: id,
      new_data: updates,
    })

    return NextResponse.json({ package: data })
  } catch (err) {
    console.error('[packages/PATCH]', err)
    return NextResponse.json(
      { error: 'Gagal memperbarui data paket umrah.' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID paket wajib diisi.' }, { status: 400 })
    }

    const supabase = await createServiceClient()
    const { error } = await supabase
      .from('packages')
      .delete()
      .eq('id', id)

    if (error) {
      // If FK constraint prevents hard delete, soft delete
      if (error.code === '23503') {
        await supabase
          .from('packages')
          .update({ is_active: false })
          .eq('id', id)

        return NextResponse.json({
          message: 'Paket dinonaktifkan karena telah dipilih oleh pendaftar.',
          softDeleted: true,
        })
      }
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[packages/DELETE]', err)
    return NextResponse.json(
      { error: 'Gagal menghapus paket umrah.' },
      { status: 500 }
    )
  }
}
