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