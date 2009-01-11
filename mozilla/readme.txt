fbug/mozilla building Firefox for experimental versions of Firebug/Chromebug

Docs:

https://developer.mozilla.org/en/Windows_Build_Prerequisites

Build tools for windows:
http://ftp.mozilla.org/pub/mozilla.org/mozilla/libraries/win32/MozillaBuildSetup-1.3.exe

https://developer.mozilla.org/en/Mercurial_FAQ
https://developer.mozilla.org/en/Mercurial_Queues

Notes:

1) moz build tools have hg:

$ which hg
/c/mozilla-build//hg/hg.exe

2) 
$ hg version
Mercurial Distributed SCM (version 1.0.1+20080525)

3) 
In c:/mozilla-build/hg is the config file for hg, the changes are all at the end:
$ tail -15 Mercurial.ini
[diff]
git = 1
showfunc = 1

[extensions]
hgext.graphlog =
hgext.mq =

[defaults]
diff =-p -U 8

[ui]
merge=tortoisemerge
username= John J. Barton <johnjbarton@johnjbarton.com>
--- eof Mercurial.ini 

4) TortoiseHg has nice features and may be a good way to start, but I uninstalled 
it because it's makes Window's Explorer trash for minutes at a time. It may be because
I also have TortoiseSVN and TortoiseCVS. 



================================================================================
Steps:

install build tools on C:
be some where you have 4Gb, g:/mozilla/mozilla-central/src for me

hg clone http://hg.mozilla.org/releases/mozilla-1.9.1 
hg qinit -c

copy .mozconfig into the top directory, src for me

The .mozconfig will not work without a patch to the build system.
First name the patch for your local mq:
  hg qnew bugzilla-338224-nspr4
Second Apply this patch:
  https://bugzilla.mozilla.org/attachment.cgi?id=348289
Third build 
  make -f client.mk
  run obj-i686-pc-minggw32/dist/bin/firefox.exe
Fourth commit the patch
  hg qcommit
  


