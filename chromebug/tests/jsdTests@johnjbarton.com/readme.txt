<html><body><pre>

JSD Test Extension for Mozilla
------------------------------
INSTALL For testing JSD:

Create a new profile. Specifically don't have firebug/chromebug/venkman, it will confuse you.

Install as normal extension. Copy the jsdTests@johnjbarton.com to profile/extensions, or put a file link there.

Run 1) firefox.exe, then use Tools->Test Now
    2) firefox.exe -chrome chrome://jsdtest/content/testWebPage.html 
    
-------------------------------

To add test cases:

1. Create new file in the tree, eg jsd/jsdIScript/bugzilla-XXXX.js for a script bug test case.
2. Add two lines to testWebPage.html, one to load the js and one to append the test function to the array. 

-------------------------------



</pre></body></html>