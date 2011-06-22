The directory getfirebug.com/releases/swarms is an SVN external link to https://fbug.googlecode.com/svn/extensions/swarm/branches/swarm1.7/

Steps to create a new swarm release, using 1.7 -> 1.8 for example

1. branch from swarm/branches/swarm1.7  to swarm/branches/swarm1.8
   swarm version should match firebug
2. Delete swarm/branches/swarm1.8/Firefox-3.6
3. Copy swarm/branches/swarm1.8/Firefox-4.0 -> swarm/branches/swarm1.8/Firefox-5.0
4. Edit swarm/branches/swarm1.8/Firefox-5.0/firefox.properties to point to your Firefox 5.0 distribution
5. Edit swarm/branches/swarm1.8/Firefox-4.0/index.html and swarm/branches/swarm1.8/Firefox-5.0/index.html
   Change the file links for each extension to point to the links for the version correct for Firebug 1.8.
   These links should be to specific versions and not to 'latest'. Otherwise the swarm test will not
   match what the user downloads after a while.
6. Open a clean profile, install swarm addon
7. Hopefully the swarm testing will start automatically, and hopefully the tests will all pass.
8. Commit the changes to swarm/branches/swarm1.8
9. Go the a writable checkout of the SVN directory for getfirebug.com/releases/swarms
    change the svn:external property in the directory getfirebug.com/releases so
    the property "swarms" refers to the directory
    https://fbug.googlecode.com/svn/extensions/swarm/branches/swarm1.7/swarms
    An easy way to do this is tortoiseSVN, navigate to your getfirebug.com/releases directory,
    then get the Windows directory properties -> Subversion -> Properties
    See also
    http://svnbook.red-bean.com/en/1.5/svn.advanced.externals.html
    on the command line:
   $ svn propget svn:externals
     swarms https://fbug.googlecode.com/svn/extensions/swarm/branches/swarm1.7/swarms

     change the pointer to point to ...swarm1.8/swarms

10. commit the change in getfirebug.com/releases
Once getfirebug.com updates, the changed version is out and commits to swarm1.8 on fbug are tracked by getfirebug.
