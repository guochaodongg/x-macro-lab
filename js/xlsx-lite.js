/* ==========================================================================
   xlsx-lite.js — minimal .xlsx (OOXML) worksheet reader (no dependencies).

   Depends on zip-lite.js. Parses workbook.xml (sheet names + r:id),
   workbook.xml.rels (r:id -> part path), sharedStrings.xml and each
   worksheet part, then exposes per-sheet random cell access.

   Exposes global.XLSXLite = { parse }.
   parse(bytes) -> {
     sheetNames: ['Sheet1', ...],
     sheet: function (nameOrIndex) -> Sheet
   }
   Sheet: { name, maxRow, maxCol, cell(row, col) }
     row/col are 1-based (A1 -> cell(1,1)); cell() returns a Number for
     numeric cells, a String for text cells, or null for empty/error.
   ========================================================================== */
(function (global) {
  'use strict';

  var ENC = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&#39;': "'" };

  function decodeEntities(s) {
    if (s.indexOf('&') < 0) return s;
    return s.replace(/&(?:amp|lt|gt|quot|apos|#39|#x[0-9a-fA-F]+|#\d+);/g, function (m) {
      if (ENC[m] !== undefined) return ENC[m];
      if (m.charAt(1) === '#x' || m.charAt(1) === '#X') return String.fromCodePoint(parseInt(m.slice(3, -1), 16));
      if (m.charAt(1) === '#') return String.fromCodePoint(parseInt(m.slice(2, -1), 10));
      return m;
    });
  }

  /* 'A' -> 1, 'Z' -> 26, 'AA' -> 27 */
  function colToIndex(ref) {
    var idx = 0;
    for (var i = 0; i < ref.length; i++) {
      var ch = ref.charCodeAt(i);
      if (ch >= 65 && ch <= 90) idx = idx * 26 + (ch - 64);
      else if (ch >= 97 && ch <= 122) idx = idx * 26 + (ch - 96);
      else return idx; /* hit digits: stop */
    }
    return idx;
  }
  /* split 'AB12' -> { col: 28, row: 12 } */
  function parseRef(ref) {
    var i = 0, col = 0, row = 0;
    while (i < ref.length) {
      var ch = ref.charCodeAt(i);
      if (ch >= 65 && ch <= 90) col = col * 26 + (ch - 64);
      else if (ch >= 97 && ch <= 122) col = col * 26 + (ch - 96);
      else break;
      i++;
    }
    while (i < ref.length) {
      ch = ref.charCodeAt(i);
      if (ch >= 48 && ch <= 57) row = row * 10 + (ch - 48);
      else break;
      i++;
    }
    return { col: col, row: row };
  }

  function Sheet(name, rows) {
    this.name = name;
    this._rows = rows; /* map: row -> map: col -> value */
    this.maxRow = 0;
    this.maxCol = 0;
    for (var r in rows) {
      var rn = +r;
      if (rn > this.maxRow) this.maxRow = rn;
      for (var c in rows[rn]) {
        var cn = +c;
        if (cn > this.maxCol) this.maxCol = cn;
      }
    }
  }

  Sheet.prototype.cell = function (row, col) {
    var r = this._rows[row];
    if (!r) return null;
    var v = r[col];
    return v === undefined ? null : v;
  };

  /* read every <t>...</t> inside one <si> block (rich-text runs included) */
  function readSi(block) {
    var out = '';
    var re = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g, m;
    while ((m = re.exec(block)) !== null) out += decodeEntities(m[1]);
    if (out === '') {
      /* <si><t/></si> edge: empty string */
      if (/<t\/>/.test(block)) return '';
    }
    return out;
  }

  function parseSharedStrings(xml) {
    var strings = [];
    if (!xml) return strings;
    var re = /<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g, m;
    while ((m = re.exec(xml)) !== null) strings.push(readSi(m[1]));
    return strings;
  }

  function textOf(xml, tag) {
    var m = xml.match(new RegExp('<' + tag + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + tag + '>'));
    return m ? m[1] : '';
  }

  function parseWorkbookRels(xml) {
    var map = {};
    if (!xml) return map;
    var re = /<Relationship\s[^>]*\/?>(?:<\/Relationship>)?/g, m;
    while ((m = re.exec(xml)) !== null) {
      var tag = m[0];
      var id = (tag.match(/Id="([^"]+)"/) || [])[1];
      var target = (tag.match(/Target="([^"]+)"/) || [])[1];
      if (id && target) map[id] = target;
    }
    return map;
  }

  function parseWorkbook(xml) {
    var sheets = [];
    var re = /<sheet\s[^>]*\/?>(?:<\/sheet>)?/g, m;
    while ((m = re.exec(xml)) !== null) {
      var tag = m[0];
      var name = (tag.match(/name="([^"]*)"/) || [])[1];
      var rid = (tag.match(/r:id="([^"]+)"/) || tag.match(/r:id='([^']+)'/) || [])[1];
      if (name) sheets.push({ name: decodeEntities(name), rid: rid });
    }
    return sheets;
  }

  function parseSheetXml(xml, shared) {
    var rows = {};
    if (!xml) return rows;
    var rowRe = /<row\s[^>]*?\/?>(?:([\s\S]*?)<\/row>)?/g, rm;
    while ((rm = rowRe.exec(xml)) !== null) {
      var rowTag = rm[0];
      var selfClosing = rowTag.charAt(rowTag.length - 2) === '/';
      var rowNum = (rowTag.match(/r="(\d+)"/) || [])[1];
      if (rowNum === undefined) {
        if (selfClosing || rm[1] === undefined) continue;
        rowNum = String(rows.length + 1); /* best effort fallback */
      }
      var rn = parseInt(rowNum, 10);
      if (!rn) continue;
      var body = rm[1];
      if (!body) continue;
      var cols = {};
      var cellRe = /<c\s([^>]*?)(\/>|>([\s\S]*?)<\/c>)/g, cm;
      var seq = 1; /* fallback column counter when r= is missing */
      while ((cm = cellRe.exec(body)) !== null) {
        var attrs = cm[1];
        var inner = cm[3] !== undefined ? cm[3] : '';
        var ref = (attrs.match(/r="([A-Za-z]+[0-9]+)"/) || [])[1];
        var cn;
        if (ref) cn = parseRef(ref).col;
        else cn = seq;
        seq = cn + 1;
        if (!cn) continue;
        var type = (attrs.match(/t="([^"]+)"/) || [])[1];
        var val = null;
        if (type === 'inlineStr') {
          val = readSi(inner);
        } else {
          var vm = inner.match(/<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/);
          if (vm) {
            var raw = decodeEntities(vm[1]);
            if (type === 's') {
              var idx = parseInt(raw, 10);
              val = shared[idx] !== undefined ? shared[idx] : null;
            } else if (type === 'str') {
              val = raw;
            } else if (type === 'b') {
              val = raw === '1' ? 1 : 0;
            } else if (type === 'e') {
              val = null;
            } else {
              var num = Number(raw);
              val = (raw !== '' && isFinite(num)) ? num : raw;
            }
          }
        }
        cols[cn] = val;
      }
      rows[rn] = cols;
    }
    return rows;
  }

  function latin1(u8) {
    var s = '';
    var n = u8.length, i = 0;
    /* decode as UTF-8 when a BOM or pure-ASCII/NUL-ascii pattern suggests text;
       worksheet XML is UTF-8 in practice, so just try UTF-8 first */
    try { s = new global.TextDecoder ? new global.TextDecoder('utf-8').decode(u8) : null; } catch (e) { s = null; }
    if (s === null) {
      for (i = 0; i < n; i++) s += String.fromCharCode(u8[i]);
    }
    return s;
  }

  function parse(bytes) {
    var zip = global.ZipLite.read(bytes);
    function part(name) {
      var d = zip.find(name);
      return d ? latin1(d) : '';
    }

    var shared = parseSharedStrings(part('xl/sharedStrings.xml'));
    var rels = parseWorkbookRels(part('xl/_rels/workbook.xml.rels'));
    var wbSheets = parseWorkbook(part('xl/workbook.xml'));
    if (!wbSheets.length) throw new Error('xlsx: workbook.xml has no <sheet> entries');

    var sheetNames = [];
    var sheetMap = {};
    wbSheets.forEach(function (s) {
      var target = rels[s.rid] || ('worksheets/sheet' + (sheetNames.length + 1) + '.xml');
      target = target.replace(/^\//, '').replace(/^(?!xl\/)/, 'xl/');
      var xml = part(target);
      if (!xml) xml = part('xl/worksheets/sheet' + (sheetNames.length + 1) + '.xml');
      sheetNames.push(s.name);
      sheetMap[s.name] = new Sheet(s.name, parseSheetXml(xml, shared));
    });

    return {
      sheetNames: sheetNames,
      sheet: function (nameOrIndex) {
        var name = typeof nameOrIndex === 'number' ? sheetNames[nameOrIndex] : nameOrIndex;
        var sh = sheetMap[name];
        if (!sh) throw new Error('xlsx: no sheet named "' + name + '" (have: ' + sheetNames.join(', ') + ')');
        return sh;
      }
    };
  }

  global.XLSXLite = {
    parse: parse,
    colToIndex: colToIndex,
    decodeEntities: decodeEntities
  };
})(typeof window !== 'undefined' ? window : globalThis);
