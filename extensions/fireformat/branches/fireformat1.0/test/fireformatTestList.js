testIncludes.push("FBTestFireformat.js");

var testList = testList || [];

testList.push.apply(testList, [
                {group: "formatter",    uri: "formatter/wrapTokensTest.js",                         desc: "Formatter: Wrap Tokens Test" },
                {group: "formatter",    uri: "formatter/writerTest.js",                             desc: "Formatter: Writer Test" },
                {group: "cssFormatter", uri: "formatter/cssFormatter/selectorTextTest.js",          desc: "CSS Formatter: Selector Text Test" },
                {group: "cssFormatter", uri: "formatter/cssFormatter/blockTextTest.js",             desc: "CSS Formatter: Block Text Test" },
                {group: "cssFormatter", uri: "formatter/cssFormatter/propertyTextTest.js",          desc: "CSS Formatter: Property Text Test" },
                {group: "cssFormatter", uri: "formatter/cssFormatter/atRuleTextTest.js",            desc: "CSS Formatter: Simple @Rule Text Test" },
                {group: "cssFormatter", uri: "formatter/cssFormatter/cssFormatterTest.js",          desc: "CSS Formatter: CSS Formatter Test" },
                {group: "htmlFormatter", uri: "formatter/htmlFormatter/entityTextTest.js",          desc: "HTML Formatter: Entity Text Test" },
                {group: "htmlFormatter", uri: "formatter/htmlFormatter/textWrapTest.js",            desc: "HTML Formatter: Text Wrap Test" },
                {group: "htmlFormatter", uri: "formatter/htmlFormatter/elementTextTest.js",         desc: "HTML Formatter: Element Text Test" },
                {group: "htmlFormatter", uri: "formatter/htmlFormatter/attributeTextTest.js",       desc: "HTML Formatter: Attribute Text Test" },
                {group: "htmlFormatter", uri: "formatter/htmlFormatter/htmlFormatterTest.js",       desc: "HTML Formatter: HTML Formatter Test" },
                {group: "htmlFormatter", uri: "formatter/htmlFormatter/xhtmlFormatterTest.js",      desc: "HTML Formatter: XHTML Formatter Test" }
]);
