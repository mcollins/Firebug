# node-o3-xml

This is a W3C-DOM XML Library for NodeJS with XPath and namespaces. It is implemented using the C based LibXML2 and the Ajax.org O3 component system. This is the only W3C-DOM standards based XML api for NodeJS we are aware of so your code should work in both the browser and nodejs.
This project is used in production in many NodeJS based backend projects for Ajax.org and updated frequently. 
You can also try out the more alpha-level [node-o3-fastxml](http://github.com/ajaxorg/node-o3-fastxml) library if you need more speed, less memory usage, and dont care about namespaces.

#Usage

To use this library add the node-o3-xml/lib directory to your require path, and use the following line:

    var parser = require('o3-xml');

Or alternatively: 

    var parser = require('/full/path/node-o3-xml/lib/o3-xml'); 

This returns the normal XML parser object as we know from webbrowsers. This repository is a generated build for node 0.2.2 stable, from the o3 repository [ajaxorg/o3](http://github.com/ajaxorg/o3).

Binaries included for:

 * win32 (through cygwin)
 * lin32 
 * osx64

Other platforms and bit-ness (32/64) will be added to the automated build VM incrementally.
If you need to build this node-o3-xml module yourself or want to contribute to the source, please look at the main [ajaxorg/o3](http://github.com/ajaxorg/o3) repository.

If you are looking for the accompanying binary builds of NodeJS check out the 
[ajaxorg/node-builds](http://github.com/ajaxorg/node-builds) repository