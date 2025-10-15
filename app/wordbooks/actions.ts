'use server';

import { createClient } from '@/app/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createWordbook(_: unknown, fd: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 'Not signed in';

  const title = String(fd.get('title') ?? '').trim();
  const visibility = 'private';
  if (!title) return 'Title is required';

  const { error } = await supabase
    .from('wordbooks')
    .insert({ owner_id: user.id, title, visibility });
  if (error) return error.message;

  revalidatePath('/wordbooks');
}

export async function updateWordbook(_: unknown, fd: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 'Not signed in';

  const id = Number(fd.get('id'));
  const title = String(fd.get('title') ?? '').trim();
  if (!id || !title) return 'Invalid payload';

  // 自分のものだけ更新（owner_idも条件に）
  const { error } = await supabase
    .from('wordbooks')
    .update({ title, updated_at: new Date().toISOString() })
    .match({ id, owner_id: user.id });
  if (error) return error.message;

  revalidatePath('/wordbooks');
}

export async function deleteWordbook(_: unknown, fd: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 'Not signed in';

  const id = Number(fd.get('id'));
  if (!id) return 'Invalid id';

  // 自分のものだけ削除
  const { error } = await supabase
    .from('wordbooks')
    .delete()
    .match({ id, owner_id: user.id });
  if (error) return error.message;

  revalidatePath('/wordbooks');
}
