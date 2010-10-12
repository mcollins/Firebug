/* See license.txt for terms of usage */
function runTest() {
  var prefs = new FBTestFireformat.PrefHandler([
       "fireformatCssFormatter.block.indentLevel",
       "fireformatCssFormatter.block.separatorBeforeOpen",
       "fireformatCssFormatter.block.separatorAfterOpen",
       "fireformatCssFormatter.block.separatorBeforeClose",
       "fireformatCssFormatter.block.separatorAfterClose",
       "fireformatCssFormatter.block.componentSeparator"
  ]);

  var formatter = Format.Formatters.getFormatter("com.incaseofstairs.fireformatCSSFormatter");
  function getSingleProperty() {
    return formatter.format({
      type: CSSRule.STYLE_RULE,
      selectorText: "selector",
      style: { cssText: "property: value;" }
    });
  }
  function getMultipleProperty() {
    return formatter.format({
      type: CSSRule.STYLE_RULE,
      selectorText: "selector",
      style: { cssText: "property: value; property2: value2;" }
    });
  }
  function getMultipleBlocks() {
    return formatter.format({
      cssRules:[
        {
          type: CSSRule.STYLE_RULE,
          selectorText: "selector",
          style: { cssText: "" }
        },
        {
          type: CSSRule.STYLE_RULE,
          selectorText: "selector2",
          style: { cssText: "property: value;" }
        }
      ]
    });
  }
  function getNestedBlock() {
    return formatter.format({
      type: CSSRule.MEDIA_RULE,
      media: { mediaText: "media" },
      cssRules: [
        {
          type: CSSRule.STYLE_RULE,
          selectorText: "selector",
          style: { cssText: "property: value;" }
        },
        {
          type: CSSRule.STYLE_RULE,
          selectorText: "selector2",
          style: { cssText: "" }
        }
      ]
    });
  }

  prefs.setGlobal("fireformatCssFormatter.property.tokensPerLine", 0);

  // Single block, single property
  prefs.setPrefs(1, " ", "\n", "\n", "\n", "\n");
  FBTest.compare("selector {\n  property: value;\n}", getSingleProperty(), "Single prop, Indent, newlines");
  prefs.setPrefs(0, " ", "\n", "\n", "\n", "\n");
  FBTest.compare("selector {\nproperty: value;\n}", getSingleProperty(), "Single prop, No indent, newlines");
  prefs.setPrefs(2, " ", "\n", "\n", "\n", "\n");
  FBTest.compare("selector {\n    property: value;\n}", getSingleProperty(), "Single prop, Double indent, newlines");

  prefs.setPrefs(1, "\n", "\n", "\n", "\n", "\n");
  FBTest.compare("selector\n{\n  property: value;\n}", getSingleProperty(), "Single prop, All newlines");
  prefs.setPrefs(1, " ", " ", " ", "", " ");
  FBTest.compare("selector { property: value; }", getSingleProperty(), "Single prop, No newlines");

  // Single block, multiple property
  prefs.setPrefs(1, " ", "\n", "\n", "\n", "\n");
  FBTest.compare("selector {\n  property: value;\n  property2: value2;\n}", getMultipleProperty(), "Multiple prop, Indent, newlines");
  prefs.setPrefs(0, " ", "\n", "\n", "\n", "\n");
  FBTest.compare("selector {\nproperty: value;\nproperty2: value2;\n}", getMultipleProperty(), "Multiple prop, No indent, newlines");
  prefs.setPrefs(2, " ", "\n", "\n", "\n", "\n");
  FBTest.compare("selector {\n    property: value;\n    property2: value2;\n}", getMultipleProperty(), "Multiple prop, Double indent, newlines");

  prefs.setPrefs(1, "\n", "\n", "\n", "\n", "\n");
  FBTest.compare("selector\n{\n  property: value;\n  property2: value2;\n}", getMultipleProperty(), "Multiple prop, All newlines");
  prefs.setPrefs(1, " ", " ", " ", "", " ");
  FBTest.compare("selector { property: value; property2: value2; }", getMultipleProperty(), "Multiple prop, No newlines");

  // Multiple blocks
  prefs.setPrefs(1, " ", "\n", "\n", "\n", "\n");
  FBTest.compare("selector {\n\n}\n\nselector2 {\n  property: value;\n}\n", getMultipleBlocks(), "Multiple block, Same line brace");
  prefs.setPrefs(0, " ", "\n", "\n", "\n", "\n");
  FBTest.compare("selector {\n\n}\n\nselector2 {\nproperty: value;\n}\n", getMultipleBlocks(), "Multiple block, No indent, newlines");
  prefs.setPrefs(2, " ", "\n", "\n", "\n", "\n");
  FBTest.compare("selector {\n\n}\n\nselector2 {\n    property: value;\n}\n", getMultipleBlocks(), "Multiple block, Double indent, newlines");
  
  prefs.setPrefs(1, "\n", "\n", "\n", "\n", "\n");
  FBTest.compare("selector\n{\n\n}\n\nselector2\n{\n  property: value;\n}\n", getMultipleBlocks(), "Multiple prop, All newlines");
  prefs.setPrefs(1, " ", " ", " ", "", " ");
  FBTest.compare("selector {  }  selector2 { property: value; }", getMultipleBlocks(), "Multiple block, No newlines");

  // Nested block
  prefs.setPrefs(1, " ", "\n", "\n", "\n", "\n");
  FBTest.compare("@media media {\n  selector {\n    property: value;\n  }\n  \n  selector2 {\n  \n  }\n}", getNestedBlock(), "Nested block, Indent, newlines");
  prefs.setPrefs(0, " ", "\n", "\n", "\n", "\n");
  FBTest.compare("@media media {\nselector {\nproperty: value;\n}\n\nselector2 {\n\n}\n}", getNestedBlock(), "Nested block, No indent, newlines");
  prefs.setPrefs(2, " ", "\n", "\n", "\n", "\n");
  FBTest.compare("@media media {\n    selector {\n        property: value;\n    }\n    \n    selector2 {\n    \n    }\n}", getNestedBlock(), "Nested block, Double indent, newlines");

  prefs.setPrefs(1, "\n", "\n", "\n", "\n", "\n");
  FBTest.compare("@media media\n{\n  selector\n  {\n    property: value;\n  }\n  \n  selector2\n  {\n  \n  }\n}", getNestedBlock(), "Nested block, All newlines");
  prefs.setPrefs(1, " ", " ", " ", "", " ");
  FBTest.compare("@media media { selector { property: value; }  selector2 {  } }", getNestedBlock(), "Nested block, No newlines");

  prefs.reset();

  FBTest.testDone();
}