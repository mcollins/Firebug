http://fbug.googlecode.com/svn/branches/
eval -- release source (no tracing)
firebug1.1 -- stable source with tracing
firebug1.2 -- feature-add source with tracing
explore -- abandoned
performance -- tests comparing versions and features

Building:

 Each branch has a build.xml for ant.
 Each branch has branch.properties giving the branch version number

 ant incremental
   builds by copying files into 'install.dir', set this property in local.properties files in your copy

 ant unexplore
   Builds by copy to the branch to branches/eval and removes any line with /*@explore*/,
   changes the branch.properties to remove X from the release number,
   then builds with ant createBranchXPI.  Result in branch subdir "dist".
   

Setup for incremental coding:
  make directory 'firebug'
  Use subversion (svn) to checkout http://fbug.googlecode.com/svn/ firebug
  Create profile:
  	cmdline>firefox.exe -ProfileManager
  	CreateProfile eg "firebug1.2"
  	Start Firefox
  	Exit Firefox
  Navigate to Profile Directory, eg Windows C:\Documents and Settings\John J. Barton\Application Data\Mozilla\Firefox\Profiles
    Navigate to new profile, extensions directory, eg firebug1.2/extensions
    Create a file named 'firebug@software.joehewitt.com' with one line, the full path to
      the 'firebug' directory created above.
  Start Firefox.
  Every time you change firebug source, exit Firefox and immediately restart.  
    