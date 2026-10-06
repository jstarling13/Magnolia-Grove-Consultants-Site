import { describe, expect, it } from "vitest";
import {
  LOGO_ACCEPT,
  MAX_LOGO_BYTES,
  checkLogoCandidate,
  formatFileSize,
  isRasterMime,
  sanitizeLogoFilename,
} from "@/lib/orderLogo";
import { isSafeSvg, validateLogoUpload } from "@/lib/orderLogoValidation";

const bytes = (...parts: (string | number[])[]) =>
  Uint8Array.from(
    parts.flatMap((part) => (typeof part === "string" ? [...Buffer.from(part, "latin1")] : part))
  );

const PNG = bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], "rest-of-png");
const JPG = bytes([0xff, 0xd8, 0xff, 0xe0], "JFIF-data");
const WEBP = bytes("RIFF", [1, 2, 3, 4], "WEBPVP8 ");
const PDF = bytes("%PDF-1.7\n%binary");
const PS = bytes("%!PS-Adobe-3.0 EPSF-3.0\n");
const SVG = bytes(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0h10v10z"/></svg>'
);

const check = (filename: string, data: Uint8Array) => validateLogoUpload({ filename, bytes: data });

describe("accepted logo files", () => {
  it.each([
    ["logo.png", PNG, "image/png", "png"],
    ["logo.jpg", JPG, "image/jpeg", "jpg"],
    ["logo.JPEG", JPG, "image/jpeg", "jpg"],
    ["logo.webp", WEBP, "image/webp", "webp"],
    ["logo.svg", SVG, "image/svg+xml", "svg"],
    ["logo.pdf", PDF, "application/pdf", "pdf"],
    ["logo.ai", PDF, "application/postscript", "ai"],
    ["logo.ai", PS, "application/postscript", "ai"],
    ["logo.eps", PS, "application/postscript", "eps"],
    ["logo.eps", PDF, "application/postscript", "eps"],
  ])("%s", (filename, data, mime, kind) => {
    const result = check(filename, data);
    expect(result).toMatchObject({ ok: true, kind, mime, size: data.length });
  });

  it("accepts a Windows-style binary EPS header, for .eps only", () => {
    const dosEps = bytes([0xc5, 0xd0, 0xd3, 0xc6], "....%!PS");
    expect(check("logo.eps", dosEps).ok).toBe(true);
    expect(check("logo.ai", dosEps).ok).toBe(false);
  });

  it("accepts a file of exactly the size cap and refuses one byte more", () => {
    const exact = new Uint8Array(MAX_LOGO_BYTES);
    exact.set(PNG);
    expect(check("big.png", exact).ok).toBe(true);
    const over = new Uint8Array(MAX_LOGO_BYTES + 1);
    over.set(PNG);
    expect(check("big.png", over)).toMatchObject({ ok: false, status: 413 });
  });

  it("derives the content type from the bytes, never from anything the client says", () => {
    // validateLogoUpload takes no content type at all; a PNG named .png is image/png.
    expect(check("logo.png", PNG)).toMatchObject({ mime: "image/png" });
  });
});

describe("refused logo files", () => {
  it("refuses empty files", () => {
    expect(check("logo.png", new Uint8Array(0))).toMatchObject({ ok: false, status: 400 });
  });

  it.each(["logo.gif", "logo.exe", "logo.html", "logo.php", "logo.zip", "logo", "logo.docx"])(
    "refuses the extension of %s",
    (filename) => {
      const result = check(filename, PNG);
      expect(result).toMatchObject({ ok: false, status: 400 });
    }
  );

  it("refuses bytes that do not match the extension", () => {
    expect(check("logo.png", JPG).ok).toBe(false);
    expect(check("logo.jpg", PNG).ok).toBe(false);
    expect(check("logo.webp", PNG).ok).toBe(false);
    expect(check("logo.pdf", PS).ok).toBe(false);
    expect(check("logo.ai", PNG).ok).toBe(false);
    expect(check("logo.eps", SVG).ok).toBe(false);
    expect(check("logo.png", bytes("<html><script>alert(1)</script></html>")).ok).toBe(false);
    expect(check("logo.svg", PNG).ok).toBe(false);
  });

  it("refuses a RIFF file that is not WebP", () => {
    expect(check("logo.webp", bytes("RIFF", [1, 2, 3, 4], "WAVEfmt ")).ok).toBe(false);
  });

  it("refuses a PDF whose header is not at the very start", () => {
    expect(check("logo.pdf", bytes("  %PDF-1.4")).ok).toBe(false);
  });

  it("refuses UTF-16 and binary data pretending to be SVG", () => {
    expect(check("logo.svg", bytes("<\0s\0v\0g\0>\0")).ok).toBe(false);
    expect(check("logo.svg", bytes([0xff, 0xfe, 0x3c, 0x00])).ok).toBe(false);
  });
});

describe("SVG safety", () => {
  const svg = (inner: string, attrs = "") =>
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ${attrs}>${inner}</svg>`;

  it("accepts ordinary drawing markup, gradients and inline styles", () => {
    expect(
      isSafeSvg(svg('<defs><linearGradient id="g"/></defs><rect fill="url(#g)" width="5"/>'))
    ).toBe(true);
    expect(isSafeSvg(svg('<use xlink:href="#a"/><use href="#a"/>'))).toBe(true);
    expect(isSafeSvg(svg('<style>.a{fill:url(#g)}</style><text class="a">Hello</text>'))).toBe(
      true
    );
    expect(
      isSafeSvg(svg('<image href="data:image/png;base64,iVBORw0KGgo=" width="5" height="5"/>'))
    ).toBe(true);
  });

  it("accepts an XML prolog, a BOM and a plain DOCTYPE", () => {
    expect(
      isSafeSvg(
        '\uFEFF<?xml version="1.0"?>\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' +
          svg("<g/>")
      )
    ).toBe(true);
  });

  it.each([
    ["a script element", svg("<script>alert(1)</script>")],
    ["a script element, odd case", svg("<SCRIPT >alert(1)</SCRIPT>")],
    ["an onload handler", svg("<g/>", 'onload="alert(1)"')],
    ["an onclick handler", svg('<rect onclick="alert(1)" width="1"/>')],
    ["a handler after a newline", svg('<rect\nonmouseover = "x()" width="1"/>')],
    ["a javascript: link", svg('<a href="javascript:alert(1)"><rect/></a>')],
    [
      "an entity-obfuscated javascript: link",
      svg('<a href="&#106;avascript:alert(1)"><rect/></a>'),
    ],
    ["an external image", svg('<image href="https://evil.example/x.png"/>')],
    ["an external xlink image", svg('<image xlink:href="http://evil.example/x.png"/>')],
    ["a protocol-relative image", svg('<image href="//evil.example/x.png"/>')],
    ["an SVG data URI link", svg('<image href="data:image/svg+xml;base64,PHN2Zz48L3N2Zz4="/>')],
    ["an HTML data URI link", svg('<a href="data:text/html;base64,PHNjcmlwdD4="><rect/></a>')],
    ["an unquoted href", svg("<use href=http://evil.example/x.svg#a />")],
    ["a foreignObject", svg("<foreignObject><div>hi</div></foreignObject>")],
    ["an iframe", svg('<iframe src="https://evil.example"/>')],
    ["an embed", svg('<embed src="x"/>')],
    ["an object", svg('<object data="x"/>')],
    ["a stylesheet link", svg('<link rel="stylesheet" href="https://evil.example/a.css"/>')],
    ["a CSS import", svg("<style>@import url(https://evil.example/a.css);</style>")],
    ["an external CSS url()", svg('<rect style="fill:url(https://evil.example/x)"/>')],
    ["an external CSS url() in quotes", svg("<rect style=\"fill:url('http://evil.example/x')\"/>")],
    ["an entity declaration", `<!DOCTYPE svg [<!ENTITY x "boom">]>${svg("<text>&x;</text>")}`],
    ["an internal DTD subset", `<!DOCTYPE svg [ ]>${svg("<g/>")}`],
  ])("rejects %s", (_name, markup) => {
    expect(isSafeSvg(markup)).toBe(false);
    const result = check("logo.svg", bytes(markup));
    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ status: 400 });
  });

  it("rejects markup that does not start as an SVG document", () => {
    expect(isSafeSvg("<html><svg/></html>")).toBe(false);
    expect(isSafeSvg("hello")).toBe(false);
    expect(isSafeSvg('<?php echo 1; ?><svg xmlns="http://www.w3.org/2000/svg"/>')).toBe(false);
  });

  it("does not mistake words that merely contain 'on' for event handlers", () => {
    expect(isSafeSvg(svg('<text font-family="Arial" font-weight="bold">Button = one</text>'))).toBe(
      true
    );
  });
});

describe("filename sanitizing", () => {
  it.each([
    ["../../etc/passwd.png", "passwd.png"],
    ["C:\\Users\\me\\logo.png", "logo.png"],
    ["/var/www/logo.png", "logo.png"],
    ['we"ird<name>.png', "we_ird_name_.png"],
    ["line\nbreak\r.png", "linebreak.png"],
    ["tab\there.png", "tabhere.png"],
    [".htaccess.png", "htaccess.png"],
    ["  spaced   out  .png", "spaced out .png"],
    ["semi;colon,comma.png", "semi_colon_comma.png"],
    ["\u202egnp.exe", "gnp.exe"],
    ["Café Logo (final).svg", "Café Logo (final).svg"],
  ])("%j becomes %j", (raw, expected) => {
    expect(sanitizeLogoFilename(raw)).toBe(expected);
  });

  it("falls back to 'logo' when nothing usable is left", () => {
    expect(sanitizeLogoFilename("")).toBe("logo");
    expect(sanitizeLogoFilename("...")).toBe("logo");
    expect(sanitizeLogoFilename("/")).toBe("logo");
  });

  it("keeps the extension when it shortens a very long name", () => {
    const name = sanitizeLogoFilename(`${"a".repeat(300)}.png`);
    expect(name.length).toBeLessThanOrEqual(100);
    expect(name.endsWith(".png")).toBe(true);
  });

  it("is what the validator stores, and the extension is judged after sanitizing", () => {
    const result = check("../../evil/Logo.PNG", PNG);
    expect(result).toMatchObject({ ok: true, filename: "Logo.PNG" });
  });
});

describe("browser-side checks", () => {
  it("checks name and size only", () => {
    expect(checkLogoCandidate({ name: "a.png", size: 100 })).toBeNull();
    expect(checkLogoCandidate({ name: "a.ai", size: MAX_LOGO_BYTES })).toBeNull();
    expect(checkLogoCandidate({ name: "a.png", size: MAX_LOGO_BYTES + 1 })).toMatch(/too large/);
    expect(checkLogoCandidate({ name: "a.png", size: MAX_LOGO_BYTES + 1 })).toMatch(/4 MB/);
    expect(checkLogoCandidate({ name: "a.gif", size: 100 })).toMatch(/not accepted/);
    expect(checkLogoCandidate({ name: "a.png", size: 0 })).toMatch(/empty/);
  });

  it("offers exactly the accepted extensions to the file picker", () => {
    expect(LOGO_ACCEPT.split(",").sort()).toEqual(
      [".ai", ".eps", ".jpeg", ".jpg", ".pdf", ".png", ".svg", ".webp"].sort()
    );
  });

  it("formats sizes and recognizes raster types", () => {
    expect(formatFileSize(500)).toBe("500 B");
    expect(formatFileSize(2048)).toBe("2 KB");
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe("2.5 MB");
    expect(isRasterMime("image/png")).toBe(true);
    expect(isRasterMime("image/webp")).toBe(true);
    expect(isRasterMime("image/svg+xml")).toBe(false);
    expect(isRasterMime("application/pdf")).toBe(false);
  });
});
