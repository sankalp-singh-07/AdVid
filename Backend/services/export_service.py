"""Conversation export: Markdown, plain text, and professional PDF."""

from __future__ import annotations

import io
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select

from models.chat_model import Conversation
from utils.logger import get_logger

logger = get_logger("export_service")


class ExportService:
    async def get_conversation(
        self, conversation_id: str, user_id: str, db: AsyncSession
    ) -> Conversation:
        result = await db.execute(
            select(Conversation)
            .where(
                Conversation.id == conversation_id,
                Conversation.user_id == user_id,
            )
            .options(selectinload(Conversation.messages))
        )
        conv = result.scalars().first()
        if not conv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found.",
            )
        conv.messages.sort(key=lambda m: m.created_at)
        return conv

    def to_markdown(self, conv: Conversation) -> str:
        lines = [
            f"# {conv.title}",
            "",
            f"- **Conversation ID:** `{conv.id}`",
            f"- **Exported:** {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}",
            f"- **Created:** {conv.created_at.isoformat() if conv.created_at else 'n/a'}",
            "",
            "---",
            "",
        ]
        for msg in conv.messages:
            role = "User" if msg.role == "user" else "Assistant"
            ts = msg.created_at.strftime("%Y-%m-%d %H:%M:%S UTC") if msg.created_at else ""
            lines.append(f"## {role}")
            if ts:
                lines.append(f"*{ts}*")
            lines.append("")
            lines.append(msg.content or "")
            lines.append("")
            if msg.role == "assistant" and msg.sources:
                lines.append("### Sources")
                for i, src in enumerate(msg.sources, 1):
                    if isinstance(src, dict):
                        name = src.get("filename") or src.get("title") or "document"
                        page = src.get("page", "?")
                        score = src.get("score") or src.get("confidence")
                        lines.append(f"{i}. **{name}** (p. {page})" + (f" — score {score}" if score else ""))
                lines.append("")
            lines.append("---")
            lines.append("")
        return "\n".join(lines)

    def to_txt(self, conv: Conversation) -> str:
        lines = [
            conv.title,
            "=" * len(conv.title or "Conversation"),
            f"Exported: {datetime.now(timezone.utc).isoformat()}",
            "",
        ]
        for msg in conv.messages:
            role = "USER" if msg.role == "user" else "ASSISTANT"
            ts = msg.created_at.isoformat() if msg.created_at else ""
            lines.append(f"[{role}] {ts}")
            lines.append(msg.content or "")
            if msg.role == "assistant" and msg.sources:
                lines.append("Sources:")
                for src in msg.sources:
                    if isinstance(src, dict):
                        lines.append(
                            f"  - {src.get('filename') or src.get('title')} p.{src.get('page')}"
                        )
            lines.append("")
            lines.append("-" * 40)
            lines.append("")
        return "\n".join(lines)

    def to_pdf_bytes(self, conv: Conversation) -> bytes:
        """
        Generate a simple professional PDF.
        Uses reportlab if available; otherwise falls back to a minimal PDF writer.
        """
        try:
            return self._pdf_reportlab(conv)
        except ImportError:
            logger.warning("reportlab not installed; using minimal PDF fallback")
            return self._pdf_minimal(conv)

    def _pdf_reportlab(self, conv: Conversation) -> bytes:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
        from reportlab.lib.units import inch
        from reportlab.platypus import (
            Paragraph,
            SimpleDocTemplate,
            Spacer,
            Table,
            TableStyle,
            HRFlowable,
        )

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=0.75 * inch,
            leftMargin=0.75 * inch,
            topMargin=0.75 * inch,
            bottomMargin=0.75 * inch,
        )
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            "TitleCustom",
            parent=styles["Heading1"],
            textColor=colors.HexColor("#4F46E5"),
            spaceAfter=6,
        )
        meta_style = ParagraphStyle(
            "Meta", parent=styles["Normal"], textColor=colors.grey, fontSize=9
        )
        role_style = ParagraphStyle(
            "Role",
            parent=styles["Heading3"],
            textColor=colors.HexColor("#1E293B"),
            spaceBefore=12,
        )
        body_style = ParagraphStyle(
            "Body", parent=styles["Normal"], leading=14, fontSize=10
        )
        source_style = ParagraphStyle(
            "Source", parent=styles["Normal"], fontSize=8, textColor=colors.HexColor("#64748B")
        )

        story = []
        story.append(Paragraph(_escape(conv.title or "Conversation"), title_style))
        story.append(
            Paragraph(
                f"Exported {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')} · ID {conv.id}",
                meta_style,
            )
        )
        story.append(Spacer(1, 8))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0")))

        for msg in conv.messages:
            role = "You" if msg.role == "user" else "Assistant"
            ts = msg.created_at.strftime("%Y-%m-%d %H:%M") if msg.created_at else ""
            story.append(Paragraph(f"{role} · {ts}", role_style))
            for para in (msg.content or "").split("\n"):
                if para.strip():
                    story.append(Paragraph(_escape(para), body_style))
                else:
                    story.append(Spacer(1, 4))
            if msg.role == "assistant" and msg.sources:
                rows = [["#", "Document", "Page", "Score"]]
                for i, src in enumerate(msg.sources, 1):
                    if not isinstance(src, dict):
                        continue
                    rows.append(
                        [
                            str(i),
                            str(src.get("filename") or src.get("title") or "")[:40],
                            str(src.get("page", "")),
                            str(src.get("score") or src.get("confidence") or ""),
                        ]
                    )
                if len(rows) > 1:
                    table = Table(rows, colWidths=[0.4 * inch, 3.5 * inch, 0.7 * inch, 0.8 * inch])
                    table.setStyle(
                        TableStyle(
                            [
                                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EEF2FF")),
                                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#4338CA")),
                                ("FONTSIZE", (0, 0), (-1, -1), 8),
                                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E2E8F0")),
                                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                                ("TOPPADDING", (0, 0), (-1, -1), 4),
                            ]
                        )
                    )
                    story.append(Spacer(1, 6))
                    story.append(Paragraph("Sources", source_style))
                    story.append(table)
            story.append(Spacer(1, 6))
            story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#F1F5F9")))

        doc.build(story)
        return buffer.getvalue()

    def _pdf_minimal(self, conv: Conversation) -> bytes:
        """Minimal single-page-ish PDF without external deps."""
        text = self.to_txt(conv)
        # Escape PDF string specials
        safe = text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        # Split into lines and build simple text objects
        lines = safe.split("\n")[:200]
        content_lines = ["BT", "/F1 10 Tf", "50 750 Td", "14 TL"]
        for i, line in enumerate(lines):
            if i == 0:
                content_lines.append(f"({line[:100]}) Tj")
            else:
                content_lines.append("T*")
                content_lines.append(f"({line[:100]}) Tj")
        content_lines.append("ET")
        stream = "\n".join(content_lines).encode("latin-1", errors="replace")

        objects = []
        objects.append(b"1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n")
        objects.append(b"2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n")
        objects.append(
            b"3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            b"/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj\n"
        )
        objects.append(
            f"4 0 obj<< /Length {len(stream)} >>stream\n".encode()
            + stream
            + b"\nendstream\nendobj\n"
        )
        objects.append(
            b"5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n"
        )

        out = io.BytesIO()
        out.write(b"%PDF-1.4\n")
        offsets = [0]
        for obj in objects:
            offsets.append(out.tell())
            out.write(obj)
        xref_pos = out.tell()
        out.write(f"xref\n0 {len(offsets)}\n".encode())
        out.write(b"0000000000 65535 f \n")
        for off in offsets[1:]:
            out.write(f"{off:010d} 00000 n \n".encode())
        out.write(
            f"trailer<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n".encode()
        )
        return out.getvalue()


def _escape(text: str) -> str:
    return (
        (text or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


export_service = ExportService()
