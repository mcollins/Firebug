/* See license.txt for terms of usage */

(function() {
  const Cc = Components.classes;
  const Ci = Components.interfaces;

  const PrefService = Cc["@mozilla.org/preferences-service;1"];
  const prefs = PrefService.getService(Ci.nsIPrefBranch2);

  var formatter = Fireformat.Formatters.getFormatter("com.incaseofstairs.fireformatHTMLFormatter");

  function getTestBox() {
    return document.getElementById("htmlFormatterTest");
  }
  function getPreviewDoc() {
    return document.getElementById("htmlPreviewDoc").contentDocument;
  }

  FireformatOptions.updateHtmlPreview = function() {
    setTimeout(function() {
      var prefCache = new FireformatOptions.OptionsPrefCache(
              document.getElementById("ffmt_htmlFormatPreferences"),
              "extensions.firebug.fireformatHtmlFormatter"),
          showWhitespace = document.getElementById("pref_html_showWhitespace"),
          text = getTestBox();
      text.replaceWhitespace = showWhitespace.value;
      text.wrapPosition = prefCache.getPref("wrapSize");
      text.tabSize = prefCache.getPref("tabSize");
      text.value = formatter.format(getPreviewDoc(), prefCache);
      window.sizeToContent();
    }, 0);
  };
})();