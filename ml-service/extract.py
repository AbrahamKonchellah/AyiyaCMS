"""Rule-based extraction of court dates and deadlines from legal text.

No training is involved: patterns find dates and time periods, simple cues decide
whether a sentence sets a court date or a deadline, and the due date for periods
such as "within 14 days" is computed when the period runs from the ruling itself.
"""
import re
from datetime import date

import dateparser
import pysbd
from dateutil.relativedelta import relativedelta

_seg = pysbd.Segmenter(language="en", clean=False)

# ── Splitting text into order items ───────────────────────────────────
_PROT = re.compile(r"\b(Ksh|Kshs|Shs|Hon|Mr|Mrs|Ms|Dr|Nos?|Cap|Ltd|Co|Rev|Prof|JJA|JA|CJ|J|SPM|SRM|PM|v|vs)\.(?=\s)")
_ITEM = re.compile(r"(?<=[.;:])\s+(?=(?:\d{1,3}\s*\.|\([a-z]{1,3}\)|\([ivx]{1,4}\))\s+\S)")
_MARK = re.compile(r"(?:\d{1,3}\s*\.|\([a-z]{1,3}\))")


def split_units(text: str) -> list[str]:
    text = _PROT.sub(lambda m: m.group(1) + "<dot>", text)
    out: list[str] = []
    for s in _seg.segment(text):
        out += [u.strip() for u in _ITEM.split(s.strip()) if u.strip()]
    merged, carry = [], ""
    for u in out:
        if _MARK.fullmatch(u):          # orphan list marker such as "9."
            carry = u + " "
        else:
            merged.append((carry + u).replace("<dot>", "."))
            carry = ""
    return merged


# ── Patterns ──────────────────────────────────────────────────────────
_NUMW = (r"(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|"
         r"fourteen|fifteen|twenty(?:[- ](?:one|eight))?|thirty|forty[- ]five|sixty|ninety)")
_MONTH = r"(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*"
_VERB = r"(?:file|serve|comply|pay|deposit|vacate|furnish|submit|surrender|deliver|remit|supply|appear|attend)"

DATE_RE = re.compile(
    rf"\b\d{{1,2}}\s*(?:st|nd|rd|th)?\s+(?:day\s+of\s+)?{_MONTH},?\s+\d{{4}}\b"
    r"|\b\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}\b", re.I)

PERIOD_RE = re.compile(
    rf"\b(?:within|in|after|before)\s+(?:the\s+(?:next|following)\s+)?"
    rf"(?P<num>{_NUMW})\s*(?:\(\s*(?P<paren>\d+)\s*\)\s*)?(?:working\s+|calendar\s+)?"
    r"(?P<unit>days?|weeks?|months?|years?)\b", re.I)

PHRASE_RE = re.compile(r"\b(?:not later than|no later than|on or before|by close of business)\b", re.I)

MODAL_RE = re.compile(
    r"\b(?:shall|must|is (?:hereby )?(?:directed|ordered)|are (?:hereby )?(?:directed|ordered)|"
    r"be (?:heard|listed|fixed|set down|served|filed)|stand over|at liberty to)\b"
    rf"|^(?:\d{{1,3}}\s*\.\s*|\([a-z]{{1,3}}\)\s*)?(?:the\s+)?(?:[A-Za-z0-9/’'.-]+\s+){{1,4}}to\s+{_VERB}\b", re.I)

COURT_RE = re.compile(
    r"\b(?:be mentioned|for mention|mention (?:on|date)|for hearing|for (?:further )?directions|"
    r"fixed for|stand over|listed for|slated for|next (?:hearing|mention) date)\b|^mention\b"
    r"|\b(?:ruling|judg(?:e)?ment|decision)\b[^.]{0,40}\b(?:will be|shall be|to be|be)\s+(?:delivered|rendered|read)\b"
    r"|\b(?:reserved|set) for (?:ruling|judg(?:e)?ment)\b", re.I)

RULING_ANCHOR_RE = re.compile(
    r"^(?:today|this (?:ruling|order|judg(?:e)?ment)"
    r"|(?:the\s+)?date hereof"
    r"|(?:the\s+)?date of (?:this|the) (?:ruling|order|judg(?:e)?ment|decree)"
    r"|(?:the\s+)?delivery of this (?:ruling|order|judg(?:e)?ment))\b", re.I)
_ANCHOR_AFTER = re.compile(r"^\s*(?:of|from|after|since)\s+(?P<anchor>[^,.;]{2,70})", re.I)

_WORDS = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8,
          "nine": 9, "ten": 10, "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14,
          "fifteen": 15, "twenty": 20, "twenty one": 21, "twenty eight": 28, "thirty": 30,
          "forty five": 45, "sixty": 60, "ninety": 90}


def _to_int(num: str, paren: str | None) -> int | None:
    if paren:                       # "fourteen (14) days": trust the digits
        return int(paren)
    num = num.lower().replace("-", " ")
    if num.isdigit():
        return int(num)
    return _WORDS.get(num)


def _parse_date(raw: str) -> date | None:
    cleaned = re.sub(r"(\d)\s+(st|nd|rd|th)\b", r"\1\2", raw, flags=re.I)
    cleaned = re.sub(r"\bday\s+of\s+", "", cleaned, flags=re.I)
    try:
        dt = dateparser.parse(cleaned, settings={"DATE_ORDER": "DMY", "PREFER_DAY_OF_MONTH": "first"},
                              languages=["en"])
    except Exception:
        return None
    return dt.date() if dt else None


def _add_period(start: date, amount: int, unit: str) -> date:
    unit = unit.lower().rstrip("s")
    if unit == "day":
        return start + relativedelta(days=amount)
    if unit == "week":
        return start + relativedelta(weeks=amount)
    if unit == "month":
        return start + relativedelta(months=amount)
    return start + relativedelta(years=amount)


def find_dates(text: str, reference: date) -> list[dict]:
    """Return every date or time period found, with a proposal status for each."""
    findings: list[dict] = []
    for unit in split_units(text):
        kind = "date"
        if COURT_RE.search(unit):
            kind = "court_date"
        elif MODAL_RE.search(unit):
            kind = "deadline"

        # Absolute dates
        for m in DATE_RE.finditer(unit):
            parsed = _parse_date(m.group(0))
            if parsed is None:
                status = "unparsed"
            elif kind == "date":
                status = "info"                      # an ordinary date: not proposed
            elif parsed < reference:
                status = "past"
            else:
                status = "propose"
            findings.append({"sentence": unit, "kind": kind, "matchText": m.group(0), "dateIso":
                             parsed.isoformat() if parsed else None, "period": None,
                             "anchorType": None, "anchorText": None,
                             "dueDate": parsed.isoformat() if parsed else None, "status": status})

        # Periods such as "within 14 days"
        for m in PERIOD_RE.finditer(unit):
            amount = _to_int(m.group("num"), m.group("paren"))
            if amount is None:
                continue
            period_unit = m.group("unit").lower()
            after = _ANCHOR_AFTER.match(unit[m.end():])
            anchor_text = after.group("anchor").strip() if after else None
            ruling = bool(anchor_text and RULING_ANCHOR_RE.match(anchor_text))
            implied = anchor_text is None            # "within 7 days" with no stated anchor
            if kind == "date":                       # a period with no obligation cue
                status, due, anchor_type = "info", None, "other"
            elif ruling:
                status, due, anchor_type = "propose", _add_period(reference, amount, period_unit).isoformat(), "ruling"
            elif implied:
                # By convention an order's own time limits run from the date of the order.
                # We compute it but label it as an assumption for the lawyer to confirm.
                status, due, anchor_type = "propose", _add_period(reference, amount, period_unit).isoformat(), "implied"
                anchor_text = "date of this order (assumed)"
            else:
                status, due, anchor_type = "needs_anchor", None, "other"
            findings.append({"sentence": unit, "kind": kind, "matchText": m.group(0), "dateIso": None,
                             "period": {"amount": amount, "unit": period_unit.rstrip("s")},
                             "anchorType": anchor_type,
                             "anchorText": anchor_text, "dueDate": due, "status": status})

        # "not later than <date>" is already caught by DATE_RE; PHRASE_RE only sharpens kind
        if kind == "date" and PHRASE_RE.search(unit):
            for f in findings:
                if f["sentence"] == unit and f["status"] == "info":
                    f["kind"], f["status"] = "deadline", "propose" if f["dueDate"] and \
                        f["dueDate"] >= reference.isoformat() else "past"
    return findings
