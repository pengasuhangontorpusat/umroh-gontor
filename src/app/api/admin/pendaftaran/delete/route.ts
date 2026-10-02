import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { groupId, jamaahId, reason } = await req.json()

    if (!groupId && !jamaahId) {
      return NextResponse.json({ error: 'Parameter groupId atau jamaahId wajib diisi' }, { status: 400 })
    }

    const supabase = await createServiceClient()

    // Case 1: Hapus Pendaftaran Rombongan (Group)
    if (groupId) {
      const { data: group, error: fetchErr } = await supabase
        .from('registration_groups')
        .select('id, registration_code, type, group_status')
        .eq('id', groupId)
        .single()

      if (fetchErr || !group) {
        return NextResponse.json({ error: 'Data pendaftaran tidak ditemukan' }, { status: 404 })
      }

      // Log ke audit_logs sebelum dihapus
      await supabase.from('audit_logs').insert({
        actor_type: 'panitia',
        action: 'group.deleted',
        entity_type: 'registration_group',
        entity_id: groupId,
        old_data: {
          registration_code: group.registration_code,
          type: group.type,
          group_status: group.group_status,
          reason: reason || 'Dihapus oleh admin',
        },
      })

      // Hapus data grup (akan cascade ke jamaahs, documents, payments)
      const { error: deleteErr } = await supabase
        .from('registration_groups')
        .delete()
        .eq('id', groupId)

      if (deleteErr) {
        console.error('Delete registration group error:', deleteErr)
        return NextResponse.json({ error: deleteErr.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: `Pendaftaran ${group.registration_code} berhasil dihapus beserta seluruh data terkait.`,
      })
    }

    // Case 2: Hapus Jamaah Spesifik
    if (jamaahId) {
      const { data: jamaah, error: fetchErr } = await supabase
        .from('jamaahs')
        .select('id, full_name, group_id')
        .eq('id', jamaahId)
        .single()

      if (fetchErr || !jamaah) {
        return NextResponse.json({ error: 'Data jamaah tidak ditemukan' }, { status: 404 })
      }

      // Log audit
      await supabase.from('audit_logs').insert({
        actor_type: 'panitia',
        action: 'jamaah.deleted',
        entity_type: 'jamaah',
        entity_id: jamaahId,
        old_data: {
          full_name: jamaah.full_name,
          group_id: jamaah.group_id,
          reason: reason || 'Dihapus oleh admin',
        },
      })

      // Cek apakah jamaah ini adalah PIC
      const { data: group } = await supabase
        .from('registration_groups')
        .select('id, pic_jamaah_id')
        .eq('id', jamaah.group_id)
        .single()

      if (group && group.pic_jamaah_id === jamaahId) {
        // Cari pengganti PIC dari jamaah lain dalam grup
        const { data: otherJamaahs } = await supabase
          .from('jamaahs')
          .select('id')
          .eq('group_id', jamaah.group_id)
          .neq('id', jamaahId)
          .limit(1)

        const newPicId = otherJamaahs && otherJamaahs.length > 0 ? otherJamaahs[0].id : null
        await supabase
          .from('registration_groups')
          .update({ pic_jamaah_id: newPicId })
          .eq('id', jamaah.group_id)
      }

      // Hapus jamaah (cascade ke documents jamaah tersebut)
      const { error: deleteErr } = await supabase
        .from('jamaahs')
        .delete()
        .eq('id', jamaahId)

      if (deleteErr) {
        console.error('Delete jamaah error:', deleteErr)
        return NextResponse.json({ error: deleteErr.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: `Jamaah ${jamaah.full_name} berhasil dihapus.`,
      })
    }
  } catch (err) {
    console.error('Admin delete API error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Terjadi kesalahan sistem' },
      { status: 500 }
    )
  }
}
