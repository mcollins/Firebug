http://fbug.googlecode.com/svn/branches/
eval -- release source (no tracing)
firebug1.1 -- stable source with tracing
firebug1.2 -- feature-add source with tracing
explore -- abandoned
performance -- tests comparing versions and features
-----
Building:

 Each branch has a build.xml for ant.
 Each branch has branch.properties giving the branch version number
   for firebug1.2, branch.properties is in content/firebug directory

ant build.xml files use local.properties file that you must create.

 ant
   builds distribution

 ant dev-setup
   expands install.rdf, and creates links for direct loading of source into firefox

 ant unexplore
   Builds by copy to the branch to branches/eval and removes any line with /*@explore*/,
   changes the branch.properties to remove X from the release number,
   then builds with ant createBranchXPI.  Result in branch subdir "dist".

-----


Setup for development by reading the source directly into Firefox:

 Source:
   make directory 'firebug'
   Use subversion (svn) to checkout http://fbug.googlecode.com/svn/ firebug
   Remember the full path to this 'firebug' directory.

 Profile:
   Create profile:
      cmdline>firefox.exe -ProfileManager
      CreateProfile eg "firebug1.2", use "Choose Folder" then "Make New Folder" so the name is "firebug1.2"
      Start Firefox
      Exit Firefox
   Go back to your source, eg firebug/branches/firebug1.2
      create local.properties, here's mine, adjust for your paths:
        install.dir=C:/Documents and Settings/John J. Barton/Application Data/Mozilla/Firefox/Profiles/firebug1.2
        update.xpi.path=http://fireclipse.xucia.com/files/fireclipse
        update.rdf.path=http://fireclipse.xucia.com/files/fireclipse

 Links:
   ant dev-setup

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

