import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ─── Task shape from the backend ──────── */
export interface ExportableTask {
    title?: string;
    assigned_to?: string | null;
    assignee?: string | null;
    faculty_name?: string | null;
    priority?: string | null;
    due_date?: string | null;
    dueDate?: string | null;
    deadline?: string | null;
    status?: string;
}

/* ═══════════════════════════════════════════════════════
   generateMeetingPDF
   Creates and downloads a branded PDF of extracted tasks
════════════════════════════════════════════════════════ */
export const generateMeetingPDF = (
    meetingTitle: string | null | undefined,
    tasks: ExportableTask[]
) => {
    const doc = new jsPDF();

    // ── Midnight Purple brand colour ──────────────────────
    const purple: [number, number, number] = [30, 27, 75]; // #1E1B4B
    const muted: [number, number, number] = [100, 100, 120];

    // ── Page header ───────────────────────────────────────
    doc.setFontSize(20);
    doc.setTextColor(...purple);
    doc.setFont("helvetica", "bold");
    doc.text("SmartTask: Meeting Minutes", 14, 22);

    doc.setFontSize(11);
    doc.setTextColor(...muted);
    doc.setFont("helvetica", "normal");
    doc.text(`Meeting: ${meetingTitle || "General Discussion"}`, 14, 32);
    doc.text(`Exported on: ${new Date().toLocaleDateString("en-IN")}`, 14, 39);
    doc.text(`Total tasks: ${tasks.length}`, 14, 46);

    // ── Divider line ──────────────────────────────────────
    doc.setDrawColor(...purple);
    doc.setLineWidth(0.5);
    doc.line(14, 50, 196, 50);

    // ── Table ─────────────────────────────────────────────
    const columns = ["#", "Task Title", "Assigned To", "Priority", "Deadline", "Status"];

    const rows = tasks.map((task, i) => [
        String(i + 1),
        task.title || "Untitled Task",
        task.faculty_name || task.assigned_to || task.assignee || "Unassigned",
        (task.priority || "Medium").toUpperCase(),
        task.due_date || task.dueDate || task.deadline || "TBD",
        (task.status || "pending").toUpperCase(),
    ]);

    autoTable(doc, {
        startY: 55,
        head: [columns],
        body: rows,
        headStyles: {
            fillColor: purple,
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 9,
        },
        bodyStyles: {
            fontSize: 9,
            textColor: [30, 27, 75],
        },
        alternateRowStyles: {
            fillColor: [245, 247, 250],
        },
        columnStyles: {
            0: { cellWidth: 10, halign: "center" }, // #
            2: { cellWidth: 38 },                   // Assigned To
            3: { cellWidth: 22, halign: "center" }, // Priority
            4: { cellWidth: 28 },                   // Deadline
            5: { cellWidth: 24, halign: "center" }, // Status
        },
        margin: { left: 14, right: 14 },
        styles: { overflow: "linebreak" },
    });

    // ── Footer ────────────────────────────────────────────
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        doc.setFontSize(8);
        doc.setTextColor(160, 160, 180);
        doc.text(
            `SmartTask Dashboard  •  Page ${p} of ${pageCount}`,
            14,
            doc.internal.pageSize.height - 10
        );
    }

    // ── Save ──────────────────────────────────────────────
    const filename = `Meeting_Tasks_${Date.now()}.pdf`;
    doc.save(filename);
};
