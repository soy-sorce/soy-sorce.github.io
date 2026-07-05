# ポートフォリオサイト設計書

作成日: 2026-07-04
対象: Shohei Ichioka 個人ポートフォリオサイト
想定公開先: GitHub Pages
想定構成: Astro (Content Layer API) + TypeScript + Markdown/MDX + YAML + pnpm

本書はポートフォリオサイトの設計書である。この内容に基づいて実装する。

---

## 1. 目的

日本語・英語に対応した、シンプルで更新しやすいポートフォリオサイトを作成する。

研究者サイトとエンジニア個人サイトの中間を目指し、以下を満たす。

- 日本語・英語の両対応
- 自己紹介、略歴、News、Articles、Papers、Awards を整理して表示
- 論文・記事・受賞歴を後から追加しやすい
- コンテンツが空のセクションは非表示にする
- Articles / Papers / Awards を追加したとき、必要に応じて News に自動反映する
- 見た目は複雑にしすぎず、白背景または薄いグレー背景、紫系アクセントで統一する
- Contact セクションは作らず、Footer に連絡先とURLを集約する

---

## 2. 採用技術

### 2.1 使用技術一覧

| 項目 | 採用 |
|---|---|
| フレームワーク | Astro（Content Layer API を使用） |
| 言語 | Astro / HTML / CSS / TypeScript |
| コンテンツ | Markdown / MDX / YAML |
| パッケージマネージャー | pnpm |
| ホスティング | GitHub Pages |
| CI/CD | GitHub Actions |
| 多言語対応 | `/ja` `/en` のサブパス方式 |
| スタイル | 素のCSS、または後からTailwind CSS追加も可 |
| バリデーション | `zod`（collection schema用は `astro/zod`、通常データ用は `zod` パッケージの2系統） |

### 2.2 TypeScript の使い方

TypeScript は重く使わない。

使う範囲は以下に限定する。

- `astro.config.mjs`
- `src/content.config.ts`（Content Layer API によるコンテンツ・データ定義）
- `src/utils/*.ts`（データ整形・バリデーション関数）
- コンポーネント props の軽い型定義

使わないもの。

- 複雑な型パズル
- 大規模な状態管理
- React前提の重い設計
- APIサーバー
- DB
- 認証

### 2.3 データ管理方針

`src/data/*.yml` はデータの性質によって以下の2方式で読み込む。Vite標準ではYAMLの `import` をサポートしていないため、いずれの方式も追加の仕組みを併用する。

**方式A: Content Layer data collection（`file()` loader）を使う**

対象: `papers.yml` / `awards.yml` / `manual-news.yml`

理由: これらは「一意な `id` を持つレコードの配列」という、collectionに向いたデータ形状である。`file()` loader を使うことで、追加の依存パッケージなしにZodスキーマ検証・型付けが標準機能として手に入る。

条件: `file()` loader のデフォルト挙動に合わせ、YAMLのトップレベルは `papers:` のようなキーで包まない、素の配列にする（詳細は7.1・8.1・9章）。

**方式B: `vite-plugin-yaml` + 手動Zod検証を使う**

対象: `profile.yml` / `links.yml` / `bio.yml` / `interests.yml`

理由: これらは「レコードの集合」ではなく「単一の設定オブジェクト」であり、Content Layer collectionのセマンティクス（複数エントリの集合）に馴染まない。`@modyfi/vite-plugin-yaml` 等のViteプラグインを追加して通常の `import` を可能にした上で、`src/utils/*.ts` 内で素の `zod` パッケージを使って手動検証する。

```js
// astro.config.mjs (抜粋)
import yaml from "@modyfi/vite-plugin-yaml";

export default defineConfig({
  // ...
  vite: {
    plugins: [yaml()],
  },
});
```

```ts
// src/utils/profile.ts
import { z } from "zod"; // astro:content の z ではなく通常の zod を使う
import profileRaw from "../data/profile.yml";

const ProfileSchema = z.object({
  name: z.object({ ja: z.string(), en: z.string() }),
  headline: z.object({ ja: z.string(), en: z.string() }),
  hero: z.object({
    ja: z.array(z.string()),
    en: z.array(z.string()),
  }),
});

export function getProfile() {
  return ProfileSchema.parse(profileRaw);
}
```

**`astro:content` の `z` を使わない理由**

`import { z } from "astro:content"` はAstro 7時点で非推奨であり（内部的に `import { z } from "astro/zod"` の使用が案内される）、collection schema定義（`src/content.config.ts`）では `astro/zod` から `z` をimportする。`profile.yml` のような単一設定オブジェクトの検証（collection化しないデータ）には、通常の `zod` パッケージを直接依存関係に追加して使う。

---

## 3. サイト全体の構成

### 3.1 URL設計

初期段階では以下を作る。

```txt
/
  /ja へリダイレクト（3.4節参照）

/ja
/en

/ja/articles/[slug]
/en/articles/[slug]
```

Articles・Papersの一覧はいずれも専用ページを持たず、ホームページ（`/ja` `/en`）内の `#articles` `#papers` セクションに全件表示する（6.4節・7.4節）。

将来的に追加する候補。

```txt
/ja/awards
/en/awards

/ja/cv
/en/cv

/ja/news
/en/news
```

### 3.2 トップページ構成

トップページは以下の順番にする。

```txt
[Header]
Name | Bio | Articles | Papers | Awards | CV | JA/EN

[Hero]
Name
Short bio（箇条書き）
Research Interests（箇条書き。独立セクションは作らず、Heroの箇条書きに含める）
GitHub / X / LinkedIn / Zenn / Google Scholar / Email

[News]
最新3〜5件
Articles / Papers / Awards から自動生成
手動Newsも追加可能

[Bio]
箇条書き

[Articles]
全記事を表示（もっと見るで5件ずつ追加表示）
空なら非表示

[Papers]
全論文をカテゴリ別に表示（カテゴリごとにもっと見るで5件ずつ追加表示）
空なら非表示

[Awards]
全受賞歴を表示（もっと見るで5件ずつ追加表示）
空なら非表示

[Footer]
Email / GitHub / X / LinkedIn / Zenn / Google Scholar / ©
```

### 3.3 初期表示

初期状態では Articles / Papers / Awards / News が空なので、トップページは以下だけが表示される。

```txt
Header
Hero
Bio
Footer
```

ただし、後からコンテンツが追加されたら自動的に以下のセクションが表示される。

```txt
News
Articles
Papers
Awards
```

### 3.4 ルートパス `/` のリダイレクト設計

Astroのi18nルーティングで `routing: { prefixDefaultLocale: true }` を設定しても、ルートパス `/` は自動的に `/ja` へリダイレクトされるわけではない。加えて、本サイトは GitHub Pages 上の完全静的サイト（SSRなし、`output: "static"`）であるため、`Astro.redirect()` のようなサーバーサイドのリダイレクトAPIは使えない。

そのため `src/pages/index.astro` を自作し、静的にビルドされたHTMLの中で meta refresh によるリダイレクトを行う。

```astro
---
// src/pages/index.astro
---
<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="refresh" content="0; url=/ja/" />
    <link rel="canonical" href="/ja/" />
    <title>Shohei Ichioka</title>
  </head>
  <body>
    <p>Redirecting to <a href="/ja/">/ja/</a>...</p>
  </body>
</html>
```

補足。

- meta refresh の `content="0; ..."` は即時リダイレクトを意味する
- `<a href="/ja/">` を本文に残すことで、JS/meta refresh が効かない環境でも遷移できるようにする
- クローラーにも `/ja/` を正として認識させるため `<link rel="canonical">` を明記する

### 3.5 404ページ設計

GitHub Pages は `404.html` をカスタムエラーページとして認識するため、`src/pages/404.astro` を用意する。

- 日英どちらの訪問者にも配慮し、日本語・英語両方の簡潔な文言を1ページに併記する
- トップページ（`/ja/`, `/en/`）へのリンクを設置する
- デザインはHeader/Footerを含む通常のBaseLayoutを流用してよい

---

## 4. デザイン方針

### 4.1 全体方針

- 白背景または薄いグレー背景
- アクセントカラーは紫系
- 最大幅は 880px 前後
- セクションごとに余白を大きめに取る
- 文字中心で読みやすくする
- アニメーションは最小限
- Articles / Papers / Bio / News / Awards はすべて枠のないリスト形式にする（カード・box表示にしない。左のアクセント罫線で項目を区切る）
- Articles / Papers にタグ（トピックラベル）は付けない
- Research Interests は独立セクションを作らず、Heroの箇条書きに含める
- PCでは通常のナビゲーションバー
- スマホでは右上にハンバーガーメニュー
- Contact セクションは作らない

### 4.2 カラートークン

`src/styles/global.css` に以下を定義する。

```css
:root {
  --color-bg: #ffffff;
  --color-bg-soft: #f8f7fb;
  --color-text: #17151f;
  --color-muted: #666276;
  --color-border: #e7e2f2;
  --color-accent: #4b00c8;
  --color-accent-light: #843bf8;
  --color-link: #4b00c8;
}
```

### 4.3 レイアウト基本値

```css
:root {
  --container-width: 880px;
  --section-gap: 72px;
  --radius-card: 18px;
}
```

`--radius-card` はカード用ではなく、タグ・ボタン・pill形状の要素（言語切り替えボタン等）にのみ使う。Articles / Papers の記事一覧そのものはカード化しないため、角丸ボックスとしては使わない。

---

## 5. 初期コンテンツ定義

### 5.1 Hero

`src/data/profile.yml`（vite-plugin-yaml で import、方式B）

```yaml
name:
  ja: "Shohei Ichioka"
  en: "Shohei Ichioka"

headline:
  ja: "一橋大学ソーシャル・データサイエンス学部。欅研究室所属。"
  en: "Undergraduate student at the School of Social Data Science, Hitotsubashi University. Member of Keyaki Lab."

hero:
  ja:
    - "一橋大学ソーシャル・データサイエンス学部。欅研究室所属。"
    - "NII 技術補佐員。"
    - "llm-jp コーパス構築ワーキンググループ所属。"
  en:
    - "Undergraduate student at the School of Social Data Science, Hitotsubashi University. Member of Keyaki Lab."
    - "Technical Assistant at NII."
    - "Member of the llm-jp Corpus Construction Working Group."
```

`Hero.astro` はこの `hero` 配列に加えて、`interests.yml`（5.4節）の内容も同じ箇条書きリストの末尾に描画する。

### 5.2 Links / URLs

`src/data/links.yml`（vite-plugin-yaml で import、方式B）

```yaml
links:
  github:
    label: "GitHub"
    url: "https://github.com/soy-sorce"
  x:
    label: "X"
    url: "https://x.com/SIchioka_0623"
  linkedin:
    label: "LinkedIn"
    url: "https://www.linkedin.com/in/shohei-ichioka-b93806358/"
  zenn:
    label: "Zenn"
    url: "https://zenn.dev/pepepepepepepe"
  googleScholar:
    label: "Google Scholar"
    url: ""
  email:
    label: "Email"
    url: "mailto:ichi.shouhei44en@gmail.com"
    display: "ichi.shouhei44en [at] gmail.com"
```

表示ルール。

- `url` が空文字のものは表示しない
- Header / Hero / Footer で同じデータを使い回す
- Email は `mailto:` を使うが、画面表示では `[at]` にする

### 5.3 Bio

`src/data/bio.yml`（vite-plugin-yaml で import、方式B）。学歴（`education`）と職歴（`work`）を分けて配列で持つ。期間は `startYear`/`endYear`（数値、必須）に加え、任意で `startMonth`/`endMonth`（1〜12）を持てる。表示時に `formatBioPeriod()`（`utils/profile.ts`）で整形する。月を指定すると `2024-04` のようにゼロ埋め2桁でハイフン結合し（サイト内の他の日付表記 `.entry-meta` の `YYYY-MM-DD` 形式と統一）、月を省略すると年のみ（`2024`）になる。`endYear` を省略・`null` にすると在籍中として扱われ、`現在`（en: `Present`）に自動変換される。

```yaml
education:
  - startYear: 2024
    startMonth: 4
    endYear: 2028
    endMonth: 3
    institution:
      ja: "一橋大学 ソーシャル・データサイエンス学部"
      en: "School of Social Data Science, Hitotsubashi University"
  - startYear: 2026
    endYear: 2027
    institution:
      ja: "York University @カナダ（交換留学）"
      en: "York University @Canada (Exchange)"

work:
  - startYear: 2025
    startMonth: 4
    endYear: null
    company:
      ja: "国立情報学研究所（NII）"
      en: "National Institute of Informatics (NII)"
    title:
      ja: "技術補佐員"
      en: "Technical Assistant"
    description:
      ja: "llm-jp コーパス構築ワーキンググループに所属し、大規模言語モデル学習用コーパスの構築に従事。"
      en: "Member of the llm-jp Corpus Construction Working Group, working on building corpora for large language model training."
```

`startMonth`/`endMonth` は完全に任意で、片方のエントリだけ月を付けるなど混在しても構わない（2番目の学歴エントリのように月無し=年のみ表示のままでもよい）。

`work` の `company` と `title` は表示上同じ太さ・サイズで並べる（会社名と役職名を同格に扱う）。`description` は必須で、役職の内容を短く説明する。

### 5.4 Research Interests

`src/data/interests.yml`（vite-plugin-yaml で import、方式B）

```yaml
researchInterests:
  ja:
    - "情報検索（IR）"
    - "自然言語処理（NLP）"
    - "行政学"
  en:
    - "Information Retrieval"
    - "Natural Language Processing"
    - "Public Administration"
```

このデータは独立したセクション・ページとしては表示しない。`Hero.astro` 内で `profile.yml` の `hero` と同じ箇条書きリストの一部として描画し、タグやラベル状の見た目にはしない。項目ごとに箇条書きを分けず、「研究関心: A、B、C」のように1行にまとめる。`interests.yml` が空の場合は、単純にHeroの箇条書きに何も追加されない（Hero自体は常に表示されるため、セクション単位の表示/非表示制御は不要）。

### 5.5 Manual News

`src/data/manual-news.yml`（Content Layer `file()` loader で読み込む、方式A）

`file()` loader のデフォルト挙動に合わせ、トップレベルはキーで包まない素の配列にする。

初期状態では空。

```yaml
[]
```

将来的に手動でNewsを追加する例。

```yaml
- id: "site-launched"
  date: "2026-07-04"
  title:
    ja: "ポートフォリオサイトを公開しました。"
    en: "Launched my portfolio website."
  url:
    ja: "/ja"
    en: "/en"
```

---

## 6. Articles 設計

### 6.1 管理方法

Articles は Markdown / MDX で管理する。

```txt
src/content/articles/
├── ja/
│   └── example.mdx
└── en/
    └── example.mdx
```

### 6.2 Content Layer API での collection 定義

`src/content.config.ts`（Astro 5の配置。旧 `src/content/config.ts` ではない）

```ts
import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";

const articles = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/articles" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    pinned: z.boolean().default(false),
    showInNews: z.boolean().default(false),
    newsSummary: z.string().optional(),
    url: z.url().optional(),
  }),
});
```

`glob()` loader は `base` からの相対パス（拡張子なし）を `id` として自動生成する。例えば `src/content/articles/ja/bm25-mmr.mdx` の `id` は `"ja/bm25-mmr"` になる。この `id` の先頭セグメントを locale 判定に使う（6.5節）。

記事にタグ（トピックラベル）は付けない。トピックは `description` や本文で表現する。

`url` は、Zenn等の外部サイトに書いた記事をこのサイトの「Articles」一覧に**リンク投稿として**載せるためのフィールドである（6.4節）。値が無い記事は通常通りサイト内に記事詳細ページを持つ。

### 6.3 Article frontmatter

記事ファイルの先頭に以下を書く。

```mdx
---
title: "BM25 + MMR 検索パイプラインの設計"
description: "BM25検索とMMRリランキングを組み合わせた検索パイプラインの設計メモ。"
date: "2026-07-04"
updated: "2026-07-04"
showInNews: true
newsSummary: "BM25 + MMR に関する記事を公開しました。"
---

本文を書く。
```

外部サイト（Zennなど）に書いた記事をリンク投稿として載せる場合は `url` を追加する。この場合、本文はサイト上で使われないため空でもよい。

```mdx
---
title: "BM25 + MMR 検索パイプラインの設計"
description: "BM25検索とMMRリランキングを組み合わせた検索パイプラインの設計メモ。"
date: "2026-07-04"
showInNews: true
url: "https://zenn.dev/pepepepepepepe/articles/bm25-mmr"
---
```

### 6.4 Articles の表示ルール

- ホームページ（`/ja` `/en`）の `Articles` セクションに、その言語の全記事を一覧表示する（専用の一覧ページは持たない。3.1節）
- 記事が0件なら `Articles` セクションは非表示
- `showInNews: true` の場合、Newsに自動表示
- 記事はカードではなく枠のないリスト形式（左のアクセント罫線区切り）で表示する
- タグは表示しない
- `url` が設定されている記事は「リンク投稿」として扱う
  - タイトルは `url` へのリンクになる（新しいタブで開く。`target="_blank" rel="noopener noreferrer"`）
  - サイト内の記事詳細ページ（`/ja/articles/[slug]`）は**生成しない**（`getStaticPaths` で `url` ありのエントリを除外する）
  - Newsに載る場合のリンク先も `url` になる
  - 対訳記事（6.6節）の相手が `url` ありの場合、サイト内ページが存在しないためhreflangの対象からは除外する（14.4節）
- `url` が無い記事は従来通りサイト内の記事詳細ページ（`/ja/articles/[slug]`）にリンクする

### 6.4.1 並び順とピン留め（`pinned`）

ホームページの `Articles` セクションは、以下の順で並べる（`sortArticles()`、6.5節）。

1. `pinned: true` の記事（この中では `date` の降順）
2. それ以外の記事（`date` の降順）

`pinned: true` の記事は日付に関わらず常に先頭グループに表示され、日付表示の横に `PICK UP` ラベルを付けて区別する。

### 6.4.2 表示件数と続きの読み込み

- ホームページの `Articles` セクションは、初期表示5件＋「もっと見る」ボタンで5件ずつ追加表示する（`ArticleList.astro`、12.6節）
- 全記事はビルド時にHTMLへ埋め込まれており、「もっと見る」は`hidden`属性の付け外しのみを行う軽量なvanilla JSで実装する（サーバー通信やページ遷移は発生しない）

### 6.5 locale 判定方法

`articles` collection は ja/en を1つのcollectionにまとめているため、`id` の先頭セグメントで locale を判定する。

```ts
// src/utils/articles.ts
import { getCollection, type CollectionEntry } from "astro:content";
import type { Locale } from "./i18n";

export function getLocaleFromId(id: string): Locale {
  return id.startsWith("en/") ? "en" : "ja";
}

export function getSlugFromId(id: string): string {
  return id.split("/").slice(1).join("/");
}

export async function getArticlesByLocale(locale: Locale) {
  const all = await getCollection("articles");
  return all.filter((entry) => getLocaleFromId(entry.id) === locale);
}

// url指定がある記事は外部の「リンク投稿」として扱い、サイト内の記事詳細ページは持たない
export function isExternalArticle(entry: CollectionEntry<"articles">): boolean {
  return Boolean(entry.data.url);
}

export function getArticleHref(entry: CollectionEntry<"articles">, locale: Locale): string {
  if (entry.data.url) return entry.data.url;
  return `/${locale}/articles/${getSlugFromId(entry.id)}/`;
}

// pinned: true の記事を常に先頭にまとめ、その中・残りともに date の降順で並べる（6.4.1節）
export function sortArticles(entries: CollectionEntry<"articles">[]): CollectionEntry<"articles">[] {
  return [...entries].sort((a, b) => {
    if (a.data.pinned !== b.data.pinned) return a.data.pinned ? -1 : 1;
    return b.data.date.getTime() - a.data.date.getTime();
  });
}
```

`ArticleEntry.astro`（12.5節）や `utils/news.ts`（9章）は、記事へのリンクを組み立てる際に必ず `getArticleHref()` を使い、`url` の有無を意識せずに済むようにする。一覧・トップページへの表示順は必ず `sortArticles()` を経由させる。

### 6.6 日本語・英語記事の対応関係とペアリング検証

初期実装では、同じ slug を持つファイルを日英対応とする。

```txt
src/content/articles/ja/bm25-mmr.mdx
src/content/articles/en/bm25-mmr.mdx
```

片方しかない場合は、その言語の記事一覧にのみ表示する（意図的に許可されたケース）。

一方で、「片方だけ存在するのが意図的なのか、追加し忘れなのか」は自動では区別できないため、ビルドを止めない可視化のみのチェックスクリプトを用意する。

`astro:content` はAstroのビルド/開発パイプライン内でのみ解決される仮想モジュールであり、`tsx` で直接スクリプトを実行する場合はそのままでは使えない。そのためこのスクリプトは `astro:content` を使わず、`src/content/articles/ja` と `src/content/articles/en` のファイル一覧をファイルシステムから直接比較する。

```ts
// scripts/check-articles.ts
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARTICLES_DIR = join(__dirname, "..", "src", "content", "articles");

function listSlugs(locale: "ja" | "en"): Set<string> {
  const dir = join(ARTICLES_DIR, locale);
  return new Set(
    readdirSync(dir)
      .filter((file) => file.endsWith(".mdx"))
      .map((file) => file.replace(/\.mdx$/, ""))
  );
}

const jaSlugs = listSlugs("ja");
const enSlugs = listSlugs("en");
const allSlugs = new Set([...jaSlugs, ...enSlugs]);

for (const slug of allSlugs) {
  const hasJa = jaSlugs.has(slug);
  const hasEn = enSlugs.has(slug);
  if (hasJa !== hasEn) {
    console.warn(`[check-articles] "${slug}" は ${hasJa ? "ja" : "en"} にしか存在しません。`);
  }
}
```

```json
// package.json (scripts抜粋)
{
  "scripts": {
    "check:articles": "tsx scripts/check-articles.ts"
  }
}
```

このスクリプトは警告を出すのみで、ビルド自体は失敗させない（片方言語のみの記事は仕様として許可されているため）。`src/utils/articles.ts` 側の `getLocaleFromId` / `getSlugFromId` はAstro実行時（ページ・コンポーネント）専用とし、このスクリプトでは使わない。

---

## 7. Papers 設計

### 7.1 管理方法

Papers は YAML で管理し、Content Layer の `file()` loader で collection として読み込む（方式A）。

`src/data/papers.yml`

`file()` loader のデフォルト挙動に合わせ、トップレベルは素の配列にする（`papers:` キーで包まない）。

```yaml
[]
```

`src/content.config.ts`（6.2節に追記）

```ts
import { file } from "astro/loaders";

const papers = defineCollection({
  loader: file("src/data/papers.yml"),
  schema: z.object({
    category: z.enum(["journal", "conference", "preprint", "workshop", "poster"]),
    date: z.coerce.date(),
    year: z.number(),
    title: z.object({
      ja: z.string(),
      en: z.string(),
    }),
    authors: z.array(
      z.object({
        name: z.string(),
        isSelf: z.boolean().default(false),
      })
    ),
    venue: z.object({
      ja: z.string(),
      en: z.string(),
    }),
    description: z
      .object({
        ja: z.string().optional(),
        en: z.string().optional(),
      })
      .optional(),
    links: z
      .object({
        pdf: z.url().optional(),
        code: z.url().optional(),
        project: z.url().optional(),
        bibtex: z.url().optional(),
      })
      .default({}),
    doi: z.string().optional(),
    arxivId: z.string().optional(),
    showInNews: z.boolean().default(false),
    newsSummary: z
      .object({
        ja: z.string().optional(),
        en: z.string().optional(),
      })
      .optional(),
  }),
});

export const collections = { articles, papers, awards, manualNews };
```

`file()` loader は配列の各要素の `id` フィールドを自動的にエントリのidとして使うため、schema側に `id` を重複して書く必要はない（YAML側には引き続き `id` を書く）。

### 7.2 Paper category

以下のカテゴリを使う。

```txt
journal       Journal Articles
conference   Conference Papers
preprint     Preprints
workshop     Workshop Papers
poster       Posters / Presentations
```

画面上では、カテゴリ名を以下のように表示する。

| category | 日本語表示 | 英語表示 |
|---|---|---|
| journal | 査読付き論文 | Journal Articles |
| conference | 国際会議・国内会議 | Conference Papers |
| preprint | プレプリント | Preprints |
| workshop | ワークショップ論文 | Workshop Papers |
| poster | ポスター・発表 | Posters / Presentations |

### 7.3 Paper データ定義

```yaml
- id: "sample-paper"
  category: "preprint"
  date: "2026-07-04"
  year: 2026
  title:
    ja: "サンプル論文タイトル"
    en: "Sample Paper Title"
  authors:
    - name: "Shohei Ichioka"
      isSelf: true
    - name: "Coauthor Name"
      isSelf: false
  venue:
    ja: "arXiv"
    en: "arXiv"
  description:
    ja: "論文の短い説明。"
    en: "Short description of the paper."
  links:
    pdf: ""
    code: ""
    project: ""
    bibtex: ""
  doi: ""
  arxivId: "2607.00000"
  showInNews: true
  newsSummary:
    ja: "プレプリントを公開しました。"
    en: "Published a preprint."
```

`authors` は本人を強調表示するため、文字列配列ではなく `{ name, isSelf }` のオブジェクト配列にする。`isSelf: true` の著者は太字表示する。

`doi` / `arxivId` は空文字または省略可能。どちらもオプションで、両方設定されていてもよい（例: プレプリント公開後にジャーナル掲載されDOIが付与されたケース）。

### 7.4 Papers の表示ルール

- ホームページ（`/ja` `/en`）の `Papers` セクションに、全Papersを表示する（専用の一覧ページは持たない。3.1節）
- カテゴリごとに分けて表示し、空カテゴリは表示しない
- 全Papersが0件なら `Papers` セクション自体を非表示にする（3.2節・10.1節）
- カテゴリごとに独立した「もっと見る」ボタンを持ち、そのカテゴリの件数が5件を超える場合のみ表示する（`LoadMoreList.astro` をカテゴリ単位でラップする。12.7節・12.8節）
- `showInNews: true` の場合、Newsに自動表示
- カードではなく枠のないリスト形式で表示する
- トピックタグは表示しない。カテゴリ分類とvenue/authorsの情報のみで整理する
- `authors` のうち `isSelf: true` の著者名は太字で表示する
- `doi` が設定されている場合、`DOI: 10.xxxx` の形式で `https://doi.org/{doi}` へのリンクとして表示する
- `arxivId` が設定されている場合、`arXiv:XXXX.XXXXX` の形式で `https://arxiv.org/abs/{arxivId}` へのリンクとして表示する
- `doi` と `arxivId` の両方が設定されている場合は両方表示する

---

## 8. Awards 設計

### 8.1 管理方法

Awards は YAML で管理し、Content Layer の `file()` loader で collection として読み込む（方式A）。

`src/data/awards.yml`

トップレベルは素の配列にする（`awards:` キーで包まない）。

```yaml
[]
```

### 8.2 Award データ定義

`url` は「その受賞が公表された外部の告知記事・発表ページ等へのリンク」であり、必ずしも存在するとは限らない。そのため `nullable`（省略可）とし、値がある場合は受賞タイトルをその外部ページへのハイパーリンクとしてサイト上に埋め込んで表示する。

```ts
const awards = defineCollection({
  loader: file("src/data/awards.yml"),
  schema: z.object({
    date: z.coerce.date(),
    year: z.number(),
    title: z.object({
      ja: z.string(),
      en: z.string(),
    }),
    organization: z.object({
      ja: z.string(),
      en: z.string(),
    }),
    description: z
      .object({
        ja: z.string().optional(),
        en: z.string().optional(),
      })
      .optional(),
    url: z.url().nullish(), // 外部告知記事へのリンク。無い場合は省略 or null
    showInNews: z.boolean().default(false),
    newsSummary: z
      .object({
        ja: z.string().optional(),
        en: z.string().optional(),
      })
      .optional(),
  }),
});
```

`.nullish()` は `.optional().nullable()` と同義で、YAML上で `url` キーを省略した場合・`url: null` と明示した場合の両方を許容する。

データ例（外部記事がある場合）。

```yaml
- id: "sample-award"
  date: "2026-07-04"
  year: 2026
  title:
    ja: "サンプル受賞"
    en: "Sample Award"
  organization:
    ja: "主催団体"
    en: "Organization"
  description:
    ja: "受賞内容の短い説明。"
    en: "Short description of the award."
  url: "https://example.org/news/award-announcement"
  showInNews: true
  newsSummary:
    ja: "サンプル受賞を追加しました。"
    en: "Added a sample award."
```

データ例（外部記事が無い場合）。

```yaml
- id: "sample-award-2"
  date: "2026-07-04"
  year: 2026
  title:
    ja: "サンプル受賞2"
    en: "Sample Award 2"
  organization:
    ja: "主催団体"
    en: "Organization"
  showInNews: false
```

### 8.3 Awards の表示ルール

- ホームページ（`/ja` `/en`）の `Awards` セクションに、全Awardsを表示する
- Awardsが0件ならトップページの `Awards` セクションは非表示
- 将来的に件数が増えたら `/ja/awards` `/en/awards` を作る（19.2節）
- `showInNews: true` の場合、Newsに自動表示
- `url` が設定されている場合、受賞タイトルをその `url` へのハイパーリンクとして表示する
- `url` が省略・`null` の場合、受賞タイトルはプレーンテキストとして表示する（リンク化しない）
- `description` が設定されている場合、タイトル・団体名の下に表示する
- 表示件数は日付の降順で先頭5件のみとし、6件を超える場合は「もっと見る」ボタンで5件ずつ追加表示する（`LoadMoreList.astro` を使用。12.7節・12.9節）

---

## 9. News 自動生成設計

### 9.1 方針

News は以下を統合して生成する。

1. `manual-news.yml` の手動News
2. Articles の `showInNews: true`
3. Papers の `showInNews: true`
4. Awards の `showInNews: true`

### 9.2 News item の共通型

内部的には以下の形に揃える。

```ts
export type NewsItem = {
  id: string;
  date: string; // ISO 8601 (YYYY-MM-DD) に正規化した文字列で保持する
  source: "manual" | "article" | "paper" | "award";
  title: {
    ja: string;
    en: string;
  };
  url?: {
    ja: string;
    en: string;
  };
};
```

`url` は optional にする。専用ページが存在しない Paper / Award 由来の News item は `url` を持たない（9.5節）。

### 9.3 生成ルール（日付型の統一）

Articles / Papers / Awards の各collectionは、いずれも `date` を `z.coerce.date()` で `Date` オブジェクトとして保持する（7.1・8.2節のスキーマは既にこの前提）。

News生成時は、各ソースから取得した `Date` を `NewsItem.date` に変換する際に、必ずISO文字列（`YYYY-MM-DD`）へ正規化してから格納する。

```ts
// src/utils/news.ts
function toIsoDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}
```

ソート時は `NewsItem.date`（文字列）を `new Date(...)` に戻して比較するのではなく、文字列比較（`YYYY-MM-DD` はロケールに依存せず辞書順=時系列順になる）で降順ソートしてよい。

- `date` の降順で並べる
- トップページでは最新3〜5件のみ表示
- 同じ日付の場合は以下の順で表示する

```txt
manual
paper
article
award
```

### 9.4 News 表示文言

Articles の場合。

```txt
ja: newsSummary があればそれを表示。なければ「記事『title』を公開しました。」
en: newsSummary があればそれを表示。なければ "Published article: title."
```

Papers の場合。

```txt
ja: newsSummary があればそれを表示。なければ「論文『title』を追加しました。」
en: newsSummary があればそれを表示。なければ "Added paper: title."
```

Awards の場合。

```txt
ja: newsSummary があればそれを表示。なければ「受賞歴『title』を追加しました。」
en: newsSummary があればそれを表示。なければ "Added award: title."
```

### 9.5 News item のリンク先が無い場合の扱い

- Article由来のNews item: `getArticleHref()`（6.5節）の結果を `url` に設定する。通常はサイト内の記事詳細ページ（`/ja/articles/[slug]` 等）、記事が外部リンク投稿（6.4節）の場合はその外部URL
- Paper由来のNews item: 現段階ではPapersの専用詳細ページが無いため、`url` は設定しない（ホームページの `#papers` セクションへのアンカーリンクも現時点では作らない）
- Award由来のNews item: 現段階ではAwardsの専用詳細ページが無いため、`url` は設定しない
- `manual-news.yml` の手動Newsは、`url` を明示的に指定した場合のみリンクにする

`NewsList.astro` は `url` が存在するNews itemのみをハイパーリンクとして描画し、`url` が無いNews itemはプレーンテキストとして描画する。将来 `/ja/papers/[id]` や `/ja/awards` のような専用ページが追加されたら、該当ソースの `url` 生成ロジックを更新する。

---

## 10. 空セクション非表示ルール

### 10.1 トップページ

| セクション | 表示条件 |
|---|---|
| News | NewsItem が1件以上ある |
| Bio | Bio が1件以上ある |
| Articles | 記事が1件以上ある |
| Papers | 論文が1件以上ある |
| Awards | 受賞歴が1件以上ある |
| Footer | 常に表示 |

Hero は常に表示する。Research Interestsのデータが空の場合は、Heroの箇条書きに単に追加項目が増えないだけであり、セクション単位の表示制御対象ではない（5.4節）。

### 10.2 ホームページの Papers セクション

| 単位 | 表示条件 |
|---|---|
| Papers セクション全体 | 全Papersが1件以上ある（0件ならセクション自体を非表示） |
| 各カテゴリ | そのカテゴリに paper が1件以上ある |
| 各カテゴリの「もっと見る」ボタン | そのカテゴリの件数が `pageSize`（既定5）を超えている |

### 10.3 Links

| リンク | 表示条件 |
|---|---|
| GitHub | url が空でない |
| X | url が空でない |
| LinkedIn | url が空でない |
| Zenn | url が空でない |
| Google Scholar | url が空でない |
| Email | display と url が空でない |

---

## 11. リポジトリ構成

リポジトリ直下は以下。

```txt
portfolio-site/
├── .github/
│   └── workflows/
│       └── deploy.yml
├── docs/
│   ├── DESIGN.md
│   └── mockup.html
├── public/
│   ├── favicon.svg
│   └── CNAME
├── scripts/
│   └── check-articles.ts
├── src/
│   ├── components/
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   ├── Hero.astro
│   │   ├── NewsList.astro
│   │   ├── Bio.astro
│   │   ├── ArticleEntry.astro
│   │   ├── ArticleList.astro
│   │   ├── LoadMoreList.astro
│   │   ├── PaperList.astro
│   │   ├── AwardsList.astro
│   │   └── LanguageSwitcher.astro
│   ├── content/
│   │   └── articles/
│   │       ├── ja/
│   │       └── en/
│   ├── content.config.ts
│   ├── data/
│   │   ├── profile.yml
│   │   ├── links.yml
│   │   ├── bio.yml
│   │   ├── interests.yml
│   │   ├── papers.yml
│   │   ├── awards.yml
│   │   └── manual-news.yml
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── 404.astro
│   │   ├── ja/
│   │   │   ├── index.astro
│   │   │   └── articles/
│   │   │       └── [slug].astro
│   │   └── en/
│   │       ├── index.astro
│   │       └── articles/
│   │           └── [slug].astro
│   ├── styles/
│   │   └── global.css
│   └── utils/
│       ├── i18n.ts
│       ├── news.ts
│       ├── articles.ts
│       ├── papers.ts
│       ├── links.ts
│       ├── profile.ts
│       └── visibility.ts
├── astro.config.mjs
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
└── README.md
```

`src/content/config.ts` ではなく `src/content.config.ts`（`src/` 直下）である点に注意する。

---

## 12. コンポーネント設計

### 12.1 Header.astro

役割。

- サイト名を表示
- Bio / Articles / Papers / Awards / CV / JA/EN を表示
- スマホではメニューボタンを表示

表示項目。

```txt
Name | Bio | Articles | Papers | Awards | CV | JA/EN
```

Bio / Articles / Papers / Awards はいずれも専用の一覧ページを持たず、ホームページ上の `#bio` `#articles` `#papers` `#awards` セクションへのアンカーリンクにする（`/${locale}/#bio` 等）。他のページから見ても常にホームへ遷移し、該当セクションまでスクロールする（3.1節）。Bioのラベルは日英共通で「Bio」（翻訳しない、セクション見出しと表記を揃える）。

CVはリンク先が未実装のため、実装するまでHeaderから外す。

現状。

```txt
Name | Bio | Articles | Papers | Awards | JA/EN
```

将来（`/ja/cv` 追加後）。

```txt
Name | Bio | Articles | Papers | Awards | CV | JA/EN
```

言語切り替え（JA/EN）は「JA / EN」のトグル形式で表示する。現在の言語はハイライトされたテキスト（リンクなし）、もう一方の言語のみをリンクにする（`LanguageSwitcher.astro`）。

### 12.2 Hero.astro

役割。

- 名前
- 短い自己紹介（箇条書き）
- Research Interests（`profile.yml` の `hero` と同じ箇条書きリストの末尾に、「研究関心: A、B、C」のように1行にまとめて追加する。タグ化しない）
- URLs（X を含む）

表示例。

```txt
Shohei Ichioka

一橋大学ソーシャル・データサイエンス学部。欅研究室所属。
NII 技術補佐員。
llm-jp コーパス構築ワーキンググループ所属。
研究関心: 情報検索（IR）、自然言語処理（NLP）、行政学

GitHub / X / LinkedIn / Zenn / Email
```

### 12.3 NewsList.astro

役割。

- `getNewsItems(locale)` の結果を表示
- 0件の場合はコンポーネント自体を表示しない
- `url` が無いNews itemはプレーンテキストとして表示する（9.5節）

### 12.4 Bio.astro

役割。

- 学歴（Education）と職歴（Work）を縦に並べて表示する（学歴グループ→職歴グループの順、常に1カラム）。各グループの見出しラベルは `PaperList.astro` のカテゴリラベルと同じ見た目（モノスペース・12px・大文字・グレー）
- 学歴は `[期間] 学校名` の1行形式（従来通り、`.bio-list` の左ボーダー付きリスト）
- 職歴は `[期間] 会社名 — 役職名`（会社名・役職名は同じ太さ・サイズで並べる。学歴と同じ文字サイズ・色に統一）を1行目に、その下に説明文（`description`）を表示する
- 期間表記はいずれも `formatBioPeriod()` で統一する（5.3節）
- `links.yml` の LinkedIn URL が設定されている場合、学歴・職歴グループの下に「more →」（日英共通、翻訳しない）のリンクを表示する。LinkedIn URLが空の場合は表示しない
- 学歴・職歴がともに0件ならセクション自体を非表示にする

### 12.5 ArticleEntry.astro

役割。

- 記事タイトル
- description
- date
- link（`getArticleHref()` で算出。`url` があれば外部リンク、無ければサイト内詳細ページ）
- `url` がある記事は新しいタブで開く（`target="_blank" rel="noopener noreferrer"`）。タイトル末尾に外部リンクであることを示す記号（例: ↗）を付ける
- `pinned: true` の記事は日付の横に `PICK UP` ラベルを付ける（6.4.1節）
- 呼び出し側から `hidden` を渡された場合、`<li hidden>` として描画する（6.4.2節の「もっと見る」用。ArticleList.astroが使用）
- 枠のないリスト表示（左のアクセント罫線）で描画する。タグは表示しない

### 12.6 ArticleList.astro

役割。

- `ArticleEntry.astro` を並べた `<ul class="entry-list">` を、`LoadMoreList.astro`（12.7節）でラップして描画する
- 表示件数（既定5件）を超える記事は `hidden` 付きで一緒にレンダリングしておき、「もっと見る」ボタンで5件ずつ表示する（6.4.2節）
- ホームページの `Articles` セクションで、全記事の一覧表示に使用する（専用の記事一覧ページは持たない。3.1節）

### 12.7 LoadMoreList.astro

役割。

- 「表示件数を超えた分は`hidden`付きで一緒にレンダリングしておき、『もっと見る』ボタンで指定件数（`pageSize`, 既定5）ずつ表示する」という挙動を、リストの種類に依存せず提供する共通コンポーネント
- 中身（`<ul>`とその`<li>`群）は呼び出し側が`<slot />`経由で渡す。各`<li>`側で`i >= pageSize`のとき`hidden`を付けるのは呼び出し側の責務
- 全項目が既にHTMLに含まれているため、ボタンのクリックはvanilla JSでの`hidden`属性の付け外しのみで完結する。サーバー通信は発生しない
- 隠れている項目が無くなったらボタンごと消す
- ボタンや非表示要素の検索は常に自身のブロック内に限定してスコープしているため、1ページ内に複数インスタンスを置いても状態が衝突しない
- `ArticleList.astro`（12.6節）、`PaperList.astro`（12.8節、カテゴリごとに個別インスタンス）、`AwardsList.astro`（12.9節）から利用する

### 12.8 PaperList.astro

役割。

- Papersをカテゴリごとに表示
- 空カテゴリを非表示
- カテゴリごとに `LoadMoreList.astro`（12.7節）で個別にラップし、そのカテゴリ単独で5件を超える場合にそのカテゴリだけ「もっと見る」ボタンを表示する（カテゴリをまたいだ一括のもっと見るにはしない）
- `authors` のうち `isSelf: true` の著者名を太字表示
- `doi` / `arxivId` があれば「DOI: ...」「arXiv:...」形式でリンク表示
- その他の paper links（pdf / code / project / bibtex）を表示
- 枠のないリスト表示（左のアクセント罫線）で描画する。トピックタグは表示しない

### 12.9 AwardsList.astro

役割。

- 全Awardsを表示
- 0件なら非表示
- `url` が設定されている場合、タイトルを外部ページへのリンクとして描画
- `url` が無い場合、タイトルをプレーンテキストとして描画
- `description` が設定されている場合、タイトル・団体名の下に表示する
- `LoadMoreList.astro`（12.7節）でラップし、6件を超える場合は「もっと見る」で5件ずつ追加表示する

### 12.10 Footer.astro

役割。

- Email
- GitHub
- X
- LinkedIn
- Zenn
- Google Scholar
- ©

表示例。

```txt
Email / GitHub / X / LinkedIn / Zenn
© 2026 Shohei Ichioka
```

---

## 13. Astro Content Layer API 設計

### 13.1 全体構成

`src/content.config.ts` に、articles（Markdown/MDXの `glob()` loader）と papers / awards / manualNews（YAMLの `file()` loader）をまとめて定義する。

```ts
// src/content.config.ts
import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob, file } from "astro/loaders";

const articles = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/articles" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    pinned: z.boolean().default(false),
    showInNews: z.boolean().default(false),
    newsSummary: z.string().optional(),
    url: z.url().optional(),
  }),
});

const papers = defineCollection({
  loader: file("src/data/papers.yml"),
  schema: z.object({
    category: z.enum(["journal", "conference", "preprint", "workshop", "poster"]),
    date: z.coerce.date(),
    year: z.number(),
    title: z.object({ ja: z.string(), en: z.string() }),
    authors: z.array(
      z.object({ name: z.string(), isSelf: z.boolean().default(false) })
    ),
    venue: z.object({ ja: z.string(), en: z.string() }),
    description: z
      .object({ ja: z.string().optional(), en: z.string().optional() })
      .optional(),
    links: z
      .object({
        pdf: z.url().optional(),
        code: z.url().optional(),
        project: z.url().optional(),
        bibtex: z.url().optional(),
      })
      .default({}),
    doi: z.string().optional(),
    arxivId: z.string().optional(),
    showInNews: z.boolean().default(false),
    newsSummary: z
      .object({ ja: z.string().optional(), en: z.string().optional() })
      .optional(),
  }),
});

const awards = defineCollection({
  loader: file("src/data/awards.yml"),
  schema: z.object({
    date: z.coerce.date(),
    year: z.number(),
    title: z.object({ ja: z.string(), en: z.string() }),
    organization: z.object({ ja: z.string(), en: z.string() }),
    description: z
      .object({ ja: z.string().optional(), en: z.string().optional() })
      .optional(),
    url: z.url().nullish(),
    showInNews: z.boolean().default(false),
    newsSummary: z
      .object({ ja: z.string().optional(), en: z.string().optional() })
      .optional(),
  }),
});

const manualNews = defineCollection({
  loader: file("src/data/manual-news.yml"),
  schema: z.object({
    date: z.coerce.date(),
    title: z.object({ ja: z.string(), en: z.string() }),
    url: z
      .object({ ja: z.string(), en: z.string() })
      .optional(),
  }),
});

export const collections = { articles, papers, awards, manualNews };
```

### 13.2 profile / links / bio / interests の扱い

前述（2.3節）のとおり、これらは Content Layer collection ではなく、`vite-plugin-yaml` による通常の `import` + `src/utils/*.ts` 内での手動Zod検証で扱う。Content Layer 化しないのは、これらが「複数エントリの集合」ではなく「単一の設定オブジェクト」であり、collectionのセマンティクスに合わないためである。

### 13.3 legacy Content Collections API を使わない理由

`defineCollection({ type: "content", schema })` という書き方は Astro 5 で Content Layer API に置き換えられた旧APIであり、`getEntryBySlug` など周辺の関連APIも既に廃止されている。本サイトでは Content Layer API（`loader: glob() / file()`）のみを使う。

---

## 14. 多言語対応設計

### 14.1 URL

```txt
/ja
/en
```

日本語をデフォルトにする。ルートパス `/` の扱いは3.4節を参照。

### 14.2 locale 型

`src/utils/i18n.ts`

```ts
export type Locale = "ja" | "en";

export const locales: Locale[] = ["ja", "en"];

export const defaultLocale: Locale = "ja";

export function getOtherLocale(locale: Locale): Locale {
  return locale === "ja" ? "en" : "ja";
}

export function getAlternatePath(pathname: string, targetLocale: Locale): string {
  return pathname.replace(/^\/(ja|en)/, `/${targetLocale}`);
}
```

### 14.3 astro.config.mjs

```js
import { defineConfig } from "astro/config";
import yaml from "@modyfi/vite-plugin-yaml";

export default defineConfig({
  site: "https://soy-sorce.github.io",
  i18n: {
    locales: ["ja", "en"],
    defaultLocale: "ja",
    routing: {
      prefixDefaultLocale: true,
    },
  },
  vite: {
    plugins: [yaml()],
  },
});
```

注意。

- リポジトリ名が `soy-sorce.github.io` の場合、`base` は不要
- リポジトリ名が `portfolio-site` などの場合、`base: "/portfolio-site"` が必要
- 独自ドメインを使う場合、`site` は独自ドメインにする
- 独自ドメインを使う場合、基本的に `base` は不要
- `prefixDefaultLocale: true` はルートパス `/` を自動リダイレクトしない。`/` の扱いは3.4節を参照

### 14.4 hreflang / canonical 設計

`BaseLayout.astro` の `<head>` に、多言語SEO用の `hreflang` / `canonical` タグを出力する。

```astro
---
// src/layouts/BaseLayout.astro (抜粋)
const { locale, pathname, hasAlternate = true } = Astro.props;
const otherLocale = getOtherLocale(locale);
const alternatePath = getAlternatePath(pathname, otherLocale);
---
<link rel="canonical" href={new URL(pathname, Astro.site)} />
{hasAlternate && (
  <>
    <link rel="alternate" hreflang="ja" href={new URL(getAlternatePath(pathname, "ja"), Astro.site)} />
    <link rel="alternate" hreflang="en" href={new URL(getAlternatePath(pathname, "en"), Astro.site)} />
    <link rel="alternate" hreflang="x-default" href={new URL(getAlternatePath(pathname, "ja"), Astro.site)} />
  </>
)}
```

記事詳細ページ（`/ja/articles/[slug]`）は、対になる言語の記事が存在するとは限らない（6.6節）。存在しない場合に `hreflang="en"` が404ページを指してしまうと逆効果なので、記事詳細ページを描画する際は事前に対訳記事の有無を確認し、無い場合は `hasAlternate={false}` を渡して自身の言語のみの `canonical` を出力する。対訳記事が `url`（外部リンク投稿, 6.4節）を持つ場合はサイト内ページが存在しないため、これも「対訳なし」として扱う。

```ts
// 呼び出し側のイメージ
const pair = await getArticleCounterpart(locale, slug); // 対訳記事があれば返す, 無ければ undefined
const hasAlternate = Boolean(pair && !isExternalArticle(pair));
```

---

## 15. GitHub Pages / CI-CD 設計

### 15.1 GitHub Pages 設定

GitHubリポジトリで以下を設定する。

```txt
Settings
→ Pages
→ Build and deployment
→ Source: GitHub Actions
```

### 15.2 deploy.yml

Astro公式のGitHub Pages Actionを使う。
`pnpm-lock.yaml` があれば pnpm を自動検出できる。

`.github/workflows/deploy.yml`

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout your repository using git
        uses: actions/checkout@v6

      - name: Install, build, and upload your site
        uses: withastro/action@v6
        with:
          package-manager: pnpm@latest
          build-cmd: pnpm run build

  deploy:
    needs: build
    runs-on: ubuntu-latest

    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}

    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v5
```

### 15.3 package.json

```json
{
  "name": "portfolio-site",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@10.0.0",
  "scripts": {
    "dev": "astro dev",
    "build": "astro check && astro build",
    "preview": "astro preview",
    "check:articles": "tsx scripts/check-articles.ts"
  },
  "dependencies": {
    "astro": "latest",
    "@astrojs/mdx": "latest",
    "zod": "latest",
    "@modyfi/vite-plugin-yaml": "latest"
  },
  "devDependencies": {
    "typescript": "latest",
    "tsx": "latest"
  }
}
```

### 15.4 ローカル開発コマンド

```bash
pnpm install
pnpm dev
pnpm build
pnpm preview
pnpm check:articles
```

### 15.5 注意点

- `pnpm-lock.yaml` は必ずコミットする
- GitHub Pages の Source は GitHub Actions にする
- `main` ブランチに push したら自動デプロイ
- 独自ドメインを使う場合は `public/CNAME` を置く
- 独自ドメインを使う場合、`astro.config.mjs` の `site` を独自ドメインに変更する

---

## 16. 更新・追加フロー

### 16.1 記事を追加する

日本語記事。

```txt
src/content/articles/ja/bm25-mmr.mdx
```

英語記事。

```txt
src/content/articles/en/bm25-mmr.mdx
```

frontmatter 例。

```mdx
---
title: "BM25 + MMR 検索パイプラインの設計"
description: "BM25検索とMMRリランキングを組み合わせた検索パイプラインの設計メモ。"
date: "2026-07-04"
showInNews: true
newsSummary: "BM25 + MMR に関する記事を公開しました。"
---

本文を書く。
```

反映。

```bash
pnpm run check:articles   # 日英ペアリングの警告を確認（任意）
git add .
git commit -m "Add article: bm25-mmr"
git push
```

### 16.2 論文を追加する

`src/data/papers.yml` に追加する（トップレベルは素の配列）。

```yaml
- id: "sample-paper"
  category: "preprint"
  date: "2026-07-04"
  year: 2026
  title:
    ja: "サンプル論文タイトル"
    en: "Sample Paper Title"
  authors:
    - name: "Shohei Ichioka"
      isSelf: true
  venue:
    ja: "arXiv"
    en: "arXiv"
  links:
    pdf: ""
    code: ""
    project: ""
    bibtex: ""
  doi: ""
  arxivId: "2607.00000"
  showInNews: true
  newsSummary:
    ja: "プレプリントを公開しました。"
    en: "Published a preprint."
```

### 16.3 受賞歴を追加する

`src/data/awards.yml` に追加する（トップレベルは素の配列）。外部の告知記事がある場合は `url` に設定する。

```yaml
- id: "sample-award"
  date: "2026-07-04"
  year: 2026
  title:
    ja: "サンプル受賞"
    en: "Sample Award"
  organization:
    ja: "主催団体"
    en: "Organization"
  description:
    ja: "受賞内容の短い説明。"
    en: "Short description of the award."
  url: "https://example.org/news/award-announcement"
  showInNews: true
  newsSummary:
    ja: "サンプル受賞を追加しました。"
    en: "Added a sample award."
```

外部の告知記事が無い場合は `url` を省略する。

### 16.4 News を手動追加する

`src/data/manual-news.yml` に追加する（トップレベルは素の配列）。

```yaml
- id: "site-launched"
  date: "2026-07-04"
  title:
    ja: "ポートフォリオサイトを公開しました。"
    en: "Launched my portfolio website."
  url:
    ja: "/ja"
    en: "/en"
```

---

## 17. 実装ステップ

### Step 1: Astro プロジェクト作成

```bash
pnpm create astro@latest portfolio-site
cd portfolio-site
pnpm install
```

### Step 2: MDX / YAML プラグイン追加

```bash
pnpm astro add mdx
pnpm add @modyfi/vite-plugin-yaml zod
pnpm add -D tsx
```

### Step 3: ディレクトリ作成

```bash
mkdir -p src/components
mkdir -p src/layouts
mkdir -p src/styles
mkdir -p src/utils
mkdir -p src/data
mkdir -p src/content/articles/ja
mkdir -p src/content/articles/en
mkdir -p src/pages/ja/articles
mkdir -p src/pages/en/articles
mkdir -p scripts
mkdir -p .github/workflows
```

### Step 4: 初期データ作成

以下を作る。

```txt
src/content.config.ts
src/data/profile.yml
src/data/links.yml
src/data/bio.yml
src/data/interests.yml
src/data/papers.yml     # 素の配列 []
src/data/awards.yml     # 素の配列 []
src/data/manual-news.yml # 素の配列 []
```

### Step 5: レイアウト・コンポーネント作成

以下を作る。

```txt
src/layouts/BaseLayout.astro
src/components/Header.astro
src/components/Footer.astro
src/components/Hero.astro
src/components/NewsList.astro
src/components/Bio.astro
src/components/ArticleEntry.astro
src/components/ArticleList.astro
src/components/LoadMoreList.astro
src/components/PaperList.astro
src/components/AwardsList.astro
src/components/LanguageSwitcher.astro
```

### Step 6: ページ作成

```txt
src/pages/index.astro       # / → /ja へのmeta refreshリダイレクト（3.4節）
src/pages/404.astro         # カスタム404（3.5節）
src/pages/ja/index.astro
src/pages/en/index.astro
src/pages/ja/articles/[slug].astro
src/pages/en/articles/[slug].astro
```

### Step 7: 検証スクリプト作成

```txt
scripts/check-articles.ts
```

### Step 8: GitHub Actions 設定

`.github/workflows/deploy.yml` を作成する。

### Step 9: GitHub Pages 設定

GitHub のリポジトリ設定で Source を GitHub Actions にする。

### Step 10: push

```bash
git add .
git commit -m "Initial portfolio site"
git push origin main
```

---

## 18. MVPの完成条件

以下を満たせばMVP完成。

- `/` にアクセスすると `/ja/` にリダイレクトされる
- `/ja` が表示される
- `/en` が表示される
- `/存在しないパス` にアクセスするとカスタム404ページが表示される
- Header が表示される（Xリンクを含む）
- Hero が表示される（Research Interestsの箇条書きを含む）
- Bio が表示される
- Footer が表示される
- 空の Articles / Papers / Awards / News がトップページに出ない
- 記事詳細ページ（`/ja/articles/[slug]` `/en/articles/[slug]`）が動く
- Articles / Papers の表示がいずれもホームページ上でリスト形式になり、タグが表示されない
- `papers.yml` に1件追加すると、ホームページの Papers セクションに表示される
- `showInNews: true` にすると News に表示される
- Papers の `doi` / `arxivId` を設定すると、リンク付きで表示される
- Award の `url` を設定するとタイトルがリンクになり、未設定だとプレーンテキストになる
- Awardsが6件を超えると「もっと見る」ボタンが表示され、クリックで5件ずつ追加表示される
- Papersの各カテゴリが6件を超えると、そのカテゴリ単位で「もっと見る」ボタンが表示される
- `pnpm run check:articles` が日英ペア欠けを警告として出力する
- 記事詳細ページに `hreflang` タグが正しく出力される（対訳が無い場合は自身の言語のみ）
- 記事に `url` を設定すると、ホームページ・Newsのタイトルが外部リンクになり、サイト内の記事詳細ページは生成されない
- 記事に `pinned: true` を設定すると、日付に関わらずホームページの先頭に `PICK UP` ラベル付きで表示される
- 記事が6件以上あるとき、ホームページの Articles セクションに「もっと見る」ボタンが表示され、クリックで5件ずつ追加表示される
- Header の Articles / Papers / Awards リンクが、いずれもホームページの該当セクションへのアンカーリンクとして機能する
- 言語切り替えが「JA / EN」のトグル形式で表示され、現在の言語がハイライトされる
- main に push すると GitHub Pages にデプロイされる

---

## 19. 後から追加する候補

初期スコープには含めない候補を記録しておく。

### 19.1 CVページ

```txt
/ja/cv
/en/cv
```

PDFを置く場合。

```txt
public/cv/cv_ja.pdf
public/cv/cv_en.pdf
```

### 19.2 Awards一覧ページ

```txt
/ja/awards
/en/awards
```

実装時は9.5節のNews `url` 生成ロジックも合わせて更新する。

### 19.3 News一覧ページ

```txt
/ja/news
/en/news
```

### 19.4 検索機能

記事数が増えたら、クライアントサイド検索を追加する。初期は不要。

### 19.5 CMS

Markdown/YAML管理が面倒になったら、Decap CMS などを検討する。初期は不要。

### 19.6 Education / Affiliations の構造化

現状 Bio / Hero にプレーンテキストで書いている学歴・所属（一橋大学、York University、NII技術補佐員、llm-jp WG等）を、開始日・終了日を持つ構造化データにする案。件数が増えたり在籍状況が頻繁に変わるようなら検討する。

### 19.7 Talks / Presentations

Papersの `poster` カテゴリとは別に、論文化されない学会発表・LT登壇等を管理する案。

### 19.8 Projects / OSS セクション

エンジニア色を強めるなら、GitHub上のプロジェクト紹介セクションを追加する案。

### 19.9 RSS / Sitemap

`@astrojs/rss` によるArticlesのフィード配信、`@astrojs/sitemap` によるsitemap.xml生成。

### 19.10 OGP画像 / meta description

SNSシェア用の `ogImage` frontmatter、BaseLayoutでのmeta description設計。

### 19.11 Draft機能

Articles frontmatterに `draft: true` を追加し、dev環境でのみ表示・buildでは除外する案。

### 19.12 研究者識別子の追加

`links.yml` に ORCID iD を追加する案（Google Scholarに加えて）。

### 19.13 Awardsのカテゴリ分類

学内賞・学会賞・奨学金などの `category` フィールドを追加し、件数が増えたときにグルーピングする案。

### 19.14 Articles / Papers 専用一覧ページ

```txt
/ja/articles
/en/articles
/ja/papers
/en/papers
```

記事・論文の件数が増え、ホームページ1枚に収まりづらくなった場合の候補として、専用の一覧ページを追加する。

---

## 20. 参考資料

- Astro GitHub Pages Deploy Guide
  https://docs.astro.build/en/guides/deploy/github/

- Astro Content Collections（概要）
  https://docs.astro.build/en/guides/content-collections/

- Astro Content Layer API — Loader Reference（`glob()` / `file()`）
  https://docs.astro.build/en/reference/content-loader-reference/

- Astro v5 アップグレードガイド（legacy Content Collections からの移行）
  https://docs.astro.build/en/guides/upgrade-to/v5/

- Astro i18n Routing
  https://docs.astro.build/en/guides/internationalization/

- pnpm GitHub Action
  https://github.com/pnpm/action-setup

- GitHub Pages Custom Workflows
  https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
