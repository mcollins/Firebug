<html><body><pre>
Firebug API Reference 
Jan Odvarko <odvarko@gmail.com>

Support for generating API Reference documentation from Firebug source files.  

Build Docs:
- Use build.xml to generate API documentation from Firebug source files.
- Run "ant jsdoc" on the command line (within $svn/branches/firebug1.5/ directory)
- See output HTML files within $svn/jsdoc/out

Development:
- Result docs (set of HTML Files) is generated using jsdoc-toolkit
http://code.google.com/p/jsdoc-toolkit/

- Firebug uses its own template for generating result HTML
See: ./jsdoc-toolkit-2.3.0/templates/firebug
directory 

- Firebug also uses its own plugin for customizing the generation process.
See: ./jsdoc-toolkit-2.3.0/app/plugins/firebug.js 

</pre></body></html>