"use client";

import {
    Box, Card, CardHeader, CardContent, Typography, Table, TableHead, TableRow, TableCell, TableBody, Chip
} from "@mui/material";
import { Pair } from "@/app/types/types";

export type WordsPreviewProps = {
    rows: Pair[];
    current: number;
    onRowClick: (index: number) => void;
};

export default function WordsPreview({
    rows,
    current,
    onRowClick
}: WordsPreviewProps) {
    return (
        <Card>
            <CardHeader title="プレビュー" action={<Chip label={`${rows.length} 件`} size="small" />} />
            <CardContent sx={{ p: 0 }}>
                <Box sx={{ maxHeight: 360, overflow: "auto" }}>
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell width={56}>#</TableCell>
                                <TableCell>単語</TableCell>
                                <TableCell>意味</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((r, i) => (
                                <TableRow
                                    key={`${r.word}-${i}`}
                                    hover
                                    selected={i === current}
                                    onClick={() => onRowClick(i)}
                                    sx={{ cursor: "pointer" }}
                                >
                                    <TableCell>{i + 1}</TableCell>
                                    <TableCell>{r.word}</TableCell>
                                    <TableCell>{r.meaning}</TableCell>
                                </TableRow>
                            ))}
                            {rows.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3}>
                                        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                                            まだありません。右の入力欄から解析してください。
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </Box>
            </CardContent>
        </Card>
    );
}
