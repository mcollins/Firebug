
const PR_RDONLY      = 0x01;
const PR_WRONLY      = 0x02;
const PR_RDWR        = 0x04;
const PR_CREATE_FILE = 0x08;
const PR_APPEND      = 0x10;
const PR_TRUNCATE    = 0x20;
const PR_SYNC        = 0x40;
const PR_EXCL        = 0x80;


function Directory(path)
{
    try
    {
        this.directory = Components.classes["@mozilla.org/file/local;1"]
                 .createInstance(Components.interfaces.nsILocalFile);
                 path = path.replace(/\//g, "\\");  // HACK!
        this.directory.initWithPath(path);
        if (!this.directory.exists() || !this.directory.isDirectory())
            this.directory = this.directory.parent;
    }
    catch (exc)
    {
        if (path)
            throw "zipit.Directory("+path+") :"+exc;
        else
            throw "zipit.Directory called with no path";
    }
}

Directory.prototype.getAllFiles = function()
{
    var array = [];
    this.appendFiles(array, this.directory.directoryEntries);
    return array;
}

Directory.prototype.appendFiles = function(array, entries)
{
    while(entries.hasMoreElements())
    {
        var entry = entries.getNext();
        if (entry instanceof Ci.nsIFile)
        {
            if (entry.isDirectory())
                this.appendFiles(array, entry.directoryEntries);
            if (entry.isFile())
                array.push(entry);
        }
    }
}

Directory.prototype.openNewFile = function(leaf, nocreate)
{
    try
    {
        var file= Components.classes["@mozilla.org/file/local;1"]
                        .createInstance(Components.interfaces.nsILocalFile);
        file.initWithPath(this.directory.path)
        file.appendRelativePath(leaf);
        if( !nocreate && !file.exists() )    // if it doesn't exist, create
            file.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 664);
    }
    catch (exc)
    {
        throw "zipit.Directory.openNewFilew FAILS for leaf "+leaf+" in directory "+this.directory.path + " because "+exc.message;
    }
    return file;
}

/*
 * The object we are creating
 */
function ZipFile(name, directory, files)
{
    this.name = name;
    this.files = files;
    this.rootDirectory = directory;
}


var Zipper  = {
    packers: [],

// Register packers here

    registerPacker: function(ext)
    {
        this.packers.push(ext);
    },


// Overall processing

    zipit: function()
    {
        this.registerPacker(PrintZipperPacker); // the second copy is last, so it gets called after the packers

        this.dispatch(this.packers, "debugFlags", ["xpi"]);

        var xpi = new ZipFile("Zipper.xpi", ".",[]);

        this.dispatch(this.packers, "rootDirectory", [xpi]);

        if (!rootDirectory)
            throw "mozzipper zipit: no source directory";

        this.dispatch(this.packers, "filelist", [xpi]);

        this.dispatch(this.packers, "xpiFileName", [xpi]);

        if (!xpiName)
            throw "mozziper zipit: no target file name";

        this.dispatch(this.packers, "xpi", [xpi]);

        return xpi;
    },

    //   Pass thru packers.
    dispatch: function(packers, name, args)
    {
        window.dump("zipper.dispatch "+name+" to "+packers.length+" packers\n");

            for (var i = 0; i < packers.length; ++i)
            {
                var packer = packers[i];
                if ( packer.hasOwnProperty(name) )
                {
                    try
                    {
                        packer[name].apply(packer, args);
                    }
                    catch (exc)
                    {
                        FBTrace.sysout(" Exception in mozzipper.dispatch "+ name, exc);
                        FBTrace.sysout(" Exception in mozzipper.dispatch "+ name+" For packer ", packer);
                        FBTrace.sysout(" Exception in mozzipper.dispatch "+ name, exc);
                        throw "mozziper dispatch "+name+" FAILS: "+exc;
                    }
                }
            }
    },

    istream: Components.classes["@mozilla.org/network/file-input-stream;1"]
                    .createInstance(Components.interfaces.nsIFileInputStream),

    getLines: function(file)
    {
        this.istream.init(file, 0x01, 0444, 0);
        if (! (this.istream instanceof Ci.nsILineInputStream) )
            throw "Zipper.getLines @mozilla.org/network/file-input-stream;1 FAILS to give nsILineInputStream";

        var buf = {};
        var hasmore;
        var input = [];
        do
        {
            hasmore = this.istream.readLine(buf);
            input.push(buf.value);
        } while(hasmore);

        this.istream.close();
        return input;
    },

    writeString: function(file, data)
    {
        // http://developer.mozilla.org/en/docs/Code_snippets:File_I/O
        //file is nsIFile, data is a string
        var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
                         .createInstance(Components.interfaces.nsIFileOutputStream);

        // use 0x02 | 0x10 to open file for appending.
        foStream.init(file, 0x02 | 0x08 | 0x20, 0666, 0); // write, create, truncate
        foStream.write(data, data.length);
        foStream.close();
    },
}

/*
 * Base object for Zipper workflow sub-steps.
 * These functions are called in order, one time each.
 * They all take the model object 'zip' and may modify it.
 */
var Packer =
{
        /*
         * Change the zip.rootDirectory
         */
        rootDirectory: function(zip) {},
        /*
         * Process zip.files, begins filled with files from rootDirectory
         * @param zip, the current zip object
         */
        filelist: function(zip) {},
        /*
         * Process zip.name
         * @param zip, the current zip object
         */
        xpiFileName: function(zip) {},
        /*
         * Process zip.zipFile, starts with zip of zip.files
         * @param zip, the current zip object
         */
        xpi: function(zip) {},
};

var PrintZipperPacker = extend(Packer, {

    debugFlags: function(phase)
    {
        this.debugPhase = phase;
    },

    filelist: function(zip)
    {
        if (this.debugPhase != "filelist")
            return;

        window.dump("PrintZipperPacker filelist: "+zip.files.length+" files\n");
        for (var i = 0; i < zip.files.length; i++)
        {
            if (this.debug) window.dump(i+") "+zip.files[i].path+"\n");
        }
    },

    xpiFileName: function(zip)
    {
        if (this.debugPhase != "xpiFileName")
            return;

        FBTrace.sysout("PrintZipperPacker xpiFileName: ",zip.name);
    },

    xpi: function(zip)
    {
       if (this.debugPhase != "xpi")
            return;

        FBTrace.sysout("PrintZipperPacker xpi phase zip: ",zip.zipfile.path);
    },
});

var NoSvnZipperPacker = extend(Packer, {
    debug: false,

    filelist: function(zip)
    {
        if (this.debug) window.dump("NoSvnZipperPacker input filelist: "+zip.files.length+" files\n");
        var cleanFiles = [];
        var reSVN = /(\\|\/)\.svn(\\|\/)/;
        for (var i = 0; i < zip.files.length; i++)
        {
            if (!reSVN.test(zip.files[i].path))
            {
                cleanFiles.push(zip.files[i]);
            }
            else
            {
                if (this.debug) window.dump("Removing .svn file:"+i+") "+zip.files[i].path+"\n");
            }
        }
        zip.files = cleanFiles;
        if (this.debug) window.dump("NoSvnZipperPacker output filelist: "+zip.files.length+" files\n");
    },

    xpiFileName: function(zip)
    {
        if (this.debug) window.dump("NoSvnZipperPacker xpiFileName: "+zip.name+"\n");
    },

    xpi: function(zip)
    {
        if (this.debug) window.dump("NoSvnZipperPacker zip: "+zip.name+"\n");
    },
});

/*
 * uses this.rootDirectory
 * @return recursively built up list of files as array of strings.
 */


var RootDirectoryListPacker = extend(Packer,
{
    filelist: function(zip)
    {
        zip.files = zip.rootDirectory.getAllFiles();
    },
});

var ZipAll = extend(Packer,
{
    xpi: function(zip)
    {
        var zipWriter = Components.Constructor("@mozilla.org/zipwriter;1", "nsIZipWriter");
        var writer = new zipWriter();

        var xpi = Components.classes["@mozilla.org/file/local;1"]
                    .createInstance(Components.interfaces.nsILocalFile);
        var path = zip.name;
        path = path.replace(/\//g, "\\");  // HACK!
        xpi.initWithPath(path);

        try
        {
            writer.open(xpi, PR_RDWR | PR_CREATE_FILE | PR_TRUNCATE);
        }
        catch (exc)
        {
            if (exc.name == "NS_ERROR_FILE_NOT_FOUND")
            {
                FBTrace.sysout("ZipFile.zipall FAILS for file", xpi);
                throw "The file "+xpi.path+" was not found (or its directory does not exist) and the flags "+(PR_RDWR | PR_CREATE_FILE | PR_TRUNCATE)+" didn't permit creating it."
            }
            else
                throw exc;
        }

        var prefixLength = zip.rootDirectory.length + 1;
        var allDirectories = [];
        for (var i = 0; i < zip.files.length; i++)
        {
            var file = zip.files[i];
            var absPath = file.path;
            var parentPath = file.parent.path;
            if (allDirectories.indexOf(parentPath) == -1)
            {
                var relPath = parentPath.substr(prefixLength).replace(/\\/g,"/");
                if (zip.debug) FBTrace.sysout("zipAll "+i+") "+relPath);
                if (relPath.length > 1)
                {
                    if (zip.debug) FBTrace.sysout(" adding directory \n");
                    writer.addEntryFile(relPath, Components.interfaces.nsIZipWriter.COMPRESSION_DEFAULT, file.parent, false);
                    allDirectories.push(parentPath);
                }
                else
                    if (zip.debug) FBTrace.sysout(" skipping directory \n");
            }
            var relPath = absPath.substr(prefixLength).replace(/\\/g,"/");

            if (zip.debug) FBTrace.sysout("zipAll "+i+") "+relPath);
            if (relPath.length < 1)
            {
                if (zip.debug) FBTrace.sysout(" skipping \n");
                continue;
            }
            else
                if (zip.debug) FBTrace.sysout(" adding \n");

            try
            {
                writer.addEntryFile(relPath, Components.interfaces.nsIZipWriter.COMPRESSION_DEFAULT, file, false);
            }
            catch (exc)
            {
                FBTrace.sysout("zipit FAILS nsIZipWriter addEntryFile relPath:"+relPath+" file:"+file.path, exc);
                throw exc;
            }
        }
        writer.close();
        zip.zipfile = xpi;
        return zip.zipfile;
    }
});


Zipper.registerPacker(PrintZipperPacker);

/*
 * First 'filelist' operation will recursively build zip.files from zip.rootDirectory
 */
Zipper.registerPacker(RootDirectoryListPacker);
/*
 * First 'xpi' operation will build zip.zipFile from zip.filelist and call it zip.name
 */
Zipper.registerPacker(ZipAllPacker);
/*
 * Clients of Zipper must register a Packer to define zip.rootDirectory in their rootDirectory method and deal with zip.zipFile in their .xpi method.
