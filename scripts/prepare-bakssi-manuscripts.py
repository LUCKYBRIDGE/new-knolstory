#!/usr/bin/env python3
"""Build the three 박씨전 manuscript inputs from their editorial Markdown."""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs/reference/bakssi"
OUTPUT_DIR = ROOT / "packages/compatibility/src"
CUT_ID = re.compile(r"[A-Z][0-9]{2}")
CHAPTER_HEADING = re.compile(r"### ([0-9]+)장(?: ([A-Z][A-Z0-9]*))? · (.+)")


def markdown_rows(lines: list[str]):
    for line in lines:
        if line.startswith("| "):
            yield [cell.strip() for cell in line.strip("|").split("|")]


def choices_from(header: str):
    choices = {}
    for row in markdown_rows(header.splitlines()):
        if CUT_ID.fullmatch(row[0]):
            cut_id, label, target, _ = row
            if not label or not CUT_ID.fullmatch(target):
                raise ValueError(f"{cut_id}: 선택 문구 또는 도착 컷을 확인해 주세요.")
            choices.setdefault(cut_id, []).append({"label": label, "target": target})
    return choices


def parse_manuscript(path: Path, branching: bool):
    content = path.read_text(encoding="utf-8")
    header, manuscript = content.split("## 장·컷 원고\n", maxsplit=1)
    intro, = re.findall(r"^\*\*서재 소개\*\*\s+(.+)$", header, re.MULTILINE)
    choices = choices_from(header) if branching else {}
    chapters = []
    chapter = None
    ids = set()
    for line in manuscript.splitlines():
        if line.startswith("## "):
            break
        if line.startswith("### "):
            match = CHAPTER_HEADING.fullmatch(line)
            if not match:
                raise ValueError(f"{path.name}: 장 제목을 확인해 주세요. {line}")
            number, branch, title = match.groups()
            chapter = {"number": int(number), "branch": branch or "", "title": title, "cuts": []}
            chapters.append(chapter)
        if not line.startswith("| "):
            continue
        row, = markdown_rows([line])
        if row[0] in ("컷", "---"):
            continue
        if not chapter or not CUT_ID.fullmatch(row[0]) or len(row) != (5 if branching else 4) or not all(row):
            raise ValueError(f"{path.name}: 컷 표를 확인해 주세요. {line}")
        cut_id, speaker, text, direction, *link = row
        if cut_id in ids:
            raise ValueError(f"{path.name}: {cut_id} 컷이 중복되어 있어요.")
        ids.add(cut_id)
        options = choices.pop(cut_id, [])
        cut = {"id": cut_id, "speaker": speaker, "text": text, "direction": direction}
        if branching:
            targets = link[0].split(" / ")
            if options:
                if [choice["target"] for choice in options] != targets:
                    raise ValueError(f"{cut_id}: 분기표와 컷의 도착점이 달라요.")
                cut["choices"] = options
            elif len(targets) != 1:
                raise ValueError(f"{cut_id}: 컷의 분기 문구가 없어요.")
            else:
                cut["next"] = None if targets[0] == "끝" else targets[0]
        chapter["cuts"].append(cut)
    if choices or not chapters or any(not item["cuts"] for item in chapters):
        raise ValueError(f"{path.name}: 연결되지 않은 선택지 또는 빈 장이 있어요.")
    for item in chapters:
        for cut in item["cuts"]:
            targets = [choice["target"] for choice in cut.get("choices", [])]
            if cut.get("next") is not None:
                targets.append(cut["next"])
            if any(target not in ids for target in targets):
                raise ValueError(f'{cut["id"]}: 원고에 없는 컷을 가리켜요.')
    return {"intro": intro, "chapters": chapters}


def parse_picture_book(path: Path):
    content = path.read_text(encoding="utf-8")
    title, = re.findall(r"^\*\*표지 제목\*\*\s+([^\n]+)$", content, re.MULTILINE)
    intro, = re.findall(r"^\*\*표지 소개\*\*\s+([^\n]+)$", content, re.MULTILINE)
    page_blocks = re.split(r"^## ([0-9]+)쪽 · ([^\n]+)\n", content, flags=re.MULTILINE)[1:]
    pages = []
    for number, name, block in zip(page_blocks[::3], page_blocks[1::3], page_blocks[2::3]):
        order = int(number)
        text, marker, _ = block.partition("\n*삽화 · ")
        if order != len(pages) + 1 or not text.strip() or not marker:
            raise ValueError(f"{path.name}: {number}쪽의 제목, 본문, 삽화 메모를 확인해 주세요.")
        pages.append({
            "id": f"bakssi-picture-{order:02}",
            "order": order,
            "title": name.strip(),
            "text": text.strip(),
            "backgroundId": f"bakssi-shortstory-page-{order:02}",
            "leftAssetId": "",
            "rightAssetId": "",
        })
    if not pages:
        raise ValueError(f"{path.name}: 숏스토리 본문이 비어 있어요.")
    return {
        "id": "shortstory-original-bakssi",
        "title": title.strip(),
        "description": intro.strip(),
        "authorDisplayName": "고전 소설 · 놀퀴즈",
        "source": {"kind": "preset", "presetId": "bakssi-shortstory-v1"},
        "cover": {
            "backgroundId": "bakssi-shortstory-cover",
            "characterId": "",
            "authorNote": "피화당에 켜진 불빛을 떠올려 보세요. 여러분이라면 어느 장면을 한 쪽 더 그리고 싶나요?",
        },
        "pages": pages,
        "updatedAt": "2026-11-27T00:00:00.000Z",
    }


def encode(book):
    """Keep one generated line per cut so reviewing prose changes stays manageable."""
    def dump(value):
        return json.dumps(value, ensure_ascii=False)

    lines = ["{", f'  "intro": {dump(book["intro"])},', '  "chapters": [']
    for index, chapter in enumerate(book["chapters"]):
        if index:
            lines[-1] += ","
        metadata = {key: value for key, value in chapter.items() if key != "cuts"}
        lines.append(f'    {dump(metadata)[:-1]}, "cuts": [')
        lines += [
            "      " + dump(cut) + ("," if cut_index + 1 < len(chapter["cuts"]) else "")
            for cut_index, cut in enumerate(chapter["cuts"])
        ]
        lines.append("    ]}")
    return lines + ["  ]", "}"]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Check the generated file without writing it.")
    args = parser.parse_args()
    classic = parse_manuscript(SOURCE / "박씨전_원작.md", branching=False)
    knolstory = parse_manuscript(SOURCE / "박씨전_놀스토리.md", branching=True)
    classic_lines, knolstory_lines = encode(classic), encode(knolstory)
    combined = ["{", '  "classic": ' + classic_lines[0], *("  " + line for line in classic_lines[1:])]
    combined[-1] += ","
    combined += ['  "knolstory": ' + knolstory_lines[0], *("  " + line for line in knolstory_lines[1:]), "}"]
    picture_book = parse_picture_book(SOURCE / "박씨전_숏스토리.md")
    outputs = {
        OUTPUT_DIR / "bakssi-manuscripts.json": "\n".join(combined) + "\n",
        OUTPUT_DIR / "bakssi-shortstory.json": json.dumps(picture_book, ensure_ascii=False, indent=2) + "\n",
    }
    for output, generated in outputs.items():
        if args.check:
            if not output.is_file() or output.read_text(encoding="utf-8") != generated:
                raise SystemExit(f"{output.name} 데이터가 달라요. python3 scripts/prepare-bakssi-manuscripts.py를 실행하세요.")
        else:
            output.write_text(generated, encoding="utf-8")
    for label, book in (("원작", classic), ("놀스토리", knolstory)):
        print(f"{label} {len(book['chapters'])}장 · {sum(len(chapter['cuts']) for chapter in book['chapters'])}컷")
    print(f"숏스토리 표지와 본문 {len(picture_book['pages'])}쪽")


if __name__ == "__main__":
    main()
