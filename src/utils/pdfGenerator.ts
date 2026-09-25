import jsPDF from 'jspdf';
import { GeotechnicalReportData, GroundSupportRecommendation } from '../types';

export function exportGeotechnicalReportToPdf(
  reportData: GeotechnicalReportData,
  activeRec: GroundSupportRecommendation,
  depth: number,
  rmr: number,
  span: number
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Helper functions for PDF styling
  const addFooter = (pageNum: number, totalPages: number) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    const footerText = 'GeoShield-3D Ground Support Engineering Advisory · Mine Safety Compliance';
    doc.text(footerText, margin, pageHeight - 8);
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, pageHeight - 8, {
      align: 'right',
    });
  };

  // 1. Top Header Banner
  doc.setFillColor(18, 20, 24); // Dark obsidian
  doc.rect(margin, y, contentWidth, 24, 'F');

  // Brand Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(0, 229, 255); // Cyan
  doc.text('GEOSHIELD-3D', margin + 6, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(200, 210, 225);
  doc.text('GEOTECHNICAL HAZARD ASSESSMENT & GROUND SUPPORT REPORT', margin + 6, y + 15);

  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(160, 175, 195);
  doc.text(`ID: ${reportData.reportId}`, pageWidth - margin - 6, y + 9, { align: 'right' });
  doc.text(new Date(reportData.generatedAt).toLocaleString(), pageWidth - margin - 6, y + 15, {
    align: 'right',
  });

  y += 28;

  // 2. Excavation Site & Parameters Box
  doc.setFillColor(245, 247, 250);
  doc.setDrawColor(215, 222, 230);
  doc.rect(margin, y, contentWidth, 20, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(40, 50, 60);
  doc.text('EXCAVATION & ROCK MASS PARAMETERS', margin + 4, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(60, 70, 80);

  const col1 = margin + 4;
  const col2 = margin + 50;
  const col3 = margin + 100;
  const col4 = margin + 145;

  doc.text(`Site: ${reportData.mineSite}`, col1, y + 12);
  doc.text(`Depth: ${depth} m`, col2, y + 12);
  doc.text(`RMR: ${rmr} / 100`, col3, y + 12);
  doc.text(`Span: ${span.toFixed(1)} m`, col4, y + 12);

  const sigma1 = (depth * 0.027).toFixed(1);
  doc.text(`Major Stress σ₁: ~${sigma1} MPa`, col1, y + 17);
  doc.text(`Events Analyzed: ${reportData.summary.totalEvents.toLocaleString()}`, col2, y + 17);
  doc.text(`Peak Mag: ${reportData.summary.peakMagnitude.toFixed(2)} M`, col3, y + 17);
  doc.text(`Hi Threshold: ≥ ${reportData.summary.threshold.toFixed(1)}`, col4, y + 17);

  y += 25;

  // 3. Overall Support Level Banner
  let levelBg = [2, 136, 209]; // blue
  let levelBorder = [1, 87, 155];
  if (reportData.overallSupportLevel.includes('Critical')) {
    levelBg = [211, 47, 47]; // red
    levelBorder = [183, 28, 28];
  } else if (reportData.overallSupportLevel.includes('Heavy')) {
    levelBg = [230, 81, 0]; // orange
    levelBorder = [191, 54, 0];
  }

  doc.setFillColor(levelBg[0], levelBg[1], levelBg[2]);
  doc.rect(margin, y, contentWidth, 18, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('ADVISORY GROUND SUPPORT LEVEL CLASSIFICATION', margin + 5, y + 6);

  doc.setFontSize(13);
  doc.text(reportData.overallSupportLevel.toUpperCase(), margin + 5, y + 13.5);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Required Energy Capacity: ${activeRec.energyDemandKjM2} kJ/m²`,
    pageWidth - margin - 5,
    y + 10,
    { align: 'right' }
  );
  doc.setFontSize(7.5);
  doc.text(
    `High Hazard Count: ${reportData.summary.highHazardCount} | Peak Hi: ${reportData.summary.maxHazard.toFixed(2)}`,
    pageWidth - margin - 5,
    y + 15,
    { align: 'right' }
  );

  y += 23;

  // 4. Ground Support Specifications Cards
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(20, 30, 45);
  doc.text('1. Engineered Ground Support System Design', margin, y);
  y += 5;

  const specBoxHeight = 36;

  // Primary Reinforcement Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(200, 215, 230);
  doc.rect(margin, y, contentWidth, specBoxHeight, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(2, 119, 189);
  doc.text('A. PRIMARY ROCKBOLTING (TENDON REINFORCEMENT)', margin + 4, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 40, 50);
  doc.text(activeRec.primaryBolting.type, margin + 4, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(70, 80, 90);
  doc.text(`• Length: ${activeRec.primaryBolting.lengthM} meters`, margin + 4, y + 17);
  doc.text(`• Pattern & Spacing: ${activeRec.primaryBolting.spacingM}`, margin + 4, y + 22);

  const splitPrimDesc = doc.splitTextToSize(
    `• Specification: ${activeRec.primaryBolting.description}`,
    contentWidth - 8
  );
  doc.text(splitPrimDesc, margin + 4, y + 27);

  y += specBoxHeight + 4;

  // Secondary Reinforcement Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(200, 215, 230);
  doc.rect(margin, y, contentWidth, specBoxHeight, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(217, 119, 6);
  doc.text('B. SECONDARY DEEP REINFORCEMENT (CABLE BOLTS)', margin + 4, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 40, 50);
  doc.text(activeRec.secondaryReinforcement.type, margin + 4, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(70, 80, 90);
  doc.text(`• Length: ${activeRec.secondaryReinforcement.lengthM} meters`, margin + 4, y + 17);
  doc.text(`• Spacing Pattern: ${activeRec.secondaryReinforcement.spacingM}`, margin + 4, y + 22);

  const splitSecDesc = doc.splitTextToSize(
    `• Specification: ${activeRec.secondaryReinforcement.description}`,
    contentWidth - 8
  );
  doc.text(splitSecDesc, margin + 4, y + 27);

  y += specBoxHeight + 4;

  // Surface Containment Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(200, 215, 230);
  doc.rect(margin, y, contentWidth, specBoxHeight - 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(16, 149, 106);
  doc.text('C. SURFACE CONTAINMENT & FIBER-REINFORCED SHOTCRETE', margin + 4, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 40, 50);
  doc.text(activeRec.surfaceSupport.meshType, margin + 4, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(70, 80, 90);
  const shotcreteTxt =
    activeRec.surfaceSupport.shotcreteThicknessMm > 0
      ? `${activeRec.surfaceSupport.shotcreteThicknessMm} mm FRS (Fiber Reinforced Shotcrete)`
      : 'Mesh Containment Only';
  doc.text(`• Shotcrete Layer: ${shotcreteTxt}`, margin + 4, y + 17);
  doc.text(`• Minimum Dynamic Energy Demand: ≥ ${activeRec.energyDemandKjM2 * 20} Joules`, margin + 4, y + 22);

  const splitSurfDesc = doc.splitTextToSize(
    `• Specification: ${activeRec.surfaceSupport.description}`,
    contentWidth - 8
  );
  doc.text(splitSurfDesc, margin + 4, y + 27);

  y += specBoxHeight + 6;

  // 5. Exclusion & Safety Protocol Box
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(252, 165, 165);
  doc.rect(margin, y, contentWidth, 22, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(185, 28, 28);
  doc.text('2. OPERATIONAL SAFETY & RE-ENTRY PROTOCOL', margin + 4, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(60, 40, 40);
  doc.text(
    `• Mandatory Re-entry Wait Time: ${activeRec.exclusionProtocol.reEntryTimeHours} Hours post-seismic decay`,
    margin + 4,
    y + 11
  );
  doc.text(
    `• Exclusion Zone Radius: ${activeRec.exclusionProtocol.exclusionRadiusM} Meters from hypocenter`,
    margin + 4,
    y + 16
  );
  doc.text(
    `• Protocol: ${activeRec.exclusionProtocol.protocolSummary}`,
    margin + 4,
    y + 20
  );

  y += 28;

  // 6. Active Structural Fault Correlation Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(20, 30, 45);
  doc.text('3. Fault Plane Proximity Correlation & Hazard Ranking', margin, y);
  y += 5;

  // Table Header
  const tableHeaderY = y;
  doc.setFillColor(220, 230, 242);
  doc.rect(margin, tableHeaderY, contentWidth, 7, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 45, 60);

  const tCol1 = margin + 3;
  const tCol2 = margin + 38;
  const tCol3 = margin + 70;
  const tCol4 = margin + 110;
  const tCol5 = margin + 145;

  doc.text('Fault Structure', tCol1, tableHeaderY + 4.5);
  doc.text('Events Associated', tCol2, tableHeaderY + 4.5);
  doc.text(`High Hazard (≥${reportData.summary.threshold.toFixed(1)})`, tCol3, tableHeaderY + 4.5);
  doc.text('Max Mag / Mean Dist', tCol4, tableHeaderY + 4.5);
  doc.text('Risk Category', tCol5, tableHeaderY + 4.5);

  y += 7;

  // Table Rows (up to 8 faults)
  const rows = reportData.activeFaultEvaluations.slice(0, 8);
  for (let i = 0; i < rows.length; i++) {
    const f = rows[i];
    const rowY = y + i * 6.5;

    if (i % 2 === 1) {
      doc.setFillColor(247, 249, 252);
      doc.rect(margin, rowY, contentWidth, 6.5, 'F');
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(20, 30, 40);
    doc.text(`Fault ${f.faultId}`, tCol1, rowY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 60, 70);
    doc.text(f.eventCount.toString(), tCol2 + 5, rowY + 4.5);

    if (f.highHazardCount > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(220, 38, 38);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 110, 120);
    }
    doc.text(f.highHazardCount.toString(), tCol3 + 10, rowY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 60, 70);
    doc.text(`${f.maxMagnitude.toFixed(2)} M / ${f.meanDistance.toFixed(0)} m`, tCol4, rowY + 4.5);

    // Risk badge color
    doc.setFont('helvetica', 'bold');
    if (f.riskCategory === 'Severe') {
      doc.setTextColor(185, 28, 28);
    } else if (f.riskCategory === 'High') {
      doc.setTextColor(217, 119, 6);
    } else if (f.riskCategory === 'Moderate') {
      doc.setTextColor(180, 83, 9);
    } else {
      doc.setTextColor(100, 116, 139);
    }
    doc.text(f.riskCategory.toUpperCase(), tCol5, rowY + 4.5);
  }

  y += rows.length * 6.5 + 8;

  // Sign-off signature footer
  doc.setDrawColor(200, 205, 215);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 130, 140);
  doc.text(
    'Notice: This geotechnical ground support advisory report is computed via vectorized spatial proximity to mapped 3D fault geometries and microseismic telemetry. Always cross-validate with underground rock mass inspections and geotechnical engineer sign-off.',
    margin,
    y,
    { maxWidth: contentWidth }
  );

  addFooter(1, 1);

  // Save the PDF file to user device
  doc.save(`GeoShield_Ground_Support_Report_${reportData.reportId}.pdf`);
}
