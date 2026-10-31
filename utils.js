// Utilidades de exportación para Orlando

/**
 * Exporta texto a PDF usando jsPDF
 */
function exportToPDF(title, content) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  const maxWidth = pageWidth - margin * 2;
  let y = 20;

  // Título
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, margin, y);
  y += 10;

  // Línea
  doc.setDrawColor(120, 92, 255);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Contenido
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  const lines = doc.splitTextToSize(content, maxWidth);

  lines.forEach(line => {
    if (y > 275) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, margin, y);
    y += 6.5;
  });

  // Pie
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Generado por Orlando IA • Página ${i} de ${pageCount}`, margin, 290);
  }

  doc.save(`${title.replace(/[^a-zA-Z0-9áéíóúñ ]/gi, "_")}.pdf`);
}

/**
 * Exporta a Word (.docx) usando la librería docx
 */
async function exportToWord(title, content) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = window.docx;

  const paragraphs = [];

  // Título
  paragraphs.push(
    new Paragraph({
      text: title,
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 }
    })
  );

  // Separador
  paragraphs.push(
    new Paragraph({
      text: "────────────────────────────────────",
      spacing: { after: 200 }
    })
  );

  // Contenido línea por línea
  const lines = content.split("\n");
  lines.forEach(line => {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: line || " ",
            size: 22 // 11pt
          })
        ],
        spacing: { after: 80 }
      })
    );
  });

  // Pie
  paragraphs.push(
    new Paragraph({
      text: "",
      spacing: { before: 400 }
    })
  );
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Generado por Orlando • IA para maestros",
          italics: true,
          size: 18,
          color: "888888"
        })
      ],
      alignment: AlignmentType.CENTER
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${title.replace(/[^a-zA-Z0-9áéíóúñ ]/gi, "_")}.docx`);
}

/**
 * Exporta el contenido del result-box a imagen usando html2canvas
 */
async function exportToImage(elementId, filename) {
  const el = document.getElementById(elementId);
  if (!el) return;

  // Temporalmente hacer el fondo blanco para mejor legibilidad
  const originalBg = el.style.background;
  const originalColor = el.style.color;
  el.style.background = "#ffffff";
  el.style.color = "#111111";
  el.style.padding = "24px";

  try {
    const canvas = await html2canvas(el, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true
    });

    canvas.toBlob(blob => {
      saveAs(blob, `${filename || "orlando-material"}.png`);
    });
  } finally {
    el.style.background = originalBg;
    el.style.color = originalColor;
    el.style.padding = "";
  }
}

/**
 * Copia texto al portapapeles
 */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    // Fallback
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    return true;
  }
}

/**
 * Auto-resize textarea
 */
function autoResize(textarea) {
  textarea.style.height = "auto";
  textarea.style.height = Math.min(textarea.scrollHeight, 140) + "px";
}
