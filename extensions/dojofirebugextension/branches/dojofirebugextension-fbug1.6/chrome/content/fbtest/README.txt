- Remember to manually re-execute tests with a different set of preference values. 
Unfortunately we aren't automatically modifying preferences and executing a new 
run of all tests yet.

It seems you need to restart the browser each time you change preferences , to allow FBTest to read them.


Valid set of preferences :

1) Set #1
Use hashcodes = not enabled (extensions.firebug.dojofirebugextension.hashCodeBasedDictionaryEnabled == false)
Breakpoint "on place" support = not enabled (extensions.firebug.dojofirebugextension.breakPointPlaceDisabled == true)
Use HTML Events instead of Direct Access = not enabled (extensions.firebug.dojofirebugextension.useEventBasedProxy == false) 

2) Set #2 (enable breapoint on place support)
Use hashcodes = not enabled
Breakpoint "on place" support = enabled
Use HTML Events instead of Direct Access = not enabled

3) Set #3 (enable Use of HTML Events)
Use hashcodes = not enabled
Breakpoint "on place" support = not enabled
Use HTML Events instead of Direct Access = enabled

4) 5) & 6) Set #4
Repeat sets #1 , #2 and #3 respectively , but with "Use hashcodes" enabled.

  