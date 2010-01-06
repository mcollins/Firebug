/* See license.txt for terms of usage */
function runTest() {
  FBTest.loadScript("FBTestFireformat.js", this);
  var prefs = new FBTestFireformat.PrefHandler([
       "fireformatHtmlFormatter.element.htmlNameToLower",
       "fireformatHtmlFormatter.element.separatorBeforeAttributes",
       "fireformatHtmlFormatter.element.separatorBeforeClose",
       "fireformatHtmlFormatter.element.separatorBeforeSelfClose",
       "fireformatHtmlFormatter.wrapSize"
  ]);

  var formatter = Format.Formatters.getFormatter("com.incaseofstairs.fireformatHTMLFormatter");
  

  // HTML Element Tests
  var htmlElement = document.createElement("div");
  prefs.setPrefs(true, " ", "", " ");
  FBTest.compare("<div></div>", formatter.format(htmlElement), "HTML Element no attr, Spaces");
  prefs.setPrefs(true, "\n", "", " ");
  FBTest.compare("<div></div>", formatter.format(htmlElement), "HTML Element no attr, Spaces");
  prefs.setPrefs(true, "\n", " ", " ");
  FBTest.compare("<div ></div>", formatter.format(htmlElement), "HTML Element no attr, Newline Spaces");

  prefs.setPrefs(true, " ", "", " ", 1);
  FBTest.compare("<div></div>", formatter.format(htmlElement), "HTML Element no attr, Spaces, wrap");
  prefs.setPrefs(true, "\n", "", " ", 1);
  FBTest.compare("<div></div>", formatter.format(htmlElement), "HTML Element no attr, Spaces, wrap");
  prefs.setPrefs(true, "\n", " ", " ", 1);
  FBTest.compare("<div ></div>", formatter.format(htmlElement), "HTML Element no attr, Newline Spaces, wrap");

  htmlElement.setAttribute("class", "test value");

  prefs.setPrefs(true, " ", "", " ");
  FBTest.compare("<div class=\"test value\"></div>", formatter.format(htmlElement), "HTML Element, Spaces");
  prefs.setPrefs(true, "", "", " ");
  FBTest.compare("<divclass=\"test value\"></div>", formatter.format(htmlElement), "HTML Element, Spaces");
  prefs.setPrefs(true, "\n", "", " ");
  FBTest.compare("<div\n  class=\"test value\"></div>", formatter.format(htmlElement), "HTML Element, Spaces");
  prefs.setPrefs(true, "\n", " ", " ");
  FBTest.compare("<div\n  class=\"test value\" ></div>", formatter.format(htmlElement), "HTML Element, Newline Spaces");

  prefs.setPrefs(true, " ", "", " ", 1);
  FBTest.compare("<div \n  class=\"test value\"></div>", formatter.format(htmlElement), "HTML Element, Spaces wrap");
  prefs.setPrefs(true, "\n", "", " ", 1);
  FBTest.compare("<div\n  class=\"test value\"></div>", formatter.format(htmlElement), "HTML Element, Spaces wrap");
  prefs.setPrefs(true, "\n", " ", " ", 1);
  FBTest.compare("<div\n  class=\"test value\" ></div>", formatter.format(htmlElement), "HTML Element, Newline Spaces wrap");

  htmlElement.appendChild(document.createTextNode("\n   "));
  var childElement = document.createElement("br");
  htmlElement.appendChild(childElement);

  prefs.setPrefs(false, "", "", "");
  FBTest.compare("<DIVclass=\"test value\">\n   <BR></DIV>", formatter.format(htmlElement), "Child HTML Element, Spaces Upper");
  prefs.setPrefs(true, "", "", "");
  FBTest.compare("<divclass=\"test value\">\n   <br></div>", formatter.format(htmlElement), "Child HTML Element, Spaces");
  prefs.setPrefs(true, "\n", "", " ");
  FBTest.compare("<div\n  class=\"test value\">\n   <br></div>", formatter.format(htmlElement), "Child HTML Element, Spaces");
  prefs.setPrefs(true, "\n", " ", " ");
  FBTest.compare("<div\n  class=\"test value\" >\n   <br ></div>", formatter.format(htmlElement), "Child HTML Element, Newline Spaces");
  prefs.setPrefs(true, "\n", "\n", "\n");
  FBTest.compare("<div\n  class=\"test value\"\n>\n   <br\n   ></div>", formatter.format(htmlElement), "Child HTML Element, Newline");

  prefs.setPrefs(true, "", "", "", 1);
  FBTest.compare("<div\n  class=\"test value\">\n   <br></div>", formatter.format(htmlElement), "Child HTML Element, Spaces, wrap");
  prefs.setPrefs(true, "\n", "", " ", 1);
  FBTest.compare("<div\n  class=\"test value\">\n   <br></div>", formatter.format(htmlElement), "Child HTML Element, Spaces, wrap");
  prefs.setPrefs(true, "\n", " ", " ", 1);
  FBTest.compare("<div\n  class=\"test value\" >\n   <br ></div>", formatter.format(htmlElement), "Child HTML Element, Newline Spaces, wrap");

  // Void HTML Element
  htmlElement = document.createElement("input");
  htmlElement.setAttribute("class", "test");
  prefs.setPrefs(true, "", "", "");
  FBTest.compare("<inputclass=\"test\">", formatter.format(htmlElement), "Void HTML Element, Spaces");
  prefs.setPrefs(true, "\n", "", "");
  FBTest.compare("<input\n  class=\"test\">", formatter.format(htmlElement), "Void HTML Element, Spaces");
  prefs.setPrefs(true, "\n", " ", " ");
  FBTest.compare("<input\n  class=\"test\" >", formatter.format(htmlElement), "Void HTML Element, Newline Spaces");
  prefs.setPrefs(false, "", "", "");
  FBTest.compare("<INPUTclass=\"test\">", formatter.format(htmlElement), "Void HTML Element, Spaces");
  prefs.setPrefs(false, "\n", "", "");
  FBTest.compare("<INPUT\n  class=\"test\">", formatter.format(htmlElement), "Void HTML Element, Spaces");
  prefs.setPrefs(false, "\n", " ", " ");
  FBTest.compare("<INPUT\n  class=\"test\" >", formatter.format(htmlElement), "Void HTML Element, Newline Spaces");
  
  // TODO : No attribute test, for non-void

  // XHTML Element Tests
  var xmlDoc = document.implementation.createDocument(null, "", null);
  var htmlElement = xmlDoc.createElementNS("http://www.w3.org/1999/xhtml", "div");
  prefs.setPrefs(true, " ", "", " ");
  FBTest.compare("<div />", formatter.format(htmlElement), "XHTML Element no attr, Spaces");
  prefs.setPrefs(true, "\n", "", "");
  FBTest.compare("<div/>", formatter.format(htmlElement), "XHTML Element no attr, No Space");
  prefs.setPrefs(true, "\n", "", "\n");
  FBTest.compare("<div\n/>", formatter.format(htmlElement), "XHTML Element no attr, Newline");
  
  htmlElement.setAttribute("class", "test value");

  prefs.setPrefs(true, "", "", " ");
  FBTest.compare("<divclass=\"test value\" />", formatter.format(htmlElement), "XHTML Element, Spaces");
  prefs.setPrefs(true, " ", "", " ");
  FBTest.compare("<div class=\"test value\" />", formatter.format(htmlElement), "XHTML Element, Spaces");
  prefs.setPrefs(true, "\n", "", "");
  FBTest.compare("<div\n  class=\"test value\"/>", formatter.format(htmlElement), "XHTML Element, Spaces");
  prefs.setPrefs(true, "\n", " ", "\n");
  FBTest.compare("<div\n  class=\"test value\"\n/>", formatter.format(htmlElement), "XHTML Element, Newline Spaces");


  prefs.setPrefs(true, " ", "", " ", 1);
  FBTest.compare("<div \n  class=\"test value\" />", formatter.format(htmlElement), "XHTML Element, Spaces, Wrap");
  prefs.setPrefs(true, "\n", "", "", 1);
  FBTest.compare("<div\n  class=\"test value\"/>", formatter.format(htmlElement), "XHTML Element, Spaces, Wrap");
  prefs.setPrefs(true, "\n", " ", "\n", 1);
  FBTest.compare("<div\n  class=\"test value\"\n/>", formatter.format(htmlElement), "XHTML Element, Newline Spaces, Wrap");

  htmlElement.appendChild(document.createTextNode("\n   "));
  var childElement = xmlDoc.createElementNS("http://www.w3.org/1999/xhtml", "br");
  childElement.setAttribute("class", "something");
  htmlElement.appendChild(childElement);

  prefs.setPrefs(true, "", "", "");
  FBTest.compare("<divclass=\"test value\">\n   <brclass=\"something\"/></div>", formatter.format(htmlElement), "Child XHTML Element, Spaces Upper");
  prefs.setPrefs(true, " ", "", "");
  FBTest.compare("<div class=\"test value\">\n   <br class=\"something\"/></div>", formatter.format(htmlElement), "Child XHTML Element, Spaces");
  prefs.setPrefs(true, "\n", "", " ");
  FBTest.compare("<div\n  class=\"test value\">\n   <br\n     class=\"something\" /></div>", formatter.format(htmlElement), "Child XHTML Element, Spaces");
  prefs.setPrefs(true, "\n", " ", " ");
  FBTest.compare("<div\n  class=\"test value\" >\n   <br\n     class=\"something\" /></div>", formatter.format(htmlElement), "Child XHTML Element, Newline Spaces");
  
  // TODO : How should indent be handled for the child close?
  prefs.setPrefs(true, "\n", "\n", "\n");
  FBTest.compare("<div\n  class=\"test value\"\n>\n   <br\n     class=\"something\"\n   /></div>", formatter.format(htmlElement), "Child XHTML Element, Newline");
  

  // Void HTML Element
  htmlElement = xmlDoc.createElementNS("http://www.w3.org/1999/xhtml", "input");
  htmlElement.setAttribute("class", "test");
  prefs.setPrefs(true, " ", "", "");
  FBTest.compare("<input class=\"test\"/>", formatter.format(htmlElement), "Void XHTML Element, Spaces");
  prefs.setPrefs(true, "\n", "", " ");
  FBTest.compare("<input\n  class=\"test\" />", formatter.format(htmlElement), "Void XHTML Element, Spaces");
  prefs.setPrefs(true, "\n", "", "\n");
  FBTest.compare("<input\n  class=\"test\"\n/>", formatter.format(htmlElement), "Void XHTML Element, Newline Spaces");
  prefs.setPrefs(false, " ", "", "");
  FBTest.compare("<input class=\"test\"/>", formatter.format(htmlElement), "Void XHTML Element, Spaces");

  // TODO : Test for XHTML element prefix?
  
  prefs.reset();

  FBTest.testDone();
}