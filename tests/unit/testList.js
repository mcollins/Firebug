
// Registered Tests
//-----------------------------------------------------------------------------

/**
 * List of existing unit-test for Firebug.
 * @param: {String} category    Name of the category where the test belongs to (used by test Runner).
 * @param: {String} uri         Relative location of the test file.
 * @param: {String} desc        Short description of the test.
 */
var testList = [
    {category: "net", uri: "net/netPanel.html",            desc: "Existence of net panel" },
    {category: "net", uri: "net/netEntry.html",            desc: "Existence of a simple entry in net panel" },
    {category: "net", uri: "net/netEntryBody.html",        desc: "Net entry can be expanded and info body is there" }, 
    {category: "net", uri: "net/issue176.html",            desc: "Filter for Flash requests" },
    {category: "net", uri: "net/issue601.html",            desc: "Response Tab" },
    {category: "net", uri: "net/issue1256.html",           desc: "Params Tab" },
    {category: "net", uri: "net/issue372.html",            desc: "Post Tab" },
    {category: "net", uri: "net/issue700.html",            desc: "HTML Tab" },
    {category: "net", uri: "net/issue1299.html",           desc: "Firebug must cache even responses coming from FF cache" },
    {category: "net", uri: "net/issue1308.html",           desc: "+ sign in POST (proper encoding, Copy Location With Parameters)" },
    {category: "net", uri: "net/netPanelListener.html",    desc: "Test listener for Firebug.NetMonitor" },
    {category: "net", uri: "net/netInfoBodyListener.html", desc: "Test listener for Firebug.NetMonitor.NetInfoBody" },
    {category: "net", uri: "net/netSpyListener.html",      desc: "Test listener for Firebug.Spy" },
    {category: "net", uri: "net/netCacheListener.html",    desc: "Test listener for Firebug.Spy" },
    {category: "net", uri: "net/issue369.html",            desc: "Inspect JSON data in HTTP responses" },
    {category: "net", uri: "net/netSelection.html",        desc: "Test for Net panel selection using chrome.select and NetFileLink" },
    {category: "console", uri: "console/inspect.html",     desc: "Basic command line execution" },
    {category: "console", uri: "console/issue1307.html",   desc: "XhrRequests are not logged in the console window"},
    {category: "console", uri: "console/issue1383.html",   desc: "1.3: if the last line is a comment throws Syntax Error: missing"},
    {category: "script",  uri: "script/scriptWatch1.html",  desc: "Use watch panel when debug"}, 
    //xxxHonza: this must be refactored yet: {category: "domplate",  uri: "domplate/domplate.html",  desc: "Domplate tests"}, 
    //xxxHonza: this must be refactored yet: {category: "console",  uri: "console/commandline.html",  desc: "Bunch of tests for command line APIs"},
    {category: "console",  uri: "console/consoleListener.html",  desc: "Test listner for Console panel"},
];


