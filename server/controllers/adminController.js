import { supabase, hasSupabase } from '../services/supabase.js'

export async function getUsers(req, res) {
  try {
    if (!hasSupabase) {
      return res.json({ users: [] })
    }
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, phone, auth_provider, status, is_verified, created_at, google_id')
      .order('created_at', { ascending: false })

    if (error) throw error
    res.json({ users: data || [] })
  } catch (err) {
    console.error('getUsers error:', err)
    res.status(500).json({ error: 'Failed to fetch users' })
  }
}

export async function updateUserStatus(req, res) {
  try {
    const { id } = req.params
    const { status } = req.body
    if (!['active', 'banned', 'disabled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Use: active, banned, or disabled' })
    }
    if (!hasSupabase) {
      return res.status(500).json({ error: 'No database' })
    }
    const { data, error } = await supabase
      .from('users')
      .update({ status })
      .eq('id', id)
      .select('id, name, email, phone, auth_provider, status, is_verified, created_at')
      .single()

    if (error) throw error
    res.json({ user: data, message: `User ${status}` })
  } catch (err) {
    console.error('updateUserStatus error:', err)
    res.status(500).json({ error: 'Failed to update user status' })
  }
}

export async function deleteUser(req, res) {
  try {
    const { id } = req.params
    if (!hasSupabase) {
      return res.status(500).json({ error: 'No database' })
    }
    const { error } = await supabase.from('users').delete().eq('id', id)
    if (error) throw error
    res.json({ message: 'User deleted' })
  } catch (err) {
    console.error('deleteUser error:', err)
    res.status(500).json({ error: 'Failed to delete user' })
  }
}
