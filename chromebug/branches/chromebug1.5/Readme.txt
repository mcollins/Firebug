<html><body><pre>
Chromebug, Firebug for XUL aka chrome.
John J. Barton 2007.
/* See license.txt for terms of usage */

Build:

  Requires firebug1.4 installed in the profile/extensions

  One-time setup:
    1) Get the source:
        svn co https://fbug.googlecode.com/svn/chromebug/branches/chromebug0.4
        OR use tortoiseSVN to the same end
    2) Create a new Firefox profile ('chromebug' is the example here)
    	http://www.mozilla.org/support/firefox/profile
       	remember the directory name you create to use as "install.dir". 
        Complete the profile creation by starting Firefox with the new profile, then exit.
    
    3a) Use ant to create the dev-links:(ant is here http://ant.apache.org)
     	In the source directory (eg chromebug0.4) create local.properties file with these properties, 
        change as appropriate (use forward slashes)
        	install.dir=C:/Documents and Settings/John J. Barton/Application Data/Mozilla/Firefox/Profiles/chromebug
        then run
        	ant dev-setup
    OR
    3b) create the dev-links manually:
        i) find your profile extensions directory (http://www.mozilla.org/support/firefox/profile)
        ii) create file "chromebug@johnjbarton.com", include one line the file name of the chromebug directory, eg
        	C:\bartonjj\projects\fireclipse\trunk\FireclipseExtensions\chromebug
        iv) create file "firebug@software.joehewitt.com", one line to firebug directory
        v) back in the chromebug source, copy install.ref.tpl.xml to install.rdf and edit to change anything in @..@

Usage:
  firefox.exe -chromebug -p chromebug  


 0.4 thunderbird;
 Warning: Warning: Unrecognized chrome registration modifier 'contentaccessible=yes'.
Source File: file:///C:/bartonjj/projects/fireclipse/fbug/branches/firebug1.4/chrome.manifest
Line: 1

 0.4 songbird 1.0: crashes

</pre></body></html>