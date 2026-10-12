"""워크플로우 표(xlsx, 없으면 csv)를 읽어 site/workflow-data.js를 만든다.
(워크플로우 · 요약 · 범례 · 볼륨 기준 시트. 개인별 실적 시트는 출처 줄과 개수 통계만 읽는다.)

사용: python site/build_data.py
- 표준 라이브러리만 사용한다 (openpyxl 불필요).
- 값은 표에 적힌 그대로 옮기고, 아무것도 계산하거나 채워 넣지 않는다.
"""
import csv
import datetime
import html
import json
import re
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
XLSX = ROOT / "앱디팀_워크플로우.xlsx"
CSV = ROOT / "앱디팀_워크플로우.csv"
OUT = Path(__file__).resolve().parent / "workflow-data.js"

WORKFLOW_SHEET = "워크플로우"
SUMMARY_SHEET = "요약"
LEGEND_SHEET = "범례·작성 가이드"
VOLUME_SHEET = "볼륨 기준"
PERF_SHEET = "실적 (예상 vs 투입)"


def schedule_info(rows):
    """실적 시트에서 일정 계산 규칙(출처 줄)과 개수 통계만 뽑는다. 이름 · 프로젝트 · 개별 값은 넣지 않는다."""
    if not rows:
        return {}
    head = [h.strip() for h in rows[0]]
    note = next((r[0].strip() for r in rows if r and r[0].strip().startswith("출처")), "")

    def nums(col):
        if col not in head:
            return []
        i = head.index(col)
        out = []
        for r in rows[1:]:
            try:
                out.append(float(r[i]))
            except (IndexError, ValueError):
                pass
        return out

    def multiple(v, step):
        return abs(v / step - round(v / step)) < 1e-9

    exp, used = nums("예상일"), nums("투입일")
    return {
        "note": note,
        "expectedCount": len(exp), "expectedHalfDay": sum(multiple(v, 0.5) for v in exp),
        "inputCount": len(used), "inputHourly": sum(multiple(v, 0.125) for v in used),
    }


def col_index(ref):
    letters = re.match(r"[A-Z]+", ref).group(0)
    n = 0
    for ch in letters:
        n = n * 26 + (ord(ch) - 64)
    return n - 1


def read_xlsx(path):
    z = zipfile.ZipFile(path)
    shared = []
    if "xl/sharedStrings.xml" in z.namelist():
        xml = z.read("xl/sharedStrings.xml").decode("utf-8")
        for si in re.findall(r"<si>(.*?)</si>", xml, re.S):
            shared.append(html.unescape("".join(re.findall(r"<t[^>]*>([^<]*)</t>", si))))
    wb = z.read("xl/workbook.xml").decode("utf-8")
    rels = z.read("xl/_rels/workbook.xml.rels").decode("utf-8")
    targets = {}
    for rel in re.findall(r"<Relationship [^>]*>", rels):
        rid = re.search(r'Id="([^"]+)"', rel).group(1)
        targets[rid] = re.search(r'Target="([^"]+)"', rel).group(1)
    sheets = {}
    for tag in re.findall(r"<sheet [^>]*>", wb):
        name = html.unescape(re.search(r'name="([^"]+)"', tag).group(1))
        rid = re.search(r'r:id="([^"]+)"', tag).group(1)
        target = targets[rid].lstrip("/")
        path_in_zip = target if target.startswith("xl/") else "xl/" + target
        sheets[name] = read_sheet(z.read(path_in_zip).decode("utf-8"), shared)
    return sheets


def read_sheet(xml, shared):
    rows = []
    for row in re.findall(r"<row[^>]*>(.*?)</row>", xml, re.S):
        cells = {}
        for attrs, body in re.findall(r"<c ([^>]*?)(?:/>|>(.*?)</c>)", row, re.S):
            ref = re.search(r'r="([A-Z]+\d+)"', attrs).group(1)
            kind = re.search(r't="(\w+)"', attrs)
            value = re.search(r"<v>(.*?)</v>", body or "", re.S)
            text = None
            if kind and kind.group(1) == "s" and value:
                text = shared[int(value.group(1))]
            elif kind and kind.group(1) == "inlineStr":
                text = html.unescape("".join(re.findall(r"<t[^>]*>([^<]*)</t>", body or "")))
            elif value:
                text = html.unescape(value.group(1))
            if text is not None:
                cells[col_index(ref)] = text
        width = max(cells) + 1 if cells else 0
        rows.append([cells.get(i, "") for i in range(width)])
    return rows


def type_colors(path, sheet_name, column_name):
    """'유형' 열 셀의 배경색을 그대로 읽는다 → {'회의': '#DAF2D0', ...}"""
    z = zipfile.ZipFile(path)
    styles = z.read("xl/styles.xml").decode("utf-8")
    fills = re.findall(r"<fill>(.*?)</fill>", re.search(r"<fills[^>]*>(.*?)</fills>", styles, re.S).group(1), re.S)
    xfs = re.findall(r"<xf [^>]*?(?:/>|>.*?</xf>)", re.search(r"<cellXfs[^>]*>(.*?)</cellXfs>", styles, re.S).group(1), re.S)

    def fill_rgb(style_index):
        fid = re.search(r'fillId="(\d+)"', xfs[style_index])
        if not fid:
            return None
        rgb = re.search(r'<fgColor [^>]*rgb="([0-9A-Fa-f]{8})"', fills[int(fid.group(1))])
        return "#" + rgb.group(1)[2:].upper() if rgb else None

    shared = [html.unescape("".join(re.findall(r"<t[^>]*>([^<]*)</t>", si)))
              for si in re.findall(r"<si>(.*?)</si>", z.read("xl/sharedStrings.xml").decode("utf-8"), re.S)]
    wb = z.read("xl/workbook.xml").decode("utf-8")
    rels = z.read("xl/_rels/workbook.xml.rels").decode("utf-8")
    targets = {re.search(r'Id="([^"]+)"', r).group(1): re.search(r'Target="([^"]+)"', r).group(1)
               for r in re.findall(r"<Relationship [^>]*>", rels)}
    rid = next(re.search(r'r:id="([^"]+)"', t).group(1) for t in re.findall(r"<sheet [^>]*>", wb)
               if html.unescape(re.search(r'name="([^"]+)"', t).group(1)) == sheet_name)
    target = targets[rid].lstrip("/")
    xml = z.read(target if target.startswith("xl/") else "xl/" + target).decode("utf-8")
    colors, col = {}, None
    for attrs, body in re.findall(r"<c ([^>]*?)(?:/>|>(.*?)</c>)", xml, re.S):
        ref = re.search(r'r="([A-Z]+)(\d+)"', attrs)
        value = re.search(r"<v>(.*?)</v>", body or "", re.S)
        style = re.search(r's="(\d+)"', attrs)
        if not value or 't="s"' not in attrs:
            continue
        text = shared[int(value.group(1))].strip()
        if col is None:
            if text == column_name:
                col = ref.group(1)
            continue
        if ref.group(1) == col and text and text not in colors and style:
            rgb = fill_rgb(int(style.group(1)))
            if rgb:
                colors[text] = rgb
    return colors


def trim(rows):
    """뒤쪽 빈 행을 지우고, 모든 행을 같은 칸 수로 맞춘다."""
    rows = [r for r in rows]
    while rows and not any(c.strip() for c in rows[-1]):
        rows.pop()
    return rows


def main():
    payload = {"generatedAt": datetime.datetime.now().strftime("%Y-%m-%d %H:%M")}
    if XLSX.exists():
        sheets = read_xlsx(XLSX)
        if WORKFLOW_SHEET not in sheets:
            sys.exit(f"'{WORKFLOW_SHEET}' 시트를 찾지 못했습니다: {list(sheets)}")
        table = trim(sheets[WORKFLOW_SHEET])
        payload["source"] = {"file": XLSX.name, "sheet": WORKFLOW_SHEET}
        payload["summary"] = trim(sheets.get(SUMMARY_SHEET, []))
        payload["legend"] = trim(sheets.get(LEGEND_SHEET, []))
        payload["typeColors"] = type_colors(XLSX, WORKFLOW_SHEET, "유형")
        payload["volume"] = trim(sheets.get(VOLUME_SHEET, []))
        payload["schedule"] = schedule_info(sheets.get(PERF_SHEET, []))
    elif CSV.exists():
        with open(CSV, encoding="utf-8-sig", newline="") as f:
            table = trim(list(csv.reader(f)))
        payload["source"] = {"file": CSV.name, "sheet": None}
        payload["summary"] = []
        payload["legend"] = []
        payload["volume"] = []
        payload["schedule"] = {}
    else:
        sys.exit("워크플로우 표 파일(xlsx 또는 csv)이 없습니다.")

    header = [h.strip() for h in table[0]]
    rows = []
    for r in table[1:]:
        r = (r + [""] * len(header))[: len(header)]
        if any(c.strip() for c in r):
            rows.append([c.strip() for c in r])
    payload["header"] = header
    payload["rows"] = rows

    js = "// 자동 생성 파일입니다. 직접 고치지 말고 build_data.py를 다시 실행하세요.\n"
    js += "window.WORKFLOW_DATA = " + json.dumps(payload, ensure_ascii=False, indent=1) + ";\n"
    OUT.write_text(js, encoding="utf-8")
    print(f"{payload['source']['file']} → {OUT.name}: 작업 {len(rows)}행, 열 {len(header)}개")


if __name__ == "__main__":
    main()
