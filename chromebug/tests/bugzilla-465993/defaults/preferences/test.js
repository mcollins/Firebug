// Enable the dump() global function. Prints to stdout.
user_pref("browser.dom.window.dump.enabled", true);

//Allow the hosts below to execute privileged script without warnings
user_pref("signed.applets.codebase_principal_support", true);

// Allow localhost to execute privileged scripts
user_pref("capability.principal.codebase.p1.granted", "UniversalXPConnect UniversalBrowserRead UniversalBrowserWrite UniversalPreferencesRead UniversalPreferencesWrite UniversalFileRead");
user_pref("capability.principal.codebase.p1.id", "http://localhost:8888");
user_pref("capability.principal.codebase.p1.subjectName", "");

//Turn off default browser check
user_pref("browser.shell.checkDefaultBrowser", false);

user_pref("capability.principal.jdstest.id", "http://enki-pcshih.almaden.ibm.com:63636/ProjectExplorer/firebug/chromebug/tests/jsdTests@johnjbarton.com/content/events/listeners.html");
user_pref("capability.principal.jsdtest.granted", "UniversalXPConnect");
