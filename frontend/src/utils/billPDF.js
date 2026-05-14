import jsPDF from 'jspdf';
import dayjs from 'dayjs';

export function generateBillPDF(bill) {
  const doc = new jsPDF({ unit: 'mm', format: 'a5' });
  const { shopkeeper: shop, items, subtotal, gstAmount, total, billCode, createdAt } = bill;

  const pageW = doc.internal.pageSize.getWidth();
  let y = 15;

  // Header
  doc.setFillColor(249, 115, 22);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(shop.shopName || 'SmartShop', pageW / 2, 12, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(shop.address || '', pageW / 2, 18, { align: 'center' });
  if (shop.gstNumber) doc.text(`GST: ${shop.gstNumber}`, pageW / 2, 23, { align: 'center' });

  y = 35;
  doc.setTextColor(30, 30, 30);

  // Bill info
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Bill: ${billCode || '—'}`, 10, y);
  doc.text(`Date: ${dayjs(createdAt).format('DD MMM YYYY, hh:mm A')}`, pageW - 10, y, { align: 'right' });
  y += 6;

  doc.setDrawColor(200, 200, 200);
  doc.line(10, y, pageW - 10, y);
  y += 6;

  // Table header
  doc.setFillColor(240, 240, 240);
  doc.rect(10, y - 4, pageW - 20, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Item', 12, y);
  doc.text('Qty', pageW - 50, y, { align: 'right' });
  doc.text('Price', pageW - 28, y, { align: 'right' });
  doc.text('Total', pageW - 10, y, { align: 'right' });
  y += 6;

  // Items
  doc.setFont('helvetica', 'normal');
  items.forEach((item) => {
    doc.text(item.name.slice(0, 28), 12, y);
    doc.text(String(item.qty), pageW - 50, y, { align: 'right' });
    doc.text(`₹${item.price}`, pageW - 28, y, { align: 'right' });
    doc.text(`₹${item.subtotal}`, pageW - 10, y, { align: 'right' });
    y += 6;
    if (y > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); y = 15; }
  });

  doc.line(10, y, pageW - 10, y);
  y += 6;

  // Totals
  const totalsX = pageW - 70;
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal', totalsX, y);
  doc.text(`₹${subtotal}`, pageW - 10, y, { align: 'right' });
  y += 5;
  doc.text('GST (18%)', totalsX, y);
  doc.text(`₹${gstAmount}`, pageW - 10, y, { align: 'right' });
  y += 5;

  doc.setFillColor(249, 115, 22);
  doc.rect(totalsX - 5, y - 4, pageW - totalsX + 15, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL', totalsX, y + 1);
  doc.text(`₹${total}`, pageW - 10, y + 1, { align: 'right' });
  y += 12;

  // UPI
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Pay via UPI: ${shop.upiId || '—'}`, pageW / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text('Thank you for shopping with us!', pageW / 2, y, { align: 'center' });

  return doc;
}

export function downloadBillPDF(bill) {
  const doc = generateBillPDF(bill);
  doc.save(`Bill-${bill.billCode || bill._id}.pdf`);
}
