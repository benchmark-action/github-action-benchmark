import { strict as A } from 'assert';
import * as cheerio from 'cheerio';
import { Parser as JsParser } from 'acorn';
import { DEFAULT_INDEX_HTML } from '../src/default_index_html';

describe('DEFAULT_INDEX_HTML', function() {
    it('is valid HTML and its script is valid as JavaScript', function() {
        // Verify HTML syntax
        const q = cheerio.load(DEFAULT_INDEX_HTML);
        const s = q('#main-script');
        A.ok(s);
        const src = s.html();
        A.ok(src);

        // Verify JavaScript syntax. It raises an error if invalid
        JsParser.parse(src as string);
    });
});
