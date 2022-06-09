# batchRename
**A lean Node.js script for batch file renaming based on number sequencing, date properties, or regex patterns with rollback support.**

<br>

## How to run
Clone the repo, then run `npm install`.
Afterwards, the script can be used in one of the following ways:
- Inside the project folder:
  - Run `npm run dev` to transpile TypeScript to JavaScript
  - Run `node dist/index.js` with appropriate options.
- As a standalone script:
  - Run `npm run build` or `npx webpack` which will bundle the application into a single standalone bundle in the `prod` folder, called `batchRename.mjs`

## Examples | Quick start
Rename files using a search and replace algorithm. Target folder set explicitly.

`node batchRename.mjs -s [regex|string] [replaceText] --target [folder]`

Preview numeric transform with exclude option and a custom baseIndex. Folder path set implicitly.

`node batchRename.mjs -Dn --exclude "excludedName" -b 100 "folder"`

Append creation date to files AND folders in the current folder and specify a custom separator.

`node batchRename.mjs -d --separator _ --targetType all`

Preview the odd numbering transform with custom text append in a target folder.

`node batchRename.mjs -n odd -f [targetFolder] -a CUSTOM_TEXT --textPosition append -D`

Rollback | restore to original file names in target folder.

`node batchRename.mjs -r --target [targetFolder]`

Truncate files to 10 characters and change all characters to upper case

`node batchRename.mjs -t 10 -f uppercase`

Change extension of all files, except excluded.

`node batchRename.mjs -e "png" --exclude "someFilePattern"`


## Usage guide
To run the script successfully, you will have to provide one of the valid transform types (`numericTransform, searchAndReplace, dateTransform`), together with other optional arguments. Running script with no argument will show the help menu and exit.

When performing the rename operation, the script will write a restore file (`.rollback.json`) to the target folder. Without this file, restore operations are not possible. 

Before performing the rename, it is **strongly encouraged to perform a dry run first.**

The script will not perform a rename if it would lead to name collisions (i.e. several files sharing the same name).

|Flag|Arguments|Description|
|------|-----------|--------|
|`-n, -numericTransform`|`[sequential \| even \| odd]`|Rename files by using either a sequence (n+1), even (2n), or odd (2n+1) numbering algorithm. Defaults to `sequence`. To help with file-sorting, the number of digits will always be one more than the (so, a list of 10 files will use three digits: 001, 002 ...) |
|`-d --dateRename`|`<creationDate, lastAccessed, lastModifies>`| Use date-related file information to rename a file. Defaults to `creationDate`. Can be used together wit the `--detailedDate` flag to add time information.|
|`-s, --searchAndReplace`|`<string\|regex> <replacer>`|Takes a string or a regex filter argument and a replacer string. By default, the transform will preserve file extensions, unless a `--noPreserveExtension` option is supplied|
|`-t, --truncate`|`<number>`|Truncate the baseName. Can be used in combination with other transform types or on its own. If preserveOriginal is false or addText is supplied, it has no effect.|
|`-f, --format`|`[uppercase \| lowercase \| capitalize]`|Perform one of the specified transformations on the final rename. Can be used in conjunction with other transforms (except extensionModify).|
|`-e, --extensionModify`|`<string>`|Modify extension of target files. Can also be used together with the exclude option|
|`-a, --addText`|`<string>`|Text to add to the target filename. Can be used on its own, together with 'textPosition' flag, or in combination with other transform types. Overwrites the `preserveOriginal` flag.|
|`--target`|`<path>`|Folder in which the transformation should take place. *Can also be set implicitly* with an extra script argument (explicit setting takes precedence). If omitted, the script defaults to current working directory.|
|`--targetType`|`['files'\|'dirs'\|'all']`||`Determine which file types should be included in transform. Defaults to 'files' If omitted or supplied without option.`
|`-r, --restore`||Restore transformed files to original names, if restore file is available.|
|`-D, --dryRun`||Run transform operation without writing to disk. Will log properties of expected output. Prompts user for transform execution, if no errors detected.|
|`-b, --baseIndex`|`<number>`|For numeric transform, optional argument to specify the base index from which the sequencing will begin|
|`--exclude`|`<string\|regex>`|Preemptively exclude files that match a given string or regular expression from being evaluated in the transform functions|
|`-p, --preserveOriginal`|`[boolean]`| Preserve original file name. Not relevant for the `searchAndReplace` transform type. Defaults to `true`.|
|`--noExtensionPreserve`||An option for the 'searchAndPreserve' and 'format' transforms which includes the file extension in the transform operation.|
|`--textPosition`|`[prepend \| append]`|Applies to `preserveOriginal` or `addText`. Specifies where original or custom text should be appended with respect to the transformation text. Defaults to `append`|
|`--detailedDate`||Appends time information (`T hh:mm:ss`) to date transformations.|
|`--separator`|`<character>`|Specify a custom character which will be used as a separator in the dateTransformation and between the original|custom text and the transform text. Can be an empty string (in this case it will be ignored in date formatting). Defaults to hyphen (`-`).|
|`--cleanRollback`||Remove rollback file.|
|`-h, --help`||Show help.|
|`-V, --version`||ShowScript version.|


<br>
<br>

<b>CAUTION | DISCLAIMER:</b>
<div style="font-size: 0.8rem">

Performing renaming operations on files is not without risks. Things can go wrong, errors can happen, rollbacks might not succeed, data might be lost. So remember: 
* Perform renaming operations only on files that you are prepared to lose or have backed up. 
* Before performing the rename, always do a dry-run.
* This script doesn't give you any guarantees or warranties about anything. 
</div>