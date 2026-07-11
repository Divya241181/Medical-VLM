"""
MedVLM Radiology Backend — PDF Report Builder (ReportLab)
Professional Clinical Grade A4 Report
"""

import io
import uuid
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether,
)
from reportlab.lib.colors import HexColor

# ── Color Palette ────────────────────────────────────────────────────────────
TEAL = HexColor("#0f6e56")
TEAL_ACCENT = HexColor("#00d4aa")
TEAL_BRIEF_BG = HexColor("#edf7f4")
TEAL_BRIEF_BD = HexColor("#9fd3c7")
GRAY_BG = HexColor("#f8fafc")
GRAY_BD = HexColor("#e2e8f0")
GREEN = HexColor("#16a34a")
GREEN_BG = HexColor("#f0fdf4")
GREEN_BD = HexColor("#86efac")
GREEN_PILL_BG = HexColor("#dcfce7")
ORANGE = HexColor("#ea580c")
ORANGE_PILL_BG = HexColor("#fff7ed")
ORANGE_PILL_BD = HexColor("#fdba74")
YELLOW_PILL_BG = HexColor("#fef9c3")
YELLOW_PILL_BD = HexColor("#fde047")
YELLOW_TXT = HexColor("#854d0e")
MILD_BG = HexColor("#fefce8")
MILD_BD = HexColor("#fde047")
MILD_LEFT = HexColor("#ca8a04")
RED = HexColor("#dc2626")
RED_BG = HexColor("#fef2f2")
RED_BD = HexColor("#fca5a5")
RED_CHIP_BG = HexColor("#fee2e2")
RED_CHIP_TXT = HexColor("#991b1b")
DARK = HexColor("#0f172a")
BODY_TEXT = HexColor("#334155")
MUTED = HexColor("#64748b")
MUTED_LIGHT = HexColor("#94a3b8")
MUTED_FAINT = HexColor("#cbd5e1")
ZONE_LABEL = HexColor("#475569")
WHITE = HexColor("#ffffff")
BRIEF_TXT = HexColor("#1e3a34")

PAGE_W, PAGE_H = A4
L_MARGIN = 50
R_MARGIN = 50
T_MARGIN = 65
B_MARGIN = 65
CONTENT_W = PAGE_W - L_MARGIN - R_MARGIN
HEADER_H = 58
ACCENT_H = 3


def _sev_config(severity):
    s = severity.lower()
    return {
        "normal":   {"bg": GREEN_BG, "bd": GREEN_BD, "left": GREEN, "txt": GREEN, "pill_bg": GREEN_PILL_BG, "pill_bd": GREEN_BD, "pill_txt": GREEN, "icon": "NORMAL"},
        "mild":     {"bg": MILD_BG, "bd": MILD_BD, "left": MILD_LEFT, "txt": MILD_LEFT, "pill_bg": YELLOW_PILL_BG, "pill_bd": YELLOW_PILL_BD, "pill_txt": YELLOW_TXT, "icon": "MILD"},
        "moderate": {"bg": ORANGE_PILL_BG, "bd": ORANGE_PILL_BD, "left": ORANGE, "txt": ORANGE, "pill_bg": HexColor("#ffedd5"), "pill_bd": ORANGE_PILL_BD, "pill_txt": HexColor("#9a3412"), "icon": "MODERATE"},
        "severe":   {"bg": RED_BG, "bd": RED_BD, "left": RED, "txt": RED, "pill_bg": RED_CHIP_BG, "pill_bd": RED_BD, "pill_txt": RED_CHIP_TXT, "icon": "SEVERE"},
    }.get(s, {"bg": GRAY_BG, "bd": GRAY_BD, "left": MUTED, "txt": MUTED, "pill_bg": GRAY_BG, "pill_bd": GRAY_BD, "pill_txt": MUTED, "icon": s.upper()})


def _draw_header_footer(canvas, doc, report_id, now, is_first=True):
    canvas.saveState()
    w = PAGE_W
    # ── Header teal bar ──
    bar_y = PAGE_H - HEADER_H
    canvas.setFillColor(TEAL)
    canvas.rect(0, bar_y, w, HEADER_H, fill=1, stroke=0)
    # Cross circle
    cx, cy = L_MARGIN + 12, bar_y + HEADER_H / 2
    canvas.setFillColor(WHITE)
    canvas.circle(cx, cy, 9, fill=1, stroke=0)
    canvas.setFillColor(TEAL)
    canvas.setFont("Helvetica-Bold", 12)
    canvas.drawCentredString(cx, cy - 4, "+")
    # Brand text
    tx = cx + 16
    canvas.setFillColor(WHITE)
    canvas.setFont("Helvetica-Bold", 18 if is_first else 14)
    canvas.drawString(tx, cy - 2 if is_first else cy - 3, "MedVLM")
    bw = canvas.stringWidth("MedVLM", "Helvetica-Bold", 18 if is_first else 14)
    canvas.setFont("Helvetica", 10 if is_first else 8)
    canvas.setFillColor(HexColor("#ffffffb3"))
    canvas.drawString(tx + bw + 2, cy + 6 if is_first else cy + 3, "7B")
    if is_first:
        canvas.setFont("Helvetica", 9)
        canvas.setFillColor(HexColor("#ffffffd9"))
        canvas.drawString(tx, cy - 16, "Radiology Report")
    # Right side
    rx = w - R_MARGIN
    canvas.setFillColor(WHITE)
    canvas.setFont("Helvetica", 7.5)
    canvas.drawRightString(rx, bar_y + HEADER_H - 18, "CONFIDENTIAL")
    canvas.setStrokeColor(HexColor("#ffffff80"))
    canvas.setLineWidth(0.4)
    canvas.line(rx - 60, bar_y + HEADER_H - 23, rx, bar_y + HEADER_H - 23)
    canvas.setFillColor(HexColor("#ffffffcc"))
    canvas.setFont("Helvetica", 7)
    canvas.drawRightString(rx, bar_y + HEADER_H - 33, "AI-Assisted Clinical Analysis")
    # Accent line
    canvas.setFillColor(TEAL_ACCENT)
    canvas.rect(0, bar_y - ACCENT_H, w, ACCENT_H, fill=1, stroke=0)
    # ── Metadata band (first page only) ──
    if is_first:
        band_h = 36
        band_y = bar_y - ACCENT_H - band_h
        canvas.setFillColor(GRAY_BG)
        canvas.rect(0, band_y, w, band_h, fill=1, stroke=0)
        canvas.setStrokeColor(GRAY_BD)
        canvas.setLineWidth(0.5)
        canvas.line(0, band_y, w, band_y)
        cols = [
            ("REPORT ID", report_id),
            ("DATE", now.strftime("%B %d, %Y")),
            ("TIME", now.strftime("%I:%M %p")),
            ("AI MODEL", "MedVLM-7B v2.1"),
        ]
        col_w = CONTENT_W / 4
        for i, (label, val) in enumerate(cols):
            x = L_MARGIN + i * col_w + 10
            canvas.setFont("Helvetica", 6.5)
            canvas.setFillColor(MUTED)
            canvas.drawString(x, band_y + band_h - 13, label)
            canvas.setFont("Helvetica-Bold", 9.5)
            canvas.setFillColor(DARK)
            canvas.drawString(x, band_y + 8, val)
            if i > 0:
                lx = L_MARGIN + i * col_w
                canvas.setStrokeColor(GRAY_BD)
                canvas.line(lx, band_y + 4, lx, band_y + band_h - 4)
    # ── Footer ──
    canvas.setStrokeColor(GRAY_BD)
    canvas.setLineWidth(0.4)
    canvas.line(L_MARGIN, B_MARGIN - 8, w - R_MARGIN, B_MARGIN - 8)
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(MUTED_LIGHT)
    canvas.drawString(L_MARGIN, B_MARGIN - 20, "Generated by MedVLM-7B v2.1 \u00b7 CheXpert + MIMIC-CXR trained")
    pn = doc.page
    canvas.drawRightString(w - R_MARGIN, B_MARGIN - 20, f"Page {pn}")
    canvas.setFont("Helvetica", 6.5)
    canvas.setFillColor(MUTED_FAINT)
    disclaimer = "FOR CLINICAL REFERENCE ONLY \u00b7 NOT A SUBSTITUTE FOR PROFESSIONAL MEDICAL DIAGNOSIS \u00b7 AI-ASSISTED ANALYSIS"
    canvas.drawCentredString(w / 2, B_MARGIN - 32, disclaimer)
    canvas.restoreState()


def _on_first_page(canvas, doc):
    _draw_header_footer(canvas, doc, doc._report_id, doc._report_now, is_first=True)

def _on_later_pages(canvas, doc):
    _draw_header_footer(canvas, doc, doc._report_id, doc._report_now, is_first=False)


def _section_header(title):
    """Return flowables for a section header with left accent bar."""
    tbl = Table(
        [[Paragraph(
            f'<font color="#0f6e56"><b>{title}</b></font>',
            ParagraphStyle("SH", fontName="Helvetica-Bold", fontSize=9, textColor=TEAL, leading=12)
        )]],
        colWidths=[CONTENT_W],
        rowHeights=[16],
        style=TableStyle([
            ("LEFTPADDING", (0,0), (-1,-1), 10),
            ("BOTTOMPADDING", (0,0), (-1,-1), 2),
            ("TOPPADDING", (0,0), (-1,-1), 2),
            ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
            ("LINEBELOW", (0,0), (-1,-1), 0.4, GRAY_BD),
        ]),
    )
    return [Spacer(1, 5*mm), tbl, Spacer(1, 2*mm)]


def build_pdf(report: dict) -> bytes:
    """
    Build a professional A4 clinical radiology report PDF.
    Returns raw PDF bytes.
    """
    buffer = io.BytesIO()
    now = datetime.now()
    report_id = uuid.uuid4().hex[:8].upper()

    first_top = T_MARGIN + HEADER_H + ACCENT_H + 36 + 8
    later_top = T_MARGIN + HEADER_H + ACCENT_H + 8

    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=L_MARGIN, rightMargin=R_MARGIN,
        topMargin=first_top, bottomMargin=B_MARGIN,
    )
    doc._report_id = report_id
    doc._report_now = now

    styles = getSampleStyleSheet()
    body_style = ParagraphStyle("Body", fontName="Helvetica", fontSize=10, textColor=BODY_TEXT, leading=18, spaceAfter=2*mm, leftIndent=8)
    italic_body = ParagraphStyle("ItalicBody", parent=body_style, fontName="Helvetica-Oblique", textColor=BRIEF_TXT, fontSize=10.5, leading=19)
    story = []

    severity = report.get("severity", "normal")
    sc = _sev_config(severity)

    # ── Patient Brief ──
    pill_style = ParagraphStyle("Pill", fontName="Helvetica-Bold", fontSize=8, textColor=sc["pill_txt"], alignment=TA_CENTER)
    pill = Table(
        [[Paragraph(severity.upper(), pill_style)]],
        colWidths=[55], rowHeights=[18],
        style=TableStyle([
            ("BACKGROUND", (0,0), (-1,-1), sc["pill_bg"]),
            ("BOX", (0,0), (-1,-1), 0.5, sc["pill_bd"]),
            ("ALIGN", (0,0), (-1,-1), "CENTER"),
            ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
            ("TOPPADDING", (0,0), (-1,-1), 1),
            ("BOTTOMPADDING", (0,0), (-1,-1), 1),
        ]),
    )
    hdr_left = Paragraph(
        '<font color="#0f6e56"><b>PATIENT BRIEF</b></font>',
        ParagraphStyle("BH", fontName="Helvetica-Bold", fontSize=8, textColor=TEAL, leading=12)
    )
    brief_text = report.get("brief", "No brief available.")
    brief_body = Paragraph(brief_text, italic_body)
    header_row = Table(
        [[hdr_left, pill]],
        colWidths=[CONTENT_W - 80, 65],
        style=TableStyle([("VALIGN",(0,0),(-1,-1),"MIDDLE")]),
    )
    brief_box = Table(
        [[header_row], [brief_body]],
        colWidths=[CONTENT_W - 16],
        style=TableStyle([
            ("BACKGROUND", (0,0), (-1,-1), TEAL_BRIEF_BG),
            ("BOX", (0,0), (-1,-1), 0.6, TEAL_BRIEF_BD),
            ("TOPPADDING", (0,0), (-1,-1), 4*mm),
            ("BOTTOMPADDING", (0,0), (-1,-1), 4*mm),
            ("LEFTPADDING", (0,0), (-1,-1), 5*mm),
            ("RIGHTPADDING", (0,0), (-1,-1), 5*mm),
        ]),
    )
    # Wrap in outer table for left border accent
    outer_brief = Table(
        [[brief_box]],
        colWidths=[CONTENT_W - 12],
        style=TableStyle([
            ("LINEBEFORE", (0,0), (0,-1), 4, TEAL),
            ("LEFTPADDING", (0,0), (-1,-1), 4),
        ]),
    )
    story.append(Spacer(1, 3*mm))
    story.append(outer_brief)

    # ── Findings ──
    story.extend(_section_header("\U0001f50d  FINDINGS"))
    story.append(Paragraph(report.get("findings", "N/A"), body_style))

    # ── Impression ──
    story.extend(_section_header("\U0001f9e0  IMPRESSION"))
    story.append(Paragraph(report.get("impression", "N/A"), body_style))

    # ── Recommendations ──
    story.extend(_section_header("\U0001f4cb  RECOMMENDATIONS"))
    rec_text = report.get("recommendations", "N/A")
    sentences = [s.strip() for s in rec_text.replace("\n", ". ").split(". ") if s.strip()]
    num_style = ParagraphStyle("Num", fontName="Helvetica", fontSize=10, textColor=BODY_TEXT, leading=17, leftIndent=16, spaceAfter=1.5*mm)
    for i, s in enumerate(sentences, 1):
        clean = s.rstrip(".")
        story.append(Paragraph(f'<font color="#0f6e56"><b>{i}.</b></font>  {clean}.', num_style))

    # ── Severity Assessment Box ──
    story.append(Spacer(1, 5*mm))
    sev_label = Paragraph(
        '<font size="7" color="#64748b">SEVERITY ASSESSMENT</font>',
        ParagraphStyle("SL", fontSize=7, textColor=MUTED, leading=10)
    )
    sev_value = Paragraph(
        f'<font size="16"><b>{severity.upper()}</b></font>',
        ParagraphStyle("SV", fontName="Helvetica-Bold", fontSize=16, textColor=sc["txt"], leading=22, spaceBefore=2)
    )
    sev_left = Table([[sev_label],[sev_value]], colWidths=[CONTENT_W - 80],
        style=TableStyle([("LEFTPADDING",(0,0),(-1,-1),0),("TOPPADDING",(0,0),(-1,-1),0),("BOTTOMPADDING",(0,0),(-1,-1),0)]))
    sev_icon_txt = {"normal":"\u2713","mild":"\u26a0","moderate":"\u26a0","severe":"\u2716"}.get(severity.lower(),"\u2713")
    sev_icon = Table(
        [[Paragraph(f'<font size="14" color="#ffffff"><b>{sev_icon_txt}</b></font>',
            ParagraphStyle("SI", fontSize=14, textColor=WHITE, alignment=TA_CENTER))]],
        colWidths=[32], rowHeights=[32],
        style=TableStyle([
            ("BACKGROUND",(0,0),(-1,-1), sc["txt"]),
            ("ALIGN",(0,0),(-1,-1),"CENTER"),
            ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
        ]),
    )
    sev_box = Table(
        [[sev_left, sev_icon]],
        colWidths=[CONTENT_W - 60, 44],
        style=TableStyle([
            ("BACKGROUND",(0,0),(-1,-1), sc["bg"]),
            ("BOX",(0,0),(-1,-1), 0.5, sc["bd"]),
            ("LINEBEFORE",(0,0),(0,-1), 4, sc["left"]),
            ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
            ("TOPPADDING",(0,0),(-1,-1), 10),
            ("BOTTOMPADDING",(0,0),(-1,-1), 10),
            ("LEFTPADDING",(0,0),(0,-1), 14),
            ("RIGHTPADDING",(-1,0),(-1,-1), 10),
        ]),
    )
    story.append(sev_box)

    # ── Detected Abnormalities ──
    story.extend(_section_header("\u26a0  DETECTED ABNORMALITIES"))
    abnormalities = report.get("abnormalities", [])
    if abnormalities:
        chip_style = ParagraphStyle("Chip", fontName="Helvetica-Bold", fontSize=8.5, textColor=RED_CHIP_TXT, alignment=TA_CENTER)
        rows = []
        row = []
        for ab in abnormalities:
            cell = Table(
                [[Paragraph(f'\u25cf  {ab}', chip_style)]],
                colWidths=[None], rowHeights=[20],
                style=TableStyle([
                    ("BACKGROUND",(0,0),(-1,-1), RED_CHIP_BG),
                    ("BOX",(0,0),(-1,-1), 0.5, RED_BD),
                    ("ALIGN",(0,0),(-1,-1),"CENTER"),
                    ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
                    ("LEFTPADDING",(0,0),(-1,-1),8),
                    ("RIGHTPADDING",(0,0),(-1,-1),8),
                    ("TOPPADDING",(0,0),(-1,-1),2),
                    ("BOTTOMPADDING",(0,0),(-1,-1),2),
                ]),
            )
            row.append(cell)
            if len(row) == 3:
                rows.append(row)
                row = []
        if row:
            while len(row) < 3:
                row.append("")
            rows.append(row)
        cw = (CONTENT_W - 20) / 3
        chip_table = Table(rows, colWidths=[cw]*3,
            style=TableStyle([
                ("LEFTPADDING",(0,0),(-1,-1),3),
                ("RIGHTPADDING",(0,0),(-1,-1),3),
                ("TOPPADDING",(0,0),(-1,-1),3),
                ("BOTTOMPADDING",(0,0),(-1,-1),3),
                ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
            ]))
        story.append(chip_table)
    else:
        g_chip = Table(
            [[Paragraph('\u2713  No abnormalities detected',
                ParagraphStyle("GC", fontName="Helvetica-Bold", fontSize=9, textColor=GREEN, alignment=TA_CENTER))]],
            colWidths=[180], rowHeights=[22],
            style=TableStyle([
                ("BACKGROUND",(0,0),(-1,-1), GREEN_BG),
                ("BOX",(0,0),(-1,-1), 0.5, GREEN_BD),
                ("ALIGN",(0,0),(-1,-1),"CENTER"),
                ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
            ]))
        story.append(g_chip)

    # ── Lung Zone Analysis ──
    story.extend(_section_header("\U0001fac1  LUNG ZONE ANALYSIS"))
    zones = report.get("lung_zones", {})
    zh = ParagraphStyle("ZH", fontName="Helvetica-Bold", fontSize=8, textColor=WHITE, alignment=TA_CENTER)
    zl = ParagraphStyle("ZL", fontName="Helvetica-Bold", fontSize=8, textColor=ZONE_LABEL, alignment=TA_CENTER)

    def zcell(key):
        st = zones.get(key, "clear")
        if st.lower() == "clear":
            return Table([[Paragraph('\u2713 CLEAR', ParagraphStyle("zc",fontName="Helvetica-Bold",fontSize=8,textColor=GREEN,alignment=TA_CENTER))]],
                style=TableStyle([("BACKGROUND",(0,0),(-1,-1),GREEN_BG),("ALIGN",(0,0),(-1,-1),"CENTER"),("VALIGN",(0,0),(-1,-1),"MIDDLE"),("TOPPADDING",(0,0),(-1,-1),2),("BOTTOMPADDING",(0,0),(-1,-1),2)]))
        return Table([[Paragraph('\u26a0 AFFECTED', ParagraphStyle("za",fontName="Helvetica-Bold",fontSize=8,textColor=RED,alignment=TA_CENTER))]],
            style=TableStyle([("BACKGROUND",(0,0),(-1,-1),RED_BG),("ALIGN",(0,0),(-1,-1),"CENTER"),("VALIGN",(0,0),(-1,-1),"MIDDLE"),("TOPPADDING",(0,0),(-1,-1),2),("BOTTOMPADDING",(0,0),(-1,-1),2)]))

    def overall(l, r):
        ls = zones.get(l,"clear").lower()
        rs = zones.get(r,"clear").lower()
        if ls == "clear" and rs == "clear":
            return Table([[Paragraph('\u2713 NORMAL', ParagraphStyle("zo",fontName="Helvetica-Bold",fontSize=8,textColor=GREEN,alignment=TA_CENTER))]],
                style=TableStyle([("BACKGROUND",(0,0),(-1,-1),GREEN_BG),("ALIGN",(0,0),(-1,-1),"CENTER"),("VALIGN",(0,0),(-1,-1),"MIDDLE"),("TOPPADDING",(0,0),(-1,-1),2),("BOTTOMPADDING",(0,0),(-1,-1),2)]))
        return Table([[Paragraph('\u26a0 ABNORMAL', ParagraphStyle("zo2",fontName="Helvetica-Bold",fontSize=8,textColor=RED,alignment=TA_CENTER))]],
            style=TableStyle([("BACKGROUND",(0,0),(-1,-1),RED_BG),("ALIGN",(0,0),(-1,-1),"CENTER"),("VALIGN",(0,0),(-1,-1),"MIDDLE"),("TOPPADDING",(0,0),(-1,-1),2),("BOTTOMPADDING",(0,0),(-1,-1),2)]))

    cw1, cw2 = 60, (CONTENT_W - 60) / 3
    zone_data = [
        [Paragraph("ZONE",zh), Paragraph("LEFT LUNG",zh), Paragraph("RIGHT LUNG",zh), Paragraph("STATUS",zh)],
        [Paragraph("UPPER",zl), zcell("upper_left"), zcell("upper_right"), overall("upper_left","upper_right")],
        [Paragraph("MIDDLE",zl), zcell("middle_left"), zcell("middle_right"), overall("middle_left","middle_right")],
        [Paragraph("LOWER",zl), zcell("lower_left"), zcell("lower_right"), overall("lower_left","lower_right")],
    ]
    zt = Table(zone_data, colWidths=[cw1, cw2, cw2, cw2], rowHeights=[22, 24, 24, 24],
        style=TableStyle([
            ("BACKGROUND",(0,0),(-1,0), TEAL),
            ("TEXTCOLOR",(0,0),(-1,0), WHITE),
            ("BACKGROUND",(0,1),(0,1), GRAY_BG),
            ("BACKGROUND",(0,2),(0,2), WHITE),
            ("BACKGROUND",(0,3),(0,3), GRAY_BG),
            ("BOX",(0,0),(-1,-1), 0.5, GRAY_BD),
            ("INNERGRID",(0,0),(-1,-1), 0.3, GRAY_BD),
            ("ALIGN",(0,0),(-1,-1),"CENTER"),
            ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
            ("TOPPADDING",(0,0),(-1,-1), 2),
            ("BOTTOMPADDING",(0,0),(-1,-1), 2),
        ]))
    story.append(zt)
    story.append(Spacer(1, 2*mm))
    story.append(Paragraph(
        '<i><font size="7.5" color="#94a3b8">Zones assessed by MedVLM-7B lung segmentation model</font></i>',
        ParagraphStyle("ZN", fontSize=7.5, textColor=MUTED_LIGHT, alignment=TA_LEFT, fontName="Helvetica-Oblique")
    ))

    # ── ICD-10 Codes ──────────────────────────────────────────────────────────
    icd_codes = report.get("icd10_codes") or []
    if icd_codes:
        story += _section_header("ICD-10 BILLING CODES")
        icd_style_code = ParagraphStyle(
            "ICD_Code", fontName="Helvetica-Bold", fontSize=9,
            textColor=TEAL, leading=12
        )
        icd_style_desc = ParagraphStyle(
            "ICD_Desc", fontName="Helvetica", fontSize=9,
            textColor=BODY_TEXT, leading=12
        )
        icd_data = [[
            Paragraph("CODE", ParagraphStyle("ICH", fontName="Helvetica-Bold", fontSize=8, textColor=WHITE, alignment=TA_CENTER)),
            Paragraph("DESCRIPTION", ParagraphStyle("ICH2", fontName="Helvetica-Bold", fontSize=8, textColor=WHITE, alignment=TA_LEFT)),
        ]]
        for item in icd_codes:
            code = item.get("code", "")
            desc = item.get("description", "")
            icd_data.append([
                Paragraph(code, icd_style_code),
                Paragraph(desc, icd_style_desc),
            ])
        icd_table = Table(
            icd_data,
            colWidths=[60, CONTENT_W - 60],
            style=TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), TEAL),
                ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
                ("BOX", (0, 0), (-1, -1), 0.5, GRAY_BD),
                ("INNERGRID", (0, 0), (-1, -1), 0.3, GRAY_BD),
                ("ALIGN", (0, 0), (0, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (1, 0), (1, -1), 8),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, GRAY_BG]),
            ]),
        )
        story.append(icd_table)
        story.append(Spacer(1, 2*mm))
        story.append(Paragraph(
            '<i><font size="7.5" color="#94a3b8">ICD-10 codes are AI-suggested. Verify with a certified medical coder before use for billing.</font></i>',
            ParagraphStyle("ICN", fontSize=7.5, textColor=MUTED_LIGHT, alignment=TA_LEFT, fontName="Helvetica-Oblique")
        ))

    # ── Build ──
    doc.build(story, onFirstPage=_on_first_page, onLaterPages=_on_later_pages)
    return buffer.getvalue()

