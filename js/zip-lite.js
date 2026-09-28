/* ==========================================================================
   zip-lite.js — minimal ZIP archive reader (no dependencies).

   Enough to unpack .xlsx (OOXML) packages in the browser: reads the
   central directory, supports STORE (method 0) and DEFLATE (method 8)
   entries, and includes a small raw-inflate implementation.

   Exposes global.ZipLite = { read, inflateRaw }.
   ========================================================================== */
(function (global) {
  'use strict';

  /* ---------- raw inflate (DEFLATE, RFC 1951), puff-style ---------- */

  var LEN_BASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31,
    35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
  var LEN_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2,
    3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
  var DIST_BASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193,
    257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289,
    16385, 24577];
  var DIST_EXTRA = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6,
    7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];

  function inflateRaw(src) {
    var pos = 0, bitbuf = 0, bitcnt = 0;
    var out = new Uint8Array(Math.max(src.length * 4, 4096));
    var outLen = 0;

    function grow(need) {
      if (outLen + need <= out.length) return;
      var size = out.length;
      while (size < outLen + need) size *= 2;
      var no = new Uint8Array(size);
      no.set(out.subarray(0, outLen));
      out = no;
    }
    function bits(need) {
      while (bitcnt < need) {
        if (pos >= src.length) throw new Error('inflate: unexpected end of input');
        bitbuf |= src[pos++] << bitcnt;
        bitcnt += 8;
      }
      var val = bitbuf & ((1 << need) - 1);
      bitbuf >>>= need;
      bitcnt -= need;
      return val;
    }
    function buildHuffman(lengths, n) {
      var count = new Array(16);
      for (var i = 0; i < 16; i++) count[i] = 0;
      for (i = 0; i < n; i++) count[lengths[i]]++;
      count[0] = 0;
      var left = 1;
      for (i = 1; i <= 15; i++) {
        left = (left << 1) - count[i];
        if (left < 0) throw new Error('inflate: over-subscribed huffman code');
      }
      var offs = new Array(16);
      offs[1] = 0;
      for (i = 1; i < 15; i++) offs[i + 1] = offs[i] + count[i];
      var symbols = new Array(n);
      for (i = 0; i < n; i++) if (lengths[i]) symbols[offs[lengths[i]]++] = i;
      return { count: count, symbol: symbols };
    }
    function decode(h) {
      var code = 0, first = 0, index = 0, len;
      for (len = 1; len <= 15; len++) {
        code |= bits(1);
        var cnt = h.count[len];
        if (code - first < cnt) return h.symbol[index + (code - first)];
        index += cnt;
        first = (first + cnt) << 1;
        code <<= 1;
      }
      throw new Error('inflate: invalid huffman code');
    }
    function codes(lencode, distcode) {
      for (;;) {
        var sym = decode(lencode);
        if (sym < 256) {
          grow(1);
          out[outLen++] = sym;
        } else if (sym === 256) {
          return;
        } else {
          sym -= 257;
          if (sym >= LEN_BASE.length) throw new Error('inflate: bad length symbol');
          var len = LEN_BASE[sym] + bits(LEN_EXTRA[sym]);
          var dsym = decode(distcode);
          if (dsym >= DIST_BASE.length) throw new Error('inflate: bad distance symbol');
          var dist = DIST_BASE[dsym] + bits(DIST_EXTRA[dsym]);
          if (dist > outLen) throw new Error('inflate: distance too far back');
          grow(len);
          var from = outLen - dist;
          for (var i = 0; i < len; i++) out[outLen++] = out[from++];
        }
      }
    }
    function stored() {
      /* discard leftover partial bits, then copy LEN bytes verbatim */
      bitbuf = 0; bitcnt = 0;
      if (pos + 4 > src.length) throw new Error('inflate: truncated stored block');
      var len = src[pos] | (src[pos + 1] << 8);
      pos += 4; /* LEN + NLEN */
      if (pos + len > src.length) throw new Error('inflate: truncated stored data');
      grow(len);
      for (var i = 0; i < len; i++) out[outLen++] = src[pos++];
    }
    function dynamic(lencode, distcode) {
      var order = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
      var nlen = bits(5) + 257;
      var ndist = bits(5) + 1;
      var ncode = bits(4) + 4;
      var lens = new Array(19);
      for (var i = 0; i < 19; i++) lens[i] = 0;
      for (i = 0; i < ncode; i++) lens[order[i]] = bits(3);
      var clencode = buildHuffman(lens, 19);
      var lengths = new Array(nlen + ndist);
      var index = 0;
      while (index < nlen + ndist) {
        var sym = decode(clencode);
        if (sym < 16) {
          lengths[index++] = sym;
        } else {
          var len = 0, rep;
          if (sym === 16) {
            if (index === 0) throw new Error('inflate: repeat with no previous length');
            len = lengths[index - 1];
            rep = bits(2) + 3;
          } else if (sym === 17) {
            rep = bits(3) + 3;
          } else {
            rep = bits(7) + 11;
          }
          if (index + rep > nlen + ndist) throw new Error('inflate: too many lengths');
          while (rep-- > 0) lengths[index++] = len;
        }
      }
      if (lengths[256] === 0) throw new Error('inflate: missing end-of-block code');
      var nl = new Array(nlen), nd = new Array(ndist);
      for (i = 0; i < nlen; i++) nl[i] = lengths[i];
      for (i = 0; i < ndist; i++) nd[i] = lengths[nlen + i];
      buildInto(lencode, buildHuffman(nl, nlen));
      buildInto(distcode, buildHuffman(nd, ndist));
    }
    /* huffman table objects are handed in pre-allocated so hot loops stay monomorphic */
    function buildInto(target, table) { target.count = table.count; target.symbol = table.symbol; }

    var lencode = { count: null, symbol: null };
    var distcode = { count: null, symbol: null };
    for (;;) {
      var last = bits(1);
      var type = bits(2);
      if (type === 0) stored();
      else if (type === 1) {
        var ll = new Array(288), dl = new Array(30), i;
        for (i = 0; i < 144; i++) ll[i] = 8;
        for (; i < 256; i++) ll[i] = 9;
        for (; i < 280; i++) ll[i] = 7;
        for (; i < 288; i++) ll[i] = 8;
        for (i = 0; i < 30; i++) dl[i] = 5;
        buildInto(lencode, buildHuffman(ll, 288));
        buildInto(distcode, buildHuffman(dl, 30));
        codes(lencode, distcode);
      } else if (type === 2) {
        dynamic(lencode, distcode);
        codes(lencode, distcode);
      } else {
        throw new Error('inflate: invalid block type');
      }
      if (last) break;
    }
    return out.subarray(0, outLen);
  }

  /* ---------- ZIP container ---------- */

  function readU16(b, o) { return b[o] | (b[o + 1] << 8); }
  function readU32(b, o) { return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0; }

  function Zip(u8) {
    this.u8 = u8;
    this.entries = {};      /* name -> { method, csize, offset } */
    this.names = [];
    this._parse();
  }

  Zip.prototype._parse = function () {
    var u8 = this.u8;
    /* locate End Of Central Directory (scan back over possible zip comment) */
    var eocd = -1;
    for (var i = u8.length - 22; i >= 0 && i >= u8.length - 22 - 65535; i--) {
      if (u8[i] === 0x50 && u8[i + 1] === 0x4b && u8[i + 2] === 0x05 && u8[i + 3] === 0x06) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('zip: End of Central Directory not found');
    var count = readU16(u8, eocd + 10);
    var cdOff = readU32(u8, eocd + 16);
    var p = cdOff;
    for (var n = 0; n < count; n++) {
      if (readU32(u8, p) !== 0x02014b50) throw new Error('zip: bad central directory entry');
      var method = readU16(u8, p + 10);
      var csize = readU32(u8, p + 20);
      var nlen = readU16(u8, p + 28);
      var elen = readU16(u8, p + 30);
      var clen = readU16(u8, p + 32);
      var lo = readU32(u8, p + 42);
      var name = '';
      for (var c = 0; c < nlen; c++) name += String.fromCharCode(u8[p + 46 + c]);
      if (name.charAt(name.length - 1) !== '/') {
        /* local header carries its own name/extra lengths — trust those */
        var lnlen = readU16(u8, lo + 26);
        var lelen = readU16(u8, lo + 28);
        this.entries[name] = { method: method, csize: csize, offset: lo + 30 + lnlen + lelen };
        this.names.push(name);
      }
      p += 46 + nlen + elen + clen;
    }
  };

  Zip.prototype.find = function (name) {
    var e = this.entries[name];
    if (!e) return null;
    var data = this.u8.subarray(e.offset, e.offset + e.csize);
    if (e.method === 0) return data;
    if (e.method === 8) return inflateRaw(data);
    throw new Error('zip: unsupported compression method ' + e.method + ' for ' + name);
  };

  global.ZipLite = {
    read: function (buf) { return new Zip(buf instanceof Uint8Array ? buf : new Uint8Array(buf)); },
    inflateRaw: inflateRaw
  };
})(typeof window !== 'undefined' ? window : globalThis);
