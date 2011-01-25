// https://developer.mozilla.org/en/Preferences/Mozilla_preferences_for_uber-geeks
pref("security.ssl.warn_missing_rfc5746", false);
// Hack for Bug 551001
pref("browser.cache.memory.enable", false);
// Don't allow FF4.0 to overwrite your file-proxies
pref("extensions.update.autoUpdateDefault", false);

// Enable the dump() global function. Prints to stdout.
pref("browser.dom.window.dump.enabled", true);

//Logs errors in chrome files to the Error Console.
pref("javascript.options.showInConsole", true);

//This will send more detailed information about installation and update problems to the Error Console.
pref("extensions.logging.enabled", true);

//Turn off default browser check
pref("browser.shell.checkDefaultBrowser", false);

// Allow dynamic reloading of xul
pref("nglayout.debug.disable_xul_cache", true);

pref("extensions.chromebug.outerWidth", 0);
pref("extensions.chromebug.outerHeight", 0);
pref("extensions.chromebug.openalways", false);
pref("extensions.chromebug.extensions", "none");
pref("extensions.chromebug.DBG_CHROMEBUG", false); // /*@explore*/
pref("extensions.chromebug.DBG_CB_CONSOLE", true);      // /*@explore*/
pref("extensions.chromebug.defaultScriptPanelLocation", "");
pref("extensions.chromebug.previousContext", "");

pref("extensions.chromebug.shoutAboutObserverEvents", false);

pref("extensions.chromebug.enableTraceConsole", true);
// Global
pref("extensions.chromebug.allowSystemPages", false);
pref("extensions.chromebug.disabledFile", true);
pref("extensions.chromebug.defaultPanelName", "html");
pref("extensions.chromebug.throttleMessages", true);
pref("extensions.chromebug.textSize", 0);
pref("extensions.chromebug.showInfoTips", true);
pref("extensions.chromebug.previousPlacement", 0);
pref("extensions.chromebug.largeCommandLine", false);
pref("extensions.chromebug.textWrapWidth", 100);
pref("extensions.chromebug.openInWindow", false);
pref("extensions.chromebug.showErrorCount", true);
pref("extensions.chromebug.showIntroduction", true);
pref("extensions.chromebug.viewPanelOrient", "horizontal");
pref("extensions.chromebug.allowDoublePost", false);
pref("extensions.chromebug.currentVersion", "");              // If Firebug version is bigger than the one in this string, a first-run welcome page is displayed.


// Console
pref("extensions.chromebug.showJSErrors", true);
pref("extensions.chromebug.showJSWarnings", false);
pref("extensions.chromebug.showCSSErrors", false);
pref("extensions.chromebug.showXMLErrors", false);
pref("extensions.chromebug.showChromeErrors", false);
pref("extensions.chromebug.showChromeMessages", false);
pref("extensions.chromebug.showExternalErrors", false);
pref("extensions.chromebug.showXMLHttpRequests", false);

pref("extensions.chromebug.console.enableLocalFiles", "enable");
pref("extensions.chromebug.console.enableSystemPages", "enable");
pref("extensions.chromebug.console.enableSites", true);


// HTML
pref("extensions.chromebug.showCommentNodes", false);
pref("extensions.chromebug.showWhitespaceNodes", false);
pref("extensions.chromebug.showFullTextNodes", true);
pref("extensions.chromebug.highlightMutations", true);
pref("extensions.chromebug.expandMutations", false);
pref("extensions.chromebug.scrollToMutations", false);
pref("extensions.chromebug.shadeBoxModel", true);

// CSS
pref("extensions.chromebug.showComputedStyle", false);
pref("extensions.chromebug.showUserAgentCSS", false);

// Stack
pref("extensions.chromebug.omitObjectPathStack", false);

// DOM
pref("extensions.chromebug.showUserProps", true);
pref("extensions.chromebug.showUserFuncs", true);
pref("extensions.chromebug.showDOMProps", true);
pref("extensions.chromebug.showDOMFuncs", false);
pref("extensions.chromebug.showDOMConstants", false);

// Layout
pref("extensions.chromebug.showAdjacentLayout", false);
pref("extensions.chromebug.showRulers", true);
pref("extensions.chromebug.showBoundingClientRect", true);

// Script
pref("extensions.chromebug.script.enableLocalFiles", "enable");
pref("extensions.chromebug.script.enableSystemPages", "enable");
pref("extensions.chromebug.script.enableSites", true);

// Net
pref("extensions.chromebug.netFilterCategory", "all");
pref("extensions.chromebug.disableNetMonitor", false);
pref("extensions.chromebug.collectHttpHeaders", true);
pref("extensions.chromebug.net.enableLocalFiles", "enable");
pref("extensions.chromebug.net.enableSystemPages", "enable");
pref("extensions.chromebug.net.enableSites", true);

//Search
pref("extensions.chromebug.searchCaseSensitive", false);
pref("extensions.chromebug.searchGlobal", true);

pref("extensions.chromebug.netSearchHeaders", false);
pref("extensions.chromebug.netSearchParameters", false);
pref("extensions.chromebug.netSearchResponseBody", false);

pref("extensions.chromebug.events-script.enableSites", true);
// External Editors
pref("extensions.chromebug.externalEditors", "");

// Trace  /*@explore*/
pref("extensions.chromebug.enableTraceConsole", true);     /*@explore*/
pref("extensions.chromebug.alwaysOpenTraceConsole", false);     /*@explore*/
pref("extensions.chromebug.trace.maxMessageLength", 400);     /*@explore*/
pref("extensions.chromebug.trace.enableScope", false);     /*@explore*/
pref("extensions.chromebug.trace.enableJSConsoleLogs", false);     /*@explore*/
pref("extensions.chromebug.trace.showTime", false);      // /*@explore*/

pref("extensions.chromebug.DBG_FBCACHE", false);      // /*@explore*/
pref("extensions.chromebug.DBG_CBWINDOW", false);      // /*@explore*/
pref("extensions.chromebug.DBG_EXTENSIONS", false);      // /*@explore*/
pref("extensions.chromebug.chromebugLaunch", false);

pref("extensions.chromebug.DBG_ACTIVATION", false);   // firebug.js and tabWatcher.js      /*@explore*/
pref("extensions.chromebug.DBG_BP", false);           // debugger.js and firebug-services.js; lots of output   /*@explore*/
pref("extensions.chromebug.DBG_COMPILATION_UNITS", false);           // debugger.js and firebug-services.js; lots of output   /*@explore*/
pref("extensions.chromebug.DBG_TOPLEVEL", false);     // top level jsd scripts                     /*@explore*/
pref("extensions.chromebug.DBG_STACK", false);        // call stack, mostly debugger.js            /*@explore*/
pref("extensions.chromebug.DBG_UI_LOOP", false);      // debugger.js                               /*@explore*/
pref("extensions.chromebug.DBG_ERRORS", false);       // error.js                                  /*@explore*/
pref("extensions.chromebug.DBG_ERRORLOG", false);       // error.js                                  /*@explore*/
pref("extensions.chromebug.DBG_FUNCTION_NAMES", false);  // heuristics for anon functions          /*@explore*/
pref("extensions.chromebug.DBG_EVAL", false);         // debugger.js and firebug-service.js        /*@explore*/
pref("extensions.chromebug.DBG_PANELS", false);       // panel selection                           /*@explore*/
pref("extensions.chromebug.DBG_CACHE", false);        // sourceCache                               /*@explore*/
pref("extensions.chromebug.DBG_CONSOLE", false);      // console                                   /*@explore*/
pref("extensions.chromebug.DBG_COMMANDLINE", false);  // command line                              /*@explore*/
pref("extensions.chromebug.DBG_CSS", false);          //                                           /*@explore*/
pref("extensions.chromebug.DBG_CSS_PARSER", false);          //                                    /*@explore*/
pref("extensions.chromebug.DBG_DBG2FIREBUG", false);  //                                           /*@explore*/
pref("extensions.chromebug.DBG_DOM", false);          //                                           /*@explore*/
pref("extensions.chromebug.DBG_DOMPLATE", false);     // domplate engine                           /*@explore*/
pref("extensions.chromebug.DBG_DISPATCH", false);     //                                           /*@explore*/
pref("extensions.chromebug.DBG_HTML", false);         //                                           /*@explore*/
pref("extensions.chromebug.DBG_LINETABLE", false);    //                                           /*@explore*/
pref("extensions.chromebug.DBG_LOCATIONS", false);    // panelFileList                             /*@explore*/
pref("extensions.chromebug.DBG_SOURCEFILES", false);  // debugger and sourceCache                  /*@explore*/
pref("extensions.chromebug.DBG_WINDOWS", false);      // tabWatcher, dispatch events; very useful for understand modules/panels  /*@explore*/
pref("extensions.chromebug.DBG_NET", false);          // net.js                                    /*@explore*/
pref("extensions.chromebug.DBG_NET_EVENTS", false);   // net.js - network events                   /*@explore*/
pref("extensions.chromebug.DBG_INITIALIZE", false);   // registry (modules panels); initialize FB  /*@explore*/
pref("extensions.chromebug.DBG_INSPECT", false);      // inspector                                 /*@explore*/
pref("extensions.chromebug.DBG_OPTIONS", false);      //                                           /*@explore*/
pref("extensions.chromebug.DBG_FBS_FLUSH", false);    //                                           /*@explore*/
pref("extensions.chromebug.DBG_HTTPOBSERVER", false); // Centralized HTTP Observer                 /*@explore*/
pref("extensions.chromebug.DBG_SPY", false);          // spy.js                                    /*@explore*/
pref("extensions.chromebug.DBG_JSONVIEWER", false);   // json explorer                             /*@explore*/
pref("extensions.chromebug.DBG_EDITOR", false);       // Inline editors                            /*@explore*/
pref("extensions.chromebug.DBG_SHORTCUTS", false);    // Keyboard shortcuts.                       /*@explore*/
pref("extensions.chromebug.DBG_A11Y", false);         // a11y                                      /*@explore*/
pref("extensions.chromebug.DBG_LOCALE", false);       // localization, missing strings             /*@explore*/
pref("extensions.chromebug.DBG_INFOTIP", false);      // popup info tip in panels                  /*@explore*/
pref("extensions.chromebug.DBG_ANNOTATIONS", false);  // Page annotations service                  /*@explore*/
pref("extensions.chromebug.DBG_XMLVIEWER", false);    // xml explorer                              /*@explore*/
pref("extensions.chromebug.DBG_SVGVIEWER", false);    // svg explorer                              /*@explore*/
pref("extensions.chromebug.DBG_ACTIVITYOBSERVER", false);    // Net panel's activity observer      /*@explore*/
pref("extensions.chromebug.DBG_TOOLTIP", false);      // tooltip debugging      /*@explore*/
pref("extensions.chromebug.DBG_HISTORY", false);      // panel navigation history                  /*@explore*/
pref("extensions.chromebug.DBG_STORAGE", false);      // storageService                            /*@explore*/
