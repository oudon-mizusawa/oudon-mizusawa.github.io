import 'server-only';

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';
import { ChildFrontmatter, ItemFrontmatter, type Child, type Item, type Skill } from './items';
import { imageRatio } from './imageSize.server';

/**
 * コンテンツの形は 2 種類だけ。
 *
 *   content/items/03-lettuce.md       1 枚もの
 *   content/items/06-bike/index.md    平面に置く物
 *   content/items/06-bike/*.md        その中に入っている記事
 *
 * 記事を増やす = フォルダに md を 1 枚足す。座標は書かなくていい。
 */
const ITEMS_DIR = path.join(process.cwd(), 'content', 'items');

function readMd(file: string) {
  return matter(fs.readFileSync(file, 'utf8'));
}

function fail(where: string, err: unknown): never {
  throw new Error(`[content] ${where} のフロントマターが不正です:\n${JSON.stringify(err, null, 2)}`);
}

function readChildren(dir: string, parent: string): Child[] {
  return fs
    .readdirSync(dir)
    .filter((f) => /\.mdx?$/.test(f) && !/^index\.mdx?$/.test(f))
    .map((f) => {
      const { data, content } = readMd(path.join(dir, f));
      const parsed = ChildFrontmatter.safeParse(data);
      if (!parsed.success) fail(`${parent}/${f}`, parsed.error.format());
      return {
        ...parsed.data,
        slug: f.replace(/\.mdx?$/, ''),
        parent,
        body: content.trim(),
      };
    })
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || a.slug.localeCompare(b.slug));
}

export function getItems(): Item[] {
  if (!fs.existsSync(ITEMS_DIR)) return [];

  return fs
    .readdirSync(ITEMS_DIR, { withFileTypes: true })
    .flatMap((entry) => {
      const full = path.join(ITEMS_DIR, entry.name);

      // フォルダ = 中に記事を持つ物
      if (entry.isDirectory()) {
        const index = ['index.md', 'index.mdx']
          .map((n) => path.join(full, n))
          .find((p) => fs.existsSync(p));
        if (!index) return [];
        const { data, content } = readMd(index);
        const parsed = ItemFrontmatter.safeParse(data);
        if (!parsed.success) fail(`${entry.name}/index.md`, parsed.error.format());
        return [
          {
            ...parsed.data,
            slug: entry.name,
            body: content.trim(),
            children: readChildren(full, entry.name),
            ratio: imageRatio(parsed.data.image),
          },
        ];
      }

      // 単体ファイル = 1 枚もの
      if (!/\.mdx?$/.test(entry.name)) return [];
      const { data, content } = readMd(full);
      const parsed = ItemFrontmatter.safeParse(data);
      if (!parsed.success) fail(entry.name, parsed.error.format());
      return [
        {
          ...parsed.data,
          slug: entry.name.replace(/\.mdx?$/, ''),
          body: content.trim(),
          children: [],
          ratio: imageRatio(parsed.data.image),
        },
      ];
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

export function getItem(slug: string): Item | undefined {
  return getItems().find((i) => i.slug === slug);
}

export function getChild(parent: string, slug: string): Child | undefined {
  return getItem(parent)?.children.find((c) => c.slug === slug);
}

/**
 * md 本文を HTML にする。
 * 中身は自分がこのリポジトリに書いたものだけなので、
 * サニタイズはかけていない。外部からの投稿を受ける日が来たら必ず入れること。
 */
export function renderMarkdown(md: string): string {
  return marked.parse(md, { async: false }) as string;
}

/** 履歴書の 1 節。## の見出しごとに切って、枠で囲って開閉できるようにする */
export type Section = { heading: string; html: string; hasSkills: boolean };

/** スキル欄をどこに差し込むかの目印。md の中に置いてある */
const SKILL_MARKER = '<!--skills-->';

/** 履歴書も md で編集できるようにする（GitHub に push したら反映される） */
export function getRirekisho(): {
  title: string;
  /** 最初の見出しより前。顔の下にそのまま出す */
  intro: string;
  sections: Section[];
} | null {
  const p = path.join(process.cwd(), 'content', 'rirekisho.md');
  if (!fs.existsSync(p)) return null;
  const { data, content } = readMd(p);
  const html = renderMarkdown(content.trim());

  // <h2> で切る。見出しの前が intro、以降が 1 節ずつ
  const parts = html.split(/<h2[^>]*>([\s\S]*?)<\/h2>/);
  const intro = parts[0] ?? '';
  const sections: Section[] = [];
  for (let i = 1; i < parts.length; i += 2) {
    const body = parts[i + 1] ?? '';
    sections.push({
      // 見出しに入りうるタグを落として素の文字にする
      heading: parts[i].replace(/<[^>]*>/g, '').trim(),
      html: body.replace(SKILL_MARKER, ''),
      hasSkills: body.includes(SKILL_MARKER),
    });
  }

  return {
    title: typeof data.title === 'string' ? data.title : 'rirekisho',
    intro,
    sections,
  };
}

/**
 * スキル欄。カテゴリで絞り込みたいので、HTML ではなく行の配列として渡す。
 * content/skills.md の表をそのまま読む（| で区切られた行だけを拾う）。
 */
export function getSkills(): Skill[] {
  const p = path.join(process.cwd(), 'content', 'skills.md');
  if (!fs.existsSync(p)) return [];
  const { content } = readMd(p);

  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|') && line.endsWith('|'))
    .map((line) =>
      line
        .slice(1, -1)
        .split('|')
        .map((cell) => cell.trim()),
    )
    // 見出し行（カテゴリ|経験|技術）と区切り行（---|---|---）を落とす
    .filter((cells) => cells.length === 3 && !/^-+$/.test(cells[0]) && cells[0] !== 'カテゴリ')
    .map(([category, experience, name]) => ({ category, experience, name }));
}
