# super-taguette

A fork of [Taguette](https://www.taguette.org/), the open-source qualitative data analysis tool. It keeps everything upstream does, but reworks the UI and interactions so that **coding takes as few actions as possible**.

[日本語はこちら](#super-taguette-日本語)

- **Tag as you select** — select text and a tag list appears on the spot; one click highlights. Type a name and press Enter to create a new tag right there
- **Edit in place** — click an existing highlight to toggle its tags or delete it, no modal needed
- **Per-tag colors** — pick from a palette or any custom color. Overlapping highlights blend visibly, and clicking an overlap lets you choose which one to edit
- **Seven color themes** — Soft Era, Rosé Pine Dawn, Catppuccin Latte, Everforest Light, Nord Light, Rosé Pine (dark), Catppuccin Mocha (dark), switchable from the navbar
- **Japanese UI**, plus `.txt` / `.md` import without Calibre
- Codebook exports (CSV / Excel / QDC-XML) include tag colors

Data stays compatible with upstream (one extra column on the `tags` table for colors; an existing database is migrated automatically on first start, with a `.bak` backup). Same BSD-3-Clause license as Taguette.

## Install (just use it)

Requires Python 3.10+.

```bash
pipx install git+https://github.com/toremolo72/super-taguette.git@softera-ja
taguette
```

Your browser opens at http://localhost:7465/. Keep the terminal open while you work.

- Data is stored in `~/.local/share/taguette/taguette.sqlite3` (one file — copy it to back up)
- Use another location: `taguette --database ~/path/to/project.sqlite3`
- The UI follows your browser language (Japanese if your browser is set to Japanese)
- Word / PDF import needs [Calibre](https://calibre-ebook.com/). On macOS, start with
  `CALIBRE=/Applications/calibre.app/Contents/MacOS taguette`
- Update: `pipx install --force git+https://github.com/toremolo72/super-taguette.git@softera-ja`
- Go back to upstream: `pipx uninstall taguette && pipx install taguette`

## Develop (hack on it)

```bash
git clone https://github.com/toremolo72/super-taguette.git
cd super-taguette
python3 -m venv .venv
source .venv/bin/activate
pip install -e . babel
scripts/update_translations.sh        # compile translation catalogs
taguette --debug --database ./dev.sqlite3
```

`--debug` restarts the server when Python files change; JS / CSS / templates only need a browser reload.

| What | Where |
|---|---|
| Colors, spacing, themes | `taguette/static/css/theme.css` (each theme is one `:root[data-theme=…]` block) |
| Page structure | `taguette/templates/project.html`, `index.html`, `base.html` |
| Quick tag picker, highlight rendering | `taguette/static/js/taguette.js` (`quickpick…`, `highlightSelection`) |
| Japanese strings | `po/main_ja.po`, `po/javascript_ja.po` → run `scripts/update_translations.sh` |
| Tag color API / DB | `taguette/web/api.py`, `taguette/database/models.py`, `taguette/migrations/versions/c0104a7e21b3_add_tag_color.py` |

To add a theme: add a `:root[data-theme="my-theme"] { … }` block to `theme.css` (including `--tag-palette`) and one `<a data-theme-choice="my-theme">` line to the dropdown in `base.html`.

Upstream: https://gitlab.com/remram44/taguette (mirror: https://github.com/remram44/taguette). To pull upstream changes: `git pull origin master`.

---

# super-taguette（日本語）

質的データ分析ツール [Taguette](https://www.taguette.org/) のフォークです。本家の機能はそのままに、**できるだけ少ない操作数でコーディング作業が進められること**を目標に、UI とインタラクションをカスタムしています。

- **選択するだけでタグ付け** — テキストを選択するとその場にタグ一覧が出て、クリック 1 回でハイライト。名前を打って Enter すれば新しいタグをその場で作成
- **その場で編集** — 既存のハイライトをクリックすれば、モーダルなしでタグの付け外し・削除
- **タグごとの色** — パレットから選ぶか任意の色を指定。重なったハイライトも色で見分けられ、クリックでどれを編集するか選べる
- **7 種類のカラーテーマ** — Soft Era / Rosé Pine Dawn / Catppuccin Latte / Everforest Light / Nord Light / Rosé Pine（ダーク）/ Catppuccin Mocha（ダーク）をナビバーから切替
- **日本語 UI**、`.txt` / `.md` の Calibre 不要の読み込み
- コードブック書き出し（CSV / Excel / QDC-XML）にタグ色を含む

データ形式は本家と互換です（タグ色のために `tags` テーブルに 1 列追加。既存のデータベースは初回起動時に自動変換され、`.bak` バックアップが作られます）。ライセンスは本家と同じ BSD-3-Clause です。

## インストール（使うだけ）

Python 3.10 以上が必要です。

```bash
pipx install git+https://github.com/toremolo72/super-taguette.git@softera-ja
taguette
```

ブラウザで http://localhost:7465/ が開きます。作業中はターミナルを閉じないでください。

- データは `~/.local/share/taguette/taguette.sqlite3` に保存されます（1 ファイル。バックアップはこれをコピー）
- 別の場所に保存: `taguette --database ~/path/to/project.sqlite3`
- 表示言語はブラウザの言語設定に従います（日本語設定なら日本語）
- Word / PDF の読み込みには [Calibre](https://calibre-ebook.com/) が必要です。macOS では
  `CALIBRE=/Applications/calibre.app/Contents/MacOS taguette` のように起動してください
- 更新: `pipx install --force git+https://github.com/toremolo72/super-taguette.git@softera-ja`
- 公式版に戻す: `pipx uninstall taguette && pipx install taguette`

## 開発（一緒に改造する）

```bash
git clone https://github.com/toremolo72/super-taguette.git
cd super-taguette
python3 -m venv .venv
source .venv/bin/activate
pip install -e . babel
scripts/update_translations.sh        # 翻訳ファイルをコンパイル
taguette --debug --database ./dev.sqlite3
```

`--debug` を付けると Python ファイルの変更で自動再起動します。JS / CSS / テンプレートはブラウザの再読み込みだけで反映されます。

| いじる場所 | ファイル |
|---|---|
| 配色・余白・テーマ | `taguette/static/css/theme.css`（テーマは `:root[data-theme=…]` ブロック 1 つずつ） |
| 画面の構造 | `taguette/templates/project.html`, `index.html`, `base.html` |
| クイックタグ付け・ハイライト描画 | `taguette/static/js/taguette.js`（`quickpick…`, `highlightSelection`） |
| 日本語訳 | `po/main_ja.po`, `po/javascript_ja.po` → `scripts/update_translations.sh` |
| タグ色の API / DB | `taguette/web/api.py`, `taguette/database/models.py`, `taguette/migrations/versions/c0104a7e21b3_add_tag_color.py` |

テーマを追加するには、`theme.css` に `:root[data-theme="my-theme"] { … }` ブロック（`--tag-palette` も含む）を足し、`base.html` のドロップダウンに `<a data-theme-choice="my-theme">` を 1 行足すだけです。

本家: https://gitlab.com/remram44/taguette（ミラー: https://github.com/remram44/taguette）。本家の更新を取り込むには `git pull origin master`。
