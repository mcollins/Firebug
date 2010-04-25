http://fbug.googlecode.com/svn/branches/
eval -- abandoned
firebug1.1 -- abandoned
firebug1.2 -- adddons.mozilla.org version
firebug1.3 -- support for avoiding double load, targets FF3.0.4
firebug1.4 -- targets FF 3.1
firebug1.5 -- targets FF 3.2, support for eventlistenerInfo
firebug1.6 -- targets FF 3.6
explore -- abandoned
trunk -- abandoned
performance -- tests comparing versions and features
diff -- extension for recording edits
-----

Highly recommended:
https://developer.mozilla.org/En/Setting_up_extension_development_environment

----

Setup for development by reading the source directly into Firefox:

 Source:
   make directory 'firebug'
   Use subversion (svn) to checkout http://fbug.googlecode.com/svn/branches/firebug1.6 firebug1.6
   Remember the full path to this 'firebug1.6' directory.

 Profile:
   Create profile:
      cmdline>firefox.exe -ProfileManager
      CreateProfile eg "firebug1.2", use "Choose Folder" then "Make New Folder" so the name is "firebug1.2"
      Start Firefox
      Exit Firefox

  Find your profile directory
     in that directory, there is a subdirectory "extensions",
     create a file named firebug@software.joehewitt.com
     put one line in that, the full path you remembered above. 
     e.g. for me that one line is
C:\jjb\eclipse\firebugWorkspace\branches\firebug1.6
   
 Go:
  Start Firefox.
  Every time you change firebug source, exit Firefox and immediately restart.


Tracing:

  On the development branches tracing output can be sent to the OS console (via window.dump()). Some ways
  this can work:
    -- linux, run firefox from command line
    -- win32, run firefox from Windows->Start->Run->cmd prompt
    -- Run from eclipse external tool.
    -- in about:config or in your profile directory user.js set browser.dom.window.dump.enabled
 Tracing is controlled in FBTrace->Options

-----
Building:

The getfirebug.com distribution is created by using a command line tool that drives the extensions in the 'mozzipper' subdirectory of Chromebug. This will be phased out when we get swarm-builder working.

If you want to create an .xpi similar to our tracing versions, just zip the directory.

DON'T USE ANT

Well you can use ant, but I don't know what happens if you do.

 Each branch has a build.xml for ant.
 Each branch has branch.properties giving the branch version number
   for firebug1.2, branch.properties is in content/firebug directory

ant build.xml files use local.properties file that you must create.

 ant
   builds distribution

 ant dev-setup
   expands install.rdf, and creates links for direct loading of source into firefox

-----
