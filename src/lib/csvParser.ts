import * as XLSX from 'xlsx';

export interface Transaction {
  date: Date;
  valor: number;
  id: string;
  descricao: string;
  tipo: 'receita' | 'despesa';
  contraparte: string;
  month: string;
  source?: string;
}

export interface MonthSummary {
  month: string;
  receita: number;
  despesa: number;
  resultado: number;
}

export interface TopEntry {
  nome: string;
  total: number;
  count: number;
}

export interface BankDashboard {
  transactions: Transaction[];
  totalReceita: number;
  totalDespesa: number;
  resultado: number;
  byMonth: MonthSummary[];
  topClientes: TopEntry[];
  topFornecedores: TopEntry[];
  sources: string[];
}

const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function extractName(descricao: string): string {
  const pixMatch = descricao.match(/(?:recebida|enviada) pelo Pix - (.+?) - [•\d]/i);
  if (pixMatch) return pixMatch[1].trim();

  const debitoMatch = descricao.match(/Compra no d[eé]bito - (.+)/i);
  if (debitoMatch) return debitoMatch[1].trim();

  const boletoMatch = descricao.match(/Pagamento .+? - (.+)/i);
  if (boletoMatch) return boletoMatch[1].trim();

  const parts = descricao.split(' - ');
  return parts[parts.length - 1]?.trim() || descricao.trim();
}

function parseRow(dateStr: string, valorStr: string, id: string, descricao: string, source: string): Transaction | null {
  const valor = parseFloat(String(valorStr).replace(',', '.'));
  if (isNaN(valor)) return null;

  // DD/MM/YYYY or YYYY-MM-DD
  let date: Date;
  if (String(dateStr).includes('/')) {
    const [day, month, year] = String(dateStr).split('/').map(Number);
    if (!day || !month || !year) return null;
    date = new Date(year, month - 1, day);
  } else if (String(dateStr).includes('-')) {
    const [year, month, day] = String(dateStr).split('-').map(Number);
    if (!day || !month || !year) return null;
    date = new Date(year, month - 1, day);
  } else if (typeof dateStr === 'number') {
    // Excel serial date
    date = XLSX.SSF.parse_date_code(dateStr as any) as any;
    const d = XLSX.SSF.parse_date_code(dateStr as any);
    date = new Date(d.y, d.m - 1, d.d);
  } else {
    return null;
  }

  const month = date.getMonth();
  const year = date.getFullYear();
  const monthKey = `${MONTH_NAMES[month]}/${String(year).slice(2)}`;
  const tipo: 'receita' | 'despesa' = valor >= 0 ? 'receita' : 'despesa';
  const contraparte = extractName(String(descricao));
  const txId = String(id) || `${dateStr}-${valorStr}-${descricao}`;

  return { date, valor, id: txId, descricao: String(descricao), tipo, contraparte, month: monthKey, source };
}

export function parseTransactionsFromCSV(csvText: string, source = 'extrato'): Transaction[] {
  const lines = csvText.replace(/\r/g, '').trim().split('\n');
  const transactions: Transaction[] = [];

  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;

    const firstComma = line.indexOf(',');
    const secondComma = line.indexOf(',', firstComma + 1);
    const thirdComma = line.indexOf(',', secondComma + 1);
    if (firstComma < 0 || secondComma < 0 || thirdComma < 0) continue;

    const dateStr = line.slice(0, firstComma).trim();
    const valorStr = line.slice(firstComma + 1, secondComma).trim();
    const id = line.slice(secondComma + 1, thirdComma).trim();
    const descricao = line.slice(thirdComma + 1).trim();

    const tx = parseRow(dateStr, valorStr, id, descricao, source);
    if (tx) transactions.push(tx);
  }

  return transactions;
}

export function parseTransactionsFromExcel(buffer: ArrayBuffer, source = 'extrato'): Transaction[] {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  if (rows.length < 2) return [];

  // Detect column indices from header row
  const header = rows[0].map((h: any) => String(h).toLowerCase().trim());
  const dateIdx = header.findIndex((h: string) => h.includes('data') || h === 'date');
  const valorIdx = header.findIndex((h: string) => h.includes('valor') || h === 'value' || h === 'amount');
  const idIdx = header.findIndex((h: string) => h.includes('identif') || h === 'id');
  const descIdx = header.findIndex((h: string) => h.includes('descri') || h.includes('desc') || h.includes('hist'));

  // Fallback: assume columns 0,1,2,3
  const dIdx = dateIdx >= 0 ? dateIdx : 0;
  const vIdx = valorIdx >= 0 ? valorIdx : 1;
  const iIdx = idIdx >= 0 ? idIdx : 2;
  const descI = descIdx >= 0 ? descIdx : 3;

  const transactions: Transaction[] = [];
  for (const row of rows.slice(1)) {
    if (!row[dIdx] && !row[vIdx]) continue;
    const tx = parseRow(row[dIdx], row[vIdx], row[iIdx], row[descI], source);
    if (tx) transactions.push(tx);
  }

  return transactions;
}

export function buildDashboard(transactions: Transaction[]): BankDashboard {
  const totalReceita = transactions.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0);
  const totalDespesa = Math.abs(transactions.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0));
  const resultado = totalReceita - totalDespesa;

  const monthMap = new Map<string, { receita: number; despesa: number; date: Date }>();
  for (const t of transactions) {
    const existing = monthMap.get(t.month) ?? { receita: 0, despesa: 0, date: t.date };
    if (t.tipo === 'receita') existing.receita += t.valor;
    else existing.despesa += Math.abs(t.valor);
    monthMap.set(t.month, existing);
  }
  const byMonth: MonthSummary[] = Array.from(monthMap.entries())
    .sort((a, b) => a[1].date.getTime() - b[1].date.getTime())
    .map(([month, v]) => ({ month, receita: v.receita, despesa: v.despesa, resultado: v.receita - v.despesa }));

  const clientMap = new Map<string, { total: number; count: number }>();
  for (const t of transactions.filter(t => t.tipo === 'receita')) {
    const e = clientMap.get(t.contraparte) ?? { total: 0, count: 0 };
    e.total += t.valor; e.count++;
    clientMap.set(t.contraparte, e);
  }
  const topClientes: TopEntry[] = Array.from(clientMap.entries())
    .map(([nome, v]) => ({ nome, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const supplierMap = new Map<string, { total: number; count: number }>();
  for (const t of transactions.filter(t => t.tipo === 'despesa')) {
    const e = supplierMap.get(t.contraparte) ?? { total: 0, count: 0 };
    e.total += Math.abs(t.valor); e.count++;
    supplierMap.set(t.contraparte, e);
  }
  const topFornecedores: TopEntry[] = Array.from(supplierMap.entries())
    .map(([nome, v]) => ({ nome, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const sources = [...new Set(transactions.map(t => t.source ?? 'extrato').filter(Boolean))];

  return { transactions, totalReceita, totalDespesa, resultado, byMonth, topClientes, topFornecedores, sources };
}

// Merge new transactions into existing, dedup by source+id (prevents cross-account collisions)
export function mergeTransactions(existing: Transaction[], incoming: Transaction[]): Transaction[] {
  const key = (t: Transaction) => `${t.source ?? ''}::${t.id}`;
  const seen = new Set(existing.map(key));
  const deduped = incoming.filter(t => !seen.has(key(t)));
  return [...existing, ...deduped];
}

export class PDFPasswordError extends Error {
  constructor(public readonly isWrong: boolean) {
    super(isWrong ? 'Senha incorreta.' : 'PDF protegido por senha.')
    this.name = 'PDFPasswordError'
  }
}

export async function parseTransactionsFromPDF(file: File, source = 'extrato', password?: string): Promise<Transaction[]> {
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist')
  GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString()

  const buffer = await file.arrayBuffer()
  let pdf: any
  try {
    pdf = await getDocument({ data: buffer, password: password ?? '' }).promise
  } catch (err: any) {
    if (err?.name === 'PasswordException') {
      // code 1 = need password, code 2 = wrong password
      throw new PDFPasswordError(err.code === 2)
    }
    throw err
  }
  // Extract all text items, sorted page-order then top→bottom left→right
  interface TItem { x: number; y: number; page: number; str: string }
  const allItems: TItem[] = []

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const content = await page.getTextContent()
    for (const item of content.items as any[]) {
      if (item.str?.trim()) {
        allItems.push({ x: item.transform[4], y: item.transform[5], page: p, str: item.str })
      }
    }
  }

  // Sort: page asc, Y desc (top first), X asc (left first)
  allItems.sort((a, b) => a.page - b.page || b.y - a.y || a.x - b.x)

  // Build two representations:
  // 1. Line-grouped (±5px Y tolerance) for same-line date+value
  // 2. Full flat text for cross-line search
  const lineMap = new Map<number, TItem[]>()
  for (const item of allItems) {
    const bucket = Math.round(item.y / 5) * 5
    const arr = lineMap.get(bucket) ?? []
    arr.push(item)
    lineMap.set(bucket, arr)
  }
  const lines = [...lineMap.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, items]) => items.sort((a, b) => a.x - b.x).map(i => i.str).join(' ').trim())
    .filter(Boolean)

  const flatText = allItems.map(i => i.str).join(' ')

  const transactions: Transaction[] = []
  const seen = new Set<string>()

  function cleanValor(raw: string): string {
    return raw
      .replace(/\s/g, '').replace('R$', '').replace('$', '')
      .replace('−', '-').replace('–', '-').replace(/\./g, '').replace(',', '.')
  }

  // Strategy A: date + value on same reconstructed line
  const lineValorRe = /([-−–+]?\s*R?\$?\s*[\d.]{1,10},\d{2})/g
  for (const line of lines) {
    const dateM = line.match(/(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})/)
    if (!dateM) continue
    const valorMs = [...line.matchAll(lineValorRe)]
    if (!valorMs.length) continue
    const rawV = valorMs[valorMs.length - 1][1]
    const valorStr = cleanValor(rawV)
    const dateEnd = line.indexOf(dateM[1]) + dateM[1].length
    const vStart = line.lastIndexOf(rawV)
    const descricao = line.slice(dateEnd, vStart).trim().replace(/\s+/g, ' ') || line.trim()
    const id = `${dateM[1]}::${valorStr}::${descricao.slice(0, 30)}`
    if (!seen.has(id)) {
      seen.add(id)
      const tx = parseRow(dateM[1], valorStr, id, descricao, source)
      if (tx) transactions.push(tx)
    }
  }

  // Strategy B: scan flat text for date followed within 300 chars by a currency value
  // Catches layouts where description wraps across lines
  const flatDateRe = /(\d{2}\/\d{2}\/\d{4})/g
  let m: RegExpExecArray | null
  while ((m = flatDateRe.exec(flatText)) !== null) {
    const dateStr = m[1]
    const window = flatText.slice(m.index, m.index + 350)
    // Look for a standalone currency value: digits,cents possibly with R$ or sign
    const vM = window.match(/(?:^|[\s(])([-−–+]?R?\$?\s*\d{1,3}(?:\.\d{3})*,\d{2})(?=\s|$|[)\s])/)
    if (!vM) continue
    const valorStr = cleanValor(vM[1])
    const descricao = window.slice(dateStr.length, window.indexOf(vM[1])).trim().replace(/\s+/g, ' ').slice(0, 80) || dateStr
    const id = `${dateStr}::${valorStr}::${descricao.slice(0, 30)}`
    if (!seen.has(id)) {
      seen.add(id)
      const tx = parseRow(dateStr, valorStr, id, descricao, source)
      if (tx) transactions.push(tx)
    }
  }

  // Debug: log first 20 lines to console so format issues can be diagnosed
  if (transactions.length === 0) {
    console.warn('[PDF parser] 0 transactions found. First 30 lines extracted:')
    lines.slice(0, 30).forEach((l, i) => console.warn(`  [${i}] ${l}`))
  }

  return transactions
}

export function parseNubankCSV(csvText: string): BankDashboard {
  return buildDashboard(parseTransactionsFromCSV(csvText));
}
