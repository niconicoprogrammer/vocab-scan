export type Pair = {
    word: string;
    meaning: string
};

export type Word = {
    id: number;
    term: string;
    meaning: string;
};

export type BreadcrumbsItem = {
    label: string;
    href?: string;
};

export type AnalyzeResult =
    { ok: false; error: string }
    | { ok: true; data: Pair[] };