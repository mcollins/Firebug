/* See license.txt for terms of usage */

(function() {
  const Cc = Components.classes;
  const Ci = Components.interfaces;

  const PrefService = Cc["@mozilla.org/preferences-service;1"];
  const prefs = PrefService.getService(Ci.nsIPrefBranch2);

  const preview = {
    cssRules: [
     {
       type: CSSRule.CHARSET_RULE,
       encoding: "encoding"
     },
     {
       type: CSSRule.IMPORT_RULE,
       href: "href URL",
       media: { mediaText: "media text" }
     },
     {
       type: CSSRule.IMPORT_RULE,
       href: "href href",
       media: { mediaText: "media text" }
     },
     {
       type: CSSRule.MEDIA_RULE,
       media: [ "screen", "print" ],
       cssRules: [
         {
           type: CSSRule.STYLE_RULE,
           selectorText: "selector",
           style: { cssText: "property: value;" }
         },
         {
           type: CSSRule.STYLE_RULE,
           selectorText: "selector2",
           style: { cssText: "property: value; property: value;" }
         }
       ]
     },
     {
       type: CSSRule.STYLE_RULE,
       selectorText: ".single",
       style: { cssText: "" }
     },
     {
       type: CSSRule.STYLE_RULE,
       selectorText: ".single[name] > DIV.test + *, .double:focus, .triple#myid",
       style: { cssText: "background-color : green;background : green brown !important;background : \'green string\';" }
     }
    ]
  };

  var formatter = Fireformat.Formatters.getFormatter("com.incaseofstairs.fireformatCSSFormatter");

  function getTestBox() {
    return document.getElementById("cssFormatterTest");
  }

  FireformatOptions.updateCssPreview = function() {
    setTimeout(function() {
      var prefCache = new FireformatOptions.OptionsPrefCache(
              document.getElementById("ffmt_cssFormatPreferences"),
              "extensions.firebug.fireformatCssFormatter"),
          showWhitespace = document.getElementById("pref_css_showWhitespace"),
          text = getTestBox();
      text.replaceWhitespace = showWhitespace.value;
      text.wrapPosition = prefCache.getPref("wrapSize");
      text.tabSize = prefCache.getPref("tabSize");
      text.value = formatter.format(preview, prefCache);
      window.sizeToContent();
    }, 0);
  };
})();