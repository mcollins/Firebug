<html><body><pre>
Chromebug, Firebug for XUL aka chrome.
John J. Barton 2007.
/* See license.txt for terms of usage */

Build:
  ChromeBug has three parts:
    1) chromebug https://fireclipse.svn.sourceforge.net/svnroot/fireclipse/trunk/FireclipseExtensions/chromebug
    2) firebug http://fbug.googlecode.com/svn
    3) (optional) chromelist http://chromelist.googlecode.com/svn/trunk
  The source tree for chromebug includes svn-external references to chromelist and firebug.

  One-time setup, requires 'ant' (but you can fake it, though its not recommended.)
    1) Get the source:
        svn co https://fireclipse.svn.sourceforge.net/svnroot/fireclipse/trunk/FireclipseExtensions/ fireclipse/extensions
        OR use tortoiseSVN to the same end
    2) Create a new Firefox profile, remember the directory name you create to use as "install.dir"
        http://www.mozilla.org/support/firefox/profile
       Complete the profile creation by starting Firefox with the new profile, then exit.
    3) cd fireclipse/extensions/chromebug
    4) create local.properties file with these properties, change as appropriate (use forward slashes)
        	install.dir=C:/Documents and Settings/John J. Barton/Application Data/Mozilla/Firefox/Profiles/chromebug
        	firebug.dir=../firebug/branches/firebug1.3
        	chromelist.dir=../chromelist
        	update.path=http://w3.almaden.ibm.com/~bartonjj/projects/fireclipse/almaden/chromebug
       (the last two are optional)
    5a) (recommended!) create the dev-links:(ant is here http://ant.apache.org)
        ant dev-setup
        OR
    5b) create the dev-links:
        i) find your profile extensions directory (http://www.mozilla.org/support/firefox/profile)
        ii) create file "chromebug@johnjbarton.com", include one line the file name of the chromebug directory, eg
        C:\bartonjj\projects\fireclipse\trunk\FireclipseExtensions\chromebug
        iii) create file "chromelist@extensions.gijsk.com", one line to chromelist
        iv) create file "firebug@software.joehewitt.com", one line to firebug directory
        v) back in the chromebug source, copy install.ref.tpl.xml to install.rdf and edit to change anything in @..@

Usage:
  firefox.exe -chrome chrome://chromebug/content/chromebug.xul -p chromebug -firefox <url>

Trailing URL is optional.
Exit the first run are restart so the chrome registry can update. Then restart.

</pre></body></html>