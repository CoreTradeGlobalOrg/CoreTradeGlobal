/**
 * Admin email tool — recipient CSV parsing for the Send tab.
 *
 * One column must hold the email address; every other column becomes a
 * template variable named after its header ("Job Title" → {{Job_Title}}).
 * Common name/company headers map to the built-in variables so CSV rows
 * and members fill the same {{firstName}}. The server validates again.
 */

import Papa from 'papaparse';

export const MAX_CSV_ROWS = 10000;

// Same check as /api/unsubscribe and the server.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_VALUE_LENGTH = 1000;

const HEADER_ALIASES = {
  email: 'email',
  'e-mail': 'email',
  'email address': 'email',
  'e-mail address': 'email',
  'first name': 'firstName',
  firstname: 'firstName',
  first_name: 'firstName',
  'last name': 'lastName',
  lastname: 'lastName',
  last_name: 'lastName',
  surname: 'lastName',
  company: 'companyName',
  'company name': 'companyName',
  companyname: 'companyName',
  company_name: 'companyName',
};

function toVariableName(header) {
  const trimmed = header.trim();
  const alias = HEADER_ALIASES[trimmed.toLowerCase()];
  if (alias) return alias;
  let key = trimmed.replace(/[^A-Za-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
  if (!key) return null;
  if (/^[0-9]/.test(key)) key = `_${key}`;
  return key;
}

/**
 * @param {File} file
 * @returns {Promise<{
 *   rows?: {email: string, vars: Object<string,string>}[],
 *   columns?: {header: string, variable: string}[],
 *   invalid?: string[], duplicate?: number, error?: string
 * }>}
 */
export function parseRecipientsCsv(file) {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: ({ data, meta }) => {
        const columns = [];
        const used = new Set();
        let emailHeader = null;
        for (const header of meta.fields || []) {
          const variable = toVariableName(header);
          // A second column mapping to the same variable is ignored.
          if (!variable || used.has(variable)) continue;
          used.add(variable);
          if (variable === 'email') emailHeader = header;
          else columns.push({ header, variable });
        }
        if (!emailHeader) {
          resolve({ error: 'No email column. Name one column "email".' });
          return;
        }
        if (data.length > MAX_CSV_ROWS) {
          resolve({ error: `The file has ${data.length} rows; the limit is ${MAX_CSV_ROWS}. Split it.` });
          return;
        }

        const rows = [];
        const invalid = [];
        const seen = new Set();
        let duplicate = 0;
        for (const record of data) {
          const email = String(record[emailHeader] || '').trim().toLowerCase();
          if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
            invalid.push(String(record[emailHeader] || '(empty)').slice(0, 100));
            continue;
          }
          if (seen.has(email)) {
            duplicate += 1;
            continue;
          }
          seen.add(email);
          const vars = {};
          for (const { header, variable } of columns) {
            const value = String(record[header] ?? '').trim();
            if (value) vars[variable] = value.slice(0, MAX_VALUE_LENGTH);
          }
          rows.push({ email, vars });
        }
        resolve({ rows, columns, invalid, duplicate });
      },
      error: (err) => resolve({ error: err?.message || 'Could not read the file.' }),
    });
  });
}
