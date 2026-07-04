# コンテンツ追加ガイド

作成日: 2026-07-04
対象: Shohei Ichioka 個人ポートフォリオサイト

このドキュメントは、サイトに実データ（論文・受賞歴・News・記事・プロフィール）を追加する際の実践的な手順書である。フィールドの意味・型・注意点は、実装済みの `src/content.config.ts`（Content Layer API のZodスキーマ）と `src/utils/profile.ts`（プロフィール系YAMLのZodスキーマ）に基づく。設計の背景や表示ルールは `docs/DESIGN.md` を参照。

---

## 1. 2つのデータ系統

| 系統 | 対象ファイル | 特徴 |
|---|---|---|
| ① 単一設定オブジェクト | `src/data/profile.yml` `links.yml` `bio.yml` `interests.yml` | 1ファイル = 1個の設定。キーの中身を直接書き換える |
| ② レコード集合（Content Collection） | `src/data/papers.yml` `awards.yml` `manual-news.yml`、`src/content/articles/**/*.mdx` | 1ファイル = 配列、または1記事 = 1ファイル。**トップレベルが素の配列 `[]`**（`papers:` のようなキーで包まない）で、要素を追加していく |

②はビルド時にZodスキーマで検証される。型やキー名を間違えると `pnpm dev` / `pnpm build` がエラーで止まるが、これはデータの壊れを防ぐための想定通りの挙動である。

---

## 2. 単一設定ファイルを編集する

### `src/data/profile.yml`

`name` / `headline` / `hero` を持つ。`hero` は配列で、Heroセクションの箇条書きにそのまま反映される。行を増減すれば表示行数も変わる。`interests.yml` の内容（後述）はここに追記される形でHero末尾の1行にまとまる。

### `src/data/bio.yml`

`bio.ja` / `bio.en` の配列。Bioセクションの箇条書きにそのまま反映される。

### `src/data/interests.yml`

`researchInterests.ja` / `.en` の配列。**独立したセクションとしては表示されない**。Heroの箇条書き末尾に「研究関心: A、B、C」のように1行へ自動的にまとめられる。

### `src/data/links.yml`

`github` / `x` / `linkedin` / `zenn` / `googleScholar` / `email` の各キーに `label` / `url`（emailのみ追加で `display`）を持つ。

- `url` を空文字 `""` にすると、そのリンクはHeader/Hero/Footerのどこにも表示されない（`googleScholar` が現在この状態）
- URLが決まったら `url` を埋めるだけで自動的に表示される

---

## 3. 論文を追加する: `src/data/papers.yml`

初期状態は `[]`。配列の要素として追加する。

```yaml
- id: "bm25-mmr-preprint"
  category: "preprint"
  selected: true
  date: "2026-07-04"
  year: 2026
  title:
    ja: "BM25とMMRを用いた検索パイプラインの研究"
    en: "A Retrieval Pipeline Combining BM25 and MMR"
  authors:
    - name: "Shohei Ichioka"
      isSelf: true
    - name: "Coauthor Name"
  venue:
    ja: "arXiv"
    en: "arXiv"
  description:
    ja: "論文の短い説明。"
    en: "Short description of the paper."
  doi: "10.1234/example.2026"
  arxivId: "2607.00000"
  showInNews: true
  newsSummary:
    ja: "プレプリントを公開しました。"
    en: "Published a preprint."
```

### フィールドの意味と注意点

| フィールド | 必須 | 説明 |
|---|---|---|
| `id` | ○ | 一意な文字列（英数字とハイフン推奨）。`file()` loaderがこの値をエントリのIDとして使う |
| `category` | ○ | **必ず** `journal` / `conference` / `preprint` / `workshop` / `poster` のいずれか。他の文字列はビルドエラーになる |
| `selected` | - | `true` にするとトップページの「Selected Papers」にも表示。省略時 `false` |
| `date` | ○ | `"YYYY-MM-DD"` 形式推奨（ソートに使用） |
| `year` | ○ | `date` とは別の数値フィールド。表示用なので `date` の年と一致させる |
| `title` / `venue` | ○ | `ja` / `en` を持つオブジェクト |
| `authors` | ○ | `name` 必須の配列。`isSelf: true` にすると太字表示（自分の名前用）。省略時 `isSelf` は `false` |
| `description` / `newsSummary` | - | 省略可 |
| `doi` / `arxivId` | - | 省略可。値が無ければキーごと書かない |
| `links.pdf/code/project/bibtex` | - | 省略可。省略時は `links` キーごと書かなくてよい |
| `showInNews` | - | `true` にするとトップページのNewsに自動掲載 |

### 重要な注意点: URL系フィールドは空文字にできない

`links.pdf` / `links.code` / `links.project` / `links.bibtex`、および後述の `awards.url` は **URL形式のバリデーション（Zodの `z.url()`）が有効**。値が無い項目を `pdf: ""` のように空文字で書くと**バリデーションエラーになる**。値が無い場合は空文字ではなくキーごと省略すること。

```yaml
  links:
    pdf: "https://example.com/paper.pdf"
    # code / project / bibtex が無いなら書かない
```

`links` 自体が全く不要なら `links:` のキーごと省略してよい（`links: {}` 相当として扱われる）。

---

## 4. 受賞歴を追加する: `src/data/awards.yml`

初期状態は `[]`。

```yaml
- id: "sample-award-2026"
  selected: true
  date: "2026-07-04"
  year: 2026
  title:
    ja: "サンプル受賞"
    en: "Sample Award"
  organization:
    ja: "主催団体名"
    en: "Organization Name"
  description:
    ja: "受賞内容の短い説明。"
    en: "Short description."
  url: "https://example.org/news/award-announcement"
  showInNews: true
  newsSummary:
    ja: "サンプル受賞を追加しました。"
    en: "Added a sample award."
```

- `url`: 受賞が公表された外部記事・告知ページへのリンク。**無い場合はキーごと省略**（空文字 `""` は不可。省略または `null` は許容される）。値がある場合、受賞タイトルが自動的にその外部ページへのリンクになる。無い場合はプレーンテキスト表示になる
- `description`: 設定するとタイトル・団体名の下に表示される。省略可
- それ以外のフィールド（`selected` / `date` / `year` / `showInNews` / `newsSummary`）は papers.yml と同じ考え方

Awardsが6件を超えると、自動的にトップページのAwardsセクションに「もっと見る」ボタンが表示され、クリックで5件ずつ追加表示される（記事一覧と同じ挙動）。特別な設定は不要。

---

## 5. Newsを手動で追加する: `src/data/manual-news.yml`

論文・受賞・記事に紐づかない告知（サイト公開、登壇報告など）はここに直接書く。

```yaml
- id: "site-launched"
  date: "2026-07-04"
  title:
    ja: "ポートフォリオサイトを公開しました。"
    en: "Launched my portfolio website."
  url:
    ja: "/ja/"
    en: "/en/"
```

`url` は省略可。省略するとリンクなしのプレーンテキストとして表示される。

---

## 6. 記事を追加する: `src/content/articles/ja/` と `en/`

YAMLではなくMDXファイル。ファイル名（拡張子を除く部分）が記事のslugになり、**日本語版と英語版で同じファイル名にすると対訳ページとして自動的にリンク**される（片方の言語だけの記事も許可されている）。

`src/content/articles/ja/bm25-mmr.mdx` の例。

```mdx
---
title: "BM25 + MMR 検索パイプラインの設計"
description: "BM25検索とMMRリランキングを組み合わせた検索パイプラインの設計メモ。"
date: "2026-07-04"
selected: true
showInNews: true
newsSummary: "BM25 + MMR に関する記事を公開しました。"
---

ここから本文をMarkdown/MDXで書く。
```

- `title` / `date` は必須。`description` / `updated` / `newsSummary` は省略可
- `selected: true` でトップページの「Selected Articles」に表示
- `showInNews: true` でNewsに自動掲載（リンク先は記事詳細ページ、`url`指定時は後述の外部リンク）
- タグ機能は無いため `tags` フィールドは書かない（書いてもスキーマに存在しないため無視される）

### 外部サイトに書いた記事をリンク投稿として載せる: `url`

Zennなど他サイトに書いた記事を、本文をこのサイトに複製せずに一覧へ載せたい場合は `url` を追加する。

```mdx
---
title: "BM25 + MMR 検索パイプラインの設計"
description: "BM25検索とMMRリランキングを組み合わせた検索パイプラインの設計メモ。"
date: "2026-07-04"
selected: true
showInNews: true
url: "https://zenn.dev/pepepepepepepe/articles/bm25-mmr"
---
```

`url` を設定すると次のように挙動が変わる。

- 一覧ページ・トップページの「Selected Articles」・Newsで、タイトルが `url` へのリンクになる（新しいタブで開く）
- **サイト内の記事詳細ページ（`/ja/articles/[slug]`）は生成されない**。本文はサイト上で使われないため、空でもよい
- 日英で対になる記事（6章冒頭のペアリング）の相手が `url` を持つ場合、そちらへの「対訳を読む」リンクや `hreflang` は出力されない（サイト内ページが存在しないため）
- `url` を書かなければ今まで通りサイト内に記事詳細ページが作られる

`url` も他のURL系フィールドと同様、値が無いなら空文字ではなくキーごと省略すること。

### 記事をピン留めする: `pinned`

日付に関わらず一覧・トップページの先頭に固定して目立たせたい記事には `pinned: true` を追加する。

```mdx
---
title: "サイト運用ポリシーについて"
date: "2025-04-01"
selected: true
pinned: true
---
```

- `pinned: true` の記事は、日付の新しさに関係なく常に一覧・トップページの先頭グループに表示され、日付の横に `PICK UP` ラベルが付く
- `pinned` 同士は日付が新しい順、それ以外の記事も日付が新しい順で続く
- `selected`（トップページに出すか）とは独立したフラグ。「トップページには出さないが `/articles` 一覧の先頭には固定したい」という使い方もできる
- 省略時は `false`（通常の日付順）

### 記事が増えたときの表示件数

- トップページの「Selected Articles」は先頭5件のみ表示する。`selected: true` の記事が5件を超えたら、自動的に「すべての記事を見る」リンクが `/ja/articles` （`/en/articles`）へ表示される
- `/ja/articles` `/en/articles` の一覧ページは、最初に5件だけ表示し、6件目以降は「もっと見る」ボタンで5件ずつ追加表示される。特別な設定は不要で、記事が6件を超えると自動的にこの動作になる

---

## 7. 追加したら実行するコマンド

```bash
pnpm run check:articles   # ja/enの記事ペアが片方だけの場合に警告を出す（ビルドは止めない）
pnpm dev                  # ローカルで見た目を確認
pnpm build                # Zodスキーマ違反があればここでエラーとして検出される
```

`pnpm build` はスキーマ検証を兼ねているため、`category` のtypoや `url` の空文字指定などのミスはここで確実に見つかる。まずは論文か受賞のどちらか1件を実際に追加し、`pnpm dev` で反映を確認するのがおすすめ。
