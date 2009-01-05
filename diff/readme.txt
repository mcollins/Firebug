firediff prototype for diff support in Firebug

Firebug works with 'live objects' in the browser. So the diffs that 
Firebug can provide are  between two different live objects. For example,
the first diff provided will be changes entered by the developer in one 
of Firebug's live object editors like the Style panel editor. Later we hope to 
add diffs for changes caused by Javascript actions. 

Firebug won't be able to provide source-code diffs because it does not work 
with source code. Firebug will tag the live object diffs with the source URL 
of the live object when that information is available from Firefox.  However, 
since web pages can be highly dynamic the source URL may be incorrect and the 
actual source inside of the server may not be what the browser saw anyway. 

install as extension to Firebug 1.4+

0.1 issues:
 * The editors are absolute so resize/wrap stuff cause them to be misaligned. Needs CSS expertise
 * Need "all/one" toggle
 * Need to merge changes from same element.
 * watch panel shows up but only in the update not prev windows
