/* See license.txt for terms of usage */
function runTest() {
  var prefs = new FBTestFireformat.PrefHandler([
       "fireformatCssFormatter.wrapSize",
       "fireformatCssFormatter.atRule.tokensPerLine",
       "fireformatCssFormatter.atRule.indentLevel",
       "fireformatCssFormatter.atRule.spaceBeforeValue",
       "fireformatCssFormatter.atRule.spaceBeforeSemicolon",
       "fireformatCssFormatter.atRule.valueSpaceCount",
       "fireformatCssFormatter.atRule.typeSeparator"
  ]);

  var formatter = Format.Formatters.getFormatter("com.incaseofstairs.fireformatCSSFormatter");
  function getImportStyle(mediaText) {
    return formatter.format({
      type: CSSRule.IMPORT_RULE,
      href: "href href",
      media: { mediaText: mediaText }
    });
  }
  function getCharsetStyle() {
    return formatter.format({
      type: CSSRule.CHARSET_RULE,
      encoding: "encoding"
    });
  }
  function getMultipleStyle() {
    return formatter.format({
      cssRules:
        [
          {
            type: CSSRule.CHARSET_RULE,
            encoding: "encoding"
          },
          {
            type: CSSRule.CHARSET_RULE,
            encoding: "encoding"
          },
          {
            type: CSSRule.IMPORT_RULE,
            href: "href href",
            media: { mediaText: "media text" }
          },
          {
            type: CSSRule.IMPORT_RULE,
            href: "href href",
            media: { mediaText: "media text" }
          },
          {
            type: CSSRule.STYLE_RULE,
            selectorText: "selector",
            style: { cssText: "" }
          }
        ]
    });
  }

  // Import
  prefs.setPrefs(80, 10, 1, 1 , 0, 1, "\n");
  FBTest.compare("@import url(\"href href\") media text;", getImportStyle("media text"), "Import rule, no wrap");
  prefs.setPrefs(80, 10, 1, 2, 1, 2, "\n");
  FBTest.compare("@import  url(\"href href\")  media text ;", getImportStyle("media text"), "Import rule, no wrap, space");
  prefs.setPrefs(80, 1, 1, 1, 0, 2, "\n");
  FBTest.compare("@import\n  url(\"href href\")\n  media text;", getImportStyle("media text"), "Import rule, token wrap");
  prefs.setPrefs(10, 10, 1, 1, 0, 2, "\n");
  FBTest.compare("@import url(\"href href\")\n  media text;", getImportStyle("media text"), "Import rule, char wrap");
  prefs.setPrefs(80, 10, 1, 1 , 0, 1, "\n");
  FBTest.compare("@import url(\"href href\");", getImportStyle(""), "Import rule no media, no wrap");
  prefs.setPrefs(80, 10, 1, 2, 1, 2, "\n");
  FBTest.compare("@import  url(\"href href\") ;", getImportStyle(""), "Import rule no media, no wrap, space");
  prefs.setPrefs(80, 1, 1, 1, 0, 2, "\n");
  FBTest.compare("@import\n  url(\"href href\");", getImportStyle(""), "Import rule no media, token wrap");
  prefs.setPrefs(10, 10, 1, 1, 0, 2, "\n");
  FBTest.compare("@import url(\"href href\");", getImportStyle(""), "Import rule no media, char wrap");
  prefs.setPrefs(80, 10, 1, 1 , 0, 1, "\n");
  FBTest.compare("@import url(\"href href\") media text, text for media;", getImportStyle("media text, text for media"), "Import rule multiple media, no wrap");
  prefs.setPrefs(80, 10, 1, 2, 1, 2, "\n");
  FBTest.compare("@import  url(\"href href\")  media text,  text for media ;", getImportStyle("media text, text for media"), "Import rule multiple media, no wrap, space");
  prefs.setPrefs(80, 1, 1, 1, 0, 2, "\n");
  FBTest.compare("@import\n  url(\"href href\")\n  media text,\n  text for media;", getImportStyle("media text, text for media"), "Import rule multiple media, token wrap");
  prefs.setPrefs(10, 10, 1, 1, 0, 2, "\n");
  FBTest.compare("@import url(\"href href\")\n  media text,\n  text for media;", getImportStyle("media text, text for media"), "Import rule multiple media, char wrap");

  // Charset
  prefs.setPrefs(80, 10, 1, 1, 0, 1, "\n");
  FBTest.compare("@charset \"encoding\";", getCharsetStyle(), "Charset rule, no wrap");
  prefs.setPrefs(80, 10, 1, 2, 1, 2, "\n");
  FBTest.compare("@charset  \"encoding\" ;", getCharsetStyle(), "Charset rule, no wrap, space");
  prefs.setPrefs(80, 1, 1, 1, 0, 2, "\n");
  FBTest.compare("@charset\n  \"encoding\";", getCharsetStyle(), "Charset rule, token wrap");
  prefs.setPrefs(8, 10, 1, 1, 0, 2, "\n");
  FBTest.compare("@charset\n  \"encoding\";", getCharsetStyle(), "Charset rule, char wrap");

  // TODO : Test the type separator paramter
  prefs.setPrefs(80, 10, 1, 1, 0, 1, "\n");
  FBTest.compare(
      "@charset \"encoding\";\n@charset \"encoding\";\n\n"
      + "@import url(\"href href\") media text;\n@import url(\"href href\") media text;\n\n"
      + "selector {\n\n}\n", getMultipleStyle(), "Multiple rule, no wrap");
  prefs.setPrefs(80, 10, 1, 1, 0, 1, "");
  FBTest.compare(
      "@charset \"encoding\";\n@charset \"encoding\";\n"
      + "@import url(\"href href\") media text;\n@import url(\"href href\") media text;\n"
      + "selector {\n\n}\n", getMultipleStyle(), "Multiple rule, no wrap");

  prefs.reset();

  FBTest.testDone();
}