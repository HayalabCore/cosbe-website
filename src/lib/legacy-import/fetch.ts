import axios from 'axios';
import * as cheerio from 'cheerio';

const USER_AGENT = 'CosBE-Importer/1.0';

export async function fetchLegacyHtml(url: string): Promise<string> {
  const { data } = await axios.get<string>(url, {
    timeout: 30000,
    headers: { 'User-Agent': USER_AGENT },
    responseType: 'text',
    validateStatus: (s) => s >= 200 && s < 400,
  });
  return data;
}

export function loadLegacyHtml(html: string) {
  return cheerio.load(html);
}
