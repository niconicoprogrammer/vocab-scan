'use client';

import { useState } from 'react';
import {
  Box, Stack, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, RadioGroup, FormControlLabel, Radio, Alert,
  Table, TableHead, TableRow, TableCell, TableBody, IconButton
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useActionState } from 'react';
import { createWordbook, deleteWordbook, updateWordbook } from '@/app/wordbooks/actions';

type Book = { id: number; title: string; created_at: string };

export default function WordbooksClient({ initialBooks }: { initialBooks: Book[] }) {
  // 新規作成
  const [openNew, setOpenNew] = useState(false);
  const [title, setTitle] = useState('');
  const [visibility, setVisibility] = useState<'private'|'public'>('private');

  // 編集
  const [editId, setEditId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const editing = editId !== null;

  // サーバーアクション
  const [createErr, createAction, createPending] = useActionState(createWordbook, undefined);
  const [updateErr, updateAction, updatePending] = useActionState(updateWordbook, undefined);
  const [deleteErr, deleteAction, deletePending] = useActionState(deleteWordbook, undefined);

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={800}>単語帳</Typography>
        <Button variant="contained" onClick={() => { setTitle(''); setOpenNew(true); }}>
          新規作成
        </Button>
      </Stack>

      {(createErr || updateErr || deleteErr) && (
        <Alert severity="error" sx={{ mb: 2 }}>{String(createErr || updateErr || deleteErr)}</Alert>
      )}

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell align="left" width={92}>操作</TableCell>
            <TableCell>タイトル</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {initialBooks.map((b) => (
            <TableRow key={b.id} hover>
              <TableCell align="left">
                <IconButton
                  size="small"
                  onClick={() => { setEditId(b.id); setEditTitle(b.title);}
                  }
                  aria-label="edit"
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <form action={deleteAction} style={{ display: 'inline' }}>
                  <input type="hidden" name="id" value={b.id} />
                  <IconButton size="small" type="submit" disabled={deletePending} aria-label="delete">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </form>
              </TableCell>
              <TableCell>
                <a href={`/wordbooks/${b.id}`} style={{ textDecoration: 'none' }}>{b.title}</a>
              </TableCell>
            </TableRow>
          ))}
          {initialBooks.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} sx={{ color: 'text.secondary' }}>
                まだ単語帳がありません。「新規作成」から追加してください。
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* 新規作成ダイアログ */}
      <Dialog open={openNew} onClose={() => setOpenNew(false)} fullWidth maxWidth="sm">
        <DialogTitle>単語帳を作成</DialogTitle>
        <form action={createAction} onSubmit={() => setOpenNew(false)}>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField
                name="title" label="タイトル" value={title}
                onChange={(e) => setTitle(e.target.value)} required fullWidth autoFocus
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenNew(false)}>キャンセル</Button>
            <Button type="submit" variant="contained" disabled={createPending}>作成</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* 編集ダイアログ */}
      <Dialog open={editing} onClose={() => setEditId(null)} fullWidth maxWidth="sm">
        <DialogTitle>単語帳を編集</DialogTitle>
        <form action={updateAction} onSubmit={() => setEditId(null)}>
          <DialogContent dividers>
            <input type="hidden" name="id" value={editId ?? ''} />
            <Stack spacing={2}>
              <TextField
                name="title" label="タイトル" value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required fullWidth autoFocus
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditId(null)}>キャンセル</Button>
            <Button type="submit" variant="contained" disabled={updatePending}>保存</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
