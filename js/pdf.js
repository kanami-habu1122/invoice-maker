// ============================================================
// pdf.js - PDF出力
// ============================================================

async function exportPdf() {

  // バリデーション
  const subject = document.getElementById('subject').value.trim();
  if (!subject) {
    alert('件名を入力してからPDFを出力してください。');
    document.getElementById('subject').focus();
    return;
  }

  // プレビューを最新状態に更新する
  updatePreview();

  const previewEl = document.getElementById('invoicePreview');
  if (!previewEl) return;
  const previewHtml = previewEl.innerHTML;

  // 無料プランのときだけウォーターマークを入れる
  const watermarkHtml = getPlan() === 'free' ? `
    <div style="text-align:right; margin-top:12px; font-size:10px; color:#bbb;">
      無料プラン | 請求書メーカー
    </div>
  ` : '';


  // CSSファイルをテキストとして読み込む
  let baseCss = '', invoiceCss = '';
  try {
    const [baseRes, invoiceRes] = await Promise.all([
      fetch('css/base.css'),
      fetch('css/invoice.css'),
    ]);
    baseCss    = await baseRes.text();
    invoiceCss = await invoiceRes.text();
  } catch (e) {
    console.warn('CSS fetch 失敗', e);
  }

  // PDFファイル名を組み立てる（Chrome は title がファイル名になる）
  const clientName = document.getElementById('clientName').value.trim();
  const senderName = document.getElementById('senderName').value.trim();
  const dateVal    = document.getElementById('invoiceDate').value.replace(/-/g, '').slice(0, 6);
  const parts = ['請求書', clientName, senderName, dateVal].filter(Boolean);
  const pdfTitle = parts.join('_');

  // 印刷用 HTML を組み立てる
  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>${pdfTitle}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm;
      /* ヘッダー・フッターの余白をなくす（対応ブラウザのみ） */
      margin-header: 0;
      margin-footer: 0;
    }
    ${baseCss}
    ${invoiceCss}
    body { background: #fff; margin: 0; padding: 0; }
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .invoice-preview {
      border: none !important;
      box-shadow: none !important;
      padding: 0 !important;
      border-radius: 0 !important;
    }
    .inv-table tr { page-break-inside: avoid; }
  </style>
</head>
<body>
  <div class="invoice-preview">
    ${previewHtml}
  </div>
  ${watermarkHtml}
  <script>
    window.addEventListener('load', function() {
      window.print();
    });
    window.addEventListener('afterprint', function() {
      window.close();
    });
  <\/script>
</body>
</html>`;

  // Blob URL で開く
  // window.open('', '_blank') の「about:blank」を避けるため Blob を使う
  const blob   = new Blob([html], { type: 'text/html' });
  const blobUrl = URL.createObjectURL(blob);
  const printWin = window.open(blobUrl, '_blank', 'width=820,height=1100');

  if (!printWin) {
    alert('ポップアップがブロックされました。\nブラウザのアドレスバー右側の許可ボタンを押してください。');
    URL.revokeObjectURL(blobUrl);
    return;
  }

  // Blob URL は使い終わったら解放する（メモリリーク防止）
  printWin.addEventListener('unload', () => URL.revokeObjectURL(blobUrl));
}
